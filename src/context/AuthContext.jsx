import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem('envision_session');
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  function login() {
    sessionStorage.setItem('envision_session', Date.now().toString());
    setIsAuthenticated(true);
  }

  function logout() {
    sessionStorage.removeItem('envision_session');
    setIsAuthenticated(false);
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
