import React, { useState, useRef, useEffect } from "react";
import { useStomp } from "../hooks/stompService";
import { Loader2,MessageSquare } from "lucide-react";

// Shadcn & Custom Components
import { ScrollArea } from "@/components/ui/scroll-area";
import Sidebar from "./chat/ChatSidebar";
import ChatHeader from "./chat/ChatHeader";
import MessageList from "./chat/MessageList";
import MessageInput from "./chat/ChatInput";
import CreateGroupDialog from "./chat/CreateGroupDialog";

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
      try {
        const res = await fetch("http://localhost:8080/api/chats", {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMyChats(data);
          if (data.length > 0 && !activeChatId) setActiveChatId(data[0].id);
        }
      } catch (err) { console.error(err); }
    };
    fetchMyChats();
  }, [auth.token]);

  // --- Logic: Fetching History ---
  useEffect(() => {
    if (!activeChatId) return;
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`http://localhost:8080/api/messages/${activeChatId}?limit=30`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (response.ok) {
          const history = await response.json();
          setMessages(history.reverse());
        }
      } catch (err) { console.error(err); }
      finally { setIsLoading(false); }
    };
    fetchHistory();
    setTypingUser(null);
  }, [activeChatId, auth.token]);

  // --- STOMP Connection ---
  const { sendMessage, disconnect } = useStomp(auth.token, (client) => {
    setStompClient(client);
    client.subscribe("/topic/presence", (msg) => setOnlineUsers(JSON.parse(msg.body)));
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

    const typingSub = stompClient.subscribe(`/topic/chats/${activeChatId}/typing`, (msg) => {
      const data = JSON.parse(msg.body);
      if (data.username !== auth.username) setTypingUser(data.isTyping ? data.username : null);
    });

    subscriptionRef.current = sub;
    return () => { sub?.unsubscribe(); typingSub?.unsubscribe(); };
  }, [activeChatId, stompClient, auth.username]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

  // --- Handlers ---
  const handleContactClick = async (targetUserId) => {
    if (targetUserId === auth.id) return;
    try {
      const res = await fetch(`http://localhost:8080/api/chats/private/${targetUserId}`, {
        method: "POST", headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (res.ok) {
        const chat = await res.json();
        if (!myChats.find(c => c.id === chat.id)) setMyChats(prev => [chat, ...prev]);
        setActiveChatId(chat.id);
        setSidebarView("chats");
      }
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (msgId) => {
    try {
      await fetch(`http://localhost:8080/api/chats/${activeChatId}/messages/${msgId}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${auth.token}` },
      });
    } catch (err) { console.error(err); }
  };

  const activeChat = myChats.find(c => c.id === activeChatId);

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
        setShowGroupModal={setShowGroupModal}
        onLogout={() => { disconnect(); onLogout(); }}
      />

      <main className="flex flex-1 flex-col bg-white border-l border-slate-100">
        {!activeChatId ? (
          <div className="flex-1 flex flex-col items-center justify-center opacity-40">
            <MessageSquare size={48} className="mb-4 text-slate-300" />
            <p className="text-sm font-medium">Select a conversation to start</p>
          </div>
        ) : (
          <>
            <ChatHeader activeChat={activeChat} typingUser={typingUser} />
            
            <ScrollArea className="flex-1 w-full overflow-hidden">
              <div className="p-6 max-w-none mx-auto w-full px-4 md:px-12 lg:px-24">
                {isLoading && <Loader2 className="mx-auto animate-spin text-slate-400 mb-4" />}
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
          onGroupCreated={(c) => { setMyChats(p => [c, ...p]); setActiveChatId(c.id); setSidebarView("chats"); }} 
        />
      )}
    </div>
  );
};

export default ChatRoom;