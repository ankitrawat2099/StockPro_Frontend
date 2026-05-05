import axios from "axios";
import { createContext, useContext, useEffect, useState } from "react";
import { clearPersistentStore } from "../hooks/usePersistentState";
import { API_ROUTES } from "../lib/constants";
import { clearStoredToken, getStoredToken, setStoredToken } from "../lib/storage";
import { extractApiMessage } from "../lib/utils";

export const AuthContext = createContext(null);


export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(getStoredToken());
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  const fetchProfile = async (activeToken) => {
    const response = await axios.get(API_ROUTES.auth.profile, {
      headers: { Authorization: `Bearer ${activeToken ? activeToken : token}` },
    });

    const profile = response.data;
    setUser(profile);
    return profile;
  };

  const clearSession = () => {
    clearStoredToken();
    setToken("");
    setUser(null);
  };

  const login = async (credentials) => {
    try {
      const response = await axios.post(API_ROUTES.auth.login, credentials);
      const nextToken = response.data?.token || response.data?.Token;

      setStoredToken(nextToken);
      setToken(nextToken);
      clearPersistentStore();

      return await fetchProfile(nextToken);
    } catch (error) {
      throw new Error(extractApiMessage(error));
    }
  };


  const createUser = async (payload) => {
    try {
      return await axios.post(API_ROUTES.auth.register, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      throw new Error(extractApiMessage(error));
    }
  };

  const updateProfile = async (payload) => {
    try {
      await axios.put(API_ROUTES.auth.profile, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return await fetchProfile();
    } catch (error) {
      throw new Error(extractApiMessage(error));
    }
  };

  const changePassword = async (payload) => {
    try {
      await axios.put(API_ROUTES.auth.password, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      throw new Error(extractApiMessage(error));
    }
  };

  const refreshSession = async () => {
    try {
      if (!token) {
        throw new Error("No active session to refresh.");
      }

      const response = await axios.post(API_ROUTES.auth.refresh, JSON.stringify(token), {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const nextToken = response.data?.token || response.data?.Token;

      setStoredToken(nextToken);
      setToken(nextToken);

      return await fetchProfile(nextToken);
    } catch (error) {
      throw new Error(extractApiMessage(error));
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await axios.post(API_ROUTES.auth.logout, JSON.stringify(token), {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
      }
    } catch {
      // The local session should still clear even if the backend logout is a no-op.
    } finally {
      clearSession();
      clearPersistentStore();
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setBooting(false);
        return;
      }

      try {
        await fetchProfile();
      } catch {
        clearSession();
      } finally {
        setBooting(false);
      }
    };

    bootstrap();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        booting,
        isAuthenticated: Boolean(token),
        login,
        createUser,
        updateProfile,
        changePassword,
        refreshSession,
        logout,
        clearSession,
        refreshProfile: fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
