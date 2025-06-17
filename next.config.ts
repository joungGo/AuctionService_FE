/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  
  // 타입 검사 비활성화
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // ESLint 검사 비활성화
  eslint: {
    ignoreDuringBuilds: true,
  },

  // 외부 이미지 도메인 등록
  images: {
    domains: [
      "store.storeimages.cdn-apple.com",
      "sitem.ssgcdn.com",
      "m.media-amazon.com",
      "image.idus.com",
      "www.sleepmed.or.kr",
      "www.biz-con.co.kr",
      "cdn.gpkorea.com",
      "example.com", // API에서 사용하는 예시 도메인
    ],
  },

  async rewrites() {
    // 환경변수 또는 프로덕션 환경에 따라 API URL 결정
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 
                   (process.env.NODE_ENV === 'production' 
                     ? "https://auction-service-fe.vercel.app:8080/api" 
                     : "http://localhost:8080/api");
    
    return [
      {
        source: "/api/auctions",
        destination: `${apiUrl}/auctions`,
      },
    ];
  },
};

module.exports = nextConfig;
