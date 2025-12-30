import React, { useState, useEffect } from "react";
import { X, Check } from "lucide-react";

const CreateGroupModal = ({ auth, onClose, onGroupCreated }) => {
  const [friends, setFriends] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  // Load friends to populate the list
  useEffect(() => {
    fetch("http://localhost:8080/api/friends", {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then((res) => res.json())
      .then((data) => setFriends(data));
  }, [auth.token]);

  const toggleSelection = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupName || selectedIds.length === 0) return;

    try {
      const res = await fetch("http://localhost:8080/api/chats/group", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          name: groupName,
          memberIds: selectedIds,
        }),
      });

      if (res.ok) {
        const newChat = await res.json();
        onGroupCreated(newChat); // Tell parent to switch to this chat
        onClose();
      }
    } catch (err) {
      console.error("Failed to create group", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-96 p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800">New Group</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Group Name Input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Group Name
            </label>
            <input
              className="w-full bg-slate-100 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Project Alpha"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
            />
          </div>

          {/* Friend Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              Add Members
            </label>
            <div className="h-48 overflow-y-auto space-y-2 border rounded-xl p-2">
              {friends.length === 0 ? (
                <p className="text-sm text-slate-400 text-center mt-4">
                  You need to add friends first!
                </p>
              ) : (
                friends.map((friend) => (
                  <div
                    key={friend.id}
                    onClick={() => toggleSelection(friend.id)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                      selectedIds.includes(friend.id)
                        ? "bg-indigo-50 border border-indigo-200"
                        : "hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                        {friend.username[0].toUpperCase()}
                      </div>
                      <span className="text-sm text-slate-700">
                        {friend.username}
                      </span>
                    </div>
                    {selectedIds.includes(friend.id) && (
                      <Check size={16} className="text-indigo-600" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={!groupName || selectedIds.length === 0}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Create Group
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;