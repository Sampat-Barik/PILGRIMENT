import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, TrendingUp, MapPin, Clock, AlertTriangle,
  Download, FileText, ChevronLeft, RefreshCw,
  Zap, Globe, Database,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/Shared';
import { fadeUp, staggerContainer } from '../utils/animations';
import { PILGRIM_LOCATIONS } from '../services/predictionLocations';
import { fetchAllPredictions } from '../services/geminiService';
import { getStatisticalPrediction } from '../services/predictionEngine';
import type { GeminiLocationData } from '../services/geminiService';
import type { PilgrimLocation } from '../types/prediction';

const PredictDatewise = () => {
  const [selectedLocation, setSelectedLocation] = useState<PilgrimLocation>(PILGRIM_LOCATIONS[0]);
  const [activeTab, setActiveTab] = useState<'7day' | 'hourly'>('7day');
  const [predictionMode, setPredictionMode] = useState<'gemini' | 'local'>('local');
  const [toast, setToast] = useState<string | null>(null);

  const [masterData, setMasterData] = useState<Record<string, GeminiLocationData> | null>(null);
  const [localData, setLocalData] = useState<GeminiLocationData | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Load from cache on mount
  useEffect(() => {
    const cached = localStorage.getItem('gemini_master_cache');
    if (cached) {
      try {
        const { predictions } = JSON.parse(cached);
        setMasterData(predictions);
      } catch (e) {
        localStorage.removeItem('gemini_master_cache');
      }
    }
    
    // Auto-load local data for Kedarnath on start
    handleLocalPredict('kedarnath');

    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleSync = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const data = await fetchAllPredictions(PILGRIM_LOCATIONS);
      setMasterData(data);
      setPredictionMode('gemini');
      setStatus('success');
      showToast('Master AI Sync Complete!');
    } catch (err: any) {
      setError('Gemini is busy. Using Datawise engine fallback.');
      setStatus('error');
      setPredictionMode('local');
      handleLocalPredict(selectedLocation.id);
    }
  }, [selectedLocation]);

  const handleLocalPredict = async (locId: string) => {
    setStatus('loading');
    try {
      const data = await getStatisticalPrediction(locId);
      setLocalData(data);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  // Switch between local and gemini data
  const currentData = predictionMode === 'gemini' 
    ? (masterData ? masterData[selectedLocation.id] : localData)
    : localData;

  useEffect(() => {
    if (predictionMode === 'local') {
      handleLocalPredict(selectedLocation.id);
    }
  }, [selectedLocation, predictionMode]);

  const handleExportCSV = () => {
    if (!currentData) return;
    const data = activeTab === '7day' ? currentData.daily_forecast : currentData.hourly_today;
    const csv = [
      activeTab === '7day' ? 'Date,Label,Count' : 'Hour,Count,Is Peak',
      ...data.map((d: any) => activeTab === '7day' ? `${d.date},${d.label},${d.count}` : `${d.hour},${d.count},${d.isPeak}`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `prediction_${selectedLocation.id}.csv`;
    a.click(); URL.revokeObjectURL(url);
    showToast('CSV downloaded!');
  };

  const gDaily = currentData?.daily_forecast || [];
  const gHourly = currentData?.hourly_today || [];
  const gMax = activeTab === '7day' 
    ? Math.max(1, ...gDaily.map(d => d.count)) 
    : Math.max(1, ...gHourly.map(h => h.count));

  return (
    <div className="space-y-8 pb-12">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
            className="fixed top-24 right-6 z-50 neo-card px-5 py-3 bg-green-100 border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
            <span className="font-bold text-sm">✓ {toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4"
        initial="hidden" animate="visible" variants={staggerContainer}>
        <motion.div variants={fadeUp} custom={0} className="flex items-center gap-4">
          <Link to="/prediction" className="neo-button neo-button-primary p-2"><ChevronLeft size={20} /></Link>
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3 tracking-tighter">
              <Brain className="text-purple-500" size={28} /> Predict Datewise Crowd
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })} — {predictionMode.toUpperCase()} MODE
            </p>
          </div>
        </motion.div>
        <motion.div variants={fadeUp} custom={1} className="flex gap-2">
          <div className="flex p-1 bg-slate-100 rounded-xl border-2 border-slate-900 mr-2">
            <button onClick={() => setPredictionMode('local')} className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${predictionMode === 'local' ? 'bg-blue-500 text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]' : 'text-slate-500'}`}>DATAWISE FREE</button>
            <button onClick={() => setPredictionMode('gemini')} className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${predictionMode === 'gemini' ? 'bg-purple-500 text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]' : 'text-slate-500'}`}>GEMINI AI</button>
          </div>
          <button onClick={handleSync} disabled={status === 'loading'} 
            className="neo-button neo-button-primary py-2 px-4 text-xs flex items-center gap-2">
            <RefreshCw size={14} className={status === 'loading' ? 'animate-spin' : ''} />
            SYNC AI
          </button>
          {currentData && (
            <button onClick={handleExportCSV} className="neo-button neo-button-secondary py-2 px-4 text-xs flex items-center gap-2"><Download size={14} /> CSV</button>
          )}
        </motion.div>
      </motion.div>

      <Card className="p-6">
        <div className="flex flex-wrap gap-2">
          {PILGRIM_LOCATIONS.map(loc => (
            <button
              key={loc.id}
              onClick={() => setSelectedLocation(loc)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black border-2 border-slate-900 transition-all ${
                selectedLocation.id === loc.id 
                ? 'bg-slate-900 text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] -translate-y-0.5' 
                : 'bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              {loc.name.split(' ')[0].toUpperCase()}
            </button>
          ))}
        </div>
      </Card>

      {status === 'loading' && !currentData && (
        <Card className="p-20 text-center"><RefreshCw size={40} className="animate-spin mx-auto text-blue-500" /></Card>
      )}

      {currentData && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('7day')}
              className={`neo-button py-2.5 px-6 text-xs font-bold uppercase ${activeTab === '7day' ? 'neo-button-primary' : 'bg-white'}`}>
              <TrendingUp size={14} className="inline mr-2" /> Daily Trend
            </button>
            <button onClick={() => setActiveTab('hourly')}
              className={`neo-button py-2.5 px-6 text-xs font-bold uppercase ${activeTab === 'hourly' ? 'neo-button-pink' : 'bg-white'}`}>
              <Clock size={14} className="inline mr-2" /> Hourly Flow
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <Card className="p-8">
                <h3 className="font-black text-xl mb-10 flex items-center gap-3">
                  <Globe size={24} className="text-blue-500" />
                  {selectedLocation.name} — {activeTab === '7day' ? '6-Day Prediction' : 'Hourly Flow Today'}
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full border-2 uppercase ml-2 tracking-widest ${predictionMode === 'local' ? 'bg-blue-100 text-blue-700 border-blue-700' : 'bg-green-100 text-green-700 border-green-700'}`}>
                    {predictionMode === 'local' ? 'Datawise Engine' : 'Gemini AI'}
                  </span>
                </h3>

                <div className="h-80 flex flex-col gap-6 relative">
                  <div className="flex-1 flex items-end gap-2 px-2 relative">
                    <div className="absolute inset-x-0 top-0 border-t border-slate-100 h-full flex flex-col justify-between pointer-events-none opacity-50">
                      {[1,2,3,4,5].map(i => <div key={i} className="border-t border-slate-100 w-full" />)}
                    </div>

                    {(activeTab === '7day' ? gDaily : gHourly).map((d: any, i: number) => {
                      const h = (d.count / gMax) * 100;
                      return (
                        <div key={i} className="flex-1 h-full flex flex-col justify-end group relative z-10">
                          <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max(5, h)}%` }}
                            transition={{ duration: 0.5 }}
                            className={`w-full rounded-t-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] relative group-hover:-translate-y-1 transition-transform ${
                              d.isPeak ? 'bg-red-300' : predictionMode === 'local' ? 'bg-blue-200' : 'bg-purple-200'
                            }`}>
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-bold z-20">
                              {d.count.toLocaleString()} {d.isPeak ? '★ PEAK' : ''}
                            </div>
                          </motion.div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 px-2 min-h-[2.5rem] border-t-2 border-slate-100 pt-3 items-start">
                    {(activeTab === '7day' ? gDaily : gHourly).map((d: any, i: number) => (
                      <span key={i} className="flex-1 text-center text-[10px] leading-tight font-black text-slate-600 uppercase whitespace-nowrap">
                        {activeTab === '7day' ? d.label : d.hour.split(' ')[0]}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-4 space-y-4">
              <Card className="p-6 bg-[#fef08a] border-4 border-slate-900">
                <div className="flex items-center gap-3 mb-4">
                  <Zap size={20} />
                  <h4 className="font-black uppercase tracking-tight">Status Update</h4>
                </div>
                <p className="text-sm font-bold text-slate-800 leading-relaxed italic">"{currentData.summary}"</p>
              </Card>

              <Card className="p-6 border-2 border-slate-900">
                <div className="space-y-3">
                  {[
                    { label: 'Current Status', value: currentData.current_status, color: 'text-red-600' },
                    { label: 'Expected Max', value: gMax.toLocaleString(), color: 'text-blue-600' },
                    { label: 'Data Model', value: predictionMode === 'local' ? 'chardham JSON + Open-Meteo' : 'Gemini 2.0', color: 'text-purple-600' },
                  ].map((s, i) => (
                    <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border-2 border-slate-100 text-xs">
                      <span className="font-black text-slate-400 uppercase">{s.label}</span>
                      <span className={`font-black uppercase ${s.color}`}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default PredictDatewise;
