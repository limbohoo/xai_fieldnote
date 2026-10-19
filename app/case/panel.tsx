'use client';
import type { RefObject } from 'react';
import { fin, type ClipData, type FeatureKey, type Frame, type Step } from './core';
import { LCOL, mmss, useVocab, FIDX, type Vocab } from './vocab';
import { Viewer, type Layers } from './viewer';
import { CatMap } from './catmap';

/* The live demo panel: original video, live keypoints, and the measurements as gauges that move with every frame. */

const RANGE = 3.5; // gauges show z from -3.5 to +3.5
interface Zone { from: number; to: number; color: string; label: (V: Vocab) => string }
const ZONES: Partial<Record<FeatureKey, Zone[]>> = {
  ear_height: [
    { from: -RANGE, to: -1.5, color: 'rgba(255,159,90,.75)', label: (V) => V.t('耳朵压低', 'Ears back') },
    { from: 1.5, to: RANGE, color: 'rgba(255,209,102,.75)', label: (V) => V.t('注意到了什么', 'Noticed something') },
  ],
  activity: [
    { from: -RANGE, to: -1, color: 'rgba(200,210,227,.7)', label: (V) => V.t('静止', 'Still') },
    { from: 2, to: RANGE, color: 'rgba(159,208,255,.85)', label: (V) => V.t('动起来', 'Moving') },
  ],
  ear_angle: [{ from: 2, to: RANGE, color: 'rgba(255,159,90,.55)', label: (V) => V.t('外转（补充）', 'turned out (supporting)') }],
  eye_aperture: [{ from: 2, to: RANGE, color: 'rgba(255,209,102,.55)', label: (V) => V.t('睁大（补充）', 'wide open (supporting)') }],
};
const pct = (z: number) => ((Math.max(-RANGE, Math.min(RANGE, z)) + RANGE) / (2 * RANGE)) * 100;

function zPhrase(V: Vocab, k: FeatureKey, z: number): string {
  if (Math.abs(z) < 1) return V.t('在它平时的范围里', 'within its usual range');
  const d = V.DPLAIN[k]!;
  return (z < 0 ? d[1] : d[2]) + ' · ' + V.amount(z);
}

export function Gauge({ k, z, big, note }: { k: FeatureKey; z: number | undefined; big: boolean; note: string }) {
  const V = useVocab();
  const f = V.FEAT[FIDX[k]];
  const ok = fin(z);
  const zones = ZONES[k] ?? [];
  const fired = ok ? zones.find((q) => (z as number) >= q.from && (z as number) <= q.to) : undefined;
  return (
    <div className={'cl-g' + (big ? ' big' : '') + (fired ? ' fired' : '') + (ok ? '' : ' off')}>
      <div className="cl-g-top">
        <span className="cl-g-name">{f.name}{big ? null : <small>{V.t('补充', 'supporting')}</small>}</span>
        <span className="cl-g-val num">{ok ? ((z as number) > 0 ? '+' : (z as number) < 0 ? '−' : '') + Math.abs(z as number).toFixed(1) : '—'}</span>
      </div>
      <div className="cl-g-track" role="img" aria-label={ok ? `${f.name} ${(z as number).toFixed(1)}` : `${f.name}: ${V.t('这一帧量不出来', 'cannot measure this frame')}`}>
        {zones.map((q) => <span key={q.from} className="cl-g-zone" style={{ left: pct(q.from) + '%', width: pct(q.to) - pct(q.from) + '%', background: q.color }} />)}
        <span className="cl-g-mid" />
        {ok ? <span className="cl-g-dot" style={{ left: pct(z as number) + '%' }} /> : null}
      </div>
      <div className="cl-g-scale">
        {zones.map((q) => <span key={q.from} style={{ left: (pct(q.from) + pct(q.to)) / 2 + '%' }}>{q.label(V)}</span>)}
        <span className="mid" style={{ left: '50%' }}>{V.t('平时', 'usual')}</span>
      </div>
      <p className="cl-g-note">{ok ? (fired ? <b>{V.t('触发：', 'Triggered: ')}{fired.label(V)} · </b> : null) : null}{ok ? zPhrase(V, k, z as number) : note}</p>
    </div>
  );
}

