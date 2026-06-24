import { DebrisItem, DebrisType, MarkType } from './types';

// ランダムなID生成
export const generateId = () => Math.random().toString(36).substring(2, 9);

// 1日目のゴミの種類（骨以外）
const DAY1_DEBRIS_TYPES: DebrisType[] = [
  'paper',
  'plastic_bottle',
  'apple',
  'snack_bag',
  'newspaper',
  'cube_block',
  'sphere_ball',
  'fish_head'
];

// 2日目のゴミの種類（骨も含む）
const DAY2_DEBRIS_TYPES: DebrisType[] = [
  ...DAY1_DEBRIS_TYPES,
  'bone_real',
  'bone_plastic'
];

export const getDebrisName = (type: DebrisType): string => {
  switch (type) {
    case 'paper': return '紙くず';
    case 'plastic_bottle': return 'ペットボトル';
    case 'apple': return 'りんごの芯';
    case 'snack_bag': return 'お菓子の袋';
    case 'newspaper': return '新聞紙';
    case 'cube_block': return '謎の四角いブロック';
    case 'sphere_ball': return '謎の球体';
    case 'fish_head': return '魚の頭';
    case 'bone_real': return '本物の骨';
    case 'bone_plastic': return 'プラスチック製の骨';
  }
};

/**
 * 新しいゴミオブジェクトを生成する
 * @param day 現在の日にち
 * @param isDay1Passed 1日目を成功でクリアしたか（骨が出現するか）
 */
export const createRandomDebris = (day: number, isDay1Passed: boolean): DebrisItem => {
  const allowBone = day === 2 && isDay1Passed;
  const types = allowBone ? DAY2_DEBRIS_TYPES : DAY1_DEBRIS_TYPES;
  
  // ランダムにタイプを決定
  const type = types[Math.floor(Math.random() * types.length)];
  
  // マークの決定
  let markType: MarkType = 'none';
  let hasMarkOnFront = Math.random() > 0.5;

  if (type === 'bone_real') {
    // 本物の骨はマークなし
    markType = 'none';
  } else if (type === 'bone_plastic') {
    // プラスチック製の骨は「燃えないゴミのマーク」が必ずつく
    markType = 'non_burnable';
  } else {
    // 一般のゴミは燃える・燃えないがランダム
    markType = Math.random() > 0.5 ? 'burnable' : 'non_burnable';
  }

  // 落下開始位置（コンパクトなプレイエリア幅340pxに収める）
  const x = 15 + Math.random() * 250; 
  const y = -40; // 画面上部から出現

  // 落下速度
  const vy = 1.0 + Math.random() * 1.5;
  const vx = (Math.random() - 0.5) * 0.4; // わずかに横方向にも揺れる

  // 回転と回転速度
  const rotation = Math.random() * 360;
  const angularVelocity = (Math.random() - 0.5) * 2;

  // サイズ
  const size = 50 + Math.random() * 20;

  return {
    id: generateId(),
    type,
    name: getDebrisName(type),
    x,
    y,
    vx,
    vy,
    rotation,
    angularVelocity,
    size,
    hasMarkOnFront,
    markType
  };
};
