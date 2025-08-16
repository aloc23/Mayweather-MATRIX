// Dynamic UI Generator for Generic P&L System
// Creates forms and interfaces based on project type configurations

class DynamicUIGenerator {
  constructor() {
    // Remove local state management - use centralized state manager instead
    this.formData = new Map();
    this.currentStep = 'business-type'; // 'business-type', 'project-type', 'analysis'
    
    // Initialize state change listeners
    this.initializeStateListeners();
  }

  /**
   * Initialize listeners for centralized state changes
   * This ensures the UI stays in sync with the global state
   */
  initializeStateListeners() {
    // Wait for state manager to be available
    const initListeners = () => {
      if (window.selectionStateManager) {
        // Listen for business type changes
        window.selectionStateManager.addEventListener('businessTypeChanged', (data) => {
          this.onBusinessTypeChanged(data);
        });

        // Listen for project type changes
        window.selectionStateManager.addEventListener('projectTypesChanged', (data) => {
          this.onProjectTypesChanged(data);
        });

        // Listen for active project changes
        window.selectionStateManager.addEventListener('activeProjectChanged', (data) => {
          this.onActiveProjectChanged(data);
        });
      } else {
        // Retry if state manager not yet available
        setTimeout(initListeners, 100);
      }
    };
    
    initListeners();
  }

  /**
   * Handle business type changes from centralized state
   */
  onBusinessTypeChanged(data) {
    console.log('Dynamic UI: Business type changed', data);
    
    if (data.new) {
      this.currentStep = 'project-type';
      this.showProjectTypeSelector();
      this.updateDropdownSelection(data.new);
      this.showSelectedBusinessTypeInfo(data.new);
    } else {
      this.currentStep = 'business-type';
      this.hideProjectTypeSelector();
      this.hideAnalysisForm();
    }
  }

  /**
   * Handle project type changes from centralized state
   */
  onProjectTypesChanged(data) {
    console.log('Dynamic UI: Project types changed', data);
    
    if (data.selectedProjects.length > 0) {
      this.currentStep = 'analysis';
      this.updateProjectTypeSelection(data.selectedProjects);
      
      // If there's an active project, show its analysis form
      const activeProject = window.selectionStateManager.getActiveProjectType();
      if (activeProject) {
        this.showAnalysisForm(activeProject);
      }
    } else {
      this.currentStep = 'project-type';
      this.hideAnalysisForm();
    }
  }

  /**
   * Handle active project changes from centralized state
   */
  onActiveProjectChanged(data) {
    console.log('Dynamic UI: Active project changed', data);
    
    if (data.new) {
      this.showAnalysisForm(data.new);
    }
  }

  // Getter methods that use centralized state
  get selectedBusinessType() {
    return window.selectionStateManager ? window.selectionStateManager.getBusinessType() : null;
  }

  get selectedProjectType() {
    return window.selectionStateManager ? window.selectionStateManager.getActiveProjectType() : null;
  }

  get selectedProjectTypes() {
    return window.selectionStateManager ? window.selectionStateManager.getSelectedProjectTypes() : [];
  }

