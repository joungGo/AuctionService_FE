"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  connectStomp,
  subscribeToAuction,
  disconnectStomp,
  sendAuctionMessage,
} from "@/lib/socket";
import { getAuctionBidDetail } from "@/lib/api/auction";
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
import { useWebSocket } from "@/app/context/WebSocketContext";
import { UserGroupIcon } from '@heroicons/react/24/solid';

interface Message { id: number; sender: string; text: string; isMe: boolean; timestamp: Date; }
interface AuctionEndMessage { auctionId: number; winnerNickname: string; winningBid: number; }
// 실제 API 응답 구조에 맞게 수정
interface Auction { 
  auctionId: number;
  productName: string; 
  imageUrl: string; 
  description?: string; 
  startPrice: number; 
  currentBid: number; 
  minBid: number; 
  endTime: string;
  startTime: string;
  highestBidderUUID?: string;
  highestBidderNickname?: string;
}

export default function BidPage() {
  const { auctionId } = useParams() as { auctionId: string };
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [auction, setAuction] = useState<Auction | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [auctionEndData, setAuctionEndData] = useState<AuctionEndMessage | null>(null);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [canBid, setCanBid] = useState(true);
  const [bidCount, setBidCount] = useState(0);
  const [bidAmount, setBidAmount] = useState<string>("");
  const [participantCount, setParticipantCount] = useState<number | null>(null);

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const { subscribe, unsubscribe, sendMessage, isConnected, connect } = useWebSocket();
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

  // 기존 로그인 체크 로직 유지
  useEffect(() => {
    if (!isLoading && !user) {
      alert("로그인이 필요합니다.");
      router.push("/auth/login");
    }
  }, [user, isLoading, router]);

  // 웹소켓 구독 관리
  useEffect(() => {
    if (!user || !auctionId || !isConnected) return;
    const subId = subscribe(`/sub/auction/${auctionId}`, (msg) => {
      console.log("[BidPage] 웹소켓 메시지 수신:", msg);
      // 실시간 참여자 수 메시지 처리
      if (typeof msg.participantCount === 'number') {
        setParticipantCount(msg.participantCount);
      }
      // 경매 종료 메시지 처리
      if (msg.winnerNickname && msg.winningBid !== undefined) {
        setAuctionEndData(msg);
        setShowEndDialog(true);
        return;
      }
      // 입찰 실패 메시지 처리
      if (msg.message && msg.message.includes("실패")) {
        alert(msg.message);
        setCanBid(true);
        return;
      }
      // 성공한 입찰 처리
      if (msg.nickname !== "System" && msg.currentBid > 0) {
        setMessages((prev) => {
          const bidAmountValue = msg.currentBid || 0;
          if (prev.some((m) => m.text === `${bidAmountValue.toLocaleString()}원 입찰!`)) return prev;
          return [...prev, { 
            id: Date.now(), 
            sender: msg.nickname || "익명", 
            text: `${bidAmountValue.toLocaleString()}원 입찰!`, 
            isMe: msg.nickname === user.nickname,
            timestamp: new Date()
          }];
        });
        setAuction((prev: Auction | null) => {
          if (prev) {
            // 실시간 최고 입찰자 정보 업데이트
            const updatedAuction = { 
              ...prev, 
              currentBid: msg.currentBid,
              highestBidderUUID: msg.userUUID,  // 실시간 업데이트
              highestBidderNickname: msg.nickname
            };
            const currentBid = msg.currentBid || updatedAuction.startPrice || 0;
            const minBid = updatedAuction.minBid || 1000;
            const nextBid = currentBid + minBid;
            setBidAmount(nextBid.toString());
            return updatedAuction;
          }
          return prev;
        });
        setBidCount(prev => prev + 1);
        if (msg.nickname !== user.nickname) setCanBid(true);
      }
    }, user.userUUID);
    setSubscriptionId(subId);
    return () => {
      if (subId) unsubscribe(subId);
    };
  }, [user, auctionId, isConnected, subscribe, unsubscribe]);

  // 입찰 페이지 진입 시 참여자 집계 메시지 전송
  useEffect(() => {
    if (user && auctionId && isConnected) {
      sendMessage("/app/auction/participant/join", { auctionId, userUUID: user.userUUID });
    }
    // 입찰 페이지 이탈 시 참여자 집계 메시지 전송
    return () => {
      if (user && auctionId && isConnected) {
        sendMessage("/app/auction/participant/leave", { auctionId, userUUID: user.userUUID });
      }
    };
  }, [user, auctionId, isConnected, sendMessage]);

  // 입찰 페이지에 머무는 동안 주기적으로 ping 메시지 전송 (유령 참여자 방지)
  useEffect(() => {
    if (user && auctionId && isConnected) {
      const interval = setInterval(() => {
        sendMessage("/app/auction/participant/ping", { auctionId, userUUID: user.userUUID });
      }, 30000); // 30초마다 ping
      return () => clearInterval(interval);
    }
  }, [user, auctionId, isConnected, sendMessage]);

  // 창/탭 종료 시 leave 메시지 전송
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (user && auctionId && isConnected) {
        sendMessage("/app/auction/participant/leave", { auctionId, userUUID: user.userUUID });
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user, auctionId, isConnected, sendMessage]);

  // 로그아웃 시 leave 메시지 전송 (login-status-change 이벤트 활용)
  useEffect(() => {
    const handleLogout = () => {
      if (user && auctionId && isConnected) {
        sendMessage("/app/auction/participant/leave", { auctionId, userUUID: user.userUUID });
      }
    };
    window.addEventListener("login-status-change", handleLogout);
    return () => {
      window.removeEventListener("login-status-change", handleLogout);
    };
  }, [user, auctionId, isConnected, sendMessage]);

  // 라우터 이동(입찰 페이지 이탈) 시 leave 메시지 전송
  useEffect(() => {
    const handleRouteChange = () => {
      if (user && auctionId && isConnected) {
        sendMessage("/app/auction/participant/leave", { auctionId, userUUID: user.userUUID });
      }
    };
    router.events?.on?.("routeChangeStart", handleRouteChange);
    return () => {
      router.events?.off?.("routeChangeStart", handleRouteChange);
    };
  }, [user, auctionId, isConnected, sendMessage, router]);

  // 입찰 페이지 전용 상세 정보 조회
  useEffect(() => {
    (async () => {
      const data = await getAuctionBidDetail(auctionId);
      if (data) {
        setAuction(data);
        calculateTimeLeft(data.endTime);
        // 초기 입찰가 설정
        const currentBid = data.currentBid || data.startPrice || 0;
        const minBid = data.minBid || 1000;
        const nextBid = currentBid + minBid;
        setBidAmount(nextBid.toString());
      }
    })();
  }, [auctionId]);

  // 기존 시간 계산 로직 유지
  useEffect(() => {
    if (!auction?.endTime) return;
    const interval = setInterval(() => calculateTimeLeft(auction.endTime), 1000);
    return () => clearInterval(interval);
  }, [auction?.endTime]);

  // 새로운 메시지가 추가될 때 자동 스크롤
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = 0; // 최신 메시지가 위에 있으므로 맨 위로 스크롤
    }
  }, [messages]);

  useEffect(() => {
    if (user && auctionId) {
      connect(user.userUUID, auctionId);
    }
  }, [user, auctionId, connect]);

  const calculateTimeLeft = (endTime: string) => {
    const end = new Date(endTime).getTime();
    const now = new Date().getTime();
    const diff = end - now;

    if (diff <= 0) return setTimeLeft("경매 종료");

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    // 항상 초까지 표시하되, 0인 값들은 생략
    let timeStr = "";
    if (days > 0) timeStr += `${days}일 `;
    if (hours > 0) timeStr += `${hours}시간 `;
    if (minutes > 0) timeStr += `${minutes}분 `;
    timeStr += `${seconds}초`;
    
    setTimeLeft(timeStr.trim());
  };

  // 입찰 처리
  const handleBid = async (amount: number) => {
    if (!user || !isConnected) {
      alert("로그인이 필요하거나 서버 연결이 끊어졌습니다.");
      return;
    }
    sendMessage("/app/auction/bid", { auctionId, amount });
    setCanBid(false);
  };

  // 입찰 버튼 클릭 핸들러
  const handleBidClick = () => {
    if (!auction) return;
    
    const amount = parseInt(bidAmount);
    if (isNaN(amount)) {
      alert("올바른 금액을 입력해주세요.");
      return;
    }

    const currentBid = auction.currentBid || auction.startPrice || 0;
    const minBid = auction.minBid || 1000;
    const minNextBid = currentBid + minBid;

    if (amount < minNextBid) {
      alert(`최소 입찰가는 ${minNextBid.toLocaleString()}원입니다.`);
      return;
    }
    
    if (confirm(`${amount.toLocaleString()}원으로 입찰하시겠습니까?`)) {
      handleBid(amount);
    }
  };

  // 상세 페이지와 동일한 경매 이름 추출 함수 추가
  const getAuctionName = (auction: any) =>
    auction.product?.productName || auction.productName || auction.name || auction.auctionName || "경매 상품";

  // 최고 입찰자 상태에 따라 버튼 비활성화
  const isHighestBidder = user && auction && auction.highestBidderUUID === user.userUUID;

  if (isLoading) return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  if (!user) return <div className="flex justify-center items-center min-h-screen">로그인이 필요합니다.</div>;
  if (!auction) return <div className="flex justify-center items-center min-h-screen">경매 정보를 불러오는 중...</div>;

  return (
    <>
      {/* 경매 종료 다이얼로그 - 기존 로직 유지 */}
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

      {/* Figma 디자인 100% 반영 */}
      <div className="bg-[#ffffff] box-border content-stretch flex flex-col items-start justify-start p-0 relative size-full">
        <div className="bg-neutral-50 min-h-[800px] relative shrink-0 w-full">
          <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col items-start justify-start min-h-inherit overflow-clip p-0 relative w-full">
            
            {/* 메인 컨텐츠 - 2분할 레이아웃 */}
            <div className="relative shrink-0 w-full min-h-screen">
              <div className="flex flex-row justify-center relative size-full">
                <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-row items-start justify-center px-8 py-5 relative w-full max-w-[1600px]">
                  
                  {/* 왼쪽: 기존 UI */}
                  <div className="basis-0 grow max-w-[700px] min-h-px min-w-px relative shrink-0 pr-4">
                    <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col items-start justify-start max-w-inherit overflow-clip p-0 relative w-full">
                      
                      {/* 브레드크럼 */}
                      <div className="relative shrink-0 w-full">
                        <div className="relative size-full">
                          <div className="[flex-flow:wrap] bg-clip-padding border-0 border-[transparent] border-solid box-border content-start flex gap-2 items-start justify-start p-[16px] relative w-full">
                            <Link href="/" className="font-['Work_Sans:Medium','Noto_Sans_KR:Regular',sans-serif] font-medium text-[#5c738a] text-[16px] leading-[24px]">
                              홈
                            </Link>
                            <span className="font-['Work_Sans:Medium',sans-serif] font-medium text-[#5c738a] text-[16px] leading-[24px]">/</span>
                            <span className="font-['Work_Sans:Medium','Noto_Sans_KR:Regular',sans-serif] font-medium text-[#5c738a] text-[16px] leading-[24px]">수집품</span>
                            <span className="font-['Work_Sans:Medium',sans-serif] font-medium text-[#5c738a] text-[16px] leading-[24px]">/</span>
                            <span className="font-['Work_Sans:Medium','Noto_Sans_KR:Regular',sans-serif] font-medium text-[#0f1417] text-[16px] leading-[24px]">{getAuctionName(auction)}</span>
                          </div>
                        </div>
                      </div>

                      {/* 제목 */}
                      <div className="relative shrink-0 w-full">
                        <div className="relative size-full">
                          <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col items-start justify-start pb-3 pt-5 px-4 relative w-full">
                            <div className="flex items-center gap-3 font-['Work_Sans:Bold','Noto_Sans_KR:Bold',sans-serif] font-bold text-[#0f1417] text-[22px] leading-[28px] w-full">
                              <span>{getAuctionName(auction)}</span>
                              <span className="flex items-center bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                                👥 {participantCount !== null ? `${participantCount}명` : '-'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 이미지 */}
                      <div className="bg-neutral-50 relative shrink-0 w-full">
                        <div className="relative size-full">
                          <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-row items-start justify-start p-[16px] relative w-full">
                            <div className="basis-0 bg-neutral-50 grow min-h-px min-w-px relative rounded-xl shrink-0">
                              <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-row gap-2 items-start justify-start overflow-clip p-0 relative w-full">
                                <div className="basis-0 bg-center bg-cover bg-no-repeat grow h-[619px] min-h-px min-w-px relative shrink-0">
                                  {auction.imageUrl && auction.imageUrl.trim() ? (
                                    <img
                                      src={auction.imageUrl.startsWith('http') ? auction.imageUrl.trim() : `https://${auction.imageUrl.trim()}`}
                                      alt={auction.productName || "경매 상품"}
                                      className="w-full h-[619px] object-cover rounded-lg"
                                    />
                                  ) : (
                                    <div className="w-full h-[619px] bg-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-400">
                                      <svg className="w-20 h-20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z" />
                                      </svg>
                                      <span className="text-lg">이미지 없음</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 설명 */}
                      {auction.description && (
                        <div className="relative shrink-0 w-full">
                          <div className="relative size-full">
                            <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col items-start justify-start pb-3 pt-1 px-4 relative w-full">
                              <p className="font-['Work_Sans:Regular','Noto_Sans_KR:Regular',sans-serif] font-normal text-[#0f1417] text-[16px] leading-[24px] w-full">
                                {auction.description || "상품 설명이 없습니다."}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 경매 상세 정보 제목 */}
                      <div className="relative shrink-0 w-full">
                        <div className="relative size-full">
                          <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col items-start justify-start pb-2 pt-4 px-4 relative w-full">
                            <h2 className="font-['Work_Sans:Bold','Noto_Sans_KR:Bold',sans-serif] font-bold text-[#0f1417] text-[18px] leading-[23px] w-full">
                              경매 상세 정보
                            </h2>
                          </div>
                        </div>
                      </div>

                      {/* 경매 상세 정보 테이블 */}
                      <div className="relative shrink-0 w-full">
                        <div className="flex flex-col gap-6 items-start justify-start p-[16px] relative w-full">
                          
                          {/* 첫 번째 행: 시작 가격 / 현재 입찰가 */}
                          <div className="flex flex-row gap-6 items-start justify-start w-full">
                            <div className="w-[186px] relative">
                              <div className="absolute border-[#e5e8eb] border-[1px_0px_0px] border-solid inset-0 pointer-events-none" />
                              <div className="flex flex-col items-start justify-start pb-5 pt-[21px] px-0 relative w-[186px]">
                                <div className="font-['Work_Sans:Regular','Noto_Sans_KR:Regular',sans-serif] font-normal text-[#5c738a] text-[14px] leading-[21px] w-full">
                                  시작 가격
                                </div>
                                <div className="font-['Work_Sans:Regular',sans-serif] font-normal text-[#0f1417] text-[14px] leading-[21px] w-full">
                                  {(auction.startPrice || 0).toLocaleString()}원
                                </div>
                              </div>
                            </div>
                            <div className="w-[718px] relative">
                              <div className="absolute border-[#e5e8eb] border-[1px_0px_0px] border-solid inset-0 pointer-events-none" />
                              <div className="flex flex-col items-start justify-start pb-5 pt-[21px] px-0 relative w-[718px]">
                                <div className="font-['Work_Sans:Regular','Noto_Sans_KR:Regular',sans-serif] font-normal text-[#5c738a] text-[14px] leading-[21px] w-full">
                                  현재 입찰가
                                </div>
                                <div className="font-['Work_Sans:Regular',sans-serif] font-normal text-[#0f1417] text-[14px] leading-[21px] w-full">
                                  {(auction.currentBid || auction.startPrice || 0).toLocaleString()}원
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 두 번째 행: 입찰 횟수 / 남은 시간 */}
                          <div className="flex flex-row gap-6 items-start justify-start w-full">
                            <div className="w-[186px] relative">
                              <div className="absolute border-[#e5e8eb] border-[1px_0px_0px] border-solid inset-0 pointer-events-none" />
                              <div className="flex flex-col items-start justify-start pb-5 pt-[21px] px-0 relative w-[186px]">
                                <div className="font-['Work_Sans:Regular','Noto_Sans_KR:Regular',sans-serif] font-normal text-[#5c738a] text-[14px] leading-[21px] w-full">
                                  입찰 횟수
                                </div>
                                <div className="font-['Work_Sans:Regular',sans-serif] font-normal text-[#0f1417] text-[14px] leading-[21px] w-full">
                                  {bidCount > 0 ? bidCount : '-'}
                                </div>
                              </div>
                            </div>
                            <div className="w-[718px] relative">
                              <div className="absolute border-[#e5e8eb] border-[1px_0px_0px] border-solid inset-0 pointer-events-none" />
                              <div className="flex flex-col items-start justify-start pb-5 pt-[21px] px-0 relative w-[718px]">
                                <div className="font-['Work_Sans:Regular','Noto_Sans_KR:Regular',sans-serif] font-normal text-[#5c738a] text-[14px] leading-[21px] w-full">
                                  남은 시간
                                </div>
                                <div className="font-['Work_Sans:Regular','Noto_Sans_KR:Regular',sans-serif] font-normal text-[#0f1417] text-[14px] leading-[21px] w-full">
                                  {timeLeft}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                        </div>
                      </div>

                      {/* 입찰하기 제목 */}
                      <div className="relative shrink-0 w-full">
                        <div className="relative size-full">
                          <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col items-start justify-start pb-2 pt-4 px-4 relative w-full">
                            <h2 className="font-['Work_Sans:Bold','Noto_Sans_KR:Bold',sans-serif] font-bold text-[#0f1417] text-[18px] leading-[23px] w-full">
                              입찰하기
                            </h2>
                          </div>
                        </div>
                      </div>

                      {/* 입찰가 입력 */}
                      <div className="max-w-[480px] relative shrink-0">
                        <div className="[flex-flow:wrap] bg-clip-padding border-0 border-[transparent] border-solid box-border content-end flex gap-4 items-end justify-start max-w-inherit px-4 py-3 relative">
                          <div className="basis-0 grow min-h-px min-w-40 relative shrink-0">
                            <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col items-start justify-start min-w-inherit p-0 relative w-full">
                              <div className="relative shrink-0 w-full">
                                <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col items-start justify-start pb-2 pt-0 px-0 relative w-full">
                                  <div className="font-['Work_Sans:Medium','Noto_Sans_KR:Regular',sans-serif] font-medium text-[#0f1417] text-[16px] leading-[24px] w-full">
                                    입찰가
                                  </div>
                                </div>
                              </div>
                              <div className="bg-neutral-50 h-14 relative rounded-xl shrink-0 w-full">
                                <div className="flex flex-row items-center overflow-clip relative size-full">
                                  <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-row h-14 items-center justify-start p-[16px] relative w-full">
                                    <input
                                      type="number"
                                      value={bidAmount}
                                      onChange={(e) => setBidAmount(e.target.value)}
                                      className="bg-transparent font-['Work_Sans:Regular',sans-serif] font-normal text-[#0f1417] text-[16px] leading-[24px] w-full outline-none"
                                      placeholder="입찰가를 입력하세요"
                                    />
                                  </div>
                                </div>
                                <div className="absolute border border-[#d4dbe3] border-solid inset-0 pointer-events-none rounded-xl" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 입찰하기 버튼 */}
                      <div className="relative shrink-0 w-full">
                        <div className="relative size-full">
                          <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-row items-start justify-start px-4 py-3 relative w-full">
                            <button
                              onClick={handleBidClick}
                              disabled={isHighestBidder || !canBid || timeLeft === "경매 종료"}
                              className="basis-0 bg-[#dbe8f2] grow h-10 max-w-[480px] min-h-px min-w-[84px] relative rounded-xl shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#c5d6e6] transition-colors"
                            >
                              <div className="flex flex-row items-center justify-center max-w-inherit min-w-inherit overflow-clip relative size-full">
                                <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-row h-10 items-center justify-center max-w-inherit min-w-inherit px-4 py-0 relative w-full">
                                  <div className="font-['Work_Sans:Bold','Noto_Sans_KR:Bold',sans-serif] font-bold text-[#0f1417] text-[14px] leading-[21px] text-center">
                                    {isHighestBidder ? "최고 입찰자입니다" : "입찰하기"}
                                  </div>
                                </div>
                              </div>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* 실시간 참여자 수 표기 */}
                      {/* 상단 우측 고정, 아이콘+컬러+애니메이션 강조 */}
                      {/* 기존 상단 우측 고정 참여자 UI 완전 제거 */}

                                          </div>
                  </div>

                  {/* 오른쪽: 실시간 입찰 내역 */}
                  <div className="basis-0 grow max-w-[700px] min-h-px min-w-px relative shrink-0 pl-4">
                    <div className="bg-white rounded-lg shadow-sm border border-[#e5e8eb] h-full flex flex-col">
                      
                      {/* 실시간 입찰 내역 헤더 */}
                      <div className="p-6 border-b border-[#e5e8eb]">
                        <h2 className="font-['Work_Sans:Bold','Noto_Sans_KR:Bold',sans-serif] font-bold text-[#0f1417] text-[20px] leading-[25px]">
                          실시간 입찰 내역
                        </h2>
                        <p className="text-[#5c738a] text-[14px] mt-1">
                          총 {messages.length}건의 입찰
                        </p>
                      </div>

                      {/* 실시간 입찰 내역 목록 */}
                      <div className="flex-1 p-4 min-h-0">
                        <div 
                          className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                          ref={chatContainerRef}
                        >
                          {messages.length > 0 ? (
                            <div className="space-y-3">
                              {messages
                                .slice()
                                .reverse()
                                .map((message) => (
                                  <div
                                    key={message.id}
                                    className={`flex items-start gap-3 p-4 rounded-xl transition-all duration-200 ${
                                      message.isMe
                                        ? "bg-[#dbe8f2] border-l-4 border-[#0f1417] ml-4"
                                        : "bg-gray-50 border-l-4 border-[#5c738a] mr-4"
                                    }`}
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className={`text-base font-bold ${
                                          message.isMe ? "text-[#0f1417]" : "text-[#5c738a]"
                                        }`}>
                                          {message.isMe ? "나" : message.sender}
                                        </span>
                                        <span className="text-xs text-[#5c738a] bg-white px-2 py-1 rounded-full">
                                          {message.timestamp.toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit'
                                          })}
                                        </span>
                                      </div>
                                      <div className="text-base font-semibold text-[#0f1417]">
                                        {message.text}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center">
                              <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m0 0v8a2 2 0 002 2h6a2 2 0 002-2V8M9 12h6" />
                                  </svg>
                                </div>
                                <p className="text-[#5c738a] text-base">
                                  아직 입찰 내역이 없습니다.
                                </p>
                                <p className="text-[#5c738a] text-sm mt-1">
                                  첫 번째 입찰자가 되어보세요!
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </>
  );
}  