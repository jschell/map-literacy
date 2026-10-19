/** Public review candidates only. This catalogue grants no content/scoring approval. */
const root='https://github.com/jschell/map-literacy/blob/main/';
export const REVIEW_MATERIALS=Object.freeze([
  {id:'redmond-cleveland-brown-draft',revision:1,title:'Redmond: Cleveland / Brown Street',path:'docs/materials/redmond-r1/pack.json',learner:'docs/materials/redmond-r1/learner.md',instructor:'docs/materials/redmond-r1/instructor.md',basis:'Source-backed draft · OSM / ODbL-1.0 · source 2026-10-13',limits:'Four orient/locate questions. Selected roads only; authored A–D points are not physical landmarks. Access, restrictions, content and current conditions need independent review.'},
  ...['A','B','C','D','E'].map((set,index)=>({id:`pilot-street-${set.toLowerCase()}`,revision:2,title:`Invented street set ${set}`,path:`docs/materials/pilot-v2/set-${set.toLowerCase()}.json`,learner:`docs/materials/pilot-v2/learner-${set.toLowerCase()}.md`,instructor:`docs/materials/pilot-v2/instructor-${set.toLowerCase()}.md`,basis:`Synthetic draft · CC0-1.0 · ${['baseline','training','training','immediate transfer candidate','delayed transfer candidate'][index]}`,limits:'Eight heading/locate/route/detour questions. Independent content and cross-set comparability review pending; no learner results or approval. Use labeled/partial clues; blank is for separate reconstruction.'}))
]);
export const PUBLIC_REVIEW_PACKS=REVIEW_MATERIALS.map(entry=>entry.path);
export function materialLinks(entry) {return {learner:root+entry.learner,instructor:root+entry.instructor};}
