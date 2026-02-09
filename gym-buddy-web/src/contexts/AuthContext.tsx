import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiRequest } from "@/lib/api";

const TOKEN_KEY = "gymbuddy_token";

type AuthContextType = {
  token: string | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

async function exchangeFirebaseToken(idToken: string): Promise<string> {
  const data = await apiRequest<{ token: string }>("/auth/firebase-token/", {
    method: "POST",
    body: { id_token: idToken },
    token: undefined,
  });
  return data.token;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthError(null);
      if (user) {
        try {
          const idToken = await user.getIdToken();
          const djangoToken = await exchangeFirebaseToken(idToken);
          localStorage.setItem(TOKEN_KEY, djangoToken);
          setToken(djangoToken);
        } catch (err) {
          setToken(null);
          localStorage.removeItem(TOKEN_KEY);
          setAuthError(
            err instanceof Error ? err.message : "Could not connect to server. Is the API running?"
          );
        }
      } else {
        setToken(null);
        localStorage.removeItem(TOKEN_KEY);
      }
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await firebaseSignOut(auth);
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        firebaseUser,
        isLoading,
        authError,
        clearAuthError: () => setAuthError(null),
        login,
        signUp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
