'use client';

import React, { useState, useEffect } from 'react';
import { getMyBidHistory } from '@/lib/api/auction';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

interface MyBidHistoryProps {
  maxItems?: number;
}

export default function MyBidHistory({ maxItems = 20 }: MyBidHistoryProps) {
  const [bidHistory, setBidHistory] = useState<BidHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchBidHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await getMyBidHistory();

        if (response.code === '200') {
          setBidHistory(response.data || []);
        } else {
          setError(response.msg || '입찰 내역을 불러오는데 실패했습니다.');
        }
      } catch (err) {
        console.error('입찰 내역 조회 오류:', err);
        setError('입찰 내역을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchBidHistory();
  }, []);

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

  const displayedBids = showAll ? bidHistory : bidHistory.slice(0, maxItems);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">내 입찰 내역</CardTitle>
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
          <CardTitle className="text-lg">내 입찰 내역</CardTitle>
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
          <CardTitle className="text-lg">내 입찰 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-500">
            아직 입찰한 내역이 없습니다.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>내 입찰 내역</span>
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
              className="bg-blue-50 border border-blue-200 rounded-lg p-3 border-l-4 border-l-blue-500"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-blue-700">
                    {bid.productName}
                  </span>
                  <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                    내 입찰
                  </Badge>
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
                <span className="text-lg font-bold text-blue-600">
                  {formatBidAmount(bid.bidAmount)}
                </span>
                <div className="flex gap-1">
                  <Badge variant="secondary" className="text-xs">
                    경매 #{bid.auctionId}
                  </Badge>
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