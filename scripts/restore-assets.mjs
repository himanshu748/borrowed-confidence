import {readFileSync,writeFileSync,mkdirSync,existsSync,lstatSync} from 'node:fs';
import {resolve,dirname,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=message=>{throw new Error(message);};
const manifest=JSON.parse(readFileSync(resolve(root,'.asset-pack/manifest.json'),'utf8'));
if(manifest.version!==1||!Array.isArray(manifest.files)||manifest.files.length>100)fail('Unsupported media manifest.');
let restored=0,verified=0;
for(const file of manifest.files){
 if(typeof file.path!=='string'||! /^(src\/media|live-evidence)\/[A-Za-z0-9_./-]+\.(jpg|jpeg|png|mp4)$/.test(file.path)||file.path.split('/').some(x=>x==='..'||x==='.'||!x))fail('Unsafe media destination.');
 if(!Number.isSafeInteger(file.size)||file.size<1||file.size>10*1024*1024||!/^[a-f0-9]{64}$/.test(file.sha256)||!Array.isArray(file.chunks)||file.chunks.length>60)fail('Invalid media specification.');
 const dest=resolve(root,file.path);const rel=relative(root,dest);
 if(rel.startsWith('..')||rel.startsWith(sep))fail('Media destination leaves the project.');
 let cursor=root;
 for(const segment of rel.split(sep)){cursor=resolve(cursor,segment);if(existsSync(cursor)&&lstatSync(cursor).isSymbolicLink())fail('Symlink in media destination.');}
 if(existsSync(dest)){if(hash(readFileSync(dest))!==file.sha256)fail('Refusing to overwrite modified media: '+file.path);verified++;continue;}
 const pieces=[];let count=0;
 for(const chunk of file.chunks){
  if(typeof chunk.path!=='string'||!/^\.asset-pack\/chunks\/[a-f0-9]{64}\.b64$/.test(chunk.path)||!Number.isSafeInteger(chunk.size)||chunk.size<1||chunk.size>196608||!/^[a-f0-9]{64}$/.test(chunk.sha256))fail('Invalid media chunk.');
  const path=resolve(root,chunk.path);if(lstatSync(path).isSymbolicLink())fail('Symlink media chunk.');
  const encoded=readFileSync(path,'utf8').trim();if(encoded.length>262144||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded))fail('Invalid media encoding.');
  const bytes=Buffer.from(encoded,'base64');if(bytes.length!==chunk.size||hash(bytes)!==chunk.sha256)fail('Media chunk checksum mismatch.');
  pieces.push(bytes);count+=bytes.length;if(count>file.size)fail('Media exceeds declared size.');
 }
 const bytes=Buffer.concat(pieces);if(bytes.length!==file.size||hash(bytes)!==file.sha256)fail('Media checksum mismatch.');
 mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,bytes,{flag:'wx'});restored++;
}
console.log(`Media verified: ${verified}. Original files restored: ${restored}. No network requests.`);
