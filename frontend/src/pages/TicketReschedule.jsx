import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { visitorTicketAPI, museumAPI } from '../services/api';
import { ArrowLeft, Calendar, Clock, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const TicketReschedule = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [museum, setMuseum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rescheduling, setRescheduling] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newSlotStart, setNewSlotStart] = useState('');
  const [newSlotEnd, setNewSlotEnd] = useState('');

  useEffect(() => {
    fetchData();
  }, [ticketId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const ticketRes = await visitorTicketAPI.getTicketDetail(ticketId);
      const t = ticketRes.data || ticketRes;
      setTicket(t);

      if (t.status !== 'ACTIVE') {
        toast.error('Only active tickets can be rescheduled');
        navigate(`/visitor/tickets/${ticketId}`);
        return;
      }

      const museumRes = await museumAPI.getById(t.museumId);
      const m = museumRes.data || museumRes;
      setMuseum(m);

      if (t.bookedDate) {
        setNewDate(t.bookedDate.substring(0, 10)); // YYYY-MM-DD
      }
      if (t.slotStart) {
        setNewSlotStart(t.slotStart.substring(0, 5));
        setNewSlotEnd(t.slotEnd?.substring(0, 5) || '');
      }
    } catch (err) {
      toast.error('Failed to load ticket for rescheduling');
      navigate('/visitor/tickets');
    } finally {
      setLoading(false);
    }
  };

  // Generate time slots from museum opening to closing
  const generateSlots = () => {
    if (!museum) return [];
    const openStr = museum.openingTime || '09:00';
    const closeStr = museum.closingTime || '17:00';
    const openHour = parseInt(openStr.split(':')[0], 10);
    const closeHour = parseInt(closeStr.split(':')[0], 10);
    const slots = [];
    for (let h = openHour; h < closeHour; h += 2) {
      const start = `${String(h).padStart(2, '0')}:00`;
      const endHour = Math.min(h + 2, closeHour);
      const end = `${String(endHour).padStart(2, '0')}:00`;
      slots.push({ start, end, label: `${start} - ${end}` });
    }
    return slots;
  };

  const handleReschedule = async (e) => {
    e.preventDefault();
    if (!newDate) {
      toast.error('Please select a new date');
      return;
    }
    if (!newSlotStart) {
      toast.error('Please select a time slot');
      return;
    }

    setRescheduling(true);
    try {
      await visitorTicketAPI.rescheduleTicket(ticketId, {
        newDate,
        newSlotStart,
        newSlotEnd,
      });
      toast.success('Ticket rescheduled successfully! ✅');
      navigate(`/visitor/tickets/${ticketId}`);
    } catch (err) {
      toast.error(err?.message || err?.response?.data?.message || 'Failed to reschedule ticket');
    } finally {
      setRescheduling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!ticket || !museum) return null;

  const today = new Date().toISOString().split('T')[0];
  const slots = generateSlots();
  const selectedSlotKey = newSlotStart ? `${newSlotStart}-${newSlotEnd}` : '';

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12 px-4">
      <div className="max-w-lg mx-auto">
        <button onClick={() => navigate(`/visitor/tickets/${ticketId}`)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Ticket
        </button>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
          <div className="bg-indigo-600 p-6 text-white">
            <h1 className="text-xl font-extrabold flex items-center gap-2">
              <Calendar className="h-5 w-5" /> Reschedule Ticket
            </h1>
            <p className="text-indigo-100 text-sm mt-1">Select a new date & time slot for your visit</p>
          </div>

          <div className="p-6">
            {/* Current Details */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
              <p className="text-xs text-gray-500 uppercase font-bold mb-2">Current Booking</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{ticket.museumName}</p>
                  <p className="text-xs text-gray-500">#{ticket.ticketNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-indigo-700">
                    {ticket.bookedDate ? new Date(ticket.bookedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {ticket.slotStart ? `${ticket.slotStart.substring(0, 5)} - ${ticket.slotEnd.substring(0, 5)}` : 'No time slot'}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleReschedule} className="space-y-5">
              {/* Date Picker */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">New Date</label>
                <input type="date" required min={today}
                  value={newDate} onChange={e => { setNewDate(e.target.value); setNewSlotStart(''); setNewSlotEnd(''); }}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all font-semibold"
                />
              </div>

              {/* Time Slot Picker */}
              {newDate && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-indigo-500" /> New Time Slot
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {slots.map(s => {
                      const key = `${s.start}-${s.end}`;
                      const isSelected = selectedSlotKey === key;
                      return (
                        <button key={key} type="button"
                          onClick={() => { setNewSlotStart(s.start); setNewSlotEnd(s.end); }}
                          className={`py-2.5 px-3 rounded-xl text-sm font-bold transition-all border-2 flex items-center justify-center gap-1.5
                            ${isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'}`}>
                          <Clock className="h-3.5 w-3.5" />
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 items-start">
                <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-blue-900">Rescheduling Policy</p>
                  <p className="text-xs text-blue-700 mt-1">You can reschedule your ticket subject to capacity availability. The previous time slot will be released.</p>
                </div>
              </div>

              <button type="submit" disabled={rescheduling || !newDate || !newSlotStart}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white py-3.5 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2">
                {rescheduling ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                {rescheduling ? 'Rescheduling...' : 'Confirm Reschedule'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketReschedule;
