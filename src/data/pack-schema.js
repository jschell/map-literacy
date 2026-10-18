// Executable schema descriptors. No browser or Node dependencies.
const string = (max = 2000, min = 1) => ({ type: 'string', min, max });
const enumeration = (...values) => ({ type: 'enum', values });
const number = (min, max, integer = false, exclusiveMin = false) => ({ type: 'number', min, max, integer, exclusiveMin });
const array = (items, max, min = 0) => ({ type: 'array', items, max, min });
const object = (fields) => ({ type: 'object', fields });
const nullable = (item) => ({ type: 'nullable', item });
const tuple = (...items) => ({ type: 'tuple', items });
const id = { ...string(128), pattern: /^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,127}$/ };
const text = string();
const date = { ...string(24), format: 'date' };
const coordinate = tuple(number(-180, 180), number(-90, 90));
const bounds = tuple(number(-180, 180), number(-90, 90), number(-180, 180), number(-90, 90));
const json = { type: 'json' };
const anyObject = { type: 'record', item: json };
const points = array(coordinate, 100000, 2);
const ring = array(coordinate, 100000, 4);
const geometries = {
  Point: object({ type: enumeration('Point'), coordinates: coordinate }),
  LineString: object({ type: enumeration('LineString'), coordinates: points }),
  MultiLineString: object({ type: enumeration('MultiLineString'), coordinates: array(points, 10000, 1) }),
  Polygon: object({ type: enumeration('Polygon'), coordinates: array(ring, 10000, 1) }),
  MultiPolygon: object({ type: enumeration('MultiPolygon'), coordinates: array(array(ring, 10000, 1), 10000, 1) }),
};
const routeRubric = object({
  startNodeId: id, endNodeId: id, mode: enumeration('walk', 'drive'),
  objective: enumeration('any-valid', 'max-distance'), maxDistanceM: nullable(number(0, Number.MAX_VALUE, false, true)),
});
const commonExercise = {
  id, prompt: text, review: enumeration('reviewed', 'draft'), sourceIds: array(id, 1000, 1),
  hints: array(text, 3), scenario: nullable(object({ id, closedEdgeIds: array(id, 40000), label: text })),
};
const exercises = Object.fromEntries(Object.entries({
  heading: object({ expectedDeg: number(0, 359.99999999999994), toleranceDeg: number(0, 45, false, true) }),
  endpoint: object({ expected: coordinate, toleranceM: number(0, 100, false, true) }),
  route: routeRubric, detour: routeRubric,
}).map(([type, rubric]) => [type, object({ ...commonExercise, type: enumeration(type), rubric })]));

export const PACK_LIMITS = Object.freeze({
  bytes: 10 * 1024 * 1024, depth: 32, coordinates: 100000, errors: 1000,
});

export const packSchema = object({
  schemaVersion: enumeration(1), id, title: string(120), revision: number(1, Number.MAX_SAFE_INTEGER, true),
  module: enumeration('street', 'topographic'), capabilities: array(enumeration('street-core', 'terrain-v1', 'directions-v1'), 3, 1),
  review: object({ status: enumeration('draft', 'reviewed', 'rejected'), reviewedAt: nullable(date), note: string(2000, 0) }),
  bounds, sourceBounds: bounds,
  sources: array(object({
    id, kind: enumeration('osm', 'synthetic', 'elevation', 'routing'), url: nullable({ ...string(), format: 'https' }),
    query: nullable(string(2000, 0)), fetchedAt: date, sourceAt: nullable(date), version: nullable(text),
    sha256: { ...string(64, 64), pattern: /^[a-f0-9]{64}$/ }, license: text, attribution: text,
    transforms: array(object({ name: text, version: text, parameters: anyObject }), 100),
  }), 1000, 1),
  features: object({ type: enumeration('FeatureCollection'), features: array(object({
    type: enumeration('Feature'), id,
    geometry: { type: 'discriminated', key: 'type', choices: geometries },
    properties: object({ sourceId: id, role: enumeration('road', 'landmark', 'water', 'building', 'trail', 'contour'), name: nullable(text), tags: { type: 'record', item: string(2000, 0) } }),
  }), 10000) }),
  topology: object({
    nodes: array(object({ id, coordinate, sourceId: id, sourceObjectId: nullable(text) }), 20000),
    edges: array(object({ id, from: id, to: id, featureId: id, sourceId: id, mode: enumeration('walk', 'drive'), access: enumeration('allowed', 'unknown', 'blocked'), lengthM: number(0, Number.MAX_VALUE, false, true), shape: points }), 40000),
    restrictions: array(object({ id, edgeSequence: array(id, 16, 2), rule: enumeration('forbidden', 'only'), mode: enumeration('walk', 'drive'), sourceId: id }), 5000),
    completeness: enumeration('complete', 'partial'), exclusions: array(object({ id, objectIds: array(id, 100000), reason: text }), 5000),
  }),
  labels: array(object({ id, featureId: id, text: string(120), anchor: coordinate, rotationDeg: number(-180, 180), visibleIn: enumeration('labeled', 'partial'), priority: number(0, 100, true) }), 2000),
  exercises: array({ type: 'discriminated', key: 'type', choices: exercises }, 200),
  print: object({ paper: enumeration('letter'), orientation: enumeration('landscape', 'portrait'), marginMm: enumeration(10), scaleDenominator: enumeration(1000, 5000, 10000), labelMinPt: enumeration(8), mapRotationDeg: enumeration(0) }),
  extensions: object({}),
});


const slopeSpan = object({ fromFeatureId: id, fromVertex: number(0,100000,true), toFeatureId: id, toVertex: number(0,100000,true) });
// A new envelope keeps version-1 street readers rejecting this capability.
export const terrainPackSchema = object({
  ...packSchema.fields, schemaVersion: enumeration(2), module: enumeration('topographic'),
  capabilities: array(enumeration('terrain-contours-v1','terrain-slopes-v1','terrain-profiles-v1','terrain-landforms-v1','terrain-depressions-v1'),5,1),
  exercises: array({type:'discriminated',key:'type',choices:{
    'contour-elevation':object({...commonExercise,type:enumeration('contour-elevation'),rubric:object({featureId:id,referenceFeatureId:id,toleranceM:number(0,.1)})}),
    'terrain-form':object({...commonExercise,type:enumeration('terrain-form'),rubric:object({axis:tuple(tuple(number(-1e9,1e9),number(-1e9,1e9)),tuple(number(-1e9,1e9),number(-1e9,1e9))),halfWidthM:number(1,100)})}),
    'profile-value':object({...commonExercise,type:enumeration('profile-value'),rubric:object({path:array(tuple(number(-1e9,1e9),number(-1e9,1e9)),32,2),spacingM:number(0,1000,false,true),quantity:enumeration('ascent','descent','net-change'),toleranceM:number(0,.1)})}),
    'relative-slope':object({...commonExercise,type:enumeration('relative-slope'),rubric:object({spanA:slopeSpan,spanB:slopeSpan})})
  }},200),
  terrain: json
});
