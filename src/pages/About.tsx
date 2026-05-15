import { useEffect, useRef, useState } from 'react';
import { Cpu, Shield, Globe, Users, Zap, Terminal, Crown, Code2, Cloud, CheckCircle2, ChevronDown, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' as const } },
};
import { Card } from '../components/Shared';
import TechStackWidget from '../components/TechStackWidget';

/* ─────────────────────────────────────────────
   Interactive Globe Canvas
   Renders a slowly rotating wireframe sphere
   with orbiting dots and pulse rings.
   ───────────────────────────────────────────── */
const InteractiveGlobe = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: (e.clientX - rect.left) / rect.width - 0.5,
        y: (e.clientY - rect.top) / rect.height - 0.5,
      };
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    // Generate globe points (latitude/longitude grid)
    const generatePoints = () => {
      const points: { lat: number; lon: number }[] = [];
      for (let lat = -80; lat <= 80; lat += 12) {
        const lonStep = Math.max(15, 12 / Math.cos((lat * Math.PI) / 180));
        for (let lon = 0; lon < 360; lon += lonStep) {
          points.push({ lat, lon });
        }
      }
      return points;
    };

    const globePoints = generatePoints();

    // Data connection lines (simulated routes between points)
    const connections = [
      { from: { lat: 21, lon: 40 }, to: { lat: 25, lon: 55 } },   // Mecca → Dubai
      { from: { lat: 21, lon: 40 }, to: { lat: 24, lon: 47 } },   // Mecca → Riyadh
      { from: { lat: 21, lon: 40 }, to: { lat: 30, lon: 31 } },   // Mecca → Cairo
      { from: { lat: 21, lon: 40 }, to: { lat: 41, lon: 29 } },   // Mecca → Istanbul
      { from: { lat: 21, lon: 40 }, to: { lat: 19, lon: 73 } },   // Mecca → Mumbai
    ];

    // Orbiting satellite dots
    const satellites = [0, 1.2, 2.5, 3.8, 5.1].map((offset) => ({
      offset,
      speed: 0.3 + Math.random() * 0.4,
      radiusMul: 1.15 + Math.random() * 0.15,
      tilt: Math.random() * 0.6 - 0.3,
    }));

    const project = (
      lat: number,
      lon: number,
      cx: number,
      cy: number,
      radius: number,
      rotY: number,
      rotX: number,
    ) => {
      const phi = ((90 - lat) * Math.PI) / 180;
      const theta = ((lon + rotY) * Math.PI) / 180;
      let x = radius * Math.sin(phi) * Math.cos(theta);
      let y = radius * Math.cos(phi);
      let z = radius * Math.sin(phi) * Math.sin(theta);

      // Apply X-axis tilt
      const cosRx = Math.cos(rotX);
      const sinRx = Math.sin(rotX);
      const y2 = y * cosRx - z * sinRx;
      const z2 = y * sinRx + z * cosRx;
      y = y2;
      z = z2;

      const scale = 300 / (300 + z);
      return {
        x: cx + x * scale,
        y: cy + y * scale,
        z,
        scale,
        visible: z < 80,
      };
    };

    const draw = () => {
      time += 0.004;
      const rect = container.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.34;

      ctx.clearRect(0, 0, w, h);

      // Dynamic rotation based on mouse
      const mouseX = mouseRef.current.x;
      const mouseY = mouseRef.current.y;
      const rotY = time * 18 + mouseX * 40;
      const rotX = (mouseY * 0.3) - 0.15;

      // Outer pulsing rings
      for (let i = 0; i < 3; i++) {
        const ringPhase = (time * 0.8 + i * 0.9) % 2.7;
        const ringAlpha = Math.max(0, 0.15 - ringPhase * 0.06);
        const ringRadius = radius + ringPhase * 30;
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(99, 102, 241, ${ringAlpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Globe equator & meridian lines
      const drawGreatCircle = (tilt: number, rotateY: number, alpha: number) => {
        ctx.beginPath();
        for (let a = 0; a <= 360; a += 2) {
          const phi = (a * Math.PI) / 180;
          let x = radius * Math.cos(phi);
          let y = radius * Math.sin(phi) * Math.cos(tilt);
          let z = radius * Math.sin(phi) * Math.sin(tilt);

          // Rotate Y
          const cosR = Math.cos((rotateY + rotY) * Math.PI / 180);
          const sinR = Math.sin((rotateY + rotY) * Math.PI / 180);
          const x2 = x * cosR - z * sinR;
          const z2 = x * sinR + z * cosR;
          x = x2;
          z = z2;

          // Rotate X
          const cosRx = Math.cos(rotX);
          const sinRx = Math.sin(rotX);
          const y2 = y * cosRx - z * sinRx;
          const z3 = y * sinRx + z * cosRx;

          const scale = 300 / (300 + z3);
          const sx = cx + x * scale;
          const sy = cy + y2 * scale;

          if (z3 < 80) {
            if (a === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          } else {
            ctx.moveTo(sx, sy);
          }
        }
        ctx.strokeStyle = `rgba(148, 163, 184, ${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      };

      // Draw latitude lines
      for (let lat = -60; lat <= 60; lat += 30) {
        drawGreatCircle((lat * Math.PI) / 180, 0, 0.2);
      }
      // Draw longitude lines
      for (let lon = 0; lon < 180; lon += 30) {
        drawGreatCircle(0, lon, 0.15);
      }

      // Globe dots
      globePoints.forEach((p) => {
        const proj = project(p.lat, p.lon, cx, cy, radius, rotY, rotX);
        if (!proj.visible) return;
        const dotAlpha = 0.15 + proj.scale * 0.35;
        const dotSize = 1 + proj.scale * 1;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, dotSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(148, 163, 184, ${dotAlpha})`;
        ctx.fill();
      });

      // Data connection arcs
      connections.forEach((conn, idx) => {
        const fromProj = project(conn.from.lat, conn.from.lon, cx, cy, radius, rotY, rotX);
        const toProj = project(conn.to.lat, conn.to.lon, cx, cy, radius, rotY, rotX);
        if (!fromProj.visible || !toProj.visible) return;

        // Animated pulse along the arc
        const pulse = (time * 1.5 + idx * 0.7) % 1;

        ctx.beginPath();
        const midX = (fromProj.x + toProj.x) / 2;
        const midY = (fromProj.y + toProj.y) / 2 - 20;
        ctx.moveTo(fromProj.x, fromProj.y);
        ctx.quadraticCurveTo(midX, midY, toProj.x, toProj.y);
        ctx.strokeStyle = `rgba(99, 102, 241, 0.35)`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Pulse dot along arc
        const px = fromProj.x + (toProj.x - fromProj.x) * pulse;
        const py = fromProj.y + (toProj.y - fromProj.y) * pulse - 20 * Math.sin(pulse * Math.PI);
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(129, 140, 248, 0.8)';
        ctx.fill();

        // Source glow
        ctx.beginPath();
        ctx.arc(fromProj.x, fromProj.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(99, 102, 241, 0.6)';
        ctx.fill();
      });

      // Satellite dots
      satellites.forEach((sat) => {
        const angle = time * sat.speed + sat.offset;
        const satRadius = radius * sat.radiusMul;
        const sx = cx + satRadius * Math.cos(angle);
        const sy = cy + satRadius * Math.sin(angle + sat.tilt);

        ctx.beginPath();
        ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(99, 102, 241, 0.5)';
        ctx.fill();

        // Trail
        for (let t = 1; t <= 4; t++) {
          const trailAngle = angle - t * 0.04;
          const tx = cx + satRadius * Math.cos(trailAngle);
          const ty = cy + satRadius * Math.sin(trailAngle + sat.tilt);
          ctx.beginPath();
          ctx.arc(tx, ty, 1.5 - t * 0.3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(99, 102, 241, ${0.25 - t * 0.05})`;
          ctx.fill();
        }
      });

      // Center glow (Mecca marker)
      const meccaProj = project(21, 40, cx, cy, radius, rotY, rotX);
      if (meccaProj.visible) {
        const glowPulse = 0.4 + Math.sin(time * 3) * 0.15;
        ctx.beginPath();
        ctx.arc(meccaProj.x, meccaProj.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(234, 179, 8, ${glowPulse})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(meccaProj.x, meccaProj.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(250, 204, 21, 0.9)';
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative bg-slate-900 border-4 border-slate-800 rounded-3xl overflow-hidden cursor-crosshair group"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Ambient background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/50 via-slate-900 to-purple-950/30 pointer-events-none" />

      <canvas ref={canvasRef} className="w-full h-full relative z-10" style={{ minHeight: '320px' }} />

      {/* Corner decorations */}
      <div className="absolute top-3 left-3 text-[8px] font-mono font-bold text-slate-500 uppercase tracking-widest z-20">
        Global Network
      </div>
      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        <span className="text-[8px] font-mono font-bold text-green-500 uppercase">Live</span>
      </div>
      <div className="absolute bottom-3 left-3 text-[8px] font-mono text-slate-600 z-20">
        {hovering ? '↕ Move mouse to rotate' : 'Hover to interact'}
      </div>
      <div className="absolute bottom-3 right-3 text-[8px] font-mono text-slate-600 z-20">
        5 Active Routes
      </div>
    </div>
  );
};

/* Inline brand SVG icons (not in lucide-react) */
const GithubIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
  </svg>
);
const LinkedinIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

/* ─────────────────────────────────────────────
   About Page
   ───────────────────────────────────────────── */
const About = () => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <motion.div
        className="text-center space-y-4"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <motion.h1 variants={fadeUp} custom={0} className="text-5xl font-black tracking-tighter">PROJECT SCOPE</motion.h1>
        <motion.p variants={fadeUp} custom={1} className="text-xl text-slate-500 font-medium">AI, IoT, and Cloud-Based Smart Pilgrimage Crowd Management System</motion.p>
        <motion.div variants={fadeUp} custom={2} className="w-24 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mx-auto rounded-full" />
      </motion.div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={staggerContainer}
      >
        {[
          { icon: <Cpu className="mb-4" size={32} />, title: 'AI ENGINE', desc: 'Computer vision models detect crowd density in real-time, identifying potential crush risks before they occur.', bg: 'bg-[#bfdbfe]' },
          { icon: <Globe className="mb-4" size={32} />, title: 'IoT NETWORK', desc: 'Distributed sensor nodes monitor environmental factors and physical flow across all pilgrimage sites.', bg: 'bg-[#fef08a]' },
          { icon: <Shield className="mb-4" size={32} />, title: 'SECURE VERIFICATION', desc: 'Firebase securely stores ticket data and manually generates unique, immutable alphanumeric codes as a blockchain-like security feature.', bg: 'bg-[#fbcfe8]' },
        ].map((card, i) => (
          <motion.div key={card.title} variants={fadeUp} custom={i}>
            <Card className={card.bg}>
              <motion.div whileHover={{ rotate: -8, scale: 1.1 }} transition={{ type: 'spring', stiffness: 300 }}>
                {card.icon}
              </motion.div>
              <h3 className="font-black text-lg mb-2">{card.title}</h3>
              <p className="text-sm font-medium text-slate-700 leading-relaxed">{card.desc}</p>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        className="space-y-6"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerContainer}
      >
        <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-black flex items-center gap-3">
          <Terminal className="text-blue-600" />
          Technical Infrastructure
        </motion.h2>
        <motion.div variants={scaleIn}>
          <Card className="p-0 overflow-hidden">
            <div className="bg-slate-900 p-4 flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
            </div>
            <div className="bg-slate-800 p-8 text-blue-300 font-mono text-sm space-y-4">
              {[
                { line: '01', content: <span>{`{`}</span> },
                { line: '02', content: <><span className="pl-4 text-pink-400">"core_architecture":</span> <span className="text-green-400">"Distributed Edge Computing",</span></> },
                { line: '03', content: <><span className="pl-4 text-pink-400">"ai_model":</span> <span className="text-green-400">"YOLOv8 + Custom Temporal Analysis",</span></> },
                { line: '04', content: <><span className="pl-4 text-pink-400">"database":</span> <span className="text-green-400">"Firebase NoSQL + Immutable Ticket IDs",</span></> },
                { line: '05', content: <><span className="pl-4 text-pink-400">"iot_stack":</span> <span className="text-green-400">"MQTT + LoRaWAN Protocol",</span></> },
                { line: '06', content: <span>{`}`}</span> },
              ].map((row, i) => (
                <motion.p
                  key={row.line}
                  className="flex gap-4"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                >
                  <span className="text-slate-500">{row.line}</span> {row.content}
                </motion.p>
              ))}
              <motion.div
                className="h-4 w-2 bg-blue-400 inline-block"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            </div>
          </Card>
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-8">
        <motion.div
          className="space-y-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={staggerContainer}
        >
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-black tracking-tight">Safeguarding the Sacred Journey</motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-slate-600 font-medium leading-relaxed">
            This project aims to modernize pilgrimage management by integrating cutting-edge technologies. 
            By combining AI for immediate safety, IoT for comprehensive data collection, and cloud databases 
            for blockchain-like secure ticket verification, we aim to create a ecosystem where technology serves humanity.
          </motion.p>
          <motion.div variants={fadeUp} custom={2} className="flex gap-4 pt-4">
             <motion.div whileHover={{ scale: 1.1 }} className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-slate-400 cursor-default">
                <Users size={16} /> 1M+ Capacity
             </motion.div>
             <motion.div whileHover={{ scale: 1.1 }} className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-slate-400 cursor-default">
                <Zap size={16} /> {`< 50ms Latency`}
             </motion.div>
          </motion.div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <InteractiveGlobe />
        </motion.div>
      </div>

      {/* Tech Stack Widget */}
      <TechStackWidget />

      {/* Team Section */}
      <div className="pt-16 pb-8 border-t-2 border-slate-200 mt-12">
        <motion.div
          className="text-center space-y-3 mb-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeUp} custom={0} className="inline-block px-4 py-1.5 bg-slate-900 text-white font-black tracking-widest text-xs uppercase rounded-full mb-2">
            Development Team
          </motion.div>
          <motion.h2 variants={fadeUp} custom={1} className="text-4xl font-black tracking-tighter">SYNTAXSYNC</motion.h2>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start team-panel-shake"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
        >
          <motion.div
            variants={fadeUp} custom={0}
            className="group team-tile-card bg-white border-2 border-amber-200 rounded-2xl overflow-hidden cursor-pointer"
            onClick={() => setOpenDropdown(openDropdown === 'sayan' ? null : 'sayan')}
            whileHover={{ y: -3, x: -1 }}
            whileTap={{ scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            {/* Card Header Row */}
            <div className="p-5 flex items-center gap-4">
              <motion.div
                whileHover={{ rotate: -8, scale: 1.1 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center border-2 border-amber-200 shrink-0"
              >
                <Crown className="text-amber-600" size={24} />
              </motion.div>
              <div className="flex-1">
                <h4 className="font-black text-lg">
                  <span className="glitch-hover-shake">SAYAN MAITY</span>
                </h4>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Team Lead</p>
              </div>
              <motion.div
                animate={{ rotate: openDropdown === 'sayan' ? 180 : 0 }}
                transition={{ duration: 0.25 }}
                className="shrink-0 p-1"
              >
                <ChevronDown size={18} className="text-amber-500" />
              </motion.div>
            </div>

            {/* Expandable links panel */}
            <AnimatePresence initial={false}>
              {openDropdown === 'sayan' && (
                <motion.div
                  key="sayan-links"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="overflow-hidden bg-white"
                >
                  <div className="px-5 pb-5 pt-1 border-t-2 border-amber-200 space-y-2" onClick={e => e.stopPropagation()}>
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest pb-1">Connect with Sayan</p>
                    <a
                      href="https://github.com/sayanjc3639q"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl bg-white border-2 border-slate-200 hover:border-slate-400 hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,0.15)] transition-all group/link"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
                        <GithubIcon />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-800">GitHub</p>
                        <p className="text-[10px] text-slate-400 font-medium">@sayanjc3639q</p>
                      </div>
                      <ExternalLink size={12} className="text-slate-300 group-hover/link:text-slate-600 transition-colors" />
                    </a>
                    <a
                      href="https://www.linkedin.com/in/sayanjc3639q/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl bg-white border-2 border-amber-200 hover:border-amber-400 hover:shadow-[2px_2px_0px_0px_rgba(245,158,11,0.2)] transition-all group/link"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#0077b5] flex items-center justify-center shrink-0">
                        <LinkedinIcon />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-800">LinkedIn</p>
                        <p className="text-[10px] text-slate-400 font-medium">sayanjc3639q</p>
                      </div>
                      <ExternalLink size={12} className="text-slate-300 group-hover/link:text-amber-500 transition-colors" />
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div
            variants={fadeUp} custom={1}
            className="group team-tile-card bg-white border-2 border-blue-400 rounded-2xl shadow-[0_0_15px_rgba(59,130,246,0.3)] overflow-hidden cursor-pointer"
            onClick={() => setOpenDropdown(openDropdown === 'sampat' ? null : 'sampat')}
            whileHover={{ y: -3, x: -1 }}
            whileTap={{ scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            {/* Shimmer sweep */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#ff006e]/5 via-[#8338ec]/5 to-[#00f5d4]/5 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />

            {/* Card Header Row */}
            <div className="p-5 flex items-center gap-4">
              <motion.div
                whileHover={{ rotate: -8, scale: 1.1 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="w-12 h-12 rounded-xl bg-blue-200 flex items-center justify-center border-2 border-blue-300 shrink-0"
              >
                <Code2 className="text-blue-700" size={24} />
              </motion.div>
              <div className="flex-1">
                <h4 className="font-black text-lg flex items-center gap-1.5">
                  <span className="glitch-hover-color" data-text="SAMPAT BARIK">SAMPAT BARIK</span>
                </h4>
                <p className="text-sm font-bold text-blue-600 uppercase tracking-wider">Web Master & Technical Lead</p>
              </div>
              {/* Chevron */}
              <motion.div
                animate={{ rotate: openDropdown === 'sampat' ? 180 : 0 }}
                transition={{ duration: 0.25 }}
                className="shrink-0 p-1"
              >
                <ChevronDown size={18} className="text-blue-500" />
              </motion.div>
            </div>

            {/* Expandable links panel — inline, pushes grid down */}
            <AnimatePresence initial={false}>
              {openDropdown === 'sampat' && (
                <motion.div
                  key="sampat-links"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="overflow-hidden bg-white"
                >
                  <div className="px-5 pb-5 pt-1 border-t-2 border-blue-200 space-y-2" onClick={e => e.stopPropagation()}>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest pb-1">Connect with Sampat</p>
                    <a
                      href="https://github.com/Sampat-Barik"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl bg-white border-2 border-slate-200 hover:border-slate-400 hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,0.15)] transition-all group/link"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
                        <GithubIcon />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-800">GitHub</p>
                        <p className="text-[10px] text-slate-400 font-medium">@Sampat-Barik</p>
                      </div>
                      <ExternalLink size={12} className="text-slate-300 group-hover/link:text-slate-600 transition-colors" />
                    </a>
                    <a
                      href="https://www.linkedin.com/in/sampat-barik001/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl bg-white border-2 border-blue-200 hover:border-blue-400 hover:shadow-[2px_2px_0px_0px_rgba(59,130,246,0.2)] transition-all group/link"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#0077b5] flex items-center justify-center shrink-0">
                        <LinkedinIcon />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-800">LinkedIn</p>
                        <p className="text-[10px] text-slate-400 font-medium">sampat-barik001</p>
                      </div>
                      <ExternalLink size={12} className="text-slate-300 group-hover/link:text-blue-400 transition-colors" />
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>


        </motion.div>
      </div>
    </div>
  );
};

export default About;
