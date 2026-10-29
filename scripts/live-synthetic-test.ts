// One authorized real API test using synthetic assets only. Never logs credentials or signed URLs.
import {createApp} from '../server/index';
import {safeProviderUrl} from '../server/youcam';
import {readFileSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
import sharp from 'sharp';
import {setTimeout as pause} from 'node:timers/promises';
const personPath=process.argv[2],garmentPath=process.argv[3];
if(!personPath||!garmentPath)throw new Error('Provide synthetic person and garment file paths.');
const category=process.argv[4]??'upper_body';
if(!['upper_body','full_body','outer'].includes(category))throw new Error('Unsupported test category.');
const out=process.argv[5]??'live-evidence';mkdirSync(out,{recursive:true});
if(existsSync(out+'/verification.json'))throw new Error('Test evidence already exists. Choose a new authorized run directory.');
writeFileSync(out+'/attempt.json',JSON.stringify({category,syntheticInputs:true,attemptedAt:new Date().toISOString()}),{flag:'wx'});
const app=createApp({env:{...process.env,ALLOW_LIVE_TRYON:'true',APP_ORIGIN:'http://localhost:5173',NODE_ENV:'development'},dbPath:':memory:',providerTimeoutMs:105000});
const server=app.listen(0,'127.0.0.1');
await new Promise<void>(r=>server.once('listening',r));
const port=(server.address() as {port:number}).port;
const base='http://127.0.0.1:'+port;
const began=new Date();let state='not_started';
try{
 const dataUrl=async(path:string)=>'data:image/jpeg;base64,'+(await sharp(readFileSync(path)).rotate().jpeg({quality:92}).toBuffer()).toString('base64');
 const personImage=await dataUrl(personPath),garmentImage=await dataUrl(garmentPath);
 const start=await fetch(base+'/api/tryons',{method:'POST',headers:{Origin:'http://localhost:5173','Content-Type':'application/json'},body:JSON.stringify({personImage,garmentImage,category,consent:true})});
 const job=await start.json() as {id?:string;error?:string};
 if(!start.ok||!job.id){console.log(JSON.stringify({stage:'submit',httpStatus:start.status,error:job.error||'No job identifier'}));process.exitCode=1;}
 else{
 const cookie=(start.headers.get('set-cookie')||'').split(';')[0];let final:any;
 for(let i=0;i<75;i++){
  const response=await fetch(base+'/api/tryons/'+encodeURIComponent(job.id),{headers:{Cookie:cookie}});
  final=await response.json();
  if(final.state!==state){state=final.state;console.log(JSON.stringify({stage:'processing',state}));}
  if(['success','error'].includes(state))break;
  await pause(1500);
 }
 if(state==='success'&&final?.resultUrl){
  const url=safeProviderUrl(final.resultUrl);
  const result=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(25000)});
  if(!result.ok||!/^image\/(jpeg|png)/.test(result.headers.get('content-type')||''))throw new Error('Result could not be retrieved as an image.');
  if(!result.body)throw new Error('Result body empty.');
  const reader=result.body.getReader();const chunks:Uint8Array[]=[];let size=0;
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>10*1024*1024){await reader.cancel();throw new Error('Result too large.');}chunks.push(value);}
  const bytes=await sharp(Buffer.concat(chunks)).jpeg({quality:94}).toBuffer();
  writeFileSync(out+'/youcam-result.jpg',bytes);
  const meta=await sharp(bytes).metadata();
  const evidence={provider:'YouCam',endpoint:'cloth-v4',category,syntheticInputs:true,realProviderResult:true,state:'success',startedAt:began.toISOString(),finishedAt:new Date().toISOString(),elapsedSeconds:Math.round((Date.now()-began.getTime())/1000),width:meta.width,height:meta.height,resultFile:out+'/youcam-result.jpg',listedUnitsPerResult:2};
  writeFileSync(out+'/verification.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
 }else{console.log(JSON.stringify({stage:'result',state,error:final?.error||'Test did not finish within the bounded window.'}));process.exitCode=1;}
 }
}catch{console.log(JSON.stringify({stage:'test',error:'The live verification could not complete. No automatic paid retry was attempted.'}));process.exitCode=1;}
finally{await new Promise<void>(r=>server.close(()=>r()));await app.locals.close();}
