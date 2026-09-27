import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowRight, Loader, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import * as api from '../services/api';
import { useEffect } from 'react';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [loading,      setLoading]      = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData,     setFormData]     = useState({ email: '', password: '' });
  const [errors,       setErrors]       = useState({});

  const validate = () => {
    const e = {};
    if (!formData.email.trim())                       e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email))   e.email    = 'Enter a valid email';
    if (!formData.password)                           e.password = 'Password is required';
    else if (formData.password.length < 6)            e.password = 'At least 6 characters';
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    try {
      setLoading(true);
      const res = await api.museumAPI.login(formData);
      const data = res?.data ?? res;

      localStorage.setItem('token',      data.token);
      localStorage.setItem('userType',   'MUSEUM');
      localStorage.setItem('museumId',   data.museumId);
      localStorage.setItem('museumName', data.museumName);

      toast.success('Welcome back! 🎉');
      navigate('/admin-dashboard');
    } catch (err) {
      // error toast already shown
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
        callback: async (response) => {
          setLoading(true);
          try {
            const res = await api.museumAPI.googleLogin(response.credential);
            const data = res?.data ?? res;
            
            localStorage.setItem('token',      data.token);
            localStorage.setItem('userType',   'MUSEUM');
            localStorage.setItem('museumId',   data.museumId);
            localStorage.setItem('museumName', data.museumName);
            
            toast.success('Signed in with Google! 🎉');
            navigate('/admin-dashboard');
          } catch (err) {
            // error toast already shown
          } finally {
            setLoading(false);
          }
        },
      });
      window.google.accounts.id.renderButton(
        document.getElementById("google-admin-login-button"),
        { theme: "outline", size: "large", shape: "rectangular", width: "100%", text: "continue_with" }
      );
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4 py-12 pt-24">
      {/* Blobs */}
      <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-200 rounded-full blur-3xl opacity-20" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-purple-200 rounded-full blur-3xl opacity-20" />
      </div>

      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
          {/* Top bar */}
          <div className="h-1.5 bg-gradient-to-r from-indigo-600 to-purple-600" />

          <div className="p-8">
            {/* Title */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl mb-4">
                <Building2 className="h-8 w-8 text-indigo-600" />
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900">Museum Admin Login</h1>
              <p className="text-gray-500 text-sm mt-1">Manage your museum and tickets</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-gray-400" />
                  <input
                    type="email" name="email" value={formData.email}
                    onChange={handleChange} disabled={loading}
                    placeholder="admin@museum.com"
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl outline-none transition-all text-sm ${
                      errors.email
                        ? 'border-red-400 focus:border-red-500 bg-red-50'
                        : 'border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'
                    }`}
                  />
                </div>
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password" value={formData.password}
                    onChange={handleChange} disabled={loading}
                    placeholder="Enter your password"
                    className={`w-full pl-10 pr-12 py-3 border-2 rounded-xl outline-none transition-all text-sm ${
                      errors.password
                        ? 'border-red-400 focus:border-red-500 bg-red-50'
                        : 'border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'
                    }`}
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600 transition-colors">
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>

              {/* Submit */}
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white py-3.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg mt-2">
                {loading
                  ? <><Loader className="h-4 w-4 animate-spin" /> Signing in…</>
                  : <><span>Sign In</span><ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-white text-xs text-gray-400">OR</span>
              </div>
            </div>
            
            <div className="flex justify-center mb-6">
              <div id="google-admin-login-button"></div>
            </div>

            <div className="text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/register-museum" className="text-indigo-600 hover:text-indigo-700 font-semibold">
                Register your museum
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
