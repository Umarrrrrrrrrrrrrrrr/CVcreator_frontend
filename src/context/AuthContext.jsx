import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Check if user is logged in from localStorage
    return localStorage.getItem('isAuthenticated') === 'true';
  });
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [isPremium, setIsPremium] = useState(() => {
    // Check if user has premium access
    return localStorage.getItem('isPremium') === 'true';
  });

  const login = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setIsPremium(false);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
    localStorage.removeItem('isPremium');
  };

  const upgradeToPremium = () => {
    setIsPremium(true);
    localStorage.setItem('isPremium', 'true');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, isPremium, upgradeToPremium }}>
      {children}
    </AuthContext.Provider>
  );
};
