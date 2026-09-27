import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Ticket, Search, Filter, ChevronDown, Calendar, Clock, Users,
  Building2, ArrowRight, Loader2, ChevronRight, XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useVisitorAuth } from '../context/VisitorAuthContext';
import { visitorTicketAPI } from '../services/api';

const STATUS_COLORS = {
  ACTIVE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  PARTIALLY_USED: 'bg-amber-100 text-amber-800 border-amber-200',
  USED: 'bg-gray-100 text-gray-600 border-gray-200',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200',
  EXPIRED: 'bg-stone-100 text-stone-600 border-stone-200',
  REFUNDED: 'bg-blue-100 text-blue-700 border-blue-200',
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  RESCHEDULED: 'bg-purple-100 text-purple-700 border-purple-200',
};

const MyTickets = () => {
  const navigate = useNavigate();
  const { visitor, isAuthenticated } = useVisitorAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/visitor/login', { state: { from: '/visitor/tickets' } }); return; }
    
    const delayDebounceFn = setTimeout(() => {
      fetchTickets();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [isAuthenticated, statusFilter, periodFilter, sortBy, search]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (periodFilter) params.period = periodFilter;
      if (sortBy) params.sort = sortBy;
      if (search.trim()) params.search = search.trim();
      const res = await visitorTicketAPI.getMyTickets(params);
      setTickets(res.data || res || []);
    } catch (err) {
      toast.error(err?.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTickets();
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const fmtTime = (t) => t ? t.substring(0, 5) : '';

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
              <Ticket className="h-6 w-6 text-indigo-600" />
              My Tickets
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {visitor?.name ? `Welcome, ${visitor.name}` : 'Your booking history'}
            </p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by museum or ticket number..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold">
              Search
            </button>
            <button type="button" onClick={() => setShowFilters(!showFilters)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2.5 rounded-xl transition-colors">
              <Filter className="h-4 w-4" />
            </button>
          </form>

          {showFilters && (
            <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                  <option value="">All Statuses</option>
                  {Object.keys(STATUS_COLORS).map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Period</label>
                <select value={periodFilter} onChange={e => setPeriodFilter(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                  <option value="">All Time</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="past">Past</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Sort By</label>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                  <option value="newest">Newest Booking</option>
                  <option value="upcoming">Upcoming Visit</option>
                  <option value="oldest">Oldest</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Ticket List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mb-3" />
            <p className="text-gray-500 text-sm">Loading your tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <Ticket className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-600">No tickets found</h3>
            <p className="text-sm text-gray-400 mt-1">
              {search || statusFilter || periodFilter ? 'Try adjusting your filters' : 'Book your first museum visit!'}
            </p>
            <Link to="/"
              className="inline-flex items-center gap-2 mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all">
              Explore Museums <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''} found</p>
            {tickets.map(ticket => (
              <button key={ticket.id}
                onClick={() => navigate(`/visitor/tickets/${ticket.id}`)}
                className="w-full bg-white hover:bg-gray-50 border border-gray-200 hover:border-indigo-300 rounded-2xl p-4 text-left transition-all shadow-xs hover:shadow-md group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        #{ticket.ticketNumber}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[ticket.status] || 'bg-gray-100 text-gray-600'}`}>
                        {ticket.status?.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="font-bold text-gray-900 text-sm truncate">{ticket.museumName || 'Museum'}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {fmtDate(ticket.bookedDate || ticket.createdAt)}
                      </span>
                      {ticket.slotStart && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {fmtTime(ticket.slotStart)} - {fmtTime(ticket.slotEnd)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {ticket.admittedVisitors > 0
                          ? `${ticket.admittedVisitors} of ${ticket.totalVisitors} entered`
                          : `${ticket.totalVisitors} visitor${ticket.totalVisitors !== 1 ? 's' : ''}`}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-gray-900">₹{ticket.totalPrice}</p>
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-500 mt-1 ml-auto transition-colors" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTickets;
