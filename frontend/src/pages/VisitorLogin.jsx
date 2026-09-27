import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Building2, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useVisitorAuth } from '../context/VisitorAuthContext';

const VisitorLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, googleAuth } = useVisitorAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const from = location.state?.from || '/visitor/tickets';

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill all fields'); return; }
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
        callback: async (response) => {
          setLoading(true);
          try {
            await googleAuth(response.credential);
            toast.success('Signed in with Google!');
            navigate(from, { replace: true });
          } catch (err) {
            toast.error(err?.message || 'Google sign-in failed');
          } finally {
            setLoading(false);
          }
        },
      });
      window.google.accounts.id.renderButton(
        document.getElementById("google-signin-button"),
        { theme: "outline", size: "large", shape: "rectangular", width: "100%" }
      );
    }
  }, [googleAuth, navigate, from]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 flex items-center justify-center px-4 py-12">
      {/* Decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-2xl shadow-lg">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-extrabold text-white tracking-tight">
              Museum<span className="text-indigo-400">QR</span>
            </span>
          </Link>
          <p className="text-indigo-200/70 text-sm mt-3">Sign in to manage your tickets</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-white text-center mb-6">Visitor Sign In</h2>

          {/* Google Sign-In Container */}
          <div className="flex justify-center mb-5">
            <div id="google-signin-button"></div>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/20" />
            <span className="text-white/50 text-xs font-medium">OR</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                autoComplete="email"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full pl-10 pr-10 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-white/50 text-xs mt-5">
            Don't have an account?{' '}
            <Link to="/visitor/register" state={{ from }} className="text-indigo-400 hover:text-indigo-300 font-semibold">
              Create one
            </Link>
          </p>
        </div>

        <p className="text-center text-white/30 text-xs mt-4">
          <Link to="/admin-login" className="hover:text-white/50">Museum Admin? Log in here</Link>
        </p>
      </div>
    </div>
  );
};

export default VisitorLogin;
