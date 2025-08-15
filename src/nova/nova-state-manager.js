// Centralized State Management for Business/Project Type Selection
// This module provides a single source of truth for selected businesses/project types
// across all tabs (Investment Model, Staffing, Dynamic UI)

/**
 * Centralized State Manager for Business and Project Type Selection
 * 
 * This class manages the selected business type and project type(s) across all tabs
 * in the Matrix Nova application, ensuring consistency between:
 * - Business Analytics (Dynamic UI)
 * - Investment Model tab 
 * - Staffing & Resources tab
 * - All other analysis tabs
 * 
 * State Pattern:
 * - Single selectedBusinessType (e.g., 'booking', 'member', 'service')
 * - Multiple selectedProjectTypes (e.g., ['padel', 'gym'])
 * - Event-driven updates notify all dependent components
 * - Persistent storage preserves state across sessions
 */
class SelectionStateManager {
  constructor() {
    // Core state properties
    this.selectedBusinessType = null;
    this.selectedProjectTypes = new Set(); // Multiple projects can be selected
    this.activeProjectType = null; // Currently focused project for detailed analysis
    
    // Event listeners for state changes
    this.listeners = {
      businessTypeChanged: [],
      projectTypesChanged: [],
      activeProjectChanged: []
    };
    
    // Load saved state from localStorage
    this.loadState();
    
    // Debug logging
    this.debugMode = false;
  }

  // ==================== BUSINESS TYPE MANAGEMENT ====================

  /**
   * Set the selected business type (e.g., 'booking', 'member', 'service')
   * This determines what project types are available for selection
   */
  setBusinessType(businessTypeId) {
    if (this.selectedBusinessType !== businessTypeId) {
      const oldBusinessType = this.selectedBusinessType;
      this.selectedBusinessType = businessTypeId;
      
      // Clear existing project selections when business type changes
      this.selectedProjectTypes.clear();
      this.activeProjectType = null;
      
      this.saveState();
      this.notifyListeners('businessTypeChanged', {
        old: oldBusinessType,
        new: businessTypeId,
        availableProjects: this.getAvailableProjectTypes()
      });
      
      this.log('Business type changed:', oldBusinessType, '->', businessTypeId);
    }
  }

  /**
   * Get the currently selected business type
   */
  getBusinessType() {
    return this.selectedBusinessType;
  }

  /**
   * Get available project types for the current business type
   */
  getAvailableProjectTypes() {
    if (!this.selectedBusinessType) return [];
    
    if (window.projectTypeManager) {
      return window.projectTypeManager.getProjectsByBusinessType(this.selectedBusinessType);
    }
    
    return [];
  }

  // ==================== PROJECT TYPE MANAGEMENT ====================

  /**
   * Add a project type to the selection
   */
  addProjectType(projectTypeId) {
    if (!this.selectedProjectTypes.has(projectTypeId)) {
      // Validate that this project type belongs to the selected business type
      const availableProjects = this.getAvailableProjectTypes();
      const projectExists = availableProjects.some(p => p.id === projectTypeId);
      
      if (!projectExists && window.projectTypeManager) {
        const projectType = window.projectTypeManager.getProjectType(projectTypeId);
        if (!projectType || projectType.businessType !== this.selectedBusinessType) {
          this.log('Warning: Project type', projectTypeId, 'does not match business type', this.selectedBusinessType);
          return false;
        }
      }
      
      this.selectedProjectTypes.add(projectTypeId);
      
      // Set as active if it's the only selected project
      if (this.selectedProjectTypes.size === 1) {
        this.activeProjectType = projectTypeId;
      }
      
      this.saveState();
      this.notifyListeners('projectTypesChanged', {
        action: 'added',
        projectType: projectTypeId,
        selectedProjects: Array.from(this.selectedProjectTypes)
      });
      
      this.log('Project type added:', projectTypeId);
      return true;
    }
    return false;
  }

  /**
   * Remove a project type from the selection
   */
  removeProjectType(projectTypeId) {
    if (this.selectedProjectTypes.has(projectTypeId)) {
      this.selectedProjectTypes.delete(projectTypeId);
      
      // Update active project if needed
      if (this.activeProjectType === projectTypeId) {
        this.activeProjectType = this.selectedProjectTypes.size > 0 
          ? Array.from(this.selectedProjectTypes)[0] 
          : null;
      }
      
      this.saveState();
      this.notifyListeners('projectTypesChanged', {
        action: 'removed',
        projectType: projectTypeId,
        selectedProjects: Array.from(this.selectedProjectTypes)
      });
      
      this.log('Project type removed:', projectTypeId);
      return true;
    }
    return false;
  }

  /**
   * Set the active project type (for detailed analysis)
   */
  setActiveProjectType(projectTypeId) {
    if (this.selectedProjectTypes.has(projectTypeId) && this.activeProjectType !== projectTypeId) {
      const oldActive = this.activeProjectType;
      this.activeProjectType = projectTypeId;
      
      this.saveState();
      this.notifyListeners('activeProjectChanged', {
        old: oldActive,
        new: projectTypeId
      });
      
      this.log('Active project changed:', oldActive, '->', projectTypeId);
    }
  }

  /**
   * Get all selected project types
   */
  getSelectedProjectTypes() {
    return Array.from(this.selectedProjectTypes);
  }

