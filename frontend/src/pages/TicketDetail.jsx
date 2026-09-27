import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Ticket, ArrowLeft, Download, Share2, Calendar, Clock, Users,
  Building2, CheckCircle, AlertTriangle, XCircle, Loader2,
  Copy, Check, MapPin, RefreshCw, KeyRound, Plus, Minus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useVisitorAuth } from '../context/VisitorAuthContext';
import { visitorTicketAPI, ticketAPI } from '../services/api';

const STATUS_CONFIG = {
  ACTIVE: { color: 'from-emerald-500 to-teal-500', glow: 'shadow-emerald-200', icon: CheckCircle, label: 'Active', bg: 'bg-emerald-50' },
  PARTIALLY_USED: { color: 'from-amber-500 to-orange-500', glow: 'shadow-amber-200', icon: Users, label: 'Partially Used', bg: 'bg-amber-50' },
  USED: { color: 'from-gray-400 to-gray-500', glow: 'shadow-gray-200', icon: CheckCircle, label: 'Used', bg: 'bg-gray-50' },
  CANCELLED: { color: 'from-red-500 to-rose-500', glow: 'shadow-red-200', icon: XCircle, label: 'Cancelled', bg: 'bg-red-50' },
  EXPIRED: { color: 'from-stone-400 to-stone-500', glow: 'shadow-stone-200', icon: AlertTriangle, label: 'Expired', bg: 'bg-stone-50' },
  REFUNDED: { color: 'from-blue-500 to-cyan-500', glow: 'shadow-blue-200', icon: RefreshCw, label: 'Refunded', bg: 'bg-blue-50' },
  PENDING: { color: 'from-yellow-500 to-amber-500', glow: 'shadow-yellow-200', icon: Clock, label: 'Pending', bg: 'bg-yellow-50' },
};