function offReason(V: Vocab, k: FeatureKey, f: Frame, calibrating: boolean): string {
  if (calibrating) return V.t('正在记平时，先不下判断', 'Still learning usual; no judgement yet');
  if (!f.sm) return V.t('这一帧没有找到猫', 'No cat found on this frame');
  const info = V.FEAT[FIDX[k]];
  if (info.gate && f.pose) return f.pose.includes('sideways') ? V.t('已暂停：头转开了', 'Paused: head turned away') : V.t('已暂停：头抬起或低下了', 'Paused: head lifted or lowered');
  return V.t('这一帧量不出来', 'cannot measure this frame');
}

export function Panel({ clip, out, fi, kpFrame, kpStep, layers, setLayers, minConf, geoFeature, usePhoto, photoOk, wantPhoto, setWantPhoto,
  showVideo, setShowVideo, iframeRef, videoStart, onIframeLoad, playing, onPlayPause, onScrub, syncing, runs, calib, panelRef, kpFi }: {
  clip: ClipData; out: Step[]; fi: number; kpFrame: Frame; kpStep: Step; kpFi: number; layers: Layers; setLayers: (l: Layers) => void; minConf: number;
  geoFeature: FeatureKey | null; usePhoto: boolean; photoOk: boolean; wantPhoto: boolean; setWantPhoto: (v: boolean) => void;
  showVideo: boolean; setShowVideo: (v: boolean) => void; iframeRef: RefObject<HTMLIFrameElement | null>; videoStart: number; onIframeLoad: () => void;
  playing: boolean; onPlayPause: () => void; onScrub: (fi: number) => void; syncing?: boolean; runs: [number, number, string][]; calib: number; panelRef: RefObject<HTMLElement | null>;
}) {
  const V = useVocab();
  const f = clip.frames[fi], r = out[fi];
  const total = clip.frames[clip.frames.length - 1].t;
  const col = LCOL[r.calibrating ? 'calibrating' : r.label];
  const drivers = [...new Map(r.drivers.map((d) => [d.feature, d])).values()].filter((d) => d.feature !== 'muzzle_ratio' && d.feature !== 'head_drop');
  const basis = r.calibrating
    ? V.t(`视频开头先用 ${calib} 帧记下这只猫平时的样子（现在 ${Math.min(100, Math.round((fi / Math.max(1, calib)) * 100))}%），这段时间不下判断。`, `The first ${calib} frames of the video are used to record how this cat usually looks (now ${Math.min(100, Math.round((fi / Math.max(1, calib)) * 100))}%); no judgement is made during this time.`)
    : drivers.length ? drivers.map((d) => V.driverText(d as { feature: 'ear_height'; z: number })).join(V.t('；', '; '))
      : r.label === 'resting' ? V.t('所有数字都在它平时的范围里。', 'All the numbers are within its usual range.') : r.label === 'unknown' ? V.t('脸和身体都没有可靠的点。', 'Neither the face nor the body has reliable points.') : '';
  return (
    <section className="cl-panel" ref={panelRef} aria-label={V.t('实时分析演示', 'Live analysis demo')}>
      <div className="cl-panel-head">
        <div>
          <span className="cl-panel-eyebrow">CASE LAB · {V.t('案例实验室 · 实时分析演示', 'live analysis demo')}</span>
          <h1>{V.t('一只猫的耳朵压低了，', 'A cat’s ears went back. ')}<span>{V.t('系统是怎么判断的？', 'How did the system judge it?')}</span></h1>
        </div>
        <p className="cl-panel-hint">{V.t('左边是监控录像，右边是系统在同一时刻画出的关键点，下面的数字随之变化。拖动进度条，两边始终是同一帧。', 'On the left is the surveillance video; on the right, the keypoints the system drew at the same moment; the numbers below change with them. Drag the progress bar and both sides always show the same frame.')}</p>
      </div>
      <div className="cl-panel-grid">
        <div className="cl-panel-media">
          <div className="cl-p-tile cl-p-video">
            {showVideo ? (
              <iframe ref={iframeRef} title={V.t('原视频（YouTube）', 'Original video (YouTube)')} onLoad={onIframeLoad}
                src={`https://www.youtube-nocookie.com/embed/twzzFMcScww?enablejsapi=1&playsinline=1&rel=0&start=${videoStart}`}
                allow="encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
            ) : <div className="cl-p-off"><button className="cl-p-btn" onClick={() => setShowVideo(true)}>{V.t('显示原视频（YouTube）', 'Show the original video (YouTube)')}</button></div>}
            <span className="cl-p-cap">{V.t('监控录像', 'Surveillance video')}{syncing ? V.t(' · 对齐中…', ' · aligning…') : ''}</span>
          </div>
          <div className="cl-p-tile cl-p-skel">
            <Viewer fi={kpFi} frame={kpFrame} step={kpStep} size={clip.size} layers={layers} minConf={minConf} geoFeature={geoFeature} usePhoto={false} light full={!geoFeature} />
            <span className="cl-p-cap">{V.t('系统视觉分析', 'System visual analysis')}</span>
          </div>
        </div>
        <div className="cl-panel-read">
          <div className="cl-p-label" style={{ background: col }}>
            <span className="cl-p-label-k">{V.t('现在的标签', 'Current label')}</span>
            <strong>{r.calibrating ? V.t('正在记平时', 'Learning usual') : V.RPLAIN[r.label]}</strong>
          </div>
          <div className="cl-p-cat"><CatMap z={r.calibrating ? {} : r.z} /></div>
          <p className="cl-p-basis">{r.drivers.length && !r.calibrating ? <b>{V.t('依据　', 'Evidence　')}</b> : null}{basis}</p>
          <div className="cl-p-gauges">
            <Gauge k="ear_height" big z={r.calibrating ? NaN : r.z.ear_height} note={offReason(V, 'ear_height', f, r.calibrating)} />
            <Gauge k="activity" big z={r.calibrating ? NaN : r.z.activity} note={offReason(V, 'activity', f, r.calibrating)} />
            <Gauge k="ear_angle" big={false} z={r.calibrating ? NaN : r.z.ear_angle} note={offReason(V, 'ear_angle', f, r.calibrating)} />
            <Gauge k="eye_aperture" big={false} z={r.calibrating ? NaN : r.z.eye_aperture} note={offReason(V, 'eye_aperture', f, r.calibrating)} />
          </div>
          <p className="cl-p-legend">{V.t('数字是“偏离度”：0 = 这只猫自己的平时；越往两边，偏离越多。色块是规则里的门槛。', 'The numbers are deviation scores: 0 = this cat’s own usual; the further to either side, the bigger the deviation. The coloured areas are the rule thresholds.')}</p>
        </div>
      </div>
      <div className="cl-p-ctrl">
        <button className="cl-p-play" onClick={onPlayPause} aria-label={playing ? V.t('暂停', 'Pause') : V.t('播放', 'Play')} disabled={!showVideo}>{playing ? V.t('❚❚ 暂停', '❚❚ Pause') : V.t('▶ 播放', '▶ Play')}</button>
        <div className="cl-p-time num">{mmss(f.t)} / {mmss(total)}</div>
        <div className="cl-p-scrub">
          <svg className="cl-p-tl" viewBox="0 0 1000 14" preserveAspectRatio="none" role="img" aria-label={V.t('整段视频里每一时刻的行为标签', 'Behaviour label at each moment of the video')}>
            {runs.map(([a, b, k]) => <rect key={a} x={(a / out.length) * 1000} width={((b - a) / out.length) * 1000 + 0.5} height={14} fill={LCOL[k]} />)}
            <rect x={Math.max(0, (fi / out.length) * 1000 - 1.5)} width={3} height={14} fill="#fff" stroke="#0b1d6b" strokeWidth={0.6} />
          </svg>
          <input type="range" min={0} max={out.length - 1} value={fi} onChange={(e) => onScrub(+e.target.value)} aria-label={V.t('视频进度', 'Video progress')} />
        </div>
      </div>
      <div className="cl-p-opts" role="group" aria-label={V.t('画面上显示什么', 'What to show on the picture')}>
        {([['box', V.t('猫的框', 'Cat box')], ['face', V.t('脸 48 点', 'Face 48 points')], ['body', V.t('身体 20 点', 'Body 20 points')], ['basis', V.t('判断依据（红圈）', 'Evidence (red ring)')]] as const).map(([k, n]) =>
          <label key={k}><input type="checkbox" checked={layers[k]} onChange={(e) => setLayers({ ...layers, [k]: e.target.checked })} />{n}</label>)}
        <label><input type="checkbox" checked={showVideo} onChange={(e) => setShowVideo(e.target.checked)} />{V.t('加载监控录像（YouTube）', 'Load the surveillance video (YouTube)')}</label>
        {f.pose ? <span className="cl-p-warn">{V.t('脸部数字已暂停：', 'Face numbers paused: ')}{f.pose.includes('sideways') ? V.t('头转开了', 'head turned away') : V.t('头抬起或低下了', 'head lifted or lowered')}</span> : null}
      </div>
    </section>
  );
}

