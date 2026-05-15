import { useState, useEffect } from 'react';
import { Ticket, Copy, Check, QrCode, ShieldCheck, Users, User, Hash, Mail, Phone } from 'lucide-react';
import { Card } from '../components/Shared';
import { TicketDemoLimitWidget } from '../components/TicketDemoLimitWidget';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeUp, staggerContainer, slideInLeft, slideInRight } from '../utils/animations';
import { doc, setDoc, serverTimestamp, increment, updateDoc, collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import {
  DEMO_LIMITS_CHANGED,
  DEMO_MAX_ACTIVE_TICKETS,
  DEMO_MAX_PARTICIPANTS_PER_TICKET,
  clampParticipantsForDemo,
  countTicketsTowardDemoCap,
  isDemoTicketLimitsEnabled,
} from '../services/ticketDemoLimits';

const TicketGenerator = () => {
  const [guardianName, setGuardianName] = useState("");
  const [participantCount, setParticipantCount] = useState<number>(1);
  const [individualNames, setIndividualNames] = useState<string[]>([""]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [generatedTicket, setGeneratedTicket] = useState("");
  const [lastIssued, setLastIssued] = useState<{ id: string; guardianName: string; participants: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [issuedTowardCap, setIssuedTowardCap] = useState(0);
  const [demoLimitsVersion, setDemoLimitsVersion] = useState(0);

  const maxParticipants = isDemoTicketLimitsEnabled() ? DEMO_MAX_PARTICIPANTS_PER_TICKET : 20;

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tickets'), (snap) => {
      const n = countTicketsTowardDemoCap(snap.docs.map((d) => ({ status: d.data().status as string | undefined })));
      setIssuedTowardCap(n);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const onLimits = () => setDemoLimitsVersion((v) => v + 1);
    window.addEventListener(DEMO_LIMITS_CHANGED, onLimits);
    return () => window.removeEventListener(DEMO_LIMITS_CHANGED, onLimits);
  }, []);

  useEffect(() => {
    if (!isDemoTicketLimitsEnabled()) return;
    const capped = clampParticipantsForDemo(participantCount);
    if (capped !== participantCount) {
      setParticipantCount(capped);
    }
    setIndividualNames((names) => {
      if (names.length === capped) return names;
      if (names.length > capped) return names.slice(0, capped);
      const next = [...names];
      while (next.length < capped) next.push('');
      return next;
    });
  }, [demoLimitsVersion, participantCount]);

  const handleParticipantChange = (count: number) => {
    if (count < 1) return;
    const capped = isDemoTicketLimitsEnabled() ? clampParticipantsForDemo(count) : Math.min(20, count);
    setParticipantCount(capped);
    const newNames = [...individualNames];
    if (capped > newNames.length) {
      newNames.push(...Array(capped - newNames.length).fill(""));
    } else {
      newNames.splice(capped);
    }
    setIndividualNames(newNames);
  };

  const handleNameChange = (index: number, value: string) => {
    const newNames = [...individualNames];
    newNames[index] = value;
    setIndividualNames(newNames);
  };

  const handleGenerate = async () => {
    if (!guardianName.trim()) {
      setError("Guardian / Family Name is required.");
      return;
    }
    if (individualNames.some(name => !name.trim())) {
      setError("Please fill in all individual names.");
      return;
    }

    if (isDemoTicketLimitsEnabled()) {
      if (participantCount > DEMO_MAX_PARTICIPANTS_PER_TICKET) {
        setError(`Demo mode: maximum ${DEMO_MAX_PARTICIPANTS_PER_TICKET} participants per ticket.`);
        return;
      }
    }

    const getTodayStr = () => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const todayStr = getTodayStr();

    setIsLoading(true);
    setError("");
    try {
      if (isDemoTicketLimitsEnabled()) {
        const snap = await getDocs(collection(db, 'tickets'));
        const liveCount = countTicketsTowardDemoCap(
          snap.docs.map((d) => ({ status: d.data().status as string | undefined }))
        );
        if (liveCount >= DEMO_MAX_ACTIVE_TICKETS) {
          setError(
            `Demo limit reached: ${DEMO_MAX_ACTIVE_TICKETS} active tickets maximum. Open Ticket Management to terminate tickets and free slots, or turn the demo limiter off.`
          );
          setIsLoading(false);
          return;
        }
      }

      // Create a unique ticket ID
      const ticketId = `TIC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      
      const ticketRef = doc(db, "tickets", ticketId);
      
      await setDoc(ticketRef, {
        ticketsID: ticketId,
        guardianName: guardianName.trim(),
        participants: participantCount,
        members: individualNames.map(n => n.trim()),
        email: email.trim(),
        phone: phone.trim(),
        status: "active",
        createdAt: serverTimestamp(),
      });

      // Update global stats
      const statsRef = doc(db, "stats", "global");
      try {
        await updateDoc(statsRef, {
          totalTickets: increment(1),
          totalParticipants: increment(participantCount)
        });
      } catch (e) {
        await setDoc(statsRef, {
          totalTickets: 1,
          totalParticipants: participantCount
        });
      }

      // Update DAILY stats (Reset occurs because document ID is date-based)
      const dailyStatsRef = doc(db, "dailyStats", todayStr);
      try {
        await updateDoc(dailyStatsRef, {
          ticketCount: increment(1),
          participantCount: increment(participantCount)
        });
      } catch (e) {
        await setDoc(dailyStatsRef, {
          ticketCount: 1,
          participantCount: participantCount,
          date: todayStr
        });
      }

      setGeneratedTicket(ticketId);
      setLastIssued({
        id: ticketId,
        guardianName: guardianName.trim(),
        participants: participantCount,
      });
      setCopied(false);
      setGuardianName("");
      setEmail("");
      setPhone("");
      setParticipantCount(1);
      setIndividualNames([""]);
    } catch (e: any) {
      console.error(e);
      setError(`Firebase Error: ${e.message || 'Check Firestore Database Rules or Connection.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedTicket);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <motion.div
        className="text-center space-y-2"
        initial="hidden" animate="visible" variants={staggerContainer}
      >
        <motion.h1 variants={fadeUp} custom={0} className="text-3xl font-black">Ticket Generator</motion.h1>
        <motion.p variants={fadeUp} custom={1} className="text-slate-500 font-medium">Issue new family passes & track participants</motion.p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.div initial="hidden" animate="visible" variants={slideInLeft} className="space-y-4">
          <TicketDemoLimitWidget issuedTowardCap={issuedTowardCap} compact />
          <Card className="p-8 space-y-6">
          <h2 className="text-xl font-bold border-b-2 border-slate-100 pb-2">Family Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Guardian / Family Name</label>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  placeholder="e.g. Khan Family"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-900 rounded-xl font-bold focus:ring-4 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. family@example.com"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-900 rounded-xl font-bold focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +1 234 567 8900"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-900 rounded-xl font-bold focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Number of Participants</label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="number"
                  min="1"
                  max={maxParticipants}
                  value={participantCount}
                  onChange={(e) => handleParticipantChange(parseInt(e.target.value, 10) || 1)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-900 rounded-xl font-bold focus:ring-4 focus:ring-blue-100 transition-all"
                />
                {isDemoTicketLimitsEnabled() && (
                  <p className="text-[10px] font-bold text-amber-800 mt-1">Demo: max {DEMO_MAX_PARTICIPANTS_PER_TICKET} participants per ticket</p>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="block text-sm font-bold text-slate-700 mb-1">Individual Names</label>
              {individualNames.map((name, idx) => (
                <div key={idx} className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(idx, e.target.value)}
                    placeholder={`Participant ${idx + 1}`}
                    className="w-full pl-12 pr-4 py-2 bg-slate-50 border-2 border-slate-900 rounded-lg text-sm font-medium focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>
              ))}
            </div>

            {error && (
              <p className="text-sm font-bold text-red-600 bg-red-100 p-3 rounded-lg break-words">{error}</p>
            )}

            <button 
              onClick={handleGenerate}
              className="w-full neo-button neo-button-secondary text-lg py-4 disabled:opacity-60 mt-4"
              disabled={
                isLoading ||
                (isDemoTicketLimitsEnabled() && participantCount > DEMO_MAX_PARTICIPANTS_PER_TICKET)
              }
            >
              {isLoading ? "Generating..." : "Generate Ticket"}
            </button>
          </div>
          </Card>
        </motion.div>

        <motion.div initial="hidden" animate="visible" variants={slideInRight}>
          <Card className="text-center py-10 flex flex-col items-center justify-center bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Ticket size={200} />
          </div>

          <AnimatePresence mode="wait">
            {!generatedTicket ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 z-10"
              >
                <div className="p-6 bg-slate-800 rounded-full">
                  <Ticket size={48} className="text-slate-400" />
                </div>
                <p className="font-medium text-slate-400">Fill details to issue a new permit</p>
              </motion.div>
            ) : (
              <motion.div 
                key="ticket"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-sm space-y-6 z-10 px-4"
              >
                <div className="p-6 bg-white border-2 border-slate-700 text-slate-900 rounded-2xl relative overflow-hidden shadow-2xl">
                   <div className="absolute top-0 left-0 w-full bg-blue-600 text-white text-[10px] py-1 font-bold tracking-widest uppercase">
                     Active Pass
                   </div>
                   <div className="flex flex-col items-center gap-4 mt-6">
                      <div className="bg-white p-2 border-2 border-slate-200 rounded-xl">
                        <QrCode size={100} />
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Digital Permit ID</p>
                        <h2 className="text-3xl font-black text-slate-900">{generatedTicket}</h2>
                      </div>
                      
                      <div className="w-full bg-slate-50 p-3 rounded-lg text-left space-y-1">
                        <div className="text-xs flex justify-between"><span className="text-slate-500">Guardian:</span><span className="font-bold">{lastIssued?.guardianName ?? '—'}</span></div>
                        <div className="text-xs flex justify-between"><span className="text-slate-500">Participants:</span><span className="font-bold">{lastIssued?.participants ?? '—'}</span></div>
                      </div>

                      <button 
                        onClick={copyToClipboard}
                        className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
                      >
                        {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                        {copied ? "Copied!" : "Copy Ticket ID"}
                      </button>
                   </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-sm font-bold text-blue-400">
                  <ShieldCheck size={16} />
                  Secured & Stored in Database
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default TicketGenerator;

