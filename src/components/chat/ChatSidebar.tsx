import React, { useRef } from "react";
import { LogOut, UserPlus, Hash, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// Types & Sub-components
import { UserAuth, ChatDTO } from "@/types";
import FriendList from "../FriendList";

interface SidebarProps {
  auth: UserAuth;
  myChats: ChatDTO[];
  activeChatId: number | null;
  setActiveChatId: (id: number) => void;
  sidebarView: "chats" | "friends";
  setSidebarView: (view: "chats" | "friends") => void;
  onlineUsers: number[]; // Array of User IDs
  handleContactClick: (userId: number) => void;
  onProfileUpdate: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setShowGroupModal: (show: boolean) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  auth,
  myChats,
  activeChatId,
  setActiveChatId,
  sidebarView,
  setSidebarView,
  onlineUsers,
  handleContactClick,
  onProfileUpdate,
  setShowGroupModal,
  onLogout,
}) => {
  const profileInputRef = useRef<HTMLInputElement>(null);

  return (
    <aside className="w-[320px] flex flex-col bg-slate-50/50 border-r border-slate-100 h-full">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black tracking-tighter">CHATLY</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onLogout}
            className="text-slate-400 hover:text-red-500 rounded-full transition-colors"
          >
            <LogOut size={18} />
          </Button>
        </div>

        {/* View Toggler */}
        <div className="flex bg-slate-200/50 p-1 rounded-lg">
          <button
            onClick={() => setSidebarView("chats")}
            className={`flex-1 py-1.5 text-[10px] font-black rounded-md transition-all ${
              sidebarView === "chats"
                ? "bg-white shadow-sm text-slate-900"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            CHATS
          </button>
          <button
            onClick={() => setSidebarView("friends")}
            className={`flex-1 py-1.5 text-[10px] font-black rounded-md transition-all ${
              sidebarView === "friends"
                ? "bg-white shadow-sm text-slate-900"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            FRIENDS
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4">
        {sidebarView === "chats" ? (
          <div className="space-y-6">
            {/* New Group Button */}
            <Button
              variant="outline"
              className="w-full justify-start gap-3 border-dashed border-slate-300 h-12 rounded-xl text-slate-500 mt-4 hover:border-slate-400 hover:bg-slate-100/50 transition-all"
              onClick={() => setShowGroupModal(true)}
            >
              <UserPlus size={16} />
              <span className="text-[10px] font-black uppercase">
                New Group
              </span>
            </Button>

            {/* Recent Chats Section */}
            <div className="space-y-1">
              <h3 className="px-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Recent Conversations
              </h3>

              {myChats.length > 0 ? (
                myChats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => setActiveChatId(chat.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                      activeChatId === chat.id
                        ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                        : "hover:bg-slate-200/50"
                    }`}
                  >
                    <div className="relative">
                      <Avatar
                        className={`h-10 w-10 border ${
                          activeChatId === chat.id
                            ? "border-white/10"
                            : "border-slate-200"
                        }`}
                      >
                        <AvatarImage
                          src={chat.avatarUrl}
                          className="object-cover"
                        />
                        <AvatarFallback
                          className={
                            activeChatId === chat.id
                              ? "bg-white/10 text-white"
                              : "bg-slate-200 text-slate-500"
                          }
                        >
                          {chat.type === "PRIVATE" ? (
                            chat.name.charAt(0).toUpperCase()
                          ) : (
                            <Hash size={16} />
                          )}
                        </AvatarFallback>
                      </Avatar>

                      {/* Online Indicator for Private Chats */}
                      {chat.type === "PRIVATE" &&
                        chat.otherUserId &&
                        onlineUsers.includes(chat.otherUserId) && (
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                        )}
                    </div>

                    <div className="flex-1 overflow-hidden">
                      <p className="font-bold text-sm truncate">{chat.name}</p>
                      <p
                        className={`text-[10px] uppercase font-black tracking-tighter ${
                          activeChatId === chat.id
                            ? "text-slate-400"
                            : "text-slate-500"
                        }`}
                      >
                        {chat.type.toLowerCase()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <p className="text-xs text-slate-400 italic">
                    No recent chats. Start one from the Friends tab!
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <FriendList
            auth={auth}
            onChatStart={(id: number) => {
              handleContactClick(id);
              setSidebarView("chats");
            }}
          />
        )}
      </ScrollArea>

      {/* User Profile Footer */}
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="flex items-center gap-3 p-2 rounded-xl border border-slate-100">
          <div
            className="relative group cursor-pointer h-10 w-10 shrink-0"
            onClick={() => profileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={profileInputRef}
              className="hidden"
              accept="image/*"
              onChange={onProfileUpdate}
            />

            <Avatar className="h-10 w-10 border-2 border-slate-50">
              <AvatarImage src={auth.avatarUrl} className="object-cover" />
              <AvatarFallback className="bg-slate-900 text-white font-black">
                {auth.username?.[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
              <Camera size={12} className="text-white" />
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-black text-slate-900 uppercase truncate">
              {auth.displayName || auth.username}
            </p>
            <Badge
              variant="outline"
              className="text-[9px] h-4 bg-green-50 text-green-700 border-green-200 font-black uppercase"
            >
              Online
            </Badge>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;