import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Layout } from './components/Shared';
import Dashboard from './pages/Dashboard';
import Monitor from './pages/Monitor';
import Verification from './pages/Verification';
import Alerts from './pages/Alerts';
import TicketGenerator from './pages/TicketGenerator';
import Prediction from './pages/Prediction';
import PredictDatewise from './pages/PredictDatewise';
import About from './pages/About';
import LiveStatus from './pages/LiveStatus';
import Login from './pages/Login';
import IntroPage from './pages/IntroPage';
import ProfileWidget from './components/ProfileWidget';
import LoadingScreen from './components/LoadingScreen';
import GlitchTransition from './components/GlitchTransition';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [showLoader, setShowLoader] = useState(true);
  
  // Show glitch loading screen while auth is resolving
  if (loading) return (
    <AnimatePresence>
      <LoadingScreen onComplete={() => {}} />
    </AnimatePresence>
  );
  
  if (!user) return <Navigate to="/welcome" />;

  // Show loading screen on first authenticated entry
  if (showLoader) return (
    <AnimatePresence>
      <LoadingScreen onComplete={() => setShowLoader(false)} />
    </AnimatePresence>
  );
  
  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider>
    <GlitchTransition />
    <AuthProvider>
      <Router>
        <ProfileWidget />
        <Routes>
          <Route path="/welcome" element={<IntroPage />} />
          <Route path="/login" element={<Login />} />
          
          <Route path="/*" element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/monitor" element={<Monitor />} />
                  <Route path="/generator" element={<TicketGenerator />} />
                  <Route path="/verification" element={<Verification />} />
                  <Route path="/prediction" element={<Prediction />} />
                  <Route path="/predict-datewise" element={<PredictDatewise />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/live-status" element={<LiveStatus />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;