"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Scene = "Aurora" | "Tidal" | "Orbit" | "Bloom";

const SCENES: { name: Scene; key: string; note: string }[] = [
  { name: "Aurora", key: "01", note: "fluid horizon" },
  { name: "Tidal", key: "02", note: "ocean waveform" },
  { name: "Orbit", key: "03", note: "celestial pulse" },
  { name: "Bloom", key: "04", note: "spectral garden" },
];

function drawScene(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, bins: Uint8Array, scene: Scene, energy: number[]) {
  const [bass, mids, highs] = energy;
  const cx = w / 2, cy = h / 2;
  const grad = ctx.createRadialGradient(cx, cy * .75, 0, cx, cy, Math.max(w, h) * .8);
  const hue = scene === "Tidal" ? 190 : scene === "Orbit" ? 268 : scene === "Bloom" ? 324 : 212;
  grad.addColorStop(0, `hsla(${hue + mids * 28},55%,${10 + bass * 8}%,1)`);
  grad.addColorStop(.55, `hsla(${hue - 18},48%,5%,1)`);
  grad.addColorStop(1, "#020305");
  ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);

  ctx.globalCompositeOperation = "screen";
  if (scene === "Aurora") {
    for (let layer = 0; layer < 5; layer++) {
      ctx.beginPath();
      const y0 = h * (.3 + layer * .095);
      for (let x = -20; x <= w + 20; x += 10) {
        const f = bins[Math.min(bins.length - 1, Math.floor((x / w) * bins.length * .45))] / 255;
        const y = y0 + Math.sin(x * .004 + t * (.18 + layer * .03) + layer) * h * (.035 + f * .09) + Math.cos(x * .0015 - t * .09) * 28;
        x === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `hsla(${188 + layer * 17 + highs * 25},75%,68%,${.10 + mids * .18})`;
      ctx.lineWidth = 1 + bass * 4; ctx.shadowBlur = 26 + highs * 44; ctx.shadowColor = `hsl(${190 + layer * 14},80%,60%)`; ctx.stroke();
    }
  } else if (scene === "Tidal") {
    for (let layer = 0; layer < 9; layer++) {
      ctx.beginPath();
      const y0 = h * (.38 + layer * .055);
      for (let x = 0; x <= w; x += 7) {
        const f = bins[Math.min(bins.length - 1, Math.floor(x / w * bins.length * .6))] / 255;
        const y = y0 + Math.sin(x * .007 + t * (.35 + layer * .02) + layer * .5) * (14 + f * 70) + Math.sin(x * .002 - t * .16) * 30;
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = `hsla(${176 + layer * 6},80%,70%,${.08 + fader(layer, bass)})`; ctx.lineWidth = 1.2; ctx.stroke();
    }
  } else if (scene === "Orbit") {
    const n = 180;
    ctx.translate(cx, cy);
    for (let ring = 0; ring < 4; ring++) {
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const a = i / n * Math.PI * 2;
        const f = bins[Math.floor(i / n * bins.length * .7)] / 255;
        const r = Math.min(w, h) * (.12 + ring * .075) + f * (38 + ring * 12) + Math.sin(a * (3 + ring) + t * .4) * 8;
        const x = Math.cos(a + t * .025 * (ring + 1)) * r, y = Math.sin(a) * r * .72;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath(); ctx.strokeStyle = `hsla(${250 + ring * 18},84%,72%,${.16 + highs * .25})`; ctx.lineWidth = 1 + bass * 2; ctx.shadowBlur = 22; ctx.shadowColor = "#866cff"; ctx.stroke();
    }
    ctx.setTransform(1,0,0,1,0,0);
  } else {
    ctx.translate(cx, cy);
    for (let i = 0; i < 96; i++) {
      const a = i / 96 * Math.PI * 2 + t * .025;
      const f = bins[Math.floor(i / 96 * bins.length * .72)] / 255;
      const r0 = Math.min(w,h) * .09, r1 = r0 + 35 + f * Math.min(w,h) * .27;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.strokeStyle = `hsla(${295 + i * .7 + t * 2},82%,70%,${.08 + f * .48})`; ctx.lineWidth = .8 + f * 2; ctx.stroke();
    }
    ctx.setTransform(1,0,0,1,0,0);
  }
  ctx.globalCompositeOperation = "source-over"; ctx.shadowBlur = 0;
  ctx.fillStyle = `rgba(255,255,255,${.08 + highs * .14})`;
  const stars = 60; for (let i=0;i<stars;i++){ const x=(Math.sin(i*928.3)*.5+.5)*w, y=(Math.sin(i*337.1)*.5+.5)*h; const s=.4+(i%5===0?highs*2:0); ctx.fillRect(x,y,s,s); }
}

const fader = (n: number, v: number) => Math.max(.03, .12 - n * .008 + v * .12);

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const [scene, setScene] = useState<Scene>("Aurora");
  const sceneRef = useRef<Scene>(scene);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [active, setActive] = useState(false);
  const [panel, setPanel] = useState(true);
  const [auto, setAuto] = useState(false);
  const [error, setError] = useState("");
  const [level, setLevel] = useState([0,0,0]);

  useEffect(() => { sceneRef.current = scene; }, [scene]);
  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then(ds => setDevices(ds.filter(d => d.kind === "audioinput")));
  }, []);

  const connect = useCallback(async () => {
    try {
      streamRef.current?.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({ audio: deviceId ? { deviceId: { exact: deviceId }, echoCancellation: false, noiseSuppression: false, autoGainControl: false } : { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const ac = audioRef.current || new AudioContext(); audioRef.current = ac; await ac.resume();
      const analyser = ac.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = .82;
      ac.createMediaStreamSource(stream).connect(analyser); analyserRef.current = analyser; streamRef.current = stream;
      const ds = await navigator.mediaDevices.enumerateDevices(); setDevices(ds.filter(d => d.kind === "audioinput"));
      setActive(true); setError("");
    } catch { setError("Audio access was blocked. Allow microphone access, then select BlackHole."); }
  }, [deviceId]);

  useEffect(() => {
    const canvas = canvasRef.current!; const ctx = canvas.getContext("2d")!; let frame = 0; let raf = 0; let lastUi = 0;
    const render = (ms: number) => {
      const dpr = Math.min(devicePixelRatio, 2); const w = innerWidth, h = innerHeight;
      if (canvas.width !== w*dpr || canvas.height !== h*dpr) { canvas.width=w*dpr; canvas.height=h*dpr; canvas.style.width=`${w}px`; canvas.style.height=`${h}px`; }
      ctx.setTransform(dpr,0,0,dpr,0,0);
      const analyser = analyserRef.current; const bins = new Uint8Array(analyser?.frequencyBinCount || 1024); analyser?.getByteFrequencyData(bins);
      const avg=(a:number,b:number)=>{let s=0;for(let i=a;i<b;i++)s+=bins[i]||0;return s/Math.max(1,b-a)/255};
      const energy=[avg(1,18),avg(18,95),avg(95,380)]; drawScene(ctx,w,h,ms/1000,bins,sceneRef.current,energy);
      if(ms-lastUi>100){setLevel(energy);lastUi=ms;} frame++; raf=requestAnimationFrame(render);
    }; raf=requestAnimationFrame(render); return()=>cancelAnimationFrame(raf);
  }, []);

  useEffect(() => { if (!auto) return; const id=setInterval(()=>{ setScene(s=>SCENES[(SCENES.findIndex(x=>x.name===s)+1)%SCENES.length].name); },18000); return()=>clearInterval(id); },[auto]);
  useEffect(() => { const key=(e:KeyboardEvent)=>{ if(e.key.toLowerCase()==="h")setPanel(p=>!p); if(e.key.toLowerCase()==="f")document.documentElement.requestFullscreen?.(); const n=Number(e.key); if(n>=1&&n<=4)setScene(SCENES[n-1].name); }; addEventListener("keydown",key); return()=>removeEventListener("keydown",key); },[]);

  return <main>
    <canvas ref={canvasRef} aria-hidden="true" />
    <div className="grain" />
    <header className={panel?"":"hidden-ui"}><div className="brand"><span className="mark">AV</span><span>DEEP / SIGNAL</span></div><div className="status"><i className={active?"live":""}/>{active?"LIVE INPUT":"AWAITING SIGNAL"}</div></header>
    <section className={`hero ${panel?"":"hidden-ui"}`}>
      <p className="eyebrow">AUDIO–REACTIVE ENVIRONMENT</p><h1>{scene}</h1><p className="sub">{SCENES.find(s=>s.name===scene)?.note}</p>
      {!active && <div className="connect">
        <label htmlFor="source">AUDIO SOURCE</label><select id="source" value={deviceId} onChange={e=>setDeviceId(e.target.value)}><option value="">Default input</option>{devices.map(d=><option key={d.deviceId} value={d.deviceId}>{d.label||"Audio input"}</option>)}</select>
        <button onClick={connect}>CONNECT SIGNAL <span>↗</span></button><p>Route Ableton’s master output to BlackHole, then select it here.</p>{error&&<p className="error">{error}</p>}
      </div>}
    </section>
    <div className={`meters ${panel?"":"hidden-ui"}`}>{["LOW","MID","HIGH"].map((x,i)=><div key={x}><span>{x}</span><b><i style={{width:`${Math.max(2,level[i]*100)}%`}}/></b></div>)}</div>
    <nav className={panel?"":"hidden-ui"} aria-label="Visual scenes">{SCENES.map(s=><button key={s.name} className={scene===s.name?"active":""} onClick={()=>setScene(s.name)}><em>{s.key}</em><span>{s.name}</span></button>)}</nav>
    <aside className={panel?"":"hidden-ui"}><button className={auto?"on":""} onClick={()=>setAuto(a=>!a)}>AUTO <i/></button><button onClick={()=>document.documentElement.requestFullscreen?.()}>FULLSCREEN</button><span>H — HIDE UI</span></aside>
  </main>;
}
