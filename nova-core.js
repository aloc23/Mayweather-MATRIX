/**
 * Nova Core - Main Nova System Controller
 * Manages the Nova Enhanced Controller and coordinates with other systems
 */

// Nova namespace for global access
window.Nova = window.Nova || {};

/**
 * Main Nova Controller Class
 * Coordinates between the enhanced controller and the overall system
 */
class NovaCore {
  constructor() {
    this.enhancedController = null;
    this.isInitialized = false;
    this.tabController = null;
  }

  /**
   * Initialize Nova system
   */
  async init() {
    try {
      console.log('Initializing Nova Core system...');
      
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve);
        });
      }

      // Wait for dependencies to be available
      await this.waitForDependencies();

      // Initialize the enhanced controller
      if (window.NovaEnhancedController) {
        this.enhancedController = new window.NovaEnhancedController();
        this.enhancedController.init();
      } else {
        console.warn('NovaEnhancedController not found');
      }

      // Set up main tab controller integration
      this.setupTabController();

      this.isInitialized = true;
      console.log('Nova Core initialized successfully');

      // Set up state manager listeners for updates
      this.setupStateManagerIntegration();

    } catch (error) {
      console.error('Failed to initialize Nova Core:', error);
    }
  }

  /**
   * Wait for required dependencies
   */
  async waitForDependencies() {
    const dependencies = [
      'selectionStateManager',
      'NovaEnhancedController'
    ];

    const maxWait = 5000; // 5 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      const allAvailable = dependencies.every(dep => window[dep]);
      if (allAvailable) {
        console.log('All Nova dependencies available');
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.warn('Some Nova dependencies may not be available:', 
      dependencies.filter(dep => !window[dep]));
  }

  /**
   * Set up integration with main tab controller
   */
  setupTabController() {
    this.tabController = {
      activateNova: () => {
        if (this.enhancedController) {
          this.enhancedController.setActive(true);
          console.log('Nova activated');
        }
      },
      deactivateNova: () => {
        if (this.enhancedController) {
          this.enhancedController.setActive(false);
          console.log('Nova deactivated');
        }
      }
    };

    // Export for global access
    window.Nova.tabController = this.tabController;
  }

  /**
   * Set up state manager integration
   */
  setupStateManagerIntegration() {
    if (!window.selectionStateManager) return;

    // Listen for state changes to update analytics views
    window.selectionStateManager.addEventListener('businessTypeChanged', (data) => {
      this.onBusinessStateChange(data);
    });

    window.selectionStateManager.addEventListener('projectTypesChanged', (data) => {
      this.onProjectStateChange(data);
    });
  }

  /**
   * Handle business type changes
   */
  onBusinessStateChange(data) {
    console.log('Nova: Business type changed', data);
    
    // Update current view if controller is active
    if (this.enhancedController && this.enhancedController.isActive) {
      // Update selection status
      if (this.enhancedController.updateSelectionStatus) {
        this.enhancedController.updateSelectionStatus();
      }
      
      // Re-render current view to reflect new state
      this.enhancedController.updateViewContent(this.enhancedController.currentView);
    }
  }

  /**
   * Handle project type changes
   */
  onProjectStateChange(data) {
    console.log('Nova: Project types changed', data);
    
    // Update current view if controller is active
    if (this.enhancedController && this.enhancedController.isActive) {
      // Update selection status
      if (this.enhancedController.updateSelectionStatus) {
        this.enhancedController.updateSelectionStatus();
      }
      
      // Re-render current view to reflect new state
      this.enhancedController.updateViewContent(this.enhancedController.currentView);
    }
  }

  /**
   * Get current state
   */
  getState() {
    return {
      isInitialized: this.isInitialized,
      hasController: !!this.enhancedController,
      currentView: this.enhancedController?.currentView || null,
      isActive: this.enhancedController?.isActive || false
    };
  }

  /**
   * Clean up Nova system
   */
  cleanup() {
    if (this.enhancedController) {
      this.enhancedController.cleanup();
    }
    this.isInitialized = false;
    console.log('Nova Core cleaned up');
  }
}

// Create global Nova instance
window.Nova.core = new NovaCore();

// Auto-initialize when script loads
window.Nova.core.init();

console.log('Nova Core script loaded');