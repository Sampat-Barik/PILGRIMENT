import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User as UserIcon, LogOut, Trash2, Camera, Building2, Calendar, Mail, Phone, Pencil, X, Save, Moon, Sun } from 'lucide-react';
import { signOut, deleteUser } from 'firebase/auth';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const ProfileWidget = () => {
  const { user, userData, refreshUserData, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCameras, setEditCameras] = useState<number | string>(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const handleLogout = async () => {
    try {
      logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error', error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("CRITICAL WARNING: Are you sure you want to permanently delete your enterprise account and all associated data? This action CANNOT be undone.")) return;
    
    setIsDeleting(true);
    try {
      // 1. Delete Firestore document
      await deleteDoc(doc(db, "users", user.uid));
      // 2. Delete Auth user
      await deleteUser(user);
      navigate('/login');
    } catch (error: any) {
      console.error('Delete account error', error);
      if (error.code === 'auth/requires-recent-login') {
        alert("For security reasons, please log out and log back in before deleting your account.");
      } else {
        alert("Failed to delete account. Please try again.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    if (timestamp.toDate) return timestamp.toDate().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    return new Date(timestamp).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const startEditing = () => {
    setEditName(userData?.enterpriseName || getProfileName());
    setEditPhone(userData?.phone || "");
    setEditEmail(userData?.email || user.email || "");
    setEditCameras(userData?.numberOfCameras || 0);
    setIsEditingProfile(true);
  };

  const saveProfile = async () => {
    try {
      await updateDoc(doc(db, "users", user.uid), {
        enterpriseName: editName,
        phone: editPhone,
        email: editEmail,
        numberOfCameras: Number(editCameras) || 0
      });
      await refreshUserData();
      setIsEditingProfile(false);
    } catch (e) {
      console.error(e);
      alert("Failed to save profile changes.");
    }
  };

  const getProfileName = () => {
    if (user.email) {
      const prefix = user.email.split('@')[0];
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    return userData?.enterpriseName || "System Operator";
  };

  const getFirstLoginDate = () => {
    if (user.metadata && user.metadata.creationTime) {
      return new Date(user.metadata.creationTime).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    }
    return formatDate(userData?.createdAt);
  };

  const inputClass = "w-full bg-slate-50 border-2 border-slate-900 text-slate-900 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 font-bold";

  return (
    <div className="fixed top-4 right-4 z-[100]" ref={dropdownRef}>
      {/* Profile Button — Neobrutalist style */}
      <motion.button 
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05, rotate: -3 }}
        whileTap={{ scale: 0.95 }}
        className="w-12 h-12 rounded-xl bg-[#bfdbfe] border-2 border-slate-900 flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] transition-shadow"
      >
        <UserIcon size={22} className="text-slate-900" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute top-16 right-0 w-80 border-2 rounded-2xl overflow-hidden"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: '6px 6px 0px 0px var(--shadow-color)' }}
          >
            {/* Header */}
            <div className="p-5 bg-[#bfdbfe] border-b-2 border-slate-900">
              {isEditingProfile ? (
                <div className="space-y-2.5">
                  <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Profile / Enterprise Name"
                    className={inputClass}
                  />
                  <input 
                    type="text" 
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Phone Number"
                    className={inputClass}
                  />
                  <input 
                    type="email" 
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Contact Email"
                    className={inputClass}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-slate-700 text-sm whitespace-nowrap font-bold"><Camera size={14} className="inline mr-1"/> Cameras:</span>
                    <input 
                      type="number" 
                      value={editCameras}
                      onChange={(e) => setEditCameras(e.target.value)}
                      placeholder="CCTV Count"
                      className={inputClass}
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={saveProfile} className="flex-1 bg-slate-900 text-white text-xs font-black py-2.5 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-2 transition-all">
                      <Save size={14} /> Save
                    </button>
                    <button onClick={() => setIsEditingProfile(false)} className="flex-1 bg-white text-slate-900 text-xs font-black py-2.5 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-2 transition-all">
                      <X size={14} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <Building2 size={18} className="text-slate-700" />
                      {userData?.enterpriseName !== "System Operator" && userData?.enterpriseName !== "My Enterprise" ? userData?.enterpriseName : getProfileName()}
                    </h3>
                    <button onClick={startEditing} className="p-1.5 bg-white border-2 border-slate-900 rounded-lg hover:bg-slate-100 transition-colors shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 active:shadow-none">
                      <Pencil size={12} className="text-slate-900" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 text-sm font-bold mt-1">
                    {userData?.phone ? <Phone size={14} /> : <Mail size={14} />}
                    <span className="truncate">{userData?.phone || userData?.email || user.email || user.phoneNumber || "No contact info"}</span>
                  </div>
                </>
              )}
            </div>
            
            {/* Stats */}
            <div className="p-4 space-y-2.5">
              <div className="flex items-center justify-between p-3 bg-purple-50 border-2 border-slate-900 rounded-xl">
                <div className="flex items-center gap-3 text-slate-800">
                  <Camera size={18} className="text-purple-600" />
                  <span className="text-sm font-black">CCTV Cameras</span>
                </div>
                <span className="font-black text-slate-900 bg-purple-200 px-2.5 py-0.5 rounded-lg border border-slate-900 text-sm">{userData?.numberOfCameras || 0}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-emerald-50 border-2 border-slate-900 rounded-xl">
                <div className="flex items-center gap-3 text-slate-800">
                  <Calendar size={18} className="text-emerald-600" />
                  <span className="text-sm font-black">First Login</span>
                </div>
                <span className="font-bold text-slate-900 text-xs">{getFirstLoginDate()}</span>
              </div>
            </div>

            {/* Night Mode Toggle */}
            <div className="px-4 pb-1">
              <button
                onClick={toggleTheme}
                className="w-full py-2.5 flex items-center justify-between px-4 rounded-xl border-2 border-slate-900 font-black text-sm transition-all shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 active:shadow-none"
                style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', color: isDark ? '#fde68a' : '#0f172a' }}
              >
                <div className="flex items-center gap-2">
                  {isDark ? <Moon size={16} /> : <Sun size={16} />}
                  <span>{isDark ? 'Night Mode' : 'Day Mode'}</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                  {isDark ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>

            {/* Actions */}
            <div className="p-4 border-t-2 border-slate-200 space-y-2">
              <button 
                onClick={handleLogout}
                className="w-full py-2.5 flex items-center justify-center gap-2 text-slate-900 font-black text-sm rounded-xl border-2 border-slate-900 bg-[#fef08a] shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none transition-all"
              >
                <LogOut size={16} />
                Disconnect Session
              </button>
              
              <button 
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="w-full py-2.5 flex items-center justify-center gap-2 text-red-700 font-black text-sm rounded-xl border-2 border-red-300 bg-red-50 hover:bg-red-100 active:translate-y-0.5 transition-all disabled:opacity-50"
              >
                <Trash2 size={16} />
                {isDeleting ? "Terminating..." : "Terminate Account"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileWidget;
