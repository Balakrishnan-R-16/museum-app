import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Building2, User, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useVisitorAuth } from '../context/VisitorAuthContext';
import * as api from '../services/api';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login: visitorLogin, googleAuth: visitorGoogleAuth } = useVisitorAuth();
  
  // 'visitor' or 'admin'
  const [role, setRole] = useState('visitor'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initialize from location state if we were redirected
  const fromVisitor = location.state?.from || '/visitor/tickets';
  const fromAdmin = '/admin-dashboard';

  useEffect(() => {
    // Check if URL suggests admin login
    if (location.pathname === '/admin-login') {
      setRole('admin');
    }
  }, [location]);

  useEffect(() => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
        callback: async (response) => {
          setLoading(true);
          try {
            if (role === 'visitor') {
              await visitorGoogleAuth(response.credential);
              toast.success('Signed in with Google!');
              navigate(fromVisitor, { replace: true });
            } else {
              const res = await api.museumAPI.googleLogin(response.credential);
              const data = res?.data ?? res;
              
              localStorage.setItem('token',      data.token);
              localStorage.setItem('userType',   'MUSEUM');
              localStorage.setItem('museumId',   data.museumId);
              localStorage.setItem('museumName', data.museumName);
              
              toast.success('Signed in with Google! 🎉');
              navigate(fromAdmin, { replace: true });
            }
          } catch (err) {
            toast.error(err?.message || 'Google sign-in failed');
          } finally {
            setLoading(false);
          }
        },
      });
      window.google.accounts.id.renderButton(
        document.getElementById("unified-google-btn"),
        { theme: "outline", size: "large", shape: "pill", width: "100%" }
      );
    }
  }, [role, visitorGoogleAuth, navigate, fromVisitor, fromAdmin]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill all fields'); return; }
    
    setLoading(true);
    try {
      if (role === 'visitor') {
        await visitorLogin(email, password);
        toast.success('Welcome back!');
        navigate(fromVisitor, { replace: true });
      } else {
        const res = await api.museumAPI.login({ email, password });
        const data = res?.data ?? res;

        localStorage.setItem('token',      data.token);
        localStorage.setItem('userType',   'MUSEUM');
        localStorage.setItem('museumId',   data.museumId);
        localStorage.setItem('museumName', data.museumName);

        toast.success('Welcome back! 🎉');
        navigate(fromAdmin, { replace: true });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err?.message || 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const isVisitor = role === 'visitor';

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 py-12 transition-colors duration-700 ${isVisitor ? 'bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950' : 'bg-gradient-to-br from-indigo-50 via-white to-purple-50'}`}>
      
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none transition-opacity duration-700">
        <div className={`absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl transition-colors duration-700 ${isVisitor ? 'bg-purple-600/20' : 'bg-indigo-300/30'}`} />
        <div className={`absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl transition-colors duration-700 ${isVisitor ? 'bg-indigo-600/20' : 'bg-purple-300/30'}`} />
      </div>

      <div className="relative w-full max-w-md mt-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className={`p-3 rounded-2xl shadow-lg transition-colors duration-700 ${isVisitor ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-br from-indigo-100 to-purple-100'}`}>
              <Building2 className={`h-6 w-6 ${isVisitor ? 'text-white' : 'text-indigo-600'}`} />
            </div>
            <span className={`text-2xl font-extrabold tracking-tight transition-colors duration-700 ${isVisitor ? 'text-white' : 'text-gray-900'}`}>
              Museum<span className="text-indigo-500">QR</span>
            </span>
          </Link>
          <p className={`text-sm mt-3 transition-colors duration-700 ${isVisitor ? 'text-indigo-200/70' : 'text-gray-500'}`}>
            {isVisitor ? 'Sign in to manage your tickets' : 'Manage your museum and tickets'}
          </p>
        </div>

        {/* Card */}
        <div className={`backdrop-blur-xl border rounded-3xl p-8 shadow-2xl transition-all duration-700 ${isVisitor ? 'bg-white/10 border-white/20' : 'bg-white/80 border-white shadow-indigo-100/50'}`}>
          
          {/* Role Toggle */}
          <div className={`flex p-1 mb-8 rounded-xl transition-colors duration-700 ${isVisitor ? 'bg-black/20' : 'bg-gray-100'}`}>
            <button
              type="button"
              onClick={() => { setRole('visitor'); setEmail(''); setPassword(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${isVisitor ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <User className="h-4 w-4" />
              Visitor
            </button>
            <button
              type="button"
              onClick={() => { setRole('admin'); setEmail(''); setPassword(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${!isVisitor ? 'bg-white text-indigo-600 shadow-md' : 'text-white/50 hover:text-white'}`}
            >
              <ShieldCheck className="h-4 w-4" />
              Admin
            </button>
          </div>

          <h2 className={`text-xl font-bold text-center mb-6 transition-colors duration-700 ${isVisitor ? 'text-white' : 'text-gray-900'}`}>
            {isVisitor ? 'Visitor Login' : 'Museum Admin Login'}
          </h2>

          {/* Google Sign-In Container */}
          <div className="flex justify-center mb-5 min-h-[44px]">
            <div id="unified-google-btn"></div>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className={`flex-1 h-px transition-colors duration-700 ${isVisitor ? 'bg-white/20' : 'bg-gray-200'}`} />
            <span className={`text-xs font-medium transition-colors duration-700 ${isVisitor ? 'text-white/50' : 'text-gray-400'}`}>OR</span>
            <div className={`flex-1 h-px transition-colors duration-700 ${isVisitor ? 'bg-white/20' : 'bg-gray-200'}`} />
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative group">
              <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors duration-300 ${isVisitor ? 'text-white/40 group-focus-within:text-indigo-400' : 'text-gray-400 group-focus-within:text-indigo-600'}`} />
              <input
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-all duration-300 ${isVisitor ? 'bg-white/10 border border-white/20 text-white placeholder-white/40 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none' : 'bg-gray-50 border border-gray-200 text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none'}`}
              />
            </div>

            <div className="relative group">
              <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors duration-300 ${isVisitor ? 'text-white/40 group-focus-within:text-indigo-400' : 'text-gray-400 group-focus-within:text-indigo-600'}`} />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                required
                className={`w-full pl-10 pr-10 py-3 rounded-xl text-sm transition-all duration-300 ${isVisitor ? 'bg-white/10 border border-white/20 text-white placeholder-white/40 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none' : 'bg-gray-50 border border-gray-200 text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none'}`}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-300 ${isVisitor ? 'text-white/40 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-xl text-white text-sm font-semibold transition-all duration-300 shadow-md ${isVisitor ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-500/25 disabled:bg-indigo-600/50' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-lg disabled:opacity-70'}`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Logging in...
                </span>
              ) : 'Login'}
            </button>
          </form>

          {/* Footer Link */}
          <div className="mt-8 text-center">
            <p className={`text-sm ${isVisitor ? 'text-white/60' : 'text-gray-600'}`}>
              Don't have an account?{' '}
              {isVisitor ? (
                <Link to="/visitor/register" className={`font-semibold transition-colors ${isVisitor ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}>
                  Create one
                </Link>
              ) : (
                <Link to="/register-museum" className={`font-semibold transition-colors ${isVisitor ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}>
                  Register your museum
                </Link>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
