import { errorLogger } from "./errorLogger";

// 이미지 URL 유효성 검사
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const trimmedUrl = url.trim();
  
  // 빈 문자열 체크
  if (!trimmedUrl) {
    return false;
  }

  // Next.js Image 컴포넌트가 허용하는 URL 형태인지 검사
  try {
    // 1. 절대 URL 검사 (http:// 또는 https://)
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
      new URL(trimmedUrl);
      return true;
    }
    
    // 2. 상대 경로 검사 (반드시 /로 시작해야 함)
    if (trimmedUrl.startsWith('/')) {
      // 상대 경로 패턴 체크
      const relativePathPattern = /^\/[\w\-._~:/?#[\]@!$&'()*+,;=%]*$/;
      return relativePathPattern.test(trimmedUrl);
    }
    
    // 3. 프로토콜 없는 도메인이나 기타 형태는 모두 무효로 처리
    return false;
    
  } catch {
    return false;
  }
}

// URL 정규화 함수 (프로토콜 없는 도메인을 https://로 변환)
function normalizeImageUrl(url: string): string {
  const trimmedUrl = url.trim();
  
  // 이미 올바른 프로토콜이 있는 경우
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return trimmedUrl;
  }
  
  // 상대 경로인 경우
  if (trimmedUrl.startsWith('/')) {
    return trimmedUrl;
  }
  
  // 프로토콜 없는 도메인인 경우 https:// 추가 시도
  if (trimmedUrl.includes('.') && !trimmedUrl.includes(' ')) {
    try {
      const normalizedUrl = `https://${trimmedUrl}`;
      new URL(normalizedUrl); // 유효성 검사
      return normalizedUrl;
    } catch {
      // 정규화 실패 시 원본 반환 (이후 fallback으로 처리됨)
      return trimmedUrl;
    }
  }
  
  return trimmedUrl;
}

// 안전한 이미지 URL 반환 (기본 이미지 포함)
export function getSafeImageUrl(
  imageUrl: string | null | undefined, 
  fallbackUrl: string = '/images/no-image.svg'
): string {
  try {
    if (!imageUrl || typeof imageUrl !== 'string') {
      errorLogger.logWarning('ImageUtils', 'Missing Image URL - Using Fallback', 'Image URL is null or undefined', {
        originalUrl: imageUrl,
        fallbackUrl,
        imageUrlType: typeof imageUrl
      });
      return fallbackUrl;
    }

    // URL 정규화 시도
    const normalizedUrl = normalizeImageUrl(imageUrl);
    
    // 정규화된 URL이 유효한지 검사
    if (isValidImageUrl(normalizedUrl)) {
      errorLogger.logInfo('ImageUtils', 'Valid Image URL', {
        originalUrl: imageUrl,
        normalizedUrl,
        isValid: true
      });
      
      return normalizedUrl;
    }
    
    // 정규화가 실패한 경우
    errorLogger.logWarning('ImageUtils', 'Invalid Image URL - Using Fallback', 'URL validation failed after normalization', {
      originalUrl: imageUrl,
      normalizedUrl,
      fallbackUrl,
      imageUrlType: typeof imageUrl
    });
    
    return fallbackUrl;
  } catch (error) {
    errorLogger.logError('ImageUtils', 'Image URL Processing Error', error instanceof Error ? error : String(error), {
      originalUrl: imageUrl,
      fallbackUrl
    });
    
    return fallbackUrl;
  }
}

// Next.js Image 컴포넌트용 안전한 props 생성
export function getSafeImageProps(
  imageUrl: string | null | undefined,
  alt: string = '이미지',
  fallbackUrl: string = '/images/no-image.png'
) {
  const safeUrl = getSafeImageUrl(imageUrl, fallbackUrl);
  const safeAlt = alt || '이미지';
  
  return {
    src: safeUrl,
    alt: safeAlt,
    onError: (e: any) => {
      errorLogger.logError('ImageUtils', 'Image Load Error', 'Failed to load image', {
        src: safeUrl,
        alt: safeAlt,
        originalUrl: imageUrl,
        errorEvent: e.type
      });
    },
    onLoad: () => {
      errorLogger.logInfo('ImageUtils', 'Image Loaded Successfully', {
        src: safeUrl,
        alt: safeAlt
      });
    }
  };
}

// 이미지 URL 미리보기 (개발자 도구용)
export function previewImageUrl(url: string | null | undefined): void {
  console.group('🖼️ Image URL Preview');
  console.log('Original URL:', url);
  console.log('Type:', typeof url);
  console.log('Is Valid:', isValidImageUrl(url));
  console.log('Safe URL:', getSafeImageUrl(url));
  
  if (url) {
    console.log('Trimmed:', url.trim());
    console.log('Length:', url.length);
    
    try {
      new URL(url.trim());
      console.log('✅ Valid absolute URL');
    } catch {
      console.log('ℹ️ Not an absolute URL (might be relative)');
    }
  }
  
  console.groupEnd();
}

// 브라우저 환경에서 전역 객체에 추가
if (typeof window !== 'undefined') {
  (window as any).imageUtils = {
    isValidImageUrl,
    getSafeImageUrl,
    getSafeImageProps,
    previewImageUrl
  };
} 