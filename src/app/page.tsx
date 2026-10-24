"use client";

import { useEffect, useRef, useCallback, useState } from "react";

/* ───────── 音效系统 ───────── */
class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private bgmGainNode: GainNode | null = null;
  private bgmOscillators: OscillatorNode[] = [];
  private bgmPlaying: boolean = false;
  private bgmInterval: number | null = null;

  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.bgmGainNode = this.audioContext.createGain();
      this.bgmGainNode.connect(this.audioContext.destination);
      this.bgmGainNode.gain.value = 0.15; // 背景音乐音量较低
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopBGM();
    } else if (this.bgmPlaying) {
      this.playBGM();
    }
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
    if (!this.enabled || !this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  // 背景音乐 - 简单循环旋律
  playBGM() {
    if (!this.enabled || !this.audioContext || !this.bgmGainNode || this.bgmInterval !== null) return;

    this.bgmPlaying = true;
    
    // 简单的旋律音符序列 (频率, 持续时间)
    const melody: [number, number][] = [
      [262, 0.5], // C4
      [294, 0.5], // D4
      [330, 0.5], // E4
      [349, 0.5], // F4
      [392, 0.5], // G4
      [440, 0.5], // A4
      [494, 0.5], // B4
      [523, 0.5], // C5
      [494, 0.5], // B4
      [440, 0.5], // A4
      [392, 0.5], // G4
      [349, 0.5], // F4
      [330, 0.5], // E4
      [294, 0.5], // D4
      [262, 1.0], // C4 (长音)
    ];

    let noteIndex = 0;
    
    const playNextNote = () => {
      if (!this.enabled || !this.audioContext || !this.bgmGainNode) return;

      const [freq, dur] = melody[noteIndex];
      
      const oscillator = this.audioContext.createOscillator();
      oscillator.connect(this.bgmGainNode);
      
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      
      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + dur * 0.9);
      
      this.bgmOscillators.push(oscillator);
      
      // 清理已停止的振荡器
      setTimeout(() => {
        const idx = this.bgmOscillators.indexOf(oscillator);
        if (idx > -1) {
          this.bgmOscillators.splice(idx, 1);
        }
      }, dur * 1000);
      
      noteIndex = (noteIndex + 1) % melody.length;
    };

    // 立即播放第一个音符
    playNextNote();
    
    // 每500ms播放下一个音符
    this.bgmInterval = window.setInterval(playNextNote, 500);
  }

  stopBGM() {
    this.bgmPlaying = false;
    
    if (this.bgmInterval !== null) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    
    // 停止所有正在播放的背景音乐振荡器
    for (const osc of this.bgmOscillators) {
      try {
        osc.stop();
      } catch (e) {
        // 忽略已停止的振荡器
      }
    }
    this.bgmOscillators = [];
  }

  // 攻击音效
  playAttack() {
    this.playTone(800, 0.1, 'square', 0.2);
  }

  // 受伤音效
  playHurt() {
    this.playTone(200, 0.2, 'sawtooth', 0.3);
  }

  // 升级音效
  playUpgrade() {
    this.playTone(400, 0.1, 'sine', 0.3);
    setTimeout(() => this.playTone(600, 0.1, 'sine', 0.3), 100);
    setTimeout(() => this.playTone(800, 0.15, 'sine', 0.3), 200);
  }

  // 答题正确
  playCorrect() {
    this.playTone(523, 0.1, 'sine', 0.3);
    setTimeout(() => this.playTone(659, 0.1, 'sine', 0.3), 100);
    setTimeout(() => this.playTone(784, 0.15, 'sine', 0.3), 200);
  }

  // 答题错误
  playWrong() {
    this.playTone(300, 0.15, 'sawtooth', 0.3);
    setTimeout(() => this.playTone(200, 0.2, 'sawtooth', 0.3), 150);
  }

  // 怪物死亡
  playMonsterDeath() {
    this.playTone(400, 0.15, 'square', 0.2);
  }

  // 收集资源
  playCollect() {
    this.playTone(1000, 0.08, 'sine', 0.2);
  }

  // BOSS出现
  playBossAppear() {
    this.playTone(150, 0.3, 'sawtooth', 0.4);
    setTimeout(() => this.playTone(100, 0.4, 'sawtooth', 0.4), 300);
  }

  // 游戏结束
  playGameOver() {
    this.playTone(400, 0.3, 'sine', 0.3);
    setTimeout(() => this.playTone(300, 0.3, 'sine', 0.3), 300);
    setTimeout(() => this.playTone(200, 0.5, 'sine', 0.3), 600);
    this.stopBGM();
  }
}

const soundManager = new SoundManager();

/* ───────── 类型定义 ───────── */
interface Vec2 {
  x: number;
  y: number;
}

interface Entity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  speed: number;
  attack: number;
  radius: number;
  mass: number;
}

interface Player extends Entity {
  attackCooldown: number;
  rangedCooldown: number;
}

interface Monster extends Entity {
  tier: number;
  attackCooldown: number;
  dying: boolean;
  deathTimer: number;
  hitFlash: number;
  mathQuestion?: string;
  mathAnswer?: number;
  isBoss?: boolean;
  summonCooldown?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface DamageText {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  life: number;
  radius: number;
  pierceLeft: number;
  hitSet: Set<Monster>;
  isCrit: boolean;
}

interface Resource {
  x: number;
  y: number;
  life: number;
  bobPhase: number;
}

interface Coin {
  x: number;
  y: number;
  life: number;
  value: number;
  bobPhase: number;
}

interface PlayerStats {
  critRate: number;
  critMultiplier: number;
  bulletCount: number;
  pierceCount: number;
  resourceCount: number;
  totalResources: number;
  pickupRangeMultiplier: number;
  speedMultiplier: number;
}

type GameMode = "menu" | "geometry" | "math";

/* ───────── 常量 ───────── */
const PLAYER_HP = 1000;
const PLAYER_SPEED = 120;
const PLAYER_ATTACK = 20;
const PLAYER_RADIUS = 18;
const PLAYER_ATTACK_RANGE = 90;
const PLAYER_ATTACK_CD = 0.4;
const PLAYER_MASS = 1.0;

const RANGED_ATTACK_RANGE = 420;
const RANGED_ATTACK_CD = 0.6;
const RANGED_DAMAGE = 20;
const PROJECTILE_SPEED = 400;
const PROJECTILE_RADIUS = 5;

const RESOURCE_PICKUP_RANGE = 50;
const RESOURCES_PER_UPGRADE = 20;

const FRICTION = 0.85;
const KNOCKBACK_FORCE = 150;

const MONSTER_DEFS: {
  tier: number;
  attack: number;
  hp: number;
  speed: number;
  radius: number;
  attackCd: number;
  mass: number;
}[] = [
  { tier: 1, attack: 5, hp: 50, speed: 75, radius: 14, attackCd: 1.0, mass: 0.8 },
  { tier: 2, attack: 10, hp: 70, speed: 45, radius: 18, attackCd: 1.0, mass: 1.2 },
  { tier: 3, attack: 40, hp: 100, speed: 30, radius: 22, attackCd: 1.2, mass: 1.5 },
  { tier: 4, attack: 70, hp: 70, speed: 15, radius: 26, attackCd: 1.5, mass: 2.0 },
  { tier: 5, attack: 100, hp: 112, speed: 11.99985, radius: 30, attackCd: 2.0, mass: 2.5 },
  { tier: 6, attack: 100, hp: 500, speed: 22.5, radius: 40, attackCd: 2.5, mass: 5.0 },
];

const SPAWN_INTERVAL = 2.0;
const MAX_MONSTERS = 30;

/* ───────── 辅助函数 ───────── */
function dist(a: Vec2, b: Vec2) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function generateMathQuestion(tier: number): { question: string; answer: number } {
  const ops = ["+", "-", "×", "÷"];
  let a: number, b: number, op: string, answer: number;

  if (tier <= 2) {
    // 简单加减
    a = Math.floor(Math.random() * 20) + 1;
    b = Math.floor(Math.random() * 20) + 1;
    op = Math.random() > 0.5 ? "+" : "-";
    answer = op === "+" ? a + b : a - b;
  } else if (tier <= 4) {
    // 加减乘
    a = Math.floor(Math.random() * 12) + 2;
    b = Math.floor(Math.random() * 12) + 2;
    const opIdx = Math.floor(Math.random() * 3);
    op = ops[opIdx];
    if (op === "+") answer = a + b;
    else if (op === "-") answer = a - b;
    else answer = a * b;
  } else {
    // 四则运算
    a = Math.floor(Math.random() * 15) + 2;
    b = Math.floor(Math.random() * 12) + 2;
    const opIdx = Math.floor(Math.random() * 4);
    op = ops[opIdx];
    if (op === "+") answer = a + b;
    else if (op === "-") answer = a - b;
    else if (op === "×") answer = a * b;
    else {
      // 除法保证整除
      answer = Math.floor(Math.random() * 10) + 1;
      a = answer * b;
    }
  }

  return { question: `${a} ${op} ${b} = ?`, answer };
}

function drawTriangle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  glow: boolean
) {
  ctx.save();
  if (glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
  }
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const angle = (Math.PI * 2 * i) / 3 - Math.PI / 2;
    const px = x + r * Math.cos(angle);
    const py = y + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawHexagon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  glow: boolean
) {
  ctx.save();
  if (glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
  }
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
    const px = x + r * Math.cos(angle);
    const py = y + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawHealthBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  hp: number,
  maxHp: number,
  color: string
) {
  const ratio = clamp(hp / maxHp, 0, 1);
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(x - w / 2, y, w, 5);
  ctx.fillStyle = color;
  ctx.fillRect(x - w / 2, y, w * ratio, 5);
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x - w / 2, y, w, 5);
}

/* ───────── 升级选项定义 ───────── */
interface UpgradeOption {
  id: string;
  title: string;
  desc: string;
  icon: string;
  available: boolean;
  apply: (stats: PlayerStats, player: Player) => void;
}