const TicketDetail = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useVisitorAuth();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Staff Verification State
  const [pin, setPin] = useState(['', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [entryCount, setEntryCount] = useState(1);
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // Initialize entryCount to remaining visitors when ticket loads
  useEffect(() => {
    if (ticket && ticket.totalVisitors) {
      const remaining = ticket.totalVisitors - (ticket.admittedVisitors || 0);
      if (remaining > 0) setEntryCount(remaining);
    }
  }, [ticket]);

  const handlePinChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;
    
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    if (value && index < 3) {
      inputRefs[index + 1].current.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs[index - 1].current.focus();
    }
  };

  const handleVerify = async () => {
    const staffPin = pin.join('');
    if (staffPin.length !== 4) {
      toast.error('Please enter the complete 4-digit Staff PIN');
      return;
    }
    setVerifying(true);
    try {
      await ticketAPI.verify({ ticketId: ticket.id, museumId: ticket.museumId, staffPin, entryCount });
      toast.success(`Ticket Verified & ${entryCount} Entry Granted!`);
      setPin(['', '', '', '']);
      fetchTicket();
    } catch (err) {
      toast.error(err?.message || 'Invalid Staff PIN');
      setPin(['', '', '', '']);
      inputRefs[0].current?.focus();
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) { navigate('/visitor/login', { state: { from: `/visitor/tickets/${ticketId}` } }); return; }
    fetchTicket();
  }, [ticketId, isAuthenticated]);

  const fetchTicket = async () => {
    setLoading(true);
    try {
      const res = await visitorTicketAPI.getTicketDetail(ticketId);
      setTicket(res.data || res);
    } catch (err) {
      toast.error(err?.message || 'Failed to load ticket');
      navigate('/visitor/tickets');
    } finally {
      setLoading(false);
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const fmtTime = (t) => t ? t.substring(0, 5) : '';

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleCopyToken = async () => {
    if (!ticket?.publicToken) return;
    await navigator.clipboard.writeText(`${window.location.origin}/ticket/${ticket.publicToken}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copied!');
  };

  const handleDownload = () => {
    if (!ticket) return;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Ticket ${ticket.ticketNumber}</title>
      <style>body{font-family:system-ui;max-width:500px;margin:40px auto;padding:20px}
      .header{text-align:center;border-bottom:2px solid #4F46E5;padding-bottom:16px;margin-bottom:24px}
      .info{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee}
      .status{display:inline-block;padding:4px 12px;border-radius:20px;font-weight:bold;font-size:12px;background:#E8E8E8}
      .security-note{text-align:center;margin-top:30px;padding:15px;background:#f3f4f6;border-radius:8px;font-size:14px;color:#4b5563;border:1px dashed #cbd5e1}</style></head><body>
      <div class="header"><h1>${ticket.museumName}</h1><p>Ticket #${ticket.ticketNumber}</p>
      <span class="status">${ticket.status}</span></div>
      <div class="info"><span>Date</span><strong>${fmtDate(ticket.bookedDate)}</strong></div>
      ${ticket.slotStart ? `<div class="info"><span>Time</span><strong>${fmtTime(ticket.slotStart)} - ${fmtTime(ticket.slotEnd)}</strong></div>` : ''}
      <div class="info"><span>Adults</span><strong>${ticket.adults || 0}</strong></div>
      <div class="info"><span>Children</span><strong>${ticket.children || 0}</strong></div>
      <div class="info"><span>Total</span><strong>₹${ticket.totalPrice}</strong></div>
      <div class="info"><span>Entered</span><strong>${ticket.admittedVisitors || 0} of ${ticket.totalVisitors || 0}</strong></div>
      <div class="security-note">
        <strong>Digital Entry Ticket</strong><br/>
        Please present this downloaded ticket to the museum staff upon arrival. The staff will verify your details and grant you entry.
      </div></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ticket-${ticket.ticketNumber}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    toast.success('Ticket downloaded!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!ticket) return null;

  const config = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.PENDING;
  const StatusIcon = config.icon;
  const entryProgress = ticket.totalVisitors > 0 ? (ticket.admittedVisitors / ticket.totalVisitors) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Back */}
        <button onClick={() => navigate('/visitor/tickets')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to My Tickets
        </button>

        {/* Dynamic Ticket Card */}
        <div className={`relative bg-white rounded-3xl shadow-xl ${config.glow} dynamic-ticket overflow-hidden`}>
          {/* Status gradient strip */}
          <div className={`h-2 bg-gradient-to-r ${config.color}`} />

          {/* Ticket Header */}
          <div className="p-6 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Ticket Number</p>
                <p className="font-mono text-lg font-black text-indigo-700">#{ticket.ticketNumber}</p>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${config.bg} border`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {config.label}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-500 flex-shrink-0" />
              <p className="font-bold text-gray-900">{ticket.museumName || 'Museum'}</p>
            </div>
          </div>

          {/* Perforated divider */}
          <div className="relative px-6">
            <div className="border-t-2 border-dashed border-gray-200" />
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-50 rounded-full" />
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-50 rounded-full" />
          </div>

          {/* Ticket Details */}
          <div className="p-6 pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 uppercase font-medium mb-0.5">Date</p>
                <p className="text-sm font-bold text-gray-900">{fmtDate(ticket.bookedDate || ticket.createdAt)}</p>
              </div>
              {ticket.slotStart && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-500 uppercase font-medium mb-0.5">Time Slot</p>
                  <p className="text-sm font-bold text-gray-900">{fmtTime(ticket.slotStart)} - {fmtTime(ticket.slotEnd)}</p>
                </div>
              )}
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 uppercase font-medium mb-0.5">Visitors</p>
                <p className="text-sm font-bold text-gray-900">
                  {ticket.adults > 0 && `${ticket.adults}A`}
                  {ticket.adults > 0 && ticket.children > 0 && ' + '}
                  {ticket.children > 0 && `${ticket.children}C`}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 uppercase font-medium mb-0.5">Total Paid</p>
                <p className="text-sm font-bold text-indigo-700">₹{ticket.totalPrice}</p>
              </div>
            </div>

            {/* Entry Progress */}
            {(ticket.status === 'ACTIVE' || ticket.status === 'PARTIALLY_USED' || ticket.status === 'USED') && ticket.totalVisitors > 0 && (
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-[10px] text-gray-500 uppercase font-medium">Entry Progress</p>
                  <p className="text-xs font-bold text-gray-700">
                    {ticket.admittedVisitors || 0} of {ticket.totalVisitors} entered
                  </p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full bg-gradient-to-r ${config.color} transition-all duration-500`}
                    style={{ width: `${entryProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Refund info */}
            {ticket.refundAmount > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs font-bold text-blue-800">Refund: ₹{ticket.refundAmount}</p>
                <p className="text-[10px] text-blue-600 mt-0.5">Status: {ticket.refundStatus}</p>
              </div>
            )}

            {/* Staff Verification Block */}
            {(ticket.status === 'ACTIVE' || ticket.status === 'PARTIALLY_USED') && (
              <div className="bg-indigo-50 border-2 border-indigo-100 rounded-2xl p-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <KeyRound className="h-4 w-4 text-indigo-600" />
                  <p className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Staff Verification</p>
                </div>
                <p className="text-xs text-indigo-700 mb-3 font-medium">Museum staff will enter their 4-digit code below to grant you entry.</p>
                
                <div className="flex justify-between gap-3 mb-4">
                  {pin.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={inputRefs[idx]}
                      type="password"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handlePinChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      disabled={verifying}
                      className="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 border-indigo-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 bg-white text-indigo-900 transition-all outline-none"
                    />
                  ))}
                </div>
                
                <div className="flex items-center justify-between bg-white rounded-xl p-2 mb-4 border border-indigo-100">
                  <span className="text-xs font-bold text-gray-600 px-2 uppercase tracking-wide">Admitting Now:</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setEntryCount(prev => Math.max(1, prev - 1))} 
                      disabled={entryCount <= 1 || verifying}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="font-bold text-lg w-6 text-center text-indigo-900">{entryCount}</span>
                    <button 
                      onClick={() => setEntryCount(prev => Math.min(ticket.totalVisitors - (ticket.admittedVisitors || 0), prev + 1))} 
                      disabled={entryCount >= (ticket.totalVisitors - (ticket.admittedVisitors || 0)) || verifying}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <button
                  onClick={handleVerify}
                  disabled={verifying || pin.join('').length !== 4}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {verifying ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                  {verifying ? 'Verifying...' : 'Grant Entry'}
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 grid grid-cols-3 gap-2">
            <button onClick={handleShare}
              className="flex flex-col items-center gap-1 bg-gray-50 hover:bg-indigo-50 py-3 rounded-xl transition-colors">
              <Share2 className="h-4 w-4 text-gray-600" />
              <span className="text-[10px] font-medium text-gray-600">Share</span>
            </button>
            <button onClick={handleDownload}
              className="flex flex-col items-center gap-1 bg-gray-50 hover:bg-indigo-50 py-3 rounded-xl transition-colors">
              <Download className="h-4 w-4 text-gray-600" />
              <span className="text-[10px] font-medium text-gray-600">Download</span>
            </button>
            <button onClick={handleCopyToken}
              className="flex flex-col items-center gap-1 bg-gray-50 hover:bg-indigo-50 py-3 rounded-xl transition-colors">
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-gray-600" />}
              <span className="text-[10px] font-medium text-gray-600">{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

      </div>
      
      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">Share Ticket</h3>
              <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => {
                const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out my museum ticket for ${ticket.museumName}! Ticket #${ticket.ticketNumber}\n${window.location.origin}/ticket/${ticket.publicToken}`)}`;
                window.open(url, '_blank');
                setShowShareModal(false);
              }} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-green-50 hover:bg-green-100 text-green-700 transition-colors border border-green-100">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 0C5.383 0 0 5.383 0 12.031c0 2.124.553 4.128 1.523 5.882L0 24l6.236-1.637c1.7.887 3.633 1.391 5.692 1.391 6.648 0 12.031-5.383 12.031-12.031S18.679 0 12.031 0zm0 21.758c-1.794 0-3.551-.482-5.088-1.393l-.365-.217-3.782.991.991-3.689-.237-.378c-.999-1.593-1.526-3.428-1.526-5.328 0-5.556 4.519-10.075 10.075-10.075S22.106 6.188 22.106 11.744 17.587 21.758 12.031 21.758zm5.534-7.551c-.303-.152-1.794-.886-2.073-.987-.279-.101-.482-.152-.686.152-.204.304-.784.987-.96 1.189-.176.204-.355.228-.658.076-1.583-.787-2.738-1.408-3.805-3.21-.102-.178.093-.162.388-.755.101-.203.051-.381-.025-.533-.076-.152-.686-1.654-.939-2.264-.247-.595-.497-.514-.686-.523-.178-.009-.381-.009-.585-.009-.204 0-.533.076-.812.381-.279.304-1.066 1.04-1.066 2.538s1.091 2.943 1.243 3.146c.152.203 2.146 3.275 5.197 4.593 1.95.845 2.76.914 3.733.771.747-.11 2.298-.939 2.62-1.844.321-.905.321-1.68.225-1.844-.096-.165-.355-.266-.659-.419z" /></svg>
                <span className="text-sm font-bold">WhatsApp</span>
              </button>
              
              <button onClick={() => {
                const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/ticket/${ticket.publicToken}`)}`;
                window.open(url, '_blank');
                setShowShareModal(false);
              }} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors border border-blue-100">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" /></svg>
                <span className="text-sm font-bold">Facebook</span>
              </button>

              {navigator.share && (
                <button onClick={() => {
                  navigator.share({
                    title: `Museum Ticket - ${ticket.ticketNumber}`,
                    text: `My museum entry ticket for ${ticket.museumName}`,
                    url: `${window.location.origin}/ticket/${ticket.publicToken}`,
                  });
                  setShowShareModal(false);
                }} className="col-span-2 flex items-center justify-center gap-2 py-4 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors border border-gray-200">
                  <Share2 className="w-5 h-5" />
                  <span className="text-sm font-bold">More Sharing Options...</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketDetail;
