import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import API_CONFIG, { getApiUrl, fetchWithAuth } from '../config/api';

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
const PREMIUM_KEY = 'isPremium'; // NRS 250 - Premium templates
const USE_IN_TEMPLATE_KEY = 'useInTemplateAccess'; // NRS 500 - Use in Template feature

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
    return localStorage.getItem(PREMIUM_KEY) === 'true';
  });
  const [useInTemplateAccess, setUseInTemplateAccess] = useState(() => {
    return localStorage.getItem(USE_IN_TEMPLATE_KEY) === 'true';
  });
  const [isGuest, setIsGuest] = useState(() => {
    return sessionStorage.getItem(GUEST_KEY) === 'true';
  });

  // Sync isPremium and useInTemplateAccess from localStorage on mount and when tab gains focus
  useEffect(() => {
    const syncAccess = () => {
      const storedPremium = localStorage.getItem(PREMIUM_KEY) === 'true';
      const storedUseInTemplate = localStorage.getItem(USE_IN_TEMPLATE_KEY) === 'true';
      setIsPremium((prev) => (storedPremium ? true : prev));
      setUseInTemplateAccess((prev) => (storedUseInTemplate ? true : prev));
    };
    syncAccess();
    window.addEventListener('focus', syncAccess);
    return () => window.removeEventListener('focus', syncAccess);
  }, []);

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
    setUseInTemplateAccess(false);
    setIsGuest(false);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(PREMIUM_KEY);
    localStorage.removeItem(USE_IN_TEMPLATE_KEY);
    sessionStorage.removeItem(GUEST_KEY);
  };

  const getAccessToken = () => localStorage.getItem(TOKEN_KEY) || accessToken;

  const enableGuestMode = () => {
    setIsGuest(true);
    sessionStorage.setItem(GUEST_KEY, 'true');
  };

  const upgradeToPremium = useCallback(() => {
    setIsPremium(true);
    localStorage.setItem(PREMIUM_KEY, 'true');
  }, []);

  const upgradeUseInTemplate = useCallback(() => {
    setUseInTemplateAccess(true);
    localStorage.setItem(USE_IN_TEMPLATE_KEY, 'true');
  }, []);

  /** Re-fetch profile from API (updates is_staff / is_superuser after backend changes). */
  const refreshUserProfile = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    try {
      const res = await fetchWithAuth(getApiUrl(API_CONFIG.ENDPOINTS.PROFILE), {
        method: 'GET',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.user) return null;
      const u = data.user;
      setUser((prev) => {
        const merged = {
          ...prev,
          ...u,
          full_name: u.full_name ?? prev?.full_name,
          profile_photo_url: u.profile_photo_url ?? prev?.profile_photo_url,
          is_staff: u.is_staff === true,
          is_superuser: u.is_superuser === true,
        };
        localStorage.setItem('user', JSON.stringify(merged));
        return merged;
      });
      return data.user;
    } catch {
      return null;
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      isAuthenticated, user, login, logout,
      isPremium, upgradeToPremium,
      useInTemplateAccess, upgradeUseInTemplate,
      isGuest, enableGuestMode, getAccessToken,
      refreshUserProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
