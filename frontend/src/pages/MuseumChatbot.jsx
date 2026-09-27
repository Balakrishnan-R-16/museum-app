import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bot, X, CheckCircle, Clock, CreditCard,
  ChevronRight, Ticket, ArrowLeft, Eye, EyeOff, Globe,
  Send, Sparkles, ExternalLink, Landmark, Info, User, LogIn
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as api from '../services/api';
import { loadRazorpayScript } from '../utils/loadRazorpay';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { LANGUAGES, getTranslation } from '../utils/translations';
import { useVisitorAuth } from '../context/VisitorAuthContext';

/* ──────────────────────────────────────────────
   STEP CONSTANTS  (button-driven flow)
────────────────────────────────────────────── */
const STEP = {
  MAIN_MENU: 'MAIN_MENU',
  VIEW_MUSEUM_PROFILE: 'VIEW_MUSEUM_PROFILE',
  VIEW_PRICES: 'VIEW_PRICES',
  VIEW_TIMINGS: 'VIEW_TIMINGS',
  VIEW_CONTACT: 'VIEW_CONTACT',
  VIEW_SHOWS: 'VIEW_SHOWS',
  BOOK_SELECT_TICKETS: 'BOOK_SELECT_TICKETS',
  BOOK_DATE: 'BOOK_DATE',
  BOOK_SLOT: 'BOOK_SLOT',
  BOOK_EMAIL: 'BOOK_EMAIL',
  BOOK_CONFIRM: 'BOOK_CONFIRM',
  PAYMENT: 'PAYMENT',
  SUCCESS: 'SUCCESS',
  ASK_AI: 'ASK_AI',
};

/* ──────────────────────────────────────────────
   HELPERS
────────────────────────────────────────────── */
const fmtPrice = (v) => `₹${Number(v || 0).toFixed(0)}`;
const fmtDate  = (d) => new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
const fmtTime  = (d) => new Date(d).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });

