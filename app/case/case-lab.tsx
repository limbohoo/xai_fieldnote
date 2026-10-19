'use client';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Cite } from '../cite';
import {
  MODEL_ERROR, STATES, USED, Z, checkEvent, classify, fin, guess, run, zEvent,
  type Baseline, type Check, type ClipData, type EventRec, type FeatureKey, type Frame, type Reaction, type State, type Step, type ZMap,
} from './core';
import { Viewer, usePhotoAvailable, type Layers } from './viewer';

/* ---------- shared vocabulary ---------- */
const RPLAIN: Record<string, string> = {
  calibrating: '正在记下它平时的样子', unknown: '看不清', resting: '没有明显变化', active: '动起来了',
  alert: '注意到了什么', ears_back: '耳朵压低', freeze: '突然不动',
};
const LCOL: Record<string, string> = {
  resting: '#7d8ba3', active: '#234fe5', alert: '#c98a14', ears_back: '#d9622b', freeze: '#b02a37', unknown: '#a3abb8', calibrating: '#cdd3de',
};
const STATE_TEXT: Record<State, string> = { tense: '紧张 / 害怕', curious: '警惕 / 好奇', playful: '想玩 / 兴奋', attentive: '专注地听或看', calm: '放松' };
const CUES: [string, string][] = [
  ['moves_away', '随后离开或躲开'], ['flees', '随后快速跑开'], ['approaches', '随后靠近'], ['plays', '随后扑玩、追逐'],
  ['settles', '随后很快平静下来'], ['stays_still', '随后保持不动'], ['robot_before', '之前小车刚有动作'],
];
const TELL: Record<string, string> = {
  'tense|attentive': '随后躲起来更像紧张；随后去查看或继续原来的事，更像只是在专注听',
  'tense|playful': '随后逃开更像紧张；随后扑出去更像准备玩',
  'curious|tense': '随后靠近、嗅闻更像好奇；随后后退更像警惕或紧张',
  'playful|curious': '有扑、追的动作更像想玩；只是靠近看看更像好奇',
  'attentive|calm': '耳朵和头一直朝向某处更像专注；很快躺回去更像放松',
};
interface FeatInfo { k: FeatureKey; name: string; used: boolean; rel: string; def: string; gate: boolean; zthr: [number, string][] }
const FEAT: FeatInfo[] = [
  { k: 'ear_height', name: '耳朵高度', used: true, rel: '误差只有真实差异的 0.15，可以单独触发标签', def: '两个耳尖，比两眼连线的中点高多少，以两眼间距为单位。耳朵压低，数字变小。', gate: true, zthr: [[-1.5, '耳朵压低'], [1.5, '注意到了什么']] },
  { k: 'ear_angle', name: '耳朵外转', used: true, rel: '误差约为真实差异的一半，只作补充', def: '耳朵的轴线（耳根到耳尖）偏离“头顶方向”多少度，往外转为正。', gate: true, zthr: [[2.0, '补充：外转']] },
  { k: 'eye_aperture', name: '眼睛睁开', used: true, rel: '误差约为真实差异的 0.4，只作补充', def: '眼睛上下张开的距离 ÷ 眼睛的宽度，两只眼睛取平均。', gate: true, zthr: [[2.0, '补充：睁大']] },
  { k: 'muzzle_ratio', name: '口鼻宽度', used: false, rel: '误差约为真实差异的一半', def: '口鼻两侧点的距离 ÷ 两眼间距。', gate: true, zthr: [] },
  { k: 'head_drop', name: '头的高低', used: false, rel: '还没有在验证集上测过误差', def: '鼻子比肩胛低多少，以身长为单位（来自身体 20 点）。', gate: false, zthr: [] },
  { k: 'activity', name: '活动量', used: true, rel: '还没有在验证集上测过误差，用中位数并封顶', def: '关键点在约 0.5 秒里的移动速度，以“猫身长 / 秒”为单位，取各点的中位数，最高算 3。', gate: false, zthr: [[2.0, '动起来了'], [-1.0, '静止']] },
];
const FIDX = Object.fromEntries(FEAT.map((f, i) => [f.k, i])) as Record<FeatureKey, number>;
const DPLAIN: Partial<Record<FeatureKey, [string, string, string]>> = {
  ear_height: ['耳朵', '比它平时低', '比它平时竖得高'], ear_angle: ['耳朵', '比它平时更朝前', '比它平时更向外转'],
  eye_aperture: ['眼睛', '比它平时眯', '比它平时睁得大'], activity: ['身体', '比它平时安静', '比它平时动得多'],
};
const amount = (z: number) => (Math.abs(z) < 2 ? '有些' : Math.abs(z) < 3 ? '明显' : '很明显');
const driverText = (d: { feature: FeatureKey; z: number }) => { const p = DPLAIN[d.feature]!; return p[0] + (d.z < 0 ? p[1] : p[2]) + '（' + amount(d.z) + '）'; };
const VIDEO_ID = 'twzzFMcScww';
export const COLAB_URL = 'https://colab.research.google.com/drive/1e41NMDHYXqvHY0a6cdBD2_nSD2krZPar';
const mmss = (t: number) => String(Math.floor(t / 60)).padStart(2, '0') + ':' + (t % 60).toFixed(1).padStart(4, '0');
const fmt = (v: number | null | undefined, n = 2) => (fin(v) ? v.toFixed(n) : '—');

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
          <p>系统先给五种可能的状态一个“起点”（比如耳朵压低，起点偏向紧张），再让“它接下来 5 秒做了什么”一条一条去调整。选一个真实事件，再勾选或取消“随后发生的事”，看猜测怎么变。</p>
          <p><b>这些概率是我们按文献的方向自己定的，没有一条被标注数据检验过。</b>正因为它们决定了猜测，才要把“为什么”摆出来；把握不够时，系统<b>不给出情绪</b>。</p>
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
            <p className="cl-verdict">看起来像：{STATE_TEXT[g.top]}<span className="cl-pill">猜测 · 把握{g.band}</span></p>
            <p>也可能是：<b>{STATE_TEXT[g.second]}</b>{tell ? '。怎么分辨：' + tell : ''}</p>
          </> : <p className="cl-verdict">把握不够，<span style={{ color: '#a3abb8' }}>不给出情绪</span>，只写看到的行为。</p>}
          {decisive.map((c) => { const alt = guess(reaction, cues.filter((x) => x !== c), face)!; return <p key={c}>关键的一步：{cueName(c)}。如果没有这一步，{!alt.show ? '把握就不够，不会给出猜测。' : alt.top !== g.top ? `看起来更像“${STATE_TEXT[alt.top]}”。` : `把握会从“${g.band}”变为“${alt.band}”。`}</p>; })}
          {face < 0.3 && g.band !== '低' ? <p className="cl-note">脸大部分时间看不清，所以即使线索很强，把握也最多给“中”。</p> : null}
        </div>
      </div>
      <More title="展开：细节与验证 · Colab 理论版 §5.10–§5.12">
        <ul className="cl-list">
          <li><b>怎么调整（朴素贝叶斯）：</b>每看到一条新线索，就按“在每种状态下，这条线索有多常出现”，把五种状态的分数重新算一遍。算式是 <span className="cl-formula inline">P(状态 | 标签, 线索) ∝ P(状态 | 标签) × 每条线索 P(线索 | 状态) 相乘</span>“朴素”是指假设各条线索互不影响，这是一种简化；好处是每一步都能打印出来，也就是卡片上的“为什么这么猜”。这种<b>先得到人能读懂的中间结果，再由它得出结论</b>的结构，和“概念瓶颈模型”是同一类 <Cite ids={[10]} />。</li>
          <li><b>把握分三档：</b>设最高的概率为 p₁、第二高的为 p₂。p₁ ≥ 0.6 且比 p₂ 至少高 0.3，算“高”；p₁ ≥ 0.45 且至少高 0.15，算“中”；其余算“低”，不显示情绪。依据脸部的标签，在脸大部分时间（&gt; 70%）看不清时直接算“低”；任何猜测在脸看不清时最多给“中”。</li>
          <li><b>逃跑不是扑玩：</b>早先的版本只看“动得快不快”，受惊逃跑会被猜成“想玩，高把握”。现在“扑玩”要求同时不是在离开；又快又在离开，另算“快速跑开”，指向紧张。猫蹲低时在画面里会变小，现在也不再被当成“离开”。</li>
          <li><b>用标注来修正：</b>把我们手设的数字当作 10 条“虚拟标注”，真实标注一条条加进去：新概率 = (10 × 原来的概率 + 标注里的次数) ÷ (10 + 标注总数)（Dirichlet / Beta 伪计数）。3 条标注几乎改变不了结论，约 30 条之后，数据才开始占主导。要注意标注的人可能被系统的猜测带偏，所以要先看视频、写下自己的判断，再显示系统的猜测。</li>
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
            <thead><tr><th>#</th><th>标签</th><th>依据（主 / 补）</th><th>全部改回平时 →</th><th>没写的无影响</th><th>猜测能重现</th><th>结果</th></tr></thead>
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
          <li><b>五项检验：</b>能重现（用记录下来的数字重新跑一遍规则）；写出的就是原因（依据改回平时，标签变）；没有隐藏的原因（没写的改回平时，标签不变）；猜测能重现；另外逐条去掉后续线索，那些去掉后猜测或把握会变的，就写成“关键的一步”。前四项都通过，这个事件才算通过。</li>
          <li><b>它抓出了什么：</b>旧版卡片列的是“和 2 秒前相比”的变化，而标签是按“和它平时比”的偏离决定的。实际出现过：标题写“耳朵压低”，依据里只有“身体静下来了”。现在卡片、画面上的红圈，都只写判断真正依据的特征。</li>
          <li><b>为什么能检验得这么精确：</b>因为这个系统从一开始就设计成“能被读懂”的：点 → 几项数字 → 一条条规则。对看不透的黑盒模型，同样的问题只能近似回答，那正是 SHAP、LIME 这类方法的用武之地；这里我们没有用到它们。</li>
          <li><b>它不能说明什么：</b>解释和规则一致，不代表规则对猫的判断是对的。判断对不对，要靠人工标注（第一层）；主人有没有看懂，要靠用户研究（第三层）。这两项我们都还没有做完。</li>
        </ul>
      </More>
    </section>
  );
}

