import {readdir,readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
async function unpack(dir){for(const entry of await readdir(dir,{withFileTypes:true})){let path=join(dir,entry.name);if(entry.isDirectory())await unpack(path);else if(path.endsWith('.glb.gz')){await writeFile(path.slice(0,-3),gunzipSync(await readFile(path)));console.log('Restored '+path.slice(0,-3));}}}
await unpack('dist/assets');