/* A slim bar that appears under the top bar once the panel has scrolled out of view. */
export function MiniBar({ visible, clip, out, fi, kpFrame, kpStep, kpFi, layers, minConf, geoFeature, usePhoto, onScrub, barRef }: {
  visible: boolean; clip: ClipData; out: Step[]; fi: number; kpFrame: Frame; kpStep: Step; kpFi: number; layers: Layers; minConf: number;
  geoFeature: FeatureKey | null; usePhoto: boolean; onScrub: (fi: number) => void; barRef: RefObject<HTMLDivElement | null>;
}) {
  const V = useVocab();
  const r = out[fi];
  const col = LCOL[r.calibrating ? 'calibrating' : r.label];
  const mini = (k: FeatureKey, name: string) => { const z = r.z[k]; return <span className="cl-m-n"><i>{name}</i><b className="num">{fin(z) && !r.calibrating ? (z! > 0 ? '+' : z! < 0 ? '−' : '') + Math.abs(z!).toFixed(1) : '—'}</b></span>; };
  return (
    <div className={'cl-mini' + (visible ? ' show' : '')} ref={barRef} aria-hidden={!visible}>
      <div className="cl-mini-in">
        <div className="cl-mini-cv"><Viewer fi={kpFi} frame={kpFrame} step={kpStep} size={clip.size} layers={layers} minConf={minConf} geoFeature={geoFeature} usePhoto={usePhoto} /></div>
        <div className="cl-mini-info">
          <span className="cl-chip" style={{ background: col }}>{r.calibrating ? V.t('正在记平时', 'Learning usual') : V.RPLAIN[r.label]}</span>
          <span className="cl-mini-nums">{mini('ear_height', V.t('耳朵高度', 'Ear height'))}{mini('activity', V.t('活动量', 'Activity'))}</span>
          <span className="cl-small num">{mmss(clip.frames[fi].t)}</span>
        </div>
        <input type="range" min={0} max={out.length - 1} value={fi} onChange={(e) => onScrub(+e.target.value)} aria-label={V.t('视频进度', 'Video progress')} tabIndex={visible ? 0 : -1} />
      </div>
    </div>
  );
}
