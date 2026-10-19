'use client';
import type { RefObject } from 'react';
import { fin, type ClipData, type FeatureKey, type Frame, type Step } from './core';
import { DPLAIN, FEAT, FIDX, LCOL, RPLAIN, amount, driverText, mmss } from './vocab';
import { Viewer, type Layers } from './viewer';

/* The live demo panel: original video, live keypoints, and the measurements as gauges that move with every frame. */

const RANGE = 3.5; // gauges show z from -3.5 to +3.5
interface Zone { from: number; to: number; color: string; label: string }
const ZONES: Partial<Record<FeatureKey, Zone[]>> = {
  ear_height: [{ from: -RANGE, to: -1.5, color: 'rgba(255,159,90,.75)', label: '耳朵压低' }, { from: 1.5, to: RANGE, color: 'rgba(255,209,102,.75)', label: '注意到了什么' }],
  activity: [{ from: -RANGE, to: -1, color: 'rgba(200,210,227,.7)', label: '静止' }, { from: 2, to: RANGE, color: 'rgba(159,208,255,.85)', label: '动起来' }],
  ear_angle: [{ from: 2, to: RANGE, color: 'rgba(255,159,90,.55)', label: '外转（补充）' }],
  eye_aperture: [{ from: 2, to: RANGE, color: 'rgba(255,209,102,.55)', label: '睁大（补充）' }],
};
const pct = (z: number) => ((Math.max(-RANGE, Math.min(RANGE, z)) + RANGE) / (2 * RANGE)) * 100;

function zPhrase(k: FeatureKey, z: number): string {
  if (Math.abs(z) < 1) return '在它平时的范围里';
  const d = DPLAIN[k]!;
  return (z < 0 ? d[1] : d[2]) + ' · ' + amount(z);
}

export function Gauge({ k, z, big, note }: { k: FeatureKey; z: number | undefined; big: boolean; note: string }) {
  const f = FEAT[FIDX[k]];
  const ok = fin(z);
  const zones = ZONES[k] ?? [];
  const fired = ok ? zones.find((q) => (z as number) >= q.from && (z as number) <= q.to) : undefined;
  return (
    <div className={'cl-g' + (big ? ' big' : '') + (fired ? ' fired' : '') + (ok ? '' : ' off')}>
      <div className="cl-g-top">
        <span className="cl-g-name">{f.name}{big ? null : <small>补充</small>}</span>
        <span className="cl-g-val num">{ok ? ((z as number) > 0 ? '+' : (z as number) < 0 ? '−' : '') + Math.abs(z as number).toFixed(1) : '—'}</span>
      </div>
      <div className="cl-g-track" role="img" aria-label={ok ? `${f.name}偏离度 ${(z as number).toFixed(1)}` : `${f.name}这一帧量不出来`}>
        {zones.map((q) => <span key={q.label} className="cl-g-zone" style={{ left: pct(q.from) + '%', width: pct(q.to) - pct(q.from) + '%', background: q.color }} />)}
        <span className="cl-g-mid" />
        {ok ? <span className="cl-g-dot" style={{ left: pct(z as number) + '%' }} /> : null}
      </div>
      <div className="cl-g-scale">
        {zones.map((q) => <span key={q.label} style={{ left: (pct(q.from) + pct(q.to)) / 2 + '%' }}>{q.label}</span>)}
        <span className="mid" style={{ left: '50%' }}>平时</span>
      </div>
      <p className="cl-g-note">{ok ? (fired ? <b>触发：{fired.label} · </b> : null) : null}{ok ? zPhrase(k, z as number) : note}</p>
    </div>
  );
}

function offReason(k: FeatureKey, f: Frame, calibrating: boolean): string {
  if (calibrating) return '正在记平时，先不下判断';
  if (!f.sm) return '这一帧没有找到猫';
  const info = FEAT[FIDX[k]];
  if (info.gate && f.pose) return f.pose.includes('sideways') ? '已暂停：头转开了' : '已暂停：头抬起或低下了';
  return '这一帧量不出来';
}

