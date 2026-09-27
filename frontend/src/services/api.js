import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// ── Request interceptor ──
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor ──
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    let message = 'Something went wrong!';
    if (error.code === 'ECONNABORTED') {
      message = 'Request timeout. Please try again.';
    } else if (error.response) {
      message = error.response.data?.message || error.response.statusText || message;
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('userType');
        localStorage.removeItem('museumId');
        window.location.href = '/admin-login';
        message = 'Session expired. Please login again.';
      }
    } else if (error.request) {
      message = 'Cannot connect to server. Please check your connection.';
    }
    toast.error(message);
    return Promise.reject(error);
  }
);

// ── Public APIs (Discovery & Profiles) ──
export const publicAPI = {
  searchMuseums:    (params) => api.get('/public/museums', { params }),
  getNearbyMuseums: (lat, lon, radius = 50) => api.get('/museums/nearby', { params: { lat, lon, radius } }),
  getMuseumProfile: (slug)   => api.get(`/public/museums/${slug}`),
  getMuseumReviews: (slug, page=0, size=10) => api.get(`/public/museums/${slug}/reviews`, { params: { page, size } }),
  trackProfileView: (id)     => api.post(`/public/museums/${id}/profile-view`),
  submitReview:     (id, data) => api.post(`/public/museums/${id}/reviews`, data),
};

