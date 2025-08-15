/**
 * Enhanced Nova Controller
 * Manages the comprehensive business analytics tab system with dynamic project tabs
 */

class NovaEnhancedController {
  constructor() {
    this.currentView = 'project-selector';
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

    this.setupEventListeners();
    this.initializeDynamicUI();
    this.setActive(true);
    this.updateViewContent(this.currentView);
  }

  /**
   * Initialize dynamic UI generator
   */
  initializeDynamicUI() {
    if (typeof DynamicUIGenerator !== 'undefined') {
      this.dynamicUI = new DynamicUIGenerator();
      this.dynamicUI.generateBusinessTypeSelector('nova-business-analytics-container');
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
   * Update content for specific view
   */
  updateViewContent(view) {
    switch (view) {
      case 'project-selector':
        this.renderProjectSelector();
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
      default:
        // Handle dynamic project tabs
        if (view.startsWith('project-')) {
          this.renderProjectTab(view);
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
   * Render project selector view
   */
  renderProjectSelector() {
    if (this.dynamicUI) {
      // The dynamic UI is already initialized in the container
      console.log('Project selector rendered');
    }
  }

  /**
   * Render P&L Analysis view
   */
  renderPnLAnalysis() {
    const dataElement = document.getElementById('nova-pnl-data');
    if (dataElement) {
      // Check if we have business data
      const hasBusinessData = window.selectionStateManager?.getSelectedProjectTypes().length > 0;
      if (hasBusinessData) {
        dataElement.textContent = 'P&L analysis based on selected business models...';
        // TODO: Integrate with existing P&L calculation logic
      } else {
        dataElement.textContent = 'Configure your business model in Project Selector to view P&L analysis.';
      }
    }
  }

  /**
   * Render ROI Analysis view
   */
  renderROIAnalysis() {
    console.log('ROI analysis rendered');
    // TODO: Integrate with existing ROI calculation logic
  }

  /**
   * Render scenarios view
   */
  renderScenarios() {
    console.log('Scenarios rendered');
    // TODO: Implement scenario analysis
  }

  /**
   * Render summary view
   */
  renderSummary() {
    console.log('Summary rendered');
    // TODO: Integrate with existing summary logic
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