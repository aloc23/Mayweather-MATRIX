# Date Picker Enhancement Documentation

## Overview
This document describes the changes made to enable future date selection (2026, 2027, and beyond) in the ROI tab date pickers.

## Changes Made

### 1. Flatpickr Configuration Update (script.js, line 2328-2331)
**Previous Configuration:**
```javascript
const picker = flatpickr(dateInput, {
  dateFormat: 'Y-m-d',
  minDate: availableWeekStartDates[0],
  maxDate: availableWeekStartDates[availableWeekStartDates.length - 1], // REMOVED
  onChange: function(selectedDates, dateStr, instance) { ... }
});
```

**New Configuration:**
```javascript
const picker = flatpickr(dateInput, {
  dateFormat: 'Y-m-d',
  minDate: availableWeekStartDates[0],
  // Removed maxDate constraint to allow future date selection
  onChange: function(selectedDates, dateStr, instance) { ... }
});
```

### 2. Extended Default Week Generation
Updated all fallback week generation from 52 weeks (~1 year) to 260 weeks (~5 years).

**Locations Updated:**
- Line 1676: `getFilteredWeekIndices()` fallback
- Lines 1790-1791: `getRepaymentArr()` fallbacks
- Lines 1897-1898: `getExplicitRepaymentSchedule()` fallbacks
- Lines 2238-2241: `generateWeekDropdownOptions()` fallbacks
- Lines 2266-2269: `getWeekDisplayText()` fallbacks
- Lines 2324-2325: Flatpickr date picker initialization fallback
- Line 2912: Suggested repayments dropdown fallback
- Lines 3394-3397: `generateAndUpdateSuggestions()` fallbacks
- Lines 3400-3405: ROI calculations fallbacks
- Lines 3805-3810: `renderRoiSection()` fallbacks
- Lines 4237-4239: Excel export fallbacks

**Example Change:**
```javascript
// Before:
Array.from({length: 52}, (_, i) => new Date(2025, 0, 1 + i * 7))

// After:
Array.from({length: 260}, (_, i) => new Date(2025, 0, 1 + i * 7)) // Extended to ~5 years
```

## Library Used
- **Flatpickr v4.6.13** (loaded from CDN)
- Library URL: https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/flatpickr.min.js

## Testing Results
1. ✅ Investment Start Date field (native HTML5 `type="date"` input) successfully accepts future dates (tested with 2027-03-15)
2. ✅ No max attribute constraints on the native date input
3. ✅ Default week arrays extended to 260 weeks, providing support through approximately 2030
4. ✅ Flatpickr configuration updated to remove maxDate constraint

## Impact
- Users can now select dates beyond 2025 for:
  - Investment start dates
  - Repayment schedule dates
  - All date-related calculations in the ROI tab
- The system now supports planning for long-term investments (5+ years)
- No breaking changes to existing functionality

## Notes
- The native HTML5 date input (`investmentStartDate`) never had a max constraint
- The Flatpickr date picker (used in repayment rows) previously limited selection to the last available week date
- When no spreadsheet is loaded, the system now defaults to 260 weeks instead of 52 weeks
- This ensures future-proof date selection for years 2026, 2027, and beyond
