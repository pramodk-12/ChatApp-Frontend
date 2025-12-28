import React, { useState, useRef, useEffect } from "react";
import { useStomp } from "../hooks/stompService";
import { Send, LogOut, Circle } from "lucide-react";
import PresenceList from "./PresenceList";

const ChatRoom = ({ auth, onLogout }) => {
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef();

  // Use our custom hook
  const { sendMessage, disconnect } = useStomp(auth.token, (stompClient) => {
    // 1. Subscribe to Chat
    stompClient.subscribe("/topic/chats/1", (msg) => {
      setMessages((prev) => [...prev, JSON.parse(msg.body)]);
    });

    // 2. Subscribe to Presence
    stompClient.subscribe("/topic/presence", (msg) => {
      const data = JSON.parse(msg.body);
      console.log("Presence Update Received:", data);
      setOnlineUsers(data);
    });

    // 3. Subscribe to Typing
    stompClient.subscribe("/topic/chats/1/typing", (msg) => {
      const data = JSON.parse(msg.body);
      if (data.username !== auth.username) {
        setTypingUser(data.isTyping ? data.username : null);
      }
    });
  });

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!auth?.token) return;

    // Send a heartbeat every 45 seconds to keep the Redis key alive
    const heartbeatInterval = setInterval(() => {
      if (stompClient.current?.connected) {
        stompClient.current.publish({
          destination: "/app/heartbeat",
          body: JSON.stringify({ userId: auth.userId }),
        });
      }
    }, 45000);

    return () => clearInterval(heartbeatInterval);
  }, [auth]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage("/app/chat/1/send", { content: input });
    setInput("");
    sendMessage("/app/chat/1/typing", {
      isTyping: false,
      username: auth.username,
    });
  };

  const handleTyping = (isTyping) => {
    sendMessage("/app/chat/1/typing", { isTyping, username: auth.username });
  };

  const handleLogoutClick = () => {
    disconnect();
    onLogout();
  };

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar: Online Users */}
      <aside className="hidden w-72 flex-col bg-white border-r md:flex">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-indigo-600">Active Now</h2>
          <button
            onClick={handleLogoutClick}
            className="text-slate-400 hover:text-red-500"
          >
            <LogOut size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <PresenceList onlineUsers={onlineUsers} />
        </div>
      </aside>

      {/* Main Chat Container */}
      <main className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-white px-8">
          <h3 className="font-bold text-slate-800">Public Chatroom #1</h3>
          {typingUser && (
            <p className="text-sm italic text-indigo-500 animate-pulse">
              {typingUser} is typing...
            </p>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
          {messages.map((m, i) => {
            const isMe = m.senderId === auth.userId;
            return (
              <div
                key={i}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${
                    isMe
                      ? "bg-indigo-600 text-white rounded-tr-none"
                      : "bg-white text-slate-800 rounded-tl-none border"
                  }`}
                >
                  {!isMe && (
                    <p className="text-[10px] font-bold uppercase opacity-50 mb-1">
                      {m.senderName}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed">{m.content}</p>
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>

        <form
          onSubmit={handleSend}
          className="bg-white p-4 border-t flex gap-3"
        >
          <input
            className="flex-1 rounded-xl bg-slate-100 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => handleTyping(true)}
            onBlur={() => handleTyping(false)}
          />
          <button className="rounded-xl bg-indigo-600 p-3 text-white hover:bg-indigo-700 shadow-md transition-transform active:scale-90">
            <Send size={20} />
          </button>
        </form>
      </main>
    </div>
  );
};

export default ChatRoom;
