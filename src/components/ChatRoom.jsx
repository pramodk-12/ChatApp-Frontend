import React, { useState, useRef, useEffect } from "react";

import { useStomp } from "../hooks/stompService";

import {
  Send,
  LogOut,
  Trash2,
  Hash,
  MessageSquare,
  Users,
  MessageCircle,
  UserPlus,
  Paperclip,
  X,
  Camera,
} from "lucide-react";

import PresenceList from "./PresenceList";

import FriendList from "./FriendList";

import CreateGroupModal from "./CreateGroupModal";

const ChatRoom = ({ auth, onLogout }) => {
  const [showGroupModal, setShowGroupModal] = useState(false);

  const [activeChatId, setActiveChatId] = useState(null);

  const [myChats, setMyChats] = useState([]);

  const [messages, setMessages] = useState([]);

  const [onlineUsers, setOnlineUsers] = useState([]);

  const [isLoading, setIsLoading] = useState(false);

  const [typingUser, setTypingUser] = useState(null);

  const [input, setInput] = useState("");

  const [sidebarView, setSidebarView] = useState("chats"); // 'chats' | 'friends'

  const fileInputRef = useRef(null);

  const profileInputRef = useRef(null);

  const [isUploading, setIsUploading] = useState(false);

  const [preview, setPreview] = useState(null); // To show image before sending

  const [uploadedFileUrl, setUploadedFileUrl] = useState(null);

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

  // Trigger the hidden input

  const handleFileSelect = () => fileInputRef.current?.click();

  // Handle file selection and auto-upload

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    // 1. Show local preview immediately

    const objectUrl = URL.createObjectURL(file);

    setPreview(objectUrl);

    setIsUploading(true);

    // 2. Upload to Server

    const formData = new FormData();

    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8080/api/upload", {
        method: "POST",

        headers: { Authorization: `Bearer ${auth.token}` },

        body: formData,
      });

      if (res.ok) {
        const data = await res.json();

        setUploadedFileUrl(data.url); // Save the server URL

        setIsUploading(false);
      }
    } catch (err) {
      console.error("Upload failed", err);

      setIsUploading(false);

      setPreview(null);
    }
  };

  const handleProfileUpdate = async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    // 1. Upload Image to /api/upload

    const formData = new FormData();

    formData.append("file", file);

    try {
      const uploadRes = await fetch("http://localhost:8080/api/upload", {
        method: "POST",

        headers: { Authorization: `Bearer ${auth.token}` },

        body: formData,
      });

      if (uploadRes.ok) {
        const data = await uploadRes.json();

        const newAvatarUrl = data.url;

        // 2. Update User Profile in Backend

        const updateRes = await fetch("http://localhost:8080/api/users/me", {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",

            Authorization: `Bearer ${auth.token}`,
          },

          body: JSON.stringify({ avatarUrl: newAvatarUrl }),
        });

        if (updateRes.ok) {
          // 3. Update Local Storage & State so UI refreshes immediately

          const updatedUser = { ...auth, avatarUrl: newAvatarUrl };

          localStorage.setItem("chat_auth", JSON.stringify(updatedUser));

          // Force a page reload or update parent state to see changes

          window.location.reload();
        }
      }
    } catch (err) {
      console.error("Profile update failed", err);
    }
  };

  const clearAttachment = () => {
    setPreview(null);

    setUploadedFileUrl(null);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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
      console.error("Failed to start private chat", err);
    }
  };

  // Wrapper for FriendList to switch tabs after clicking a friend

  const handleFriendChatStart = async (friendId) => {
    await handleContactClick(friendId);

    setSidebarView("chats");
  };

  const handleSend = (e) => {
    e.preventDefault();

    // Allow sending if there is text OR an image

    if ((!input.trim() && !uploadedFileUrl) || !activeChatId) return;

    const messagePayload = {
      content: input,

      mediaUrl: uploadedFileUrl, // Attach the URL
    };

    sendMessage(`/app/chat/${activeChatId}/send`, messagePayload);

    // Cleanup

    setInput("");

    clearAttachment();

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

  const getChatName = (chat) => {
    if (chat.type === "PRIVATE") return chat.name;

    return chat.name;
  };

  const activeChat = myChats.find((c) => c.id === activeChatId);

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}

      <aside className="hidden w-80 flex-col bg-white border-r md:flex shadow-xl z-10">
        {/* Header and Toggle */}

        <div className="bg-white border-b">
          <div className="p-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-indigo-700">Chatly</h2>

            <button
              onClick={() => {
                disconnect();

                onLogout();
              }}
              className="text-slate-400 hover:text-red-500"
            >
              <LogOut size={20} />
            </button>
          </div>

          {/* Tab Switcher */}

          <div className="px-4 pb-2">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setSidebarView("chats")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                  sidebarView === "chats"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <MessageCircle size={16} /> Chats
              </button>

              <button
                onClick={() => setSidebarView("friends")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                  sidebarView === "friends"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Users size={16} /> Friends
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Sidebar Content */}

        <div className="flex-1 overflow-hidden flex flex-col">
          {sidebarView === "chats" ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div className="space-y-2">
                {/* 🌟 NEW: Elegant Full-Width Create Group Button 🌟 */}

                <button
                  onClick={() => setShowGroupModal(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition-all group"
                >
                  <div className="h-10 w-10 rounded-full bg-white border border-indigo-100 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform shadow-sm">
                    <UserPlus size={18} />
                  </div>

                  <div className="text-left">
                    <p className="text-sm font-bold text-indigo-900">
                      Create New Group
                    </p>

                    <p className="text-[10px] text-indigo-400 font-medium">
                      Invite friends to chat
                    </p>
                  </div>
                </button>

                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Conversations
                  </h3>
                </div>

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
                    <div
                      className={`p-2 rounded-full ${
                        activeChatId === chat.id
                          ? "bg-white/20"
                          : "bg-indigo-50 text-indigo-600"
                      }`}
                    >
                      {chat.type === "PRIVATE" ? (
                        <MessageSquare size={18} />
                      ) : (
                        <Hash size={18} />
                      )}
                    </div>

                    <div className="flex-1 overflow-hidden">
                      <p className="font-semibold truncate">
                        {getChatName(chat)}
                      </p>

                      <p
                        className={`text-xs truncate ${
                          activeChatId === chat.id
                            ? "text-indigo-200"
                            : "text-slate-400"
                        }`}
                      >
                        {chat.type}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <PresenceList
                onlineUsers={onlineUsers}
                onUserClick={handleContactClick}
              />
            </div>
          ) : (
            <FriendList auth={auth} onChatStart={handleFriendChatStart} />
          )}
        </div>

        {/* User Profile Footer */}

        <div className="p-4 border-t bg-slate-50">
          <div className="flex items-center gap-3">
            {/* 🟢 Clickable Avatar Container */}

            <div
              className="relative group cursor-pointer h-10 w-10"
              onClick={() => profileInputRef.current?.click()}
            >
              {/* Hidden Input */}

              <input
                type="file"
                ref={profileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleProfileUpdate}
              />

              {/* The Image */}

              {auth.avatarUrl ? (
                <img
                  src={auth.avatarUrl}
                  alt="Profile"
                  className="h-10 w-10 rounded-full object-cover border border-indigo-200"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                  {auth.username?.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Hover Overlay Icon */}

              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                <Camera size={14} className="text-white" />
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-slate-800 truncate">
                {auth.displayName || auth.username}
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
                  {myChats.find((c) => c.id === activeChatId)?.type ===
                  "PRIVATE" ? (
                    <MessageSquare size={18} />
                  ) : (
                    <Hash size={18} />
                  )}

                  {myChats.find((c) => c.id === activeChatId)?.name ||
                    `Chat #${activeChatId}`}
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
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                </div>
              )}

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
                        m.isDeleted
                          ? "bg-slate-100 text-slate-400 italic border border-slate-200"
                          : isMe
                          ? "bg-indigo-600 text-white rounded-br-none"
                          : "bg-white text-slate-800 rounded-bl-none border border-slate-200"
                      }`}
                    >
                      {!isMe && (
                        <p className="text-[10px] font-bold uppercase opacity-50 mb-1">
                          {m.senderName}
                        </p>
                      )}

                      {/* -------------------------------------------------- */}

                      {/* 🌟 NEW: Render Image if mediaUrl exists 🌟        */}

                      {/* -------------------------------------------------- */}

                      {m.mediaUrl && (
                        <div className="mb-2 mt-1">
                          <img
                            src={m.mediaUrl}
                            alt="attachment"
                            className="rounded-lg max-h-60 object-cover border border-white/20 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(m.mediaUrl, "_blank")}
                          />
                        </div>
                      )}

                      <p className="text-sm leading-relaxed">
                        {m.isDeleted ? "This message was deleted" : m.content}
                      </p>

                      <p
                        className={`text-[9px] mt-1 text-right ${
                          isMe && !m.isDeleted
                            ? "text-indigo-200"
                            : "text-slate-400"
                        }`}
                      >
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

            <form
              onSubmit={handleSend}
              className="bg-white p-4 border-t flex flex-col gap-2"
            >
              {activeChat?.isReadOnly ? (
                // 1. READ ONLY STATE

                <div className="flex-1 p-3 text-center text-slate-500 bg-slate-100 rounded-xl italic border border-slate-200">
                  You cannot reply to this conversation because you are no
                  longer friends.
                </div>
              ) : (
                // 2. INTERACTIVE STATE

                <>
                  {/* A. Image Preview Area (Only shows if file selected) */}

                  {preview && (
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg w-fit border border-indigo-100 animate-in fade-in slide-in-from-bottom-2">
                      <div className="relative">
                        <img
                          src={preview}
                          alt="Upload preview"
                          className="h-16 w-16 object-cover rounded-md"
                        />

                        {/* Loading Spinner Overlay */}

                        {isUploading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-md">
                            <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                          </div>
                        )}
                      </div>

                      {/* Clear Button */}

                      <button
                        type="button"
                        onClick={clearAttachment}
                        className="text-slate-400 hover:text-red-500 p-1"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  {/* B. Input Row */}

                  <div className="flex gap-3 items-center">
                    {/* Hidden File Input */}

                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileUpload}
                    />

                    {/* Paperclip Button */}

                    <button
                      type="button"
                      onClick={handleFileSelect}
                      className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                      title="Attach Image"
                    >
                      <Paperclip size={20} />
                    </button>

                    {/* Text Input */}

                    <input
                      className="flex-1 rounded-xl bg-slate-100 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      placeholder="Write something..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onFocus={() => handleTyping(true)}
                      onBlur={() => handleTyping(false)}
                    />

                    {/* Send Button */}

                    <button
                      type="submit"
                      disabled={
                        isUploading || (!input.trim() && !uploadedFileUrl)
                      }
                      className="rounded-xl bg-indigo-600 p-3 text-white hover:bg-indigo-700 shadow-md transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </>
              )}
            </form>
          </>
        )}
      </main>

      {showGroupModal && (
        <CreateGroupModal
          auth={auth}
          onClose={() => setShowGroupModal(false)}
          onGroupCreated={(newChat) => {
            setMyChats((prev) => [newChat, ...prev]);

            setActiveChatId(newChat.id);

            setSidebarView("chats");
          }}
        />
      )}
    </div>
  );
};

export default ChatRoom;
