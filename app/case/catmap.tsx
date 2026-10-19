import { useId } from 'react';
import { fin, type FeatureKey, type ZMap } from './core';

/* A drawn cat whose parts light up when the measured numbers for that part leave the cat's own usual range.
   The thresholds are the same ones the gauges use (panel.tsx ZONES), so what lights up is what the rule saw. */

type Zone = { hit: boolean; color: string; text: string; z: number | null };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const num = (z: ZMap, k: FeatureKey) => (fin(z[k]) ? (z[k] as number) : null);

function earZone(z: ZMap): Zone {
  const h = num(z, 'ear_height'), a = num(z, 'ear_angle');
  if (h !== null && h <= -1.5) return { hit: true, color: '#d9622b', text: '耳朵压低', z: h };
  if (a !== null && a >= 2) return { hit: true, color: '#d9622b', text: '耳朵外转', z: a };
  if (h !== null && h >= 1.5) return { hit: true, color: '#c98a14', text: '耳朵竖起', z: h };
  return { hit: false, color: '#9aa6ba', text: h === null && a === null ? '耳朵：量不出来' : '耳朵：在平时范围', z: h ?? a };
}
function eyeZone(z: ZMap): Zone {
  const e = num(z, 'eye_aperture');
  if (e !== null && e >= 2) return { hit: true, color: '#c98a14', text: '眼睛睁大', z: e };
  return { hit: false, color: '#9aa6ba', text: e === null ? '眼睛：量不出来' : '眼睛：在平时范围', z: e };
}
function bodyZone(z: ZMap): Zone {
  const m = num(z, 'activity');
  if (m !== null && m >= 2) return { hit: true, color: '#234fe5', text: '身体动起来', z: m };
  if (m !== null && m <= -1) return { hit: true, color: '#7d8aa3', text: '身体静止', z: m };
  return { hit: false, color: '#9aa6ba', text: m === null ? '身体：量不出来' : '身体：在平时范围', z: m };
}

const BODY = 'M72 252 C48 208 56 160 88 140 L152 140 C184 160 192 208 168 252 Z';
const PAWS = ['M78 252 C74 236 96 230 104 240 C110 250 106 256 96 256 L82 256 Z', 'M162 252 C166 236 144 230 136 240 C130 250 134 256 144 256 L158 256 Z'];
const TAIL = 'M168 238 C214 240 228 196 208 168';
const EAR = 'M64 76 C56 46 58 22 64 10 C82 16 102 30 110 46 Z';
const EAR_IN = 'M70 66 C65 44 66 30 69 21 C81 27 93 36 99 47 Z';
const EYE = 'M86 86 C94 74 112 74 119 88 C110 97 94 97 86 86 Z';
const HEAD = 'M58 92 C56 56 84 40 120 40 C156 40 184 56 182 92 C180 122 154 142 120 142 C86 142 60 122 58 92 Z';

