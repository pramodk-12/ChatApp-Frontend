import React, { useState, useEffect } from "react";
import { UserPlus, Check, X, MessageSquare, Search } from "lucide-react";
import { toast } from "sonner";
import { UserAuth } from "@/types";
import { apiFetch } from "@/lib/api";

// Define local interfaces for the different user objects
interface FriendDTO {
  id: number;
  username: string;
  avatarUrl?: string;
}

interface FriendRequestDTO {
  id: number; // User ID
  friendshipId: number; // Primary key of the friendship record
  username: string;
}

interface FriendListProps {
  auth: UserAuth;
  onChatStart: (userId: number) => void;
}

type TabType = "friends" | "requests" | "add";

const FriendList: React.FC<FriendListProps> = ({ auth, onChatStart }) => {
  const [activeTab, setActiveTab] = useState<TabType>("friends");
  const [friends, setFriends] = useState<FriendDTO[]>([]);
  const [requests, setRequests] = useState<FriendRequestDTO[]>([]);
  const [searchResults, setSearchResults] = useState<FriendDTO[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Fetch Data based on active tab
  useEffect(() => {
    if (activeTab === "friends") fetchFriends();
    if (activeTab === "requests") fetchRequests();
    if (activeTab === "add") fetchAllUsers();
  }, [activeTab]);

  const fetchFriends = async () => {
    const data = await apiFetch<FriendDTO[]>("/api/friends");
    if (data) setFriends(data);
  };

  const fetchRequests = async () => {
    const data = await apiFetch<FriendRequestDTO[]>("/api/friends/requests");
    if (data) setRequests(data);
  };

  const fetchAllUsers = async () => {
    try {
      const users = await apiFetch<FriendDTO[]>("/api/users");
      if (users) {
        // Filter out myself
        setSearchResults(users.filter((u) => u.id !== auth.id));
      }
    } catch (e) {
      console.error("Search failed", e);
    }
  };

  const handleAccept = async (friendshipId: number) => {
    const data = await apiFetch(`/api/friends/accept/${friendshipId}`, {
      method: "PUT",
    });
    if (data) {
      toast.success("Friend request accepted!");
      fetchRequests(); // Refresh list
    }
  };

  const sendRequest = async (userId: number) => {
    const toastId = toast.loading("Sending friend request...");

    try {
      const data = await apiFetch(`/api/friends/request/${userId}`, {
        method: "POST",
      });

      if (data) {
        toast.success("Request sent successfully!", { id: toastId });
      } else {
        // If 400/409 error occurs
        toast.error("Failed to send request. (Already sent or error)", { id: toastId });
      }
    } catch (err) {
      toast.error("Network error. Please try again.", { id: toastId });
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Tabs */}
      <div className="flex border-b text-sm">
        <button
          onClick={() => setActiveTab("friends")}
          className={`flex-1 p-3 font-black text-[10px] uppercase tracking-widest transition-all ${
            activeTab === "friends"
              ? "text-slate-900 border-b-2 border-slate-900"
              : "text-slate-400"
          }`}
        >
          Friends
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`flex-1 p-3 font-black text-[10px] uppercase tracking-widest relative transition-all ${
            activeTab === "requests"
              ? "text-slate-900 border-b-2 border-slate-900"
              : "text-slate-400"
          }`}
        >
          Requests
          {requests.length > 0 && (
            <span className="absolute top-2 right-4 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("add")}
          className={`flex-1 p-3 font-medium transition-all ${
            activeTab === "add"
              ? "text-slate-900 border-b-2 border-slate-900"
              : "text-slate-400"
          }`}
        >
          <UserPlus size={16} className="mx-auto" />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* VIEW: MY FRIENDS */}
        {activeTab === "friends" && (
          friends.length === 0 ? (
            <p className="text-center text-slate-400 text-[10px] font-bold uppercase mt-10">No friends yet</p>
          ) : (
            friends.map((friend) => (
              <div key={friend.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl group transition-all">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase">
                    {friend.username[0]}
                  </div>
                  <span className="text-sm font-bold text-slate-700">{friend.username}</span>
                </div>
                <button
                  onClick={() => onChatStart(friend.id)}
                  className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all"
                >
                  <MessageSquare size={16} />
                </button>
              </div>
            ))
          )
        )}

        {/* VIEW: REQUESTS */}
        {activeTab === "requests" && (
          requests.length === 0 ? (
            <p className="text-center text-slate-400 text-[10px] font-bold uppercase mt-10">No pending requests</p>
          ) : (
            requests.map((req) => (
              <div key={req.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs uppercase">
                    {req.username[0]}
                  </div>
                  <span className="text-sm font-bold text-slate-700">{req.username}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(req.friendshipId)}
                    className="p-1.5 bg-slate-900 text-white rounded-full hover:scale-110 transition-transform"
                  >
                    <Check size={14} />
                  </button>
                  <button className="p-1.5 bg-slate-200 text-slate-600 rounded-full hover:bg-red-100 hover:text-red-600 transition-all">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))
          )
        )}

        {/* VIEW: ADD FRIEND */}
        {activeTab === "add" && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                placeholder="Search users..."
                className="w-full bg-slate-100 rounded-xl pl-9 pr-4 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {searchResults
              .filter((u) => u.username.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((user) => (
                <div key={user.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-all">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500 text-xs uppercase">
                      {user.username[0]}
                    </div>
                    <span className="text-sm font-bold text-slate-700">{user.username}</span>
                  </div>
                  <button
                    onClick={() => sendRequest(user.id)}
                    className="text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all"
                  >
                    Add
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendList;