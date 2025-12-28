import React, { useState } from 'react';
import Login from './components/Login';
import ChatRoom from './components/ChatRoom';

const App = () => {
    const [auth, setAuth] = useState(() => {
        const saved = localStorage.getItem('chat_auth');
        return saved ? JSON.parse(saved) : null;
    });

    const handleLogin = (data) => {
        localStorage.setItem('chat_auth', JSON.stringify(data));
        setAuth(data);
    };

    const handleLogout = () => {
        localStorage.removeItem('chat_auth');
        setAuth(null);
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
            {!auth ? (
                <Login onLogin={handleLogin} />
            ) : (
                <ChatRoom auth={auth} onLogout={handleLogout} />
            )}
        </div>
    );
};

export default App;