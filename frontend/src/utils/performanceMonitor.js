import React, { useState, useEffect, useCallback } from 'react';

// Performance metrics collection
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoads: [],
      apiCalls: [],
      componentRenders: [],
      userInteractions: [],
      errors: []
    };
    this.startTime = performance.now();
    this.init();
  }

  init() {
    // Monitor page load performance
    window.addEventListener('load', () => {
      this.recordPageLoad();
    });

    // Monitor errors
    window.addEventListener('error', (event) => {
      this.recordError(event);
    });

    // Monitor unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.recordError(event);
    });

    // Monitor user interactions
    this.setupInteractionTracking();
  }

  recordPageLoad() {
    const navigation = performance.getEntriesByType('navigation')[0];
    if (navigation) {
      this.metrics.pageLoads.push({
        timestamp: Date.now(),
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstContentfulPaint: this.getFCP(),
        largestContentfulPaint: this.getLCP(),
        cumulativeLayoutShift: this.getCLS()
      });
    }
  }

  recordApiCall(url, method, startTime, endTime, success, responseSize = 0) {
    this.metrics.apiCalls.push({
      timestamp: Date.now(),
      url,
      method,
      duration: endTime - startTime,
      success,
      responseSize
    });
  }

  recordComponentRender(componentName, renderTime) {
    this.metrics.componentRenders.push({
      timestamp: Date.now(),
      component: componentName,
      renderTime
    });
  }

  recordUserInteraction(type, element, duration = 0) {
    this.metrics.userInteractions.push({
      timestamp: Date.now(),
      type,
      element,
      duration
    });
  }

  recordError(error) {
    this.metrics.errors.push({
      timestamp: Date.now(),
      message: error.message || error.reason,
      stack: error.stack || error.reason?.stack,
      type: error.type || 'promise-rejection'
    });
  }

  setupInteractionTracking() {
    // Track click interactions
    document.addEventListener('click', (event) => {
      this.recordUserInteraction('click', event.target.tagName);
    });

    // Track input interactions
    document.addEventListener('input', (event) => {
      this.recordUserInteraction('input', event.target.tagName);
    });

    // Track scroll performance
    let scrollTimer;
    document.addEventListener('scroll', () => {
      if (!scrollTimer) {
        const startTime = performance.now();
        scrollTimer = setTimeout(() => {
          const endTime = performance.now();
          this.recordUserInteraction('scroll', 'window', endTime - startTime);
          scrollTimer = null;
        }, 100);
      }
    });
  }

  // Web Vitals
  getFCP() {
    const fcp = performance.getEntriesByName('first-contentful-paint')[0];
    return fcp ? fcp.startTime : 0;
  }

  getLCP() {
    return new Promise((resolve) => {
      if (typeof PerformanceObserver !== 'undefined') {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry?.startTime || 0);
          observer.disconnect();
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
        
        // Timeout after 5 seconds
        setTimeout(() => {
          resolve(0);
        }, 5000);
      } else {
        resolve(0);
      }
    });
  }

  getCLS() {
    return new Promise((resolve) => {
      if (typeof PerformanceObserver !== 'undefined') {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
        });
        observer.observe({ entryTypes: ['layout-shift'] });

        // Calculate final CLS after 5 seconds
        setTimeout(() => {
          resolve(clsValue);
          observer.disconnect();
        }, 5000);
      } else {
        resolve(0);
      }
    });
  }

  getMetrics() {
    return {
      ...this.metrics,
      memoryUsage: this.getMemoryUsage(),
      connectionSpeed: this.getConnectionSpeed(),
      deviceInfo: this.getDeviceInfo()
    };
  }

  getMemoryUsage() {
    if (performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
      };
    }
    return null;
  }

  getConnectionSpeed() {
    if (navigator.connection) {
      return {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      };
    }
    return null;
  }

  getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      cores: navigator.hardwareConcurrency,
      deviceMemory: navigator.deviceMemory
    };
  }

  generateReport() {
    const metrics = this.getMetrics();
    const report = {
      summary: {
        totalApiCalls: metrics.apiCalls.length,
        averageApiResponseTime: this.calculateAverage(metrics.apiCalls, 'duration'),
        slowApiCalls: metrics.apiCalls.filter(call => call.duration > 1000).length,
        totalErrors: metrics.errors.length,
        slowComponentRenders: metrics.componentRenders.filter(render => render.renderTime > 16).length,
        memoryUsageMB: metrics.memoryUsage?.used || 0
      },
      recommendations: this.generateRecommendations(metrics)
    };

    return report;
  }

  calculateAverage(array, property) {
    if (array.length === 0) return 0;
    const sum = array.reduce((acc, item) => acc + item[property], 0);
    return Math.round(sum / array.length);
  }

  generateRecommendations(metrics) {
    const recommendations = [];

    // Check API performance
    const slowApiCalls = metrics.apiCalls.filter(call => call.duration > 1000);
    if (slowApiCalls.length > 0) {
      recommendations.push('Consider implementing request caching or API optimization for slow endpoints');
    }

    // Check component render performance
    const slowRenders = metrics.componentRenders.filter(render => render.renderTime > 16);
    if (slowRenders.length > 0) {
      recommendations.push('Consider using React.memo() or useMemo() for components with slow renders');
    }

    // Check memory usage
    if (metrics.memoryUsage && metrics.memoryUsage.used > 50) {
      recommendations.push('High memory usage detected. Consider optimizing images and data structures');
    }

    // Check error rate
    if (metrics.errors.length > 5) {
      recommendations.push('High error rate detected. Review error handling and user experience');
    }

    return recommendations;
  }
}

