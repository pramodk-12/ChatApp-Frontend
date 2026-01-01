import React, { useState, useEffect } from "react";
import { UserPlus, Check, X, MessageSquare, Search } from "lucide-react";
import { toast } from "sonner";

const FriendList = ({ auth, onChatStart }) => {
  const [activeTab, setActiveTab] = useState("friends"); // friends | requests | add
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]); // For the 'Add' tab
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Fetch Data based on active tab
  useEffect(() => {
    if (activeTab === "friends") fetchFriends();
    if (activeTab === "requests") fetchRequests();
    if (activeTab === "add") fetchAllUsers(); // In real app, this would be a search API
  }, [activeTab, auth.token]);

  const fetchFriends = async () => {
    const res = await fetch("http://localhost:8080/api/friends", {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    if (res.ok) setFriends(await res.json());
  };

  const fetchRequests = async () => {
    const res = await fetch("http://localhost:8080/api/friends/requests", {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    if (res.ok) setRequests(await res.json());
  };

  // Quick helper to fetch "all users" to find people to add
  // Note: You might need to expose GET /api/users in your AuthController or UserController
  const fetchAllUsers = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/users", { 
        headers: { Authorization: `Bearer ${auth.token}` } 
      });
      if (res.ok) {
        const users = await res.json();
        // Filter out myself
        setSearchResults(users.filter(u => u.id !== auth.id)); 
      }
    } catch (e) { console.error("Search failed", e); }
  };

  const handleAccept = async (requestId) => {
    await fetch(`http://localhost:8080/api/friends/accept/${requestId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    fetchRequests(); // Refresh list
  };

  const sendRequest = async (userId) => {
  // Start a loading toast if you want it to feel really fast
  const toastId = toast.loading("Sending friend request...");

  try {
    const res = await fetch(`http://localhost:8080/api/friends/request/${userId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${auth.token}` },
    });

    if (res.ok) {
      // 🟢 Update the loading toast to success
      toast.success("Request sent successfully!", { id: toastId });
    } else {
      // 🔴 Update the loading toast to error
      const errorData = await res.json().catch(() => ({}));
      toast.error(errorData.message || "Failed to send request. Already sent?", { id: toastId });
    }
  } catch (err) {
    toast.error("Network error. Please try again.", { id: toastId });
    console.error(err);
  }
};

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Tabs */}
      <div className="flex border-b text-sm">
        <button 
          onClick={() => setActiveTab("friends")}
          className={`flex-1 p-3 font-medium ${activeTab === "friends" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-500"}`}
        >
          Friends
        </button>
        <button 
          onClick={() => setActiveTab("requests")}
          className={`flex-1 p-3 font-medium relative ${activeTab === "requests" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-500"}`}
        >
          Requests
          {requests.length > 0 && <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full"></span>}
        </button>
        <button 
          onClick={() => setActiveTab("add")}
          className={`flex-1 p-3 font-medium ${activeTab === "add" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-500"}`}
        >
          <UserPlus size={16} className="mx-auto"/>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        
        {/* VIEW: MY FRIENDS */}
        {activeTab === "friends" && (
          friends.length === 0 ? <p className="text-center text-slate-400 text-sm mt-4">No friends yet</p> :
          friends.map(friend => (
            <div key={friend.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg group">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                  {friend.username[0].toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-slate-700">{friend.username}</span>
              </div>
              <button 
                onClick={() => onChatStart(friend.id)}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
              >
                <MessageSquare size={16} />
              </button>
            </div>
          ))
        )}

        {/* VIEW: REQUESTS */}
        {activeTab === "requests" && (
          requests.length === 0 ? <p className="text-center text-slate-400 text-sm mt-4">No pending requests</p> :
          requests.map(req => (
            <div key={req.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2">
                 <div className="h-8 w-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">
                  {req.username[0].toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-slate-700">{req.username}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleAccept(req.friendshipId)} className="p-1.5 bg-green-100 text-green-600 rounded-full hover:bg-green-200"><Check size={14}/></button>
                <button className="p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200"><X size={14}/></button>
              </div>
            </div>
          ))
        )}

        {/* VIEW: ADD FRIEND (Search/List All) */}
        {activeTab === "add" && (
          <div className="space-y-4">
             <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input 
                  placeholder="Search users..." 
                  className="w-full bg-slate-100 rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             {searchResults
               .filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()))
               .map(user => (
               <div key={user.id} className="flex items-center justify-between p-2">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500 text-xs">
                      {user.username[0]}
                    </div>
                    <span className="text-sm text-slate-700">{user.username}</span>
                  </div>
                  <button 
                    onClick={() => sendRequest(user.id)}
                    className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-full hover:bg-indigo-700"
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