  /**
   * Get the currently active project type
   */
  getActiveProjectType() {
    return this.activeProjectType;
  }

  /**
   * Check if a specific project type is selected
   */
  isProjectTypeSelected(projectTypeId) {
    return this.selectedProjectTypes.has(projectTypeId);
  }

  /**
   * Clear all selected project types
   */
  clearProjectTypes() {
    if (this.selectedProjectTypes.size > 0) {
      this.selectedProjectTypes.clear();
      this.activeProjectType = null;
      
      this.saveState();
      this.notifyListeners('projectTypesChanged', {
        action: 'cleared',
        selectedProjects: []
      });
      
      this.log('All project types cleared');
    }
  }

  // ==================== LEGACY COMPATIBILITY ====================

  /**
   * Legacy compatibility: Check if gym is included (for Investment Model tab)
   */
  isGymIncluded() {
    return this.isProjectTypeSelected('gym');
  }

  /**
   * Legacy compatibility: Check if padel is included
   */
  isPadelIncluded() {
    return this.isProjectTypeSelected('padel');
  }

  /**
   * Legacy compatibility: Toggle gym inclusion
   */
  toggleGymInclusion(include) {
    if (include) {
      this.addProjectType('gym');
    } else {
      this.removeProjectType('gym');
    }
  }

  // ==================== STATE PERSISTENCE ====================

  /**
   * Save current state to localStorage
   */
  saveState() {
    const state = {
      selectedBusinessType: this.selectedBusinessType,
      selectedProjectTypes: Array.from(this.selectedProjectTypes),
      activeProjectType: this.activeProjectType,
      timestamp: Date.now()
    };
    
    try {
      localStorage.setItem('matrixNova_selectionState', JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save selection state:', error);
    }
  }

  /**
   * Load state from localStorage
   */
  loadState() {
    try {
      const saved = localStorage.getItem('matrixNova_selectionState');
      if (saved) {
        const state = JSON.parse(saved);
        
        this.selectedBusinessType = state.selectedBusinessType || null;
        this.selectedProjectTypes = new Set(state.selectedProjectTypes || []);
        this.activeProjectType = state.activeProjectType || null;
        
        this.log('State loaded from localStorage:', state);
      }
    } catch (error) {
      console.warn('Failed to load selection state:', error);
    }
  }

  /**
   * Reset all state to initial values
   */
  resetState() {
    this.selectedBusinessType = null;
    this.selectedProjectTypes.clear();
    this.activeProjectType = null;
    
    this.saveState();
    
    // Notify all listeners about the reset
    this.notifyListeners('businessTypeChanged', { old: null, new: null });
    this.notifyListeners('projectTypesChanged', { action: 'reset', selectedProjects: [] });
    this.notifyListeners('activeProjectChanged', { old: null, new: null });
    
    this.log('State reset to initial values');
  }

  // ==================== EVENT MANAGEMENT ====================

  /**
   * Add an event listener for state changes
   */
  addEventListener(eventType, callback) {
    if (this.listeners[eventType]) {
      this.listeners[eventType].push(callback);
    } else {
      console.warn('Unknown event type:', eventType);
    }
  }

  /**
   * Remove an event listener
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
   * Notify all listeners of a specific event type
   */
  notifyListeners(eventType, data) {
    if (this.listeners[eventType]) {
      this.listeners[eventType].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in state change listener:', error);
        }
      });
    }
  }

  // ==================== UTILITIES ====================

  /**
   * Get current state summary for debugging
   */
  getStateSummary() {
    return {
      businessType: this.selectedBusinessType,
      projectTypes: Array.from(this.selectedProjectTypes),
      activeProject: this.activeProjectType,
      availableProjects: this.getAvailableProjectTypes().map(p => p.id)
    };
  }

  /**
   * Enable/disable debug logging
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }

  /**
   * Internal logging method
   */
  log(...args) {
    if (this.debugMode) {
      console.log('[SelectionStateManager]', ...args);
    }
  }

  // ==================== MIGRATION HELPERS ====================

  /**
   * Migrate from old dynamic UI state
   */
  migrateFromDynamicUI(businessType, projectType) {
    if (businessType && projectType) {
      this.setBusinessType(businessType);
      this.addProjectType(projectType);
      this.log('Migrated from dynamic UI:', { businessType, projectType });
    }
  }

  /**
   * Export current state for backup/debugging
   */
  exportState() {
    return {
      ...this.getStateSummary(),
      timestamp: Date.now(),
      version: '1.0'
    };
  }

  /**
   * Import state from backup
   */
  importState(stateData) {
    if (stateData.businessType) {
      this.setBusinessType(stateData.businessType);
    }
    
    if (stateData.projectTypes && Array.isArray(stateData.projectTypes)) {
      this.clearProjectTypes();
      stateData.projectTypes.forEach(projectId => {
        this.addProjectType(projectId);
      });
    }
    
    if (stateData.activeProject) {
      this.setActiveProjectType(stateData.activeProject);
    }
    
    this.log('State imported:', stateData);
  }
}

// Create global instance
window.selectionStateManager = new SelectionStateManager();

// Enable debug mode in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.selectionStateManager.setDebugMode(true);
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SelectionStateManager };
}