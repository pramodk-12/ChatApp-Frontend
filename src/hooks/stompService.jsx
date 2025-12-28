import { useEffect, useRef, useCallback } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

export const useStomp = (token, onConnect) => {
  const client = useRef(null);

  useEffect(() => {
    if (!token) return;

    const socket = new SockJS("http://localhost:8080/ws");
    const stompClient = new Client({
      webSocketFactory: () => socket,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    stompClient.onConnect = (frame) => {
      console.log("Connected to STOMP");
      onConnect(stompClient);
    };

    stompClient.activate();
    client.current = stompClient;

    return () => {
      if (client.current) client.current.deactivate();
    };
  }, [token]);

  const disconnect = useCallback(() => {
    if (client.current) {
      console.log("Manually disconnecting STOMP...");
      client.current.deactivate();
    }
  }, []);

  const sendMessage = useCallback((destination, body) => {
    if (client.current?.connected) {
      client.current.publish({
        destination,
        body: JSON.stringify(body),
      });
    }
  }, []);

  return { sendMessage, disconnect };
};
