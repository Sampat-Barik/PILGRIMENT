import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu as MenuIcon, Compass, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const Card = ({ children, className = "", id }: { children: React.ReactNode, className?: string, id?: string }) => (
  <div id={id} className={`neo-card p-6 ${className}`}>
    {children}
  </div>
);

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/' },
    { name: 'Monitor', path: '/monitor' },
    { name: 'Generator', path: '/generator' },
    { name: 'Verification', path: '/verification' },
    { name: 'Prediction', path: '/prediction' },
    { name: 'Alerts', path: '/alerts' },
    { name: 'About', path: '/about' }
  ];

  return (
    <header className="sticky top-0 z-50 w-full px-6 pt-4 transition-all duration-300">
      <nav className={`
        flex items-center justify-between p-4 max-w-7xl mx-auto w-full 
        transition-all duration-500 rounded-2xl border-2 border-slate-900
        ${scrolled 
          ? "backdrop-blur-xl shadow-[8px_8px_0px_0px_var(--shadow-color)] translate-y-1" 
          : "shadow-[4px_4px_0px_0px_var(--shadow-color)]"
        }
      `}
      style={{ backgroundColor: scrolled ? 'var(--nav-bg-scrolled)' : 'var(--nav-bg)', borderColor: 'var(--border-color)' }}
      >
        <Link to="/" className="flex items-center gap-3">
          <div className="bg-purple-200 p-2.5 border-2 border-slate-900 rounded-xl shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] -rotate-3 hover:rotate-0 transition-transform">
            <Compass size={26} className="text-purple-900" />
          </div>
          <div className="hidden md:flex flex-col">
            <span className="font-black text-2xl tracking-tighter uppercase leading-none text-slate-900">PILGRIMENT</span>
            <span className="font-bold text-[9px] tracking-[0.15em] uppercase text-slate-500 mt-1">Smart Pilgrim Management</span>
          </div>
        </Link>
        
        <div className="hidden md:flex items-center gap-8 font-bold text-sm">
          {navItems.map((item) => (
            <Link 
              key={item.name}
              to={item.path} 
              className={`transition-all border-b-2 pb-0.5 ${
                location.pathname === item.path 
                ? "border-slate-900 text-blue-600" 
                : "border-transparent hover:border-slate-400 text-slate-600 hover:text-slate-900"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2.5 border-2 rounded-xl font-bold transition-all shadow-[3px_3px_0px_0px_var(--shadow-color)] hover:shadow-[4px_4px_0px_0px_var(--shadow-color)] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
            style={{ 
              backgroundColor: isDark ? '#0f172a' : '#fef08a', 
              borderColor: 'var(--border-color)',
              color: isDark ? '#fde68a' : '#0f172a'
            }}
            title={isDark ? 'Switch to Day Mode' : 'Switch to Night Mode'}
          >
            {isDark ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <Link to="/live-status" className={`
            neo-button py-1.5 text-xs hidden sm:block
            ${scrolled ? "bg-pink-200" : "bg-[#bfdbfe]"}
          `}>
            Live Status
          </Link>
          <button className="md:hidden p-2 border-2 border-slate-900 rounded-lg">
            <MenuIcon size={20} />
          </button>
        </div>
      </nav>
      
      <AnimatePresence>
        {scrolled && (
          <motion.div 
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0, scaleX: 0 }}
            className="h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent max-w-7xl mx-auto mt-2 blur-[2px]"
          />
        )}
      </AnimatePresence>
    </header>
  );
};

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen pb-24">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 mt-32">
        {children}
      </main>

      {/* Scrolling News Ticker */}
      <div className="fixed bottom-0 left-0 right-0 py-2 overflow-hidden whitespace-nowrap border-t-2 z-50" style={{ backgroundColor: 'var(--ticker-bg)', borderColor: 'var(--border-color)', color: 'var(--ticker-text)' }}>
        <motion.div 
          animate={{ x: [0, -1000] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="flex gap-12 font-mono text-xs uppercase"
        >
          {[1,2].map(i => (
            <React.Fragment key={i}>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Secure Verification: Syncing Firebase Data Stream
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                Traffic Alert: Zone 3 approaching Medium Density
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                System Status: All IoT sensors operational
              </span>
            </React.Fragment>
          ))}
        </motion.div>
      </div>

      {/* Floating UI Elements Background */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50/40 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-pink-50/40 rounded-full blur-[120px]"></div>
      </div>
    </div>
  );
};
