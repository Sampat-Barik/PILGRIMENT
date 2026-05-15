import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Glitch-themed loading screen shown during transitions
 * between Intro → Login → Dashboard.
 */
const LoadingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('AUTHENTICATING');

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 400);
          return 100;
        }
        return prev + Math.random() * 8 + 2;
      });
    }, 80);

    const texts = [
      { t: 'AUTHENTICATING', d: 0 },
      { t: 'LOADING MODULES', d: 600 },
      { t: 'SYNCING DATA', d: 1200 },
      { t: 'INITIALIZING UI', d: 1800 },
      { t: 'READY', d: 2200 },
    ];
    const timers = texts.map(({ t, d }) => setTimeout(() => setStatusText(t), d));

    return () => {
      clearInterval(interval);
      timers.forEach(clearTimeout);
    };
  }, [onComplete]);

  const clampedProgress = Math.min(progress, 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center gap-8"
      style={{ animation: 'flicker 4s infinite' }}
    >
      {/* Glitch bars background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-full"
            style={{
              height: 2 + Math.random() * 3,
              top: `${20 + i * 15}%`,
              background: i % 2 === 0
                ? 'linear-gradient(90deg, transparent, rgba(255,0,110,0.06), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(0,245,212,0.06), transparent)',
            }}
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 3 + i, repeat: Infinity, ease: 'linear' }}
          />
        ))}
      </div>

      {/* Logo */}
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="w-16 h-16 bg-slate-900 rounded-2xl border-2 border-slate-900 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
      >
        <span className="text-2xl font-black text-white">P</span>
      </motion.div>

      {/* Progress bar */}
      <div className="w-64 space-y-3">
        <div className="h-3 bg-slate-100 border-2 border-slate-900 rounded-full overflow-hidden relative">
          <motion.div
            className="h-full rounded-full"
            style={{
              width: `${clampedProgress}%`,
              background: 'linear-gradient(90deg, #ff006e, #8338ec, #3a86ff, #00f5d4)',
            }}
            transition={{ duration: 0.1 }}
          />
          {/* Glitch overlay on progress */}
          {Math.random() > 0.7 && (
            <div
              className="absolute top-0 h-full bg-white/30"
              style={{ left: `${Math.random() * 80}%`, width: `${5 + Math.random() * 15}%` }}
            />
          )}
        </div>

        <div className="flex justify-between items-center">
          <span
            className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 glitch-text"
            data-text={statusText}
          >
            {statusText}
          </span>
          <span className="text-xs font-black text-slate-900 tabular-nums">
            {Math.round(clampedProgress)}%
          </span>
        </div>
      </div>

      {/* Bottom accent line */}
      <motion.div
        className="absolute bottom-0 left-0 h-1 rounded-r-full"
        style={{ background: 'linear-gradient(90deg, #ff006e, #8338ec, #00f5d4)' }}
        animate={{ width: `${clampedProgress}%` }}
        transition={{ duration: 0.1 }}
      />
    </motion.div>
  );
};

export default LoadingScreen;
