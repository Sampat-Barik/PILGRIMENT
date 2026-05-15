import React, { useState, useEffect, useMemo } from 'react';
import { Database, XCircle, Search, ShieldCheck, Activity, LogIn, LogOut, Edit2, Trash2, CheckCircle2, AlertTriangle, User, Users, Mail, Phone, MapPin, Hash, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '../components/Shared';
import { TicketDemoLimitWidget } from '../components/TicketDemoLimitWidget';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, getDocs, updateDoc, serverTimestamp, onSnapshot, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { countTicketsTowardDemoCap } from '../services/ticketDemoLimits';

type VerifyTicket = {
  docId: string;
  ticketsID: string;
  guardianName: string;
  participants: number;
  members?: string[];
  individualNames?: string[];
  email?: string;
  phone?: string;
  eventName?: string;
  seatCategory?: string;
  status: string;
  createdAt: any;
  terminatedAt?: any;
};

const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

function getParticipantNames(t: VerifyTicket): string[] {
  const raw = t.members?.length ? t.members : t.individualNames;
  if (!raw?.length) return [];
  return raw.map((n) => String(n).trim()).filter(Boolean);
}

const Verification = () => {
  const [activeTab, setActiveTab] = useState<'verify' | 'manage'>('verify');
  
  // -- Verify State --
  const [ticketId, setTicketId] = useState("");
  const [status, setStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [ticket, setTicket] = useState<VerifyTicket | null>(null);
  const [actionTaken, setActionTaken] = useState<string>("");

  // -- Management State --
  const [allTickets, setAllTickets] = useState<VerifyTicket[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState("current");
  
  const [editingTicket, setEditingTicket] = useState<VerifyTicket | null>(null);
  const [terminatingTicket, setTerminatingTicket] = useState<VerifyTicket | null>(null);
  const [participantsDetailTicket, setParticipantsDetailTicket] = useState<VerifyTicket | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Listen to all tickets for management (real-time)
  useEffect(() => {
    const q = query(collection(db, "tickets"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tickets: VerifyTicket[] = [];
      snapshot.forEach((docSnap) => {
        tickets.push({ ...docSnap.data() as Omit<VerifyTicket, 'docId'>, docId: docSnap.id });
      });
      // Sort by createdAt descending locally
      tickets.sort((a, b) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tB - tA;
      });
      setAllTickets(tickets);
    });

    // WIPE OLD TICKETS EVERY NIGHT LOGIC
    const cleanupOldTickets = async () => {
      try {
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Midnight today
        const startOfToday = Timestamp.fromDate(now);
        
        // Find all tickets created before today
        const oldTicketsQuery = query(collection(db, "tickets"), where("createdAt", "<", startOfToday));
        const oldSnapshot = await getDocs(oldTicketsQuery);
        
        if (!oldSnapshot.empty) {
          console.log(`Wiping ${oldSnapshot.size} old tickets from previous days...`);
          const deletePromises = oldSnapshot.docs.map(d => deleteDoc(doc(db, "tickets", d.id)));
          await Promise.all(deletePromises);
          console.log("Old tickets successfully wiped from the database.");
        }
      } catch (err) {
        console.error("Error wiping old tickets:", err);
      }
    };

    cleanupOldTickets();
    
    // Also set an interval to run this check if the app is left open at midnight
    const cleanupInterval = setInterval(cleanupOldTickets, 60 * 60 * 1000); // Check every hour

    return () => {
      unsubscribe();
      clearInterval(cleanupInterval);
    };
  }, []);

  const showToast = (message: string, type: 'success'|'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- VERIFY LOGIC ---
  const handleVerify = async () => {
    if (!ticketId.trim()) return;
    setIsLoading(true);
    setReason("");
    setTicket(null);
    setActionTaken("");
    setStatus('idle');

    try {
      const formattedId = ticketId.trim().toUpperCase();
      const q = query(collection(db, "tickets"), where("ticketsID", "==", formattedId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setStatus('invalid');
        setReason("Ticket ID not found in database.");
        setIsLoading(false);
        return;
      }

      const ticketDoc = querySnapshot.docs[0];
      const ticketRef = ticketDoc.ref;
      const ticketData = { ...ticketDoc.data(), docId: ticketDoc.id } as VerifyTicket;
      setTicket(ticketData);

      const currentStatus = ticketData.status?.toLowerCase() || "";

      if (currentStatus === "terminated" || currentStatus === "cancelled") {
        setStatus('invalid');
        setReason("This ticket has been TERMINATED/CANCELLED and is no longer valid.");
      } else if (currentStatus === "logged-out") {
        setStatus('invalid');
        setReason("Ticket has already been used and logged out.");
      } else if (currentStatus === "active" || currentStatus === "pending") {
        await updateDoc(ticketRef, {
          status: "checked-in",
          checkedInAt: serverTimestamp()
        });
        setStatus('valid');
        setActionTaken("CHECKED IN");
        setTicket({ ...ticketData, status: "checked-in" });
      } else if (currentStatus === "checked-in" || currentStatus === "verified") {
        await updateDoc(ticketRef, {
          status: "logged-out",
          loggedOutAt: serverTimestamp()
        });
        setStatus('valid');
        setActionTaken("LOGGED OUT");
        setTicket({ ...ticketData, status: "logged-out" });
      } else {
        setStatus('invalid');
        setReason(`Unknown ticket status: ${currentStatus}`);
      }
    } catch (e: any) {
      console.error(e);
      setStatus('invalid');
      setReason(`Firebase Error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- MANAGEMENT LOGIC ---
  const filteredTickets = useMemo(() => {
    let filtered = allTickets;

    if (statusFilter !== "all") {
      filtered = filtered.filter(t => {
        const s = (t.status || "").toLowerCase();
        if (statusFilter === "current") return s === "active" || s === "pending" || s === "checked-in" || s === "verified";
        if (statusFilter === "active") return s === "active" || s === "pending";
        if (statusFilter === "verified") return s === "checked-in" || s === "verified";
        if (statusFilter === "cancelled") return s === "terminated" || s === "cancelled";
        return s === statusFilter; // e.g. logged-out
      });
    }

    if (debouncedSearch) {
      const lowerSearch = debouncedSearch.toLowerCase();
      filtered = filtered.filter(t => 
        (t.ticketsID && t.ticketsID.toLowerCase().includes(lowerSearch)) ||
        (t.guardianName && t.guardianName.toLowerCase().includes(lowerSearch)) ||
        (t.email && t.email.toLowerCase().includes(lowerSearch)) ||
        (t.phone && t.phone.toLowerCase().includes(lowerSearch)) ||
        (t.eventName && t.eventName.toLowerCase().includes(lowerSearch))
      );
    }

    return filtered;
  }, [allTickets, debouncedSearch, statusFilter]);

  const paginatedTickets = filteredTickets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);

  const issuedTowardDemoCap = useMemo(() => countTicketsTowardDemoCap(allTickets), [allTickets]);

  const handleTerminateConfirm = async () => {
    if (!terminatingTicket) return;
    try {
      await updateDoc(doc(db, "tickets", terminatingTicket.docId), {
        status: "terminated",
        terminatedAt: serverTimestamp(),
        terminatedBy: "Admin"
      });
      showToast("Ticket terminated successfully", "success");
    } catch (e: any) {
      showToast("Failed to terminate ticket", "error");
    }
    setTerminatingTicket(null);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTicket) return;
    try {
      await updateDoc(doc(db, "tickets", editingTicket.docId), {
        guardianName: editingTicket.guardianName,
        email: editingTicket.email || "",
        phone: editingTicket.phone || "",
        eventName: editingTicket.eventName || "",
        seatCategory: editingTicket.seatCategory || "",
        status: editingTicket.status,
        lastEditedAt: serverTimestamp(),
        lastEditedBy: "Admin"
      });
      showToast("Ticket updated successfully", "success");
      setEditingTicket(null);
    } catch (e: any) {
      showToast("Failed to update ticket", "error");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black">Verification & Management</h1>
        <p className="text-slate-500 font-medium">Verify entries and manage all issued tickets</p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-4">
        <button 
          onClick={() => setActiveTab('verify')}
          className={`px-6 py-3 rounded-xl font-bold transition-all border-2 ${activeTab === 'verify' ? 'bg-slate-900 text-white border-slate-900' : 'bg-transparent border-slate-200 text-slate-500 hover:border-slate-400'}`}
        >
          Gate Verification
        </button>
        <button 
          onClick={() => setActiveTab('manage')}
          className={`px-6 py-3 rounded-xl font-bold transition-all border-2 ${activeTab === 'manage' ? 'bg-slate-900 text-white border-slate-900' : 'bg-transparent border-slate-200 text-slate-500 hover:border-slate-400'}`}
        >
          Ticket Management
        </button>
      </div>

      {activeTab === 'verify' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
          <Card className="p-8">
            <div className="flex flex-col items-center gap-6">
              <div className="w-20 h-20 bg-blue-100 border-2 border-slate-900 rounded-2xl flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
                <Database className="text-blue-600" size={40} />
              </div>
              
              <div className="w-full max-w-md space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="text" 
                    value={ticketId}
                    onChange={(e) => setTicketId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                    placeholder="Enter Ticket ID (e.g. TIC-A1B2C3D4)"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-900 rounded-xl text-lg font-bold focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all uppercase"
                  />
                </div>
                <button 
                  onClick={handleVerify}
                  className="w-full neo-button neo-button-primary py-4 text-lg disabled:opacity-60"
                  disabled={isLoading || !ticketId.trim()}
                >
                  {isLoading ? "Verifying..." : "Verify Record"}
                </button>
              </div>

              <AnimatePresence mode="wait">
                {status !== 'idle' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`w-full max-w-md p-6 rounded-2xl border-2 border-slate-900 flex flex-col items-center gap-4 ${
                      status === 'valid' ? (actionTaken === 'CHECKED IN' ? 'bg-green-100' : 'bg-orange-100') : 'bg-red-100'
                    }`}
                  >
                    {status === 'valid' ? (
                      <>
                        {actionTaken === 'CHECKED IN' ? (
                          <LogIn className="text-green-600" size={48} />
                        ) : (
                          <LogOut className="text-orange-600" size={48} />
                        )}
                        <div className="text-center">
                          <p className={`font-black text-xl tracking-tight ${actionTaken === 'CHECKED IN' ? 'text-green-800' : 'text-orange-800'}`}>
                            SUCCESSFULLY {actionTaken}
                          </p>
                        </div>
                        <div className="w-full bg-white/50 p-4 rounded-xl border border-slate-200 text-sm space-y-2">
                          <div className="flex justify-between border-b pb-1">
                            <span className="text-slate-500">Guardian Name:</span> 
                            <span className="font-bold">{ticket?.guardianName}</span>
                          </div>
                          <div className="flex justify-between border-b pb-1">
                            <span className="text-slate-500">Total Participants:</span> 
                            <span className="font-bold">{ticket?.participants}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle className="text-red-600" size={48} />
                        <div className="text-center">
                          <p className="font-black text-xl text-red-800 tracking-tight">ENTRY DENIED</p>
                          <p className="text-sm text-red-600 font-bold mt-1 break-words">{reason}</p>
                        </div>
                        {ticket && (
                          <div className="w-full bg-white/50 p-4 rounded-xl border border-red-200 text-xs mt-2">
                            <div className="flex justify-between"><span>Guardian:</span> <span className="font-bold">{ticket.guardianName}</span></div>
                            <div className="flex justify-between"><span>Status:</span> <span className="font-bold uppercase text-red-600">{ticket.status}</span></div>
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>
        </motion.div>
      )}

      {activeTab === 'manage' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <TicketDemoLimitWidget issuedTowardCap={issuedTowardDemoCap} />

          {/* Search & Filter Bar */}
          <Card className="p-4 flex flex-col md:flex-row gap-4 bg-white/80 backdrop-blur-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                placeholder="Search by ID, Name, Email, Phone, Event..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl font-medium focus:border-slate-900 outline-none transition-all"
              />
            </div>
            <div className="relative min-w-[200px]">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select 
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-700 focus:border-slate-900 outline-none appearance-none cursor-pointer"
              >
                <option value="current">Active & Checked-In (Waitlist)</option>
                <option value="all">All Statuses</option>
                <option value="active">Pending / Active</option>
                <option value="verified">Verified / Checked-in</option>
                <option value="logged-out">Logged Out</option>
                <option value="cancelled">Cancelled / Terminated</option>
              </select>
            </div>
          </Card>

          {/* Ticket List */}
          <div className="space-y-4">
            {paginatedTickets.length === 0 ? (
              <div className="text-center py-12 bg-white/50 rounded-2xl border-2 border-slate-200 border-dashed">
                <Search size={48} className="mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-bold text-slate-700">No tickets found</h3>
                <p className="text-slate-500">Try adjusting your search or filters.</p>
              </div>
            ) : (
              paginatedTickets.map(t => (
                <Card key={t.docId} className="p-0 overflow-hidden flex flex-col md:flex-row">
                  <div className={`w-full md:w-3 ${
                    t.status === 'terminated' || t.status === 'cancelled' ? 'bg-red-500' :
                    t.status === 'checked-in' || t.status === 'verified' ? 'bg-green-500' :
                    t.status === 'logged-out' ? 'bg-orange-500' :
                    'bg-blue-500'
                  } h-2 md:h-auto`} />
                  
                  <div className="flex-1 p-5 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setParticipantsDetailTicket(t)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setParticipantsDetailTicket(t);
                        }
                      }}
                      className="md:col-span-9 grid grid-cols-1 md:grid-cols-9 gap-6 items-center rounded-xl -m-2 p-2 text-left cursor-pointer hover:bg-slate-50 border-2 border-transparent hover:border-slate-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                    >
                      <div className="md:col-span-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                             t.status === 'terminated' || t.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                             t.status === 'checked-in' || t.status === 'verified' ? 'bg-green-100 text-green-700' :
                             t.status === 'logged-out' ? 'bg-orange-100 text-orange-700' :
                             'bg-blue-100 text-blue-700'
                          }`}>
                            {t.status}
                          </span>
                        </div>
                        <h4 className="font-black text-lg text-slate-900">{t.guardianName}</h4>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500 font-medium">
                          <span className="flex items-center gap-2">
                            <User size={14} /> {t.participants} Participants
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Tap for names</span>
                        </div>
                      </div>

                      <div className="md:col-span-5 space-y-1.5 text-sm font-medium text-slate-600">
                        {t.email && <div className="flex items-center gap-2"><Mail size={14} className="text-slate-400 shrink-0" /> {t.email}</div>}
                        {t.phone && <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400 shrink-0" /> {t.phone}</div>}
                        {t.eventName && <div className="flex items-center gap-2"><MapPin size={14} className="text-slate-400 shrink-0" /> Event: {t.eventName}</div>}
                        {t.seatCategory && <div className="flex items-center gap-2"><Hash size={14} className="text-slate-400 shrink-0" /> Seat: {t.seatCategory}</div>}
                      </div>
                    </div>

                    <div className="md:col-span-3 flex flex-row md:flex-col gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                      <button 
                        type="button"
                        onClick={() => setEditingTicket(t)}
                        className="px-4 py-2 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold border-2 border-transparent transition-all text-sm flex-1 md:flex-none"
                      >
                        <Edit2 size={16} /> Edit
                      </button>
                      <button 
                        type="button"
                        onClick={() => setTerminatingTicket(t)}
                        disabled={t.status === 'terminated' || t.status === 'cancelled'}
                        className="px-4 py-2 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border-2 border-red-100 hover:border-red-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold transition-all text-sm flex-1 md:flex-none"
                      >
                        <Trash2 size={16} /> Terminate
                      </button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 pt-4">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 bg-white rounded-xl border-2 border-slate-200 hover:border-slate-900 transition-colors disabled:opacity-50 disabled:hover:border-slate-200"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="font-bold text-slate-600 bg-white px-4 py-2 rounded-xl border-2 border-slate-200">
                Page {currentPage} of {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 bg-white rounded-xl border-2 border-slate-200 hover:border-slate-900 transition-colors disabled:opacity-50 disabled:hover:border-slate-200"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* MODALS */}
      <AnimatePresence>
        {/* Participant names (ticket row click) */}
        {participantsDetailTicket && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setParticipantsDetailTicket(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full border-2 border-slate-900 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 p-5 border-b-2 border-slate-100 bg-slate-50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="rounded-xl bg-blue-100 border-2 border-slate-900 p-2 shrink-0">
                    <Users className="text-blue-700" size={22} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Participants</p>
                    <h3 className="font-black text-lg text-slate-900 truncate">{participantsDetailTicket.guardianName}</h3>
                    <p className="text-xs font-mono font-bold text-slate-600 truncate">{participantsDetailTicket.ticketsID}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setParticipantsDetailTicket(null)}
                  className="shrink-0 p-2 rounded-xl hover:bg-slate-200 text-slate-600 transition-colors border-2 border-transparent hover:border-slate-300"
                  aria-label="Close"
                >
                  <XCircle size={22} />
                </button>
              </div>
              <div className="p-5 max-h-[min(60vh,420px)] overflow-y-auto">
                {(() => {
                  const names = getParticipantNames(participantsDetailTicket);
                  if (names.length === 0) {
                    return (
                      <p className="text-sm font-medium text-slate-500 text-center py-6">
                        No individual participant names are stored on this ticket (legacy or manual entry).
                      </p>
                    );
                  }
                  return (
                    <ol className="space-y-2">
                      {names.map((name, idx) => (
                        <li
                          key={`${idx}-${name}`}
                          className="flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-[11px] font-black text-white">
                            {idx + 1}
                          </span>
                          <span className="flex-1">{name}</span>
                        </li>
                      ))}
                    </ol>
                  );
                })()}
                <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Total listed: {getParticipantNames(participantsDetailTicket).length} · Headcount: {participantsDetailTicket.participants}
                </p>
              </div>
            </motion.div>
          </div>
        )}

        {/* Terminate Modal */}
        {terminatingTicket && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full border-2 border-slate-900"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-50">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-black text-center mb-2">Terminate Ticket?</h3>
              <p className="text-center text-slate-600 mb-6 font-medium leading-relaxed">
                Are you sure you want to terminate ticket <strong className="text-slate-900">{terminatingTicket.ticketsID}</strong>? This action will disable future verification instantly.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setTerminatingTicket(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-colors border-2 border-transparent">
                  Cancel
                </button>
                <button onClick={handleTerminateConfirm} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl border-2 border-red-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-transform active:translate-y-1 active:shadow-none">
                  Yes, Terminate
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Edit Modal */}
        {editingTicket && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full border-2 border-slate-900 my-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black flex items-center gap-2">
                  <Edit2 size={24} className="text-blue-500" /> Edit Ticket
                </h3>
                <button onClick={() => setEditingTicket(null)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors">
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleEditSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">User / Guardian Name</label>
                  <input required type="text" value={editingTicket.guardianName} onChange={e => setEditingTicket({...editingTicket, guardianName: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-medium focus:border-blue-500 outline-none transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                    <input type="email" value={editingTicket.email || ""} onChange={e => setEditingTicket({...editingTicket, email: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-medium focus:border-blue-500 outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Phone</label>
                    <input type="tel" value={editingTicket.phone || ""} onChange={e => setEditingTicket({...editingTicket, phone: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-medium focus:border-blue-500 outline-none transition-colors" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Event Assigned</label>
                    <input type="text" value={editingTicket.eventName || ""} onChange={e => setEditingTicket({...editingTicket, eventName: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-medium focus:border-blue-500 outline-none transition-colors" placeholder="e.g. Morning Darshan" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Seat/Category</label>
                    <input type="text" value={editingTicket.seatCategory || ""} onChange={e => setEditingTicket({...editingTicket, seatCategory: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-medium focus:border-blue-500 outline-none transition-colors" placeholder="e.g. VIP, Row A" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Ticket Status</label>
                  <select value={editingTicket.status} onChange={e => setEditingTicket({...editingTicket, status: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none transition-colors appearance-none cursor-pointer">
                    <option value="active">Active / Pending</option>
                    <option value="checked-in">Checked-In / Verified</option>
                    <option value="logged-out">Logged-Out</option>
                    <option value="terminated">Terminated / Cancelled</option>
                  </select>
                </div>

                <div className="pt-6 flex gap-3">
                  <button type="button" onClick={() => setEditingTicket(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-colors border-2 border-transparent">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl border-2 border-blue-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-transform active:translate-y-1 active:shadow-none">
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className={`fixed bottom-8 left-1/2 z-[150] px-6 py-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] font-bold flex items-center gap-3 border-2 border-slate-900 ${
              toast.type === 'success' ? 'bg-green-400 text-green-950' : 'bg-red-400 text-red-950'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Verification;
