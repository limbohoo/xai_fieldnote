'use client';
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Cite } from '../cite';
import {
  MODEL_ERROR, STATES, USED, Z, checkEvent, classify, fin, guess, run, zEvent,
  type Baseline, type Check, type ClipData, type EventRec, type FeatureKey, type Frame, type Reaction, type State, type Step, type ZMap,
} from './core';
import { usePhotoAvailable, type Layers } from './viewer';
import { MiniBar, Panel } from './panel';
import { CatMap } from './catmap';

import { COLAB_URL, CUES, DPLAIN, FEAT, FIDX, LCOL, RPLAIN, STATE_TEXT, TELL, VIDEO_ID, amount, driverText, fmt, mmss } from './vocab';

/* ---------- small layout pieces ---------- */
function Head({ no, en, title, desc }: { no: string; en: string; title: string; desc: string }) {
  return (
    <div className="section-head">
      <div className="eyebrow">{no} / {en}</div>
      <h2>{title}</h2>
      <p>{desc}</p>
    </div>
  );
}
const EVID = { ok: ['已验证', 'ev-ok'], proto: ['真实视频原型', 'ev-proto'], hand: ['手设假设', 'ev-hand'] } as const;
function Evidence({ kind, note }: { kind: keyof typeof EVID; note?: string }) {
  return <span className={'cl-ev ' + EVID[kind][1]}>{EVID[kind][0]}{note ? <small>{note}</small> : null}</span>;
}
function More({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="cl-more">
      <summary><span>{title}</span><b aria-hidden="true">＋</b></summary>
      <div className="cl-more-body">
        {children}
        <p className="cl-colab"><a href={COLAB_URL} target="_blank" rel="noreferrer">在 Colab 里打开完整笔记，可以自己运行 ↗</a></p>
      </div>
    </details>
  );
}

interface L {
  clip: ClipData; events: EventRec[]; kp: number[]; s: number; step: Step; frame: Frame; fi: number;
  base: Baseline; out: Step[]; calib: number; setCalib: (n: number) => void;
  feat: FeatureKey; setFeat: (k: FeatureKey) => void; minConf: number; setMinConf: (v: number) => void;
  ev: number; pickEvent: (i: number) => void;
}

/* ---------- step 1 ---------- */
function Step1({ L }: { L: L }) {
  const f = L.frame, m = L.minConf;
  const nf = f.fc ? f.fc.filter((v) => v >= m).length : 0, nb = f.bc ? f.bc.filter((v) => v >= m).length : 0;
  const tip = (i: number, n: string) => { const ok = (f.fc?.[i] ?? 0) >= m; return <span>{n}耳尖 <b className={'num ' + (ok ? 'ok' : 'bad')}>{(f.fc?.[i] ?? 0).toFixed(2)}{ok ? ' ✓' : ' ✗'}</b></span>; };
  const both = f.fc && f.fc[24] >= m && f.fc[29] >= m;
  return (
    <section className="cl-step" id="s1">
      <Head no="01" en="FIND THE CAT" title="找到猫，再找到它身上的点" desc="先在画面里框出猫，再在脸上标出 48 个点、身体上标出 20 个点（耳朵、眼睛、鼻子、四肢……）。每个点都带一个“把握”：网络自己觉得这个点标得有多准。" />
      <div className="cl-grid">
        <div className="cl-prose">
          <p>把握低的点，系统不会拿去用。把右边的“把握门槛”往上拉，看画面里哪些点被丢掉，尤其是<b>两个耳尖</b>还在不在：耳朵相关的判断，全靠它们。</p>
          <p>点标得不可靠时，系统宁可说“这一帧量不出来”，也不会硬凑一个数字。</p>
          <Evidence kind="ok" note="在固定的测试图片上检查过" />
        </div>
        <div className="cl-widget">
          <div className="cl-sl"><label htmlFor="cl-minconf">把握门槛</label>
            <input id="cl-minconf" type="range" min={0} max={0.9} step={0.05} value={m} onChange={(e) => L.setMinConf(+e.target.value)} />
            <span className="num">{m.toFixed(2)}</span></div>
          {f.fp ? (
            <dl className="cl-kv">
              <dt>脸</dt><dd><span className="num">{nf} / 48</span> 个点够把握</dd>
              <dt>身体</dt><dd><span className="num">{nb} / 20</span> 个点够把握</dd>
              <dt>耳朵</dt><dd>{tip(24, '左')}　{tip(29, '右')}</dd>
            </dl>
          ) : <p className="cl-warn">这一帧没有找到猫，所以没有标出任何点。系统在这种情况下不下判断，标签会变成“看不清”。</p>}
          {f.fp && !both ? <p className="cl-warn">有一个耳尖的把握低于门槛，这一帧的“耳朵高度”量不出来，系统把它当作“缺失”。</p> : null}
          <p className="cl-note">系统实际用的门槛是 0.25。这里拖动只影响这一帧的显示，以及下一步里这一帧的数字。</p>
        </div>
      </div>
      <More title="展开：细节与验证 · Colab 理论版 §1–§3、§6.4">
        <ul className="cl-list">
          <li><b>找猫：</b>用现成的找物体模型 YOLOv8。在 132 张测试图上，大一点的版本（YOLOv8s）找到了 93.9% 的猫，小一点的（YOLOv8n）是 90.2%。评估时还发现过一个错误：红蓝颜色通道弄反了，改正后找到率从 85.6% 升到 90.2%。</li>
          <li><b>身体 20 点：</b>网络先给每个点画一张“可能在哪里”的热力图，再取最可能的位置（MobileNetV3 + FPN，soft-argmax）。79.4% 的点落在离真实位置不到猫身大小 10% 的范围内（PCK@0.1），平均误差是猫身大小的 8.3%（NME）。腿和爪还偏低（64–71%），猫贴近镜头时身体的点会乱。</li>
          <li><b>脸 48 点：</b>同一种做法，但更准：99.0% 的点落在离真实位置不到 5% 的范围内（PCK@0.05），平均误差 1.21%。脸的位置先由身体的头部点推出，再用脸上的点修正一遍。</li>
          <li><b>防抖：</b>点的位置每帧会抖一点，用 One-Euro 滤波：猫不动时压住抖动，猫快速动时不拖后腿 <Cite ids={[31]} />。</li>
          <li><b>遮挡测试</b> <Cite ids={[32]} />：用灰块遮住画面的不同位置，看耳朵的点会跑多少，来检查网络是不是在看猫。在 1 张图、1 个点上，93% 的影响来自猫身上、78% 来自头部，没有发现它靠背景“作弊”。这只是一次粗略的检查，<b>不是对系统的正式评估</b>。</li>
        </ul>
      </More>
    </section>
  );
}

/* ---------- step 2 ---------- */
function Step2({ L }: { L: L }) {
  const F0 = FEAT[FIDX[L.feat]], j = FIDX[L.feat], f = L.frame;
  const rec = f.raw ? f.raw[j] : null;
  const gated = F0.gate && !!f.pose;
  return (
    <section className="cl-step" id="s2">
      <Head no="02" en="MEASURE" title="把这些点变成几项看得懂的数字" desc="点本身只是一堆坐标。系统把它们量成几项数字，分别对应耳朵、眼睛和身体。" />
      <div className="cl-grid">
        <div className="cl-prose">
          <p>每一项都除以“两眼之间的距离”或“身长”，所以猫离镜头远一点、头歪一点，都不影响。点一项，上面的画面会画出它是怎么量的。</p>
          <p>有一个重要的保护：<b>猫转头或抬头时，耳朵和眼睛在画面里看起来会变扁</b>，量出的数字会骗人。这时系统直接暂停脸部的数字，不去硬算。</p>
          <Evidence kind="proto" />
        </div>
        <div className="cl-widget">
          <div className="cl-seg" role="group" aria-label="选择特征">
            {FEAT.map((x) => <button key={x.k} aria-pressed={x.k === L.feat} className={x.used ? '' : 'dim'} onClick={() => L.setFeat(x.k)}>{x.name}{x.used ? '' : '（未用）'}</button>)}
          </div>
          <dl className="cl-kv">
            <dt>它量的是什么</dt><dd>{F0.def}</dd>
            <dt>可靠吗</dt><dd>{F0.rel}{F0.used ? '' : '；'}{F0.used ? null : <b>目前没有用在任何规则里</b>}</dd>
            <dt>这一帧</dt>
            <dd>{gated ? <><b>已暂停</b>：{f.pose!.includes('sideways') ? '头转向了侧面' : '头抬起或低下了'}，这一帧不算脸部的数字。</> :
              !f.sm ? '没有找到猫' : <><span className="num">{fmt(rec, 3)}</span>{rec === null ? '（点不可信，算不出来）' : '（程序记录的值）'}</>}</dd>
          </dl>
        </div>
      </div>
      <More title="展开：细节与验证 · Colab 理论版 §4.1–§4.13">
        <ul className="cl-list">
          <li><b>为什么不受远近和歪头影响：</b>先用两眼的连线定出“水平”和“头顶方向”，再除以两眼间距，所以平移、缩放、头在画面里歪一点，数字都不变。耳朵这一项的依据，是猫面部表情研究里的“耳朵位置”动作 <Cite ids={[28, 29]} />。</li>
          <li><b>每一项有多可靠：</b>用“模型的测量误差 ÷ 不同猫之间的真实差异”来衡量，越小越好：耳朵高度 0.15、眼睛睁开 0.41、耳朵外转 0.54、口鼻 0.52。低于约 0.3，才算“量到的是猫，而不是测量的噪声”，所以只有耳朵高度可以单独触发标签。</li>
          <li><b>转头时暂停：</b>左右眼到鼻子的距离差得太多（超过 0.2，说明是侧脸），或者低头 / 抬头比平时多了 30% 以上，就暂停脸部的数字。否则抬头会被误当成“耳朵压低”，这在真实视频上出现过。</li>
          <li><b>活动量：</b>取各个点速度的<b>中间值</b>，并且最高只算每秒 3 个身长，因为某个点被认错时，速度会突然爆表。头的高低和口鼻宽度，目前没有用在任何规则里。</li>
        </ul>
      </More>
    </section>
  );
}

