// src/types/index.ts

export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';
export type ChatType = 'PRIVATE' | 'GROUP';

export interface User {
  id: number;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface MessageDTO {
  id: number;
  chatId: number;
  senderId: number;
  content: string;
  status: MessageStatus;
  timestamp: string;
}

export interface ChatDTO {
  id: number;
  name: string;
  type: ChatType;
  readOnly: boolean;
  avatarUrl?: string;
  unreadCount: number;
  lastMessage?: string;
  otherUserId?: number; // Crucial for the online status dot we discussed
}

export interface UserAuth {
  id: number;           // The unique database ID from your User entity
  username: string;     // The unique login name
  token: string;        // The JWT Bearer token used for all subsequent API calls
  avatarUrl?: string;   // Optional URL to the profile image
  displayName?: string; // Optional friendly name (e.g., "Pramod")
}