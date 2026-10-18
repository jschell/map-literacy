import { terrainExerciseAnnotations } from '../terrain/lesson-pack.js';

/** Task clues shared by screen and paper. Never read the endpoint answer. */
export function exerciseAnnotations(pack, exercise, instructor = false) {
  if (pack.module === 'topographic') return terrainExerciseAnnotations(pack, exercise, instructor);
  const markers = [], closedEdges = [];
  // Small synthetic teaching maps use their authored short node identities as
  // references. Never invent junctions from crossings or expose source IDs as clues.
  if (pack.sources.every(s => s.kind === 'synthetic') && pack.topology.nodes.length <= 100) {
    for (const node of pack.topology.nodes) if (node.id.length <= 8 && node.coordinate[0]>=pack.bounds[0] && node.coordinate[0]<=pack.bounds[2] && node.coordinate[1]>=pack.bounds[1] && node.coordinate[1]<=pack.bounds[3]) markers.push({ coordinate: node.coordinate, text: node.id });
  }
  if (['route', 'detour'].includes(exercise.type)) {
    const nodes = new Map(pack.topology.nodes.map(n => [n.id, n]));
    const start = exercise.rubric.startNodeId, end = exercise.rubric.endNodeId;
    for (const [id, text] of start === end ? [[start,'Start/end']] : [[start,'Start'],[end,'End']]) {
      const previous = markers.find(m => m.coordinate === nodes.get(id).coordinate);
      if (previous) previous.text = `${text} ${id}`;
      else markers.push({coordinate: nodes.get(id).coordinate, text});
    }
    const edges = new Map(pack.topology.edges.map(e => [e.id, e]));
    for (const id of exercise.scenario?.closedEdgeIds ?? []) closedEdges.push(edges.get(id));
  }
  return {markers, closedEdges, routeEndpoints: ['route','detour'].includes(exercise.type)};
}
