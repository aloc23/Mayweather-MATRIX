/**
 * NOVA Dynamic UI Management
 * Handles dynamic UI interactions, chart updates, and user interface state management
 */

class NovaDynamicUI {
  constructor() {
    this.charts = new Map();
    this.calculator = new NovaCalculations();
    this.config = window.NovaConfig || {};
    this.portfolioData = [];
    this.currentView = 'overview';
    this.init();
  }

  /**
   * Initialize the NOVA UI
   */
  init() {
    this.setupEventListeners();
    this.initializeCharts();
    this.loadDefaultData();
  }

  /**
   * Setup event listeners for NOVA interactions
   */
  setupEventListeners() {
    // Portfolio management
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-nova-action]')) {
        const action = e.target.getAttribute('data-nova-action');
        this.handleAction(action, e.target);
      }
    });

    // Real-time updates (if enabled)
    if (this.config.features?.realTimeData) {
      setInterval(() => {
        this.updateCharts();
      }, this.config.dashboard?.refreshInterval || 30000);
    }

    // View switching
    document.addEventListener('change', (e) => {
      if (e.target.matches('[data-nova-view]')) {
        const view = e.target.value;
        this.switchView(view);
      }
    });
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
        console.warn(`Unknown NOVA action: ${action}`);
    }
  }

  /**
   * Switch between different views
   */
  switchView(view) {
    this.currentView = view;
    
    // Hide all view panels
    document.querySelectorAll('[data-nova-panel]').forEach(panel => {
      panel.style.display = 'none';
    });

    // Show selected view panel
    const targetPanel = document.querySelector(`[data-nova-panel="${view}"]`);
    if (targetPanel) {
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
   * Render overview dashboard
   */
  renderOverview() {
    const overviewContainer = document.querySelector('[data-nova-panel="overview"]');
    if (!overviewContainer) return;

    const metrics = this.calculator.calculatePortfolioMetrics(this.portfolioData, this.getHistoricalData());
    
    // Update KPI cards
    this.updateKPICard('total-value', this.formatCurrency(metrics.totalValue));
    this.updateKPICard('daily-return', this.formatPercentage(metrics.dailyReturns.slice(-1)[0]?.return || 0));
    this.updateKPICard('volatility', this.formatPercentage(metrics.volatility));
    this.updateKPICard('sharpe-ratio', metrics.sharpeRatio.toFixed(2));

    // Update charts
    this.updateChart('portfolio-performance', this.getPerformanceChartData());
    this.updateChart('asset-allocation', this.getAllocationChartData());
  }

  /**
   * Render analytics view
   */
  renderAnalytics() {
    const analyticsContainer = document.querySelector('[data-nova-panel="analytics"]');
    if (!analyticsContainer) return;

    const metrics = this.calculator.calculatePortfolioMetrics(this.portfolioData, this.getHistoricalData());
    
    // Advanced metrics table
    this.renderMetricsTable(metrics);
    
    // Performance attribution chart
    this.updateChart('performance-attribution', this.getAttributionChartData());
    
    // Correlation matrix
    this.renderCorrelationMatrix();
  }

  /**
   * Render risk analysis view
   */
  renderRiskAnalysis() {
    const riskContainer = document.querySelector('[data-nova-panel="risk"]');
    if (!riskContainer) return;

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
    const optimizationContainer = document.querySelector('[data-nova-panel="optimization"]');
    if (!optimizationContainer) return;

    // Efficient frontier
    const assets = this.portfolioData.map(p => p.symbol);
    const expectedReturns = this.getExpectedReturns();
    const covarianceMatrix = this.getCovarianceMatrix();
    
    const efficientFrontier = this.calculator.calculateEfficientFrontier(assets, expectedReturns, covarianceMatrix);
    
    // Update efficient frontier chart
    this.updateChart('efficient-frontier', this.formatEfficientFrontierData(efficientFrontier));
  }

  /**
   * Initialize charts
   */
  initializeCharts() {
    // Portfolio performance chart
    this.createChart('portfolio-performance', {
      type: 'line',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: 'Portfolio Performance' },
          legend: { display: true }
        },
        scales: {
          y: { beginAtZero: false }
        }
      }
    });

    // Asset allocation chart
    this.createChart('asset-allocation', {
      type: 'doughnut',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: 'Asset Allocation' },
          legend: { position: 'right' }
        }
      }
    });
  }

  /**
   * Create a chart instance
   */
  createChart(chartId, config) {
    const canvas = document.getElementById(chartId);
    if (!canvas) {
      console.warn(`Chart canvas not found: ${chartId}`);
      return;
    }

    const ctx = canvas.getContext('2d');
    const chart = new Chart(ctx, config);
    this.charts.set(chartId, chart);
    
    return chart;
  }

  /**
   * Update existing chart
   */
  updateChart(chartId, data) {
    const chart = this.charts.get(chartId);
    if (!chart) {
      console.warn(`Chart not found: ${chartId}`);
      return;
    }

    chart.data = data;
    chart.update('none'); // No animation for better performance
  }

  /**
   * Update KPI card value
   */
  updateKPICard(cardId, value) {
    const card = document.querySelector(`[data-kpi="${cardId}"] .kpi-value`);
    if (card) {
      card.textContent = value;
    }
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
   * Add new position to portfolio
   */
  addPosition(symbol, quantity, price) {
    this.portfolioData.push({
      id: Date.now(),
      symbol: symbol.toUpperCase(),
      quantity: parseFloat(quantity),
      currentPrice: parseFloat(price),
      purchasePrice: parseFloat(price),
      purchaseDate: new Date().toISOString().split('T')[0]
    });

    this.refreshData();
  }

  /**
   * Remove position from portfolio
   */
  removePosition(positionId) {
    this.portfolioData = this.portfolioData.filter(p => p.id !== parseInt(positionId));
    this.refreshData();
  }

  /**
   * Refresh all data and views
   */
  refreshData() {
    this.calculator.clearCache();
    this.updateViewContent(this.currentView);
    this.renderPositionsTable();
  }

  /**
   * Render positions table
   */
  renderPositionsTable() {
    const tableBody = document.querySelector('#positions-table tbody');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    
    this.portfolioData.forEach(position => {
      const row = document.createElement('tr');
      const gain = position.currentPrice - position.purchasePrice;
      const gainPercent = (gain / position.purchasePrice) * 100;
      
      row.innerHTML = `
        <td>${position.symbol}</td>
        <td>${position.quantity}</td>
        <td>${this.formatCurrency(position.currentPrice)}</td>
        <td>${this.formatCurrency(position.quantity * position.currentPrice)}</td>
        <td class="${gain >= 0 ? 'positive' : 'negative'}">
          ${this.formatCurrency(gain)} (${this.formatPercentage(gainPercent / 100)})
        </td>
        <td>
          <button data-nova-action="remove-position" data-position-id="${position.id}" class="btn-danger">
            Remove
          </button>
        </td>
      `;
      
      tableBody.appendChild(row);
    });
  }

  /**
   * Load default demo data
   */
  loadDefaultData() {
    this.portfolioData = [
      { id: 1, symbol: 'AAPL', quantity: 10, currentPrice: 150, purchasePrice: 140, purchaseDate: '2024-01-01' },
      { id: 2, symbol: 'GOOGL', quantity: 5, currentPrice: 2800, purchasePrice: 2700, purchaseDate: '2024-01-15' },
      { id: 3, symbol: 'MSFT', quantity: 15, currentPrice: 420, purchasePrice: 400, purchaseDate: '2024-02-01' }
    ];
  }

  /**
   * Get historical data (mock implementation)
   */
  getHistoricalData() {
    // Generate mock historical data
    const data = [];
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);
    
    let value = 100000; // Starting portfolio value
    
    for (let i = 0; i < 252; i++) { // 252 trading days
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      // Simulate daily returns with some volatility
      const dailyReturn = (Math.random() - 0.5) * 0.04; // ±2% daily range
      value *= (1 + dailyReturn);
      
      data.push({
        date: date.toISOString().split('T')[0],
        value: value
      });
    }
    
    return data;
  }

  /**
   * Helper methods for data formatting
   */
  formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }

  formatPercentage(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  /**
   * Get performance chart data
   */
  getPerformanceChartData() {
    const historicalData = this.getHistoricalData();
    return {
      labels: historicalData.map(d => d.date),
      datasets: [{
        label: 'Portfolio Value',
        data: historicalData.map(d => d.value),
        borderColor: this.config.dashboard?.colorScheme?.primary || '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        fill: true
      }]
    };
  }

  /**
   * Get allocation chart data
   */
  getAllocationChartData() {
    const totalValue = this.calculator.calculateTotalValue(this.portfolioData);
    
    return {
      labels: this.portfolioData.map(p => p.symbol),
      datasets: [{
        data: this.portfolioData.map(p => (p.quantity * p.currentPrice / totalValue) * 100),
        backgroundColor: [
          '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
          '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
        ]
      }]
    };
  }

  /**
   * Placeholder methods for advanced features
   */
  getExpectedReturns() {
    return this.portfolioData.map(() => 0.1); // 10% expected return
  }

  getCovarianceMatrix() {
    const n = this.portfolioData.length;
    return Array(n).fill().map(() => Array(n).fill(0.01)); // Simple covariance
  }

  getAttributionChartData() {
    return { labels: [], datasets: [] };
  }

  renderCorrelationMatrix() {
    // Placeholder for correlation matrix rendering
  }

  renderMetricsTable(metrics) {
    // Placeholder for advanced metrics table
  }

  getRiskDistributionData() {
    return { labels: [], datasets: [] };
  }

  formatEfficientFrontierData(frontierData) {
    return {
      labels: [],
      datasets: [{
        label: 'Efficient Frontier',
        data: frontierData.map(point => ({ x: point.risk, y: point.return })),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)'
      }]
    };
  }

  runAdvancedAnalysis() {
    console.log('Running advanced analysis...');
    // Placeholder for advanced analysis
  }

  exportReport() {
    console.log('Exporting report...');
    // Placeholder for report export
  }
}

// Export for module systems or global access
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NovaDynamicUI;
} else {
  window.NovaDynamicUI = NovaDynamicUI;
}