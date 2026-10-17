"""Offline, pinned 3DEP benchmark preparation; never imported by the browser."""
import argparse
from datetime import datetime
import hashlib
import json
import math
from pathlib import Path
import xml.etree.ElementTree as ET

import numpy as np
import pyproj
import rasterio
from rasterio.transform import from_origin, rowcol
from rasterio.warp import transform_bounds, transform as transform_coordinates
from rasterio.windows import from_bounds, Window

METADATA_SHA = '392bacf7bb0ef6d90e951ae9893f473293fca63551ed9243d4b7b4f48a51e368'
SOURCE_SHA = '40bccd5f1252cec0e5fd6f2a15e5a62590e42d43455a61cf1b48bc55784b5c85'
AOI = (-121.77, 47.44, -121.74, 47.47)  # Explicit NAD83 geographic crop bounds.
URL = 'https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/13/TIFF/historical/n48w122/USGS_13_n48w122_20250813.tif'

def digest(path):
    with open(path, 'rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def normalize(ds, bounds=AOI):
    """Nearest-neighbor resampling preserves source holes; north-up 10 m grid."""
    if ds.crs != rasterio.crs.CRS.from_epsg(4269) or ds.count != 1 or ds.nodata is None or not math.isfinite(ds.nodata):
        raise ValueError('Expected single-band NAD83 source with finite nodata')
    if ds.transform.b != 0 or ds.transform.d != 0 or ds.transform.a <= 0 or ds.transform.e >= 0:
        raise ValueError('Expected north-up source')
    if not (ds.bounds.left <= bounds[0] < bounds[2] <= ds.bounds.right and ds.bounds.bottom <= bounds[1] < bounds[3] <= ds.bounds.top):
        raise ValueError('Crop must lie within source bounds')
    left,bottom,right,top = transform_bounds(ds.crs, 'EPSG:26910', *bounds, densify_pts=21)
    left,bottom,right,top = math.floor(left/10)*10,math.floor(bottom/10)*10,math.ceil(right/10)*10,math.ceil(top/10)*10
    width,height = round((right-left)/10),round((top-bottom)/10)
    if not (2 <= width <= 1024 and 2 <= height <= 1024 and width*height <= 262144):
        raise ValueError('Normalized grid exceeds sample budget')
    transform=from_origin(left,top,10,10)
    # Include the full projected rectangle and a two-pixel halo before warping.
    crop=transform_bounds('EPSG:26910',ds.crs,left,bottom,right,top,densify_pts=21)
    w=from_bounds(*crop,transform=ds.transform)
    x0,y0=max(0,math.floor(w.col_off)-2),max(0,math.floor(w.row_off)-2)
    x1,y1=min(ds.width,math.ceil(w.col_off+w.width)+2),min(ds.height,math.ceil(w.row_off+w.height)+2)
    window=Window(x0,y0,x1-x0,y1-y0)
    if window.width*window.height > 1000000:
        raise ValueError('Source window exceeds read budget')
    raw=ds.read(1,window=window,out_dtype='float64')
    if not np.isfinite(raw).all():
        raise ValueError('Unexpected nonfinite source elevation')
    # Exact inverse center sampling avoids approximate GDAL warp-mesh decisions.
    # Nearest PixelIsArea center is the cell containing this inverse coordinate.
    rows,cols=np.indices((height,width))
    xs=left+(cols+.5)*10;ys=top-(rows+.5)*10
    lon,lat=pyproj.Transformer.from_crs(26910,4269,always_xy=True).transform(xs,ys)
    sr=np.floor((lat-ds.transform.f)/ds.transform.e).astype(int)-y0
    sc=np.floor((lon-ds.transform.c)/ds.transform.a).astype(int)-x0
    if np.any(sr<0) or np.any(sc<0) or np.any(sr>=raw.shape[0]) or np.any(sc>=raw.shape[1]):
        raise ValueError('Independent check outside source window')
    target=raw[sr,sc];target=np.where(target==ds.nodata,np.nan,target)
    # Independent GDAL coordinate transform and affine rowcol path.
    check_lon,check_lat=transform_coordinates('EPSG:26910',ds.crs,xs.ravel().tolist(),ys.ravel().tolist())
    rr,cc=rowcol(ds.transform,check_lon,check_lat)
    expected=raw[np.asarray(rr)-y0,np.asarray(cc)-x0].reshape(target.shape)
    expected=np.where(expected==ds.nodata,np.nan,expected)
    if not np.array_equal(np.isnan(target),np.isnan(expected)) or not np.array_equal(target[np.isfinite(expected)],expected[np.isfinite(expected)]):
        raise ValueError('Independent nearest-source comparison failed')
    backx,backy=pyproj.Transformer.from_crs(4269,26910,always_xy=True).transform(lon,lat)
    error=float(np.max(np.hypot(backx-xs,backy-ys)))
    if error>1e-6:
        raise ValueError('Coordinate round-trip tolerance exceeded')
    return target,transform,dict(sourceWindow=[x0,y0,x1-x0,y1-y0],samplesCompared=width*height,maxElevationDifferenceM=0,maxCoordinateRoundTripM=error,missingSamples=int(np.isnan(target).sum()))

def prepare(source, metadata, output, acquired_at):
    source,metadata,output=Path(source),Path(metadata),Path(output)
    if source.stat().st_size != 473964013 or digest(source) != SOURCE_SHA:
        raise ValueError('Source does not match reviewed benchmark bytes')
    if metadata.stat().st_size > 1000000:
        raise ValueError('Metadata byte limit exceeded')
    if digest(metadata) != METADATA_SHA:
        raise ValueError('Metadata does not match reviewed benchmark bytes')
    parsed=datetime.strptime(acquired_at,'%Y-%m-%dT%H:%M:%S.%fZ')
    if parsed.isoformat(timespec='milliseconds')+'Z' != acquired_at:
        raise ValueError('Acquisition time must be canonical UTC with milliseconds')
    root=ET.parse(metadata).getroot()
    if root.findtext('.//altunits') != 'meters' or root.findtext('.//altdatum') != 'North American Vertical Datum of 1988' or root.findtext('.//horizdn') != 'North American Datum of 1983':
        raise ValueError('Source metadata references do not match review')
    with rasterio.open(source) as ds:
        if ds.tags().get('AREA_OR_POINT') != 'Area':
            raise ValueError('Expected PixelIsArea source registration')
        target,t,checks=normalize(ds)
        native=dict(crs=str(ds.crs),width=ds.width,height=ds.height,nodata=ds.nodata,transform=list(ds.transform)[:6],registration='PixelIsArea')
    timestamp=acquired_at
    parameters=dict(aoiNad83=list(AOI),spacingM=10,resampling='exact-inverse-nearest',alignment='UTM multiples of 10 m',sourceMetadataSha256=digest(metadata),gdal=rasterio.__gdal_version__,proj=pyproj.proj_version_str,pyproj=pyproj.__version__)
    grid=dict(format='map-literacy-elevation-grid-v1',id='rattlesnake-3dep-benchmark-v1',width=target.shape[1],height=target.shape[0],horizontal=dict(crs='EPSG:26910',units='m',axisOrder='easting,northing',origin=[t.c+5,t.f-5],step=[10,-10],registration='sample-center'),vertical=dict(units='m',reference='NAVD88',nodata=None,uncertaintyM=None),source=dict(kind='usgs-3dep',productId='USGS_13_n48w122_20250813',version='20250813',acquiredAt=timestamp,url=URL,sha256=SOURCE_SHA,license='USGS-public-domain',attribution='USGS 3DEP; normalized crop using nearest-neighbor resampling; not USGS-endorsed.',transforms=[dict(operation='crop-reproject-sample-centers',version='rasterio-'+rasterio.__version__,parameters=parameters)]),samples=[float(v) if math.isfinite(v) else None for v in target.flat])
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(grid,allow_nan=False,separators=(',',':'))+'\n')
    return dict(sourceSha256=SOURCE_SHA,metadataSha256=digest(metadata),normalizedSha256=digest(output),normalizedBytes=output.stat().st_size,native=native,width=grid['width'],height=grid['height'],origin=grid['horizontal']['origin'],step=[10,-10],elevationRangeM=[float(np.nanmin(target)),float(np.nanmax(target))],checks=checks,tools=dict(rasterio=rasterio.__version__,gdal=rasterio.__gdal_version__,pyproj=pyproj.__version__,proj=pyproj.proj_version_str))

if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source');parser.add_argument('metadata');parser.add_argument('output')
    parser.add_argument('--acquired-at',required=True,help='Actual acquisition UTC timestamp, retained for reproduction')
    args=parser.parse_args()
    print(json.dumps(prepare(args.source,args.metadata,args.output,args.acquired_at),indent=2))
