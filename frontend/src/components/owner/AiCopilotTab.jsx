import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, TrendingUp, Users, DollarSign, AlertTriangle, 
  CheckCircle2, Clock, Send, MessageSquare, ArrowRight, ShieldCheck, 
  RefreshCw, Bot, ChevronRight, Zap, User, BarChart2, Check,
  AlertCircle, Loader2, XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as api from '../../services/api';

const AiCopilotTab = ({ museum, stats, liveStats, tickets = [], reviews = [], onSettingsUpdated }) => {
  // ── State for each AI card ──
  const [crowdData, setCrowdData] = useState(null);
  const [crowdLoading, setCrowdLoading] = useState(false);
  const [crowdError, setCrowdError] = useState(null);

  const [yieldData, setYieldData] = useState(null);
  const [yieldLoading, setYieldLoading] = useState(false);
  const [yieldError, setYieldError] = useState(null);
  const [applyingPrice, setApplyingPrice] = useState(false);
  const [showPriceConfirm, setShowPriceConfirm] = useState(false);

  const [sentimentData, setSentimentData] = useState(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);
  const [sentimentError, setSentimentError] = useState(null);

  const [queryText, setQueryText] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);

  const [reviewReplyDrafts, setReviewReplyDrafts] = useState({});
  const [reviewReplyLoading, setReviewReplyLoading] = useState({});
  const [submittingReplyId, setSubmittingReplyId] = useState(null);

  // Live stats
  const mName = museum?.museumName || 'Museum';
  const seatLimit = Number(museum?.seatLimit || 100);
  const todayRev = liveStats?.todayRevenue ?? stats?.todayRevenue ?? 0;
  const todayTix = liveStats?.todayTicketsCount ?? stats?.todayTicketsCount ?? tickets.length ?? 0;
  const activeBookings = liveStats?.activeBookingsCount ?? stats?.activeBookingsCount ?? 0;

  const [chatHistory, setChatHistory] = useState([
    {
      sender: 'ai',
      time: 'Just now',
      text: `Hello ${mName} Administrator! 👋\n\nI am your **MuseumAI Operations Copilot**, connected to your live booking database.\n\n• **Current Capacity**: ${seatLimit} seats (${museum?.bookingStatus ? '✅ Booking Open' : '❌ Booking Closed'})\n• **Today's Tickets**: ${todayTix} issued · **Today's Revenue**: ₹${todayRev.toLocaleString('en-IN')}\n\nAsk me anything about revenue, ticket sales, capacity, visitor counts, top days, or average ratings.`,
      source: 'system'
    }
  ]);

  const chatBottomRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, queryLoading]);

  // ── Load AI insights on mount ──
  useEffect(() => {
    loadCrowdForecast();
    loadYieldRecommendation();
    loadSentimentAnalysis();
  }, []);

  // ════════════════════════════════════════════════════════════════════════
  // 1. CROWD FORECAST (real API)
  // ════════════════════════════════════════════════════════════════════════
  const loadCrowdForecast = async (forceRefresh = false) => {
    setCrowdLoading(true);
    setCrowdError(null);
    try {
      const res = await api.aiAPI.crowdForecast(forceRefresh);
      const body = res.data || res;
      if (body.success === false) {
        setCrowdError(body.message || 'Failed to load crowd forecast');
      } else {
        setCrowdData(body.data || body);
      }
    } catch (err) {
      setCrowdError('Failed to load crowd forecast. Please try again.');
    } finally {
      setCrowdLoading(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════════
  // 2. YIELD OPTIMIZER (real API)
  // ════════════════════════════════════════════════════════════════════════
  const loadYieldRecommendation = async (forceRefresh = false) => {
    setYieldLoading(true);
    setYieldError(null);
    try {
      const res = await api.aiAPI.yieldRecommendation(forceRefresh);
      const body = res.data || res;
      if (body.success === false) {
        setYieldError(body.message || 'Failed to load yield recommendation');
      } else {
        setYieldData(body.data || body);
      }
    } catch (err) {
      setYieldError('Failed to load pricing recommendation.');
    } finally {
      setYieldLoading(false);
    }
  };

  const handleApplyAiPricing = async () => {
    if (!yieldData?.suggestedPricing) return;
    setApplyingPrice(true);
    try {
      if (museum?.id) {
        await api.museumAPI.update(museum.id, {
          adultPrice: yieldData.suggestedPricing.adult,
          childPrice: yieldData.suggestedPricing.child,
        });
        toast.success(`Pricing updated: Adult ₹${yieldData.suggestedPricing.adult}, Child ₹${yieldData.suggestedPricing.child}`);
        setShowPriceConfirm(false);
        if (onSettingsUpdated) onSettingsUpdated();
      }
    } catch (err) {
      toast.error('Failed to update pricing');
    } finally {
      setApplyingPrice(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════════
  // 3. SENTIMENT ANALYSIS (real API)
  // ════════════════════════════════════════════════════════════════════════
  const loadSentimentAnalysis = async (forceRefresh = false) => {
    setSentimentLoading(true);
    setSentimentError(null);
    try {
      const res = await api.aiAPI.sentimentAnalysis(forceRefresh);
      const body = res.data || res;
      if (body.success === false) {
        setSentimentError(body.message || 'Failed to load sentiment analysis');
      } else {
        setSentimentData(body.data || body);
      }
    } catch (err) {
      setSentimentError('Failed to analyze reviews.');
    } finally {
      setSentimentLoading(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════════
  // 4. CONVERSATIONAL BI (real API)
  // ════════════════════════════════════════════════════════════════════════
  const handleSendAiQuery = async (presetPrompt) => {
    const promptToSend = presetPrompt || queryText;
    if (!promptToSend.trim()) return;

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatHistory(prev => [...prev, { sender: 'user', time: nowTime, text: promptToSend }]);
    if (!presetPrompt) setQueryText('');
    setQueryLoading(true);

    try {
      const res = await api.aiAPI.askBusiness(promptToSend);
      const body = res.data || res;
      const data = body.data || body;

      let aiText = '';
      if (body.success === false) {
        aiText = `⚠️ ${body.message || 'AI service temporarily unavailable. Please try again.'}`;
      } else {
        aiText = data.answer || 'No response generated.';
        if (data.assumptions) aiText += `\n\n_📊 ${data.assumptions}_`;
      }

      const source = body.source || data.source || 'gemini';
      setChatHistory(prev => [...prev, {
        sender: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: aiText,
        source,
        suggestedActions: data.suggestedActions
      }]);
    } catch (err) {
      setChatHistory(prev => [...prev, {
        sender: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: '⚠️ Failed to connect to AI service. Please check your connection and try again.',
        source: 'error'
      }]);
    } finally {
      setQueryLoading(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════════
  // 5. REVIEW RESPONDER (real API)
  // ════════════════════════════════════════════════════════════════════════
  const handleGenerateReviewReply = async (review) => {
    setReviewReplyLoading(prev => ({ ...prev, [review.id]: true }));
    try {
      const res = await api.aiAPI.draftReviewResponse(review.id, 'professional');
      const body = res.data || res;
      if (body.success === false) {
        toast.error(body.message || 'Failed to generate reply');
      } else {
        const data = body.data || body;
        setReviewReplyDrafts(prev => ({ ...prev, [review.id]: data.draft || '' }));
      }
    } catch (err) {
      toast.error('Failed to generate AI reply. Please try again.');
    } finally {
      setReviewReplyLoading(prev => ({ ...prev, [review.id]: false }));
    }
  };

  const handleSubmitReply = async (reviewId) => {
    const text = reviewReplyDrafts[reviewId];
    if (!text) return;
    setSubmittingReplyId(reviewId);
    try {
      await api.ownerAPI.respondToReview(reviewId, { responseText: text });
      toast.success('Response posted to review! 🎉');
      setReviewReplyDrafts(prev => {
        const next = { ...prev };
        delete next[reviewId];
        return next;
      });
      if (onSettingsUpdated) onSettingsUpdated();
    } catch (err) {
      toast.error('Failed to post reply');
    } finally {
      setSubmittingReplyId(null);
    }
  };

  // ── Helper: source label ──
  const SourceLabel = ({ source }) => {
    if (!source || source === 'system') return null;
    const labels = {
      'gemini': { text: 'AI-generated', color: 'text-indigo-500' },
      'gemini+analytics': { text: 'AI + Analytics', color: 'text-indigo-500' },
      'gemini+metrics': { text: 'AI + Live Data', color: 'text-indigo-500' },
      'gemini+rules': { text: 'AI + Rules', color: 'text-indigo-500' },
      'calculated_analytics': { text: 'Calculated analytics', color: 'text-gray-500' },
      'rule_based_recommendation': { text: 'Rule-based', color: 'text-gray-500' },
      'rating_fallback': { text: 'Rating-based (AI unavailable)', color: 'text-amber-600' },
      'metrics_only': { text: 'Live metrics (AI unavailable)', color: 'text-amber-600' },
      'fallback': { text: 'Fallback (AI unavailable)', color: 'text-amber-600' },
      'error': { text: 'Error', color: 'text-red-500' },
    };
    const label = labels[source] || { text: source, color: 'text-gray-400' };
    return <span className={`text-[10px] ${label.color} font-medium`}>● {label.text}</span>;
  };

  // ── Helper: error card ──
  const ErrorCard = ({ message, onRetry }) => (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <AlertCircle className="h-8 w-8 text-red-400 mb-2" />
      <p className="text-xs text-red-600 font-medium mb-3">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer">
          <RefreshCw className="h-3.5 w-3.5" /> Try Again
        </button>
      )}
    </div>
  );

  // ── Helper: loading card ──
  const LoadingCard = ({ text }) => (
    <div className="flex flex-col items-center justify-center py-8">
      <Loader2 className="h-6 w-6 text-indigo-500 animate-spin mb-2" />
      <p className="text-xs text-gray-500 font-medium">{text || 'Loading AI insights...'}</p>
    </div>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      
      {/* ── Header Toolbar ── */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="bg-gradient-to-tr from-indigo-600 to-purple-600 p-2.5 rounded-xl text-white shadow-sm flex-shrink-0">
            <Sparkles className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              MuseumAI Operations Copilot
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Real AI insights from your live booking data
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Database Synced
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-gray-50 text-gray-700 border border-gray-200 text-xs font-semibold">
            Capacity: <strong className="text-gray-900">{seatLimit}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold">
            Today: <strong className="text-indigo-900">₹{todayRev.toLocaleString('en-IN')}</strong> ({todayTix} tix)
          </div>
        </div>
      </div>

      {/* ── Top 3 AI KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Crowd Forecast (API-driven) */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                Crowd Forecast
              </span>
              <button onClick={() => loadCrowdForecast(true)} className="text-gray-400 hover:text-indigo-600 cursor-pointer" title="Refresh">
                <RefreshCw className={`h-4 w-4 ${crowdLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <h3 className="text-lg font-black text-gray-900">Peak Rush Warning</h3>
            <p className="text-xs text-gray-500 mt-0.5">Hourly footfall from real booking data</p>

            {crowdLoading && !crowdData ? (
              <LoadingCard text="Analyzing booking patterns..." />
            ) : crowdError ? (
              <ErrorCard message={crowdError} onRetry={() => loadCrowdForecast(true)} />
            ) : crowdData ? (
              <>
                <div className="mt-4 space-y-2.5">
                  {(crowdData.hourlyDistribution || []).slice(0, 6).map((slot, idx) => {
                    const pct = slot.percentageOfPeak || 0;
                    const color = pct >= 80 ? 'bg-red-500' : pct >= 50 ? 'bg-amber-500' : pct >= 25 ? 'bg-indigo-500' : 'bg-emerald-500';
                    return (
                      <div key={idx} className="text-xs">
                        <div className="flex justify-between font-semibold text-gray-700 mb-1">
                          <span>{slot.time}</span>
                          <span className={pct >= 80 ? 'text-red-600 font-bold' : 'text-gray-600'}>
                            {pct}% ({slot.label})
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {crowdData.confidence === 'insufficient_data' && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-900 leading-snug">{crowdData.explanation}</p>
                  </div>
                )}

                {crowdData.staffingAdvice && crowdData.confidence !== 'insufficient_data' && (
                  <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                    <p className="text-xs text-indigo-900 leading-snug">
                      <strong>AI Staffing Advice:</strong> {typeof crowdData.staffingAdvice === 'string' ? crowdData.staffingAdvice.substring(0, 300) : ''}
                    </p>
                    <SourceLabel source={crowdData.aiError ? 'calculated_analytics' : 'gemini+analytics'} />
                  </div>
                )}

                <div className="mt-2 text-[10px] text-gray-400">
                  {crowdData.totalTicketsAnalyzed} tickets analyzed · {crowdData.dataRange}
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* Card 2: Yield Optimizer (API-driven with confirmation) */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                Yield Optimizer
              </span>
              <button onClick={() => loadYieldRecommendation(true)} className="text-gray-400 hover:text-emerald-600 cursor-pointer" title="Refresh">
                <RefreshCw className={`h-4 w-4 ${yieldLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <h3 className="text-lg font-black text-gray-900">Dynamic Pricing</h3>

            {yieldLoading && !yieldData ? (
              <LoadingCard text="Computing pricing recommendation..." />
            ) : yieldError ? (
              <ErrorCard message={yieldError} onRetry={() => loadYieldRecommendation(true)} />
            ) : yieldData ? (
              <>
                <div className="mt-4 bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-medium">Current Rates:</span>
                    <span className="font-bold text-gray-800">
                      Adult: ₹{yieldData.currentPricing?.adult} · Child: ₹{yieldData.currentPricing?.child}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-t border-gray-200 pt-2">
                    <span className="text-indigo-700 font-bold text-xs uppercase tracking-wide">Suggested:</span>
                    <span className="font-black text-emerald-600 text-base">
                      Adult: ₹{yieldData.suggestedPricing?.adult} · Child: ₹{yieldData.suggestedPricing?.child}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Today: {yieldData.todayBookedVisitors ?? '—'}/{yieldData.capacity ?? '—'} visitors · Occupancy: {yieldData.occupancyRate}% · Multiplier: {yieldData.multiplier}x
                  </div>
                  {yieldData.projectedMonthlyGain > 0 && (
                    <div className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-emerald-200">
                      <TrendingUp className="h-3.5 w-3.5" /> Est. Gain: +₹{yieldData.projectedMonthlyGain.toLocaleString('en-IN')}/mo
                    </div>
                  )}
                </div>

                {yieldData.explanation && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-xs text-blue-900 leading-snug">{yieldData.explanation.substring(0, 300)}</p>
                    <SourceLabel source={yieldData.dataSource || 'gemini+rules'} />
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Confirmation step for price changes */}
          {yieldData && yieldData.multiplier > 1.0 && !showPriceConfirm && (
            <button
              onClick={() => setShowPriceConfirm(true)}
              className="mt-5 w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer">
              <Sparkles className="h-4 w-4" />
              Review & Apply Pricing
            </button>
          )}

          {showPriceConfirm && (
            <div className="mt-4 p-4 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-3">
              <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" /> Confirm Price Change
              </p>
              <p className="text-xs text-amber-800">
                This will update live ticket prices from Adult ₹{yieldData.currentPricing?.adult} → ₹{yieldData.suggestedPricing?.adult} 
                and Child ₹{yieldData.currentPricing?.child} → ₹{yieldData.suggestedPricing?.child}.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setShowPriceConfirm(false)}
                  className="flex-1 px-3 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-lg cursor-pointer">
                  Cancel
                </button>
                <button onClick={handleApplyAiPricing} disabled={applyingPrice}
                  className="flex-1 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 rounded-lg cursor-pointer flex items-center justify-center gap-1">
                  {applyingPrice ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Confirm & Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Card 3: Sentiment Analysis (API-driven) */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
                Reputation Radar
              </span>
              <button onClick={() => loadSentimentAnalysis(true)} className="text-gray-400 hover:text-purple-600 cursor-pointer" title="Refresh">
                <RefreshCw className={`h-4 w-4 ${sentimentLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <h3 className="text-lg font-black text-gray-900">Sentiment Intelligence</h3>
            <p className="text-xs text-gray-500 mt-0.5">AI-powered feedback analysis</p>

            {sentimentLoading && !sentimentData ? (
              <LoadingCard text="Analyzing visitor reviews..." />
            ) : sentimentError ? (
              <ErrorCard message={sentimentError} onRetry={() => loadSentimentAnalysis(true)} />
            ) : sentimentData ? (
              <>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700">Visitor Approval Rate</span>
                    <span className="text-sm font-black text-emerald-600">
                      {sentimentData.approvalRate || 0}% Positive
                    </span>
                  </div>

                  {sentimentData.sentimentBreakdown && (
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden flex">
                      {(() => {
                        const bd = sentimentData.sentimentBreakdown;
                        const total = (bd.positive || 0) + (bd.neutral || 0) + (bd.negative || 0);
                        if (total === 0) return <div className="bg-gray-300 h-full w-full" />;
                        return (
                          <>
                            <div className="bg-emerald-500 h-full" style={{ width: `${(bd.positive / total) * 100}%` }} />
                            <div className="bg-amber-400 h-full" style={{ width: `${(bd.neutral / total) * 100}%` }} />
                            <div className="bg-red-500 h-full" style={{ width: `${(bd.negative / total) * 100}%` }} />
                          </>
                        );
                      })()}
                    </div>
                  )}

                  <div className="space-y-1.5 pt-1 text-xs">
                    {(sentimentData.praiseThemes || []).slice(0, 3).map((theme, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">"{theme.theme}" ({theme.count} reviews)</span>
                      </div>
                    ))}
                    {(sentimentData.improvementThemes || []).slice(0, 2).map((theme, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-amber-700">
                        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">"{theme.theme}" ({theme.count} reviews)</span>
                      </div>
                    ))}
                  </div>

                  {sentimentData.totalReviewCount === 0 && (
                    <p className="text-xs text-gray-400 italic">No reviews submitted yet.</p>
                  )}
                </div>

                {sentimentData.summary && sentimentData.totalReviewCount > 0 && (
                  <div className="mt-4 p-3 bg-purple-50 border border-purple-100 rounded-xl">
                    <p className="text-xs text-purple-900 leading-snug">{sentimentData.summary}</p>
                    <SourceLabel source={sentimentData.dataSource || 'gemini'} />
                  </div>
                )}

                <div className="mt-2 text-[10px] text-gray-400">
                  {sentimentData.analyzedCount || 0} of {sentimentData.totalReviewCount || 0} reviews analyzed
                  {sentimentData.limitations && ` · ${sentimentData.limitations}`}
                </div>
              </>
            ) : null}
          </div>
        </div>

      </div>

      {/* ── Conversational BI Chat (real Gemini API) ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl text-white">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">Ask Museum AI</h3>
              <p className="text-indigo-100 text-xs mt-0.5">Conversational BI grounded in your museum's live data</p>
            </div>
          </div>
          <span className="hidden sm:inline-flex text-xs font-semibold bg-white/20 px-3 py-1 rounded-full text-white backdrop-blur-sm">
            Museum AI
          </span>
        </div>

        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex-shrink-0 mr-1">Quick:</span>
          {[
            { label: '📊 Revenue last month', query: 'What was our total revenue last month?' },
            { label: '🎫 Tickets today', query: 'How many tickets were sold today?' },
            { label: '⭐ Average rating', query: 'What is our average visitor rating?' },
            { label: '📅 Best day', query: 'What was our best day for ticket sales recently?' },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleSendAiQuery(item.query)}
              className="whitespace-nowrap px-3 py-1.5 bg-white hover:bg-indigo-50 border border-gray-300 hover:border-indigo-400 text-gray-700 hover:text-indigo-700 rounded-full text-xs font-semibold transition-all shadow-xs flex-shrink-0 cursor-pointer">
              {item.label}
            </button>
          ))}
        </div>

        <div className="p-6 bg-slate-50/50 space-y-4 min-h-[380px] max-h-[500px] overflow-y-auto">
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              
              {msg.sender === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-1 shadow-xs">
                  <Sparkles className="h-4 w-4" />
                </div>
              )}

              <div className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-xs ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none font-medium'
                  : 'bg-white text-gray-900 border border-gray-200 rounded-tl-none font-normal'
              }`}>
                {msg.text.split('\n').map((line, li) => {
                  const parts = line.split(/(\*\*[^*]+\*\*)/g);
                  return (
                    <p key={li} className={li > 0 ? 'mt-1.5' : ''}>
                      {parts.map((part, pi) =>
                        part.startsWith('**') && part.endsWith('**') ? (
                          <strong key={pi} className={msg.sender === 'user' ? 'font-bold text-white' : 'font-bold text-indigo-950'}>
                            {part.slice(2, -2)}
                          </strong>
                        ) : part
                      )}
                    </p>
                  );
                })}
                <div className={`flex items-center gap-2 mt-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <span className={`text-[10px] font-medium ${msg.sender === 'user' ? 'text-indigo-200' : 'text-gray-400'}`}>
                    {msg.time}
                  </span>
                  {msg.sender === 'ai' && <SourceLabel source={msg.source} />}
                </div>

                {/* Suggested follow-ups */}
                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {msg.suggestedActions.map((s, si) => (
                      <button key={si} onClick={() => handleSendAiQuery(s)}
                        className="text-[10px] px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200 hover:bg-indigo-100 cursor-pointer">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 mt-1 shadow-xs">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {queryLoading && (
            <div className="flex items-center gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <RefreshCw className="h-4 w-4 animate-spin" />
              </div>
              <div className="bg-white border border-indigo-200 text-indigo-700 px-4 py-3 rounded-2xl rounded-tl-none text-xs font-semibold shadow-xs flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600 animate-pulse" />
                Museum AI is analyzing your museum data…
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        <div className="p-4 bg-white border-t border-gray-200 flex items-center gap-3">
          <input
            type="text"
            value={queryText}
            onChange={e => setQueryText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendAiQuery()}
            placeholder="Ask about revenue, tickets, capacity, ratings, best days..."
            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm font-medium text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all shadow-inner"
          />
          <button
            onClick={() => handleSendAiQuery()}
            disabled={queryLoading || !queryText.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 text-white px-5 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shadow-md cursor-pointer flex-shrink-0">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>

      {/* ── AI Review Responder (real Gemini API) ── */}
      {reviews && reviews.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                AI Review Responder
              </h3>
              <p className="text-gray-500 text-xs">AI-powered personalized responses · Review before posting</p>
            </div>
          </div>

          <div className="space-y-4">
            {reviews.slice(0, 5).map(rev => (
              <div key={rev.id} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/50">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-sm text-gray-900">{rev.visitorName || 'Anonymous Visitor'}</span>
                    <span className="ml-2 text-xs text-yellow-500">{'★'.repeat(rev.rating || 5)}{'☆'.repeat(5 - (rev.rating || 5))}</span>
                  </div>
                  <span className="text-xs text-gray-400">Visitor Review</span>
                </div>
                <p className="text-xs sm:text-sm text-gray-700 italic bg-white p-3 rounded-lg border border-gray-100">
                  "{rev.content || rev.comment || 'No content'}"
                </p>

                {reviewReplyDrafts[rev.id] ? (
                  <div className="space-y-2 bg-indigo-50/70 p-3 rounded-xl border border-indigo-200">
                    <p className="text-xs font-bold text-indigo-800 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-600" /> AI-Generated Draft (review before posting):
                    </p>
                    <textarea
                      value={reviewReplyDrafts[rev.id]}
                      onChange={e => setReviewReplyDrafts(prev => ({ ...prev, [rev.id]: e.target.value }))}
                      className="w-full text-xs p-2.5 bg-white border border-indigo-200 rounded-lg text-gray-800 focus:outline-none"
                      rows={3}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setReviewReplyDrafts(prev => { const n = { ...prev }; delete n[rev.id]; return n; })}
                        className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 cursor-pointer">
                        Discard
                      </button>
                      <button
                        onClick={() => handleSubmitReply(rev.id)}
                        disabled={submittingReplyId === rev.id}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer">
                        {submittingReplyId === rev.id ? 'Posting…' : 'Post Reply'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleGenerateReviewReply(rev)}
                      disabled={reviewReplyLoading[rev.id]}
                      className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer border border-indigo-200 disabled:opacity-50">
                      {reviewReplyLoading[rev.id] ? (
                        <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...</>
                      ) : (
                        <><Sparkles className="h-3.5 w-3.5" /> Draft AI Reply</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AiCopilotTab;
