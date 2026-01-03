import React from "react";
import { Hash, MessageSquare, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";

// Import the shared type
import { ChatDTO } from "@/types";

interface ChatHeaderProps {
  // activeChat is ChatDTO, but can be undefined initially
  activeChat: ChatDTO | undefined;
  // typingUser is either the username string or null
  typingUser: string | null;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ activeChat, typingUser }) => {
  return (
    <header className="h-18.25 flex items-center justify-between px-8 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-4">
        {/* Avatar Container */}
        <div className="h-10 w-10 rounded-full overflow-hidden bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-200">
          {activeChat?.avatarUrl ? (
            <img
              src={activeChat.avatarUrl}
              alt={activeChat.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-slate-900 flex items-center justify-center text-white">
              {activeChat?.type === "PRIVATE" ? (
                <MessageSquare size={18} />
              ) : (
                <Hash size={18} />
              )}
            </div>
          )}
        </div>

        {/* Title and Status */}
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-none mb-1">
            {activeChat?.name || "Select a Chat"}
          </h3>
          <div className="flex items-center gap-2">
            {typingUser ? (
              <p className="text-[10px] text-indigo-600 font-bold animate-pulse uppercase tracking-widest">
                {typingUser} is typing...
              </p>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Active Now
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-400 rounded-full"
        >
          <MoreVertical size={18} />
        </Button>
      </div>
    </header>
  );
};

export default ChatHeader;