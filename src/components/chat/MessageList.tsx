import React from "react";
import { Trash2 } from "lucide-react";
import { MessageDTO } from "@/types";
import MessageStatusIcons from "./MessageStatusIcons";

interface MessageListProps {
  messages: MessageDTO[];
  authId: number | null;
  onDelete: (messageId: number) => void;
}

const MessageList: React.FC<MessageListProps> = ({ messages, authId, onDelete }) => {
  return (
    <div className="space-y-6 pb-4">
      {messages.map((m, i) => {
        const isMe = m.senderId === authId;
        const isDeleted = m.isDeleted;
        
        // Formatted timestamp logic
        const time = m.timestamp
          ? new Date(m.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";

        return (
          <div
            key={m.id || i}
            className={`flex ${
              isMe ? "justify-end" : "justify-start"
            } group animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            <div
              className={`flex flex-col ${
                isMe ? "items-end" : "items-start"
              } max-w-[85%] md:max-w-[70%]`}
            >
              {/* Sender Name for Group Chats / Others */}
              {!isMe && (
                <span className="text-[10px] font-black text-slate-400 mb-1.5 ml-1 uppercase tracking-tighter">
                  {m.senderName}
                </span>
              )}

              <div className="relative flex items-center gap-2">
                {/* Delete Button - Visible on hover for owner */}
                {isMe && !isDeleted && m.id && (
                  <button
                    onClick={() => onDelete(m.id!)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all focus:outline-none"
                    title="Delete message"
                  >
                    <Trash2 size={14} />
                  </button>
                )}

                <div
                  className={`relative px-4 py-3 rounded-2xl text-sm shadow-sm border transition-colors ${
                    isDeleted
                      ? "bg-slate-50 text-slate-400 italic border-slate-100"
                      : isMe
                      ? "bg-slate-900 text-white border-slate-800 rounded-tr-none shadow-slate-200"
                      : "bg-white text-slate-800 border-slate-100 rounded-tl-none"
                  }`}
                >
                  {/* Media Rendering if URL exists */}
                  {!isDeleted && m.mediaUrl && (
                    <div className="mb-2 -mx-1 mt-1">
                      <img
                        src={m.mediaUrl}
                        alt="attachment"
                        className="rounded-lg max-h-72 w-full object-cover cursor-pointer hover:brightness-95 transition-all shadow-sm border border-black/5"
                        onClick={() => window.open(m.mediaUrl!, "_blank")}
                      />
                    </div>
                  )}

                  <p className="leading-relaxed tracking-tight font-medium break-words">
                    {isDeleted ? "This message was deleted" : m.content}
                  </p>
                </div>
              </div>

              {/* Timestamp and Status Icons */}
              <div className={`flex items-center gap-1.5 mt-1.5 mx-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter opacity-70">
                  {time}
                </span>
                {isMe && !isDeleted && m.status && (
                  <MessageStatusIcons status={m.status} />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MessageList;