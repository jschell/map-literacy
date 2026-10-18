import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {buildPilotMaterials} from './pilot-materials.js';
const root=new URL('../docs/materials/pilot-v1/',import.meta.url),check=process.argv.includes('--check');
if(process.argv.slice(2).some(a=>a!=='--check'))throw Error('Usage: node scripts/generate-pilot-materials.js [--check]');
if(!check)await mkdir(root,{recursive:true});
for(const [name,contents]of Object.entries(buildPilotMaterials())){const path=new URL(name,root);if(check){if(await readFile(path,'utf8')!==contents)throw Error(`Material drift: ${name}`);}else await writeFile(path,contents);}
console.log(check?'Pilot material bytes reproduce exactly.':'Generated five draft eight-item street sets and answer/index/capture files.');
