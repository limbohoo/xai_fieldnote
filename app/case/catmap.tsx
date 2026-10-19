import { fin, type FeatureKey, type ZMap } from './core';
import { useVocab, type Vocab } from './vocab';

/* A drawn cat whose parts light up when the measured numbers for that part leave the cat's own usual range.
   The thresholds are the same ones the gauges use (panel.tsx ZONES), so what lights up is what the rule saw. */

type Zone = { hit: boolean; color: string; text: string; z: number | null };
type Bi = { zh: string; en: string };
const tt = (V: Vocab, b: Bi) => V.t(b.zh, b.en);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const num = (z: ZMap, k: FeatureKey) => (fin(z[k]) ? (z[k] as number) : null);

function earZone(V: Vocab, z: ZMap): Zone {
  const h = num(z, 'ear_height'), a = num(z, 'ear_angle');
  if (h !== null && h <= -1.5) return { hit: true, color: '#d9622b', text: V.t('耳朵压低', 'Ears back'), z: h };
  if (a !== null && a >= 2) return { hit: true, color: '#d9622b', text: V.t('耳朵外转', 'Ears turned out'), z: a };
  if (h !== null && h >= 1.5) return { hit: true, color: '#c98a14', text: V.t('耳朵竖起', 'Ears up'), z: h };
  return { hit: false, color: '#9aa6ba', text: h === null && a === null ? V.t('耳朵：量不出来', 'Ears: cannot measure') : V.t('耳朵：在平时范围', 'Ears: within usual range'), z: h ?? a };
}
function eyeZone(V: Vocab, z: ZMap): Zone {
  const e = num(z, 'eye_aperture');
  if (e !== null && e >= 2) return { hit: true, color: '#c98a14', text: V.t('眼睛睁大', 'Eyes wide open'), z: e };
  return { hit: false, color: '#9aa6ba', text: e === null ? V.t('眼睛：量不出来', 'Eyes: cannot measure') : V.t('眼睛：在平时范围', 'Eyes: within usual range'), z: e };
}
function bodyZone(V: Vocab, z: ZMap): Zone {
  const m = num(z, 'activity');
  if (m !== null && m >= 2) return { hit: true, color: '#234fe5', text: V.t('身体动起来', 'Body moving'), z: m };
  if (m !== null && m <= -1) return { hit: true, color: '#7d8aa3', text: V.t('身体静止', 'Body still'), z: m };
  return { hit: false, color: '#9aa6ba', text: m === null ? V.t('身体：量不出来', 'Body: cannot measure') : V.t('身体：在平时范围', 'Body: within usual range'), z: m };
}

/* Line-art cat: one continuous outline for head, ears and body, so the lines themselves are what lights up. */
const INK = '#151a24', SOFT = '#9aa6ba';
const SIL = 'M58 10 C76 16 96 30 106 40 C114 38 126 38 134 40 C144 30 164 16 182 10 C190 30 190 52 186 72 C196 92 188 114 166 126 C196 158 206 226 186 258 C176 276 150 284 120 284 C90 284 64 276 54 258 C34 226 44 158 74 126 C52 114 44 92 54 72 C50 52 50 30 58 10 Z';
const EAR_OUT = 'M106 40 C96 30 76 16 58 10 C50 30 50 52 54 72';
const EAR_FILL = 'M58 10 C76 16 96 30 106 40 C88 46 68 58 54 72 C50 52 50 30 58 10 Z';
const EAR_IN = 'M66 30 C64 44 64 54 66 62 C76 54 88 46 94 42 C86 38 76 34 66 30 Z';
const BODY_OUT = 'M166 126 C196 158 206 226 186 258 C176 276 150 284 120 284 C90 284 64 276 54 258 C34 226 44 158 74 126';
const LEGS = ['M92 232 C90 254 92 270 98 279', 'M114 242 C115 258 114 272 112 282', 'M148 232 C150 254 148 270 142 279', 'M126 242 C125 258 126 272 128 282'];
const TOES = ['M98 279 L96 270', 'M104 281 L104 272', 'M142 279 L144 270', 'M136 281 L136 272'];
const TAIL = 'M184 262 C170 296 80 302 40 278 C12 260 18 222 40 202';

