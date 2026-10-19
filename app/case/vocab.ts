import type { FeatureKey, State } from './core';
import { fin } from './core';

/* ---------- shared vocabulary ---------- */
export const RPLAIN: Record<string, string> = {
  calibrating: '正在记下它平时的样子', unknown: '看不清', resting: '没有明显变化', active: '动起来了',
  alert: '注意到了什么', ears_back: '耳朵压低', freeze: '突然不动',
};
export const LCOL: Record<string, string> = {
  resting: '#7d8ba3', active: '#234fe5', alert: '#c98a14', ears_back: '#d9622b', freeze: '#b02a37', unknown: '#a3abb8', calibrating: '#cdd3de',
};
export const STATE_TEXT: Record<State, string> = { tense: '紧张 / 害怕', curious: '警惕 / 好奇', playful: '想玩 / 兴奋', attentive: '专注地听或看', calm: '放松' };
export const CUES: [string, string][] = [
  ['moves_away', '随后离开或躲开'], ['flees', '随后快速跑开'], ['approaches', '随后靠近'], ['plays', '随后扑玩、追逐'],
  ['settles', '随后很快平静下来'], ['stays_still', '随后保持不动'], ['robot_before', '之前小车刚有动作'],
];
export const TELL: Record<string, string> = {
  'tense|attentive': '随后躲起来更像紧张；随后去查看或继续原来的事，更像只是在专注听',
  'tense|playful': '随后逃开更像紧张；随后扑出去更像准备玩',
  'curious|tense': '随后靠近、嗅闻更像好奇；随后后退更像警惕或紧张',
  'playful|curious': '有扑、追的动作更像想玩；只是靠近看看更像好奇',
  'attentive|calm': '耳朵和头一直朝向某处更像专注；很快躺回去更像放松',
};
export interface FeatInfo { k: FeatureKey; name: string; used: boolean; rel: string; def: string; gate: boolean; zthr: [number, string][] }
export const FEAT: FeatInfo[] = [
  { k: 'ear_height', name: '耳朵高度', used: true, rel: '误差只有真实差异的 0.15，可以单独触发标签', def: '两个耳尖，比两眼连线的中点高多少，以两眼间距为单位。耳朵压低，数字变小。', gate: true, zthr: [[-1.5, '耳朵压低'], [1.5, '注意到了什么']] },
  { k: 'ear_angle', name: '耳朵外转', used: true, rel: '误差约为真实差异的一半，只作补充', def: '耳朵的轴线（耳根到耳尖）偏离“头顶方向”多少度，往外转为正。', gate: true, zthr: [[2.0, '补充：外转']] },
  { k: 'eye_aperture', name: '眼睛睁开', used: true, rel: '误差约为真实差异的 0.4，只作补充', def: '眼睛上下张开的距离 ÷ 眼睛的宽度，两只眼睛取平均。', gate: true, zthr: [[2.0, '补充：睁大']] },
  { k: 'muzzle_ratio', name: '口鼻宽度', used: false, rel: '误差约为真实差异的一半', def: '口鼻两侧点的距离 ÷ 两眼间距。', gate: true, zthr: [] },
  { k: 'head_drop', name: '头的高低', used: false, rel: '还没有在验证集上测过误差', def: '鼻子比肩胛低多少，以身长为单位（来自身体 20 点）。', gate: false, zthr: [] },
  { k: 'activity', name: '活动量', used: true, rel: '还没有在验证集上测过误差，用中位数并封顶', def: '关键点在约 0.5 秒里的移动速度，以“猫身长 / 秒”为单位，取各点的中位数，最高算 3。', gate: false, zthr: [[2.0, '动起来了'], [-1.0, '静止']] },
];
export const FIDX = Object.fromEntries(FEAT.map((f, i) => [f.k, i])) as Record<FeatureKey, number>;
export const DPLAIN: Partial<Record<FeatureKey, [string, string, string]>> = {
  ear_height: ['耳朵', '比它平时低', '比它平时竖得高'], ear_angle: ['耳朵', '比它平时更朝前', '比它平时更向外转'],
  eye_aperture: ['眼睛', '比它平时眯', '比它平时睁得大'], activity: ['身体', '比它平时安静', '比它平时动得多'],
};
export const amount = (z: number) => (Math.abs(z) < 2 ? '有些' : Math.abs(z) < 3 ? '明显' : '很明显');
export const driverText = (d: { feature: FeatureKey; z: number }) => { const p = DPLAIN[d.feature]!; return p[0] + (d.z < 0 ? p[1] : p[2]) + '（' + amount(d.z) + '）'; };
export const VIDEO_ID = 'twzzFMcScww';
export const COLAB_URL = 'https://colab.research.google.com/drive/1e41NMDHYXqvHY0a6cdBD2_nSD2krZPar';
export const mmss = (t: number) => String(Math.floor(t / 60)).padStart(2, '0') + ':' + (t % 60).toFixed(1).padStart(4, '0');
export const fmt = (v: number | null | undefined, n = 2) => (fin(v) ? v.toFixed(n) : '—');

