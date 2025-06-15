interface ErrorLogData {
  component: string;
  action: string;
  error: Error | string;
  context?: Record<string, any>;
  timestamp: string;
  userAgent: string;
  url: string;
}

interface ApiErrorLogData extends ErrorLogData {
  endpoint: string;
  method: string;
  statusCode?: number;
  responseData?: any;
}

interface SocketErrorLogData extends ErrorLogData {
  socketEvent: string;
  connectionState: string;
}

class ErrorLogger {
  private static instance: ErrorLogger;
  private logs: ErrorLogData[] = [];

  private constructor() {}

  public static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  private createBaseLog(component: string, action: string, error: Error | string, context?: Record<string, any>): ErrorLogData {
    return {
      component,
      action,
      error,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
  }

  // 일반 에러 로깅
  public logError(component: string, action: string, error: Error | string, context?: Record<string, any>): void {
    const logData = this.createBaseLog(component, action, error, context);
    this.logs.push(logData);
    
    console.group(`🚨 [ERROR] ${component} - ${action}`);
    // Next.js 에러 핸들러 충돌 방지를 위해 console.warn 사용
    console.warn('Error:', error instanceof Error ? error.message : error);
    console.log('Error Stack:', error instanceof Error ? error.stack : 'N/A');
    console.log('Context:', context);
    console.log('Timestamp:', logData.timestamp);
    console.log('URL:', logData.url);
    console.groupEnd();
  }

  // API 에러 로깅
  public logApiError(
    component: string,
    action: string,
    error: Error | string,
    endpoint: string,
    method: string,
    statusCode?: number,
    responseData?: any,
    context?: Record<string, any>
  ): void {
    const logData: ApiErrorLogData = {
      ...this.createBaseLog(component, action, error, context),
      endpoint,
      method,
      statusCode,
      responseData,
    };
    
    this.logs.push(logData);
    
    console.group(`🌐 [API ERROR] ${component} - ${action}`);
    // Next.js 에러 핸들러 충돌 방지를 위해 console.warn 사용
    console.warn('Error:', error instanceof Error ? error.message : error);
    console.log('Error Stack:', error instanceof Error ? error.stack : 'N/A');
    console.log('Endpoint:', endpoint);
    console.log('Method:', method);
    console.log('Status Code:', statusCode);
    console.log('Response Data:', responseData);
    console.log('Context:', context);
    console.log('Timestamp:', logData.timestamp);
    console.log('URL:', logData.url);
    console.groupEnd();
  }

  // Socket 에러 로깅
  public logSocketError(
    component: string,
    action: string,
    error: Error | string,
    socketEvent: string,
    connectionState: string,
    context?: Record<string, any>
  ): void {
    const logData: SocketErrorLogData = {
      ...this.createBaseLog(component, action, error, context),
      socketEvent,
      connectionState,
    };
    
    this.logs.push(logData);
    
    console.group(`🔌 [SOCKET ERROR] ${component} - ${action}`);
    // Next.js 에러 핸들러 충돌 방지를 위해 console.warn 사용
    console.warn('Error:', error instanceof Error ? error.message : error);
    console.log('Error Stack:', error instanceof Error ? error.stack : 'N/A');
    console.log('Socket Event:', socketEvent);
    console.log('Connection State:', connectionState);
    console.log('Context:', context);
    console.log('Timestamp:', logData.timestamp);
    console.log('URL:', logData.url);
    console.groupEnd();
  }

  // 성공 로깅 (정상 동작 확인용)
  public logSuccess(component: string, action: string, data?: any, context?: Record<string, any>): void {
    console.group(`✅ [SUCCESS] ${component} - ${action}`);
    console.log('Data:', data);
    console.log('Context:', context);
    console.log('Timestamp:', new Date().toISOString());
    console.log('URL:', window.location.href);
    console.groupEnd();
  }

  // 정보 로깅 (디버깅용)
  public logInfo(component: string, action: string, data?: any, context?: Record<string, any>): void {
    console.group(`ℹ️ [INFO] ${component} - ${action}`);
    console.log('Data:', data);
    console.log('Context:', context);
    console.log('Timestamp:', new Date().toISOString());
    console.log('URL:', window.location.href);
    console.groupEnd();
  }

  // 경고 로깅
  public logWarning(component: string, action: string, message: string, context?: Record<string, any>): void {
    console.group(`⚠️ [WARNING] ${component} - ${action}`);
    console.warn('Message:', message);
    console.log('Context:', context);
    console.log('Timestamp:', new Date().toISOString());
    console.log('URL:', window.location.href);
    console.groupEnd();
  }

  // 모든 로그 조회
  public getAllLogs(): ErrorLogData[] {
    return [...this.logs];
  }

  // 특정 컴포넌트의 로그만 조회
  public getLogsByComponent(component: string): ErrorLogData[] {
    return this.logs.filter(log => log.component === component);
  }

  // 로그 초기화
  public clearLogs(): void {
    this.logs = [];
    console.log('🗑️ All error logs cleared');
  }

  // 로그 요약 출력
  public printLogSummary(): void {
    const summary = this.logs.reduce((acc, log) => {
      const key = `${log.component}-${log.action}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.group('📊 Error Log Summary');
    console.table(summary);
    console.log('Total Errors:', this.logs.length);
    console.groupEnd();
  }
}

export const errorLogger = ErrorLogger.getInstance();

// 전역 에러 핸들러 등록
if (typeof window !== 'undefined') {
  // Next.js의 내장 에러 핸들러와 충돌하지 않도록 조건부 등록
  let originalErrorHandler: ((event: ErrorEvent) => void) | null = null;
  
  window.addEventListener('error', (event) => {
    // Next.js의 에러 핸들러가 처리한 에러는 중복 로깅 방지
    if (event.error && event.error.message && event.error.message.includes('console.error')) {
      return;
    }
    
    errorLogger.logError(
      'Global',
      'Uncaught Error',
      event.error || event.message,
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      }
    );
  });

  window.addEventListener('unhandledrejection', (event) => {
    // Promise rejection 중복 처리 방지
    if (event.reason && typeof event.reason === 'string' && event.reason.includes('HTTP')) {
      return;
    }
    
    errorLogger.logError(
      'Global',
      'Unhandled Promise Rejection',
      event.reason,
      {
        promise: event.promise,
      }
    );
  });

  // 개발자 도구에서 사용할 수 있도록 전역 객체에 추가
  (window as any).errorLogger = errorLogger;
} 