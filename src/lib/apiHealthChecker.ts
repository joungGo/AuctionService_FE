import { errorLogger } from "./errorLogger";

interface HealthCheckResult {
  isHealthy: boolean;
  status: number | null;
  message: string;
  endpoint: string;
  timestamp: string;
}

class ApiHealthChecker {
  private static instance: ApiHealthChecker;
  private baseUrl = "http://localhost:8080";
  private lastCheckTime: number = 0;
  private checkInterval: number = 30000; // 30초
  private cachedResult: HealthCheckResult | null = null;

  private constructor() {}

  public static getInstance(): ApiHealthChecker {
    if (!ApiHealthChecker.instance) {
      ApiHealthChecker.instance = new ApiHealthChecker();
    }
    return ApiHealthChecker.instance;
  }

  // 개별 엔드포인트 체크
  public async checkEndpoint(endpoint: string): Promise<HealthCheckResult> {
    const fullUrl = `${this.baseUrl}${endpoint}`;
    const result: HealthCheckResult = {
      isHealthy: false,
      status: null,
      message: '',
      endpoint: fullUrl,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch(fullUrl, {
        method: 'HEAD', // HEAD 요청으로 빠르게 체크
        signal: AbortSignal.timeout(5000) // 5초 타임아웃
      });

      result.status = response.status;
      result.isHealthy = response.status < 500;

      if (response.status === 404) {
        result.message = `엔드포인트를 찾을 수 없습니다. 서버가 실행 중인지 확인하세요.`;
      } else if (response.status >= 500) {
        result.message = `서버 내부 오류가 발생했습니다.`;
      } else if (response.status >= 400) {
        result.message = `클라이언트 요청 오류입니다.`;
      } else {
        result.message = `정상 응답`;
      }

    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        result.message = '서버 응답 시간 초과. 서버가 느리거나 응답하지 않습니다.';
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        result.message = '서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.';
      } else {
        result.message = `연결 오류: ${error instanceof Error ? error.message : String(error)}`;
      }
    }

    return result;
  }

  // 주요 API 엔드포인트들의 전체 상태 체크
  public async checkApiHealth(): Promise<HealthCheckResult[]> {
    const now = Date.now();
    
    // 캐시된 결과가 있고 아직 유효하면 반환
    if (this.cachedResult && (now - this.lastCheckTime) < this.checkInterval) {
      return [this.cachedResult];
    }

    const endpoints = [
      '/api/auctions',
      '/api/auth/login',
      '/ws' // WebSocket 엔드포인트
    ];

    errorLogger.logInfo('ApiHealthChecker', 'Starting Health Check', {
      endpoints,
      baseUrl: this.baseUrl
    });

    const results = await Promise.all(
      endpoints.map(endpoint => this.checkEndpoint(endpoint))
    );

    this.lastCheckTime = now;
    
    // 주요 엔드포인트 결과를 캐시
    const auctionsResult = results.find(r => r.endpoint.includes('/api/auctions'));
    if (auctionsResult) {
      this.cachedResult = auctionsResult;
    }

    // 결과 로깅
    results.forEach(result => {
      if (result.isHealthy) {
        errorLogger.logSuccess('ApiHealthChecker', 'Endpoint Healthy', {
          endpoint: result.endpoint,
          status: result.status
        });
      } else {
        errorLogger.logWarning('ApiHealthChecker', 'Endpoint Unhealthy', result.message, {
          endpoint: result.endpoint,
          status: result.status
        });
      }
    });

    return results;
  }

  // 개발자를 위한 친절한 에러 메시지 생성
  public generateDeveloperMessage(endpoint: string, status?: number): string {
    const messages = [];
    
    messages.push(`🚨 API 서버 연결 실패`);
    messages.push(`엔드포인트: ${this.baseUrl}${endpoint}`);
    
    if (status === 404) {
      messages.push(`\n💡 해결 방법:`);
      messages.push(`1. 백엔드 서버가 실행 중인지 확인하세요`);
      messages.push(`2. 서버가 포트 8080에서 실행 중인지 확인하세요`);
      messages.push(`3. API 엔드포인트 경로가 올바른지 확인하세요`);
      messages.push(`\n🔧 확인 명령어:`);
      messages.push(`curl -I http://localhost:8080${endpoint}`);
    } else if (!status) {
      messages.push(`\n💡 해결 방법:`);
      messages.push(`1. 백엔드 서버를 시작하세요`);
      messages.push(`2. 방화벽이 포트 8080을 차단하지 않는지 확인하세요`);
      messages.push(`3. 네트워크 연결을 확인하세요`);
      messages.push(`\n🔧 서버 시작 예시:`);
      messages.push(`java -jar your-backend-server.jar`);
      messages.push(`또는 IDE에서 백엔드 프로젝트를 실행하세요`);
    }

    messages.push(`\n🛠️ 개발자 도구에서 추가 정보:`);
    messages.push(`debugHelpers.checkAPIHealth()`);

    return messages.join('\n');
  }

  // 실시간 서버 상태 모니터링
  public startMonitoring(): void {
    const monitor = async () => {
      try {
        await this.checkApiHealth();
      } catch (error) {
        errorLogger.logError('ApiHealthChecker', 'Monitoring Error', error instanceof Error ? error : String(error));
      }
    };

    // 즉시 실행
    monitor();
    
    // 주기적 실행
    setInterval(monitor, this.checkInterval);
    
    errorLogger.logInfo('ApiHealthChecker', 'Monitoring Started', {
      interval: this.checkInterval,
      baseUrl: this.baseUrl
    });
  }

  // 캐시된 상태 조회
  public getCachedHealth(): HealthCheckResult | null {
    return this.cachedResult;
  }

  // 서버가 건강한지 빠르게 확인
  public isServerHealthy(): boolean {
    return this.cachedResult?.isHealthy || false;
  }
}

export const apiHealthChecker = ApiHealthChecker.getInstance();

// 브라우저 환경에서 전역 객체에 추가
if (typeof window !== 'undefined') {
  (window as any).apiHealthChecker = apiHealthChecker;
} 