export function CatMap({ z, caption, compact }: { z: ZMap; caption?: string; compact?: boolean }) {
  const uid = useId().replace(/:/g, '');
  const ear = earZone(z), eye = eyeZone(z), body = bodyZone(z);
  const h = num(z, 'ear_height') ?? 0, a = num(z, 'ear_angle') ?? 0, e = num(z, 'eye_aperture') ?? 0;
  const dy = clamp(-h * 2.5, -7, 7), rot = clamp(a * 4, -16, 16), sy = 1 + clamp(e, -2, 2) * 0.14;
  const label = [ear, eye, body].map((q) => q.text).join('；');
  const zones = [ear, eye, body];
  const earOp = ear.hit ? clamp(0.35 + Math.abs(ear.z ?? 0) * 0.1, 0.4, 0.8) : 0;
  const bodyOp = body.hit ? clamp(0.25 + Math.abs(body.z ?? 0) * 0.08, 0.3, 0.6) : 0;
  const Ear = ({ mirror }: { mirror?: boolean }) => (
    <g transform={mirror ? 'translate(240 0) scale(-1 1)' : undefined}>
      <g transform={`translate(0 ${dy}) rotate(${-rot} 86 70)`}>
        <path d={EAR} fill={`url(#${uid}f)`} stroke="#5d5144" strokeWidth="2" strokeLinejoin="round" />
        <path d={EAR_IN} fill="#e7b3a8" />
        {ear.hit ? <><path d={EAR} fill={ear.color} fillOpacity={earOp} /><path d={EAR} fill="none" stroke={ear.color} strokeWidth="9" strokeOpacity=".28" strokeLinejoin="round" /><path d={EAR} fill="none" stroke={ear.color} strokeWidth="3" strokeLinejoin="round" /></> : null}
      </g>
    </g>
  );
  const Eye = ({ mirror }: { mirror?: boolean }) => (
    <g transform={mirror ? 'translate(240 0) scale(-1 1)' : undefined}>
      <g transform={`translate(0 87) scale(1 ${sy}) translate(0 -87)`}>
        <path d={EYE} fill="#f6f1e4" stroke="#2a221a" strokeWidth="2.2" strokeLinejoin="round" />
        <ellipse cx="102.5" cy="86" rx="9" ry="9.5" fill={`url(#${uid}i)`} />
        <ellipse cx="102.5" cy="86" rx="2.8" ry="8" fill="#14100c" />
        <circle cx="99.5" cy="82.5" r="2" fill="#fff" fillOpacity=".9" />
        {eye.hit ? <path d={EYE} fill="none" stroke={eye.color} strokeWidth="5" strokeOpacity=".9" strokeLinejoin="round" /> : null}
      </g>
      {eye.hit ? <ellipse cx="102.5" cy="87" rx="21" ry="15" fill="none" stroke={eye.color} strokeWidth="2" strokeDasharray="4 4" /> : null}
    </g>
  );
  return (
    <figure className={'cl-cat' + (compact ? ' compact' : '')}>
      <svg viewBox="0 0 240 262" role="img" aria-label={`猫的示意图：${label}`}>
        <defs>
          <linearGradient id={uid + 'f'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b8a690" /><stop offset="1" stopColor="#8f7f6b" /></linearGradient>
          <radialGradient id={uid + 'b'} cx=".5" cy=".3" r=".8"><stop offset="0" stopColor="#c2b19b" /><stop offset="1" stopColor="#8a7a66" /></radialGradient>
          <radialGradient id={uid + 'i'} cx=".4" cy=".35" r=".8"><stop offset="0" stopColor="#e9c24a" /><stop offset="1" stopColor="#a8761c" /></radialGradient>
          <radialGradient id={uid + 'h'} cx=".5" cy=".4" r=".7"><stop offset="0" stopColor="#c9b8a2" /><stop offset="1" stopColor="#9a8873" /></radialGradient>
        </defs>
        {/* tail: not visible to the system, so drawn faint and dashed */}
        <path d={TAIL} fill="none" stroke="#a8998a" strokeWidth="14" strokeLinecap="round" strokeOpacity=".45" />
        <path d={TAIL} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 8" strokeOpacity=".9" />
        {/* body */}
        <path d={BODY} fill={`url(#${uid}b)`} stroke="#5d5144" strokeWidth="2" strokeLinejoin="round" />
        <path d="M104 142 C100 180 104 214 120 236 C136 214 140 180 136 142 Z" fill="#efe8dc" fillOpacity=".85" />
        <g stroke="#6f6254" strokeWidth="2.2" strokeLinecap="round" fill="none" strokeOpacity=".55">
          <path d="M78 176 C86 178 92 182 96 188" /><path d="M76 196 C84 198 90 202 94 208" /><path d="M162 176 C154 178 148 182 144 188" /><path d="M164 196 C156 198 150 202 146 208" />
        </g>
        {PAWS.map((d) => <path key={d} d={d} fill="#efe8dc" stroke="#5d5144" strokeWidth="2" strokeLinejoin="round" />)}
        {body.hit ? <>
          <path d={BODY} fill={body.color} fillOpacity={bodyOp} />
          <path d={BODY} fill="none" stroke={body.color} strokeWidth="9" strokeOpacity=".25" strokeLinejoin="round" />
          <path d={BODY} fill="none" stroke={body.color} strokeWidth="3" strokeLinejoin="round" />
        </> : null}
        {/* ears sit behind the head */}
        <Ear /><Ear mirror />
        {/* head */}
        <path d={HEAD} fill={`url(#${uid}h)`} stroke="#5d5144" strokeWidth="2" strokeLinejoin="round" />
        <g stroke="#5d5144" strokeWidth="2.4" strokeLinecap="round" fill="none" strokeOpacity=".6">
          <path d="M120 46 L120 62" /><path d="M108 48 C108 54 109 58 110 62" /><path d="M132 48 C132 54 131 58 130 62" />
          <path d="M62 96 C70 98 76 100 80 104" /><path d="M178 96 C170 98 164 100 160 104" />
        </g>
        <ellipse cx="104" cy="118" rx="20" ry="15" fill="#f1ebe0" /><ellipse cx="136" cy="118" rx="20" ry="15" fill="#f1ebe0" />
        <Eye /><Eye mirror />
        <path d="M113 104 C113 100 127 100 127 104 C127 109 122 113 120 113 C118 113 113 109 113 104 Z" fill="#d98f86" stroke="#7a4b45" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M120 113 L120 119 M120 119 C116 124 110 124 107 121 M120 119 C124 124 130 124 133 121" fill="none" stroke="#5d4a40" strokeWidth="1.8" strokeLinecap="round" />
        {/* whiskers: not measured, faint and dashed */}
        <g stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="3 4" strokeOpacity=".95">
          <path d="M96 116 L58 108" /><path d="M96 121 L56 124" /><path d="M144 116 L182 108" /><path d="M144 121 L184 124" />
        </g>
      </svg>
      <figcaption>
        {caption ? <p className="cl-cat-cap">{caption}</p> : null}
        <ul>{zones.map((q) => <li key={q.text} className={q.hit ? 'hit' : ''}><i style={{ background: q.hit ? q.color : '#cdd3de' }} />{q.text}</li>)}<li className="off"><i />尾巴、胡须：看不到</li></ul>
      </figcaption>
    </figure>
  );
}