export function Panel({ clip, out, fi, kpFrame, kpStep, layers, setLayers, minConf, geoFeature, usePhoto, photoOk, wantPhoto, setWantPhoto,
  showVideo, setShowVideo, iframeRef, videoStart, onIframeLoad, playing, onPlayPause, onScrub, runs, calib, panelRef, kpFi }: {
  clip: ClipData; out: Step[]; fi: number; kpFrame: Frame; kpStep: Step; kpFi: number; layers: Layers; setLayers: (l: Layers) => void; minConf: number;
  geoFeature: FeatureKey | null; usePhoto: boolean; photoOk: boolean; wantPhoto: boolean; setWantPhoto: (v: boolean) => void;
  showVideo: boolean; setShowVideo: (v: boolean) => void; iframeRef: RefObject<HTMLIFrameElement | null>; videoStart: number; onIframeLoad: () => void;
  playing: boolean; onPlayPause: () => void; onScrub: (fi: number) => void; runs: [number, number, string][]; calib: number; panelRef: RefObject<HTMLElement | null>;
}) {
  const f = clip.frames[fi], r = out[fi];
  const total = clip.frames[clip.frames.length - 1].t;
  const col = LCOL[r.calibrating ? 'calibrating' : r.label];
  const drivers = [...new Map(r.drivers.map((d) => [d.feature, d])).values()].filter((d) => d.feature !== 'muzzle_ratio' && d.feature !== 'head_drop');
  const basis = r.calibrating ? `视频开头先用 ${calib} 帧记下这只猫平时的样子（现在 ${Math.min(100, Math.round((fi / Math.max(1, calib)) * 100))}%），这段时间不下判断。`
    : drivers.length ? drivers.map((d) => driverText(d as { feature: 'ear_height'; z: number })).join('；')
      : r.label === 'resting' ? '所有数字都在它平时的范围里。' : r.label === 'unknown' ? '脸和身体都没有可靠的点。' : '';
  return (
    <section className="cl-panel" ref={panelRef} aria-label="实时分析演示">
      <div className="cl-panel-head">
        <div>
          <span className="cl-panel-eyebrow">CASE LAB · 案例实验室 · 实时分析演示</span>
          <h1>一只猫的耳朵压低了，<span>系统是怎么判断的？</span></h1>
        </div>
        <p className="cl-panel-hint">按播放键，右边的数字会随着视频每一帧实时变化。</p>
      </div>
      <div className="cl-panel-grid">
        <div className="cl-panel-media">
          <div className="cl-p-tile cl-p-video">
            {showVideo ? (
              <iframe ref={iframeRef} title="原视频（YouTube）" onLoad={onIframeLoad}
                src={`https://www.youtube-nocookie.com/embed/twzzFMcScww?enablejsapi=1&playsinline=1&rel=0&start=${videoStart}`}
                allow="encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
            ) : <div className="cl-p-off"><button className="cl-p-btn" onClick={() => setShowVideo(true)}>显示原视频（YouTube）</button></div>}
            <span className="cl-p-cap">原视频</span>
          </div>
          <div className="cl-p-tile cl-p-skel">
            <Viewer fi={kpFi} frame={kpFrame} step={kpStep} size={clip.size} layers={layers} minConf={minConf} geoFeature={geoFeature} usePhoto={usePhoto} />
            <span className="cl-p-cap">系统看到的</span>
          </div>
        </div>
        <div className="cl-panel-read">
          <div className="cl-p-label" style={{ background: col }}>
            <span className="cl-p-label-k">现在的标签</span>
            <strong>{r.calibrating ? '正在记平时' : RPLAIN[r.label]}</strong>
          </div>
          <p className="cl-p-basis">{r.drivers.length && !r.calibrating ? <b>依据　</b> : null}{basis}</p>
          <div className="cl-p-gauges">
            <Gauge k="ear_height" big z={r.calibrating ? NaN : r.z.ear_height} note={offReason('ear_height', f, r.calibrating)} />
            <Gauge k="activity" big z={r.calibrating ? NaN : r.z.activity} note={offReason('activity', f, r.calibrating)} />
            <Gauge k="ear_angle" big={false} z={r.calibrating ? NaN : r.z.ear_angle} note={offReason('ear_angle', f, r.calibrating)} />
            <Gauge k="eye_aperture" big={false} z={r.calibrating ? NaN : r.z.eye_aperture} note={offReason('eye_aperture', f, r.calibrating)} />
          </div>
          <p className="cl-p-legend">数字是“偏离度”：0 = 这只猫自己的平时；越往两边，偏离越多。色块是规则里的门槛。</p>
        </div>
      </div>
      <div className="cl-p-ctrl">
        <button className="cl-p-play" onClick={onPlayPause} aria-label={playing ? '暂停' : '播放'} disabled={!showVideo}>{playing ? '❚❚ 暂停' : '▶ 播放'}</button>
        <div className="cl-p-time num">{mmss(f.t)} / {mmss(total)}</div>
        <div className="cl-p-scrub">
          <svg className="cl-p-tl" viewBox="0 0 1000 14" preserveAspectRatio="none" role="img" aria-label="整段视频里每一时刻的行为标签">
            {runs.map(([a, b, k]) => <rect key={a} x={(a / out.length) * 1000} width={((b - a) / out.length) * 1000 + 0.5} height={14} fill={LCOL[k]} />)}
            <rect x={Math.max(0, (fi / out.length) * 1000 - 1.5)} width={3} height={14} fill="#fff" stroke="#0b1d6b" strokeWidth={0.6} />
          </svg>
          <input type="range" min={0} max={out.length - 1} value={fi} onChange={(e) => onScrub(+e.target.value)} aria-label="视频进度" />
        </div>
      </div>
      <div className="cl-p-opts" role="group" aria-label="画面上显示什么">
        {([['box', '猫的框'], ['face', '脸 48 点'], ['body', '身体 20 点'], ['basis', '判断依据（红圈）']] as const).map(([k, n]) =>
          <label key={k}><input type="checkbox" checked={layers[k]} onChange={(e) => setLayers({ ...layers, [k]: e.target.checked })} />{n}</label>)}
        <label><input type="checkbox" checked={showVideo} onChange={(e) => setShowVideo(e.target.checked)} />加载原视频（YouTube）</label>
        {photoOk ? <label><input type="checkbox" checked={wantPhoto} onChange={(e) => setWantPhoto(e.target.checked)} />真实画面（仅本地）</label> : null}
        {f.pose ? <span className="cl-p-warn">脸部数字已暂停：{f.pose.includes('sideways') ? '头转开了' : '头抬起或低下了'}</span> : null}
      </div>
    </section>
  );
}

