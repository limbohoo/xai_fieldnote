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

/* Line-art cat: black outlines on white, so the lines themselves are what lights up. */
const INK = '#151a24', GHOST = '#b5bdca';
const BODY = 'M64 124 C42 166 34 226 54 258 C68 280 172 280 186 258 C206 226 198 166 176 124 Z';
const LEGS = ['M90 226 C88 248 90 264 98 272', 'M112 234 C113 250 112 262 110 272', 'M150 226 C152 248 150 264 142 272', 'M128 234 C127 250 128 262 130 272'];
const TOES = ['M98 272 L96 262', 'M104 273 L104 264', 'M142 272 L144 262', 'M136 273 L136 264'];
const TAIL = 'M46 214 C28 262 62 288 122 288 C178 288 212 272 210 238';
const EAR = 'M56 74 C50 44 52 24 58 12 C76 18 96 30 104 42 Z';
const EAR_IN = 'M63 62 C59 44 61 32 64 24 C74 29 85 36 91 44 Z';
const HEAD = 'M52 84 C50 50 80 38 120 38 C160 38 190 50 188 84 C186 112 160 130 120 130 C80 130 54 112 52 84 Z';

export function CatMap({ z, caption, compact }: { z: ZMap; caption?: string; compact?: boolean }) {
  const ear = earZone(z), eye = eyeZone(z), body = bodyZone(z);
  const h = num(z, 'ear_height') ?? 0, a = num(z, 'ear_angle') ?? 0, e = num(z, 'eye_aperture') ?? 0;
  const dy = clamp(-h * 2.5, -7, 7), rot = clamp(a * 4, -16, 16), sy = 1 + clamp(e, -2, 2) * 0.14;
  const label = [ear, eye, body].map((q) => q.text).join('；');
  const zones = [ear, eye, body];
  const earOp = ear.hit ? clamp(0.25 + Math.abs(ear.z ?? 0) * 0.08, 0.3, 0.6) : 0;
  const bodyOp = body.hit ? clamp(0.15 + Math.abs(body.z ?? 0) * 0.06, 0.2, 0.4) : 0;
  const line = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  const Lit = ({ d, c, w = 3, halo = 9, fill = 0 }: { d: string; c: string; w?: number; halo?: number; fill?: number }) => (
    <><path d={d} fill={c} fillOpacity={fill} stroke="none" /><path d={d} {...line} stroke={c} strokeWidth={halo} strokeOpacity=".28" /><path d={d} {...line} stroke={c} strokeWidth={w} /></>
  );
  const Ear = ({ mirror }: { mirror?: boolean }) => (
    <g transform={mirror ? 'translate(240 0) scale(-1 1)' : undefined}>
      <g transform={`translate(0 ${dy}) rotate(${-rot} 84 66)`}>
        <path d={EAR} fill="#fff" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <path d={EAR_IN} fill="none" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
        {ear.hit ? <><Lit d={EAR} c={ear.color} fill={earOp} /><path d={EAR_IN} fill={ear.color} fillOpacity={earOp} /></> : null}
      </g>
    </g>
  );
  const Eye = ({ mirror }: { mirror?: boolean }) => (
    <g transform={mirror ? 'translate(240 0) scale(-1 1)' : undefined}>
      <g transform={`translate(0 86) scale(1 ${sy}) translate(0 -86)`}>
        <ellipse cx="92" cy="86" rx="11" ry="11" fill="#fff" stroke={INK} strokeWidth="3" />
        <ellipse cx="93" cy="87" rx="4" ry="5" fill={INK} />
        {eye.hit ? <ellipse cx="92" cy="86" rx="11" ry="11" fill="none" stroke={eye.color} strokeWidth="3" /> : null}
      </g>
      {eye.hit ? <circle cx="92" cy="86" r="19" fill="none" stroke={eye.color} strokeWidth="2" strokeDasharray="4 4" /> : null}
    </g>
  );
  return (
    <figure className={'cl-cat' + (compact ? ' compact' : '')}>
      <svg viewBox="0 0 240 300" role="img" aria-label={`猫的示意图：${label}`}>
        {/* tail and whiskers: not measured, so they stay light and dashed */}
        <path d={TAIL} {...line} stroke={GHOST} strokeWidth="19" strokeDasharray="1 0" />
        <path d={TAIL} {...line} stroke="#fff" strokeWidth="14" />
        <g {...line} stroke={GHOST} strokeWidth="2.4" strokeDasharray="5 5">
          <path d="M78 98 L26 84" /><path d="M78 105 L24 105" /><path d="M78 112 L28 126" /><path d="M162 98 L214 84" /><path d="M162 105 L216 105" /><path d="M162 112 L212 126" />
        </g>
        {/* body */}
        <path d={BODY} fill="#fff" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <g {...line} stroke={INK} strokeWidth="2.6">{LEGS.map((d) => <path key={d} d={d} />)}{TOES.map((d) => <path key={d} d={d} strokeWidth="2" />)}</g>
        {body.hit ? <><Lit d={BODY} c={body.color} fill={bodyOp} />{LEGS.map((d) => <path key={d} d={d} {...line} stroke={body.color} strokeWidth="2.6" />)}</> : null}
        {/* ears sit behind the head */}
        <Ear /><Ear mirror />
        <path d={HEAD} fill="#fff" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <Eye /><Eye mirror />
        <path d="M114 98 C114 94 126 94 126 98 C126 102 122 105 120 105 C118 105 114 102 114 98 Z" fill="#fff" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M120 105 L120 109 M108 110 C108 117 120 117 120 109 C120 117 132 117 132 110" {...line} stroke={INK} strokeWidth="2.4" />
      </svg>
      <figcaption>
        {caption ? <p className="cl-cat-cap">{caption}</p> : null}
        <ul>{zones.map((q) => <li key={q.text} className={q.hit ? 'hit' : ''}><i style={{ background: q.hit ? q.color : '#cdd3de' }} />{q.text}</li>)}<li className="off"><i />尾巴、胡须：看不到</li></ul>
      </figcaption>
    </figure>
  );
}
