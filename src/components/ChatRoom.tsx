import React, { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Client } from "@stomp/stompjs";

// Types
import { MessageDTO, ChatDTO, UserAuth } from "@/types";

// Service & Utils
import { useStomp } from "../hooks/stompService";
import { apiFetch } from "@/lib/api";

// Components
import { ScrollArea } from "@/components/ui/scroll-area";
import Sidebar from "./chat/ChatSidebar";
import ChatHeader from "./chat/ChatHeader";
import MessageList from "./chat/MessageList";
import MessageInput from "./chat/ChatInput";
import CreateGroupDialog from "./chat/CreateGroupDialog";

interface ChatRoomProps {
  auth: UserAuth;
  onLogout: () => void;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ auth, onLogout }) => {
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [myChats, setMyChats] = useState<ChatDTO[]>([]);
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sidebarView, setSidebarView] = useState<"chats" | "friends">("chats");
  const [stompClient, setStompClient] = useState<any>(null);

  const subscriptionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Logic: Fetching Chats ---
  useEffect(() => {
    const fetchMyChats = async () => {
      const data = await apiFetch<ChatDTO[]>(`/api/chats`);
      if (data) {
        setMyChats(data);
        if (data.length > 0 && !activeChatId) setActiveChatId(data[0].id);
      }
    };
    fetchMyChats();
  }, [auth.token]);

  // --- Logic: Fetching History & Marking Read ---
  useEffect(() => {
    if (!activeChatId) return;

    const loadChatData = async () => {
      setIsLoading(true);
      try {
        const history = await apiFetch<MessageDTO[]>(
          `/api/messages/${activeChatId}?limit=30`
        );
        if (history) {
          setMessages(history.reverse());

          // Mark as Read
          const readData = await apiFetch(`/api/chats/${activeChatId}/read`, {
            method: "POST",
          });
          if (readData) {
            setMyChats((prev) =>
              prev.map((c) =>
                c.id === activeChatId ? { ...c, unreadCount: 0 } : c
              )
            );
          }
        }
      } catch (err) {
        console.error("Chat loading failed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadChatData();
    setTypingUser(null);
  }, [activeChatId]);

  // --- Auto-Read for Incoming Messages ---
  useEffect(() => {
    if (!activeChatId || messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];

    if (lastMessage.senderId !== auth.id && lastMessage.status !== "READ") {
      apiFetch(`/api/chats/${activeChatId}/read`, { method: "POST" });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === lastMessage.id ? { ...m, status: "READ" } : m
        )
      );
    }
  }, [messages, activeChatId, auth.id]);

  const handleStompConnect = useCallback((client: Client) => {
    setStompClient(client);

    client.subscribe("/topic/presence", (msg: any) => {
      setOnlineUsers(JSON.parse(msg.body));
    });
  }, []);
  // --- WebSocket Connection ---
  const { sendMessage, disconnect } = useStomp(auth.token, handleStompConnect);

  useEffect(() => {
    if (!stompClient || !activeChatId) return;

    const sub = stompClient.subscribe(
      `/topic/chats/${activeChatId}`,
      (msg: any) => {
        const data = JSON.parse(msg.body);
        if (data.senderName === typingUser) {
          setTypingUser(null);
        }
        if (data.type === "DELETE_MESSAGE") {
          setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
        } else {
          setMessages((prev) => [...prev, data]);
        }
      }
    );

    const statusSub = stompClient.subscribe(
      `/topic/chats/${activeChatId}/status`,
      (msg: any) => {
        const data = JSON.parse(msg.body);
        setMessages((prev) =>
          prev.map((m) =>
            data.status === "READ" && m.senderId === auth.id
              ? { ...m, status: "READ" }
              : m
          )
        );
      }
    );

    const typingSub = stompClient.subscribe(
      `/topic/chats/${activeChatId}/typing`,
      (msg: any) => {
        const data = JSON.parse(msg.body);
        if (data.username !== auth.username)
          setTypingUser(data.isTyping ? data.username : null);
      }
    );

    return () => {
      sub.unsubscribe();
      statusSub.unsubscribe();
      typingSub.unsubscribe();
    };
  }, [activeChatId, stompClient, auth.username, auth.id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

  // --- Handlers ---
  const handleContactClick = async (targetUserId: number) => {
    if (targetUserId === auth.id) return;
    const chat = await apiFetch<ChatDTO>(`/api/chats/private/${targetUserId}`, {
      method: "POST",
    });
    if (chat) {
      setMyChats((prev) =>
        prev.find((c) => c.id === chat.id) ? prev : [chat, ...prev]
      );
      setActiveChatId(chat.id);
      setSidebarView("chats");
    }
  };

  const handleDelete = async (msgId: number) => {
    const data = await apiFetch(
      `/api/chats/${activeChatId}/messages/${msgId}`,
      { method: "DELETE" }
    );
    if (data) toast.success("Message deleted");
  };

  const handleProfileUpdate = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    // 1. Upload the image
    // We pass an empty object for headers so apiFetch doesn't force JSON Content-Type
    const uploadData = await apiFetch<{ url: string }>("/api/upload", {
      method: "POST",
      body: formData,
      headers: {}, // This prevents the default 'application/json' in our utility
    });

    if (uploadData && uploadData.url) {
      // 2. Update the user profile
      const updateSuccess = await apiFetch<any>("/api/users/me", {
        method: "PUT",
        body: JSON.stringify({ avatarUrl: uploadData.url }),
      });

      // In our new apiFetch, if updateSuccess is not null, it means the call was successful (2xx)
      if (updateSuccess !== null) {
        const updatedUser = { ...auth, avatarUrl: uploadData.url };
        localStorage.setItem("chat_auth", JSON.stringify(updatedUser));

        toast.success("Profile updated!");

        // Refresh the local state or reload
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error("Failed to update profile link.");
      }
    } else {
      toast.error("File upload failed.");
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
          onGroupCreated={(c: ChatDTO) => {
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
