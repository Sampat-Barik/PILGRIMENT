import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck, Activity, Camera, Sun, Moon, CloudRain, Cloud, Clock, Calendar, Users, CheckCircle, Ticket } from 'lucide-react';
import { Card } from '../components/Shared';
import { fadeUp, staggerContainer, viewportOnce } from '../utils/animations';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';

const Dashboard = () => {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState({ temp: 28, condition: 'Sunny', city: 'Detecting...' });
  const [isNight, setIsNight] = useState(false);
  const [stats, setStats] = useState({ totalParticipants: 0, activeTickets: 0 });
  const [dailyStats, setDailyStats] = useState({ ticketCount: 0, participantCount: 0 });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    
    // Simple check for night mode (6 PM to 6 AM)
    const hours = new Date().getHours();
    setIsNight(hours >= 18 || hours < 6);

    // Fetch Weather & Location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Reverse geocoding using open-source API (no key required for low volume)
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await response.json();
          const cityName = data.address.city || data.address.town || data.address.village || "Active Zone";
          
          setWeather(prev => ({ 
            ...prev, 
            city: cityName.toUpperCase(),
            // Mock dynamic temp based on location/time for visual feedback
            temp: 22 + Math.floor(Math.random() * 10) 
          }));
        } catch (e) {
          setWeather(prev => ({ ...prev, city: "PRIMARY SECTOR" }));
        }
      });
    }

    // Subscribe to active tickets from Firebase
    const q = query(collection(db, "tickets"), where("status", "in", ["active", "checked-in"]));
    const unsub = onSnapshot(q, (snapshot) => {
      let tickets = 0;
      let participants = 0;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        tickets += 1;
        participants += (data.participants || 0);
      });
      setStats({
        totalParticipants: participants,
        activeTickets: tickets
      });
    });

    // Subscribe to DAILY stats (Reset occurs because document ID is date-based)
    const getTodayStr = () => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const todayStr = getTodayStr();
    const dailyUnsub = onSnapshot(doc(db, "dailyStats", todayStr), (docSnap: any) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDailyStats({
          ticketCount: data.ticketCount || 0,
          participantCount: data.participantCount || 0
        });
      } else {
        setDailyStats({ ticketCount: 0, participantCount: 0 });
      }
    });

    return () => {
      clearInterval(timer);
      unsub();
      dailyUnsub();
    };
  }, []);

  const getWeatherStyles = () => {
    if (isNight) return "bg-slate-900 text-white border-blue-900";
    switch (weather.condition) {
      case 'Rainy': return "bg-blue-100 text-blue-900 border-blue-400";
      case 'Cloudy': return "bg-slate-200 text-slate-900 border-slate-400";
      default: return "bg-yellow-100 text-yellow-900 border-yellow-400";
    }
  };

  return (
    <div className="space-y-24">
      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        <div className="lg:col-span-7 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-4 py-1.5 bg-[#fbcfe8] border-2 border-slate-900 rounded-full text-xs font-bold uppercase tracking-wider"
          >
            System Online
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-black leading-tight"
          >
            Smart Crowd <br />
            <span className="text-blue-600">Management</span> System
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-600 max-w-xl"
          >
            AI-powered real-time monitoring, prediction, and secure database-backed ticketing management for a safer experience.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-4"
          >
            <Link to="/monitor" className="neo-button neo-button-primary flex items-center gap-2">
              View Live Crowd <ArrowRight size={18} />
            </Link>
            <Link to="/verification" className="neo-button neo-button-secondary">
              Verify Ticket
            </Link>
          </motion.div>
        </div>

        <div className="lg:col-span-5 relative mt-12 lg:mt-0 px-4 sm:px-0">
          <motion.div 
            animate={{ y: [0, -15, 0], x: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="absolute -top-10 right-4 sm:-right-8 z-10 p-3 bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
          >
            <ShieldCheck className="text-green-500" size={24} />
          </motion.div>
          
          <motion.div 
            animate={{ y: [0, 15, 0], x: [0, -5, 0] }}
            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
            className="absolute -bottom-10 left-4 sm:-left-8 z-10 p-3 bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
          >
            <Activity className="text-blue-500" size={24} />
          </motion.div>

          <Card className="aspect-video bg-slate-900 flex flex-col items-center justify-center overflow-hidden relative group">
            <div className="scanline"></div>
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse z-10">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              LIVE FEED
            </div>
            <Camera size={48} className="text-slate-700 group-hover:scale-110 transition-transform duration-500" />
            <div className="mt-4 text-slate-500 font-mono text-sm">CCTV_FRONT_GATE_01</div>
          </Card>
        </div>
      </div>

      {/* Vertical Widget Section */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-12 py-8"
        initial="hidden" whileInView="visible" viewport={viewportOnce} variants={staggerContainer}
      >
        {/* Time Housing */}
        <motion.div variants={fadeUp} custom={0}>
          <Card className="flex flex-col items-center justify-center p-10 bg-white border-2 border-slate-900 text-center">
            <motion.div whileHover={{ rotate: -8, scale: 1.1 }} transition={{ type: 'spring', stiffness: 300 }} className="p-4 bg-blue-50 border-2 border-slate-900 rounded-2xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] mb-6">
              <Clock className="text-blue-600" size={32} />
            </motion.div>
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">Current Time</p>
            <h2 className="text-5xl font-black tabular-nums tracking-tighter">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </h2>
            <p className="text-lg font-bold text-slate-400 mt-1">
              {time.toLocaleTimeString([], { second: '2-digit' })} SEC
            </p>
          </Card>
        </motion.div>

        {/* Date Housing */}
        <motion.div variants={fadeUp} custom={1}>
          <Card className="flex flex-col items-center justify-center p-10 bg-[#bfdbfe] border-2 border-slate-900 text-center">
            <motion.div whileHover={{ rotate: -8, scale: 1.1 }} transition={{ type: 'spring', stiffness: 300 }} className="p-4 bg-white border-2 border-slate-900 rounded-2xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] mb-6">
              <Calendar className="text-slate-900" size={32} />
            </motion.div>
            <p className="text-sm font-black text-slate-900/40 uppercase tracking-widest mb-2">Calendar Date</p>
            <h2 className="text-3xl font-black leading-tight">
              {time.toLocaleDateString(undefined, { weekday: 'long' })}
            </h2>
            <p className="text-xl font-bold text-slate-900">
              {time.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </Card>
        </motion.div>

        {/* Weather Housing */}
        <motion.div variants={fadeUp} custom={2}>
          <Card className={`flex flex-col justify-center p-10 border-2 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] transition-colors duration-1000 ${getWeatherStyles()}`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest opacity-60">Location</p>
                <h3 className="text-xl font-black leading-tight">{weather.city}</h3>
              </div>
              <motion.div whileHover={{ rotate: [0, -15, 15, 0] }} transition={{ duration: 0.5 }} className="p-2 bg-white/20 border-2 border-slate-900 rounded-xl">
                {isNight ? <Moon size={24} /> : weather.condition === 'Rainy' ? <CloudRain size={24} /> : weather.condition === 'Cloudy' ? <Cloud size={24} /> : <Sun size={24} />}
              </motion.div>
            </div>
            
            <div className="mt-2 flex items-end gap-2">
              <span className="text-5xl font-black tracking-tighter">{weather.temp}°C</span>
              <span className="text-lg font-bold mb-1 opacity-80">{weather.condition}</span>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 text-[10px] font-bold opacity-70">
              <span className="px-2 py-1 bg-black/5 rounded border border-black/10">H: 32°</span>
              <span className="px-2 py-1 bg-black/5 rounded border border-black/10">L: 24°</span>
              <span className="px-2 py-1 bg-black/5 rounded border border-black/10">HUM: 45%</span>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Quick Stats Summary */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-12 pb-24"
        initial="hidden" whileInView="visible" viewport={viewportOnce} variants={staggerContainer}
      >
        <motion.div variants={fadeUp} custom={0}>
          <Link to="/verification" className="block hover:scale-[1.02] transition-transform">
            <Card className="bg-[#bfdbfe] py-12 flex flex-col items-center justify-center text-center h-full">
              <motion.div whileHover={{ scale: 1.15, rotate: -5 }} className="p-3 bg-white border-2 border-slate-900 rounded-xl mb-4 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
                <Users className="text-slate-900" size={28} />
              </motion.div>
              <h3 className="font-bold text-sm uppercase text-slate-600 mb-2 tracking-widest">Active Members</h3>
              <p className="text-6xl font-black text-slate-900 tracking-tighter">{stats.totalParticipants.toLocaleString()}</p>
            </Card>
          </Link>
        </motion.div>
        <motion.div variants={fadeUp} custom={1}>
          <Link to="/verification" className="block hover:scale-[1.02] transition-transform">
            <Card className="bg-[#fef08a] py-12 flex flex-col items-center justify-center text-center h-full">
              <motion.div whileHover={{ scale: 1.15, rotate: -5 }} className="p-3 bg-white border-2 border-slate-900 rounded-xl mb-4 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
                <Ticket className="text-slate-900" size={28} />
              </motion.div>
              <h3 className="font-bold text-sm uppercase text-slate-600 mb-2 tracking-widest">Today's Tickets</h3>
              <p className="text-6xl font-black text-slate-900 tracking-tighter">{dailyStats.ticketCount.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-slate-500 mt-2">TOTAL GENERATED TODAY</p>
            </Card>
          </Link>
        </motion.div>
        <motion.div variants={fadeUp} custom={2}>
          <Card className="bg-[#fbcfe8] py-12 flex flex-col items-center justify-center text-center">
            <motion.div whileHover={{ scale: 1.15, rotate: -5 }} className="p-3 bg-white border-2 border-slate-900 rounded-xl mb-4 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
              <CheckCircle className="text-green-600" size={28} />
            </motion.div>
            <h3 className="font-bold text-sm uppercase text-slate-600 mb-2 tracking-widest">System Status</h3>
            <p className="text-6xl font-black text-slate-900 tracking-tighter">OPTIMAL</p>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
