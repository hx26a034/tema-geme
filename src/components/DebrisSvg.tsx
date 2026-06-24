import React from 'react';
import { DebrisType, MarkType } from '../types';

interface DebrisSvgProps {
  type: DebrisType;
  size?: number;
  className?: string;
  showMark?: boolean;
  markType?: MarkType;
  isBackSide?: boolean; // 裏面かどうか
}

// 燃えるマーク (炎のアイコン)
export const BurnableMark: React.FC<{ size?: number; className?: string; id?: string }> = ({ size = 24, className = '', id }) => (
  <svg
    id={id}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`text-red-500 stroke-red-500 fill-red-100 ${className}`}
  >
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);

// 燃えないマーク (バツのついた火、またはリサイクル缶にバツなど)
export const NonBurnableMark: React.FC<{ size?: number; className?: string; id?: string }> = ({ size = 24, className = '', id }) => (
  <svg
    id={id}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`text-blue-500 stroke-blue-500 fill-blue-100 ${className}`}
  >
    {/* 炎のマークに斜め線(禁止)を重ねる */}
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5" opacity="0.6" />
    <path d="M12 22a7 7 0 0 1-7-7c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5" opacity="0.6" />
    <circle cx="12" cy="12" r="9" stroke="currentColor" />
    <line x1="5.5" y1="5.5" x2="18.5" y2="18.5" stroke="currentColor" />
  </svg>
);