/* ---------- step 3 ---------- */
function Step3({ L }: { L: L }) {
  const { base, out, calib, feat } = L;
  const F0 = FEAT[FIDX[feat]], j = FIDX[feat], frames = L.clip.frames;
  const vals = frames.map((f) => (f.sm && fin(f.sm[j]) ? (f.sm[j] as number) : null));
  const finite = vals.filter((v): v is number => v !== null);
  const W = 800, H = 190, pl = 6, pr = 6, pt = 10, pb = 18;
  const med = base.med[feat], sc = base.scale[feat];
  let lo = Math.min(...finite), hi = Math.max(...finite);
  if (med !== undefined && sc !== undefined) { lo = Math.min(lo, med - 2.2 * sc); hi = Math.max(hi, med + 2.2 * sc); }
  const pad = (hi - lo) * 0.06 || 1; lo -= pad; hi += pad;
  const T = frames[frames.length - 1].t, X = (t: number) => pl + (t / T) * (W - pl - pr), Y = (v: number) => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb);
  let d = '', pen = false;
  frames.forEach((f, i) => { const v = vals[i]; if (v === null) { pen = false; return; } d += (pen ? 'L' : 'M') + X(f.t).toFixed(1) + ' ' + Y(v).toFixed(1); pen = true; });
  const calEnd = base.doneAt < frames.length ? frames[base.doneAt].t : 0;
  const z = L.step.z[feat];
  const cnt: Record<string, number> = {}; let tot = 0;
  out.forEach((o) => { if (!o.calibrating) { cnt[o.label] = (cnt[o.label] || 0) + 1; tot++; } });
  const order: Reaction[] = ['resting', 'active', 'alert', 'ears_back', 'freeze', 'unknown'];
  const anyBack = !!(cnt.ears_back || cnt.freeze);
  return (
    <section className="cl-step" id="s3">
      <Head no="03" en="COMPARE WITH ITSELF" title="和它自己的平时比，不和“平均的猫”比" desc="不同的猫耳朵本来就长得不一样，折耳猫的耳朵永远是“低”的。所以每个数字都换算成：比这只猫自己的平时，多了或少了多少。" />
      <div className="cl-grid">
        <div className="cl-prose">
          <p>系统先用视频开头的一小段，记下<b>这只猫自己的“平时的样子”</b>：每一项数字平时在哪里，平时会抖多大。之后每一帧都换算成一个“偏离度”（专业上叫 z 值）：偏离了平时多少个“正常抖动”。</p>
          <p className="cl-formula">偏离度 z = (这一帧的数字 − 平时的中间值) ÷ 平时正常抖动的幅度</p>
          <p>右边的按钮演示我们 10 月 13 日发现的<b>最大的不稳定来源</b>：同一段视频，只改“用开头多少帧来记平时”，最后各种标签所占的比例就完全不同。</p>
          <Evidence kind="proto" />
        </div>
        <div className="cl-widget">
          <div className="cl-row"><span className="cl-note">用开头多少帧记它的平时：</span>
            <div className="cl-seg" role="group" aria-label="基线长度">{[60, 90, 150, 300].map((n) => <button key={n} aria-pressed={calib === n} onClick={() => L.setCalib(n)}>{n} 帧</button>)}</div></div>
          <div className="cl-seg" role="group" aria-label="选择特征">
            {FEAT.map((x) => <button key={x.k} aria-pressed={x.k === feat} className={x.used ? '' : 'dim'} onClick={() => L.setFeat(x.k)}>{x.name}{x.used ? '' : '（未用）'}</button>)}
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="cl-chart" role="img" aria-label={`${F0.name}随时间的变化，以及它平时的范围`}>
            <rect x={X(0)} y={pt} width={Math.max(0, X(calEnd) - X(0))} height={H - pt - pb} fill="#234fe5" opacity={0.1} />
            {med !== undefined && sc !== undefined ? <>
              <rect x={pl} y={Y(med + sc)} width={W - pl - pr} height={Y(med - sc) - Y(med + sc)} fill="#7d8ba3" opacity={0.16} />
              <line x1={pl} x2={W - pr} y1={Y(med)} y2={Y(med)} stroke="#7d8ba3" strokeDasharray="3 3" />
              {F0.zthr.map(([zt, label]) => { const y = Y(med + zt * sc); return <g key={zt}>
                <line x1={pl} x2={W - pr} y1={y} y2={y} stroke="#d9622b" strokeDasharray="6 4" opacity={0.8} />
                <text x={W - pr - 2} y={y - 3} textAnchor="end" fontSize={11} fill="#667083">z = {zt.toFixed(1)} {label}</text></g>; })}
            </> : null}
            <path d={d} fill="none" stroke="#151a24" strokeWidth={1.5} />
            <line x1={X(L.frame.t)} x2={X(L.frame.t)} y1={pt} y2={H - pb} stroke="#234fe5" strokeWidth={1.5} />
            <text x={X(0) + 4} y={H - 4} fontSize={11} fill="#667083">蓝底：用来记“平时”的 {calib} 帧；灰带：平时 ± 1 个正常抖动；虚线：规则里的门槛</text>
          </svg>
          <dl className="cl-kv">
            <dt>它平时</dt><dd className="num">{med === undefined || sc === undefined ? '（这项没有足够的数据）' : `中间值 ${fmt(med, 3)}，正常抖动 ${fmt(sc, 3)}${sc <= MODEL_ERROR[feat] + 1e-5 ? '（按测量误差取了下限）' : ''}`}</dd>
            <dt>这一帧</dt><dd className="num">{fin(z) ? `偏离度 z = ${fmt(z, 2)} → ${Math.abs(z) < 1 ? '在它平时的范围里' : `偏离了平时 ${Math.abs(z).toFixed(1)} 个正常抖动`}` : L.step.calibrating ? '还在记平时的样子' : '没有数值'}</dd>
          </dl>
          <p><b>用 {calib} 帧记平时，整段视频的标签分布：</b>{order.filter((o) => cnt[o]).map((o) => <span key={o} className="cl-share" style={{ color: LCOL[o] }}>{RPLAIN[o]} {Math.round((cnt[o] / tot) * 100)}%</span>)}</p>
          {!anyBack ? <p className="cl-warn">这样记“平时”，整段视频里没有一次“耳朵压低”或“突然不动”。同一只猫、同一段视频，只因为开头取的帧数不同。</p> : null}
        </div>
      </div>
      <More title="展开：细节与验证 · Colab 理论版 §4.9–§4.10">
        <ul className="cl-list">
          <li><b>为什么用“中间值”和 MAD，而不是平均值和标准差：</b>记平时的那一小段里，如果猫恰好有一次大动作，平均值会被拉歪；中间值和 MAD（每个数与中间值之差的中间值）不怕少数几帧的异常。乘上 1.4826 后，MAD 在正常情况下就等于标准差。完整的算式是 z = (这一帧的数字 − 中间值) ÷ max(1.4826 × MAD, 测量误差)。</li>
          <li><b>为什么要设下限：</b>如果记平时的那段里猫几乎一动不动，“正常抖动”会趋近于 0，之后任何微小的抖动都会被放大成很大的偏离度。所以分母至少取模型自己的测量误差。各项的下限：耳朵高度 {MODEL_ERROR.ear_height}、耳朵外转 {MODEL_ERROR.ear_angle}°、眼睛开合 {MODEL_ERROR.eye_aperture}、口鼻 {MODEL_ERROR.muzzle_ratio}、头 {MODEL_ERROR.head_drop}、活动 {MODEL_ERROR.activity}。没加下限之前，在真实视频上出现过 40% 的误报。</li>
          <li><b>实测有多敏感：</b>同一段 36 秒视频，用 60 / 90 / 150 / 300 帧记平时，记完平时之后的帧里，“耳朵压低 + 突然不动”分别占 0% / 32% / 28% / 34%：60 帧时一次都没有，300 帧时“耳朵压低”占 25%（150 帧时只有 7%）。结论：<b>正式测试前，先单独拍一段猫平静、脸朝镜头的视频，记下它的平时并存成文件，之后每次都读取这个文件</b>，不要依赖每段视频自己的开头。</li>
          <li>“平时”只反映这只猫在<b>被记录的那一段</b>里的样子。如果那一段里它恰好很紧张，之后所有的偏离都会被算歪。</li>
        </ul>
      </More>
    </section>
  );
}

