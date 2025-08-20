document.addEventListener('DOMContentLoaded', function() {
  // -------------------- Date/Week Utilities --------------------
  
  // Global configuration for base year used in week label parsing
  let userSpecifiedBaseYear = null;
  
  /**
   * Parse date from column header text
   * Supports formats like "Sat 28/06/2025", "28/06/2025", "28 Jun 2025", etc.
   */
  function parseColumnDate(headerText) {
    if (!headerText || typeof headerText !== 'string') return null;
    
    const text = headerText.toString().trim();
    
    // Pattern 1: DD/MM/YYYY or DD/MM/YY
    let match = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (match) {
      let [, day, month, year] = match;
      if (year.length === 2) year = '20' + year;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // Pattern 2: DD-MM-YYYY or DD-MM-YY  
    match = text.match(/(\d{1,2})-(\d{1,2})-(\d{2,4})/);
    if (match) {
      let [, day, month, year] = match;
      if (year.length === 2) year = '20' + year;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // Pattern 3: DD MMM YYYY (e.g., "28 Jun 2025")
    const months = {
      jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
      apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
      aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9,
      nov: 10, november: 10, dec: 11, december: 11
    };
    
    match = text.match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/i);
    if (match) {
      const [, day, monthStr, year] = match;
      const monthIndex = months[monthStr.toLowerCase()];
      if (monthIndex !== undefined) {
        return new Date(parseInt(year), monthIndex, parseInt(day));
      }
    }
    
    return null;
  }
  
  /**
   * Parse week number from column header text
   * Supports formats like "Week 26", "Wk 26", "W26", etc.
   */
  function parseColumnWeekNumber(headerText) {
    if (!headerText || typeof headerText !== 'string') return null;
    
    const text = headerText.toString().trim();
    
    // Pattern: Week N, Wk N, W N, WN
    const match = text.match(/(?:week|wk|w)\s*(\d{1,2})/i);
    if (match) {
      const weekNum = parseInt(match[1]);
      return weekNum >= 1 && weekNum <= 53 ? weekNum : null;
    }
    
    return null;
  }
  
  /**
   * Calculate ISO week number and year for a given date
   */
  function getISOWeek(date) {
    if (!date || !(date instanceof Date) || isNaN(date)) return null;
    
    // Copy date to avoid mutation
    const d = new Date(date.getTime());
    
    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday = 7
    const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
    d.setDate(d.getDate() + 4 - dayOfWeek);
    
    // Get first day of year
    const yearStart = new Date(d.getFullYear(), 0, 1);
    
    // Calculate full weeks to nearest Thursday
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    
    return {
      year: d.getFullYear(),
      week: weekNo
    };
  }
  
  /**
   * Map any date to the canonical week index based on week start dates
   * This ensures consistent mapping regardless of input method
   */
  function mapDateToWeekIndex(inputDate, weekStartDates) {
    if (!inputDate || !weekStartDates || weekStartDates.length === 0) {
      return 0; // Default to first week if no mapping available
    }
    
    const targetDate = new Date(inputDate);
    let closestWeekIdx = 0;
    let closestDiff = Math.abs(weekStartDates[0] - targetDate);
    
    // Find the week with the closest start date
    for (let i = 1; i < weekStartDates.length; i++) {
      const diff = Math.abs(weekStartDates[i] - targetDate);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestWeekIdx = i;
      }
    }
    
    return closestWeekIdx;
  }

  /**
   * Map week label to canonical week index  
   * This ensures consistent mapping for dropdown selections
   */
  function mapWeekLabelToIndex(weekLabel, weekLabels) {
    if (!weekLabel || !weekLabels || weekLabels.length === 0) {
      return 0; // Default to first week
    }
    
    const weekIdx = weekLabels.indexOf(weekLabel);
    return weekIdx === -1 ? 0 : weekIdx;
  }

  /**
   * Helper function to convert ISO year and week to a date
   */
  function getDateFromISOWeek(year, week) {
    // Find the Thursday of the given week (as ISO weeks are based on Thursday)
    const jan4 = new Date(year, 0, 4); // January 4th is always in week 1
    const jan4Day = jan4.getDay() || 7; // Make Sunday = 7
    const jan4Thursday = new Date(jan4);
    jan4Thursday.setDate(jan4.getDate() - jan4Day + 4); // Move to Thursday of week 1
    
    // Calculate the target week's Thursday
    const targetThursday = new Date(jan4Thursday);
    targetThursday.setDate(jan4Thursday.getDate() + (week - 1) * 7);
    
    // Move to Monday of that week (start of the week)
    const mondayOfWeek = new Date(targetThursday);
    mondayOfWeek.setDate(targetThursday.getDate() - 3);
    
    return mondayOfWeek;
  }

  /**
   * Create a year-week key for grouping (year-week)
   */
  function createYearWeekKey(year, week) {
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }

  /**
   * Parse a year-week key back to components
   */
  function parseYearWeekKey(yearWeekKey) {
    const match = yearWeekKey.match(/^(\d{4})-W(\d{2})$/);
    if (match) {
      return {
        year: parseInt(match[1]),
        week: parseInt(match[2])
      };
    }
    return null;
  }

  /**
   * Parse week label as a real date with enhanced parsing capabilities
   * Supports formats like '1 Jan', '8 Jan', '15 Jan', '1-7 Jan', '6-12 Jan', etc.
   * Returns a Date object with the year from referenceYear if parsing is successful
   */
  function parseWeekLabelAsDate(weekLabel, referenceYear = null) {
    if (!weekLabel || typeof weekLabel !== 'string') return null;
    
    // Use user-specified base year, fallback to current year if not set
    const effectiveYear = referenceYear || userSpecifiedBaseYear || new Date().getFullYear();
    
    const text = weekLabel.toString().trim();
    
    // Common month abbreviations
    const months = {
      jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
      apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
      aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9,
      nov: 10, november: 10, dec: 11, december: 11
    };
    
    // Pattern 1: "1 Jan", "8 Jan", "15 Jan"
    let match = text.match(/^(\d{1,2})\s+([a-z]+)$/i);
    if (match) {
      const [, day, monthStr] = match;
      const monthIndex = months[monthStr.toLowerCase()];
      if (monthIndex !== undefined) {
        return new Date(effectiveYear, monthIndex, parseInt(day));
      }
    }
    
    // Pattern 2: "Jan 1", "Jan 8", "Jan 15" 
    match = text.match(/^([a-z]+)\s+(\d{1,2})$/i);
    if (match) {
      const [, monthStr, day] = match;
      const monthIndex = months[monthStr.toLowerCase()];
      if (monthIndex !== undefined) {
        return new Date(effectiveYear, monthIndex, parseInt(day));
      }
    }
    
    // Pattern 3: "1-7 Jan", "6-12 Jan" (range format - use start date)
    match = text.match(/^(\d{1,2})-\d{1,2}\s+([a-z]+)$/i);
    if (match) {
      const [, day, monthStr] = match;
      const monthIndex = months[monthStr.toLowerCase()];
      if (monthIndex !== undefined) {
        return new Date(effectiveYear, monthIndex, parseInt(day));
      }
    }
    
    // Pattern 4: "1/1", "8/1", "15/1" (day/month)
    match = text.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (match) {
      const [, day, month] = match;
      return new Date(effectiveYear, parseInt(month) - 1, parseInt(day));
    }
    
    // Pattern 5: "Jan 1-7", "Jan 6-12" (month first with range)
    match = text.match(/^([a-z]+)\s+(\d{1,2})-\d{1,2}$/i);
    if (match) {
      const [, monthStr, day] = match;
      const monthIndex = months[monthStr.toLowerCase()];
      if (monthIndex !== undefined) {
        return new Date(effectiveYear, monthIndex, parseInt(day));
      }
    }
    
    // Pattern 6: Full date patterns "28/06/2025", "28-06-2025"
    match = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (match) {
      let [, day, month, year] = match;
      if (year.length === 2) year = '20' + year;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    return null;
  }
  
  /**
   * Enhanced week label parsing with overlap detection
   * Returns {date, isRange, startDay, endDay, monthIndex, hasOverlap}
   */
  function parseWeekLabelWithDetails(weekLabel, referenceYear = null) {
    if (!weekLabel || typeof weekLabel !== 'string') return null;
    
    // Use user-specified base year, fallback to current year if not set
    const effectiveYear = referenceYear || userSpecifiedBaseYear || new Date().getFullYear();
    
    const text = weekLabel.toString().trim();
    const months = {
      jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
      apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
      aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9,
      nov: 10, november: 10, dec: 11, december: 11
    };
    
    // Check for range patterns like "1-7 Jan", "6-12 Jan"
    let match = text.match(/^(\d{1,2})-(\d{1,2})\s+([a-z]+)$/i);
    if (match) {
      const [, startDay, endDay, monthStr] = match;
      const monthIndex = months[monthStr.toLowerCase()];
      if (monthIndex !== undefined) {
        const startDate = new Date(effectiveYear, monthIndex, parseInt(startDay));
        return {
          date: startDate,
          isRange: true,
          startDay: parseInt(startDay),
          endDay: parseInt(endDay),
          monthIndex: monthIndex,
          hasOverlap: false
        };
      }
    }
    
    // Single day patterns
    const basicDate = parseWeekLabelAsDate(weekLabel, referenceYear);
    if (basicDate) {
      return {
        date: basicDate,
        isRange: false,
        startDay: basicDate.getDate(),
        endDay: basicDate.getDate(),
        monthIndex: basicDate.getMonth(),
        hasOverlap: false
      };
    }
    
    return null;
  }
  
  /**
   * Detect overlaps and duplicates in week label sequence
   */
  function detectWeekLabelOverlaps(weekLabels, referenceYear = null) {
    // Use user-specified base year, fallback to current year if not set
    const effectiveYear = referenceYear || userSpecifiedBaseYear || new Date().getFullYear();
    
    const parsedWeeks = [];
    const overlaps = [];
    const duplicates = [];
    
    weekLabels.forEach((label, index) => {
      const parsed = parseWeekLabelWithDetails(label, effectiveYear);
      if (parsed) {
        parsedWeeks.push({...parsed, index, label});
        
        // Check for overlaps with previous weeks
        for (let i = 0; i < parsedWeeks.length - 1; i++) {
          const prev = parsedWeeks[i];
          if (prev.monthIndex === parsed.monthIndex) {
            // Check if date ranges overlap
            if (parsed.isRange && prev.isRange) {
              if (parsed.startDay <= prev.endDay && parsed.endDay >= prev.startDay) {
                overlaps.push({
                  index1: prev.index,
                  index2: index,
                  label1: prev.label,
                  label2: label,
                  overlapDays: Math.min(prev.endDay, parsed.endDay) - Math.max(prev.startDay, parsed.startDay) + 1
                });
              }
            }
          }
        }
        
        // Check for exact duplicates
        const duplicateIndex = parsedWeeks.findIndex((p, i) => 
          i < parsedWeeks.length - 1 && 
          p.date.getTime() === parsed.date.getTime()
        );
        if (duplicateIndex >= 0) {
          duplicates.push({
            index1: duplicateIndex,
            index2: index,
            label1: parsedWeeks[duplicateIndex].label,
            label2: label
          });
        }
      }
    });
    
    return { parsedWeeks, overlaps, duplicates };
  }
  
  /**
   * Group column mappings by calendar week
   */
  function groupColumnsByWeek(columnHeaders, baseYear = 2025) {
    const groups = new Map();
    const ungrouped = [];
    
    columnHeaders.forEach((header, index) => {
      let weekKey = null;
      let parsedDate = null;
      let weekNumber = null;
      
      // Try to parse as date first
      parsedDate = parseColumnDate(header);
      if (parsedDate) {
        const isoWeek = getISOWeek(parsedDate);
        if (isoWeek) {
          weekKey = createWeekKey(isoWeek.year, isoWeek.week);
        }
      }
      
      // Try to parse as week number if date parsing failed
      if (!weekKey) {
        weekNumber = parseColumnWeekNumber(header);
        if (weekNumber) {
          weekKey = createWeekKey(baseYear, weekNumber);
        }
      }
      
      const columnInfo = {
        index,
        header,
        parsedDate,
        weekNumber,
        weekKey
      };
      
      if (weekKey) {
        if (!groups.has(weekKey)) {
          groups.set(weekKey, {
            weekKey,
            year: weekKey.split('-')[0],
            week: parseInt(weekKey.split('-W')[1]),
            columns: [],
            primaryHeader: header // Use first header as primary
          });
        }
        groups.get(weekKey).columns.push(columnInfo);
      } else {
        ungrouped.push(columnInfo);
      }
    });
    
    return {
      groups: Array.from(groups.values()),
      ungrouped
    };
  }

  // -------------------- State --------------------
  let rawData = [];
  let mappedData = [];
  let mappingConfigured = false;
  let config = {
    weekLabelRow: 0,
    weekColStart: 0,
    weekColEnd: 0,
    firstDataRow: 1,
    lastDataRow: 1
  };
  let weekLabels = [];
  let weekCheckboxStates = [];
  let repaymentRows = [];
  let repaymentIdCounter = 0; // Counter for unique repayment IDs
  let openingBalance = 0;
  let loanOutstanding = 0;
  let roiInvestment = 120000;
  let roiInterest = 0.0;

  // Week grouping state (always enabled internally)
  let weekGroups = [];
  let ungroupedColumns = [];
  let userGroupingOverrides = new Map(); // Store user modifications to groupings

  // ROI week/date mapping
  let weekStartDates = [];
  let investmentWeekIndex = 0;

  // --- ROI SUGGESTION STATE ---
  let showSuggestions = false;
  let suggestedRepayments = null;
  let achievedSuggestedIRR = null;
  
  // --- TARGET IRR/NPV SETTINGS ---
  let targetIRR = 0.20; // Default 20%
  let installmentCount = 12; // Default 12 installments
  let liveUpdateEnabled = true;
  
  // --- BUFFER/GAP SETTINGS ---
  let bufferSettings = {
    type: 'none', // none, 2weeks, 1month, 2months, quarter, custom
    customWeeks: 1
  };

  // --- Chart.js chart instances for destroy ---
  let mainChart = null;
  let roiPieChart = null;
  let roiLineChart = null;
  window.tornadoChartObj = null; // global for tornado chart
  let summaryChart = null;

  // -------------------- Tabs & UI Interactions --------------------
  function setupTabs() {
    // Remove any existing event listeners by cloning and replacing tab buttons
    document.querySelectorAll('.tabs button').forEach(btn => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
    });
    
    // Setup main tab navigation with enhanced functionality
    document.querySelectorAll('.tabs button').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Hide any open modals/overlays when switching tabs
        hideAllModals();
        
        // Update tab button states and ARIA attributes
        document.querySelectorAll('.tabs button').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        this.classList.add('active');
        this.setAttribute('aria-selected', 'true');
        
        // Update tab content panels
        document.querySelectorAll('.tab-content').forEach(sec => {
          sec.classList.remove('active');
          sec.setAttribute('aria-hidden', 'true');
          sec.setAttribute('tabindex', '-1');
        });
        
        var tabId = btn.getAttribute('data-tab');
        var panel = document.getElementById(tabId);
        if (panel) {
          panel.classList.add('active');
          panel.setAttribute('aria-hidden', 'false');
          panel.setAttribute('tabindex', '0');
          panel.focus(); // Set focus for accessibility
        }
        
        // Update content after a small delay to ensure DOM is ready
        // Only run VISTA logic for VISTA tab
        setTimeout(() => {
          if (tabId === 'pnl') { // Only for VISTA tab
            updateAllTabs();
          }
        }, 50);
      });
    });
    
    // Setup subtab navigation with enhanced functionality
    document.querySelectorAll('.subtabs button').forEach(btn => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
    });
    
    document.querySelectorAll('.subtabs button').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Find the parent tab content to limit scope
        const parentTab = this.closest('.tab-content');
        if (parentTab) {
          // Only affect subtabs within the same parent tab
          parentTab.querySelectorAll('.subtabs button').forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
          });
          this.classList.add('active');
          this.setAttribute('aria-selected', 'true');
          
          parentTab.querySelectorAll('.subtab-panel').forEach(sec => {
            sec.classList.remove('active');
            sec.setAttribute('aria-hidden', 'true');
          });
          
          var subtabId = 'subtab-' + btn.getAttribute('data-subtab');
          var subpanel = document.getElementById(subtabId);
          if (subpanel) {
            subpanel.classList.add('active');
            subpanel.setAttribute('aria-hidden', 'false');
          }
        }
        // Only run VISTA logic if we're in the VISTA tab
        setTimeout(() => {
          const activeMainTab = document.querySelector('.tabs button[data-tab].active');
          if (activeMainTab && activeMainTab.getAttribute('data-tab') === 'pnl') {
            updateAllTabs();
          }
        }, 50);
      });
    });
    
    // Setup collapsible sections
    document.querySelectorAll('.collapsible-header').forEach(btn => {
      btn.addEventListener('click', function() {
        var content = btn.nextElementSibling;
        var caret = btn.querySelector('.caret');
        if (content && content.classList.contains('active')) {
          content.classList.remove('active');
          if (caret) caret.style.transform = 'rotate(-90deg)';
        } else if (content) {
          content.classList.add('active');
          if (caret) caret.style.transform = 'none';
        }
      });
    });
  }
  
  // Helper function to hide all modals/overlays when switching tabs
  function hideAllModals() {
    const modals = ['helpModal', 'targetIrrModal', 'bufferModal'];
    modals.forEach(modalId => {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.style.display = 'none';
      }
    });
  }
  setupTabs();
  setupTargetIrrModal();
  setupBufferModal();
  setupHelpModal();

  // -------------------- Help Modal Setup --------------------
  function setupHelpModal() {
    const helpBtn = document.getElementById('helpBtn');
    const helpModal = document.getElementById('helpModal');
    const closeHelpModal = document.getElementById('closeHelpModal');
    const closeHelpModalBtn = document.getElementById('closeHelpModalBtn');
    
    if (!helpBtn || !helpModal) return;
    
    // Open help modal
    helpBtn.addEventListener('click', function() {
      helpModal.style.display = 'flex';
    });
    
    // Close help modal
    function closeModal() {
      helpModal.style.display = 'none';
    }
    
    if (closeHelpModal) closeHelpModal.addEventListener('click', closeModal);
    if (closeHelpModalBtn) closeHelpModalBtn.addEventListener('click', closeModal);
    
    // Click outside modal to close
    helpModal.addEventListener('click', function(e) {
      if (e.target === helpModal) closeModal();
    });
    
    // ESC key to close
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && helpModal.style.display === 'flex') {
        closeModal();
      }
    });
  }

  /**
   * Check if week labels contain explicit years or need a base year
   */
  function needsBaseYear(weekLabels) {
    if (!weekLabels || weekLabels.length === 0) return false;
    
    return weekLabels.some(label => {
      if (!label || typeof label !== 'string') return false;
      const text = label.toString().trim();
      
      // Check if label contains explicit year (4 digits)
      const hasExplicitYear = /\d{4}/.test(text);
      
      // Check if it's a parseable date-like label (month names, day patterns)
      const isDateLike = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(text) ||
                        /^\d{1,2}[-\/]\d{1,2}$/.test(text) ||
                        /^\d{1,2}-\d{1,2}\s+\w+/.test(text);
      
      // Needs base year if it looks like a date but has no explicit year
      return isDateLike && !hasExplicitYear;
    });
  }

  /**
   * Validate base year input - must be 4-digit year between 2023-2100
   */
  function validateBaseYear(yearValue) {
    const year = parseInt(yearValue);
    if (isNaN(year)) {
      return { valid: false, error: 'Please enter a valid year' };
    }
    if (year < 2023 || year > 2100) {
      return { valid: false, error: 'Year must be between 2023 and 2100' };
    }
    if (yearValue.toString().length !== 4) {
      return { valid: false, error: 'Please enter a 4-digit year' };
    }
    return { valid: true, year: year };
  }

  /**
   * Show/hide year validation error message
   */
  function showYearValidationError(message, inputElement) {
    // Remove existing error
    const existingError = document.getElementById('yearValidationError');
    if (existingError) existingError.remove();
    
    if (message) {
      const errorDiv = document.createElement('div');
      errorDiv.id = 'yearValidationError';
      errorDiv.style.cssText = 'color: #d32f2f; font-size: 0.9em; margin-top: 4px; margin-bottom: 8px;';
      errorDiv.textContent = '⚠️ ' + message;
      inputElement.parentNode.insertBefore(errorDiv, inputElement.nextSibling);
      inputElement.style.borderColor = '#d32f2f';
    } else {
      inputElement.style.borderColor = '';
    }
  }
  
  /**
   * Create and show date preview table
   */
  function showDatePreview(weekLabels, baseYear) {
    if (!weekLabels || weekLabels.length === 0) return;
    
    const previewDiv = document.getElementById('datePreviewTable');
    if (!previewDiv) return;
    
    previewDiv.innerHTML = '';
    
    // Header with clear year indication
    const headerDiv = document.createElement('div');
    headerDiv.style.cssText = 'background: #e3f2fd; padding: 12px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #1976d2;';
    headerDiv.innerHTML = `
      <h4 style="margin: 0 0 8px 0; color: #1976d2;">📅 Date Mapping Preview</h4>
      <div style="font-size: 0.95em; margin-bottom: 6px;">
        <strong>Base Year:</strong> <span style="color: #1976d2; font-weight: bold;">${baseYear}</span> 
        (applied to week labels without explicit years)
      </div>
      <div style="font-size: 0.9em; color: #1565c0;">
        All downstream calculations (ROI, IRR, NPV) will use these mapped dates.
      </div>
    `;
    previewDiv.appendChild(headerDiv);
    
    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    table.style.marginBottom = '15px';
    
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5;">Week Label</th><th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5;">Mapped Date</th><th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5;">Week Range</th><th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5;">Status</th>';
    table.appendChild(headerRow);
    
    let successCount = 0;
    let ambiguousCount = 0;
    
    weekLabels.slice(0, 10).forEach((label, index) => { // Show first 10 for preview
      const row = document.createElement('tr');
      const parsedDate = parseWeekLabelAsDate(label, baseYear);
      
      let dateStr = 'Not parsed';
      let weekRange = '';
      let status = '❌ Failed';
      let statusColor = '#ff6b6b';
      
      if (parsedDate) {
        dateStr = parsedDate.toLocaleDateString('en-GB');
        // Calculate week range (e.g., "3-9 Jan 2023")
        const weekStart = new Date(parsedDate);
        const weekEnd = new Date(parsedDate);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        const formatOptions = { day: 'numeric', month: 'short' };
        weekRange = `${weekStart.toLocaleDateString('en-GB', formatOptions)} - ${weekEnd.toLocaleDateString('en-GB', formatOptions)}`;
        
        status = '✅ Mapped';
        statusColor = '#28a745';
        successCount++;
      } else {
        ambiguousCount++;
      }
      
      row.innerHTML = `
        <td style="border: 1px solid #ddd; padding: 8px; font-weight: 500;">${label}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${dateStr}</td>
        <td style="border: 1px solid #ddd; padding: 8px; font-size: 0.9em; color: #666;">${weekRange}</td>
        <td style="border: 1px solid #ddd; padding: 8px; color: ${statusColor}; font-weight: 500;">${status}</td>
      `;
      table.appendChild(row);
    });
    
    previewDiv.appendChild(table);
    
    // Summary and warnings
    const summaryDiv = document.createElement('div');
    summaryDiv.style.cssText = 'margin-top: 10px; font-size: 0.9em;';
    
    if (weekLabels.length > 10) {
      summaryDiv.innerHTML += `<div style="color: #666; margin-bottom: 8px;">Showing first 10 of ${weekLabels.length} week labels</div>`;
    }
    
    summaryDiv.innerHTML += `<div style="margin-bottom: 8px;"><strong>Summary:</strong> ${successCount} successfully mapped, ${ambiguousCount} failed to parse</div>`;
    
    if (ambiguousCount > 0) {
      summaryDiv.innerHTML += `
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 8px; color: #856404;">
          <strong>⚠️ Warning:</strong> ${ambiguousCount} week label(s) could not be parsed. 
          Please ensure labels follow supported formats (e.g., "1 Jan", "Jan 1", "8 Jan") or contain explicit years.
        </div>
      `;
    }
    
    previewDiv.appendChild(summaryDiv);
    previewDiv.style.display = 'block';
  }

  // -------------------- Spreadsheet Upload & Mapping --------------------
  function setupSpreadsheetUpload() {
    var spreadsheetUpload = document.getElementById('spreadsheetUpload');
    if (spreadsheetUpload) {
      spreadsheetUpload.addEventListener('change', function(event) {
        const reader = new FileReader();
        reader.onload = function (e) {
          const dataArr = new Uint8Array(e.target.result);
          const workbook = XLSX.read(dataArr, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          if (!json.length) return;
          rawData = json;
          mappedData = json;
          autoDetectMapping(mappedData);
          mappingConfigured = true; // Sequential mapping is always configured after auto-detection
          
          // Initialize first week date to today if not already set
          if (!window.firstWeekDate) {
            window.firstWeekDate = new Date();
          }
          
          renderMappingPanel(mappedData);
          updateWeekLabels();
          updateAllTabs();
        };
        reader.readAsArrayBuffer(event.target.files[0]);
      });
    }
  }
  setupSpreadsheetUpload();

  function renderBankBalanceTableInMapping(panel) {
    // Create bank balance table to show immediately below mapping panel
    const balanceDiv = document.createElement('div');
    balanceDiv.style.cssText = 'background: #fff3cd; padding: 12px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #ffc107;';
    
    try {
      // Get the data arrays using the same logic as other tabs
      let incomeArr = getIncomeArr(false); // No grouping for direct mapping
      let expenditureArr = getExpenditureArr(false);
      let repaymentArr = getRepaymentArr();
      let rollingArr = getRollingBankBalanceArr(false);
      let weekIdxs = getRawFilteredWeekIndices();
      let rawLabels = getRawWeekLabels();
      
      // Validate we have data to show
      if (!weekIdxs || weekIdxs.length === 0 || !rollingArr || rollingArr.length === 0) {
        balanceDiv.innerHTML = `
          <h5 style="margin: 0 0 8px 0; color: #856404;">💰 Running Bank Balance</h5>
          <div style="font-size: 0.9em; color: #856404;">
            Upload and configure your spreadsheet data to see bank balance preview.
          </div>
        `;
      } else {
        // Create a simple table showing weekly bank balance
        let tableRows = '';
        let minBal = null, minBalWeek = null;
        
        // Show first 10 weeks or all if less
        const displayWeeks = Math.min(10, weekIdxs.length);
        for (let i = 0; i < displayWeeks; i++) {
          const idx = weekIdxs[i];
          const balance = rollingArr[i] || 0;
          const label = rawLabels[idx] || `Week ${idx + 1}`;
          
          if (minBal === null || balance < minBal) {
            minBal = balance;
            minBalWeek = label;
          }
          
          tableRows += `
            <tr${balance < 0 ? ' style="color: #dc3545; font-weight: bold;"' : ''}>
              <td style="padding: 4px 8px; border-bottom: 1px solid #dee2e6;">${label}</td>
              <td style="padding: 4px 8px; border-bottom: 1px solid #dee2e6; text-align: right;">€${Math.round(balance).toLocaleString()}</td>
            </tr>
          `;
        }
        
        balanceDiv.innerHTML = `
          <h5 style="margin: 0 0 8px 0; color: #856404;">💰 Running Bank Balance Preview</h5>
          <div style="font-size: 0.9em; color: #856404; margin-bottom: 8px;">
            Shows your cash position each week based on sequential column mapping
          </div>
          <div style="max-height: 200px; overflow-y: auto;">
            <table style="width: 100%; font-size: 0.9em; background: white; border-radius: 4px;">
              <thead>
                <tr style="background: #f8f9fa;">
                  <th style="padding: 6px 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Week</th>
                  <th style="padding: 6px 8px; text-align: right; border-bottom: 2px solid #dee2e6;">Bank Balance</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
          ${weekIdxs.length > 10 ? `<div style="font-size: 0.85em; color: #856404; margin-top: 8px;">... and ${weekIdxs.length - 10} more weeks. View complete analysis in Weekly Cashflow Charts tab.</div>` : ''}
          ${minBal !== null && minBal < 0 ? `<div style="font-size: 0.9em; color: #dc3545; margin-top: 8px; font-weight: bold;">⚠️ Lowest Balance: ${minBalWeek}: €${Math.round(minBal).toLocaleString()}</div>` : ''}
        `;
      }
    } catch (error) {
      // Fallback if data isn't available yet
      balanceDiv.innerHTML = `
        <h5 style="margin: 0 0 8px 0; color: #856404;">💰 Running Bank Balance</h5>
        <div style="font-size: 0.9em; color: #856404;">
          Configure your spreadsheet mapping to see bank balance preview.
        </div>
      `;
    }
    
    panel.appendChild(balanceDiv);
  }

  /**
   * Update date mapping preview (placeholder for compatibility)
   */
  function updateDateMappingPreview() {
    // This function provides compatibility for date mapping preview
    // In the current implementation, we use sequential week mapping
    // so detailed date mapping preview is not necessary
    console.log('Date mapping preview updated - using sequential column mapping');
  }

  /**
   * Render bank balance table in the mapping panel for immediate feedback
   */
  function renderBankBalanceTableInMapping(panel) {
    if (!weekLabels || weekLabels.length === 0 || !mappingConfigured) return;
    
    const balanceDiv = document.createElement('div');
    balanceDiv.style.cssText = 'background: #fff3cd; padding: 16px; border-radius: 8px; margin-bottom: 16px; border-left: 4px solid #ffc107;';
    
    // Calculate running bank balance for preview
    const incomeArr = getIncomeArr();
    const expenditureArr = getExpenditureArr();
    const repaymentArr = getRepaymentArr();
    const rollingBalance = getRollingBankBalanceArr();
    
    if (rollingBalance.length === 0) {
      balanceDiv.innerHTML = `
        <h5 style="margin: 0 0 8px 0; color: #856404;">
          <i class="icon">💰</i> Week Mapping & Bank Balance Preview
        </h5>
        <p style="margin: 0; color: #856404;">Configure your data mapping to see week-by-week bank balance projections.</p>
      `;
      panel.appendChild(balanceDiv);
      return;
    }
    
    // Create summary statistics
    const totalIncome = incomeArr.reduce((sum, val) => sum + (val || 0), 0);
    const totalExpenditure = expenditureArr.reduce((sum, val) => sum + (val || 0), 0);
    const totalRepayments = repaymentArr.reduce((sum, val) => sum + (val || 0), 0);
    const finalBalance = rollingBalance[rollingBalance.length - 1] || 0;
    const lowestBalance = Math.min(...rollingBalance);
    const lowestWeek = rollingBalance.findIndex(bal => bal === lowestBalance) + 1;
    
    balanceDiv.innerHTML = `
      <h5 style="margin: 0 0 12px 0; color: #856404;">
        <i class="icon">💰</i> Week Mapping & Bank Balance Preview
      </h5>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 16px;">
        <div style="background: white; padding: 8px; border-radius: 4px; text-align: center;">
          <div style="font-size: 0.8em; color: #856404; font-weight: 500;">WEEKS MAPPED</div>
          <div style="font-size: 1.2em; font-weight: bold; color: #1976d2;">${weekLabels.length}</div>
        </div>
        <div style="background: white; padding: 8px; border-radius: 4px; text-align: center;">
          <div style="font-size: 0.8em; color: #856404; font-weight: 500;">FINAL BALANCE</div>
          <div style="font-size: 1.2em; font-weight: bold; color: ${finalBalance >= 0 ? '#4caf50' : '#f44336'};">€${Math.round(finalBalance).toLocaleString()}</div>
        </div>
        <div style="background: white; padding: 8px; border-radius: 4px; text-align: center;">
          <div style="font-size: 0.8em; color: #856404; font-weight: 500;">LOWEST BALANCE</div>
          <div style="font-size: 1.2em; font-weight: bold; color: ${lowestBalance >= 0 ? '#4caf50' : '#f44336'};">€${Math.round(lowestBalance).toLocaleString()}</div>
        </div>
        <div style="background: white; padding: 8px; border-radius: 4px; text-align: center;">
          <div style="font-size: 0.8em; color: #856404; font-weight: 500;">NET CASHFLOW</div>
          <div style="font-size: 1.2em; font-weight: bold; color: ${(totalIncome - totalExpenditure - totalRepayments) >= 0 ? '#4caf50' : '#f44336'};">€${Math.round(totalIncome - totalExpenditure - totalRepayments).toLocaleString()}</div>
        </div>
      </div>
      
      <div style="background: white; border-radius: 6px; padding: 12px; max-height: 200px; overflow-y: auto;">
        <h6 style="margin: 0 0 8px 0; color: #495057;">Weekly Balance Progression</h6>
        <div style="font-size: 0.85em; color: #6c757d; margin-bottom: 8px;">
          Shows bank balance at the end of each week based on your sequential column mapping
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 4px; font-size: 0.8em;">
          ${rollingBalance.slice(0, 12).map((balance, index) => `
            <div style="padding: 4px 6px; background: ${balance >= 0 ? '#e8f5e8' : '#ffebee'}; border-radius: 3px; text-align: center;">
              <strong>W${index + 1}:</strong><br>€${Math.round(balance).toLocaleString()}
            </div>
          `).join('')}
          ${rollingBalance.length > 12 ? `
            <div style="padding: 4px 6px; color: #6c757d; border-radius: 3px; text-align: center;">
              ... ${rollingBalance.length - 12} more weeks
            </div>
          ` : ''}
        </div>
        ${lowestBalance < 0 ? `
          <div style="margin-top: 8px; padding: 6px; background: #ffebee; border-radius: 4px; color: #c62828; font-size: 0.85em;">
            ⚠️ <strong>Cash Flow Warning:</strong> Lowest balance of €${Math.round(lowestBalance).toLocaleString()} occurs in Week ${lowestWeek}
          </div>
        ` : ''}
      </div>
    `;
    
    panel.appendChild(balanceDiv);
  }

  function renderMappingPanel(allRows) {
    const panel = document.getElementById('mappingPanel');
    if (!panel) return;
    panel.innerHTML = '';

    // Streamlined workflow: Upload -> Auto-detect -> Simple column mapping
    
    // Step 1: Auto-detected mapping summary (always visible)
    const mappingSummaryDiv = document.createElement('div');
    mappingSummaryDiv.style.cssText = 'background: #e8f5e8; padding: 12px; border-radius: 6px; margin-bottom: 16px; border-left: 4px solid #4caf50;';
    
    // Determine mapping type and create appropriate summary
    let mappingType = 'sequential';
    let parsedDateCount = 0;
    let totalColumns = weekLabels ? weekLabels.length : 0;
    
    if (window.weekGroupMapping && window.weekGroupMapping.length > 0) {
      parsedDateCount = window.weekGroupMapping.filter(group => group.parsedDate).length;
      if (parsedDateCount > 0) {
        mappingType = parsedDateCount === totalColumns ? 'chronological' : 'hybrid';
      }
    }
    
    let summaryHTML = '';
    if (mappingType === 'chronological') {
      summaryHTML = `
        <h4 style="margin: 0 0 8px 0; color: #2e7d32;">✅ Week Columns Mapped in Chronological Order</h4>
        <div style="font-size: 0.9em; margin-bottom: 6px;">
          <strong>Chronological Mapping:</strong> ${totalColumns} columns sorted by parsed dates |
          <strong>Data Rows:</strong> ${config.firstDataRow + 1} to ${config.lastDataRow + 1}
        </div>
        <div style="font-size: 0.85em; color: #2e7d32;">
          All calculations use sequential column mapping based on original spreadsheet order.
        </div>
      `;
    } else if (mappingType === 'hybrid') {
      summaryHTML = `
        <h4 style="margin: 0 0 8px 0; color: #ff9800;">⚠️ Week Columns Mapped with Mixed Chronological Order</h4>
        <div style="font-size: 0.9em; margin-bottom: 6px;">
          <strong>Sequential Mapping:</strong> ${totalColumns} columns mapped in original order |
          <strong>Data Rows:</strong> ${config.firstDataRow + 1} to ${config.lastDataRow + 1}
        </div>
        <div style="font-size: 0.85em; color: #ff6f00;">
          All calculations use sequential column mapping based on original spreadsheet order.
        </div>
      `;
    } else {
      summaryHTML = `
        <h4 style="margin: 0 0 8px 0; color: #2196f3;">📋 Week Columns Mapped in Sequential Order</h4>
        <div style="font-size: 0.9em; margin-bottom: 6px;">
          <strong>Sequential Mapping:</strong> ${totalColumns} columns mapped as Week 1, Week 2, Week 3, etc. |
          <strong>Data Rows:</strong> ${config.firstDataRow + 1} to ${config.lastDataRow + 1}
        </div>
        <div style="font-size: 0.85em; color: #1976d2;">
          Column headers could not be parsed as dates. Using column-based sequential mapping as fallback.
        </div>
      `;
    }
    
    mappingSummaryDiv.innerHTML = summaryHTML;
    panel.appendChild(mappingSummaryDiv);

    // Step 2: Essential inputs (always visible)
    const essentialDiv = document.createElement('div');
    essentialDiv.style.cssText = 'margin-bottom: 16px;';
    
    // Opening balance input
    const obDiv = document.createElement('div');
    obDiv.style.cssText = 'margin-bottom: 12px;';
    obDiv.innerHTML = `
      <label for="openingBalanceInput" style="font-weight: bold; margin-right: 8px;">Opening Balance:</label>
      <input type="number" id="openingBalanceInput" value="${openingBalance}" 
             style="width:120px; padding: 4px 8px; border: 1px solid #ccc; border-radius: 4px;" 
             placeholder="0">
      <span style="margin-left: 8px; font-size: 0.9em; color: #666;">Starting bank balance</span>
    `;
    essentialDiv.appendChild(obDiv);
    
    // Note: Removed "First Week Date (Optional)" input for clarity and simplicity
    // All calculations now use pure sequential week mapping based on column order
    panel.appendChild(essentialDiv);

    // Step 3: Column mapping preview (always visible when available)
    if (weekLabels && weekLabels.length > 0) {
      const previewDiv = document.createElement('div');
      previewDiv.style.cssText = 'background: #f8f9fa; padding: 12px; border-radius: 6px; margin-bottom: 16px; border-left: 4px solid #6c757d;';
      
      // Create enhanced preview showing dates and original positions
      let previewHTML = `<h5 style="margin: 0 0 8px 0; color: #495057;">📋 Column Mapping Preview (${mappingType === 'chronological' ? 'Sorted by Date' : mappingType === 'hybrid' ? 'Partially Sorted by Date' : 'Sequential Order'})</h5>`;
      
      previewHTML += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; font-size: 0.9em;">';
      
      weekLabels.slice(0, 8).forEach((label, index) => {
        let extraInfo = '';
        let bgColor = 'white';
        
        // Add date and original position info if available
        if (window.weekGroupMapping && window.weekGroupMapping[index]) {
          const group = window.weekGroupMapping[index];
          if (group.parsedDate) {
            extraInfo = `<br><small style="color: #666;">📅 ${group.parsedDate.toLocaleDateString('en-GB')}</small>`;
            bgColor = '#e8f5e8'; // Light green for parsed dates
          }
          if (group.originalIndex !== undefined && group.originalIndex !== index) {
            extraInfo += `<br><small style="color: #999;">📊 Originally column ${group.originalIndex + 1}</small>`;
            bgColor = '#fff3cd'; // Light yellow for reordered columns
          }
        }
        
        previewHTML += `
          <div style="padding: 6px 8px; background: ${bgColor}; border-radius: 4px; border: 1px solid #dee2e6;">
            <strong>Week ${index + 1}:</strong> ${label}${extraInfo}
          </div>
        `;
      });
      
      if (weekLabels.length > 8) {
        previewHTML += `<div style="padding: 4px 8px; color: #6c757d;">... and ${weekLabels.length - 8} more weeks</div>`;
      }
      
      previewHTML += '</div>';
      
      // Add legend for color coding
      if (mappingType !== 'sequential') {
        previewHTML += `
          <div style="margin-top: 8px; font-size: 0.8em; color: #666;">
            <span style="background: #e8f5e8; padding: 2px 4px; border-radius: 2px; margin-right: 8px;">📅 Chronologically sorted</span>
            <span style="background: #fff3cd; padding: 2px 4px; border-radius: 2px;">📊 Reordered from original position</span>
          </div>
        `;
      }
      
      previewDiv.innerHTML = previewHTML;
      panel.appendChild(previewDiv);
    }

    // Step 3.5: Running Bank Balance Table (immediately below mapping preview)
    if (weekLabels && weekLabels.length > 0) {
      renderBankBalanceTableInMapping(panel);
    }

    // Step 4: Advanced options (collapsible, collapsed by default)
    const advancedDiv = document.createElement('div');
    advancedDiv.style.cssText = 'margin-top: 20px; border-top: 1px solid #e0e0e0; padding-top: 16px;';
    
    const advancedBtn = document.createElement('button');
    advancedBtn.type = 'button';
    advancedBtn.innerHTML = `<span class="caret" style="margin-right: 6px;">▶</span>Advanced Mapping Options`;
    advancedBtn.style.cssText = 'background: none; border: none; color: #6c757d; font-weight: bold; cursor: pointer; font-size: 0.9em; padding: 8px 0;';
    
    const advancedContent = document.createElement('div');
    advancedContent.style.display = 'none';
    advancedContent.style.cssText = 'margin-top: 12px; padding: 16px; background: #f8f9fa; border-radius: 6px; border: 1px solid #e9ecef;';

    // Advanced mapping controls
    function drop(label, id, max, sel, onChange, items) {
      let lab = document.createElement('label');
      lab.textContent = label;
      lab.style.cssText = 'display: block; margin-bottom: 8px; font-weight: 500;';
      let selElem = document.createElement('select');
      selElem.className = 'mapping-dropdown';
      selElem.style.cssText = 'margin-left: 8px; padding: 4px 8px; border: 1px solid #ccc; border-radius: 4px;';
      for (let i = 0; i < max; i++) {
        let opt = document.createElement('option');
        opt.value = i;
        let textVal = items && items[i] ? items[i] : (allRows[i] ? allRows[i].slice(0,8).join(',').slice(0,32) : '');
        opt.textContent = `${id==='row'?'Row':'Col'} ${i+1}: ${textVal}`;
        selElem.appendChild(opt);
      }
      selElem.value = sel;
      selElem.onchange = function() { onChange(parseInt(this.value,10)); };
      lab.appendChild(selElem);
      advancedContent.appendChild(lab);
    }

    drop('Which row contains week labels? ', 'row', Math.min(allRows.length, 30), config.weekLabelRow, v => { config.weekLabelRow = v; updateWeekLabels(); renderMappingPanel(allRows); updateAllTabs(); });
    
    let weekRow = allRows[config.weekLabelRow] || [];
    drop('First week column: ', 'col', weekRow.length, config.weekColStart, v => { config.weekColStart = v; updateWeekLabels(); renderMappingPanel(allRows); updateAllTabs(); }, weekRow);
    drop('Last week column: ', 'col', weekRow.length, config.weekColEnd, v => { config.weekColEnd = v; updateWeekLabels(); renderMappingPanel(allRows); updateAllTabs(); }, weekRow);
    
    drop('First data row: ', 'row', allRows.length, config.firstDataRow, v => { config.firstDataRow = v; renderMappingPanel(allRows); updateAllTabs(); });
    drop('Last data row: ', 'row', allRows.length, config.lastDataRow, v => { config.lastDataRow = v; renderMappingPanel(allRows); updateAllTabs(); });

    // Advanced week filter
    if (weekLabels.length) {
      const weekFilterTitle = document.createElement('h5');
      weekFilterTitle.textContent = 'Week Column Filter';
      weekFilterTitle.style.cssText = 'margin: 16px 0 8px 0; color: #333;';
      advancedContent.appendChild(weekFilterTitle);
      
      const weekFilterDiv = document.createElement('div');
      
      // Quick buttons
      const selectAllBtn = document.createElement('button');
      selectAllBtn.textContent = "Select All";
      selectAllBtn.type = 'button';
      selectAllBtn.style.cssText = 'margin-right: 8px; padding: 4px 12px; border: 1px solid #ccc; border-radius: 4px; background: white; cursor: pointer;';
      selectAllBtn.onclick = function() {
        weekCheckboxStates = weekCheckboxStates.map(()=>true);
        updateAllTabs();
        renderMappingPanel(allRows);
      };
      
      const deselectAllBtn = document.createElement('button');
      deselectAllBtn.textContent = "Deselect All";
      deselectAllBtn.type = 'button';
      deselectAllBtn.style.cssText = 'margin-right: 8px; padding: 4px 12px; border: 1px solid #ccc; border-radius: 4px; background: white; cursor: pointer;';
      deselectAllBtn.onclick = function() {
        weekCheckboxStates = weekCheckboxStates.map(()=>false);
        updateAllTabs();
        renderMappingPanel(allRows);
      };
      
      weekFilterDiv.appendChild(selectAllBtn);
      weekFilterDiv.appendChild(deselectAllBtn);
      
      // Checkbox group
      const groupDiv = document.createElement('div');
      groupDiv.style.cssText = 'margin-top: 8px; display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px;';
      weekLabels.forEach((label, idx) => {
        const checkboxDiv = document.createElement('div');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = weekCheckboxStates[idx] !== false;
        cb.id = 'weekcol_cb_' + idx;
        cb.onchange = function() {
          weekCheckboxStates[idx] = cb.checked;
          updateAllTabs();
          renderMappingPanel(allRows);
        };
        const lab = document.createElement('label');
        lab.htmlFor = cb.id;
        lab.textContent = label;
        lab.style.cssText = 'margin-left: 4px; font-size: 0.9em;';
        checkboxDiv.appendChild(cb);
        checkboxDiv.appendChild(lab);
        groupDiv.appendChild(checkboxDiv);
      });
      weekFilterDiv.appendChild(groupDiv);
      advancedContent.appendChild(weekFilterDiv);
    }

    // Reset button in advanced section
    const resetBtn = document.createElement('button');
    resetBtn.textContent = "Reset All Mapping";
    resetBtn.style.cssText = 'margin-top: 16px; padding: 6px 14px; background: #ff9800; color: white; border: none; border-radius: 4px; cursor: pointer;';
    resetBtn.onclick = function() {
      autoDetectMapping(allRows);
      weekCheckboxStates = weekLabels.map(()=>true);
      openingBalance = 0;
      userGroupingOverrides.clear();
      userSpecifiedBaseYear = null;
      window.firstWeekDate = new Date();
      renderMappingPanel(allRows);
      updateWeekLabels();
      updateAllTabs();
    };
    advancedContent.appendChild(resetBtn);

    // Advanced toggle functionality
    advancedBtn.addEventListener('click', function() {
      const isOpen = advancedContent.style.display !== 'none';
      advancedContent.style.display = isOpen ? 'none' : 'block';
      const caret = advancedBtn.querySelector('.caret');
      if (caret) {
        caret.textContent = isOpen ? '▶' : '▼';
      }
      advancedBtn.innerHTML = `<span class="caret" style="margin-right: 6px;">${isOpen ? '▶' : '▼'}</span>${isOpen ? 'Advanced Mapping Options' : 'Hide Advanced Options'}`;
    });

    advancedDiv.appendChild(advancedBtn);
    advancedDiv.appendChild(advancedContent);
    panel.appendChild(advancedDiv);
    
    // Setup event listeners after DOM is ready
    setTimeout(() => {
      // Opening balance input handler
      const obInput = document.getElementById('openingBalanceInput');
      if (obInput) {
        obInput.addEventListener('input', function() {
          openingBalance = parseFloat(obInput.value) || 0;
          updateAllTabs();
        });
      }
      
      // Note: Base year input handlers removed - using pure sequential week mapping
      
    }, 0);
  }

  function autoDetectMapping(sheet) {
    for (let r = 0; r < Math.min(sheet.length, 10); r++) {
      for (let c = 0; c < Math.min(sheet[r].length, 30); c++) {
        const val = (sheet[r][c] || '').toString().toLowerCase();
        
        // Enhanced detection patterns for week/date columns
        const isWeekPattern = /week\s*\d+/.test(val) || /week\s*\d+\/\d+/.test(val);
        const isDateRange = /\d{1,2}-\d{1,2}\s+[a-z]{3}/.test(val); // e.g., "3-9 Jan"
        const isDateSlash = /^\d{1,2}\/\d{1,2}/.test(val); // e.g., "28/06"
        const isMonthDate = /\d{1,2}\s+[a-z]{3}/.test(val); // e.g., "28 Jun"
        
        if (isWeekPattern || isDateRange || isDateSlash || isMonthDate) {
          config.weekLabelRow = r;
          config.weekColStart = c;
          let lastCol = c;
          
          // Find all consecutive columns that could be week/date columns
          while (lastCol < sheet[r].length) {
            const cellVal = (sheet[r][lastCol] || '').toString().trim();
            
            // Stop if we hit an empty cell or a cell that clearly isn't a week/date
            if (!cellVal) {
              break;
            }
            
            const cellValLower = cellVal.toLowerCase();
            const hasWeek = cellValLower.indexOf('week') >= 0;
            const hasDateRange = /\d{1,2}-\d{1,2}\s+[a-z]{3}/.test(cellValLower);
            const hasDateSlash = /^\d{1,2}\/\d{1,2}/.test(cellVal);
            const hasMonthDate = /\d{1,2}\s+[a-z]{3}/.test(cellValLower);
            const hasDate = /\d/.test(cellVal); // Contains any digit, likely a date/week
            
            // If this column matches any date/week pattern, include it
            if (hasWeek || hasDateRange || hasDateSlash || hasMonthDate || hasDate) {
              lastCol++;
            } else {
              // Check if it's a typical non-week header (like "Category", "Total", etc.)
              const isNonWeekHeader = /^(category|total|sum|description|item|type|name)$/i.test(cellVal);
              if (isNonWeekHeader) {
                break;
              }
              // For any other text, include it as it might be a week label
              lastCol++;
            }
          }
          
          config.weekColEnd = lastCol - 1;
          config.firstDataRow = r + 1;
          config.lastDataRow = sheet.length-1;
          return;
        }
      }
    }
    
    // Improved fallback logic - try to find the first row with multiple columns
    for (let r = 0; r < Math.min(sheet.length, 10); r++) {
      if (sheet[r] && sheet[r].length > 2) {
        // Look for a row that seems to have week/date data
        let hasDateLikeContent = false;
        let weekColStart = 1; // Start from column 1, assuming column 0 is labels
        
        // Check if columns after the first contain date-like or numeric content
        for (let c = 1; c < sheet[r].length; c++) {
          const val = (sheet[r][c] || '').toString();
          if (/\d/.test(val) || /[a-z]{3}/i.test(val)) {
            hasDateLikeContent = true;
            break;
          }
        }
        
        if (hasDateLikeContent) {
          config.weekLabelRow = r;
          config.weekColStart = weekColStart;
          config.weekColEnd = sheet[r].length - 1; // Include all columns with data
          config.firstDataRow = r + 1;
          config.lastDataRow = sheet.length - 1;
          return;
        }
      }
    }
    
    // Final fallback - use original logic but with first row
    const headerRow = sheet[0] || [];
    config.weekLabelRow = 0;
    config.weekColStart = 1; // Start from column 1, assuming column 0 is labels
    config.weekColEnd = Math.max(1, headerRow.length - 1);
    config.firstDataRow = 1;
    config.lastDataRow = sheet.length - 1;
  }

  function extractWeekStartDates(weekLabels, baseYear) {
    let currentYear = baseYear;
    let lastMonthIdx = -1;
    const months = [
      "jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"
    ];
    return weekLabels.map(label => {
      let match = label.match(/(\d{1,2})\s*([A-Za-z]{3,})/);
      if (!match) return null;
      let [_, day, monthStr] = match;
      let monthIdx = months.findIndex(m =>
        monthStr.toLowerCase().startsWith(m)
      );
      if (monthIdx === -1) return null;
      if (lastMonthIdx !== -1 && monthIdx < lastMonthIdx) currentYear++;
      lastMonthIdx = monthIdx;
      let date = new Date(currentYear, monthIdx, parseInt(day, 10));
      return date;
    });
  }

  function calculateSequentialWeekDates(firstWeekDate, weekCount) {
    const dates = [];
    for (let i = 0; i < weekCount; i++) {
      const weekDate = new Date(firstWeekDate);
      weekDate.setDate(firstWeekDate.getDate() + (7 * i));
      dates.push(weekDate);
    }
    return dates;
  }

  function populateInvestmentWeekDropdown() {
    const dropdown = document.getElementById('investmentWeek');
    if (!dropdown) return;
    dropdown.innerHTML = '';
    weekLabels.forEach((label, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      // Show only week number/label, no date association for clarity
      opt.textContent = label || `Week ${i + 1}`;
      dropdown.appendChild(opt);
    });
    dropdown.value = investmentWeekIndex;
  }

  function updateWeekLabels() {
    let weekRow = mappedData[config.weekLabelRow] || [];
    let rawHeaders = weekRow.slice(config.weekColStart, config.weekColEnd+1).map(x => x || '');
    
    if (rawHeaders.length > 0) {
      // Sequential week mapping: Use original column order (no chronological sorting)
      weekLabels = rawHeaders;
      
      // Calculate sequential week dates for fallback purposes only
      const baseYear = userSpecifiedBaseYear || new Date().getFullYear();
      weekStartDates = rawHeaders.map((header, index) => {
        // Try to parse date from header, but don't sort by it
        let parsedDate = parseColumnDate(header) || parseWeekLabelAsDate(header, baseYear);
        // If no date can be parsed, use sequential fallback
        if (!parsedDate) {
          const startDate = new Date(baseYear, 0, 1);
          parsedDate = new Date(startDate);
          parsedDate.setDate(startDate.getDate() + (index * 7));
        }
        return parsedDate;
      });
      
      // Create sequential week groups (maintaining original column order)
      const sequentialGroups = rawHeaders.map((header, index) => ({
        weekKey: `week-${index + 1}`,
        year: weekStartDates[index] ? weekStartDates[index].getFullYear() : null,
        week: index + 1,
        originalIndex: index, // Same as index since no reordering
        columns: [{
          index: index, // Sequential index
          originalIndex: index, // Same as index since no reordering
          header: header,
          parsedDate: weekStartDates[index],
          weekNumber: index + 1,
          weekKey: `week-${index + 1}`
        }],
        primaryHeader: header,
        parsedDate: weekStartDates[index],
        sortKey: index // Use original order for sorting
      }));
      
      // Store sequential mapping for all calculations
      weekGroups = sequentialGroups;
      ungroupedColumns = [];
      window.weekGroupMapping = sequentialGroups;
      
    } else {
      // No data available
      weekLabels = rawHeaders;
      weekGroups = [];
      ungroupedColumns = [];
      window.weekGroupMapping = null;
      weekStartDates = [];
    }
    
    window.weekLabels = weekLabels; // make global for charts
    if (!weekCheckboxStates || weekCheckboxStates.length !== weekLabels.length) {
      weekCheckboxStates = weekLabels.map(() => true);
    }
    populateYearWeekDropdowns(weekLabels);
    populateInvestmentWeekDropdown();
    
    // Update date mapping preview (optional)
    updateDateMappingPreview();
  }

  /**
   * Parse dates from week column headers and sort chronologically
   * Returns array of column mappings sorted by date, with fallbacks for unparseable headers
   */
  function parseAndSortWeekColumns(rawHeaders) {
    const currentYear = new Date().getFullYear();
    const baseYear = userSpecifiedBaseYear || currentYear;
    
    // Step 1: Parse dates from each header
    const columnMappings = rawHeaders.map((header, originalIndex) => {
      let parsedDate = null;
      let sortKey = null;
      
      // Try multiple parsing methods in order of preference
      
      // Method 1: parseColumnDate (supports DD/MM/YYYY, DD-MM-YYYY, DD MMM YYYY)
      parsedDate = parseColumnDate(header);
      
      // Method 2: parseWeekLabelAsDate (supports "1 Jan", "Jan 1", "1/1")
      if (!parsedDate) {
        parsedDate = parseWeekLabelAsDate(header, baseYear);
      }
      
      // Method 3: Try to extract week number and convert to date
      if (!parsedDate) {
        const weekNumber = parseColumnWeekNumber(header);
        if (weekNumber && weekNumber >= 1 && weekNumber <= 53) {
          parsedDate = getDateFromISOWeek(baseYear, weekNumber);
        }
      }
      
      // Create sort key for chronological ordering
      if (parsedDate) {
        sortKey = parsedDate.getTime(); // Use timestamp for precise sorting
      } else {
        // For unparseable headers, use original order with a far future timestamp
        // This ensures they sort after all parseable dates but maintain relative order
        sortKey = new Date(2099, 11, 31).getTime() + originalIndex;
      }
      
      // Calculate fallback date for columns that couldn't be parsed
      const fallbackDate = calculateFallbackDate(originalIndex, baseYear);
      
      return {
        originalIndex,
        header,
        parsedDate,
        fallbackDate,
        sortKey,
        isParsed: !!parsedDate
      };
    });
    
    // Step 2: Sort by chronological order (parsed dates first, then unparseable in original order)
    columnMappings.sort((a, b) => a.sortKey - b.sortKey);
    
    // Step 3: Validate sorted order and detect issues
    const parseSuccessCount = columnMappings.filter(m => m.isParsed).length;
    const totalColumns = columnMappings.length;
    
    // Log parsing results for debugging
    console.log(`[Week Mapping] Parsed ${parseSuccessCount}/${totalColumns} column headers as dates`);
    
    if (parseSuccessCount === 0) {
      console.warn('[Week Mapping] No dates could be parsed from headers. Using sequential fallback mapping.');
    } else if (parseSuccessCount < totalColumns) {
      console.warn(`[Week Mapping] ${totalColumns - parseSuccessCount} headers could not be parsed as dates. These will use fallback dates.`);
    }
    
    return columnMappings;
  }
  
  /**
   * Calculate fallback date for columns that couldn't be parsed as dates
   */
  function calculateFallbackDate(columnIndex, baseYear) {
    // Start from January 1st of base year and add 7 days per column
    const startDate = new Date(baseYear, 0, 1);
    const fallbackDate = new Date(startDate);
    fallbackDate.setDate(startDate.getDate() + (columnIndex * 7));
    return fallbackDate;
  }
  
  /**
   * Calculate sequential week dates for column-based mapping
   * DEPRECATED: This function is now largely obsolete as dates are parsed directly 
   * from column headers in updateWeekLabels(). Kept for compatibility.
   */
  function calculateSequentialWeekDates(weekLabels) {
    console.warn('[calculateSequentialWeekDates] This function is deprecated. Dates should be calculated in updateWeekLabels().');
    
    const dates = [];
    
    // Determine starting date - prioritize user inputs
    let startDate;
    
    // Check if investment start date is provided
    const investmentStartDateInput = document.getElementById('investmentStartDate');
    if (investmentStartDateInput && investmentStartDateInput.value) {
      startDate = new Date(investmentStartDateInput.value);
    } else if (userSpecifiedBaseYear) {
      // If user provided a base year, start from January 1st of that year
      startDate = new Date(userSpecifiedBaseYear, 0, 1);
    } else if (window.firstWeekDate) {
      // Use user-specified first week date if available
      startDate = new Date(window.firstWeekDate);
    } else {
      // Default to current date
      startDate = new Date();
    }
    
    // Generate sequential dates (7 days apart) for each column
    weekLabels.forEach((label, index) => {
      const weekDate = new Date(startDate);
      weekDate.setDate(startDate.getDate() + (7 * index));
      dates.push(weekDate);
    });
    
    return dates;
  }

  /**
   * Calculate week start dates directly from spreadsheet column labels
   * Uses enhanced parsing with overlap detection and proper handling
   * DEPRECATED: Kept for compatibility but not used in sequential mapping mode
   */
  function calculateWeekStartDatesFromLabels(weekLabels) {
    // Use user-specified base year, fallback to current year if not set
    const effectiveYear = userSpecifiedBaseYear || new Date().getFullYear();
    const dates = [];
    const analysisResult = detectWeekLabelOverlaps(weekLabels, effectiveYear);
    
    // Store overlap information for warnings
    window.weekLabelOverlaps = analysisResult.overlaps;
    window.weekLabelDuplicates = analysisResult.duplicates;
    
    let fallbackDate = new Date(); // Use today as fallback starting point
    let lastValidDate = null;
    
    weekLabels.forEach((label, index) => {
      let calculatedDate = null;
      
      // Try to parse the label as a date
      const parsedDate = parseWeekLabelAsDate(label, effectiveYear);
      if (parsedDate) {
        calculatedDate = parsedDate;
        lastValidDate = parsedDate;
      } else {
        // If we can't parse the label, use sequential 7-day increments from last valid date
        if (lastValidDate) {
          calculatedDate = new Date(lastValidDate);
          calculatedDate.setDate(lastValidDate.getDate() + 7);
          lastValidDate = calculatedDate;
        } else {
          // No valid date found yet, use fallback
          calculatedDate = new Date(fallbackDate);
          calculatedDate.setDate(fallbackDate.getDate() + (index * 7));
          if (index === 0) {
            lastValidDate = calculatedDate;
          }
        }
      }
      
      dates.push(calculatedDate);
    });
    
    return dates;
  }
  
  function applyUserGroupingOverrides() {
    // Apply any user-defined grouping modifications
    userGroupingOverrides.forEach((override, key) => {
      // Implementation for user overrides can be added here
      // For now, we'll use the auto-detected groupings
    });
  }

  function getFilteredWeekIndices() {
    if (weekCheckboxStates && weekCheckboxStates.length > 0) {
      return weekCheckboxStates.map((checked, idx) => checked ? idx : null).filter(idx => idx !== null);
    } else {
      // When no mapping is configured, return all week indices up to 52 weeks
      return Array.from({length: 52}, (_, i) => i);
    }
  }

  // -------------------- Calculation Helpers --------------------
  function getIncomeArr(useGrouping = false) {
    if (!mappedData || !mappingConfigured) return [];
    
    let arr = [];
    const groupMapping = window.weekGroupMapping;
    
    if (groupMapping && useGrouping) {
      // Use grouped columns (only for ROI tab)
      for (let g = 0; g < groupMapping.length; g++) {
        if (!weekCheckboxStates[g]) continue;
        
        const group = groupMapping[g];
        let groupSum = 0;
        
        // Aggregate values from all columns in this group
        group.columns.forEach(col => {
          // Use originalIndex to access the correct column in the original spreadsheet data
          const absCol = config.weekColStart + (col.originalIndex !== undefined ? col.originalIndex : col.index);
          for (let r = config.firstDataRow; r <= config.lastDataRow; r++) {
            let val = mappedData[r][absCol];
            if (typeof val === "string") val = val.replace(/,/g, '').replace(/€|\s/g,'');
            let num = parseFloat(val);
            if (!isNaN(num) && num > 0) groupSum += num;
          }
        });
        
        arr[g] = groupSum;
      }
    } else {
      // Use sorted week mapping for individual columns (Weekly Cashflow, P&L tabs)
      for (let w = 0; w < weekLabels.length; w++) {
        if (weekCheckboxStates && !weekCheckboxStates[w]) continue;
        
        let sum = 0;
        
        // Get the original column index for this sorted week
        const group = groupMapping && groupMapping[w];
        const originalIndex = group && group.originalIndex !== undefined ? group.originalIndex : w;
        const absCol = config.weekColStart + originalIndex;
        
        for (let r = config.firstDataRow; r <= config.lastDataRow; r++) {
          let val = mappedData[r][absCol];
          if (typeof val === "string") val = val.replace(/,/g, '').replace(/€|\s/g,'');
          let num = parseFloat(val);
          if (!isNaN(num) && num > 0) sum += num;
        }
        arr[w] = sum;
      }
    }
    return arr;
  }
  
  function getExpenditureArr(useGrouping = false) {
    if (!mappedData || !mappingConfigured) return [];
    
    let arr = [];
    const groupMapping = window.weekGroupMapping;
    
    if (groupMapping && useGrouping) {
      // Use grouped columns (only for ROI tab)
      for (let g = 0; g < groupMapping.length; g++) {
        if (!weekCheckboxStates[g]) continue;
        
        const group = groupMapping[g];
        let groupSum = 0;
        
        // Aggregate values from all columns in this group
        group.columns.forEach(col => {
          // Use originalIndex to access the correct column in the original spreadsheet data
          const absCol = config.weekColStart + (col.originalIndex !== undefined ? col.originalIndex : col.index);
          for (let r = config.firstDataRow; r <= config.lastDataRow; r++) {
            let val = mappedData[r][absCol];
            if (typeof val === "string") val = val.replace(/,/g, '').replace(/€|\s/g,'');
            let num = parseFloat(val);
            if (!isNaN(num) && num < 0) groupSum += Math.abs(num);
          }
        });
        
        arr[g] = groupSum;
      }
    } else {
      // Use sorted week mapping for individual columns (Weekly Cashflow, P&L tabs)
      for (let w = 0; w < weekLabels.length; w++) {
        if (weekCheckboxStates && !weekCheckboxStates[w]) continue;
        
        let sum = 0;
        
        // Get the original column index for this sorted week
        const group = groupMapping && groupMapping[w];
        const originalIndex = group && group.originalIndex !== undefined ? group.originalIndex : w;
        const absCol = config.weekColStart + originalIndex;
        
        for (let r = config.firstDataRow; r <= config.lastDataRow; r++) {
          let val = mappedData[r][absCol];
          if (typeof val === "string") val = val.replace(/,/g, '').replace(/€|\s/g,'');
          let num = parseFloat(val);
          if (!isNaN(num) && num < 0) sum += Math.abs(num);
        }
        arr[w] = sum;
      }
    }
    return arr;
  }
  function getRepaymentArr() {
    // Always rebuild fresh from current repaymentRows state - no caching
    console.log('[DEBUG] getRepaymentArr: Building fresh repayment array from current state');
    console.log('[DEBUG] Current repaymentRows:', JSON.parse(JSON.stringify(repaymentRows)));
    
    // If no mapping is configured, use default week labels for repayment calculations
    let actualWeekLabels = weekLabels && weekLabels.length > 0 ? weekLabels : Array.from({length: 52}, (_, i) => `Week ${i + 1}`);
    let actualWeekStartDates = weekStartDates && weekStartDates.length > 0 ? weekStartDates : Array.from({length: 52}, (_, i) => new Date(2025, 0, 1 + i * 7));
    let arr = Array(actualWeekLabels.length).fill(0);
    
    repaymentRows.forEach(r => {
      let canonicalWeekIdx = 0;
      
      // NEW: Prioritize explicit weekIndex (our new approach)
      if (r.weekIndex !== undefined && r.weekIndex !== null) {
        canonicalWeekIdx = r.weekIndex;
        console.log('[DEBUG] New weekIndex repayment: weekIndex', r.weekIndex, '-> week index:', canonicalWeekIdx);
      }
      // Handle legacy date-based repayments (for backward compatibility)
      else if (r.date) {
        // Convert date string to Date object and map to week index
        const repaymentDate = new Date(r.date);
        if (!isNaN(repaymentDate)) {
          canonicalWeekIdx = mapDateToWeekIndex(repaymentDate, actualWeekStartDates);
          console.log('[DEBUG] Legacy date repayment:', r.date, '-> week index:', canonicalWeekIdx);
        }
      } else if (r.type === "week") {
        // Legacy week repayment type
        canonicalWeekIdx = mapWeekLabelToIndex(r.week, actualWeekLabels);
        console.log('[DEBUG] Week repayment:', r.week, '-> week index:', canonicalWeekIdx);
      } else if (r.type === "unified") {
        // Legacy unified repayment type with both date and week info
        canonicalWeekIdx = r.weekIndex;
        console.log('[DEBUG] Unified repayment:', r.explicitDate, '-> week:', r.weekLabel, '-> week index:', canonicalWeekIdx);
      } else if (r.type === "date" && r.explicitDate) {
        // Legacy date repayment type
        canonicalWeekIdx = mapDateToWeekIndex(r.explicitDate, actualWeekStartDates);
        console.log('[DEBUG] Legacy date repayment:', r.explicitDate, '-> week index:', canonicalWeekIdx);
      } else if (r.type === "frequency") {
        // Handle frequency-based repayments (legacy)
        if (r.frequency === "monthly") {
          let perMonth = Math.ceil(arr.length/12);
          for (let m=0; m<12; m++) {
            for (let w=m*perMonth; w<(m+1)*perMonth && w<arr.length; w++) arr[w] += r.amount;
          }
          return; // Skip the single week assignment below
        }
        if (r.frequency === "quarterly") {
          let perQuarter = Math.ceil(arr.length/4);
          for (let q=0;q<4;q++) {
            for (let w=q*perQuarter; w<(q+1)*perQuarter && w<arr.length; w++) arr[w] += r.amount;
          }
          return; // Skip the single week assignment below
        }
        if (r.frequency === "one-off") { 
          canonicalWeekIdx = 0; 
        }
      }
      
      // Add repayment to the canonical week index
      if (canonicalWeekIdx >= 0 && canonicalWeekIdx < arr.length) {
        arr[canonicalWeekIdx] += r.amount;
      }
    });
    
    let finalResult;
    // If mapping is configured, return filtered results. Otherwise, return all results.
    if (mappingConfigured && weekLabels.length > 0) {
      finalResult = getFilteredWeekIndices().map(idx => arr[idx]);
    } else {
      // Return all weeks when no mapping is configured
      finalResult = arr;
    }
    
    console.log('[DEBUG] getRepaymentArr: Final repayment array:', finalResult);
    console.log('[DEBUG] getRepaymentArr: Non-zero repayments:', finalResult.map((val, idx) => val > 0 ? {week: idx, amount: val} : null).filter(x => x));
    return finalResult;
  }
  
  // Helper functions to get raw (ungrouped) data for Weekly Cashflow and P&L tabs
  function getRawWeekLabels() {
    if (!mappedData || !mappingConfigured) return [];
    let weekRow = mappedData[config.weekLabelRow] || [];
    return weekRow.slice(config.weekColStart, config.weekColEnd+1).map(x => x || '');
  }
  
  function getRawFilteredWeekIndices() {
    const rawLabels = getRawWeekLabels();
    if (weekCheckboxStates && weekCheckboxStates.length > 0) {
      // Map grouped indices back to raw indices (grouping is always internal)
      if (window.weekGroupMapping) {
        const rawIndices = [];
        window.weekGroupMapping.forEach((group, groupIndex) => {
          if (weekCheckboxStates[groupIndex]) {
            group.columns.forEach(col => {
              rawIndices.push(col.index);
            });
          }
        });
        return rawIndices.sort((a, b) => a - b);
      } else {
        // Direct mapping when no grouping mapping available
        return weekCheckboxStates.map((checked, idx) => checked ? idx : null).filter(idx => idx !== null);
      }
    } else {
      return Array.from({length: rawLabels.length}, (_, i) => i);
    }
  }
  
  
  // New function to get explicit repayment dates and amounts for NPV/IRR calculations
  function getExplicitRepaymentSchedule() {
    let schedule = [];
    let actualWeekLabels = weekLabels && weekLabels.length > 0 ? weekLabels : Array.from({length: 52}, (_, i) => `Week ${i + 1}`);
    let actualWeekStartDates = weekStartDates && weekStartDates.length > 0 ? weekStartDates : Array.from({length: 52}, (_, i) => new Date(2025, 0, 1 + i * 7));
    
    repaymentRows.forEach(r => {
      let date, amount = r.amount;
      
      if (r.type === "week") {
        // Legacy week repayment type
        let canonicalWeekIdx = mapWeekLabelToIndex(r.week, actualWeekLabels);
        date = actualWeekStartDates[canonicalWeekIdx] || new Date(2025, 0, 1 + canonicalWeekIdx * 7);
        schedule.push({ date, amount, weekIndex: canonicalWeekIdx });
      } else if (r.type === "unified") {
        // New unified repayment type - use the stored date and weekIndex
        date = new Date(r.explicitDate);
        schedule.push({ date, amount, weekIndex: r.weekIndex });
      } else if (r.type === "date" && r.explicitDate) {
        // Use the explicit date directly
        date = new Date(r.explicitDate);
        schedule.push({ date, amount });
      } else {
        // Handle frequency-based repayments with calculated dates
        if (r.frequency === "monthly") {
          let perMonth = Math.ceil(actualWeekLabels.length/12);
          for (let m=0; m<12; m++) {
            let weekIdx = m * perMonth;
            if (weekIdx < actualWeekStartDates.length) {
              date = actualWeekStartDates[weekIdx] || new Date(2025, 0, 1 + weekIdx * 7);
              schedule.push({ date, amount });
            }
          }
        }
        if (r.frequency === "quarterly") {
          let perQuarter = Math.ceil(actualWeekLabels.length/4);
          for (let q=0;q<4;q++) {
            let weekIdx = q * perQuarter;
            if (weekIdx < actualWeekStartDates.length) {
              date = actualWeekStartDates[weekIdx] || new Date(2025, 0, 1 + weekIdx * 7);
              schedule.push({ date, amount });
            }
          }
        }
        if (r.frequency === "one-off") { 
          date = actualWeekStartDates[0] || new Date(2025, 0, 1);
          schedule.push({ date, amount });
        }
      }
    });
    
    // Sort by date to handle back-dating properly
    schedule.sort((a, b) => a.date - b.date);
    
    return schedule;
  }
  
  // Make function globally accessible for ROI calculations
  window.getExplicitRepaymentSchedule = getExplicitRepaymentSchedule;
  function getNetProfitArr(incomeArr, expenditureArr, repaymentArr) {
    return incomeArr.map((inc, i) => (inc || 0) - (expenditureArr[i] || 0) - (repaymentArr[i] || 0));
  }
  function getRollingBankBalanceArr(useGrouping = false) {
    console.log('[DEBUG] getRollingBankBalanceArr: Starting calculation with useGrouping =', useGrouping);
    let incomeArr = getIncomeArr(useGrouping);
    let expenditureArr = getExpenditureArr(useGrouping);
    let repaymentArr = getRepaymentArr(); // This will rebuild fresh from current state
    console.log('[DEBUG] getRollingBankBalanceArr: Got repayment array length:', repaymentArr.length);
    console.log('[DEBUG] getRollingBankBalanceArr: Repayment array:', repaymentArr);
    let rolling = [];
    let ob = openingBalance;
    
    if (useGrouping) {
      // For ROI tab with grouping
      getFilteredWeekIndices().forEach((fi, i) => {
        let income = incomeArr[fi] || 0;
        let out = expenditureArr[fi] || 0;
        let repay = repaymentArr[i] || 0;
        let prev = (i === 0 ? ob : rolling[i-1]);
        rolling[i] = prev + income - out - repay;
      });
    } else {
      // For Weekly Cashflow and P&L tabs with direct mapping
      getRawFilteredWeekIndices().forEach((fi, i) => {
        let income = incomeArr[fi] || 0;
        let out = expenditureArr[fi] || 0;
        let repay = repaymentArr[i] || 0;
        let prev = (i === 0 ? ob : rolling[i-1]);
        rolling[i] = prev + income - out - repay;
      });
    }
    
    console.log('[DEBUG] getRollingBankBalanceArr: Final rolling balance array:', rolling);
    console.log('[DEBUG] getRollingBankBalanceArr: Negative balances found:', rolling.map((bal, idx) => bal < 0 ? {week: idx, balance: bal} : null).filter(x => x));
    return rolling;
  }

  /**
   * Shared utility to get negative balance weeks using filtered week indices
   * This ensures both warning and P&L table rendering use the same logic
   */
  function getNegativeBalanceWeeks(useGrouping = false) {
    console.log('[DEBUG] getNegativeBalanceWeeks: Starting with useGrouping =', useGrouping);
    const rollingArr = getRollingBankBalanceArr(useGrouping);
    const weekLabels = getRawWeekLabels();
    const weekIndices = getRawFilteredWeekIndices();
    const negativeWeeks = [];
    
    console.log('[DEBUG] getNegativeBalanceWeeks: Week indices:', weekIndices);
    console.log('[DEBUG] getNegativeBalanceWeeks: Rolling array length:', rollingArr.length);
    
    weekIndices.forEach((weekIdx, i) => {
      const balance = rollingArr[i];
      if (balance < 0) {
        const weekLabel = weekLabels[weekIdx] || `Week ${weekIdx + 1}`;
        const negWeek = { week: weekLabel, balance: balance, weekIndex: weekIdx };
        console.log('[DEBUG] getNegativeBalanceWeeks: Found negative balance:', negWeek);
        negativeWeeks.push(negWeek);
      }
    });
    
    console.log('[DEBUG] getNegativeBalanceWeeks: Total negative weeks found:', negativeWeeks.length);
    return negativeWeeks;
  }

  function getMonthAgg(arr, months=12) {
    let filtered = arr.filter((_,i)=>getFilteredWeekIndices().includes(i));
    let perMonth = Math.ceil(filtered.length/months);
    let out = [];
    for(let m=0;m<months;m++) {
      let sum=0;
      for(let w=m*perMonth;w<(m+1)*perMonth && w<filtered.length;w++) sum += filtered[w];
      out.push(sum);
    }
    return out;
  }

  // -------------------- Repayments UI --------------------
  const weekSelect = document.getElementById('weekSelect');
  const repaymentFrequency = document.getElementById('repaymentFrequency');
  function populateYearWeekDropdowns(labels) {
    const yearSelect = document.getElementById('yearSelect');
    const weekSelect = document.getElementById('weekSelect');
    
    if (!yearSelect || !weekSelect) return;
    
    // Clear existing options
    yearSelect.innerHTML = '';
    weekSelect.innerHTML = '';
    
    // Populate year dropdown with a reasonable range
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 2;
    const endYear = currentYear + 5;
    
    // Add default option for year
    const defaultYearOpt = document.createElement('option');
    defaultYearOpt.value = '';
    defaultYearOpt.textContent = 'Select year...';
    yearSelect.appendChild(defaultYearOpt);
    
    for (let year = startYear; year <= endYear; year++) {
      const opt = document.createElement('option');
      opt.value = year;
      opt.textContent = year;
      if (year === currentYear) {
        opt.selected = true;
      }
      yearSelect.appendChild(opt);
    }
    
    // Populate week dropdown (1-53 for ISO weeks)
    const defaultWeekOpt = document.createElement('option');
    defaultWeekOpt.value = '';
    defaultWeekOpt.textContent = 'Select week...';
    weekSelect.appendChild(defaultWeekOpt);
    
    for (let week = 1; week <= 53; week++) {
      const opt = document.createElement('option');
      opt.value = week;
      opt.textContent = `Week ${week}`;
      weekSelect.appendChild(opt);
    }
    
    // If we have mapped week data, also add options based on spreadsheet column labels
    if (labels && labels.length > 0) {
      const separatorOpt = document.createElement('option');
      separatorOpt.disabled = true;
      separatorOpt.textContent = '--- From Spreadsheet ---';
      weekSelect.appendChild(separatorOpt);
      
      labels.forEach((label, index) => {
        const opt = document.createElement('option');
        opt.value = `spreadsheet-${index}`;
        opt.textContent = `${label} (Column ${index + 1})`;
        weekSelect.appendChild(opt);
      });
    }
  }
  
  // Legacy function for backward compatibility
  function populateWeekDropdown(labels) {
    populateYearWeekDropdowns(labels);
  }

  // -------------------- Repayment Management (Modernized) --------------------
  
  // Simplified repayment schedule table management
  function setupRepaymentScheduleTable() {
    const addBtn = document.getElementById('addRepaymentRowBtn');
    const tableBody = document.getElementById('repaymentTableBody');
    const emptyMessage = document.getElementById('emptyTableMessage');
    
    if (!addBtn || !tableBody) return;
    
    // Add new repayment row
    addBtn.addEventListener('click', function() {
      const newRepayment = {
        id: ++repaymentIdCounter,
        weekIndex: 0, // Default to first week
        amount: 0,
        editing: true
      };
      
      repaymentRows.push(newRepayment);
      renderRepaymentTable();
    });
    
    // Initial render
    renderRepaymentTable();
  }
  
  function renderRepaymentTable() {
    const tableBody = document.getElementById('repaymentTableBody');
    const emptyMessage = document.getElementById('emptyTableMessage');
    const table = document.getElementById('repaymentScheduleTable');
    
    if (!tableBody) return;
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    if (repaymentRows.length === 0) {
      // Show empty state
      if (table) table.style.display = 'none';
      if (emptyMessage) emptyMessage.style.display = 'block';
      return;
    }
    
    // Show table and hide empty message
    if (table) table.style.display = 'table';
    if (emptyMessage) emptyMessage.style.display = 'none';
    
    // Render each repayment row
    repaymentRows.forEach((repayment, index) => {
      const row = document.createElement('tr');
      row.innerHTML = createRepaymentRowHTML(repayment, index);
      tableBody.appendChild(row);
      
      // Add event listeners for this row
      attachRepaymentRowListeners(row, repayment, index);
    });
    
    // Update loan summary
    updateLoanSummary();
  }
  
  function createRepaymentRowHTML(repayment, index) {
    if (repayment.editing) {
      // Editing mode - use week dropdown instead of date picker
      const weekOptions = generateWeekDropdownOptions(repayment.weekIndex);
      return `
        <td>
          <select class="repayment-week-select modern-select" 
                  data-field="weekIndex"
                  data-index="${index}">
            ${weekOptions}
          </select>
        </td>
        <td>
          <input type="number" 
                 class="repayment-amount-input modern-input" 
                 value="${repayment.amount || ''}"
                 placeholder="0.00"
                 step="0.01"
                 min="0"
                 data-field="amount"
                 data-index="${index}">
        </td>
        <td>
          <div class="table-actions">
            <button class="btn-table-save modern-btn-primary" data-action="save" data-index="${index}">
              <span class="btn-icon">💾</span> Save
            </button>
            <button class="btn-table-cancel modern-btn-secondary" data-action="cancel" data-index="${index}">
              <span class="btn-icon">❌</span> Cancel
            </button>
          </div>
        </td>
      `;
    } else {
      // Display mode - show week and corresponding date
      const weekDisplay = getWeekDisplayText(repayment.weekIndex);
      const formattedAmount = repayment.amount ? `€${Number(repayment.amount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '€0.00';
      
      return `
        <td>
          <span class="repayment-week-display">${weekDisplay}</span>
        </td>
        <td>
          <span class="repayment-amount-display">${formattedAmount}</span>
        </td>
        <td>
          <div class="table-actions">
            <button class="btn-table-edit modern-btn-outline" data-action="edit" data-index="${index}">
              <span class="btn-icon">✏️</span> Edit
            </button>
            <button class="btn-table-delete modern-btn-danger" data-action="delete" data-index="${index}">
              <span class="btn-icon">🗑️</span> Delete
            </button>
          </div>
        </td>
      `;
    }
  }

  /**
   * Generate dropdown options for week selection
   */
  function generateWeekDropdownOptions(selectedWeekIndex) {
    const availableWeekLabels = weekLabels && weekLabels.length > 0 ? weekLabels : 
      Array.from({length: 52}, (_, i) => `Week ${i + 1}`);
    const availableWeekStartDates = weekStartDates && weekStartDates.length > 0 ? weekStartDates : 
      Array.from({length: 52}, (_, i) => new Date(2025, 0, 1 + i * 7));
    
    let options = '<option value="">Select Week...</option>';
    
    for (let i = 0; i < availableWeekLabels.length; i++) {
      const weekLabel = availableWeekLabels[i] || `Week ${i + 1}`;
      const weekDate = availableWeekStartDates[i];
      const dateStr = weekDate ? weekDate.toLocaleDateString('en-GB') : '';
      const displayText = dateStr ? `${weekLabel} (${dateStr})` : weekLabel;
      const selected = (selectedWeekIndex === i) ? 'selected' : '';
      
      options += `<option value="${i}" ${selected}>${displayText}</option>`;
    }
    
    return options;
  }

  /**
   * Get display text for a week index (for display mode)
   */
  function getWeekDisplayText(weekIndex) {
    if (weekIndex === undefined || weekIndex === null) {
      return 'Not set';
    }
    
    const availableWeekLabels = weekLabels && weekLabels.length > 0 ? weekLabels : 
      Array.from({length: 52}, (_, i) => `Week ${i + 1}`);
    const availableWeekStartDates = weekStartDates && weekStartDates.length > 0 ? weekStartDates : 
      Array.from({length: 52}, (_, i) => new Date(2025, 0, 1 + i * 7));
    
    const weekLabel = availableWeekLabels[weekIndex] || `Week ${weekIndex + 1}`;
    const weekDate = availableWeekStartDates[weekIndex];
    const dateStr = weekDate ? weekDate.toLocaleDateString('en-GB') : '';
    
    return dateStr ? `${weekLabel} (${dateStr})` : weekLabel;
  }
  
  function attachRepaymentRowListeners(row, repayment, index) {
    // Handle button clicks
    const buttons = row.querySelectorAll('button[data-action]');
    buttons.forEach(button => {
      button.addEventListener('click', function() {
        const action = this.getAttribute('data-action');
        const idx = parseInt(this.getAttribute('data-index'));
        
        switch (action) {
          case 'edit':
            editRepaymentRow(idx);
            break;
          case 'save':
            saveRepaymentRow(idx, row);
            break;
          case 'cancel':
            cancelRepaymentEdit(idx);
            break;
          case 'delete':
            deleteRepaymentRow(idx);
            break;
        }
      });
    });
    
    // Handle input changes in edit mode
    if (repayment.editing) {
      const inputs = row.querySelectorAll('input[data-field], select[data-field]');
      inputs.forEach(input => {
        input.addEventListener('change', function() {
          const field = this.getAttribute('data-field');
          const idx = parseInt(this.getAttribute('data-index'));
          
          if (field === 'weekIndex') {
            repaymentRows[idx].weekIndex = parseInt(this.value) || 0;
          } else if (field === 'amount') {
            repaymentRows[idx].amount = parseFloat(this.value) || 0;
          }
        });
      });
    }
  }
  
  function editRepaymentRow(index) {
    repaymentRows[index].editing = true;
    renderRepaymentTable();
  }
  
  function saveRepaymentRow(index, row) {
    const repayment = repaymentRows[index];
    const weekSelect = row.querySelector('select[data-field="weekIndex"]');
    const amountInput = row.querySelector('input[data-field="amount"]');
    
    // Validate inputs
    if (!weekSelect.value) {
      alert('Please select a week for the repayment.');
      return;
    }
    
    if (!amountInput.value || parseFloat(amountInput.value) <= 0) {
      alert('Please enter a valid repayment amount.');
      return;
    }
    
    // Save the values using weekIndex instead of date
    repayment.weekIndex = parseInt(weekSelect.value);
    repayment.amount = parseFloat(amountInput.value);
    repayment.editing = false;
    
    renderRepaymentTable();
    checkRepaymentWarning();
    updateAllTabs();
  }
  
  function cancelRepaymentEdit(index) {
    // If this is a new repayment (no date set), remove it
    if (!repaymentRows[index].date) {
      repaymentRows.splice(index, 1);
    } else {
      // Otherwise just cancel editing
      repaymentRows[index].editing = false;
    }
    
    renderRepaymentTable();
  }
  
  function deleteRepaymentRow(index) {
    if (confirm('Are you sure you want to delete this repayment?')) {
      repaymentRows.splice(index, 1);
      renderRepaymentTable();
      checkRepaymentWarning();
      updateAllTabs();
    }
  }
  setupRepaymentScheduleTable();

  // Setup date picker functionality
  function setupDatePickers() {
    // Investment start date picker
    const investmentStartDate = document.getElementById('investmentStartDate');
    if (investmentStartDate) {
      investmentStartDate.addEventListener('change', function() {
        // Recalculate week start dates when investment start date changes
        if (weekLabels && weekLabels.length > 0) {
          weekStartDates = calculateSequentialWeekDates(weekLabels);
        }
        updateAllTabs();
      });
    }

    // Repayment start date picker  
    const startDatePicker = document.getElementById('startDatePicker');
    if (startDatePicker) {
      startDatePicker.addEventListener('change', function() {
        // This date picker is for reference only in repayment mapping
        // No specific action needed here as it's for user reference
        updateAllTabs();
      });
    }
  }
  setupDatePickers();

  // Function to ensure all calculations use fresh data - clear any potential caching
  function clearCalculationCache() {
    console.log('[DEBUG] clearCalculationCache: Ensuring fresh calculations by clearing any cached state');
    // Note: This project doesn't seem to have explicit caching, but this function ensures 
    // that we're calling functions that rebuild from current state
    
    // Force a fresh rebuild of any arrays that might be cached elsewhere
    // The main arrays are rebuilt from global state each time, but this provides a clear entry point
    // for future caching implementations or to debug stale data issues
  }

  // Function to check for negative bank balance warnings
  function checkRepaymentWarning() {
    console.log('[DEBUG] checkRepaymentWarning: Starting warning calculation');
    
    // Explicitly clear any cached calculation state
    clearCalculationCache();
    
    const warningDiv = document.getElementById('repaymentWarning');
    const warningText = document.getElementById('repaymentWarningText');
    
    if (!warningDiv || !warningText) return;
    
    try {
      // Clear any potential cached data by ensuring fresh calculation
      console.log('[DEBUG] checkRepaymentWarning: Getting fresh negative balance weeks');
      
      // Use shared utility to get negative balance weeks with same filtering as P&L tables
      const negativeWeeks = getNegativeBalanceWeeks(false);
      
      console.log('[DEBUG] checkRepaymentWarning: Found negative balance weeks:', negativeWeeks);
      
      if (negativeWeeks.length > 0) {
        // Get the repayment array being used for transparency
        const repaymentArr = getRepaymentArr();
        const repaymentDebugInfo = repaymentArr.map((amount, idx) => amount > 0 ? `Week ${idx + 1}: €${amount.toFixed(2)}` : null).filter(x => x);
        
        const warningMsg = `The following weeks would have negative bank balances: ${negativeWeeks.map(w => `${w.week} (€${w.balance.toFixed(2)})`).join(', ')}`;
        const debugMsg = repaymentDebugInfo.length > 0 ? `\n\nRepayments being used: ${repaymentDebugInfo.join(', ')}` : '\n\nNo repayments currently configured.';
        
        console.log('[DEBUG] checkRepaymentWarning: Displaying warning:', warningMsg);
        warningText.textContent = warningMsg + debugMsg;
        warningDiv.style.display = 'block';
      } else {
        console.log('[DEBUG] checkRepaymentWarning: No negative balance weeks found, hiding warning');
        warningDiv.style.display = 'none';
      }
    } catch (error) {
      console.error('[DEBUG] checkRepaymentWarning: Error during calculation:', error);
      // Hide warning if calculation fails
      warningDiv.style.display = 'none';
    }
  }



  function updateLoanSummary() {
    const totalRepaid = getRepaymentArr().reduce((a,b)=>a+b,0);
    let totalRepaidBox = document.getElementById('totalRepaidBox');
    let remainingBox = document.getElementById('remainingBox');
    if (totalRepaidBox) totalRepaidBox.textContent = "Total Repaid: €" + totalRepaid.toLocaleString();
    if (remainingBox) remainingBox.textContent = "Remaining: €" + (loanOutstanding-totalRepaid).toLocaleString();
  }
  let loanOutstandingInput = document.getElementById('loanOutstandingInput');
  if (loanOutstandingInput) {
    loanOutstandingInput.oninput = function() {
      loanOutstanding = parseFloat(this.value) || 0;
      updateLoanSummary();
    };
  }

  // -------------------- Main Chart & Summary --------------------
  function updateChartAndSummary() {
    let mainChartElem = document.getElementById('mainChart');
    let mainChartSummaryElem = document.getElementById('mainChartSummary');
    let mainChartNoDataElem = document.getElementById('mainChartNoData');
    if (!mainChartElem || !mainChartSummaryElem || !mainChartNoDataElem) return;

    if (!mappingConfigured || !weekLabels.length || getFilteredWeekIndices().length === 0) {
      if (mainChartNoDataElem) mainChartNoDataElem.style.display = "";
      if (mainChartSummaryElem) mainChartSummaryElem.innerHTML = "";
      if (mainChart && typeof mainChart.destroy === "function") mainChart.destroy();
      return;
    } else {
      if (mainChartNoDataElem) mainChartNoDataElem.style.display = "none";
    }

    // Use ungrouped data for Weekly Cashflow tab (direct spreadsheet mapping)
    const rawLabels = getRawWeekLabels();
    const filteredWeeks = getRawFilteredWeekIndices();
    const labels = filteredWeeks.map(idx => rawLabels[idx] || `Week ${idx + 1}`);
    const incomeArr = getIncomeArr(false); // No grouping for Weekly Cashflow
    const expenditureArr = getExpenditureArr(false); // No grouping for Weekly Cashflow
    const repaymentArr = getRepaymentArr();
    const rollingArr = getRollingBankBalanceArr(false); // No grouping for Weekly Cashflow
    const netProfitArr = getNetProfitArr(incomeArr, expenditureArr, repaymentArr);

    const data = {
      labels: labels,
      datasets: [
        {
          label: "Income",
          data: filteredWeeks.map(idx => incomeArr[idx] || 0),
          backgroundColor: "rgba(76,175,80,0.6)",
          borderColor: "#388e3c",
          fill: false,
          type: "bar"
        },
        {
          label: "Expenditure",
          data: filteredWeeks.map(idx => expenditureArr[idx] || 0),
          backgroundColor: "rgba(244,67,54,0.6)",
          borderColor: "#c62828",
          fill: false,
          type: "bar"
        },
        {
          label: "Repayment",
          data: filteredWeeks.map((_, i) => repaymentArr[i] || 0),
          backgroundColor: "rgba(255,193,7,0.6)",
          borderColor: "#ff9800",
          fill: false,
          type: "bar"
        },
        {
          label: "Net Profit",
          data: filteredWeeks.map((_, i) => netProfitArr[filteredWeeks[i]] || 0),
          backgroundColor: "rgba(33,150,243,0.3)",
          borderColor: "#1976d2",
          type: "line",
          fill: false,
          yAxisID: "y"
        },
        {
          label: "Rolling Bank Balance",
          data: rollingArr,
          backgroundColor: "rgba(156,39,176,0.2)",
          borderColor: "#8e24aa",
          type: "line",
          fill: true,
          yAxisID: "y"
        }
      ]
    };

    if (mainChart && typeof mainChart.destroy === "function") mainChart.destroy();

    // Check if Chart.js is available
    if (typeof Chart !== 'undefined') {
      mainChart = new Chart(mainChartElem.getContext('2d'), {
      type: 'bar',
      data: data,
      options: {
        responsive: true,
        plugins: {
          legend: { display: true },
          tooltip: { mode: "index", intersect: false }
        },
        scales: {
          x: { stacked: true },
          y: {
            beginAtZero: true,
            title: { display: true, text: "€" }
          }
        }
      }
    });
    } else {
      // Chart.js not available, show fallback message
      mainChartElem.innerHTML = '<div style="text-align: center; padding: 20px; color: #666; border: 1px dashed #ccc; border-radius: 4px;">Chart.js library not available<br><small>Main chart cannot be displayed</small></div>';
    }

    let totalIncome = incomeArr.reduce((a,b)=>a+(b||0), 0);
    let totalExpenditure = expenditureArr.reduce((a,b)=>a+(b||0), 0);
    let totalRepayment = repaymentArr.reduce((a,b)=>a+(b||0), 0);
    let finalBalance = rollingArr[rollingArr.length - 1] || 0;
    let lowestBalance = Math.min(...rollingArr);

    mainChartSummaryElem.innerHTML = `
      <b>Total Income:</b> €${Math.round(totalIncome).toLocaleString()}<br>
      <b>Total Expenditure:</b> €${Math.round(totalExpenditure).toLocaleString()}<br>
      <b>Total Repayments:</b> €${Math.round(totalRepayment).toLocaleString()}<br>
      <b>Final Bank Balance:</b> <span style="color:${finalBalance<0?'#c00':'#388e3c'}">€${Math.round(finalBalance).toLocaleString()}</span><br>
      <b>Lowest Bank Balance:</b> <span style="color:${lowestBalance<0?'#c00':'#388e3c'}">€${Math.round(lowestBalance).toLocaleString()}</span>
    `;
  }

  // ---------- P&L Tab Functions ----------
  function renderSectionSummary(headerId, text, arr) {
    const headerElem = document.getElementById(headerId);
    if (!headerElem) return;
    headerElem.innerHTML = text;
  }
  function renderPnlTables() {
  // Weekly Breakdown
  const weeklyTable = document.getElementById('pnlWeeklyBreakdown');
  const monthlyTable = document.getElementById('pnlMonthlyBreakdown');
  const cashFlowTable = document.getElementById('pnlCashFlow');
  const pnlSummary = document.getElementById('pnlSummary');
  if (!weeklyTable || !monthlyTable || !cashFlowTable) return;

  // ---- Weekly table (use ungrouped data for direct P&L mapping) ----
  let tbody = weeklyTable.querySelector('tbody');
  if (tbody) tbody.innerHTML = '';
  
  // Use ungrouped data for P&L tab (direct spreadsheet mapping)
  let incomeArr = getIncomeArr(false); // No grouping for P&L
  let expenditureArr = getExpenditureArr(false); // No grouping for P&L
  let repaymentArr = getRepaymentArr();
  let rollingArr = getRollingBankBalanceArr(false); // No grouping for P&L
  let netArr = getNetProfitArr(incomeArr, expenditureArr, repaymentArr);
  let weekIdxs = getRawFilteredWeekIndices(); // Use raw indices for P&L
  let rawLabels = getRawWeekLabels(); // Use raw labels for P&L
  let rows = '';
  let minBal = null, minBalWeek = null;

  weekIdxs.forEach((idx, i) => {
    const net = (incomeArr[idx] || 0) - (expenditureArr[idx] || 0) - (repaymentArr[i] || 0);
    const netTooltip = `Income - Expenditure - Repayment\n${incomeArr[idx]||0} - ${expenditureArr[idx]||0} - ${repaymentArr[i]||0} = ${net}`;
    const balTooltip = `Prev Bal + Income - Expenditure - Repayment\n${i===0?openingBalance:rollingArr[i-1]} + ${incomeArr[idx]||0} - ${expenditureArr[idx]||0} - ${repaymentArr[i]||0} = ${rollingArr[i]||0}`;
    let row = `<tr${rollingArr[i]<0?' class="negative-balance-row"':''}>` +
      `<td>${rawLabels[idx] || `Week ${idx + 1}`}</td>` +
      `<td${incomeArr[idx]<0?' class="negative-number"':''}>€${Math.round(incomeArr[idx]||0).toLocaleString()}</td>` +
      `<td${expenditureArr[idx]<0?' class="negative-number"':''}>€${Math.round(expenditureArr[idx]||0).toLocaleString()}</td>` +
      `<td${repaymentArr[i]<0?' class="negative-number"':''}>€${Math.round(repaymentArr[i]||0).toLocaleString()}</td>` +
      `<td class="${net<0?'negative-number':''}" data-tooltip="${netTooltip}">€${Math.round(net||0).toLocaleString()}</td>` +
      `<td${rollingArr[i]<0?' class="negative-number"':''} data-tooltip="${balTooltip}">€${Math.round(rollingArr[i]||0).toLocaleString()}</td></tr>`;
    rows += row;
    if (minBal===null||rollingArr[i]<minBal) {minBal=rollingArr[i];minBalWeek=rawLabels[idx];}
  });
  if (tbody) tbody.innerHTML = rows;
  renderSectionSummary('weekly-breakdown-header', `Total Net: €${netArr.reduce((a,b)=>a+(b||0),0).toLocaleString()}`, netArr);

  // ---- Monthly Breakdown ----
  let months = 12;
  let incomeMonth = getMonthAgg(incomeArr, months);
  let expMonth = getMonthAgg(expenditureArr, months);
  let repayMonth = getMonthAgg(repaymentArr, months);
  let netMonth = incomeMonth.map((inc, i) => inc - (expMonth[i]||0) - (repayMonth[i]||0));
  let mtbody = monthlyTable.querySelector('tbody');
  if (mtbody) {
    mtbody.innerHTML = '';
    for (let m=0; m<months; m++) {
      const netTooltip = `Income - Expenditure - Repayment\n${incomeMonth[m]||0} - ${expMonth[m]||0} - ${repayMonth[m]||0} = ${netMonth[m]||0}`;
      mtbody.innerHTML += `<tr>
        <td>Month ${m+1}</td>
        <td${incomeMonth[m]<0?' class="negative-number"':''}>€${Math.round(incomeMonth[m]||0).toLocaleString()}</td>
        <td${expMonth[m]<0?' class="negative-number"':''}>€${Math.round(expMonth[m]||0).toLocaleString()}</td>
        <td class="${netMonth[m]<0?'negative-number':''}" data-tooltip="${netTooltip}">€${Math.round(netMonth[m]||0).toLocaleString()}</td>
        <td${repayMonth[m]<0?' class="negative-number"':''}>€${Math.round(repayMonth[m]||0).toLocaleString()}</td>
      </tr>`;
    }
  }
  renderSectionSummary('monthly-breakdown-header', `Total Net: €${netMonth.reduce((a,b)=>a+(b||0),0).toLocaleString()}`, netMonth);

  // ---- Cash Flow Table ----
  let ctbody = cashFlowTable.querySelector('tbody');
  let closingArr = [];
  if (ctbody) {
    ctbody.innerHTML = '';
    let closing = opening = openingBalance;
    for (let m=0; m<months; m++) {
      let inflow = incomeMonth[m] || 0;
      let outflow = (expMonth[m] || 0) + (repayMonth[m] || 0);
      closing = opening + inflow - outflow;
      closingArr.push(closing);
      const closingTooltip = `Opening + Inflow - Outflow\n${opening} + ${inflow} - ${outflow} = ${closing}`;
      ctbody.innerHTML += `<tr>
        <td>Month ${m+1}</td>
        <td>€${Math.round(opening).toLocaleString()}</td>
        <td>€${Math.round(inflow).toLocaleString()}</td>
        <td>€${Math.round(outflow).toLocaleString()}</td>
        <td${closing<0?' class="negative-number"':''} data-tooltip="${closingTooltip}">€${Math.round(closing).toLocaleString()}</td>
      </tr>`;
      opening = closing;
    }
  }
  renderSectionSummary('cashflow-header', `Closing Bal: €${Math.round(closingArr[closingArr.length-1]||0).toLocaleString()}`, closingArr);

  // ---- P&L Summary ----
  if (pnlSummary) {
    pnlSummary.innerHTML = `
      <b>Total Income:</b> €${Math.round(incomeArr.reduce((a,b)=>a+(b||0),0)).toLocaleString()}<br>
      <b>Total Expenditure:</b> €${Math.round(expenditureArr.reduce((a,b)=>a+(b||0),0)).toLocaleString()}<br>
      <b>Total Repayments:</b> €${Math.round(repaymentArr.reduce((a,b)=>a+(b||0),0)).toLocaleString()}<br>
      <b>Final Bank Balance:</b> <span style="color:${rollingArr[rollingArr.length-1]<0?'#c00':'#388e3c'}">€${Math.round(rollingArr[rollingArr.length-1]||0).toLocaleString()}</span><br>
      <b>Lowest Bank Balance:</b> <span style="color:${minBal<0?'#c00':'#388e3c'}">${minBalWeek?minBalWeek+': ':''}€${Math.round(minBal||0).toLocaleString()}</span>
    `;
  }
}
  // ---------- Summary Tab Functions ----------
  function renderSummaryTab() {
    // Key Financials
    let incomeArr = getIncomeArr();
    let expenditureArr = getExpenditureArr();
    let repaymentArr = getRepaymentArr();
    let rollingArr = getRollingBankBalanceArr();
    let netArr = getNetProfitArr(incomeArr, expenditureArr, repaymentArr);
    let totalIncome = incomeArr.reduce((a,b)=>a+(b||0),0);
    let totalExpenditure = expenditureArr.reduce((a,b)=>a+(b||0),0);
    let totalRepayment = repaymentArr.reduce((a,b)=>a+(b||0),0);
    let finalBal = rollingArr[rollingArr.length-1]||0;
    let minBal = Math.min(...rollingArr);

    // Update KPI cards if present
    if (document.getElementById('kpiTotalIncome')) {
      document.getElementById('kpiTotalIncome').textContent = '€' + totalIncome.toLocaleString();
      document.getElementById('kpiTotalExpenditure').textContent = '€' + totalExpenditure.toLocaleString();
      document.getElementById('kpiTotalRepayments').textContent = '€' + totalRepayment.toLocaleString();
      document.getElementById('kpiFinalBank').textContent = '€' + Math.round(finalBal).toLocaleString();
      document.getElementById('kpiLowestBank').textContent = '€' + Math.round(minBal).toLocaleString();
    }

    let summaryElem = document.getElementById('summaryKeyFinancials');
    if (summaryElem) {
      summaryElem.innerHTML = `
        <b>Total Income:</b> €${Math.round(totalIncome).toLocaleString()}<br>
        <b>Total Expenditure:</b> €${Math.round(totalExpenditure).toLocaleString()}<br>
        <b>Total Repayments:</b> €${Math.round(totalRepayment).toLocaleString()}<br>
        <b>Final Bank Balance:</b> <span style="color:${finalBal<0?'#c00':'#388e3c'}">€${Math.round(finalBal).toLocaleString()}</span><br>
        <b>Lowest Bank Balance:</b> <span style="color:${minBal<0?'#c00':'#388e3c'}">€${Math.round(minBal).toLocaleString()}</span>
      `;
    }
    // Summary Chart
    let summaryChartElem = document.getElementById('summaryChart');
    if (summaryChart && typeof summaryChart.destroy === "function") summaryChart.destroy();
    if (summaryChartElem) {
      // Check if Chart.js is available
      if (typeof Chart !== 'undefined') {
        summaryChart = new Chart(summaryChartElem.getContext('2d'), {
        type: 'bar',
        data: {
          labels: ["Income", "Expenditure", "Repayment", "Final Bank", "Lowest Bank"],
          datasets: [{
            label: "Totals",
            data: [
              Math.round(totalIncome),
              -Math.round(totalExpenditure),
              -Math.round(totalRepayment),
              Math.round(finalBal),
              Math.round(minBal)
            ],
            backgroundColor: [
              "#4caf50","#f44336","#ffc107","#2196f3","#9c27b0"
            ]
          }]
        },
        options: {
          responsive:true,
          plugins:{legend:{display:false}},
          scales: { y: { beginAtZero: true } }
        }
      });
      } else {
        // Chart.js not available, show fallback message
        summaryChartElem.innerHTML = '<div style="text-align: center; padding: 20px; color: #666; border: 1px dashed #ccc; border-radius: 4px;">Chart.js library not available<br><small>Summary chart cannot be displayed</small></div>';
      }
    }

    // Tornado Chart logic
    function renderTornadoChart() {
      // Calculate row impact by "sum of absolute values" for each data row
      let impact = [];
      if (!mappedData || !mappingConfigured) return;
      const groupMapping = window.weekGroupMapping;
      
      for (let r = config.firstDataRow; r <= config.lastDataRow; r++) {
        let label = mappedData[r][0] || `Row ${r + 1}`;
        let vals = [];
        
        if (groupMapping) {
          // Use grouped columns (internal grouping)
          for (let g = 0; g < groupMapping.length; g++) {
            if (!weekCheckboxStates[g]) continue;
            
            const group = groupMapping[g];
            let groupSum = 0;
            
            // Aggregate values from all columns in this group for this row
            group.columns.forEach(col => {
              const absCol = config.weekColStart + col.index;
              let val = mappedData[r][absCol];
              if (typeof val === "string") val = val.replace(/,/g,'').replace(/€|\s/g,'');
              let num = parseFloat(val);
              if (!isNaN(num)) groupSum += num;
            });
            
            if (groupSum !== 0) vals.push(groupSum);
          }
        } else {
          // Use original logic for individual columns
          for (let w = 0; w < weekLabels.length; w++) {
            if (!weekCheckboxStates[w]) continue;
            let absCol = config.weekColStart + w;
            let val = mappedData[r][absCol];
            if (typeof val === "string") val = val.replace(/,/g,'').replace(/€|\s/g,'');
            let num = parseFloat(val);
            if (!isNaN(num)) vals.push(num);
          }
        }
        
        let total = vals.reduce((a,b)=>a+Math.abs(b),0);
        if (total > 0) impact.push({label, total});
      }
      impact.sort((a,b)=>b.total-a.total);
      impact = impact.slice(0, 10);

      let ctx = document.getElementById('tornadoChart').getContext('2d');
      if (window.tornadoChartObj && typeof window.tornadoChartObj.destroy === "function") window.tornadoChartObj.destroy();
      
      // Check if Chart.js is available
      if (typeof Chart !== 'undefined') {
        window.tornadoChartObj = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: impact.map(x=>x.label),
            datasets: [{ label: "Total Impact (€)", data: impact.map(x=>x.total), backgroundColor: '#1976d2' }]
          },
          options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } } }
        });
      } else {
        // Chart.js not available, show fallback message
        const tornadoCanvas = document.getElementById('tornadoChart');
        if (tornadoCanvas) {
          tornadoCanvas.style.display = 'none';
          const fallbackDiv = document.createElement('div');
          fallbackDiv.style.cssText = 'text-align: center; padding: 20px; color: #666; border: 1px dashed #ccc; border-radius: 4px;';
          fallbackDiv.innerHTML = 'Chart.js library not available<br><small>Tornado chart cannot be displayed</small>';
          tornadoCanvas.parentNode.insertBefore(fallbackDiv, tornadoCanvas.nextSibling);
        }
      }
    }
    renderTornadoChart();
  }

  // -------------------- TARGET IRR/NPV MODAL CONTROLS --------------------
  function setupTargetIrrModal() {
    const modal = document.getElementById('targetIrrModal');
    const editBtn = document.getElementById('editTargetIrrBtn');
    const closeBtn = document.getElementById('closeIrrModal');
    const applyBtn = document.getElementById('applyIrrSettings');
    const cancelBtn = document.getElementById('cancelIrrSettings');
    const slider = document.getElementById('targetIrrSlider');
    const sliderValue = document.getElementById('targetIrrValue');
    const installmentInput = document.getElementById('installmentCountInput');
    const liveUpdateCheckbox = document.getElementById('liveUpdateCheckbox');
    const suggestionDisplay = document.getElementById('suggestedIrrDisplay');
    const npvDisplay = document.getElementById('equivalentNpvDisplay');
    const firstRepaymentWeekSelect = document.getElementById('firstRepaymentWeekSelect');
    
    if (!modal || !editBtn) return;
    
    // Function to populate first repayment week dropdown
    function populateFirstRepaymentWeekDropdown() {
      if (!firstRepaymentWeekSelect) return;
      
      // Clear existing options except the first one
      firstRepaymentWeekSelect.innerHTML = '<option value="">Select week...</option>';
      
      // Use mapped week labels if available, otherwise generate default weeks
      const availableWeekLabels = weekLabels && weekLabels.length > 0 ? weekLabels : 
        Array.from({length: 52}, (_, i) => `Week ${i + 1}`);
      
      // Populate dropdown with weeks after investment week
      for (let i = investmentWeekIndex + 1; i < availableWeekLabels.length; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = availableWeekLabels[i] || `Week ${i + 1}`;
        firstRepaymentWeekSelect.appendChild(option);
      }
    }
    
    // Calculate NPV for given IRR
    function calculateNPVForIRR(irrRate) {
      const investment = parseFloat(document.getElementById('roiInvestmentInput').value) || 0;
      if (investment <= 0) return 0;
      
      // Get current repayments or use default installment calculation
      const repaymentsFull = getRepaymentArr ? getRepaymentArr() : [];
      const repayments = repaymentsFull.slice(investmentWeekIndex);
      
      // If no repayments exist, calculate equivalent repayments for target IRR
      if (repayments.length === 0 || repayments.every(r => r === 0)) {
        // Calculate what total repayments would be needed for this IRR
        const targetReturn = investment * (1 + irrRate);
        return targetReturn - investment; // This is the NPV equivalent
      }
      
      // Use actual repayments with date-based discounting
      const cashflows = [-investment, ...repayments];
      const cashflowDates = [weekStartDates[investmentWeekIndex] || new Date()];
      
      for (let i = 1; i < cashflows.length; i++) {
        let idx = investmentWeekIndex + i;
        cashflowDates[i] = weekStartDates[idx] || new Date();
      }
      
      // Use the global npv_date function for consistent calculation
      // This implements: NPV = sum(CF_i / (1 + r)^(t_i/365.25)) - Investment
      if (typeof npv_date === 'function') {
        return npv_date(irrRate, cashflows, cashflowDates);
      } else {
        // Simple NPV calculation without dates (fallback)
        return cashflows.reduce((acc, val, i) => acc + val / Math.pow(1 + irrRate, i), 0);
      }
    }
    
    // Update NPV display
    function updateNPVDisplay() {
      if (!npvDisplay) return;
      const irrRate = parseFloat(slider.value) / 100;
      const npvValue = calculateNPVForIRR(irrRate);
      npvDisplay.textContent = `€${npvValue.toLocaleString(undefined, {maximumFractionDigits: 2})}`;
    }
    
    // Update display
    function updateDisplay() {
      if (suggestionDisplay) {
        suggestionDisplay.textContent = `Target IRR: ${Math.round(targetIRR * 100)}%`;
      }
      updateNPVDisplay();
    }
    
    // Open modal
    editBtn.addEventListener('click', function() {
      slider.value = Math.round(targetIRR * 100);
      sliderValue.textContent = Math.round(targetIRR * 100) + '%';
      installmentInput.value = installmentCount;
      liveUpdateCheckbox.checked = liveUpdateEnabled;
      populateFirstRepaymentWeekDropdown();
      updateNPVDisplay(); // Initialize NPV display
      modal.style.display = 'flex';
    });
    
    // Close modal
    function closeModal() {
      modal.style.display = 'none';
    }
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    // Click outside modal to close
    modal.addEventListener('click', function(e) {
      if (e.target === modal) closeModal();
    });
    
    // Slider input
    slider.addEventListener('input', function() {
      const value = this.value;
      sliderValue.textContent = value + '%';
      updateNPVDisplay(); // Update NPV live as slider changes
      if (liveUpdateCheckbox.checked) {
        targetIRR = parseFloat(value) / 100;
        updateDisplay();
        if (showSuggestions) {
          generateAndUpdateSuggestions();
        }
      }
    });
    
    // Installment count input
    installmentInput.addEventListener('input', function() {
      if (liveUpdateCheckbox.checked) {
        installmentCount = parseInt(this.value) || 12;
        if (showSuggestions) {
          generateAndUpdateSuggestions();
        }
      }
    });
    
    // Apply settings
    applyBtn.addEventListener('click', function() {
      targetIRR = parseFloat(slider.value) / 100;
      installmentCount = parseInt(installmentInput.value) || 12;
      liveUpdateEnabled = liveUpdateCheckbox.checked;
      updateDisplay();
      if (showSuggestions) {
        generateAndUpdateSuggestions();
      }
      closeModal();
    });
    
    // Initialize display
    updateDisplay();
  }

  // -------------------- BUFFER SELECTION MODAL CONTROLS --------------------
  function setupBufferModal() {
    const modal = document.getElementById('bufferModal');
    const bufferBtn = document.getElementById('bufferSelectionBtn');
    const closeBtn = document.getElementById('closeBufferModal');
    const applyBtn = document.getElementById('applyBufferSettings');
    const cancelBtn = document.getElementById('cancelBufferSettings');
    const bufferDisplay = document.getElementById('bufferSelectionDisplay');
    const customBufferSettings = document.getElementById('customBufferSettings');
    const customBufferWeeks = document.getElementById('customBufferWeeks');
    
    if (!modal || !bufferBtn) return;
    
    // Function to update buffer display
    function updateBufferDisplay() {
      if (!bufferDisplay) return;
      
      let displayText = '';
      switch (bufferSettings.type) {
        case 'none':
          displayText = 'None (fastest schedule)';
          break;
        case '2weeks':
          displayText = '2 weeks gap';
          break;
        case '1month':
          displayText = '1 month gap';
          break;
        case '2months':
          displayText = '2 months gap';
          break;
        case 'quarter':
          displayText = 'Quarter (3 months) gap';
          break;
        case 'custom':
          displayText = `Custom: ${bufferSettings.customWeeks} weeks gap`;
          break;
        default:
          displayText = 'None selected';
      }
      bufferDisplay.textContent = displayText;
    }
    
    // Function to get buffer weeks based on settings
    function getBufferWeeks() {
      switch (bufferSettings.type) {
        case 'none':
          return 0;
        case '2weeks':
          return 2;
        case '1month':
          return 4; // Approximate 4 weeks per month
        case '2months':
          return 8;
        case 'quarter':
          return 12; // Approximate 12 weeks per quarter
        case 'custom':
          return bufferSettings.customWeeks;
        default:
          return 0;
      }
    }
    
    // Make getBufferWeeks available globally for suggestion algorithm
    window.getBufferWeeks = getBufferWeeks;
    
    // Open modal
    bufferBtn.addEventListener('click', function() {
      // Set current selection
      const radioButtons = modal.querySelectorAll('input[name="bufferOption"]');
      radioButtons.forEach(radio => {
        radio.checked = radio.value === bufferSettings.type;
      });
      
      if (customBufferWeeks) {
        customBufferWeeks.value = bufferSettings.customWeeks;
      }
      
      // Show/hide custom settings
      if (customBufferSettings) {
        customBufferSettings.style.display = bufferSettings.type === 'custom' ? 'block' : 'none';
      }
      
      modal.style.display = 'flex';
    });
    
    // Close modal
    function closeModal() {
      modal.style.display = 'none';
    }
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    // Click outside modal to close
    modal.addEventListener('click', function(e) {
      if (e.target === modal) closeModal();
    });
    
    // Handle radio button changes
    modal.addEventListener('change', function(e) {
      if (e.target.name === 'bufferOption') {
        if (customBufferSettings) {
          customBufferSettings.style.display = e.target.value === 'custom' ? 'block' : 'none';
        }
      }
    });
    
    // Apply settings
    applyBtn.addEventListener('click', function() {
      const selectedRadio = modal.querySelector('input[name="bufferOption"]:checked');
      if (selectedRadio) {
        bufferSettings.type = selectedRadio.value;
        
        if (bufferSettings.type === 'custom' && customBufferWeeks) {
          bufferSettings.customWeeks = parseInt(customBufferWeeks.value) || 1;
        }
        
        updateBufferDisplay();
        
        // If suggestions are currently shown, regenerate them with new buffer
        if (showSuggestions) {
          generateAndUpdateSuggestions();
        }
      }
      closeModal();
    });
    
    // Initialize display
    updateBufferDisplay();
  }

  // -------------------- ENHANCED SUGGESTION ALGORITHM --------------------
  function computeEnhancedSuggestedRepayments({investment, targetIRR, installmentCount, filteredWeeks, investmentWeekIndex, openingBalance, cashflow, weekStartDates}) {
    if (!filteredWeeks || !filteredWeeks.length || targetIRR <= 0 || installmentCount <= 0) {
      return { suggestedRepayments: [], achievedIRR: null, warnings: [] };
    }

    let warnings = [];
    
    // Calculate total amount that needs to be recouped (investment + target return)
    const targetReturn = investment * (1 + targetIRR);
    
    // Calculate suggested installment amount based on target installment count
    const suggestedInstallmentAmount = targetReturn / installmentCount;
    
    // Find investment index in filtered weeks
    const investmentIndex = filteredWeeks.indexOf(investmentWeekIndex);
    const startIndex = investmentIndex === -1 ? 0 : investmentIndex + 1;
    
    // Get first repayment week if specified
    const firstRepaymentWeekSelect = document.getElementById('firstRepaymentWeekSelect');
    let firstRepaymentWeek = startIndex;
    if (firstRepaymentWeekSelect && firstRepaymentWeekSelect.value) {
      firstRepaymentWeek = parseInt(firstRepaymentWeekSelect.value);
    }
    
    // Get buffer settings
    const bufferWeeks = window.getBufferWeeks ? window.getBufferWeeks() : 0;
    
    // Initialize variables for the new logic
    let outstanding = targetReturn;
    let repayments = [];
    let currentWeekIndex = Math.max(startIndex, firstRepaymentWeek);
    let extendedWeeks = [...filteredWeeks];
    let extendedWeekStartDates = [...weekStartDates];
    let lastRepaymentWeek = -1; // Track last repayment for buffer logic
    
    // Helper function to check if a week has sufficient bank balance for a repayment
    function hasValidBankBalance(weekIndex, repaymentAmount) {
      if (!cashflow || !cashflow.income || !cashflow.expenditure) {
        return true; // No cashflow data, assume sufficient
      }
      
      // Calculate rolling balance up to this week
      let rolling = openingBalance;
      for (let i = 0; i <= weekIndex && i < Math.max(cashflow.income.length, cashflow.expenditure.length); i++) {
        const income = cashflow.income[i] || 0;
        const expenditure = cashflow.expenditure[i] || 0;
        rolling = rolling + income - expenditure;
        
        // If this is the week we're checking, subtract the proposed repayment
        if (i === weekIndex) {
          rolling -= repaymentAmount;
        }
      }
      
      return rolling >= 0; // Bank balance should not go negative
    }
    
    // Helper function to add a week with proper date calculation
    function addWeekToSchedule() {
      const newWeekIndex = extendedWeeks.length;
      extendedWeeks.push(newWeekIndex);
      
      // Calculate date for the new week (7 days after the last week)
      const lastDate = extendedWeekStartDates[extendedWeekStartDates.length - 1] || new Date(2025, 0, 1);
      const newDate = new Date(lastDate);
      newDate.setDate(lastDate.getDate() + 7);
      extendedWeekStartDates.push(newDate);
      
      return newWeekIndex;
    }
    
    // Helper function to check if buffer requirement is met
    function isBufferSatisfied(weekIndex) {
      if (bufferWeeks === 0 || lastRepaymentWeek === -1) return true;
      return (weekIndex - lastRepaymentWeek) >= bufferWeeks;
    }
    
    let maxAttempts = 500; // Prevent infinite loops
    let attempts = 0;
    
    // Continue adding repayments until outstanding is fully covered
    while (outstanding > 0.01 && attempts < maxAttempts) { // Use small threshold to handle floating point precision
      attempts++;
      
      // Ensure we have enough weeks in the schedule
      if (currentWeekIndex >= extendedWeeks.length) {
        addWeekToSchedule();
      }
      
      // Check if buffer requirement is satisfied
      if (!isBufferSatisfied(currentWeekIndex)) {
        currentWeekIndex++;
        continue;
      }
      
      // Calculate payment amount (either full installment or remaining outstanding)
      let payment = Math.min(suggestedInstallmentAmount, outstanding);
      
      // Check if bank balance is sufficient for this payment
      if (!hasValidBankBalance(currentWeekIndex, payment)) {
        // Try smaller payment amounts
        let maxAffordablePayment = 0;
        for (let testPayment = payment * 0.1; testPayment <= payment; testPayment += payment * 0.1) {
          if (hasValidBankBalance(currentWeekIndex, testPayment)) {
            maxAffordablePayment = testPayment;
          }
        }
        
        if (maxAffordablePayment > 0.01) {
          payment = maxAffordablePayment;
        } else {
          // Skip this week if no affordable payment found
          currentWeekIndex++;
          continue;
        }
      }
      
      repayments.push({
        weekIndex: currentWeekIndex,
        amount: payment,
        date: extendedWeekStartDates[currentWeekIndex] || new Date(2025, 0, 1 + currentWeekIndex * 7)
      });
      
      outstanding -= payment;
      lastRepaymentWeek = currentWeekIndex;
      currentWeekIndex += (bufferWeeks + 1); // Move to next allowed week based on buffer
    }
    
    // Check if plan is achievable
    if (outstanding > 0.01) {
      warnings.push(`Unable to achieve target IRR with current settings. Remaining amount: €${outstanding.toLocaleString(undefined, {maximumFractionDigits: 2})}. Consider reducing buffer, increasing installment count, or extending the schedule.`);
    }
    
    // Ensure the last payment covers any remaining amount due to rounding
    if (repayments.length > 0 && outstanding > 0.01) {
      repayments[repayments.length - 1].amount += outstanding;
      outstanding = 0;
    }
    
    // Create the suggested array covering all weeks (original + extended if needed)
    const totalExtendedWeeks = Math.max(extendedWeeks.length, currentWeekIndex);
    const suggestedArray = new Array(totalExtendedWeeks).fill(0);
    
    // Fill in the repayments
    repayments.forEach(repayment => {
      if (repayment.weekIndex < suggestedArray.length) {
        suggestedArray[repayment.weekIndex] = repayment.amount;
      }
    });
    
    // Validate that total repayments equal target return (within small margin)
    const totalRepayments = suggestedArray.reduce((sum, amount) => sum + amount, 0);
    const shortfall = targetReturn - totalRepayments;
    
    if (Math.abs(shortfall) > 0.01) {
      if (shortfall > 0 && repayments.length > 0) {
        // Add shortfall to last payment
        const lastRepaymentIndex = repayments[repayments.length - 1].weekIndex;
        if (lastRepaymentIndex < suggestedArray.length) {
          suggestedArray[lastRepaymentIndex] += shortfall;
        }
      }
    }
    
    // Calculate achieved IRR using XIRR with actual dates for accurate annualized return
    const cashflows = [-investment];
    const cashflowDates = [extendedWeekStartDates[investmentWeekIndex] || new Date(2025, 0, 1)];
    
    // Add repayment cashflows starting from the investment week
    for (let i = startIndex; i < suggestedArray.length; i++) {
      if (suggestedArray[i] > 0) {
        cashflows.push(suggestedArray[i]);
        cashflowDates.push(extendedWeekStartDates[i] || new Date(2025, 0, 1 + i * 7));
      }
    }
    
    const achievedIRR = calculateIRR(cashflows, cashflowDates);
    
    // Check if achieved IRR is significantly different from target
    if (isFinite(achievedIRR) && Math.abs(achievedIRR - targetIRR) > 0.01) {
      warnings.push(`Achieved IRR (${(achievedIRR * 100).toFixed(2)}%) differs from target IRR (${(targetIRR * 100).toFixed(2)}%). Consider adjusting settings.`);
    }
    
    // Trim the suggested array to only include weeks up to the last repayment
    const lastRepaymentIndex = suggestedArray.findLastIndex(amount => amount > 0);
    const trimmedArray = lastRepaymentIndex >= 0 ? suggestedArray.slice(0, lastRepaymentIndex + 1) : suggestedArray;
    
    return {
      suggestedRepayments: trimmedArray,
      achievedIRR: achievedIRR,
      extendedWeeks: extendedWeeks.slice(0, trimmedArray.length),
      extendedWeekStartDates: extendedWeekStartDates.slice(0, trimmedArray.length),
      warnings: warnings
    };
  }
  
  function validateBankBalanceConstraint(suggestedRepayments, cashflow, openingBalance, filteredWeeks, investmentIndex) {
    const validatedRepayments = [...suggestedRepayments];
    let rolling = openingBalance;
    
    for (let i = 0; i < filteredWeeks.length; i++) {
      const weekIndex = filteredWeeks[i];
      const income = cashflow.income[weekIndex] || 0;
      const expenditure = cashflow.expenditure[weekIndex] || 0;
      const suggestedRepayment = i > investmentIndex ? validatedRepayments[i] : 0;
      
      const projectedBalance = rolling + income - expenditure - suggestedRepayment;
      
      // If balance would go negative, reduce the repayment
      if (projectedBalance < 0 && suggestedRepayment > 0) {
        const maxRepayment = rolling + income - expenditure;
        validatedRepayments[i] = Math.max(0, maxRepayment);
      }
      
      // Update rolling balance
      rolling = rolling + income - expenditure - (i > investmentIndex ? validatedRepayments[i] : 0);
    }
    
    return validatedRepayments;
  }
  
  function generateAndUpdateSuggestions() {
    const investment = parseFloat(document.getElementById('roiInvestmentInput').value) || 0;
    const filteredWeeks = getFilteredWeekIndices ? getFilteredWeekIndices() : Array.from({length: 52}, (_, i) => i);
    
    // If no filtered weeks (no data loaded), use default 52-week timeline
    const actualFilteredWeeks = filteredWeeks.length > 0 ? filteredWeeks : Array.from({length: 52}, (_, i) => i);
    
    // Calculate actual week start dates
    const actualWeekStartDates = weekStartDates && weekStartDates.length > 0 ? weekStartDates : 
      Array.from({length: 52}, (_, i) => new Date(2025, 0, 1 + i * 7));
    
    // Use GROUPED data for ROI calculations (proper time-based intervals)
    const incomeArr = getIncomeArr ? getIncomeArr(true) : Array(52).fill(0);
    const expenditureArr = getExpenditureArr ? getExpenditureArr(true) : Array(52).fill(0);
    const cashflow = {income: incomeArr, expenditure: expenditureArr};
    
    const result = computeEnhancedSuggestedRepayments({
      investment,
      targetIRR,
      installmentCount,
      filteredWeeks: actualFilteredWeeks,
      investmentWeekIndex,
      openingBalance,
      cashflow,
      weekStartDates: actualWeekStartDates
    });
    
    suggestedRepayments = result.suggestedRepayments;
    achievedSuggestedIRR = result.achievedIRR;
    
    // Display warnings if any
    if (result.warnings && result.warnings.length > 0) {
      displaySuggestionWarnings(result.warnings);
    } else {
      clearSuggestionWarnings();
    }
    
    // Store extended weeks and dates for rendering if schedule was extended
    if (result.extendedWeeks && result.extendedWeekStartDates) {
      // Update global variables to include extended weeks for rendering
      window.extendedWeekLabels = result.extendedWeeks.map((_, i) => 
        i < weekLabels.length ? weekLabels[i] : `Extended Week ${i + 1}`
      );
      window.extendedWeekStartDates = result.extendedWeekStartDates;
    }
    
    // Re-render the ROI section to show updated suggestions
    renderRoiSection();
  }
  
  // -------------------- WARNING DISPLAY FUNCTIONS --------------------
  function displaySuggestionWarnings(warnings) {
    const warningElement = document.getElementById('roiWarningAlert');
    if (!warningElement || !warnings || warnings.length === 0) return;
    
    let warningHtml = '<div class="alert alert-warning" style="margin-bottom: 1em;">';
    warningHtml += '<strong>Planning Warnings:</strong><br>';
    warnings.forEach(warning => {
      warningHtml += `• ${warning}<br>`;
    });
    warningHtml += '</div>';
    
    warningElement.innerHTML = warningHtml;
  }
  
  function clearSuggestionWarnings() {
    const warningElement = document.getElementById('roiWarningAlert');
    if (warningElement) {
      warningElement.innerHTML = '';
    }
  }
  function computeSuggestedRepayments({investment, targetIRR, filteredWeeks, investmentWeekIndex, openingBalance, cashflow, weekStartDates}) {
    if (!filteredWeeks || !filteredWeeks.length || targetIRR <= 0) {
      return { suggestedRepayments: [], achievedIRR: null };
    }

    // Create array for suggested repayments covering all filtered weeks from investment point
    const totalWeeks = filteredWeeks.length;
    const suggestedArray = new Array(totalWeeks).fill(0);
    
    // Simple suggestion algorithm: distribute repayments to achieve target IRR
    // Start from the investment week and spread repayments across remaining weeks
    const investmentIndex = filteredWeeks.indexOf(investmentWeekIndex);
    if (investmentIndex === -1) return { suggestedRepayments: suggestedArray, achievedIRR: null };
    
    const remainingWeeks = totalWeeks - investmentIndex - 1;
    if (remainingWeeks <= 0) return { suggestedRepayments: suggestedArray, achievedIRR: null };
    
    // Calculate equal repayments to achieve target IRR
    // Using simple approximation: Total return = investment * (1 + targetIRR)
    const targetReturn = investment * (1 + targetIRR);
    const weeklyRepayment = targetReturn / remainingWeeks;
    
    // Fill suggested repayments from investment week onwards
    for (let i = investmentIndex + 1; i < totalWeeks; i++) {
      suggestedArray[i] = weeklyRepayment;
    }
    
    // Calculate achieved IRR for the suggested repayments using XIRR with actual dates
    const cashflows = [-investment, ...suggestedArray.slice(investmentIndex + 1)];
    const cashflowDates = [weekStartDates[investmentWeekIndex] || new Date()];
    
    // Build dates for cash flows from investment week onwards
    for (let i = 1; i < cashflows.length; i++) {
      let weekIdx = investmentWeekIndex + i;
      cashflowDates[i] = weekStartDates[weekIdx] || new Date(2025, 0, 1 + weekIdx * 7);
    }
    
    const achievedIRR = calculateIRR(cashflows, cashflowDates);
    
    return {
      suggestedRepayments: suggestedArray,
      achievedIRR: achievedIRR
    };
  }

  /**
   * XIRR - Extended Internal Rate of Return calculation for irregular cash flow dates
   * This function calculates annualized IRR based on actual cash flow dates rather than 
   * assuming evenly spaced periods. Essential for accurate ROI calculations with irregular
   * repayment schedules.
   * 
   * @param {Array} cashflows - Array of cash flow values (negative for outflows, positive for inflows)
   * @param {Array} dates - Array of Date objects corresponding to each cash flow
   * @param {number} guess - Initial guess for the rate (default: 0.1 or 10%)
   * @returns {number} Annualized IRR or NaN if calculation fails
   */
  function xirr(cashflows, dates, guess = 0.1) {
    if (!cashflows || !dates || cashflows.length !== dates.length || cashflows.length < 2) {
      return NaN;
    }
    
    // Helper function to calculate NPV using actual dates
    function xnpv(rate, cashflows, dates) {
      const msPerDay = 24 * 3600 * 1000;
      const baseDate = dates[0];
      return cashflows.reduce((acc, val, i) => {
        if (!dates[i]) return acc;
        let days = (dates[i] - baseDate) / msPerDay;
        let years = days / 365.25; // Use 365.25 for more accurate annualization
        return acc + val / Math.pow(1 + rate, years);
      }, 0);
    }
    
    // Newton-Raphson method to find the rate where XNPV = 0
    let rate = guess;
    const epsilon = 1e-6;
    const maxIter = 100;
    
    for (let iter = 0; iter < maxIter; iter++) {
      let npv0 = xnpv(rate, cashflows, dates);
      let npv1 = xnpv(rate + epsilon, cashflows, dates);
      let derivative = (npv1 - npv0) / epsilon;
      
      if (Math.abs(derivative) < 1e-10) break; // Avoid division by very small numbers
      
      let newRate = rate - npv0 / derivative;
      
      if (!isFinite(newRate)) break;
      if (Math.abs(newRate - rate) < 1e-7) return newRate; // Convergence achieved
      
      rate = newRate;
    }
    
    return NaN; // Failed to converge
  }

  /**
   * Calculate IRR using XIRR logic for irregular cash flow schedules
   * This function replaces the previous calculateIRR to ensure accurate 
   * annualized returns based on actual cash flow dates.
   * 
   * @param {Array} cashflows - Array of cash flow values
   * @param {Array} dates - Optional array of dates for XIRR calculation
   * @returns {number} Annualized IRR or NaN if calculation fails
   */
  function calculateIRR(cashflows, dates = null) {
    if (!cashflows || cashflows.length < 2) return NaN;
    
    // If dates are provided, use XIRR for accurate date-based calculation
    if (dates && dates.length === cashflows.length) {
      return xirr(cashflows, dates);
    }
    
    // Fallback to standard IRR for evenly spaced periods (legacy compatibility)
    function npv(rate, cashflows) {
      if (!cashflows.length) return 0;
      return cashflows.reduce((acc, val, i) => acc + val/Math.pow(1+rate, i), 0);
    }
    
    let rate = 0.1, epsilon = 1e-6, maxIter = 100;
    for (let iter=0; iter<maxIter; iter++) {
      let npv0 = npv(rate, cashflows);
      let npv1 = npv(rate+epsilon, cashflows);
      let deriv = (npv1-npv0)/epsilon;
      if (Math.abs(deriv) < 1e-10) break;
      let newRate = rate - npv0/deriv;
      if (!isFinite(newRate)) break;
      if (Math.abs(newRate-rate) < 1e-7) return newRate;
      rate = newRate;
    }
    return NaN;
  }

  // --- ROI TABLE RENDERING (SINGLE TABLE, OVERLAY SUGGESTIONS) ---
  function renderRoiPaybackTable({actualRepayments, suggestedRepayments, filteredWeeks, weekLabels, weekStartDates, investmentWeekIndex, explicitSchedule}) {
    if (!weekLabels) return '';
    
    // Use extended week data if available (for suggestions that go beyond original schedule)
    const effectiveWeekLabels = window.extendedWeekLabels || weekLabels;
    const effectiveWeekStartDates = window.extendedWeekStartDates || weekStartDates;
    
    // Always show the table - actual repayments are always displayed even if zero
    const hasActualRepayments = actualRepayments && actualRepayments.length > 0;
    const hasSuggestedRepayments = suggestedRepayments && suggestedRepayments.length > 0 && suggestedRepayments.some(r => r > 0);
    const hasExplicitDates = explicitSchedule && explicitSchedule.length > 0;
    
    // Initialize actual repayments array if not provided
    if (!hasActualRepayments) {
      actualRepayments = Array(effectiveWeekLabels.length).fill(0);
    }
    
    const discountRate = parseFloat(document.getElementById('roiInterestInput').value) || 0;
    
    let tableHtml = `
      <table class="table table-sm">
        <thead>
          <tr>
            <th>Period</th>
            <th>Date</th>
            <th>Actual Repayment</th>
            ${suggestedRepayments ? '<th>Suggested Repayment</th>' : ''}
            <th>Cumulative Actual</th>
            ${suggestedRepayments ? '<th>Cumulative Suggested</th>' : ''}
            <th>Discounted Cumulative</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    let cum = 0, discCum = 0;
    let sugCum = 0, sugDiscCum = 0;
    
    // Determine the maximum range to display
    const maxWeeks = Math.max(
      actualRepayments.length,
      hasSuggestedRepayments ? suggestedRepayments.length : 0,
      effectiveWeekLabels.length
    );
    
    // Create a combined index set of all weeks that need to be shown
    const weeksToShow = new Set();
    
    // Add all weeks with actual repayments (even if zero) from investment week onwards
    for (let i = investmentWeekIndex + 1; i < actualRepayments.length; i++) {
      weeksToShow.add(i);
    }
    
    // Add weeks with suggested repayments
    if (hasSuggestedRepayments) {
      for (let i = 0; i < suggestedRepayments.length; i++) {
        if (suggestedRepayments[i] > 0) {
          weeksToShow.add(i);
        }
      }
    }
    
    // Convert to sorted array and ensure we include at least some weeks for display
    const sortedWeeks = Array.from(weeksToShow).sort((a, b) => a - b);
    
    // If no weeks to show, show at least a few weeks from investment onwards for context
    if (sortedWeeks.length === 0) {
      for (let i = investmentWeekIndex + 1; i < Math.min(investmentWeekIndex + 5, effectiveWeekLabels.length); i++) {
        sortedWeeks.push(i);
      }
    }
    
    // Handle explicit dates vs week-based display
    if (hasExplicitDates) {
      // For explicit dates, show entries sorted by date
      explicitSchedule.forEach((scheduleItem, index) => {
        const actualRepayment = scheduleItem.amount;
        const suggestedRepayment = (suggestedRepayments && suggestedRepayments[index]) || 0;
        
        cum += actualRepayment;
        if (actualRepayment > 0) {
          // Use actual days from investment date for accurate discounting
          const investmentDate = effectiveWeekStartDates[investmentWeekIndex] || new Date(2025, 0, 1);
          const repaymentDate = scheduleItem.date;
          
          const days = (repaymentDate - investmentDate) / (24 * 3600 * 1000);
          const years = days / 365.25; // Use 365.25 for consistency with XIRR
          discCum += actualRepayment / Math.pow(1 + discountRate / 100, years);
        }
        
        if (suggestedRepayments) {
          sugCum += suggestedRepayment;
          if (suggestedRepayment > 0) {
            const investmentDate = effectiveWeekStartDates[investmentWeekIndex] || new Date(2025, 0, 1);
            const repaymentDate = scheduleItem.date;
            const days = (repaymentDate - investmentDate) / (24 * 3600 * 1000);
            const years = days / 365.25;
            sugDiscCum += suggestedRepayment / Math.pow(1 + discountRate / 100, years);
          }
        }
        
        // Show explicit date and a generated label
        const weekLabel = `Repayment ${index + 1}`;
        const weekDate = scheduleItem.date.toLocaleDateString('en-GB');
        
        // Highlight rows with suggested repayments
        const rowStyle = suggestedRepayments && suggestedRepayment > 0 ? 'style="background-color: rgba(33, 150, 243, 0.05);"' : '';
        
        tableHtml += `
          <tr ${rowStyle}>
            <td>${weekLabel}</td>
            <td style="font-weight: bold; color: #1976d2;">${weekDate}</td>
            <td>€${actualRepayment.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
            ${suggestedRepayments ? `<td style="color: #2196f3; font-weight: bold;">€${suggestedRepayment.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>` : ''}
            <td>€${cum.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
            ${suggestedRepayments ? `<td style="color: #2196f3;">€${sugCum.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>` : ''}
            <td>€${discCum.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
          </tr>
        `;
      });
    } else {
      // Use traditional week-based display
      for (const weekIndex of sortedWeeks) {
        const actualRepayment = (actualRepayments && actualRepayments[weekIndex]) || 0;
        const suggestedRepayment = (suggestedRepayments && suggestedRepayments[weekIndex]) || 0;
        
        cum += actualRepayment;
        if (actualRepayment > 0) {
          // Use actual days from investment date for accurate discounting
          const investmentDate = effectiveWeekStartDates[investmentWeekIndex];
          const repaymentDate = effectiveWeekStartDates[weekIndex];
          if (investmentDate && repaymentDate) {
            const days = (repaymentDate - investmentDate) / (24 * 3600 * 1000);
            const years = days / 365.25; // Use 365.25 for consistency with XIRR
            discCum += actualRepayment / Math.pow(1 + discountRate / 100, years);
          } else {
            // Fallback to period-based calculation if dates unavailable
            const periodIndex = weekIndex - investmentWeekIndex;
            discCum += actualRepayment / Math.pow(1 + discountRate / 100, periodIndex);
          }
        }
        
        if (suggestedRepayments) {
          sugCum += suggestedRepayment;
          if (suggestedRepayment > 0) {
            // Use actual days from investment date for accurate discounting  
            const investmentDate = effectiveWeekStartDates[investmentWeekIndex];
            const repaymentDate = effectiveWeekStartDates[weekIndex];
            if (investmentDate && repaymentDate) {
              const days = (repaymentDate - investmentDate) / (24 * 3600 * 1000);
              const years = days / 365.25; // Use 365.25 for consistency with XIRR
              sugDiscCum += suggestedRepayment / Math.pow(1 + discountRate / 100, years);
            } else {
              // Fallback to period-based calculation if dates unavailable
              const periodIndex = weekIndex - investmentWeekIndex;
              sugDiscCum += suggestedRepayment / Math.pow(1 + discountRate / 100, periodIndex);
            }
          }
        }
        
        const weekLabel = effectiveWeekLabels[weekIndex] || `Week ${weekIndex + 1}`;
        const weekDate = effectiveWeekStartDates[weekIndex] ? effectiveWeekStartDates[weekIndex].toLocaleDateString('en-GB') : '-';
        
        // Highlight rows with suggested repayments
        const rowStyle = suggestedRepayments && suggestedRepayment > 0 ? 'style="background-color: rgba(33, 150, 243, 0.05);"' : '';
        
        tableHtml += `
          <tr ${rowStyle}>
            <td>${weekLabel}</td>
            <td>${weekDate}</td>
            <td>€${actualRepayment.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
            ${suggestedRepayments ? `<td style="color: #2196f3; font-weight: bold;">€${suggestedRepayment.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>` : ''}
            <td>€${cum.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
            ${suggestedRepayments ? `<td style="color: #2196f3;">€${sugCum.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>` : ''}
            <td>€${discCum.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
          </tr>
        `;
      }
    }
    
    tableHtml += `</tbody></table>`;
    
    // Add suggested summary if suggestions are shown
    if (suggestedRepayments && achievedSuggestedIRR !== null) {
      tableHtml += `
        <div style="margin-top: 10px; padding: 10px; background-color: rgba(33, 150, 243, 0.1); border-radius: 4px;">
          <strong>Suggested Repayments Summary:</strong><br>
          Total Suggested: €${sugCum.toLocaleString(undefined, {maximumFractionDigits: 2})}<br>
          Suggested Discounted Total: €${sugDiscCum.toLocaleString(undefined, {maximumFractionDigits: 2})}<br>
          Achieved IRR: ${isFinite(achievedSuggestedIRR) && !isNaN(achievedSuggestedIRR) ? (achievedSuggestedIRR * 100).toFixed(2) + '%' : 'n/a'}
        </div>
      `;
    }
    
    return tableHtml;
  }

  // -------------------- ROI/Payback Section --------------------
function renderRoiSection() {
  const dropdown = document.getElementById('investmentWeek');
  if (!dropdown) return;
  
  investmentWeekIndex = parseInt(dropdown.value, 10) || 0;
  const investment = parseFloat(document.getElementById('roiInvestmentInput').value) || 0;
  const discountRate = parseFloat(document.getElementById('roiInterestInput').value) || 0;
  const investmentWeek = investmentWeekIndex;
  
  // Use dates calculated from spreadsheet column labels
  let actualWeekStartDates = weekStartDates && weekStartDates.length > 0 ? weekStartDates : 
    Array.from({length: 52}, (_, i) => new Date(2025, 0, 1 + i * 7));
  
  // Handle case when no week mapping is available - use default weeks
  let actualWeekLabels = weekLabels && weekLabels.length > 0 ? weekLabels : 
    Array.from({length: 52}, (_, i) => `Week ${i + 1}`);
  
  const investmentDate = actualWeekStartDates[investmentWeek] || null;
  
  // Get explicit repayment schedule for accurate date-based calculations
  const explicitSchedule = window.getExplicitRepaymentSchedule ? window.getExplicitRepaymentSchedule() : getExplicitRepaymentSchedule();
  
  // Check if we have any explicit date repayments
  const hasExplicitDates = explicitSchedule.some(item => 
    repaymentRows.some(r => r.type === "date" && r.explicitDate)
  );
  
  let cashflows, cashflowDates;
  
  if (hasExplicitDates && explicitSchedule.length > 0) {
    // Use explicit repayment schedule for NPV/IRR calculations
    const investmentScheduleDate = investmentDate || actualWeekStartDates[investmentWeek] || new Date(2025, 0, 1);
    
    // Filter schedule to only include repayments after investment date
    const futureRepayments = explicitSchedule.filter(item => item.date >= investmentScheduleDate);
    
    cashflows = [-investment, ...futureRepayments.map(item => item.amount)];
    cashflowDates = [investmentScheduleDate, ...futureRepayments.map(item => item.date)];
  } else {
    // Fall back to traditional week-based approach
    const repaymentsFull = getRepaymentArr ? getRepaymentArr() : [];
    const repayments = repaymentsFull.slice(investmentWeek);
    
    cashflows = [-investment, ...repayments];
    cashflowDates = [investmentDate];
    for (let i = 1; i < cashflows.length; i++) {
      let idx = investmentWeek + i;
      cashflowDates[i] = actualWeekStartDates[idx] || null;
    }
  }

  function npv(rate, cashflows) {
    if (!cashflows.length) return 0;
    return cashflows.reduce((acc, val, i) => acc + val/Math.pow(1+rate, i), 0);
  }
  
  // Legacy IRR function - kept for compatibility but replaced by XIRR for irregular schedules
  function irr(cashflows, guess=0.1) {
    let rate = guess, epsilon = 1e-6, maxIter = 100;
    for (let iter=0; iter<maxIter; iter++) {
      let npv0 = npv(rate, cashflows);
      let npv1 = npv(rate+epsilon, cashflows);
      let deriv = (npv1-npv0)/epsilon;
      let newRate = rate - npv0/deriv;
      if (!isFinite(newRate)) break;
      if (Math.abs(newRate-rate) < 1e-7) return newRate;
      rate = newRate;
    }
    return NaN;
  }

  function npv_date(rate, cashflows, dateArr) {
    const msPerDay = 24 * 3600 * 1000;
    const baseDate = dateArr[0];
    return cashflows.reduce((acc, val, i) => {
      if (!dateArr[i]) return acc;
      let days = (dateArr[i] - baseDate) / msPerDay;
      let years = days / 365.25; // Use 365.25 for consistency with XIRR and more accurate annualization
      return acc + val / Math.pow(1 + rate, years);
    }, 0);
  }

  // Calculate NPV using correct date-based formula: NPV = sum(CF_i / (1 + r)^(t_i/365.25)) - Investment
  // where r = annual discount rate from ROI input, t_i = days since investment
  let npvVal = (discountRate && cashflows.length > 1 && cashflowDates[0]) ?
    npv_date(discountRate / 100, cashflows, cashflowDates) : null;
  
  // Use XIRR for accurate annualized IRR calculation with actual cash flow dates
  // XIRR replaces standard IRR to handle irregular repayment schedules properly.
  // This ensures accurate annualized returns regardless of payment timing irregularities.
  let irrVal = (cashflows.length > 1 && cashflowDates.length > 1 && cashflowDates[0]) ? 
    xirr(cashflows, cashflowDates) : NaN;

  // Calculate discounted payback using actual repayment dates
  let discCum = 0, payback = null;
  for (let i = 1; i < cashflows.length; i++) {
    let discounted;
    
    if (cashflowDates[0] && cashflowDates[i]) {
      const days = (cashflowDates[i] - cashflowDates[0]) / (24 * 3600 * 1000);
      const years = days / 365.25; // Use 365.25 for consistency with XIRR
      discounted = cashflows[i] / Math.pow(1 + discountRate / 100, years);
    } else {
      // Fallback to period-based calculation if dates unavailable
      discounted = cashflows[i] / Math.pow(1 + discountRate / 100, i);
    }
    
    discCum += discounted;
    if (payback === null && discCum >= investment) payback = i;
  }

  // Prepare data for table rendering
  let tableRepayments;
  if (hasExplicitDates && explicitSchedule.length > 0) {
    // For explicit dates, create a combined schedule for display
    tableRepayments = [];
    const totalScheduleItems = Math.max(explicitSchedule.length, actualWeekLabels.length);
    
    // Create expanded table data that includes both week-based and explicit date repayments
    for (let i = 0; i < totalScheduleItems; i++) {
      const explicitItem = explicitSchedule[i];
      const weekRepayment = i < getRepaymentArr().length ? getRepaymentArr()[i] : 0;
      
      if (explicitItem) {
        tableRepayments.push(explicitItem.amount);
      } else {
        tableRepayments.push(weekRepayment);
      }
    }
  } else {
    // Use traditional week-based repayments
    const repaymentsFull = getRepaymentArr ? getRepaymentArr() : [];
    tableRepayments = repaymentsFull.slice(investmentWeek);
  }

  // Instead of inline table generation, use renderRoiPaybackTable
  const filteredWeeks = getFilteredWeekIndices ? getFilteredWeekIndices() : Array.from({length: actualWeekLabels.length}, (_, i) => i);
  const tableHtml = renderRoiPaybackTable({
    actualRepayments: tableRepayments,
    suggestedRepayments: showSuggestions ? suggestedRepayments : null,
    filteredWeeks,
    weekLabels: actualWeekLabels,
    weekStartDates: actualWeekStartDates,
    investmentWeekIndex: investmentWeek,
    explicitSchedule: hasExplicitDates ? explicitSchedule : null
  });

  // Calculate total repayments for summary
  const totalRepayments = hasExplicitDates && explicitSchedule.length > 0 
    ? explicitSchedule.reduce((sum, item) => sum + item.amount, 0)
    : (tableRepayments ? tableRepayments.reduce((a, b) => a + b, 0) : 0);

  let summary = `<b>Total Investment:</b> €${investment.toLocaleString()}<br>
    <b>Total Repayments:</b> €${totalRepayments.toLocaleString()}<br>
    <b>NPV (${discountRate}%):</b> ${typeof npvVal === "number" ? "€" + npvVal.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "n/a"}<br>
    <b>IRR:</b> ${isFinite(irrVal) && !isNaN(irrVal) ? (irrVal * 100).toFixed(2) + '%' : 'n/a'}<br>
    <b>Discounted Payback (periods):</b> ${payback ?? 'n/a'}`;

  // Add note about explicit dates if used
  if (hasExplicitDates) {
    summary += `<br><div style="margin-top:8px; padding:4px; background-color:#e3f2fd; border-radius:4px; font-size:0.9em;">
      <strong>Note:</strong> Calculations use explicit dates provided for repayments.
    </div>`;
  }

  // Show achievedSuggestedIRR if present
  if (showSuggestions && achievedSuggestedIRR !== null && isFinite(achievedSuggestedIRR)) {
    summary += `<br><b>Suggested IRR:</b> ${(achievedSuggestedIRR * 100).toFixed(2)}%`;
  }

  let badge = '';
  if (irrVal > 0.15) badge = '<div class="alert alert-success" style="margin-bottom: 1em;"><strong>Attractive ROI</strong> - This investment shows excellent returns</div>';
  else if (irrVal > 0.08) badge = '<div class="alert alert-warning" style="margin-bottom: 1em;"><strong>Moderate ROI</strong> - This investment shows reasonable returns</div>';
  else if (!isNaN(irrVal)) badge = '<div class="alert alert-danger" style="margin-bottom: 1em;"><strong>Low ROI</strong> - This investment shows poor returns</div>';
  else badge = '';

  // Update the prominent warning display
  const warningElement = document.getElementById('roiWarningAlert');
  if (warningElement) {
    warningElement.innerHTML = badge;
  }

  document.getElementById('roiSummary').innerHTML = summary;
  document.getElementById('roiPaybackTableWrap').innerHTML = tableHtml;

  // Update date mapping preview
  if (typeof updateDateMappingPreview === 'function') {
    updateDateMappingPreview();
  }
  
  // Update spreadsheet date mapping summary in ROI tab
  updateSpreadsheetDateSummary();

  // Charts - get repayments data for chart rendering
  const chartRepayments = hasExplicitDates && explicitSchedule.length > 0 
    ? explicitSchedule.map(item => item.amount)
    : (tableRepayments ? tableRepayments : []);
  renderRoiCharts(investment, chartRepayments);

  if (!chartRepayments.length || chartRepayments.reduce((a, b) => a + b, 0) === 0) {
    document.getElementById('roiSummary').innerHTML += '<div class="alert alert-warning">No repayments scheduled. ROI cannot be calculated.</div>';
  }
}

// ROI Performance Chart (line) + Pie chart
function renderRoiCharts(investment, repayments) {
  if (!Array.isArray(repayments) || repayments.length === 0) return;

  // Build cumulative and discounted cumulative arrays
  let cumArr = [];
  let discCumArr = [];
  let cum = 0, discCum = 0;
  const discountRate = parseFloat(document.getElementById('roiInterestInput').value) || 0;
  for (let i = 0; i < repayments.length; i++) {
    cum += repayments[i] || 0;
    cumArr.push(cum);

    // Discounted only if repayment > 0
    if (repayments[i] > 0) {
      discCum += repayments[i] / Math.pow(1 + discountRate / 100, i + 1);
    }
    discCumArr.push(discCum);
  }

  // Build X labels
  const weekLabels = window.weekLabels || repayments.map((_, i) => `Week ${i + 1}`);

  // ROI Performance Chart (Line)
  let roiLineElem = document.getElementById('roiLineChart');
  if (roiLineElem) {
    const roiLineCtx = roiLineElem.getContext('2d');
    if (window.roiLineChart && typeof window.roiLineChart.destroy === "function") window.roiLineChart.destroy();
    
    // Check if Chart.js is available
    if (typeof Chart !== 'undefined') {
      window.roiLineChart = new Chart(roiLineCtx, {
      type: 'line',
      data: {
        labels: weekLabels.slice(0, repayments.length),
        datasets: [
          {
            label: "Cumulative Repayments",
            data: cumArr,
            borderColor: "#4caf50",
            backgroundColor: "#4caf5040",
            fill: false,
            tension: 0.15
          },
          {
            label: "Discounted Cumulative",
            data: discCumArr,
            borderColor: "#1976d2",
            backgroundColor: "#1976d240",
            borderDash: [6,4],
            fill: false,
            tension: 0.15
          },
          {
            label: "Initial Investment",
            data: Array(repayments.length).fill(investment),
            borderColor: "#f44336",
            borderDash: [3,3],
            borderWidth: 1,
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true } },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: "€" } }
        }
      }
    });
    } else {
      // Chart.js not available, show fallback message
      roiLineElem.innerHTML = '<div style="text-align: center; padding: 20px; color: #666; border: 1px dashed #ccc; border-radius: 4px;">Chart.js library not available<br><small>ROI Line chart cannot be displayed</small></div>';
    }
  }

  // Pie chart (optional)
  let roiPieElem = document.getElementById('roiPieChart');
  if (roiPieElem) {
    const roiPieCtx = roiPieElem.getContext('2d');
    if (window.roiPieChart && typeof window.roiPieChart.destroy === "function") window.roiPieChart.destroy();
    
    // Check if Chart.js is available
    if (typeof Chart !== 'undefined') {
      window.roiPieChart = new Chart(roiPieCtx, {
      type: 'pie',
      data: {
        labels: ["Total Repayments", "Unrecouped"],
        datasets: [{
          data: [
            cumArr[cumArr.length - 1] || 0,
            Math.max(investment - (cumArr[cumArr.length - 1] || 0), 0)
          ],
          backgroundColor: ["#4caf50", "#f3b200"]
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
    } else {
      // Chart.js not available, show fallback message
      roiPieElem.innerHTML = '<div style="text-align: center; padding: 20px; color: #666; border: 1px dashed #ccc; border-radius: 4px;">Chart.js library not available<br><small>ROI Pie chart cannot be displayed</small></div>';
    }
  }
}

// --- ROI input events ---
document.getElementById('roiInvestmentInput').addEventListener('input', function() {
  clearRoiSuggestions();
  renderRoiSection();
  // Update NPV display in modal if open
  const modal = document.getElementById('targetIrrModal');
  const npvDisplay = document.getElementById('equivalentNpvDisplay');
  if (modal && modal.style.display !== 'none' && npvDisplay) {
    const slider = document.getElementById('targetIrrSlider');
    if (slider) {
      const irrRate = parseFloat(slider.value) / 100;
      const investment = parseFloat(this.value) || 0;
      if (investment <= 0) {
        npvDisplay.textContent = '€0';
      } else {
        // Update NPV display
        updateNPVDisplayInModal();
      }
    }
  }
});
document.getElementById('roiInterestInput').addEventListener('input', function() {
  clearRoiSuggestions();
  renderRoiSection();
  // Update NPV display in modal if open
  updateNPVDisplayInModal();
});
document.getElementById('refreshRoiBtn').addEventListener('click', function() {
  clearRoiSuggestions();
  renderRoiSection();
  updateNPVDisplayInModal();
});
document.getElementById('investmentWeek').addEventListener('change', function() {
  clearRoiSuggestions();
  renderRoiSection();
  updateNPVDisplayInModal();
});

// Helper function to update NPV display when modal is open
function updateNPVDisplayInModal() {
  const modal = document.getElementById('targetIrrModal');
  const npvDisplay = document.getElementById('equivalentNpvDisplay');
  const slider = document.getElementById('targetIrrSlider');
  
  if (modal && modal.style.display !== 'none' && npvDisplay && slider) {
    const irrRate = parseFloat(slider.value) / 100;
    const investment = parseFloat(document.getElementById('roiInvestmentInput').value) || 0;
    
    if (investment <= 0) {
      npvDisplay.textContent = '€0';
      return;
    }
    
    // Calculate NPV for current IRR
    const repaymentsFull = getRepaymentArr ? getRepaymentArr() : [];
    const repayments = repaymentsFull.slice(investmentWeekIndex);
    
    if (repayments.length === 0 || repayments.every(r => r === 0)) {
      // Calculate what total repayments would be needed for this IRR
      const targetReturn = investment * (1 + irrRate);
      const npvValue = targetReturn - investment;
      npvDisplay.textContent = `€${npvValue.toLocaleString(undefined, {maximumFractionDigits: 2})}`;
    } else {
      // Use actual repayments with date-based discounting
      const cashflows = [-investment, ...repayments];
      const cashflowDates = [weekStartDates[investmentWeekIndex] || new Date()];
      
      for (let i = 1; i < cashflows.length; i++) {
        let idx = investmentWeekIndex + i;
        cashflowDates[i] = weekStartDates[idx] || new Date();
      }
      
      // Use date-based NPV calculation with correct formula: 
      // NPV = sum(CF_i / (1 + r)^(t_i/365.25)) - Investment
      const npvValue = npv_date(irrRate, cashflows, cashflowDates);
      npvDisplay.textContent = `€${npvValue.toLocaleString(undefined, {maximumFractionDigits: 2})}`;
    }
  }
}

// --- SUGGESTION BUTTON EVENT ---
document.getElementById('showSuggestedRepaymentsBtn').addEventListener('click', function() {
  if (!showSuggestions) {
    // Generate suggestions using current target IRR and installment count
    showSuggestions = true;
    this.textContent = 'Hide Suggested Repayments';
    generateAndUpdateSuggestions();
  } else {
    // Hide suggestions
    clearRoiSuggestions();
    this.textContent = 'Show Suggested Repayments';
    renderRoiSection();
  }
});

// --- CLEAR SUGGESTIONS WHEN DATA CHANGES ---
function clearRoiSuggestions() {
  showSuggestions = false;
  suggestedRepayments = null;
  achievedSuggestedIRR = null;
  clearSuggestionWarnings();
  const btn = document.getElementById('showSuggestedRepaymentsBtn');
  if (btn) btn.textContent = 'Show Suggested Repayments';
}

// -------------------- EXCEL EXPORT FUNCTIONALITY --------------------
function setupExcelExport() {
  const exportBtn = document.getElementById('exportToExcelBtn');
  if (!exportBtn) return;
  
  exportBtn.addEventListener('click', function() {
    try {
      // Create workbook
      const workbook = XLSX.utils.book_new();
      
      // Get current repayments data
      const actualRepayments = getRepaymentArr ? getRepaymentArr() : [];
      const investment = parseFloat(document.getElementById('roiInvestmentInput').value) || 0;
      const discountRate = parseFloat(document.getElementById('roiInterestInput').value) || 0;
      
      // Use mapped week labels if available
      const actualWeekLabels = weekLabels && weekLabels.length > 0 ? weekLabels : 
        Array.from({length: 52}, (_, i) => `Week ${i + 1}`);
      const actualWeekStartDates = weekStartDates && weekStartDates.length > 0 ? weekStartDates : 
        Array.from({length: 52}, (_, i) => new Date(2025, 0, 1 + i * 7));
      
      // Sheet 1: Repayments Inputted (Actual)
      const actualData = [];
      actualData.push(['Week', 'Date', 'Repayment Amount', 'Cumulative Total', 'Discounted Cumulative']);
      
      let cumulative = 0;
      let discountedCumulative = 0;
      
      for (let i = investmentWeekIndex + 1; i < actualRepayments.length; i++) {
        const repayment = actualRepayments[i] || 0;
        if (repayment > 0) {
          cumulative += repayment;
          const periodIndex = i - investmentWeekIndex;
          discountedCumulative += repayment / Math.pow(1 + discountRate / 100, periodIndex);
          
          actualData.push([
            actualWeekLabels[i] || `Week ${i + 1}`,
            actualWeekStartDates[i] ? actualWeekStartDates[i].toLocaleDateString('en-GB') : '-',
            repayment,
            cumulative,
            discountedCumulative
          ]);
        }
      }
      
      // Add summary row for actual repayments
      if (actualData.length > 1) {
        actualData.push(['', '', '', '', '']);
        actualData.push(['SUMMARY', '', '', '', '']);
        actualData.push(['Total Investment', '', investment, '', '']);
        actualData.push(['Total Repayments', '', cumulative, '', '']);
        actualData.push(['Net Return', '', cumulative - investment, '', '']);
      }
      
      const actualSheet = XLSX.utils.aoa_to_sheet(actualData);
      XLSX.utils.book_append_sheet(workbook, actualSheet, 'Repayments Inputted');
      
      // Sheet 2: Adjusted IRR Suggestions (if available)
      if (showSuggestions && suggestedRepayments) {
        const suggestedData = [];
        suggestedData.push(['Week', 'Date', 'Suggested Amount', 'Cumulative Total', 'Discounted Cumulative']);
        
        let sugCumulative = 0;
        let sugDiscountedCumulative = 0;
        
        // Use extended week data if available
        const effectiveWeekLabels = window.extendedWeekLabels || actualWeekLabels;
        const effectiveWeekStartDates = window.extendedWeekStartDates || actualWeekStartDates;
        
        for (let i = 0; i < suggestedRepayments.length; i++) {
          const suggestedAmount = suggestedRepayments[i] || 0;
          if (suggestedAmount > 0) {
            sugCumulative += suggestedAmount;
            const periodIndex = i - investmentWeekIndex;
            sugDiscountedCumulative += suggestedAmount / Math.pow(1 + discountRate / 100, periodIndex);
            
            suggestedData.push([
              effectiveWeekLabels[i] || `Week ${i + 1}`,
              effectiveWeekStartDates[i] ? effectiveWeekStartDates[i].toLocaleDateString('en-GB') : '-',
              suggestedAmount,
              sugCumulative,
              sugDiscountedCumulative
            ]);
          }
        }
        
        // Add summary row for suggested repayments
        if (suggestedData.length > 1) {
          suggestedData.push(['', '', '', '', '']);
          suggestedData.push(['SUMMARY', '', '', '', '']);
          suggestedData.push(['Total Investment', '', investment, '', '']);
          suggestedData.push(['Total Suggested Repayments', '', sugCumulative, '', '']);
          suggestedData.push(['Net Return', '', sugCumulative - investment, '', '']);
          if (achievedSuggestedIRR !== null && isFinite(achievedSuggestedIRR)) {
            suggestedData.push(['Achieved IRR', '', (achievedSuggestedIRR * 100).toFixed(2) + '%', '', '']);
          }
        }
        
        const suggestedSheet = XLSX.utils.aoa_to_sheet(suggestedData);
        XLSX.utils.book_append_sheet(workbook, suggestedSheet, 'Adjusted IRR Suggestions');
      }
      
      // Generate and download the file
      const fileName = `MATRIX_Repayments_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting to Excel. Please ensure you have a modern browser that supports file downloads.');
    }
  });
}

// Initialize Excel export functionality
setupExcelExport();

  /**
   * Update spreadsheet date mapping summary in ROI tab
   */
  function updateSpreadsheetDateSummary() {
    const dateMappingStatus = document.getElementById('dateMappingStatus');
    if (!dateMappingStatus) return;
    
    if (weekLabels && weekLabels.length > 0) {
      // Determine mapping type
      let mappingType = 'sequential';
      let parsedDateCount = 0;
      
      if (window.weekGroupMapping && window.weekGroupMapping.length > 0) {
        parsedDateCount = window.weekGroupMapping.filter(group => group.parsedDate).length;
        if (parsedDateCount > 0) {
          mappingType = parsedDateCount === weekLabels.length ? 'chronological' : 'hybrid';
        }
      }
      
      let statusText = '';
      if (mappingType === 'chronological') {
        statusText = `${weekLabels.length} columns mapped in sequential order`;
        dateMappingStatus.style.color = '#388e3c';
        dateMappingStatus.innerHTML = statusText + ' ✓';
      } else if (mappingType === 'hybrid') {
        statusText = `${weekLabels.length} columns mapped in sequential order`;
        dateMappingStatus.style.color = '#ff9800';
        dateMappingStatus.innerHTML = statusText + ' ⚠️';
      } else {
        statusText = `${weekLabels.length} columns mapped sequentially (no dates parsed)`;
        dateMappingStatus.style.color = '#1976d2';
        dateMappingStatus.innerHTML = statusText + ' ℹ️';
      }
    } else {
      dateMappingStatus.textContent = 'Upload spreadsheet to see column mapping';
      dateMappingStatus.style.color = '#666';
    }
  }
  
  // -------------------- ROI DATE MAPPING REMOVED --------------------
  // Date mapping now handled directly through spreadsheet column label parsing
  // No manual date selection required
  // -------------------- Enhanced UI State Management --------------------
  function setupEnhancedUIInteractions() {
    // Add smooth transitions for tab switches
    document.querySelectorAll('.tabs button').forEach(btn => {
      btn.addEventListener('click', function() {
        // Add loading state
        this.style.opacity = '0.7';
        setTimeout(() => {
          this.style.opacity = '1';
        }, 150);
      });
    });

    // Enhanced form validation with visual feedback
    document.querySelectorAll('input[type="number"]').forEach(input => {
      input.addEventListener('input', function() {
        const value = parseFloat(this.value);
        if (isNaN(value) || value < 0) {
          this.classList.add('error');
          this.setAttribute('aria-invalid', 'true');
        } else {
          this.classList.remove('error');
          this.setAttribute('aria-invalid', 'false');
        }
      });
    });

    // Add tooltips for accessibility
    document.querySelectorAll('[data-tooltip]').forEach(element => {
      element.setAttribute('aria-describedby', element.id + '-tooltip');
    });

    // Enhanced file upload with drag and drop visual feedback
    const fileInput = document.getElementById('spreadsheetUpload');
    if (fileInput) {
      const fileArea = fileInput.parentElement;
      
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileArea.addEventListener(eventName, preventDefaults, false);
      });

      function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
      }

      ['dragenter', 'dragover'].forEach(eventName => {
        fileArea.addEventListener(eventName, highlight, false);
      });

      ['dragleave', 'drop'].forEach(eventName => {
        fileArea.addEventListener(eventName, unhighlight, false);
      });

      function highlight() {
        fileArea.classList.add('drag-over');
      }

      function unhighlight() {
        fileArea.classList.remove('drag-over');
      }
    }
  }

  // -------------------- Accessibility Enhancements --------------------
  function setupAccessibility() {
    // Add proper ARIA labels and roles
    document.querySelectorAll('.tab-content').forEach((content, index) => {
      content.setAttribute('aria-labelledby', content.id + '-tab');
      content.setAttribute('tabindex', content.classList.contains('active') ? '0' : '-1');
    });

    // Keyboard navigation for tabs
    document.querySelectorAll('.tabs button').forEach(button => {
      button.addEventListener('keydown', function(e) {
        const tabs = Array.from(document.querySelectorAll('.tabs button'));
        const currentIndex = tabs.indexOf(this);
        
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const nextIndex = e.key === 'ArrowRight' 
            ? (currentIndex + 1) % tabs.length 
            : (currentIndex - 1 + tabs.length) % tabs.length;
          tabs[nextIndex].focus();
          tabs[nextIndex].click();
        }
      });
    });

    // Add skip link for screen readers
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'sr-only';
    skipLink.style.cssText = `
      position: absolute;
      left: -10000px;
      top: auto;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    skipLink.addEventListener('focus', () => {
      skipLink.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        z-index: 9999;
        padding: 8px 12px;
        background: var(--brand-primary);
        color: white;
        text-decoration: none;
        border-radius: 4px;
      `;
    });
    skipLink.addEventListener('blur', () => {
      skipLink.style.cssText = `
        position: absolute;
        left: -10000px;
        top: auto;
        width: 1px;
        height: 1px;
        overflow: hidden;
      `;
    });
    document.body.insertBefore(skipLink, document.body.firstChild);
  }

  // -------------------- Mobile Optimizations --------------------
  function setupMobileOptimizations() {
    // Add touch-friendly interactions
    if ('ontouchstart' in window) {
      document.body.classList.add('touch-device');
      
      // Increase touch targets for buttons
      document.querySelectorAll('button').forEach(button => {
        if (button.offsetHeight < 44) {
          button.style.minHeight = '44px';
        }
      });
    }

    // Responsive table handling
    document.querySelectorAll('table').forEach(table => {
      const wrapper = document.createElement('div');
      wrapper.className = 'table-responsive';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  }

  // Initialize enhanced UI features
  setupEnhancedUIInteractions();
  setupAccessibility();
  setupMobileOptimizations();

  function updateAllTabs() {
    console.log('[DEBUG] updateAllTabs: Starting update of all tabs');
    
    // Clear any cached calculation state to ensure fresh data
    clearCalculationCache();
    
    clearRoiSuggestions(); // Clear suggestions when data changes
    renderRepaymentTable();
    updateLoanSummary();
    updateChartAndSummary();
    renderPnlTables();
    renderSummaryTab(); // This already calls renderTornadoChart() internally
    renderRoiSection();
    
    // Update mapping summary banners on all tabs
    // updateMappingSummaryBanners(); // Function not defined, commenting out to prevent errors
    
    // Update NPV display in modal if open
    updateNPVDisplayInModal();
  }
  
  // Only initialize VISTA content initially since VISTA is the default active tab
  const defaultActiveTab = document.querySelector('.tabs button[data-tab].active');
  if (defaultActiveTab && defaultActiveTab.getAttribute('data-tab') === 'pnl') {
    updateAllTabs();
  }
});