  // Generate the main business type selection interface
  generateBusinessTypeSelector(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const businessCategories = window.BUSINESS_TYPE_CATEGORIES;
    
    container.innerHTML = `
      <div class="business-analytics-container">
        <h2>Business Analytics Tool</h2>
        <p>Select your business type to access relevant analytics and KPIs tailored to your industry.</p>
        
        <div class="business-type-selector">
          <h3>Step 1: Choose Your Business Type</h3>
          
          <div class="business-type-dropdown-container">
            <label for="business-type-dropdown" class="business-type-label">
              Business Type:
            </label>
            <div class="custom-dropdown" tabindex="0" role="combobox" aria-expanded="false" aria-haspopup="listbox" aria-labelledby="business-type-label">
              <div class="dropdown-trigger" id="business-type-trigger">
                <span class="dropdown-placeholder">Select your business type...</span>
                <span class="dropdown-arrow">▼</span>
              </div>
              <div class="dropdown-menu" role="listbox" aria-labelledby="business-type-label">
                ${Object.values(businessCategories).map(category => `
                  <div class="dropdown-option ${this.selectedBusinessType === category.id ? 'selected' : ''}" 
                       role="option" 
                       data-business-type="${category.id}"
                       aria-selected="${this.selectedBusinessType === category.id ? 'true' : 'false'}"
                       tabindex="-1">
                    <span class="option-icon">${category.icon}</span>
                    <div class="option-content">
                      <span class="option-title">${category.name}</span>
                      <span class="option-description">${category.description}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
          
          <div id="selected-business-type-info" class="selected-business-type-info" style="display: none;">
            <!-- Selected business type details will be shown here -->
          </div>
        </div>

        <div id="project-type-selector" class="project-type-selector" style="display: none;">
          <h3>Step 2: Choose Your Specific Business Template</h3>
          <div id="project-type-options"></div>
        </div>

        <div id="business-analytics-form" class="business-analytics-form" style="display: none;">
          <!-- Dynamic form will be generated here -->
        </div>
      </div>
    `;
    
    // Initialize dropdown functionality
    this.initializeBusinessTypeDropdown();
  }

  // Initialize dropdown functionality
  initializeBusinessTypeDropdown() {
    const dropdown = document.querySelector('.custom-dropdown');
    const trigger = document.getElementById('business-type-trigger');
    const menu = document.querySelector('.dropdown-menu');
    const options = document.querySelectorAll('.dropdown-option');
    
    if (!dropdown || !trigger || !menu) return;
    
    // Toggle dropdown on trigger click
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleDropdown();
    });
    
    // Handle keyboard navigation
    dropdown.addEventListener('keydown', (e) => {
      this.handleDropdownKeydown(e);
    });
    
    // Handle option selection
    options.forEach(option => {
      option.addEventListener('click', (e) => {
        e.preventDefault();
        const businessTypeId = option.dataset.businessType;
        this.selectBusinessTypeFromDropdown(businessTypeId);
      });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target)) {
        this.closeDropdown();
      }
    });
    
    // Update dropdown if there's already a selection
    if (this.selectedBusinessType) {
      this.updateDropdownSelection(this.selectedBusinessType);
    }
  }
  
  // Toggle dropdown open/close
  toggleDropdown() {
    const dropdown = document.querySelector('.custom-dropdown');
    const menu = document.querySelector('.dropdown-menu');
    
    if (!dropdown || !menu) return;
    
    const isOpen = dropdown.getAttribute('aria-expanded') === 'true';
    
    if (isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }
  
  // Open dropdown
  openDropdown() {
    const dropdown = document.querySelector('.custom-dropdown');
    const menu = document.querySelector('.dropdown-menu');
    
    if (!dropdown || !menu) return;
    
    dropdown.setAttribute('aria-expanded', 'true');
    dropdown.classList.add('open');
    menu.style.display = 'block';
    
    // Focus first option
    const firstOption = menu.querySelector('.dropdown-option');
    if (firstOption) {
      firstOption.focus();
    }
  }
  
  // Close dropdown
  closeDropdown() {
    const dropdown = document.querySelector('.custom-dropdown');
    const menu = document.querySelector('.dropdown-menu');
    
    if (!dropdown || !menu) return;
    
    dropdown.setAttribute('aria-expanded', 'false');
    dropdown.classList.remove('open');
    menu.style.display = 'none';
  }
  
  // Handle keyboard navigation in dropdown
  handleDropdownKeydown(e) {
    const menu = document.querySelector('.dropdown-menu');
    const options = Array.from(document.querySelectorAll('.dropdown-option'));
    const isOpen = document.querySelector('.custom-dropdown').getAttribute('aria-expanded') === 'true';
    
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!isOpen) {
          this.openDropdown();
        } else {
          const focused = document.activeElement;
          if (focused && focused.classList.contains('dropdown-option')) {
            const businessTypeId = focused.dataset.businessType;
            this.selectBusinessTypeFromDropdown(businessTypeId);
          }
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        this.closeDropdown();
        document.querySelector('.custom-dropdown').focus();
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          this.openDropdown();
        } else {
          const currentIndex = options.indexOf(document.activeElement);
          const nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
          options[nextIndex].focus();
        }
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          const currentIndex = options.indexOf(document.activeElement);
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
          options[prevIndex].focus();
        }
        break;
    }
  }
  
  // Select business type from dropdown
  selectBusinessTypeFromDropdown(businessTypeId) {
    this.selectBusinessType(businessTypeId);
    this.updateDropdownSelection(businessTypeId);
    this.closeDropdown();
    this.showSelectedBusinessTypeInfo(businessTypeId);
  }
  
  // Update dropdown visual selection
  updateDropdownSelection(businessTypeId) {
    const trigger = document.getElementById('business-type-trigger');
    const placeholder = trigger?.querySelector('.dropdown-placeholder');
    const options = document.querySelectorAll('.dropdown-option');
    const businessCategory = window.BUSINESS_TYPE_CATEGORIES[businessTypeId];
    
    if (!businessCategory || !placeholder) return;
    
    // Update trigger text
    placeholder.innerHTML = `
      <span class="selected-icon">${businessCategory.icon}</span>
      <span class="selected-text">${businessCategory.name}</span>
    `;
    placeholder.classList.add('has-selection');
    
    // Update option selection states
    options.forEach(option => {
      const isSelected = option.dataset.businessType === businessTypeId;
      option.classList.toggle('selected', isSelected);
      option.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    });
  }
  
  // Show selected business type information
  showSelectedBusinessTypeInfo(businessTypeId) {
    const infoContainer = document.getElementById('selected-business-type-info');
    const businessCategory = window.BUSINESS_TYPE_CATEGORIES[businessTypeId];
    
    if (!infoContainer || !businessCategory) return;
    
    infoContainer.innerHTML = `
      <div class="selected-type-summary">
        <div class="selected-type-header">
          <span class="selected-type-icon">${businessCategory.icon}</span>
          <div class="selected-type-details">
            <h4>${businessCategory.name}</h4>
            <p>${businessCategory.description}</p>
          </div>
        </div>
        <div class="selected-type-info">
          <div class="info-section">
            <strong>Examples:</strong> ${businessCategory.examples.slice(0, 4).join(', ')}
          </div>
          <div class="info-section">
            <strong>Key Metrics:</strong> ${businessCategory.keyMetrics.slice(0, 3).join(', ')}
          </div>
        </div>
      </div>
    `;
    
    infoContainer.style.display = 'block';
  }

  // Select a business type and show relevant project templates
  selectBusinessType(businessTypeId) {
    // Use centralized state manager instead of local state
    if (window.selectionStateManager) {
      window.selectionStateManager.setBusinessType(businessTypeId);
    } else {
      console.warn('State manager not available, falling back to local state');
      this.currentStep = 'project-type';
      this.showProjectTypeSelector();
    }
  }

  // Show project type templates for the selected business type
  showProjectTypeSelector() {
    const projectTypeSelector = document.getElementById('project-type-selector');
    const projectTypeOptions = document.getElementById('project-type-options');
    
    if (!projectTypeSelector || !projectTypeOptions) return;
    
    const businessTypeId = this.selectedBusinessType;
    if (!businessTypeId) return;
    
    const businessCategory = window.BUSINESS_TYPE_CATEGORIES[businessTypeId];
    const projectTypes = window.projectTypeManager?.getProjectsByBusinessType(businessTypeId) || [];
    
    projectTypeSelector.style.display = 'block';
    
    projectTypeOptions.innerHTML = `
      <div class="business-type-info">
        <div class="selected-business-type">
          <span class="business-icon">${businessCategory.icon}</span>
          <strong>${businessCategory.name}</strong> - ${businessCategory.description}
        </div>
        <div class="key-metrics">
          <strong>Key Metrics for ${businessCategory.name}:</strong>
          <ul>
            ${businessCategory.keyMetrics.map(metric => `<li>${metric}</li>`).join('')}
          </ul>
        </div>
      </div>
      
      <div class="project-type-templates">
        <h4>Available Templates</h4>
        <div class="project-template-grid">
          ${projectTypes.map(type => `
            <div class="project-template-card enhanced ${this.selectedProjectTypes.includes(type.id) ? 'selected' : ''}" 
                 data-project-type="${type.id}"
                 onclick="dynamicUI.selectProjectType('${type.id}')"
                 onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();dynamicUI.selectProjectType('${type.id}');}"
                 tabindex="0"
                 role="button"
                 aria-label="Select ${type.name} template">
              <div class="card-header">
                <div class="project-icon enhanced">${type.icon}</div>
                <div class="card-accent"></div>
              </div>
              <div class="card-content">
                <h5>${type.name}</h5>
                <p class="card-description">${type.description}</p>
                <div class="card-metrics">
                  <div class="metric-tag">
                    <span class="metric-label">Business Type:</span>
                    <span class="metric-value">${businessCategory.name}</span>
                  </div>
                  ${businessCategory.keyMetrics && businessCategory.keyMetrics.length > 0 ? `
                    <div class="metric-tag">
                      <span class="metric-label">Key Metrics:</span>
                      <span class="metric-value">${businessCategory.keyMetrics.slice(0, 2).join(', ')}</span>
                    </div>
                  ` : ''}
                </div>
              </div>
              <div class="card-actions">
                <button type="button" class="learn-more-btn" 
                        onclick="event.stopPropagation();dynamicUI.showProjectInfo('${type.id}')"
                        aria-label="Learn more about ${type.name}">
                  <span class="icon">ℹ️</span>
                  Learn More
                </button>
              </div>
            </div>
          `).join('')}
          
          <div class="project-template-card enhanced create-custom" 
               onclick="dynamicUI.createCustomTemplate()"
               onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();dynamicUI.createCustomTemplate();}"
               tabindex="0"
               role="button"
               aria-label="Create custom template">
            <div class="card-header">
              <div class="project-icon enhanced">➕</div>
              <div class="card-accent custom"></div>
            </div>
            <div class="card-content">
              <h5>Create Custom</h5>
              <p class="card-description">Create a custom template for your specific business</p>
              <div class="card-metrics">
                <div class="metric-tag">
                  <span class="metric-label">Flexibility:</span>
                  <span class="metric-value">Unlimited</span>
                </div>
                <div class="metric-tag">
                  <span class="metric-label">Customization:</span>
                  <span class="metric-value">Full Control</span>
                </div>
              </div>
            </div>
            <div class="card-actions">
              <button type="button" class="learn-more-btn" 
                      onclick="event.stopPropagation();dynamicUI.showCustomTemplateInfo()"
                      aria-label="Learn more about custom templates">
                <span class="icon">ℹ️</span>
                Learn More
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Auto-select if only one template available
    if (projectTypes.length === 1) {
      setTimeout(() => this.selectProjectType(projectTypes[0].id), 100);
    }
  }

  // Select a project type and show the analysis form
  selectProjectType(projectTypeId) {
    // Use centralized state manager instead of local state
    if (window.selectionStateManager) {
      window.selectionStateManager.addProjectType(projectTypeId);
      window.selectionStateManager.setActiveProjectType(projectTypeId);
    } else {
      console.warn('State manager not available, falling back to local state');
      this.currentStep = 'analysis';
      this.showAnalysisForm(projectTypeId);
    }
  }

  /**
   * Update project type selection visual indicators
   */
  updateProjectTypeSelection(selectedProjects) {
    document.querySelectorAll('.project-template-card').forEach(card => {
      const projectId = card.dataset.projectType;
      if (projectId) {
        const isSelected = selectedProjects.includes(projectId);
        card.classList.toggle('selected', isSelected);
      }
    });
  }

  /**
   * Hide project type selector
   */
  hideProjectTypeSelector() {
    const projectTypeSelector = document.getElementById('project-type-selector');
    if (projectTypeSelector) {
      projectTypeSelector.style.display = 'none';
    }
  }

  /**
   * Hide analysis form
   */
  hideAnalysisForm() {
    const formContainer = document.getElementById('business-analytics-form');
    if (formContainer) {
      formContainer.style.display = 'none';
    }
  }

  // Show the analysis form for the selected project type
  showAnalysisForm(projectTypeId = null) {
    const formContainer = document.getElementById('business-analytics-form');
    if (!formContainer) return;
    
    const activeProjectId = projectTypeId || this.selectedProjectType;
    if (!activeProjectId) return;
    
    const projectType = window.projectTypeManager?.getProjectType(activeProjectId);
    const businessCategory = window.BUSINESS_TYPE_CATEGORIES[this.selectedBusinessType];
    
    if (!projectType || !businessCategory) return;
    
    // Initialize form data if not exists
    if (!this.formData.has(activeProjectId)) {
      this.initializeFormData(activeProjectId, projectType);
    }
    
    formContainer.style.display = 'block';
    formContainer.innerHTML = `
      <div class="analysis-header">
        <h3>Step 3: ${projectType.name} Analysis</h3>
        <div class="breadcrumb">
          <span class="business-type">${businessCategory.icon} ${businessCategory.name}</span>
          <span class="separator">→</span>
          <span class="project-type">${projectType.icon} ${projectType.name}</span>
        </div>
        <button type="button" class="change-selection-btn" onclick="dynamicUI.resetSelection()">
          Change Selection
        </button>
      </div>
      
      <div class="business-insights">
        <h4>Business Type Insights: ${businessCategory.name}</h4>
        <div class="insights-grid">
          <div class="insight-card">
            <h5>Revenue Model</h5>
            <p>${this.getRevenueModelDescription(businessCategory.revenueModel)}</p>
          </div>
          <div class="insight-card">
            <h5>Key Success Factors</h5>
            <ul>
              ${businessCategory.characteristics.map(char => `<li>${this.formatCharacteristic(char)}</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
      
      <div class="project-type-form">
        ${this.generateProjectTypeForm(activeProjectId, projectType)}
      </div>
      
      <div id="${activeProjectId}-summary" class="analysis-summary" aria-live="polite">
        <!-- Summary will be populated by calculations -->
      </div>
      
      <div class="analysis-actions">
        <button type="button" class="calculate-btn" onclick="dynamicUI.calculateProjectType('${activeProjectId}')">
          Calculate ${projectType.name}
        </button>
        <button type="button" class="save-scenario-btn" onclick="dynamicUI.saveCurrentScenario()">
          Save Scenario
        </button>
      </div>
    `;
    
    // Auto-calculate on form load
    setTimeout(() => this.calculateProjectType(activeProjectId), 100);
  }

  // Reset selection to start over
  resetSelection() {
    // Clear local form data
    this.formData.clear();
    
    // Use centralized state manager to reset all selections
    if (window.selectionStateManager) {
      window.selectionStateManager.resetState();
    }
    
    // Always perform UI reset regardless of state manager
    this.currentStep = 'business-type';
    
    // Hide secondary sections
    this.hideProjectTypeSelector();
    this.hideAnalysisForm();
    
    // Reset business type selection visuals
    document.querySelectorAll('.business-type-card').forEach(card => {
      card.classList.remove('selected');
    });
    
    // Reset dropdown
    const trigger = document.getElementById('business-type-trigger');
    const placeholder = trigger?.querySelector('.dropdown-placeholder');
    if (placeholder) {
      placeholder.innerHTML = 'Select your business type...';
      placeholder.classList.remove('has-selection');
    }
    
    // Hide business type info
    const infoContainer = document.getElementById('selected-business-type-info');
    if (infoContainer) {
      infoContainer.style.display = 'none';
    }
    
    // Clear any analysis forms
    const analysisContainer = document.getElementById('analysis-container');
    if (analysisContainer) {
      analysisContainer.innerHTML = '';
    }
    
    // Reset back to initial state message
    const container = document.getElementById('business-analytics');
    if (container) {
      const stepContainer = container.querySelector('.business-type-selection');
      if (stepContainer) {
        // Make sure the business type selector is visible
        stepContainer.style.display = 'block';
      }
    }
  }

  // Initialize form data with default values
  initializeFormData(typeId, projectType) {
    const data = {};
    
    for (const categoryType of ['investment', 'revenue', 'operating', 'staffing']) {
      const category = projectType.categories[categoryType];
      for (const field of category) {
        data[field.id] = field.defaultValue || 0;
      }
    }
    
    this.formData.set(typeId, data);
  }

  // Generate form for a specific project type
  generateProjectTypeForm(typeId, projectType) {
    const data = this.formData.get(typeId) || {};
    
    return `
      <div class="project-type-form">
        ${this.generateCategorySection('Investment', projectType.categories.investment, typeId, data)}
        ${this.generateCategorySection('Revenue', projectType.categories.revenue, typeId, data)}
        ${this.generateCategorySection('Operating Costs', projectType.categories.operating, typeId, data)}
        ${this.generateCategorySection('Staffing', projectType.categories.staffing, typeId, data)}
      </div>
    `;
  }

  // Generate a category section (investment, revenue, etc.)
  generateCategorySection(categoryName, fields, typeId, data) {
    if (!fields || fields.length === 0) return '';

    // Group fields by group if available
    const groups = {};
    for (const field of fields) {
      const groupName = field.group || 'General';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(field);
    }

    return `
      <div class="section-group">
        <h3>${categoryName}</h3>
        ${Object.entries(groups).map(([groupName, groupFields]) => `
          <div class="field-group">
            ${Object.keys(groups).length > 1 ? `<h4>${groupName}</h4>` : ''}
            ${groupFields.map(field => this.generateFieldInput(field, typeId, data)).join('')}
          </div>
        `).join('')}
      </div>
    `;
  }

  // Generate input field based on field configuration
  generateFieldInput(field, typeId, data) {
    const value = data[field.id] !== undefined ? data[field.id] : field.defaultValue || 0;
    const fieldId = `${typeId}_${field.id}`;
    
    let inputHtml = '';
    
    switch (field.type) {
      case 'boolean':
        inputHtml = `<input type="checkbox" id="${fieldId}" ${value ? 'checked' : ''} onchange="dynamicUI.updateFieldValue('${typeId}', '${field.id}', this.checked)">`;
        break;
        
      case 'percentage':
        inputHtml = `
          <input type="range" id="${fieldId}_range" min="${field.min || 0}" max="${field.max || 100}" value="${value}" 
                 oninput="${fieldId}_value.value=this.value; dynamicUI.updateFieldValue('${typeId}', '${field.id}', this.value)">
          <input type="number" id="${fieldId}_value" min="${field.min || 0}" max="${field.max || 100}" value="${value}" 
                 oninput="${fieldId}_range.value=this.value; dynamicUI.updateFieldValue('${typeId}', '${field.id}', this.value)">
        `;
        break;
        
      case 'currency':
      case 'number':
      default:
        const min = field.min !== undefined ? `min="${field.min}"` : '';
        const max = field.max !== undefined ? `max="${field.max}"` : '';
        inputHtml = `<input type="number" id="${fieldId}" value="${value}" ${min} ${max} 
                           oninput="dynamicUI.updateFieldValue('${typeId}', '${field.id}', this.value)">`;
        break;
    }

    const unit = field.unit ? ` <span class="field-unit">${field.unit}</span>` : '';
    const description = field.description ? `<span class="field-description" title="${field.description}">ℹ️</span>` : '';
    
    return `
      <label class="field-input">
        <span class="field-label">${field.name}:</span>
        ${inputHtml}
        ${unit}
        ${description}
      </label>
    `;
  }

  // Update field value in form data
  updateFieldValue(typeId, fieldId, value) {
    if (!this.formData.has(typeId)) {
      this.formData.set(typeId, {});
    }
    
    const data = this.formData.get(typeId);
    
    // Convert value based on type
    if (typeof value === 'boolean') {
      data[fieldId] = value;
    } else {
      const numValue = parseFloat(value);
      data[fieldId] = isNaN(numValue) ? 0 : numValue;
    }
    
    this.formData.set(typeId, data);
    this.updateCalculations();
  }

  // Calculate a specific project type
  calculateProjectType(typeId) {
    const data = this.formData.get(typeId);
    if (!data) return;

    try {
      const result = window.calculationEngine.registerProjectType(typeId, data);
      this.updateProjectTypeSummary(typeId, result);
    } catch (error) {
      console.error(`Failed to calculate ${typeId}:`, error);
      alert(`Calculation failed: ${error.message}`);
    }
  }

  // Update all calculations for active project types
  updateCalculations() {
    if (this.selectedProjectType) {
      this.calculateProjectType(this.selectedProjectType);
    }
  }

  // Update summary display for a project type
  updateProjectTypeSummary(typeId, result) {
    const summaryElement = document.getElementById(`${typeId}-summary`);
    if (!summaryElement || !result) return;

    const businessCategory = window.BUSINESS_TYPE_CATEGORIES[this.selectedBusinessType];
    
    summaryElement.innerHTML = `
      <h3>Analysis Results</h3>
      <div class="summary-cards">
        <div class="summary-card revenue">
          <h4>Total Revenue</h4>
          <div class="amount">€${result.revenue.annual.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <div class="period">per year</div>
        </div>
        <div class="summary-card costs">
          <h4>Total Costs</h4>
          <div class="amount">€${result.costs.annual.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <div class="period">per year</div>
        </div>
        <div class="summary-card profit ${result.profit >= 0 ? 'positive' : 'negative'}">
          <h4>Net Profit</h4>
          <div class="amount">€${result.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <div class="period">per year</div>
        </div>
        <div class="summary-card roi">
          <h4>ROI</h4>
          <div class="amount">${result.roi.roiPercentage.toFixed(1)}%</div>
          <div class="period">annually</div>
        </div>
        <div class="summary-card payback">
          <h4>Payback Period</h4>
          <div class="amount">${result.roi.paybackYears === Infinity ? '∞' : result.roi.paybackYears}</div>
          <div class="period">${result.roi.paybackYears === 1 ? 'year' : 'years'}</div>
        </div>
      </div>
      
      <div class="business-type-kpis">
        <h4>${businessCategory.name} Key Performance Indicators</h4>
        ${this.generateBusinessTypeKPIs(result, businessCategory)}
      </div>
    `;
  }

  // Generate business type specific KPIs
  generateBusinessTypeKPIs(result, businessCategory) {
    const kpis = [];
    
    // Check both business category ID and specific project type ID for broader compatibility
    const categoryId = businessCategory.id;
    const projectTypeId = result.typeId;
    
    if (categoryId === 'booking' || projectTypeId === 'padel') {
      if (result.breakdown.revenue && result.breakdown.revenue.peak) {
        kpis.push(`<div class="kpi">
          <span class="kpi-label">Peak Utilization Rate:</span>
          <span class="kpi-value">${result.breakdown.revenue.peak.utilization.toFixed(1)}%</span>
        </div>`);
        kpis.push(`<div class="kpi">
          <span class="kpi-label">Total Bookable Hours/Year:</span>
          <span class="kpi-value">${(result.breakdown.revenue.peak.totalHours + result.breakdown.revenue.offPeak.totalHours).toLocaleString()}</span>
        </div>`);
        kpis.push(`<div class="kpi">
          <span class="kpi-label">Revenue per Hour:</span>
          <span class="kpi-value">€${((result.revenue.annual) / (result.breakdown.revenue.peak.utilizedHours + result.breakdown.revenue.offPeak.utilizedHours)).toFixed(2)}</span>
        </div>`);
      }
    } else if (categoryId === 'member' || projectTypeId === 'gym') {
      if (result.breakdown.revenue && result.breakdown.revenue.memberships) {
        const memberships = result.breakdown.revenue.memberships;
        const totalMembers = memberships.weekly.members + memberships.monthly.members + memberships.annual.members;
        kpis.push(`<div class="kpi">
          <span class="kpi-label">Total Members:</span>
          <span class="kpi-value">${totalMembers}</span>
        </div>`);
        kpis.push(`<div class="kpi">
          <span class="kpi-label">Average Revenue per Member:</span>
          <span class="kpi-value">€${(result.revenue.annual / totalMembers).toFixed(2)}/year</span>
        </div>`);
        kpis.push(`<div class="kpi">
          <span class="kpi-label">Monthly Recurring Revenue:</span>
          <span class="kpi-value">€${(result.revenue.annual / 12).toLocaleString()}</span>
        </div>`);
      }
    }
    
    return kpis.length > 0 ? `<div class="kpi-grid">${kpis.join('')}</div>` : '<p>No specific KPIs available for this business type.</p>';
  }

  // Save current scenario
  saveCurrentScenario() {
    if (!this.selectedProjectType) {
      alert('Please select a project type first');
      return;
    }
    
    const name = prompt('Enter scenario name:');
    if (!name) return;
    
    try {
      const scenarios = JSON.parse(localStorage.getItem('scenarios') || '[]');
      const state = {
        name: name,
        businessType: this.selectedBusinessType,
        projectType: this.selectedProjectType,
        formData: Object.fromEntries(this.formData),
        timestamp: Date.now()
      };
      
      scenarios.push(state);
      localStorage.setItem('scenarios', JSON.stringify(scenarios));
      alert(`Scenario "${name}" saved successfully`);
    } catch (error) {
      alert(`Failed to save scenario: ${error.message}`);
    }
  }

  // Create custom template
  createCustomTemplate() {
    const name = prompt('Enter name for your custom business template:');
    if (!name) return;

    try {
      const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const baseTemplate = window.projectTypeManager.getProjectType('generic');
      
      const customConfig = JSON.parse(JSON.stringify(baseTemplate)); // Deep clone
      customConfig.id = id;
      customConfig.name = name;
      customConfig.description = `Custom ${name} business based on ${this.selectedBusinessType} category`;
      customConfig.businessType = this.selectedBusinessType;
      
      window.projectTypeManager.setProjectType(id, customConfig);
      
      // Refresh project type selector
      this.showProjectTypeSelector();
      
      // Auto-select the new template
      setTimeout(() => this.selectProjectType(id), 100);
      
      alert(`Created custom template: ${name}`);
    } catch (error) {
      alert(`Failed to create custom template: ${error.message}`);
    }
  }

  // Helper method to get revenue model description
  getRevenueModelDescription(model) {
    const descriptions = {
      'time-based': 'Revenue generated by booking time slots or sessions',
      'subscription': 'Recurring revenue from membership fees or subscriptions',
      'event-tickets': 'Revenue from event ticket sales and attendance',
      'commission': 'Revenue from commissions on transactions or referrals',
      'product-sales': 'Revenue from selling physical or digital products',
      'hourly-project': 'Revenue from hourly billing or project-based fees',
      'tuition-fees': 'Revenue from educational fees and course enrollments',
      'rental-income': 'Revenue from renting out assets or properties',
      'mixed': 'Multiple revenue streams combined'
    };
    return descriptions[model] || 'Custom revenue model';
  }

  // Helper method to format characteristics
  formatCharacteristic(char) {
    const formats = {
      'time_slots': 'Time slot management',
      'capacity_utilization': 'Capacity utilization optimization',
      'peak_pricing': 'Peak and off-peak pricing',
      'scheduling': 'Scheduling and booking systems',
      'recurring_revenue': 'Recurring revenue management',
      'member_tiers': 'Membership tier optimization',
      'retention': 'Customer retention strategies',
      'growth_rate': 'Growth rate tracking'
    };
    return formats[char] || char.replace(/_/g, ' ');
  }
}

// Global dynamic UI instance
window.dynamicUI = new DynamicUIGenerator();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DynamicUIGenerator };
}