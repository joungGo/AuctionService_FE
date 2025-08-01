/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  
  // 타입 검사 비활성화.
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
      "localhost", // Figma MCP 서버 이미지 허용
    ],
  },
};

module.exports = nextConfig;
