"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { Client } from "@stomp/stompjs";
import { connectStomp, disconnectStomp, sendAuctionMessage } from "@/lib/socket";

interface Subscription {
  id: string;
  destination: string;
  callback: (message: any) => void;
  subscription: any;
}

interface WebSocketContextType {
  isConnected: boolean;
  isConnecting: boolean;
  subscribe: (destination: string, callback: (message: any) => void) => string;
  unsubscribe: (subscriptionId: string) => void;
  sendMessage: (destination: string, message: any) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  getConnectionStatus: () => {
    isConnected: boolean;
    isConnecting: boolean;
    subscriptionCount: number;
  };
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const stompClientRef = useRef<Client | null>(null);
  const subscriptionsRef = useRef<Map<string, Subscription>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(async (): Promise<void> => {
    if (isConnecting || isConnected) return;
    try {
      setIsConnecting(true);
      connectionAttemptsRef.current++;
      const client = connectStomp();
      stompClientRef.current = client;
      client.onConnect = () => {
        setIsConnected(true);
        setIsConnecting(false);
        connectionAttemptsRef.current = 0;
        subscriptionsRef.current.forEach((sub) => {
          if (!sub.subscription) {
            const newSubscription = client.subscribe(sub.destination, (msg) => {
              sub.callback(JSON.parse(msg.body));
            });
            sub.subscription = newSubscription;
          }
        });
      };
      client.onDisconnect = () => {
        setIsConnected(false);
        setIsConnecting(false);
        subscriptionsRef.current.forEach((sub) => {
          sub.subscription = null;
        });
      };
      client.onStompError = () => {
        setIsConnected(false);
        setIsConnecting(false);
        handleReconnect();
      };
      client.onWebSocketError = () => {
        setIsConnected(false);
        setIsConnecting(false);
        handleReconnect();
      };
    } catch (error) {
      setIsConnecting(false);
      handleReconnect();
    }
  }, []);

  const handleReconnect = useCallback(() => {
    if (connectionAttemptsRef.current >= maxReconnectAttempts) return;
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    const delay = Math.min(1000 * Math.pow(2, connectionAttemptsRef.current), 30000);
    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, []);

  const subscribe = useCallback((destination: string, callback: (message: any) => void): string => {
    const subscriptionId = `${destination}_${Date.now()}_${Math.random()}`;
    const subscription: Subscription = {
      id: subscriptionId,
      destination,
      callback,
      subscription: null
    };
    subscriptionsRef.current.set(subscriptionId, subscription);
    if (stompClientRef.current?.connected) {
      const stompSubscription = stompClientRef.current.subscribe(destination, (msg) => {
        callback(JSON.parse(msg.body));
      });
      subscription.subscription = stompSubscription;
    }
    return subscriptionId;
  }, []);

  const unsubscribe = useCallback((subscriptionId: string) => {
    const subscription = subscriptionsRef.current.get(subscriptionId);
    if (subscription) {
      if (subscription.subscription) {
        subscription.subscription.unsubscribe();
      }
      subscriptionsRef.current.delete(subscriptionId);
    }
  }, []);

  const sendMessage = useCallback((destination: string, message: any) => {
    if (!stompClientRef.current?.connected) return;
    sendAuctionMessage(destination, message);
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    subscriptionsRef.current.forEach((sub) => {
      if (sub.subscription) sub.subscription.unsubscribe();
    });
    subscriptionsRef.current.clear();
    if (stompClientRef.current) {
      disconnectStomp();
      stompClientRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    connectionAttemptsRef.current = 0;
  }, []);

  const getConnectionStatus = useCallback(() => ({
    isConnected,
    isConnecting,
    subscriptionCount: subscriptionsRef.current.size
  }), []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{
      isConnected,
      isConnecting,
      subscribe,
      unsubscribe,
      sendMessage,
      connect,
      disconnect,
      getConnectionStatus
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) throw new Error("useWebSocket must be used within WebSocketProvider");
  return context;
}; 