import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { VisitorAuthProvider } from './context/VisitorAuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import RegisterMuseum from './pages/RegisterMuseum';
import MuseumChatbot from './pages/MuseumChatbot';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import MuseumProfile from './pages/MuseumProfile';
import VisitorRegister from './pages/VisitorRegister';
import MyTickets from './pages/MyTickets';
import TicketDetail from './pages/TicketDetail';
import TicketCancellation from './pages/TicketCancellation';
import VisitorSettings from './pages/VisitorSettings';
import TicketReschedule from './pages/TicketReschedule';
import VisitorRoute from './components/visitor/VisitorRoute';

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <VisitorAuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#f9fafb',
                color: '#374151',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                fontSize: '14px',
                fontWeight: '500'
              },
              success: {
                duration: 3000,
                style: {
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#166534'
                },
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#f0fdf4',
                },
              },
              error: {
                duration: 4000,
                style: {
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b'
                },
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fef2f2',
                },
              },
              loading: {
                style: {
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#1e40af'
                },
              },
            }}
          />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/museums/:slug" element={<MuseumProfile />} />
            <Route path="/register-museum" element={<RegisterMuseum />} />
            <Route path="/chatbot" element={<MuseumChatbot />} />
            <Route path="/museum/:id" element={<MuseumChatbot />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />

            {/* Unified Login */}
            <Route path="/login" element={<Login />} />
            {/* Keeping old paths as redirects or just aliases to Login for safety if you want, but I'll replace them directly */}
            <Route path="/admin-login" element={<Login />} />
            <Route path="/visitor/login" element={<Login />} />

            <Route path="/visitor/register" element={<VisitorRegister />} />

            {/* Visitor protected routes */}
            <Route path="/visitor/tickets" element={<VisitorRoute><MyTickets /></VisitorRoute>} />
            <Route path="/visitor/tickets/:ticketId" element={<VisitorRoute><TicketDetail /></VisitorRoute>} />
            <Route path="/visitor/tickets/:ticketId/reschedule" element={<VisitorRoute><TicketReschedule /></VisitorRoute>} />
            <Route path="/visitor/cancellation" element={<VisitorRoute><TicketCancellation /></VisitorRoute>} />
            <Route path="/visitor/settings" element={<VisitorRoute><VisitorSettings /></VisitorRoute>} />
          </Routes>
        </div>
      </VisitorAuthProvider>
    </Router>
  );
}

export default App;
