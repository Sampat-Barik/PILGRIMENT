import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor,
  Server,
  Brain,
  Database,
  Cloud,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

type TechItem = {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
  hoverColor: string;
  borderColor: string;
  glowColor: string;
  what: string;
  howUsed: string;
  whyChosen: string;
};

const techStack: TechItem[] = [
  {
    id: 'frontend',
    icon: <Monitor size={28} />,
    title: 'Frontend',
    subtitle: 'React · TypeScript · Vite',
    color: 'bg-blue-100',
    hoverColor: 'hover:bg-blue-200',
    borderColor: 'border-blue-400',
    glowColor: 'shadow-blue-300/50',
    what: 'React 18 with TypeScript provides a type-safe, component-driven UI framework. Vite delivers sub-second hot module replacement during development and optimized production bundles.',
    howUsed: 'Every page in PILGRIMENT — from the real-time Monitor dashboard to the Ticket Generator — is a React component. Vite compiles TypeScript and Tailwind CSS into a single optimized static bundle deployed on Netlify.',
    whyChosen: 'React\'s ecosystem (Framer Motion for animations, React Router for navigation) and TypeScript\'s compile-time safety make it ideal for a mission-critical monitoring dashboard where UI bugs could delay emergency response.',
  },
  {
    id: 'backend',
    icon: <Server size={28} />,
    title: 'Backend',
    subtitle: 'Python · Flask · OpenCV',
    color: 'bg-emerald-100',
    hoverColor: 'hover:bg-emerald-200',
    borderColor: 'border-emerald-400',
    glowColor: 'shadow-emerald-300/50',
    what: 'Flask is a lightweight Python web framework. OpenCV handles video frame decoding and encoding for real-time camera streams over HTTP using the MJPEG protocol.',
    howUsed: 'The Flask server manages multi-camera CCTV connections, receives webcam frames in Demo Mode, streams annotated video feeds via MJPEG, and exposes REST APIs for crowd counts, predictions, and camera management.',
    whyChosen: 'Python is the de facto language for AI/ML. Flask\'s simplicity lets us focus on the computer vision pipeline rather than framework boilerplate, and its threading model supports concurrent camera streams efficiently.',
  },
  {
    id: 'ai',
    icon: <Brain size={28} />,
    title: 'AI / ML',
    subtitle: 'YOLOv8 · Ultralytics',
    color: 'bg-purple-100',
    hoverColor: 'hover:bg-purple-200',
    borderColor: 'border-purple-400',
    glowColor: 'shadow-purple-300/50',
    what: 'YOLOv8 (You Only Look Once v8) is a state-of-the-art real-time object detection model by Ultralytics. It detects and counts people in video frames with 92–98% confidence.',
    howUsed: 'Every camera frame passes through YOLOv8 inference. The model identifies all "person" class detections, draws bounding boxes on the annotated feed, and feeds raw counts into our spatial deduplication algorithm to prevent double-counting across overlapping cameras.',
    whyChosen: 'YOLOv8n (nano variant) achieves an optimal balance of speed and accuracy — processing frames fast enough for real-time streaming while maintaining high detection reliability in dense crowd scenarios.',
  },
  {
    id: 'database',
    icon: <Database size={28} />,
    title: 'Database',
    subtitle: 'Firebase · Firestore · Auth',
    color: 'bg-amber-100',
    hoverColor: 'hover:bg-amber-200',
    borderColor: 'border-amber-400',
    glowColor: 'shadow-amber-300/50',
    what: 'Firebase provides a serverless backend-as-a-service with Firestore (NoSQL real-time database), Firebase Authentication, and secure hosting for environment secrets.',
    howUsed: 'Firestore stores pilgrim ticket records with immutable alphanumeric verification codes. Firebase Auth handles user login/registration with email and Google OAuth. Netlify environment variables secure all Firebase API keys in production.',
    whyChosen: 'Firebase\'s real-time sync means ticket verification happens instantly across all devices. The free Spark plan covers our scale, and its SDKs integrate natively with React — eliminating the need for a custom auth backend.',
  },
  {
    id: 'infra',
    icon: <Cloud size={28} />,
    title: 'Hosting & Infra',
    subtitle: 'Netlify · Hugging Face · Docker',
    color: 'bg-rose-100',
    hoverColor: 'hover:bg-rose-200',
    borderColor: 'border-rose-400',
    glowColor: 'shadow-rose-300/50',
    what: 'Netlify hosts the static React frontend on a global CDN. Hugging Face Spaces runs the Dockerized Python AI backend with GPU-capable infrastructure designed for ML workloads.',
    howUsed: 'Git pushes trigger automatic Netlify builds. The Docker container packages Python, OpenCV, YOLOv8, and all system dependencies into a reproducible image that runs identically on Hugging Face Spaces and locally.',
    whyChosen: 'This hybrid architecture separates concerns cleanly — Netlify excels at static site delivery (100GB/month free), while Hugging Face Spaces is purpose-built for AI inference workloads without managing our own GPU servers.',
  },
];

const TechCard = ({
  item,
  isExpanded,
  onToggle,
}: {
  item: TechItem;
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  return (
    <motion.div
      layout
      onClick={onToggle}
      className={`
        relative cursor-pointer border-2 border-slate-900 rounded-2xl overflow-hidden
        transition-colors duration-200
        ${item.color} ${item.hoverColor}
        ${isExpanded ? `shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]` : `shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]`}
      `}
      whileHover={{ y: -3, x: -1 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {/* Card Header */}
      <div className="p-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className={`p-2.5 rounded-xl border-2 border-slate-900 bg-white/60 backdrop-blur-sm`}>
            {item.icon}
          </div>
          <div>
            <h3 className={`font-black text-lg text-slate-900 tracking-tight ${item.id === 'infra' ? 'infra-title' : ''}`}>{item.title}</h3>
            <p className="text-xs font-bold text-slate-500 tracking-wide uppercase">{item.subtitle}</p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="p-1"
        >
          <ChevronDown size={20} className="text-slate-600" />
        </motion.div>
      </div>

      {/* Expandable Detail Panel */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 border-t-2 border-slate-900/20 pt-4">
              <DetailBlock label="What it is" text={item.what} />
              <DetailBlock label="How we used it" text={item.howUsed} />
              <DetailBlock label="Why we chose it" text={item.whyChosen} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const DetailBlock = ({ label, text }: { label: string; text: string }) => (
  <div className="space-y-1">
    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{label}</span>
    <p className="text-sm font-medium text-slate-700 leading-relaxed">{text}</p>
  </div>
);

const TechStackWidget = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <section className="pt-16 pb-8 border-t-2 border-slate-200 mt-12">
      {/* Section Header */}
      <div className="text-center space-y-3 mb-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black tracking-widest text-xs uppercase rounded-full"
        >
          <Sparkles size={14} />
          Technology Stack
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl font-black tracking-tighter"
        >
          OUR TECH STACK
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-slate-500 font-medium max-w-lg mx-auto"
        >
          Click any card to explore the technologies powering PILGRIMENT's real-time crowd intelligence platform.
        </motion.p>
      </div>

      {/* Tech Cards Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={{
          hidden: {},
          visible: {
            transition: { staggerChildren: 0.08 },
          },
        }}
      >
        {techStack.map((item) => (
          <motion.div
            key={item.id}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
            }}
          >
            <TechCard
              item={item}
              isExpanded={expandedId === item.id}
              onToggle={() => handleToggle(item.id)}
            />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
};

export default TechStackWidget;
