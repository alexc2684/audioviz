"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Scene = "Aurora" | "Tidal" | "Orbit" | "Bloom";

const SCENES: { name: Scene; key: string; note: string }[] = [
  { name: "Aurora", key: "01", note: "fluid horizon" },
  { name: "Tidal", key: "02", note: "ocean waveform" },
  { name: "Orbit", key: "03", note: "celestial pulse" },
  { name: "Bloom", key: "04", note: "spectral garden" },
];

const FLOW_VERTEX = `#version 300 es
in vec2 a_pos;
void main(){gl_Position=vec4(a_pos,0.,1.);}`;

// Adapted from the domain-warped organic engine in the reference audioviz.
// It remains a true shader layer; the original 2D Bloom is composited above it.
const FLOW_FRAGMENT = `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 u_res;
uniform float u_time,u_bass,u_mid,u_high;
#define TAU 6.28318530718
float hash21(vec2 p){p=fract(p*vec2(234.34,435.345));p+=dot(p,p+34.23);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1,0)),u.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 r=mat2(.8,.6,-.6,.8);for(int i=0;i<5;i++){v+=a*noise(p);p=r*p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
vec3 pal(float t,vec3 a,vec3 b,vec3 c,vec3 d){return a+b*cos(TAU*(c*t+d));}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*u_res)/min(u_res.x,u_res.y);
  float t=u_time;
  float evo=t*.028;
  float zoom=2.0+.28*sin(t*.023)-.14*u_bass;
  vec2 p=uv*zoom;
  float a=t*.008+.1*sin(t*.031);p=mat2(cos(a),-sin(a),sin(a),cos(a))*p;
  p+=.22*vec2(sin(evo*.9),cos(evo*.7));
  float flow=t*(.045+.085*u_mid);
  vec2 q=vec2(fbm(p+.1*flow),fbm(p+vec2(5.2,1.3)-.08*flow));
  vec2 r=vec2(fbm(p+(2.+.45*u_bass)*q+vec2(1.7,9.2)+.15*flow),fbm(p+2.*q+vec2(8.3,2.8)-.13*flow));
  float f=fbm(p+2.6*r+.25*u_bass*q);
  float ridge=1.-abs(2.*fbm(p*.9+1.5*r+.05*evo)-1.);
  f=mix(f,f*.55+ridge*.5,(.5+.5*sin(evo*.27+1.7))*.45);
  float shade=f*f*1.6+.25*q.x+.2*r.y;
  vec3 col=pal(shade,vec3(.18,.055,.22),vec3(.30,.18,.32),vec3(1.,.9,1.),vec3(.88,.52,.38));
  float vein=1.-abs(2.*fbm(p*1.4+3.*r)-1.);vein=pow(vein,5.+2.*sin(evo*.19));
  col+=pal(shade+.35,vec3(.08,.16,.15),vec3(.16,.34,.28),vec3(1.),vec3(.2,.5,.7))*vein*(.26+.9*u_mid);
  float ca=pow(smoothstep(.55,1.,noise(p*6.+r*4.+vec2(0.,flow*.6))),3.);
  col+=vec3(.55,.85,.9)*ca*(.08+u_high*1.15);
  float d=length(uv);col+=vec3(.5,.12,.52)*pow(u_bass,1.4)*smoothstep(.9,0.,d)*.7;
  vec2 sp=uv*22.;vec2 cell=floor(sp);float star=hash21(cell);float tw=sin(t*(2.+4.*star)+star*40.)*.5+.5;
  col+=vec3(.9,1.,.85)*smoothstep(.985,1.,star)*tw*smoothstep(.35,0.,length(fract(sp)-.5))*(.08+1.2*u_high);
  col*=.34+.22*(u_bass+u_mid+u_high)/3.;
  col*=1.-.58*dot(uv,uv);col+=(hash21(gl_FragCoord.xy+fract(t)*100.)-.5)*.012;
  col=max(col,0.);col=col/(1.+col*.6);col=pow(col,vec3(.92));
  float l=dot(col,vec3(.299,.587,.114));col=mix(vec3(l),col,1.15);
  fragColor=vec4(col,1.);
}`;

