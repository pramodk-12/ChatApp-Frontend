import React, { useState, useEffect } from "react";
import { Circle } from "lucide-react";

const PresenceList = ({ onlineUsers, onUserClick }) => {
  const [, setTick] = useState(0);

  // Force update every minute to refresh "X mins ago"
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const getTimeAgo = (timestamp, isOnline) => {
    if (isOnline) return "Active now";
    if (!timestamp) return "Offline";

    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "Just now";

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">
        Contacts
      </h3>
      {onlineUsers.map((user) => (
        <div
          key={user.userId}
          onClick={() => onUserClick(user.userId)}
          className="group flex items-center gap-3 p-2 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
        >
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-linear-to-tr from-indigo-100 to-purple-100 flex items-center justify-center font-bold text-indigo-600 shadow-sm">
              {user.username[0].toUpperCase()}
            </div>
            <Circle
              size={12}
              className={`absolute -bottom-1 -right-1 rounded-full border-2 border-white ${
                user.online
                  ? "fill-green-500 text-green-500"
                  : "fill-slate-300 text-slate-300"
              }`}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-700">
              {user.username}
            </span>
            <span
              className={`text-[10px] ${
                user.online ? "text-green-600 font-medium" : "text-slate-400"
              }`}
            >
              {getTimeAgo(user.lastSeenTimestamp, user.online)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PresenceList;