import React from "react";
import { Check, CheckCheck } from "lucide-react";

const MessageStatusIcons = ({ status }) => {
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
      return null;
  }
};

export default MessageStatusIcons;