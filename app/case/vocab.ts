import type { FeatureKey, State } from './core';
import { fin } from './core';
import { useLang, type Lang } from '../i18n';

/* Shared vocabulary of the case lab, in both languages. Components read it through useVocab(). */
type Bi = { zh: string; en: string };
const B = (zh: string, en: string): Bi => ({ zh, en });

export const LCOL: Record<string, string> = {
  resting: '#7d8ba3', active: '#234fe5', alert: '#c98a14', ears_back: '#d9622b', freeze: '#b02a37', unknown: '#a3abb8', calibrating: '#cdd3de',
};
export const VIDEO_ID = 'twzzFMcScww';
export const COLAB_URL = 'https://colab.research.google.com/drive/1e41NMDHYXqvHY0a6cdBD2_nSD2krZPar';
export const mmss = (t: number) => String(Math.floor(t / 60)).padStart(2, '0') + ':' + (t % 60).toFixed(1).padStart(4, '0');
export const fmt = (v: number | null | undefined, n = 2) => (fin(v) ? v.toFixed(n) : '—');

const RPLAIN_B: Record<string, Bi> = {
  calibrating: B('正在记下它平时的样子', 'Learning its usual look'), unknown: B('看不清', 'Cannot see'), resting: B('没有明显变化', 'No clear change'), active: B('动起来了', 'Moving'),
  alert: B('注意到了什么', 'Noticed something'), ears_back: B('耳朵压低', 'Ears back'), freeze: B('突然不动', 'Froze'),
};
const STATE_B: Record<State, Bi> = {
  tense: B('紧张 / 害怕', 'Tense / scared'), curious: B('警惕 / 好奇', 'Wary / curious'), playful: B('想玩 / 兴奋', 'Playful / excited'), attentive: B('专注地听或看', 'Attentive'), calm: B('放松', 'Relaxed'),
};
const CUES_B: [string, Bi][] = [
  ['moves_away', B('随后离开或躲开', 'then moves away')], ['flees', B('随后快速跑开', 'then runs off')], ['approaches', B('随后靠近', 'then approaches')], ['plays', B('随后扑玩、追逐', 'then pounces or chases')],
  ['settles', B('随后很快平静下来', 'then calms down fast')], ['stays_still', B('随后保持不动', 'then stays still')], ['robot_before', B('之前小车刚有动作', 'the robot moved just before')],
];
const TELL_B: Record<string, Bi> = {
  'tense|attentive': B('随后躲起来更像紧张；随后去查看或继续原来的事，更像只是在专注听', 'Hiding afterwards looks more like tension; going to look or carrying on looks more like just listening'),
  'tense|playful': B('随后逃开更像紧张；随后扑出去更像准备玩', 'Running off afterwards looks more like tension; pouncing looks more like getting ready to play'),
  'curious|tense': B('随后靠近、嗅闻更像好奇；随后后退更像警惕或紧张', 'Approaching and sniffing afterwards looks more like curiosity; backing off looks more like wariness or tension'),
  'playful|curious': B('有扑、追的动作更像想玩；只是靠近看看更像好奇', 'Pouncing and chasing look more like play; just approaching to look looks more like curiosity'),
  'attentive|calm': B('耳朵和头一直朝向某处更像专注；很快躺回去更像放松', 'Ears and head staying turned toward something look more like attention; quickly lying back down looks more like relaxation'),
};
const FEAT_B: { k: FeatureKey; name: Bi; used: boolean; rel: Bi; def: Bi; gate: boolean; zthr: [number, Bi][] }[] = [
  { k: 'ear_height', name: B('耳朵高度', 'Ear height'), used: true, rel: B('误差只有真实差异的 0.15，可以单独触发标签', 'Error is only 0.15 of the real difference, so it can trigger a label on its own'), def: B('两个耳尖，比两眼连线的中点高多少，以两眼间距为单位。耳朵压低，数字变小。', 'How far the two ear tips sit above the midpoint of the eye line, in units of eye distance. Ears back: the number gets smaller.'), gate: true, zthr: [[-1.5, B('耳朵压低', 'Ears back')], [1.5, B('注意到了什么', 'Noticed something')]] },
  { k: 'ear_angle', name: B('耳朵外转', 'Ear rotation'), used: true, rel: B('误差约为真实差异的一半，只作补充', 'Error is about half the real difference; supporting only'), def: B('耳朵的轴线（耳根到耳尖）偏离“头顶方向”多少度，往外转为正。', 'How many degrees the ear axis (base to tip) is turned away from “up”; turning outward is positive.'), gate: true, zthr: [[2.0, B('补充：外转', 'Supporting: turned out')]] },
  { k: 'eye_aperture', name: B('眼睛睁开', 'Eye opening'), used: true, rel: B('误差约为真实差异的 0.4，只作补充', 'Error is about 0.4 of the real difference; supporting only'), def: B('眼睛上下张开的距离 ÷ 眼睛的宽度，两只眼睛取平均。', 'Height of the eye opening ÷ width of the eye, averaged over both eyes.'), gate: true, zthr: [[2.0, B('补充：睁大', 'Supporting: wide open')]] },
  { k: 'muzzle_ratio', name: B('口鼻宽度', 'Muzzle width'), used: false, rel: B('误差约为真实差异的一半', 'Error is about half the real difference'), def: B('口鼻两侧点的距离 ÷ 两眼间距。', 'Distance between the two muzzle points ÷ eye distance.'), gate: true, zthr: [] },
  { k: 'head_drop', name: B('头的高低', 'Head height'), used: false, rel: B('还没有在验证集上测过误差', 'Error not yet measured on a validation set'), def: B('鼻子比肩胛低多少，以身长为单位（来自身体 20 点）。', 'How far the nose sits below the shoulder blades, in body lengths (from the 20 body points).'), gate: false, zthr: [] },
  { k: 'activity', name: B('活动量', 'Activity'), used: true, rel: B('还没有在验证集上测过误差，用中位数并封顶', 'Error not yet measured on a validation set; uses the median and is capped'), def: B('关键点在约 0.5 秒里的移动速度，以“猫身长 / 秒”为单位，取各点的中位数，最高算 3。', 'Speed of the keypoints over about 0.5 s, in body lengths per second, taking the median over the points, capped at 3.'), gate: false, zthr: [[2.0, B('动起来了', 'Moving')], [-1.0, B('静止', 'Still')]] },
];
const DPLAIN_B: Partial<Record<FeatureKey, [Bi, Bi, Bi]>> = {
  ear_height: [B('耳朵', 'Ears'), B('比它平时低', 'lower than usual'), B('比它平时竖得高', 'higher than usual')],
  ear_angle: [B('耳朵', 'Ears'), B('比它平时更朝前', 'more forward than usual'), B('比它平时更向外转', 'turned out more than usual')],
  eye_aperture: [B('眼睛', 'Eyes'), B('比它平时眯', 'narrower than usual'), B('比它平时睁得大', 'wider than usual')],
  activity: [B('身体', 'Body'), B('比它平时安静', 'stiller than usual'), B('比它平时动得多', 'moving more than usual')],
};

