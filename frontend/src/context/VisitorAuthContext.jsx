import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const VisitorAuthContext = createContext(null);

export const useVisitorAuth = () => {
  const context = useContext(VisitorAuthContext);
  if (!context) throw new Error('useVisitorAuth must be used within VisitorAuthProvider');
  return context;
};

export const VisitorAuthProvider = ({ children }) => {
  const [visitor, setVisitor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem('visitorToken'));

  // Load profile on mount if token exists
  useEffect(() => {
    if (token) {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const storedData = localStorage.getItem('visitorData');
      if (storedData) {
        setVisitor(JSON.parse(storedData));
      }
    } catch (e) {
      console.error('Failed to load visitor profile:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/visitor/auth/login', { email, password });
    const data = res.data || res;
    saveAuth(data);
    return data;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const res = await api.post('/visitor/auth/register', { name, email, password });
    const data = res.data || res;
    saveAuth(data);
    return data;
  }, []);

  const googleAuth = useCallback(async (idToken) => {
    const res = await api.post('/visitor/auth/google', { idToken });
    const data = res.data || res;
    saveAuth(data);
    return data;
  }, []);

  const updateProfile = useCallback(async (updateData) => {
    const res = await api.put('/visitor/auth/me', updateData, {
      headers: { Authorization: `Bearer ${localStorage.getItem('visitorToken')}` }
    });
    const data = res.data || res;
    const updatedVisitor = { ...visitor, ...data };
    setVisitor(updatedVisitor);
    localStorage.setItem('visitorData', JSON.stringify(updatedVisitor));
    return data;
  }, [visitor]);

  const saveAuth = useCallback((data) => {
    const visitorData = {
      id: data.visitorId,
      email: data.email,
      name: data.name || data.displayName,
      displayName: data.displayName,
      avatarUrl: data.avatarUrl,
      authProvider: data.authProvider,
    };
    setVisitor(visitorData);
    setToken(data.token);
    localStorage.setItem('visitorToken', data.token);
    localStorage.setItem('visitorData', JSON.stringify(visitorData));
  }, []);

  const logout = useCallback(() => {
    setVisitor(null);
    setToken(null);
    localStorage.removeItem('visitorToken');
    localStorage.removeItem('visitorData');
  }, []);

  const isAuthenticated = !!visitor && !!token;

  const value = {
    visitor,
    token,
    loading,
    isAuthenticated,
    login,
    register,
    googleAuth,
    updateProfile,
    logout,
  };

  return (
    <VisitorAuthContext.Provider value={value}>
      {children}
    </VisitorAuthContext.Provider>
  );
};

export default VisitorAuthContext;
