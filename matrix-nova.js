/**
 * Matrix Nova - Standalone Business Analytics Module
 * Advanced Portfolio Analytics & Risk Management
 */

class MatrixNova {
  constructor() {
    this.charts = new Map();
    this.calculator = new NovaCalculations();
    this.config = window.NovaConfig || {};
    this.portfolioData = [];
    this.currentView = 'overview';
    this.novaElement = null;
    this.eventListeners = [];
  }

  /**
   * Initialize Matrix Nova
   */
  init() {
    this.novaElement = document.getElementById('nova');
    if (!this.novaElement) {
      console.warn('NOVA element not found');
      return;
    }
    
    this.setupEventListeners();
    this.initializeCharts();
    this.loadDefaultData();
    this.renderCurrentView();
    
    console.log('Matrix Nova initialized successfully');
  }

  /**
   * Setup event listeners for Matrix Nova interactions
   */
  setupEventListeners() {
    // NOVA navigation tabs
    const navTabs = this.novaElement.querySelectorAll('.nova-nav-tab');
    navTabs.forEach(tab => {
      const handler = (e) => {
        e.preventDefault();
        const view = tab.getAttribute('data-nova-view');
        if (view) {
          this.switchView(view);
        }
      };
      tab.addEventListener('click', handler);
      this.eventListeners.push({ element: tab, event: 'click', handler });
    });

    // Action buttons
    const actionButtons = this.novaElement.querySelectorAll('[data-nova-action]');
    actionButtons.forEach(button => {
      const handler = (e) => {
        e.preventDefault();
        const action = button.getAttribute('data-nova-action');
        if (action) {
          this.handleAction(action, button);
        }
      };
      button.addEventListener('click', handler);
      this.eventListeners.push({ element: button, event: 'click', handler });
    });

    // Modal close functionality
    const modalCloses = this.novaElement.querySelectorAll('.nova-modal-close');
    modalCloses.forEach(closeBtn => {
      const handler = (e) => {
        e.preventDefault();
        const modal = closeBtn.closest('.nova-modal');
        if (modal) {
          modal.style.display = 'none';
        }
      };
      closeBtn.addEventListener('click', handler);
      this.eventListeners.push({ element: closeBtn, event: 'click', handler });
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
      case 'refresh-data':
        this.refreshData();
        break;
      case 'run-analysis':
        this.runOptimizationAnalysis();
        break;
      case 'export-report':
        this.exportReport();
        break;
      default:
        console.log('Unknown action:', action);
    }
  }

  /**
   * Switch between different views
   */
  switchView(view) {
    if (this.currentView === view) return;

    // Update active nav tab
    const navTabs = this.novaElement.querySelectorAll('.nova-nav-tab');
    navTabs.forEach(tab => {
      tab.classList.remove('active');
      if (tab.getAttribute('data-nova-view') === view) {
        tab.classList.add('active');
      }
    });

    // Update active panel
    const panels = this.novaElement.querySelectorAll('.nova-view-panel');
    panels.forEach(panel => {
      panel.classList.remove('active');
      if (panel.getAttribute('data-nova-panel') === view) {
        panel.classList.add('active');
      }
    });

    this.currentView = view;
    this.updateViewContent(view);
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
   * Render overview dashboard
   */
  renderOverview() {
    this.updateKPICards();
    this.renderPositionsTable();
    this.updateCharts();
  }

  /**
   * Render analytics view
   */
  renderAnalytics() {
    this.renderPerformanceMetrics();
    this.renderCorrelationMatrix();
  }

  /**
   * Render risk analysis view
   */
  renderRiskAnalysis() {
    this.updateRiskMetrics();
    this.renderStressTests();
  }

  /**
   * Render portfolio optimization view
   */
  renderOptimization() {
    this.renderEfficientFrontier();
    this.updateOptimizationResults();
  }

  /**
   * Initialize charts
   */
  initializeCharts() {
    if (typeof Chart !== 'undefined') {
      this.createChart('portfolio-performance', {
        type: 'line',
        data: this.getPerformanceChartData(),
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Portfolio Performance'
            }
          },
          scales: {
            y: {
              beginAtZero: false
            }
          }
        }
      });

      this.createChart('asset-allocation', {
        type: 'doughnut',
        data: this.getAssetAllocationData(),
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Asset Allocation'
            }
          }
        }
      });
    } else {
      console.warn('Chart.js not available, using fallback charts');
      this.createFallbackCharts();
    }
  }

  /**
   * Create fallback charts when Chart.js is not available
   */
  createFallbackCharts() {
    console.log('Creating fallback charts (Chart.js not available)');
    // Create simple canvas placeholders for charts
    const chartCanvases = ['portfolio-performance', 'asset-allocation', 'performance-attribution', 'risk-distribution', 'efficient-frontier'];
    
    chartCanvases.forEach(chartId => {
      const canvas = document.getElementById(chartId);
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#666';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Chart placeholder', canvas.width / 2, canvas.height / 2);
        
        // Create a simple chart object for compatibility
        this.charts.set(chartId, {
          update: () => console.log(`Updating ${chartId} chart`),
          render: () => console.log(`Rendering ${chartId} chart`),
          destroy: () => console.log(`Destroying ${chartId} chart`)
        });
      }
    });
  }

  /**
   * Create a chart instance
   */
  createChart(chartId, config) {
    const canvas = document.getElementById(chartId);
    if (!canvas) return null;

    try {
      if (typeof Chart !== 'undefined') {
        const chart = new Chart(canvas.getContext('2d'), config);
        this.charts.set(chartId, chart);
        return chart;
      }
    } catch (error) {
      console.error('Error creating chart:', error);
    }
    
    return this.createFallbackChart(canvas, config);
  }

  /**
   * Create fallback chart when Chart.js is not available
   */
  createFallbackChart(canvas, config) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const chart = {
      canvas: canvas,
      ctx: ctx,
      config: config,
      render: () => this.renderFallbackChart(chart)
    };
    
    this.charts.set(canvas.id, chart);
    chart.render();
    return chart;
  }

  /**
   * Render a simple fallback chart
   */
  renderFallbackChart(chart) {
    const { ctx, config } = chart;
    const width = chart.canvas.width;
    const height = chart.canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    if (config.type === 'line') {
      this.renderFallbackLineChart(ctx, config.data, width, height);
    } else if (config.type === 'doughnut') {
      this.renderFallbackDoughnutChart(ctx, config.data, width, height);
    }
  }

  /**
   * Render fallback line chart
   */
  renderFallbackLineChart(ctx, data, width, height) {
    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;
    
    // Draw axes
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.stroke();
    
    // Draw sample data line
    if (data.datasets && data.datasets[0] && data.datasets[0].data) {
      const dataPoints = data.datasets[0].data;
      const stepX = chartWidth / (dataPoints.length - 1);
      const maxValue = Math.max(...dataPoints);
      const minValue = Math.min(...dataPoints);
      const valueRange = maxValue - minValue || 1;
      
      ctx.strokeStyle = data.datasets[0].borderColor || '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      dataPoints.forEach((value, index) => {
        const x = padding + index * stepX;
        const y = height - padding - ((value - minValue) / valueRange) * chartHeight;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
    }
  }

  /**
   * Render fallback doughnut chart
   */
  renderFallbackDoughnutChart(ctx, data, width, height) {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 20;
    const innerRadius = radius * 0.6;
    
    if (data.datasets && data.datasets[0] && data.datasets[0].data) {
      const values = data.datasets[0].data;
      const total = values.reduce((sum, val) => sum + val, 0);
      const colors = data.datasets[0].backgroundColor || ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
      
      let currentAngle = -Math.PI / 2;
      
      values.forEach((value, index) => {
        const sliceAngle = (value / total) * 2 * Math.PI;
        
        ctx.fillStyle = colors[index % colors.length];
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
        ctx.closePath();
        ctx.fill();
        
        currentAngle += sliceAngle;
      });
    }
  }

  /**
   * Get sample performance chart data
   */
  getPerformanceChartData() {
    return {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: 'Portfolio Value',
        data: [100000, 102000, 105000, 103000, 108000, 124500],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true
      }]
    };
  }

  /**
   * Get sample asset allocation data
   */
  getAssetAllocationData() {
    return {
      labels: ['Stocks', 'Bonds', 'Cash', 'Real Estate'],
      datasets: [{
        data: [60, 25, 10, 5],
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']
      }]
    };
  }

  /**
   * Update KPI cards with current data
   */
  updateKPICards() {
    const kpiCards = this.novaElement.querySelectorAll('.nova-kpi-card');
    kpiCards.forEach(card => {
      const kpiType = card.getAttribute('data-kpi');
      // Update with real data when available
      // For now, using the static values from HTML
    });
  }

  /**
   * Render positions table
   */
  renderPositionsTable() {
    const table = this.novaElement.querySelector('#positions-table tbody');
    if (!table) return;

    // Sample data - replace with real data
    const positions = [
      { symbol: 'AAPL', quantity: 100, price: 150.25, value: 15025, gainLoss: '+5.2%' },
      { symbol: 'GOOGL', quantity: 50, price: 2800.50, value: 140025, gainLoss: '+2.1%' },
      { symbol: 'MSFT', quantity: 75, price: 350.75, value: 26306.25, gainLoss: '+8.7%' }
    ];

    table.innerHTML = positions.map(pos => `
      <tr>
        <td><strong>${pos.symbol}</strong></td>
        <td>${pos.quantity}</td>
        <td>$${pos.price.toFixed(2)}</td>
        <td>$${pos.value.toLocaleString()}</td>
        <td class="${pos.gainLoss.startsWith('+') ? 'positive' : 'negative'}">${pos.gainLoss}</td>
        <td>
          <button class="nova-btn secondary small">Edit</button>
          <button class="nova-btn danger small">Remove</button>
        </td>
      </tr>
    `).join('');
  }

  /**
   * Show add position modal
   */
  showAddPositionModal() {
    const modal = document.getElementById('add-position-modal');
    if (modal) {
      modal.style.display = 'flex';
      // Add active class for animation
      setTimeout(() => modal.classList.add('active'), 10);
    }
  }

  /**
   * Refresh all data and views
   */
  refreshData() {
    if (this.calculator) {
      this.calculator.clearCache();
    }
    this.updateViewContent(this.currentView);
    this.renderPositionsTable();
    console.log('Data refreshed');
  }

  /**
   * Run optimization analysis
   */
  runOptimizationAnalysis() {
    console.log('Running optimization analysis...');
    // Implement optimization logic
  }

  /**
   * Export report
   */
  exportReport() {
    console.log('Exporting report...');
    // Implement export functionality
  }

  /**
   * Update charts
   */
  updateCharts() {
    this.charts.forEach((chart, chartId) => {
      if (chart.render) {
        chart.render();
      } else if (chart.update) {
        chart.update();
      }
    });
  }

  /**
   * Render performance metrics
   */
  renderPerformanceMetrics() {
    // Implementation for analytics panel
  }

  /**
   * Render correlation matrix
   */
  renderCorrelationMatrix() {
    // Implementation for correlation matrix
  }

  /**
   * Update risk metrics
   */
  updateRiskMetrics() {
    // Implementation for risk metrics
  }

  /**
   * Render stress tests
   */
  renderStressTests() {
    // Implementation for stress tests
  }

  /**
   * Render efficient frontier
   */
  renderEfficientFrontier() {
    // Implementation for efficient frontier
  }

  /**
   * Update optimization results
   */
  updateOptimizationResults() {
    // Implementation for optimization results
  }

  /**
   * Load default data
   */
  loadDefaultData() {
    // Load sample portfolio data
    this.portfolioData = [
      { symbol: 'AAPL', quantity: 100, currentPrice: 150.25 },
      { symbol: 'GOOGL', quantity: 50, currentPrice: 2800.50 },
      { symbol: 'MSFT', quantity: 75, currentPrice: 350.75 }
    ];
  }

  /**
   * Clean up event listeners
   */
  cleanup() {
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];

    // Destroy charts
    this.charts.forEach(chart => {
      if (chart.destroy) {
        chart.destroy();
      }
    });
    this.charts.clear();
  }
}

// Export for module systems or global access
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MatrixNova;
} else {
  window.MatrixNova = MatrixNova;
}