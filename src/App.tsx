import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  Play,
  RotateCcw,
  Clock,
  CircleDollarSign,
  Info,
  Calendar,
  Sparkles,
  CheckCircle,
  XCircle,
  HelpCircle,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { DebrisItem, GameState, MarkType, BoxType } from './types';
import { createRandomDebris, getDebrisName } from './utils';
import { DebrisSvg, BurnableMark, NonBurnableMark } from './components/DebrisSvg';

export default function App() {
  // --- ゲームステート初期化 ---
  const [state, setState] = useState<GameState>({
    day: 1,
    isDay1Passed: false,
    money: 0,
    stageStatus: 'title',
    timeLeft: 60,
    debrisList: [],
    inspectingItem: null,
    inspectRotation: 0,
    correctCount: 0,
    missCount: 0,
    isFailedByDebrisOver: false,
    todayEarnings: 0,
  });

  // ドラッグ操作などのインタラクション用
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartRotation, setDragStartRotation] = useState(0);
  const [inspectDragOffset, setInspectDragOffset] = useState({ x: 0, y: 0 });
  const [activeBoxHover, setActiveBoxHover] = useState<BoxType | null>(null);

  // 音声効果（Web Audio APIを使用したシンセサイザー音）
  const audioContextRef = useRef<AudioContext | null>(null);

  const playSound = (type: 'spawn' | 'correct' | 'wrong' | 'click' | 'gameover' | 'success') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'spawn') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'correct') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'wrong') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.3);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'click') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        osc.frequency.setValueAtTime(783.99, now + 0.2);
        osc.frequency.setValueAtTime(1046.50, now + 0.3);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (type === 'gameover') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.8);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
        osc.start(now);
        osc.stop(now + 0.8);
      }
    } catch (e) {
      console.warn("Audio Context Error: ", e);
    }
  };

  // --- ゲームループ・タイマー関連 ---
  useEffect(() => {
    if (state.stageStatus !== 'playing' && state.stageStatus !== 'inspecting') return;

    const interval = setInterval(() => {
      setState((prev) => {
        if (prev.timeLeft <= 1) {
          clearInterval(interval);
          playSound('success');
          // タイムアップクリア！
          const earnings = prev.missCount >= 3 ? 0 : prev.correctCount * 90;
          return {
            ...prev,
            timeLeft: 0,
            stageStatus: 'result',
            money: prev.money + earnings,
            todayEarnings: earnings,
            isDay1Passed: prev.day === 1 ? true : prev.isDay1Passed,
            inspectingItem: null
          };
        }
        return {
          ...prev,
          timeLeft: prev.timeLeft - 1,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.stageStatus]);

  // --- 物理挙動（ゴミの落下と床への蓄積） ---
  useEffect(() => {
    if (state.stageStatus !== 'playing' && state.stageStatus !== 'inspecting') return;

    const floorY = 410; // ゴミが溜まる床のY座標
    const physicsInterval = setInterval(() => {
      setState((prev) => {
        const updatedList = prev.debrisList.map((item) => {
          // 選択（観察）中のアイテムは落下を一時停止
          if (prev.inspectingItem?.id === item.id) {
            return item;
          }

          let newY = item.y + item.vy;
          let newX = item.x + item.vx;
          let newRot = item.rotation + item.angularVelocity;
          let newVy = item.vy;
          let newVx = item.vx;

          // 簡易物理: 床に接触したらバウンド＆摩擦で静止
          if (newY >= floorY - item.size / 2) {
            newY = floorY - item.size / 2;
            newVy = 0;
            newVx = 0;
            item.angularVelocity = 0;
          }

          // 左右の壁バウンス（プレイエリア幅340pxに対応）
          if (newX < 10 || newX > 270) {
            newVx = -newVx;
          }

          return {
            ...item,
            x: newX,
            y: newY,
            vy: newVy,
            vx: newVx,
            rotation: newRot,
          };
        });

        // 30個以上蓄積したら強制失敗
        if (updatedList.length >= 30) {
          clearInterval(physicsInterval);
          playSound('gameover');
          return {
            ...prev,
            debrisList: updatedList,
            stageStatus: 'result',
            isFailedByDebrisOver: true,
            todayEarnings: 0, // 失敗は給料なし
            inspectingItem: null,
          };
        }

        return {
          ...prev,
          debrisList: updatedList,
        };
      });
    }, 1000 / 60); // 60FPS相当

    return () => clearInterval(physicsInterval);
  }, [state.stageStatus, state.inspectingItem]);

  // --- ゴミのスポーンロジック ---
  useEffect(() => {
    if (state.stageStatus !== 'playing' && state.stageStatus !== 'inspecting') return;

    // 残り時間に応じたスポーン頻度の計算
    // 60秒(初期) = 4.0秒間隔, 0秒 = 2.2秒間隔
    const calculateSpawnInterval = (timeLeft: number) => {
      const minInterval = 2200; // 2.2s
      const maxInterval = 4000; // 4.0s
      const progress = (60 - timeLeft) / 60; // 0 (開始) ~ 1 (終了)
      return maxInterval - progress * (maxInterval - minInterval);
    };

    let spawnTimer: NodeJS.Timeout;

    const triggerSpawn = () => {
      setState((prev) => {
        // 現在画面にあるゴミが30個未満であれば生成
        if (prev.debrisList.length < 30) {
          playSound('spawn');
          const newItem = createRandomDebris(prev.day, prev.isDay1Passed);
          return {
            ...prev,
            debrisList: [...prev.debrisList, newItem],
          };
        }
        return prev;
      });

      // 次のスポーンを動的間隔でスケジュール
      const nextInterval = calculateSpawnInterval(state.timeLeft);
      spawnTimer = setTimeout(triggerSpawn, nextInterval);
    };

    // 初回起動
    spawnTimer = setTimeout(triggerSpawn, 1000);

    return () => clearTimeout(spawnTimer);
  }, [state.stageStatus, state.timeLeft]);

  // --- ゲーム開始 ---
  const startGame = () => {
    playSound('click');
    setState((prev) => ({
      ...prev,
      stageStatus: 'playing',
      timeLeft: 60,
      debrisList: [],
      inspectingItem: null,
      correctCount: 0,
      missCount: 0,
      isFailedByDebrisOver: false,
      todayEarnings: 0,
    }));
  };

  // --- ゴミをクリックして観察 ---
  const handleSelectDebris = (item: DebrisItem) => {
    playSound('click');
    setState((prev) => ({
      ...prev,
      stageStatus: 'inspecting',
      inspectingItem: item,
      inspectRotation: 0, // 初期回転角
    }));
    setInspectDragOffset({ x: 0, y: 0 });
  };

  // --- 観察のキャンセル ---
  const handleCancelInspect = () => {
    playSound('click');
    setState((prev) => ({
      ...prev,
      stageStatus: 'playing',
      inspectingItem: null,
    }));
    setInspectDragOffset({ x: 0, y: 0 });
    setActiveBoxHover(null);
  };

  // --- 観察画面でのドラッグ回転/移動ロジック ---
  const handleInspectMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartRotation(state.inspectRotation);
  };

  const handleInspectMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !state.inspectingItem) return;

    // 横ドラッグによる回転角の更新
    const deltaX = e.clientX - dragStartX;
    const newRot = (dragStartRotation + deltaX * 1.5) % 360;
    
    setState((prev) => ({
      ...prev,
      inspectRotation: newRot < 0 ? newRot + 360 : newRot,
    }));

    // 縦横ドラッグによるドラッグ移動（分別ボックスへのD&D用）
    // 観察画面のコンテナ内での相対移動を少し許容
    const boundingBox = e.currentTarget.getBoundingClientRect();
    const relativeX = e.clientX - (boundingBox.left + boundingBox.width / 2);
    const relativeY = e.clientY - (boundingBox.top + boundingBox.height / 2);

    setInspectDragOffset({
      x: relativeX * 0.8,
      y: relativeY * 0.8,
    });

    // どの分別ボックスの上にドラッグされているかを判定
    // 簡易的にY座標とX座標からホバーしているボックスを判定
    const containerHeight = window.innerHeight;
    const clientY = e.clientY;
    const clientX = e.clientX;

    // ゲーム画面の下部（ボックスエリア）付近に到達したか
    if (clientY > containerHeight * 0.7) {
      const screenWidth = window.innerWidth;
      const isThreeBoxes = state.day === 2 && state.isDay1Passed;

      if (isThreeBoxes) {
        // 3つのボックスのホバー判定
        if (clientX < screenWidth * 0.43) {
          setActiveBoxHover('burnable');
        } else if (clientX > screenWidth * 0.57) {
          setActiveBoxHover('bone');
        } else {
          setActiveBoxHover('non_burnable');
        }
      } else {
        // 2つのボックスのホバー判定
        if (clientX < screenWidth * 0.5) {
          setActiveBoxHover('burnable');
        } else {
          setActiveBoxHover('non_burnable');
        }
      }
    } else {
      setActiveBoxHover(null);
    }
  };

  const handleInspectMouseUp = () => {
    setIsDragging(false);
    if (activeBoxHover) {
      // ホバーしていたボックスにドロップ
      handleClassify(activeBoxHover);
    } else {
      // どこにもドロップされなかったら位置をリセット
      setInspectDragOffset({ x: 0, y: 0 });
    }
  };

  // --- 分別実行ロジック ---
  const handleClassify = (box: BoxType) => {
    const item = state.inspectingItem;
    if (!item) return;

    // 正判定基準
    let isCorrect = false;

    if (item.type === 'bone_real') {
      isCorrect = box === 'bone';
    } else if (item.type === 'bone_plastic') {
      isCorrect = box === 'non_burnable'; // プラスチック骨は燃えないゴミ
    } else {
      // 一般ゴミのマーク判定
      if (item.markType === 'burnable') {
        isCorrect = box === 'burnable';
      } else if (item.markType === 'non_burnable') {
        isCorrect = box === 'non_burnable';
      }
    }

    if (isCorrect) {
      playSound('correct');
    } else {
      playSound('wrong');
    }

    setState((prev) => {
      const nextDebrisList = prev.debrisList.filter((d) => d.id !== item.id);
      return {
        ...prev,
        correctCount: prev.correctCount + (isCorrect ? 1 : 0),
        missCount: prev.missCount + (isCorrect ? 0 : 1),
        debrisList: nextDebrisList,
        stageStatus: 'playing',
        inspectingItem: null,
      };
    });

    setInspectDragOffset({ x: 0, y: 0 });
    setActiveBoxHover(null);
  };

  // --- 日数移行処理（リザルト画面での次へ） ---
  const handleNextDay = () => {
    playSound('click');
    if (state.day === 1) {
      if (state.isFailedByDebrisOver) {
        // 1日目クリア失敗：2日目へ進むが、ルールは1日目と同じ（骨なし、2ボックス）
        setState((prev) => ({
          ...prev,
          day: 2,
          isDay1Passed: false,
          stageStatus: 'playing',
          timeLeft: 180,
          debrisList: [],
          correctCount: 0,
          missCount: 0,
          isFailedByDebrisOver: false,
          todayEarnings: 0,
        }));
      } else {
        // 1日目クリア成功：2日目は骨追加
        setState((prev) => ({
          ...prev,
          day: 2,
          isDay1Passed: true,
          stageStatus: 'playing',
          timeLeft: 180,
          debrisList: [],
          correctCount: 0,
          missCount: 0,
          isFailedByDebrisOver: false,
          todayEarnings: 0,
        }));
      }
    } else {
      // 2日目の終了時：生活費の支払判定
      if (state.money >= 50) {
        // 支払い成功！ハッピーエンディングへ
        setState((prev) => ({
          ...prev,
          money: prev.money - 50,
          stageStatus: 'ending',
        }));
      } else {
        // 支払い失敗、ゲームオーバー
        playSound('gameover');
        setState((prev) => ({
          ...prev,
          stageStatus: 'gameover',
        }));
      }
    }
  };

  // --- ゲームの最初からやり直し ---
  const handleRestartAll = () => {
    playSound('click');
    setState({
      day: 1,
      isDay1Passed: false,
      money: 0,
      stageStatus: 'title',
      timeLeft: 60,
      debrisList: [],
      inspectingItem: null,
      inspectRotation: 0,
      correctCount: 0,
      missCount: 0,
      isFailedByDebrisOver: false,
      todayEarnings: 0,
    });
  };

  // Y軸の回転角度から、表（0~90度, 270~360度）か裏（90~270度）かを判定
  const isBackSide = state.inspectRotation > 90 && state.inspectRotation < 270;

  // 観察アイテムがマークを表示すべき状態かどうか
  // マークは片面だけに配置される
  const shouldShowMark = state.inspectingItem
    ? (state.inspectingItem.hasMarkOnFront && !isBackSide) ||
      (!state.inspectingItem.hasMarkOnFront && isBackSide)
    : false;

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 font-sans text-zinc-100 overflow-hidden select-none">
      {/* ゲーム筐体風のシングル画面コンテナ */}
      <div id="game-frame" className="relative w-full max-w-[620px] h-[680px] bg-zinc-900 border-4 border-zinc-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* ヘッダー・ステータスバー */}
        <header className="h-14 border-b border-zinc-800 bg-zinc-950/80 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="font-mono text-sm tracking-widest font-bold text-zinc-300">
              WASTE SORTING SYSTEM v1.2
            </h1>
          </div>
          
          {/* 日付・所持金・制限時間 */}
          <div className="flex items-center gap-6 font-mono text-xs text-zinc-400">
            <div className="flex items-center gap-1.5 bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800">
              <Calendar className="w-4.5 h-4.5 text-indigo-400" />
              <span>DAY: <strong className="text-zinc-100 text-sm">{state.day}</strong></span>
            </div>

            <div className="flex items-center gap-1.5 bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800">
              <CircleDollarSign className="w-4.5 h-4.5 text-yellow-500" />
              <span>FUNDS: <strong className="text-yellow-400 text-sm">{state.money}</strong> M</span>
            </div>

            {(state.stageStatus === 'playing' || state.stageStatus === 'inspecting') && (
              <div className="flex items-center gap-1.5 bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800">
                <Clock className="w-4.5 h-4.5 text-rose-400" />
                <span>TIME: <strong className="text-rose-400 text-sm">{state.timeLeft}s</strong></span>
              </div>
            )}
          </div>
        </header>

        {/* 画面コンテンツ分岐 */}
        <main className="flex-1 relative flex flex-col bg-zinc-950">
          <AnimatePresence mode="wait">
            
            {/* 1. タイトル画面 */}
            {state.stageStatus === 'title' && (
              <motion.div
                key="title"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-zinc-950"
              >
                <div className="text-center max-w-xl">
                  <div className="inline-flex items-center gap-2 bg-indigo-950/40 border border-indigo-800/60 px-3 py-1 rounded-full text-indigo-400 font-mono text-xs mb-4">
                    <Sparkles className="w-4 h-4" /> 2D PUZZLE SIMULATOR
                  </div>
                  <h2 className="text-4xl font-extrabold tracking-tight text-white mb-3">
                    ゴミ判別労働ゲーム
                  </h2>
                  <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                    上から降ってくるゴミを、マークを頼りに「燃える」「燃えない」「骨」に仕分ける、一日の生活費を稼ぐパズルシミュレーターです。
                  </p>

                  <button
                    onClick={startGame}
                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl transition text-sm font-mono shadow-lg shadow-indigo-600/20"
                  >
                    労働を開始する <Play className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {(state.stageStatus === 'playing' || state.stageStatus === 'inspecting') && (
              <motion.div
                key="game-stage"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col justify-between animate-fade-in"
              >
                {/* 2.1 メインコンテンツエリア：左右分割の2カラム構成（被り防止） */}
                <div className="relative flex-1 flex bg-gradient-to-b from-zinc-950 to-zinc-900/50 overflow-hidden border-b border-zinc-800">
                  
                  {/* 2.1.1 左側：ゲームエリア (ゴミの落下) */}
                  <div className="relative w-[360px] h-full p-4 overflow-hidden bg-zinc-950/30 border-r border-zinc-800">
                    
                    {/* 天井ハッチ */}
                    <div className="absolute top-0 left-0 right-0 h-4 bg-zinc-900 border-b border-zinc-800 flex justify-around">
                      <div className="w-16 h-full bg-zinc-950 border-x border-zinc-800" />
                      <div className="w-16 h-full bg-zinc-950 border-x border-zinc-800" />
                      <div className="w-16 h-full bg-zinc-950 border-x border-zinc-800" />
                    </div>

                    {/* 落ちているゴミの描画 */}
                    <div className="w-full h-full relative">
                      {state.debrisList.map((item) => (
                        <div
                          id={`debris-${item.id}`}
                          key={item.id}
                          onClick={() => handleSelectDebris(item)}
                          className={`absolute cursor-pointer select-none transition-shadow hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] ${
                            state.inspectingItem?.id === item.id ? 'opacity-20' : 'opacity-100'
                          }`}
                          style={{
                            left: `${item.x}px`,
                            top: `${item.y}px`,
                            transform: `rotate(${item.rotation}deg)`,
                            width: `${item.size}px`,
                            height: `${item.size}px`,
                          }}
                        >
                          <DebrisSvg type={item.type} size={item.size} />
                        </div>
                      ))}
                    </div>

                    {/* 床ラインデコレーション */}
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-700" />
                  </div>

                  {/* 2.1.2 右側：情報・見本サイドバー (ゴミが落ちてこないエリア) */}
                  <div className="flex-1 bg-zinc-900/90 p-3.5 flex flex-col gap-3 overflow-y-auto">
                    
                    {/* 警告メーター */}
                    <div className="flex flex-col gap-3 font-mono text-xs">
                      {/* ミス回数 */}
                      <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800/80">
                        <div className="text-zinc-400 font-bold mb-2 flex justify-between items-center">
                          <span>ミス回数:</span>
                          <span className={`${state.missCount >= 3 ? 'text-red-400 font-bold animate-pulse' : 'text-zinc-500'}`}>
                            {state.missCount} / 3
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {[1, 2, 3].map((idx) => (
                            <div
                              key={idx}
                              className={`flex-1 h-5 rounded-md border flex items-center justify-center transition-all ${
                                idx <= state.missCount
                                  ? 'bg-red-500/20 border-red-500 text-red-400 shadow-inner'
                                  : 'bg-zinc-800/50 border-zinc-700/60 text-zinc-600'
                              }`}
                            >
                              <span className="text-[10px] font-bold">{idx <= state.missCount ? '✖' : idx}</span>
                            </div>
                          ))}
                        </div>
                        {state.missCount >= 3 && (
                          <div className="text-[10px] text-red-400 font-bold mt-2 text-center bg-red-950/40 py-1 rounded border border-red-900/30 animate-pulse">
                            給料0確定ペナルティ！
                          </div>
                        )}
                      </div>

                      {/* ゴミ蓄積 */}
                      <div className={`p-3 rounded-xl border transition-all ${
                        state.debrisList.length >= 24
                          ? 'bg-red-950/40 border-red-800/80 text-red-400 animate-pulse'
                          : 'bg-zinc-950/80 border-zinc-800/80 text-zinc-400'
                      }`}>
                        <div className="flex justify-between items-center mb-1.5 font-bold">
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> ゴミ蓄積
                          </span>
                          <span>{state.debrisList.length} / 30</span>
                        </div>
                        <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              state.debrisList.length >= 24 ? 'bg-red-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, (state.debrisList.length / 30) * 100)}%` }}
                          />
                        </div>
                        {state.debrisList.length >= 24 && (
                          <div className="text-[9px] text-red-400 font-bold mt-1.5 text-center">
                            満杯警報！30個で即終了！
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 分別マーク見本 */}
                    <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3.5 shadow-lg font-mono text-[10px] flex-1 flex flex-col">
                      <div className="flex items-center gap-1.5 text-zinc-300 border-b border-zinc-800/80 pb-2 mb-3 uppercase font-semibold tracking-wider">
                        <Info className="w-3.5 h-3.5 text-indigo-400 animate-bounce" /> 分別マーク見本
                      </div>
                      <div className="space-y-3 flex-1">
                        <div className="flex items-start gap-2.5 text-zinc-300 bg-zinc-900/40 p-2 rounded-lg border border-zinc-800/40">
                          <div className="bg-zinc-950 p-1.5 rounded-md border border-zinc-800 flex-shrink-0">
                            <BurnableMark size={18} />
                          </div>
                          <div>
                            <div className="font-bold text-red-400 text-xs">燃えるゴミ</div>
                            <div className="text-[9px] text-zinc-500 mt-0.5">紙くず、りんごの芯、魚の頭、新聞紙など</div>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-2.5 text-zinc-300 bg-zinc-900/40 p-2 rounded-lg border border-zinc-800/40">
                          <div className="bg-zinc-950 p-1.5 rounded-md border border-zinc-800 flex-shrink-0">
                            <NonBurnableMark size={18} />
                          </div>
                          <div>
                            <div className="font-bold text-blue-400 text-xs">燃えないゴミ</div>
                            <div className="text-[9px] text-zinc-500 mt-0.5">プラ、ペットボトル、お菓子袋など</div>
                          </div>
                        </div>

                        {state.day === 2 && state.isDay1Passed && (
                          <div className="border-t border-zinc-800/80 pt-3 mt-3 bg-zinc-950/40 p-2 rounded-lg border border-zinc-800/40">
                            <div className="text-[10px] text-yellow-500 font-bold uppercase mb-1.5 flex items-center gap-1">
                              <span>🦴</span> 骨の追加分別ルール
                            </div>
                            <div className="text-[9px] text-zinc-400 leading-normal space-y-1">
                              <div>• <strong className="text-zinc-200">本物の骨</strong>: <span className="text-zinc-400">マークなし</span> → <strong className="text-zinc-300">骨箱へ</strong></div>
                              <div>• <strong className="text-zinc-200">プラ骨</strong>: <span className="text-zinc-400">燃えないマーク</span> → <strong className="text-blue-400">燃えない箱へ</strong></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>

                {/* 2.3 下部分別ボックスエリア（プレイ時・観察時ともに表示） */}
                <div className="h-28 bg-zinc-950 p-3 px-4 flex items-center justify-around gap-2.5 border-t border-zinc-800">
                  
                  {/* ボックス1: 燃えるゴミ */}
                  <div
                    id="box-burnable"
                    onClick={() => state.inspectingItem && handleClassify('burnable')}
                    className={`flex-1 h-full rounded-xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer ${
                      activeBoxHover === 'burnable'
                        ? 'bg-red-950/60 border-red-500 text-red-200 scale-[1.03]'
                        : 'bg-red-950/20 border-red-900/60 text-red-400/80 hover:bg-red-950/30'
                    }`}
                  >
                    <BurnableMark size={28} className="mb-1" />
                    <span className="font-bold text-xs">燃えるゴミ箱</span>
                    <span className="text-[9px] text-red-500/80 font-mono mt-0.5">BURNABLE</span>
                  </div>

                  {/* ボックス2: 燃えないゴミ */}
                  <div
                    id="box-non-burnable"
                    onClick={() => state.inspectingItem && handleClassify('non_burnable')}
                    className={`flex-1 h-full rounded-xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer ${
                      activeBoxHover === 'non_burnable'
                        ? 'bg-blue-950/60 border-blue-500 text-blue-200 scale-[1.03]'
                        : 'bg-blue-950/20 border-blue-900/60 text-blue-400/80 hover:bg-blue-950/30'
                    }`}
                  >
                    <NonBurnableMark size={28} className="mb-1" />
                    <span className="font-bold text-xs">燃えないゴミ箱</span>
                    <span className="text-[9px] text-blue-500/80 font-mono mt-0.5">NON-BURNABLE</span>
                  </div>

                  {/* ボックス3: 骨ボックス（2日目・1日目成功時のみ） */}
                  {state.day === 2 && state.isDay1Passed && (
                    <div
                      id="box-bone"
                      onClick={() => state.inspectingItem && handleClassify('bone')}
                      className={`flex-1 h-full rounded-xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer ${
                        activeBoxHover === 'bone'
                          ? 'bg-zinc-800 border-zinc-400 text-zinc-100 scale-[1.03]'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800/80'
                      }`}
                    >
                      <div className="text-zinc-300 font-bold text-lg mb-1 leading-none">🦴</div>
                      <span className="font-bold text-xs text-zinc-300">骨ボックス</span>
                      <span className="text-[9px] text-zinc-500 font-mono mt-0.5">BONES ONLY</span>
                    </div>
                  )}
                </div>

                {/* 2.4 観察用オーバーレイ画面 */}
                <AnimatePresence>
                  {state.stageStatus === 'inspecting' && state.inspectingItem && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-30 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-between p-6"
                      onClick={handleCancelInspect} // 画面外クリックでキャンセル
                    >
                      {/* 上部ヘッダー */}
                      <div className="w-full flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-zinc-900/80 border border-zinc-800 px-3 py-1.5 rounded-lg">
                          <span className="text-xs text-zinc-500 font-mono mr-1.5">名称:</span>
                          <span className="text-sm font-bold text-white">{getDebrisName(state.inspectingItem.type)}</span>
                        </div>

                        <button
                          onClick={handleCancelInspect}
                          className="text-xs text-zinc-400 hover:text-white bg-zinc-950 hover:bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800 transition"
                        >
                          観察をやめる (戻す)
                        </button>
                      </div>

                      {/* 中央のゴミ表示・回転ドラッグエリア */}
                      <div
                        className="relative w-72 h-72 flex items-center justify-center border border-dashed border-zinc-800 bg-zinc-950/40 rounded-full cursor-grab active:cursor-grabbing"
                        onMouseDown={handleInspectMouseDown}
                        onMouseMove={handleInspectMouseMove}
                        onMouseUp={handleInspectMouseUp}
                        onMouseLeave={handleInspectMouseUp}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          transform: `translate(${inspectDragOffset.x}px, ${inspectDragOffset.y}px)`,
                          transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      >
                        {/* ドロップホバー時エフェクト */}
                        {activeBoxHover && (
                          <div className="absolute inset-0 rounded-full border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 animate-pulse" />
                        )}

                        <div
                          className="relative pointer-events-none"
                          style={{
                            transform: `rotateY(${state.inspectRotation}deg)`,
                            transformStyle: 'preserve-3d',
                          }}
                        >
                          <DebrisSvg
                            type={state.inspectingItem.type}
                            size={160}
                            showMark={shouldShowMark}
                            markType={state.inspectingItem.markType}
                            isBackSide={isBackSide}
                          />
                        </div>

                        {/* 手がかりアシストテキスト */}
                        <div className="absolute bottom-4 text-center font-mono text-[10px] text-zinc-500 select-none">
                          【左右にドラッグして裏表を回転・観察】
                        </div>
                      </div>

                      {/* 下部クイック仕分けボタン */}
                      <div
                        className="w-full max-w-md flex flex-col items-center gap-2 bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800/80"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">
                          クイック分別ボタン
                        </span>
                        <div className="flex w-full gap-2.5">
                          <button
                            onClick={() => handleClassify('burnable')}
                            className="flex-1 bg-red-950/60 hover:bg-red-950 text-red-300 border border-red-900/80 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
                          >
                            <BurnableMark size={14} /> 燃えるゴミ
                          </button>
                          <button
                            onClick={() => handleClassify('non_burnable')}
                            className="flex-1 bg-blue-950/60 hover:bg-blue-950 text-blue-300 border border-blue-900/80 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
                          >
                            <NonBurnableMark size={14} /> 燃えないゴミ
                          </button>
                          {state.day === 2 && state.isDay1Passed && (
                            <button
                              onClick={() => handleClassify('bone')}
                              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
                            >
                              🦴 骨
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* 3. デイリーリザルト画面 */}
            {state.stageStatus === 'result' && (
              <motion.div
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-zinc-950"
              >
                <div className="w-full max-w-md border border-zinc-800 bg-zinc-900/40 rounded-2xl p-6 text-center shadow-lg">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full font-mono text-xs text-zinc-400 mb-4">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" /> DAY {state.day} リザルト
                  </div>

                  {state.isFailedByDebrisOver ? (
                    <div className="mb-6">
                      <div className="inline-flex p-3 bg-red-950/40 border border-red-800/80 rounded-full text-red-500 mb-2">
                        <AlertTriangle className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-bold text-red-400 mb-1">
                        クリア失敗 (ゴミ過剰蓄積)
                      </h3>
                      <p className="text-zinc-500 text-xs leading-relaxed px-4">
                        画面内にゴミが 30 個以上溜まり、処理限界を超えてしまいました。本日分の給料は支払われません。
                      </p>
                    </div>
                  ) : (
                    <div className="mb-6">
                      <div className="inline-flex p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-full text-emerald-500 mb-2">
                        <CheckCircle className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-bold text-emerald-400 mb-1">
                        DAY {state.day} 労働完了!
                      </h3>
                      <p className="text-zinc-500 text-xs">
                        制限時間 1 分間を生き延びました。
                      </p>
                    </div>
                  )}

                  {/* 詳細明細 */}
                  <div className="border-t border-b border-zinc-800/80 py-4 mb-6 space-y-2.5 font-mono text-xs text-left">
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>分別成功数:</span>
                      <span className="text-zinc-200 font-bold">{state.correctCount} 個</span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>分別ミス数:</span>
                      <span className={`font-bold ${state.missCount >= 3 ? 'text-red-400' : 'text-zinc-200'}`}>
                        {state.missCount} / 3 回
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t border-zinc-900 pt-2.5 text-zinc-300">
                      <span className="font-bold">本日支給される給料:</span>
                      <span className="text-yellow-400 font-extrabold text-sm">
                        {state.todayEarnings} M
                      </span>
                    </div>
                    {state.missCount >= 3 && !state.isFailedByDebrisOver && (
                      <div className="text-[10px] text-red-400/80 leading-relaxed pt-1 flex items-start gap-1">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>3回以上の誤判定ペナルティが適用され、給料が支給されませんでした。</span>
                      </div>
                    )}
                  </div>

                  {/* ステージ進行アナウンス */}
                  <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800/60 mb-6 text-left">
                    <h4 className="text-[10px] font-mono font-bold uppercase text-zinc-400 mb-1">【翌日の予定】</h4>
                    {state.day === 1 ? (
                      state.isFailedByDebrisOver ? (
                        <p className="text-xs text-zinc-400 leading-normal">
                          1日目をクリアできなかったため、2日目も<strong>「1日目と同じ条件 (分別ボックス2個、骨なし)」</strong>のまま再調整となります。
                        </p>
                      ) : (
                        <p className="text-xs text-zinc-400 leading-normal">
                          分別大成功！2日目から<strong>「骨ボックス」と「骨」のゴミが追加</strong>されます。プラスチック製の骨には燃えないゴミのマークがあり、仕分けルールが複雑化します。
                        </p>
                      )
                    ) : (
                      <p className="text-xs text-zinc-400 leading-normal">
                        全労働期間が終了しました。これまでに稼いだ給料から、生活費 <strong>50 M</strong> を支払います。
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleNextDay}
                    className="w-full inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition text-xs font-mono"
                  >
                    {state.day === 1 ? '次の日に進む' : '生活費の支払い判定へ'} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* 4. ゲームオーバー画面 */}
            {state.stageStatus === 'gameover' && (
              <motion.div
                key="gameover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-zinc-950"
              >
                <div className="text-center max-w-md">
                  <div className="inline-flex p-4 bg-red-950/50 border border-red-800/80 rounded-full text-red-500 mb-4">
                    <XCircle className="w-12 h-12" />
                  </div>
                  <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">
                    GAME OVER
                  </h2>
                  <h3 className="text-lg font-mono font-bold text-red-400 mb-4 uppercase">
                    生活費不足による破産
                  </h3>
                  <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                    2日間の重労働を終えましたが、所持金が生活費 <strong>50 M</strong> に達しませんでした。あなたは宿舎から追い出されてしまいました。
                  </p>

                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-8 font-mono text-xs text-left space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">あなたの所持金:</span>
                      <span className="text-red-400 font-bold">{state.money} M</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">必要な生活費:</span>
                      <span className="text-zinc-300 font-bold">50 M</span>
                    </div>
                  </div>

                  <button
                    onClick={handleRestartAll}
                    className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-8 py-3.5 rounded-xl transition font-mono text-sm"
                  >
                    再挑戦する <RotateCcw className="w-4.5 h-4.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* 5. ハッピーエンディング画面 */}
            {state.stageStatus === 'ending' && (
              <motion.div
                key="ending"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-zinc-950"
              >
                <div className="text-center max-w-md">
                  <div className="inline-flex p-4 bg-emerald-950/50 border border-emerald-800/80 rounded-full text-emerald-500 mb-4">
                    <Sparkles className="w-12 h-12" />
                  </div>
                  <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">
                    GAME CLEAR!
                  </h2>
                  <h3 className="text-lg font-mono font-bold text-emerald-400 mb-4 uppercase">
                    生活費の支払いに成功
                  </h3>
                  <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                    おめでとうございます！あなたは見事に分別労働をこなし、期日までに生活費 <strong>50 M</strong> を支払うことができました。
                  </p>

                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-8 font-mono text-xs text-left space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">支払った生活費:</span>
                      <span className="text-zinc-300 font-bold">50 M</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">手元に残った残高:</span>
                      <span className="text-emerald-400 font-bold">{state.money} M</span>
                    </div>
                  </div>

                  <button
                    onClick={handleRestartAll}
                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-3.5 rounded-xl transition font-mono text-sm shadow-lg shadow-indigo-900/30"
                  >
                    もう一度プレイする <RotateCcw className="w-4.5 h-4.5" />
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
        
        {/* フッター */}
        <footer className="h-8 border-t border-zinc-800 bg-zinc-950 px-4 flex items-center justify-center">
          <span className="font-mono text-[9px] text-zinc-500">
            DRAG TO ROTATE DEBRIS | SORT ACCORDING TO MARKS
          </span>
        </footer>
      </div>
    </div>
  );
}
