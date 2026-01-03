import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, X, Send, Loader2 } from "lucide-react";
import { UserAuth, ChatDTO } from "@/types";

interface MessageInputProps {
  auth: UserAuth;
  activeChatId: number | null;
  activeChat: ChatDTO | undefined;
  // Type signature for the STOMP send function
  sendMessage: (destination: string, body: any) => void;
  input: string;
  setInput: (val: string) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ 
  auth, 
  activeChatId, 
  activeChat, 
  sendMessage, 
  input, 
  setInput 
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  
  // Explicitly type the HTMLInputElement ref
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setIsUploading(true);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("http://localhost:8080/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.token}` },
        body: fd,
      });

      if (res.ok) {
        const data = await res.json();
        setUploadedUrl(data.url);
      }
    } catch (err) {
      setPreview(null);
      console.error("Upload failed", err);
    } finally {
      setIsUploading(false);
    }
  };

  const onSend = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !uploadedUrl) || !activeChatId) return;

    sendMessage(`/app/chat/${activeChatId}/send`, { 
      content: input, 
      mediaUrl: uploadedUrl 
    });

    // Reset state
    setInput("");
    setPreview(null);
    setUploadedUrl(null);
    
    // Notify typing stopped
    sendMessage(`/app/chat/${activeChatId}/typing`, { 
      isTyping: false, 
      username: auth.username 
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value;
  setInput(value);

  if (value.length > 0 && activeChatId) {
    sendMessage(`/app/chat/${activeChatId}/typing`, { 
      isTyping: true, 
      username: auth.username 
    });
  }
};

  // 1. Guard for Read-Only chats (like broadcast channels)
  if (activeChat?.readOnly) {
    return (
      <div className="p-6 text-center text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-50">
        This conversation is read-only
      </div>
    );
  }

  return (
    <div className="p-6 bg-white">
      <form 
        onSubmit={onSend} 
        className="max-w-none mx-auto rounded-2xl border border-slate-200 p-2 shadow-xl shadow-slate-200/40 bg-white"
      >
        {/* Image Preview Area */}
        {preview && (
          <div className="flex items-center gap-3 p-2 mb-2 bg-slate-50 rounded-xl">
            <div className="relative h-12 w-12 rounded-lg overflow-hidden border border-slate-200">
              <img src={preview} className="h-full w-full object-cover" alt="Preview" />
              {isUploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 className="animate-spin text-white h-4 w-4" />
                </div>
              )}
            </div>
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              onClick={() => { setPreview(null); setUploadedUrl(null); }} 
              className="h-8 w-8 text-slate-400 hover:text-red-500"
            >
              <X size={14} />
            </Button>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* File Upload Trigger */}
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            onClick={() => fileRef.current?.click()} 
            className="text-slate-400 hover:text-slate-900 rounded-full"
          >
            <Paperclip size={20} />
          </Button>
          
          <input 
            type="file" 
            ref={fileRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleUpload} 
          />

          <input 
            value={input} 
            onChange={handleInputChange} 
            onFocus={() => activeChatId && sendMessage(`/app/chat/${activeChatId}/typing`, { isTyping: true, username: auth.username })}
            onBlur={() => activeChatId && sendMessage(`/app/chat/${activeChatId}/typing`, { isTyping: false, username: auth.username })}
            placeholder="Type a message..." 
            className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-400 font-medium" 
          />

          <Button 
            type="submit" 
            disabled={isUploading || (!input.trim() && !uploadedUrl)} 
            className="bg-slate-900 text-white rounded-xl px-5 h-10 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            <Send size={16} />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default MessageInput;