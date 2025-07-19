'use client';

import React, { useState, useEffect } from 'react';
import { getBidHistoryByAuction } from '@/lib/api/auction';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/app/context/AuthContext';

interface BidHistoryItem {
  bidId: number;
  auctionId: number;
  productName: string;
  bidderNickname: string;
  bidderUUID: string;
  bidAmount: number;
  bidTime: string;
  isHighestBid: boolean;
}

interface UnifiedBidHistoryProps {
  auctionId: string;
  maxItems?: number;
}

export default function UnifiedBidHistory({ auctionId, maxItems = 10 }: UnifiedBidHistoryProps) {
  const [bidHistory, setBidHistory] = useState<BidHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchBidHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('[UnifiedBidHistory] 입찰 내역 조회 시작 - auctionId:', auctionId);
        const response = await getBidHistoryByAuction(auctionId);
        console.log('[UnifiedBidHistory] API 응답:', response);

        if (response.code === '200') {
          setBidHistory(response.data || []);
          console.log('[UnifiedBidHistory] 입찰 내역 설정 완료 - 개수:', response.data?.length || 0);
        } else {
          setError(response.msg || '입찰 내역을 불러오는데 실패했습니다.');
          console.error('[UnifiedBidHistory] API 오류:', response.msg);
        }
      } catch (err) {
        console.error('[UnifiedBidHistory] 입찰 내역 조회 오류:', err);
        setError('입찰 내역을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchBidHistory();
  }, [auctionId]);

  const formatBidTime = (bidTime: string) => {
    const date = new Date(bidTime);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatBidAmount = (amount: number) => {
    return amount.toLocaleString('ko-KR') + '원';
  };

  const isMyBid = (bid: BidHistoryItem) => {
    return user && bid.bidderUUID === user.userUUID;
  };

  const displayedBids = showAll ? bidHistory : bidHistory.slice(0, maxItems);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">입찰 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">입찰 내역을 불러오는 중...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">입찰 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-red-500">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (bidHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">입찰 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-500">
            아직 입찰 내역이 없습니다.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>입찰 내역</span>
          <Badge variant="secondary" className="text-xs">
            총 {bidHistory.length}건
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayedBids.map((bid, index) => (
            <div 
              key={bid.bidId} 
              className={`border rounded-lg p-3 transition-all duration-200 ${
                isMyBid(bid) 
                  ? 'bg-blue-50 border-blue-200 border-l-4 border-l-blue-500' 
                  : 'bg-gray-50 border-gray-200 border-l-4 border-l-gray-400'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`font-medium text-sm ${
                    isMyBid(bid) ? 'text-blue-700' : 'text-gray-700'
                  }`}>
                    {isMyBid(bid) ? '나' : bid.bidderNickname}
                  </span>
                  {isMyBid(bid) && (
                    <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                      내 입찰
                    </Badge>
                  )}
                  {bid.isHighestBid && (
                    <Badge variant="default" className="text-xs">
                      최고가
                    </Badge>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  {formatBidTime(bid.bidTime)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-lg font-bold ${
                  isMyBid(bid) ? 'text-blue-600' : 'text-green-600'
                }`}>
                  {formatBidAmount(bid.bidAmount)}
                </span>
                <div className="flex gap-1">
                  {isMyBid(bid) && (
                    <Badge variant="secondary" className="text-xs">
                      내가 입찰
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {bidHistory.length > maxItems && (
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              onClick={() => setShowAll(!showAll)}
              className="w-full"
            >
              {showAll ? '간단히 보기' : `전체 ${bidHistory.length}건 보기`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 