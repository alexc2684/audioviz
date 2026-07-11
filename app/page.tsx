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
    const seasonal = (Math.sin(t * .035) + 1) * .5;
    const forestHue = 132 + seasonal * 48;

    // A slow breathing canopy grows inward from the frame, making the bloom
    // feel embedded in a living forest rather than suspended in empty space.
    for (let i = 0; i < 34; i++) {
      const side = i % 2;
      const seed = Math.sin(i * 91.73) * 43758.5453;
      const unit = seed - Math.floor(seed);
      const y = (i / 33) * h + Math.sin(t * .08 + i) * 18;
      const x = side ? w - unit * w * .16 : unit * w * .16;
      const leaf = 18 + (i % 7) * 7 + bass * 24;
      ctx.save(); ctx.translate(x, y); ctx.rotate((side ? Math.PI : 0) + Math.sin(t * .055 + i * .8) * .28);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(leaf * .7, -leaf * .65, leaf * 1.7, -leaf * .3, leaf * 2.1, 0); ctx.bezierCurveTo(leaf * 1.7, leaf * .3, leaf * .7, leaf * .65, 0, 0);
      ctx.fillStyle = `hsla(${forestHue + i % 4 * 12},58%,${20 + mids * 18}%,${.085 + mids * .1})`; ctx.fill();
      ctx.strokeStyle = `hsla(${forestHue + 22},65%,64%,${.07 + highs * .1})`; ctx.lineWidth = .6; ctx.stroke(); ctx.restore();
    }

    // Subterranean mycelium responds to the kick and slowly creeps upward.
    ctx.save(); ctx.globalCompositeOperation = "screen";
    for (let root = 0; root < 18; root++) {
      const origin = (root + .5) / 18 * w;
      ctx.beginPath(); ctx.moveTo(origin, h + 10);
      for (let step = 1; step <= 12; step++) {
        const yy = h - step * h * .045;
        const spread = Math.sin(root * 2.31 + step * 1.7 + t * .07) * (10 + step * 2.4);
        const pull = (cx - origin) * step / 12 * .13;
        ctx.lineTo(origin + spread + pull, yy);
      }
      ctx.strokeStyle = `hsla(${168 + root * 2 + seasonal * 30},78%,72%,${.06 + bass * .11})`;
      ctx.lineWidth = .45 + bass * 1.35; ctx.shadowBlur = 8 + bass * 18; ctx.shadowColor = "#76e5c2"; ctx.stroke();
    }
    ctx.restore();

    // Two orbiting petal fields make the original spectral bloom dimensional.
    ctx.save(); ctx.translate(cx, cy);
    for (let layer = 0; layer < 2; layer++) {
      const count = layer ? 72 : 96;
      const spin = t * (layer ? -.018 : .026);
      for (let i = 0; i < count; i++) {
        const a = i / count * Math.PI * 2 + spin;
        const f = bins[Math.floor(i / count * bins.length * (layer ? .58 : .78))] / 255;
        const breathe = Math.sin(t * .22 + i * .31) * 8;
        const r0 = Math.min(w,h) * (layer ? .16 : .075) + breathe;
        const length = (layer ? 22 : 42) + f * Math.min(w,h) * (layer ? .14 : .3) + (layer ? mids : bass) * 24;
        const width = .018 + f * .035;
        const x0 = Math.cos(a) * r0, y0 = Math.sin(a) * r0;
        const tip = r0 + length;
        ctx.beginPath(); ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(Math.cos(a - width) * (r0 + length * .62), Math.sin(a - width) * (r0 + length * .62), Math.cos(a) * tip, Math.sin(a) * tip);
        ctx.quadraticCurveTo(Math.cos(a + width) * (r0 + length * .62), Math.sin(a + width) * (r0 + length * .62), x0, y0);
        const petalHue = 286 + i * .72 + seasonal * 74 + layer * 28;
        ctx.fillStyle = `hsla(${petalHue},82%,66%,${.055 + f * .18})`; ctx.fill();
        ctx.strokeStyle = `hsla(${petalHue + 24},88%,76%,${.15 + f * .45})`; ctx.lineWidth = .55 + f * 1.4; ctx.stroke();
      }
    }
    const heart = ctx.createRadialGradient(0,0,0,0,0,Math.min(w,h)*.13);
    heart.addColorStop(0,`hsla(${318 + seasonal * 34},92%,82%,${.32 + bass * .34})`);
    heart.addColorStop(.22,`hsla(${278 + mids * 35},82%,58%,${.15 + mids * .18})`);
    heart.addColorStop(1,"rgba(24,5,34,0)"); ctx.fillStyle=heart; ctx.beginPath(); ctx.arc(0,0,Math.min(w,h)*.13,0,Math.PI*2); ctx.fill();
    ctx.restore();

    // High frequencies release drifting pollen and bioluminescent spores.
    ctx.save();
    for (let i = 0; i < 130; i++) {
      const sx = ((Math.sin(i * 923.17) * 43758.5453) % 1 + 1) % 1;
      const sy = ((Math.sin(i * 317.91) * 24634.6345) % 1 + 1) % 1;
      const x = (sx * w + Math.sin(t * (.025 + i % 5 * .003) + i) * (28 + i % 9)) % w;
      const y = (sy * h - t * (2 + i % 4) + h * 20) % h;
      const twinkle = Math.max(0, Math.sin(t * .8 + i * 2.7));
      const radius = .35 + (i % 5) * .18 + highs * (1.4 + twinkle * 2.2);
      ctx.beginPath(); ctx.arc(x,y,radius,0,Math.PI*2); ctx.fillStyle=`hsla(${92 + i % 5 * 28 + seasonal * 35},88%,78%,${.07 + highs * .3 * twinkle})`; ctx.shadowBlur=8+highs*14; ctx.shadowColor="#bbffd2"; ctx.fill();
    }
    ctx.restore();
  }
  ctx.globalCompositeOperation = "source-over"; ctx.shadowBlur = 0;
  ctx.fillStyle = `rgba(255,255,255,${.08 + highs * .14})`;
  const stars = 60; for (let i=0;i<stars;i++){ const x=(Math.sin(i*928.3)*.5+.5)*w, y=(Math.sin(i*337.1)*.5+.5)*h; const s=.4+(i%5===0?highs*2:0); ctx.fillRect(x,y,s,s); }
}

