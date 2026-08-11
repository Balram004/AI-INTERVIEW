import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:5000/api/auth" });

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handle = async () => {
    if (!form.email || !form.password) return setError("Fill all fields");
    if (mode === "register" && !form.name) return setError("Enter your name");
    setLoading(true); setError("");
    try {
      const endpoint = mode === "login" ? "/login" : "/register";
      const payload = mode === "login"
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password };
      const { data } = await API.post(endpoint, payload);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/home");
    } catch (e) {
      setError(e.response?.data?.error || "Something went wrong");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono px-4 py-1.5 rounded-full mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            AI Interview Coach
          </div>
          <h1 className="text-3xl font-bold">{mode === "login" ? "Welcome back 👋" : "Create account"}</h1>
          <p className="text-gray-400 text-sm mt-2">
            {mode === "login" ? "Sign in to track your progress" : "Start your interview preparation"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">{error}</div>}

          {mode === "register" && (
            <div>
              <label className="text-sm font-semibold text-gray-300 block mb-2">Full Name</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-cyan-500"
                placeholder="Balram Singh Tomar"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
          )}

          <div>
            <label className="text-sm font-semibold text-gray-300 block mb-2">Email</label>
            <input
              type="email"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-cyan-500"
              placeholder="balram@email.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              onKeyDown={e => e.key === "Enter" && handle()}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-300 block mb-2">Password</label>
            <input
              type="password"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-cyan-500"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              onKeyDown={e => e.key === "Enter" && handle()}
            />
          </div>

          <button
            onClick={handle}
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-sm transition-all disabled:opacity-50 mt-2"
          >
            {loading ? "Please wait..." : mode === "login" ? "Sign In →" : "Create Account →"}
          </button>

          <p className="text-center text-sm text-gray-500">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              className="text-cyan-400 font-semibold hover:underline"
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
