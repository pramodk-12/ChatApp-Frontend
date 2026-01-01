import React, { useState, useRef, useEffect } from "react";
import { useStomp } from "../hooks/stompService";
import { Loader2, MessageSquare } from "lucide-react";

// Shadcn & Custom Components
import { ScrollArea } from "@/components/ui/scroll-area";
import Sidebar from "./chat/ChatSidebar";
import ChatHeader from "./chat/ChatHeader";
import MessageList from "./chat/MessageList";
import MessageInput from "./chat/ChatInput";
import CreateGroupDialog from "./chat/CreateGroupDialog";
import { apiFetch } from "@/lib/api";

const ChatRoom = ({ auth, onLogout }) => {
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [activeChatId, setActiveChatId] = useState(null);
  const [myChats, setMyChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [input, setInput] = useState("");
  const [sidebarView, setSidebarView] = useState("chats");
  const [stompClient, setStompClient] = useState(null);
  const subscriptionRef = useRef(null);
  const scrollRef = useRef();

  // --- Logic: Fetching Chats ---
  useEffect(() => {
    const fetchMyChats = async () => {
      const response = await apiFetch(`/api/chats`);
      if (response?.ok) {
        const data = await response.json();
        setMyChats(data);
        if (data.length > 0 && !activeChatId) setActiveChatId(data[0].id);
      }
    };
    fetchMyChats();
  }, [auth.token]);

  // --- Logic: Fetching History ---
  useEffect(() => {
    if (!activeChatId) return;

    const loadChatData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch History
        const msgRes = await apiFetch(`/api/messages/${activeChatId}?limit=30`);

        // If apiFetch returns null, it means a 401 occurred and it's already handling redirect
        if (!msgRes || !msgRes.ok) {
          throw new Error("Failed to load history");
        }

        const history = await msgRes.json();
        setMessages(history.reverse());

        // 2. Mark as Read (The "Secondary" Action)
        const readRes = await apiFetch(`/api/chats/${activeChatId}/read`, {
          method: "POST",
        });

        // 3. Update UI state only if Mark as Read was triggered
        if (readRes?.ok) {
          setMyChats((prev) =>
            prev.map((chat) =>
              chat.id === activeChatId ? { ...chat, unreadCount: 0 } : chat
            )
          );
        }
      } catch (err) {
        console.error("Chat loading failed:", err);
        // Optional: toast.error("Could not load messages. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadChatData();
    setTypingUser(null);
  }, [activeChatId]);

  useEffect(() => {
    // If there are no messages or no active chat, do nothing
    if (!activeChatId || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];

    // 🟢 THE GAP CLOSER:
    // If the last message was sent by the OTHER person AND it is not 'READ' yet
    if (lastMessage.senderId !== auth.id && lastMessage.status !== "READ") {
      // Trigger the Read API immediately
      fetch(`http://localhost:8080/api/chats/${activeChatId}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.token}` },
      }).catch((err) => console.error("Auto-read failed:", err));

      // Locally update the status so we don't trigger this effect again for the same message
      setMessages((prev) =>
        prev.map((m) =>
          m.id === lastMessage.id ? { ...m, status: "READ" } : m
        )
      );
    }
  }, [messages, activeChatId]);

  // --- STOMP Connection ---
  const { sendMessage, disconnect } = useStomp(auth.token, (client) => {
    setStompClient(client);
    client.subscribe("/topic/presence", (msg) =>
      setOnlineUsers(JSON.parse(msg.body))
    );
  });

  useEffect(() => {
    if (!stompClient || !activeChatId) return;
    if (subscriptionRef.current) subscriptionRef.current.unsubscribe();

    const sub = stompClient.subscribe(`/topic/chats/${activeChatId}`, (msg) => {
      const data = JSON.parse(msg.body);
      if (data.type === "DELETE_MESSAGE") {
        setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
      } else {
        setMessages((prev) => [...prev, data]);
      }
    });

    // 2. Subscribe to Status Updates (Read Receipts / Deletions)
    const statusSub = stompClient.subscribe(
      `/topic/chats/${activeChatId}/status`,
      (msg) => {
        const data = JSON.parse(msg.body);

        setMessages((prev) =>
          prev.map((m) => {
            // Handle Read Receipts
            if (data.status === "READ" && m.senderId === auth.id) {
              return { ...m, status: "READ" };
            }
            return m;
          })
        );
      }
    );

    const typingSub = stompClient.subscribe(
      `/topic/chats/${activeChatId}/typing`,
      (msg) => {
        const data = JSON.parse(msg.body);
        if (data.username !== auth.username)
          setTypingUser(data.isTyping ? data.username : null);
      }
    );

    subscriptionRef.current = sub;
    return () => {
      sub?.unsubscribe();
      typingSub?.unsubscribe();
      statusSub?.unsubscribe();
    };
  }, [activeChatId, stompClient, auth.username]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

  // --- Handlers ---
  const handleContactClick = async (targetUserId) => {
    if (targetUserId === auth.id) return;

    try {
      const res = await apiFetch(`/api/chats/private/${targetUserId}`, {
        method: "POST",
      });

      if (res?.ok) {
        const chat = await res.json();

        // Update sidebar list if this is a new chat
        setMyChats((prev) => {
          if (!prev.find((c) => c.id === chat.id)) {
            return [chat, ...prev];
          }
          return prev;
        });

        setActiveChatId(chat.id);
        setSidebarView("chats");
      }
    } catch (err) {
      console.error("Failed to initialize private chat:", err);
    }
  };

  const handleDelete = async (msgId) => {
    try {
      const res = await apiFetch(
        `/api/chats/${activeChatId}/messages/${msgId}`,
        { method: "DELETE" }
      );

      if (res?.ok) {
        toast.success("Message deleted");
      }
    } catch (err) {
      console.error("Failed to delete message:", err);
      toast.error("Could not delete message");
    }
  };

  // Inside ChatRoom.jsx
  const handleProfileUpdate = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      // 1. Upload the image
      const uploadRes = await apiFetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": undefined }, // 🟢 Let the browser set the boundary
        body: formData,
      });

      if (uploadRes?.ok) {
        const data = await uploadRes.json();
        const newAvatarUrl = data.url;

        // 2. Update the user profile in Backend
        const updateRes = await apiFetch("/api/users/me", {
          method: "PUT",
          body: JSON.stringify({ avatarUrl: newAvatarUrl }),
        });

        if (updateRes?.ok) {
          // 3. Update Local Storage & State
          const updatedUser = { ...auth, avatarUrl: newAvatarUrl };
          localStorage.setItem("chat_auth", JSON.stringify(updatedUser));

          toast.success("Profile picture updated!");

          // Instead of a full reload, it's better to update your auth state
          // if you have a setAuth function. If not, reload is fine.
          setTimeout(() => window.location.reload(), 1000);
        }
      }
    } catch (err) {
      console.error("Profile update failed", err);
      toast.error("Failed to update profile picture.");
    }
  };

  const activeChat = myChats.find((c) => c.id === activeChatId);

  return (
    <div className="flex h-screen bg-white text-slate-900 overflow-hidden font-sans">
      <Sidebar
        auth={auth}
        myChats={myChats}
        activeChatId={activeChatId}
        setActiveChatId={setActiveChatId}
        sidebarView={sidebarView}
        setSidebarView={setSidebarView}
        onlineUsers={onlineUsers}
        handleContactClick={handleContactClick}
        onProfileUpdate={handleProfileUpdate}
        setShowGroupModal={setShowGroupModal}
        onLogout={() => {
          disconnect();
          onLogout();
        }}
      />

      <main className="flex flex-1 flex-col bg-white border-l border-slate-100">
        {!activeChatId ? (
          <div className="flex-1 flex flex-col items-center justify-center opacity-40">
            <MessageSquare size={48} className="mb-4 text-slate-300" />
            <p className="text-sm font-medium">
              Select a conversation to start
            </p>
          </div>
        ) : (
          <>
            <ChatHeader activeChat={activeChat} typingUser={typingUser} />

            <ScrollArea className="flex-1 w-full overflow-hidden">
              <div className="p-6 max-w-none mx-auto w-full px-4 md:px-12 lg:px-24">
                {isLoading && (
                  <Loader2 className="mx-auto animate-spin text-slate-400 mb-4" />
                )}
                <MessageList
                  messages={messages}
                  authId={auth.id}
                  onDelete={handleDelete}
                />
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            <MessageInput
              auth={auth}
              activeChatId={activeChatId}
              activeChat={activeChat}
              sendMessage={sendMessage}
              input={input}
              setInput={setInput}
            />
          </>
        )}
      </main>

      {showGroupModal && (
        <CreateGroupDialog
          auth={auth}
          onClose={() => setShowGroupModal(false)}
          onGroupCreated={(c) => {
            setMyChats((p) => [c, ...p]);
            setActiveChatId(c.id);
            setSidebarView("chats");
          }}
        />
      )}
    </div>
  );
};

export default ChatRoom;
