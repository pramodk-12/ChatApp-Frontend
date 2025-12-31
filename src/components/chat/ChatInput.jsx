import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, X, Send, Loader2 } from "lucide-react";

const MessageInput = ({ auth, activeChatId, activeChat, sendMessage, input, setInput }) => {
  const [preview, setPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const fileRef = useRef();
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setIsUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("http://localhost:8080/api/upload", {
        method: "POST", headers: { Authorization: `Bearer ${auth.token}` }, body: fd,
      });
      if (res.ok) {
        const data = await res.json();
        setUploadedUrl(data.url);
      }
    } catch (err) { setPreview(null); }
    finally { setIsUploading(false); }
  };

  const onSend = (e) => {
    e.preventDefault();
    if ((!input.trim() && !uploadedUrl) || !activeChatId) return;
    sendMessage(`/app/chat/${activeChatId}/send`, { content: input, mediaUrl: uploadedUrl });
    setInput("");
    setPreview(null);
    setUploadedUrl(null);
    sendMessage(`/app/chat/${activeChatId}/typing`, { isTyping: false, username: auth.username });
  };

  if (activeChat?.readOnly) {
    console.log("read only chat");
    return (
      <div className="p-6 text-center text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-50">
        This conversation is read-only
      </div>
    );
  }

  return (
    <div className="p-6 bg-white">
      <form onSubmit={onSend} className="max-w-none mx-auto rounded-2xl border border-slate-200 p-2 shadow-xl shadow-slate-200/40 bg-white">
        {preview && (
          <div className="flex items-center gap-3 p-2 mb-2 bg-slate-50 rounded-xl">
            <div className="relative h-12 w-12 rounded-lg overflow-hidden border border-slate-200">
              <img src={preview} className="h-full w-full object-cover" />
              {isUploading && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 className="animate-spin text-white h-4 w-4" /></div>}
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => {setPreview(null); setUploadedUrl(null);}} className="h-8 w-8 text-slate-400 hover:text-red-500"><X size={14} /></Button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="icon" onClick={() => fileRef.current.click()} className="text-slate-400 hover:text-slate-900 rounded-full"><Paperclip size={20} /></Button>
          <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleUpload} />
          <input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onFocus={() => sendMessage(`/app/chat/${activeChatId}/typing`, { isTyping: true, username: auth.username })}
            onBlur={() => sendMessage(`/app/chat/${activeChatId}/typing`, { isTyping: false, username: auth.username })}
            placeholder="Type a message..." 
            className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-400 font-medium" 
          />
          <Button type="submit" disabled={isUploading || (!input.trim() && !uploadedUrl)} className="bg-slate-900 text-white rounded-xl px-5 h-10 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
            <Send size={16} />
          </Button>
        </div>
      </form>
    </div>
  );
};
export default MessageInput;