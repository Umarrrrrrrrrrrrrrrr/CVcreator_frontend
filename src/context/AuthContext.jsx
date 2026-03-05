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

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [isPremium, setIsPremium] = useState(() => {
    return localStorage.getItem('isPremium') === 'true';
  });
  const [isGuest, setIsGuest] = useState(() => {
    return sessionStorage.getItem(GUEST_KEY) === 'true';
  });

  const login = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
    setIsGuest(false);
    sessionStorage.removeItem(GUEST_KEY);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setIsPremium(false);
    setIsGuest(false);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
    localStorage.removeItem('isPremium');
    sessionStorage.removeItem(GUEST_KEY);
  };

  const enableGuestMode = () => {
    setIsGuest(true);
    sessionStorage.setItem(GUEST_KEY, 'true');
  };

  const upgradeToPremium = () => {
    setIsPremium(true);
    localStorage.setItem('isPremium', 'true');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, isPremium, upgradeToPremium, isGuest, enableGuestMode }}>
      {children}
    </AuthContext.Provider>
  );
};