/* ---------- step 4 ---------- */
const Z4: FeatureKey[] = ['ear_height', 'ear_angle', 'eye_aperture', 'activity'];
const Z4_NAME: Record<string, string> = { ear_height: '耳朵高度偏离', ear_angle: '耳朵外转偏离', eye_aperture: '眼睛睁开偏离', activity: '活动量偏离' };
function Step4({ L }: { L: L }) {
  const [z, setZ] = useState<Record<string, number>>({ ear_height: 0, ear_angle: 0, eye_aperture: 0, activity: 0 });
  const [prev, setPrev] = useState('resting');
  const r = classify(z as ZMap, false, prev);
  const back = prev === 'ears_back' || prev === 'freeze' ? Z.EAR_H_STAY : Z.EAR_H, up = prev === 'alert' ? Z.EAR_H_STAY : Z.EAR_H;
  const act = prev === 'active' ? Z.ACTIVE_STAY : Z.ACTIVE, still = prev === 'freeze' ? Z.STILL_STAY : Z.STILL;
  const tipLow = z.ear_height <= -back, angle = z.ear_angle >= Z.AUX && (tipLow || z.ear_height <= -Z.EAR_CO), backOk = tipLow || angle;
  const rows: [Reaction, string, boolean][] = [
    ['freeze', `耳朵压低，并且身体静止：活动量 ≤ ${still.toFixed(1)}`, backOk && z.activity <= still],
    ['ears_back', `耳尖高度 ≤ ${(-back).toFixed(1)}；或耳朵外转 ≥ +2.0 且耳尖高度 ≤ −0.5`, backOk],
    ['alert', `耳尖高度 ≥ +${up.toFixed(1)}，并且没有在快速活动（活动量 < ${act.toFixed(1)}）`, z.ear_height >= up && !(z.activity >= act)],
    ['active', `活动量 ≥ +${act.toFixed(1)}`, z.activity >= act],
    ['resting', '以上都不满足', true],
  ];
  const useNow = () => {
    const n: Record<string, number> = {};
    Z4.forEach((k) => { const v = L.step.z[k]; n[k] = fin(v) ? Math.max(-4, Math.min(4, Math.round(v * 10) / 10)) : 0; });
    setZ(n); setPrev(['resting', 'ears_back', 'freeze', 'alert', 'active'].includes(L.step.label) ? L.step.label : 'resting');
  };
  return (
    <section className="cl-step" id="s4">
      <Head no="04" en="RULES" title="用几条能读懂的规则，得到行为标签" desc="规则就是几行“如果……就……”。下面是程序里的原样规则：拖动滑块当作假想的偏离度，看标签怎么变。" />
      <div className="cl-grid">
        <div className="cl-prose">
          <p>一个细节：一个标签出现之后，要<b>更明显地回到平时</b>才会消失（耳尖偏低 1.5 才出现，回到 1.0 以内才消失）。这样数字在门槛附近晃动时，标签不会来回闪。把“之前的标签”换一换，同样的数字会得到不同的结果。</p>
          <p>标签描述的是<b>看得见的行为</b>，不是情绪：“耳朵压低”不等于“害怕”。</p>
          <Evidence kind="proto" note="阈值是手设的，未经标注验证" />
        </div>
        <div className="cl-widget">
          {Z4.map((k) => (
            <div className="cl-sl" key={k}><label htmlFor={'cl-z-' + k}>{Z4_NAME[k]}</label>
              <input id={'cl-z-' + k} type="range" min={-4} max={4} step={0.1} value={z[k]} onChange={(e) => setZ({ ...z, [k]: +e.target.value })} />
              <span className="num">{z[k].toFixed(1)}</span></div>
          ))}
          <div className="cl-row"><label htmlFor="cl-prev" className="cl-note">之前的标签：</label>
            <select id="cl-prev" className="cl-btn" value={prev} onChange={(e) => setPrev(e.target.value)}>
              {['resting', 'ears_back', 'freeze', 'alert', 'active'].map((k) => <option key={k} value={k}>{RPLAIN[k]}</option>)}
            </select>
            <button className="cl-btn" onClick={useNow}>用这一帧的真实值</button></div>
          <p className="cl-verdict">标签：<span style={{ color: LCOL[r.key] }}>{RPLAIN[r.key]}</span></p>
          <div className="cl-tbl"><table>
            <thead><tr><th>从上往下，第一条满足的就是标签</th><th>条件（已按“之前的标签”调整门槛）</th><th /></tr></thead>
            <tbody>{rows.map(([k, text, met]) => (
              <tr key={k} className={k === r.key ? 'hit' : ''}><td>{RPLAIN[k]}</td><td>{text}</td>
                <td className={met ? 'ok' : 'dimc'}>{k === r.key ? '◀ 这条' : met ? '满足，但前面的优先' : '不满足'}</td></tr>))}</tbody>
          </table></div>
          {r.drivers.length ? <p className="cl-note">触发它的条件：{r.drivers.map((d) => `${d.feature} ${d.z.toFixed(1)} ${d.test} ${d.bar.toFixed(1)}`).join('；')}</p> : null}
        </div>
      </div>
      <More title="展开：细节与验证 · Colab 理论版 §5.0">
        <ul className="cl-list">
          <li><b>先描述，再解释：</b>动物行为学的做法是，先<b>描述</b>看得见的行为（记在一张“行为谱”里），再去<b>解释</b>它意味着什么。这一步只做第一层，不需要任何情绪标签 <Cite ids={[28]} />。</li>
          <li><b>门槛的具体数字：</b>出现时，耳尖高度 ±1.5、耳朵外转 +2.0、眼睛睁开 +2.0、活动量 +2.0（动）或 −1.0（静止）；消失时放宽到耳尖 ±1.0、活动 +1.5、静止 −0.5。<b>这些数字是我们按文献的方向自己定的，没有经过人工标注检验。</b></li>
          <li><b>只有可靠的数字才能单独触发：</b>耳尖高度可以；耳朵外转只在耳尖也偏低（至少 −0.5）时才能触发“耳朵压低”；眼睛睁开只当“注意到了什么”的补充。违反这一条，曾造成 40% 的误报。</li>
          <li><b>防闪烁：</b>一个新标签要在最近 0.3 秒里占多数（至少 60% 的帧）才会显示。按时间而不是帧数算，电脑慢一点延迟也一样；用“占多数”而不是“连续 N 帧”，标签在两个相邻状态之间来回跳时也能切换过去。</li>
        </ul>
      </More>
    </section>
  );
}

