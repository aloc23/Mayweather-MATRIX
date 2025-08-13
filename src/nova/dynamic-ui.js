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

    // Check if Chart.js is available
    if (typeof Chart !== 'undefined') {
      const ctx = canvas.getContext('2d');
      const chart = new Chart(ctx, config);
      this.charts.set(chartId, chart);
      return chart;
    } else {
      // Fallback: Create a simple chart placeholder
      console.log(`Chart.js not available, creating fallback for: ${chartId}`);
      const fallbackChart = this.createFallbackChart(canvas, config);
      this.charts.set(chartId, fallbackChart);
      return fallbackChart;
    }
  }

  /**
   * Create fallback chart when Chart.js is not available
   */
  createFallbackChart(canvas, config) {
    const ctx = canvas.getContext('2d');
    const fallbackChart = {
      data: config.data,
      options: config.options,
      canvas: canvas,
      ctx: ctx,
      type: config.type,
      update: (animation) => {
        this.renderFallbackChart(fallbackChart);
      }
    };
    
    // Initial render
    this.renderFallbackChart(fallbackChart);
    
    return fallbackChart;
  }

  /**
   * Render a simple fallback chart
   */
  renderFallbackChart(chart) {
    const ctx = chart.ctx;
    const canvas = chart.canvas;
    const data = chart.data;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set canvas size
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    
    // Simple chart rendering based on type
    if (chart.type === 'line') {
      this.renderFallbackLineChart(ctx, data, canvas.offsetWidth, canvas.offsetHeight);
    } else if (chart.type === 'doughnut') {
      this.renderFallbackDoughnutChart(ctx, data, canvas.offsetWidth, canvas.offsetHeight);
    } else {
      // Default: Show placeholder text
      ctx.fillStyle = '#6b7280';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Chart visualization', canvas.offsetWidth / 2, canvas.offsetHeight / 2);
      ctx.fillText('(Chart.js not available)', canvas.offsetWidth / 2, canvas.offsetHeight / 2 + 20);
    }
  }

  /**
   * Render fallback line chart
   */
  renderFallbackLineChart(ctx, data, width, height) {
    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;
    
    if (!data.datasets || data.datasets.length === 0) {
      // Show demo line chart
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      const points = 10;
      for (let i = 0; i <= points; i++) {
        const x = padding + (i / points) * chartWidth;
        const y = padding + chartHeight / 2 + Math.sin(i * 0.5) * 40;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      
      // Add demo title
      ctx.fillStyle = '#374151';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Portfolio Performance Trend', width / 2, 20);
    }
  }

  /**
   * Render fallback doughnut chart
   */
  renderFallbackDoughnutChart(ctx, data, width, height) {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;
    
    if (!data.datasets || data.datasets.length === 0) {
      // Show demo allocation
      const allocations = [
        { label: 'Stocks', value: 60, color: '#3b82f6' },
        { label: 'Bonds', value: 30, color: '#10b981' },
        { label: 'Cash', value: 10, color: '#f59e0b' }
      ];
      
      let startAngle = -Math.PI / 2;
      
      allocations.forEach(allocation => {
        const angle = (allocation.value / 100) * 2 * Math.PI;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + angle);
        ctx.lineTo(centerX, centerY);
        ctx.fillStyle = allocation.color;
        ctx.fill();
        
        startAngle += angle;
      });
      
      // Add center circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      
      // Add title
      ctx.fillStyle = '#374151';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Asset Allocation', centerX, 20);
    }
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
    if (typeof Chart !== 'undefined' && chart.update) {
      chart.update('none'); // No animation for better performance
    } else if (chart.ctx) {
      // Fallback chart update
      this.renderFallbackChart(chart);
    }
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
    // Generate performance attribution data
    const sectors = ['Technology', 'Healthcare', 'Finance', 'Consumer'];
    const attribution = [2.1, 0.8, 1.2, -0.3]; // Contribution to return
    
    return {
      labels: sectors,
      datasets: [{
        label: 'Attribution (%)',
        data: attribution,
        backgroundColor: attribution.map(val => val >= 0 ? '#10b981' : '#ef4444'),
        borderColor: '#374151',
        borderWidth: 1
      }]
    };
  }

  getRiskDistributionData() {
    // Generate risk distribution histogram
    const returns = [];
    for (let i = 0; i < 100; i++) {
      returns.push((Math.random() - 0.5) * 0.1); // ±5% range
    }
    
    // Create histogram bins
    const bins = [-0.05, -0.03, -0.01, 0.01, 0.03, 0.05];
    const counts = new Array(bins.length - 1).fill(0);
    
    returns.forEach(ret => {
      for (let i = 0; i < bins.length - 1; i++) {
        if (ret >= bins[i] && ret < bins[i + 1]) {
          counts[i]++;
          break;
        }
      }
    });
    
    return {
      labels: bins.slice(0, -1).map(bin => `${(bin * 100).toFixed(1)}%`),
      datasets: [{
        label: 'Frequency',
        data: counts,
        backgroundColor: '#3b82f6',
        borderColor: '#1d4ed8',
        borderWidth: 1
      }]
    };
  }

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

  renderMetricsTable(metrics) {
    // Find or create metrics table container
    let container = document.querySelector('[data-nova-panel="analytics"] .metrics-table-container');
    if (!container) {
      const analyticsPanel = document.querySelector('[data-nova-panel="analytics"]');
      if (analyticsPanel) {
        const metricsDiv = document.createElement('div');
        metricsDiv.className = 'nova-analytics-card metrics-table-container';
        analyticsPanel.insertBefore(metricsDiv, analyticsPanel.firstChild);
        container = metricsDiv;
      } else {
        return;
      }
    }

    // Use provided metrics or demo data
    const metricsData = metrics || {
      totalValue: 124500,
      dailyReturns: 0.021,
      volatility: 0.123,
      sharpeRatio: 1.45,
      maxDrawdown: -0.087,
      beta: 0.85,
      alpha: 0.023
    };

    const html = `
      <h3>Advanced Portfolio Metrics</h3>
      <table class="nova-data-table">
        <tbody>
          <tr><td>Total Portfolio Value</td><td>${this.formatCurrency(metricsData.totalValue)}</td></tr>
          <tr><td>Daily Return</td><td class="${metricsData.dailyReturns >= 0 ? 'positive' : 'negative'}">${this.formatPercentage(metricsData.dailyReturns)}</td></tr>
          <tr><td>Volatility (Annualized)</td><td>${this.formatPercentage(metricsData.volatility)}</td></tr>
          <tr><td>Sharpe Ratio</td><td class="${metricsData.sharpeRatio >= 1 ? 'positive' : 'negative'}">${metricsData.sharpeRatio.toFixed(2)}</td></tr>
          <tr><td>Max Drawdown</td><td class="negative">${this.formatPercentage(metricsData.maxDrawdown)}</td></tr>
          <tr><td>Beta</td><td>${metricsData.beta.toFixed(2)}</td></tr>
          <tr><td>Alpha</td><td class="${metricsData.alpha >= 0 ? 'positive' : 'negative'}">${this.formatPercentage(metricsData.alpha)}</td></tr>
        </tbody>
      </table>
    `;
    
    container.innerHTML = html;
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
    
    // Update UI to show analysis is running
    const analysisBtn = document.querySelector('[data-nova-action="run-analysis"]');
    if (analysisBtn) {
      const originalText = analysisBtn.innerHTML;
      analysisBtn.innerHTML = '<span class="nova-icon nova-icon-loading nova-icon-spin"></span> Analyzing...';
      analysisBtn.disabled = true;
      
      // Simulate analysis
      setTimeout(() => {
        this.displayAnalysisResults();
        analysisBtn.innerHTML = originalText;
        analysisBtn.disabled = false;
      }, 2000);
    }
  }

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
          <div class="nova-badge warning">Sharpe Ratio: 1.45</div>
        </div>
        <div>
          <h4>Optimized Portfolio</h4>
          <div class="nova-badge success">Return: 9.2% | Risk: 11.8%</div>
          <div class="nova-badge success">Sharpe Ratio: 1.58</div>
        </div>
        <div>
          <h4>Improvement</h4>
          <div class="nova-badge primary">+0.7% Return</div>
          <div class="nova-badge primary">-0.5% Risk</div>
          <div class="nova-badge primary">+0.13 Sharpe</div>
        </div>
      </div>
      <p style="margin-top: 16px; color: #6b7280; font-size: 0.875rem;">
        Analysis completed based on historical data and modern portfolio theory. 
        Results are estimates and actual performance may vary.
      </p>
    `;
    
    container.innerHTML = html;
  }

  exportReport() {
    console.log('Exporting report...');
    
    // Update UI to show export is happening
    const exportBtn = document.querySelector('[data-nova-action="export-report"]');
    if (exportBtn) {
      const originalText = exportBtn.innerHTML;
      exportBtn.innerHTML = '<span class="nova-icon nova-icon-loading nova-icon-spin"></span> Exporting...';
      exportBtn.disabled = true;
      
      // Simulate export
      setTimeout(() => {
        this.generateReportData();
        exportBtn.innerHTML = originalText;
        exportBtn.disabled = false;
      }, 1500);
    }
  }

  generateReportData() {
    // Generate comprehensive report data
    const reportData = {
      portfolioSummary: {
        totalValue: 124500,
        dailyReturn: 2.1,
        volatility: 12.3,
        sharpeRatio: 1.45,
        positions: this.portfolioData.length
      },
      riskMetrics: {
        var95: -3.2,
        var99: -5.8,
        maxDrawdown: -8.7,
        beta: 0.85
      },
      timestamp: new Date().toISOString()
    };

    // Create and download report as JSON
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nova-portfolio-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Show success message
    this.showNotification('Report exported successfully!', 'success');
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `nova-notification nova-notification-${type}`;
    notification.innerHTML = `
      <span class="nova-icon nova-icon-${type === 'success' ? 'check' : 'info'}"></span>
      ${message}
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }
}

// Export for module systems or global access
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NovaDynamicUI;
} else {
  window.NovaDynamicUI = NovaDynamicUI;
}