// Global performance monitor instance
const performanceMonitor = new PerformanceMonitor();

// React component for performance dashboard
const PerformanceDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [report, setReport] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  const refreshMetrics = useCallback(() => {
    const currentMetrics = performanceMonitor.getMetrics();
    const currentReport = performanceMonitor.generateReport();
    setMetrics(currentMetrics);
    setReport(currentReport);
  }, []);

  useEffect(() => {
    refreshMetrics();
    const interval = setInterval(refreshMetrics, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [refreshMetrics]);

  if (!isVisible) {
    return (
      <button 
        className="performance-toggle"
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '10px 15px',
          backgroundColor: '#ff6b00',
          color: 'white',
          border: 'none',
          borderRadius: '25px',
          cursor: 'pointer',
          zIndex: 9999,
          fontSize: '12px',
          fontWeight: '600'
        }}
      >
        📊 Performance
      </button>
    );
  }

  return (
    <div className="performance-dashboard" style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '400px',
      backgroundColor: 'white',
      border: '1px solid #ddd',
      borderRadius: '10px',
      padding: '20px',
      zIndex: 9999,
      maxHeight: '80vh',
      overflow: 'auto',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
    }}>
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, color: '#333' }}>⚡ Performance Monitor</h3>
        <button 
          onClick={() => setIsVisible(false)}
          style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>

      {report && (
        <div className="performance-summary">
          <h4 style={{ margin: '0 0 10px 0', color: '#555' }}>Summary</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
            <div>API Calls: {report.summary.totalApiCalls}</div>
            <div>Avg Response: {report.summary.averageApiResponseTime}ms</div>
            <div>Slow APIs: {report.summary.slowApiCalls}</div>
            <div>Errors: {report.summary.totalErrors}</div>
            <div>Slow Renders: {report.summary.slowComponentRenders}</div>
            <div>Memory: {report.summary.memoryUsageMB}MB</div>
          </div>
        </div>
      )}

      {metrics?.memoryUsage && (
        <div className="memory-usage" style={{ marginTop: '15px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#555' }}>Memory Usage</h4>
          <div style={{ fontSize: '12px' }}>
            <div>Used: {metrics.memoryUsage.used}MB / {metrics.memoryUsage.limit}MB</div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#eee',
              borderRadius: '4px',
              overflow: 'hidden',
              marginTop: '5px'
            }}>
              <div style={{
                width: `${(metrics.memoryUsage.used / metrics.memoryUsage.limit) * 100}%`,
                height: '100%',
                backgroundColor: metrics.memoryUsage.used > metrics.memoryUsage.limit * 0.8 ? '#ff6b00' : '#4caf50',
                borderRadius: '4px'
              }} />
            </div>
          </div>
        </div>
      )}

      {report?.recommendations && report.recommendations.length > 0 && (
        <div className="recommendations" style={{ marginTop: '15px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#555' }}>Recommendations</h4>
          <ul style={{ fontSize: '12px', margin: 0, paddingLeft: '15px' }}>
            {report.recommendations.map((rec, index) => (
              <li key={index} style={{ marginBottom: '5px' }}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      <button 
        onClick={refreshMetrics}
        style={{
          marginTop: '15px',
          padding: '8px 15px',
          backgroundColor: '#ff6b00',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '12px',
          width: '100%'
        }}
      >
        🔄 Refresh
      </button>
    </div>
  );
};

// Hook for component performance monitoring
export const useComponentPerformance = (componentName) => {
  useEffect(() => {
    const startTime = performance.now();
    return () => {
      const endTime = performance.now();
      performanceMonitor.recordComponentRender(componentName, endTime - startTime);
    };
  });

  const measureFunction = useCallback((fn, functionName) => {
    return (...args) => {
      const startTime = performance.now();
      const result = fn(...args);
      const endTime = performance.now();
      
      if (endTime - startTime > 5) {
        console.warn(`Slow function ${functionName} in ${componentName}: ${(endTime - startTime).toFixed(2)}ms`);
      }
      
      return result;
    };
  }, [componentName]);

  return { measureFunction };
};

// API call wrapper for performance tracking
export const trackApiCall = async (url, options = {}) => {
  const startTime = performance.now();
  
  try {
    const response = await fetch(url, options);
    const endTime = performance.now();
    
    // Estimate response size
    const responseSize = response.headers.get('content-length') || 0;
    
    performanceMonitor.recordApiCall(
      url,
      options.method || 'GET',
      startTime,
      endTime,
      response.ok,
      parseInt(responseSize)
    );
    
    return response;
  } catch (error) {
    const endTime = performance.now();
    performanceMonitor.recordApiCall(
      url,
      options.method || 'GET',
      startTime,
      endTime,
      false,
      0
    );
    throw error;
  }
};

export { PerformanceDashboard, performanceMonitor };