// ── Owner APIs (Dashboard & Management) ──
export const ownerAPI = {
  getProfile:       () => api.get('/owner/museums/me/profile'),
  updateProfile:    (data) => api.put('/owner/museums/me/profile', data),
  uploadImage:      (formData) => api.post('/owner/museums/me/images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteImage:      (id) => api.delete(`/owner/museums/me/images/${id}`),
  respondToReview:  (reviewId, data) => api.post(`/owner/museums/me/reviews/${reviewId}/response`, data),
  getAnalytics:     (range = '30d') => api.get('/owner/museums/me/analytics', { params: { range } }),
};

// ── Legacy Museum APIs (For Chatbot/Registration) ──
export const museumAPI = {
  register:            (data)         => api.post('/museums/register', data),
  login:               (data)         => api.post('/museums/login', data),
  googleLogin:         (credential)   => api.post('/museums/google', { credential }),
  getById:             (id)           => api.get(`/museums/${id}`),
  getAll:              ()             => api.get('/museums'),
  update:              (id, data)     => api.put(`/museums/${id}`, data),
  updateBookingStatus: (id, status)   => api.patch(`/museums/${id}/booking-status?status=${status}`),
  regeneratePin:       (id)           => api.post(`/museums/${id}/regenerate-pin`),
};

// ── Ticket APIs ──
export const ticketAPI = {
  book:                   (data)              => api.post('/tickets/book', data),
  verify:                 (data)              => api.post('/tickets/verify', data),
  getUserTickets:         (email)             => api.get(`/tickets/user/${email}`),
  getMuseumTickets:       (museumId)          => api.get(`/tickets/museum/${museumId}`),
  getMuseumTicketsByPhone:(museumId, phone)   => api.get(`/tickets/museum/${museumId}/phone/${phone}`),
  getById:                (id)                => api.get(`/tickets/${id}`),
  cancel:                 (id)                => api.post(`/tickets/${id}/cancel`),
};

// ── Show APIs ──
export const showAPI = {
  create:          (museumId, data) => api.post(`/shows/museum/${museumId}`, data),
  getMuseumShows:  (museumId)       => api.get(`/shows/museum/${museumId}`),
  getActiveShows:  (museumId)       => api.get(`/shows/museum/${museumId}/active`),
  getUpcomingShows:(museumId)       => api.get(`/shows/museum/${museumId}/upcoming`),
  update:          (showId, data)   => api.put(`/shows/${showId}`, data),
  delete:          (showId)         => api.delete(`/shows/${showId}`),
  getById:         (showId)         => api.get(`/shows/${showId}`),
};

// ── Payment APIs ──
export const paymentAPI = {
  createOrder: (data)      => api.post('/payments/create-order', data),
  verify:      (data)      => api.post('/payments/verify', data),
  getDetails:  (paymentId) => api.get(`/payments/${paymentId}`),
};

// ── Location APIs (Proxied through backend for API key security) ──
export const locationAPI = {
  search:       (query) => api.get('/location/search', { params: { q: query } }),
  reverseGeocode: (lat, lon) => api.get('/location/reverse', { params: { lat, lon } }),
};

// ── AI APIs (all calls go through backend — Gemini key is server-side only) ──
const AI_TIMEOUT = 45000; // AI calls may take longer
export const aiAPI = {
  // Admin endpoints (require MUSEUM JWT)
  crowdForecast:       (forceRefresh = false) => api.post(`/owner/ai/crowd-forecast?forceRefresh=${forceRefresh}`, {}, { timeout: AI_TIMEOUT }),
  yieldRecommendation: (forceRefresh = false) => api.post(`/owner/ai/yield-recommendation?forceRefresh=${forceRefresh}`, {}, { timeout: AI_TIMEOUT }),
  sentimentAnalysis:   (forceRefresh = false) => api.post(`/owner/ai/sentiment-analysis?forceRefresh=${forceRefresh}`, {}, { timeout: AI_TIMEOUT }),
  askBusiness:         (question)            => api.post('/owner/ai/ask', { question }, { timeout: AI_TIMEOUT }),
  draftReviewResponse: (reviewId, tone)      => api.post('/owner/ai/review-response', { reviewId, tone }, { timeout: AI_TIMEOUT }),

  // Public endpoint (no auth required)
  visitorGuide:        (museumId, question, lang) =>
    api.post('/public/ai/visitor-guide', { museumId, question, lang }, { timeout: AI_TIMEOUT }),
};

// ── Visitor Auth APIs (public — no auth required) ──
export const visitorAuthAPI = {
  register: (data)    => api.post('/visitor/auth/register', data),
  login:    (data)    => api.post('/visitor/auth/login', data),
  google:   (data)    => api.post('/visitor/auth/google', data),
};

// ── Create visitor-authenticated axios instance ──
const visitorApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

visitorApi.interceptors.request.use(
  (config) => {
    const visitorToken = localStorage.getItem('visitorToken');
    if (visitorToken) config.headers.Authorization = `Bearer ${visitorToken}`;
    return config;
  },
  (error) => Promise.reject(error)
);

visitorApi.interceptors.response.use(
  (response) => response.data,
  (error) => {
    let message = 'Something went wrong!';
    if (error.response) {
      message = error.response.data?.message || error.response.statusText || message;
      if (error.response.status === 401 || error.response.status === 403) {
        localStorage.removeItem('visitorToken');
        localStorage.removeItem('visitorData');
        message = 'Session expired. Please log in again.';
      }
    } else if (error.request) {
      message = 'Cannot connect to server. Please check your connection.';
    }
    return Promise.reject({ message, original: error });
  }
);

// ── Visitor Ticket APIs (require VISITOR JWT) ──
export const visitorTicketAPI = {
  getMyTickets:      (params) => visitorApi.get('/visitor/tickets', { params }),
  getTicketDetail:   (id)     => visitorApi.get(`/visitor/tickets/${id}`),
  getCancellable:    ()       => visitorApi.get('/visitor/tickets/cancellable'),
  cancelTicket:      (id)     => visitorApi.post(`/visitor/tickets/${id}/cancel`),
  rescheduleTicket:  (id, data) => visitorApi.post(`/visitor/tickets/${id}/reschedule`, data),
  getByPublicToken:  (token)  => api.get(`/visitor/tickets/by-token/${token}`),
};

// ── Visitor Profile APIs (require VISITOR JWT) ──
export const visitorProfileAPI = {
  getProfile:    () => visitorApi.get('/visitor/auth/me'),
  updateProfile: (data) => visitorApi.put('/visitor/auth/me', data),
};

// ── Visitor Review APIs ──
export const visitorReviewAPI = {
  getMyReviews:      () => visitorApi.get('/visitor/reviews'),
  updateReview:      (id, data) => visitorApi.put(`/visitor/reviews/${id}`, data),
  getReviewsByEmail: (email) => api.get('/public/museums/visitor-reviews', { params: { email } }),
  updateReviewPublic:(id, data) => api.put(`/public/museums/reviews/${id}`, data),
};

export default api;

