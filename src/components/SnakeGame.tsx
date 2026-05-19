import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  GRID_SIZE, 
  Point, 
  Direction, 
  INITIAL_SNAKE, 
  INITIAL_DIRECTION, 
  INITIAL_SPEED,
  SPEED_INCREMENT,
  MIN_SPEED 
} from '../constants';
import { RefreshCcw, Gamepad2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Terminal, Activity, Trophy, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type LogEntry = {
  id: number;
  type: 'INFO' | 'EVENT' | 'WARN';
  message: string;
  time: string;
};

export default function SnakeGame() {
  // 遊戲狀態
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logIdRef = useRef(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const lastMoveTimeRef = useRef<number>(0);
  
  const snakeRef = useRef<Point[]>(INITIAL_SNAKE);
  const directionRef = useRef<Direction>(INITIAL_DIRECTION);
  const nextDirectionRef = useRef<Direction>(INITIAL_DIRECTION);

  // 新增日誌功能
  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newLog = { id: logIdRef.current++, type, message, time };
    setLogs(prev => [newLog, ...prev].slice(0, 8));
  }, []);

  // 初始日誌
  useEffect(() => {
    addLog('INFO', '網格初始化中...');
    addLog('INFO', '畫布已載入 600x600');
  }, [addLog]);

  // 隨機生成食物位置
  const generateFood = useCallback((currentSnake: Point[]) => {
    let newFood: Point;
    let attempts = 0;
    while (true) {
      attempts++;
      newFood = {
        x: Math.floor(Math.random() * (CANVAS_WIDTH / GRID_SIZE)),
        y: Math.floor(Math.random() * (CANVAS_HEIGHT / GRID_SIZE)),
      };
      
      const isColliding = currentSnake.some(
        segment => segment.x === newFood.x && segment.y === newFood.y
      );
      if (!isColliding) break;
      if (attempts > 100) break;
    }
    if (attempts > 5) addLog('WARN', '食物生成位置衝突已排除');
    return newFood;
  }, [addLog]);

  // 重置遊戲
  const resetGame = () => {
    snakeRef.current = INITIAL_SNAKE;
    directionRef.current = INITIAL_DIRECTION;
    nextDirectionRef.current = INITIAL_DIRECTION;
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setFood(generateFood(INITIAL_SNAKE));
    setScore(0);
    setIsGameOver(false);
    setIsPaused(false);
    setSpeed(INITIAL_SPEED);
    addLog('INFO', '系統重置：就緒');
  };

  // 鍵盤監聽
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || e.key === 'ArrowUp') {
        if (directionRef.current !== Direction.DOWN) nextDirectionRef.current = Direction.UP;
      } else if (key === 's' || e.key === 'ArrowDown') {
        if (directionRef.current !== Direction.UP) nextDirectionRef.current = Direction.DOWN;
      } else if (key === 'a' || e.key === 'ArrowLeft') {
        if (directionRef.current !== Direction.RIGHT) nextDirectionRef.current = Direction.LEFT;
      } else if (key === 'd' || e.key === 'ArrowRight') {
        if (directionRef.current !== Direction.LEFT) nextDirectionRef.current = Direction.RIGHT;
      } else if (e.key === ' ') {
        if (!isGameOver) setIsPaused(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGameOver]);

  // 遊戲邏輯更新
  const update = useCallback(() => {
    if (isGameOver || isPaused) return;

    directionRef.current = nextDirectionRef.current;
    const head = snakeRef.current[0];
    const newHead = { ...head };

    switch (directionRef.current) {
      case Direction.UP: newHead.y -= 1; break;
      case Direction.DOWN: newHead.y += 1; break;
      case Direction.LEFT: newHead.x -= 1; break;
      case Direction.RIGHT: newHead.x += 1; break;
    }

    if (
      newHead.x < 0 || 
      newHead.x >= CANVAS_WIDTH / GRID_SIZE || 
      newHead.y < 0 || 
      newHead.y >= CANVAS_HEIGHT / GRID_SIZE
    ) {
      setIsGameOver(true);
      addLog('WARN', '碰撞：邊界撞擊');
      return;
    }

    if (snakeRef.current.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
      setIsGameOver(true);
      addLog('WARN', '碰撞：自身重疊');
      return;
    }

    const newSnake = [newHead, ...snakeRef.current];

    if (newHead.x === food.x && newHead.y === food.y) {
      setScore(s => {
        const newScore = s + 10;
        if (newScore > highScore) setHighScore(newScore);
        addLog('EVENT', `分數更新：+10 (總分: ${newScore})`);
        return newScore;
      });
      addLog('EVENT', '蛇身節點已增加');
      setFood(generateFood(newSnake));
      setSpeed(prev => Math.max(MIN_SPEED, prev - SPEED_INCREMENT));
    } else {
      newSnake.pop();
    }

    snakeRef.current = newSnake;
    setSnake(newSnake);
    setDirection(directionRef.current);
  }, [food, isGameOver, isPaused, generateFood, highScore, addLog]);

  // 遊戲迴圈
  useEffect(() => {
    const loop = (time: number) => {
      if (time - lastMoveTimeRef.current > speed) {
        update();
        lastMoveTimeRef.current = time;
      }
      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [update, speed]);

  // 渲染畫布
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 繪製點狀網格
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let x = 0; x < CANVAS_WIDTH; x += GRID_SIZE) {
      for (let y = 0; y < CANVAS_HEIGHT; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.arc(x + GRID_SIZE / 2, y + GRID_SIZE / 2, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 繪製食物 (Rose-500)
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#f43f5e';
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.roundRect(
      food.x * GRID_SIZE + 4,
      food.y * GRID_SIZE + 4,
      GRID_SIZE - 8,
      GRID_SIZE - 8,
      2
    );
    ctx.fill();

    // 繪製蛇 (Cyan 漸層)
    snake.forEach((segment, index) => {
      ctx.shadowBlur = index === 0 ? 15 : 0;
      ctx.shadowColor = '#22d3ee';
      
      const colors = ['#22d3ee', '#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63'];
      ctx.fillStyle = colors[Math.min(index, colors.length - 1)];
      
      const padding = 1;
      ctx.beginPath();
      ctx.roundRect(
        segment.x * GRID_SIZE + padding,
        segment.y * GRID_SIZE + padding,
        GRID_SIZE - padding * 2,
        GRID_SIZE - padding * 2,
        index === 0 ? 4 : 2
      );
      ctx.fill();

      // 頭部眼睛
      if (index === 0) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000';
        const eyeSize = 3;
        ctx.fillRect(segment.x * GRID_SIZE + 5, segment.y * GRID_SIZE + 6, eyeSize, eyeSize);
        ctx.fillRect(segment.x * GRID_SIZE + 12, segment.y * GRID_SIZE + 6, eyeSize, eyeSize);
      }
    });

  }, [snake, food]);

  const speedModifier = (INITIAL_SPEED / speed).toFixed(2);

  return (
    <div className="w-full h-screen bg-[#050505] text-slate-100 flex flex-col overflow-hidden font-sans select-none tracking-tight">
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-8 bg-[#0a0a0a]">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-cyan-500 rounded flex items-center justify-center">
            <span className="font-mono font-bold text-black italic">S</span>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-[0.2em] uppercase flex items-center gap-2">
              Neon_Snake.ts
            </h1>
            <p className="text-[10px] text-cyan-500/70 font-mono tracking-widest uppercase">VITE_DEV_SERVER_V1.4.2</p>
          </div>
        </div>
        <div className="flex items-center space-x-12">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-tighter text-slate-500 mb-0.5">當前分數</p>
            <p className="text-2xl font-mono text-cyan-400 leading-none">{score.toString().padStart(6, '0')}</p>
          </div>
          <div className="text-center border-l border-white/10 pl-12">
            <p className="text-[10px] uppercase tracking-tighter text-slate-500 mb-0.5">最高紀錄</p>
            <p className="text-2xl font-mono text-white leading-none">{highScore.toString().padStart(6, '0')}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3 min-w-[140px] justify-end">
          <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-yellow-500 shadow-[0_0_8px_#eab308]' : isGameOver ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 'bg-green-500 shadow-[0_0_8px_#22c55e]'}`}></span>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
            狀態: {isGameOver ? '連線中斷' : isPaused ? '待命模式' : '同步執行中'}
          </span>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-64 border-r border-white/10 bg-[#080808] p-6 flex flex-col space-y-8">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Activity size={14} className="text-slate-500" />
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">玩家指標</h3>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-white/5 rounded-lg border border-white/5 group hover:border-cyan-500/30 transition-colors">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">蛇身總長</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-xl font-mono text-slate-200">{snake.length}</p>
                  <span className="text-[10px] text-slate-600 uppercase font-mono">單位</span>
                </div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/5 group hover:border-cyan-500/30 transition-colors">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">速度倍率</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-xl font-mono text-slate-200">{speedModifier}x</p>
                  <span className="text-[10px] text-slate-600 uppercase font-mono">即時資訊</span>
                </div>
              </div>
            </div>
          </section>
          
          <section className="flex-1">
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={14} className="text-slate-500" />
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">全球排行榜</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-mono p-1.5 border-b border-white/5">
                <span className="text-cyan-400">01. CYBER_PUNK</span>
                <span className="text-slate-300">12,400</span>
              </div>
              <div className="flex justify-between text-[11px] font-mono p-1.5 border-b border-white/5 opacity-70">
                <span>02. HEX_VOID</span>
                <span>10,120</span>
              </div>
              <div className="flex justify-between text-[11px] font-mono p-1.5 border-b border-white/5 opacity-40">
                <span>03. NULL_PTR</span>
                <span>09,200</span>
              </div>
            </div>
          </section>

          <div className="p-4 bg-cyan-950/20 border border-cyan-900/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info size={12} className="text-cyan-400" />
              <p className="text-[10px] text-cyan-200 uppercase tracking-wider">專案資訊</p>
            </div>
            <p className="text-[11px] leading-relaxed text-cyan-100/60 font-mono">
              基於 React 19 與 TypeScript 建立。繪圖引擎：HTML5 Canvas context-2d。
            </p>
          </div>
        </aside>

        <section className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
          
          <div className="relative group p-1 bg-slate-900 shadow-[0_0_80px_rgba(0,0,0,0.8)] rounded-sm">
            <div className="absolute -inset-0.5 bg-cyan-500/10 rounded group-hover:bg-cyan-500/20 transition-colors duration-500"></div>
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="block relative z-10"
            />

            <AnimatePresence>
              {(isPaused || isGameOver) && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 bg-black/60 backdrop-blur-[4px] flex flex-col items-center justify-center text-center p-8 cursor-pointer"
                  onClick={() => !isGameOver && setIsPaused(false)}
                >
                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex flex-col items-center"
                  >
                    {isGameOver ? (
                      <>
                        <div className="w-16 h-16 bg-rose-500/20 border border-rose-500/50 rounded-full flex items-center justify-center mb-6 text-rose-500">
                          <RefreshCcw size={32} />
                        </div>
                        <h2 className="text-5xl font-black italic tracking-tighter uppercase mb-2 text-white">系統故障</h2>
                        <p className="text-rose-500/80 font-mono text-xs uppercase tracking-[0.3em] mb-8">連線已中斷 / 最終長度: {snake.length}</p>
                        <button 
                          onClick={(e) => { e.stopPropagation(); resetGame(); }}
                          className="px-10 py-3 bg-white text-black font-bold text-xs uppercase tracking-[0.2em] rounded hover:bg-cyan-400 transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                        >
                          重啟遊戲核心
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-cyan-500/20 border border-cyan-500/50 rounded-full flex items-center justify-center mb-6 text-cyan-400 animate-pulse">
                          <Gamepad2 size={32} />
                        </div>
                        <h2 className="text-4xl font-black italic tracking-tighter uppercase mb-4 text-white">網格待命</h2>
                        <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px] uppercase tracking-[0.4em]">
                          <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>
                          等待系統初始化
                        </div>
                        <p className="mt-8 text-[10px] text-slate-500 uppercase tracking-widest">點擊或按下空白鍵進行同步</p>
                      </>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        <aside className="w-72 border-l border-white/10 bg-[#080808] p-6 flex flex-col">
          <div className="mb-10">
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-6">導航系統</h3>
            <div className="grid grid-cols-3 gap-2 w-40 mx-auto">
              <div></div>
              <div className={`h-12 border rounded flex items-center justify-center transition-colors ${direction === Direction.UP ? 'bg-cyan-500 border-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'border-white/10 bg-white/5 text-slate-500'}`}>
                <ArrowUp size={18} strokeWidth={3} />
              </div>
              <div></div>
              <div className={`h-12 border rounded flex items-center justify-center transition-colors ${direction === Direction.LEFT ? 'bg-cyan-500 border-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'border-white/10 bg-white/5 text-slate-500'}`}>
                <ArrowLeft size={18} strokeWidth={3} />
              </div>
              <div className={`h-12 border rounded flex items-center justify-center transition-colors ${direction === Direction.DOWN ? 'bg-cyan-500 border-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'border-white/10 bg-white/5 text-slate-500'}`}>
                <ArrowDown size={18} strokeWidth={3} />
              </div>
              <div className={`h-12 border rounded flex items-center justify-center transition-colors ${direction === Direction.RIGHT ? 'bg-cyan-500 border-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'border-white/10 bg-white/5 text-slate-500'}`}>
                <ArrowRight size={18} strokeWidth={3} />
              </div>
            </div>
            <div className="flex justify-center mt-4 gap-4 text-[9px] font-mono text-slate-500 uppercase">
               <span>[WASD]</span>
               <span>[方向鍵]</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-4">
              <Terminal size={14} className="text-slate-500" />
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">系統控制台</h3>
            </div>
            <div className="flex-1 font-mono text-[10px] space-y-2 text-slate-400 bg-black/40 p-4 rounded border border-white/5 overflow-y-auto custom-scrollbar shadow-inner">
              <AnimatePresence initial={false}>
                {logs.map((log) => (
                  <motion.div 
                    key={log.id}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="leading-relaxed"
                  >
                    <span className="text-slate-600 mr-2">[{log.time}]</span>
                    <span className={`mr-2 font-bold ${
                      log.type === 'INFO' ? 'text-cyan-600' :
                      log.type === 'WARN' ? 'text-rose-600' : 'text-emerald-600'
                    }`}>[{log.type === 'INFO' ? '資訊' : log.type === 'WARN' ? '警告' : '事件'}]</span>
                    {log.message}
                  </motion.div>
                ))}
              </AnimatePresence>
              <div className="animate-pulse flex items-center gap-1">
                 <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>
                 <span className="text-white">_</span>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-3">
             <button 
              onClick={resetGame}
              className="w-full py-4 bg-white text-black font-black text-[10px] uppercase tracking-[0.3em] rounded hover:bg-cyan-400 transition-all active:translate-y-0.5 shadow-[0_4px_0_rgba(150,150,150,0.4)] hover:shadow-none"
            >
              重置工作階段
            </button>
            <div className="text-center text-[9px] text-slate-600 font-mono tracking-tighter uppercase">GRID_AUTH_SECURED</div>
          </div>
        </aside>
      </main>

      <footer className="h-10 bg-[#0a0a0a] border-t border-white/10 flex items-center justify-between px-8">
        <div className="flex space-x-8 items-center">
          <div className="flex items-center gap-2">
             <span className="w-1 h-1 bg-cyan-500 rounded-full"></span>
             <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">環境: Production</span>
          </div>
          <div className="flex items-center gap-2">
             <span className="w-1 h-1 bg-cyan-500 rounded-full"></span>
             <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">延遲: 14ms</span>
          </div>
          <div className="flex items-center gap-2">
             <span className="w-1 h-1 bg-cyan-500 rounded-full"></span>
             <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">FPS: 60.0_穩定</span>
          </div>
        </div>
        <div className="text-[9px] font-mono text-slate-600 tracking-[0.2em] uppercase">
          © 2026 VITE_SNAKE_SYSTEMS_INTL
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
      `}} />
    </div>
  );
}
