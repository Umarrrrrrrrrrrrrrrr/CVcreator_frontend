import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const GUEST_KEY = 'isGuest';
const TOKEN_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [accessToken, setAccessToken] = useState(() => {
    return localStorage.getItem(TOKEN_KEY) || null;
  });
  const [isPremium, setIsPremium] = useState(() => {
    return localStorage.getItem('isPremium') === 'true';
  });
  const [isGuest, setIsGuest] = useState(() => {
    return sessionStorage.getItem(GUEST_KEY) === 'true';
  });

  const login = (userData, tokens = null) => {
    setIsAuthenticated(true);
    setUser(userData);
    setIsGuest(false);
    sessionStorage.removeItem(GUEST_KEY);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('user', JSON.stringify(userData));
    if (tokens) {
      setAccessToken(tokens.access);
      localStorage.setItem(TOKEN_KEY, tokens.access);
      if (tokens.refresh) localStorage.setItem(REFRESH_KEY, tokens.refresh);
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setAccessToken(null);
    setIsPremium(false);
    setIsGuest(false);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem('isPremium');
    sessionStorage.removeItem(GUEST_KEY);
  };

  const getAccessToken = () => localStorage.getItem(TOKEN_KEY) || accessToken;

  const enableGuestMode = () => {
    setIsGuest(true);
    sessionStorage.setItem(GUEST_KEY, 'true');
  };

  const upgradeToPremium = () => {
    setIsPremium(true);
    localStorage.setItem('isPremium', 'true');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, isPremium, upgradeToPremium, isGuest, enableGuestMode, getAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
};
