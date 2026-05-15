import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Cpu, Globe, Zap, ArrowRight, Radar, Lock, Wifi, Database, Eye } from 'lucide-react';

/* ─────────────────────────────────────────────
   Clean Intro — Plain black + mouse-interactive glitch rifts
   ───────────────────────────────────────────── */

const BOOT_LINES = [
  { text: '> INITIALIZING PILGRIMENT CORE v4.2...', delay: 0 },
  { text: '> LOADING AI ENGINE .................. OK', delay: 400 },
  { text: '> ESTABLISHING IoT MESH NETWORK ...... OK', delay: 900 },
  { text: '> FIREBASE AUTH MODULE ............... OK', delay: 1400 },
  { text: '> CROWD DETECTION MODEL (YOLOv8) .... OK', delay: 1800 },
  { text: '> VERIFYING DATABASE INTEGRITY ....... OK', delay: 2200 },
  { text: '> SECURITY PROTOCOLS ENGAGED ......... OK', delay: 2600 },
  { text: '> ALL SYSTEMS NOMINAL', delay: 3000 },
  { text: '', delay: 3200 },
  { text: '> LAUNCHING INTERFACE...', delay: 3400 },
];

const SYSTEM_CHECKS = [
  { label: 'AI Engine', icon: Cpu, status: 'ONLINE', color: '#ff006e' },
  { label: 'IoT Net', icon: Wifi, status: 'LINKED', color: '#00f5d4' },
  { label: 'Security', icon: Lock, status: 'ARMED', color: '#8338ec' },
  { label: 'Database', icon: Database, status: 'SYNCED', color: '#3a86ff' },
  { label: 'Monitor', icon: Eye, status: 'ACTIVE', color: '#ffbe0b' },
  { label: 'Radar', icon: Radar, status: 'SCAN', color: '#fb5607' },
];

const TITLE_LETTERS = 'PILGRIMENT'.split('');

interface Rift {
  x: number;
  y: number;
  angle: number;
  length: number;
  thickness: number;
  split: number;
  isBolt: boolean;
  life: number;
  maxLife: number;
  color: string;
}

interface AmbientShard {
  x: number;
  y: number;
  length: number;
  angle: number;
  alpha: number;
}

interface FlashLine {
  x: number;
  y: number;
  angle: number;
  length: number;
  thickness: number;
  life: number;
  maxLife: number;
  color: string;
}

