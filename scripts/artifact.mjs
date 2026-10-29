import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
const names=readdirSync('dist/assets');
let css=names.filter(x=>x.endsWith('.css')).map(x=>readFileSync('dist/assets/'+x,'utf8')).join('\n');
let js=names.filter(x=>x.endsWith('.js')).map(x=>readFileSync('dist/assets/'+x,'utf8')).join('\n');
// Production media stays separate for caching and video preload=none.
// The read-only preview embeds those same assets to remain self-contained.
const mime={'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.mp4':'video/mp4'};
for(const name of names){const ext=name.slice(name.lastIndexOf('.'));if(!mime[ext])continue;const data='data:'+mime[ext]+';base64,'+readFileSync('dist/assets/'+name).toString('base64');js=js.replaceAll('/assets/'+name,data);css=css.replaceAll('/assets/'+name,data);}
let html=readFileSync('dist/index.html','utf8').replace(/<script[^>]+src="[^"]+"[^>]*><\/script>/g,'').replace(/<link[^>]+href="\/assets\/[^>]+>/g,'');
html=html.replace('</head>',()=>`<style>${css}</style><script>window.__STATIC_PREVIEW__=true;</script></head>`).replace('</body>',()=>`<script type="module">${js.replace(/<\/script/gi,'<\\/script')}</script></body>`);
writeFileSync('preview.html',html);
console.log('Self-contained landing, recorded walkthrough and planner preview written. No live server calls.');
