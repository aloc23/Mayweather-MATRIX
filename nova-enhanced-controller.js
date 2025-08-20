/**
 * Enhanced Nova Controller
 * Manages the comprehensive business analytics tab system with dynamic project tabs
 */

class NovaEnhancedController {
  constructor() {
    this.currentView = 'business-analytics-main'; // Updated default view
    this.novaElement = null;
    this.eventListeners = [];
    this.dynamicTabs = new Map(); // Store dynamic project tabs
    this.isActive = false;
    
    // Initialize dynamic UI generator
    this.dynamicUI = null;
    
    // Initialize state listeners
    this.initializeStateListeners();
  }

  /**
   * Initialize the Nova enhanced controller
   */
  init() {
    this.novaElement = document.getElementById('nova');
    if (!this.novaElement) {
      console.warn('Nova element not found');
      return;
    }

    this.setupNovaTabEventListeners();
    this.initializeDynamicUI();
    this.setActive(true);
    this.updateViewContent(this.currentView);
    
    console.log('Nova Enhanced Controller initialized');
  }

  /**
   * Setup event listeners for Nova tab navigation
   */
  setupNovaTabEventListeners() {
    // Nova navigation tabs within business-analytics section
    const navTabs = this.novaElement.querySelectorAll('.nova-nav-tab');
    navTabs.forEach(tab => {
      const handler = (e) => {
        e.preventDefault();
        const view = tab.getAttribute('data-nova-view');
        if (view) {
          this.switchView(view);
        }
      };
      
      // Click handler
      tab.addEventListener('click', handler);
      this.eventListeners.push({ element: tab, event: 'click', handler });
      
      // Keyboard accessibility handler
      const keyHandler = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handler(e);
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          this.navigateTabsWithKeyboard(tab, e.key === 'ArrowRight' ? 1 : -1);
        }
      };
      
      tab.addEventListener('keydown', keyHandler);
      this.eventListeners.push({ element: tab, event: 'keydown', handler: keyHandler });
      
      // Make tabs focusable
      tab.setAttribute('tabindex', '0');
    });
  }

  /**
   * Navigate tabs using keyboard arrows
   */
  navigateTabsWithKeyboard(currentTab, direction) {
    const tabs = Array.from(this.novaElement.querySelectorAll('.nova-nav-tab'));
    const currentIndex = tabs.indexOf(currentTab);
    const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
    
    if (tabs[nextIndex]) {
      tabs[nextIndex].focus();
      tabs[nextIndex].click();
    }
  }

  /**
   * Switch between Nova analytics views
   */
  switchView(view) {
    // Update tab active states
    const tabs = this.novaElement.querySelectorAll('.nova-nav-tab');
    tabs.forEach(tab => {
      const isActive = tab.getAttribute('data-nova-view') === view;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive.toString());
    });

    // Update panel visibility
    const panels = this.novaElement.querySelectorAll('.nova-view-panel');
    panels.forEach(panel => {
      const isActive = panel.getAttribute('data-nova-panel') === view;
      panel.classList.toggle('active', isActive);
      panel.setAttribute('aria-hidden', (!isActive).toString());
    });

    // Update current view and render content
    this.currentView = view;
    this.updateViewContent(view);
    
    console.log(`Nova view switched to: ${view}`);
  }

  /**
   * Initialize dynamic UI generator
   */
  initializeDynamicUI() {
    if (typeof DynamicUIGenerator !== 'undefined') {
      this.dynamicUI = new DynamicUIGenerator();
      // Generate business type selector in the new container
      this.dynamicUI.generateBusinessTypeSelector('nova-business-analytics-container');
    } else if (typeof window.dynamicUI !== 'undefined') {
      // Fallback to global dynamic UI instance
      this.dynamicUI = window.dynamicUI;
    }
  }

  /**
   * Initialize state change listeners
   */
  initializeStateListeners() {
    // Wait for state manager to be available
    const initListeners = () => {
      if (window.selectionStateManager) {
        // Listen for project type changes to update dynamic tabs
        window.selectionStateManager.addEventListener('projectTypesChanged', (data) => {
          this.updateDynamicTabs(data.selectedProjects);
        });

        // Listen for active project changes
        window.selectionStateManager.addEventListener('activeProjectChanged', (data) => {
          if (data.new) {
            this.switchToProjectTab(data.new);
          }
        });
      } else {
        // Retry if state manager not yet available
        setTimeout(initListeners, 100);
      }
    };
    
    initListeners();
  }

  /**
   * Setup event listeners for Nova interactions
   */
  setupEventListeners() {
    // Nova navigation tabs
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

    // Modal close functionality (if needed)
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
      case 'reset-selection':
        this.resetSelection();
        break;
      case 'refresh-data':
        this.refreshData();
        break;
      case 'export-report':
        this.exportReport();
        break;
      case 'export-pdf':
        this.exportPDF();
        break;
      case 'export-excel':
        this.exportExcel();
        break;
      case 'calculate-roi':
        this.calculateROI();
        break;
      case 'add-scenario':
        this.addScenario();
        break;
      case 'add-milestone':
        this.addMilestone();
        break;
      default:
        console.log('Unknown Nova action:', action);
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
      tab.setAttribute('aria-selected', 'false');
      if (tab.getAttribute('data-nova-view') === view) {
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
      }
    });

    // Update active panel
    const panels = this.novaElement.querySelectorAll('.nova-panel');
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
   * Update content for specific view within Nova analytics
   * Handles the new horizontal tab structure
   */
  updateViewContent(view) {
    switch (view) {
      case 'business-analytics-main':
        this.renderBusinessAnalyticsMain();
        break;
      case 'pnl':
        this.renderPnLAnalysis();
        break;
      case 'roi':
        this.renderROIAnalysis();
        break;
      case 'scenarios':
        this.renderScenarios();
        break;
      case 'summary':
        this.renderSummary();
        break;
      case 'gantt':
        this.renderGantt();
        break;
      // Legacy support
      case 'project-selector':
        this.renderBusinessAnalyticsMain();
        break;
      default:
        // Handle dynamic project tabs
        if (view.startsWith('project-')) {
          this.renderProjectTab(view);
        } else {
          console.warn(`Unknown Nova view: ${view}`);
        }
    }
  }

  /**
   * Update dynamic tabs based on selected projects
   */
  updateDynamicTabs(selectedProjects) {
    const dynamicTabsContainer = document.getElementById('nova-dynamic-tabs');
    const dynamicPanelsContainer = document.getElementById('nova-dynamic-panels');
    
    if (!dynamicTabsContainer || !dynamicPanelsContainer) return;

    // Clear existing dynamic tabs and panels
    dynamicTabsContainer.innerHTML = '';
    dynamicPanelsContainer.innerHTML = '';
    this.dynamicTabs.clear();

    // Create tabs for each selected project
    selectedProjects.forEach(projectId => {
      const projectType = window.projectTypeManager?.getProjectType(projectId);
      if (projectType) {
        this.createProjectTab(projectId, projectType);
      }
    });
  }

  /**
   * Create a dynamic project tab
   */
  createProjectTab(projectId, projectType) {
    const dynamicTabsContainer = document.getElementById('nova-dynamic-tabs');
    const dynamicPanelsContainer = document.getElementById('nova-dynamic-panels');
    
    // Create tab button
    const tabButton = document.createElement('button');
    tabButton.type = 'button';
    tabButton.className = 'nova-nav-tab nova-project-tab';
    tabButton.setAttribute('data-nova-view', `project-${projectId}`);
    tabButton.setAttribute('role', 'tab');
    tabButton.setAttribute('aria-selected', 'false');
    tabButton.innerHTML = `
      <span class="nova-icon nova-icon-project">${projectType.icon}</span> ${projectType.name}
    `;

    // Add event listener
    const handler = (e) => {
      e.preventDefault();
      this.switchView(`project-${projectId}`);
    };
    tabButton.addEventListener('click', handler);
    this.eventListeners.push({ element: tabButton, event: 'click', handler });

    dynamicTabsContainer.appendChild(tabButton);

    // Create panel
    const panel = document.createElement('section');
    panel.className = 'nova-view-panel nova-project-panel';
    panel.setAttribute('data-nova-panel', `project-${projectId}`);
    panel.setAttribute('role', 'tabpanel');
    panel.innerHTML = `
      <div class="nova-panel-header">
        <h3>${projectType.icon} ${projectType.name} Analysis</h3>
        <div class="nova-panel-actions">
          <button type="button" class="nova-btn" data-nova-action="calculate-project" data-project-id="${projectId}">
            <span class="btn-icon">📊</span> Calculate
          </button>
          <button type="button" class="nova-btn secondary" data-nova-action="export-project" data-project-id="${projectId}">
            <span class="btn-icon">📥</span> Export
          </button>
        </div>
      </div>
      
      <div class="nova-project-content" id="project-content-${projectId}">
        <!-- Project-specific content will be populated here -->
      </div>
    `;

    dynamicPanelsContainer.appendChild(panel);
    this.dynamicTabs.set(projectId, { tab: tabButton, panel: panel });
  }

  /**
   * Switch to a specific project tab
   */
  switchToProjectTab(projectId) {
    this.switchView(`project-${projectId}`);
  }

  /**
   * Set Nova as active/inactive
   */
  setActive(active) {
    this.isActive = active;
    if (active && this.dynamicUI) {
      // Refresh dynamic UI when activated
      setTimeout(() => {
        if (this.currentView === 'project-selector') {
          this.renderProjectSelector();
        }
      }, 100);
    }
  }

  /**
   * Clean up event listeners
   */
  cleanup() {
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
    this.isActive = false;
  }

  // ========== Render Methods ==========

  /**
   * Render main business analytics view
   * This replaces the old project selector and serves as the entry point
   */
  renderBusinessAnalyticsMain() {
    console.log('Rendering Business Analytics main view');
    
    // Initialize the dynamic UI in the business analytics container
    if (this.dynamicUI) {
      // The dynamic UI is already initialized in the container
      console.log('Business analytics configuration ready');
    } else if (window.dynamicUI) {
      // Use global dynamic UI instance if available
      this.dynamicUI = window.dynamicUI;
    }
    
    // Ensure the container exists
    const container = document.getElementById('nova-business-analytics-container');
    if (container && !container.hasChildNodes()) {
      container.innerHTML = `
        <div class="business-selection-prompt">
          <h4>Configure Your Business Model</h4>
          <p>Select your business type and project configuration to enable detailed analytics.</p>
          <div class="selection-status" id="nova-selection-status">
            <span class="status-text">No business model selected</span>
          </div>
        </div>
      `;
    }
    
    // Update selection status based on current state
    this.updateSelectionStatus();
  }

  /**
   * Update the selection status display
   */
  updateSelectionStatus() {
    const statusElement = document.getElementById('nova-selection-status');
    if (!statusElement) return;
    
    const stateManager = window.selectionStateManager;
    if (!stateManager) return;
    
    const businessType = stateManager.getBusinessType();
    const projectTypes = stateManager.getSelectedProjectTypes();
    
    if (businessType && projectTypes.length > 0) {
      statusElement.innerHTML = `
        <span class="status-text positive">✓ Business: ${businessType.toUpperCase()}</span>
        <span class="status-text positive">✓ Projects: ${projectTypes.length} selected</span>
      `;
    } else if (businessType) {
      statusElement.innerHTML = `
        <span class="status-text neutral">⚠ Business: ${businessType.toUpperCase()}</span>
        <span class="status-text negative">✗ No projects selected</span>
      `;
    } else {
      statusElement.innerHTML = `
        <span class="status-text negative">✗ No business model selected</span>
      `;
    }
  }

  /**
   * Render P&L Analysis view with centralized state integration
   */
  renderPnLAnalysis() {
    console.log('Rendering P&L Analysis view');
    
    const panel = document.getElementById('nova-panel-pnl');
    const container = panel?.querySelector('.nova-content-container');
    if (!container) return;
    
    // Check if we have business data from centralized state
    const stateManager = window.selectionStateManager;
    const hasBusinessData = stateManager?.getSelectedProjectTypes().length > 0;
    const businessType = stateManager?.getBusinessType();
    
    if (hasBusinessData && businessType) {
      const projectTypes = stateManager.getSelectedProjectTypes();
      
      // Get calculations from the calculation engine
      const calculationEngine = window.calculationEngine;
      if (!calculationEngine) {
        // Create mock data for testing when calculation engine is not available
        const mockCombinedPL = {
          projects: [{
            typeId: 'padel',
            typeName: 'Padel Club',
            revenue: 150000,
            costs: 93500,
            profit: 56500,
            investment: 244000
          }],
          totals: {
            revenue: 150000,
            costs: 93500,
            profit: 56500,
            investment: 244000,
            roi: 23.2,
            paybackYears: 4
          }
        };
        
        container.innerHTML = `
          <div class="pnl-analysis-container">
            <div class="analysis-header">
              <h4>P&L Analysis for ${businessType.toUpperCase()} Business</h4>
              <div class="project-indicators">
                ${projectTypes.map(type => `<span class="project-badge">${type}</span>`).join('')}
              </div>
              <div class="demo-notice">📊 Showing demo data - Calculation engine integration pending</div>
            </div>
            
            <!-- P&L Summary Section -->
            <div id="pnlSummaryNova" class="pnl-summary-section">
              <h5>Financial Summary</h5>
              <div class="summary-metrics">
                <div class="metric-card">
                  <div class="metric-label">Total Revenue</div>
                  <div class="metric-value positive">€${mockCombinedPL.totals.revenue.toLocaleString()}</div>
                </div>
                <div class="metric-card">
                  <div class="metric-label">Total Costs</div>
                  <div class="metric-value negative">€${mockCombinedPL.totals.costs.toLocaleString()}</div>
                </div>
                <div class="metric-card">
                  <div class="metric-label">Net Profit</div>
                  <div class="metric-value positive">€${mockCombinedPL.totals.profit.toLocaleString()}</div>
                </div>
                <div class="metric-card">
                  <div class="metric-label">Profit Margin</div>
                  <div class="metric-value">${((mockCombinedPL.totals.profit / mockCombinedPL.totals.revenue) * 100).toFixed(1)}%</div>
                </div>
              </div>
            </div>
            
            <!-- Charts Section -->
            <div class="pnl-charts-section">
              <h5>Visual Analysis</h5>
              <div class="charts-grid">
                <div class="chart-container">
                  <h6>Revenue vs Costs</h6>
                  <canvas id="pnlRevenueChart" width="400" height="300"></canvas>
                </div>
                <div class="chart-container">
                  <h6>Project Breakdown</h6>
                  <canvas id="pnlBreakdownChart" width="400" height="300"></canvas>
                </div>
                <div class="chart-container">
                  <h6>Monthly Profit Trend</h6>
                  <canvas id="pnlTrendChart" width="400" height="300"></canvas>
                </div>
              </div>
            </div>
            
            <!-- Detailed Breakdown Section -->
            <div class="pnl-breakdown-section">
              <h5>Project Details</h5>
              <div id="pnlBreakdownTable" class="breakdown-table">
                <table>
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Revenue</th>
                      <th>Costs</th>
                      <th>Profit</th>
                      <th>Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${mockCombinedPL.projects.map(project => `
                      <tr>
                        <td>${project.typeName}</td>
                        <td class="positive">€${project.revenue.toLocaleString()}</td>
                        <td class="negative">€${project.costs.toLocaleString()}</td>
                        <td class="positive">€${project.profit.toLocaleString()}</td>
                        <td>${((project.profit / project.revenue) * 100).toFixed(1)}%</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        `;
        
        // Render charts with mock data
        setTimeout(() => this.renderPnLCharts(mockCombinedPL), 100);
        return;
      }
      
      // Calculate combined P&L for all selected projects
      const combinedPL = calculationEngine.calculateCombinedPL(projectTypes);
      const totals = combinedPL.totals;
      
      container.innerHTML = `
        <div class="pnl-analysis-container">
          <div class="analysis-header">
            <h4>P&L Analysis for ${businessType.toUpperCase()} Business</h4>
            <div class="project-indicators">
              ${projectTypes.map(type => `<span class="project-badge">${type}</span>`).join('')}
            </div>
          </div>
          
          <!-- P&L Summary Section -->
          <div id="pnlSummaryNova" class="pnl-summary-section">
            <h5>Financial Summary</h5>
            <div class="summary-metrics">
              <div class="metric-card">
                <div class="metric-label">Total Revenue</div>
                <div class="metric-value positive">€${totals.revenue.toLocaleString()}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Total Costs</div>
                <div class="metric-value negative">€${totals.costs.toLocaleString()}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Net Profit</div>
                <div class="metric-value ${totals.profit >= 0 ? 'positive' : 'negative'}">€${totals.profit.toLocaleString()}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Profit Margin</div>
                <div class="metric-value">${totals.revenue > 0 ? ((totals.profit / totals.revenue) * 100).toFixed(1) : 0}%</div>
              </div>
            </div>
          </div>
          
          <!-- Charts Section -->
          <div class="pnl-charts-section">
            <h5>Visual Analysis</h5>
            <div class="charts-grid">
              <div class="chart-container">
                <h6>Revenue vs Costs</h6>
                <canvas id="pnlRevenueChart" width="400" height="300"></canvas>
              </div>
              <div class="chart-container">
                <h6>Project Breakdown</h6>
                <canvas id="pnlBreakdownChart" width="400" height="300"></canvas>
              </div>
              <div class="chart-container">
                <h6>Monthly Profit Trend</h6>
                <canvas id="pnlTrendChart" width="400" height="300"></canvas>
              </div>
            </div>
          </div>
          
          <!-- Detailed Breakdown Section -->
          <div class="pnl-breakdown-section">
            <h5>Project Details</h5>
            <div id="pnlBreakdownTable" class="breakdown-table">
              <table>
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Revenue</th>
                    <th>Costs</th>
                    <th>Profit</th>
                    <th>Margin</th>
                  </tr>
                </thead>
                <tbody>
                  ${combinedPL.projects.map(project => `
                    <tr>
                      <td>${project.typeName}</td>
                      <td class="positive">€${project.revenue.toLocaleString()}</td>
                      <td class="negative">€${project.costs.toLocaleString()}</td>
                      <td class="${project.profit >= 0 ? 'positive' : 'negative'}">€${project.profit.toLocaleString()}</td>
                      <td>${project.revenue > 0 ? ((project.profit / project.revenue) * 100).toFixed(1) : 0}%</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
      
      // Render charts after DOM update
      setTimeout(() => this.renderPnLCharts(combinedPL), 100);
      
    } else {
      container.innerHTML = `
        <div class="placeholder-content">
          <h4>P&L Analysis</h4>
          <p>Select a business type and projects in the Analytics Main tab to view P&L analysis.</p>
          <button type="button" class="nova-btn" onclick="document.querySelector('[data-nova-view=\\"business-analytics-main\\"]').click()">
            Configure Business Model
          </button>
        </div>
      `;
    }
  }

  /**
   * Render P&L charts
   */
  renderPnLCharts(combinedPL) {
    // Skip chart generation if Chart.js is not available
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js not available, skipping P&L charts');
      return;
    }

    const totals = combinedPL.totals;
    const projects = combinedPL.projects;

    // Destroy existing charts
    if (window.pnlRevenueChart) window.pnlRevenueChart.destroy();
    if (window.pnlBreakdownChart) window.pnlBreakdownChart.destroy();
    if (window.pnlTrendChart) window.pnlTrendChart.destroy();

    // Revenue vs Costs Bar Chart
    const revenueCanvas = document.getElementById('pnlRevenueChart');
    if (revenueCanvas) {
      window.pnlRevenueChart = new Chart(revenueCanvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: ['Revenue', 'Costs', 'Profit'],
          datasets: [{
            data: [totals.revenue, totals.costs, totals.profit],
            backgroundColor: ['#4caf50', '#f44336', totals.profit >= 0 ? '#2196f3' : '#ff9800'],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return '€' + value.toLocaleString();
                }
              }
            }
          }
        }
      });
    }

    // Project Breakdown Pie Chart
    const breakdownCanvas = document.getElementById('pnlBreakdownChart');
    if (breakdownCanvas && projects.length > 0) {
      window.pnlBreakdownChart = new Chart(breakdownCanvas.getContext('2d'), {
        type: 'pie',
        data: {
          labels: projects.map(p => p.typeName),
          datasets: [{
            data: projects.map(p => p.profit),
            backgroundColor: projects.map((_, i) => ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336'][i % 5]),
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  return context.label + ': €' + context.parsed.toLocaleString();
                }
              }
            }
          }
        }
      });
    }

    // Monthly Profit Trend Line Chart
    const trendCanvas = document.getElementById('pnlTrendChart');
    if (trendCanvas) {
      const monthlyProfit = totals.profit / 12;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      window.pnlTrendChart = new Chart(trendCanvas.getContext('2d'), {
        type: 'line',
        data: {
          labels: months,
          datasets: [{
            label: 'Monthly Profit',
            data: months.map(() => monthlyProfit),
            borderColor: '#2196f3',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            fill: true,
            tension: 0.4
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
                  return '€' + value.toLocaleString();
                }
              }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  return 'Profit: €' + context.parsed.y.toLocaleString();
                }
              }
            }
          }
        }
      });
    }
  }
                <span class="metric-label">Net Profit:</span>
                <span class="metric-value">Calculating...</span>
              </div>
            </div>
            <p class="integration-note">
              <em>Integration with existing P&L calculation logic pending...</em>
            </p>
          </div>
        </div>
      `;
    } else {
      dataElement.innerHTML = `
        <div class="no-data-prompt">
          <h4>Configure Business Model First</h4>
          <p>Switch to the <strong>Business Analytics</strong> tab to configure your business model and project types before viewing P&L analysis.</p>
          <button type="button" class="nova-btn" onclick="document.querySelector('[data-nova-view=\"business-analytics-main\"]').click()">
            Configure Business Model
          </button>
        </div>
      `;
    }
  }

  /**
   * Render ROI Analysis view with centralized state integration
   */
  renderROIAnalysis() {
    console.log('Rendering ROI Analysis view');
    
    const panel = document.getElementById('nova-panel-roi');
    const container = panel?.querySelector('.nova-content-container');
    if (!container) return;
    
    const stateManager = window.selectionStateManager;
    const hasBusinessData = stateManager?.getSelectedProjectTypes().length > 0;
    const businessType = stateManager?.getBusinessType();
    
    if (hasBusinessData && businessType) {
      const projectTypes = stateManager.getSelectedProjectTypes();
      
      // Get calculations from the calculation engine
      const calculationEngine = window.calculationEngine;
      if (!calculationEngine) {
        // Create mock data for testing when calculation engine is not available
        const mockCombinedPL = {
          projects: [{
            typeId: 'padel',
            typeName: 'Padel Club',
            revenue: 150000,
            costs: 93500,
            profit: 56500,
            investment: 244000
          }],
          totals: {
            revenue: 150000,
            costs: 93500,
            profit: 56500,
            investment: 244000,
            roi: 23.2,
            paybackYears: 4
          }
        };
        
        // Use mock data and render interface
        const combinedPL = mockCombinedPL;
        const totals = combinedPL.totals;
        
        container.innerHTML = `
          <div class="roi-analysis-container">
            <div class="analysis-header">
              <h4>ROI Analysis for ${businessType.toUpperCase()} Business</h4>
              <div class="project-indicators">
                ${projectTypes.map(type => `<span class="project-badge">${type}</span>`).join('')}
              </div>
              <div class="demo-notice">📊 Showing demo data - Calculation engine integration pending</div>
            </div>
          
          <!-- Adjustment Controls -->
          <div class="roi-adjustment-section">
            <h5>Adjustment Controls</h5>
            <div class="adjustment-controls">
              <div class="control-group">
                <label for="roiRevAdjustNova">Revenue Adjustment:</label>
                <input type="range" id="roiRevAdjustNova" min="50" max="200" value="100" step="5" />
                <span id="roiRevAdjustLabelNova">100%</span>
              </div>
              <div class="control-group">
                <label for="roiCostAdjustNova">Cost Adjustment:</label>
                <input type="range" id="roiCostAdjustNova" min="50" max="200" value="100" step="5" />
                <span id="roiCostAdjustLabelNova">100%</span>
              </div>
            </div>
          </div>
          
          <!-- ROI Metrics Section -->
          <div id="roiMetricsNova" class="roi-metrics-section">
            <h5>ROI Metrics</h5>
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-label">Total Investment</div>
                <div class="metric-value neutral">€${totals.investment.toLocaleString()}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Annual Return</div>
                <div class="metric-value positive">€${totals.profit.toLocaleString()}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">ROI Percentage</div>
                <div class="metric-value ${totals.roi >= 0 ? 'positive' : 'negative'}">${totals.roi.toFixed(1)}%</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Payback Period</div>
                <div class="metric-value">${totals.paybackYears === Infinity ? '∞' : totals.paybackYears} years</div>
              </div>
            </div>
          </div>
          
          <!-- ROI Charts Section -->
          <div class="roi-charts-section">
            <h5>ROI Analysis Charts</h5>
            <div class="charts-grid">
              <div class="chart-container">
                <h6>Cumulative Profit vs Investment</h6>
                <canvas id="roiCumulativeChart" width="400" height="300"></canvas>
              </div>
              <div class="chart-container">
                <h6>Annual Profit Breakdown</h6>
                <canvas id="roiAnnualChart" width="400" height="300"></canvas>
              </div>
              <div class="chart-container">
                <h6>Investment Breakdown</h6>
                <canvas id="roiInvestmentChart" width="400" height="300"></canvas>
              </div>
              <div class="chart-container">
                <h6>Break-Even Analysis</h6>
                <canvas id="roiBreakEvenChart" width="400" height="300"></canvas>
              </div>
            </div>
          </div>
          
          <!-- ROI Detailed Table -->
          <div class="roi-table-section">
            <h5>Project ROI Details</h5>
            <div id="roiBreakdownTable" class="breakdown-table">
              <table>
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Investment</th>
                    <th>Annual Profit</th>
                    <th>ROI %</th>
                    <th>Payback Years</th>
                  </tr>
                </thead>
                <tbody>
                  ${combinedPL.projects.map(project => {
                    const projectRoi = project.investment > 0 ? (project.profit / project.investment) * 100 : 0;
                    const payback = project.profit > 0 ? Math.ceil(project.investment / project.profit) : Infinity;
                    return `
                      <tr>
                        <td>${project.typeName}</td>
                        <td class="neutral">€${project.investment.toLocaleString()}</td>
                        <td class="${project.profit >= 0 ? 'positive' : 'negative'}">€${project.profit.toLocaleString()}</td>
                        <td class="${projectRoi >= 0 ? 'positive' : 'negative'}">${projectRoi.toFixed(1)}%</td>
                        <td>${payback === Infinity ? '∞' : payback} years</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
      
      // Set up adjustment controls
      setTimeout(() => {
        this.setupROIAdjustments(combinedPL);
        this.renderROICharts(combinedPL);
      }, 100);
      return;
      }
      
      // Real calculation engine logic would go here
      const combinedPL = calculationEngine.calculateCombinedPL(projectTypes);
      const totals = combinedPL.totals;
      
    } else {
      container.innerHTML = `
        <div class="placeholder-content">
          <h4>ROI Analysis</h4>
          <p>Select a business type and projects in the Analytics Main tab to view ROI analysis.</p>
          <button type="button" class="nova-btn" onclick="document.querySelector('[data-nova-view=\\"business-analytics-main\\"]').click()">
            Configure Business Model
          </button>
        </div>
      `;
    }
  }

  /**
   * Setup ROI adjustment controls
   */
  setupROIAdjustments(originalData) {
    const revSlider = document.getElementById('roiRevAdjustNova');
    const costSlider = document.getElementById('roiCostAdjustNova');
    const revLabel = document.getElementById('roiRevAdjustLabelNova');
    const costLabel = document.getElementById('roiCostAdjustLabelNova');
    
    if (!revSlider || !costSlider) return;

    const updateROI = () => {
      const revAdjust = parseInt(revSlider.value) / 100;
      const costAdjust = parseInt(costSlider.value) / 100;
      
      revLabel.textContent = revSlider.value + '%';
      costLabel.textContent = costSlider.value + '%';
      
      // Calculate adjusted metrics
      const adjustedRevenue = originalData.totals.revenue * revAdjust;
      const adjustedCosts = originalData.totals.costs * costAdjust;
      const adjustedProfit = adjustedRevenue - adjustedCosts;
      const adjustedROI = originalData.totals.investment > 0 ? (adjustedProfit / originalData.totals.investment) * 100 : 0;
      const adjustedPayback = adjustedProfit > 0 ? Math.ceil(originalData.totals.investment / adjustedProfit) : Infinity;
      
      // Update metrics display
      const metricsSection = document.getElementById('roiMetricsNova');
      if (metricsSection) {
        const metrics = metricsSection.querySelectorAll('.metric-value');
        if (metrics.length >= 4) {
          metrics[1].textContent = '€' + adjustedRevenue.toLocaleString(); // Annual Return
          metrics[2].textContent = adjustedROI.toFixed(1) + '%'; // ROI %
          metrics[2].className = 'metric-value ' + (adjustedROI >= 0 ? 'positive' : 'negative');
          metrics[3].textContent = (adjustedPayback === Infinity ? '∞' : adjustedPayback) + ' years'; // Payback
        }
      }
      
      // Update charts with adjusted data
      const adjustedData = {
        ...originalData,
        totals: {
          ...originalData.totals,
          revenue: adjustedRevenue,
          costs: adjustedCosts,
          profit: adjustedProfit,
          roi: adjustedROI,
          paybackYears: adjustedPayback
        }
      };
      
      this.renderROICharts(adjustedData);
    };

    revSlider.addEventListener('input', updateROI);
    costSlider.addEventListener('input', updateROI);
  }

  /**
   * Render ROI charts
   */
  renderROICharts(combinedPL) {
    // Skip chart generation if Chart.js is not available
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js not available, skipping ROI charts');
      return;
    }

    const totals = combinedPL.totals;
    const projects = combinedPL.projects;

    // Destroy existing charts
    if (window.roiCumulativeChart) window.roiCumulativeChart.destroy();
    if (window.roiAnnualChart) window.roiAnnualChart.destroy();
    if (window.roiInvestmentChart) window.roiInvestmentChart.destroy();
    if (window.roiBreakEvenChart) window.roiBreakEvenChart.destroy();

    // Cumulative Profit vs Investment Line Chart
    const cumulativeCanvas = document.getElementById('roiCumulativeChart');
    if (cumulativeCanvas) {
      const years = Array.from({length: 10}, (_, i) => i + 1);
      const cumulativeProfits = years.map(year => totals.profit * year);
      
      window.roiCumulativeChart = new Chart(cumulativeCanvas.getContext('2d'), {
        type: 'line',
        data: {
          labels: years.map(y => `Year ${y}`),
          datasets: [
            {
              label: 'Cumulative Profit',
              data: cumulativeProfits,
              borderColor: '#4caf50',
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
              fill: false,
              tension: 0.2
            },
            {
              label: 'Total Investment',
              data: new Array(years.length).fill(totals.investment),
              borderColor: '#f44336',
              borderDash: [10, 5],
              fill: false,
              pointRadius: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return '€' + value.toLocaleString();
                }
              }
            }
          }
        }
      });
    }

    // Annual Profit Breakdown Bar Chart
    const annualCanvas = document.getElementById('roiAnnualChart');
    if (annualCanvas && projects.length > 0) {
      window.roiAnnualChart = new Chart(annualCanvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: projects.map(p => p.typeName),
          datasets: [{
            label: 'Annual Profit',
            data: projects.map(p => p.profit),
            backgroundColor: projects.map((_, i) => ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336'][i % 5]),
            borderWidth: 1
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
                  return '€' + value.toLocaleString();
                }
              }
            }
          }
        }
      });
    }

    // Investment Breakdown Pie Chart
    const investmentCanvas = document.getElementById('roiInvestmentChart');
    if (investmentCanvas && projects.length > 0) {
      window.roiInvestmentChart = new Chart(investmentCanvas.getContext('2d'), {
        type: 'pie',
        data: {
          labels: projects.map(p => p.typeName),
          datasets: [{
            data: projects.map(p => p.investment),
            backgroundColor: projects.map((_, i) => ['#ff9800', '#2196f3', '#4caf50', '#9c27b0', '#f44336'][i % 5]),
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  return context.label + ': €' + context.parsed.toLocaleString();
                }
              }
            }
          }
        }
      });
    }

    // Break-Even Analysis Line Chart
    const breakEvenCanvas = document.getElementById('roiBreakEvenChart');
    if (breakEvenCanvas) {
      const months = Array.from({length: 24}, (_, i) => i + 1);
      const monthlyProfit = totals.profit / 12;
      const cumulativeMonthlyProfits = months.map(month => monthlyProfit * month);
      
      window.roiBreakEvenChart = new Chart(breakEvenCanvas.getContext('2d'), {
        type: 'line',
        data: {
          labels: months.map(m => `Month ${m}`),
          datasets: [
            {
              label: 'Cumulative Profit',
              data: cumulativeMonthlyProfits,
              borderColor: '#4caf50',
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
              fill: true,
              tension: 0.2
            },
            {
              label: 'Break-Even Point',
              data: new Array(months.length).fill(totals.investment),
              borderColor: '#f44336',
              borderDash: [5, 5],
              fill: false,
              pointRadius: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return '€' + value.toLocaleString();
                }
              }
            }
          },
          plugins: {
            tooltip: {
              mode: 'index',
              intersect: false
            }
          }
        }
      });
    }
  }
      dataElement.innerHTML = `
        <div class="no-data-prompt">
          <h4>Configure Business Model First</h4>
          <p>Switch to the <strong>Business Analytics</strong> tab to configure your business model and project types before viewing ROI analysis.</p>
          <button type="button" class="nova-btn" onclick="document.querySelector('[data-nova-view=\"business-analytics-main\"]').click()">
            Configure Business Model
          </button>
        </div>
      `;
    }
  }

  /**
   * Render scenarios view with centralized state integration
   */
  renderScenarios() {
    console.log('Rendering Scenarios view');
    
    const panel = document.getElementById('nova-panel-scenarios');
    const container = panel?.querySelector('.nova-content-container');
    if (!container) return;
    
    const stateManager = window.selectionStateManager;
    const hasBusinessData = stateManager?.getSelectedProjectTypes().length > 0;
    const businessType = stateManager?.getBusinessType();
    
    if (hasBusinessData && businessType) {
      const projectTypes = stateManager.getSelectedProjectTypes();
      container.innerHTML = `
        <div class="scenarios-analysis-container">
          <div class="analysis-header">
            <h4>Scenario Analysis for ${businessType.toUpperCase()} Business</h4>
            <div class="project-indicators">
              ${projectTypes.map(type => `<span class="project-badge">${type}</span>`).join('')}
            </div>
          </div>
          <div class="analysis-content">
            <p class="analysis-note">Exploring different business scenarios and their potential outcomes...</p>
            <div class="scenarios-grid">
              <div class="scenario-card">
                <h5>Optimistic Scenario</h5>
                <div class="scenario-metrics">
                  <span class="metric">Revenue: +20%</span>
                  <span class="metric positive">ROI: High</span>
                </div>
              </div>
              <div class="scenario-card">
                <h5>Realistic Scenario</h5>
                <div class="scenario-metrics">
                  <span class="metric">Revenue: Baseline</span>
                  <span class="metric neutral">ROI: Moderate</span>
                </div>
              </div>
              <div class="scenario-card">
                <h5>Conservative Scenario</h5>
                <div class="scenario-metrics">
                  <span class="metric">Revenue: -10%</span>
                  <span class="metric negative">ROI: Low</span>
                </div>
              </div>
            </div>
            <p class="integration-note">
              <em>Scenario analysis implementation pending...</em>
            </p>
          </div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="placeholder-content">
          <h4>Scenario Analysis</h4>
          <p>Select a business type and projects in the Analytics Main tab to view scenario analysis.</p>
        </div>
      `;
    }
  }
              <em>Scenario analysis implementation pending...</em>
            </p>
          </div>
        </div>
      `;
    } else {
      dataElement.innerHTML = `
        <div class="no-data-prompt">
          <h4>Configure Business Model First</h4>
          <p>Switch to the <strong>Business Analytics</strong> tab to configure your business model and project types before viewing scenario analysis.</p>
          <button type="button" class="nova-btn" onclick="document.querySelector('[data-nova-view=\"business-analytics-main\"]').click()">
            Configure Business Model
          </button>
        </div>
      `;
    }
  }

  /**
   * Render summary view with centralized state integration
   */
  renderSummary() {
    console.log('Rendering Summary view');
    
    const panel = document.getElementById('nova-panel-summary');
    const container = panel?.querySelector('.nova-content-container');
    if (!container) return;
    
    const stateManager = window.selectionStateManager;
    const hasBusinessData = stateManager?.getSelectedProjectTypes().length > 0;
    const businessType = stateManager?.getBusinessType();
    
    if (hasBusinessData && businessType) {
      const projectTypes = stateManager.getSelectedProjectTypes();
      const activeProject = stateManager.getActiveProjectType();
      
      container.innerHTML = `
        <div class="summary-container">
          <div class="analysis-header">
            <h4>Executive Summary - ${businessType.toUpperCase()} Business</h4>
            <div class="summary-meta">
              <span class="meta-item">Projects: ${projectTypes.length}</span>
              <span class="meta-item">Active: ${activeProject || 'None'}</span>
              <span class="meta-item">Generated: ${new Date().toLocaleDateString()}</span>
            </div>
          </div>
          <div class="summary-content">
            <div class="summary-section">
              <h5>Business Configuration</h5>
              <ul class="config-list">
                <li>Business Type: ${businessType}</li>
                <li>Project Types: ${projectTypes.join(', ')}</li>
                <li>Analysis Status: Active</li>
              </ul>
            </div>
            <div class="summary-section">
              <h5>Sensitivity Analysis</h5>
              <canvas id="tornadoChart" width="400" height="300" style="max-width: 100%;"></canvas>
            </div>
          </div>
        </div>
      `;
      
      // Trigger tornado chart rendering if available
      if (typeof drawTornadoChart === 'function') {
        setTimeout(() => drawTornadoChart(), 100);
      }
    } else {
      container.innerHTML = `
        <div class="placeholder-content">
          <h4>Executive Summary</h4>
          <p>Select a business type and projects in the Analytics Main tab to view the executive summary.</p>
        </div>
      `;
    }
  }
                <li>Business Type: <strong>${businessType.toUpperCase()}</strong></li>
                <li>Selected Projects: <strong>${projectTypes.join(', ')}</strong></li>
                <li>State Management: <strong>Active</strong></li>
              </ul>
            </div>
            
            <div class="summary-section">
              <h5>Analytics Overview</h5>
              <div class="summary-grid">
                <div class="summary-card">
                  <h6>P&L Analysis</h6>
                  <p>Ready for detailed financial analysis</p>
                </div>
                <div class="summary-card">
                  <h6>ROI Analysis</h6>
                  <p>Ready for investment return calculations</p>
                </div>
                <div class="summary-card">
                  <h6>Scenario Planning</h6>
                  <p>Ready for multi-scenario modeling</p>
                </div>
              </div>
            </div>
            
            <div class="summary-section">
              <h5>Next Steps</h5>
              <ul class="action-list">
                <li>Review P&L projections in the P&L Analysis tab</li>
                <li>Evaluate investment returns in the ROI Analysis tab</li>
                <li>Explore different scenarios in the Scenarios tab</li>
              </ul>
            </div>
            
            <p class="integration-note">
              <em>Full summary integration with calculation engines pending...</em>
            </p>
          </div>
        </div>
      `;
    } else {
      dataElement.innerHTML = `
        <div class="no-data-prompt">
          <h4>Configure Business Model First</h4>
          <p>Switch to the <strong>Business Analytics</strong> tab to configure your business model and project types before viewing the executive summary.</p>
          <button type="button" class="nova-btn" onclick="document.querySelector('[data-nova-view=\"business-analytics-main\"]').click()">
            Configure Business Model
          </button>
        </div>
      `;
    }
  }

  /**
   * Render Gantt view
   */
  renderGantt() {
    console.log('Rendering Gantt Chart view');
    
    const panel = document.getElementById('nova-panel-gantt');
    const container = panel?.querySelector('.nova-content-container');
    if (!container) return;
    
    const stateManager = window.selectionStateManager;
    const hasBusinessData = stateManager?.getSelectedProjectTypes().length > 0;
    const businessType = stateManager?.getBusinessType();
    
    if (hasBusinessData && businessType) {
      const projectTypes = stateManager.getSelectedProjectTypes();
      container.innerHTML = `
        <div class="gantt-container">
          <div class="analysis-header">
            <h4>Project Timeline - ${businessType.toUpperCase()} Business</h4>
            <div class="project-indicators">
              ${projectTypes.map(type => `<span class="project-badge">${type}</span>`).join('')}
            </div>
          </div>
          
          <!-- Gantt Controls -->
          <div class="gantt-controls-section">
            <h5>Timeline Controls</h5>
            <div id="ganttViewModesNova" class="view-modes">
              <button type="button" class="view-mode-btn active" onclick="this.parentElement.querySelectorAll('.view-mode-btn').forEach(b=>b.classList.remove('active')); this.classList.add('active'); window.setGanttViewModeNova('Day')">Day</button>
              <button type="button" class="view-mode-btn" onclick="this.parentElement.querySelectorAll('.view-mode-btn').forEach(b=>b.classList.remove('active')); this.classList.add('active'); window.setGanttViewModeNova('Week')">Week</button>
              <button type="button" class="view-mode-btn" onclick="this.parentElement.querySelectorAll('.view-mode-btn').forEach(b=>b.classList.remove('active')); this.classList.add('active'); window.setGanttViewModeNova('Month')">Month</button>
              <button type="button" class="view-mode-btn" onclick="this.parentElement.querySelectorAll('.view-mode-btn').forEach(b=>b.classList.remove('active')); this.classList.add('active'); window.setGanttViewModeNova('Year')">Year</button>
              <button type="button" class="export-btn" id="exportGanttCSVBtnNova" onclick="window.exportGanttCSVNova()">Export CSV</button>
            </div>
          </div>
          
          <!-- Task Management Section -->
          <div class="gantt-task-management">
            <h5>Task Management</h5>
            <div class="task-form-section">
              <form id="ganttTaskFormNova" class="gantt-form">
                <input id="ganttEditIdNova" type="hidden">
                <div class="form-grid">
                  <div class="form-field">
                    <label for="ganttTaskNameNova">Task Name:</label>
                    <input id="ganttTaskNameNova" type="text" required placeholder="Enter task name">
                  </div>
                  <div class="form-field">
                    <label for="ganttTaskStartNova">Start Date:</label>
                    <input id="ganttTaskStartNova" type="date" required>
                  </div>
                  <div class="form-field">
                    <label for="ganttTaskEndNova">End Date:</label>
                    <input id="ganttTaskEndNova" type="date" required>
                  </div>
                  <div class="form-field">
                    <label for="ganttTaskProgressNova">Progress (%):</label>
                    <input id="ganttTaskProgressNova" type="number" min="0" max="100" value="0">
                  </div>
                </div>
                <div class="form-actions">
                  <button type="submit" class="nova-btn">Save Task</button>
                  <button type="button" class="nova-btn secondary" id="ganttTaskResetBtnNova">Reset Form</button>
                </div>
              </form>
            </div>
            
            <!-- Task List -->
            <div class="task-list-section">
              <h6>Task List</h6>
              <div id="ganttTaskListNova" class="task-list">
                <!-- Tasks will be populated here -->
              </div>
            </div>
          </div>
          
          <!-- Gantt Chart Display -->
          <div class="gantt-chart-section">
            <h5>Project Timeline</h5>
            <div id="ganttContainerNova" class="gantt-chart-container">
              <!-- Gantt chart will be rendered here -->
            </div>
          </div>
        </div>
      `;
      
      // Initialize Gantt functionality
      setTimeout(() => this.initializeGanttFunctionality(), 100);
      
    } else {
      container.innerHTML = `
        <div class="placeholder-content">
          <h4>Gantt Chart</h4>
          <p>Select a business type and projects in the Analytics Main tab to view the project timeline.</p>
          <button type="button" class="nova-btn" onclick="document.querySelector('[data-nova-view=\\"business-analytics-main\\"]').click()">
            Configure Business Model
          </button>
        </div>
      `;
    }
  }

  /**
   * Initialize Gantt functionality using existing matrix-nova.js logic
   */
  initializeGanttFunctionality() {
    // Initialize Nova-specific Gantt variables if not exists
    if (!window.ganttTasksNova) {
      window.ganttTasksNova = [];
      window.currentViewModeNova = 'Month';
    }

    // Load tasks from localStorage or set defaults
    this.loadGanttTasksNova();
    
    // Render initial task list and chart
    this.renderGanttTaskListNova();
    this.drawGanttNova();
    
    // Set up form submission
    const form = document.getElementById('ganttTaskFormNova');
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        this.saveGanttTaskNova();
      };
    }
    
    // Set up reset button
    const resetBtn = document.getElementById('ganttTaskResetBtnNova');
    if (resetBtn) {
      resetBtn.onclick = () => {
        document.getElementById('ganttEditIdNova').value = '';
        document.getElementById('ganttTaskFormNova').reset();
      };
    }
    
    // Set up global functions for button clicks
    window.setGanttViewModeNova = (mode) => {
      window.currentViewModeNova = mode;
      this.drawGanttNova();
    };
    
    window.exportGanttCSVNova = () => {
      let csv = "Name,Start,End,Progress\\n";
      window.ganttTasksNova.forEach(t => {
        csv += `${t.name},${t.start},${t.end},${t.progress}\\n`;
      });
      const blob = new Blob([csv], { type: "text/csv" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "Nova_Gantt_Tasks.csv";
      link.click();
    };
    
    window.editGanttTaskNova = (id) => {
      const task = window.ganttTasksNova.find(t => t.id === id);
      if (task) {
        document.getElementById('ganttEditIdNova').value = task.id;
        document.getElementById('ganttTaskNameNova').value = task.name;
        document.getElementById('ganttTaskStartNova').value = task.start;
        document.getElementById('ganttTaskEndNova').value = task.end;
        document.getElementById('ganttTaskProgressNova').value = task.progress;
      }
    };
    
    window.deleteGanttTaskNova = (id) => {
      if (confirm('Are you sure you want to delete this task?')) {
        window.ganttTasksNova = window.ganttTasksNova.filter(t => t.id !== id);
        this.saveGanttTasksNova();
        this.renderGanttTaskListNova();
        this.drawGanttNova();
      }
    };
  }

  /**
   * Load Gantt tasks from localStorage
   */
  loadGanttTasksNova() {
    const saved = localStorage.getItem('novaGanttTasks');
    if (saved) {
      window.ganttTasksNova = JSON.parse(saved);
    } else {
      // Set default tasks for business projects
      window.ganttTasksNova = [
        { id: '1', name: 'Business Plan Development', start: '2025-01-01', end: '2025-01-21', progress: 100 },
        { id: '2', name: 'Market Research & Analysis', start: '2025-01-15', end: '2025-02-05', progress: 80 },
        { id: '3', name: 'Funding & Investment Setup', start: '2025-02-01', end: '2025-02-28', progress: 60 },
        { id: '4', name: 'Legal & Compliance Setup', start: '2025-02-15', end: '2025-03-15', progress: 40 },
        { id: '5', name: 'Operations Launch', start: '2025-03-01', end: '2025-04-01', progress: 20 }
      ];
    }
  }

  /**
   * Save Gantt tasks to localStorage
   */
  saveGanttTasksNova() {
    localStorage.setItem('novaGanttTasks', JSON.stringify(window.ganttTasksNova));
  }

  /**
   * Render Gantt task list
   */
  renderGanttTaskListNova() {
    const list = document.getElementById('ganttTaskListNova');
    if (!list) return;
    
    list.innerHTML = '';
    
    if (window.ganttTasksNova.length === 0) {
      list.innerHTML = '<p class="no-tasks">No tasks added yet. Use the form above to add tasks.</p>';
      return;
    }
    
    window.ganttTasksNova.forEach(task => {
      const row = document.createElement('div');
      row.className = 'gantt-task-row';
      row.innerHTML = `
        <div class="task-info">
          <div class="task-name">${task.name}</div>
          <div class="task-details">
            <span class="task-date">${task.start} → ${task.end}</span>
            <span class="task-progress">${task.progress}% complete</span>
          </div>
        </div>
        <div class="task-actions">
          <button class="action-btn edit-btn" onclick="window.editGanttTaskNova('${task.id}')" title="Edit Task">✏️</button>
          <button class="action-btn delete-btn" onclick="window.deleteGanttTaskNova('${task.id}')" title="Delete Task">🗑️</button>
        </div>
      `;
      list.appendChild(row);
    });
  }

  /**
   * Draw Gantt chart using Frappe Gantt
   */
  drawGanttNova() {
    const container = document.getElementById('ganttContainerNova');
    if (!container) return;
    
    container.innerHTML = "";
    
    if (window.ganttTasksNova.length === 0) {
      container.innerHTML = '<p class="no-chart">No tasks to display. Add tasks using the form above.</p>';
      return;
    }
    
    const ganttDiv = document.createElement('div');
    ganttDiv.id = "ganttChartDivNova";
    container.appendChild(ganttDiv);
    
    // Check if Gantt is available
    if (typeof Gantt === 'undefined') {
      console.warn('Frappe Gantt not available, showing task list only');
      ganttDiv.innerHTML = '<p class="chart-error">Gantt chart library not available. Tasks are managed in the list above.</p>';
      return;
    }
    
    try {
      const gantt = new Gantt("#ganttChartDivNova", window.ganttTasksNova, {
        view_mode: window.currentViewModeNova || 'Month',
        on_progress_change: (task, progress) => {
          const idx = window.ganttTasksNova.findIndex(t => t.id === task.id);
          if (idx >= 0) {
            window.ganttTasksNova[idx].progress = progress;
            this.saveGanttTasksNova();
            this.renderGanttTaskListNova();
          }
        },
        on_date_change: (task, start, end) => {
          const idx = window.ganttTasksNova.findIndex(t => t.id === task.id);
          if (idx >= 0) {
            window.ganttTasksNova[idx].start = start.toISOString().slice(0, 10);
            window.ganttTasksNova[idx].end = end.toISOString().slice(0, 10);
            this.saveGanttTasksNova();
            this.renderGanttTaskListNova();
          }
        }
      });
      
      // Highlight today if available
      setTimeout(() => this.highlightTodayNova(), 100);
    } catch (error) {
      console.error('Error creating Gantt chart:', error);
      ganttDiv.innerHTML = '<p class="chart-error">Error creating Gantt chart. Please check your task dates.</p>';
    }
  }

  /**
   * Highlight today on the Gantt chart
   */
  highlightTodayNova() {
    const today = new Date().toISOString().slice(0, 10);
    const labels = document.querySelectorAll('#ganttContainerNova .gantt .grid .grid-row .grid-date');
    labels.forEach(label => {
      if (label.dataset && label.dataset.date === today) {
        label.classList.add('gantt-today-highlight');
      }
    });
  }

  /**
   * Save a Gantt task (from form submission)
   */
  saveGanttTaskNova() {
    const id = document.getElementById('ganttEditIdNova').value || Date.now().toString();
    const name = document.getElementById('ganttTaskNameNova').value;
    const start = document.getElementById('ganttTaskStartNova').value;
    const end = document.getElementById('ganttTaskEndNova').value;
    const progress = parseInt(document.getElementById('ganttTaskProgressNova').value) || 0;
    
    // Validation
    if (!name.trim()) {
      alert('Please enter a task name.');
      return;
    }
    
    if (new Date(start) > new Date(end)) {
      alert('End date must be after start date.');
      return;
    }
    
    const existingIdx = window.ganttTasksNova.findIndex(t => t.id === id);
    const taskData = { id, name: name.trim(), start, end, progress };
    
    if (existingIdx >= 0) {
      window.ganttTasksNova[existingIdx] = taskData;
    } else {
      window.ganttTasksNova.push(taskData);
    }
    
    this.saveGanttTasksNova();
    this.renderGanttTaskListNova();
    this.drawGanttNova();
    
    // Reset form
    document.getElementById('ganttTaskFormNova').reset();
    document.getElementById('ganttEditIdNova').value = '';
  }

  /**
   * Render project-specific tab
   */
  renderProjectTab(viewId) {
    const projectId = viewId.replace('project-', '');
    const contentElement = document.getElementById(`project-content-${projectId}`);
    
    if (contentElement && this.dynamicUI) {
      // Use the dynamic UI to render project-specific forms and results
      const projectType = window.projectTypeManager?.getProjectType(projectId);
      if (projectType) {
        contentElement.innerHTML = `
          <div class="project-analysis-form">
            ${this.dynamicUI.generateProjectTypeForm ? this.dynamicUI.generateProjectTypeForm(projectId, projectType) : ''}
          </div>
          <div id="${projectId}-results" class="project-results">
            <!-- Results will be populated after calculation -->
          </div>
        `;
      }
    }
  }

  // ========== Action Methods ==========

  resetSelection() {
    if (window.selectionStateManager) {
      window.selectionStateManager.setBusinessType(null);
    }
    console.log('Selection reset');
  }

  refreshData() {
    console.log('Data refreshed');
    this.updateViewContent(this.currentView);
  }

  exportReport() {
    console.log('Report exported');
  }

  exportPDF() {
    console.log('PDF exported');
  }

  exportExcel() {
    console.log('Excel exported');
  }

  calculateROI() {
    console.log('ROI calculated');
  }

  addScenario() {
    console.log('Scenario added');
  }

  addMilestone() {
    console.log('Milestone added');
  }
}

// Export for global use
window.NovaEnhancedController = NovaEnhancedController;