import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ShieldCheck, Mail, Phone, Lock, LogIn } from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup, 
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInAnonymously
} from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { user, loginAsDemo } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'email' | 'phone'>('email');
  const [isLogin, setIsLogin] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
      });
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Google Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);
    try {
      loginAsDemo();
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Demo Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, phone, appVerifier);
      setConfirmationResult(result);
      setIsOtpSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await confirmationResult.confirm(otp);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Abstract Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/30 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none"></div>
      
      <div id="recaptcha-container"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl z-10"
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-600/20 border border-blue-500/50 rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            <ShieldCheck className="text-blue-400" size={32} />
          </div>
        </div>
        
        <h2 className="text-3xl font-black text-center text-white mb-2 tracking-tight">SYSTEM ACCESS</h2>
        <p className="text-slate-400 text-center text-sm font-medium mb-8">Authenticate to enter secure monitoring dashboard</p>

        {error && (
          <div className="bg-red-950/50 border border-red-500/50 text-red-400 p-3 rounded-xl mb-6 text-sm text-center font-medium">
            {error}
          </div>
        )}

        <div className="flex bg-slate-800/50 p-1 rounded-xl mb-6">
          <button 
            onClick={() => { setActiveTab('email'); setError(''); }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'email' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Email Access
          </button>
          <button 
            onClick={() => { setActiveTab('phone'); setError(''); }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'phone' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Phone Access
          </button>
        </div>

        {activeTab === 'email' ? (
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Secure Email Address"
                className="w-full bg-slate-950/50 border border-slate-800 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input 
                type={showPassword ? 'text' : 'password'} 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Access Password"
                className="w-full bg-slate-950/50 border border-slate-800 text-white rounded-xl py-3 pl-12 pr-12 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <LogIn size={20} />
              {loading ? 'AUTHENTICATING...' : isLogin ? 'INITIATE LOGIN' : 'CREATE CLEARANCE'}
            </button>
            <p className="text-center text-slate-400 text-sm mt-4">
              {isLogin ? "No clearance?" : "Already have clearance?"}
              <button type="button" onClick={() => setIsLogin(!isLogin)} className="ml-2 text-blue-400 hover:text-blue-300 font-bold">
                {isLogin ? "Request Access" : "Log In"}
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={isOtpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4">
            {!isOtpSent ? (
              <>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                  <input 
                    type="tel" 
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="Phone (+1234567890)"
                    className="w-full bg-slate-950/50 border border-slate-800 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={loading || !phone}
                  className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 border border-slate-600"
                >
                  {loading ? 'SENDING OTP...' : 'TRANSMIT OTP'}
                </button>
              </>
            ) : (
              <>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                  <input 
                    type="text" 
                    required
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="w-full bg-slate-950/50 border border-slate-800 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600 tracking-widest text-center"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={loading || !otp}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'VERIFYING...' : 'VERIFY IDENTITY'}
                </button>
              </>
            )}
          </form>
        )}

        <div className="my-6 flex items-center">
          <div className="flex-1 border-t border-slate-800"></div>
          <span className="px-4 text-xs text-slate-500 font-bold tracking-wider">OR</span>
          <div className="flex-1 border-t border-slate-800"></div>
        </div>

        <button 
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-3 bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-bold transition-all flex items-center justify-center gap-3 disabled:opacity-50 mb-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google Authentication
        </button>

        <button 
          onClick={handleDemoLogin}
          disabled={loading}
          className="w-full py-3 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-xl font-bold transition-all flex items-center justify-center gap-3 disabled:opacity-50 border border-indigo-500/30"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Demo Mode (Bypass Firebase)
        </button>
      </motion.div>
    </div>
  );
};

export default Login;
