import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut, BarChart3, Ticket, Zap, Settings, QrCode, Download,
  Plus, Trash2, Users, Calendar, Eye, EyeOff,
  Shield, ToggleLeft, ToggleRight, RefreshCw, CheckCircle,
  XCircle, DollarSign, MapPin, RefreshCcw, Copy, Check,
  User, Image as ImageIcon, MessageSquare, Sparkles, Home, Globe
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import * as api from '../services/api';
import { LANGUAGES, getTranslation } from '../utils/translations';

import ProfileEditor from '../components/owner/ProfileEditor';
import MediaManager from '../components/owner/MediaManager';
import ReviewManager from '../components/owner/ReviewManager';
import AnalyticsDashboard from '../components/owner/AnalyticsDashboard';
import AiCopilotTab from '../components/owner/AiCopilotTab';
import { useOwnerRealtime } from '../hooks/useOwnerRealtime';
import { QRCodeCanvas } from 'qrcode.react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const museumId   = localStorage.getItem('museumId');
  const museumName = localStorage.getItem('museumName');
  
  const { liveStats, liveTickets, connectionStatus } = useOwnerRealtime(museumId);

  /* Language state */
  const [lang, setLang] = useState(() => localStorage.getItem('admin_lang') || 'en');
  const t = getTranslation(lang);

  const handleLanguageChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem('admin_lang', newLang);
    toast.success(`Language: ${LANGUAGES.find(l => l.code === newLang)?.native || newLang}`);
  };

  const [activeTab, setActiveTab]   = useState(() => localStorage.getItem('admin_active_tab') || 'overview');

  useEffect(() => {
    localStorage.setItem('admin_active_tab', activeTab);
  }, [activeTab]);
  const [loading,   setLoading]     = useState(true);
  const [stats,     setStats]       = useState(null);
  const [analyticsRange, setAnalyticsRange] = useState('30d');
  const [tickets,   setTickets]     = useState([]);
  const [shows,     setShows]       = useState([]);
  const [museum,    setMuseum]      = useState(null);
  const [reviews,   setReviews]     = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [newShow,  setNewShow]  = useState({ name:'', showTime:'', price:'', seatLimit:'', description:'' });

  const [settingsForm,   setSettingsForm]   = useState({ adultPrice:'', childPrice:'', seatLimit:'', openingTime:'09:00', closingTime:'17:00' });
  const [savingSettings, setSavingSettings] = useState(false);
  const [bookingToggling,setBookingToggling]= useState(false);

  const [showPin,         setShowPin]         = useState(false);
  const [pinCopied,       setPinCopied]       = useState(false);
  const [regeneratingPin, setRegeneratingPin] = useState(false);

  const [searchTerm,      setSearchTerm]      = useState('');
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedTicket,  setSelectedTicket]  = useState(null);
  const [verifyCode,      setVerifyCode]      = useState('');
  const [entryCount,      setEntryCount]      = useState(1);
  const [showVerifyPin,   setShowVerifyPin]   = useState(false);

  useEffect(() => {
    if (!museumId) { navigate('/admin-login'); return; }
    fetchAll();
    const id = setInterval(() => fetchAll(true), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (museumId) {
      api.ownerAPI.getAnalytics(analyticsRange).then(r => setStats(r.data || r)).catch(() => {});
    }
  }, [analyticsRange]);

  const fetchAll = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [sR, tR, shR, mR] = await Promise.all([
        api.ownerAPI.getAnalytics(analyticsRange),
        api.ticketAPI.getMuseumTickets(museumId),
        api.showAPI.getMuseumShows(museumId),
        api.ownerAPI.getProfile(),
      ]);
      const s  = sR?.data  ?? sR;
      const t  = tR?.data  ?? tR  ?? [];
      const sh = shR?.data ?? shR ?? [];
      const m  = mR?.data  ?? mR;
      setStats(s);
      setTickets(Array.isArray(t)  ? t  : []);
      setShows(Array.isArray(sh) ? sh : []);
      setMuseum(m);
      
      // We can also fetch reviews here, or public reviews
      const revRes = await api.publicAPI.getMuseumReviews(m.slug || m.id, 0, 50);
      setReviews(revRes?.content || revRes?.data?.content || []);
      
      // Only set the settings form on initial load or explicit non-silent refreshes
      // This prevents the 30s background polling from erasing user input while they type
      if (!silent) {
        setSettingsForm({
          adultPrice:  m?.adultPrice  ?? m?.adultTicketPrice ?? '',
          childPrice:  m?.childPrice  ?? m?.childTicketPrice ?? '',
          seatLimit:   m?.seatLimit   ?? '',
          openingTime: m?.openingTime ?? '09:00',
          closingTime: m?.closingTime ?? '17:00',
        });
      }
    } catch (err) {
      if (err?.response?.status === 404) {
        toast.error('Museum not found. Please login again.');
        localStorage.clear(); navigate('/admin-login'); return;
      }
      if (!silent) toast.error('Failed to load data');
    } finally { setLoading(false); }
  };

  const handleLogout = () => { localStorage.clear(); toast.success('Logged out'); navigate('/'); };

  const handleToggleBooking = async () => {
    if (!museum) return;
    setBookingToggling(true);
    try {
      await api.museumAPI.updateBookingStatus(museumId, !museum.bookingStatus);
      toast.success(`Booking ${!museum.bookingStatus ? 'OPENED ✅' : 'CLOSED 🔴'}`);
      fetchAll(true);
    } catch { toast.error('Failed'); }
    finally { setBookingToggling(false); }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await api.museumAPI.update(museumId, {
        adultPrice:  parseFloat(settingsForm.adultPrice)  || 0,
        childPrice:  parseFloat(settingsForm.childPrice)  || 0,
        seatLimit:   parseInt(settingsForm.seatLimit)     || 100,
        openingTime: settingsForm.openingTime,
        closingTime: settingsForm.closingTime,
      });
      toast.success('Settings saved! Chatbot updated instantly ✅');
      fetchAll(true);
    } catch { toast.error('Failed to save settings'); }
    finally { setSavingSettings(false); }
  };

  const handleRegeneratePin = async () => {
    if (!window.confirm('Generate a NEW 4-digit staff code?\n\nThe old code will stop working immediately.\nMake sure to update all your staff.')) return;
    setRegeneratingPin(true);
    try {
      await api.museumAPI.regeneratePin(museumId);
      toast.success('New staff PIN generated! Share it with your staff ✅');
      setShowPin(true);
      fetchAll(true);
    } catch { toast.error('Failed to regenerate PIN'); }
    finally { setRegeneratingPin(false); }
  };

  const handleCopyPin = () => {
    if (!museum?.staffPin) return;
    navigator.clipboard.writeText(museum.staffPin).then(() => {
      setPinCopied(true); setTimeout(() => setPinCopied(false), 2000);
    });
  };

  const handleCreateShow = async (e) => {
    e.preventDefault();
    try {
      await api.showAPI.create(museumId, {
        showName: newShow.name, showTime: newShow.showTime,
        price: parseFloat(newShow.price), seatLimit: parseInt(newShow.seatLimit),
        description: newShow.description,
      });
      toast.success('Show created 🎭 — visible in chatbot now');
      setNewShow({ name:'', showTime:'', price:'', seatLimit:'', description:'' });
      setShowForm(false); fetchAll(true);
    } catch { toast.error('Failed to create show'); }
  };

  const handleDeleteShow = async (id) => {
    if (!window.confirm('Delete this show?')) return;
    try { await api.showAPI.delete(id); toast.success('Show deleted'); fetchAll(true); }
    catch { toast.error('Failed'); }
  };



  const openVerifyModal = (ticket) => {
    setSelectedTicket(ticket); 
    setVerifyCode(''); 
    setShowVerifyPin(false); 
    setEntryCount(ticket.remainingVisitors || ticket.totalVisitors || 1);
    setShowVerifyModal(true);
  };

  const handleVerifyTicket = async () => {
    if (!selectedTicket || verifyCode.length !== 4) return;
    try {
      await api.ticketAPI.verify({ 
        ticketId: selectedTicket.id, 
        verificationCode: verifyCode, 
        museumId,
        entryCount 
      });
      toast.success('Ticket verified! Entry granted ✅');
      setShowVerifyModal(false); setSelectedTicket(null); setVerifyCode('');
      fetchAll(true);
    } catch (err) { 
      toast.error(err?.message || err?.response?.data?.message || 'Invalid code. Check and retry.'); 
    }
  };

  const downloadQRCode = () => {
    const canvas = document.getElementById('museum-qr-code');
    if (!canvas) {
      toast.error('QR code not ready yet');
      return;
    }
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${museum?.museumName || museumName || 'museum'}-qr.png`;
    a.click();
  };

  /* ── UI HELPERS ── */
  const StatCard = ({ icon: Icon, label, value, color = 'indigo' }) => {
    const c = {
      indigo: { bg:'bg-indigo-50', ic:'text-indigo-600', val:'text-indigo-700' },
      green:  { bg:'bg-green-50',  ic:'text-green-600',  val:'text-green-700'  },
      blue:   { bg:'bg-blue-50',   ic:'text-blue-600',   val:'text-blue-700'   },
      purple: { bg:'bg-purple-50', ic:'text-purple-600', val:'text-purple-700' },
    }[color];
    return (
      <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 hover:shadow-xl transition-all group">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium">{label}</p>
            <p className={`text-4xl font-black ${c.val} mt-2 group-hover:scale-105 transition-transform origin-left`}>{value}</p>
          </div>
          <div className={`${c.bg} p-3 rounded-xl`}><Icon className={`h-6 w-6 ${c.ic}`} /></div>
        </div>
      </div>
    );
  };

  const TabBtn = ({ id, label, icon: Icon }) => (
    <button onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 py-3.5 px-5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
        activeTab === id ? 'border-indigo-600 text-indigo-700 bg-indigo-50/70' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
      }`}>
      <Icon className="h-4 w-4" />{label}
    </button>
  );

  const StatusBadge = ({ status }) => {
    const m = {
      ACTIVE:    'bg-emerald-100 text-emerald-800 border-emerald-200',
      USED:      'bg-gray-100 text-gray-600 border-gray-200',
      PENDING:   'bg-amber-100 text-amber-800 border-amber-200',
      CANCELLED: 'bg-red-100 text-red-700 border-red-200',
    };
    return <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${m[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>{status}</span>;
  };
  const filteredTickets = tickets.filter(t => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (t.ticketNumber && t.ticketNumber.toLowerCase().includes(term)) ||
           (t.userEmail && t.userEmail.toLowerCase().includes(term));
  });

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-500 font-semibold">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ══════ HEADER ══════ */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 text-white sticky top-0 z-30 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center gap-4">

          {/* Left: museum name + location */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-white/20 p-2.5 rounded-xl hidden sm:flex flex-shrink-0">
              <QrCode className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-extrabold leading-tight truncate">
                {museum?.museumName || museumName || '—'}
              </h1>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="h-3.5 w-3.5 text-indigo-300 flex-shrink-0" />
                <span className="text-indigo-200 text-xs sm:text-sm truncate">
                  {museum?.location || 'Location not set'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Language Switcher Dropdown */}
            <div className="relative">
              <select
                value={lang}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold py-1.5 pl-2.5 pr-7 rounded-lg border border-white/30 outline-none cursor-pointer backdrop-blur-sm transition-all appearance-none"
                title="Change Language">
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code} className="text-gray-900 bg-white">
                    {l.flag} {l.native}
                  </option>
                ))}
              </select>
              <Globe className="h-3.5 w-3.5 text-white/80 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button onClick={() => fetchAll(true)} title="Refresh"
              className="bg-white/15 hover:bg-white/25 p-2 rounded-lg transition-all">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button onClick={handleToggleBooking} disabled={bookingToggling}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                museum?.bookingStatus ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'
              }`}>
              {museum?.bookingStatus ? <><ToggleRight className="h-4 w-4" />OPEN</> : <><ToggleLeft className="h-4 w-4" />CLOSED</>}
            </button>
            <button onClick={() => navigate('/')}
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-3 py-2 rounded-lg text-xs font-semibold transition-all">
              <Home className="h-4 w-4" /> <span className="hidden sm:inline">{t.home || 'Home'}</span>
            </button>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-3 py-2 rounded-lg text-xs font-semibold transition-all">
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">{t.logout || 'Logout'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ══════ TABS ══════ */}
      <div className="bg-white border-b border-gray-200 sticky top-[68px] z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex overflow-x-auto">
          <TabBtn id="overview" label={t.overview || "Overview"}  icon={BarChart3} />
          <TabBtn id="ai-copilot" label={t.aiCopilot || "AI Copilot"} icon={Sparkles} />
          <TabBtn id="tickets"  label={t.tickets || "Tickets"}   icon={Ticket}    />
          <TabBtn id="shows"    label={t.shows || "Shows"}     icon={Zap}       />
          <TabBtn id="profile"  label={t.profile || "Profile"}   icon={User}      />
          <TabBtn id="media"    label={t.media || "Media"}     icon={ImageIcon} />
          <TabBtn id="reviews"  label={t.reviews || "Reviews"}   icon={MessageSquare} />
          <TabBtn id="qr"       label={t.qrCode || "QR Code"}   icon={QrCode}    />
          <TabBtn id="settings" label={t.settings || "Settings"}  icon={Settings}  />
        </div>
      </div>

      {/* ══════ CONTENT ══════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {activeTab === 'overview' && (
          <div className="space-y-8">
            <AnalyticsDashboard 
              analyticsData={stats} 
              liveStats={liveStats} 
              loading={loading}
              range={analyticsRange}
              setRange={setAnalyticsRange}
              connectionStatus={connectionStatus}
            />

            {/* Recent/Live tickets */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-base font-bold text-gray-900 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse"></span>
                  Live Ticket Feed
                </h3>
                <button onClick={() => setActiveTab('tickets')} className="text-xs text-indigo-600 hover:underline font-semibold">View All →</button>
              </div>
              
              {liveTickets.length === 0 && tickets.length === 0 ? (
                <div className="text-center py-14"><Ticket className="h-10 w-10 mx-auto mb-2 text-gray-200" /><p className="text-gray-500 font-semibold">No tickets yet</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {['Ticket #','Email','Amount','Status','Time'].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {/* Combine live tickets and historical tickets, avoiding duplicates */}
                      {Array.from(new Map([...liveTickets, ...tickets.slice(0,5)].map(item => [item.id, item])).values())
                        .slice(0, 10)
                        .map(t => (
                        <tr key={t.id} className={`hover:bg-gray-50/60 transition-colors ${liveTickets.find(lt => lt.id === t.id) ? 'bg-indigo-50/20' : ''}`}>
                          <td className="px-5 py-4 font-mono text-sm font-bold text-indigo-600">{t.ticketNumber}</td>
                          <td className="px-5 py-4 text-sm text-gray-600 max-w-[180px] truncate">{t.userEmail}</td>
                          <td className="px-5 py-4 text-sm font-black text-gray-900">₹{t.totalPrice}</td>
                          <td className="px-5 py-4"><StatusBadge status={t.status} /></td>
                          <td className="px-5 py-4 text-sm text-gray-500">
                            {t.createdAt ? format(new Date(t.createdAt),'HH:mm (dd MMM)') : 'Just now'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── AI COPILOT ─── */}
        {activeTab === 'ai-copilot' && (
          <AiCopilotTab 
            museum={museum} 
            stats={stats} 
            liveStats={liveStats}
            tickets={tickets} 
            reviews={reviews} 
            onSettingsUpdated={() => fetchAll(false)} 
          />
        )}

        {/* ─── TICKETS ─── */}
        {activeTab === 'tickets' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-extrabold text-gray-900">Ticket Verification</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-md p-6 border border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Search by Ticket # or Email</p>
                <input type="text" placeholder="Enter ticket number or email..." value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none text-sm" />
              </div>
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl shadow-md p-6 flex flex-col justify-center">
                <p className="text-xs font-bold text-indigo-500 uppercase mb-1">Found</p>
                <p className="text-5xl font-black text-indigo-700">{filteredTickets.length}</p>
                <p className="text-sm text-indigo-400">ticket{filteredTickets.length !== 1 ? 's':''}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              {filteredTickets.length === 0 ? (
                <div className="text-center py-16">
                  <Ticket className="h-12 w-12 mx-auto mb-3 text-gray-200" />
                  <p className="font-semibold text-gray-500">No tickets found</p>
                  <p className="text-sm text-gray-400 mt-1">{searchTerm ? 'Try a different search term' : 'Enter details to search'}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {['Ticket #','Email','Visitors','Amount','Status','Date','Action'].map(h => (
                          <th key={h} className="px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredTickets.map(t => (
                        <tr key={t.id} className="hover:bg-indigo-50/30 transition-colors">
                          <td className="px-4 py-4 font-mono text-sm font-bold text-indigo-600 whitespace-nowrap">{t.ticketNumber}</td>
                          <td className="px-4 py-4 text-sm text-gray-600 max-w-[160px] truncate">{t.userEmail}</td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">{t.adults}A</span>{' '}
                            <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full text-xs font-bold">{t.children}C</span>
                          </td>
                          <td className="px-4 py-4 text-sm font-black text-gray-900 whitespace-nowrap">₹{t.totalPrice}</td>
                          <td className="px-4 py-4"><StatusBadge status={t.status} /></td>
                          <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">{format(new Date(t.createdAt),'dd MMM yy')}</td>
                          <td className="px-4 py-4">
                            <button onClick={() => openVerifyModal(t)}
                              disabled={t.status==='USED'||t.status==='CANCELLED'||t.status==='EXPIRED'}
                              className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                                t.status==='USED'||t.status==='CANCELLED'||t.status==='EXPIRED'
                                  ? 'text-gray-300 bg-gray-50 cursor-not-allowed'
                                  : 'text-white bg-indigo-600 hover:bg-indigo-700'
                              }`}>
                              <Eye className="h-3.5 w-3.5" /> Verify
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── SHOWS ─── */}
        {activeTab === 'shows' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-extrabold text-gray-900">Special Shows</h2>
              <button onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md">
                <Plus className="h-4 w-4" /> Add Show
              </button>
            </div>
            {showForm && (
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-5">Create New Show</h3>
                <form onSubmit={handleCreateShow} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Show Name *" required value={newShow.name}
                      onChange={e => setNewShow({...newShow, name: e.target.value})}
                      className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 outline-none text-sm" />
                    <input type="datetime-local" required value={newShow.showTime}
                      onChange={e => setNewShow({...newShow, showTime: e.target.value})}
                      className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 outline-none text-sm" />
                    <input type="number" placeholder="Price ₹ *" required value={newShow.price}
                      onChange={e => setNewShow({...newShow, price: e.target.value})}
                      className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 outline-none text-sm" />
                    <input type="number" placeholder="Seat Limit *" required value={newShow.seatLimit}
                      onChange={e => setNewShow({...newShow, seatLimit: e.target.value})}
                      className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 outline-none text-sm" />
                  </div>
                  <textarea placeholder="Description (optional)" rows={2} value={newShow.description}
                    onChange={e => setNewShow({...newShow, description: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 outline-none text-sm resize-none" />
                  <div className="flex gap-3">
                    <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-sm">Create Show</button>
                    <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold text-sm">Cancel</button>
                  </div>
                </form>
              </div>
            )}
            {shows.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl shadow-md border border-gray-100">
                <Zap className="h-12 w-12 mx-auto mb-3 text-gray-200" />
                <p className="font-bold text-gray-500">No shows scheduled</p>
                <p className="text-sm text-gray-400 mt-1">Add a show — it appears in the chatbot instantly</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {shows.map(show => (
                  <div key={show.id} className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
                    <div className="p-5">
                      <h3 className="font-extrabold text-gray-900 mb-3">{show.showName || show.name}</h3>
                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        <p className="flex items-center gap-2"><Calendar className="h-4 w-4 text-indigo-400 flex-shrink-0" />{format(new Date(show.showTime),'dd MMM yyyy, HH:mm')}</p>
                        <p className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-green-500 flex-shrink-0" /><span className="font-extrabold text-green-700 text-base">₹{show.price}</span><span className="text-gray-400 text-xs">/ ticket</span></p>
                        <p className="flex items-center gap-2"><Users className="h-4 w-4 text-blue-400 flex-shrink-0" />{show.availableSeats ?? show.seatLimit} / {show.seatLimit} seats</p>
                      </div>
                      {show.description && <p className="text-xs text-gray-400 mb-4 line-clamp-2">{show.description}</p>}
                      <button onClick={() => handleDeleteShow(show.id)} className="w-full flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-lg text-sm font-bold">
                        <Trash2 className="h-4 w-4" /> Delete Show
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── QR CODE ─── */}
        {activeTab === 'qr' && (
          <div className="max-w-lg mx-auto">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-8 text-center">Museum QR Code</h2>
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 space-y-6">
              <div className="flex justify-center bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6">
                <div className="p-4 bg-white rounded-xl shadow-lg border-4 border-white">
                  <QRCodeCanvas 
                    id="museum-qr-code"
                    value={`${window.location.origin}/museum/${museumId}`} 
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                <p className="text-sm font-bold text-indigo-800 mb-1">📱 When scanned, this QR opens:</p>
                <code className="text-xs text-indigo-700 bg-white px-3 py-1.5 rounded-lg border border-indigo-100 block font-mono break-all">
                  {window.location.origin}/museum/{museumId}
                </code>
                <p className="text-xs text-indigo-600 mt-2">→ Opens the booking chatbot directly for your museum</p>
              </div>
              <p className="text-center text-gray-500 text-sm">
                Print this and display it at your museum entrance. Visitors scan → book instantly on their phones.
              </p>
              <button onClick={downloadQRCode}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-extrabold transition-all shadow-md">
                <Download className="h-5 w-5" /> Download QR Code
              </button>
            </div>
          </div>
        )}

        {/* ─── SETTINGS ─── */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-6">
            <h2 className="text-2xl font-extrabold text-gray-900">Settings</h2>

            {/* STAFF PIN */}
            <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-white/20 p-2.5 rounded-xl"><Shield className="h-5 w-5" /></div>
                <div>
                  <h3 className="font-extrabold text-lg">Museum Staff Code</h3>
                  <p className="text-indigo-200 text-xs">Permanent 4-digit entry validation PIN</p>
                </div>
              </div>
              <p className="text-indigo-200 text-sm mb-5 leading-relaxed">
                Staff show this to the visitor at the gate. Visitor enters it in their ticket to mark it <strong>USED</strong>. Do not share publicly.
              </p>

              {/* PIN digits */}
              <div className="bg-black/20 rounded-xl p-4 mb-4">
                <p className="text-xs text-indigo-300 font-bold uppercase tracking-widest mb-3">STAFF ENTRY CODE</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 sm:gap-3">
                    {(showPin ? (museum?.staffPin || '????') : '••••').split('').map((ch, i) => (
                      <div key={i} className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-xl flex items-center justify-center text-2xl sm:text-3xl font-black border-2 border-white/30">
                        {ch}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2 ml-3">
                    <button onClick={() => setShowPin(p=>!p)} title={showPin?'Hide':'Show'}
                      className="bg-white/20 hover:bg-white/30 p-2.5 rounded-lg transition-all">
                      {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button onClick={handleCopyPin} title="Copy code"
                      className="bg-white/20 hover:bg-white/30 p-2.5 rounded-lg transition-all">
                      {pinCopied ? <Check className="h-4 w-4 text-green-300" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Regenerate */}
              <button onClick={handleRegeneratePin} disabled={regeneratingPin}
                className="w-full flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 disabled:opacity-40 text-white py-3 rounded-xl font-bold text-sm border border-white/20 transition-all">
                <RefreshCcw className={`h-4 w-4 ${regeneratingPin ? 'animate-spin' : ''}`} />
                {regeneratingPin ? 'Generating new code…' : '🔄 Generate New Code'}
              </button>
              <p className="text-xs text-indigo-300 text-center mt-2">
                ⚠️ Old code stops working immediately. Inform all staff before generating a new one.
              </p>
            </div>

            {/* PRICES & CAPACITY */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <h3 className="font-extrabold text-gray-900 mb-5 flex items-center gap-2">
                <Settings className="h-5 w-5 text-indigo-500" /> Ticket Prices & Capacity
              </h3>
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Adult Price (₹)</label>
                      <input type="number" min="0" value={settingsForm.adultPrice}
                        onChange={e => setSettingsForm(p=>({...p,adultPrice:e.target.value}))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none text-2xl font-black text-indigo-700" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Child Price (₹)</label>
                      <input type="number" min="0" value={settingsForm.childPrice}
                        onChange={e => setSettingsForm(p=>({...p,childPrice:e.target.value}))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none text-2xl font-black text-purple-700" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Daily Seat Limit</label>
                      <input type="number" min="1" value={settingsForm.seatLimit}
                        onChange={e => setSettingsForm(p=>({...p,seatLimit:e.target.value}))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none text-2xl font-black text-gray-700" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Open Time</label>
                      <input type="time" value={settingsForm.openingTime}
                        onChange={e => setSettingsForm(p=>({...p,openingTime:e.target.value}))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 outline-none text-lg font-bold text-gray-700" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Close Time</label>
                      <input type="time" value={settingsForm.closingTime}
                        onChange={e => setSettingsForm(p=>({...p,closingTime:e.target.value}))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 outline-none text-lg font-bold text-gray-700" />
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={savingSettings}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white py-3.5 rounded-xl font-extrabold text-sm transition-all shadow-md">
                  {savingSettings ? 'Saving…' : '✅ Save Settings'}
                </button>
              </form>
            </div>

            {/* BOOKING CONTROL */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <h3 className="font-extrabold text-gray-900 mb-4">Booking Control</h3>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-800">Booking Status</p>
                  <p className="text-sm text-gray-500 mt-0.5">Toggle to open or close bookings for all visitors</p>
                </div>
                <button onClick={handleToggleBooking} disabled={bookingToggling}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-extrabold text-sm transition-all shadow-md whitespace-nowrap ${
                    museum?.bookingStatus ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}>
                  {museum?.bookingStatus
                    ? <><ToggleRight className="h-5 w-5" /> OPEN — Click to Close</>
                    : <><ToggleLeft  className="h-5 w-5" /> CLOSED — Click to Open</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── PROFILE ─── */}
        {activeTab === 'profile' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <ProfileEditor profile={museum} onUpdate={() => fetchAll(true)} />
          </div>
        )}

        {/* ─── MEDIA ─── */}
        {activeTab === 'media' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <MediaManager images={museum?.images || museum?.galleryImages || []} onUpdate={() => fetchAll(true)} />
          </div>
        )}

        {/* ─── REVIEWS ─── */}
        {activeTab === 'reviews' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <ReviewManager reviews={reviews} onUpdate={() => fetchAll(true)} />
          </div>
        )}
      </div>

      {/* ══════ VERIFY MODAL ══════ */}
      {showVerifyModal && selectedTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
              <h2 className="text-xl font-extrabold">Verify Ticket</h2>
              <p className="text-indigo-200 text-sm mt-1">Enter 4-digit staff code to grant entry</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="font-extrabold text-gray-900 font-mono">{selectedTicket.ticketNumber}</p>
                <p className="text-sm text-gray-600 mt-0.5">{selectedTicket.userEmail}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">{selectedTicket.adults} Adult</span>
                  <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full text-xs font-bold">{selectedTicket.children} Child</span>
                  <span className="ml-auto font-black text-gray-900">₹{selectedTicket.totalPrice}</span>
                </div>
                {selectedTicket.totalVisitors > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 font-bold uppercase mb-1">Entry Status</p>
                    <p className="text-sm font-medium text-gray-800">
                      <span className="text-indigo-600 font-bold">{selectedTicket.admittedVisitors || 0}</span> admitted / <span className="font-bold">{selectedTicket.totalVisitors}</span> total
                    </p>
                  </div>
                )}
              </div>

              {/* Partial Entry Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Number of Visitors Entering Now</label>
                <input type="number" 
                  min="1" 
                  max={selectedTicket.remainingVisitors || selectedTicket.totalVisitors}
                  value={entryCount}
                  onChange={e => setEntryCount(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none font-bold text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">4-Digit Staff Code</label>
                <div className="relative">
                  <input type={showVerifyPin?'text':'password'} maxLength={4}
                    value={verifyCode}
                    onChange={e => setVerifyCode(e.target.value.replace(/\D/g,''))}
                    className="w-full px-4 py-5 border-2 border-indigo-300 rounded-xl text-center text-4xl font-black tracking-[0.6em] focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-none font-mono"
                    placeholder="0000" autoFocus
                  />
                  <button onClick={() => setShowVerifyPin(p=>!p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showVerifyPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleVerifyTicket} disabled={verifyCode.length!==4}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white py-3.5 rounded-xl font-extrabold transition-all">
                  ✅ Grant Entry
                </button>
                <button onClick={() => { setShowVerifyModal(false); setSelectedTicket(null); setVerifyCode(''); }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3.5 rounded-xl font-extrabold transition-all">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