function getUpgradeOptions(stats: PlayerStats, player: Player): UpgradeOption[] {
  return [
    {
      id: "hp",
      title: "生命强化",
      desc: `+200 最大生命值（当前 ${player.maxHp}）`,
      icon: "❤️",
      available: true,
      apply: (s, p) => {
        p.maxHp += 200;
        p.hp = Math.min(p.hp + 200, p.maxHp);
      },
    },
    {
      id: "crit",
      title: "暴击精通",
      desc:
        stats.critRate >= 90
          ? `暴击倍率 +5%（当前 ${(stats.critMultiplier * 100).toFixed(0)}%）`
          : `暴击率 +10%（当前 ${stats.critRate.toFixed(0)}%）`,
      icon: "⚡",
      available: true,
      apply: (s) => {
        if (s.critRate >= 90) {
          s.critMultiplier += 0.05;
        } else {
          s.critRate = Math.min(s.critRate + 10, 100);
        }
      },
    },
    {
      id: "bullet",
      title: "多重射击",
      desc:
        stats.bulletCount >= 5
          ? "已达上限（5 颗）"
          : `子弹数 +1（当前 ${stats.bulletCount} 颗）`,
      icon: "🔫",
      available: stats.bulletCount < 5,
      apply: (s) => {
        if (s.bulletCount < 5) s.bulletCount += 1;
      },
    },
    {
      id: "pierce",
      title: "穿透弹头",
      desc:
        stats.pierceCount >= 8
          ? "已达上限（穿透 8 个）"
          : `穿透 +1（当前穿透 ${stats.pierceCount} 个）`,
      icon: "🎯",
      available: stats.pierceCount < 8,
      apply: (s) => {
        if (s.pierceCount < 8) s.pierceCount += 1;
      },
    },
    {
      id: "pickup",
      title: "磁场强化",
      desc:
        stats.pickupRangeMultiplier >= 2.0
          ? "已达上限（200%）"
          : `收集范围 +50%（当前 ${(stats.pickupRangeMultiplier * 100).toFixed(0)}%）`,
      icon: "🧲",
      available: stats.pickupRangeMultiplier < 2.0,
      apply: (s) => {
        if (s.pickupRangeMultiplier < 2.0) {
          s.pickupRangeMultiplier = Math.min(s.pickupRangeMultiplier + 0.5, 2.0);
        }
      },
    },
    {
      id: "speed",
      title: "加速强化",
      desc:
        stats.speedMultiplier >= 3.0
          ? "已达上限（300%），点击无效果"
          : `移动速度 +50%（当前 ${(stats.speedMultiplier * 100).toFixed(0)}%）`,
      icon: "⚡",
      available: true,
      apply: (s, p) => {
        if (s.speedMultiplier < 3.0) {
          s.speedMultiplier = Math.min(s.speedMultiplier + 0.5, 3.0);
          p.speed = PLAYER_SPEED * s.speedMultiplier;
        }
      },
    },
  ];
}