/* ---------- step 5 ---------- */
function Step5({ L }: { L: L }) {
  const e = L.events[L.ev];
  const [reaction, setReaction] = useState<string>(e.reaction);
  const [cues, setCues] = useState<string[]>(e.interp?.cues ?? []);
  const [face, setFace] = useState<number>(e.interp?.face_visible ?? 1);
  useEffect(() => { setReaction(e.reaction); setCues(e.interp?.cues ?? []); setFace(e.interp?.face_visible ?? 1); }, [L.ev, e]);
  const g = guess(reaction, cues, face);
  if (!g) return null;
  const order = g.post.map((_, i) => i).sort((a, b) => g.post[b] - g.post[a]);
  const tell = TELL[`${g.top}|${g.second}`] || TELL[`${g.second}|${g.top}`] || '';
  const decisive = cues.filter((c) => { const alt = guess(reaction, cues.filter((x) => x !== c), face)!; return alt.top !== g.top || alt.band !== g.band; });
  const cueName = (c: string) => CUES.find((x) => x[0] === c)![1];
  return (
    <section className="cl-step" id="s5">
      <Head no="05" en="WHAT HAPPENS NEXT" title="同一个动作可以有几种含义，所以看它接下来做什么" desc="耳朵压低，随后躲开更像紧张；随后去看个究竟，更像只是在专注听。所以系统不在这一刻下结论。" />
      <div className="cl-grid">
        <div className="cl-prose">
          <p>系统先给五种可能的状态一个“起点”（比如耳朵压低，起点偏向紧张），再让“它接下来 5 秒做了什么”一条一条去调整。选一个真实事件，再勾选或取消“随后发生的事”，看推测怎么变。</p>
          <p><b>这些概率是我们按文献的方向自己定的，没有一条被标注数据检验过。</b>正因为它们决定了推测，才要把“为什么”摆出来；把握不够时，系统<b>不给出情绪</b>。</p>
          <Evidence kind="hand" />
        </div>
        <div className="cl-widget">
          <div className="cl-row"><span className="cl-note">真实事件：</span>
            <div className="cl-seg" role="group" aria-label="选择事件">{L.events.map((x, i) => <button key={i} aria-pressed={L.ev === i} onClick={() => L.pickEvent(i)}>#{i} {mmss(x.start_s)} {RPLAIN[x.reaction]}</button>)}</div></div>
          <div className="cl-row"><span className="cl-note">它当时的标签：</span>
            <div className="cl-seg" role="group" aria-label="选择标签">{(['ears_back', 'freeze', 'alert', 'active'] as const).map((k) => <button key={k} aria-pressed={reaction === k} onClick={() => setReaction(k)}>{RPLAIN[k]}</button>)}</div></div>
          <div className="cl-cues" role="group" aria-label="随后发生的事">
            {CUES.map(([k, name]) => <label key={k}><input type="checkbox" checked={cues.includes(k)} onChange={(ev) => setCues(ev.target.checked ? [...cues, k] : cues.filter((x) => x !== k))} />{name}</label>)}
          </div>
          <div className="cl-sl"><label htmlFor="cl-face">脸看得清的比例</label>
            <input id="cl-face" type="range" min={0} max={1} step={0.05} value={face} onChange={(ev) => setFace(+ev.target.value)} /><span className="num">{Math.round(face * 100)}%</span></div>
          <div className="cl-bars">{order.map((i, n) => (
            <div className={'cl-bar' + (n === 0 ? ' top' : '')} key={i}><span>{STATE_TEXT[STATES[i]]}</span>
              <span className="track"><span className="fill" style={{ width: (g.post[i] * 100).toFixed(1) + '%' }} /></span><span className="num">{Math.round(g.post[i] * 100)}%</span></div>))}</div>
          {g.show ? <>
            <p className="cl-verdict">看起来像：{STATE_TEXT[g.top]}<span className="cl-pill" style={{ color: STATE_COL[g.top] }}>推测 · 把握{g.band}</span></p>
            <p>也可能是：<b>{STATE_TEXT[g.second]}</b>{tell ? '。怎么分辨：' + tell : ''}</p>
          </> : <p className="cl-verdict">把握不够，<span style={{ color: '#a3abb8' }}>不给出情绪</span>，只写看到的行为。</p>}
          {decisive.map((c) => { const alt = guess(reaction, cues.filter((x) => x !== c), face)!; return <p key={c}>关键的一步：{cueName(c)}。如果没有这一步，{!alt.show ? '把握就不够，不会给出推测。' : alt.top !== g.top ? `看起来更像“${STATE_TEXT[alt.top]}”。` : `把握会从“${g.band}”变为“${alt.band}”。`}</p>; })}
          {face < 0.3 && g.band !== '低' ? <p className="cl-note">脸大部分时间看不清，所以即使线索很强，把握也最多给“中”。</p> : null}
        </div>
      </div>
      <More title="展开：细节与验证 · Colab 理论版 §5.10–§5.12">
        <ul className="cl-list">
          <li><b>怎么调整（朴素贝叶斯）：</b>每看到一条新线索，就按“在每种状态下，这条线索有多常出现”，把五种状态的分数重新算一遍。算式是 <span className="cl-formula inline">P(状态 | 标签, 线索) ∝ P(状态 | 标签) × 每条线索 P(线索 | 状态) 相乘</span>“朴素”是指假设各条线索互不影响，这是一种简化；好处是每一步都能打印出来，也就是卡片上的“为什么这么推测”。这种<b>先得到人能读懂的中间结果，再由它得出结论</b>的结构，和“概念瓶颈模型”是同一类 <Cite ids={[10]} />。</li>
          <li><b>把握分三档：</b>设最高的概率为 p₁、第二高的为 p₂。p₁ ≥ 0.6 且比 p₂ 至少高 0.3，算“高”；p₁ ≥ 0.45 且至少高 0.15，算“中”；其余算“低”，不显示情绪。依据脸部的标签，在脸大部分时间（&gt; 70%）看不清时直接算“低”；任何推测在脸看不清时最多给“中”。</li>
          <li><b>逃跑不是扑玩：</b>早先的版本只看“动得快不快”，受惊逃跑会被推测成“想玩，高把握”。现在“扑玩”要求同时不是在离开；又快又在离开，另算“快速跑开”，指向紧张。猫蹲低时在画面里会变小，现在也不再被当成“离开”。</li>
          <li><b>用标注来修正：</b>把我们手设的数字当作 10 条“虚拟标注”，真实标注一条条加进去：新概率 = (10 × 原来的概率 + 标注里的次数) ÷ (10 + 标注总数)（Dirichlet / Beta 伪计数）。3 条标注几乎改变不了结论，约 30 条之后，数据才开始占主导。要注意标注的人可能被系统的推测带偏，所以要先看视频、写下自己的判断，再显示系统的推测。</li>
          <li>解释说的是<b>系统为什么这样判断</b>，不是猫真正在想什么。“如果没有这一步，就……”这种对比的说法，更接近人们期待的解释 <Cite ids={[2]} />。</li>
        </ul>
      </More>
    </section>
  );
}

/* ---------- step 6 ---------- */
function Step6({ L }: { L: L }) {
  const e = L.events[L.ev];
  const [tog, setTog] = useState<Record<string, boolean>>({});
  useEffect(() => setTog({}), [L.ev]);
  const checks: Check[] = useMemo(() => L.events.map(checkEvent), [L.events]);
  const res = checks[L.ev];
  const cited = res.cited;
  const name = (k: FeatureKey) => FEAT[FIDX[k]].name;
  const usual: Partial<Record<FeatureKey, boolean>> = {};
  cited.forEach((k) => { if (tog[k]) usual[k] = true; });
  if (tog.__rest) USED.forEach((k) => { if (!cited.includes(k)) usual[k] = true; });
  const now = classify(zEvent(e, usual), false, e.prev_reaction).key;
  const changed = now !== e.reaction, anyCited = cited.some((k) => tog[k]), restOn = !!tog.__rest, nothing = !Object.keys(usual).length;
  const passN = checks.filter((c) => c.pass).length, missN = checks.filter((c) => c.oldMissed).length;
  return (
    <section className="cl-step" id="s6">
      <Head no="06" en="IS THE EXPLANATION FAITHFUL" title="卡片上写的原因，是真正的原因吗？" desc="课程要求验证：系统说它依据什么，就必须真的是依据什么。因为标签来自一条条能读的规则，所以可以精确检验。" />
      <div className="cl-grid">
        <div className="cl-prose">
          <p>做法是问“如果……会怎样”：把卡片上写的依据<b>改回这只猫平时的样子</b>，标签应该变；把<b>没写</b>的数字改回平时，标签应该不变 <Cite ids={[30]} />。学术上叫“反事实解释”。</p>
          <p>用上一步选中的事件自己试一试：先勾“写出的依据”，再勾“没写出的数字”。</p>
          <Evidence kind="ok" note="说的和规则一致；规则本身对不对，还没有标注可以检验" />
        </div>
        <div className="cl-widget">
          <p className="cl-note">事件：<b>#{L.ev} {mmss(e.start_s)} {RPLAIN[e.reaction]}</b>（在上一步里切换）</p>
          <div className="cl-cues" role="group" aria-label="改回平时">
            {cited.map((k) => <label key={k}><input type="checkbox" checked={!!tog[k]} onChange={(ev) => setTog({ ...tog, [k]: ev.target.checked })} />{name(k)}（{res.roles[k] === 'main' ? '主要' : '补充'}）</label>)}
            <label><input type="checkbox" checked={!!tog.__rest} onChange={(ev) => setTog({ ...tog, __rest: ev.target.checked })} />没写出的数字（{USED.filter((k) => !cited.includes(k)).map(name).join('、') || '无'}）</label>
          </div>
          <p>{nothing ? <>还没有改动：标签是 <b>{RPLAIN[e.reaction]}</b>。</> : <>改回平时后，标签变成 <b style={{ color: LCOL[now] }}>{RPLAIN[now]}</b>。{changed
            ? (anyCited && !restOn ? <span className="ok"> ✓ 改回写出的依据，标签变了：写出的就是原因。</span> : restOn && !anyCited ? <span className="bad"> 没写出的数字也能让标签变，说明有没写出的原因。</span> : null)
            : (restOn && !anyCited ? <span className="ok"> ✓ 没写出的数字改回平时，标签没变：没有隐藏的原因。</span> : anyCited ? <span className="bad"> 只改了一部分依据，标签没变：它可能是“补充”，或者另一条依据在撑着。</span> : null)}</>}</p>
          <dl className="cl-kv">
            <dt>能重现</dt><dd className={res.reproduces ? 'ok' : 'bad'}>{res.reproduces ? '✓ 用记录的数值重跑规则，得到同样的标签' : '✗ 得不到同样的标签'}</dd>
            <dt>写出的是原因</dt><dd>{cited.map((k) => `${name(k)}：单独改回平时 → ${RPLAIN[res.alone[k] as string]}`).join('；')}；全部改回 → {RPLAIN[res.allUsual]}</dd>
            <dt>没有隐藏的原因</dt><dd className={!res.hidden ? 'ok' : 'bad'}>{!res.hidden ? '✓ 没写出的数字改回平时，标签不变' : '✗ 有没写出的原因'}</dd>
          </dl>
          <hr />
          <p><b>这段视频的 {L.events.length} 个事件，自动检验：{passN} / {L.events.length} 通过。</b>旧版卡片（只列“和 2 秒前相比”变了什么）在 {missN} 个事件里没有写出主要依据。</p>
          <div className="cl-tbl"><table>
            <thead><tr><th>#</th><th>标签</th><th>依据（主 / 补）</th><th>全部改回平时 →</th><th>没写的无影响</th><th>推测能重现</th><th>结果</th></tr></thead>
            <tbody>{checks.map((c, i) => (
              <tr key={i} className={i === L.ev ? 'hit' : ''}><td>{i}</td><td>{RPLAIN[L.events[i].reaction]}</td>
                <td>{c.cited.map((k) => name(k) + (c.roles[k] === 'main' ? '主' : '补')).join('，')}</td><td>{RPLAIN[c.allUsual]}</td>
                <td className={!c.hidden ? 'ok' : 'bad'}>{!c.hidden ? '是' : '否'}</td><td className={c.guessOk ? 'ok' : 'bad'}>{c.guessOk ? '是' : '否'}</td>
                <td className={c.pass ? 'ok' : 'bad'}>{c.pass ? '通过' : '未通过'}</td></tr>))}</tbody>
          </table></div>
        </div>
      </div>
      <More title="展开：细节与验证 · Colab 理论版 §6.14、§6.5–§6.10">
        <ul className="cl-list">
          <li><b>课程要求的三层检验：</b>系统判断得对不对（第一层）、解释说的是不是真话（第二层）、用户有没有看懂并恰当地信任（第三层）<Cite ids={[20]} />。这一步做的是第二层。</li>
          <li><b>五项检验：</b>能重现（用记录下来的数字重新跑一遍规则）；写出的就是原因（依据改回平时，标签变）；没有隐藏的原因（没写的改回平时，标签不变）；推测能重现；另外逐条去掉后续线索，那些去掉后推测或把握会变的，就写成“关键的一步”。前四项都通过，这个事件才算通过。</li>
          <li><b>它抓出了什么：</b>旧版卡片列的是“和 2 秒前相比”的变化，而标签是按“和它平时比”的偏离决定的。实际出现过：标题写“耳朵压低”，依据里只有“身体静下来了”。现在卡片、画面上的红圈，都只写判断真正依据的特征。</li>
          <li><b>为什么能检验得这么精确：</b>因为这个系统从一开始就设计成“能被读懂”的：点 → 几项数字 → 一条条规则。对看不透的黑盒模型，同样的问题只能近似回答，那正是 SHAP、LIME 这类方法的用武之地；这里我们没有用到它们。</li>
          <li><b>它不能说明什么：</b>解释和规则一致，不代表规则对猫的判断是对的。判断对不对，要靠人工标注（第一层）；主人有没有看懂，要靠用户研究（第三层）。这两项我们都还没有做完。</li>
        </ul>
      </More>
    </section>
  );
}

/* ---------- step 7: what the owner gets ---------- */
const BUDGET_NAME: Record<string, string> = { resting: '平静', active: '活跃 / 探索', alert: '警觉', ears_back: '耳朵后压', freeze: '僵住', unknown: '看不清', absent: '不在画面里' };
const BUDGET_COL: Record<string, string> = { resting: '#9aa6ba', active: '#234fe5', alert: '#c98a14', ears_back: '#d9622b', freeze: '#b02a37', unknown: '#cdd3de', absent: '#e3e8f0' };
const STATE_COL: Record<State, string> = { tense: '#c2410c', curious: '#2563eb', playful: '#7c3aed', attentive: '#0f766e', calm: '#64748b' };
const USUAL: Record<string, string> = { ear_height: '耳朵回到它平时的高度', ear_angle: '耳朵回到它平时的角度', eye_aperture: '眼睛回到它平时的样子', activity: '身体的活动回到平时的水平' };
const CHANGE_TEXT: Record<string, [string, string, string]> = {
  ear_height: ['耳朵', '比刚才低了', '比刚才竖起来了'], ear_angle: ['耳朵', '更朝前了', '向外转了'], eye_aperture: ['眼睛', '眯起来了', '睁大了'],
  muzzle_ratio: ['口鼻', '收紧了', '放松了'], head_drop: ['头', '抬高了', '放低了'], activity: ['身体', '静下来了', '动起来了'],
};
const TRIGGER_TEXT = { sound: '之前突然出现较大的声音', motion: '之前画面里别的地方有东西在动' };
const PRIOR_K = 10;

function ownerGuess(e: EventRec) { return e.interp ? guess(e.reaction, e.interp.cues, e.interp.face_visible) : null; }
function fixedPrior(reaction: string, labels: Record<number, { verdict: 'right' | 'wrong' | 'unsure'; actual?: State }>, events: EventRec[]): { before: number[]; after: number[]; n: number } {
  const p0 = guess(reaction, [], 1)?.post ?? [0.2, 0.2, 0.2, 0.2, 0.2];
  const base = ({ ears_back: [0.4, 0.15, 0.05, 0.3, 0.1], freeze: [0.45, 0.05, 0.2, 0.25, 0.05], alert: [0.15, 0.5, 0.05, 0.25, 0.05], active: [0.15, 0.3, 0.4, 0.05, 0.1] } as Record<string, number[]>)[reaction] ?? p0;
  const cnt = [0, 0, 0, 0, 0]; let n = 0;
  events.forEach((e, i) => {
    const l = labels[i];
    if (!l || e.reaction !== reaction) return;
    const g = ownerGuess(e);
    const s2 = l.verdict === 'right' ? (g && g.show ? g.top : undefined) : l.verdict === 'wrong' ? l.actual : undefined;
    if (s2) { cnt[STATES.indexOf(s2)] += 1; n += 1; }
  });
  return { before: base, after: base.map((v, i) => (PRIOR_K * v + cnt[i]) / (PRIOR_K + n)), n };
}

function OwnerStep({ L, onWatch }: { L: L; onWatch: (i: number) => void }) {
  const [view, setView] = useState<'home' | 'card'>('home');
  const [labels, setLabels] = useState<Record<number, { verdict: 'right' | 'wrong' | 'unsure'; actual?: State }>>({});
  const e = L.events[L.ev];
  const g = ownerGuess(e);
  const res = checkEvent(e);
  const shown = (i: number) => { const x = ownerGuess(L.events[i]); return !!x && x.show; };
  const nShown = L.events.filter((_, i) => shown(i)).length;

  // overview: time share from the whole clip, using the calibration length chosen in step 3
  const cnt: Record<string, number> = {}; let tot = 0;
  L.out.forEach((o, i) => { if (o.calibrating) return; const k = L.clip.frames[i].box ? o.label : 'absent'; cnt[k] = (cnt[k] || 0) + 1; tot++; });
  const budget = Object.entries(cnt).sort((a, b) => b[1] - a[1]);
  const topK = budget[0]?.[0] ?? 'resting', topShare = budget[0] ? Math.round((budget[0][1] / tot) * 100) : 0;
  const summary = (topK === 'resting' ? `这段时间它大部分时候很平静（${topShare}%）。` : `这段时间它花得最多的是“${BUDGET_NAME[topK]}”（${topShare}%）。`) + (nShown ? `有 ${nShown} 个时刻值得看一看。` : '');

  const decisive = g && g.show && e.interp ? e.interp.cues.filter((c) => { const alt = guess(e.reaction, e.interp!.cues.filter((x) => x !== c), e.interp!.face_visible); return !!alt && !!g && (alt.top !== g.top || alt.band !== g.band); }) : [];
  const cueName = (c: string) => CUES.find((x) => x[0] === c)![1];
  const ifLines = Object.entries(res.alone).filter(([, now]) => now !== e.reaction).map(([k, now]) => `如果${USUAL[k]}，就不会标为「${RPLAIN[e.reaction]}」，而是「${RPLAIN[now as string]}」。`);
  const label = labels[L.ev];
  const fp = fixedPrior(e.reaction, labels, L.events);
  const tell = g ? TELL[`${g.top}|${g.second}`] || TELL[`${g.second}|${g.top}`] || '' : '';
  const setLabel = (v: 'right' | 'wrong' | 'unsure', actual?: State) => setLabels({ ...labels, [L.ev]: { verdict: v, actual } });

  return (
    <section className="cl-step" id="s7">
      <Head no="07" en="THE OWNER'S REPORT" title="最后：把这一切变成主人看得懂的报告" desc="前面六步是系统内部的活。主人看到的，是一份一分钟内能读完、又能自己核对的报告。" />
      <div className="cl-grid">
        <div className="cl-prose">
          <p>报告分三层，每一层只回答主人的下一个问题：</p>
          <ol className="cl-steps-list">
            <li><b>总览：</b>这段时间它过得怎么样？一句话，加上时间怎么分布。</li>
            <li><b>值得看的时刻：</b>哪几个时刻要看一眼？每个时刻一行，只写“看起来像什么”和把握。</li>
            <li><b>点开一个时刻：</b>才是完整的卡片，也就是右边手机里现在显示的这一张。</li>
          </ol>
          <p>一张卡片按下面的顺序读（对应右边的圆圈数字）：</p>
          <ol className="cl-steps-list circled">
            <li><b>先给结论，并写明这只是推测</b>，附上把握程度。把握不够时，只写看到的行为，不给情绪，而且折叠起来。</li>
            <li><b>另一种可能，以及怎么分辨。</b>让主人知道还有别的解释。</li>
            <li><b>为什么：</b>只写真正的依据，和“如果……就不会”。前面第 6 步检验过的，就是这一块。</li>
            <li><b>视频：</b>主人用自己对它的了解来判断，而不是只信系统。</li>
            <li><b>主人说对不对。</b>这个回答不是摆设，见下面。</li>
          </ol>
          <Evidence kind="proto" note="还没有给真实的主人读过" />
        </div>
        <div className="cl-widget">
          <div className="cl-row"><span className="cl-note">事件（和上面同一个）：</span>
            <div className="cl-seg" role="group" aria-label="选择事件">{L.events.map((x, i) => <button key={i} aria-pressed={L.ev === i} onClick={() => L.pickEvent(i)}>#{i} {mmss(x.start_s)}</button>)}</div></div>
          <div className="cl-phone">
            <div className="cl-seg cl-phone-tabs" role="group" aria-label="手机里的页面">
              <button aria-pressed={view === 'home'} onClick={() => setView('home')}>今天</button>
              <button aria-pressed={view === 'card'} onClick={() => setView('card')}>这个时刻</button>
            </div>
            {view === 'home' ? (
              <div className="cl-phone-body">
                <p className="cl-phone-title">你不在的时候</p>
                <p className="cl-phone-lead">{summary}</p>
                <div className="cl-phone-card">
                  <p className="cl-phone-h">它的时间都花在哪里</p>
                  <div className="cl-budget">{budget.map(([k, n]) => <span key={k} style={{ flex: n, background: BUDGET_COL[k] }} />)}</div>
                  <p className="cl-phone-legend">{budget.map(([k, n]) => <span key={k}><i style={{ background: BUDGET_COL[k] }} />{BUDGET_NAME[k]} <b>{Math.round((n / tot) * 100)}%</b></span>)}</p>
                </div>
                <p className="cl-phone-h">值得看的时刻</p>
                {L.events.map((x, i) => { const xg = ownerGuess(x); const ok = !!xg && xg.show; return ok ? (
                  <button key={i} className="cl-phone-row" style={{ borderLeftColor: STATE_COL[xg!.top] }} onClick={() => { L.pickEvent(i); setView('card'); }}>
                    <span className="t">片段 {i} · {mmss(x.start_s)}</span><span className="g" style={{ color: STATE_COL[xg!.top] }}>看起来像：{STATE_TEXT[xg!.top]}</span><span className="b" style={{ color: STATE_COL[xg!.top] }}>推测 · 把握{xg!.band}</span></button>) : null; })}
                <p className="cl-phone-fold">另有 {L.events.length - nShown} 个时刻把握不够，没有给推测，已折叠。</p>
              </div>
            ) : (
              <div className="cl-phone-body">
                <p className="cl-phone-time">片段 {L.ev} · {mmss(e.start_s)}</p>
                <dl className="cl-fields" aria-label="事件标签（字段名与 labels_template.csv 一致）">
                  <div><dt>event_id</dt><dd>{L.ev}</dd></div>
                  <div><dt>time</dt><dd>{mmss(e.start_s)}</dd></div>
                  <div><dt>reaction<small>行为标签</small></dt><dd>{RPLAIN[e.reaction]}</dd></div>
                  <div><dt>system_guess<small>情绪标签</small></dt><dd style={g && g.show ? { color: STATE_COL[g.top] } : undefined}>{g && g.show ? STATE_TEXT[g.top] : '— 不给出'}</dd></div>
                  <div><dt>confidence<small>把握</small></dt><dd>{g && g.show ? g.band : '低'}</dd></div>
                </dl>
                <div className="cl-phone-card"><p className="cl-phone-h">系统在猫身上看到的</p><CatMap z={zEvent(e)} compact /></div>
                <button className="cl-play" onClick={() => onWatch(L.ev)}>▶ 看这一段视频（上面的画面会跳到这里）<span className="cl-num">④</span></button>
                <div className="cl-phone-card">
                  <p className="cl-phone-concl" style={{ color: g && g.show ? STATE_COL[g.top] : '#667083' }}>
                    {g && g.show ? `看起来像：${STATE_TEXT[g.top]}` : RPLAIN[e.reaction]}<span className="cl-num">①</span></p>
                  <p className={'cl-phone-badge' + (g && g.show ? '' : ' muted')} style={g && g.show ? { color: STATE_COL[g.top] } : undefined}>{g && g.show ? `推测 · 把握${g.band}` : '把握不够，不做推测'}</p>
                  {g && g.show ? <p className="cl-phone-h" style={{ marginTop: 10 }}>它此刻最可能的状态（系统推测的占比）</p> : null}
                  {g && g.show ? <div className="cl-bars cl-phone-bars" aria-label="系统对五种状态的推测占比">{g.post.map((_, i) => i).sort((a, b) => g.post[b] - g.post[a]).map((i, n) => (
                    <div className={'cl-bar' + (n === 0 ? ' top' : '')} key={i}><span>{STATE_TEXT[STATES[i]]}</span>
                      <span className="track"><span className="fill" style={{ width: (g.post[i] * 100).toFixed(1) + '%', ...(n === 0 ? { background: STATE_COL[STATES[i]] } : {}) }} /></span><span className="num">{Math.round(g.post[i] * 100)}%</span></div>))}</div> : null}
                  {g && g.show ? <p className="cl-phone-p">也可能是：<b>{STATE_TEXT[g.second]}</b>{tell ? `。怎么分辨：${tell}` : ''}<span className="cl-num">②</span></p> : null}
                  {decisive.map((c) => { const alt = guess(e.reaction, e.interp!.cues.filter((x) => x !== c), e.interp!.face_visible)!; return <p className="cl-phone-p key" key={c}>关键的一步：{cueName(c)}。如果没有这一步，{!alt.show ? '把握就不够，不会给出推测。' : alt.top !== g!.top ? `看起来更像“${STATE_TEXT[alt.top]}”。` : `把握会从“${g!.band}”变为“${alt.band}”。`}</p>; })}
                </div>
                <div className="cl-phone-card">
                  <p className="cl-phone-h">为什么标为「{RPLAIN[e.reaction]}」<span className="cl-num">③</span></p>
                  {res.cited.map((k) => <p className="cl-phone-p" key={k}><span className={'cl-role ' + (res.roles[k] === 'main' ? 'main' : '')}>{res.roles[k] === 'main' ? '主要' : '补充'}</span>{driverText({ feature: k, z: e.z[k] ?? 0 })}</p>)}
                  {ifLines.map((x) => <p className="cl-phone-p if" key={x}>{x}</p>)}
                  <p className="cl-phone-fine">{res.pass ? '已自动检验：把上面的依据改回它平时的样子，标签就会改变。' : '自动检验没有通过，这条解释请谨慎对待。'}</p>
                </div>
                {(e.changes?.length || e.triggers?.length) ? (
                  <div className="cl-phone-card">
                    <p className="cl-phone-h">和 2 秒前相比</p>
                    <div className="cl-tags">{e.changes.map(([k, dz]) => { const t = CHANGE_TEXT[k]; return <span key={k}>{t[0]}{dz < 0 ? t[1] : t[2]}（{amount(dz)}）</span>; })}</div>
                    {e.triggers?.length ? <><p className="cl-phone-h" style={{ marginTop: 10 }}>在这之前</p>{e.triggers.map((k) => <p className="cl-phone-p" key={k}>{TRIGGER_TEXT[k]}</p>)}<p className="cl-phone-fine">只说明先后顺序，不代表是它引起的。</p></> : null}
                  </div>) : null}
                {(e.notes || []).map((n) => <p className="cl-phone-note" key={n}>⚠ {n}</p>)}
                <div className="cl-phone-card fb">
                  <p className="cl-phone-h">{g && g.show ? '这个推测对吗？' : '你觉得它当时怎么了？'}<span className="cl-num">⑤</span></p>
                  <div className="cl-fbrow">
                    {g && g.show ? (['right', 'wrong', 'unsure'] as const).map((v) => <button key={v} aria-pressed={label?.verdict === v} onClick={() => setLabel(v)}>{v === 'right' ? '对' : v === 'wrong' ? '不对' : '说不准'}</button>) : null}
                  </div>
                  {(label?.verdict === 'wrong' || !(g && g.show)) ? (
                    <div className="cl-fbrow"><span className="cl-note">更像是：</span>{STATES.map((st) => <button key={st} aria-pressed={label?.actual === st} onClick={() => setLabel('wrong', st)}>{STATE_TEXT[st].split(' / ')[0]}</button>)}</div>) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="cl-loop">
        <h3>主人的回答，怎么回头修正系统</h3>
        <p>每点一次“对 / 不对，更像是……”，就多了一条标注。系统把它加进第 5 步里手设的概率：我们的手设数字当作 10 条“虚拟标注”，真实标注一条条加进去。下面是“{RPLAIN[e.reaction]}”这个标签的起点概率，会随着你在手机里的回答而变（在手机里对不同的事件点点看）。</p>
        <div className="cl-bars">{STATES.map((st, i) => { const d = fp.after[i] - fp.before[i]; return (
          <div className="cl-bar" key={st}><span>{STATE_TEXT[st]}</span>
            <span className="track"><span className="fill" style={{ width: (fp.after[i] * 100).toFixed(1) + '%', background: '#9db3ee' }} /></span>
            <span className="num">{Math.round(fp.after[i] * 100)}%{fp.n ? <small className={d > 0.004 ? 'up' : d < -0.004 ? 'down' : ''}> {d > 0.004 ? '↑' : d < -0.004 ? '↓' : ''}</small> : null}</span></div>); })}</div>
        <p className="cl-note">{fp.n ? `现在用了 ${fp.n} 条“${RPLAIN[e.reaction]}”的标注。` : '还没有标注，显示的是手设的起点。'}几条标注只能轻轻推动概率，约 30 条之后数据才开始占主导。注意：主人的回答也只是另一种判断，不是“真相”，所以要先看视频、写下自己的判断，再看系统的推测。</p>
      </div>
      <More title="展开：细节与验证 · Colab 理论版 §6.11、§9.2–§9.4">
        <ul className="cl-list">
          <li><b>为什么按“事件”来写，而不是“猫现在是什么情绪”：</b>主人真正想问的，通常是“它为什么突然感兴趣了 / 不对劲了”。这是一个对比的问题：为什么是现在，而不是刚才？所以每张卡片都在比较变化前后 <Cite ids={[2]} />。</li>
          <li><b>“之前发生了什么”只说先后，不说原因：</b>一次“声音之后猫警觉了”说明不了什么，因为声音可能本来就一直有。系统还会把每种线索和它平时出现的频率比较（叫“提升度”，接近 1 就是无关）。在这段视频里，声音突变的提升度是 1.0（全程有配乐），所以不能当作线索。</li>
          <li><b>措辞的规则：</b>说“比它平时”，不说“比一般的猫”；每一句话都能追到一个数字，文字由模板生成，不让语言模型自由发挥；把握程度写在明处，写出没看到的（尾巴、胡须、叫声）；单次事件说“在……之后”，不说“因为……”。</li>
          <li><b>把握不够就收起来：</b>最高概率不够高、或者依据脸部的标签而脸大部分时间看不清，就不给情绪，只写看到的行为，并折叠在“另有 N 个时刻”里。</li>
          <li><b>多个摄像头：</b>2 秒内不同摄像头拍到的同一时刻会合并，看得更清楚的在前，另一个作为“换个角度看”；两个视角的推测不一致时，不悄悄选一个，而是注明并把把握降一级。</li>
          <li><b>还没有验证的：</b>主人是否真的看懂、会不会因此改变对猫的看法，需要一次用户研究（先让主人只看视频写下判断，再看系统的解释，记录是否改变、为什么；再故意放进 2–3 个错误的推测，看能不能发现）。一位主人只能当形成性研究，不能当作“证明有效”。</li>
        </ul>
      </More>
    </section>
  );
}

/* ---------- main ---------- */
const Step1M = memo(Step1), Step2M = memo(Step2), Step3M = memo(Step3), Step4M = memo(Step4), Step5M = memo(Step5), Step6M = memo(Step6), OwnerStepM = memo(OwnerStep);

export function CaseLab({ children }: { children?: ReactNode }) {
  const [clip, setClip] = useState<ClipData | null>(null);
  const [events, setEvents] = useState<EventRec[]>([]);
  const [err, setErr] = useState('');
  useEffect(() => {
    Promise.all([fetch('/case/frames.json').then((r) => r.json()), fetch('/case/events.json').then((r) => r.json())])
      .then(([c, e]) => { setClip(c); setEvents(e); }).catch((x) => setErr(String(x)));
  }, []);
  if (err) return <><p className="cl-warn">数据没有载入成功：{err}</p>{children}</>;
  if (!clip) return <><section className="cl-panel cl-panel-loading"><h1>一只猫的耳朵压低了，<span>系统是怎么判断的？</span></h1><p>正在载入这段视频的数据……</p></section>{children}</>;
  return <Lab clip={clip} events={events}>{children}</Lab>;
}

function Lab({ clip, events, children }: { clip: ClipData; events: EventRec[]; children?: ReactNode }) {
  const kp = useMemo(() => clip.frames.map((f, i) => (f.kp ? i : -1)).filter((i) => i >= 0), [clip]);
  const nF = clip.frames.length, fps = clip.fps, total = clip.frames[nF - 1].t;
  const [t, setT] = useState(0); // seconds; continuous: the scrubber, or the video clock while it plays
  const [calib, setCalib] = useState(clip.calib_frames);
  const [feat, setFeat] = useState<FeatureKey>('ear_height');
  const [minConf, setMinConf] = useState(0.25);
  const [layers, setLayers] = useState<Layers>({ box: true, face: true, body: true, basis: true });
  const [ev, setEv] = useState(0);
  const [geo, setGeo] = useState(false);
  const [wantPhoto, setWantPhoto] = useState(true);
  const [showVideo, setShowVideo] = useState(true);
  const [videoStart] = useState(() => Math.max(0, Math.floor((events[0]?.start_s ?? 0) - 1))); // fixed: a moving src would reload the player
  const [playing, setPlaying] = useState(false);
  const [panelVisible, setPanelVisible] = useState(true);
  const iframe = useRef<HTMLIFrameElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const miniRef = useRef<HTMLDivElement>(null);
  const showVideoRef = useRef(showVideo);
  showVideoRef.current = showVideo;
  const tRef = useRef(t);
  tRef.current = t;
  const lastSeek = useRef(0);
  const clock = useRef({ t: 0, wall: 0 });
  const ytReady = useRef(false);
  const ytLastTime = useRef(-1);
  const ytState = useRef<number | undefined>(undefined);
  const photoOk = usePhotoAvailable();
  const { base, out } = useMemo(() => run(clip.frames, calib), [clip, calib]);

  // the frame being analysed, and the nearest frame that has keypoints drawn
  const fi = Math.max(0, Math.min(nF - 1, Math.round(t * fps)));
  let lo = 0, hi = kp.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (kp[mid] < fi) lo = mid + 1; else hi = mid; }
  const s = lo > 0 && Math.abs(kp[lo - 1] - fi) <= Math.abs(kp[lo] - fi) ? lo - 1 : lo;
  const fiK = kp[s], frame = clip.frames[fiK], step = out[fiK];

  // The original video is embedded from YouTube (not copied); the page keeps it in step with the scrubber.
  const yt = useCallback((func: string, args: unknown[] = []) => iframe.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*'), []);
  const seekTarget = useRef<number | null>(null);
  const peeking = useRef(false);
  const seekTimer = useRef(0);
  const [syncing, setSyncing] = useState(false);
  // The video is the reference: after a jump the analysis snaps to the time the player reports,
  // so what you see in the video and what is measured are the same moment.
  const seekVideo = useCallback((tt: number) => {
    if (!showVideoRef.current) return;
    seekTarget.current = tt;
    setSyncing(true);
    window.clearTimeout(seekTimer.current);
    const wait = Math.max(0, 140 - (Date.now() - lastSeek.current));
    seekTimer.current = window.setTimeout(() => {
      lastSeek.current = Date.now();
      const at = seekTarget.current ?? tt;
      // a player that has not started yet shows black after seek+pause: let it play (muted) just long enough to draw that frame
      if (ytState.current === undefined || ytState.current === -1 || ytState.current === 5) { peeking.current = true; yt('mute'); yt('seekTo', [at, true]); yt('playVideo'); }
      else { yt('seekTo', [at, true]); yt('pauseVideo'); }
      seekTimer.current = window.setTimeout(() => { seekTarget.current = null; setSyncing(false); }, 2000);
    }, wait);
  }, [yt]);
  const onScrub = useCallback((i: number) => { const tt = clip.frames[i].t; setPlaying(false); setT(tt); seekVideo(tt); }, [clip, seekVideo]);
  const pickEvent = useCallback((i: number) => {
    setEv(i);
    const e = events[i];
    let best = -1;
    for (let q = 0; q < kp.length; q++) { const f = clip.frames[kp[q]]; if (f.t >= e.start_s - 0.2 && f.t <= e.start_s + 1.2 && out[kp[q]].label === e.reaction) { best = q; break; } }
    if (best < 0) for (let q = 0; q < kp.length; q++) if (clip.frames[kp[q]].t >= e.start_s) { best = q; break; }
    const tt = clip.frames[kp[Math.max(best, 0)]].t;
    setPlaying(false); setT(tt); seekVideo(tt);
  }, [events, kp, clip, out, seekVideo]);
  const watchEvent = useCallback((i: number) => {
    pickEvent(i);
    const tt = Math.max(0, events[i].start_s - 2);
    setShowVideo(true);
    window.setTimeout(() => { seekTarget.current = null; setSyncing(false); yt('unMute'); yt('seekTo', [tt, true]); yt('playVideo'); clock.current = { t: tt, wall: performance.now() }; setT(tt); }, 300);
  }, [pickEvent, events, yt]);
  const onPlayPause = useCallback(() => {
    if (playing) { yt('pauseVideo'); setPlaying(false); return; }
    seekTarget.current = null; setSyncing(false); window.clearTimeout(seekTimer.current);
    if (tRef.current >= total - 0.1) { yt('seekTo', [0, true]); clock.current = { t: 0, wall: performance.now() }; setT(0); }
    else clock.current = { t: tRef.current, wall: performance.now() };
    yt('unMute'); yt('playVideo');
  }, [playing, yt, total]);
  useEffect(() => { pickEvent(0); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // listen to the embedded player; while it plays, the analysis follows its clock
  useEffect(() => {
    if (!showVideo) return;
    const onMsg = (e: MessageEvent) => {
      if (!/youtube(-nocookie)?\.com$/.test(new URL(e.origin).hostname)) return;
      let d: { event?: string; info?: { currentTime?: number; playerState?: number } };
      try { d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
      if (!ytReady.current) { ytReady.current = true; seekVideo(tRef.current); } // the player starts at its own start time: bring it to the analysed moment
      if (d.event !== 'infoDelivery' || !d.info) return;
      const st = d.info.playerState;
      if (st === 1 && peeking.current) { peeking.current = false; ytState.current = 2; yt('pauseVideo'); }
      else if (st !== undefined) { ytState.current = st; if (st === 1) setPlaying(true); else if (st === 2 || st === 0 || st === 5) setPlaying(false); }
      // the player only repeats its state when it changes, so also follow a clock that is moving
      const t0 = d.info.currentTime;
      if (seekTarget.current !== null && typeof t0 === 'number' && Math.abs(t0 - seekTarget.current) < 0.6 && (ytState.current !== 1 || d.info.playerState === 1)) {
        window.clearTimeout(seekTimer.current);
        seekTarget.current = null; setSyncing(false); setT(Math.min(t0, total));
      }
      const moving = typeof t0 === 'number' && ytLastTime.current >= 0 && Math.abs(t0 - ytLastTime.current) > 0.02;
      if (typeof t0 === 'number') ytLastTime.current = t0;
      if (typeof t0 === 'number' && (ytState.current === 1 || (ytState.current === undefined && moving))) {
        clock.current = { t: t0, wall: performance.now() };
        if (ytState.current === undefined) setPlaying(true);
        setT(Math.min(t0, total));
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [showVideo, total, seekVideo]);
  // between the player's messages, advance a local clock so the numbers change on every frame
  useEffect(() => {
    if (!playing) return;
    let raf = 0, last = 0;
    const tick = (now: number) => {
      const tt = clock.current.t + (performance.now() - clock.current.wall) / 1000;
      if (now - last > 50) { last = now; setT(Math.min(tt, total)); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, total]);
  const onIframeLoad = useCallback(() => {
    // the player's script starts after the frame loads: repeat the handshake until it answers
    ytReady.current = false; ytLastTime.current = -1; ytState.current = undefined;
    let tries = 0;
    const id = window.setInterval(() => {
      if (ytReady.current || ++tries > 20) { window.clearInterval(id); return; }
      iframe.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*');
    }, 400);
  }, []);

  // layout: the slim bar sits under the top bar once the panel is out of view
  useEffect(() => {
    const measure = () => {
      const top = document.querySelector('.topbar')?.getBoundingClientRect().height ?? 88;
      const mh = miniRef.current?.getBoundingClientRect().height ?? 90;
      const root = document.documentElement.style;
      root.setProperty('--cl-top', `${Math.round(top)}px`);
      root.setProperty('--cl-pad', `${Math.round(top + mh + 18)}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (miniRef.current) ro.observe(miniRef.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, []);
  useEffect(() => {
    const el = panelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((es) => es.forEach((x) => setPanelVisible(x.intersectionRatio > 0.12)), { threshold: [0, 0.12, 0.3] });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const el = document.getElementById('s2');
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((es) => es.forEach((x) => setGeo(x.isIntersecting)), { rootMargin: '-340px 0px -30% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const runs = useMemo(() => {
    const r: [number, number, string][] = [];
    let st = 0;
    for (let i = 1; i <= out.length; i++) if (i === out.length || out[i].label !== out[st].label) { r.push([st, i, out[st].label]); st = i; }
    return r;
  }, [out]);
  const L: L = useMemo(() => ({ clip, events, kp, s, step, frame, fi: fiK, base, out, calib, setCalib, feat, setFeat, minConf, setMinConf, ev, pickEvent }),
    [clip, events, kp, s, step, frame, fiK, base, out, calib, feat, minConf, ev, pickEvent]);
  const usePhoto = photoOk && wantPhoto;
  return (
    <>
      <Panel clip={clip} out={out} fi={fi} kpFrame={frame} kpStep={step} kpFi={fiK} layers={layers} setLayers={setLayers} minConf={minConf} geoFeature={geo ? feat : null}
        usePhoto={usePhoto} photoOk={photoOk} wantPhoto={wantPhoto} setWantPhoto={setWantPhoto} showVideo={showVideo} setShowVideo={setShowVideo} iframeRef={iframe}
        videoStart={videoStart} onIframeLoad={onIframeLoad} playing={playing} onPlayPause={onPlayPause} onScrub={onScrub} syncing={syncing} runs={runs} calib={calib} panelRef={panelRef} />
      <MiniBar visible={!panelVisible} clip={clip} out={out} fi={fi} kpFrame={frame} kpStep={step} kpFi={fiK} layers={layers} minConf={minConf} geoFeature={geo ? feat : null}
        usePhoto={usePhoto} onScrub={onScrub} barRef={miniRef} />
      {children}
      <nav className="cl-nav cl-nav-top" aria-label="步骤">
        {[['s1', '1 找到猫'], ['s2', '2 量数字'], ['s3', '3 和自己比'], ['s4', '4 规则'], ['s5', '5 之后发生了什么'], ['s6', '6 解释是真的吗'], ['s7', '7 给主人的报告'], ['s8', '8 手机 App'], ['s9', '局限']].map(([id, n]) => <a key={id} href={'#' + id}>{n}</a>)}
      </nav>
      <Step1M L={L} />
      <Step2M L={L} />
      <Step3M L={L} />
      <Step4M L={L} />
      <Step5M L={L} />
      <Step6M L={L} />
      <OwnerStepM L={L} onWatch={watchEvent} />
      <AppStep L={L} onWatch={watchEvent} />
      <Limits />
    </>
  );
}


/* ---------- step 8: the phone app ---------- */
type Verdict = 'right' | 'wrong' | 'unsure';
function AppStep({ L, onWatch }: { L: L; onWatch: (i: number) => void }) {
  const [tab, setTab] = useState<'today' | 'moments' | 'usual'>('today');
  const [filter, setFilter] = useState<'all' | 'guess' | 'behavior'>('all');
  const [open, setOpen] = useState<number | null>(null);
  const [fb, setFb] = useState<Record<number, Verdict>>({});
  const rows = useMemo(() => L.events.map((e, i) => { const g = ownerGuess(e); return { i, e, g, ok: !!g && g.show }; }), [L.events]);
  const shown = rows.filter((r) => r.ok);
  const latest = shown[shown.length - 1];
  const cnt: Record<string, number> = {}; let tot = 0;
  L.out.forEach((o, i) => { if (o.calibrating) return; const k = L.clip.frames[i].box ? o.label : 'absent'; cnt[k] = (cnt[k] || 0) + 1; tot++; });
  const budget = Object.entries(cnt).sort((a, b) => b[1] - a[1]);
  const list = rows.filter((r) => filter === 'all' || (filter === 'guess' ? r.ok : !r.ok));
  const cur = open === null ? null : rows[open];
  const curChk = cur ? checkEvent(cur.e) : null;
  const nFb = Object.keys(fb).length;
  const go = (t: typeof tab) => { setTab(t); setOpen(null); };
  const Badge = ({ r }: { r: (typeof rows)[number] }) => r.ok
    ? <span className="cl-app-badge" style={{ color: STATE_COL[r.g!.top] }}>推测 · 把握{r.g!.band}</span>
    : <span className="cl-app-badge muted">只看到行为</span>;

  return (
    <section className="cl-step" id="s8">
      <Head no="08" en="THE PHONE APP" title="把报告做成手机 App：只放数据真能判断的东西" desc="前面的卡片是一张静态页面。真正的 App 要让主人来回翻、筛选、点开、回答。下面是按“系统到底算得出什么”来安排的界面，右边可以点。" />
      <div className="cl-grid">
        <div className="cl-prose">
          <p>设计从一张账开始：系统能算出什么，界面里就放什么；算不出的，不放，也不假装。</p>
          <table className="cl-table">
            <thead><tr><th>系统算得出</th><th>在 App 里的位置</th></tr></thead>
            <tbody>
              <tr><td>每一段时间的行为（平静、活跃、警觉、耳朵后压、僵住）</td><td>「今天」里的时间条</td></tr>
              <tr><td>某个时刻的情绪推测，带把握程度</td><td>「今天」顶部的<b>看起来像</b>，和「时刻」里每一行</td></tr>
              <tr><td>耳朵、身体比它平时变了多少</td><td>点开时刻后的“为什么”</td></tr>
              <tr><td>主人的回答（对 / 不对 / 说不准）</td><td>每个时刻底部的按钮，回头修正系统</td></tr>
            </tbody>
          </table>
          <p><b>不放的东西：</b>尾巴、胡须、瞳孔、叫声，这个系统看不到，所以没有对应的界面，也不会出现在推测里。把握不够的时刻，只写看到的行为，不给情绪。</p>
          <ol className="cl-steps-list">
            <li><b>今天：</b>先回答“它现在像什么”，再给时间分布。</li>
            <li><b>时刻：</b>能筛选“有推测 / 只看到行为”，点开才是完整卡片。</li>
            <li><b>平常：</b>说明系统看什么、不看什么，和你教了它多少。</li>
          </ol>
          <Evidence kind="hand" note="界面是设计稿，还没有给主人用过" />
        </div>
        <div className="cl-widget">
          <div className="cl-phone cl-app" aria-label="手机 App 原型">
            <div className="cl-app-screen">
              {tab === 'today' ? (
                <div className="cl-phone-body">
                  <p className="cl-phone-title">你不在的时候</p>
                  {latest ? (
                    <button className="cl-app-hero" style={{ borderColor: STATE_COL[latest.g!.top] }} onClick={() => { setTab('moments'); setOpen(latest.i); }}>
                      <small>最近一次 · 片段 {latest.i} · {mmss(latest.e.start_s)}</small>
                      <b style={{ color: STATE_COL[latest.g!.top] }}>看起来像：{STATE_TEXT[latest.g!.top]}</b>
                      <Badge r={latest} />
                    </button>
                  ) : <p className="cl-phone-lead">这段时间没有把握足够高的推测，只记录了行为。</p>}
                  <div className="cl-phone-card">
                    <p className="cl-phone-h">它的时间都花在哪里</p>
                    <div className="cl-budget">{budget.map(([k, n]) => <span key={k} style={{ flex: n, background: BUDGET_COL[k] }} />)}</div>
                    <p className="cl-phone-legend">{budget.slice(0, 4).map(([k, n]) => <span key={k}><i style={{ background: BUDGET_COL[k] }} />{BUDGET_NAME[k]} <b>{Math.round((n / tot) * 100)}%</b></span>)}</p>
                  </div>
                  <p className="cl-phone-fold">共 {rows.length} 个时刻，其中 {shown.length} 个给出了推测。</p>
                </div>
              ) : null}
              {tab === 'moments' && cur === null ? (
                <div className="cl-phone-body">
                  <p className="cl-phone-title">时刻</p>
                  <div className="cl-seg" role="group" aria-label="筛选">
                    {([['all', '全部'], ['guess', '有推测'], ['behavior', '只看到行为']] as const).map(([k, n]) => <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)}>{n}</button>)}
                  </div>
                  {list.map((r) => (
                    <button key={r.i} className="cl-phone-row" style={r.ok ? { borderLeftColor: STATE_COL[r.g!.top] } : undefined} onClick={() => setOpen(r.i)}>
                      <span className="t">片段 {r.i} · {mmss(r.e.start_s)}</span>
                      <span className="g" style={{ color: r.ok ? STATE_COL[r.g!.top] : '#667083' }}>{r.ok ? `看起来像：${STATE_TEXT[r.g!.top]}` : RPLAIN[r.e.reaction]}</span>
                      <Badge r={r} />
                    </button>))}
                  {list.length === 0 ? <p className="cl-phone-fold">这一类没有时刻。</p> : null}
                </div>
              ) : null}
              {tab === 'moments' && cur && curChk ? (
                <div className="cl-phone-body">
                  <button className="cl-app-back" onClick={() => setOpen(null)}>‹ 时刻</button>
                  <p className="cl-phone-time">片段 {cur.i} · {mmss(cur.e.start_s)}</p>
                  <div className="cl-phone-card">
                    <p className="cl-phone-concl" style={{ color: cur.ok ? STATE_COL[cur.g!.top] : '#667083' }}>{cur.ok ? `看起来像：${STATE_TEXT[cur.g!.top]}` : RPLAIN[cur.e.reaction]}</p>
                    <Badge r={cur} />
                    {cur.ok ? <p className="cl-phone-p">也可能是：<b>{STATE_TEXT[cur.g!.second]}</b></p> : <p className="cl-phone-p">把握不够，系统只写看到的行为，不给情绪。</p>}
                  </div>
                  <div className="cl-phone-card"><p className="cl-phone-h">系统在猫身上看到的</p><CatMap z={zEvent(cur.e)} compact /></div>
                  <button className="cl-play" onClick={() => onWatch(cur.i)}>▶ 看这一段视频</button>
                  <div className="cl-phone-card">
                    <p className="cl-phone-h">为什么标为「{RPLAIN[cur.e.reaction]}」</p>
                    {curChk.cited.slice(0, 2).map((k) => <p className="cl-phone-p" key={k}>{driverText({ feature: k, z: cur.e.z[k] ?? 0 })}</p>)}
                  </div>
                  <div className="cl-phone-card fb">
                    <p className="cl-phone-h">{cur.ok ? '这个推测对吗？' : '你觉得它当时怎么了？'}</p>
                    <div className="cl-fbrow">{(['right', 'wrong', 'unsure'] as const).map((v) => <button key={v} aria-pressed={fb[cur.i] === v} onClick={() => setFb({ ...fb, [cur.i]: v })}>{v === 'right' ? '对' : v === 'wrong' ? '不对' : '说不准'}</button>)}</div>
                  </div>
                </div>
              ) : null}
              {tab === 'usual' ? (
                <div className="cl-phone-body">
                  <p className="cl-phone-title">平常</p>
                  <div className="cl-phone-card">
                    <p className="cl-phone-h">系统在看</p>
                    <p className="cl-phone-p">耳朵的高度和朝向、眼睛睁开的程度、身体动得多不多。每一项都和<b>它自己的平时</b>比。</p>
                  </div>
                  <div className="cl-phone-card">
                    <p className="cl-phone-h">系统看不到</p>
                    <p className="cl-phone-p">尾巴、胡须、瞳孔、叫声。所以推测不会提到它们。</p>
                  </div>
                  <div className="cl-phone-card">
                    <p className="cl-phone-h">你教了它</p>
                    <p className="cl-phone-p">{nFb ? `已回答 ${nFb} 个时刻。` : '还没有回答。在「时刻」里点开一个，告诉系统对不对。'}</p>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="cl-app-tabs" role="tablist" aria-label="App 底部导航">
              {([['today', '今天'], ['moments', '时刻'], ['usual', '平常']] as const).map(([k, n]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => go(k)}>{n}</button>)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- limits and critiques ---------- */
function Limits() {
  const items: [string, string][] = [
    ['证据太薄', '情绪推测的概率是我们自己定的，没有一条被人工标注检验过；规则也只在一段约 35 秒的网络视频上跑过。这个项目能展示的是“没有验证时怎样负责任地做”：证据等级标在每一步，把握低就不说，主人能用视频自己核对。它不能展示“这个方法被证明有效”。'],
    ['评估只做到了前两层', '模型对不对（第一层）只有感知部分有验证集指标，行为判断没有标注；解释是否忠实（第二层）已经在部署系统上检验；主人是否看懂（第三层）还没有测。'],
    ['解释的对象偏窄', '本站的方法图鉴多面向表格和分类模型，这里解释的是关键点回归之上的规则。部署的系统属于“设计即可解释”的那一类，没有用 SHAP 或 LIME；第 1 步的遮挡分析只做了 1 张图、1 个点，只能算健全性检查。'],
    ['只在一个领域里演示过', '可迁移的是设计模式：替不会说话的对象向第三方解释时，（1）和它自己的平常比；（2）把可核对的依据放在结论旁；（3）把握不够就不下结论；（4）读者的纠正变成标签。这些模式在其他领域是否有效，需要另外的研究。'],
  ];
  return (
    <section className="cl-step" id="s9">
      <Head no="09" en="LIMITS" title="这个案例不能说明什么" desc="解释忠实于规则，不代表规则对这只猫的判断是对的。这只猫当时是被吓到的，不是在玩。" />
      <div className="cl-limits">
        {items.map(([t, b], i) => (<article key={t}><span className="num">{String(i + 1).padStart(2, '0')}</span><h3>{t}</h3><p>{b}</p></article>))}
      </div>
      <div className="editor-note">
        <span>数据说明 / DATA</span>
        <p>案例使用 YouTube 上的一段视频（<a href={'https://www.youtube.com/watch?v=' + VIDEO_ID} target="_blank" rel="noreferrer">“My cat thinks she’s home alone with a ghost – Part 2”，Kiki The Dream Cat ↗</a>），仅供课程学习。本页<b>没有复制这段视频</b>。顶部的播放器是 YouTube 官方嵌入，页面自己发布的内容是从视频里算出的<b>关键点和数字</b>。系统<b>不读猫的情绪</b>，它给出带把握程度的推测。完整的数学推导和可运行的代码，在我们的 <a href={COLAB_URL} target="_blank" rel="noreferrer">Colab 笔记 ↗</a>。</p>
      </div>
    </section>
  );
}