/* ──────────────────────────────────────────────
   COMPONENT
────────────────────────────────────────────── */
const MuseumChatbot = () => {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const { visitor, isAuthenticated: visitorLoggedIn, googleAuth } = useVisitorAuth();

  /* Language state (persisted) */
  const [lang, setLang] = useState(() => localStorage.getItem('chatbot_lang') || 'en');
  const t = getTranslation(lang);

  /* Museum data */
  const [museum, setMuseum]   = useState(null);       // single museum (if opened via QR)
  const [museums, setMuseums] = useState([]);          // all museums
  const [selectedMuseum, setSelectedMuseum] = useState(null); // chosen for booking
  const [shows, setShows]     = useState([]);

  /* Chat messages */
  const [messages, setMessages] = useState([]);

  /* Current step / flow state */
  const [step, setStep]     = useState(STEP.MAIN_MENU);
  const [textInput, setTextInput] = useState('');

  /* Booking form state */
  const [booking, setBooking] = useState({ adults: 1, children: 0, email: '', date: '', slotStart: '', slotEnd: '' });
  const [totalPrice, setTotalPrice] = useState(0);

  /* Payment state */
  const [orderData,      setOrderData]      = useState(null);
  const [bookingResult,  setBookingResult]  = useState(null);
  const [loading,        setLoading]        = useState(false);

  /* History panel removed — visitors use /visitor/tickets instead */

  /* AI Guide state */
  const [aiLoading,         setAiLoading]        = useState(false);
  const [aiSuggestedAction, setAiSuggestedAction]= useState(null);


  const messagesEndRef = useRef(null);

  /* ── scroll ── */
  // Initialize Google Sign-In button when on BOOK_EMAIL step
  useEffect(() => {
    if (step === STEP.BOOK_EMAIL && !visitorLoggedIn && window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
        callback: async (response) => {
          try {
            await googleAuth(response.credential);
            toast.success('Signed in with Google!');
            // After login, `visitorLoggedIn` becomes true, which will trigger another useEffect
            // to advance to the next step (BOOK_CONFIRM), or we can handle it here:
            // But wait, visitorLoggedIn will change and trigger a re-render.
          } catch (err) {
            toast.error(err?.message || 'Google sign-in failed');
          }
        },
      });
      window.google.accounts.id.renderButton(
        document.getElementById("chatbot-google-signin"),
        { theme: "outline", size: "large", shape: "rectangular", width: "100%" }
      );
    }
  }, [step, visitorLoggedIn, googleAuth]);

  useEffect(() => {
    // If visitor logs in while on BOOK_EMAIL step, advance to confirmation
    if (visitorLoggedIn && step === STEP.BOOK_EMAIL && visitor?.email) {
      setBooking(p => ({ ...p, email: visitor.email }));
      const adult = Number(selectedMuseum?.adultPrice || selectedMuseum?.adultTicketPrice || 0);
      const child = Number(selectedMuseum?.childPrice || selectedMuseum?.childTicketPrice || 0);
      const total = booking.adults * adult + booking.children * child;
      addBot(
        `**${t.bookingDetailsTitle}**\n\n` +
        `🏛️ ${t.museumLabel}: ${selectedMuseum.museumName}\n` +
        `👤 ${booking.adults} ${t.adults} + ${booking.children} ${t.children}\n` +
        `📅 Date: ${booking.date || 'Today'}\n` +
        (booking.slotStart ? `🕐 Slot: ${booking.slotStart} - ${booking.slotEnd}\n` : '') +
        `📧 ${t.contactEmail}: ${visitor.email}\n` +
        `💰 ${t.totalPayable}: ${fmtPrice(total)}\n\n` +
        `${t.pleaseConfirmDetails}`
      );
      setStep(STEP.BOOK_CONFIRM);
    }
  }, [visitorLoggedIn, step, visitor, selectedMuseum, booking, t, fmtPrice]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 60);
    return () => clearTimeout(timeout);
  }, [messages, step]);

  /* ── load museum(s) ── */
  useEffect(() => {
    if (paramId) {
      loadSingleMuseum(paramId);
    } else {
      loadAllMuseums();
    }
  }, [paramId]);

  /* recalc price when tickets or museum change */
  useEffect(() => {
    if (!selectedMuseum) { setTotalPrice(0); return; }
    const adult = Number(selectedMuseum.adultPrice || selectedMuseum.adultTicketPrice || 0);
    const child = Number(selectedMuseum.childPrice || selectedMuseum.childTicketPrice || 0);
    setTotalPrice(booking.adults * adult + booking.children * child);
  }, [booking.adults, booking.children, selectedMuseum]);

  /* poll for real-time updates every 15 s */
  useEffect(() => {
    const interval = setInterval(() => {
      if (paramId) loadSingleMuseum(paramId, true);
      else         loadAllMuseums(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [paramId]);

  const loadSingleMuseum = async (id, silent = false) => {
    try {
      const res = await api.publicAPI.getMuseumProfile(id);
      const m = res.data || res;
      setMuseum(m);
      setSelectedMuseum(m);
      if (!silent) {
        setMuseums([m]);
        setMessages(prev => {
          if (prev.length === 0 || prev[prev.length - 1].text.indexOf(m.museumName) === -1) {
            return [...prev, { id: Date.now(), type: 'bot', text: `${t.welcomeTo} **${m.museumName}**! 🏛️\n${t.howCanIHelp}` }];
          }
          return prev;
        });
      }
      loadShows(id, silent);
    } catch (e) {
      if (!silent) toast.error('Failed to load museum');
    }
  };

  const loadAllMuseums = async (silent = false) => {
    try {
      const res = await api.publicAPI.searchMuseums();
      const all = (res.data?.content || res.data || res).filter(m => m.bookingStatus === true);
      setMuseums(all);
      if (!silent) {
        setMessages(prev => {
          if (prev.length === 0) {
            return [...prev, { id: Date.now(), type: 'bot', text: t.welcomeMuseumTicket }];
          }
          return prev;
        });
      }
    } catch (e) {
      if (!silent) {
        toast.error('Failed to load museums');
        setMessages(prev =>
          prev.length === 0
            ? [...prev, { id: Date.now(), type: 'bot', text: t.welcomeMuseumTicket }]
            : prev
        );
      }
    }
  };

  const loadShows = async (museumId, silent = false) => {
    try {
      const res = await api.showAPI.getActiveShows(museumId);
      setShows(res.data || res || []);
    } catch { /* ignore */ }
  };

  /* ── message helpers ── */
  const addBot  = (text) => setMessages(p => [...p, { id: Date.now() + Math.random(), type: 'bot',  text }]);
  const addUser = (text) => setMessages(p => [...p, { id: Date.now() + Math.random(), type: 'user', text }]);

  /* ── Language Switcher Handler ── */
  const handleLanguageChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem('chatbot_lang', newLang);
    const newT = getTranslation(newLang);
    const target = selectedMuseum || museums[0];
    const greeting = target 
      ? `${newT.welcomeTo} **${target.museumName}**! 🏛️\n${newT.howCanIHelp}`
      : newT.welcomeMuseumTicket;
    addBot(greeting);
    toast.success(`Language switched to ${LANGUAGES.find(l => l.code === newLang)?.native || newLang}`);
  };

  /* ── AI Guide Handler (Real Gemini Backend Integration) ── */
  const handleAskAi = async () => {
    const question = textInput.trim();
    if (!question) return;
    setTextInput('');
    addUser(question);
    setAiLoading(true);
    setAiSuggestedAction(null);
    try {
      const target = selectedMuseum || museum || museums[0];
      if (!target || !target.id) {
        addBot('Please select a museum to ask questions.');
        return;
      }

      const res = await api.aiAPI.visitorGuide(target.id, question, lang);
      const payload = res?.data || res;
      if (res?.success === false || payload?.success === false) {
        const errMsg = payload?.message || res?.message || 'Sorry, I could not process your question. Please try again.';
        addBot(errMsg);
      } else {
        const guideData = (payload?.answer ? payload : (payload?.data || res?.data || payload));
        addBot(guideData?.answer || 'Here is the information you requested.');

        if (guideData?.actions && guideData.actions.length > 0) {
          const action = guideData.actions[0];
          setAiSuggestedAction({
            type: action.type,
            label: action.label || (action.type === 'BOOK_TICKETS' ? t.menuBookTicket : t.menuSpecialShows)
          });
        }
      }
    } catch (err) {
      console.error('AI Visitor Guide request failed:', err);
      addBot('Sorry, the AI guide is temporarily unavailable. Please try again or browse the menu below.');
    } finally {
      setAiLoading(false);
    }
  };

  /* ── Direct navigation to Museum Information Display Page ── */
  const handleViewMuseumProfile = () => {
    const target = selectedMuseum || museum || museums[0];
    if (!target) {
      toast.error(t.noMuseumAvailable || 'No museum available');
      return;
    }
    const identifier = target.slug || target.id;
    navigate(`/museums/${identifier}`);
  };

  /* ── MAIN MENU OPTIONS ── */
  const mainMenuOptions = [
    { label: t.menuMuseumInfo,      step: STEP.VIEW_MUSEUM_PROFILE },
    { label: t.menuViewPrices,      step: STEP.VIEW_PRICES },
    { label: t.menuTimings,         step: STEP.VIEW_TIMINGS },
    { label: t.menuContact,         step: STEP.VIEW_CONTACT },
    ...(shows.length > 0 ? [{ label: t.menuSpecialShows, step: STEP.VIEW_SHOWS }] : []),
    { label: t.menuBookTicket,      step: STEP.BOOK_SELECT_TICKETS },
  ];

  const handleMainMenu = (option) => {
    addUser(option.label);

    if (option.step === STEP.VIEW_MUSEUM_PROFILE) {
      const target = selectedMuseum || museum || museums[0];
      if (!target) {
        addBot(t.noMuseumAvailable);
        return;
      }
      addBot(`🏛️ Directing you to the museum information display page for **${target.museumName}**...`);
      setTimeout(() => {
        handleViewMuseumProfile();
      }, 400);
      return;
    }

    setStep(option.step);

    if (option.step === STEP.VIEW_PRICES) {
      const target = selectedMuseum || museums[0];
      if (!target) { addBot(t.noMuseumAvailable); return; }
      addBot(
        `**${target.museumName} - ${t.menuViewPrices}**\n\n` +
        `👨 ${t.adults}: ${fmtPrice(target.adultPrice || target.adultTicketPrice)}\n` +
        `👦 ${t.children}: ${fmtPrice(target.childPrice || target.childTicketPrice)}`
      );
    }

    if (option.step === STEP.VIEW_TIMINGS) {
      const target = selectedMuseum || museums[0];
      if (!target) return;
      let timingsText = `**${target.museumName} - ${t.menuTimings}**\n\n`;
      if (target.businessHours && target.businessHours.length > 0) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        target.businessHours.forEach(bh => {
          const dayName = typeof bh.dayOfWeek === 'number' ? days[bh.dayOfWeek] : bh.dayOfWeek;
          if (bh.isClosed) {
            timingsText += `❌ ${dayName}: Closed\n`;
          } else {
            const formatTime = (timeStr) => {
              if (!timeStr) return '';
              const [hours, minutes] = timeStr.split(':');
              const d = new Date();
              d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);
              return d.toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'});
            };
            timingsText += `✅ ${dayName}: ${formatTime(bh.openTime)} - ${formatTime(bh.closeTime)}\n`;
          }
        });
      } else {
        timingsText += `✅ ${t.today}: ${target.openingTime || '09:00'} - ${target.closingTime || '17:00'}\n`;
      }
      addBot(timingsText);
    }

    if (option.step === STEP.VIEW_CONTACT) {
      const target = selectedMuseum || museums[0];
      if (!target) return;
      const addressText = target.address ? target.address : [target.landmark, target.city, target.state, target.pincode].filter(Boolean).join(', ');
      
      addBot(
        `**${target.museumName} - ${t.menuContact}**\n\n` +
        `📧 ${t.contactEmail}: ${target.publicEmail || 'Not provided'}\n` +
        `📞 ${t.contactPhone}: ${target.publicPhone || 'Not provided'}\n` +
        `📍 ${t.museumLabel}: ${addressText || target.location || 'Not provided'}`
      );
    }

    if (option.step === STEP.VIEW_SHOWS) {
      if (shows.length === 0) {
        addBot('No special shows are currently scheduled.');
      } else {
        const list = shows.map(s =>
          `🎭 **${s.showName || s.name}**\n   📅 ${fmtDate(s.showTime)} at ${fmtTime(s.showTime)}\n   💰 ${fmtPrice(s.price)} per ticket\n   🎟️ ${s.availableSeats} seats left`
        ).join('\n\n');
        addBot(`**${t.menuSpecialShows}**\n\n${list}`);
      }
    }

    if (option.step === STEP.BOOK_SELECT_TICKETS) {
      if (!selectedMuseum && museums.length === 0) {
        addBot(t.noMuseumAvailable);
        setStep(STEP.MAIN_MENU);
        return;
      }
      const target = selectedMuseum || museums[0];
      if (!target.bookingStatus) {
        addBot(t.closedWarning);
        setStep(STEP.MAIN_MENU);
        return;
      }
      if (target.seatLimit !== undefined && target.seatLimit <= 0) {
        addBot(t.noSeatsWarning);
        setStep(STEP.MAIN_MENU);
        return;
      }
      if (!selectedMuseum) setSelectedMuseum(target);
      addBot(`${t.selectTicketsPrompt} **${target.museumName}**:`);
    }
  };

  const handleSelectMuseum = (m) => {
    setSelectedMuseum(m);
    addBot(`${t.selectTicketsPrompt} **${m.museumName}**:`);
  };


  /* ── BOOKING FLOW STEPS ── */
  const handleTicketCount = () => {
    if (!selectedMuseum) {
      toast.error('Please select a museum first');
      return;
    }
    const adult = Number(selectedMuseum.adultPrice || selectedMuseum.adultTicketPrice || 0);
    const child = Number(selectedMuseum.childPrice || selectedMuseum.childTicketPrice || 0);
    const total = booking.adults * adult + booking.children * child;

    addUser(`${booking.adults} ${t.adults}, ${booking.children} ${t.children}`);
    addBot(
      `**${t.bookingDetailsTitle}**\n\n` +
      `👨 ${booking.adults} ${t.adults} × ${fmtPrice(adult)} = ${fmtPrice(booking.adults * adult)}\n` +
      `👦 ${booking.children} ${t.children} × ${fmtPrice(child)} = ${fmtPrice(booking.children * child)}\n` +
      `─────────────────\n` +
      `💰 **${t.totalPayable}: ${fmtPrice(total)}**\n\n` +
      `Please select a date for your visit:`
    );
    setTotalPrice(total);
    setStep(STEP.BOOK_DATE);
  };

  const handleDateSubmit = (date) => {
    setBooking(p => ({ ...p, date }));
    addUser(`Date: ${date}`);
    addBot(`Great! Now select a time slot for your visit:`);
    setStep(STEP.BOOK_SLOT);
  };

  const handleSlotSubmit = (slotStart, slotEnd) => {
    setBooking(p => ({ ...p, slotStart, slotEnd }));
    addUser(`Time Slot: ${slotStart} - ${slotEnd}`);

    if (visitorLoggedIn && visitor?.email) {
      setBooking(p => ({ ...p, email: visitor.email }));
      addBot(
        `**${t.bookingDetailsTitle}**\n\n` +
        `🏛️ ${t.museumLabel}: ${selectedMuseum.museumName}\n` +
        `👤 ${booking.adults} ${t.adults} + ${booking.children} ${t.children}\n` +
        `📅 Date: ${booking.date}\n` +
        `🕐 Slot: ${slotStart} - ${slotEnd}\n` +
        `📧 ${t.contactEmail}: ${visitor.email}\n` +
        `💰 ${t.totalPayable}: ${fmtPrice(totalPrice)}\n\n` +
        `${t.pleaseConfirmDetails}`
      );
      setStep(STEP.BOOK_CONFIRM);
    } else {
      addBot(t.enterEmailPrompt);
      setStep(STEP.BOOK_EMAIL);
    }
  };

  const handleEmailSubmit = () => {
    const email = textInput.trim();
    if (!email || !email.includes('@')) { toast.error('Enter a valid email'); return; }
    setBooking(p => ({ ...p, email }));
    setTextInput('');
    addUser(email);

    addBot(
      `**${t.bookingDetailsTitle}**\n\n` +
      `🏛️ ${t.museumLabel}: ${selectedMuseum.museumName}\n` +
      `👤 ${booking.adults} ${t.adults} + ${booking.children} ${t.children}\n` +
      `📅 Date: ${booking.date}\n` +
      `🕐 Slot: ${booking.slotStart} - ${booking.slotEnd}\n` +
      `📧 ${t.contactEmail}: ${email}\n` +
      `💰 ${t.totalPayable}: ${fmtPrice(totalPrice)}\n\n` +
      `${t.pleaseConfirmDetails}`
    );
    setStep(STEP.BOOK_CONFIRM);
  };

  const handleConfirmBooking = async () => {
    setLoading(true);
    try {
      const ticketRes = await api.ticketAPI.book({
        museumId: selectedMuseum.id,
        email: booking.email,
        adults: booking.adults,
        children: booking.children,
        visitorId: visitorLoggedIn ? visitor?.id : undefined,
        bookedDate: booking.date ? booking.date : undefined,
        slotStart: booking.slotStart || undefined,
        slotEnd: booking.slotEnd || undefined,
      });
      const ticket = ticketRes.data || ticketRes;
      setBookingResult(ticket);
      addBot(`🎫 ${t.ticketNumberLabel}: **#${ticket.ticketNumber}**\n\nRedirecting to secure payment…`);

      const orderRes = await api.paymentAPI.createOrder({ ticketId: ticket.id });
      const order = orderRes.data || orderRes;
      setOrderData({
        ...order,
        museumName: selectedMuseum.museumName,
        ticketNumber: ticket.ticketNumber,
      });
      setStep(STEP.PAYMENT);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async () => {
    if (!orderData) return;
    try {
      await loadRazorpayScript();
      const options = {
        key: orderData.razorpayKey,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: orderData.museumName,
        description: `Ticket - ${orderData.ticketNumber}`,
        order_id: orderData.orderId,
        handler: async (response) => {
          try {
            await api.paymentAPI.verify({
              ticketId: bookingResult.id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId:   response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            });
            toast.success(t.paymentSuccessTitle);
            addBot(
              `✅ **${t.paymentSuccessTitle}**\n\n` +
              `🎫 ${t.ticketNumberLabel}: **#${bookingResult.ticketNumber}**\n` +
              `🏛️ ${t.museumLabel}: ${selectedMuseum.museumName}\n` +
              `📧 ${t.confirmationSentTo} ${booking.email}\n\n` +
              `**${t.entryInstructionsTitle}**\n` +
              `${t.entryStep1}\n` +
              `${t.entryStep2}\n` +
              `${t.entryStep3}\n` +
              `${t.entryStep4}`
            );
            setStep(STEP.SUCCESS);
            setOrderData(null);
          } catch {
            toast.error('Payment verification failed. Contact support.');
          }
        },
        prefill: { email: booking.email },
        theme: { color: '#6366f1' },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      toast.error('Failed to open payment window');
    }
  };

  /* ── HISTORY — removed. Visitors use /visitor/tickets page instead ── */

  /* ── RESET ── */
  const resetToMenu = () => {
    setStep(STEP.MAIN_MENU);
    setBooking({ adults: 1, children: 0, email: '' });
    setOrderData(null);
    setBookingResult(null);
    setAiSuggestedAction(null);
    addBot(t.howCanIHelp);
  };

  /* ──────────────────────────────────────────────
     RENDER HELPERS
  ────────────────────────────────────────────── */
  const renderMessageText = (text) => {
    return text.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <span key={i}>
          {parts.map((p, j) =>
            p.startsWith('**') && p.endsWith('**')
              ? <strong key={j}>{p.slice(2, -2)}</strong>
              : p
          )}
          {i < text.split('\n').length - 1 && <br />}
        </span>
      );
    });
  };

  /* ── BOTTOM ACTION AREA ── */
  const renderActions = () => {

    switch (step) {
      case STEP.MAIN_MENU:
      case STEP.ASK_AI:
        return (
          <div className="p-3.5 space-y-2.5 bg-gray-50/90">
            {/* AI Action button if recommended */}
            {aiSuggestedAction && (
              <div className="animate-fadeIn">
                <button
                  onClick={() => {
                    const actType = aiSuggestedAction.type;
                    if (actType === 'BOOK' || actType === 'BOOK_TICKETS') {
                      handleMainMenu({ label: aiSuggestedAction.label || t.menuBookTicket, step: STEP.BOOK_SELECT_TICKETS });
                    } else if (actType === 'SHOWS' || actType === 'VIEW_SHOWS') {
                      handleMainMenu({ label: aiSuggestedAction.label || t.menuSpecialShows, step: STEP.VIEW_SHOWS });
                    } else if (actType === 'VIEW_TIMINGS') {
                      handleMainMenu({ label: aiSuggestedAction.label || t.menuTimings, step: STEP.VIEW_TIMINGS });
                    } else if (actType === 'VIEW_PRICES') {
                      handleMainMenu({ label: aiSuggestedAction.label || t.menuViewPrices, step: STEP.VIEW_PRICES });
                    } else if (actType === 'VIEW_DIRECTIONS' || actType === 'VIEW_CONTACT' || actType === 'VIEW_ACCESSIBILITY') {
                      handleMainMenu({ label: aiSuggestedAction.label || t.menuContact, step: STEP.VIEW_CONTACT });
                    } else if (actType === 'VIEW_PROFILE' || actType === 'VIEW_INFO' || actType === 'MUSEUM_PROFILE' || actType === 'GALLERY') {
                      handleViewMuseumProfile();
                    } else {
                      handleMainMenu({ label: aiSuggestedAction.label || t.menuBookTicket, step: STEP.BOOK_SELECT_TICKETS });
                    }
                  }}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-2 px-3.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-300 animate-pulse" />
                  {aiSuggestedAction.label}
                </button>
              </div>
            )}

            {/* Main Menu tiles - Clean, compact, no ugly text truncation */}
            <div className="grid grid-cols-2 gap-2">
              {mainMenuOptions.map(opt => (
                <button key={opt.step}
                  onClick={() => handleMainMenu(opt)}
                  className="flex items-center justify-between bg-white hover:bg-indigo-50/80 border border-gray-200 hover:border-indigo-400 text-gray-800 px-3 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs group text-left">
                  <span className="leading-snug break-words">{opt.label}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-gray-400 group-hover:text-indigo-500 flex-shrink-0 ml-1" />
                </button>
              ))}
            </div>

            {/* Conversational Text & AI Input - High contrast, clearly visible */}
            <div className="flex items-center gap-2 pt-1 border-t border-gray-200">
              <input
                type="text"
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAskAi()}
                placeholder={t.typeYourQuestion}
                className="flex-1 px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm font-medium text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all shadow-xs"
              />
              <button
                onClick={() => handleAskAi()}
                disabled={aiLoading || !textInput.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 text-white p-2.5 rounded-xl transition-all shadow-sm flex-shrink-0 flex items-center justify-center">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        );

      case STEP.VIEW_PRICES:
      case STEP.VIEW_TIMINGS:
      case STEP.VIEW_CONTACT:
      case STEP.VIEW_SHOWS:
        return (
          <div className="p-3.5 space-y-2 bg-gray-50">
            <button
              onClick={handleViewMuseumProfile}
              className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs">
              <Landmark className="h-4 w-4" /> {t.viewFullMuseumPage}
            </button>
            <div className="flex gap-2">
              <button onClick={() => setStep(STEP.MAIN_MENU)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5">
                <ArrowLeft className="h-4 w-4" /> {t.backToMenu}
              </button>
              <button onClick={() => handleMainMenu({ label: t.menuBookTicket, step: STEP.BOOK_SELECT_TICKETS })}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md">
                {t.menuBookTicket}
              </button>
            </div>
          </div>
        );

      case STEP.BOOK_SELECT_TICKETS:
        return (
          <div className="p-4 space-y-3">
            {/* Ticket counter */}
            <div className="bg-gray-50 rounded-xl p-3 grid grid-cols-2 gap-3 border border-gray-100">
              {/* Adults */}
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">
                  {t.adults} {selectedMuseum && `(${fmtPrice(selectedMuseum.adultPrice || selectedMuseum.adultTicketPrice)})`}
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setBooking(p => ({ ...p, adults: Math.max(0, p.adults - 1) }))}
                    className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 font-bold text-base flex items-center justify-center">−</button>
                  <span className="w-6 text-center font-bold text-sm">{booking.adults}</span>
                  <button onClick={() => setBooking(p => ({ ...p, adults: p.adults + 1 }))}
                    className="w-8 h-8 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold text-base flex items-center justify-center">+</button>
                </div>
              </div>
              {/* Children */}
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">
                  {t.children} {selectedMuseum && `(${fmtPrice(selectedMuseum.childPrice || selectedMuseum.childTicketPrice)})`}
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setBooking(p => ({ ...p, children: Math.max(0, p.children - 1) }))}
                    className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 font-bold text-base flex items-center justify-center">−</button>
                  <span className="w-6 text-center font-bold text-sm">{booking.children}</span>
                  <button onClick={() => setBooking(p => ({ ...p, children: p.children + 1 }))}
                    className="w-8 h-8 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold text-base flex items-center justify-center">+</button>
                </div>
              </div>
            </div>

            {totalPrice > 0 && (
              <div className="text-center text-sm font-black text-indigo-700 bg-indigo-50 rounded-xl py-2 border border-indigo-100">
                {t.totalPayable}: {fmtPrice(totalPrice)}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setStep(STEP.MAIN_MENU)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl text-xs font-bold transition-all">
                ← {t.back}
              </button>
              <button onClick={handleTicketCount}
                disabled={!selectedMuseum || booking.adults + booking.children === 0}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-md">
                {t.continueBtn}
              </button>
            </div>
          </div>
        );

      case STEP.BOOK_DATE:
        return (
          <div className="p-4 space-y-4">
            <div>
              <p className="text-sm font-bold text-gray-900 mb-2">Select Date of Visit</p>
              <input type="date"
                min={new Date().toISOString().split('T')[0]}
                value={booking.date || ''}
                onChange={e => setBooking(p => ({ ...p, date: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(STEP.BOOK_SELECT_TICKETS)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl text-xs font-bold transition-all">
                ← {t.back}
              </button>
              <button onClick={() => handleDateSubmit(booking.date)}
                disabled={!booking.date}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-md">
                {t.continueBtn}
              </button>
            </div>
          </div>
        );

      case STEP.BOOK_SLOT: {
        // Generate time slots from museum opening to closing
        const openStr = selectedMuseum?.openingTime || '09:00';
        const closeStr = selectedMuseum?.closingTime || '17:00';
        const openHour = parseInt(openStr.split(':')[0], 10);
        const closeHour = parseInt(closeStr.split(':')[0], 10);
        const slots = [];
        for (let h = openHour; h < closeHour; h += 2) {
          const start = `${String(h).padStart(2, '0')}:00`;
          const endHour = Math.min(h + 2, closeHour);
          const end = `${String(endHour).padStart(2, '0')}:00`;
          slots.push({ start, end, label: `${start} - ${end}` });
        }
        const selectedSlot = booking.slotStart ? `${booking.slotStart}-${booking.slotEnd}` : '';

        return (
          <div className="p-4 space-y-4">
            <p className="text-sm font-bold text-gray-900 mb-1">Select Time Slot</p>
            <p className="text-xs text-gray-500 mb-2">Choose your preferred 2-hour visit window</p>
            <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1">
              {slots.map(s => {
                const key = `${s.start}-${s.end}`;
                const isSelected = selectedSlot === key;
                return (
                  <button key={key}
                    onClick={() => setBooking(p => ({ ...p, slotStart: s.start, slotEnd: s.end }))}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border-2 flex items-center justify-center gap-1.5
                      ${isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'}`}>
                    <Clock className="h-3.5 w-3.5" />
                    {s.label}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(STEP.BOOK_DATE)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl text-xs font-bold transition-all">
                ← {t.back}
              </button>
              <button onClick={() => handleSlotSubmit(booking.slotStart, booking.slotEnd)}
                disabled={!booking.slotStart}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-md">
                {t.continueBtn}
              </button>
            </div>
          </div>
        );
      }

      case STEP.BOOK_EMAIL:
        return (
          <div className="p-4 space-y-4">
            {!visitorLoggedIn && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                <p className="text-sm text-gray-700 mb-3 font-medium">Continue with Google to book your ticket instantly</p>
                <div className="flex justify-center mb-2">
                  <div id="chatbot-google-signin"></div>
                </div>
              </div>
            )}
          </div>
        );

      /* ── SHOW BOOKING DETAILS IN CHOSEN LANGUAGE ── */
      case STEP.BOOK_CONFIRM:
        const adultUnit = Number(selectedMuseum?.adultPrice || selectedMuseum?.adultTicketPrice || 0);
        const childUnit = Number(selectedMuseum?.childPrice || selectedMuseum?.childTicketPrice || 0);
        const currentLangObj = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

        return (
          <div className="p-4 space-y-3">
            {/* Rich Booking Details Summary Card */}
            <div className="bg-gradient-to-br from-indigo-50/90 to-purple-50/90 border border-indigo-200 rounded-2xl p-4 shadow-sm text-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                <span className="font-extrabold text-indigo-950 text-xs sm:text-sm flex items-center gap-1.5">
                  <Ticket className="h-4 w-4 text-indigo-600" />
                  {t.bookingDetailsTitle}
                </span>
                <span className="bg-white text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200 text-[10px] flex items-center gap-1">
                  <span>{currentLangObj.flag}</span> {currentLangObj.native}
                </span>
              </div>

              <div className="space-y-1.5 text-gray-700">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t.museumLabel}:</span>
                  <span className="font-bold text-gray-900">{selectedMuseum?.museumName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t.visitorsLabel}:</span>
                  <span className="font-semibold text-gray-900">
                    {booking.adults > 0 && `${booking.adults} ${t.adults} (@ ${fmtPrice(adultUnit)})`}
                    {booking.adults > 0 && booking.children > 0 && ', '}
                    {booking.children > 0 && `${booking.children} ${t.children} (@ ${fmtPrice(childUnit)})`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t.contactEmail}:</span>
                  <span className="font-medium text-gray-800 truncate max-w-[180px]">{booking.email}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">{t.visitDate}:</span>
                  <span className="font-medium text-gray-800">{booking.date ? fmtDate(new Date(booking.date + 'T00:00:00')) : `${t.today} (${fmtDate(new Date())})`}</span>
                </div>
                {booking.slotStart && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Time Slot:</span>
                    <span className="font-medium text-gray-800">{booking.slotStart} - {booking.slotEnd}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-indigo-100 pt-2 flex justify-between items-center text-xs">
                <span className="font-bold text-indigo-900">{t.totalPayable}:</span>
                <span className="font-black text-indigo-700 text-sm sm:text-base">{fmtPrice(totalPrice)}</span>
              </div>

              <p className="text-[10px] text-gray-500 italic text-center pt-0.5">
                {t.pleaseConfirmDetails}
              </p>
            </div>

            <div className="flex gap-2">
              <button onClick={resetToMenu}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl text-xs font-bold transition-all">
                ← {t.cancel}
              </button>
              <button onClick={handleConfirmBooking} disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-md">
                {loading ? t.creatingBooking : t.confirmAndPay}
              </button>
            </div>
          </div>
        );

      case STEP.PAYMENT:
        return (
          <div className="p-4 space-y-3">
            {orderData && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs">
                <p className="font-bold text-amber-800 mb-1">{t.paymentSummary}</p>
                <div className="flex justify-between text-gray-700">
                  <span>{orderData.museumName}</span>
                  <span className="font-bold">₹{(orderData.amount / 100).toFixed(2)}</span>
                </div>
                <p className="text-[10px] text-amber-700 mt-1">{orderData.ticketNumber}</p>
              </div>
            )}
            <button onClick={handlePayNow}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2">
              <CreditCard className="h-4 w-4" /> {t.payNow}
            </button>
          </div>
        );

      case STEP.SUCCESS:
        return (
          <div className="p-4 grid grid-cols-2 gap-2">
            {visitorLoggedIn && bookingResult?.id ? (
              <Link to={`/visitor/tickets/${bookingResult.id}`}
                className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 py-3 rounded-xl text-xs font-bold transition-all text-center">
                {t.viewTicketBtn}
              </Link>
            ) : (
              <Link to="/visitor/login"
                className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 py-3 rounded-xl text-xs font-bold transition-all text-center">
                Sign In to View
              </Link>
            )}
            <button onClick={resetToMenu}
              className="bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-md">
              {t.mainMenuBtn}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  /* ── History panel removed. Visitors use /visitor/tickets page instead ── */

  /* ──────────────────────────────────────────────
     MAIN RENDER
  ────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 py-4 flex items-center justify-center px-4">
      {/* Decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Phone-style chatbot frame */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          style={{ height: 'calc(100vh - 100px)', maxHeight: '780px' }}>

          {/* ── Header with Language Switcher & Direct Profile Link ── */}
          <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 px-4 py-3.5 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="bg-white/20 p-2 rounded-full flex-shrink-0">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1
                  onClick={handleViewMuseumProfile}
                  className="text-white font-bold text-sm sm:text-base leading-tight truncate cursor-pointer hover:underline"
                  title="Click to view full museum information display page">
                  {museum?.museumName || selectedMuseum?.museumName || 'Museum Assistant'}
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse flex-shrink-0" />
                  <span className="text-white/80 text-[11px] truncate">{t.onlineStatus}</span>
                </div>
              </div>
            </div>

            {/* Right Controls: Museum Info, Language Selector & Account */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Direct Link to Main Museum Profile Page */}
              <button
                onClick={handleViewMuseumProfile}
                className="bg-white/20 hover:bg-white/30 transition-colors p-2 rounded-full text-white"
                title={t.viewFullMuseumPage || 'View Museum Profile'}>
                <Landmark className="h-4 w-4" />
              </button>

              {/* Language Switcher Dropdown */}
              <div className="relative">
                <select
                  value={lang}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold py-1.5 pl-2 pr-6 rounded-full border border-white/30 outline-none cursor-pointer backdrop-blur-sm transition-all appearance-none"
                  title="Change Language">
                  {LANGUAGES.map(l => (
                    <option key={l.code} value={l.code} className="text-gray-900 bg-white">
                      {l.flag} {l.native}
                    </option>
                  ))}
                </select>
                <Globe className="h-3 w-3 text-white/70 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Account / My Tickets */}
              {visitorLoggedIn ? (
                <Link to="/visitor/tickets"
                  className="bg-white/20 hover:bg-white/30 transition-colors p-2 rounded-full text-white"
                  title="My Tickets">
                  <Ticket className="h-4 w-4" />
                </Link>
              ) : (
                <Link to="/visitor/login"
                  className="bg-white/20 hover:bg-white/30 transition-colors p-2 rounded-full text-white"
                  title="Sign In">
                  <User className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>

          {/* ── Content ── */}
          <div className="flex-1 overflow-hidden relative">

            {/* CHAT AREA */}
            <div className="absolute inset-0 flex flex-col">
              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center px-6">
                    <div className="bg-indigo-100 p-4 rounded-full mb-3">
                      <Bot className="h-10 w-10 text-indigo-600" />
                    </div>
                    <p className="text-gray-500 text-xs">{t.loadingMuseum}</p>
                  </div>
                )}
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      msg.type === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-none shadow-xs'
                        : 'bg-gray-100 text-gray-800 rounded-bl-none'
                    }`}>
                      {renderMessageText(msg.text)}
                    </div>
                  </div>
                ))}

                {/* AI Thinking Animation */}
                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl rounded-bl-none px-4 py-2.5 flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-600 animate-spin" />
                      <span className="text-xs text-indigo-700 font-medium">{t.aiThinking}</span>
                    </div>
                  </div>
                )}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-2xl rounded-bl-none px-4 py-3">
                      <div className="flex gap-1">
                        {[0,1,2].map(i => (
                          <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Action Area */}
              <div className="flex-shrink-0 bg-gray-50 border-t border-gray-100">
                {renderActions()}
              </div>
            </div>

          </div>
        </div>

        {/* Bottom hint */}
        <p className="text-center text-white/50 text-xs mt-3 flex items-center justify-center gap-1">
          <span>🌐 Switch language anytime from the top bar</span>
          {visitorLoggedIn && <span> · <Link to="/visitor/tickets" className="text-indigo-300 hover:text-indigo-200">View My Tickets</Link></span>}
        </p>
      </div>
    </div>
  );
};

export default MuseumChatbot;