export const amountOf = (lang: Lang, z: number) => (Math.abs(z) < 2 ? (lang === 'en' ? 'slightly' : '有些') : Math.abs(z) < 3 ? (lang === 'en' ? 'clearly' : '明显') : lang === 'en' ? 'very clearly' : '很明显');

/* the resolved vocabulary for one language */
export function buildVocab(lang: Lang) {
  const p = (b: Bi) => (lang === 'en' ? b.en : b.zh);
  const amount = (z: number) => amountOf(lang, z);
  const driverText = (d: { feature: FeatureKey; z: number }) => {
    const q = DPLAIN_B[d.feature]!;
    return lang === 'en'
      ? p(q[0]) + ' ' + (d.z < 0 ? p(q[1]) : p(q[2])) + ` (${amount(d.z)})`
      : p(q[0]) + (d.z < 0 ? p(q[1]) : p(q[2])) + '（' + amount(d.z) + '）';
  };
  return {
    lang,
    RPLAIN: Object.fromEntries(Object.entries(RPLAIN_B).map(([k, b]) => [k, p(b)])) as Record<string, string>,
    STATE_TEXT: Object.fromEntries(Object.entries(STATE_B).map(([k, b]) => [k, p(b)])) as Record<State, string>,
    STATE_SHORT: Object.fromEntries(Object.entries(STATE_B).map(([k, b]) => [k, lang === 'en' ? b.en.split(' / ')[0] : b.zh.split(' ')[0]])) as Record<State, string>,
    CUES: CUES_B.map(([k, b]) => [k, p(b)] as [string, string]),
    TELL: Object.fromEntries(Object.entries(TELL_B).map(([k, b]) => [k, p(b)])) as Record<string, string>,
    FEAT: FEAT_B.map((f) => ({ k: f.k, name: p(f.name), used: f.used, rel: p(f.rel), def: p(f.def), gate: f.gate, zthr: f.zthr.map(([z, b]) => [z, p(b)] as [number, string]) })),
    DPLAIN: Object.fromEntries(Object.entries(DPLAIN_B).map(([k, q]) => [k, q!.map(p)])) as Partial<Record<FeatureKey, [string, string, string]>>,
    amount,
    driverText,
    /* the word for "yes" style phrases used in several places */
    t: (zh: string, en: string) => (lang === 'en' ? en : zh),
  };
}

export type Vocab = ReturnType<typeof buildVocab>;
export const useVocab = (): Vocab => {
  const { lang } = useLang();
  return buildVocab(lang);
};

/* static lookups that do not depend on the language */
export const FIDX_BY_KEY: Record<FeatureKey, number> = { ear_height: 0, ear_angle: 1, eye_aperture: 2, muzzle_ratio: 3, head_drop: 4, activity: 5 };
export const FIDX = FIDX_BY_KEY;
