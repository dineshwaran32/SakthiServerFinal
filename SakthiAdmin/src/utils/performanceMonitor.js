// Performance monitoring utility
class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.startTimes = {};
  }

  // Start timing an operation
  startTimer(name) {
    this.startTimes[name] = performance.now();
  }

  // End timing and record metric
  endTimer(name) {
    if (this.startTimes[name]) {
      const duration = performance.now() - this.startTimes[name];
      this.metrics[name] = duration;
      delete this.startTimes[name];
      
      // Log slow operations (> 1 second)
      if (duration > 1000) {
        console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
      }
      
      return duration;
    }
    return null;
  }

  // Get all metrics
  getMetrics() {
    return { ...this.metrics };
  }

  // Monitor page load performance
  monitorPageLoad() {
    if (typeof window !== 'undefined' && window.performance) {
      const navigation = performance.getEntriesByType('navigation')[0];
      
      if (navigation) {
        const metrics = {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          totalLoadTime: navigation.loadEventEnd - navigation.fetchStart,
          dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
          tcpConnection: navigation.connectEnd - navigation.connectStart,
          serverResponse: navigation.responseEnd - navigation.requestStart,
          domProcessing: navigation.domComplete - navigation.responseEnd
        };

        // Log performance metrics
        console.log('Page Load Performance:', metrics);
        
        // Warn about slow metrics
        if (metrics.totalLoadTime > 3000) {
          console.warn('Slow page load detected:', metrics.totalLoadTime + 'ms');
        }
        
        return metrics;
      }
    }
    return null;
  }

  // Monitor API request performance
  wrapApiCall(apiFunction, operationName) {
    return async (...args) => {
      this.startTimer(operationName);
      try {
        const result = await apiFunction(...args);
        const duration = this.endTimer(operationName);
        
        // Log API performance
        if (duration > 2000) {
          console.warn(`Slow API call: ${operationName} took ${duration.toFixed(2)}ms`);
        }
        
        return result;
      } catch (error) {
        this.endTimer(operationName);
        throw error;
      }
    };
  }

  // Clear all metrics
  clear() {
    this.metrics = {};
    this.startTimes = {};
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Auto-monitor page load when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => performanceMonitor.monitorPageLoad(), 100);
    });
  } else {
    setTimeout(() => performanceMonitor.monitorPageLoad(), 100);
  }
}

export default performanceMonitor;