const fader = (n: number, v: number) => Math.max(.03, .12 - n * .008 + v * .12);

const BAND_RANGES = [
  { label: "LOW", range: "35–180", min: 35, max: 180, gain: 1.05 },
  { label: "MID", range: "180–2.5K", min: 180, max: 2500, gain: 1.28 },
  { label: "HIGH", range: "2K–10K", min: 2000, max: 10000, gain: 2.8 },
] as const;

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
  const panelBeforeFullscreen = useRef(true);
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
      const sampleRate = audioRef.current?.sampleRate || 48000;
      const hzPerBin = sampleRate / (analyser?.fftSize || 2048);
      const bandEnergy = ({min,max,gain}:{min:number;max:number;gain:number}) => {
        const start = Math.max(1, Math.floor(min / hzPerBin));
        const end = Math.min(bins.length, Math.ceil(max / hzPerBin));
        let power = 0, peak = 0;
        for (let i=start;i<end;i++) {
          const magnitude = (bins[i] || 0) / 255;
          power += magnitude * magnitude;
          peak = Math.max(peak, magnitude);
        }
        const rms = Math.sqrt(power / Math.max(1, end-start));
        const transientAware = rms * .68 + peak * .32;
        return Math.min(1, Math.pow(transientAware, .68) * gain);
      };
      const energy=BAND_RANGES.map(bandEnergy); drawScene(ctx,w,h,ms/1000,bins,sceneRef.current,energy);
      if(ms-lastUi>100){setLevel(energy);lastUi=ms;} frame++; raf=requestAnimationFrame(render);
    }; raf=requestAnimationFrame(render); return()=>cancelAnimationFrame(raf);
  }, []);

  useEffect(() => { if (!auto) return; const id=setInterval(()=>{ setScene(s=>SCENES[(SCENES.findIndex(x=>x.name===s)+1)%SCENES.length].name); },18000); return()=>clearInterval(id); },[auto]);
  const enterFullscreen = useCallback(async () => {
    panelBeforeFullscreen.current = panel;
    setPanel(false);
    try { await document.documentElement.requestFullscreen?.(); } catch { setPanel(panelBeforeFullscreen.current); }
  }, [panel]);

  useEffect(() => {
    const fullscreenChange = () => { if (!document.fullscreenElement) setPanel(panelBeforeFullscreen.current); };
    document.addEventListener("fullscreenchange", fullscreenChange);
    return () => document.removeEventListener("fullscreenchange", fullscreenChange);
  }, []);
  useEffect(() => { const key=(e:KeyboardEvent)=>{ if(e.key.toLowerCase()==="h")setPanel(p=>!p); if(e.key.toLowerCase()==="f")void enterFullscreen(); const n=Number(e.key); if(n>=1&&n<=4)setScene(SCENES[n-1].name); }; addEventListener("keydown",key); return()=>removeEventListener("keydown",key); },[enterFullscreen]);

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
    <div className={`meters ${panel?"":"hidden-ui"}`}>{BAND_RANGES.map((band,i)=><div key={band.label} title={`${band.min}–${band.max} Hz`}><span>{band.label}<small>{band.range}</small></span><b><i style={{width:`${Math.max(2,level[i]*100)}%`}}/></b></div>)}</div>
    <nav className={panel?"":"hidden-ui"} aria-label="Visual scenes">{SCENES.map(s=><button key={s.name} className={scene===s.name?"active":""} onClick={()=>setScene(s.name)}><em>{s.key}</em><span>{s.name}</span></button>)}</nav>
    <aside className={panel?"":"hidden-ui"}><button className={auto?"on":""} onClick={()=>setAuto(a=>!a)}>AUTO <i/></button><button onClick={enterFullscreen}>FULLSCREEN</button><span>F — CLEAN FULLSCREEN · H — HIDE UI</span></aside>
  </main>;
}
