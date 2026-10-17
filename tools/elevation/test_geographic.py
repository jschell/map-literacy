import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import sys
import unittest

from geographic_contours import ROOT, display_operation, prepare


class GeographicTests(unittest.TestCase):
    def grid(self):
        # Invented samples/metadata for software tests, not authentic USGS content.
        g=json.loads((ROOT/'tests/fixtures/terrain-grids.json').read_text())['plane']
        g['horizontal']['crs']='EPSG:26910'
        g['horizontal']['origin']=[500000,5205200]
        g['vertical']['reference']='NAVD88'
        g['source']['kind']='usgs-3dep'
        g['source']['url']='https://example.invalid/synthetic-test-only'
        g['source']['attribution']='Invented software-test metadata; not acquired terrain.'
        return g

    def test_known_central_meridian_axis_order_and_reported_accuracy(self):
        t=display_operation()
        lon,lat=t.transform(500000,5205164.110030843,errcheck=True)
        self.assertAlmostEqual(lon,-123,places=10)
        self.assertAlmostEqual(lat,47,places=9)
        self.assertEqual(t.accuracy,4)
        self.assertFalse(t.is_network_enabled)

    def test_node_to_geographic_roundtrip_preserves_sources_levels_and_uncertainty(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'grid.json';payload=json.dumps(self.grid()).encode();path.write_bytes(payload)
            out=prepare(path,'13,17')
        self.assertEqual(out['grid'],self.grid())
        self.assertEqual(out['sourceGridSha256'],hashlib.sha256(payload).hexdigest())
        self.assertEqual(out['review'],'draft')
        self.assertEqual([c['levelM'] for c in out['contours']],[13,17])
        self.assertTrue(all(c['lines'] for c in out['contours']))
        self.assertLess(out['operation']['maxRoundTripM'],1e-6)
        self.assertFalse(out['operation']['verticalConversion'])
        for c in out['contours']:
            for line in c['lines']:
                self.assertTrue(all(-124<p[0]<-122 and 46<p[1]<48 for p in line['coordinates']))

    def test_local_reference_bad_levels_and_oversized_input_fail(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'grid.json'
            path.write_text(json.dumps(json.loads((ROOT/'tests/fixtures/terrain-grids.json').read_text())['plane']))
            with self.assertRaisesRegex(ValueError,'EPSG:26910'):prepare(path,'13')
            path.write_text(json.dumps(self.grid()))
            with self.assertRaisesRegex(ValueError,'derivation failed'):prepare(path,'17,13')
            with path.open('wb') as stream:stream.truncate(32*1024*1024+1)
            with self.assertRaisesRegex(ValueError,'byte budget'):prepare(path,'13')

    def test_existing_output_retained_even_with_invalid_input(self):
        with tempfile.TemporaryDirectory() as folder:
            out=Path(folder)/'retained.json';out.write_text('retain me')
            result=subprocess.run([sys.executable,str(ROOT/'tools/elevation/geographic_contours.py'),str(Path(folder)/'missing.json'),str(out),'--levels','13'],capture_output=True)
            self.assertNotEqual(result.returncode,0)
            self.assertEqual(out.read_text(),'retain me')


if __name__=='__main__':unittest.main()
