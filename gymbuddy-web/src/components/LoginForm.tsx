import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginForm() {
  const { login, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter email and password");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        await signUp(email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full max-w-sm">
      <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Gym Buddy</h1>
      <p className="text-stone-500 -mt-2">Sign in to track your workouts</p>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition"
          placeholder="you@example.com"
          autoComplete="email"
          autoCapitalize="off"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition"
          placeholder="Password"
          autoComplete="current-password"
        />
      </div>
      {error && <p className="text-red-600 text-sm -mt-2">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {loading
          ? isSignUp
            ? "Creating account…"
            : "Signing in…"
          : isSignUp
          ? "Create account"
          : "Sign in"}
      </button>
      <button
        type="button"
        onClick={() => {
          setIsSignUp(!isSignUp);
          setError(null);
        }}
        className="text-sm text-stone-500 hover:text-stone-700"
      >
        {isSignUp ? "Already have an account? Sign in" : "Create an account"}
      </button>
    </form>
  );
}
