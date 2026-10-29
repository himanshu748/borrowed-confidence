"""Read-only price and balance lookup. Never logs auth headers or raw errors."""
import json, os, urllib.request, urllib.error
API='https://yce-api-01.makeupar.com'
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs):return None
opener=urllib.request.build_opener(NoRedirect())
def get(path):
 try:
  req=urllib.request.Request(API+path,headers={'Authorization':'Bearer '+os.environ['YOUCAM_API_KEY'],'Accept':'application/json'})
  with opener.open(req,timeout=25) as response:
   raw=response.read(262145)
   if len(raw)>262144:return None,{'reason':'oversize'}
   return json.loads(raw),{'httpStatus':response.status}
 except urllib.error.HTTPError as e:return None,{'httpStatus':e.code}
 except Exception:return None,{'reason':'request_failed'}
def dicts(x):
 if isinstance(x,dict):
  yield x
  for v in x.values():yield from dicts(v)
 elif isinstance(x,list):
  for v in x:yield from dicts(v)
def safe(d):
 return {k:v for k,v in d.items() if not any(w in k.lower() for w in ['token','secret','authorization','url','client']) and isinstance(v,(str,int,float,bool,type(None))) and len(str(v))<500}
found=[];token=None;pages=0
for _ in range(15):
 path='/s2s/v2.0/credit/feature-cost?page_size=20'
 if token:path+='&starting_token='+urllib.parse.quote(str(token),safe='')
 payload,status=get(path)
 if payload is None:print(json.dumps({'pricingError':status}));break
 pages+=1
 for d in dicts(payload):
  scalar=safe(d)
  if any('cloth' in str(v).lower() for v in scalar.values()):found.append(scalar)
 nexts=[d.get('next_token') for d in dicts(payload) if d.get('next_token')]
 if not nexts:break
 token=nexts[0]
balance,bs=get('/s2s/v1.0/client/credit')
numbers=[]
if balance:
 for d in dicts(balance):
  row={k:v for k,v in safe(d).items() if isinstance(v,(int,float)) and any(x in k.lower() for x in ['credit','balance','unit','amount'])}
  if row:numbers.append(row)
print(json.dumps({'pagesRead':pages,'clothesPricing':found,'balanceStatus':bs,'balanceFields':numbers,'photosUploaded':0,'renderTasksCreated':0}))
