import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Building2, Home, LogIn, UserPlus, LogOut, LayoutDashboard, Menu, X,
  Ticket, Settings, User, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useVisitorAuth } from '../context/VisitorAuthContext';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { visitor, isAuthenticated: visitorLoggedIn, logout: visitorLogout } = useVisitorAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [visitorDropdownOpen, setVisitorDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const adminToken = localStorage.getItem('token');
  const userType = localStorage.getItem('userType');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setVisitorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Hide navbar on chatbot, museum detail, and admin-dashboard pages
  const hideNavbar =
    location.pathname.startsWith('/chatbot') ||
    location.pathname.startsWith('/museum/') ||
    location.pathname.startsWith('/admin-dashboard') ||
    location.pathname.startsWith('/visitor/login') ||
    location.pathname.startsWith('/visitor/register');

  if (hideNavbar) return null;

  const handleAdminLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    localStorage.removeItem('museumId');
    localStorage.removeItem('museumName');
    toast.success('Admin logged out');
    navigate('/');
  };

  const handleVisitorLogout = () => {
    visitorLogout();
    setVisitorDropdownOpen(false);
    toast.success('Signed out');
    navigate('/');
  };

  const navLinks = [
    { to: '/', label: 'Home', icon: Home },
    ...(adminToken && userType === 'MUSEUM'
      ? [{ to: '/admin-dashboard', label: 'Dashboard', icon: LayoutDashboard }]
      : []
    ),
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-white/80 backdrop-blur-sm'
      }`}>
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2 rounded-xl">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="font-extrabold text-gray-900 text-lg tracking-tight">
              Museum<span className="text-indigo-600">QR</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link key={link.to} to={link.to}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${location.pathname === link.to
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}>
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}

            {/* Visitor Auth Section */}
            {visitorLoggedIn ? (
              <div className="relative ml-2" ref={dropdownRef}>
                <button
                  onClick={() => setVisitorDropdownOpen(!visitorDropdownOpen)}
                  className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-2 rounded-xl text-sm font-semibold transition-all border border-indigo-200"
                >
                  {visitor?.avatarUrl ? (
                    <img src={visitor.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
                      {(visitor?.name || 'V').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="max-w-[100px] truncate">{visitor?.name || 'Account'}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${visitorDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {visitorDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-1">
                    <div className="px-4 py-2 border-b border-gray-100 mb-1">
                      <p className="text-sm font-bold text-gray-900 truncate">{visitor?.name}</p>
                      <p className="text-xs text-gray-500 truncate">{visitor?.email}</p>
                    </div>
                    <Link to="/visitor/tickets" onClick={() => setVisitorDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                      <Ticket className="h-4 w-4" /> My Tickets
                    </Link>
                    <Link to="/visitor/cancellation" onClick={() => setVisitorDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                      <X className="h-4 w-4" /> Cancel / Reschedule
                    </Link>
                    <Link to="/visitor/settings" onClick={() => setVisitorDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                      <Settings className="h-4 w-4" /> Settings
                    </Link>
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button onClick={handleVisitorLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                        <LogOut className="h-4 w-4" /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login"
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-md ml-2">
                <User className="h-4 w-4" />
                Login
              </Link>
            )}



            {adminToken && (
              <button onClick={handleAdminLogout}
                className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold transition-all ml-1">
                <LogOut className="h-4 w-4" />
                Admin Logout
              </button>
            )}
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[500px] mt-4' : 'max-h-0'}`}>
          <div className="bg-white rounded-2xl shadow-lg p-4 space-y-1 border border-gray-100">
            {navLinks.map(link => (
              <Link key={link.to} to={link.to} onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${location.pathname === link.to
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-50'
                  }`}>
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}

            {visitorLoggedIn ? (
              <>
                <div className="border-t border-gray-100 my-2 pt-2">
                  <p className="px-4 py-1 text-xs text-gray-400 font-medium uppercase">Visitor Account</p>
                </div>
                <Link to="/visitor/tickets" onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-700 hover:bg-gray-50">
                  <Ticket className="h-4 w-4" /> My Tickets
                </Link>
                <Link to="/visitor/cancellation" onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-700 hover:bg-gray-50">
                  <X className="h-4 w-4" /> Cancel / Reschedule
                </Link>
                <Link to="/visitor/settings" onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-700 hover:bg-gray-50">
                  <Settings className="h-4 w-4" /> Settings
                </Link>
                <button onClick={() => { handleVisitorLogout(); setIsOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition-all">
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </>
            ) : (
              <Link to="/login" onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all">
                <User className="h-4 w-4" /> Login
              </Link>
            )}


          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
