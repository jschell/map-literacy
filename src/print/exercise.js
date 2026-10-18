import { deriveLandform } from '../terrain/landforms.js';
import { contourLevel, terrainExerciseAnnotations, slopeComparison, deriveLessonProfile, profileAnswer } from '../terrain/lesson-pack.js';
import { validatePack } from '../data/validate-pack.js';

/** Printable teaching content, deliberately separate from scoring and transient traces. */
export function createExercisePrint(pack, exerciseId, audience) {
  if (!validatePack(pack).valid) throw new Error('Choose a validated lesson pack.');
  if (!['learner', 'instructor'].includes(audience)) throw new Error('Choose learner or instructor output.');
  const exercise = pack.exercises.find((e) => e.id === exerciseId);
  if (!exercise) throw new Error('Choose an exercise from this pack.');
  if ((exercise.scenario?.closedEdgeIds.length ?? 0) > 1000) throw new Error('This print layout supports at most 1,000 closure edges; use a smaller lesson.');
  const instructor = audience === 'instructor', rubric = exercise.rubric;
  const draft = pack.review.status !== 'reviewed' || exercise.review !== 'reviewed';
  const kind = instructor ? 'Instructor guide' : 'Learner worksheet';
  const exerciseName = exercise.type === 'terrain-form' ? 'Ridge or valley' : exercise.type === 'profile-value' ? 'Elevation profile' : exercise.type === 'contour-elevation' ? 'Contour elevation' : exercise.type === 'relative-slope' ? 'Relative slope' : exercise.type;
  let slopeAnnotations = null, profile = null;
  const blocks = [], markers = [], closedEdges = [];
  const add = (text, type = 'paragraph') => blocks.push({ type, text });
  add(pack.title, 'heading');
  add(`Exercise ID: ${exercise.id} · Pack revision ${pack.revision}`);
  add(`${kind} · ${exerciseName}${draft ? ' · UNREVIEWED DRAFT' : ''}`, 'heading');
  add(exercise.prompt);
  if (draft) add('This lesson requires content review before use. Printed output is a draft preview.');
  let headingDeg = null;
  if (exercise.type === 'heading') {
    if (instructor) {
      headingDeg = rubric.expectedDeg;
      add(`Expected true heading: ${rubric.expectedDeg}°. Accept circular angular error up to ${rubric.toleranceDeg}° (inclusive); north is 0° and angles increase clockwise.`, 'answer');
    } else add('Write the true heading in degrees and draw an arrow on the map.');
  } else if (exercise.type === 'endpoint') {
    if (instructor) {
      markers.push({ coordinate: rubric.expected, text: 'X' });
      add(`Expected endpoint (longitude, latitude): ${rubric.expected.join(', ')}. X marks the answer on the instructor map. Accept geographic distance up to ${rubric.toleranceM} m (inclusive).`, 'answer');
    } else add('Mark the endpoint on the map and explain how you located it.');
  } else if(exercise.type==='profile-value') {
    profile=deriveLessonProfile(pack,exercise);slopeAnnotations=terrainExerciseAnnotations(pack,exercise);
    add('', 'profile-chart');
    add('S and E mark the start and end of a synthetic transect, not a road or trail. The horizontal axis is distance from S; read elevation from the vertical axis. Axes use different scales.');
    if(instructor)add(`Expected ${rubric.quantity}: ${Number(profileAnswer(pack,exercise).toFixed(6))} m. Accept error up to ${rubric.toleranceM} m (inclusive).`, 'answer');
    else add('Write your answer in metres and show which elevation changes you counted.');
  } else if(exercise.type==='relative-slope') {
    slopeAnnotations=terrainExerciseAnnotations(pack,exercise);
    add(`Both tick-to-tick spans change elevation by ${pack.terrain.intervalM} m. Compare straight horizontal distances; this is average slope magnitude, not walking distance or local slope everywhere.`);
    if(instructor) {const {a,b,choice}=slopeComparison(pack,exercise);add(`Expected comparison: ${choice==='equal'?'equal average slope':`${choice} is steeper`}. A: rise ${a.riseM} m / run ${Number(a.runM.toFixed(3))} m; B: rise ${b.riseM} m / run ${Number(b.runM.toFixed(3))} m.`, 'answer');}
    else add('Circle A, B or equal and explain how equal rise and horizontal distance support your choice.');
  } else if (exercise.type === 'terrain-form') {
    slopeAnnotations=terrainExerciseAnnotations(pack,exercise);
    add('H is the higher end of the marked axis; L is the lower end. Read the contour elevations across A. Valley contours point uphill; ridge contours point downhill. This bounded synthetic shape does not establish a stream, route or permission to travel.');
    if(instructor) {const form=deriveLandform(pack.terrain.grid,exercise.rubric);add(`Expected landform: ${form.choice}. All three transverse sections have ${form.choice==='valley'?'higher':'lower'} ground on both sides; the longitudinal axis falls ${form.alongFallM} m. Minimum cross-section relief: ${form.minCrossReliefM} m.`, 'answer');}
    else add('Circle ridge or valley and explain the contour elevations on both sides of A.');
  } else if (exercise.type === 'contour-elevation') {
    slopeAnnotations = terrainExerciseAnnotations(pack,exercise,instructor); markers.push(...slopeAnnotations.markers);
    add(`Synthetic terrain; elevations use a synthetic zero reference. Contour interval: ${pack.terrain.intervalM} m.`);
    if(instructor) add(`Expected contour A elevation: ${contourLevel(pack,rubric.featureId)} m. Accept numeric error up to ${rubric.toleranceM} m (inclusive).`, 'answer');
    else add('Write the elevation of contour A in metres and explain how you counted from the labeled reference contour.');
  } else {
    const nodes = new Map(pack.topology.nodes.map((n) => [n.id, n]));
    markers.push({ coordinate: nodes.get(rubric.startNodeId).coordinate, text: 'S' });
    if (rubric.startNodeId !== rubric.endNodeId) markers.push({ coordinate: nodes.get(rubric.endNodeId).coordinate, text: 'E' });
    else markers[0].text = 'S/E';
    add(`S = start node ${rubric.startNodeId}; E = end node ${rubric.endNodeId}. Mode: ${rubric.mode === 'drive' ? 'driving' : 'walking'}.`);
    if (rubric.objective === 'max-distance') add(`Maximum allowed route distance: ${rubric.maxDistanceM} m.`);
    if (exercise.scenario) {
      add(`Exercise-only closure: ${exercise.scenario.label}`);
      add('Cross marks on the map identify closed edges for this synthetic scenario, not real road conditions.');
      const edges = new Map(pack.topology.edges.map((e) => [e.id, e]));
      for (const id of exercise.scenario.closedEdgeIds) {
        const edge = edges.get(id); closedEdges.push(edge);
        add(`Closed edge ${id}: ${edge.from} → ${edge.to} (${edge.mode}).`);
      }
    }
    if (instructor) {
      add('Accept any connected directed path from S to E that matches the mode and allowed access, obeys turn-sequence restrictions and avoids the exercise closures. Apply the stated distance limit when present. There is no single exact-match route answer.', 'answer');
      add('Unknown access, unresolved restrictions or excluded geometry need manual review; do not mark them correct from the drawing alone. No sample route is automatically approved or generated.');
      if (rubric.startNodeId === rubric.endNodeId) add('An empty path may be valid when start equals end and no positive-distance requirement applies.', 'answer');
    } else add('Draw a path on the map, list its directed edges if known, and explain the road connections and your choices.');
  }
  if (instructor) {
    add('Hints supplied by the author', 'heading');
    if (!exercise.hints.length) add('No authored hints.');
    for (const hint of exercise.hints) add(hint, 'hint');
    if (pack.topology.completeness === 'partial') add('Topology is incomplete. Review the pack exclusions before accepting route answers.');
    add(['contour-elevation','relative-slope','profile-value','terrain-form'].includes(exercise.type) ? 'Use these answer criteria to check the handwritten answer and explanation.' : 'These are authored answer criteria for manual checking. Automatic scoring, learner records and real-world driving permission are not provided by this print tool.');
  } else {
    add('Answer and explanation', 'heading'); add('', 'answer-space');
  }
  add('Source credits', 'heading');
  for (const source of pack.sources) {
    add(`${source.attribution}\nLicense: ${source.license}\nSource date: ${source.sourceAt?.slice(0, 10) ?? 'unknown'}${source.url ? `\nSource: ${source.url}` : ''}`, 'credit');
  }
  if (blocks.reduce((sum, b) => sum + b.text.length, 0) > 100000) throw new Error('Exercise print text exceeds the layout limit; use a smaller source/lesson selection.');
  const inside = ([lon, lat]) => lon >= pack.bounds[0] && lon <= pack.bounds[2] && lat >= pack.bounds[1] && lat <= pack.bounds[3];
  if ((exercise.type === 'endpoint' && !inside(rubric.expected)) || !markers.every((m) => inside(m.coordinate)) || !closedEdges.every((e) => e.shape.every(inside))) throw new Error('Exercise endpoints or closures leave this print extent; choose a suitable lesson extent.');
  return { kind, exerciseId, audience, draft, blocks, profile, annotations: slopeAnnotations ?? { markers, closedEdges }, headingDeg,
    title: `${kind} — ${exerciseName}${draft ? ' — UNREVIEWED DRAFT' : ''}`,
    summary: exercise.type === 'terrain-form' ? 'Classify landform A. H is higher; L is lower along the marked axis. Questions and source credits follow the map.' : exercise.type === 'profile-value' ? 'Synthetic transect from S to E. The elevation profile, question and source credits follow the map.' : exercise.type === 'relative-slope' ? `Synthetic terrain. A and B each span ${pack.terrain.intervalM} m of elevation change. Compare distances between the end ticks. Questions and source credits follow the map.` : exercise.type === 'contour-elevation' ? `Synthetic terrain; elevation increases toward the center. Contour interval: ${pack.terrain.intervalM} m. Questions${instructor ? ' and answer criteria' : ''} and source credits follow the map.` : `${exercise.type} · Questions${instructor ? ' and answer criteria' : ''} and source credits follow the map.` };
}
