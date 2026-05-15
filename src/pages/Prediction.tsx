import { TrendingUp, Brain, Info, ArrowUpRight, Zap, MapPin, ChevronRight } from 'lucide-react';
import { Card } from '../components/Shared';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { fadeUp, staggerContainer, viewportOnce } from '../utils/animations';
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const Prediction = () => {
  const generateRealTimeSlots = () => {
    const slots = [];
    const now = new Date();
    let currentHour = now.getHours();
    
    for (let i = 0; i < 8; i++) {
      const hour = (currentHour + i * 2) % 24;
      slots.push(`${String(hour).padStart(2, '0')}:00`);
    }
    return slots;
  };

  const [timeSlots, setTimeSlots] = useState(generateRealTimeSlots());
  const [forecastData, setForecastData] = useState([45, 62, 88, 95, 75, 50, 40, 30]);
  const [count, setCount] = useState(0);
  const [modelName, setModelName] = useState("NEURO-FLOW V4.2");
  const [confidence, setConfidence] = useState("98.4%");
  const [peakMessage, setPeakMessage] = useState("Expect 15% increase in traffic between 13:00 and 15:00 due to local zone crossovers.");
  const [activeCameras, setActiveCameras] = useState(0);
  const [mode, setMode] = useState('starting');
  
  const [activeTicketsCount, setActiveTicketsCount] = useState(0);
  const [activeMembersCount, setActiveMembersCount] = useState(0);

  useEffect(() => {
    const q = query(collection(db, "tickets"), where("status", "in", ["active", "checked-in"]));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let tickets = 0;
      let members = 0;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        tickets += 1;
        members += (data.participants || 0);
      });
      setActiveTicketsCount(tickets);
      setActiveMembersCount(members);
    });
    return () => unsubscribe();
  }, []);

  const loadPrediction = async () => {
    try {
      const response = await fetch(`${API_BASE}/ai/prediction`);
      if (!response.ok) {
        // Fallback to updating times locally even if API fails
        setTimeSlots(generateRealTimeSlots());
        return;
      }
      const data = await response.json();
      setModelName(data.model || "YOLOv8n");
      setTimeSlots(data.time_slots || generateRealTimeSlots());
      setForecastData(data.forecast_data || forecastData);
      setConfidence(data.confidence || "92-98%");
      setCount(data.people_now ?? 0);
      setActiveCameras(data.active_cameras ?? 0);
      setMode(data.mode || 'unknown');
      setPeakMessage(`Peak estimate ${Math.max(...(data.forecast_data || [0]))} people using ${data.active_cameras ?? 0} active camera feeds.`);
    } catch {
      setTimeSlots(generateRealTimeSlots());
    }
  };

  useEffect(() => {
    loadPrediction();
    const interval = setInterval(loadPrediction, 5000);
    return () => clearInterval(interval);
  }, []);

  const chartMax = Math.max(10, ...forecastData);

  return (
    <div className="space-y-8">
      <motion.div
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        initial="hidden" animate="visible" variants={staggerContainer}
      >
        <motion.div variants={fadeUp} custom={0}>
          <h1 className="text-3xl font-black">AI Crowd Prediction</h1>
          <p className="text-slate-500 font-medium">Forecasts derived directly from Monitor camera feeds</p>
        </motion.div>
        <motion.div variants={fadeUp} custom={1} className="flex items-center gap-2 bg-blue-100 px-4 py-2 border-2 border-slate-900 rounded-xl font-bold text-blue-700">
          <Brain size={20} />
          MODEL: {modelName} ({mode}) | PEOPLE: {count} | ACTIVE CAMS: {activeCameras}
        </motion.div>
      </motion.div>

      {/* ── Predict Datewise Crowd — Feature Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <Link to="/predict-datewise">
          <Card className="p-6 bg-gradient-to-r from-purple-100 via-blue-100 to-pink-100 hover:shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-purple-200 p-3 border-2 border-slate-900 rounded-xl shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] group-hover:rotate-6 transition-transform">
                  <MapPin size={24} className="text-purple-900" />
                </div>
                <div>
                  <h3 className="text-xl font-black flex items-center gap-2">
                    Predict Datewise Crowd
                    <span className="text-[10px] font-bold bg-pink-200 px-2 py-0.5 rounded-full border border-slate-900 uppercase">New</span>
                  </h3>
                  <p className="text-sm font-medium text-slate-600 mt-0.5">
                    AI forecasting using Gemini + weather, holidays, festivals & seasonal trend analysis — no cameras needed
                  </p>
                </div>
              </div>
              <div className="neo-button neo-button-primary p-3 group-hover:translate-x-1 transition-transform">
                <ChevronRight size={20} />
              </div>
            </div>
          </Card>
        </Link>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <Card className="p-8">
            <div className="flex items-center justify-between mb-10">
              <h3 className="font-bold text-xl flex items-center gap-2">
                <TrendingUp size={24} className="text-pink-500" />
                24-Hour Predictive Analysis
              </h3>
              <div className="flex gap-2">
                <span className="w-3 h-3 bg-blue-400 rounded-full"></span>
                <span className="text-xs font-bold text-slate-400">HISTORICAL</span>
                <span className="w-3 h-3 bg-pink-400 rounded-full ml-4"></span>
                <span className="text-xs font-bold text-slate-400">AI PREDICTION</span>
              </div>
            </div>

            <div className="h-64 flex flex-col gap-4 relative">
              <div className="flex-1 flex items-end gap-3 px-4 relative">
                {/* Grid Lines */}
                <div className="absolute inset-x-0 top-0 border-t border-slate-100 h-full flex flex-col justify-between pointer-events-none">
                  {[1, 2, 3, 4, 5].map(i => <div key={i} className="border-t border-slate-100 w-full"></div>)}
                </div>

                {forecastData.map((h, i) => (
                  <div key={i} className="flex-1 h-full flex flex-col justify-end group relative z-10">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(4, (h / chartMax) * 100)}%` }}
                      transition={{ delay: i * 0.1, duration: 1 }}
                      className={`w-full rounded-t-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] relative group-hover:-translate-y-1 transition-transform ${h > 80 ? 'bg-red-300' : h > 60 ? 'bg-yellow-200' : 'bg-blue-200'
                        }`}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        {h}
                      </div>
                    </motion.div>
                  </div>
                ))}
              </div>

              {/* Labels Row */}
              <div className="flex gap-3 px-4 h-6">
                {timeSlots.map((slot, i) => (
                  <span key={i} className="flex-1 text-center text-[10px] font-bold text-slate-500">{slot}</span>
                ))}
              </div>
            </div>
          </Card>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            initial="hidden" whileInView="visible" viewport={viewportOnce} variants={staggerContainer}
          >
            <motion.div variants={fadeUp} custom={0}>
              <Card className="bg-[#fef08a]">
                <div className="flex items-center gap-3 mb-4">
                    <Zap className="text-slate-900" size={24} />
                  <h4 className="font-bold">Peak Time Warning</h4>
                </div>
                <p className="text-sm font-medium text-slate-700">{peakMessage}</p>
                {activeCameras === 0 && (
                  <p className="text-xs font-bold text-red-700 mt-2">No active CCTV feeds detected. Add and connect cameras in Monitor for reliable AI forecasting.</p>
                )}
              </Card>
            </motion.div>
            <motion.div variants={fadeUp} custom={1}>
              <Card className="bg-[#fbcfe8]">
                <div className="flex items-center gap-3 mb-4">
                  <Info className="text-slate-900" size={24} />
                  <h4 className="font-bold">Model Confidence</h4>
                </div>
                <p className="text-sm font-medium text-slate-700">Current AI confidence score is {confidence} based on live frame analysis.</p>
              </Card>
            </motion.div>
          </motion.div>
        </div>

        <div className="lg:col-span-4 space-y-6">
           <Card className="h-full">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                <Brain size={20} className="text-purple-500" />
                Live AI Insights
              </h3>
              <div className="space-y-4">
                {[
                  { title: "Active Tickets", value: activeTicketsCount.toString(), trend: "up" },
                  { title: "Registered Members", value: activeMembersCount.toString(), trend: "up" },
                  { title: "Live AI Detect", value: `${count} p`, trend: "up" },
                  { title: "Zone Saturation", value: `${Math.min(100, Math.round((count / Math.max(1, activeMembersCount)) * 100))}%`, trend: "up" }
                ].map((insight, i) => (
                  <motion.div
                    key={i}
                    className="p-4 border-2 border-slate-900 rounded-xl bg-slate-50 flex justify-between items-center"
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.35 }}
                    whileHover={{ x: -3 }}
                  >
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{insight.title}</p>
                      <p className="text-xl font-black">{insight.value}</p>
                    </div>
                    <div className={`p-1 rounded border-2 border-slate-900 ${insight.trend === 'up' ? 'bg-red-200' : 'bg-green-200'}`}>
                      <ArrowUpRight size={16} className={insight.trend === 'down' ? 'rotate-90' : ''} />
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t-2 border-slate-100">
                 <button className="w-full neo-button neo-button-primary py-3">
                   Recalculate Model
                 </button>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
};

export default Prediction;
