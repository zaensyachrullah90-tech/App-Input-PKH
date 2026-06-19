import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { supabase } from './config/supabaseClient';
import { Toaster } from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faClipboardList, faTable, faCog, faSignOutAlt, faEnvelopeOpenText } from '@fortawesome/free-solid-svg-icons';

import Auth from './pages/Auth/Login';
import Dashboard from './pages/Dashboard';
import FormList from './pages/Forms/index';
import SmartForm from './pages/Forms/SmartForm';
import PublicForm from './pages/Forms/PublicForm';
import Responses from './pages/Responses/index';
import Settings from './pages/Settings';
import Surat from './pages/Surat/index';

const NavItem = ({ to, icon, label, currentPath }) => {
  const isActive = currentPath === to || currentPath.startsWith(to + '/');
  return (
    <Link to={to} className={`flex flex-col md:flex-row items-center p-3 md:px-6 md:py-4 transition-all border-b-2 md:border-b-0 md:border-l-4 ${isActive ? 'text-primary border-primary bg-darker/50' : 'text-gray-500 border-transparent hover:text-primary hover:bg-darker/30'}`}>
      <FontAwesomeIcon icon={icon} className="text-xl md:text-lg md:mr-4 mb-1 md:mb-0" />
      <span className="text-[10px] md:text-sm font-bold tracking-wide uppercase whitespace-nowrap">{label}</span>
    </Link>
  );
};

function AppNavigation({ isVerifikator }) {
  const location = useLocation();
  return (
    <div className="flex md:flex-col w-full justify-around md:justify-start md:mt-4 overflow-x-auto hide-scrollbar">
      <NavItem to="/" icon={faHome} label="Beranda" currentPath={location.pathname} />
      
      {/* MENU INI HANYA MUNCUL JIKA BUKAN VERIFIKATOR (ADMIN) */}
      {!isVerifikator && <NavItem to="/forms" icon={faClipboardList} label="Data Form" currentPath={location.pathname} />}
      
      {/* MENU INI MUNCUL UNTUK SEMUA */}
      <NavItem to="/responses" icon={faTable} label="Hasil Input" currentPath={location.pathname} />
      
      {/* MENU INI HANYA MUNCUL JIKA BUKAN VERIFIKATOR (ADMIN) */}
      {!isVerifikator && <NavItem to="/surat" icon={faEnvelopeOpenText} label="Smart Surat" currentPath={location.pathname} />}
      {!isVerifikator && <NavItem to="/settings" icon={faCog} label="Pengaturan" currentPath={location.pathname} />}
      
      <button onClick={() => supabase.auth.signOut()} className="md:hidden flex flex-col items-center p-3 text-red-500 hover:text-red-400 transition-colors">
        <FontAwesomeIcon icon={faSignOutAlt} className="text-xl mb-1" />
        <span className="text-[10px] font-bold uppercase tracking-wide">Keluar</span>
      </button>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [isVerifikator, setIsVerifikator] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      checkRole(session);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      checkRole(session);
    });
  }, []);

  // LOGIKA SMART ROLE: Jika email mengandung kata "verifikator", maka ia adalah Verifikator
  const checkRole = (sess) => {
    if (sess?.user?.email?.toLowerCase().includes('verifikator')) {
      setIsVerifikator(true);
    } else {
      setIsVerifikator(false);
    }
  };

  return (
    <Router>
      <Toaster position="top-right" toastOptions={{ style: { background: '#1f2937', color: '#fff', border: '1px solid #374151', borderRadius: '12px' } }} />
      <Routes>
        <Route path="/p/:id" element={<PublicForm />} />

        <Route path="/*" element={
          !session ? <Auth /> : (
            <div className="min-h-screen bg-[#030712] text-gray-200 font-sans flex flex-col md:flex-row overflow-hidden">
              <nav className="fixed bottom-0 left-0 w-full md:w-64 md:h-screen bg-[#0f172a]/95 backdrop-blur-xl border-t md:border-t-0 md:border-r border-white/10 shadow-2xl z-50 flex md:flex-col justify-around md:justify-start pb-safe md:pb-0">
                <div className="hidden md:flex flex-col items-center justify-center py-8 border-b border-white/5">
                  <div className="bg-primary/20 w-16 h-16 rounded-full flex items-center justify-center mb-3 border border-primary/30 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                    <span className="text-2xl font-black text-primary">PKH</span>
                  </div>
                  <h1 className="text-xl font-black text-white tracking-widest">SMART<span className="text-primary">HUB</span></h1>
                  {isVerifikator && <div className="mt-2 bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-[10px] font-black tracking-widest border border-blue-600/30">VERIFIKATOR</div>}
                </div>
                <AppNavigation isVerifikator={isVerifikator} />
                <button onClick={() => supabase.auth.signOut()} className="hidden md:flex items-center mt-auto p-6 text-red-500 hover:text-red-400 hover:bg-white/5 transition-colors border-t border-white/5">
                  <FontAwesomeIcon icon={faSignOutAlt} className="text-lg mr-4" />
                  <span className="text-sm font-bold uppercase tracking-wide">Logout Sistem</span>
                </button>
              </nav>

              <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 md:ml-64 w-full md:w-[calc(100%-16rem)] overflow-x-hidden h-screen overflow-y-auto">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/responses" element={<Responses />} />
                  
                  {/* PROTEKSI RUTE MUTLAK: Jika Verifikator mencoba akses URL Admin, blokir! */}
                  {!isVerifikator && (
                    <>
                      <Route path="/forms" element={<FormList />} />
                      <Route path="/form/:id" element={<SmartForm userProfile={{ id: session.user.id, kabupaten: 'Sistem' }} />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/surat" element={<Surat />} />
                    </>
                  )}
                  
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </main>
            </div>
          )
        } />
      </Routes>
    </Router>
  );
}