function drawScene(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, bins: Uint8Array, scene: Scene, energy: number[]) {
  const [bass, mids, highs] = energy;
  const cx = w / 2, cy = h / 2;
  const grad = ctx.createRadialGradient(cx, cy * .75, 0, cx, cy, Math.max(w, h) * .8);
  const hue = scene === "Tidal" ? 190 : scene === "Orbit" ? 268 : scene === "Bloom" ? 324 : 212;
  grad.addColorStop(0, `hsla(${hue + mids * 28},55%,${10 + bass * 8}%,1)`);
  grad.addColorStop(.55, `hsla(${hue - 18},48%,5%,1)`);
  grad.addColorStop(1, "#020305");
  if (scene === "Bloom") ctx.clearRect(0, 0, w, h);
  else { ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h); }

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
    ctx.shadowBlur = 14 + highs * 28; ctx.shadowColor = "#ef8fff";
    for (let i = 0; i < 96; i++) {
      const a = i / 96 * Math.PI * 2 + t * .025;
      const f = bins[Math.floor(i / 96 * bins.length * .72)] / 255;
      const r0 = Math.min(w,h) * .09, r1 = r0 + 35 + f * Math.min(w,h) * .27;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.strokeStyle = `hsla(${295 + i * .7 + t * 2},88%,76%,${.2 + f * .56})`; ctx.lineWidth = 1 + f * 2.4; ctx.stroke();
    }
    ctx.setTransform(1,0,0,1,0,0);
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
  const flowCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const [scene, setScene] = useState<Scene>("Aurora");
  const sceneRef = useRef<Scene>(scene);
  const energyRef = useRef([0,0,0]);
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
      const energy=BAND_RANGES.map(bandEnergy); energyRef.current=energy; drawScene(ctx,w,h,ms/1000,bins,sceneRef.current,energy);
      if(ms-lastUi>100){setLevel(energy);lastUi=ms;} frame++; raf=requestAnimationFrame(render);
    }; raf=requestAnimationFrame(render); return()=>cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const canvas=flowCanvasRef.current; if(!canvas) return;
    const gl=canvas.getContext("webgl2",{antialias:false}); if(!gl) return;
    const shader=(type:number,source:string)=>{const s=gl.createShader(type)!;gl.shaderSource(s,source);gl.compileShader(s);return s;};
    const program=gl.createProgram()!;gl.attachShader(program,shader(gl.VERTEX_SHADER,FLOW_VERTEX));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,FLOW_FRAGMENT));gl.linkProgram(program);gl.useProgram(program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const pos=gl.getAttribLocation(program,"a_pos");gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
    const res=gl.getUniformLocation(program,"u_res"),time=gl.getUniformLocation(program,"u_time"),bass=gl.getUniformLocation(program,"u_bass"),mid=gl.getUniformLocation(program,"u_mid"),high=gl.getUniformLocation(program,"u_high");
    let raf=0;
    const render=(ms:number)=>{const scale=Math.min(devicePixelRatio,1.5),w=Math.floor(innerWidth*scale),h=Math.floor(innerHeight*scale);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}const visible=sceneRef.current==="Bloom";canvas.style.opacity=visible?"1":"0";if(visible){gl.uniform2f(res,w,h);gl.uniform1f(time,ms/1000);gl.uniform1f(bass,energyRef.current[0]);gl.uniform1f(mid,energyRef.current[1]);gl.uniform1f(high,energyRef.current[2]);gl.drawArrays(gl.TRIANGLES,0,3);}raf=requestAnimationFrame(render);};
    raf=requestAnimationFrame(render);return()=>{cancelAnimationFrame(raf);gl.deleteProgram(program);};
  },[]);

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
    <canvas ref={flowCanvasRef} className="flow-canvas" aria-hidden="true" />
    <canvas ref={canvasRef} className="scene-canvas" aria-hidden="true" />
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
