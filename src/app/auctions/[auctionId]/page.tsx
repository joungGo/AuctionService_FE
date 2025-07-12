// src/app/auctions/[auctionId]/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  connectStomp,
  subscribeToAuction,
  disconnectStomp,
  sendAuctionMessage,
} from "@/lib/socket";
import { getAuctionDetail } from "@/lib/api/auction";
import AuctionForm from "@/components/auction/AuctionForm";
import AuctionChat from "@/components/auction/AuctionChat";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Client } from "@stomp/stompjs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/context/AuthContext";

interface Message { id: number; sender: string; text: string; isMe: boolean; }
interface AuctionEndMessage { auctionId: number; winnerNickname: string; winningBid: number; }
interface Auction { product: { name: string; imageUrl: string; description: string; }; startPrice: number; currentBid: number; minBid: number; endTime: string; }

export default function AuctionPage() {
  const { auctionId } = useParams() as { auctionId: string };
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [auction, setAuction] = useState<Auction | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [auctionEndData, setAuctionEndData] = useState<AuctionEndMessage | null>(null);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [canBid, setCanBid] = useState(true); // ✅ 버튼 비활성화 제어
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const [client, setClient] = useState<Client | null>(null);

  // Toast 표시 함수
  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      setToastMessage(null);
    }, 4000);
  };

  // 로그인 체크
  useEffect(() => {
    if (!isLoading && !user) {
      alert("로그인이 필요합니다.");
      router.push("/auth/login");
    }
  }, [user, isLoading, router]);

  // 웹소켓 연결 및 메시지 수신
  useEffect(() => {
    if (!user || !auctionId) return;

    // 쿠키 기반 인증으로 변경 (토큰 전달하지 않음)
    const stompClient = connectStomp();
    setClient(stompClient);

    subscribeToAuction(stompClient, auctionId, (msg) => {
      console.log("[AuctionPage] 웹소켓 메시지 수신:", msg);

      if (msg.winnerNickname && msg.winningBid !== undefined) {
        setAuctionEndData(msg);
        setShowEndDialog(true);
        return;
      }

      // 입찰 실패 메시지 처리
      if (msg.message && msg.message.includes("입찰 실패")) {
        console.warn("[AuctionPage] 입찰 실패:", msg.message);
        
        // Toast 알림으로 사용자에게 구체적인 실패 사유 알림
        showToastMessage(msg.message);
        
        // 이미 최고 입찰자인 경우 입찰 버튼 비활성화 유지
        if (msg.message.includes("이미 최고 입찰자입니다")) {
          setCanBid(false);
        } else {
          setCanBid(true); // 다른 실패 사유인 경우 다시 활성화
        }
        return;
      }

      // 입찰 성공 메시지 처리
      if (msg.message && msg.message.includes("입찰 성공")) {
        setMessages((prev) => {
          const bidAmount = msg.currentBid || 0;
          if (prev.some((m) => m.text === `${bidAmount.toLocaleString()}원 입찰!`)) return prev;
          return [...prev, { 
            id: Date.now(), 
            sender: msg.nickname || "익명", 
            text: `${bidAmount.toLocaleString()}원 입찰!`, 
            isMe: msg.nickname === user.nickname 
          }];
        });

        setAuction((prev: Auction | null) => (prev ? { ...prev, currentBid: msg.currentBid } : prev));

        // 다른 사용자가 입찰하면 다시 활성화, 내가 입찰하면 비활성화 유지
        if (msg.nickname !== user.nickname) {
          setCanBid(true);
        }
      }
    });

    return () => disconnectStomp();
  }, [user, auctionId]);

  // 경매 상세 조회
  useEffect(() => {
    (async () => {
      const data = await getAuctionDetail(auctionId);
      if (data?.data) {
        setAuction(data.data);
        calculateTimeLeft(data.data.endTime);
      }
    })();
  }, [auctionId]);

  // 남은 시간 계산
  useEffect(() => {
    if (!auction?.endTime) return;
    const interval = setInterval(() => calculateTimeLeft(auction.endTime), 1000);
    return () => clearInterval(interval);
  }, [auction?.endTime]);

  const calculateTimeLeft = (endTime: string) => {
    const end = new Date(endTime).getTime();
    const now = new Date().getTime();
    const diff = end - now;

    if (diff <= 0) return setTimeLeft("경매 종료");

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    setTimeLeft(days > 0 ? `${days}일 ${hours}시 ${minutes}분 ${seconds}초 남음` : `${hours}시 ${minutes}분 ${seconds}초 남음`);
  };

  useEffect(() => {
    if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
  }, [messages.length]);

  // 입찰
  const handleBid = async (amount: number) => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (!client || !client.connected) {
      console.error("[AuctionPage] STOMP 연결되지 않음. 메시지 전송 실패.");
      alert("서버와 연결이 끊어졌습니다. 페이지를 새로고침 해주세요.");
      return;
    }

    console.log("[AuctionPage] 입찰 메시지 전송 시도:", { auctionId, userUUID: user.userUUID, amount });
    // 쿠키 기반 인증으로 변경 (토큰 전달하지 않음)
    sendAuctionMessage("/app/auction/bid", { auctionId, amount });
    setCanBid(false); // ✅ 내가 입찰하면 비활성화
  };

  const timeLeftColor = timeLeft !== "경매 종료" && auction && new Date(auction.endTime).getTime() - new Date().getTime() <= 5 * 60 * 1000
    ? "text-red-500" : "text-blue-600";

  if (isLoading) return <p>Loading...</p>;
  if (!user) return <p>로그인이 필요합니다.</p>;
  if (!auction) return <p>경매 정보를 불러오는 중...</p>;

  return (
    <>
      {/* Toast 알림 */}
      {showToast && toastMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg">
          {toastMessage}
        </div>
      )}

      {auctionEndData && (
        <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>🏆 경매 종료 🏆</DialogTitle></DialogHeader>
            <p>낙찰자: {auctionEndData.winnerNickname}</p>
            <p>낙찰 금액: {(auctionEndData.winningBid || 0).toLocaleString()}원</p>
            <DialogFooter><Button onClick={() => router.push("/")}>메인으로 이동</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      <div className="flex flex-col md:flex-row max-w-7xl mx-auto border rounded-lg shadow-lg overflow-hidden my-8 h-[700px]">
        <div className="md:w-2/3 w-full p-6 border-r flex flex-col gap-4 overflow-y-auto">
          <h1 className="text-2xl font-bold">{auction.product?.name}</h1>
          <img src={auction.product?.imageUrl || "/default-image.jpg"} alt="product" className="w-full h-80 object-cover rounded" />
          <p className="text-gray-700">{auction.product?.description}</p>
          <p className="text-lg">시작가: {(auction.startPrice || 0).toLocaleString()}원</p>
          <p className="text-xl font-bold">현재가: <span className="text-3xl text-green-600">{(auction.currentBid || auction.startPrice || 0).toLocaleString()}원</span></p>
          <p className={`font-semibold ${timeLeftColor}`}>{timeLeft}</p>
        </div>
        <div className="md:w-1/3 w-full p-4 flex flex-col gap-4">
          <div ref={chatContainerRef} className="border rounded-lg bg-gray-100 p-3 overflow-y-auto flex-1 min-h-0">
            <AuctionChat messages={messages} />
          </div>
          <AuctionForm 
            highestBid={auction.currentBid || auction.startPrice || 0} 
            minBid={auction.minBid || 0} 
            onBid={handleBid} 
            canBid={canBid} 
          />
        </div>
      </div>
    </>
  );
}