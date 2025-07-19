'use client';

import React, { useState, useEffect } from 'react';
import { getBidHistoryByAuction, getMyBidHistoryByAuction, getMyBidHistory } from '@/lib/api/auction';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

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

interface BidHistoryProps {
  auctionId: string;
  showMyBidsOnly?: boolean;
  maxItems?: number;
}

export default function BidHistory({ auctionId, showMyBidsOnly = false, maxItems = 10 }: BidHistoryProps) {
  const [bidHistory, setBidHistory] = useState<BidHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchBidHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let response;
        if (showMyBidsOnly) {
          if (auctionId) {
            // 특정 경매에서 내 입찰 내역 조회
            response = await getMyBidHistoryByAuction(auctionId);
          } else {
            // 전체 내 입찰 내역 조회
            response = await getMyBidHistory();
          }
        } else {
          response = await getBidHistoryByAuction(auctionId);
        }

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
  }, [auctionId, showMyBidsOnly]);

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
          <CardTitle className="text-lg">
            {showMyBidsOnly ? '내 입찰 내역' : '입찰 내역'}
          </CardTitle>
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
          <CardTitle className="text-lg">
            {showMyBidsOnly ? '내 입찰 내역' : '입찰 내역'}
          </CardTitle>
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
          <CardTitle className="text-lg">
            {showMyBidsOnly ? '내 입찰 내역' : '입찰 내역'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-500">
            {showMyBidsOnly ? '아직 입찰한 내역이 없습니다.' : '아직 입찰 내역이 없습니다.'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>{showMyBidsOnly ? '내 입찰 내역' : '입찰 내역'}</span>
          <Badge variant="secondary" className="text-xs">
            총 {bidHistory.length}건
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayedBids.map((bid, index) => (
            <div key={bid.bidId} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {bid.bidderNickname}
                  </span>
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
                <span className="text-lg font-bold text-green-600">
                  {formatBidAmount(bid.bidAmount)}
                </span>
                {showMyBidsOnly && (
                  <Badge variant="outline" className="text-xs">
                    내 입찰
                  </Badge>
                )}
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