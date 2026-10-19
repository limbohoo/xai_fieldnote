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

export function CatMap({ z, caption, compact }: { z: ZMap; caption?: string; compact?: boolean }) {
  const ear = earZone(z), eye = eyeZone(z), body = bodyZone(z);
  const h = num(z, 'ear_height') ?? 0, a = num(z, 'ear_angle') ?? 0, e = num(z, 'eye_aperture') ?? 0;
  const dy = clamp(-h * 2.5, -7, 7), rot = clamp(a * 4, -16, 16), ry = 7 * (1 + clamp(e, -2, 2) * 0.12);
  const fill = (zn: Zone) => (zn.hit ? zn.color : '#eef1f6');
  const op = (zn: Zone) => (zn.hit ? clamp(0.35 + Math.abs(zn.z ?? 0) * 0.12, 0.4, 0.85) : 1);
  const stroke = (zn: Zone) => (zn.hit ? zn.color : '#9aa6ba');
  const label = [ear, eye, body].map((q) => q.text).join('；');
  const zones = [ear, eye, body];
  return (
    <figure className={'cl-cat' + (compact ? ' compact' : '')}>
      <svg viewBox="0 0 200 190" role="img" aria-label={`猫的示意图：${label}`}>
        {/* body and the parts the system cannot see */}
        <path d="M158 160 C190 150 196 112 176 96" fill="none" stroke="#c5ccd9" strokeWidth="6" strokeLinecap="round" strokeDasharray="2 9" />
        <ellipse cx="100" cy="152" rx="64" ry="32" fill={fill(body)} fillOpacity={op(body)} stroke={stroke(body)} strokeWidth="2.5" />
        {body.hit ? <ellipse cx="100" cy="152" rx="74" ry="40" fill="none" stroke={body.color} strokeWidth="2" strokeDasharray="5 5" /> : null}
        <circle cx="100" cy="92" r="42" fill="#fff" stroke="#9aa6ba" strokeWidth="2.5" />
        <g stroke="#c5ccd9" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 5">
          <line x1="60" y1="106" x2="30" y2="100" /><line x1="60" y1="112" x2="30" y2="116" /><line x1="140" y1="106" x2="170" y2="100" /><line x1="140" y1="112" x2="170" y2="116" />
        </g>
        {/* ears */}
        <g transform={`translate(0 ${dy})`}>
          <g transform={`rotate(${-rot} 70 62)`}><path d="M62 66 L64 28 L92 52 Z" fill={fill(ear)} fillOpacity={op(ear)} stroke={stroke(ear)} strokeWidth="2.5" strokeLinejoin="round" /></g>
          <g transform={`rotate(${rot} 130 62)`}><path d="M138 66 L136 28 L108 52 Z" fill={fill(ear)} fillOpacity={op(ear)} stroke={stroke(ear)} strokeWidth="2.5" strokeLinejoin="round" /></g>
        </g>
        {/* eyes, nose */}
        <ellipse cx="84" cy="92" rx="8" ry={ry} fill={fill(eye)} fillOpacity={eye.hit ? 0.9 : 1} stroke={stroke(eye)} strokeWidth="2.5" />
        <ellipse cx="116" cy="92" rx="8" ry={ry} fill={fill(eye)} fillOpacity={eye.hit ? 0.9 : 1} stroke={stroke(eye)} strokeWidth="2.5" />
        {eye.hit ? <><circle cx="84" cy="92" r="16" fill="none" stroke={eye.color} strokeWidth="2" strokeDasharray="4 4" /><circle cx="116" cy="92" r="16" fill="none" stroke={eye.color} strokeWidth="2" strokeDasharray="4 4" /></> : null}
        <circle cx="84" cy="92" r="2.6" fill="#151a24" /><circle cx="116" cy="92" r="2.6" fill="#151a24" />
        <path d="M95 108 L105 108 L100 114 Z" fill="#c5ccd9" />
      </svg>
      <figcaption>
        {caption ? <p className="cl-cat-cap">{caption}</p> : null}
        <ul>{zones.map((q) => <li key={q.text} className={q.hit ? 'hit' : ''}><i style={{ background: q.hit ? q.color : '#cdd3de' }} />{q.text}</li>)}<li className="off"><i />尾巴、胡须：看不到</li></ul>
      </figcaption>
    </figure>
  );
}
