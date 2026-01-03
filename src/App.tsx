import React, { useState } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import ChatRoom from "./components/ChatRoom";
import { Toaster } from "sonner";
import { UserAuth } from "./types";

// Define the valid views for the unauthenticated state
type AuthView = "login" | "register";

const App: React.FC = () => {
  // 🟢 Initialize auth state with our UserAuth type
  const [auth, setAuth] = useState<UserAuth | null>(() => {
    const saved = localStorage.getItem("chat_auth");
    if (saved) {
      try {
        return JSON.parse(saved) as UserAuth;
      } catch (e) {
        console.error("Failed to parse auth data", e);
        return null;
      }
    }
    return null;
  });

  // State to toggle between 'login' and 'register' views
  const [view, setView] = useState<AuthView>("login");

  const handleLogin = (data: UserAuth) => {
    localStorage.setItem("chat_auth", JSON.stringify(data));
    setAuth(data);
  };

  const handleLogout = () => {
    localStorage.removeItem("chat_auth");
    setAuth(null);
    setView("login"); // Reset view on logout
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      {/* 🟠 Global Toaster for notifications */}
      <Toaster position="top-center" richColors />

      {/* 🟢 ROUTING LOGIC */}
      {auth ? (
        // User is logged in
        <ChatRoom auth={auth} onLogout={handleLogout} />
      ) : view === "register" ? (
        // User is not logged in and chose Register
        <Register onSwitchToLogin={() => setView("login")} />
      ) : (
        // User is not logged in (Default view)
        <Login
          onLogin={handleLogin}
          onSwitchToRegister={() => setView("register")}
        />
      )}
    </div>
  );
};

export default App;