/* ───────── 主组件 ───────── */
export default function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameMode, setGameMode] = useState<GameMode>("menu");
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [restartKey, setRestartKey] = useState(0);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeOptions, setUpgradeOptions] = useState<UpgradeOption[]>([]);
  const [mathQuestion, setMathQuestion] = useState("");
  const [mathAnswer, setMathAnswer] = useState(0);
  const [mathInput, setMathInput] = useState("");
  const [attackMultiplier, setAttackMultiplier] = useState(1.0);
  const [wrongQuestions, setWrongQuestions] = useState<{ question: string; answer: number }[]>([]);
  const [showWrongBook, setShowWrongBook] = useState(false);
  const [showWrongBookHint, setShowWrongBookHint] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [isSpecialMode, setIsSpecialMode] = useState(false);
  const [showMathModeSelect, setShowMathModeSelect] = useState(false);
  const [showScratchPad, setShowScratchPad] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [attackSpeedMultiplier, setAttackSpeedMultiplier] = useState(1.0);
  const [coins, setCoins] = useState(0);
  const [playerColor, setPlayerColor] = useState("#FFD700");
  const [achievement, setAchievement] = useState<string | null>(null);
  const [showAchievement, setShowAchievement] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [consecutiveSpeedUpgrades, setConsecutiveSpeedUpgrades] = useState(0);
  const [devMode, setDevMode] = useState(false);
  const [konamiSequence, setKonamiSequence] = useState<string[]>([]);

  const showUpgradeRef = useRef(false);
  const attackMultiplierRef = useRef(1.0);
  const attackSpeedMultiplierRef = useRef(1.0);
  const coinsRef = useRef(0);
  const playerColorRef = useRef("#FFD700");
  const streakCountRef = useRef(0);
  const isSpecialModeRef = useRef(false);
  const scratchPadRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const geometryKillCountRef = useRef(0);

  const handleWrongBookClick = useCallback(() => {
    if (wrongQuestions.length === 0) {
      setShowWrongBookHint(true);
      setTimeout(() => setShowWrongBookHint(false), 2000);
    } else {
      setShowWrongBook(true);
    }
  }, [wrongQuestions.length]);

  // 加载成就和金币数据
  useEffect(() => {
    const saved = localStorage.getItem("game_achievements");
    if (saved) {
      setUnlockedAchievements(JSON.parse(saved));
    }
    const savedCoins = localStorage.getItem("game_coins");
    if (savedCoins) {
      const c = parseInt(savedCoins, 10);
      setCoins(c);
      coinsRef.current = c;
    }
    const savedColor = localStorage.getItem("game_player_color");
    if (savedColor) {
      setPlayerColor(savedColor);
      playerColorRef.current = savedColor;
    }
  }, []);

  // 开发者模式键盘监听（上上下下左右左右上下）
  useEffect(() => {
    const konamiCode = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameMode !== "menu") return;
      
      const newSequence = [...konamiSequence, e.key];
      
      // 保持序列长度不超过konamiCode长度
      if (newSequence.length > konamiCode.length) {
        newSequence.shift();
      }
      
      setKonamiSequence(newSequence);
      
      // 检查是否匹配
      if (newSequence.length === konamiCode.length && 
          newSequence.every((key, i) => key === konamiCode[i])) {
        setDevMode(true);
        soundManager.playUpgrade();
        setKonamiSequence([]);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameMode, konamiSequence]);

  // 解锁成就
  const unlockAchievement = useCallback((name: string) => {
    setUnlockedAchievements((prev) => {
      if (prev.includes(name)) return prev;
      const updated = [...prev, name];
      localStorage.setItem("game_achievements", JSON.stringify(updated));
      setAchievement(name);
      setShowAchievement(true);
      soundManager.playUpgrade();
      setTimeout(() => setShowAchievement(false), 3000);
      return updated;
    });
  }, []);

  // 保存金币
  const saveCoins = useCallback((amount: number) => {
    coinsRef.current = amount;
    setCoins(amount);
    localStorage.setItem("game_coins", String(amount));
  }, []);

  // 保存颜色
  const saveColor = useCallback((color: string) => {
    playerColorRef.current = color;
    setPlayerColor(color);
    localStorage.setItem("game_player_color", color);
  }, []);

  // 草稿纸绘图功能
  const initScratchPad = useCallback(() => {
    const canvas = scratchPadRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const clearScratchPad = useCallback(() => {
    const canvas = scratchPadRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const canvas = scratchPadRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    let x: number, y: number;
    
    if ("touches" in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, []);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = scratchPadRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    let x: number, y: number;
    
    if ("touches" in e) {
      e.preventDefault();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    
    ctx.lineTo(x, y);
    ctx.stroke();
  }, []);

  const stopDrawing = useCallback(() => {
    isDrawingRef.current = false;
  }, []);
  const gameStateRef = useRef<{
    stats: PlayerStats | null;
    player: Player | null;
    upgradeCount: number;
    monsterScale: number;
  }>({ stats: null, player: null, upgradeCount: 0, monsterScale: 1.0 });

  const restart = useCallback(() => {
    setGameOver(false);
    setScore(0);
    setShowUpgrade(false);
    showUpgradeRef.current = false;
    setMathInput("");
    setAttackMultiplier(1.0);
    attackMultiplierRef.current = 1.0;
    setWrongQuestions([]);
    setShowWrongBook(false);
    setStreakCount(0);
    streakCountRef.current = 0;
    setIsSpecialMode(false);
    isSpecialModeRef.current = false;
    setRestartKey((k) => k + 1);
  }, []);

  const handleUpgradeSelect = useCallback((option: UpgradeOption) => {
    const { stats, player } = gameStateRef.current;
    if (!stats || !player) return;
    
    // 检测成就触发：速度已达300%后再次选择加速强化
    if (option.id === "speed" && stats.speedMultiplier >= 3.0) {
      unlockAchievement("crystal_eaten");
    }
    
    // 检测连续速度升级成就"博尔特"
    if (option.id === "speed") {
      const newCount = consecutiveSpeedUpgrades + 1;
      setConsecutiveSpeedUpgrades(newCount);
      if (newCount >= 3) {
        unlockAchievement("bolt");
      }
    } else {
      setConsecutiveSpeedUpgrades(0);
    }
    
    option.apply(stats, player);
    setShowUpgrade(false);
    showUpgradeRef.current = false;
  }, [unlockAchievement, consecutiveSpeedUpgrades]);

  const handleMathSubmit = useCallback(() => {
    const numAnswer = parseInt(mathInput, 10);
    if (isNaN(numAnswer)) return;

    if (numAnswer === mathAnswer) {
      // 答对：增加连胜
      soundManager.playCorrect();
      const newStreak = streakCount + 1;
      setStreakCount(newStreak);
      streakCountRef.current = newStreak;
      
      // 根据模式计算加成
      let baseBonus: number;
      let streakBonus: number;
      
      if (isSpecialMode) {
        // 特殊模式：基础20% + 连胜10%
        baseBonus = 0.2;
        streakBonus = newStreak * 0.1;
      } else {
        // 普通模式：基础10% + 连胜5%
        baseBonus = 0.1;
        streakBonus = newStreak * 0.05;
      }
      
      const totalBonus = baseBonus + streakBonus;
      const newMultiplier = attackMultiplier + totalBonus;
      setAttackMultiplier(newMultiplier);
      attackMultiplierRef.current = newMultiplier;

      // 攻击力超过100时，每次答对增加10%攻速
      const currentAttack = PLAYER_ATTACK * newMultiplier;
      if (currentAttack > 100) {
        const newSpeedMultiplier = attackSpeedMultiplier + 0.1;
        setAttackSpeedMultiplier(newSpeedMultiplier);
        attackSpeedMultiplierRef.current = newSpeedMultiplier;
      }
    } else {
      // 答错：重置连胜
      soundManager.playWrong();
      setStreakCount(0);
      streakCountRef.current = 0;
      
      // 特殊模式：攻击倍率变为50%
      if (isSpecialMode) {
        setAttackMultiplier(0.5);
        attackMultiplierRef.current = 0.5;
      }
      
      // 记录到错题本
      setWrongQuestions((prev) => [...prev, { question: mathQuestion, answer: mathAnswer }]);
    }

    // 根据连胜数生成不同难度的题目（每次连胜提升1级难度）
    const difficulty = Math.min(5, 1 + streakCountRef.current);
    const q = generateMathQuestion(difficulty);
    setMathQuestion(q.question);
    setMathAnswer(q.answer);
    setMathInput("");
  }, [mathInput, mathAnswer, mathQuestion, attackMultiplier, streakCount, isSpecialMode]);

  useEffect(() => {
    if (gameMode === "menu") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 初始化音效系统
    soundManager.init();
    soundManager.setEnabled(soundEnabled);
    soundManager.playBGM();

    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    const onResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
    };
    window.addEventListener("resize", onResize);

    /* ── 游戏状态 ── */
    const keys = new Set<string>();
    const player: Player = {
      x: W / 2,
      y: H / 2,
      vx: 0,
      vy: 0,
      hp: PLAYER_HP,
      maxHp: PLAYER_HP,
      speed: PLAYER_SPEED,
      attack: PLAYER_ATTACK,
      radius: PLAYER_RADIUS,
      attackCooldown: 0,
      rangedCooldown: 0,
      mass: PLAYER_MASS,
    };

    const stats: PlayerStats = {
      critRate: 0,
      critMultiplier: 1.5,
      bulletCount: 1,
      pierceCount: 0,
      resourceCount: 0,
      totalResources: 0,
      pickupRangeMultiplier: 1.0,
      speedMultiplier: 1.0,
    };

    // 应用开发者模式效果
    if (devMode) {
      player.speed = PLAYER_SPEED * 3.0;
      player.attack = PLAYER_ATTACK * 5.0;
      stats.speedMultiplier = 3.0;
    }

    gameStateRef.current = { stats, player, upgradeCount: 0, monsterScale: 1.0 };

    let monsters: Monster[] = [];
    let particles: Particle[] = [];
    let damageTexts: DamageText[] = [];
    let projectiles: Projectile[] = [];
    let resources: Resource[] = [];
    let coinsList: Coin[] = [];
    let spawnTimer = 0;
    let gameTime = 0;
    let killCount = 0;
    let running = true;
    let cameraX = 0;
    let cameraY = 0;
    let monsterScale = 1.0;
    let upgradeCount = 0;
    let lastSecondMark = 0;
    let waveCount = 0;
    let lastWaveMinute = 0;

    const isMathMode = gameMode === "math";

    // 数学模式初始化题目
    if (isMathMode) {
      const q = generateMathQuestion(1);
      setMathQuestion(q.question);
      setMathAnswer(q.answer);
    }

    /* ── 网格星星背景 ── */
    const stars: { x: number; y: number; size: number; brightness: number }[] = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * 4000 - 2000,
        y: Math.random() * 4000 - 2000,
        size: Math.random() * 2 + 0.5,
        brightness: Math.random() * 0.5 + 0.2,
      });
    }

    /* ── 输入 ── */
    const onKeyDown = (e: KeyboardEvent) => {
      if (showUpgradeRef.current) return;
      // 如果焦点在数学输入框，不处理游戏按键
      if (isMathMode && document.activeElement?.tagName === "INPUT") return;
      
      // 开发者模式：按O键返回主菜单
      if (devMode && e.key.toLowerCase() === 'o') {
        setGameMode("menu");
        return;
      }
      
      keys.add(e.key.toLowerCase());
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key.toLowerCase());
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    /* ── 生成怪物 ── */
    function spawnMonster() {
      if (monsters.length >= MAX_MONSTERS) return;

      let maxTier = 1;
      if (gameTime > 15) maxTier = 2;
      if (gameTime > 40) maxTier = 3;
      if (gameTime > 80) maxTier = 4;
      if (gameTime > 130) maxTier = 5;

      const tier = Math.floor(Math.random() * maxTier) + 1;
      const def = MONSTER_DEFS[tier - 1];

      const angle = Math.random() * Math.PI * 2;
      // 生成在屏幕外边缘，尽可能靠近玩家
      const minDist = Math.hypot(W / 2, H / 2) + 50;
      const distance = minDist + Math.random() * 30;
      const mx = player.x + Math.cos(angle) * distance;
      const my = player.y + Math.sin(angle) * distance;

      const monster: Monster = {
        x: mx,
        y: my,
        vx: 0,
        vy: 0,
        hp: def.hp * monsterScale,
        maxHp: def.hp * monsterScale,
        speed: def.speed * monsterScale,
        attack: def.attack * monsterScale,
        radius: def.radius,
        tier: def.tier,
        attackCooldown: 0,
        dying: false,
        deathTimer: 0,
        hitFlash: 0,
        mass: def.mass,
      };

      // 速度上限：原始速度的200%
      const maxSpeed = def.speed * 2.0;
      if (monster.speed > maxSpeed) {
        monster.speed = maxSpeed;
      }

      monsters.push(monster);
    }

    /* ── 怪物波次补给 ── */
    function spawnWave() {
      // 5%概率生成6阶BOSS
      if (Math.random() < 0.05) {
        spawnBoss();
        waveCount += 1;
        return;
      }

      // 第一波10个，之后每波加5个
      const waveSize = waveCount === 0 ? 10 : 10 + waveCount * 5;
      
      for (let i = 0; i < waveSize; i++) {
        spawnMonster();
      }
      
      waveCount += 1;
    }

    /* ── 生成6阶BOSS ── */
    function spawnBoss() {
      // 清除所有现有怪物
      monsters = [];
      soundManager.playBossAppear();

      const def = MONSTER_DEFS[5]; // 6阶
      const tier4Hp = MONSTER_DEFS[3].hp; // 4阶怪物血量
      const bossHp = tier4Hp * 5 * monsterScale; // 4阶血量的5倍，受难度影响

      const angle = Math.random() * Math.PI * 2;
      // BOSS生成在屏幕外边缘
      const minDist = Math.hypot(W / 2, H / 2) + 80;
      const distance = minDist + Math.random() * 30;
      const mx = player.x + Math.cos(angle) * distance;
      const my = player.y + Math.sin(angle) * distance;

      const boss: Monster = {
        x: mx,
        y: my,
        vx: 0,
        vy: 0,
        hp: bossHp,
        maxHp: bossHp,
        speed: def.speed,
        attack: def.attack,
        radius: def.radius,
        tier: def.tier,
        attackCooldown: 0,
        dying: false,
        deathTimer: 0,
        hitFlash: 0,
        mass: def.mass,
        isBoss: true,
        summonCooldown: 5, // 5秒后第一次召唤
      };

      monsters.push(boss);
    }

    /* ── BOSS召唤三阶怪 ── */
    function bossSummon(boss: Monster) {
      const def = MONSTER_DEFS[2]; // 3阶
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5;
        const distance = boss.radius + def.radius + 20;
        const mx = boss.x + Math.cos(angle) * distance;
        const my = boss.y + Math.sin(angle) * distance;

        const minion: Monster = {
          x: mx,
          y: my,
          vx: 0,
          vy: 0,
          hp: def.hp * monsterScale,
          maxHp: def.hp * monsterScale,
          speed: def.speed * monsterScale,
          attack: def.attack * monsterScale,
          radius: def.radius,
          tier: def.tier,
          attackCooldown: 0,
          dying: false,
          deathTimer: 0,
          hitFlash: 0,
          mass: def.mass,
        };

        monsters.push(minion);
      }
      spawnParticles(boss.x, boss.y, "#ff00ff", 20);
    }

    /* ── 掉落资源 ── */
    function spawnResources(x: number, y: number) {
      const count = devMode ? 20 : Math.floor(Math.random() * 2) + 1;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const offset = Math.random() * 20 + 10;
        resources.push({
          x: x + Math.cos(angle) * offset,
          y: y + Math.sin(angle) * offset,
          life: 15,
          bobPhase: Math.random() * Math.PI * 2,
        });
      }
    }

    /* ── 掉落金币（数学模式） ── */
    function spawnCoins(x: number, y: number) {
      const value = Math.floor(Math.random() * 10) + 1; // 1-10枚金币
      const angle = Math.random() * Math.PI * 2;
      const offset = Math.random() * 20 + 10;
      coinsList.push({
        x: x + Math.cos(angle) * offset,
        y: y + Math.sin(angle) * offset,
        life: 15,
        value: value,
        bobPhase: Math.random() * Math.PI * 2,
      });
    }

    /* ── 触发升级选择 ── */
    function triggerUpgrade() {
      monsterScale *= 1.3;
      if (monsterScale > 100) {
        monsterScale = 100;
      }
      upgradeCount += 1;

      gameStateRef.current.upgradeCount = upgradeCount;
      gameStateRef.current.monsterScale = monsterScale;

      for (const m of monsters) {
        if (!m.dying) {
          const ratio = m.hp / m.maxHp;
          m.maxHp *= 1.3;
          m.hp = m.maxHp * ratio;
          m.speed *= 1.3;
          m.attack *= 1.3;
          
          // 速度上限：原始速度的200%
          const baseSpeed = MONSTER_DEFS[m.tier - 1].speed;
          const maxSpeed = baseSpeed * 2.0;
          if (m.speed > maxSpeed) {
            m.speed = maxSpeed;
          }
        }
      }

      const options = getUpgradeOptions(stats, player);
      setUpgradeOptions(options);
      setShowUpgrade(true);
      showUpgradeRef.current = true;
      soundManager.playUpgrade();
    }

    /* ── 粒子效果 ── */
    function spawnParticles(x: number, y: number, color: string, count: number) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 120 + 40;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: Math.random() * 0.6 + 0.3,
          maxLife: 0.9,
          color,
          size: Math.random() * 4 + 2,
        });
      }
    }

    function spawnDamageText(x: number, y: number, text: string, color: string) {
      damageTexts.push({ x, y, text, life: 1.0, color });
    }

    /* ── 计算暴击 ── */
    function calcDamage(baseDmg: number): { dmg: number; isCrit: boolean } {
      const isCrit = Math.random() * 100 < stats.critRate;
      const dmg = isCrit ? Math.round(baseDmg * stats.critMultiplier) : baseDmg;
      return { dmg, isCrit };
    }

    /* ── 发射子弹 ── */
    function fireProjectiles(target: Monster) {
      const baseAngle = Math.atan2(target.y - player.y, target.x - player.x);
      const count = stats.bulletCount;
      const spreadDeg = 5;
      const spreadRad = (spreadDeg * Math.PI) / 180;

      for (let i = 0; i < count; i++) {
        let angle = baseAngle;
        if (count > 1) {
          const offset = (i - (count - 1) / 2) * spreadRad;
          angle = baseAngle + offset;
        }
        const baseDmg = isMathMode ? RANGED_DAMAGE * attackMultiplierRef.current : RANGED_DAMAGE;
        const { dmg, isCrit } = calcDamage(baseDmg);
        projectiles.push({
          x: player.x,
          y: player.y,
          vx: Math.cos(angle) * PROJECTILE_SPEED,
          vy: Math.sin(angle) * PROJECTILE_SPEED,
          damage: dmg,
          life: 1.5,
          radius: PROJECTILE_RADIUS,
          pierceLeft: stats.pierceCount,
          hitSet: new Set<Monster>(),
          isCrit,
        });
      }
    }

    /* ── 物理碰撞 ── */
    function applyPhysics(entity: Entity, dt: number) {
      entity.x += entity.vx * dt;
      entity.y += entity.vy * dt;
      entity.vx *= FRICTION;
      entity.vy *= FRICTION;
    }

    function checkCollision(a: Entity, b: Entity): boolean {
      return dist(a, b) < a.radius + b.radius;
    }

    function resolveCollision(a: Entity, b: Entity) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d === 0) return;

      const nx = dx / d;
      const ny = dy / d;

      const overlap = a.radius + b.radius - d;
      const totalMass = a.mass + b.mass;

      a.x -= nx * overlap * (b.mass / totalMass);
      a.y -= ny * overlap * (b.mass / totalMass);
      b.x += nx * overlap * (a.mass / totalMass);
      b.y += ny * overlap * (a.mass / totalMass);

      const relVx = a.vx - b.vx;
      const relVy = a.vy - b.vy;
      const relVn = relVx * nx + relVy * ny;

      if (relVn > 0) return;

      const restitution = 0.6;
      const j = -(1 + restitution) * relVn / totalMass;

      a.vx += j * b.mass * nx;
      a.vy += j * b.mass * ny;
      b.vx -= j * a.mass * nx;
      b.vy -= j * a.mass * ny;
    }

    /* ── 绘制背景 ── */
    function drawBackground() {
      const grad = ctx!.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.8);
      grad.addColorStop(0, "#0a0a1a");
      grad.addColorStop(1, "#000005");
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, W, H);

      ctx!.save();
      ctx!.translate(W / 2 - cameraX, H / 2 - cameraY);

      const gridSize = 80;
      const startX = Math.floor((cameraX - W / 2) / gridSize) * gridSize;
      const endX = Math.ceil((cameraX + W / 2) / gridSize) * gridSize;
      const startY = Math.floor((cameraY - H / 2) / gridSize) * gridSize;
      const endY = Math.ceil((cameraY + H / 2) / gridSize) * gridSize;

      ctx!.strokeStyle = "rgba(30, 60, 90, 0.25)";
      ctx!.lineWidth = 0.5;
      for (let x = startX; x <= endX; x += gridSize) {
        ctx!.beginPath();
        ctx!.moveTo(x, startY);
        ctx!.lineTo(x, endY);
        ctx!.stroke();
      }
      for (let y = startY; y <= endY; y += gridSize) {
        ctx!.beginPath();
        ctx!.moveTo(startX, y);
        ctx!.lineTo(endX, y);
        ctx!.stroke();
      }

      for (const star of stars) {
        if (
          star.x > cameraX - W / 2 - 50 &&
          star.x < cameraX + W / 2 + 50 &&
          star.y > cameraY - H / 2 - 50 &&
          star.y < cameraY + H / 2 + 50
        ) {
          ctx!.fillStyle = `rgba(150, 180, 255, ${star.brightness})`;
          ctx!.beginPath();
          ctx!.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      ctx!.restore();
    }

    /* ── 绘制资源 ── */
    function drawResources() {
      for (const r of resources) {
        const sx = r.x - cameraX + W / 2;
        const sy = r.y - cameraY + H / 2 + Math.sin(r.bobPhase + gameTime * 3) * 4;
        if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;

        ctx!.save();
        ctx!.shadowColor = "#00ff88";
        ctx!.shadowBlur = 12;

        ctx!.fillStyle = "#00ff88";
        ctx!.beginPath();
        ctx!.moveTo(sx, sy - 8);
        ctx!.lineTo(sx + 6, sy);
        ctx!.lineTo(sx, sy + 8);
        ctx!.lineTo(sx - 6, sy);
        ctx!.closePath();
        ctx!.fill();

        ctx!.shadowBlur = 0;
        ctx!.fillStyle = "#aaffcc";
        ctx!.beginPath();
        ctx!.moveTo(sx, sy - 4);
        ctx!.lineTo(sx + 3, sy);
        ctx!.lineTo(sx, sy + 4);
        ctx!.lineTo(sx - 3, sy);
        ctx!.closePath();
        ctx!.fill();

        ctx!.restore();
      }
    }

    /* ── 绘制金币 ── */
    function drawCoins() {
      for (const c of coinsList) {
        const sx = c.x - cameraX + W / 2;
        const sy = c.y - cameraY + H / 2 + Math.sin(c.bobPhase + gameTime * 3) * 4;
        if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;

        ctx!.save();
        ctx!.shadowColor = "#FFD700";
        ctx!.shadowBlur = 12;

        // 金币外圈
        ctx!.fillStyle = "#FFD700";
        ctx!.beginPath();
        ctx!.arc(sx, sy, 8, 0, Math.PI * 2);
        ctx!.fill();

        // 金币内圈
        ctx!.shadowBlur = 0;
        ctx!.fillStyle = "#FFA500";
        ctx!.beginPath();
        ctx!.arc(sx, sy, 5, 0, Math.PI * 2);
        ctx!.fill();

        // 金币文字
        ctx!.fillStyle = "#fff";
        ctx!.font = "bold 8px monospace";
        ctx!.textAlign = "center";
        ctx!.textBaseline = "middle";
        ctx!.fillText("$", sx, sy);

        ctx!.restore();
      }
    }

    /* ── 绘制玩家 ── */
    function drawPlayer() {
      const sx = player.x - cameraX + W / 2;
      const sy = player.y - cameraY + H / 2;
      const color = playerColorRef.current;

      ctx!.save();
      ctx!.shadowColor = color;
      ctx!.shadowBlur = 25;
      ctx!.beginPath();
      ctx!.arc(sx, sy, player.radius, 0, Math.PI * 2);
      const pGrad = ctx!.createRadialGradient(sx - 4, sy - 4, 2, sx, sy, player.radius);
      pGrad.addColorStop(0, "#ffffff");
      pGrad.addColorStop(0.5, color);
      pGrad.addColorStop(1, color);
      ctx!.fillStyle = pGrad;
      ctx!.fill();
      ctx!.restore();

      if (player.attackCooldown > PLAYER_ATTACK_CD * 0.5) {
        ctx!.save();
        ctx!.strokeStyle = `${color}44`;
        ctx!.lineWidth = 2;
        ctx!.beginPath();
        ctx!.arc(sx, sy, PLAYER_ATTACK_RANGE, 0, Math.PI * 2);
        ctx!.stroke();
        ctx!.restore();
      }

      drawHealthBar(ctx!, sx, sy - player.radius - 12, 40, player.hp, player.maxHp, "#4ade80");

      ctx!.fillStyle = "#fff";
      ctx!.font = "bold 11px monospace";
      ctx!.textAlign = "center";
      ctx!.fillText(`${Math.ceil(player.hp)}/${player.maxHp}`, sx, sy - player.radius - 16);
    }

    /* ── 绘制怪物 ── */
    function drawMonsters() {
      for (const m of monsters) {
        const sx = m.x - cameraX + W / 2;
        const sy = m.y - cameraY + H / 2;

        if (sx < -50 || sx > W + 50 || sy < -50 || sy > H + 50) continue;

        if (m.dying) {
          const alpha = m.deathTimer / 0.4;
          ctx!.save();
          ctx!.globalAlpha = alpha;
          if (m.isBoss) {
            drawHexagon(ctx!, sx, sy, m.radius * (2 - alpha), `rgba(255,0,255,${alpha})`, false);
          } else {
            drawTriangle(ctx!, sx, sy, m.radius * (2 - alpha), `rgba(255,50,50,${alpha})`, false);
          }
          ctx!.restore();
          continue;
        }

        const color = m.hitFlash > 0 ? "#ffffff" : getMonsterColor(m.tier);
        
        if (m.isBoss) {
          // BOSS: 六边形 + 发光效果
          ctx!.save();
          ctx!.shadowColor = "#ff00ff";
          ctx!.shadowBlur = 20;
          drawHexagon(ctx!, sx, sy, m.radius, color, true);
          ctx!.restore();

          ctx!.fillStyle = "#fff";
          ctx!.font = `bold 16px monospace`;
          ctx!.textAlign = "center";
          ctx!.fillText("BOSS", sx, sy + 6);
        } else {
          drawTriangle(ctx!, sx, sy, m.radius, color, true);
          ctx!.fillStyle = "#fff";
          ctx!.font = `bold ${10 + m.tier}px monospace`;
          ctx!.textAlign = "center";
          ctx!.fillText(`${m.tier}阶`, sx, sy + 4);
        }

        const barColor = m.isBoss ? "#ff00ff" : m.tier >= 4 ? "#ff4444" : "#ef4444";
        const barWidth = m.isBoss ? 60 : 30 + m.tier * 4;
        drawHealthBar(ctx!, sx, sy - m.radius - 10, barWidth, m.hp, m.maxHp, barColor);
      }
    }

    function getMonsterColor(tier: number): string {
      switch (tier) {
        case 1: return "#ff3333";
        case 2: return "#ff2222";
        case 3: return "#ee1111";
        case 4: return "#dd0000";
        case 5: return "#cc0000";
        case 6: return "#ff00ff";
        default: return "#ff3333";
      }
    }

    /* ── 绘制子弹 ── */
    function drawProjectiles() {
      for (const proj of projectiles) {
        const sx = proj.x - cameraX + W / 2;
        const sy = proj.y - cameraY + H / 2;
        if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;

        ctx!.save();
        const tailLen = 18;
        const vLen = Math.hypot(proj.vx, proj.vy);
        const nx = proj.vx / vLen;
        const ny = proj.vy / vLen;
        const tailGrad = ctx!.createLinearGradient(
          sx - nx * tailLen, sy - ny * tailLen, sx, sy
        );

        const baseColor = proj.isCrit ? "255, 200, 0" : "0, 229, 255";
        tailGrad.addColorStop(0, `rgba(${baseColor}, 0)`);
        tailGrad.addColorStop(1, `rgba(${baseColor}, 0.7)`);
        ctx!.strokeStyle = tailGrad;
        ctx!.lineWidth = proj.isCrit ? 4 : 3;
        ctx!.beginPath();
        ctx!.moveTo(sx - nx * tailLen, sy - ny * tailLen);
        ctx!.lineTo(sx, sy);
        ctx!.stroke();

        ctx!.shadowColor = proj.isCrit ? "#ffc800" : "#00e5ff";
        ctx!.shadowBlur = proj.isCrit ? 20 : 14;
        ctx!.fillStyle = proj.isCrit ? "#ffc800" : "#00e5ff";
        ctx!.beginPath();
        ctx!.arc(sx, sy, proj.radius, 0, Math.PI * 2);
        ctx!.fill();

        ctx!.shadowBlur = 0;
        ctx!.fillStyle = "#ffffff";
        ctx!.beginPath();
        ctx!.arc(sx, sy, proj.radius * 0.4, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.restore();
      }
    }

    /* ── 绘制粒子 ── */
    function drawParticles() {
      for (const p of particles) {
        const sx = p.x - cameraX + W / 2;
        const sy = p.y - cameraY + H / 2;
        const alpha = clamp(p.life / p.maxLife, 0, 1);
        ctx!.save();
        ctx!.globalAlpha = alpha;
        ctx!.fillStyle = p.color;
        ctx!.shadowColor = p.color;
        ctx!.shadowBlur = 8;
        ctx!.beginPath();
        ctx!.arc(sx, sy, p.size * alpha, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.restore();
      }
    }

    /* ── 绘制伤害文字 ── */
    function drawDamageTexts() {
      for (const dt of damageTexts) {
        const sx = dt.x - cameraX + W / 2;
        const sy = dt.y - cameraY + H / 2 - (1 - dt.life) * 40;
        ctx!.save();
        ctx!.globalAlpha = clamp(dt.life, 0, 1);
        ctx!.fillStyle = dt.color;
        ctx!.font = "bold 16px monospace";
        ctx!.textAlign = "center";
        ctx!.shadowColor = dt.color;
        ctx!.shadowBlur = 6;
        ctx!.fillText(dt.text, sx, sy);
        ctx!.restore();
      }
    }

    /* ── 绘制 HUD ── */
    function drawHUD() {
      ctx!.save();

      const panelHeight = isMathMode ? 120 : 130;
      ctx!.fillStyle = "rgba(0,0,0,0.5)";
      ctx!.fillRect(12, 12, 220, panelHeight);
      ctx!.strokeStyle = "rgba(255,215,0,0.3)";
      ctx!.lineWidth = 1;
      ctx!.strokeRect(12, 12, 220, panelHeight);

      ctx!.fillStyle = "#FFD700";
      ctx!.font = "bold 16px monospace";
      ctx!.textAlign = "left";
      ctx!.fillText(`击杀: ${killCount}`, 24, 36);

      ctx!.fillStyle = "#aaa";
      ctx!.font = "13px monospace";
      ctx!.fillText(`时间: ${Math.floor(gameTime)}s`, 24, 56);
      ctx!.fillText(`怪物: ${monsters.filter((m) => !m.dying).length}`, 24, 74);

      if (isMathMode) {
        ctx!.fillStyle = "#00e5ff";
        ctx!.font = "bold 12px monospace";
        ctx!.fillText(`攻击倍率: x${attackMultiplierRef.current.toFixed(1)}`, 24, 94);
        ctx!.fillStyle = "#ff6666";
        ctx!.fillText(`怪物强化: x${monsterScale.toFixed(2)}`, 120, 94);
        
        // 显示攻速倍率（如果大于1.0）
        if (attackSpeedMultiplierRef.current > 1.0) {
          ctx!.fillStyle = "#00ff88";
          ctx!.fillText(`攻速: x${attackSpeedMultiplierRef.current.toFixed(1)}`, 24, 112);
        }
        
        // 显示金币
        ctx!.fillStyle = "#FFD700";
        ctx!.fillText(`💰 ${coinsRef.current}`, 120, 112);
      } else {
        const resBarX = 24;
        const resBarY = 84;
        const resBarW = 196;
        const resBarH = 12;
        ctx!.fillStyle = "rgba(0,0,0,0.6)";
        ctx!.fillRect(resBarX, resBarY, resBarW, resBarH);
        const resRatio = (stats.resourceCount % RESOURCES_PER_UPGRADE) / RESOURCES_PER_UPGRADE;
        ctx!.fillStyle = "#00ff88";
        ctx!.fillRect(resBarX, resBarY, resBarW * resRatio, resBarH);
        ctx!.strokeStyle = "rgba(0,255,136,0.3)";
        ctx!.strokeRect(resBarX, resBarY, resBarW, resBarH);

        ctx!.fillStyle = "#00ff88";
        ctx!.font = "bold 11px monospace";
        ctx!.fillText(
          `💎 ${stats.resourceCount % RESOURCES_PER_UPGRADE}/${RESOURCES_PER_UPGRADE}`,
          resBarX,
          resBarY + resBarH + 14
        );

        // 显示金币
        ctx!.fillStyle = "#FFD700";
        ctx!.font = "bold 11px monospace";
        ctx!.fillText(`💰 ${coinsRef.current}`, resBarX + 120, resBarY + resBarH + 14);
      }

      if (!isMathMode) {
        ctx!.fillStyle = "rgba(0,0,0,0.5)";
        ctx!.fillRect(W - 182, 12, 170, 136);
        ctx!.strokeStyle = "rgba(0,229,255,0.3)";
        ctx!.strokeRect(W - 182, 12, 170, 136);

        ctx!.fillStyle = "#00e5ff";
        ctx!.font = "bold 13px monospace";
        ctx!.textAlign = "left";
        ctx!.fillText(`暴击率: ${stats.critRate.toFixed(0)}%`, W - 170, 34);
        ctx!.fillText(`暴击倍率: ${(stats.critMultiplier * 100).toFixed(0)}%`, W - 170, 52);
        ctx!.fillText(`子弹数: ${stats.bulletCount}`, W - 170, 70);
        ctx!.fillText(`穿透: ${stats.pierceCount}`, W - 170, 88);
        ctx!.fillText(`收集范围: ${(stats.pickupRangeMultiplier * 100).toFixed(0)}%`, W - 170, 106);
        ctx!.fillStyle = "#ff6666";
        ctx!.fillText(`怪物强化: x${monsterScale.toFixed(2)}`, W - 170, 124);
        ctx!.fillStyle = "#aaa";
        ctx!.font = "11px monospace";
        ctx!.fillText(`累计资源: ${stats.totalResources}`, W - 170, 140);
      }

      const barW = 260;
      const barH = 16;
      const barX = W / 2 - barW / 2;
      const barY = H - 40;
      ctx!.fillStyle = "rgba(0,0,0,0.6)";
      ctx!.fillRect(barX, barY, barW, barH);
      const hpRatio = clamp(player.hp / player.maxHp, 0, 1);
      const hpGrad = ctx!.createLinearGradient(barX, barY, barX + barW, barY);
      hpGrad.addColorStop(0, "#4ade80");
      hpGrad.addColorStop(1, "#22c55e");
      ctx!.fillStyle = hpGrad;
      ctx!.fillRect(barX, barY, barW * hpRatio, barH);
      ctx!.strokeStyle = "rgba(255,255,255,0.3)";
      ctx!.strokeRect(barX, barY, barW, barH);

      ctx!.fillStyle = "#fff";
      ctx!.font = "bold 12px monospace";
      ctx!.textAlign = "center";
      ctx!.fillText(`HP ${Math.ceil(player.hp)} / ${player.maxHp}`, W / 2, barY + 12);

      ctx!.fillStyle = "rgba(255,255,255,0.3)";
      ctx!.font = "12px monospace";
      ctx!.textAlign = "right";
      const modeText = isMathMode ? "数学大战" : "几何大战";
      ctx!.fillText(`${modeText} · WASD 移动`, W - 16, H - 12);

      ctx!.restore();
    }

    /* ── 游戏主循环 ── */
    let lastTime = performance.now();

    function onMonsterKill(m: Monster) {
      m.dying = true;
      m.deathTimer = 0.4;
      killCount++;
      setScore(killCount);
      spawnParticles(m.x, m.y, "#ff4444", 15);
      soundManager.playMonsterDeath();
      if (isMathMode) {
        spawnCoins(m.x, m.y);
      } else {
        spawnResources(m.x, m.y);
        // 几何模式：每2只怪掉1枚金币
        geometryKillCountRef.current += 1;
        if (geometryKillCountRef.current % 2 === 0) {
          coinsList.push({
            x: m.x + (Math.random() - 0.5) * 30,
            y: m.y + (Math.random() - 0.5) * 30,
            life: 15,
            value: 1,
            bobPhase: Math.random() * Math.PI * 2,
          });
        }
      }
    }

    function update(dt: number) {
      if (!running) return;
      if (showUpgradeRef.current) return;

      gameTime += dt;

      // 每分钟怪物波次补给（两种模式通用）
      const currentMinute = Math.floor(gameTime / 60);
      if (currentMinute > lastWaveMinute) {
        lastWaveMinute = currentMinute;
        spawnWave();
      }

      // 数学模式：每秒怪物强化
      if (isMathMode) {
        const currentSecond = Math.floor(gameTime);
        if (currentSecond > lastSecondMark) {
          lastSecondMark = currentSecond;
          // 普通模式每秒+1%，特殊模式每秒+2%
          const boostRate = isSpecialMode ? 0.02 : 0.01;
          monsterScale *= (1 + boostRate);
          if (monsterScale > 100) {
            monsterScale = 100;
          }
          gameStateRef.current.monsterScale = monsterScale;

          // 强化现有存活怪物
          for (const m of monsters) {
            if (!m.dying) {
              const ratio = m.hp / m.maxHp;
              m.maxHp *= (1 + boostRate);
              m.hp = m.maxHp * ratio;
              m.speed *= (1 + boostRate);
              m.attack *= (1 + boostRate);
              
              // 速度上限：原始速度的200%
              const baseSpeed = MONSTER_DEFS[m.tier - 1].speed;
              const maxSpeed = baseSpeed * 2.0;
              if (m.speed > maxSpeed) {
                m.speed = maxSpeed;
              }
            }
          }
        }
      }

      // 玩家移动
      let dx = 0;
      let dy = 0;
      if (keys.has("w") || keys.has("arrowup")) dy -= 1;
      if (keys.has("s") || keys.has("arrowdown")) dy += 1;
      if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
      if (keys.has("d") || keys.has("arrowright")) dx += 1;

      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        dx /= len;
        dy /= len;
        player.vx += dx * player.speed * 5 * dt;
        player.vy += dy * player.speed * 5 * dt;
      }

      applyPhysics(player, dt);

      cameraX += (player.x - cameraX) * 4 * dt;
      cameraY += (player.y - cameraY) * 4 * dt;

      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnMonster();
        spawnTimer = Math.max(0.5, SPAWN_INTERVAL - gameTime * 0.005);
      }

      // 近战攻击
      player.attackCooldown -= dt;
      if (player.attackCooldown <= 0) {
        let closest: Monster | null = null;
        let closestDist = Infinity;
        for (const m of monsters) {
          if (m.dying) continue;
          const d = dist(player, m);
          if (d < PLAYER_ATTACK_RANGE && d < closestDist) {
            closest = m;
            closestDist = d;
          }
        }
        if (closest) {
          const baseDmg = isMathMode ? player.attack * attackMultiplierRef.current : player.attack;
          const { dmg, isCrit } = calcDamage(baseDmg);
          closest.hp -= dmg;
          closest.hitFlash = 0.1;
          
          // 击退
          const angle = Math.atan2(closest.y - player.y, closest.x - player.x);
          closest.vx += Math.cos(angle) * KNOCKBACK_FORCE * 0.5;
          closest.vy += Math.sin(angle) * KNOCKBACK_FORCE * 0.5;
          
          player.attackCooldown = PLAYER_ATTACK_CD / attackSpeedMultiplierRef.current;
          const color = isCrit ? "#ffc800" : "#FFD700";
          const prefix = isCrit ? "暴击! " : "";
          spawnDamageText(closest.x, closest.y - closest.radius - 15, `${prefix}-${dmg}`, color);
          spawnParticles(closest.x, closest.y, color, 5);

          if (closest.hp <= 0) {
            onMonsterKill(closest);
          }
        }
      }

      // 远程攻击
      player.rangedCooldown -= dt;
      if (player.rangedCooldown <= 0) {
        let closest: Monster | null = null;
        let closestDist = Infinity;
        for (const m of monsters) {
          if (m.dying) continue;
          const d = dist(player, m);
          if (d < RANGED_ATTACK_RANGE && d > PLAYER_ATTACK_RANGE && d < closestDist) {
            closest = m;
            closestDist = d;
          }
        }
        if (closest) {
          fireProjectiles(closest);
          player.rangedCooldown = RANGED_ATTACK_CD / attackSpeedMultiplierRef.current;
        }
      }

      // 更新子弹
      for (const proj of projectiles) {
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;
        proj.life -= dt;

        for (const m of monsters) {
          if (m.dying || proj.hitSet.has(m)) continue;
          if (dist(proj, m) < proj.radius + m.radius) {
            m.hp -= proj.damage;
            m.hitFlash = 0.1;
            proj.hitSet.add(m);
            soundManager.playAttack();

            // 击退
            const angle = Math.atan2(m.y - player.y, m.x - player.x);
            m.vx += Math.cos(angle) * KNOCKBACK_FORCE * 0.3;
            m.vy += Math.sin(angle) * KNOCKBACK_FORCE * 0.3;

            const color = proj.isCrit ? "#ffc800" : "#00e5ff";
            const prefix = proj.isCrit ? "暴击! " : "";
            spawnDamageText(m.x, m.y - m.radius - 15, `${prefix}-${proj.damage}`, color);
            spawnParticles(m.x, m.y, color, 6);

            if (m.hp <= 0) {
              onMonsterKill(m);
            }

            if (proj.pierceLeft > 0) {
              proj.pierceLeft -= 1;
            } else {
              proj.life = 0;
            }
            break;
          }
        }
      }
      projectiles = projectiles.filter((p) => p.life > 0);

      // 资源拾取
      if (!isMathMode) {
        for (const r of resources) {
          r.life -= dt;
          const pickupRange = RESOURCE_PICKUP_RANGE * stats.pickupRangeMultiplier;
          if (dist(player, r) < pickupRange) {
            r.life = 0;
            stats.resourceCount += 1;
            stats.totalResources += 1;
            spawnParticles(r.x, r.y, "#00ff88", 4);
            soundManager.playCollect();

            if (stats.resourceCount > 0 && stats.resourceCount % RESOURCES_PER_UPGRADE === 0) {
              triggerUpgrade();
            }
          }
        }
        resources = resources.filter((r) => r.life > 0);
      }

      // 金币收集（两种模式通用）
      for (const c of coinsList) {
        c.life -= dt;
        const pickupRange = RESOURCE_PICKUP_RANGE * stats.pickupRangeMultiplier;
        if (dist(player, c) < pickupRange) {
          c.life = 0;
          const newCoins = coinsRef.current + c.value;
          saveCoins(newCoins);
          spawnParticles(c.x, c.y, "#FFD700", 4);
          soundManager.playCollect();
        }
      }
      coinsList = coinsList.filter((c) => c.life > 0);

      // 怪物行为
      for (const m of monsters) {
        if (m.dying) {
          m.deathTimer -= dt;
          continue;
        }

        m.hitFlash -= dt;

        const d = dist(player, m);
        if (d > m.radius + player.radius) {
          const angle = Math.atan2(player.y - m.y, player.x - m.x);
          m.vx += Math.cos(angle) * m.speed * 3 * dt;
          m.vy += Math.sin(angle) * m.speed * 3 * dt;
        }

        applyPhysics(m, dt);

        // BOSS召唤三阶怪
        if (m.isBoss && m.summonCooldown !== undefined) {
          m.summonCooldown -= dt;
          if (m.summonCooldown <= 0) {
            bossSummon(m);
            m.summonCooldown = 10; // 每10秒召唤一次
          }
        }

        // 碰撞检测
        if (checkCollision(player, m)) {
          resolveCollision(player, m);
        }

        m.attackCooldown -= dt;
        if (d < m.radius + player.radius + 5 && m.attackCooldown <= 0) {
          player.hp -= m.attack;
          m.attackCooldown = MONSTER_DEFS[m.tier - 1].attackCd;
          soundManager.playHurt();
          
          // 击退玩家
          const angle = Math.atan2(player.y - m.y, player.x - m.x);
          player.vx += Math.cos(angle) * KNOCKBACK_FORCE * 0.3;
          player.vy += Math.sin(angle) * KNOCKBACK_FORCE * 0.3;
          
          spawnDamageText(player.x, player.y - player.radius - 15, `-${m.attack}`, "#ff4444");
          spawnParticles(player.x, player.y, "#ff4444", 3);

          if (player.hp <= 0) {
            player.hp = 0;
            running = false;
            setGameOver(true);
            soundManager.playGameOver();
          }
        }
      }

      monsters = monsters.filter((m) => !(m.dying && m.deathTimer <= 0));

      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.life -= dt;
      }
      particles = particles.filter((p) => p.life > 0);

      for (const dt2 of damageTexts) {
        dt2.life -= dt;
      }
      damageTexts = damageTexts.filter((d) => d.life > 0);
    }

    function render() {
      ctx!.clearRect(0, 0, W, H);
      drawBackground();
      drawResources();
      drawCoins();
      drawProjectiles();
      drawParticles();
      drawMonsters();
      drawPlayer();
      drawDamageTexts();
      drawHUD();
    }

    let animId: number;
    function loop(now: number) {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      update(dt);
      render();
      animId = requestAnimationFrame(loop);
    }
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      soundManager.stopBGM();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [restartKey, gameMode]);

  // 模式选择界面
  if (gameMode === "menu") {
    // 图鉴视图
    if (showGallery) {
      const allAchievements = [
        { id: "wind_and_waves", name: "风浪越大鱼越贵", desc: "首次进入数学大战特殊模式", icon: "🌊" },
        { id: "crystal_eaten", name: "你的晶核被我吃了", desc: "速度达到300%后继续选择加速强化", icon: "💎" },
        { id: "bolt", name: "博尔特", desc: "连续3次选择加速强化", icon: "⚡" },
      ];
      return (
        <div className="w-screen h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
          <div className="max-w-2xl w-full px-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-4xl font-bold text-purple-400">🏆 成就图鉴</h2>
              <button
                onClick={() => setShowGallery(false)}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors"
              >
                ← 返回
              </button>
            </div>
            <div className="text-gray-400 text-sm mb-4">
              已解锁 {unlockedAchievements.length} / {allAchievements.length} 个成就
            </div>
            <div className="space-y-3">
              {allAchievements.map((ach) => {
                const unlocked = unlockedAchievements.includes(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`p-4 rounded-xl border transition-all ${
                      unlocked
                        ? "bg-purple-950/40 border-purple-500/50"
                        : "bg-gray-900/40 border-gray-700/50 opacity-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{unlocked ? ach.icon : "🔒"}</div>
                      <div>
                        <div className={`font-bold text-lg ${unlocked ? "text-purple-300" : "text-gray-500"}`}>
                          {ach.name}
                        </div>
                        <div className={`text-sm ${unlocked ? "text-gray-400" : "text-gray-600"}`}>
                          {ach.desc}
                        </div>
                      </div>
                      {unlocked && (
                        <div className="ml-auto text-green-400 text-sm font-bold">✓ 已解锁</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // 错题本视图
    if (showWrongBook) {
      return (
        <div className="w-screen h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
          <div className="max-w-2xl w-full px-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-4xl font-bold text-yellow-400">📖 错题本</h2>
              <button
                onClick={() => setShowWrongBook(false)}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors"
              >
                ← 返回
              </button>
            </div>
            
            {wrongQuestions.length === 0 ? (
              <div className="text-center text-gray-500 py-20">
                <div className="text-6xl mb-4">📝</div>
                <p>还没有错题记录</p>
                <p className="text-sm mt-2">在数学大战中答错题目会记录在这里</p>
              </div>
            ) : (
              <>
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => setWrongQuestions([])}
                    className="px-4 py-2 bg-red-900/50 hover:bg-red-800/50 border border-red-500/30 text-red-300 rounded-lg transition-colors"
                  >
                    清空错题本
                  </button>
                </div>
                <div className="bg-black/50 border border-yellow-500/30 rounded-xl p-6 max-h-[60vh] overflow-y-auto space-y-2">
                  {wrongQuestions.map((q, i) => (
                    <div key={i} className="text-lg text-gray-300 font-mono bg-yellow-950/30 rounded-lg px-4 py-3">
                      <span className="text-yellow-400">#{i + 1}</span> {q.question} = <span className="text-green-400 font-bold text-xl">{q.answer}</span>
                    </div>
                  ))}
                </div>
                <div className="text-center text-gray-500 text-sm mt-4">
                  共 {wrongQuestions.length} 道错题
                </div>
              </>
            )}
          </div>
        </div>
      );
    }

    // 主菜单视图
    return (
      <div className="w-screen h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center relative">
        {/* 错题本按钮 */}
        <button
          onClick={handleWrongBookClick}
          className="absolute top-6 left-6 w-16 h-16 bg-yellow-500 hover:bg-yellow-400 rounded-full shadow-lg shadow-yellow-500/30 flex items-center justify-center transition-all hover:scale-110 z-50"
          title="错题本"
        >
          <div className="text-2xl">📖</div>
          {wrongQuestions.length > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {wrongQuestions.length}
            </div>
          )}
        </button>

        {/* 说明按钮 */}
        <button
          onClick={() => setShowInstructions(true)}
          className="absolute top-6 left-28 w-16 h-16 bg-white hover:bg-gray-100 rounded-full shadow-lg shadow-white/30 flex items-center justify-center transition-all hover:scale-110 z-50"
          title="游戏说明"
        >
          <div className="text-2xl">❓</div>
        </button>

        {/* 音效开关按钮 */}
        <button
          onClick={() => {
            const newState = !soundEnabled;
            setSoundEnabled(newState);
            soundManager.setEnabled(newState);
            if (newState && gameMode !== "menu") {
              soundManager.playBGM();
            }
          }}
          className="absolute top-6 left-48 w-16 h-16 bg-gray-800 hover:bg-gray-700 rounded-full shadow-lg shadow-gray-500/30 flex items-center justify-center transition-all hover:scale-110 z-50"
          title={soundEnabled ? "关闭音效" : "开启音效"}
        >
          <div className="text-2xl">{soundEnabled ? "🔊" : "🔇"}</div>
        </button>

        {/* 图鉴按钮 */}
        <button
          onClick={() => setShowGallery(true)}
          className="absolute top-6 right-28 w-16 h-16 bg-purple-600 hover:bg-purple-500 rounded-full shadow-lg shadow-purple-500/30 flex items-center justify-center transition-all hover:scale-110 z-50"
          title="成就图鉴"
        >
          <div className="text-2xl">🏆</div>
          {unlockedAchievements.length > 0 && (
            <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {unlockedAchievements.length}
            </div>
          )}
        </button>

        {/* 换色按钮 */}
        <button
          onClick={() => {
            if (coinsRef.current >= 100) {
              saveCoins(coinsRef.current - 100);
              const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#DDA0DD", "#FF69B4", "#00CED1"];
              const currentIdx = colors.indexOf(playerColorRef.current);
              const nextIdx = (currentIdx + 1) % colors.length;
              saveColor(colors[nextIdx]);
              soundManager.playUpgrade();
            }
          }}
          className="absolute top-6 right-6 w-16 h-16 bg-pink-600 hover:bg-pink-500 rounded-full shadow-lg shadow-pink-500/30 flex items-center justify-center transition-all hover:scale-110 z-50"
          title={coins >= 100 ? "换色 (100💰)" : `换色 (需要100💰, 当前${coins}💰)`}
        >
          <div className="text-2xl">🎨</div>
          <div className="absolute -bottom-6 text-xs text-gray-400 whitespace-nowrap">
            {coins}💰
          </div>
        </button>

        {/* 错题本提示 */}
        {showWrongBookHint && (
          <div className="absolute top-24 left-6 bg-yellow-500 text-black font-bold px-4 py-2 rounded-lg shadow-lg animate-bounce z-50">
            去玩数学大战吧！
          </div>
        )}

        {/* 开发者模式提示 */}
        {devMode && (
          <div className="absolute top-24 right-6 bg-red-500 text-white font-bold px-4 py-2 rounded-lg shadow-lg animate-pulse z-50">
            🔧 开发者模式已激活
          </div>
        )}

        {/* 游戏说明弹窗 */}
        {showInstructions && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-50">
            <div className="max-w-3xl w-full mx-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-4xl font-bold text-cyan-400">❓ 游戏说明</h2>
                <button
                  onClick={() => setShowInstructions(false)}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors"
                >
                  ← 返回
                </button>
              </div>
              
              <div className="bg-black/50 border border-cyan-500/30 rounded-xl p-6 max-h-[70vh] overflow-y-auto space-y-6">
                {/* 几何模式说明 */}
                <div>
                  <h3 className="text-2xl font-bold text-yellow-400 mb-3">🔶 几何图形大战</h3>
                  <div className="space-y-2 text-gray-300">
                    <p><span className="text-cyan-400 font-bold">操作：</span>WASD 或方向键移动</p>
                    <p><span className="text-cyan-400 font-bold">攻击：</span>自动攻击最近的敌人</p>
                    <p><span className="text-cyan-400 font-bold">升级：</span>收集晶核，每20个可选择一次升级</p>
                    <p><span className="text-cyan-400 font-bold">升级选项：</span></p>
                    <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
                      <li>❤️ 生命强化：+200 最大生命值</li>
                      <li>⚡ 暴击精通：+10% 暴击率（满90%后+5%暴击倍率）</li>
                      <li>🔫 多重射击：+1 子弹数（上限5颗）</li>
                      <li>🎯 穿透弹头：+1 穿透数（上限8个）</li>
                      <li>🧲 磁场强化：+50% 收集范围（上限200%）</li>
                      <li>⚡ 加速强化：+50% 移动速度（上限300%）</li>
                    </ul>
                    <p><span className="text-yellow-400 font-bold">🏆 隐藏成就：</span></p>
                    <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
                      <li>速度达到300%后继续选择加速强化，解锁成就"你的晶核被我吃了"</li>
                    </ul>
                    <p><span className="text-red-400 font-bold">注意：</span>每次升级怪物强化30%，难度递增！（上限100倍）</p>
                  </div>
                </div>

                {/* 数学模式说明 */}
                <div>
                  <h3 className="text-2xl font-bold text-cyan-400 mb-3">🔢 数学大战</h3>
                  <div className="space-y-2 text-gray-300">
                    <p><span className="text-cyan-400 font-bold">操作：</span>WASD 或方向键移动</p>
                    <p><span className="text-cyan-400 font-bold">攻击：</span>解答数学题，答对造成双倍伤害并击退敌人</p>
                    <p><span className="text-cyan-400 font-bold">连胜机制：</span></p>
                    <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
                      <li>连续答对题目，攻击倍率持续增加</li>
                      <li>题目难度随连胜数提升（每2连胜+1级难度）</li>
                      <li>答错题目连胜中断，但攻击倍率保持不变</li>
                      <li>⚡ 攻击力超过100后，每次答对额外增加10%攻速</li>
                    </ul>
                    <p><span className="text-cyan-400 font-bold">普通模式：</span></p>
                    <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
                      <li>答对：攻击倍率 +10% + 连胜×5%</li>
                      <li>答错：攻击倍率保持不变</li>
                      <li>怪物每秒强化1%</li>
                    </ul>
                    <p><span className="text-orange-400 font-bold">🔥 特殊模式：</span></p>
                    <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
                      <li>答对：攻击倍率 +20% + 连胜×10%（更高收益）</li>
                      <li>答错：攻击倍率降至 50%（高风险）</li>
                      <li>怪物每秒强化2%（更快难度）</li>
                    </ul>
                    <p><span className="text-cyan-400 font-bold">草稿纸：</span>点击输入框下方的按钮可打开/关闭草稿纸</p>
                    <p><span className="text-yellow-400 font-bold">💰 金币系统：</span></p>
                    <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
                      <li>击杀怪物掉落1-10枚金币</li>
                      <li>100金币可在主页更换角色颜色（8种颜色可选）</li>
                    </ul>
                  </div>
                </div>

                {/* 通用说明 */}
                <div>
                  <h3 className="text-2xl font-bold text-green-400 mb-3">📚 通用机制</h3>
                  <div className="space-y-2 text-gray-300">
                    <p><span className="text-cyan-400 font-bold">敌人类型：</span>1-5阶三角形，阶级越高属性越强</p>
                    <p><span className="text-cyan-400 font-bold">波次补给：</span>每分钟触发一波怪物，第一波10个，之后每波+5个</p>
                    <p><span className="text-yellow-400 font-bold">💰 金币系统（通用）：</span></p>
                    <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
                      <li>几何模式：每击杀2只怪物掉落1枚金币</li>
                      <li>数学模式：击杀怪物掉落1-10枚金币</li>
                      <li>金币在主页可用于更换角色颜色（100金币/次）</li>
                    </ul>
                    <p><span className="text-purple-400 font-bold">🏆 成就图鉴：</span>在主页查看已解锁的成就</p>
                    <p><span className="text-purple-400 font-bold">💀 6阶BOSS：</span></p>
                    <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
                      <li>每分钟波次有5%概率出现6阶BOSS</li>
                      <li>BOSS出现时清除所有现有怪物</li>
                      <li>血量：4阶怪物血量的5倍，受难度影响</li>
                      <li>攻击：100，不受怪物强化影响</li>
                      <li>每10秒召唤5个3阶怪物</li>
                      <li>外观：紫色六边形，带发光效果</li>
                    </ul>
                    <p><span className="text-cyan-400 font-bold">怪物速度上限：</span>所有怪物速度不超过原始速度的200%</p>
                    <p><span className="text-cyan-400 font-bold">物理系统：</span>碰撞、惯性、击退效果</p>
                    <p><span className="text-cyan-400 font-bold">错题本：</span>数学模式答错的题目会记录在首页错题本中</p>
                    <p><span className="text-cyan-400 font-bold">🔊 音效系统：</span></p>
                    <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
                      <li>点击首页右上角的 🔊/🔇 按钮可开启/关闭音效</li>
                      <li>包含：攻击、受伤、升级、答题正确/错误、怪物死亡、收集资源、BOSS出现、游戏结束等音效</li>
                      <li>🎵 背景音乐：游戏进行中自动播放循环旋律，游戏结束时停止</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="text-center space-y-8 max-w-2xl w-full px-4">
          <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-red-500 to-purple-500 tracking-wider">
            图形大战
          </h1>
          <p className="text-gray-400 text-lg">选择游戏模式</p>
          <div className="flex gap-6 justify-center">
            <button
              onClick={() => setGameMode("geometry")}
              className="px-8 py-6 bg-gradient-to-br from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-white font-bold text-xl rounded-xl transition-all shadow-lg shadow-yellow-500/30 hover:scale-105"
            >
              <div className="text-3xl mb-2">🔶</div>
              <div>几何图形大战</div>
              <div className="text-sm text-yellow-200 mt-1">自动攻击 · 远程射击</div>
            </button>
            <button
              onClick={() => setShowMathModeSelect(true)}
              className="px-8 py-6 bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xl rounded-xl transition-all shadow-lg shadow-cyan-500/30 hover:scale-105"
            >
              <div className="text-3xl mb-2">🔢</div>
              <div>数学大战</div>
              <div className="text-sm text-cyan-200 mt-1">答题攻击 · 物理碰撞</div>
            </button>
          </div>
        </div>

        {/* 数学模式选择弹窗 */}
        {showMathModeSelect && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-50">
            <div className="bg-gray-900/95 border border-cyan-500/40 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl shadow-cyan-500/10">
              <h2 className="text-2xl font-bold text-cyan-400 text-center mb-2 tracking-wider">
                选择数学大战模式
              </h2>
              <p className="text-gray-400 text-center text-sm mb-5">
                选择你的挑战难度
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setIsSpecialMode(false);
                    isSpecialModeRef.current = false;
                    setShowMathModeSelect(false);
                    setGameMode("math");
                  }}
                  className="w-full p-4 rounded-lg border border-cyan-500/40 hover:border-cyan-400 hover:bg-cyan-950/40 cursor-pointer transition-all text-left"
                >
                  <div className="text-white font-bold text-lg mb-1">📚 普通模式</div>
                  <div className="text-gray-400 text-sm">
                    答对：攻击倍率 +10% + 连胜×5%<br />
                    答错：攻击倍率保持不变
                  </div>
                </button>
                <button
                  onClick={() => {
                    setIsSpecialMode(true);
                    isSpecialModeRef.current = true;
                    setShowMathModeSelect(false);
                    setGameMode("math");
                    // 首次进入特殊模式解锁成就
                    unlockAchievement("wind_and_waves");
                  }}
                  className="w-full p-4 rounded-lg border border-orange-500/40 hover:border-orange-400 hover:bg-orange-950/40 cursor-pointer transition-all text-left"
                >
                  <div className="text-white font-bold text-lg mb-1">🔥 特殊模式</div>
                  <div className="text-gray-400 text-sm">
                    答对：攻击倍率 +20% + 连胜×10%（更高收益）<br />
                    答错：攻击倍率降至 50%（高风险）
                  </div>
                </button>
              </div>
              <button
                onClick={() => setShowMathModeSelect(false)}
                className="w-full mt-4 px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* 成就弹窗 */}
      {showAchievement && (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-8 py-4 rounded-xl shadow-2xl border-4 border-yellow-300">
            <div className="text-center">
              <div className="text-4xl mb-2">🏆</div>
              <div className="text-white font-bold text-xl mb-1">成就解锁！</div>
              <div className="text-yellow-100 text-lg">{achievement}</div>
            </div>
          </div>
        </div>
      )}

      {/* 返回首页按钮 */}
      <button
        onClick={() => setGameMode("menu")}
        className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/50 hover:bg-black/70 border border-white/20 hover:border-white/40 text-white/60 hover:text-white text-sm rounded-lg transition-all z-40"
      >
        ← 返回首页
      </button>

      {/* 数学模式输入框 */}
      {gameMode === "math" && (
        <div className="absolute top-52 left-4 z-40 bg-black/70 border border-cyan-500/40 rounded-lg p-3 w-64">
          <div className="text-cyan-400 text-xs mb-1">
            解答提升攻击力
            {isSpecialMode && (
              <span className="ml-2 px-2 py-0.5 bg-orange-500/20 border border-orange-500/40 rounded text-orange-400 text-xs">
                🔥 特殊模式
              </span>
            )}
          </div>
          <div className="text-white text-lg font-mono mb-2">{mathQuestion}</div>
          <div className="flex gap-2">
            <input
              type="number"
              value={mathInput}
              onChange={(e) => setMathInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleMathSubmit()}
              className="flex-1 px-2 py-1 bg-black/50 border border-cyan-500/30 rounded text-white text-center font-mono focus:outline-none focus:border-cyan-400"
              placeholder="答案"
            />
            <button
              onClick={handleMathSubmit}
              className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded text-sm transition-colors"
            >
              确认
            </button>
          </div>
          <div className="text-cyan-300 text-xs mt-1">
            攻击倍率: x{attackMultiplier.toFixed(2)}
          </div>
          {streakCount > 0 && (
            <div className="text-orange-400 text-xs mt-1 font-bold">
              🔥 连胜 {streakCount} · 难度提升
            </div>
          )}
          
          {/* 草稿纸切换按钮 */}
          <button
            onClick={() => {
              setShowScratchPad(!showScratchPad);
              if (!showScratchPad) {
                setTimeout(initScratchPad, 100);
              }
            }}
            className="w-full mt-2 px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-white text-xs transition-colors"
          >
            {showScratchPad ? "隐藏草稿纸" : "📝 显示草稿纸"}
          </button>

        </div>
      )}

      {/* 草稿纸 */}
      {gameMode === "math" && showScratchPad && (
        <div className="absolute top-[28rem] left-4 z-40 bg-white rounded-lg shadow-2xl p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-700 text-sm font-bold">草稿纸</span>
            <button
              onClick={clearScratchPad}
              className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors"
            >
              清除
            </button>
          </div>
          <canvas
            ref={scratchPadRef}
            width={240}
            height={320}
            className="border border-gray-300 rounded cursor-crosshair touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>
      )}

      {/* 升级选择弹窗 */}
      {showUpgrade && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-50">
          <div className="bg-gray-900/95 border border-yellow-500/40 rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl shadow-yellow-500/10">
            <h2 className="text-2xl font-bold text-yellow-400 text-center mb-2 tracking-wider">
              选择强化
            </h2>
            <p className="text-gray-400 text-center text-sm mb-5">
              已收集 20 个资源，选择一项升级
            </p>
            <div className="grid grid-cols-2 gap-3">
              {upgradeOptions.map((opt) => (
                <button
                  key={opt.id}
                  disabled={!opt.available}
                  onClick={() => handleUpgradeSelect(opt)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    opt.available
                      ? "border-cyan-500/40 hover:border-cyan-400 hover:bg-cyan-950/40 cursor-pointer"
                      : "border-gray-700 opacity-40 cursor-not-allowed"
                  }`}
                >
                  <div className="text-2xl mb-1">{opt.icon}</div>
                  <div className="text-white font-bold text-sm">{opt.title}</div>
                  <div className="text-gray-400 text-xs mt-1">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 错题本弹窗 */}
      {showWrongBook && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-50">
          <div className="max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-4xl font-bold text-yellow-400">📖 错题本</h2>
              <button
                onClick={() => setShowWrongBook(false)}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors"
              >
                ← 返回游戏
              </button>
            </div>
            
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setWrongQuestions([])}
                className="px-4 py-2 bg-red-900/50 hover:bg-red-800/50 border border-red-500/30 text-red-300 rounded-lg transition-colors"
              >
                清空错题本
              </button>
            </div>
            <div className="bg-black/50 border border-yellow-500/30 rounded-xl p-6 max-h-[60vh] overflow-y-auto space-y-2">
              {wrongQuestions.map((q, i) => (
                <div key={i} className="text-lg text-gray-300 font-mono bg-yellow-950/30 rounded-lg px-4 py-3">
                  <span className="text-yellow-400">#{i + 1}</span> {q.question} = <span className="text-green-400 font-bold text-xl">{q.answer}</span>
                </div>
              ))}
            </div>
            <div className="text-center text-gray-500 text-sm mt-4">
              共 {wrongQuestions.length} 道错题
            </div>
          </div>
        </div>
      )}

      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-50">
          <div className="text-center space-y-6">
            <h1 className="text-5xl font-bold text-red-500 tracking-widest drop-shadow-lg">
              游戏结束
            </h1>
            <div className="space-y-2">
              <p className="text-2xl text-yellow-400 font-mono">击杀数: {score}</p>
              <p className="text-lg text-green-400 font-mono">
                累计资源: {gameStateRef.current.stats?.totalResources ?? 0}
              </p>
              <p className="text-lg text-red-400 font-mono">
                升级次数: {gameStateRef.current.upgradeCount}（怪物 x{gameStateRef.current.monsterScale.toFixed(2)}）
              </p>
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={restart}
                className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-lg rounded-lg transition-colors shadow-lg shadow-yellow-500/30"
              >
                重新开始
              </button>
              <button
                onClick={() => setGameMode("menu")}
                className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold text-lg rounded-lg transition-colors"
              >
                返回菜单
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
