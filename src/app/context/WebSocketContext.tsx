"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { Client } from "@stomp/stompjs";
import { connectStomp, disconnectStomp, sendAuctionMessage, subscribeToAuction } from "@/lib/socket";
import { useAuth } from "./AuthContext";

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
  const { user } = useAuth();

  // 1. connect 함수 시그니처 변경
  const connect = useCallback(async (userUUID?: string, auctionId?: string): Promise<void> => {
    if (isConnecting || isConnected) return;
    try {
      setIsConnecting(true);
      connectionAttemptsRef.current++;
      const client = connectStomp(userUUID, auctionId);
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

  // 2. subscribe 함수에서 auctionId, userUUID를 기억해 connect에 넘길 수 있도록 개선 필요(구조상 Provider에서 auctionId를 알 수 없으므로, 사용처에서 connect 호출 시 userUUID, auctionId를 넘기도록 안내)
  const subscribe = useCallback((destination: string, callback: (message: any) => void, userUUID?: string): string => {
    const subscriptionId = `${destination}_${Date.now()}_${Math.random()}`;
    const subscription: Subscription = {
      id: subscriptionId,
      destination,
      callback,
      subscription: null
    };
    subscriptionsRef.current.set(subscriptionId, subscription);
    if (stompClientRef.current?.connected) {
      // 경매방 구독이면 헤더에 auctionId, userUUID 포함
      const auctionMatch = destination.match(/^\/sub\/auction\/(\w+)$/);
      if (auctionMatch && userUUID) {
        const auctionId = auctionMatch[1];
        const stompSubscription = subscribeToAuction(stompClientRef.current, auctionId, userUUID, callback);
        subscription.subscription = stompSubscription;
      } else {
        // 일반 채널 구독
        const stompSubscription = stompClientRef.current.subscribe(destination, (msg) => {
          callback(JSON.parse(msg.body));
        });
        subscription.subscription = stompSubscription;
      }
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

  // 로그인 상태(user) 변화에 따라 웹소켓 연결/해제
  useEffect(() => {
    if (user) {
      connect();
    } else {
      disconnect();
    }
    // user가 바뀔 때마다 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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