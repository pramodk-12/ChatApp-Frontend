import React from "react";
import { Check, CheckCheck } from "lucide-react";

// 🟢 Define the valid status strings based on your Backend Enum
export type MessageStatus = "SENT" | "DELIVERED" | "READ";

interface MessageStatusIconsProps {
  status: MessageStatus;
}

const MessageStatusIcons: React.FC<MessageStatusIconsProps> = ({ status }) => {
  // We use different colors and icons based on the SENT, DELIVERED, READ status
  switch (status) {
    case "READ":
      return (
        <div className="flex items-center animate-in fade-in zoom-in duration-300">
          <CheckCheck size={14} className="text-sky-400" strokeWidth={3} />
        </div>
      );
    case "DELIVERED":
      return (
        <div className="flex items-center">
          <CheckCheck size={14} className="text-slate-400" strokeWidth={2} />
        </div>
      );
    case "SENT":
      return (
        <div className="flex items-center">
          <Check size={14} className="text-slate-400" strokeWidth={2} />
        </div>
      );
    default:
      // TypeScript will flag this if 'status' isn't one of the union types above
      return null;
  }
};

export default MessageStatusIcons;