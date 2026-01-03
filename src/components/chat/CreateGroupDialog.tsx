import React, { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { UserAuth, ChatDTO } from "@/types";
import { apiFetch } from "@/lib/api";

// Define an interface for the friend object specifically as it comes from /api/friends
interface FriendSummary {
  id: number;
  username: string;
}

interface CreateGroupDialogProps {
  auth: UserAuth;
  onClose: () => void;
  onGroupCreated: (newChat: ChatDTO) => void;
}

const CreateGroupDialog: React.FC<CreateGroupDialogProps> = ({ 
  auth, 
  onClose, 
  onGroupCreated 
}) => {
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [groupName, setGroupName] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // 1. Fetch friends using our type-safe apiFetch
  useEffect(() => {
    const loadFriends = async () => {
      const data = await apiFetch<FriendSummary[]>("/api/friends");
      if (data) setFriends(data);
    };
    loadFriends();
  }, []);

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName || selectedIds.length === 0) return;

    try {
      // 🟢 Create group via POST
      const newChat = await apiFetch<ChatDTO>("/api/chats/group", {
        method: "POST",
        body: JSON.stringify({
          name: groupName,
          memberIds: selectedIds,
        }),
      });

      if (newChat) {
        onGroupCreated(newChat); // Switch to the new chat room
        onClose();
      }
    } catch (err) {
      console.error("Failed to create group", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">New Group</h2>
          <button 
            onClick={onClose} 
            className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Group Name Input */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Group Name
            </label>
            <input
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all"
              placeholder="e.g. Design Team"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
            />
          </div>

          {/* Friend Selector */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Add Members ({selectedIds.length})
            </label>
            <div className="h-56 overflow-y-auto space-y-2 border border-slate-100 rounded-2xl p-2 bg-slate-50/50">
              {friends.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                   <p className="text-xs font-bold text-slate-400 uppercase">No friends found</p>
                </div>
              ) : (
                friends.map((friend) => (
                  <div
                    key={friend.id}
                    onClick={() => toggleSelection(friend.id)}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                      selectedIds.includes(friend.id)
                        ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                        : "bg-white hover:bg-slate-100 border border-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black uppercase ${
                        selectedIds.includes(friend.id) ? "bg-white/20" : "bg-slate-200 text-slate-600"
                      }`}>
                        {friend.username[0]}
                      </div>
                      <span className="text-sm font-bold">
                        {friend.username}
                      </span>
                    </div>
                    {selectedIds.includes(friend.id) && (
                      <Check size={16} className="text-white" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={!groupName || selectedIds.length === 0}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xl shadow-slate-200"
          >
            Create Group
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupDialog;