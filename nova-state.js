/**
 * Nova State Management Integration
 * Provides state management for Nova system specifically
 */

// Nova State namespace
window.Nova = window.Nova || {};
window.Nova.state = window.Nova.state || {};

/**
 * Nova State Manager
 * Works with the centralized SelectionStateManager but provides Nova-specific functionality
 */
class NovaStateManager {
  constructor() {
    this.localState = {
      activeAnalyticsView: 'business-analytics-main',
      viewHistory: ['business-analytics-main'],
      userPreferences: {
        defaultView: 'business-analytics-main',
        autoRefresh: true,
        showAdvancedMetrics: false
      }
    };

    this.listeners = {
      viewChanged: [],
      preferencesChanged: []
    };

    // Load from localStorage
    this.loadLocalState();
  }

  /**
   * Set active analytics view
   */
  setActiveView(viewName) {
    const oldView = this.localState.activeAnalyticsView;
    this.localState.activeAnalyticsView = viewName;
    
    // Update history
    if (!this.localState.viewHistory.includes(viewName)) {
      this.localState.viewHistory.push(viewName);
    }
    
    // Keep history manageable
    if (this.localState.viewHistory.length > 10) {
      this.localState.viewHistory = this.localState.viewHistory.slice(-10);
    }

    this.saveLocalState();
    this.notifyListeners('viewChanged', { old: oldView, new: viewName });
  }

  /**
   * Get active analytics view
   */
  getActiveView() {
    return this.localState.activeAnalyticsView;
  }

  /**
   * Get view history
   */
  getViewHistory() {
    return [...this.localState.viewHistory];
  }

  /**
   * Set user preference
   */
  setPreference(key, value) {
    const oldValue = this.localState.userPreferences[key];
    this.localState.userPreferences[key] = value;
    
    this.saveLocalState();
    this.notifyListeners('preferencesChanged', { key, old: oldValue, new: value });
  }

  /**
   * Get user preference
   */
  getPreference(key) {
    return this.localState.userPreferences[key];
  }

  /**
   * Get all preferences
   */
  getAllPreferences() {
    return { ...this.localState.userPreferences };
  }

  /**
   * Reset to default state
   */
  reset() {
    this.localState = {
      activeAnalyticsView: 'business-analytics-main',
      viewHistory: ['business-analytics-main'],
      userPreferences: {
        defaultView: 'business-analytics-main',
        autoRefresh: true,
        showAdvancedMetrics: false
      }
    };
    
    this.saveLocalState();
    this.notifyListeners('viewChanged', { old: null, new: 'business-analytics-main' });
  }

  /**
   * Save state to localStorage
   */
  saveLocalState() {
    try {
      localStorage.setItem('nova_local_state', JSON.stringify(this.localState));
    } catch (error) {
      console.warn('Failed to save Nova local state:', error);
    }
  }

  /**
   * Load state from localStorage
   */
  loadLocalState() {
    try {
      const saved = localStorage.getItem('nova_local_state');
      if (saved) {
        const parsedState = JSON.parse(saved);
        this.localState = { ...this.localState, ...parsedState };
      }
    } catch (error) {
      console.warn('Failed to load Nova local state:', error);
    }
  }

  /**
   * Add event listener
   */
  addEventListener(eventType, callback) {
    if (this.listeners[eventType]) {
      this.listeners[eventType].push(callback);
    }
  }

  /**
   * Remove event listener
   */
  removeEventListener(eventType, callback) {
    if (this.listeners[eventType]) {
      const index = this.listeners[eventType].indexOf(callback);
      if (index > -1) {
        this.listeners[eventType].splice(index, 1);
      }
    }
  }

  /**
   * Notify listeners
   */
  notifyListeners(eventType, data) {
    if (this.listeners[eventType]) {
      this.listeners[eventType].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in Nova state listener:', error);
        }
      });
    }
  }

  /**
   * Get current state summary
   */
  getStateSummary() {
    const centralState = window.selectionStateManager ? {
      businessType: window.selectionStateManager.getSelectedBusinessType(),
      projectTypes: window.selectionStateManager.getSelectedProjectTypes(),
      activeProject: window.selectionStateManager.getActiveProjectType()
    } : { businessType: null, projectTypes: [], activeProject: null };

    return {
      nova: this.localState,
      central: centralState,
      timestamp: Date.now()
    };
  }
}

// Create global instance
window.Nova.state.manager = new NovaStateManager();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NovaStateManager };
}

console.log('Nova State Management loaded');