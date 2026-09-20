import React, { createContext, useState, useEffect, useContext } from 'react';
import { saveToken, getToken, removeToken, saveUserData, getUserData, removeUserData } from '../utils/storage';
import { loginUser as apiLogin, registerUser as apiRegister, getMe as apiGetMe } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore authentication session from storage on app mount
  useEffect(() => {
    const loadStorageData = async () => {
      try {
        const storedToken = await getToken();
        const storedUser = await getUserData();

        if (storedToken) {
          setToken(storedToken);
          if (storedUser) setUser(storedUser);

          // Verify token validity with backend
          try {
            const meData = await apiGetMe();
            if (meData.success && meData.user) {
              setUser(meData.user);
              await saveUserData(meData.user);
            }
          } catch (err) {
            console.warn('Session verification failed, logging out:', err);
            await logout();
          }
        }
      } catch (e) {
        console.error('Error restoring auth session:', e);
      } finally {
        setLoading(false);
      }
    };

    loadStorageData();
  }, []);

  const login = async (email, password) => {
    const data = await apiLogin({ email, password });
    if (data.success && data.token) {
      setToken(data.token);
      setUser(data.user);
      await saveToken(data.token);
      await saveUserData(data.user);
      return { success: true };
    }
    return { success: false, message: data.message || 'Login failed' };
  };

  const register = async (userData) => {
    const data = await apiRegister(userData);
    if (data.success && data.token) {
      setToken(data.token);
      setUser(data.user);
      await saveToken(data.token);
      await saveUserData(data.user);
      return { success: true };
    }
    return { success: false, message: data.message || 'Registration failed' };
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    await removeToken();
    await removeUserData();
  };

  const updateUser = async (updatedUserData) => {
    setUser(updatedUserData);
    await saveUserData(updatedUserData);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
