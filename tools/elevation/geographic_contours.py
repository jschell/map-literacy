"""Offline connected contours -> WGS84 draft overlay; no lesson approval."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import subprocess
import tempfile
import warnings

import pyproj
from pyproj.aoi import AreaOfInterest
from pyproj.enums import TransformDirection
from pyproj.transformer import TransformerGroup

ROOT = Path(__file__).resolve().parents[2]
MAX_BYTES = 64 * 1024 * 1024


def display_operation():
    # Deliberate, reproducible 4 m approximation, not a silent grid fallback.
    # Regional higher-accuracy operations require separate grid/source review.
    pyproj.network.set_network_enabled(False)
    with warnings.catch_warnings():
        warnings.filterwarnings('ignore', message='Best transformation is not available')
        group = TransformerGroup(26910, 4326, always_xy=True,
                                 area_of_interest=AreaOfInterest(-121.8, 47.4, -121.7, 47.5),
                                 allow_ballpark=False)
    for transform in group.transformers:
        ids = [op.to_json_dict().get('id', {}) for op in transform.operations]
        if {'authority': 'EPSG', 'code': 1188} in ids and transform.accuracy == 4:
            return transform
    raise ValueError('Reviewed EPSG:1188 display operation unavailable')


def geographic(bundle):
    grid, lines = bundle['grid'], bundle['lines']
    if grid['horizontal']['crs'] != 'EPSG:26910' or lines['horizontalCrs'] != 'EPSG:26910' or lines['gridId'] != grid['id']:
        raise ValueError('Only the EPSG:26910 benchmark reference is supported')
    if lines['verticalReference'] != grid['vertical']['reference'] or lines['units'] != 'm':
        raise ValueError('Mismatched vertical reference')
    transform = display_operation()
    maximum_round_trip = 0

    def convert(p):
        nonlocal maximum_round_trip
        lon, lat = transform.transform(*p, errcheck=True)
        if not (-126 <= lon <= -120 and 24 <= lat <= 70):
            raise ValueError('Outside reviewed zone-10 display area')
        x, y = transform.transform(lon, lat, direction=TransformDirection.INVERSE, errcheck=True)
        error = math.hypot(x-p[0], y-p[1])
        if not math.isfinite(error) or error > 1e-6:
            raise ValueError('Coordinate round-trip tolerance exceeded')
        maximum_round_trip = max(maximum_round_trip, error)
        return [lon, lat]

    corners = [convert([grid['horizontal']['origin'][0]+c*grid['horizontal']['step'][0],
                        grid['horizontal']['origin'][1]+r*grid['horizontal']['step'][1]])
               for c in (0, grid['width']-1) for r in (0, grid['height']-1)]
    contours = []
    for contour in lines['contours']:
        contours.append({**contour,
                         'lines': [{'closed': line['closed'], 'coordinates': [convert(p) for p in line['coordinates']]}
                                   for line in contour['lines']],
                         'junctions': [{'coordinate': convert(j['coordinate']), 'degree': j['degree']}
                                      for j in contour['junctions']]})
    return {'format': 'map-literacy-geographic-contours-v1', 'coordinateReference': 'OGC:CRS84',
            'review': 'draft', 'grid': grid, 'sourceGridSha256': bundle['sourceGridSha256'],
            'operation': {'id': 'EPSG:1188', 'accuracyM': transform.accuracy,
                          'description': transform.description, 'pipeline': transform.definition,
                          'pyproj': pyproj.__version__, 'proj': pyproj.proj_version_str,
                          'maxRoundTripM': maximum_round_trip, 'verticalConversion': False},
            'gridCornerBounds': [min(p[0] for p in corners), min(p[1] for p in corners),
                                 max(p[0] for p in corners), max(p[1] for p in corners)],
            'skippedCells': lines['skippedCells'], 'contours': contours}


def prepare(grid_path, levels):
    # Node validates the grid and derives topology. A temporary file bounds RAM
    # while subprocess output is written; the derivation has its own byte/count guards.
    with tempfile.TemporaryFile() as output:
        process = subprocess.run(['node', str(ROOT/'scripts/derive-contour-lines.js'), str(grid_path), levels],
                                 stdout=output, stderr=subprocess.PIPE, timeout=60, check=False)
        if process.returncode:
            raise ValueError('Contour derivation failed: '+process.stderr[:2000].decode('utf-8', errors='replace'))
        if output.tell() > MAX_BYTES:
            raise ValueError('Contour byte budget exceeded')
        output.seek(0)
        bundle = json.load(output)
    return geographic(bundle)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('grid', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--levels', required=True, help='Increasing metre elevations, e.g. 200,300')
    args = parser.parse_args()
    if args.output.exists():
        parser.error('Output already exists; retain the prior artifact or choose a new path')
    result = prepare(args.grid, args.levels)
    payload = (json.dumps(result, allow_nan=False, separators=(',', ':'))+'\n').encode()
    if len(payload) > MAX_BYTES:
        raise ValueError('Geographic output byte budget exceeded')
    # Exclusive creation never overwrites an existing artifact, including a race.
    with args.output.open('xb') as stream:
        stream.write(payload)
    print(json.dumps({'sha256': hashlib.sha256(payload).hexdigest(), 'bytes': len(payload),
                      'levels': [{'levelM': c['levelM'], 'lines': len(c['lines']), 'junctions': len(c['junctions']),
                                  'closed': sum(line['closed'] for line in c['lines'])} for c in result['contours']],
                      'operation': result['operation']}, indent=2))


if __name__ == '__main__':
    main()
