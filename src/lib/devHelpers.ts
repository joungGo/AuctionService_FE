import { errorLogger } from "./errorLogger";
// 이미지 유틸리티 초기화
import "./imageUtils";

// 개발자 도구에서 사용할 수 있는 헬퍼 함수들
declare global {
  interface Window {
    errorLogger: typeof errorLogger;
    debugHelpers: {
      showAllLogs: () => void;
      showLogsByComponent: (component: string) => void;
      clearLogs: () => void;
      printLogSummary: () => void;
      testErrorLogging: () => void;
      getErrorCount: () => number;
      getLastHourErrors: () => any[];
      exportLogs: () => string;
      checkAPIHealth: () => Promise<void>;
      simulateError: (component: string, action: string, errorMessage: string) => void;
      debugImageUrl: (url: string) => void;
      findImageErrors: () => any[];
    };
  }
}

// 개발자 도구 헬퍼 함수들
const debugHelpers = {
  // 모든 로그 출력
  showAllLogs: () => {
    const logs = errorLogger.getAllLogs();
    console.group('🔍 All Error Logs');
    console.table(logs);
    console.groupEnd();
    return logs;
  },

  // 특정 컴포넌트의 로그만 출력
  showLogsByComponent: (component: string) => {
    const logs = errorLogger.getLogsByComponent(component);
    console.group(`🔍 ${component} Component Logs`);
    console.table(logs);
    console.groupEnd();
    return logs;
  },

  // 로그 초기화
  clearLogs: () => {
    errorLogger.clearLogs();
    console.log('🗑️ All logs cleared');
  },

  // 로그 요약 출력
  printLogSummary: () => {
    errorLogger.printLogSummary();
  },

  // 에러 로깅 테스트
  testErrorLogging: () => {
    console.log('🧪 Testing error logging...');
    
    errorLogger.logInfo('DevTools', 'Test Info', { test: true });
    errorLogger.logSuccess('DevTools', 'Test Success', { test: true });
    errorLogger.logWarning('DevTools', 'Test Warning', 'This is a test warning');
    errorLogger.logError('DevTools', 'Test Error', 'This is a test error message');
    errorLogger.logApiError('DevTools', 'Test API Error', 'HTTP 404: Not Found', '/api/test', 'GET', 404);
    errorLogger.logSocketError('DevTools', 'Test Socket Error', 'Connection failed', 'connect', 'disconnected');
    
    console.log('✅ Test logging complete - check console for grouped logs');
  },

  // 에러 개수 반환
  getErrorCount: () => {
    const logs = errorLogger.getAllLogs();
    return logs.length;
  },

  // 최근 1시간 에러들 조회
  getLastHourErrors: () => {
    const logs = errorLogger.getAllLogs();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const recentLogs = logs.filter(log => {
      const logTime = new Date(log.timestamp);
      return logTime > oneHourAgo;
    });
    
    console.group('⏰ Last Hour Errors');
    console.table(recentLogs);
    console.groupEnd();
    
    return recentLogs;
  },

  // 로그를 JSON으로 내보내기
  exportLogs: () => {
    const logs = errorLogger.getAllLogs();
    const jsonString = JSON.stringify(logs, null, 2);
    
    // 클립보드에 복사 시도
    if (navigator.clipboard) {
      navigator.clipboard.writeText(jsonString).then(() => {
        console.log('📋 Logs copied to clipboard');
      }).catch(() => {
        console.log('📋 Failed to copy to clipboard');
      });
    }
    
    // 콘솔에도 출력
    console.group('📤 Exported Logs (JSON)');
    console.log(jsonString);
    console.groupEnd();
    
    return jsonString;
  },

  // API 상태 확인
  checkAPIHealth: async () => {
    console.log('🏥 Checking API health...');
    
    try {
      const { apiHealthChecker } = await import('./apiHealthChecker');
      const results = await apiHealthChecker.checkApiHealth();
      
      console.group('📊 API Health Check Results');
      console.table(results);
      console.groupEnd();
      
      // 문제가 있는 엔드포인트에 대한 해결책 제공
      const unhealthyEndpoints = results.filter(r => !r.isHealthy);
      if (unhealthyEndpoints.length > 0) {
        console.group('🚨 Unhealthy Endpoints - Solutions');
        unhealthyEndpoints.forEach(endpoint => {
          const message = apiHealthChecker.generateDeveloperMessage(
            endpoint.endpoint.replace('http://localhost:8080', ''), 
            endpoint.status || undefined
          );
          console.log(message);
          console.log('---');
        });
        console.groupEnd();
      }
      
      return results;
    } catch (error) {
      console.error('Health check failed:', error);
      return [];
    }
  },

  // 에러 시뮬레이션
  simulateError: (component: string, action: string, errorMessage: string) => {
    errorLogger.logError(component, action, new Error(errorMessage), {
      simulated: true,
      timestamp: new Date().toISOString()
    });
    console.log(`🎭 Simulated error logged for ${component} - ${action}`);
  },

  // 이미지 URL 디버깅
  debugImageUrl: (url: string) => {
    try {
      const { previewImageUrl } = require('./imageUtils');
      previewImageUrl(url);
    } catch (error) {
      console.error('Failed to debug image URL:', error);
    }
  },

  // 이미지 관련 에러들만 찾기
  findImageErrors: () => {
    const logs = errorLogger.getAllLogs();
    const imageErrors = logs.filter(log => 
      log.component === 'ImageUtils' || 
      log.component === 'AuctionCard' ||
      log.action.toLowerCase().includes('image') ||
      (log.context && typeof log.context === 'object' && 'imageUrl' in log.context)
    );
    
    console.group('🖼️ Image-Related Errors');
    console.table(imageErrors);
    console.groupEnd();
    
    return imageErrors;
  }
};

// 브라우저 환경에서만 전역 객체에 추가
if (typeof window !== 'undefined') {
  window.errorLogger = errorLogger;
  window.debugHelpers = debugHelpers;
  
  // 개발자 도구 사용법 안내
  console.group('🛠️ Debug Helpers Available');
  console.log('Use errorLogger.* for direct error logging');
  console.log('Use debugHelpers.* for debugging tools:');
  console.log('  - debugHelpers.showAllLogs()');
  console.log('  - debugHelpers.showLogsByComponent("ComponentName")');
  console.log('  - debugHelpers.clearLogs()');
  console.log('  - debugHelpers.printLogSummary()');
  console.log('  - debugHelpers.testErrorLogging()');
  console.log('  - debugHelpers.getErrorCount()');
  console.log('  - debugHelpers.getLastHourErrors()');
  console.log('  - debugHelpers.exportLogs()');
  console.log('  - debugHelpers.checkAPIHealth()');
  console.log('  - debugHelpers.simulateError("Component", "Action", "Error message")');
  console.log('  - debugHelpers.debugImageUrl("image-url-to-test")');
  console.log('  - debugHelpers.findImageErrors()');
  console.groupEnd();
}

export { debugHelpers }; 