import React, { useState } from "react";
import Login from "./components/Login";
import Register from "./components/Register"; // Ensure you created this file from the previous step
import ChatRoom from "./components/ChatRoom";
import { Toaster } from "sonner";
const App = () => {
  // Check localStorage on load to keep user logged in
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem("chat_auth");
    return saved ? JSON.parse(saved) : null;
  });

  // State to toggle between 'login' and 'register' views
  const [view, setView] = useState("login");

  const handleLogin = (data) => {
    localStorage.setItem("chat_auth", JSON.stringify(data));
    setAuth(data);
  };

  const handleLogout = () => {
    localStorage.removeItem("chat_auth");
    setAuth(null);
    setView("login"); // Reset view on logout
  };

  // 1. If Logged In -> Show ChatRoom
  if (auth) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
        <Toaster position="top-center" richColors />
        <ChatRoom auth={auth} onLogout={handleLogout} />
      </div>
    );
  }

  // 2. If Not Logged In -> Toggle between Register and Login
  if (view === "register") {
    return (
      <>
        <Toaster position="top-center" richColors />
        <Register onSwitchToLogin={() => setView("login")} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      <Toaster position="top-center" richColors />
      <Login
        onLogin={handleLogin}
        onSwitchToRegister={() => setView("register")}
      />
    </div>
  );
};

export default App;
