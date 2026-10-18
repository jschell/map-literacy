import test from 'node:test';
import assert from 'node:assert/strict';
import {packEvidence} from '../src/lesson/evidence.js';

test('author review and technical validation never become independent curriculum approval',()=>{
  const fixture={sources:[{kind:'synthetic'}],review:{status:'reviewed'}};
  assert.match(packEvidence(fixture),/Technically validated synthetic fixture.*author review recorded.*independent curriculum approval not recorded/);
  const sourceBacked={sources:[{kind:'osm'}],review:{status:'draft'}};
  assert.match(packEvidence(sourceBacked),/Source-backed display material.*Unreviewed draft/);
  assert.match(packEvidence({...sourceBacked,review:{status:'reviewed'}}),/independent curriculum approval not recorded/);
  assert.match(packEvidence({...fixture,sources:[...fixture.sources,{kind:'osm'}]}),/^Source-backed/);
});
