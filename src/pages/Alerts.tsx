import { useState } from 'react';
import { 
  ShieldCheck, 
  TrendingUp, 
  AlertCircle, 
  History, 
  Settings, 
  Lock, 
  Bell, 
  BellOff, 
  Volume2, 
  VolumeX, 
  Lightbulb,
  Power
} from 'lucide-react';
import { Card } from '../components/Shared';
import { motion } from 'framer-motion';
import { fadeUp, staggerContainer, viewportOnce } from '../utils/animations';

/** Static 12-slot forecast (2h steps) for Alerts dashboard chart */
const CROWD_FORECAST_LOAD = [30, 45, 60, 85, 95, 80, 60, 40, 35, 50, 70, 90];

const Alerts = () => {
  const [devices, setDevices] = useState({
    gateA: false,
    gateB: true,
    alarm: false,
    paSystem: true,
    emergencyLights: false
  });

  const toggleDevice = (key: keyof typeof devices) => {
    setDevices(prev => ({ ...prev, [key]: !prev[key] }));
  };
  return (
    <div className="space-y-8">
      <motion.div
        className="flex justify-between items-center"
        initial="hidden" animate="visible" variants={staggerContainer}
      >
        <motion.div variants={fadeUp} custom={0}>
          <h1 className="text-3xl font-black">Predictions & Alerts</h1>
          <p className="text-slate-500 font-medium">Predictive modeling and security ledger</p>
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="text-pink-500" />
                <h3 className="font-bold">Crowd Density Forecast</h3>
              </div>
              <span className="text-[10px] font-bold bg-pink-100 px-2 py-0.5 border-2 border-slate-900 rounded">NEXT 12H</span>
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="h-52 flex flex-col">
                <div className="flex-1 flex items-end gap-2 px-2 relative min-h-0">
                  <div className="absolute inset-x-0 top-0 border-t border-slate-100 h-full flex flex-col justify-between pointer-events-none opacity-40">
                    {[1, 2, 3, 4, 5].map((j) => (
                      <div key={j} className="border-t border-slate-100 w-full" />
                    ))}
                  </div>
                  {CROWD_FORECAST_LOAD.map((h, i) => {
                    const gMax = 100;
                    const pct = Math.max(6, (h / gMax) * 100);
                    return (
                      <div key={i} className="flex-1 h-full flex flex-col justify-end group relative z-10">
                        <motion.div
                          initial={{ height: 0 }}
                          whileInView={{ height: `${pct}%` }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.06, duration: 0.55 }}
                          className={`w-full rounded-t-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all group-hover:-translate-y-0.5 group-hover:brightness-95 relative ${
                            h > 80 ? 'bg-red-400' : h > 60 ? 'bg-yellow-400' : 'bg-blue-400'
                          }`}
                        >
                          <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-bold z-20 pointer-events-none">
                            {h}% load
                          </div>
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2 px-2 min-h-[2.75rem] border-t-2 border-slate-100 pt-3 items-start shrink-0">
                  {CROWD_FORECAST_LOAD.map((_, i) => (
                    <span
                      key={i}
                      className="flex-1 text-center text-[10px] leading-tight font-black text-slate-600 uppercase whitespace-nowrap"
                    >
                      {i === 0 ? 'Now' : `+${i * 2}h`}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 border-2 border-slate-900 rounded-xl">
                <AlertCircle className="text-red-600" size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-red-900 uppercase italic">High Density Risk Detected</h4>
                <p className="text-sm text-red-700 font-medium">AI predicts 95% saturation in Sector F within the next 45 minutes. Deploying additional stewards.</p>
                <div className="pt-2">
                  <button className="bg-red-900 text-white px-4 py-1.5 rounded-lg font-bold text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                    DEPLOY QUICK RESPONSE
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <Card className="bg-slate-900 text-white border-slate-900">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-white">
              <ShieldCheck className="text-blue-400" />
              <h3 className="font-bold">Security Ledger (Blockchain)</h3>
            </div>
            <History size={16} className="text-slate-500" />
          </div>
          
          <div className="space-y-4 font-mono text-xs">
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <motion.div
                key={i}
                className="flex flex-col gap-1 border-b border-slate-800 pb-3 last:border-0"
                initial={{ opacity: 0, x: -15 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.3 }}
              >
                <div className="flex justify-between items-center">
                  <span className="text-blue-400 font-bold">#BLOCK_{882310 + i}</span>
                  <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/30 text-[10px]">VERIFIED</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>HASH: 0x{Math.random().toString(16).slice(2, 10)}...{Math.random().toString(16).slice(2, 6)}</span>
                  <span>{new Date(Date.now() - i * 60000).toLocaleTimeString()}</span>
                </div>
                <div className="text-slate-500 italic">Event: Crowd density threshold reached in Zone {String.fromCharCode(65 + i)}</div>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>

      {/* Device Controls Section */}
      <div className="pt-8 border-t-2 border-slate-200">
        <motion.div
          className="flex items-center gap-3 mb-6"
          initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        >
            <Settings className="text-slate-900" size={28} />
          <h2 className="text-3xl font-black">IoT Device Control</h2>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          initial="hidden" whileInView="visible" viewport={viewportOnce} variants={staggerContainer}
        >
          <motion.div variants={fadeUp} custom={0}>
            <Card className="flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-slate-500 uppercase text-xs tracking-wider">Entry Gates</span>
              <Lock size={20} className={devices.gateA ? "text-red-500" : "text-green-500"} />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 border-2 border-slate-900 rounded-xl">
                <span className="font-bold">Gate Alpha</span>
                <button 
                  onClick={() => toggleDevice('gateA')}
                  className={`px-4 py-1.5 rounded-lg border-2 border-slate-900 font-bold text-xs shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all active:translate-y-0.5 active:shadow-none ${
                    devices.gateA ? 'bg-red-400 text-white' : 'bg-green-400'
                  }`}
                >
                  {devices.gateA ? 'CLOSED' : 'OPEN'}
                </button>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 border-2 border-slate-900 rounded-xl">
                <span className="font-bold">Gate Bravo</span>
                <button 
                  onClick={() => toggleDevice('gateB')}
                  className={`px-4 py-1.5 rounded-lg border-2 border-slate-900 font-bold text-xs shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all active:translate-y-0.5 active:shadow-none ${
                    devices.gateB ? 'bg-red-400 text-white' : 'bg-green-400'
                  }`}
                >
                  {devices.gateB ? 'CLOSED' : 'OPEN'}
                </button>
              </div>
            </div>
            </Card>
          </motion.div>

          <motion.div variants={fadeUp} custom={1}>
            <Card className={`flex flex-col justify-between transition-colors ${devices.alarm ? 'bg-red-100 border-red-500' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-slate-500 uppercase text-xs tracking-wider">Emergency Alarm</span>
              {devices.alarm ? <Bell className="text-red-600 animate-bounce" size={20} /> : <BellOff size={20} />}
            </div>
            <div className="flex flex-col items-center gap-4 py-4">
               <button 
                onClick={() => toggleDevice('alarm')}
                className={`w-full py-4 rounded-2xl border-2 border-slate-900 font-black text-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-all active:translate-y-0.5 active:shadow-none ${
                  devices.alarm ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-200 text-slate-400'
                }`}
              >
                {devices.alarm ? 'DEACTIVATE' : 'ACTIVATE'}
              </button>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter text-center">
                Manual override for all site sirens
              </p>
            </div>
            </Card>
          </motion.div>

          <motion.div variants={fadeUp} custom={2}>
            <Card className="flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-slate-500 uppercase text-xs tracking-wider">PA System</span>
              {devices.paSystem ? <Volume2 className="text-blue-500" size={20} /> : <VolumeX size={20} />}
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 h-2 bg-slate-100 border-2 border-slate-900 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 w-3/4"></div>
                </div>
                <span className="font-bold text-xs">75%</span>
              </div>
              <button 
                onClick={() => toggleDevice('paSystem')}
                className={`w-full py-2 rounded-xl border-2 border-slate-900 font-bold text-sm shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all active:translate-y-0.5 active:shadow-none ${
                  devices.paSystem ? 'bg-[#bfdbfe]' : 'bg-slate-100'
                }`}
              >
                {devices.paSystem ? 'SYSTEM ONLINE' : 'SYSTEM MUTED'}
              </button>
            </div>
            </Card>
          </motion.div>

          <motion.div variants={fadeUp} custom={3}>
            <Card className="flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-slate-500 uppercase text-xs tracking-wider">Emergency Lights</span>
              <Lightbulb size={20} className={devices.emergencyLights ? "text-yellow-500" : "text-slate-300"} />
            </div>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-2">
                {['Zone A', 'Zone B', 'Zone C', 'Zone D'].map(zone => (
                  <div key={zone} className="text-[10px] font-bold p-2 bg-slate-50 border border-slate-900 rounded-lg text-center">
                    {zone} OK
                  </div>
                ))}
              </div>
              <button 
                onClick={() => toggleDevice('emergencyLights')}
                className={`w-full py-2 rounded-xl border-2 border-slate-900 font-bold text-sm shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all flex items-center justify-center gap-2 ${
                  devices.emergencyLights ? 'bg-yellow-300' : 'bg-[#fef08a]'
                }`}
              >
                <Power size={16} />
                {devices.emergencyLights ? 'POWER ON' : 'POWER OFF'}
              </button>
            </div>
          </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Alerts;
