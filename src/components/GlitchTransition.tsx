import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

/**
 * Full-screen glitch overlay that plays during theme transitions.
 * Creates a Spider-Verse style "reality breaking" effect.
 */
const GlitchTransition = () => {
  const { isTransitioning, isDark } = useTheme();

  return (
    <AnimatePresence>
      {isTransitioning && (
        <motion.div
          className="fixed inset-0 z-[9999] pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Horizontal glitch slices */}
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-full"
              style={{
                top: `${(i / 12) * 100}%`,
                height: `${100 / 12}%`,
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
              }}
              initial={{ x: 0, opacity: 0 }}
              animate={{
                x: [
                  0,
                  (i % 2 === 0 ? 1 : -1) * (20 + Math.random() * 40),
                  (i % 2 === 0 ? -1 : 1) * (10 + Math.random() * 30),
                  0,
                ],
                opacity: [0, 0.9, 0.95, 0],
                scaleY: [1, 1 + Math.random() * 0.3, 1, 1],
              }}
              transition={{
                duration: 0.8,
                delay: Math.random() * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}

          {/* Chromatic aberration bars */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={`chr-${i}`}
              className="absolute w-full"
              style={{
                top: `${10 + Math.random() * 80}%`,
                height: 2 + Math.random() * 4,
                background: i % 3 === 0 ? '#ff006e' : i % 3 === 1 ? '#00f5d4' : '#3a86ff',
                mixBlendMode: 'screen',
              }}
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{
                opacity: [0, 0.7, 0],
                scaleX: [0, 1.2, 0],
                x: [0, (Math.random() - 0.5) * 100, 0],
              }}
              transition={{
                duration: 0.5,
                delay: 0.1 + Math.random() * 0.3,
              }}
            />
          ))}

          {/* Central flash */}
          <motion.div
            className="absolute inset-0"
            style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 0.8, 0] }}
            transition={{ duration: 0.8, times: [0, 0.3, 0.5, 1] }}
          />

          {/* Noise overlay */}
          <motion.div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`,
              mixBlendMode: 'overlay',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 0.6, delay: 0.15 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GlitchTransition;
