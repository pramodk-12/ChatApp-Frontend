import React, { useState } from "react";

const Login = ({ onLogin }) => {
  const [form, setForm] = useState({ username: "", password: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Replace with your actual /auth/login call
    const response = await fetch("http://localhost:8080/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    if (data.token) onLogin(data);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white/95 p-10 shadow-2xl backdrop-blur-sm">
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tight text-indigo-600">
            CHATLY
          </h1>
          <p className="mt-2 text-slate-500">Sign in to start messaging</p>
        </div>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <input
            type="text"
            placeholder="Username"
            required
            className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 outline-none ring-indigo-500 focus:ring-2"
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
          <input
            type="password"
            placeholder="Password"
            required
            className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 outline-none ring-indigo-500 focus:ring-2"
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <button className="w-full rounded-xl bg-indigo-600 py-3 font-bold text-white transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-95">
            Join Chatroom
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
