import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
function fixture(){const root=mkdtempSync(join(tmpdir(),'bc-media-'));mkdirSync(join(root,'scripts'));mkdirSync(join(root,'.asset-pack/chunks'),{recursive:true});copyFileSync(new URL('../scripts/restore-assets.mjs',import.meta.url),join(root,'scripts/restore-assets.mjs'));const bytes=Buffer.from('offline synthetic media fixture');const digest=sha(bytes);const chunk='.asset-pack/chunks/'+digest+'.b64';writeFileSync(join(root,chunk),bytes.toString('base64'));const manifest={version:1,files:[{path:'src/media/test.jpg',size:bytes.length,sha256:digest,chunks:[{path:chunk,size:bytes.length,sha256:digest}]}]};writeFileSync(join(root,'.asset-pack/manifest.json'),JSON.stringify(manifest));return {root,bytes,manifest,chunk,run:()=>spawnSync(process.execPath,[join(root,'scripts/restore-assets.mjs')],{encoding:'utf8'}),clean:()=>rmSync(root,{recursive:true,force:true})};}
test('media bundle restores exact bytes and verifies existing originals',()=>{const f=fixture();try{assert.equal(f.run().status,0);assert.deepEqual(readFileSync(join(f.root,'src/media/test.jpg')),f.bytes);assert.equal(f.run().status,0);}finally{f.clean();}});
test('media restore refuses to overwrite edited originals',()=>{const f=fixture();try{assert.equal(f.run().status,0);writeFileSync(join(f.root,'src/media/test.jpg'),'user edit');assert.notEqual(f.run().status,0);assert.equal(readFileSync(join(f.root,'src/media/test.jpg'),'utf8'),'user edit');}finally{f.clean();}});
test('media restore rejects corrupt chunks and unsafe destinations',()=>{const f=fixture();try{writeFileSync(join(f.root,f.chunk),Buffer.from('corrupt').toString('base64'));assert.notEqual(f.run().status,0);assert.equal(existsSync(join(f.root,'src/media/test.jpg')),false);f.manifest.files[0].path='../outside.jpg';writeFileSync(join(f.root,'.asset-pack/manifest.json'),JSON.stringify(f.manifest));assert.notEqual(f.run().status,0);}finally{f.clean();}});
