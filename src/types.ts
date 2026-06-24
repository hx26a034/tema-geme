export type DebrisType =
  | 'paper'          // 紙くず
  | 'plastic_bottle' // ペットボトル
  | 'apple'          // りんごの芯
  | 'snack_bag'      // お菓子の袋
  | 'newspaper'      // 新聞紙
  | 'cube_block'     // 謎の四角いブロック
  | 'sphere_ball'    // 謎の球体
  | 'fish_head'      // 魚の頭
  | 'bone_real'      // 本物の骨
  | 'bone_plastic';  // プラスチック製の骨

export type MarkType = 'burnable' | 'non_burnable' | 'none';

export type BoxType = 'burnable' | 'non_burnable' | 'bone';

export interface DebrisItem {
  id: string;
  type: DebrisType;
  name: string;
  // 落ちてくる位置、速度、回転角など（2D物理シミュレーションを簡易的に表現）
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  angularVelocity: number;
  size: number;
  
  // 観察用データ
  hasMarkOnFront: boolean; // 表側にマークがあるか
  markType: MarkType;     // マークの種類 (burnable | non_burnable | none)
}

export interface GameState {
  day: number;           // 現在の日にち (1 or 2)
  isDay1Passed: boolean; // 1日目を成功クリアしたか (2日目のルールに影響)
  money: number;         // 所持金
  
  // ステージ内の状態
  stageStatus: 'title' | 'playing' | 'inspecting' | 'result' | 'gameover' | 'ending';
  timeLeft: number;      // 制限時間（秒、初期180秒）
  debrisList: DebrisItem[];
  inspectingItem: DebrisItem | null;
  inspectRotation: number; // 観察画面でのゴミのY軸回転角度 (0 ~ 360)
  
  // スコア・ミス関連
  correctCount: number;  // 本日の正解数
  missCount: number;     // 本日のミス数
  isFailedByDebrisOver: boolean; // ゴミが30個溜まって失敗したか
  
  // デイリーリザルト用の一時データ
  todayEarnings: number;
}
