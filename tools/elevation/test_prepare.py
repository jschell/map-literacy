import unittest
import numpy as np
from rasterio.io import MemoryFile
from rasterio.transform import from_origin
from prepare_benchmark import normalize

class PreparationTests(unittest.TestCase):
    def source(self, crs='EPSG:4269', spacing=.0001):
        memory=MemoryFile()
        ds=memory.open(driver='GTiff',width=400,height=400,count=1,dtype='float64',crs=crs,transform=from_origin(-121.78,47.48,spacing,spacing),nodata=-999999)
        values=np.full((400,400),123.0);values[:,150:160]=-999999
        ds.write(values,1)
        self.addCleanup(memory.close);self.addCleanup(ds.close)
        return ds

    def test_constant_field_holes_registration_and_independent_comparison(self):
        target,transform,evidence=normalize(self.source(),(-121.77,47.45,-121.76,47.46))
        self.assertTrue(np.isnan(target).any())
        self.assertTrue(np.all(target[np.isfinite(target)]==123))
        self.assertEqual(transform.a,10);self.assertEqual(transform.e,-10)
        self.assertEqual(transform.c%10,0);self.assertEqual(transform.f%10,0)
        self.assertEqual(evidence['samplesCompared'],target.size)
        self.assertLess(evidence['maxCoordinateRoundTripM'],1e-6)
        self.assertEqual(evidence['maxElevationDifferenceM'],0)

    def test_bad_crs_extent_and_budget_rejected(self):
        with self.assertRaises(ValueError):normalize(self.source('EPSG:4326'))
        with self.assertRaises(ValueError):normalize(self.source(),(-130,47,-129,48))
        with self.assertRaises(ValueError):normalize(self.source(),(-121.77,47.46,-121.77,47.46))
        with self.assertRaisesRegex(ValueError,'sample budget'):normalize(self.source(spacing=.001),(-121.7,47.2,-121.6,47.3))

if __name__=='__main__':unittest.main()
