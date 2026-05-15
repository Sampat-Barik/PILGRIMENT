import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Brain, 
  Users, 
  Ticket, 
  UserMinus, 
  UserCheck, 
  ListTodo, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle,
  Save,
  RotateCcw,
  Pencil
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Card } from '../components/Shared';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeUp, staggerContainer, viewportOnce } from '../utils/animations';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

const LiveStatus = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Helper to get YYYY-MM-DD
  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const todayStr = getTodayStr();

  // Fetch Routine for Today
  useEffect(() => {
    const fetchRoutine = async () => {
      const docRef = doc(db, "routines", todayStr);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setTodos(docSnap.data().tasks || []);
      } else {
        // Default tasks for a new day
        const defaults = [
          { id: 1, text: "Perform Morning Crowd Analysis", completed: false },
          { id: 2, text: "Verify Gate Alpha Security Nodes", completed: false },
          { id: 3, text: "Sync Blockchain Ledger", completed: false },
        ];
        setTodos(defaults);
        // Save defaults immediately so they are locked for today
        await setDoc(docRef, { tasks: defaults, date: todayStr });
      }
    };
    fetchRoutine();
  }, [todayStr]);

  const [dbStats, setDbStats] = useState({ total: 0, active: 0, completed: 0, activeMembers: 0 });
  const [aiPeopleCount, setAiPeopleCount] = useState(0);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "tickets"), (snapshot) => {
      let total = 0;
      let active = 0;
      let completed = 0;
      let activeMembers = 0;
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        total += 1;
        if (data.status === 'active' || data.status === 'checked-in') {
          active += 1;
          activeMembers += (data.participants || 0);
        } else if (data.status === 'logged-out') {
          completed += 1;
        }
      });
      
      setDbStats({ total, active, completed, activeMembers });
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchAI = async () => {
      try {
        const res = await fetch('http://localhost:5000/ai/prediction');
        if (res.ok) {
          const data = await res.json();
          setAiPeopleCount(data.people_now || 0);
        }
      } catch (e) {}
    };
    fetchAI();
    const interval = setInterval(fetchAI, 5000);
    return () => clearInterval(interval);
  }, []);

  const crowdDensity = dbStats.activeMembers > 0 ? Math.min(100, Math.round((aiPeopleCount / dbStats.activeMembers) * 100)) : 0;

  const stats = [
    { label: "Crowd Density", value: `${crowdDensity}%`, sub: crowdDensity > 80 ? "Critical Level" : crowdDensity > 50 ? "High Activity" : "Normal Flow", icon: Users, color: crowdDensity > 80 ? "text-red-500" : "text-blue-500", bg: crowdDensity > 80 ? "bg-red-50" : "bg-blue-50" },
    { label: "Tickets Issued", value: dbStats.total.toString(), sub: "Total DB Records", icon: Ticket, color: "text-purple-500", bg: "bg-purple-50" },
    { label: "Currently Active", value: dbStats.active.toString(), sub: "Live in Zone", icon: UserCheck, color: "text-green-500", bg: "bg-green-50" },
    { label: "Completed/Left", value: dbStats.completed.toString(), sub: "Journey Finished", icon: UserMinus, color: "text-slate-500", bg: "bg-slate-50" },
  ];

  const saveToFirebase = async (updatedTodos: Todo[]) => {
    setIsSaving(true);
    try {
      const docRef = doc(db, "routines", todayStr);
      await setDoc(docRef, { tasks: updatedTodos, date: todayStr }, { merge: true });
    } catch (e) {
      console.error("Error saving routine:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const addTodo = () => {
    if (newTodo.trim()) {
      const updated = [...todos, { id: Date.now(), text: newTodo, completed: false }];
      setTodos(updated);
      setNewTodo("");
      saveToFirebase(updated);
    }
  };

  const toggleTodo = (id: number) => {
    const updated = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTodos(updated);
    saveToFirebase(updated);
  };

  const deleteTodo = (id: number) => {
    const updated = todos.filter(t => t.id !== id);
    setTodos(updated);
    saveToFirebase(updated);
  };

  return (
    <div className="space-y-12 pb-20">
      <motion.div
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        initial="hidden" animate="visible" variants={staggerContainer}
      >
        <motion.div variants={fadeUp} custom={0}>
          <h1 className="text-4xl font-black tracking-tight">AI Condition Summary</h1>
          <p className="text-slate-500 font-medium">Real-time pilgrimage operational intelligence</p>
        </motion.div>
        <motion.div variants={fadeUp} custom={1} className="flex items-center gap-2 bg-[#bfdbfe] px-4 py-2 border-2 border-slate-900 rounded-xl font-bold shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            <Brain size={20} />
          <span>AI ANALYZER ACTIVE</span>
        </motion.div>
      </motion.div>

      {/* AI Stats Grid */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        initial="hidden" whileInView="visible" viewport={viewportOnce} variants={staggerContainer}
      >
        {stats.map((stat, i) => (
          <motion.div key={i} variants={fadeUp} custom={i}>
            <Card className="flex flex-col items-center justify-center text-center p-8 bg-white">
              <motion.div
                whileHover={{ scale: 1.15, rotate: -5 }}
                className={`p-4 ${stat.bg} border-2 border-slate-900 rounded-2xl mb-4 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]`}
              >
                <stat.icon className={stat.color} size={28} />
              </motion.div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-3xl font-black tracking-tight">{stat.value}</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-1">{stat.sub}</p>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Routine Section */}
      <div className="max-w-3xl mx-auto space-y-6 pt-12 border-t-2 border-slate-200">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ListTodo className="text-blue-600" size={32} />
            <h2 className="text-3xl font-black uppercase">Daily Routine</h2>
          </div>
          <button 
            onClick={() => setIsEditing(!isEditing)}
            disabled={isSaving}
            className={`neo-button text-xs py-1 px-4 flex items-center gap-2 ${isEditing ? 'bg-green-200' : 'bg-slate-100'}`}
          >
            {isSaving ? <RotateCcw className="animate-spin" size={12} /> : (isEditing ? <Save size={12} /> : <Pencil size={12} />)}
            {isEditing ? (isSaving ? "SAVING..." : "FINISH") : "EDIT LIST"}
          </button>
        </div>

        <Card className="p-0 overflow-hidden bg-white">
          <div className="bg-slate-900 p-4 flex justify-between items-center">
            <span className="text-white font-bold text-sm tracking-widest uppercase">Management Tasks</span>
            <span className="text-blue-400 font-mono text-xs">{todos.filter(t => t.completed).length}/{todos.length} DONE</span>
          </div>

          <div className="p-6 space-y-4">
            <AnimatePresence>
              {todos.map((todo) => (
                <motion.div 
                  key={todo.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`flex items-center justify-between p-4 border-2 border-slate-900 rounded-xl transition-all ${todo.completed ? 'bg-slate-50 opacity-60' : 'bg-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'}`}
                >
                  <div className="flex items-center gap-4">
                    <button onClick={() => toggleTodo(todo.id)}>
                      {todo.completed ? <CheckCircle2 className="text-green-500" /> : <Circle className="text-slate-300" />}
                    </button>
                    <span className={`font-bold ${todo.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                      {todo.text}
                    </span>
                  </div>
                  {isEditing && (
                    <button 
                      onClick={() => deleteTodo(todo.id)}
                      className="p-2 text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {isEditing && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2 pt-4"
              >
                <input 
                  type="text" 
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  placeholder="Add new task..."
                  className="flex-1 px-4 py-3 bg-slate-50 border-2 border-slate-900 rounded-xl font-bold focus:outline-none"
                  onKeyPress={(e) => e.key === 'Enter' && addTodo()}
                />
                <button 
                  onClick={addTodo}
                  className="p-3 bg-blue-500 text-white border-2 border-slate-900 rounded-xl shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 active:shadow-none transition-all"
                >
                  <Plus size={24} />
                </button>
              </motion.div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LiveStatus;
