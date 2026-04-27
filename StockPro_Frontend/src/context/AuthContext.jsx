import axios from "axios";
import { createContext, useContext, useEffect, useState } from "react";
import { clearPersistentStore } from "../hooks/usePersistentState";
import { API_ROUTES, PUBLIC_SIGNUP_ROLES} from "../lib/constants";
import { clearStoredToken, getStoredToken, setStoredToken } from "../lib/storage";
import { extractApiMessage } from "../lib/utils";

const AuthContext = createContext(null);

function sanitizePublicRole(role) {
  return PUBLIC_SIGNUP_ROLES.includes(role) ? role : "STAFF";
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken());
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  async function fetchProfile(activeToken = token) {
    const response = await axios.get(API_ROUTES.auth.profile, { headers: { Authorization: `Bearer ${activeToken}` } });

    const profile = response.data;
    setUser(profile);
    return profile;
  }

  function clearSession() {
    clearStoredToken();
    setToken("");
    setUser(null);
  }

  async function login(credentials) {
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
  }

  async function register(payload) {
    try {
      const request = {
        ...payload,
        role: sanitizePublicRole(payload.role),
      };

      return await axios.post(API_ROUTES.auth.register, request, { headers: { Authorization: `Bearer ${token}` } });
    } catch (error) {
      throw new Error(extractApiMessage(error));
    }
  }

  async function createUser(payload) {
    try {
      return await axios.post(API_ROUTES.auth.register, payload, { headers: { Authorization: `Bearer ${token}` } });
    } catch (error) {
      throw new Error(extractApiMessage(error));
    }
  }

  async function updateProfile(payload) {
    try {
      await axios.put(API_ROUTES.auth.profile, payload, { headers: { Authorization: `Bearer ${token}` } });
      return await fetchProfile();
    } catch (error) {
      throw new Error(extractApiMessage(error));
    }
  }

  async function changePassword(payload) {
    try {
      await axios.put(API_ROUTES.auth.password, payload, { headers: { Authorization: `Bearer ${token}` } });
    } catch (error) {
      throw new Error(extractApiMessage(error));
    }
  }

  async function refreshSession() {
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
  }

  async function logout() {
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
  }

  useEffect(() => {
    async function bootstrap() {
      if (!token) {
        setBooting(false);
        return;
      }

      try {
        await fetchProfile(token);
      } catch {
        clearSession();
      } finally {
        setBooting(false);
      }
    }

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
        register,
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
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
