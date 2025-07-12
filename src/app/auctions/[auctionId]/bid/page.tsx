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
import { getAuctionDetail } from "@/lib/api/auction";
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

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const [client, setClient] = useState<Client | null>(null);

  // 기존 로그인 체크 로직 유지
  useEffect(() => {
    if (!isLoading && !user) {
      alert("로그인이 필요합니다.");
      router.push("/auth/login");
    }
  }, [user, isLoading, router]);

  // 기존 웹소켓 연결 및 메시지 수신 로직 유지
  useEffect(() => {
    if (!user || !auctionId) return;

    const stompClient = connectStomp();
    setClient(stompClient);

    subscribeToAuction(stompClient, auctionId, (msg) => {
      console.log("[BidPage] 웹소켓 메시지 수신:", msg);

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

      // 시스템 메시지가 아닌 경우에만 처리 (성공한 입찰)
      if (msg.nickname !== "System" && msg.currentBid > 0) {
        setMessages((prev) => {
          const bidAmountValue = msg.currentBid || 0;
          if (prev.some((m) => m.text === `${bidAmountValue.toLocaleString()}원 입찰!`)) return prev;
          return [...prev, { id: Date.now(), sender: msg.nickname || "익명", text: `${bidAmountValue.toLocaleString()}원 입찰!`, isMe: msg.nickname === user.nickname }];
        });

        setAuction((prev: Auction | null) => {
          if (prev) {
            const updatedAuction = { ...prev, currentBid: msg.currentBid };
            // 입찰가 필드 업데이트
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
    });

    return () => disconnectStomp();
  }, [user, auctionId]);

  // 기존 경매 상세 조회 로직 유지
  useEffect(() => {
    (async () => {
      const data = await getAuctionDetail(auctionId);
      if (data?.data) {
        setAuction(data.data);
        calculateTimeLeft(data.data.endTime);
        
        // 초기 입찰가 설정
        const currentBid = data.data.currentBid || data.data.startPrice || 0;
        const minBid = data.data.minBid || 1000;
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

  // 기존 입찰 로직 유지
  const handleBid = async (amount: number) => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (!client || !client.connected) {
      console.error("[BidPage] STOMP 연결되지 않음. 메시지 전송 실패.");
      alert("서버와 연결이 끊어졌습니다. 페이지를 새로고침 해주세요.");
      return;
    }

    console.log("[BidPage] 입찰 메시지 전송 시도:", { auctionId, userUUID: user.userUUID, amount });
    sendAuctionMessage("/app/auction/bid", { auctionId, amount });
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
            
            {/* 메인 컨텐츠 */}
            <div className="h-[1337px] relative shrink-0 w-full">
              <div className="flex flex-row justify-center relative size-full">
                <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-row h-[1337px] items-start justify-center px-40 py-5 relative w-full">
                  <div className="basis-0 grow max-w-[960px] min-h-px min-w-px relative shrink-0">
                    <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col items-start justify-start max-w-inherit overflow-clip p-0 relative w-full">
                      
                      {/* 브레드크럼 */}
                      <div className="relative shrink-0 w-full">
                        <div className="relative size-full">
                          <div className="[flex-flow:wrap] bg-clip-padding border-0 border-[transparent] border-solid box-border content-start flex gap-2 items-start justify-start p-[16px] relative w-full">
                            <Link href="/" className="font-['Work_Sans:Medium','Noto_Sans_KR:Regular',sans-serif] font-medium text-[#5c738a] text-[16px] leading-[24px]">
                              홈
                            </Link>
                            <span className="font-['Work_Sans:Medium',sans-serif] font-medium text-[#5c738a] text-[16px] leading-[24px]">
                              /
                            </span>
                            <span className="font-['Work_Sans:Medium','Noto_Sans_KR:Regular',sans-serif] font-medium text-[#0f1417] text-[16px] leading-[24px]">
                              {auction.product?.name}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 제목 */}
                      <div className="relative shrink-0 w-full">
                        <div className="relative size-full">
                          <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col items-start justify-start pb-3 pt-5 px-4 relative w-full">
                            <h1 className="font-['Work_Sans:Bold','Noto_Sans_KR:Bold',sans-serif] font-bold text-[#0f1417] text-[22px] leading-[28px] w-full">
                              {auction.product?.name}
                            </h1>
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
                                  <img
                                    src={auction.product?.imageUrl || "/images/no-image.svg"}
                                    alt={auction.product?.name || "경매 상품"}
                                    className="w-full h-[619px] object-cover rounded-lg"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 설명 */}
                      {auction.product?.description && (
                        <div className="relative shrink-0 w-full">
                          <div className="relative size-full">
                            <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col items-start justify-start pb-3 pt-1 px-4 relative w-full">
                              <p className="font-['Work_Sans:Regular','Noto_Sans_KR:Regular',sans-serif] font-normal text-[#0f1417] text-[16px] leading-[24px] w-full">
                                {auction.product.description}
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
                              disabled={!canBid || timeLeft === "경매 종료"}
                              className="basis-0 bg-[#dbe8f2] grow h-10 max-w-[480px] min-h-px min-w-[84px] relative rounded-xl shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#c5d6e6] transition-colors"
                            >
                              <div className="flex flex-row items-center justify-center max-w-inherit min-w-inherit overflow-clip relative size-full">
                                <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-row h-10 items-center justify-center max-w-inherit min-w-inherit px-4 py-0 relative w-full">
                                  <div className="font-['Work_Sans:Bold','Noto_Sans_KR:Bold',sans-serif] font-bold text-[#0f1417] text-[14px] leading-[21px] text-center">
                                    입찰하기
                                  </div>
                                </div>
                              </div>
                            </button>
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
      </div>
    </>
  );
} 