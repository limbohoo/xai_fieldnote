'use client';
import { createContext, useContext } from 'react';
import type { FeatureKey } from '../case/core';
import { RPLAIN, STATE_TEXT, CUES, FEAT } from '../case/vocab';
import type { State } from '../case/core';

export type Lang = 'zh' | 'en';
export interface Ctx { lang: Lang; t: (zh: string, en: string) => string }
export const LangCtx = createContext<Ctx>({ lang: 'zh', t: (zh) => zh });
export const useT = () => useContext(LangCtx);
export const makeT = (lang: Lang) => (zh: string, en: string) => (lang === 'en' ? en : zh);

const RP_EN: Record<string, string> = {
  calibrating: 'Learning its usual look', unknown: 'Cannot see', resting: 'No clear change', active: 'Moving', alert: 'Noticed something', ears_back: 'Ears back', freeze: 'Froze',
};
const ST_EN: Record<State, string> = { tense: 'Tense / scared', curious: 'Wary / curious', playful: 'Playful / excited', attentive: 'Attentive', calm: 'Relaxed' };
const ST_SHORT_EN: Record<State, string> = { tense: 'Tense', curious: 'Curious', playful: 'Playful', attentive: 'Attentive', calm: 'Calm' };
const CUE_EN: Record<string, string> = {
  moves_away: 'then moves away', flees: 'then runs off', approaches: 'then approaches', plays: 'then pounces or chases', settles: 'then calms down fast', stays_still: 'then stays still', robot_before: 'the robot just moved',
};
const FEAT_EN: Record<FeatureKey, string> = { ear_height: 'Ear height', ear_angle: 'Ear rotation', eye_aperture: 'Eye opening', muzzle_ratio: 'Muzzle width', head_drop: 'Head height', activity: 'Activity' };
const DP_EN: Partial<Record<FeatureKey, [string, string, string]>> = {
  ear_height: ['Ears ', 'lower than usual', 'higher than usual'], ear_angle: ['Ears ', 'more forward than usual', 'turned out more than usual'],
  eye_aperture: ['Eyes ', 'narrower than usual', 'wider than usual'], activity: ['Body ', 'stiller than usual', 'moving more than usual'],
};

export const rp = (l: Lang, k: string) => (l === 'en' ? RP_EN[k] ?? k : RPLAIN[k] ?? k);
export const stateName = (l: Lang, s: State) => (l === 'en' ? ST_EN[s] : STATE_TEXT[s]);
export const stateShort = (l: Lang, s: State) => (l === 'en' ? ST_SHORT_EN[s] : STATE_TEXT[s].split(' ')[0]);
export const cueName = (l: Lang, k: string) => (l === 'en' ? CUE_EN[k] : CUES.find((c) => c[0] === k)![1]);
export const cueKeys = CUES.map((c) => c[0]);
export const featName = (l: Lang, k: FeatureKey) => (l === 'en' ? FEAT_EN[k] : FEAT.find((f) => f.k === k)!.name);
export const amountOf = (l: Lang, z: number) => (Math.abs(z) < 2 ? (l === 'en' ? 'slightly' : '有些') : Math.abs(z) < 3 ? (l === 'en' ? 'clearly' : '明显') : l === 'en' ? 'very clearly' : '很明显');
export const driverTxt = (l: Lang, d: { feature: FeatureKey; z: number }) => {
  if (l === 'en') { const p = DP_EN[d.feature]!; return p[0] + (d.z < 0 ? p[1] : p[2]) + ` (${amountOf(l, d.z)})`; }
  const p = { ear_height: ['耳朵', '比它平时低', '比它平时竖得高'], ear_angle: ['耳朵', '比它平时更朝前', '比它平时更向外转'], eye_aperture: ['眼睛', '比它平时眯', '比它平时睁得大'], activity: ['身体', '比它平时安静', '比它平时动得多'] }[d.feature as 'ear_height'];
  return p[0] + (d.z < 0 ? p[1] : p[2]) + '（' + amountOf(l, d.z) + '）';
};
export const featShort = (l: Lang): string[] => (l === 'en' ? ['Ear h.', 'Ear rot.', 'Eye op.', 'Muzzle', 'Head', 'Activity'] : ['耳高', '耳转', '眼睁', '口鼻', '头低', '活动']);
