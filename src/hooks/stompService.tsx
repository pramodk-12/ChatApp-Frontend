import { useEffect, useRef, useCallback } from "react";
import { Client, IFrame } from "@stomp/stompjs";
import SockJS from "sockjs-client";
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
// Define the return type of the hook for better consumption in components
interface UseStompReturn {
  sendMessage: (destination: string, body: any) => void;
  disconnect: () => void;
}

export const useStomp = (
  token: string | null | undefined, 
  onConnect: (client: Client) => void
): UseStompReturn => {
  // 1. Type the Ref as a STOMP Client or null
  const client = useRef<Client | null>(null);

  useEffect(() => {
    if (!token) return;

    // SockJS doesn't always have perfect TS definitions depending on version, 
    // but this is the standard way to initialize it.
    const socket = new SockJS(`${BASE_URL}/ws`);
    
    const stompClient = new Client({
      webSocketFactory: () => socket as any,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      // Debug can be helpful during TS migration to see frame details
      debug: (str) => console.log(str),
    });

    stompClient.onConnect = (frame: IFrame) => {
      console.log("Connected to STOMP:", frame.headers['user-name']);
      onConnect(stompClient);
    };

    stompClient.onStompError = (frame) => {
      console.error("Broker reported error: " + frame.headers["message"]);
      console.error("Additional details: " + frame.body);
    };

    stompClient.activate();
    client.current = stompClient;

    return () => {
      if (client.current) {
        client.current.deactivate();
      }
    };
  }, [token, onConnect]);

  const disconnect = useCallback(() => {
    if (client.current) {
      console.log("Manually disconnecting STOMP...");
      client.current.deactivate();
    }
  }, []);

  const sendMessage = useCallback((destination: string, body: any) => {
    if (client.current?.connected) {
      client.current.publish({
        destination,
        body: JSON.stringify(body),
      });
    } else {
      console.warn("STOMP client not connected. Cannot send message.");
    }
  }, []);

  return { sendMessage, disconnect };
};