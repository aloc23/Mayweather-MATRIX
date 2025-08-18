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
    this.novaElement = document.getElementById('business-analytics');
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
    
    const dataElement = document.getElementById('nova-pnl-data');
    if (!dataElement) return;
    
    // Check if we have business data from centralized state
    const stateManager = window.selectionStateManager;
    const hasBusinessData = stateManager?.getSelectedProjectTypes().length > 0;
    const businessType = stateManager?.getBusinessType();
    
    if (hasBusinessData && businessType) {
      const projectTypes = stateManager.getSelectedProjectTypes();
      dataElement.innerHTML = `
        <div class="pnl-analysis-container">
          <div class="analysis-header">
            <h4>P&L Analysis for ${businessType.toUpperCase()} Business</h4>
            <div class="project-indicators">
              ${projectTypes.map(type => `<span class="project-badge">${type}</span>`).join('')}
            </div>
          </div>
          <div class="analysis-content">
            <p class="analysis-note">Generating P&L analysis based on selected business models...</p>
            <div class="analysis-placeholder">
              <div class="metric-row">
                <span class="metric-label">Revenue Projection:</span>
                <span class="metric-value positive">Calculating...</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Operating Expenses:</span>
                <span class="metric-value neutral">Calculating...</span>
              </div>
              <div class="metric-row">
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
    
    const dataElement = document.getElementById('nova-roi-data');
    if (!dataElement) return;
    
    const stateManager = window.selectionStateManager;
    const hasBusinessData = stateManager?.getSelectedProjectTypes().length > 0;
    const businessType = stateManager?.getBusinessType();
    
    if (hasBusinessData && businessType) {
      const projectTypes = stateManager.getSelectedProjectTypes();
      dataElement.innerHTML = `
        <div class="roi-analysis-container">
          <div class="analysis-header">
            <h4>ROI Analysis for ${businessType.toUpperCase()} Business</h4>
            <div class="project-indicators">
              ${projectTypes.map(type => `<span class="project-badge">${type}</span>`).join('')}
            </div>
          </div>
          <div class="analysis-content">
            <p class="analysis-note">Calculating return on investment metrics based on selected projects...</p>
            <div class="analysis-placeholder">
              <div class="metric-row">
                <span class="metric-label">Initial Investment:</span>
                <span class="metric-value neutral">Calculating...</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Annual Return:</span>
                <span class="metric-value positive">Calculating...</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">ROI %:</span>
                <span class="metric-value">Calculating...</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Payback Period:</span>
                <span class="metric-value">Calculating...</span>
              </div>
            </div>
            <p class="integration-note">
              <em>Integration with existing ROI calculation logic pending...</em>
            </p>
          </div>
        </div>
      `;
    } else {
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
    
    const dataElement = document.getElementById('nova-scenarios-data');
    if (!dataElement) return;
    
    const stateManager = window.selectionStateManager;
    const hasBusinessData = stateManager?.getSelectedProjectTypes().length > 0;
    const businessType = stateManager?.getBusinessType();
    
    if (hasBusinessData && businessType) {
      const projectTypes = stateManager.getSelectedProjectTypes();
      dataElement.innerHTML = `
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
    
    const dataElement = document.getElementById('nova-summary-data');
    if (!dataElement) return;
    
    const stateManager = window.selectionStateManager;
    const hasBusinessData = stateManager?.getSelectedProjectTypes().length > 0;
    const businessType = stateManager?.getBusinessType();
    
    if (hasBusinessData && businessType) {
      const projectTypes = stateManager.getSelectedProjectTypes();
      const activeProject = stateManager.getActiveProjectType();
      
      dataElement.innerHTML = `
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
    console.log('Gantt rendered');
    // TODO: Implement Gantt chart functionality
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