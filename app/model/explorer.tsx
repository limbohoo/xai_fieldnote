'use client';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { FEATURES, checkEvent, fin, run, type ClipData, type EventRec, type FeatureKey } from '../case/core';
import { COLAB_URL, LCOL, mmss } from '../case/vocab';
import { DERIV, WHOLE } from './derivations';
import { LangCtx, makeT, rp, useT, type Lang } from './i18n';
import { ViewBaseline, ViewCheck, ViewDetect, ViewFeatures, GuessLab, ViewKeypoints, ViewRules, ViewSmooth, ViewVote, worked } from './model-lab';
import { createScene, type SceneApi } from './scene';
import { HAND, ORIGIN, PARAMS, getStages, getSymbols } from './stages';
import { Tex } from './tex';

const COLORS = ['#6c9bff', '#4fd08c', '#ff7a7a', '#ffb84d'];
type Tab = 'explain' | 'derive' | 'numbers';

function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLang] = useState<Lang>('zh');
  useEffect(() => {
    try { const s = localStorage.getItem('catpose-model-lang'); if (s === 'en' || s === 'zh') { setLang(s); return; } } catch { /* storage may be blocked */ }
    if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('en')) setLang('en');
  }, []);
  useEffect(() => { try { localStorage.setItem('catpose-model-lang', lang); } catch { /* ignore */ } document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN'; }, [lang]);
  return [lang, setLang];
}

export function Explorer() {
  const [lang, setLang] = useLang();
  const [clip, setClip] = useState<ClipData | null>(null), [events, setEvents] = useState<EventRec[]>([]), [err, setErr] = useState('');
  useEffect(() => { Promise.all([fetch('/case/frames.json').then((r) => r.json()), fetch('/case/events.json').then((r) => r.json())]).then(([c, e]) => { setClip(c); setEvents(e); }).catch((x) => setErr(String(x))); }, []);
  const ctx = useMemo(() => ({ lang, t: makeT(lang) }), [lang]);
  return (
    <LangCtx.Provider value={ctx}>
      {err ? <p className="ex-msg">{ctx.t('数据没有载入成功：', 'Data failed to load: ')}{err}</p> : !clip ? <p className="ex-msg">{ctx.t('正在载入……', 'Loading…')}</p> : <Inner clip={clip} events={events} setLang={setLang} />}
    </LangCtx.Provider>
  );
}

function Inner({ clip, events, setLang }: { clip: ClipData; events: EventRec[]; setLang: (l: Lang) => void }) {
  const { t, lang } = useT();
  const n = clip.frames.length, host = useRef<HTMLDivElement>(null), api = useRef<SceneApi | null>(null);
  const [fi, setFi] = useState(() => Math.min(n - 1, Math.round(((events[0]?.start_s ?? 10) + 0.2) * clip.fps)));
  const [sel, setSel] = useState(0), [follow, setFollow] = useState(true), [playing, setPlaying] = useState(false), [speed, setSpeed] = useState(1);
  const [sheet, setSheet] = useState<null | 'two-d' | 'whole'>(null), [tab, setTab] = useState<Tab>('explain');
  const [gl, setGl] = useState('ears_back'), [gc, setGc] = useState<string[]>(['moves_away']), [col, setCol] = useState(0);
  const [feat, setFeat] = useState<FeatureKey>('ear_height'), [calib, setCalib] = useState(clip.calib_frames), [ev, setEv] = useState(0), [prevO, setPrevO] = useState<string | null>(null);
  const { base, out } = useMemo(() => run(clip.frames, calib), [clip, calib]);
  const step = out[fi], f = clip.frames[fi];
  const stages = getStages(lang), symbols = getSymbols(lang);
  const kfi = useMemo(() => { let best = fi, d = 1e9; clip.frames.forEach((x, i) => { if (x.fp && Math.abs(i - fi) < d) { d = Math.abs(i - fi); best = i; } }); return best; }, [clip, fi]);
  const live = useRef({ fi, kfi, feat, sel, gl, gc, col }); live.current = { fi, kfi, feat, sel, gl, gc, col };

  useEffect(() => {
    const fmax = {} as Record<FeatureKey, number>;
    FEATURES.forEach((k, j) => { fmax[k] = Math.max(1e-6, ...clip.frames.map((x) => { const v = x.raw?.[j]; return fin(v) ? Math.abs(v) : 0; })); });
    const a = createScene(host.current!, { lang, clip, out, events, checks: events.map(checkEvent), fmax }, (i) => setSel(i), (c) => { setCol(c); setSel(7); setTab('numbers'); });
    api.current = a; a.select(live.current.sel, true); a.update({ ...live.current });
    return () => { a.dispose(); api.current = null; };
  }, [clip, out, events, lang]);
  useEffect(() => { api.current?.update({ fi, kfi, feat, gl, gc, col }); }, [fi, kfi, feat, gl, gc, col, out, lang]);
  useEffect(() => { api.current?.select(sel, follow); }, [sel]);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setFi((x) => (x + speed >= n ? 0 : x + speed)), 1000 / clip.fps);
    return () => clearInterval(id);
  }, [playing, speed, n, clip.fps]);
  useEffect(() => setPrevO(null), [fi]);
  const go = (d: number) => setSel((i) => Math.max(0, Math.min(stages.length - 1, i + d)));
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.target as HTMLElement)?.tagName === 'INPUT') return; if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(1); if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') go(-1); if (e.key === 'Escape') setSheet(null); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, []);

  const S = stages[sel], D = DERIV[S.id], prev = prevO ?? (fi > 0 ? out[fi - 1].label : 'resting');
  const [pv, pn] = PARAMS[lang][S.id];
  const views: Record<string, ReactNode> = {
    detect: <ViewDetect clip={clip} f={f} />, keypoints: <ViewKeypoints />, smooth: <ViewSmooth clip={clip} fi={fi} feat={feat} setFeat={setFeat} />,
    features: <ViewFeatures f={clip.frames[kfi]} fi={kfi} minConf={0.25} />, baseline: <ViewBaseline clip={clip} base={base} out={out} fi={fi} feat={feat} setFeat={setFeat} calib={calib} setCalib={setCalib} />,
    rules: <ViewRules step={step} prev={prev} setPrev={setPrevO} />, vote: <ViewVote out={out} fi={fi} fps={clip.fps} />, guess: <GuessLab label={gl} setLabel={setGl} cues={gc} setCues={setGc} col={col} setCol={setCol} />, check: <ViewCheck events={events} ev={ev} setEv={setEv} />,
  };
  const wk = worked(S.id, { base, step, f: clip.frames[kfi], fi, feat, minConf: 0.25, t, lang });
  const baselineTex = (() => {
    if (S.id !== 'baseline') return null;
    const j = FEATURES.indexOf(feat), x = f.sm?.[j], m = base.med[feat], s = base.scale[feat];
    return fin(x) && m !== undefined && s !== undefined ? String.raw`z=\frac{x-m}{s}=\frac{${x.toFixed(3)}-${m.toFixed(3)}}{${s.toFixed(3)}}=${((x - m) / s).toFixed(2)}` : null;
  })();
  const toTab = (x: Tab) => setTab(x);
  const tabs: [Tab, string][] = [['explain', t('讲解', 'Explain')], ['derive', t('推导', 'Derive')], ['numbers', t('代入数字', 'Numbers')]];
  return (
    <div className="ex">
      <div className="ex-scene">
        <div ref={host} className="ex-canvas" role="img" aria-label={t('系统的 3D 模型：九个步骤自下而上排成一摞，可拖动旋转、滚轮缩放、点击选择', 'The system as a 3D model: nine stages stacked bottom to top. Drag to rotate, scroll to zoom, click to select.')} />
        <nav className="ex-rail" aria-label={t('步骤', 'Stages')}>
          {stages.map((s, i) => <button key={s.id} aria-current={i === sel ? 'step' : undefined} onClick={() => setSel(i)}><i>{s.no}</i><span>{s.name}</span></button>)}
        </nav>
        <div className="ex-top">
          <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? t('暂停', 'Pause') : t('播放', 'Play')}>{playing ? '❚❚' : '▶'}</button>
          <button onClick={() => setSpeed((s) => (s === 1 ? 3 : s === 3 ? 8 : 1))} aria-label={t('播放速度', 'Speed')}>{speed}×</button>
          <button className={follow ? 'on' : ''} aria-pressed={follow} onClick={() => setFollow((v) => !v)}>{t('跟随', 'Follow')}</button>
          <button onClick={() => api.current?.overview()}>{t('总览', 'Overview')}</button>
          <button onClick={() => setSheet('whole')}>{t('全模型', 'Whole model')}</button>
          <button onClick={() => setSheet('two-d')}>{t('2D 视图', '2D view')}</button>
          <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} aria-label="Language">{lang === 'zh' ? 'EN' : '中文'}</button>
        </div>
        <div className="ex-time">
          <input type="range" min={0} max={n - 1} value={fi} onChange={(e) => setFi(+e.target.value)} aria-label={t('视频里的时刻', 'Moment in the video')} />
          <span className="num">{mmss(f.t)}</span>
          <b style={{ background: LCOL[step.label] }}>{rp(lang, step.label)}</b>
        </div>
      </div>

      <aside className="ex-panel" aria-live="polite">
        <div className="ex-head">
          <div><small>{t('第', 'STAGE ')}{String(sel + 1).padStart(2, '0')}{t(' / ', ' / ')}{stages.length} · {S.en}</small><h2>{S.name}</h2></div>
          <div className="ex-pn"><button onClick={() => go(-1)} disabled={sel === 0} aria-label={t('上一层', 'Previous stage')}>‹</button><button onClick={() => go(1)} disabled={sel === stages.length - 1} aria-label={t('下一层', 'Next stage')}>›</button></div>
        </div>
        <div className="ex-tabs" role="tablist">
          {tabs.map(([k, name]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => toTab(k)}>{name}</button>)}
        </div>

        {tab === 'explain' ? <>
          {D.story ? <p className="ex-story"><b>{t('先看一个例子　', 'A quick example  ')}</b>{D.story[lang]}</p> : null}
          <p className="ex-text">{S.text}</p>
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
          <dl className="ex-sym">{symbols[S.id]?.map(([a, b]) => <div key={a}><dt>{a}</dt><dd>{b}</dd></div>)}</dl>
        </div> : null}

        {tab === 'numbers' ? <div className="ex-nums">
          <p className="ex-note">{t('下面用 3D 里正在显示的这一帧，把真实的数字代进公式。拖动底部的时间条，数字跟着变。', 'The numbers below come from the frame shown in 3D. Drag the time slider and they change.')}</p>
          {baselineTex ? <Tex tex={baselineTex} /> : null}
          {S.id === 'guess' ? <div className="cl-widget ex-light"><GuessLab label={gl} setLabel={setGl} cues={gc} setCues={setGc} col={col} setCol={setCol} /></div> : null}
          {wk ? <div className="ex-worked">{wk}</div> : null}
          {S.id === 'check' ? <div className="cl-widget ex-light">{views.check}</div> : null}
          {!wk && !baselineTex && S.id !== 'guess' && S.id !== 'check' ? <p className="ex-note">{t('这一层没有逐帧的数字代入。点“2D / 动手视图”拖动滑块来试。', 'This stage has no per-frame substitution. Open the 2D view and drag the sliders instead.')}</p> : null}
          <button className="ex-2d" onClick={() => setSheet('two-d')}>{t('2D / 动手视图', '2D / hands-on view')}</button>
        </div> : null}

        {sel === stages.length - 1 ? <p className="ex-foot">{t(`整个系统：3 个网络，${HAND} 个手设数字，其余是公式。系统不读猫的情绪，把握不够就不说。完整推导见 `, `The whole system: 3 networks, ${HAND} hand-set numbers, everything else is formula. It does not read the cat's emotions, and stays silent when unsure. Full derivations in `)}<a href={COLAB_URL} target="_blank" rel="noreferrer">Colab ↗</a></p> : null}
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
