/**
 * NOVA Analytics Configuration
 * Matrix-Nova configuration settings for advanced financial analytics
 */

const NovaConfig = {
  // Default analysis parameters
  analytics: {
    defaultTimeframe: '12M', // 12 months
    riskMetrics: {
      varConfidence: 0.95,
      stressTestScenarios: ['mild', 'moderate', 'severe'],
      correlationThreshold: 0.7
    },
    performance: {
      benchmarks: ['SPY', 'QQQ', 'BND'],
      rebalancingFrequency: 'quarterly',
      minimumTrackingPeriod: 30 // days
    }
  },
  
  // Dashboard layout configuration
  dashboard: {
    defaultChartType: 'line',
    maxDataPoints: 1000,
    refreshInterval: 30000, // 30 seconds
    animationDuration: 750,
    colorScheme: {
      primary: '#2563eb',
      secondary: '#10b981',
      danger: '#ef4444',
      warning: '#f59e0b',
      neutral: '#6b7280'
    }
  },
  
  // Data validation rules
  validation: {
    minPortfolioValue: 1000,
    maxAllocationPercentage: 100,
    requiredFields: ['symbol', 'quantity', 'price'],
    dateFormat: 'YYYY-MM-DD'
  },
  
  // API endpoints (placeholder for future integration)
  api: {
    baseUrl: '/api/v1',
    endpoints: {
      portfolio: '/portfolio',
      analytics: '/analytics',
      benchmarks: '/benchmarks',
      reports: '/reports'
    }
  },
  
  // Feature flags
  features: {
    advancedCharts: true,
    riskAnalysis: true,
    portfolioOptimization: true,
    backtesting: true,
    reportGeneration: true,
    realTimeData: false // Future feature
  }
};

// Export for module systems or global access
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NovaConfig;
} else {
  window.NovaConfig = NovaConfig;
}