export const DebrisSvg: React.FC<DebrisSvgProps> = ({
  type,
  size = 64,
  className = '',
  showMark = false,
  markType = 'none',
  isBackSide = false,
}) => {
  // ゴミの基本ビジュアルの描画
  const renderBaseDebris = () => {
    switch (type) {
      case 'paper': // 紙くず
        return (
          <g>
            {/* クシャクシャの質感 */}
            <path
              d="M10,12 L18,8 L35,12 L45,25 L40,42 L25,48 L12,40 L8,25 Z"
              fill="#E5E7EB"
              stroke="#9CA3AF"
              strokeWidth="2"
            />
            <path d="M18,8 L25,25 L12,40" stroke="#D1D5DB" strokeWidth="2" fill="none" />
            <path d="M35,12 L25,25 L40,42" stroke="#D1D5DB" strokeWidth="2" fill="none" />
            <path d="M10,12 L22,20 L25,48" stroke="#D1D5DB" strokeWidth="2" fill="none" />
            <path d="M45,25 L28,30" stroke="#D1D5DB" strokeWidth="2" fill="none" />
          </g>
        );
      case 'plastic_bottle': // ペットボトル
        return (
          <g transform="translate(10, 2)">
            {/* ボトル本体 */}
            <rect x="10" y="14" width="20" height="30" rx="4" fill="#E0F2FE" stroke="#0284C7" strokeWidth="2" />
            {/* 飲み口 */}
            <rect x="16" y="4" width="8" height="6" fill="#0284C7" stroke="#0284C7" strokeWidth="1" />
            <rect x="14" y="10" width="12" height="4" fill="#38BDF8" stroke="#0284C7" strokeWidth="1" />
            {/* ラベル */}
            <rect x="10" y="22" width="20" height="10" fill="#38BDF8" stroke="#0284C7" strokeWidth="1" />
            {/* つぶれたシワ */}
            <line x1="12" y1="18" x2="28" y2="18" stroke="#0284C7" strokeWidth="1" strokeDasharray="2,2" />
            <line x1="12" y1="36" x2="28" y2="36" stroke="#0284C7" strokeWidth="1" strokeDasharray="2,2" />
          </g>
        );
      case 'apple': // りんごの芯
        return (
          <g transform="translate(5, 5)">
            {/* 上下の皮部分 */}
            <path d="M10,8 C20,3 30,3 40,8 C40,15 35,15 35,15 C35,15 25,22 25,25 C25,28 35,35 35,35 C35,35 40,35 40,42 C30,47 20,47 10,42 C10,35 15,35 15,35 C15,35 25,28 25,25 C25,22 15,15 15,15 C15,15 10,15 10,8 Z" fill="#FCA5A5" stroke="#EF4444" strokeWidth="2" />
            {/* 芯の白い中身 */}
            <path d="M15,15 C15,15 25,22 25,25 C25,28 15,35 15,35 C20,35 23,30 23,25 C23,20 20,15 15,15 Z" fill="#FEF08A" opacity="0.9" />
            <path d="M35,15 C35,15 25,22 25,25 C25,28 35,35 35,35 C30,35 27,30 27,25 C27,20 30,15 35,15 Z" fill="#FEF08A" opacity="0.9" />
            {/* 茎 */}
            <path d="M25,8 L28,2" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
            {/* 種 */}
            <circle cx="21" cy="23" r="2.5" fill="#451A03" />
            <circle cx="29" cy="27" r="2.5" fill="#451A03" />
          </g>
        );
      case 'snack_bag': // お菓子の袋
        return (
          <g>
            {/* ギザギザ付きの袋 */}
            <path
              d="M10,8 L13,10 L16,8 L19,10 L22,8 L25,10 L28,8 L31,10 L34,8 L37,10 L40,8 L43,10 L46,8 L46,42 L43,40 L40,42 L37,40 L34,42 L31,40 L28,42 L25,40 L22,42 L19,40 L16,42 L13,40 L10,42 Z"
              fill="#F59E0B"
              stroke="#D97706"
              strokeWidth="2"
            />
            {/* ポップなストライプ */}
            <path d="M12,15 L44,22" stroke="#EF4444" strokeWidth="4" />
            <path d="M12,25 L44,32" stroke="#3B82F6" strokeWidth="4" />
            {/* クシャクシャ線 */}
            <path d="M15,20 Q25,28 40,18" stroke="#FBBF24" strokeWidth="2" fill="none" />
            <path d="M12,32 Q22,25 38,35" stroke="#FBBF24" strokeWidth="2" fill="none" />
          </g>
        );
      case 'newspaper': // 新聞紙
        return (
          <g transform="translate(4, 4)">
            {/* 折り畳まれた紙 */}
            <polygon points="4,4 38,8 44,38 10,42 2,12" fill="#F3F4F6" stroke="#6B7280" strokeWidth="2" />
            <polygon points="8,10 34,13 38,34 12,37" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="1" />
            {/* 細かい文字を模した線 */}
            <line x1="12" y1="16" x2="30" y2="18" stroke="#4B5563" strokeWidth="2" />
            <line x1="12" y1="21" x2="26" y2="22.5" stroke="#4B5563" strokeWidth="2" />
            <line x1="12" y1="26" x2="32" y2="28" stroke="#4B5563" strokeWidth="2" />
            <line x1="14" y1="31" x2="24" y2="32" stroke="#4B5563" strokeWidth="2" />
            {/* 写真枠 */}
            <rect x="28" y="20" width="8" height="8" fill="#9CA3AF" stroke="#6B7280" strokeWidth="1" />
          </g>
        );
      case 'cube_block': // 謎の四角いブロック
        return (
          <g transform="translate(6, 6)">
            {/* 立方体 (クォータービュー風) */}
            {/* 正面 */}
            <polygon points="4,16 20,16 20,36 4,36" fill="#8B5CF6" stroke="#5B21B6" strokeWidth="2" />
            {/* 上面 */}
            <polygon points="4,16 16,4 32,4 20,16" fill="#A78BFA" stroke="#5B21B6" strokeWidth="2" />
            {/* 右側面 */}
            <polygon points="20,16 32,4 32,24 20,36" fill="#7C3AED" stroke="#5B21B6" strokeWidth="2" />
            {/* 謎の幾何学パターン */}
            <circle cx="12" cy="26" r="3" fill="#D8B4FE" />
          </g>
        );
      case 'sphere_ball': // 謎の球体
        return (
          <g>
            <defs>
              <radialGradient id="sphereGrad" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#2DD4BF" />
                <stop offset="50%" stopColor="#0D9488" />
                <stop offset="100%" stopColor="#115E59" />
              </radialGradient>
            </defs>
            {/* 球体 */}
            <circle cx="25" cy="25" r="20" fill="url(#sphereGrad)" stroke="#134E4A" strokeWidth="2.5" />
            {/* 表面のクレーターや細かい凹凸模様 */}
            <circle cx="18" cy="16" r="2.5" fill="#115E59" opacity="0.5" />
            <circle cx="32" cy="20" r="3.5" fill="#115E59" opacity="0.5" />
            <circle cx="22" cy="32" r="4" fill="#115E59" opacity="0.5" />
            <path d="M12,25 A 13 13 0 0 0 38,25" fill="none" stroke="#2DD4BF" strokeWidth="1.5" opacity="0.4" strokeDasharray="3,3" />
          </g>
        );
      case 'fish_head': // 魚の頭
        return (
          <g transform="translate(2, 4)">
            {/* 魚の頭 */}
            <path d="M42,22 C42,10 25,5 12,12 C5,16 2,24 5,30 C10,38 25,36 42,25" fill="#94A3B8" stroke="#475569" strokeWidth="2" />
            {/* エラ */}
            <path d="M28,10 Q22,20 28,30" fill="none" stroke="#334155" strokeWidth="2" />
            {/* 目 */}
            <circle cx="15" cy="18" r="4.5" fill="#FFFFFF" stroke="#334155" strokeWidth="1.5" />
            <circle cx="14" cy="18" r="2" fill="#000000" />
            {/* 口 */}
            <path d="M2,24 Q8,26 10,23" fill="none" stroke="#475569" strokeWidth="2" />
            {/* 飛び出た骨 */}
            <line x1="42" y1="22" x2="48" y2="18" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />
            <line x1="42" y1="24" x2="49" y2="25" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />
            <line x1="42" y1="25" x2="46" y2="30" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />
          </g>
        );
      case 'bone_real': // 本物の骨
        return (
          <g transform="translate(4, 10)">
            {/* 典型的な漫画風の骨デザイン */}
            <path
              d="M10,12 C6,12 4,6 10,4 C14,3 15,10 18,12 L32,12 C35,10 36,3 40,4 C46,6 44,12 40,12 C44,12 46,18 40,20 C36,21 35,14 32,12 L18,12 C15,14 14,21 10,20 C4,18 6,12 10,12 Z"
              fill="#F9FAFB"
              stroke="#9CA3AF"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* 立体的な影ライン */}
            <path d="M19,13 L31,13" stroke="#E5E7EB" strokeWidth="1.5" />
          </g>
        );
      case 'bone_plastic': // プラスチック製の骨
        return (
          <g transform="translate(4, 10)">
            {/* 本物そっくりだが少し人工的な色合い（やや黄緑/青みがかっているか、質感がプラスチック風） */}
            <path
              d="M10,12 C6,12 4,6 10,4 C14,3 15,10 18,12 L32,12 C35,10 36,3 40,4 C46,6 44,12 40,12 C44,12 46,18 40,20 C36,21 35,14 32,12 L18,12 C15,14 14,21 10,20 C4,18 6,12 10,12 Z"
              fill="#F0FDFA" // プラスチックらしい微かな光沢・青緑白
              stroke="#0D9488" // 青緑の境界線
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* プラスチックらしいハイライト・成形線 */}
            <path d="M19,13 L31,13" stroke="#2DD4BF" strokeWidth="1.5" />
            <circle cx="25" cy="12" r="1" fill="#0D9488" /> {/* パーティングライン（成型痕）を模した点 */}
          </g>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 50 50"
        width="100%"
        height="100%"
        className="overflow-visible"
        style={{
          // 裏表の回転を考慮した2D反転効果
          transform: isBackSide ? 'scaleX(-1)' : 'none',
          transition: 'transform 0.1s ease',
        }}
      >
        {renderBaseDebris()}
      </svg>

      {/* マークの描画 */}
      {showMark && markType !== 'none' && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: '40%',
            left: '40%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          {markType === 'burnable' ? (
            <BurnableMark size={size * 0.45} />
          ) : (
            <NonBurnableMark size={size * 0.45} />
          )}
        </div>
      )}
    </div>
  );
};
