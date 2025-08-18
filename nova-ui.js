/**
 * Nova UI Management
 * Handles UI-specific functionality for Nova system
 */

// Nova UI namespace
window.Nova = window.Nova || {};
window.Nova.ui = window.Nova.ui || {};

/**
 * Nova UI Manager
 * Manages UI state, animations, and user interactions
 */
class NovaUIManager {
  constructor() {
    this.animations = {
      enabled: true,
      duration: 300
    };
    
    this.accessibility = {
      highContrast: false,
      reducedMotion: false,
      keyboardNavigation: true
    };

    this.modal = {
      isOpen: false,
      currentModal: null
    };

    // Check for user preferences
    this.checkAccessibilityPreferences();
  }

  /**
   * Check user accessibility preferences
   */
  checkAccessibilityPreferences() {
    // Check for reduced motion preference
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.accessibility.reducedMotion = true;
      this.animations.enabled = false;
    }

    // Check for high contrast preference
    if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches) {
      this.accessibility.highContrast = true;
    }
  }

  /**
   * Show loading state
   */
  showLoading(container) {
    if (!container) return;

    const loadingHTML = `
      <div class="nova-loading-state">
        <div class="nova-spinner"></div>
        <p>Loading analytics...</p>
      </div>
    `;

    container.innerHTML = loadingHTML;
  }

  /**
   * Hide loading state
   */
  hideLoading(container) {
    if (!container) return;
    
    const loadingElement = container.querySelector('.nova-loading-state');
    if (loadingElement) {
      loadingElement.remove();
    }
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `nova-notification nova-notification-${type}`;
    notification.innerHTML = `
      <div class="nova-notification-content">
        <span class="nova-notification-message">${message}</span>
        <button class="nova-notification-close" aria-label="Close notification">&times;</button>
      </div>
    `;

    // Add to page
    document.body.appendChild(notification);

    // Position and show
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      background: ${this.getNotificationColor(type)};
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transform: translateX(100%);
      transition: transform 0.3s ease;
      max-width: 400px;
    `;

    // Animate in
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
    });

    // Close button handler
    const closeBtn = notification.querySelector('.nova-notification-close');
    const closeNotification = () => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    };

    closeBtn.addEventListener('click', closeNotification);

    // Auto close
    if (duration > 0) {
      setTimeout(closeNotification, duration);
    }

    return notification;
  }

  /**
   * Get notification color based on type
   */
  getNotificationColor(type) {
    const colors = {
      info: '#3b82f6',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444'
    };
    return colors[type] || colors.info;
  }

  /**
   * Focus management for accessibility
   */
  setFocus(element) {
    if (!element || !this.accessibility.keyboardNavigation) return;

    element.focus();
    
    // Scroll into view if needed
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * Create modal
   */
  createModal(content, options = {}) {
    const modal = document.createElement('div');
    modal.className = 'nova-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    
    const modalContent = document.createElement('div');
    modalContent.className = 'nova-modal-content';
    
    modalContent.innerHTML = `
      <div class="nova-modal-header">
        <h3>${options.title || 'Modal'}</h3>
        <button class="nova-modal-close" aria-label="Close modal">&times;</button>
      </div>
      <div class="nova-modal-body">
        ${content}
      </div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Setup close handlers
    const closeBtn = modal.querySelector('.nova-modal-close');
    const closeModal = () => this.closeModal(modal);
    
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Keyboard handler
    const keyHandler = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', keyHandler);
    modal._keyHandler = keyHandler;

    // Show modal
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    modalContent.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 0;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      transform: scale(0.9);
      transition: transform 0.3s ease;
    `;

    requestAnimationFrame(() => {
      modal.style.opacity = '1';
      modalContent.style.transform = 'scale(1)';
    });

    this.modal.isOpen = true;
    this.modal.currentModal = modal;

    return modal;
  }

  /**
   * Close modal
   */
  closeModal(modal) {
    if (!modal) return;

    modal.style.opacity = '0';
    const content = modal.querySelector('.nova-modal-content');
    if (content) {
      content.style.transform = 'scale(0.9)';
    }

    setTimeout(() => {
      if (modal.parentNode) {
        modal.remove();
      }
      if (modal._keyHandler) {
        document.removeEventListener('keydown', modal._keyHandler);
      }
    }, 300);

    if (this.modal.currentModal === modal) {
      this.modal.isOpen = false;
      this.modal.currentModal = null;
    }
  }

  /**
   * Animate element
   */
  animate(element, animation, options = {}) {
    if (!element || !this.animations.enabled) return Promise.resolve();

    const duration = options.duration || this.animations.duration;
    const easing = options.easing || 'ease';

    return new Promise(resolve => {
      element.style.transition = `all ${duration}ms ${easing}`;
      
      // Apply animation
      Object.entries(animation).forEach(([property, value]) => {
        element.style[property] = value;
      });

      setTimeout(() => {
        element.style.transition = '';
        resolve();
      }, duration);
    });
  }

  /**
   * Get current state
   */
  getState() {
    return {
      animations: this.animations,
      accessibility: this.accessibility,
      modal: this.modal
    };
  }
}

// Create global instance
window.Nova.ui.manager = new NovaUIManager();

// Add some global utility functions
window.Nova.ui.showNotification = (message, type, duration) => {
  return window.Nova.ui.manager.showNotification(message, type, duration);
};

window.Nova.ui.createModal = (content, options) => {
  return window.Nova.ui.manager.createModal(content, options);
};

console.log('Nova UI Management loaded');