const IntroPage = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState(0);
  const [visibleLines, setVisibleLines] = useState(0);
  const [checksRevealed, setChecksRevealed] = useState(0);
  const [titleRevealed, setTitleRevealed] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -999, y: -999 });
  const riftsRef = useRef<Rift[]>([]);
  const ambientRef = useRef<AmbientShard[]>([]);
  const flashesRef = useRef<FlashLine[]>([]);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 4200),
      setTimeout(() => setPhase(3), 6500),
      setTimeout(() => setPhase(4), 8500),
      setTimeout(() => setPhase(5), 10000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (phase < 1) return;
    const timers = BOOT_LINES.map((line, i) =>
      setTimeout(() => setVisibleLines(i + 1), line.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  useEffect(() => {
    if (phase < 2) return;
    const timers = SYSTEM_CHECKS.map((_, i) =>
      setTimeout(() => setChecksRevealed(i + 1), i * 250)
    );
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  useEffect(() => {
    if (phase < 3) return;
    const timers = TITLE_LETTERS.map((_, i) =>
      setTimeout(() => setTitleRevealed(i + 1), i * 100)
    );
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  // Mouse-interactive random glitch rifts
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animId: number;

    const NEON_COLORS = ['#ff006e', '#00f5d4', '#8338ec', '#3a86ff', '#ffbe0b'];
    const MAX_RIFTS = 240;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ambientRef.current = [];
      const shardCount = Math.floor((canvas.width * canvas.height) / 14000);
      for (let i = 0; i < shardCount; i += 1) {
        ambientRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          length: 4 + Math.random() * 10,
          angle: -0.6 + Math.random() * 1.2,
          alpha: 0.04 + Math.random() * 0.08,
        });
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const spawnRift = (x: number, y: number, intensity = 1) => {
      const burst = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < burst; i += 1) {
        const spread = 16 + Math.random() * 44;
        const dir = Math.random() * Math.PI * 2;
        riftsRef.current.push({
          x: x + Math.cos(dir) * spread,
          y: y + Math.sin(dir) * spread,
          angle: Math.random() * Math.PI * 2,
          length: (28 + Math.random() * 90) * intensity,
          thickness: 1 + Math.random() * 2.2,
          split: 2 + Math.random() * 5,
          isBolt: Math.random() > 0.68,
          life: 20 + Math.random() * 18,
          maxLife: 20 + Math.random() * 18,
          color: NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)],
        });
      }

      if (riftsRef.current.length > MAX_RIFTS) {
        riftsRef.current.splice(0, riftsRef.current.length - MAX_RIFTS);
      }
    };

    const spawnRandomFlash = () => {
      const count = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i += 1) {
        flashesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          angle: Math.random() * Math.PI * 2,
          length: 40 + Math.random() * 160,
          thickness: 0.8 + Math.random() * 2.2,
          life: 4 + Math.random() * 6,
          maxLife: 4 + Math.random() * 6,
          color: NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)],
        });
      }
    };

    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mouseRef.current = { x, y };
      spawnRift(x, y, 1);
      if (Math.random() > 0.75) {
        spawnRift(x, y, 1.5);
      }
    };
    const handleLeave = () => {
      mouseRef.current = { x: -999, y: -999 };
    };
    canvas.addEventListener('mousemove', handleMouse);
    canvas.addEventListener('mouseleave', handleLeave);

    const drawRiftStroke = (
      rift: Rift,
      offset: number,
      color: string,
      alpha: number,
      widthMul: number,
    ) => {
      const nx = -Math.sin(rift.angle);
      const ny = Math.cos(rift.angle);
      const ox = nx * offset;
      const oy = ny * offset;

      const jaggedSegments = rift.isBolt ? 7 + Math.floor(Math.random() * 4) : 4 + Math.floor(Math.random() * 4);
      const stepLen = rift.length / jaggedSegments;
      let px = rift.x - Math.cos(rift.angle) * (rift.length * 0.5) + ox;
      let py = rift.y - Math.sin(rift.angle) * (rift.length * 0.5) + oy;

      ctx.beginPath();
      ctx.moveTo(px, py);
      for (let i = 1; i <= jaggedSegments; i += 1) {
        const jitterBase = rift.isBolt ? 16 : 8;
        const jitter = (Math.random() - 0.5) * (jitterBase + rift.thickness * 3);
        px += Math.cos(rift.angle) * stepLen + nx * jitter;
        py += Math.sin(rift.angle) * stepLen + ny * jitter;
        ctx.lineTo(px, py);
      }

      ctx.lineWidth = rift.thickness * widthMul;
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.stroke();
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (Math.random() > 0.93) {
        spawnRandomFlash();
      }

      ambientRef.current.forEach((shard) => {
        const pulse = 0.6 + Math.random() * 0.6;
        const half = shard.length * 0.5;
        const dx = Math.cos(shard.angle) * half;
        const dy = Math.sin(shard.angle) * half;
        ctx.lineWidth = 1;
        ctx.globalAlpha = shard.alpha * pulse;
        ctx.strokeStyle = '#a5b4fc';
        ctx.beginPath();
        ctx.moveTo(shard.x - dx, shard.y - dy);
        ctx.lineTo(shard.x + dx, shard.y + dy);
        ctx.stroke();
      });

      riftsRef.current = riftsRef.current.filter((rift) => {
        rift.life -= 1;
        if (rift.life <= 0) return false;

        const t = rift.life / rift.maxLife;
        const coreAlpha = Math.pow(t, 1.3);
        const splitAlpha = coreAlpha * 0.55;

        ctx.lineCap = 'round';
        ctx.shadowBlur = 8 + (1 - t) * 10;
        ctx.shadowColor = rift.color;
        drawRiftStroke(rift, 0, rift.color, coreAlpha, 1.2);

        ctx.shadowBlur = 0;
        drawRiftStroke(rift, -rift.split, '#ff006e', splitAlpha, 0.75);
        drawRiftStroke(rift, rift.split, '#00f5d4', splitAlpha, 0.75);

        rift.x += (Math.random() - 0.5) * 1.6;
        rift.y += (Math.random() - 0.5) * 1.6;
        rift.angle += (Math.random() - 0.5) * 0.08;
        return true;
      });

      flashesRef.current = flashesRef.current.filter((line) => {
        line.life -= 1;
        if (line.life <= 0) return false;

        const t = line.life / line.maxLife;
        const nx = -Math.sin(line.angle);
        const ny = Math.cos(line.angle);
        const segmentCount = 5 + Math.floor(Math.random() * 4);
        const stepLen = line.length / segmentCount;
        let px = line.x - Math.cos(line.angle) * (line.length * 0.5);
        let py = line.y - Math.sin(line.angle) * (line.length * 0.5);

        ctx.beginPath();
        ctx.moveTo(px, py);
        for (let i = 1; i <= segmentCount; i += 1) {
          const jitter = (Math.random() - 0.5) * 18;
          px += Math.cos(line.angle) * stepLen + nx * jitter;
          py += Math.sin(line.angle) * stepLen + ny * jitter;
          ctx.lineTo(px, py);
        }
        ctx.lineCap = 'round';
        ctx.lineWidth = line.thickness;
        ctx.strokeStyle = line.color;
        ctx.shadowColor = line.color;
        ctx.shadowBlur = 10;
        ctx.globalAlpha = Math.pow(t, 1.4) * 0.75;
        ctx.stroke();
        return true;
      });

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouse);
      canvas.removeEventListener('mouseleave', handleLeave);
    };
  }, []);

  useEffect(() => { const cleanup = drawCanvas(); return cleanup; }, [drawCanvas]);

  return (
    <div className="min-h-screen w-full bg-black flex flex-col items-center justify-center relative overflow-hidden select-none">
      <canvas ref={canvasRef} className="absolute inset-0 z-0 cursor-none" />

      {/* Skip */}
      <motion.button
        onClick={() => navigate('/login')}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        whileHover={{ opacity: 1, scale: 1.05 }}
        transition={{ delay: 2 }}
        className="absolute top-6 right-6 z-50 text-xs font-black text-[#00f5d4] uppercase tracking-widest px-4 py-2 border border-[#00f5d4]/30 rounded-lg hover:border-[#00f5d4] hover:bg-[#00f5d4]/10 transition-all"
      >
        Skip →
      </motion.button>

      <div className="relative z-10 flex flex-col items-center w-full max-w-3xl px-6">

        {/* PHASE 0 */}
        <AnimatePresence>
          {phase === 0 && (
            <motion.div className="flex flex-col items-center gap-4" exit={{ opacity: 0, scale: 0.5 }}>
              <motion.div
                className="w-4 h-4 rounded-full"
                style={{ background: 'linear-gradient(135deg, #ff006e, #00f5d4)' }}
                animate={{ scale: [1, 2, 1], opacity: [0.5, 1, 0.5], boxShadow: ['0 0 10px #ff006e', '0 0 30px #00f5d4', '0 0 10px #ff006e'] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
              <motion.p
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-xs font-mono font-bold text-[#8338ec] uppercase tracking-[0.4em]"
              >
                Initializing
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PHASE 1: Terminal */}
        <AnimatePresence>
          {phase >= 1 && phase < 3 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30, scale: 0.95 }}
              className="w-full max-w-xl"
            >
              <div className="bg-[#0a0a12] border border-[#1a1a2e] rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(131,56,236,0.1)]">
                <div className="flex items-center gap-2 px-4 py-3 bg-[#0e0e18] border-b border-[#1a1a2e]">
                  <div className="w-3 h-3 rounded-full bg-[#ff006e]" />
                  <div className="w-3 h-3 rounded-full bg-[#ffbe0b]" />
                  <div className="w-3 h-3 rounded-full bg-[#00f5d4]" />
                  <span className="ml-3 text-[10px] font-mono font-bold text-[#8338ec]/60 uppercase tracking-wider">pilgriment-core</span>
                </div>
                <div className="p-5 font-mono text-sm space-y-1.5 min-h-[280px]">
                  {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={
                        line.text.includes('OK') ? 'text-[#00f5d4]' :
                        line.text.includes('NOMINAL') ? 'text-[#3a86ff] font-bold' :
                        line.text.includes('LAUNCHING') ? 'text-[#ffbe0b] font-bold' :
                        'text-white/40'
                      }
                    >
                      {line.text}
                      {line.text.includes('OK') && (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[#00f5d4] ml-2 text-xs">✓</motion.span>
                      )}
                    </motion.div>
                  ))}
                  {phase < 2 && (
                    <motion.span className="inline-block w-2.5 h-4 bg-[#00f5d4] ml-1" animate={{ opacity: [1, 0] }} transition={{ duration: 0.6, repeat: Infinity }} />
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PHASE 2: System checks */}
        <AnimatePresence>
          {phase >= 2 && phase < 3 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-6 w-full max-w-2xl">
              {SYSTEM_CHECKS.map((check, i) => (
                <motion.div
                  key={check.label}
                  initial={{ opacity: 0, scale: 0, y: 20 }}
                  animate={i < checksRevealed ? { opacity: 1, scale: 1, y: 0 } : {}}
                  transition={{ duration: 0.35, ease: 'backOut' }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-white/10 bg-white/[0.03]"
                  style={{ boxShadow: `0 0 15px ${check.color}20` }}
                >
                  <check.icon size={20} style={{ color: check.color }} />
                  <span className="text-[8px] font-black text-white/60 uppercase tracking-wider">{check.label}</span>
                  <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded border"
                    style={{ color: check.color, borderColor: `${check.color}40`, backgroundColor: `${check.color}10` }}>
                    {check.status}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* PHASE 3: Title */}
        <AnimatePresence>
          {phase >= 3 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-4">
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter flex justify-center">
                {TITLE_LETTERS.map((letter, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 60, rotateX: -90 }}
                    animate={i < titleRevealed ? { opacity: 1, y: 0, rotateX: 0 } : {}}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="inline-block"
                    style={{
                      color: i >= 7 ? '#ff006e' : 'white',
                      textShadow: i >= 7
                        ? '3px 0 #00f5d4, -3px 0 #3a86ff, 0 0 20px rgba(255,0,110,0.5)'
                        : '0 0 20px rgba(255,255,255,0.1)',
                    }}
                  >
                    {letter}
                  </motion.span>
                ))}
              </h1>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 1.2 }}
                className="h-1.5 rounded-full mt-4 mx-auto origin-left"
                style={{ width: 200, background: 'linear-gradient(90deg, #ff006e, #8338ec, #3a86ff, #00f5d4)' }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* PHASE 4: Subtitle + badges */}
        <AnimatePresence>
          {phase >= 4 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="flex flex-col items-center gap-6 mt-6">
              <p className="text-lg md:text-xl text-white/40 font-bold text-center max-w-md">
                AI & IoT-Powered Smart Pilgrimage<br />Crowd Management System
              </p>
              <motion.div className="flex flex-wrap justify-center gap-3" initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}>
                {[
                  { icon: Cpu, label: 'YOLOv8 AI', color: '#ff006e' },
                  { icon: Globe, label: 'IoT Mesh', color: '#00f5d4' },
                  { icon: ShieldCheck, label: 'Firebase', color: '#8338ec' },
                  { icon: Radar, label: 'Real-Time', color: '#ffbe0b' },
                ].map((f) => (
                  <motion.div
                    key={f.label}
                    variants={{ hidden: { opacity: 0, y: 15, scale: 0.8 }, visible: { opacity: 1, y: 0, scale: 1 } }}
                    whileHover={{ y: -3, scale: 1.05 }}
                    className="border rounded-xl px-4 py-2.5 flex items-center gap-2 cursor-default"
                    style={{ borderColor: `${f.color}40`, backgroundColor: `${f.color}08`, boxShadow: `0 0 12px ${f.color}15` }}
                  >
                    <f.icon size={16} style={{ color: f.color }} />
                    <span className="font-black text-xs text-white/70 uppercase tracking-wider">{f.label}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PHASE 5: CTA */}
        <AnimatePresence>
          {phase >= 5 && (
            <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="flex flex-col items-center gap-5 mt-10">
              <motion.button
                onClick={() => navigate('/login')}
                whileHover={{ scale: 1.04, y: -3 }}
                whileTap={{ scale: 0.97 }}
                className="text-lg px-12 py-4 flex items-center gap-3 rounded-xl font-black text-white border-2 relative overflow-hidden group transition-all"
                style={{ borderColor: '#ff006e', background: 'linear-gradient(135deg, rgba(255,0,110,0.15), rgba(131,56,236,0.15))', boxShadow: '0 0 30px rgba(255,0,110,0.2), 0 0 60px rgba(131,56,236,0.1)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                <Zap size={22} className="relative z-10 text-[#ffbe0b]" />
                <span className="relative z-10">Enter System</span>
                <ArrowRight size={22} className="relative z-10 text-[#00f5d4]" />
              </motion.button>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex items-center gap-4 text-[10px] font-black text-white/25 uppercase tracking-[0.2em]">
                <span className="flex items-center gap-1.5" style={{ color: '#ff006e80' }}><Lock size={10} /> Secure</span>
                <span className="w-1 h-1 bg-white/15 rounded-full" />
                <span className="flex items-center gap-1.5" style={{ color: '#00f5d480' }}><Eye size={10} /> Monitoring</span>
                <span className="w-1 h-1 bg-white/15 rounded-full" />
                <span className="flex items-center gap-1.5" style={{ color: '#8338ec80' }}><Cpu size={10} /> AI-Driven</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.div className="absolute bottom-6 flex items-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: phase >= 5 ? 0.3 : 0 }}>
        <div className="w-8 h-[1px] bg-gradient-to-r from-transparent to-[#ff006e]/30" />
        <span className="text-[9px] font-black uppercase tracking-[0.35em] text-white/20">SyntaxSync · 2026</span>
        <div className="w-8 h-[1px] bg-gradient-to-l from-transparent to-[#00f5d4]/30" />
      </motion.div>
    </div>
  );
};

export default IntroPage;
