import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Ticket, AlertTriangle, ArrowLeft, Loader2, CheckCircle, Clock, XCircle, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useVisitorAuth } from '../context/VisitorAuthContext';
import { visitorTicketAPI } from '../services/api';

const TicketCancellation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useVisitorAuth();
  
  // Extract ticketId from query string if available
  const queryParams = new URLSearchParams(location.search);
  const preselectedTicketId = queryParams.get('ticket');

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/visitor/login', { state: { from: '/visitor/cancellation' } }); return; }
    fetchCancellableTickets();
  }, [isAuthenticated]);

  const fetchCancellableTickets = async () => {
    setLoading(true);
    try {
      const res = await visitorTicketAPI.getCancellable();
      const list = res.data || res || [];
      setTickets(list);

      if (preselectedTicketId && list.length > 0) {
        const preselected = list.find(t => t.id.toString() === preselectedTicketId);
        if (preselected) setSelectedTicket(preselected);
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedTicket) return;
    if (!window.confirm(`Are you sure you want to cancel ticket #${selectedTicket.ticketNumber}? This action cannot be undone.`)) return;
    
    setCancelling(true);
    try {
      const res = await visitorTicketAPI.cancelTicket(selectedTicket.id);
      toast.success('Ticket cancelled successfully');
      // Remove from list
      setTickets(tickets.filter(t => t.id !== selectedTicket.id));
      setSelectedTicket(null);
    } catch (err) {
      toast.error(err?.message || 'Failed to cancel ticket');
    } finally {
      setCancelling(false);
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12 px-4">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate('/visitor/tickets')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to My Tickets
        </button>

        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2 mb-2">
          <AlertTriangle className="h-6 w-6 text-red-500" />
          Cancel or Reschedule Ticket
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          Review our policy and select a ticket to cancel or reschedule.
        </p>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mb-3" />
            <p className="text-gray-500 text-sm">Loading eligible tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
            <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-600">No Cancellable Tickets</h3>
            <p className="text-sm text-gray-500 mt-1">You don't have any active tickets eligible for cancellation.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left: Ticket Selection */}
            <div className="space-y-3">
              <h3 className="font-bold text-gray-900 mb-3">Select a ticket</h3>
              {tickets.map(ticket => (
                <button key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    selectedTicket?.id === ticket.id 
                      ? 'border-indigo-600 bg-indigo-50 shadow-md' 
                      : 'border-gray-200 bg-white hover:border-indigo-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                      #{ticket.ticketNumber}
                    </span>
                    <span className="text-xs font-bold text-gray-900">₹{ticket.totalPrice}</span>
                  </div>
                  <p className="font-bold text-gray-900 text-sm">{ticket.museumName}</p>
                  <p className="text-xs text-gray-500 mt-1">Date: {fmtDate(ticket.bookedDate)}</p>
                  
                  {!ticket.cancellation?.eligible && (
                    <p className="text-[10px] text-red-600 mt-2 font-medium bg-red-50 p-1.5 rounded">
                      {ticket.cancellation?.reason || 'Not eligible for refund'}
                    </p>
                  )}
                </button>
              ))}
            </div>

            {/* Right: Policy & Confirmation */}
            <div>
              {selectedTicket ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-md sticky top-24">
                  <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">Refund Calculation</h3>
                  
                  {selectedTicket.cancellation?.eligible ? (
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Ticket Price Paid</span>
                        <span className="font-semibold">₹{selectedTicket.cancellation.ticketPrice}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Refund Percentage</span>
                        <span className={`font-semibold ${selectedTicket.cancellation.refundPercentage === 100 ? 'text-green-600' : 'text-amber-600'}`}>
                          {selectedTicket.cancellation.refundPercentage}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t">
                        <span className="font-bold text-gray-900">Estimated Refund</span>
                        <span className="font-black text-xl text-green-600">₹{selectedTicket.cancellation.refundAmount}</span>
                      </div>

                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mt-4">
                        <p className="text-xs text-blue-800 flex items-start gap-2">
                          <Clock className="h-4 w-4 shrink-0" />
                          <span>Refunds are processed to the original payment method within 5-7 business days.</span>
                        </p>
                      </div>

                      <div className="flex flex-col gap-3 mt-6">
                        <button 
                          onClick={() => navigate(`/visitor/tickets/${selectedTicket.id}/reschedule`)}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                          <Calendar className="h-5 w-5" />
                          Reschedule Ticket
                        </button>
                        
                        <button 
                          onClick={handleCancel}
                          disabled={cancelling}
                          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                          {cancelling ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                          {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
                        <p className="font-bold text-sm mb-1">Not Eligible for Cancellation</p>
                        <p className="text-xs">{selectedTicket.cancellation?.reason}</p>
                      </div>
                      <button 
                        onClick={() => navigate(`/visitor/tickets/${selectedTicket.id}/reschedule`)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        <Calendar className="h-5 w-5" />
                        Reschedule Ticket Instead
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm sticky top-24">
                  <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">Cancellation Policy</h3>
                  <ul className="text-sm text-gray-600 space-y-3">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span><strong>100% Refund:</strong> Cancel at least 24 hours before your visit date.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <span><strong>75% Refund:</strong> Cancel within 24 hours, but before your visit date starts.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                      <span><strong>No Refund:</strong> Cancellations are not permitted on or after your visit date.</span>
                    </li>
                  </ul>
                  <p className="text-xs text-gray-400 mt-6 italic text-center">Select a ticket to see your exact refund amount.</p>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default TicketCancellation;
