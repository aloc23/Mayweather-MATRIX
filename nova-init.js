/**
 * Nova Initialization Script
 * Sets up the complete Nova system with proper sequencing
 */

// Global Nova initialization flag
window.NovaInitialized = false;

/**
 * Nova Initializer Class
 * Manages the complete initialization sequence for the Nova system
 */
class NovaInitializer {
  constructor() {
    this.initialized = false;
    this.initSteps = {
      dependencies: false,
      stateManager: false,
      uiManager: false,
      core: false,
      enhancedController: false,
      tabIntegration: false
    };
    
    this.startTime = Date.now();
  }

  /**
   * Main initialization method
   */
  async initialize() {
    try {
      console.log('🚀 Starting Nova system initialization...');

      // Wait for DOM
      await this.waitForDOM();
      this.initSteps.dependencies = true;

      // Initialize in sequence
      await this.initializeStateManager();
      await this.initializeUIManager();
      await this.initializeCore();
      await this.initializeEnhancedController();
      await this.setupTabIntegration();

      this.initialized = true;
      window.NovaInitialized = true;

      const duration = Date.now() - this.startTime;
      console.log(`✅ Nova system initialized successfully in ${duration}ms`);
      
      // Show success notification
      if (window.Nova?.ui?.showNotification) {
        window.Nova.ui.showNotification(
          'Nova Analytics Platform Ready', 
          'success', 
          2000
        );
      }

      // Fire initialization event
      this.fireInitEvent();

    } catch (error) {
      console.error('❌ Failed to initialize Nova system:', error);
      this.handleInitializationError(error);
    }
  }

  /**
   * Wait for DOM to be ready
   */
  async waitForDOM() {
    if (document.readyState === 'loading') {
      await new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve);
      });
    }
    console.log('📄 DOM ready');
  }

  /**
   * Initialize state management
   */
  async initializeStateManager() {
    console.log('🔄 Initializing state management...');
    
    // Wait for centralized state manager
    let retries = 0;
    const maxRetries = 50;
    
    while (!window.selectionStateManager && retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }

    if (!window.selectionStateManager) {
      console.warn('⚠️ Centralized state manager not found, continuing...');
    } else {
      console.log('✅ Centralized state manager ready');
    }

    // Nova state manager should already be loaded
    if (window.Nova?.state?.manager) {
      console.log('✅ Nova state manager ready');
    }

    this.initSteps.stateManager = true;
  }

  /**
   * Initialize UI management
   */
  async initializeUIManager() {
    console.log('🎨 Initializing UI management...');
    
    if (window.Nova?.ui?.manager) {
      console.log('✅ Nova UI manager ready');
    }

    this.initSteps.uiManager = true;
  }

  /**
   * Initialize Nova core
   */
  async initializeCore() {
    console.log('⚙️ Initializing Nova core...');
    
    // Wait for Nova core
    let retries = 0;
    const maxRetries = 30;
    
    while (!window.Nova?.core && retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }

    if (window.Nova?.core) {
      console.log('✅ Nova core ready');
    } else {
      throw new Error('Nova core not available');
    }

    this.initSteps.core = true;
  }

  /**
   * Initialize enhanced controller
   */
  async initializeEnhancedController() {
    console.log('🎯 Initializing enhanced controller...');
    
    // Enhanced controller should be initialized by core
    if (window.Nova?.core?.enhancedController) {
      console.log('✅ Enhanced controller ready');
    } else {
      console.warn('⚠️ Enhanced controller not ready');
    }

    this.initSteps.enhancedController = true;
  }

  /**
   * Set up tab integration
   */
  async setupTabIntegration() {
    console.log('🔗 Setting up tab integration...');
    
    // Set up global tab switching function
    window.showNovaTab = () => {
      console.log('Switching to Nova tab');
      
      // Show business-analytics tab
      const tabs = document.querySelectorAll('.tabs button');
      const panels = document.querySelectorAll('.tab-content');
      
      tabs.forEach(tab => {
        const isNova = tab.dataset.tab === 'business-analytics';
        tab.classList.toggle('active', isNova);
        tab.setAttribute('aria-selected', isNova.toString());
      });
      
      panels.forEach(panel => {
        const isNova = panel.id === 'business-analytics';
        panel.classList.toggle('hidden', !isNova);
        panel.classList.toggle('active', isNova);
      });

      // Activate Nova controller
      if (window.Nova?.tabController?.activateNova) {
        window.Nova.tabController.activateNova();
      }
    };

    // Set up business-analytics tab click handler
    const businessAnalyticsTab = document.querySelector('button[data-tab="business-analytics"]');
    if (businessAnalyticsTab) {
      businessAnalyticsTab.addEventListener('click', () => {
        window.showNovaTab();
      });
      console.log('✅ Business analytics tab handler set up');
    }

    // Initialize on the Nova tab if it's active
    const activeTab = document.querySelector('.tabs button.active');
    if (activeTab && activeTab.dataset.tab === 'business-analytics') {
      setTimeout(() => window.showNovaTab(), 100);
    }

    this.initSteps.tabIntegration = true;
  }

  /**
   * Handle initialization errors
   */
  handleInitializationError(error) {
    console.error('Nova initialization failed:', error);
    
    // Show user-friendly error
    if (window.Nova?.ui?.showNotification) {
      window.Nova.ui.showNotification(
        'Failed to initialize Nova Analytics Platform',
        'error',
        5000
      );
    }

    // Try to provide degraded functionality
    this.setupDegradedMode();
  }

  /**
   * Set up degraded mode functionality
   */
  setupDegradedMode() {
    console.log('🔧 Setting up degraded mode...');
    
    // Provide basic tab switching at minimum
    const businessAnalyticsSection = document.getElementById('business-analytics');
    if (businessAnalyticsSection) {
      businessAnalyticsSection.innerHTML = `
        <div class="nova-error-state">
          <h3>Nova Analytics Platform</h3>
          <p class="error-message">
            The analytics platform encountered an initialization error.
            Please refresh the page to try again.
          </p>
          <button onclick="location.reload()" class="nova-btn">
            Refresh Page
          </button>
        </div>
      `;
    }
  }

  /**
   * Fire initialization complete event
   */
  fireInitEvent() {
    const event = new CustomEvent('novaInitialized', {
      detail: {
        duration: Date.now() - this.startTime,
        steps: this.initSteps
      }
    });
    
    document.dispatchEvent(event);
  }

  /**
   * Get initialization status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      steps: { ...this.initSteps },
      duration: Date.now() - this.startTime
    };
  }

  /**
   * Check if Nova is ready
   */
  isReady() {
    return this.initialized && Object.values(this.initSteps).every(step => step);
  }
}

// Create global initializer instance
window.Nova = window.Nova || {};
window.Nova.initializer = new NovaInitializer();

// Start initialization
window.Nova.initializer.initialize();

// Export status checking function
window.checkNovaStatus = () => {
  console.log('Nova Status:', window.Nova.initializer.getStatus());
  return window.Nova.initializer.getStatus();
};

console.log('Nova initialization script loaded');