export function CatMap({ z, caption, compact }: { z: ZMap; caption?: string; compact?: boolean }) {
  const V = useVocab();
  const ear = earZone(V, z), eye = eyeZone(V, z), body = bodyZone(V, z);
  const e = num(z, 'eye_aperture') ?? 0;
  const sy = 1 + clamp(e, -2, 2) * 0.14;
  const label = [ear, eye, body].map((q) => q.text).join(V.t('；', '; '));
  const zones = [ear, eye, body];
  const earOp = ear.hit ? clamp(0.25 + Math.abs(ear.z ?? 0) * 0.08, 0.3, 0.6) : 0;
  const bodyOp = body.hit ? clamp(0.15 + Math.abs(body.z ?? 0) * 0.06, 0.2, 0.4) : 0;
  const line = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  const Glow = ({ d, c }: { d: string; c: string }) => <><path d={d} {...line} stroke={c} strokeWidth="10" strokeOpacity=".25" /><path d={d} {...line} stroke={c} strokeWidth="3.4" /></>;
  const Ear = ({ mirror }: { mirror?: boolean }) => (
    <g transform={mirror ? 'translate(240 0) scale(-1 1)' : undefined}>
      <path d={EAR_IN} {...line} stroke={INK} strokeWidth="2.6" />
      {ear.hit ? <><path d={EAR_FILL} fill={ear.color} fillOpacity={earOp} /><Glow d={EAR_OUT} c={ear.color} /><path d={EAR_IN} {...line} stroke={ear.color} strokeWidth="3" /></> : null}
    </g>
  );
  const Eye = ({ mirror }: { mirror?: boolean }) => (
    <g transform={mirror ? 'translate(240 0) scale(-1 1)' : undefined}>
      <g transform={`translate(0 86) scale(1 ${sy}) translate(0 -86)`}>
        <circle cx="92" cy="86" r="11" fill="#fff" stroke={eye.hit ? eye.color : INK} strokeWidth="3" />
        <ellipse cx="93" cy="87" rx="4" ry="5" fill={INK} />
      </g>
      {eye.hit ? <circle cx="92" cy="86" r="19" fill="none" stroke={eye.color} strokeWidth="2.4" strokeOpacity=".7" /> : null}
    </g>
  );
  return (
    <figure className={'cl-cat' + (compact ? ' compact' : '')}>
      <svg viewBox="0 0 240 300" role="img" aria-label={V.t(`猫的示意图：${label}`, `Cat diagram: ${label}`)}>
        {/* tail and whiskers are not measured, so they stay light */}
        <path d={TAIL} {...line} stroke={SOFT} strokeWidth="17" />
        <path d={TAIL} {...line} stroke="#fff" strokeWidth="12" />
        <g {...line} stroke={SOFT} strokeWidth="2.6">
          <path d="M78 100 L24 86" /><path d="M78 107 L22 107" /><path d="M78 114 L26 128" /><path d="M162 100 L216 86" /><path d="M162 107 L218 107" /><path d="M162 114 L214 128" />
        </g>
        <path d={SIL} fill="#fff" stroke={INK} strokeWidth="3.2" strokeLinejoin="round" />
        <g {...line} stroke={INK} strokeWidth="2.8">{LEGS.map((d) => <path key={d} d={d} />)}{TOES.map((d) => <path key={d} d={d} strokeWidth="2.2" />)}</g>
        {body.hit ? <><path d={BODY_OUT + ' Z'} fill={body.color} fillOpacity={bodyOp} /><Glow d={BODY_OUT} c={body.color} /></> : null}
        <Ear /><Ear mirror />
        <Eye /><Eye mirror />
        <path d="M114 98 C114 94 126 94 126 98 C126 102 122 105 120 105 C118 105 114 102 114 98 Z" fill="#fff" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M120 105 L120 109 M108 111 C108 118 120 118 120 109 C120 118 132 118 132 111" {...line} stroke={INK} strokeWidth="2.6" />
      </svg>
      <figcaption>
        {caption ? <p className="cl-cat-cap">{caption}</p> : null}
        <ul>{zones.map((q) => <li key={q.text} className={q.hit ? 'hit' : ''}><i style={{ background: q.hit ? q.color : '#cdd3de' }} />{q.text}</li>)}<li className="off"><i />{V.t('尾巴、胡须：看不到', 'Tail and whiskers: not visible')}</li></ul>
      </figcaption>
    </figure>
  );
}
