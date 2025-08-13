/**
 * Matrix Nova - Independent Business Analytics Module
 * Encapsulated advanced portfolio analytics and risk management
 */

/**
 * Matrix Nova Configuration
 */
const MatrixNovaConfig = {
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

/**
 * Matrix Nova Calculations Engine
 */
class MatrixNovaCalculations {
  constructor() {
    this.cache = new Map();
    this.config = MatrixNovaConfig;
  }

  /**
   * Calculate portfolio performance metrics
   */
  calculatePortfolioMetrics(positions, historicalData) {
    const cacheKey = `portfolio_${JSON.stringify(positions)}_${Date.now()}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const metrics = {
      totalValue: this.calculateTotalValue(positions),
      dailyReturns: this.calculateDailyReturns(historicalData),
      volatility: this.calculateVolatility(historicalData),
      sharpeRatio: this.calculateSharpeRatio(historicalData),
      maxDrawdown: this.calculateMaxDrawdown(historicalData),
      beta: this.calculateBeta(historicalData),
      alpha: this.calculateAlpha(historicalData)
    };

    this.cache.set(cacheKey, metrics);
    return metrics;
  }

  /**
   * Calculate total portfolio value
   */
  calculateTotalValue(positions) {
    return positions.reduce((total, position) => {
      return total + (position.quantity * position.currentPrice);
    }, 0);
  }

  /**
   * Calculate daily returns from historical data
   */
  calculateDailyReturns(historicalData) {
    if (!historicalData || historicalData.length < 2) return [];
    
    const returns = [];
    for (let i = 1; i < historicalData.length; i++) {
      const currentValue = historicalData[i].value;
      const previousValue = historicalData[i - 1].value;
      const dailyReturn = (currentValue - previousValue) / previousValue;
      returns.push({
        date: historicalData[i].date,
        return: dailyReturn
      });
    }
    return returns;
  }

  /**
   * Calculate portfolio volatility (annualized standard deviation)
   */
  calculateVolatility(historicalData) {
    const returns = this.calculateDailyReturns(historicalData);
    if (returns.length === 0) return 0;

    const meanReturn = returns.reduce((sum, r) => sum + r.return, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r.return - meanReturn, 2), 0) / returns.length;
    const dailyVolatility = Math.sqrt(variance);
    
    // Annualize (assuming 252 trading days)
    return dailyVolatility * Math.sqrt(252);
  }

  /**
   * Calculate Sharpe ratio
   */
  calculateSharpeRatio(historicalData, riskFreeRate = 0.02) {
    const returns = this.calculateDailyReturns(historicalData);
    if (returns.length === 0) return 0;

    const meanReturn = returns.reduce((sum, r) => sum + r.return, 0) / returns.length;
    const annualizedReturn = meanReturn * 252; // Annualize
    const volatility = this.calculateVolatility(historicalData);
    
    if (volatility === 0) return 0;
    return (annualizedReturn - riskFreeRate) / volatility;
  }

  /**
   * Calculate maximum drawdown
   */
  calculateMaxDrawdown(historicalData) {
    if (!historicalData || historicalData.length < 2) return 0;

    let maxDrawdown = 0;
    let peak = historicalData[0].value;

    for (let i = 1; i < historicalData.length; i++) {
      const currentValue = historicalData[i].value;
      if (currentValue > peak) {
        peak = currentValue;
      } else {
        const drawdown = (peak - currentValue) / peak;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
    }

    return maxDrawdown;
  }

  /**
   * Calculate beta (market sensitivity)
   */
  calculateBeta(historicalData, marketData = null) {
    // Simplified beta calculation - in real implementation would use market benchmark
    return 0.85 + (Math.random() - 0.5) * 0.3; // Demo value
  }

  /**
   * Calculate alpha (excess return)
   */
  calculateAlpha(historicalData, marketData = null) {
    // Simplified alpha calculation
    return 0.023 + (Math.random() - 0.5) * 0.02; // Demo value
  }

  /**
   * Calculate Value at Risk (VaR)
   */
  calculateVaR(historicalData, confidence = 0.95) {
    const returns = this.calculateDailyReturns(historicalData);
    if (returns.length === 0) return 0;

    const sortedReturns = returns.map(r => r.return).sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * sortedReturns.length);
    return Math.abs(sortedReturns[index] || 0);
  }

  /**
   * Calculate efficient frontier (simplified)
   */
  calculateEfficientFrontier(assets, expectedReturns, covarianceMatrix) {
    // Simplified efficient frontier calculation for demo
    const points = [];
    for (let risk = 0.05; risk <= 0.25; risk += 0.01) {
      const expectedReturn = 0.02 + risk * 0.4 + (Math.random() - 0.5) * 0.02;
      points.push({ risk, return: expectedReturn });
    }
    return points;
  }
}

/**
 * Main Matrix Nova Application Class
 */
class MatrixNova {
  constructor() {
    this.charts = new Map();
    this.calculator = new MatrixNovaCalculations();
    this.config = MatrixNovaConfig;
    this.portfolioData = [];
    this.currentView = 'overview';
  }

  /**
   * Initialize Matrix Nova
   */
  init() {
    this.setupEventListeners();
    this.initializeCharts();
    this.loadDefaultData();
    this.renderCurrentView();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // NOVA view switching
    document.addEventListener('click', (e) => {
      if (e.target.matches('.nova-nav-tab')) {
        document.querySelectorAll('.nova-nav-tab').forEach(tab => {
          tab.classList.remove('active');
        });
        e.target.classList.add('active');
        
        const view = e.target.getAttribute('data-nova-view');
        this.switchView(view);
      }
    });

    // Handle NOVA actions
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-nova-action]')) {
        const action = e.target.getAttribute('data-nova-action');
        this.handleAction(action, e.target);
      }
    });

    // Modal close functionality
    document.addEventListener('click', (e) => {
      if (e.target.matches('.nova-modal-close') || e.target.closest('.nova-modal-close')) {
        this.closeAddPositionModal();
      }
      
      // Close modal when clicking outside
      if (e.target.matches('.nova-modal')) {
        this.closeAddPositionModal();
      }
    });

    // Real-time updates (if enabled)
    if (this.config.features?.realTimeData) {
      setInterval(() => {
        this.updateCharts();
      }, this.config.dashboard?.refreshInterval || 30000);
    }
  }

  /**
   * Handle UI actions
   */
  handleAction(action, element) {
    switch (action) {
      case 'add-position':
        this.showAddPositionModal();
        break;
      case 'remove-position':
        this.removePosition(element.dataset.positionId);
        break;
      case 'refresh-data':
        this.refreshData();
        break;
      case 'export-report':
        this.exportReport();
        break;
      case 'run-analysis':
        this.runAdvancedAnalysis();
        break;
      default:
        console.warn(`Unknown Matrix Nova action: ${action}`);
    }
  }

  /**
   * Switch between different views
   */
  switchView(view) {
    this.currentView = view;
    
    // Hide all view panels
    document.querySelectorAll('[data-nova-panel]').forEach(panel => {
      panel.classList.remove('active');
      panel.style.display = 'none';
    });

    // Show selected view panel
    const targetPanel = document.querySelector(`[data-nova-panel="${view}"]`);
    if (targetPanel) {
      targetPanel.classList.add('active');
      targetPanel.style.display = 'block';
      this.updateViewContent(view);
    }
  }

  /**
   * Update content for specific view
   */
  updateViewContent(view) {
    switch (view) {
      case 'overview':
        this.renderOverview();
        break;
      case 'analytics':
        this.renderAnalytics();
        break;
      case 'risk':
        this.renderRiskAnalysis();
        break;
      case 'optimization':
        this.renderOptimization();
        break;
    }
  }

  /**
   * Render current view
   */
  renderCurrentView() {
    this.updateViewContent(this.currentView);
  }

  /**
   * Load default sample data
   */
  loadDefaultData() {
    this.portfolioData = [
      { symbol: 'AAPL', quantity: 100, currentPrice: 150.25, purchasePrice: 140.00 },
      { symbol: 'GOOGL', quantity: 50, currentPrice: 2800.50, purchasePrice: 2650.00 },
      { symbol: 'MSFT', quantity: 75, currentPrice: 340.75, purchasePrice: 320.00 },
      { symbol: 'TSLA', quantity: 25, currentPrice: 220.30, purchasePrice: 200.00 }
    ];
    this.renderPositionsTable();
  }

  /**
   * Render overview dashboard
   */
  renderOverview() {
    const metrics = this.calculator.calculatePortfolioMetrics(this.portfolioData, this.getHistoricalData());
    
    // Update KPI cards
    this.updateKPICard('total-value', this.formatCurrency(metrics.totalValue));
    this.updateKPICard('daily-return', this.formatPercentage(metrics.dailyReturns.slice(-1)[0]?.return || 0.021));
    this.updateKPICard('volatility', this.formatPercentage(metrics.volatility));
    this.updateKPICard('sharpe-ratio', metrics.sharpeRatio.toFixed(2));

    // Update charts
    this.updateChart('portfolio-performance', this.getPerformanceChartData());
    this.updateChart('asset-allocation', this.getAllocationChartData());
    this.renderPositionsTable();
  }

  /**
   * Render analytics view
   */
  renderAnalytics() {
    const metrics = this.calculator.calculatePortfolioMetrics(this.portfolioData, this.getHistoricalData());
    
    // Performance attribution chart
    this.updateChart('performance-attribution', this.getAttributionChartData());
    
    // Correlation matrix
    this.renderCorrelationMatrix();
  }

  /**
   * Render risk analysis view
   */
  renderRiskAnalysis() {
    const historicalData = this.getHistoricalData();
    const var95 = this.calculator.calculateVaR(historicalData, 0.95);
    const var99 = this.calculator.calculateVaR(historicalData, 0.99);
    const maxDrawdown = this.calculator.calculateMaxDrawdown(historicalData);

    // Update risk metrics
    this.updateKPICard('var-95', this.formatPercentage(var95));
    this.updateKPICard('var-99', this.formatPercentage(var99));
    this.updateKPICard('max-drawdown', this.formatPercentage(maxDrawdown));

    // Risk distribution chart
    this.updateChart('risk-distribution', this.getRiskDistributionData());
  }

  /**
   * Render portfolio optimization view
   */
  renderOptimization() {
    // Efficient frontier chart
    this.updateChart('efficient-frontier', this.getEfficientFrontierData());
  }

  /**
   * Initialize charts
   */
  initializeCharts() {
    const chartElements = ['portfolio-performance', 'asset-allocation', 'performance-attribution', 'risk-distribution', 'efficient-frontier'];
    
    chartElements.forEach(chartId => {
      const canvas = document.getElementById(chartId);
      if (canvas) {
        const ctx = canvas.getContext('2d');
        this.charts.set(chartId, { canvas, ctx, chart: null });
      }
    });
  }

  /**
   * Update a specific chart
   */
  updateChart(chartId, data) {
    const chartInfo = this.charts.get(chartId);
    if (!chartInfo) return;

    const { canvas, ctx } = chartInfo;
    
    // Destroy existing chart if it exists
    if (chartInfo.chart) {
      chartInfo.chart.destroy();
    }

    // Create new chart
    try {
      if (typeof Chart !== 'undefined') {
        chartInfo.chart = new Chart(ctx, data);
      } else {
        // Fallback to simple canvas drawing
        this.renderFallbackChart(ctx, data, canvas.width, canvas.height);
      }
    } catch (error) {
      console.warn(`Error creating chart ${chartId}:`, error);
      this.renderFallbackChart(ctx, data, canvas.width, canvas.height);
    }
  }

  /**
   * Render fallback chart when Chart.js is not available
   */
  renderFallbackChart(ctx, data, width, height) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#374151';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Chart visualization requires Chart.js', width / 2, height / 2);
  }

  /**
   * Update KPI card
   */
  updateKPICard(kpi, value) {
    const card = document.querySelector(`[data-kpi="${kpi}"] .nova-kpi-value`);
    if (card) {
      card.textContent = value;
    }
  }

  /**
   * Render positions table
   */
  renderPositionsTable() {
    const tableBody = document.querySelector('#positions-table tbody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    this.portfolioData.forEach((position, index) => {
      const marketValue = position.quantity * position.currentPrice;
      const gainLoss = ((position.currentPrice - position.purchasePrice) / position.purchasePrice) * 100;
      const gainLossClass = gainLoss >= 0 ? 'positive' : 'negative';
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${position.symbol}</strong></td>
        <td>${position.quantity.toLocaleString()}</td>
        <td>${this.formatCurrency(position.currentPrice)}</td>
        <td>${this.formatCurrency(marketValue)}</td>
        <td class="${gainLossClass}">${gainLoss >= 0 ? '+' : ''}${gainLoss.toFixed(2)}%</td>
        <td>
          <button class="nova-btn secondary small" data-nova-action="remove-position" data-position-id="${index}">
            Remove
          </button>
        </td>
      `;
      
      tableBody.appendChild(row);
    });
  }

  /**
   * Render correlation matrix
   */
  renderCorrelationMatrix() {
    // Create a simple correlation matrix display
    const container = document.querySelector('[data-nova-panel="analytics"] .correlation-matrix-container');
    if (!container) {
      // Create container if it doesn't exist
      const analyticsPanel = document.querySelector('[data-nova-panel="analytics"]');
      if (analyticsPanel) {
        const matrixDiv = document.createElement('div');
        matrixDiv.className = 'nova-analytics-card';
        matrixDiv.innerHTML = `
          <h3>Asset Correlation Matrix</h3>
          <div class="correlation-matrix-container"></div>
        `;
        analyticsPanel.appendChild(matrixDiv);
        return this.renderCorrelationMatrix(); // Retry after creating container
      }
      return;
    }

    // Demo correlation matrix
    const assets = ['AAPL', 'GOOGL', 'MSFT', 'TSLA'];
    const correlations = [
      [1.00, 0.75, 0.82, 0.65],
      [0.75, 1.00, 0.78, 0.55],
      [0.82, 0.78, 1.00, 0.60],
      [0.65, 0.55, 0.60, 1.00]
    ];

    let html = '<table class="nova-data-table correlation-matrix">';
    html += '<thead><tr><th></th>';
    assets.forEach(asset => html += `<th>${asset}</th>`);
    html += '</tr></thead><tbody>';

    correlations.forEach((row, i) => {
      html += `<tr><td><strong>${assets[i]}</strong></td>`;
      row.forEach(corr => {
        const className = corr > 0.7 ? 'high-correlation' : corr < 0.3 ? 'low-correlation' : 'medium-correlation';
        html += `<td class="${className}">${corr.toFixed(2)}</td>`;
      });
      html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
  }

  /**
   * Show add position modal
   */
  showAddPositionModal() {
    const modal = document.getElementById('add-position-modal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  /**
   * Close add position modal
   */
  closeAddPositionModal() {
    const modal = document.getElementById('add-position-modal');
    if (modal) {
      modal.style.display = 'none';
      // Clear form
      document.getElementById('position-symbol').value = '';
      document.getElementById('position-quantity').value = '';
      document.getElementById('position-price').value = '';
    }
  }

  /**
   * Add position from modal
   */
  addPositionFromModal() {
    const symbol = document.getElementById('position-symbol').value.toUpperCase();
    const quantity = parseInt(document.getElementById('position-quantity').value);
    const price = parseFloat(document.getElementById('position-price').value);

    if (symbol && quantity && price) {
      this.portfolioData.push({
        symbol,
        quantity,
        currentPrice: price,
        purchasePrice: price
      });
      
      this.renderPositionsTable();
      this.renderCurrentView();
      this.closeAddPositionModal();
    }
  }

  /**
   * Remove position
   */
  removePosition(positionId) {
    if (positionId !== undefined) {
      this.portfolioData.splice(parseInt(positionId), 1);
      this.renderPositionsTable();
      this.renderCurrentView();
    }
  }

  /**
   * Refresh data
   */
  refreshData() {
    // Simulate price updates
    this.portfolioData.forEach(position => {
      const change = (Math.random() - 0.5) * 0.1; // ±5% change
      position.currentPrice = position.currentPrice * (1 + change);
    });
    
    this.renderPositionsTable();
    this.renderCurrentView();
  }

  /**
   * Export report
   */
  exportReport() {
    alert('Export functionality would be implemented here');
  }

  /**
   * Run advanced analysis
   */
  runAdvancedAnalysis() {
    // Simulate analysis
    setTimeout(() => {
      this.displayAnalysisResults();
    }, 1000);
  }

  /**
   * Display analysis results
   */
  displayAnalysisResults() {
    // Find or create analysis results container
    let container = document.querySelector('[data-nova-panel="optimization"] .analysis-results');
    if (!container) {
      const optimizationPanel = document.querySelector('[data-nova-panel="optimization"]');
      if (optimizationPanel) {
        const resultsDiv = document.createElement('div');
        resultsDiv.className = 'nova-analytics-card analysis-results';
        optimizationPanel.appendChild(resultsDiv);
        container = resultsDiv;
      } else {
        return;
      }
    }

    const html = `
      <h3>Portfolio Optimization Results</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
        <div>
          <h4>Current Portfolio</h4>
          <div class="nova-badge info">Return: 8.5% | Risk: 12.3%</div>
        </div>
        <div>
          <h4>Optimized Portfolio</h4>
          <div class="nova-badge success">Return: 9.2% | Risk: 11.8%</div>
        </div>
        <div>
          <h4>Improvement</h4>
          <div class="nova-badge positive">+0.7% Return | -0.5% Risk</div>
        </div>
      </div>
      <p style="font-size: 0.875rem; color: #6b7280; margin-top: 16px;">
        Results are estimates and actual performance may vary.
      </p>
    `;
    
    container.innerHTML = html;
  }

  /**
   * Get historical data (demo)
   */
  getHistoricalData() {
    const data = [];
    const startValue = 100000;
    let currentValue = startValue;
    
    for (let i = 0; i < 365; i++) {
      const change = (Math.random() - 0.5) * 0.02; // ±1% daily change
      currentValue = currentValue * (1 + change);
      data.push({
        date: new Date(Date.now() - (365 - i) * 24 * 60 * 60 * 1000),
        value: currentValue
      });
    }
    
    return data;
  }

  /**
   * Get performance chart data
   */
  getPerformanceChartData() {
    const historicalData = this.getHistoricalData();
    
    return {
      type: 'line',
      data: {
        labels: historicalData.slice(-30).map(d => d.date.toLocaleDateString()),
        datasets: [{
          label: 'Portfolio Value',
          data: historicalData.slice(-30).map(d => d.value),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            ticks: {
              callback: function(value) {
                return '$' + value.toLocaleString();
              }
            }
          }
        }
      }
    };
  }

  /**
   * Get allocation chart data
   */
  getAllocationChartData() {
    const total = this.portfolioData.reduce((sum, p) => sum + (p.quantity * p.currentPrice), 0);
    
    return {
      type: 'doughnut',
      data: {
        labels: this.portfolioData.map(p => p.symbol),
        datasets: [{
          data: this.portfolioData.map(p => ((p.quantity * p.currentPrice) / total * 100).toFixed(1)),
          backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    };
  }

  /**
   * Get attribution chart data
   */
  getAttributionChartData() {
    return {
      type: 'bar',
      data: {
        labels: ['Asset Selection', 'Allocation', 'Timing', 'Currency'],
        datasets: [{
          label: 'Attribution (%)',
          data: [2.3, 1.8, 0.5, -0.2],
          backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return value + '%';
              }
            }
          }
        }
      }
    };
  }

  /**
   * Get risk distribution data
   */
  getRiskDistributionData() {
    const data = [];
    for (let i = -5; i <= 5; i += 0.2) {
      const y = Math.exp(-0.5 * Math.pow(i / 1.5, 2)) / (1.5 * Math.sqrt(2 * Math.PI));
      data.push({ x: i, y });
    }

    return {
      type: 'line',
      data: {
        datasets: [{
          label: 'Return Distribution',
          data: data,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'linear',
            title: {
              display: true,
              text: 'Daily Return (%)'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Probability Density'
            }
          }
        }
      }
    };
  }

  /**
   * Get efficient frontier data
   */
  getEfficientFrontierData() {
    const frontierPoints = this.calculator.calculateEfficientFrontier([], [], []);
    
    return {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Efficient Frontier',
          data: frontierPoints.map(p => ({ x: p.risk * 100, y: p.return * 100 })),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          showLine: true,
          tension: 0.4
        }, {
          label: 'Current Portfolio',
          data: [{ x: 12.3, y: 8.5 }],
          backgroundColor: '#ef4444',
          pointRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Risk (Volatility %)'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Expected Return (%)'
            }
          }
        }
      }
    };
  }

  /**
   * Format currency
   */
  formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  /**
   * Format percentage
   */
  formatPercentage(value) {
    return (value * 100).toFixed(2) + '%';
  }
}

// Global functions for modal interactions
function closeAddPositionModal() {
  const modal = document.getElementById('add-position-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function addPositionFromModal() {
  if (window.matrixNovaInstance) {
    window.matrixNovaInstance.addPositionFromModal();
  }
}

// Make MatrixNova available globally
window.MatrixNova = MatrixNova;

// Auto-initialize if DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    window.matrixNovaInstance = new MatrixNova();
    window.matrixNovaInstance.init();
  });
} else {
  window.matrixNovaInstance = new MatrixNova();
  window.matrixNovaInstance.init();
}