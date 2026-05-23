import React, { useState } from 'react';
import { supabase } from '../../config/supabaseClient';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignInAlt, faEnvelope, faLock } from '@fortawesome/free-solid-svg-icons';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      // Menampilkan pesan error asli dari Supabase agar ketahuan masalahnya
      toast.error(`Akses Ditolak: ${error.message}`);
    } else {
      toast.success('Login Enterprise Berhasil!');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-darker to-dark p-4">
      <div className="w-full max-w-md bg-glass backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 shadow-[0_0_40px_rgba(234,179,8,0.15)]">
        <div className="text-center mb-8">
          <div className="bg-primary/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner border border-primary/30">
             <FontAwesomeIcon icon={faSignInAlt} className="text-3xl text-primary" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-wider uppercase">Smart PKH <span className="text-primary">System</span></h2>
          <p className="text-gray-400 text-sm mt-2">Enterprise Admin Portal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="relative">
            <FontAwesomeIcon icon={faEnvelope} className="absolute left-4 top-4 text-gray-400" />
            <input 
              type="email" required placeholder="Email Admin"
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-dark/50 border border-gray-600 text-white placeholder-gray-500 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
            />
          </div>
          <div className="relative">
            <FontAwesomeIcon icon={faLock} className="absolute left-4 top-4 text-gray-400" />
            <input 
              type="password" required placeholder="Password Security"
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-dark/50 border border-gray-600 text-white placeholder-gray-500 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
            />
          </div>
          <button 
            disabled={loading}
            type="submit" 
            className="w-full bg-primary hover:bg-primaryHover text-darker font-extrabold py-3 rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.4)] transition-all active:scale-95 flex justify-center items-center"
          >
            {loading ? 'Mengautentikasi...' : 'Akses Sistem'}
          </button>
        </form>
      </div>
    </div>
  );
}