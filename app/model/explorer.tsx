'use client';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { FEATURES, PRIOR, checkEvent, fin, run, type ClipData, type EventRec, type FeatureKey } from '../case/core';
import { COLAB_URL, LCOL, mmss } from '../case/vocab';
import { DERIV, WHOLE } from './derivations';
import { cueKeys, cueName, rp, useT } from './i18n';
import { useLang } from '../i18n';
import { ViewBaseline, ViewCheck, ViewDetect, ViewFeatures, GuessLab, ViewKeypoints, ViewRules, ViewSmooth, ViewVote, worked } from './model-lab';
import { DEFAULTS, STAGE_IDS, childrenOf, nodeById } from './nodes';
import { createScene, type SceneApi } from './scene';
import { HAND, ORIGIN, PARAMS, getStages, getSymbols, getUse } from './stages';
import { Tex } from './tex';
import { NODE_WHY, REFS, STAGE_REFS } from './refs';
import { KIND, LOGIC, UNSUP_NOTE, XAI } from './xai';

const COLORS = ['#6c9bff', '#4fd08c', '#ff7a7a', '#ffb84d'];
function Sources({ ids, title }: { ids: string[]; title: string }) {
  const { t, lang } = useT();
  return <div className="ex-refs"><b>{title}</b><ol>{ids.map((id) => { const r = REFS[id]; return <li key={id}><span>{r.cite}{r.verify ? <em className="v">{t('　⚠️ 引用前请核对卷号、页码', '  ⚠️ verify volume and pages before citing')}</em> : null}</span>{r.url ? <a href={r.url} target="_blank" rel="noreferrer">{t('打开 ↗', 'Open ↗')}</a> : null}<small>{r.use[lang]}</small></li>; })}</ol></div>;
}
type Tab = 'key' | 'explain' | 'derive' | 'numbers';

export function Explorer() {
  const [clip, setClip] = useState<ClipData | null>(null), [events, setEvents] = useState<EventRec[]>([]), [err, setErr] = useState('');
  useEffect(() => { Promise.all([fetch('/case/frames.json').then((r) => r.json()), fetch('/case/events.json').then((r) => r.json())]).then(([c, e]) => { setClip(c); setEvents(e); }).catch((x) => setErr(String(x))); }, []);
  const { t } = useT();
  return (
    <>
      {err ? <p className="ex-msg">{t('数据没有载入成功：', 'Data failed to load: ')}{err}</p> : !clip ? <p className="ex-msg">{t('正在载入……', 'Loading…')}</p> : <Inner clip={clip} events={events} />}
    </>
  );
}