/* ---------- main ---------- */
export function CaseLab() {
  const [clip, setClip] = useState<ClipData | null>(null);
  const [events, setEvents] = useState<EventRec[]>([]);
  const [err, setErr] = useState('');
  useEffect(() => {
    Promise.all([fetch('/case/frames.json').then((r) => r.json()), fetch('/case/events.json').then((r) => r.json())])
      .then(([c, e]) => { setClip(c); setEvents(e); }).catch((x) => setErr(String(x)));
  }, []);
  if (err) return <p className="cl-warn">数据没有载入成功：{err}</p>;
  if (!clip) return <p className="cl-loading">正在载入这段视频的数据……</p>;
  return <Lab clip={clip} events={events} />;
}

function Lab({ clip, events }: { clip: ClipData; events: EventRec[] }) {
  const kp = useMemo(() => clip.frames.map((f, i) => (f.kp ? i : -1)).filter((i) => i >= 0), [clip]);
  const [s, setS] = useState(0);
  const [calib, setCalib] = useState(clip.calib_frames);
  const [feat, setFeat] = useState<FeatureKey>('ear_height');
  const [minConf, setMinConf] = useState(0.25);
  const [layers, setLayers] = useState<Layers>({ box: true, face: true, body: true, basis: true });
  const [ev, setEv] = useState(0);
  const [geo, setGeo] = useState(false);
  const [wantPhoto, setWantPhoto] = useState(true);
  const [showVideo, setShowVideo] = useState(false);
  const [videoStart, setVideoStart] = useState(0); // fixed when the player opens; a moving src would reload it
  const [videoState, setVideoState] = useState<'idle' | 'playing'>('idle');
  const iframe = useRef<HTMLIFrameElement>(null);
  const fromVideo = useRef(false);
  const lastSeek = useRef(0);
  const ytReady = useRef(false);
  const ytLastTime = useRef(-1);
  const ytState = useRef<number | undefined>(undefined);
  const photoOk = usePhotoAvailable();
  const { base, out } = useMemo(() => run(clip.frames, calib), [clip, calib]);
  const fi = kp[s], frame = clip.frames[fi], step = out[fi];
  // The original video is embedded from YouTube (not copied); the page keeps it in step with the scrubber.
  const yt = (func: string, args: unknown[] = []) => iframe.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
  const seekVideo = (t: number) => {
    if (!showVideo) return;
    const now = Date.now();
    if (now - lastSeek.current < 120) return;
    lastSeek.current = now;
    yt('seekTo', [t, true]); yt('pauseVideo');
  };
  const s2 = useRef<HTMLDivElement>(null);
  const vref = useRef<HTMLDivElement>(null);

  const scrubTo = (q: number) => { setS(q); seekVideo(clip.frames[kp[q]].t); };
  const pickEvent = (i: number) => {
    setEv(i);
    const e = events[i];
    let best = -1;
    for (let q = 0; q < kp.length; q++) { const f = clip.frames[kp[q]]; if (f.t >= e.start_s - 0.2 && f.t <= e.start_s + 1.2 && out[kp[q]].label === e.reaction) { best = q; break; } }
    if (best < 0) for (let q = 0; q < kp.length; q++) if (clip.frames[kp[q]].t >= e.start_s) { best = q; break; }
    setS(Math.max(best, 0));
    seekVideo(clip.frames[kp[Math.max(best, 0)]].t);
  };
  useEffect(() => { pickEvent(0); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  // listen to the embedded player: while it plays, the scrubber follows it
  useEffect(() => {
    if (!showVideo) return;
    const onMsg = (e: MessageEvent) => {
      if (!/youtube(-nocookie)?\.com$/.test(new URL(e.origin).hostname)) return;
      let d: { event?: string; info?: { currentTime?: number; playerState?: number } };
      try { d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
      ytReady.current = true;
      if (d.event !== 'infoDelivery' || !d.info) return;
      if (d.info.playerState !== undefined) { ytState.current = d.info.playerState; setVideoState(d.info.playerState === 1 ? 'playing' : 'idle'); }
      // the player only repeats its state when it changes, so also follow a clock that is moving
      const t0 = d.info.currentTime;
      const moving = typeof t0 === 'number' && ytLastTime.current >= 0 && Math.abs(t0 - ytLastTime.current) > 0.02;
      if (typeof t0 === 'number') ytLastTime.current = t0;
      if (typeof t0 === 'number' && (ytState.current === 1 || (ytState.current === undefined && moving))) {
        const t = t0;
        let q = kp.length - 1;
        for (let i = 0; i < kp.length; i++) if (clip.frames[kp[i]].t >= t) { q = i; break; }
        fromVideo.current = true; setS(q);
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [showVideo, kp, clip]);
  // keep the viewer under the top bar (which wraps and grows on phones) and leave room for it when jumping to a step
  useEffect(() => {
    const measure = () => {
      const top = document.querySelector('.topbar')?.getBoundingClientRect().height ?? 88;
      const vh = vref.current?.getBoundingClientRect().height ?? 240;
      const root = document.documentElement.style;
      root.setProperty('--cl-top', `${Math.round(top)}px`);
      root.setProperty('--cl-pad', `${Math.round(top + vh + 18)}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (vref.current) ro.observe(vref.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, []);
  useEffect(() => {
    const el = s2.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((es) => es.forEach((x) => setGeo(x.isIntersecting)), { rootMargin: '-340px 0px -30% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // label timeline
  const runs: [number, number, string][] = [];
  { let st = 0; for (let i = 1; i <= out.length; i++) if (i === out.length || out[i].label !== out[st].label) { runs.push([st, i, out[st].label]); st = i; } }
  const L: L = { clip, events, kp, s, step, frame, fi, base, out, calib, setCalib, feat, setFeat, minConf, setMinConf, ev, pickEvent };
  const basisText = step.calibrating ? `视频开头先用 ${calib} 帧记下这只猫平时的样子，这段时间不下判断。`
    : step.drivers.length ? [...new Map(step.drivers.map((d) => [d.feature, d])).values()].map(driverText).join('；')
      : step.label === 'resting' ? '所有特征都在它平时的范围里。' : step.label === 'unknown' ? '脸和身体都没有可靠的关键点。' : '';
  const total = clip.frames[clip.frames.length - 1].t;
  return (
    <>
      <div className="cl-viewer" ref={vref}><div className="cl-viewer-in">
        <div className={'cl-vgrid' + (showVideo ? ' with-video' : '')}>
          {showVideo ? (
            <div className="cl-cvwrap cl-video">
              <iframe ref={iframe} title="原视频（YouTube）" src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?enablejsapi=1&playsinline=1&rel=0&start=${videoStart}`}
                allow="encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen
                onLoad={() => {
                  // the player's script starts after the frame loads: repeat the handshake until it answers
                  ytReady.current = false; ytLastTime.current = -1; ytState.current = undefined;
                  let tries = 0;
                  const id = window.setInterval(() => {
                    if (ytReady.current || ++tries > 20) { window.clearInterval(id); return; }
                    iframe.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*');
                  }, 400);
                }} />
            </div>
          ) : null}
          <div className="cl-cvwrap"><Viewer fi={fi} frame={frame} step={step} size={clip.size} layers={layers} minConf={minConf} geoFeature={geo ? feat : null} usePhoto={photoOk && wantPhoto} /></div>
          <div className="cl-vinfo">
            <span className="cl-chip" style={{ background: LCOL[step.calibrating ? 'calibrating' : step.label] }}>{step.calibrating ? '正在记平时' : RPLAIN[step.label]}</span>
            <p className="cl-basis">{step.drivers.length && !step.calibrating ? <b>依据：</b> : null}{basisText}</p>
            <p className="cl-small">{mmss(frame.t)} / {mmss(total)}{frame.pose ? ' · 脸部特征已暂停：' + (frame.pose.includes('sideways') ? '头转开了' : '头抬起或低下了') : ''}</p>
            <div className="cl-layers" role="group" aria-label="画面上显示什么">
              {([['box', '猫的框'], ['face', '脸 48 点'], ['body', '身体 20 点'], ['basis', '判断依据（红圈）']] as const).map(([k, n]) =>
                <label key={k}><input type="checkbox" checked={layers[k]} onChange={(e) => setLayers({ ...layers, [k]: e.target.checked })} />{n}</label>)}
              <label><input type="checkbox" checked={showVideo} onChange={(e) => { if (e.target.checked) setVideoStart(Math.floor(frame.t)); setShowVideo(e.target.checked); setVideoState('idle'); }} />同时看原视频（YouTube）</label>
              {photoOk ? <label><input type="checkbox" checked={wantPhoto} onChange={(e) => setWantPhoto(e.target.checked)} />真实画面（仅本地）</label> : null}
            </div>
          </div>
        </div>
        <div className="cl-scrub">
          <svg className="cl-tl" viewBox="0 0 1000 14" preserveAspectRatio="none" role="img" aria-label="整段视频里每一时刻的行为标签">
            {runs.map(([a, b, k]) => <rect key={a} x={(a / out.length) * 1000} width={((b - a) / out.length) * 1000 + 0.5} height={14} fill={LCOL[k]} />)}
            <rect x={Math.max(0, (fi / out.length) * 1000 - 1.5)} width={3} height={14} fill="#fff" stroke="#000" strokeWidth={0.6} />
          </svg>
          <input type="range" min={0} max={kp.length - 1} value={s} onChange={(e) => scrubTo(+e.target.value)} aria-label="视频进度" />
        </div>
        <nav className="cl-nav" aria-label="步骤">
          {[['s1', '1 找到猫'], ['s2', '2 量特征'], ['s3', '3 和自己比'], ['s4', '4 规则'], ['s5', '5 之后发生了什么'], ['s6', '6 解释是真的吗'], ['s7', '局限']].map(([id, n]) => <a key={id} href={'#' + id}>{n}</a>)}
        </nav>
      </div></div>
      <div ref={s2}><Step1 L={L} /></div>
      <Step2 L={L} />
      <Step3 L={L} />
      <Step4 L={L} />
      <Step5 L={L} />
      <Step6 L={L} />
      <Limits />
    </>
  );
}

/* ---------- limits and critiques ---------- */
function Limits() {
  const items: [string, string][] = [
    ['证据太薄', '情绪猜测的概率是我们自己定的，没有一条被人工标注检验过；规则也只在一段约 35 秒的网络视频上跑过。这个项目能展示的是“没有验证时怎样负责任地做”：证据等级标在每一步，把握低就不说，主人能用视频自己核对。它不能展示“这个方法被证明有效”。'],
    ['评估只做到了前两层', '模型对不对（第一层）只有感知部分有验证集指标，行为判断没有标注；解释是否忠实（第二层）已经在部署系统上检验；主人是否看懂（第三层）还没有测。'],
    ['解释的对象偏窄', '本站的方法图鉴多面向表格和分类模型，这里解释的是关键点回归之上的规则。部署的系统属于“设计即可解释”的那一类，没有用 SHAP 或 LIME；第 1 步的遮挡分析只做了 1 张图、1 个点，只能算健全性检查。'],
    ['只在一个领域里演示过', '可迁移的是设计模式：替不会说话的对象向第三方解释时，（1）和它自己的平常比；（2）把可核对的依据放在结论旁；（3）把握不够就不下结论；（4）读者的纠正变成标签。这些模式在其他领域是否有效，需要另外的研究。'],
  ];
  return (
    <section className="cl-step" id="s7">
      <Head no="07" en="LIMITS" title="这个案例不能说明什么" desc="解释忠实于规则，不代表规则对这只猫的判断是对的。这只猫当时是被吓到的，不是在玩。" />
      <div className="cl-limits">
        {items.map(([t, b], i) => (<article key={t}><span className="num">{String(i + 1).padStart(2, '0')}</span><h3>{t}</h3><p>{b}</p></article>))}
      </div>
      <div className="editor-note">
        <span>数据说明 / DATA</span>
        <p>案例使用 YouTube 上的一段视频（<a href={'https://www.youtube.com/watch?v=' + VIDEO_ID} target="_blank" rel="noreferrer">“My cat thinks she’s home alone with a ghost – Part 2”，Kiki The Dream Cat ↗</a>），仅供课程学习。本页<b>没有复制这段视频</b>：页面顶部的“同时看原视频”是 YouTube 官方的嵌入播放器，点开才会加载；页面自己发布的，只有从视频里算出的<b>关键点和数字</b>。系统<b>不会“读出猫的情绪”</b>，它给出的是带把握程度的猜测。完整的数学推导和可运行的代码，在我们的 <a href={COLAB_URL} target="_blank" rel="noreferrer">Colab 笔记 ↗</a>。</p>
      </div>
    </section>
  );
}
