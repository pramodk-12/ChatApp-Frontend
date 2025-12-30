import React, { useState, useRef, useEffect } from "react";
import { useStomp } from "../hooks/stompService";
import { Send, LogOut, Trash2, Hash, MessageSquare } from "lucide-react";
import PresenceList from "./PresenceList";

const ChatRoom = ({ auth, onLogout }) => {
  const [activeChatId, setActiveChatId] = useState(null);
  const [myChats, setMyChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [input, setInput] = useState("");
  
  // We capture the client to manage subscriptions dynamically
  const [stompClient, setStompClient] = useState(null);
  const subscriptionRef = useRef(null);
  const scrollRef = useRef();

  // 1. Fetch My Chats List (Sidebar History)
  useEffect(() => {
    const fetchMyChats = async () => {
      try {
        const res = await fetch("http://localhost:8080/api/chats", {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMyChats(data);
          // Default to first chat if available and none selected
          if (data.length > 0 && !activeChatId) {
            setActiveChatId(data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load chats:", err);
      }
    };
    fetchMyChats();
  }, [auth.token]);

  // 2. Fetch Messages when Active Chat Changes
  useEffect(() => {
    if (!activeChatId) return;

    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `http://localhost:8080/api/messages/${activeChatId}?limit=30`,
          {
            headers: { Authorization: `Bearer ${auth.token}` },
          }
        );
        if (response.ok) {
          const history = await response.json();
          setMessages(history.reverse());
        }
      } catch (err) {
        console.error("Failed to load history:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
    // Clear typing indicator when switching chats
    setTypingUser(null);
  }, [activeChatId, auth.token]);

  // 3. Connect STOMP (Global Subscriptions)
  const { sendMessage, disconnect } = useStomp(auth.token, (client) => {
    setStompClient(client);

    // Global: Presence Updates
    client.subscribe("/topic/presence", (msg) => {
      setOnlineUsers(JSON.parse(msg.body));
    });
  });

  // 4. Manage Chat-Specific Subscription
  useEffect(() => {
    if (!stompClient || !activeChatId) return;

    // Unsubscribe from previous chat if exists
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    // Subscribe to new chat topic
    const sub = stompClient.subscribe(`/topic/chats/${activeChatId}`, (msg) => {
      const data = JSON.parse(msg.body);
      if (data.type === "DELETE_MESSAGE") {
        setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
      } else {
        setMessages((prev) => [...prev, data]);
      }
    });

    // Subscribe to typing for this chat
    const typingSub = stompClient.subscribe(
      `/topic/chats/${activeChatId}/typing`,
      (msg) => {
        const data = JSON.parse(msg.body);
        if (data.username !== auth.username) {
          setTypingUser(data.isTyping ? data.username : null);
        }
      }
    );

    subscriptionRef.current = sub;

    // Cleanup when chat changes or component unmounts
    return () => {
      if (sub) sub.unsubscribe();
      if (typingSub) typingSub.unsubscribe();
    };
  }, [activeChatId, stompClient, auth.username]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

  // Handlers
  const handleContactClick = async (targetUserId) => {
    if (targetUserId === auth.id) return;

    try {
      const res = await fetch(
        `http://localhost:8080/api/chats/private/${targetUserId}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );
      if (res.ok) {
        const chat = await res.json();
        // Add to myChats if not exists
        if (!myChats.find((c) => c.id === chat.id)) {
          setMyChats((prev) => [chat, ...prev]);
        }
        setActiveChatId(chat.id);
      }
    } catch (err) {
      console.error("Failed to start direct chat", err);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || !activeChatId) return;
    sendMessage(`/app/chat/${activeChatId}/send`, { content: input });
    setInput("");
    sendMessage(`/app/chat/${activeChatId}/typing`, {
      isTyping: false,
      username: auth.username,
    });
  };

  const handleTyping = (isTyping) => {
    if (!activeChatId) return;
    sendMessage(`/app/chat/${activeChatId}/typing`, {
      isTyping,
      username: auth.username,
    });
  };

  const handleDelete = async (messageId) => {
    try {
      await fetch(
        `http://localhost:8080/api/chats/${activeChatId}/messages/${messageId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  // Helper to get chat name (for Direct chats, show the other person's name if possible)
  // For simplicity, we just use chat.name for now.
  // In a real app, you'd filter chat.members to find the one that isn't 'me'.
  const getChatName = (chat) => {
     if(chat.type === 'DIRECT') return chat.name; // Ideally logic to show "Bob"
     return chat.name;
  }

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="hidden w-80 flex-col bg-white border-r md:flex shadow-xl z-10">
        <div className="p-4 border-b bg-indigo-50/50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-indigo-700">Chatly</h2>
          <button onClick={() => { disconnect(); onLogout(); }} className="text-slate-400 hover:text-red-500">
            <LogOut size={20} />
          </button>
        </div>

        {/* List 1: My Conversations */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">
              Conversations
            </h3>
            {myChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                  activeChatId === chat.id
                    ? "bg-indigo-600 text-white shadow-md"
                    : "hover:bg-slate-100 text-slate-700"
                }`}
              >
                <div className={`p-2 rounded-full ${activeChatId === chat.id ? "bg-white/20" : "bg-indigo-50 text-indigo-600"}`}>
                   {chat.type === 'DIRECT' ? <MessageSquare size={18} /> : <Hash size={18} />}
                </div>
                <div className="flex-1 overflow-hidden">
                    <p className="font-semibold truncate">{getChatName(chat)}</p>
                    <p className={`text-xs truncate ${activeChatId === chat.id ? "text-indigo-200" : "text-slate-400"}`}>
                        {chat.type}
                    </p>
                </div>
              </div>
            ))}
          </div>

          {/* List 2: Active Contacts */}
          <PresenceList onlineUsers={onlineUsers} onUserClick={handleContactClick} />
        </div>

        {/* User Profile Footer */}
        <div className="p-4 border-t bg-slate-50">
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

      {/* Main Chat Area */}
      <main className="flex flex-1 flex-col shadow-2xl relative">
        {!activeChatId ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            Select a chat to start messaging
          </div>
        ) : (
          <>
            <header className="flex h-16 items-center justify-between border-b bg-white px-8">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                   {myChats.find(c => c.id === activeChatId)?.type === 'DIRECT' ? <MessageSquare size={18}/> : <Hash size={18}/>}
                   {myChats.find(c => c.id === activeChatId)?.name || `Chat #${activeChatId}`}
                </h3>
                {typingUser && (
                  <p className="text-[10px] italic text-indigo-500 animate-bounce">
                    {typingUser} is typing...
                  </p>
                )}
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 relative">
              {isLoading && (
                 <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div></div>
              )}
              
              {messages.map((m, i) => {
                const isMe = m.senderId === auth.id;
                const time = m.timestamp
                  ? new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "";

                return (
                  <div key={m.id || i} className={`group flex ${isMe ? "justify-end" : "justify-start"} items-end gap-2`}>
                    <div className={`relative max-w-[70%] rounded-2xl px-4 py-2 shadow-sm transition-all ${
                        m.isDeleted ? "bg-slate-100 text-slate-400 italic border border-slate-200" :
                        (isMe ? "bg-indigo-600 text-white rounded-br-none" : "bg-white text-slate-800 rounded-bl-none border border-slate-200")
                    }`}>
                      {!isMe && (
                        <p className="text-[10px] font-bold uppercase opacity-50 mb-1">
                          {m.senderName}
                        </p>
                      )}
                      <p className="text-sm leading-relaxed">{m.isDeleted ? "This message was deleted" : m.content}</p>
                      <p className={`text-[9px] mt-1 text-right ${isMe && !m.isDeleted ? "text-indigo-200" : "text-slate-400"}`}>
                        {time}
                      </p>

                      {isMe && !m.isDeleted && (
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="opacity-0 group-hover:opacity-100 absolute -left-8 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-red-500 transition-all"
                          title="Delete"
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

            <form onSubmit={handleSend} className="bg-white p-4 border-t flex gap-3">
              <input
                className="flex-1 rounded-xl bg-slate-100 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder="Write something..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => handleTyping(true)}
                onBlur={() => handleTyping(false)}
              />
              <button type="submit" className="rounded-xl bg-indigo-600 p-3 text-white hover:bg-indigo-700 shadow-md transition-all active:scale-90">
                <Send size={20} />
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
};

export default ChatRoom;