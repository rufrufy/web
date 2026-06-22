"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/types";
import { api } from "@/lib/api";

interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (token: string, user: User, persist?: boolean) => void;
  logout: () => void;
  saveCreds: (
    username: string,
    password: string,
    deviceId: string
  ) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = "sadewa_session";
const CREDS_KEY = "sadewa_creds";

interface StoredSession {
  token: string;
  user: User;
}

interface StoredCreds {
  username: string;
  password: string;
  deviceId: string;
}

function readSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

function readCreds(): StoredCreds | null {
  try {
    const raw = localStorage.getItem(CREDS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredCreds;
  } catch {
    return null;
  }
}

async function validateToken(
  token: string,
  user: User
): Promise<boolean> {
  try {
    await api.home(token, user.nip, user.opd, user.kode_opd);
    return true;
  } catch {
    return false;
  }
}

async function relogin(creds: StoredCreds): Promise<StoredSession | null> {
  try {
    const res = await api.login(
      creds.username,
      creds.password,
      creds.deviceId
    );
    if (res.success && res.token && res.user) {
      const session: StoredSession = { token: res.token, user: res.user };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return session;
    }
  } catch {
    void 0;
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    loading: true,
  });
  const reloginLock = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const session = readSession();

      if (!session) {
        const creds = readCreds();
        if (creds && !reloginLock.current) {
          reloginLock.current = true;
          const newSession = await relogin(creds);
          reloginLock.current = false;
          if (newSession && !cancelled) {
            setState({
              token: newSession.token,
              user: newSession.user,
              loading: false,
            });
            return;
          }
        }
        if (!cancelled) {
          setState({ token: null, user: null, loading: false });
        }
        return;
      }

      const valid = await validateToken(session.token, session.user);
      if (cancelled) return;

      if (valid) {
        setState({
          token: session.token,
          user: session.user,
          loading: false,
        });
        return;
      }

      const creds = readCreds();
      if (creds && !reloginLock.current) {
        reloginLock.current = true;
        const newSession = await relogin(creds);
        reloginLock.current = false;
        if (newSession && !cancelled) {
          setState({
            token: newSession.token,
            user: newSession.user,
            loading: false,
          });
          return;
        }
      }

      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(CREDS_KEY);
      if (!cancelled) {
        setState({ token: null, user: null, loading: false });
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handler = async () => {
      const creds = readCreds();
      if (creds && !reloginLock.current) {
        reloginLock.current = true;
        const newSession = await relogin(creds);
        reloginLock.current = false;
        if (newSession) {
          setState({
            token: newSession.token,
            user: newSession.user,
            loading: false,
          });
          return;
        }
      }
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(CREDS_KEY);
      setState({ token: null, user: null, loading: false });
      router.push("/login");
    };
    window.addEventListener("unauthenticated", handler);
    return () => window.removeEventListener("unauthenticated", handler);
  }, [router]);

  const login = useCallback(
    (token: string, user: User, persist = true) => {
      const session: StoredSession = { token, user };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      setState({ token, user, loading: false });
    },
    []
  );

  const saveCreds = useCallback(
    (username: string, password: string, deviceId: string) => {
      const creds: StoredCreds = { username, password, deviceId };
      localStorage.setItem(CREDS_KEY, JSON.stringify(creds));
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(CREDS_KEY);
    setState({ token: null, user: null, loading: false });
    router.push("/login");
  }, [router]);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    saveCreds,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue & {
  saveCreds: (
    username: string,
    password: string,
    deviceId: string
  ) => void;
} {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx as AuthContextValue & {
    saveCreds: (
      username: string,
      password: string,
      deviceId: string
    ) => void;
  };
}
