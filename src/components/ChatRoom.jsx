import React, { useState, useRef, useEffect } from "react";
import { useStomp } from "../hooks/stompService";
import { Send, LogOut, Trash2 } from "lucide-react";
import PresenceList from "./PresenceList";

const ChatRoom = ({ auth, onLogout }) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef();

  // Static chatId for now, can be passed as prop later
  const chatId = 1;

  // 1. Fetch Chat History on Component Load
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(
          `http://localhost:8080/api/messages/${chatId}?limit=30`,
          {
            headers: {
              Authorization: `Bearer ${auth.token}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (response.ok) {
          const history = await response.json();
          // Backend returns newest first; reverse so oldest is at top
          setMessages(history.reverse());
        }
      } catch (err) {
        console.error("Failed to load history:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [auth.token]);

  // 2. Real-time Subscriptions using useStomp
  const { sendMessage, disconnect } = useStomp(auth.token, (stompClient) => {
    // Subscribe to Live Messages & Deletions
    stompClient.subscribe(`/topic/chats/${chatId}`, (msg) => {
      const data = JSON.parse(msg.body);

      if (data.type === "DELETE_MESSAGE") {
        setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
      } else {
        setMessages((prev) => [...prev, data]);
      }
    });

    // Subscribe to Presence Updates
    stompClient.subscribe("/topic/presence", (msg) => {
      const data = JSON.parse(msg.body);
      setOnlineUsers(data);
    });

    // Subscribe to Typing Indicators
    stompClient.subscribe(`/topic/chats/${chatId}/typing`, (msg) => {
      const data = JSON.parse(msg.body);
      if (data.username !== auth.username) {
        setTypingUser(data.isTyping ? data.username : null);
      }
    });
  });

  // 3. Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 4. Heartbeat Logic
  useEffect(() => {
    if (!auth?.token) return;
    const heartbeatInterval = setInterval(() => {
      // Note: adjust the heartbeat destination if you renamed your controller path
      sendMessage("/app/heartbeat", {});
    }, 45000);
    return () => clearInterval(heartbeatInterval);
  }, [auth, sendMessage]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(`/app/chat/${chatId}/send`, { content: input });
    setInput("");
    sendMessage(`/app/chat/${chatId}/typing`, {
      isTyping: false,
      username: auth.username,
    });
  };

  const handleTyping = (isTyping) => {
    sendMessage(`/app/chat/${chatId}/typing`, {
      isTyping,
      username: auth.username,
    });
  };

  const handleDelete = async (messageId) => {
    try {
      await fetch(
        `http://localhost:8080/api/chats/${chatId}/messages/${messageId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleLogoutClick = () => {
    disconnect();
    onLogout();
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="hidden w-72 flex-col bg-white border-r md:flex shadow-xl">
        <div className="p-6 border-b flex justify-between items-center bg-indigo-50/50">
          <h2 className="text-xl font-bold text-indigo-700">Contacts</h2>
          <button
            onClick={handleLogoutClick}
            className="text-slate-400 hover:text-red-500 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <PresenceList onlineUsers={onlineUsers} />
        </div>
        <div className="mt-auto p-4 border-t bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
              {auth.username?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-slate-800 truncate">
                {auth.username}
              </p>
              <p className="text-[10px] text-slate-500">ID: #{auth.id}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat */}
      <main className="flex flex-1 flex-col shadow-2xl">
        <header className="flex h-16 items-center justify-between border-b bg-white px-8">
          <div>
            <h3 className="font-bold text-slate-800">
              Public Chatroom #{chatId}
            </h3>
            {typingUser && (
              <p className="text-[10px] italic text-indigo-500 animate-bounce">
                {typingUser} is typing...
              </p>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 relative">
          {messages.map((m, i) => {
            const isMe = m.senderId === auth.id;
            const time = m.timestamp
              ? new Date(m.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "";

            return (
              <div
                key={m.id || i}
                className={`group flex ${
                  isMe ? "justify-end" : "justify-start"
                } items-end gap-2`}
              >
                <div
                  className={`relative max-w-[70%] rounded-2xl px-4 py-2 shadow-sm transition-all ${
                    isMe
                      ? "bg-indigo-600 text-white rounded-br-none"
                      : "bg-white text-slate-800 rounded-bl-none border border-slate-200"
                  }`}
                >
                  {!isMe && (
                    <p className="text-[10px] font-bold uppercase opacity-50 mb-1">
                      {m.senderName}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed">{m.content}</p>
                  <p
                    className={`text-[9px] mt-1 text-right ${
                      isMe ? "text-indigo-200" : "text-slate-400"
                    }`}
                  >
                    {time}
                  </p>

                  {/* Delete Button - Visible on Hover for your own messages */}
                  {isMe && !m.isDeleted && (
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 transition-all bg-white rounded-full shadow-sm border border-slate-100"
                      title="Delete message"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
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
            className="flex-1 rounded-xl bg-slate-100 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            placeholder="Write something..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => handleTyping(true)}
            onBlur={() => handleTyping(false)}
          />
          <button
            type="submit"
            className="rounded-xl bg-indigo-600 p-3 text-white hover:bg-indigo-700 shadow-md transition-all active:scale-90 disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </form>
      </main>
    </div>
  );
};

export default ChatRoom;
