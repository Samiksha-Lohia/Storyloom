import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => api.auth.getCurrentUser());
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!api.auth.isAuthenticated()) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const freshUser = await api.auth.me();
      setUser(freshUser);
      return freshUser;
    } catch (err) {
      console.warn('Failed to refresh user profile:', err.message);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email, password) => {
    const data = await api.auth.login(email, password);
    setUser(data.user);
    return data;
  };

  const register = async (nameOrPayload, email, password, options = {}) => {
    const data = await api.auth.register(nameOrPayload, email, password, options);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    await api.auth.logout();
    setUser(null);
  };

  const value = {
    user,
    role: user?.role || null,
    status: user?.status || null,
    isAuthenticated: !!user && api.auth.isAuthenticated(),
    loading,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