/* A slim bar that appears under the top bar once the panel has scrolled out of view. */
export function MiniBar({ visible, clip, out, fi, kpFrame, kpStep, kpFi, layers, minConf, geoFeature, usePhoto, onScrub, barRef }: {
  visible: boolean; clip: ClipData; out: Step[]; fi: number; kpFrame: Frame; kpStep: Step; kpFi: number; layers: Layers; minConf: number;
  geoFeature: FeatureKey | null; usePhoto: boolean; onScrub: (fi: number) => void; barRef: RefObject<HTMLDivElement | null>;
}) {
  const r = out[fi];
  const col = LCOL[r.calibrating ? 'calibrating' : r.label];
  const mini = (k: FeatureKey, name: string) => { const z = r.z[k]; return <span className="cl-m-n"><i>{name}</i><b className="num">{fin(z) && !r.calibrating ? (z! > 0 ? '+' : z! < 0 ? '−' : '') + Math.abs(z!).toFixed(1) : '—'}</b></span>; };
  return (
    <div className={'cl-mini' + (visible ? ' show' : '')} ref={barRef} aria-hidden={!visible}>
      <div className="cl-mini-in">
        <div className="cl-mini-cv"><Viewer fi={kpFi} frame={kpFrame} step={kpStep} size={clip.size} layers={layers} minConf={minConf} geoFeature={geoFeature} usePhoto={usePhoto} /></div>
        <div className="cl-mini-info">
          <span className="cl-chip" style={{ background: col }}>{r.calibrating ? '正在记平时' : RPLAIN[r.label]}</span>
          <span className="cl-mini-nums">{mini('ear_height', '耳朵高度')}{mini('activity', '活动量')}</span>
          <span className="cl-small num">{mmss(clip.frames[fi].t)}</span>
        </div>
        <input type="range" min={0} max={out.length - 1} value={fi} onChange={(e) => onScrub(+e.target.value)} aria-label="视频进度" tabIndex={visible ? 0 : -1} />
      </div>
    </div>
  );
}