function Inner({ clip, events }: { clip: ClipData; events: EventRec[] }) {
  const { t, lang } = useT();
  const n = clip.frames.length, host = useRef<HTMLDivElement>(null), api = useRef<SceneApi | null>(null);
  const [fi, setFi] = useState(() => Math.min(n - 1, Math.round(((events[0]?.start_s ?? 10) + 0.2) * clip.fps)));
  const [sel, setSel] = useState(0), [follow, setFollow] = useState(true), [playing, setPlaying] = useState(false), [speed, setSpeed] = useState(1);
  const [sheet, setSheet] = useState<null | 'two-d' | 'whole'>(null), [tab, setTab] = useState<Tab>('key');
  const [gl, setGl] = useState('ears_back'), [gc, setGc] = useState<string[]>(['moves_away']), [col, setCol] = useState(0);
  const [feat, setFeat] = useState<FeatureKey>('ear_height'), [calib, setCalib] = useState(clip.calib_frames), [ev, setEv] = useState(0), [prevO, setPrevO] = useState<string | null>(null);
  const { base, out } = useMemo(() => run(clip.frames, calib), [clip, calib]);
  const step = out[fi], f = clip.frames[fi];
  const stages = getStages(lang), symbols = getSymbols(lang);
  const kfi = useMemo(() => { let best = fi, d = 1e9; clip.frames.forEach((x, i) => { if (x.fp && Math.abs(i - fi) < d) { d = Math.abs(i - fi); best = i; } }); return best; }, [clip, fi]);
  const [detail, setDetail] = useState<{ l2: string | null; l3: string | null } | null>(null), [ps, setPs] = useState<Record<string, number>>({});
  const live = useRef({ fi, kfi, feat, sel, gl, gc, col, ps, detail }); live.current = { fi, kfi, feat, sel, gl, gc, col, ps, detail };

  useEffect(() => {
    const fmax = {} as Record<FeatureKey, number>;
    FEATURES.forEach((k, j) => { fmax[k] = Math.max(1e-6, ...clip.frames.map((x) => { const v = x.raw?.[j]; return fin(v) ? Math.abs(v) : 0; })); });
    const a = createScene(host.current!, { lang, base, clip, out, events, checks: events.map(checkEvent), fmax }, (i) => { setSel(i); setDetail(null); }, (c) => { setCol(c); setSel(7); setTab('numbers'); }, (id) => { const n = nodeById(id); if (!n) return; setSel(Math.max(0, STAGE_IDS.indexOf(n.stage))); setDetail(n.level === 3 ? { l2: n.parent, l3: n.id } : { l2: n.id, l3: null }); });
    api.current = a; const { detail: dt, ...st } = live.current; a.select(st.sel, !dt); a.update(st); a.setView(dt ? { stage: st.sel, ...dt } : null);
    return () => { a.dispose(); api.current = null; };
  }, [clip, out, events, lang, base]);
  useEffect(() => { api.current?.update({ fi, kfi, feat, gl, gc, col, ps }); }, [fi, kfi, feat, gl, gc, col, ps, out, lang]);
  useEffect(() => { const a = api.current; if (!a) return; a.select(sel, false); if (detail) a.setView({ stage: sel, ...detail }); else a.setView(null, follow); }, [sel, detail]);
  const seq = useMemo(() => childrenOf(STAGE_IDS[sel]).flatMap((n) => [n, ...childrenOf(n.id)]), [sel]);
  const curId = detail ? (detail.l3 ?? detail.l2) : null, seqIdx = seq.findIndex((n) => n.id === curId);
  const stepTo = (d: number) => { const n = seq[seqIdx + d]; if (n) setDetail(n.level === 3 ? { l2: n.parent, l3: n.id } : { l2: n.id, l3: null }); };
  const stepRef = useRef(stepTo); stepRef.current = stepTo;
  const enter = () => setDetail({ l2: childrenOf(STAGE_IDS[sel])[0]?.id ?? null, l3: null });
  const up = () => setDetail((d) => (d && d.l3 ? { l2: d.l2, l3: null } : d && d.l2 ? { l2: null, l3: null } : null));
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setFi((x) => (x + speed >= n ? 0 : x + speed)), 1000 / clip.fps);
    return () => clearInterval(id);
  }, [playing, speed, n, clip.fps]);
  useEffect(() => setPrevO(null), [fi]);
  const go = (d: number) => setSel((i) => Math.max(0, Math.min(stages.length - 1, i + d)));
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.target as HTMLElement)?.tagName === 'INPUT') return; const nav = (d: number) => (live.current.detail ? stepRef.current(d) : go(d)); if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nav(1); if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nav(-1); if (e.key === 'Escape') { if (live.current.detail) setDetail((d) => (d && d.l3 ? { l2: d.l2, l3: null } : d && d.l2 ? { l2: null, l3: null } : null)); else setSheet(null); } };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, []);

  const S = stages[sel], D = DERIV[S.id], prev = prevO ?? (fi > 0 ? out[fi - 1].label : 'resting');
  const [pv, pn] = PARAMS[lang][S.id];
  const views: Record<string, ReactNode> = {
    detect: <ViewDetect clip={clip} f={f} />, keypoints: <ViewKeypoints />, smooth: <ViewSmooth clip={clip} fi={fi} feat={feat} setFeat={setFeat} />,
    features: <ViewFeatures f={clip.frames[kfi]} fi={kfi} minConf={0.25} />, baseline: <ViewBaseline clip={clip} base={base} out={out} fi={fi} feat={feat} setFeat={setFeat} calib={calib} setCalib={setCalib} />,
    rules: <ViewRules step={step} prev={prev} setPrev={setPrevO} />, vote: <ViewVote out={out} fi={fi} fps={clip.fps} />, guess: <GuessLab label={gl} setLabel={setGl} cues={gc} setCues={setGc} col={col} setCol={setCol} events={events} />, check: <ViewCheck events={events} ev={ev} setEv={setEv} />,
  };
  const wk = worked(S.id, { base, step, f: clip.frames[kfi], fi, feat, minConf: 0.25, t, lang });
  const baselineTex = (() => {
    if (S.id !== 'baseline') return null;
    const j = FEATURES.indexOf(feat), x = f.sm?.[j], m = base.med[feat], s = base.scale[feat];
    return fin(x) && m !== undefined && s !== undefined ? String.raw`z=\frac{x-m}{s}=\frac{${x.toFixed(3)}-${m.toFixed(3)}}{${s.toFixed(3)}}=${((x - m) / s).toFixed(2)}` : null;
  })();
  const toTab = (x: Tab) => setTab(x);
  const tabs: [Tab, string][] = [['key', t('要点', 'Key points')], ['explain', t('讲解', 'Explain')], ['derive', t('推导', 'Derive')], ['numbers', t('代入数字', 'Numbers')]];
  return (
    <div className="ex">
      <div className="ex-scene">
        <div ref={host} className="ex-canvas" role="img" aria-label={t('系统的 3D 模型：九个步骤自下而上排成一摞，可拖动旋转、滚轮缩放、点击选择', 'The system as a 3D model: nine stages stacked bottom to top. Drag to rotate, scroll to zoom, click to select.')} />
        <nav className="ex-rail" aria-label={t('步骤', 'Stages')}>
          {stages.map((s, i) => <button key={s.id} aria-current={i === sel ? 'step' : undefined} onClick={() => { setSel(i); setDetail(null); }}><i>{s.no}</i><span>{s.name}</span></button>)}
        </nav>
        <div className="ex-top">
          <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? t('暂停', 'Pause') : t('播放', 'Play')}>{playing ? '❚❚' : '▶'}</button>
          <button onClick={() => setSpeed((s) => (s === 1 ? 3 : s === 3 ? 8 : 1))} aria-label={t('播放速度', 'Speed')}>{speed}×</button>
          <button className={follow ? 'on' : ''} aria-pressed={follow} onClick={() => setFollow((v) => !v)}>{t('跟随', 'Follow')}</button>
          <button onClick={() => api.current?.overview()}>{t('总览', 'Overview')}</button>
          <button onClick={() => setSheet('whole')}>{t('全模型', 'Whole model')}</button>
          <button onClick={() => setSheet('two-d')}>{t('2D 视图', '2D view')}</button>
        </div>
        <div className="ex-time">
          <input type="range" min={0} max={n - 1} value={fi} onChange={(e) => setFi(+e.target.value)} aria-label={t('视频里的时刻', 'Moment in the video')} />
          <span className="num">{mmss(f.t)}</span>
          <b style={{ background: LCOL[step.label] }}>{rp(lang, step.label)}</b>
        </div>
      </div>

      <aside className="ex-panel" aria-live="polite">
        {detail ? (() => {
          const cur = nodeById(detail.l3 ?? detail.l2 ?? ''), l2s = childrenOf(STAGE_IDS[sel]), p2 = detail.l2 ? nodeById(detail.l2) : null, kids = cur ? childrenOf(cur.id) : [];
          return <div className="ex-node">
            <nav className="ex-crumbs" aria-label={t('层级', 'Levels')}>
              <button onClick={() => setDetail(null)}>{t('总览', 'Overview')}</button><i>›</i>
              <button onClick={() => setDetail({ l2: null, l3: null })} aria-current={!cur ? 'true' : undefined}>{S.no} {S.name}</button>
              {p2 ? <><i>›</i><button onClick={() => setDetail({ l2: p2.id, l3: null })} aria-current={!detail.l3 ? 'true' : undefined}>{p2.title[lang]}</button></> : null}
              {detail.l3 && cur ? <><i>›</i><button aria-current="true">{cur.title[lang]}</button></> : null}
            </nav>
            <div className="ex-stepnav">
              <button onClick={() => stepTo(-1)} disabled={seqIdx <= 0}>{t('‹ 上一步', '‹ Previous')}</button>
              <span>{seqIdx >= 0 ? t(`第 ${seqIdx + 1} / ${seq.length} 步`, `Step ${seqIdx + 1} / ${seq.length}`) : t(`共 ${seq.length} 步`, `${seq.length} steps`)}</span>
              <button className="go" onClick={() => stepTo(1)} disabled={seqIdx >= seq.length - 1 && seqIdx >= 0}>{seqIdx < 0 ? t('从第一步开始 ›', 'Start at step 1 ›') : t('下一步 ›', 'Next ›')}</button>
            </div>
            <small className="ex-level">{cur ? (cur.level === 2 ? t('第二级：这一层里的部件', 'LEVEL 2: A PART INSIDE THE STAGE') : t('第三级：最小的一步', 'LEVEL 3: THE SMALLEST STEP')) : t('这一层拆开后的全部部件', 'ALL PARTS OF THIS STAGE')}</small>
            <h2>{cur ? cur.title[lang] : S.name}</h2>
            {cur ? <>
              <p className="ex-plain">{cur.plain[lang]}</p>
              {cur.stage === 'guess' ? <div className="ex-gpick">
                <small>{t('标签', 'LABEL')}</small><div>{Object.keys(PRIOR).map((k) => <button key={k} aria-pressed={gl === k} onClick={() => setGl(k)}>{rp(lang, k)}</button>)}</div>
                <small>{t('随后看到的线索（可多选）', 'CUES SEEN AFTERWARDS (ANY NUMBER)')}</small><div>{cueKeys.map((k) => <button key={k} aria-pressed={gc.includes(k)} onClick={() => setGc(gc.includes(k) ? gc.filter((y) => y !== k) : [...gc, k])}>{cueName(lang, k)}</button>)}</div>
              </div> : null}
              {cur.tex ? <div className="ex-tex"><Tex tex={cur.tex} /></div> : null}
              {NODE_WHY[cur.id] ? <div className="ex-why"><b>{t('这些数为什么这么给', 'Why these numbers')}</b><p>{NODE_WHY[cur.id].why[lang]}</p><p className="lim">{NODE_WHY[cur.id].limit[lang]}</p><Sources ids={NODE_WHY[cur.id].refs} title={t('依据', 'Sources')} /></div> : (STAGE_REFS[cur.stage] ? <details className="ex-refd"><summary>{t('这一层的引用与来源', 'References for this stage')}</summary><Sources ids={STAGE_REFS[cur.stage]} title="" /></details> : null)}
              {cur.controls?.length ? <div className="ex-ctls">{cur.controls.map((c) => <label key={c.key}><span>{c.label[lang]}</span><input type="range" min={c.min} max={c.max} step={c.step} value={ps[c.key] ?? DEFAULTS[c.key]} onChange={(e) => setPs({ ...ps, [c.key]: +e.target.value })} /><em className="num">{(ps[c.key] ?? DEFAULTS[c.key]).toFixed(2)}</em></label>)}</div> : null}
              {kids.length ? <div className="ex-kids"><small>{t('再往下拆', 'GO ONE LEVEL DEEPER')}</small>{kids.map((k) => <button key={k.id} onClick={() => setDetail({ l2: cur.id, l3: k.id })}>{k.title[lang]} ›</button>)}</div> : null}
              {cur.level === 3 ? <button className="ex-2d" onClick={up}>{t('‹ 回到上一级', '‹ Back up one level')}</button> : null}
            </> : <p className="ex-plain">{t('下面是这一层拆开后的部件，按顺序从左到右。点一个看它的讲解，3D 里的卡片也可以直接点。', 'These are the parts of the stage, in order from left to right. Pick one to read about it; you can also click the cards in 3D.')}</p>}
            <div className="ex-steps2"><small>{t('这一层的全部部件', 'ALL PARTS OF THIS STAGE')}</small>{l2s.map((n, i) => <button key={n.id} className={n.id === detail.l2 ? 'on' : ''} onClick={() => setDetail({ l2: n.id, l3: null })}><b>{i + 1}</b>{n.title[lang]}</button>)}</div>
            <button className="ex-2d" onClick={() => setDetail(null)}>{t('回到完整模型', 'Back to the whole model')}</button>
          </div>;
        })() : null}
        {detail ? null : <>
        <div className="ex-head">
          <div><small>{t('第', 'STAGE ')}{String(sel + 1).padStart(2, '0')}{t(' / ', ' / ')}{stages.length} · {S.en}</small><h2>{S.name}</h2></div>
          <div className="ex-pn"><button onClick={() => go(-1)} disabled={sel === 0} aria-label={t('上一层', 'Previous stage')}>‹</button><button onClick={() => go(1)} disabled={sel === stages.length - 1} aria-label={t('下一层', 'Next stage')}>›</button></div>
        </div>
        <div className="ex-tabs" role="tablist">
          {tabs.map(([k, name]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => toTab(k)}>{name}</button>)}
        </div>

        {tab === 'key' ? (() => { const X = XAI[S.id], K = KIND[X.kind]; return <div className="ex-key">
          <div className="ex-kind" style={{ borderColor: K.color }}><i style={{ background: K.color }} /><b style={{ color: K.color }}>{K.name[lang]}</b><span>{X.box === 'black' ? t('黑箱：内部不能直接读', 'Black box: the inside cannot be read') : t('白箱：每一步都能逐行核对', 'Glass box: every step can be checked line by line')}</span></div>
          <div className="ex-krow"><small>{t('这一步解决什么问题', 'THE PROBLEM IT SOLVES')}</small><p>{X.problem[lang]}</p></div>
          <div className="ex-krow hl"><small>{t('要点', 'THE POINT')}</small><p>{X.point[lang]}</p></div>
          <div className="ex-krow"><small>{t('学了什么、从哪学', 'WHAT IS LEARNED, FROM WHAT')}</small><p>{X.learned[lang]}</p></div>
          <table className="ex-tax"><tbody>
            <tr><th>{t('解释谁', 'Object')}</th><td>{X.object[lang]}</td></tr>
            <tr><th>{t('多大范围', 'Scope')}</th><td>{X.scope[lang]}</td></tr>
            <tr><th>{t('何时形成', 'Approach')}</th><td>{X.approach[lang]}</td></tr>
            <tr><th>{t('需要什么访问', 'Access')}</th><td>{X.access[lang]}</td></tr>
            <tr><th>{t('解释方法', 'Method')}</th><td>{X.method[lang]}</td></tr>
          </tbody></table>
          <div className="ex-krow"><small>{t('在哪里下判断', 'WHERE A JUDGEMENT IS MADE')}</small>
            {X.gates.length ? <ul className="ex-gates">{X.gates.map((g, i) => <li key={i}><b>◆ {g.rule[lang]}</b><span>{g.why[lang]}</span></li>)}</ul> : <p className="ex-none">{t('这一步不下判断，只做计算。', 'No judgement here, only computation.')}</p>}
          </div>
          <button className="ex-2d" onClick={() => setSheet('whole')}>{t('看整条链路的地图', 'See the map of the whole chain')}</button>
        </div>; })() : null}

        {tab === 'explain' ? <>
          {D.story ? <p className="ex-story"><b>{t('先看一个例子　', 'A quick example  ')}</b>{D.story[lang]}</p> : null}
          <p className="ex-text">{S.text}</p>
          {getUse(lang)[S.id] ? <div className="ex-use"><b>{t('在系统里怎么用', 'How the running system uses it')}</b><ol>{getUse(lang)[S.id].map((x, i) => <li key={i}>{x}</li>)}</ol></div> : null}
          <div className="ex-dims"><div><small>{t('输入', 'INPUT')}</small>{S.inDim}</div><div><small>{t('输出', 'OUTPUT')}</small>{S.outDim}</div></div>
          <div className="ex-params"><span>{t('参数', 'PARAMETERS')}</span><b>{pv}</b><em>{pn}</em></div>
          <p className="ex-origin"><i className={'dot ' + S.origin} />{ORIGIN[lang][S.origin][0]}. {S.params}</p>
          <button className="ex-2d" onClick={() => setSheet('two-d')}>{t('2D / 动手视图', '2D / hands-on view')}</button>
        </> : null}

        {tab === 'derive' ? <div className="ex-derive">
          {D.story ? <p className="ex-story">{D.story[lang]}</p> : null}
          <div className="ex-goal"><small>{t('要解决的问题', 'THE PROBLEM')}</small>{D.goal[lang]}</div>
          <div className="ex-formula-sum">{S.formula.map((l, i) => <div key={i} style={{ color: COLORS[i % 4] }}>{l}</div>)}</div>
          <ol className="ex-steps">
            {D.steps.map((st, i) => (
              <li key={i}>
                <p>{st.say[lang]}</p>
                <Tex tex={st.tex} />
                {st.note ? <p className="ex-note">{st.note[lang]}</p> : null}
              </li>
            ))}
          </ol>
          <p className="ex-therefore">{D.therefore[lang]}</p>
          <p className="ex-assume">{D.assume[lang]}</p>
          {D.source ? <div className="ex-source"><b>{D.source.title[lang]}</b><ul>{D.source.items.map((it, i) => <li key={i}>{it[lang]}</li>)}</ul></div> : null}
          <dl className="ex-sym">{symbols[S.id]?.map(([a, b]) => <div key={a}><dt>{a}</dt><dd>{b}</dd></div>)}</dl>
          {STAGE_REFS[S.id] ? <Sources ids={STAGE_REFS[S.id]} title={t('引用与来源', 'References and sources')} /> : null}
        </div> : null}

        {tab === 'numbers' ? <div className="ex-nums">
          <p className="ex-note">{t('下面用 3D 里正在显示的这一帧，把真实的数字代进公式。拖动底部的时间条，数字跟着变。', 'The numbers below come from the frame shown in 3D. Drag the time slider and they change.')}</p>
          {baselineTex ? <Tex tex={baselineTex} /> : null}
          {S.id === 'guess' ? <div className="cl-widget ex-light"><GuessLab label={gl} setLabel={setGl} cues={gc} setCues={setGc} col={col} setCol={setCol} events={events} /></div> : null}
          {wk ? <div className="ex-worked">{wk}</div> : null}
          {S.id === 'check' ? <div className="cl-widget ex-light">{views.check}</div> : null}
          {!wk && !baselineTex && S.id !== 'guess' && S.id !== 'check' ? <p className="ex-note">{t('这一层没有逐帧的数字代入。点“2D / 动手视图”拖动滑块来试。', 'This stage has no per-frame substitution. Open the 2D view and drag the sliders instead.')}</p> : null}
          <button className="ex-2d" onClick={() => setSheet('two-d')}>{t('2D / 动手视图', '2D / hands-on view')}</button>
        </div> : null}

        <button className="ex-dive" onClick={enter}>{t('拆开看这一层 ▸', 'Take this stage apart ▸')}<small>{t(`一步一步走过 ${seq.length} 个部件`, `Walk through ${seq.length} parts, one step at a time`)}</small></button>
        {sel === stages.length - 1 ? <p className="ex-foot">{t(`整个系统：3 个网络，${HAND} 个手设数字，其余是公式。系统不读猫的情绪，把握不够就不说。完整推导见 `, `The whole system: 3 networks, ${HAND} hand-set numbers, everything else is formula. It does not read the cat's emotions, and stays silent when unsure. Full derivations in `)}<a href={COLAB_URL} target="_blank" rel="noreferrer">Colab ↗</a></p> : null}
        </>}
      </aside>

      {sheet ? (
        <div className="ex-sheet" role="dialog" aria-modal="true" aria-label={sheet === 'whole' ? t('全模型', 'Whole model') : S.name} onClick={(e) => { if (e.target === e.currentTarget) setSheet(null); }}>
          <div className="ex-sheet-in">
            <div className="ex-sheet-h"><b>{sheet === 'whole' ? t('全模型：一个复合函数', 'The whole model: one composite function') : `${S.no} ${S.name} · ${t('2D / 动手视图', '2D / hands-on view')}`}</b><button onClick={() => setSheet(null)} aria-label={t('关闭', 'Close')}>×</button></div>
            <div className="ex-sheet-b">
              {sheet === 'two-d' ? <>
                <div className="ex-scrub"><label htmlFor="ex-t2">{t('换一个时刻', 'Change the moment')}</label><input id="ex-t2" type="range" min={0} max={n - 1} value={fi} onChange={(e) => setFi(+e.target.value)} /><span className="num">{mmss(f.t)}</span></div>
                <div className="cl-widget">{views[S.id]}</div>
              </> : <>
                <h3 className="ex-wh">{t('整条链路的逻辑', 'The logic of the chain')}</h3>
                <ol className="ex-logic">{LOGIC.map((l, i) => <li key={i}>{l[lang]}</li>)}</ol>
                <h3 className="ex-wh">{t('哪里是机器学习、无监督、算法、规则', 'Where machine learning, unsupervised, algorithms and rules are')}</h3>
                <table className="ex-map"><thead><tr><th>{t('层', 'Stage')}</th><th>{t('类型', 'Kind')}</th><th>{t('学了什么', 'Learned')}</th><th>{t('黑箱 / 白箱', 'Box')}</th><th>{t('判断点', 'Gates')}</th></tr></thead>
                  <tbody>{stages.map((s) => { const X = XAI[s.id], K = KIND[X.kind]; return <tr key={s.id}><td><b>{s.no}</b> {s.name}</td><td><span className="ex-pill" style={{ background: K.color }}>{K.short[lang]}</span></td><td>{X.learned[lang]}</td><td>{X.box === 'black' ? t('黑箱', 'Black') : t('白箱', 'Glass')}</td><td>{X.gates.length}</td></tr>; })}</tbody></table>
                <p className="ex-whole-foot">{UNSUP_NOTE[lang]}</p>
                <h3 className="ex-wh">{t('写成一个复合函数', 'As one composite function')}</h3>
                <p className="ex-whole-head">{WHOLE.head[lang]}</p>
                <table className="ex-whole"><tbody>{WHOLE.rows.map((r, i) => <tr key={i}><td className="no">{String(i + 1).padStart(2, '0')}</td><td><Tex tex={r.tex} /></td><td className="say">{r.say[lang]}</td></tr>)}</tbody></table>
                <p className="ex-whole-foot">{WHOLE.foot[lang]}</p>
              </>}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
