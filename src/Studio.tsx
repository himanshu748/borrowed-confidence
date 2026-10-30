import {useEffect, useRef, useState} from 'react';
import type {Event, Item} from '../shared/planner';
import before from '../live-evidence/outer-test/synthetic-person.jpg';
import garment from '../live-evidence/outer-test/synthetic-blazer.jpg';
import after from '../live-evidence/outer-test/youcam-result.jpg';

export interface Candidate {item: Item; event: Event}
type ImageKind = 'person' | 'reference';
type Job = {id?: string; state: string; resultUrl?: string; error?: string};
type Status = {liveEnabled: boolean; reason: string};
export function Studio({candidate, status, staticPreview, resolvedDecision, onDecision, onBack}: {
  candidate: Candidate | null; status: Status; staticPreview: boolean;
  resolvedDecision?: 'accept' | 'reject';
  onDecision: (id: string, decision: 'accept' | 'reject', evidence: 'replay' | 'live') => void;
  onBack: () => void;
}) {
  const [person, setPerson] = useState(''), [reference, setReference] = useState('');
  const [consent, setConsent] = useState(false), [category, setCategory] = useState('outer');
  const [job, setJob] = useState<Job | null>(null), [error, setError] = useState('');
  const [replay, setReplay] = useState(false), [submittedPerson, setSubmittedPerson] = useState('');
  const [submittedReference, setSubmittedReference] = useState('');
  const [split, setSplit] = useState(50), [deleted, setDeleted] = useState(false), [clearing, setClearing] = useState(false), [creating, setCreating] = useState(false);
  const poll = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0), submitting = useRef(false);
  const readers = useRef<Record<ImageKind, FileReader | null>>({person:null, reference:null});
  const readGeneration = useRef(0), clearingRef = useRef(false);
  const submitRequest = useRef<Promise<Response> | null>(null);
  const personInput = useRef<HTMLInputElement>(null), referenceInput = useRef<HTMLInputElement>(null);
  const busy = Boolean(job && !['success', 'error'].includes(job.state));
  const historical = candidate?.item.id === 'navy-blazer';
  function cancelReads() {
    readGeneration.current++;
    for (const kind of ['person','reference'] as const) {
      const reader = readers.current[kind]; readers.current[kind] = null;
      if (reader?.readyState === FileReader.LOADING) reader.abort();
    }
    if (personInput.current) personInput.current.value = '';
    if (referenceInput.current) referenceInput.current.value = '';
  }
  useEffect(() => {
    generation.current++; if (poll.current) clearTimeout(poll.current);
    cancelReads();
    submitting.current = false; setJob(null); setReplay(false); setReference(''); setConsent(false); setError('');
    setSubmittedPerson(''); setSubmittedReference(''); setDeleted(false);
    setCategory(candidate?.item.category === 'layer' ? 'outer' : 'upper_body');
  }, [candidate?.item.id, candidate?.event.id]);
  useEffect(() => () => {generation.current++; cancelReads(); if (poll.current) clearTimeout(poll.current);}, []);
  function readImage(file: File | undefined, kind: ImageKind) {
    if (!file || clearingRef.current || busy) return;
    const set = kind === 'person' ? setPerson : setReference;
    const previous = readers.current[kind]; readers.current[kind] = null;
    if (previous?.readyState === FileReader.LOADING) previous.abort();
    set('');
    setError(''); setReplay(false); setJob(null); setConsent(false); setDeleted(false);
    if (!['image/jpeg','image/png'].includes(file.type) || file.size >= 8 * 1024 * 1024) {
      set(''); setError('Use a JPG or PNG smaller than 8 MiB.'); return;
    }
    const reader = new FileReader();
    const token = readGeneration.current; readers.current[kind] = reader;
    const current = () => token === readGeneration.current && readers.current[kind] === reader && !clearingRef.current;
    reader.onerror = () => {if (current()) {readers.current[kind] = null; set(''); setError('The image could not be read. Choose it again.');}};
    reader.onload = () => {if (current()) {readers.current[kind] = null; set(String(reader.result));}};
    reader.readAsDataURL(file);
  }
  async function render() {
    if (submitting.current || submitRequest.current || clearingRef.current || busy || resolvedDecision === 'reject' || !candidate || !status.liveEnabled || !person || !reference || !consent) return;
    submitting.current = true; setCreating(true); const token = ++generation.current;
    if (poll.current) clearTimeout(poll.current);
    setError(''); setReplay(false); setDeleted(false); setSubmittedPerson(person); setSubmittedReference(reference); setJob({state:'submitting'});
    let request: Promise<Response> | null = null;
    try {
      request = fetch('/api/tryons', {method:'POST', headers:{'Content-Type':'application/json'}, signal:AbortSignal.timeout(30_000),
        body:JSON.stringify({personImage:person, garmentImage:reference, category, consent})});
      submitRequest.current = request;
      const response = await request;
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not start the preview.');
      if (token !== generation.current) return;
      if (!data.id) throw new Error('The server did not return a preview identifier.');
      setJob(data); let attempts = 0;
      const check = async () => {
        try {
          const response = await fetch('/api/tryons/' + encodeURIComponent(data.id), {signal:AbortSignal.timeout(30_000)});
          const next = await response.json();
          if (token !== generation.current) return;
          if (!response.ok) throw new Error(next.error || 'Could not read preview status.');
          setJob(next);
          if (!['success','error'].includes(next.state)) {
            if (++attempts >= 180) throw new Error('Status polling timed out. Work may still be running. No new render was started. Clear the session before trying again.');
            poll.current = setTimeout(check, 2000);
          } else submitting.current = false;
        } catch (e) {
          if (token === generation.current) {setError((e as Error).message); setJob({state:'error'}); submitting.current = false;}
        }
      };
      poll.current = setTimeout(check, 1200);
    } catch (e) {
      if (token === generation.current) {setJob({state:'error'}); setError((e as Error).message); submitting.current = false;}
    } finally {
      if (submitRequest.current === request) {submitRequest.current = null; setCreating(false);}
    }
  }
  async function clear() {
    if (clearingRef.current) return;
    clearingRef.current = true; setClearing(true); setDeleted(false);
    generation.current++; if (poll.current) clearTimeout(poll.current); submitting.current = false;
    cancelReads();
    setPerson(''); setReference(''); setJob(null); setConsent(false); setReplay(false); setSubmittedPerson(''); setSubmittedReference(''); setError('');
    try {
      // A first submit may still be establishing the session cookie. Wait before
      // deletion so its later response cannot silently create an uncleared job.
      let submissionUncertain = false;
      if (submitRequest.current) {try {await submitRequest.current;} catch {submissionUncertain = true;}}
      if (!staticPreview) {
        const response = await fetch('/api/session', {method:'DELETE', signal:AbortSignal.timeout(30_000)});
        if (!response.ok || submissionUncertain) throw new Error();
      }
      setDeleted(true);
    } catch {
      setError('Photos cleared in this browser. Server deletion could not be confirmed; reconnect and retry Clear photos & session. Provider-held images are not deleted.');
    } finally {
      clearingRef.current = false; setClearing(false);
    }
  }
  const result = replay ? after : job?.state === 'success' ? job.resultUrl : undefined;
  const source = replay ? before : submittedPerson;
  const progress = ['Submitting images','Queued','Uploading to YouCam','Rendering appearance','Complete'];
  const stage = ({submitting:0, queued:1, uploading:2, rendering:3, success:4} as Record<string,number>)[job?.state || ''] ?? -1;
  return <section className="studio" aria-label="YouCam garment inspection">
    <div className="section-top"><div><div className="eyebrow">PLAN → PREVIEW → DECIDE</div><h2 tabIndex={-1}>See the piece. Keep your judgment.</h2><p>Inspect appearance before accepting a candidate. Physical fit and exact garment details need an in-person check.</p></div><button className="text-btn" onClick={onBack}>← Back to your week</button></div>
    {candidate ? <div className="candidate-context panel"><div><span className="eyebrow">YOUR SELECTED CANDIDATE</span><h3>{candidate.item.name}</h3><p>{candidate.event.name} · {candidate.event.date} · {candidate.item.source === 'borrow' ? `${candidate.item.loanDays} calendar-day sample loan` : candidate.item.source === 'buy' ? `Fictional purchase option · ₹${candidate.item.price}` : 'From your wardrobe'}</p></div><span className={'source '+candidate.item.source}>{candidate.item.source}</span></div> : <div className="alert">Select a shirt or layer from a proposed outfit in Your week. Your decision will apply to that exact garment.</div>}
    {error && <div className="alert error" role="alert">{error}</div>}
    {deleted && <div className="alert" role="status">Local photos and application session cleared. This does not delete provider-held images or downloaded copies.</div>}
    {historical && <div className="verified-example panel"><div><span className="eyebrow">GENUINE YOUCAM EVIDENCE / OCT 25, 2026</span><h3>One blazer. One real outerwear result.</h3><p>A recorded result from an authorized cloth-v4 <b>outer</b> request. Both inputs depict synthetic demo assets. About 29 seconds, 2 API units. This replay makes no new API call and does not use your uploaded photo.</p></div><button className="primary" disabled={busy||clearing||creating} onClick={() => {cancelReads(); setReplay(true); setJob(null); setError(''); setConsent(false);}}>Inspect verified result replay ↗</button></div>}
    {result ? <div className="inspection-result panel"><div className="section-top"><div><span className="eyebrow">{replay ? 'HISTORICAL PROVIDER RESULT · SYNTHETIC INPUTS' : 'RESULT FROM YOUR SUBMITTED YOUCAM REQUEST'}</span><h3>Before / after, on your terms.</h3></div><span className="pill">{replay ? 'Replay · no units spent now' : 'Live request completed'}</span></div><div className="comparison-layout"><figure><img src={replay ? garment : submittedReference} alt={replay ? 'Synthetic reference: a single navy blazer' : 'Garment reference submitted for this preview'}/><figcaption>Garment reference</figcaption></figure><div><div className="comparison"><img src={result} alt="YouCam generated appearance showing the candidate garment" onError={() => {setError('The result image could not load. Its signed link may have expired. No new render was started.'); setJob(null); setReplay(false);}}/><div className="comparison-before" style={{clipPath:`inset(0 ${100-split}% 0 0)`}}><img src={source} alt="Person image before YouCam processing"/></div><span className="compare-label before">Before</span><span className="compare-label after">After · YouCam</span><span className="compare-divider" style={{left:split+'%'}}/></div><label className="compare-control">Compare before and after<input aria-label="Before and after comparison" type="range" min="0" max="100" value={split} onChange={e=>setSplit(Number(e.target.value))}/></label></div></div><p className="footnote">{replay ? 'In this example, the white shirt remains visible under the blazer. One successful example is not evidence of general layering reliability. The earlier upper_body test replaced the base shirt; both reports are preserved in the repository.' : 'Inspect the generated image yourself. Clothing details, anatomy and color may differ from the actual garment.'} No physical fit, exact sizing, fabric fidelity or purchase outcome is inferred.</p>{candidate && (resolvedDecision==='reject' ? <div className="decision-bar"><div><b>Rejected from your week</b><p>This inspection is preserved for context. Reconsider the garment in The wardrobe before using it again.</p></div><button className="text-btn" onClick={onBack}>← Back to your week</button></div> : <div className="decision-bar"><div><b>Would you keep this candidate?</b><p>Accept keeps it in your shortlist. Reject excludes this item across all events and recalculates the actual plan.</p></div><button className="primary" onClick={()=>onDecision(candidate.item.id,'accept',replay?'replay':'live')}>Accept candidate ✓</button><button className="reject-button" onClick={()=>onDecision(candidate.item.id,'reject',replay?'replay':'live')}>Reject & recalculate ↻</button></div>)}</div> : <div className="studio-empty panel"><h3>{busy ? 'Your request is in progress.' : 'A visual decision, connected to your plan.'}</h3><p>{busy ? 'You can return to the timetable while we poll this one request. There are no automatic rendering retries.' : historical ? 'Inspect the verified example above, or explicitly submit permissioned images below when live processing is enabled.' : 'Upload your person image and this garment’s reference below. A successful YouCam result enables your decision.'}</p></div>}
    {job && <ol className="render-progress" aria-label="Preview progress" aria-live="polite">{progress.map((label,index)=><li className={stage>=index?'reached':''} key={label}>{stage>index?'✓ ':''}{label}</li>)}{job.state==='error'&&<li className="progress-error">{job.error || 'Request stopped. No automatic retry.'}</li>}</ol>}
    <details className="live-form panel" open={!result}><summary>Generate a new YouCam preview <span className="pill">{status.liveEnabled ? 'Operator enabled' : 'Live processing disabled'}</span></summary><p>{status.reason}</p><div className="studio-inputs"><div><h3>01. A consented person image</h3><p>One adult, front-facing and well lit. For outerwear, show the base outfit you want to preserve.</p><label className="upload">{person ? <img src={person} alt="Person image selected locally"/> : <><span>+</span><b>Choose person photo</b><small>JPEG / PNG · under 8 MiB</small></>}<input ref={personInput} type="file" aria-label="Upload person photo" disabled={busy||clearing||creating} accept="image/jpeg,image/png" onChange={e=>readImage(e.target.files?.[0],'person')}/></label></div><div><h3>02. This garment’s reference</h3><p>Use a clear photo of the selected garment, with permission. Planning illustrations are never sent to YouCam.</p><label className="upload">{reference ? <img src={reference} alt="Garment reference selected locally"/> : <><span>+</span><b>Choose garment reference</b><small>A single garment · no collage</small></>}<input ref={referenceInput} type="file" aria-label="Upload garment reference" disabled={busy||clearing||creating} accept="image/jpeg,image/png" onChange={e=>readImage(e.target.files?.[0],'reference')}/></label></div></div><p className="footnote">Images must be at least 512 × 384 pixels in either orientation, with no side over 4096 pixels. A reference is associated with your selected item by your confirmation; the app cannot verify its identity.</p><div className="studio-controls"><label>Garment category<select value={category} disabled={busy||clearing||creating} onChange={e=>{cancelReads();setCategory(e.target.value);setConsent(false);setError('');}}><option value="outer">Outerwear · layer over base</option><option value="upper_body">Upper body · replace top</option><option value="full_body">Full body · worn reference</option></select></label><label className="consent"><input type="checkbox" checked={consent} disabled={busy||clearing||creating} onChange={e=>setConsent(e.target.checked)}/><span>I am an adult, have permission to process both images, and confirm the reference shows the selected garment. I consent to sending them to YouCam. Generated appearance is not sizing advice.</span></label><button className="primary" onClick={render} disabled={!candidate||resolvedDecision==='reject'||!status.liveEnabled||!person||!reference||!consent||busy||clearing||creating}>Generate real preview ↗</button></div></details>
    <button className="text-btn" onClick={clear} disabled={clearing}>{clearing?'Clearing photos & session…':'Clear photos & session'}</button><p className="footnote">Submitted images pass through this server to YouCam. Source bytes are not written to application storage. Local session deletion cannot delete images held by YouCam. Signed result links are private and may expire. No visitor API key is requested. Wardrobe edits remain in browser memory until refresh.</p>
  </section>;
}
