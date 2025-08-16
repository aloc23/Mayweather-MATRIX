// --- Utility Functions & Variable Declarations ---
function getNumberInputValue(id) {
  const el = document.getElementById(id);
  const val = el ? Number(el.value) : NaN;
  return isNaN(val) ? 0 : val;
}
function validateInputs(inputIds) {
  const errors = [];
  inputIds.forEach((id) => {
    const val = getNumberInputValue(id);
    if (val < 0) errors.push(`Value for ${id} cannot be negative`);
    if (isNaN(val)) errors.push(`Value for ${id} is not a number`);
  });
  return errors;
}
const padelInputIds = [
  'padelGround', 'padelStructure', 'padelCourts', 'padelCourtCost', 'padelAmenities',
  'padelPeakHours', 'padelPeakRate', 'padelPeakUtil', 'padelOffHours', 'padelOffRate', 'padelOffUtil',
  'padelDays', 'padelWeeks', 'padelUtil', 'padelInsure', 'padelMaint', 'padelMarket', 'padelAdmin',
  'padelClean', 'padelMisc', 'padelFtMgr', 'padelFtMgrSal', 'padelFtRec', 'padelFtRecSal', 'padelFtCoach',
  'padelFtCoachSal', 'padelPtCoach', 'padelPtCoachSal', 'padelAddStaff', 'padelAddStaffSal'
];
const gymInputIds = [
  'gymEquip', 'gymFloor', 'gymAmen', 'gymWeekMembers', 'gymWeekFee',
  'gymMonthMembers', 'gymMonthFee', 'gymAnnualMembers', 'gymAnnualFee', 'gymUtil', 'gymInsure',
  'gymMaint', 'gymMarket', 'gymAdmin', 'gymClean', 'gymMisc',
  'gymFtTrainer', 'gymFtTrainerSal', 'gymPtTrainer', 'gymPtTrainerSal', 'gymAddStaff', 'gymAddStaffSal'
];
function calculateOperationCosts(prefix) {
  return (
    getNumberInputValue(`${prefix}Util`) +
    getNumberInputValue(`${prefix}Insure`) +
    getNumberInputValue(`${prefix}Maint`) +
    getNumberInputValue(`${prefix}Market`) +
    getNumberInputValue(`${prefix}Admin`) +
    getNumberInputValue(`${prefix}Clean`) +
    getNumberInputValue(`${prefix}Misc`)
  );
}
function calculateStaffCosts(ids) {
  return ids.reduce((sum, [countId, salaryId]) => {
    return sum + getNumberInputValue(countId) * getNumberInputValue(salaryId);
  }, 0);
}
let pnlChart, profitTrendChart, costPieChart, roiLineChart, roiBarChart, roiPieChart, roiBreakEvenChart, tornadoChart;
function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

// --- Vista Tab Navigation & Scroll (excludes Nova/business-analytics) ---
function showTab(tabId) {
  // Prevent Vista from controlling Nova (business-analytics) tab
  if (tabId === 'business-analytics') {
    console.log('Nova tab requested - delegating to Nova system');
    if (window.showNovaTab) {
      window.showNovaTab();
    }
    return;
  }
  
  // Vista tab navigation for all other tabs
  document.querySelectorAll('.tab-content').forEach(sec => {
    sec.classList.toggle('hidden', sec.id !== tabId);
  });
  document.querySelectorAll('nav.tabs button').forEach(btn => {
    const isActive = btn.dataset.tab === tabId;
    btn.classList.toggle('active', isActive);
    if (isActive) btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  });
  
  // Notify Nova that it's no longer active
  if (window.Nova?.tabController) {
    window.Nova.tabController.deactivateNova();
  }
  
  // Handle specific Vista tab initializations
  if (tabId === 'investment-model') {
    // Show P&L sub-tab by default
    showSubTab('pnl');
    updatePnL();
  }
  if (tabId === 'staffing-resourcing') {
    updateStaffingResourcing();
  }
  if (tabId === 'execution-scheduling') {
    // Show Gantt sub-tab by default
    showSubTab('gantt');
    renderGanttTaskList();
    drawGantt();
  }
  if (tabId === 'project-files') {
    loadProjectFiles();
  }
  if (tabId === 'scenarios') {
    renderScenarioList();
    renderScenarioDiff();
  }
  
  // Legacy Vista tab support
  if (tabId === 'pnl') updatePnL();
  if (tabId === 'roi') { updateROI(); drawTornadoChart(); }
  if (tabId === 'summary') generateSummaryReport();
  if (tabId === 'gantt') { renderGanttTaskList(); drawGantt(); }
}

// --- Sub-Tab Navigation ---
function showSubTab(subTabId) {
  // Find the parent tab content that contains the sub-tabs
  const parentTabContent = document.querySelector('.tab-content:not(.hidden)');
  if (!parentTabContent) return;
  
  // Update sub-tab buttons
  parentTabContent.querySelectorAll('.sub-tab').forEach(btn => {
    const isActive = btn.dataset.subtab === subTabId;
    btn.classList.toggle('active', isActive);
  });
  
  // Update sub-tab content - hide all first
  parentTabContent.querySelectorAll('.sub-tab-content').forEach(content => {
    content.classList.add('hidden');
  });
  
  // Show the selected sub-tab content
  const targetContent = parentTabContent.querySelector(`#${subTabId}-section`);
  if (targetContent) {
    targetContent.classList.remove('hidden');
  }
  
  // Handle specific sub-tab initializations
  if (subTabId === 'pnl') {
    updatePnL();
  } else if (subTabId === 'roi') {
    updateROI();
    drawTornadoChart();
  } else if (subTabId === 'capex') {
    updateCapExSummary();
  } else if (subTabId === 'summary') {
    generateSummaryReport();
  } else if (subTabId === 'gantt') {
    renderGanttTaskList();
    drawGantt();
  } else if (subTabId === 'milestones') {
    loadMilestones();
  } else if (subTabId === 'approvals') {
    updatePaybackTracker();
  }
}

window.showTab = showTab;
window.showSubTab = showSubTab;

// --- Padel Calculation ---
window.calculatePadel = function() {
  const errors = validateInputs(padelInputIds);
  if (errors.length) { alert(errors.join('\n')); return; }
  const peakHours = getNumberInputValue('padelPeakHours');
  const peakDays = getNumberInputValue('padelDays');
  const peakWeeks = getNumberInputValue('padelWeeks');
  const peakUtil = getNumberInputValue('padelPeakUtil') / 100;
  const offHours = getNumberInputValue('padelOffHours');
  const offUtil = getNumberInputValue('padelOffUtil') / 100;
  const courts = getNumberInputValue('padelCourts');
  const peakAnnualRevenue = peakHours * getNumberInputValue('padelPeakRate') * peakDays * peakWeeks * courts * peakUtil;
  const offAnnualRevenue = offHours * getNumberInputValue('padelOffRate') * peakDays * peakWeeks * courts * offUtil;
  const totalRevenue = peakAnnualRevenue + offAnnualRevenue;
  const totalOpCosts = calculateOperationCosts('padel');
  const totalStaffCost = calculateStaffCosts([
    ['padelFtMgr', 'padelFtMgrSal'],
    ['padelFtRec', 'padelFtRecSal'],
    ['padelFtCoach', 'padelFtCoachSal'],
    ['padelPtCoach', 'padelPtCoachSal'],
    ['padelAddStaff', 'padelAddStaffSal'],
  ]);
  const netProfit = totalRevenue - totalOpCosts - totalStaffCost;
  const peakAvailable = peakHours * peakDays * peakWeeks;
  const peakUtilized = peakAvailable * peakUtil;
  const offAvailable = offHours * peakDays * peakWeeks;
  const offUtilized = offAvailable * offUtil;
  const utilBreakdown = `
  <h4>Utilization Breakdown (per court)</h4>
  <ul>
    <li>Peak: ${peakHours}h/day × ${peakDays}d/week × ${peakWeeks}w/year = <b>${peakAvailable}</b> hours available</li>
    <li>Peak Utilized: <b>${peakUtilized.toFixed(1)}</b> hours/year (${(peakUtil*100).toFixed(1)}% utilization)</li>
    <li>Off-Peak: ${offHours}h/day × ${peakDays}d/week × ${peakWeeks}w/year = <b>${offAvailable}</b> hours available</li>
    <li>Off-Peak Utilized: <b>${offUtilized.toFixed(1)}</b> hours/year (${(offUtil*100).toFixed(1)}% utilization)</li>
    <li>Total Utilized (all courts): <b>${((peakUtilized + offUtilized) * courts).toFixed(1)}</b> hours/year</li>
  </ul>
  `;
  window.padelData = {
    revenue: totalRevenue,
    costs: totalOpCosts + totalStaffCost,
    profit: netProfit,
    monthlyRevenue: totalRevenue / 12,
    monthlyCosts: (totalOpCosts + totalStaffCost) / 12,
    monthlyProfit: netProfit / 12,
  };
  document.getElementById('padelSummary').innerHTML = `
    <h3>Summary</h3>
    <p><b>Total Revenue:</b> €${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
    <p><b>Operational Costs:</b> €${totalOpCosts.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
    <p><b>Staff Costs:</b> €${totalStaffCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
    <p><b>Net Profit:</b> €${netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
    ${utilBreakdown}
  `;
  updatePnL();
  updateROI();
};

// --- Gym Calculation ---
window.calculateGym = function() {
  const errors = validateInputs(gymInputIds);
  if (errors.length) { alert(errors.join('\n')); return; }
  const weeklyRevenueAnnual = getNumberInputValue('gymWeekMembers') * getNumberInputValue('gymWeekFee') * 52;
  const monthlyRevenueAnnual = getNumberInputValue('gymMonthMembers') * getNumberInputValue('gymMonthFee') * 12;
  const annualRevenueAnnual = getNumberInputValue('gymAnnualMembers') * getNumberInputValue('gymAnnualFee');
  const totalAnnualRevenue = weeklyRevenueAnnual + monthlyRevenueAnnual + annualRevenueAnnual;
  const totalOpCosts = calculateOperationCosts('gym');
  const totalStaffCost = calculateStaffCosts([
    ['gymFtTrainer', 'gymFtTrainerSal'],
    ['gymPtTrainer', 'gymPtTrainerSal'],
    ['gymAddStaff', 'gymAddStaffSal'],
  ]);
  let adjustedAnnualRevenue = totalAnnualRevenue;
  let rampSummary = "";
  if (document.getElementById('gymRamp').checked) {
    const rampDuration = getNumberInputValue('rampDuration');
    const rampEffect = getNumberInputValue('rampEffect') / 100;
    const monthlyRevenue = totalAnnualRevenue / 12;
    let totalRev = 0;
    for (let i = 1; i <= 12; i++) {
      if (i <= rampDuration) {
        totalRev += monthlyRevenue * rampEffect;
      } else {
        totalRev += monthlyRevenue;
      }
    }
    adjustedAnnualRevenue = totalRev;
    rampSummary = `<p><b>Ramp-up:</b> First ${rampDuration} months at ${getNumberInputValue('rampEffect')}% revenue</p>`;
  }
  const netProfit = adjustedAnnualRevenue - totalOpCosts - totalStaffCost;
  window.gymData = {
    revenue: adjustedAnnualRevenue,
    costs: totalOpCosts + totalStaffCost,
    profit: netProfit,
    monthlyRevenue: adjustedAnnualRevenue / 12,
    monthlyCosts: (totalOpCosts + totalStaffCost) / 12,
    monthlyProfit: netProfit / 12,
  };
  document.getElementById('gymSummary').innerHTML = `
    <h3>Summary</h3>
    <p><b>Annual Revenue:</b> €${adjustedAnnualRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
    <p><b>Operational Costs:</b> €${totalOpCosts.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
    <p><b>Staff Costs:</b> €${totalStaffCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
    <p><b>Net Profit:</b> €${netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
    ${rampSummary}
  `;
  updatePnL();
  updateROI();
};
// Legacy compatibility functions that now use centralized state
function gymIncluded() {
  return window.selectionStateManager ? window.selectionStateManager.isGymIncluded() : 
         document.getElementById('includeGym')?.checked ?? true;
}

function gymIncludedROI() {
  return window.selectionStateManager ? window.selectionStateManager.isGymIncluded() : 
         document.getElementById('includeGymROI')?.checked ?? true;
}

function padelIncluded() {
  return window.selectionStateManager ? window.selectionStateManager.isPadelIncluded() : true;
}

// --- PnL Calculation and Charts ---
function updatePnL() {
  // Get selected projects from centralized state
  const selectedProjects = window.selectionStateManager ? 
    window.selectionStateManager.getSelectedProjectTypes() : [];
  
  let totalRevenue = 0;
  let totalCosts = 0;
  let totalProfit = 0;
  let monthlyRevenue = 0;
  let monthlyCosts = 0;
  let monthlyProfit = 0;
  
  const projectData = [];
  
  // Calculate totals for selected projects using centralized state
  selectedProjects.forEach(projectId => {
    const result = window.calculationEngine?.getCalculation(projectId);
    if (result) {
      totalRevenue += result.revenue.annual;
      totalCosts += result.costs.annual;
      totalProfit += result.profit;
      monthlyRevenue += result.revenue.monthly;
      monthlyCosts += result.costs.annual / 12;
      monthlyProfit += result.profit / 12;
      
      projectData.push({
        name: result.typeName,
        revenue: result.revenue.annual,
        costs: result.costs.annual,
        profit: result.profit
      });
    }
  });
  
  // Show blank data when no projects are selected (removed fallback to legacy calculations)
  if (selectedProjects.length === 0) {
    // Show blank state when no projects are selected
    totalRevenue = 0;
    totalCosts = 0;
    totalProfit = 0;
    monthlyRevenue = 0;
    monthlyCosts = 0;
    monthlyProfit = 0;
  }
  
  const summaryDiv = document.getElementById('pnlSummary');
  if (selectedProjects.length === 0) {
    // Show empty state message when no projects are selected
    const projectsList = 'No projects selected';
    summaryDiv.innerHTML = `
      <p><strong>Selected Projects:</strong> ${projectsList}</p>
      <p><em>Choose projects from the dropdown above to see financial analysis.</em></p>
      <p><b>Total Revenue:</b> €0</p>
      <p><b>Total Costs:</b> €0</p>
      <p><b>Net Profit:</b> €0</p>
    `;
  } else {
    const projectsList = projectData.length > 0 ? 
      projectData.map(p => p.name).join(', ') : 
      'No projects selected';
      
    summaryDiv.innerHTML = `
      <p><strong>Selected Projects:</strong> ${projectsList}</p>
      <p><b>Total Revenue:</b> €${Math.round(totalRevenue).toLocaleString('en-US')}</p>
      <p><b>Total Costs:</b> €${Math.round(totalCosts).toLocaleString('en-US')}</p>
      <p><b>Net Profit:</b> €${Math.round(totalProfit).toLocaleString('en-US')}</p>
    `;
  }
  
  // Monthly breakdown
  const tbody = document.querySelector('#monthlyBreakdown tbody');
  tbody.innerHTML = '';
  for (let i = 1; i <= 12; i++) {
    const rev = monthlyRevenue || (totalRevenue / 12);
    const costs = monthlyCosts || (totalCosts / 12);
    const profit = monthlyProfit || (totalProfit / 12);
    const row = `<tr><td>${i}</td><td>€${rev.toFixed(2)}</td><td>€${costs.toFixed(2)}</td><td>€${profit.toFixed(2)}</td></tr>`;
    tbody.insertAdjacentHTML('beforeend', row);
  }
  
  // Cash flow calculation
  const cashFlowBody = document.querySelector('#cashFlowTable tbody');
  let opening = 0;
  cashFlowBody.innerHTML = '';
  for (let i = 1; i <= 12; i++) {
    const inflow = monthlyRevenue || (totalRevenue / 12);
    const outflow = monthlyCosts || (totalCosts / 12);
    const closing = opening + inflow - outflow;
    cashFlowBody.insertAdjacentHTML('beforeend',
      `<tr><td>${i}</td><td>€${opening.toFixed(2)}</td><td>€${inflow.toFixed(2)}</td><td>€${outflow.toFixed(2)}</td><td>€${closing.toFixed(2)}</td></tr>`);
    opening = closing;
  }
  
  // Charts - Only create if Chart.js is available
  if (typeof Chart !== 'undefined') {
    if (pnlChart) pnlChart.destroy();
    if (profitTrendChart) profitTrendChart.destroy();
    if (costPieChart) costPieChart.destroy();
    
    // PnL Chart
    const pnlCanvasEl = document.getElementById('pnlChart');
    if (pnlCanvasEl) {
      const ctxPnl = pnlCanvasEl.getContext('2d');
      pnlChart = new Chart(ctxPnl, {
        type: 'bar',
        data: {
          labels: ['Revenue', 'Costs', 'Profit'],
          datasets: [{
            label: 'Annual Amount (€)',
            data: [totalRevenue, totalCosts, totalProfit],
            backgroundColor: ['#4caf50', '#f44336', '#2196f3']
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }
    
    // Profit Trend Chart
    const profitTrendCanvasEl = document.getElementById('profitTrendChart');
    if (profitTrendCanvasEl) {
      const ctxProfitTrend = profitTrendCanvasEl.getContext('2d');
      const monthlyProfits = new Array(12).fill(totalProfit / 12);
      profitTrendChart = new Chart(ctxProfitTrend, {
        type: 'line',
        data: {
          labels: [...Array(12).keys()].map(m => `Month ${m + 1}`),
          datasets: [{
            label: 'Profit',
            data: monthlyProfits,
            fill: true,
            backgroundColor: 'rgba(33,150,243,0.2)',
            borderColor: 'rgba(33,150,243,1)',
            borderWidth: 2,
            tension: 0.3
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }
    
    // Cost Pie Chart - show breakdown by project
    const costPieCanvasEl = document.getElementById('costPieChart');
    if (costPieCanvasEl) {
      const ctxCostPie = costPieCanvasEl.getContext('2d');
      const costLabels = projectData.length > 0 ? 
        projectData.map(p => `${p.name} Costs`) : 
        ['No Data'];
      const costData = projectData.length > 0 ? 
        projectData.map(p => p.costs) : 
        [0];
        
      costPieChart = new Chart(ctxCostPie, {
        type: 'pie',
        data: {
          labels: costLabels,
          datasets: [{
            data: costData,
            backgroundColor: ['#f39c12', '#3498db', '#e74c3c', '#2ecc71', '#9b59b6']
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }
  } else {
    console.warn('Chart.js not available, skipping P&L charts');
  }
}
function getTotalInvestment() {
  return (
    getNumberInputValue('padelGround') +
    getNumberInputValue('padelStructure') +
    (getNumberInputValue('padelCourts') * getNumberInputValue('padelCourtCost')) +
    getNumberInputValue('padelAmenities') +
    getNumberInputValue('gymEquip') +
    getNumberInputValue('gymFloor') +
    getNumberInputValue('gymAmen')
  );
}

// --- ROI calculations and charts ---
window.updateROIAdjustmentLabel = function(val) {
  document.getElementById('roiRevAdjustLabel').textContent = `${getNumberInputValue('roiRevAdjust')}%`;
  document.getElementById('roiCostAdjustLabel').textContent = `${getNumberInputValue('roiCostAdjust')}%`;
  updateROI();
};
window.updateRampDurationLabel = function(val) {
  document.getElementById('rampDurationLabel').textContent = val;
};
window.updateRampEffectLabel = function(val) {
  document.getElementById('rampEffectLabel').textContent = `${val}%`;
};
function updateROI() {
  // Use centralized state manager to get selected projects
  const selectedProjects = window.selectionStateManager ? 
    window.selectionStateManager.getSelectedProjectTypes() : [];
  
  const revAdjust = getNumberInputValue('roiRevAdjust') / 100;
  const costAdjust = getNumberInputValue('roiCostAdjust') / 100;
  
  let totalRevenue = 0;
  let totalCosts = 0;
  let totalInvestment = 0;
  let projectData = [];
  
  // Calculate totals for selected projects using centralized calculation engine
  selectedProjects.forEach(projectId => {
    const result = window.calculationEngine?.getCalculation(projectId);
    if (result) {
      const adjustedRevenue = result.revenue.annual * revAdjust;
      const adjustedCosts = result.costs.annual * costAdjust;
      const adjustedProfit = adjustedRevenue - adjustedCosts;
      
      totalRevenue += adjustedRevenue;
      totalCosts += adjustedCosts;
      totalInvestment += result.investment.total;
      
      projectData.push({
        id: projectId,
        name: result.typeName,
        revenue: adjustedRevenue,
        costs: adjustedCosts,
        profit: adjustedProfit,
        investment: result.investment.total
      });
    }
  });
  
  const annualProfit = totalRevenue - totalCosts;
  const paybackYears = annualProfit > 0 ? Math.ceil(totalInvestment / annualProfit) : '∞';
  document.getElementById('yearsToROIText').innerHTML = `<div class="roi-summary">Estimated Payback Period: <b>${paybackYears} year(s)</b></div>`;
  let cumulativeProfit = 0;
  const years = [...Array(10).keys()].map(i => i + 1);
  const cumulativeProfits = years.map(year => {
    cumulativeProfit += annualProfit;
    return cumulativeProfit;
  });
  const paybackBody = document.querySelector('#paybackTable tbody');
  if (paybackBody) {
    paybackBody.innerHTML = '';
    cumulativeProfits.forEach((val, idx) => {
      paybackBody.insertAdjacentHTML('beforeend', `<tr><td>${years[idx]}</td><td>€${val.toFixed(2)}</td></tr>`);
    });
  }
  // Skip chart generation if Chart is not available (CDN blocked)
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js not available, skipping ROI charts');
    return;
  }
  
  if (roiLineChart) roiLineChart.destroy();
  if (roiBarChart) roiBarChart.destroy();
  if (roiPieChart) roiPieChart.destroy();
  if (roiBreakEvenChart) roiBreakEvenChart.destroy();
  
  // Only create charts if we have canvas elements
  const lineCanvas = document.getElementById('roiLineChart');
  const barCanvas = document.getElementById('roiBarChart'); 
  const pieCanvas = document.getElementById('roiPieChart');
  const breakEvenCanvas = document.getElementById('roiBreakEvenChart');
  
  // Line Chart: Cumulative Profit Over Time
  if (lineCanvas) {
    const ctxRoiLine = lineCanvas.getContext('2d');
    roiLineChart = new Chart(ctxRoiLine, {
      type: 'line',
      data: {
        labels: years.map(y => `Year ${y}`),
        datasets: [{
          label: 'Cumulative Profit (€)',
          data: cumulativeProfits,
          borderColor: '#27ae60',
          fill: false,
          tension: 0.2
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
  
  // Bar Chart: Annual Profit Breakdown by Project Type
  if (barCanvas && projectData.length > 0) {
    const ctxRoiBar = barCanvas.getContext('2d');
    roiBarChart = new Chart(ctxRoiBar, {
      type: 'bar',
      data: {
        labels: projectData.map(p => p.name),
        datasets: [{
          label: 'Annual Profit (€)',
          data: projectData.map(p => p.profit),
          backgroundColor: projectData.map((_, i) => ['#e67e22', '#2980b9', '#8e44ad', '#27ae60', '#f39c12'][i % 5])
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
  
  // Pie Chart: Investment Breakdown
  if (pieCanvas && projectData.length > 0) {
    const ctxRoiPie = pieCanvas.getContext('2d');
    roiPieChart = new Chart(ctxRoiPie, {
      type: 'pie',
      data: {
        labels: projectData.map(p => `${p.name} Investment`),
        datasets: [{
          data: projectData.map(p => p.investment),
          backgroundColor: projectData.map((_, i) => ['#c0392b', '#2980b9', '#8e44ad', '#27ae60', '#f39c12'][i % 5])
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
  
  // Break-even Chart: Cumulative Profit vs Investment
  if (breakEvenCanvas) {
    const ctxBreakEven = breakEvenCanvas.getContext('2d');
    roiBreakEvenChart = new Chart(ctxBreakEven, {
      type: 'line',
      data: {
        labels: years.map(y => `Year ${y}`),
        datasets: [
          {
            label: 'Cumulative Profit',
            data: cumulativeProfits,
            borderColor: '#27ae60',
            fill: false,
            tension: 0.2,
            pointRadius: 3,
          },
          {
            label: 'Total Investment',
            data: new Array(years.length).fill(totalInvestment),
            borderColor: '#c0392b',
            borderDash: [10, 5],
            fill: false,
            pointRadius: 0,
            tension: 0
          }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
  // Update ROI KPIs
  const roiKPIs = document.getElementById('roiKPIs');
  const roiPercentages = [
    { year: 1, roi: annualProfit / totalInvestment * 100 },
    { year: 3, roi: annualProfit * 3 / totalInvestment * 100 },
    { year: 5, roi: annualProfit * 5 / totalInvestment * 100 }
  ];
  roiKPIs.innerHTML = '<h3>ROI Percentages</h3><ul>' + roiPercentages.map(item => {
    return `<li>Year ${item.year}: ${isFinite(item.roi) ? item.roi.toFixed(1) + '%' : 'N/A'}</li>`;
  }).join('') + '</ul>';
}
window.updateROI = updateROI;

// --- Tornado Chart (Sensitivity Analysis) ---
function drawTornadoChart() {
  // Skip if Chart is not available (CDN blocked)
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js not available, skipping tornado chart');
    return;
  }

  // Get currently selected projects from centralized state
  const selectedProjects = window.selectionStateManager ? 
    window.selectionStateManager.getSelectedProjectTypes() : [];

  if (selectedProjects.length === 0) {
    console.log('No projects selected for tornado chart');
    return;
  }

  // Get dynamic key variables from selected projects
  const keyVars = [];
  
  selectedProjects.forEach(projectId => {
    const projectType = window.projectTypeManager?.getProjectType(projectId);
    if (!projectType) return;
    
    // Get variables for this project type from its form
    const projectFieldPrefix = projectId;
    
    // Add project-specific variables based on project type
    if (projectId === 'padel') {
      keyVars.push(
        { label: 'Padel Utilization', id: 'padelPeakUtil', projectId: 'padel' },
        { label: 'Padel Peak Rate', id: 'padelPeakRate', projectId: 'padel' },
        { label: 'Padel Staff Salary', id: 'padelFtMgrSal', projectId: 'padel' }
      );
    } else if (projectId === 'gym') {
      keyVars.push(
        { label: 'Gym Weekly Members', id: 'gymWeekMembers', projectId: 'gym' },
        { label: 'Gym Weekly Fee', id: 'gymWeekFee', projectId: 'gym' },
        { label: 'Gym Staff Salary', id: 'gymFtTrainerSal', projectId: 'gym' }
      );
    } else {
      // For dynamic projects, get key revenue and cost variables from form
      const formData = window.dynamicUI?.getFormData(projectId);
      if (formData) {
        // Try to find key revenue variables
        Object.keys(formData).forEach(key => {
          if (key.includes('Rate') || key.includes('Fee') || key.includes('Price') || key.includes('Members')) {
            keyVars.push({
              label: `${projectType.name} ${key}`,
              id: key,
              projectId: projectId
            });
          }
        });
      }
    }
  });

  // If no key variables found, use generic approach
  if (keyVars.length === 0) {
    console.log('No key variables found for tornado chart');
    return;
  }

  // Calculate sensitivity impacts
  const impacts = keyVars.map(v => {
    const element = document.getElementById(v.id);
    if (!element) return 0;
    
    const orig = getNumberInputValue(v.id);
    if (orig === 0) return 0;
    
    let minVal = Math.max(0, orig * 0.8);
    let maxVal = orig * 1.2;
    
    // Calculate baseline profit
    let baselineProfit = 0;
    selectedProjects.forEach(projectId => {
      const result = window.calculationEngine?.getCalculation(projectId);
      if (result) baselineProfit += result.profit;
    });
    
    // Test low value impact
    element.value = minVal;
    triggerCalculationUpdate(v.projectId);
    let lowProfit = 0;
    selectedProjects.forEach(projectId => {
      const result = window.calculationEngine?.getCalculation(projectId);
      if (result) lowProfit += result.profit;
    });
    
    // Test high value impact  
    element.value = maxVal;
    triggerCalculationUpdate(v.projectId);
    let highProfit = 0;
    selectedProjects.forEach(projectId => {
      const result = window.calculationEngine?.getCalculation(projectId);
      if (result) highProfit += result.profit;
    });
    
    // Restore original value
    element.value = orig;
    triggerCalculationUpdate(v.projectId);
    
    return Math.abs(highProfit - lowProfit);
  });

  // Create tornado chart
  const canvas = document.getElementById('tornadoChart');
  if (!canvas) return;

  if (tornadoChart) tornadoChart.destroy();
  const ctx = canvas.getContext('2d');
  tornadoChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: keyVars.map(v => v.label),
      datasets: [{
        label: 'Impact on Net Profit (€)',
        data: impacts,
        backgroundColor: '#f39c12'
      }]
    },
    options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
  });
}

// Helper function to trigger calculation updates for specific project types
function triggerCalculationUpdate(projectId) {
  if (projectId === 'padel' && typeof calculatePadel === 'function') {
    calculatePadel();
  } else if (projectId === 'gym' && typeof calculateGym === 'function') {
    calculateGym();
  } else if (window.dynamicUI && typeof window.dynamicUI.updateCalculations === 'function') {
    window.dynamicUI.updateCalculations(projectId);
  }
}

// --- Scenario Management ---
function getScenarioState() {
  const ids = padelInputIds.concat(gymInputIds);
  const state = {};
  ids.forEach(id => state[id] = getNumberInputValue(id));
  state['roiRevAdjust'] = getNumberInputValue('roiRevAdjust');
  state['roiCostAdjust'] = getNumberInputValue('roiCostAdjust');
  state['scenarioTimestamp'] = Date.now();
  return state;
}
function setScenarioState(state) {
  Object.keys(state).forEach(id => {
    if (document.getElementById(id)) document.getElementById(id).value = state[id];
  });
  calculatePadel();
  calculateGym();
  updateROI();
}
function saveScenario(name) {
  const scenarios = JSON.parse(localStorage.getItem('scenarios') || '[]');
  const state = getScenarioState();
  state['name'] = name;
  scenarios.push(state);
  localStorage.setItem('scenarios', JSON.stringify(scenarios));
}
function renderScenarioList() {
  const scenarios = JSON.parse(localStorage.getItem('scenarios') || '[]');
  const listDiv = document.getElementById('scenarioList');
  listDiv.innerHTML = scenarios.map((s, i) =>
    `<div>
      <b>${s.name}</b>
      <button onclick="loadScenario(${i})">Load</button>
      <button onclick="deleteScenario(${i})">Delete</button>
      <input type="checkbox" id="diff${i}" onchange="renderScenarioDiff()" /> Compare
    </div>`
  ).join('');
}
window.loadScenario = function(i) {
  const scenarios = JSON.parse(localStorage.getItem('scenarios') || '[]');
  setScenarioState(scenarios[i]);
};
window.deleteScenario = function(i) {
  let scenarios = JSON.parse(localStorage.getItem('scenarios') || '[]');
  scenarios.splice(i, 1);
  localStorage.setItem('scenarios', JSON.stringify(scenarios));
  renderScenarioList();
  renderScenarioDiff();
};
function renderScenarioDiff() {
  const scenarios = JSON.parse(localStorage.getItem('scenarios') || '[]');
  const indices = [];
  scenarios.forEach((s, i) => { if (document.getElementById('diff' + i)?.checked) indices.push(i); });
  const container = document.getElementById('scenarioDiffContainer');
  if (indices.length < 2) { container.innerHTML = ""; return; }
  const a = scenarios[indices[0]], b = scenarios[indices[1]];
  let diffHtml = `<table class="breakdown-table"><tr><th>Variable</th><th>${a.name}</th><th>${b.name}</th></tr>`;
  Object.keys(a).forEach(k => {
    if (typeof a[k] === "number" && a[k] !== b[k]) {
      diffHtml += `<tr><td>${k}</td><td style="background:#fffae6">${a[k]}</td><td style="background:#e6fff3">${b[k]}</td></tr>`;
    }
  });
  diffHtml += "</table>";
  container.innerHTML = diffHtml;
}
document.getElementById('scenarioForm').onsubmit = (e) => {
  e.preventDefault();
  const name = document.getElementById('scenarioName').value.trim();
  if (name) {
    saveScenario(name);
    renderScenarioList();
    document.getElementById('scenarioName').value = '';
  }
};

// --- Summary Report (for PDF/Excel) ---
function generateSummaryReport() {
  // Get selected projects from centralized state
  const selectedProjects = window.selectionStateManager ? 
    window.selectionStateManager.getSelectedProjectTypes() : [];
  
  let totalRevenue = 0;
  let totalCosts = 0;
  let totalProfit = 0;
  let totalInvestment = 0;
  const projectData = [];
  
  // Calculate totals for selected projects using centralized calculation engine
  selectedProjects.forEach(projectId => {
    const result = window.calculationEngine?.getCalculation(projectId);
    if (result) {
      totalRevenue += result.revenue.annual;
      totalCosts += result.costs.annual;
      totalProfit += result.profit;
      totalInvestment += result.investment || 0;
      
      projectData.push({
        name: result.typeName,
        revenue: result.revenue.annual,
        costs: result.costs.annual,
        profit: result.profit,
        investment: result.investment || 0
      });
    }
  });
  
  const reportContent = document.getElementById('reportContent');
  if (reportContent) {
    if (selectedProjects.length === 0) {
      reportContent.innerHTML = `
        <h3>Investment Summary Report</h3>
        <p><em>No projects selected. Choose projects from the dropdown above to generate a summary report.</em></p>
      `;
      return;
    }
    
    const projectsList = selectedProjects.map(id => {
      const project = window.projectTypeManager?.getProjectType(id);
      return project ? project.name : id;
    }).join(', ');
    
    reportContent.innerHTML = `
      <h3>Investment Summary Report</h3>
      <p><strong>Selected Projects:</strong> ${projectsList}</p>
      
      <h4>Key Financials</h4>
      <ul>
        <li><b>Total Revenue:</b> €${totalRevenue.toLocaleString()}</li>
        <li><b>Total Costs:</b> €${totalCosts.toLocaleString()}</li>
        <li><b>Net Profit:</b> €${totalProfit.toLocaleString()}</li>
        <li><b>Total Investment:</b> €${totalInvestment.toLocaleString()}</li>
      </ul>
      
      <h4>Project Breakdown</h4>
      <ul>
        ${projectData.map(project => `
          <li><b>${project.name}:</b> €${project.revenue.toLocaleString()} revenue, €${project.profit.toLocaleString()} profit</li>
        `).join('')}
      </ul>
      
      <div><canvas id="summaryPnL" height="150"></canvas></div>
      <div><canvas id="summaryROI" height="150"></canvas></div>
    `;
    
    // Skip chart generation if Chart is not available (CDN blocked)
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js not available, skipping summary charts');
      return;
    }
    
    // Destroy existing charts
    if (window.summaryPnLChart) window.summaryPnLChart.destroy();
    if (window.summaryROIChart) window.summaryROIChart.destroy();
    
    // Create profit chart
    const pnlCanvas = document.getElementById('summaryPnL');
    if (pnlCanvas) {
      window.summaryPnLChart = new Chart(pnlCanvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: projectData.map(p => p.name),
          datasets: [{
            label: 'Net Profit (€)', 
            data: projectData.map(p => p.profit), 
            backgroundColor: projectData.map((_, i) => ['#4caf50', '#2980b9', '#f39c12', '#e74c3c', '#9b59b6'][i % 5])
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }
    
    // Create investment breakdown chart
    const roiCanvas = document.getElementById('summaryROI');
    if (roiCanvas && projectData.length > 0) {
      window.summaryROIChart = new Chart(roiCanvas.getContext('2d'), {
        type: 'pie',
        data: {
          labels: projectData.map(p => `${p.name} Investment`),
          datasets: [{
            data: projectData.map(p => p.investment),
            backgroundColor: projectData.map((_, i) => ['#f39c12', '#3498db', '#e74c3c', '#2ecc71', '#9b59b6'][i % 5])
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }
  }
}
// --- Export as PDF ---
window.exportPDF = function() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.html(document.getElementById('reportContent'), {
    callback: function (pdf) { pdf.save("Investment_Summary.pdf"); },
    x: 10, y: 10
  });
};
// --- Export as Excel ---
window.exportExcel = function() {
  const wb = XLSX.utils.book_new();
  const table = document.getElementById('monthlyBreakdown');
  const ws = XLSX.utils.table_to_sheet(table);
  XLSX.utils.book_append_sheet(wb, ws, "Monthly Breakdown");
  XLSX.writeFile(wb, "Investment_Breakdown.xlsx");
};

// ------- Interactive Gantt: Add/Edit/Remove tasks, save in localStorage -------
let ganttTasks = [];
const ganttKey = 'userGanttTasks';
let currentViewMode = 'Month';

// --- Gantt LocalStorage ---
function loadGanttTasks() {
  const saved = localStorage.getItem(ganttKey);
  if (saved) {
    ganttTasks = JSON.parse(saved);
  } else {
    ganttTasks = [
      { id: '1', name: 'Feasibility Study & Business Plan', start: '2025-01-01', end: '2025-01-21', progress: 100 },
      { id: '2', name: 'Site Selection & Acquisition', start: '2025-01-22', end: '2025-02-15', progress: 100 },
      { id: '3', name: 'Planning & Permits', start: '2025-02-16', end: '2025-03-10', progress: 80 },
      { id: '4', name: 'Design & Engineering', start: '2025-02-20', end: '2025-03-25', progress: 60 }
    ];
  }
}
function saveGanttTasks() {
  localStorage.setItem(ganttKey, JSON.stringify(ganttTasks));
}

// --- Gantt Task List Render ---
function renderGanttTaskList() {
  const list = document.getElementById('ganttTaskList');
  list.innerHTML = '';
  ganttTasks.forEach(task => {
    const row = document.createElement('div');
    row.className = 'gantt-task-row';
    row.innerHTML = `
      <span class="gantt-task-name">${task.name}</span>
      <span class="gantt-task-start">${task.start}</span>
      <span class="gantt-task-end">${task.end}</span>
      <span class="gantt-task-progress">${task.progress}%</span>
      <div class="gantt-actions">
        <button class="gantt-action-btn" onclick="editGanttTask('${task.id}')">Edit</button>
        <button class="gantt-action-btn" onclick="deleteGanttTask('${task.id}')">Delete</button>
      </div>
    `;
    list.appendChild(row);
  });
}

// --- Gantt Edit/Delete/Validation ---
window.editGanttTask = function(id) {
  const t = ganttTasks.find(t => t.id === id);
  if (t) {
    document.getElementById('ganttEditId').value = t.id;
    document.getElementById('ganttTaskName').value = t.name;
    document.getElementById('ganttTaskStart').value = t.start;
    document.getElementById('ganttTaskEnd').value = t.end;
    document.getElementById('ganttTaskProgress').value = t.progress;
  }
};
window.deleteGanttTask = function(id) {
  ganttTasks = ganttTasks.filter(t => t.id !== id);
  saveGanttTasks();
  renderGanttTaskList();
  drawGantt();
};
document.getElementById('ganttTaskForm').onsubmit = function(e) {
  e.preventDefault();
  const id = document.getElementById('ganttEditId').value || Date.now().toString();
  const name = document.getElementById('ganttTaskName').value;
  const start = document.getElementById('ganttTaskStart').value;
  const end = document.getElementById('ganttTaskEnd').value;
  if (new Date(start) > new Date(end)) {
    alert('End date must be after start date.');
    return;
  }
  const progress = Number(document.getElementById('ganttTaskProgress').value);
  const idx = ganttTasks.findIndex(t => t.id === id);
  if (idx >= 0) {
    ganttTasks[idx] = { id, name, start, end, progress };
  } else {
    ganttTasks.push({ id, name, start, end, progress });
  }
  saveGanttTasks();
  renderGanttTaskList();
  drawGantt();
  this.reset();
  document.getElementById('ganttEditId').value = '';
};
document.getElementById('ganttTaskResetBtn').onclick = function() {
  document.getElementById('ganttEditId').value = '';
  document.getElementById('ganttTaskForm').reset();
};

// --- Gantt View Modes ---
window.setGanttViewMode = function(mode) {
  currentViewMode = mode;
  drawGantt();
};

// --- Gantt Export CSV ---
window.exportGanttCSV = function() {
  let csv = "Name,Start,End,Progress\n";
  ganttTasks.forEach(t => {
    csv += `${t.name},${t.start},${t.end},${t.progress}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "Gantt_Tasks.csv";
  link.click();
};

// --- Gantt Draw & Inline Progress, Highlight Today ---
function drawGantt() {
  loadGanttTasks();
  const ganttContainer = document.getElementById('ganttContainer');
  ganttContainer.innerHTML = "";
  const ganttDiv = document.createElement('div');
  ganttDiv.id = "ganttChartDiv";
  ganttContainer.appendChild(ganttDiv);
  if (ganttTasks.length > 0) {
    const gantt = new Gantt("#ganttChartDiv", ganttTasks, {
      view_mode: currentViewMode,
      on_progress_change: (task, progress) => {
        const idx = ganttTasks.findIndex(t => t.id === task.id);
        if (idx >= 0) {
          ganttTasks[idx].progress = progress;
          saveGanttTasks();
          renderGanttTaskList();
        }
      }
    });
    setTimeout(highlightToday, 100);
  }
}
function highlightToday() {
  const today = new Date().toISOString().slice(0, 10);
  const labels = document.querySelectorAll('.gantt .grid .grid-row .grid-date');
  labels.forEach(label => {
    if (label.dataset && label.dataset.date === today) {
      label.classList.add('gantt-today-highlight');
    }
  });
}

// --- Initialization ---
window.onload = function () {
  // Initialize templates
  initializeTemplates();
  
  // Initialize sub-tab navigation
  initializeSubTabNavigation();
  
  // Initialize the generic P&L system
  initializeGenericPLSystem();
  
  // Initialize centralized state management system
  initializeCentralizedStateManagement();
  
  // Set up Vista tab navigation (excluding Nova/business-analytics)
  document.querySelectorAll('nav.tabs button').forEach(btn => {
    btn.addEventListener('click', function () {
      const tabId = this.dataset.tab;
      if (tabId && tabId !== 'business-analytics') {
        // Vista tabs use the original showTab function
        showTab(tabId);
      }
      // Note: Nova (business-analytics) tab handled independently by nova-init.js
    });
  });

  // Do not initialize dynamic UI for business analytics - Nova handles this independently
  // The business-analytics tab is now managed by Nova system
  
  // Show default tab based on Nova availability
  if (window.Nova?.initializer?.isInitialized()) {
    // If Nova is ready, show it
    window.showNovaTab();
  } else {
    // Otherwise show investment model as default Vista tab
    showTab('investment-model');
  }

  // Legacy event listeners (kept for backward compatibility)
  document.getElementById('calculatePadelBtn')?.addEventListener('click', calculatePadel);
  document.getElementById('calculateGymBtn')?.addEventListener('click', calculateGym);
  document.getElementById('includeGym')?.addEventListener('change', updatePnL);
  document.getElementById('includeGymROI')?.addEventListener('change', updateROI);
  document.getElementById('ganttTaskResetBtn')?.addEventListener('click', function() {
    document.getElementById('ganttEditId').value = '';
    document.getElementById('ganttTaskForm').reset();
  });
  document.getElementById('exportGanttCSVBtn')?.addEventListener('click', exportGanttCSV);

  // Legacy calculations removed - data should only appear when user selects projects
  // calculatePadel();
  // calculateGym();
  renderScenarioList?.();
  renderScenarioDiff?.();
  renderGanttTaskList();
  drawGantt();
  
  // Initialize new tab functionalities
  initializeSubTabs();
  initializeStaffingResourcing();
  initializeProjectFiles();
  initializeExecutionScheduling();
};

/**
 * Initialize the centralized state management system
 * This connects all tabs to use the same state for business/project selection
 */
function initializeCentralizedStateManagement() {
  // Wait for state manager to be available
  if (!window.selectionStateManager) {
    setTimeout(initializeCentralizedStateManagement, 100);
    return;
  }

  console.log('Initializing centralized state management...');

  // Set up state change listeners for Investment Model tab
  window.selectionStateManager.addEventListener('projectTypesChanged', (data) => {
    console.log('Investment Model: Project types changed', data);
    updatePnL();
    updateROI();
  });

  // Set up state change listeners for Staffing tab
  window.selectionStateManager.addEventListener('projectTypesChanged', (data) => {
    console.log('Staffing: Project types changed', data);
    updateStaffingResourcing();
  });

  // Set up state change listeners for all calculation updates
  window.selectionStateManager.addEventListener('activeProjectChanged', (data) => {
    console.log('Active project changed, updating calculations', data);
    if (data.new) {
      // Trigger recalculation for the new active project
      if (typeof window.dynamicUI?.calculateProjectType === 'function') {
        window.dynamicUI.calculateProjectType(data.new);
      }
    }
  });

  // Migrate any existing legacy state
  migrateLegacyState();

  console.log('Centralized state management initialized');
}

/**
 * Migrate any existing legacy state to the centralized system
 */
function migrateLegacyState() {
  // Check if dynamic UI has existing selections
  if (window.dynamicUI) {
    // Try to get existing selections from the old dynamic UI system
    const businessType = window.dynamicUI.selectedBusinessType;
    const projectType = window.dynamicUI.selectedProjectType;
    
    if (businessType && projectType) {
      console.log('Migrating legacy state:', { businessType, projectType });
      window.selectionStateManager.migrateFromDynamicUI(businessType, projectType);
    }
  }

  // Check legacy gym/padel checkboxes and migrate if needed
  const gymCheckbox = document.getElementById('includeGym');
  const gymROICheckbox = document.getElementById('includeGymROI');
  
  if (gymCheckbox?.checked || gymROICheckbox?.checked) {
    console.log('Migrating legacy gym selection');
    window.selectionStateManager.setBusinessType('member');
    window.selectionStateManager.addProjectType('gym');
  }
}

// Initialize sub-tab navigation
function initializeSubTabs() {
  // Add event listeners for sub-tab navigation
  document.querySelectorAll('.sub-tab').forEach(btn => {
    btn.addEventListener('click', function() {
      const subTabId = this.dataset.subtab;
      if (subTabId) {
        showSubTab(subTabId);
      }
    });
  });
  
  // Add event listeners for collapsible sections
  document.querySelectorAll('.collapsible-toggle').forEach(btn => {
    btn.addEventListener('click', function() {
      const expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      const content = document.getElementById(this.getAttribute('aria-controls'));
      if (content) {
        if (expanded) {
          content.classList.add('collapsed');
          this.textContent = '► ' + this.textContent.replace(/^▼|^►/, '').trim();
        } else {
          content.classList.remove('collapsed');
          this.textContent = '▼ ' + this.textContent.replace(/^▼|^►/, '').trim();
        }
      }
    });
  });
}

// New functions for consolidated tabs
function resetInvestmentModel() {
  if (confirm('This will reset all investment model data and adjustments. Are you sure?')) {
    try {
      // 1. Clear calculated data from memory
      window.padelData = null;
      window.gymData = null;
      
      // 2. Reset all form inputs to default values
      resetBusinessFormInputs();
      
      // 3. Reset adjustment sliders
      const roiRevAdjust = document.getElementById('roiRevAdjust');
      const roiCostAdjust = document.getElementById('roiCostAdjust');
      const roiRevAdjustLabel = document.getElementById('roiRevAdjustLabel');
      const roiCostAdjustLabel = document.getElementById('roiCostAdjustLabel');
      
      if (roiRevAdjust) roiRevAdjust.value = 100;
      if (roiCostAdjust) roiCostAdjust.value = 100;
      if (roiRevAdjustLabel) roiRevAdjustLabel.textContent = '100%';
      if (roiCostAdjustLabel) roiCostAdjustLabel.textContent = '100%';
      
      // 4. Clear all summaries and display areas
      clearInvestmentDisplays();
      
      // 5. Clear all tables
      clearInvestmentTables();
      
      // 6. Destroy and reset charts
      resetInvestmentCharts();
      
      // 7. Clear localStorage business data
      clearBusinessDataFromStorage();
      
      // 8. Reset state management and UI
      if (window.selectionStateManager) {
        window.selectionStateManager.resetState();
      }
      
      // 9. Reset dynamic UI
      if (window.dynamicUI) {
        window.dynamicUI.resetSelection();
      }
      
      // 10. Update all calculations to reflect the reset
      updatePnL();
      updateROI();
      updateCapExSummary();
      
      alert('Investment model has been reset successfully');
    } catch (error) {
      console.error('Error during reset:', error);
      alert('Reset completed with some warnings. Please refresh the page if you encounter any issues.');
    }
  }
}

// Helper function to reset all business form inputs to defaults
function resetBusinessFormInputs() {
  // Reset Padel inputs to default values
  const padelDefaults = {
    'padelGround': 50000,
    'padelStructure': 120000,
    'padelCourts': 3,
    'padelCourtCost': 18000,
    'padelAmenities': 20000,
    'padelPeakHours': 4,
    'padelPeakUtil': 70,
    'padelPeakRate': 40,
    'padelOffHours': 2,
    'padelOffUtil': 35,
    'padelOffRate': 25,
    'padelDays': 7,
    'padelWeeks': 52,
    'padelUtil': 5000,
    'padelInsure': 2500,
    'padelMaint': 3000,
    'padelMarket': 4000,
    'padelAdmin': 3500,
    'padelClean': 2000,
    'padelMisc': 1000,
    'padelFtMgr': 1,
    'padelFtMgrSal': 35000,
    'padelFtRec': 1,
    'padelFtRecSal': 21000,
    'padelFtCoach': 1,
    'padelFtCoachSal': 25000,
    'padelPtCoach': 1,
    'padelPtCoachSal': 12000,
    'padelAddStaff': 0,
    'padelAddStaffSal': 0
  };
  
  // Reset Gym inputs to default values
  const gymDefaults = {
    'gymEquip': 35000,
    'gymFloor': 8000,
    'gymAmen': 6000,
    'gymWeekMembers': 60,
    'gymWeekFee': 20,
    'gymMonthMembers': 30,
    'gymMonthFee': 50,
    'gymAnnualMembers': 12,
    'gymAnnualFee': 450,
    'gymUtil': 2500,
    'gymInsure': 1700,
    'gymMaint': 2000,
    'gymMarket': 2500,
    'gymAdmin': 2100,
    'gymClean': 1200,
    'gymMisc': 800,
    'gymFtTrainer': 1,
    'gymFtTrainerSal': 22000,
    'gymPtTrainer': 1,
    'gymPtTrainerSal': 9000,
    'gymAddStaff': 0,
    'gymAddStaffSal': 0
  };
  
  // Apply default values
  Object.entries(padelDefaults).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.value = value;
      // Also update corresponding labels for range inputs
      const label = document.getElementById(id.replace('padel', '') + 'Val');
      if (label) label.value = value;
    }
  });
  
  Object.entries(gymDefaults).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.value = value;
    }
  });
  
  // Reset checkboxes
  const gymRamp = document.getElementById('gymRamp');
  if (gymRamp) gymRamp.checked = false;
}

// Helper function to clear all investment displays
function clearInvestmentDisplays() {
  // Clear main summaries
  const elementsToReset = [
    { id: 'pnlSummary', content: '<p><em>Select a business type and project to view analysis</em></p>' },
    { id: 'yearsToROIText', content: '<div class="roi-summary">Select a business type and project to view ROI analysis</div>' },
    { id: 'roiKPIs', content: '' },
    { id: 'capexSummary', content: '<p><em>Select projects to view capital expenditure analysis</em></p>' },
    { id: 'reportContent', content: '' },
    { id: 'padelSummary', content: '' },
    { id: 'gymSummary', content: '' },
    { id: 'staffingSummary', content: '' }
  ];
  
  elementsToReset.forEach(({ id, content }) => {
    const element = document.getElementById(id);
    if (element) element.innerHTML = content;
  });
}

// Helper function to clear all investment tables
function clearInvestmentTables() {
  const tableIds = [
    'monthlyBreakdown',
    'cashFlowTable', 
    'paybackTable',
    'capexBreakdownTable',
    'roiSensitivityTable',
    'tornadoTable'
  ];
  
  tableIds.forEach(tableId => {
    const tbody = document.querySelector(`#${tableId} tbody`);
    if (tbody) tbody.innerHTML = '';
    
    // Also clear the entire table if it exists
    const table = document.getElementById(tableId);
    if (table && !tbody) table.innerHTML = '';
  });
}

// Helper function to reset all investment charts
function resetInvestmentCharts() {
  try {
    const chartIds = [
      'pnlChart',
      'profitTrendChart', 
      'costPieChart',
      'roiLineChart',
      'roiBarChart',
      'roiPieChart',
      'roiBreakEvenChart',
      'tornadoChart',
      'paybackProgressChart'
    ];
    
    chartIds.forEach(chartId => {
      try {
        // Destroy existing chart instance if it exists and Chart is available
        const canvas = document.getElementById(chartId);
        if (canvas && typeof Chart !== 'undefined') {
          const existingChart = Chart.getChart(canvas);
          if (existingChart) {
            existingChart.destroy();
          }
          // Clear the canvas
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
      } catch (error) {
        console.warn(`Failed to reset chart ${chartId}:`, error);
      }
    });
    
    // Reset global chart variables if they exist
    if (typeof window !== 'undefined') {
      const chartVars = ['pnlChart', 'profitTrendChart', 'costPieChart', 'roiLineChart', 'roiBarChart', 'roiPieChart', 'roiBreakEvenChart', 'tornadoChart'];
      chartVars.forEach(varName => {
        try {
          if (window[varName] && typeof window[varName].destroy === 'function') {
            window[varName].destroy();
          }
          window[varName] = null;
        } catch (error) {
          console.warn(`Failed to reset chart variable ${varName}:`, error);
        }
      });
    }
  } catch (error) {
    console.warn('Error resetting charts:', error);
  }
}

// Helper function to clear business data from localStorage
function clearBusinessDataFromStorage() {
  const businessDataKeys = [
    'matrixNova_selectionState',
    'scenarios',
    'customProjectTypes',
    'projectMilestones',
    'ganttTasks',
    'dynamicFormData',
    'businessAnalyticsState'
  ];
  
  businessDataKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove ${key} from localStorage:`, error);
    }
  });
}

function exportInvestmentSummary() {
  // Create a comprehensive investment summary for export
  const padel = window.padelData || {};
  const gym = gymIncluded() && window.gymData ? window.gymData : {};
  
  const summaryData = {
    timestamp: new Date().toISOString(),
    totalRevenue: (padel.revenue || 0) + (gym.revenue || 0),
    totalCosts: (padel.costs || 0) + (gym.costs || 0),
    totalProfit: (padel.profit || 0) + (gym.profit || 0),
    totalInvestment: getTotalInvestment(),
    projects: [
      ...(padel.revenue ? [{type: 'Padel', ...padel}] : []),
      ...(gym.revenue ? [{type: 'Gym', ...gym}] : [])
    ]
  };
  
  // Create and download JSON file
  const dataStr = JSON.stringify(summaryData, null, 2);
  const dataBlob = new Blob([dataStr], {type: 'application/json'});
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `investment-summary-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function updateCapExSummary() {
  // Get selected projects from centralized state
  const selectedProjects = window.selectionStateManager ? 
    window.selectionStateManager.getSelectedProjectTypes() : [];
  
  let totalInvestment = 0;
  const investmentBreakdown = [];
  
  // Calculate investment for selected projects using centralized calculation engine
  selectedProjects.forEach(projectId => {
    const result = window.calculationEngine?.getCalculation(projectId);
    if (result && result.investment) {
      totalInvestment += result.investment;
      
      // Add investment breakdown for this project
      investmentBreakdown.push({
        project: result.typeName,
        amount: result.investment,
        percentage: 0 // Will calculate after we have total
      });
    }
  });
  
  // Calculate percentages
  investmentBreakdown.forEach(item => {
    item.percentage = totalInvestment > 0 ? ((item.amount / totalInvestment) * 100).toFixed(1) : 0;
  });
  
  const capexSummary = document.getElementById('capexSummary');
  if (capexSummary) {
    if (selectedProjects.length === 0) {
      capexSummary.innerHTML = `
        <h3>Capital Expenditure Summary</h3>
        <p><em>No projects selected. Choose projects from the dropdown above to see CapEx analysis.</em></p>
      `;
    } else {
      const projectsList = selectedProjects.length > 0 ? 
        selectedProjects.map(id => {
          const project = window.projectTypeManager?.getProjectType(id);
          return project ? project.name : id;
        }).join(', ') : 'No projects selected';
        
      capexSummary.innerHTML = `
        <h3>Capital Expenditure Summary</h3>
        <p><strong>Selected Projects:</strong> ${projectsList}</p>
        <p><b>Total Investment:</b> €${totalInvestment.toLocaleString()}</p>
        ${investmentBreakdown.map(item => 
          `<p><b>${item.project} Investment:</b> €${item.amount.toLocaleString()} (${item.percentage}%)</p>`
        ).join('')}
      `;
    }
  }
  
  // Update CapEx breakdown table
  const capexTable = document.querySelector('#capexBreakdownTable tbody');
  if (capexTable) {
    capexTable.innerHTML = '';
    
    if (investmentBreakdown.length > 0) {
      investmentBreakdown.forEach(item => {
        capexTable.insertAdjacentHTML('beforeend',
          `<tr>
            <td>Total Investment</td>
            <td>${item.project}</td>
            <td>€${item.amount.toLocaleString()}</td>
            <td>${item.percentage}%</td>
          </tr>`
        );
      });
    }
  }
}

function initializeStaffingResourcing() {
  // Initialize staffing and resourcing functionality
  updateStaffingResourcing();
}

function updateStaffingResourcing() {
  // Get selected projects from centralized state
  const selectedProjects = window.selectionStateManager ? 
    window.selectionStateManager.getSelectedProjectTypes() : [];
  
  let totalStaffCosts = 0;
  const staffingData = [];
  
  // Calculate costs for each selected project type
  selectedProjects.forEach(projectId => {
    const result = window.calculationEngine?.getCalculation(projectId);
    if (result) {
      totalStaffCosts += result.costs.staffing || 0;
      
      // Add staffing details for this project
      if (result.breakdown?.staffing?.roles) {
        Object.entries(result.breakdown.staffing.roles).forEach(([roleName, role]) => {
          if (role.count > 0) {
            staffingData.push({
              role: role.name || roleName,
              project: result.typeName,
              count: role.count,
              salary: role.salary,
              totalCost: role.totalCost,
              utilization: '100%', // Default utilization
              group: role.group || 'Staff'
            });
          }
        });
      }
    }
  });
  
  // Show blank data when no projects are selected (removed fallback to legacy calculations)
  if (selectedProjects.length === 0) {
    totalStaffCosts = 0;
    // No legacy staffing data added - keep staffingData array empty
  }
  
  const staffingSummary = document.getElementById('staffingSummary');
  if (staffingSummary) {
    if (selectedProjects.length === 0) {
      staffingSummary.innerHTML = `
        <h3>Staffing & Resource Summary</h3>
        <p><strong>Selected Projects:</strong> No projects selected</p>
        <p><em>Choose projects from the dropdown above to see staffing analysis.</em></p>
        <p><b>Total Annual Staffing Costs:</b> €0</p>
        <p><b>Average Monthly Staffing:</b> €0</p>
      `;
    } else {
      const projectsList = selectedProjects.map(id => {
        const project = window.projectTypeManager?.getProjectType(id);
        return project ? project.name : id;
      }).join(', ');
        
      staffingSummary.innerHTML = `
        <h3>Staffing & Resource Summary</h3>
        <p><strong>Selected Projects:</strong> ${projectsList}</p>
        <p><b>Total Annual Staffing Costs:</b> €${totalStaffCosts.toLocaleString()}</p>
        <p><b>Average Monthly Staffing:</b> €${(totalStaffCosts / 12).toLocaleString()}</p>
      `;
    }
  }
  
  // Update staffing breakdown table
  const staffingTable = document.querySelector('#staffingBreakdownTable tbody');
  if (staffingTable) {
    staffingTable.innerHTML = '';
    
    staffingData.forEach(item => {
      const annualCost = item.totalCost || (item.count * item.salary);
      staffingTable.insertAdjacentHTML('beforeend',
        `<tr>
          <td>${item.role}</td>
          <td>${item.project}</td>
          <td>${item.count}</td>
          <td>€${item.salary.toLocaleString()}</td>
          <td>€${annualCost.toLocaleString()}</td>
          <td>${item.utilization}</td>
        </tr>`
      );
    });
    
    // Add a row showing no data if empty
    if (staffingData.length === 0) {
      staffingTable.insertAdjacentHTML('beforeend',
        `<tr>
          <td colspan="6" style="text-align: center; color: #666;">
            No staffing data available. Select a business type and project to view staffing analysis.
          </td>
        </tr>`
      );
    }
  }
}

function resetStaffingResourcing() {
  if (confirm('This will reset all staffing and resourcing data. Are you sure?')) {
    // Clear staffing summary
    const staffingSummary = document.getElementById('staffingSummary');
    if (staffingSummary) {
      staffingSummary.innerHTML = '<p><em>Select a business type and project to view staffing analysis</em></p>';
    }
    
    // Clear staffing tables
    ['staffingBreakdownTable', 'staffingCostTable'].forEach(tableId => {
      const tbody = document.querySelector(`#${tableId} tbody`);
      if (tbody) tbody.innerHTML = '';
    });
    
    alert('Staffing & resourcing data has been reset successfully');
  }
}

function initializeExecutionScheduling() {
  // Initialize milestone management
  const milestoneForm = document.getElementById('milestoneForm');
  if (milestoneForm) {
    milestoneForm.addEventListener('submit', function(e) {
      e.preventDefault();
      addMilestone();
    });
  }
  
  // Initialize approval status handlers
  ['budgetApproval', 'executiveApproval', 'technicalApproval', 'legalApproval'].forEach(id => {
    const select = document.getElementById(id);
    if (select) {
      select.addEventListener('change', updateApprovalStatus);
    }
  });
  
  loadMilestones();
  updatePaybackTracker();
}

function resetExecutionScheduling() {
  if (confirm('This will reset all execution and scheduling data. Are you sure?')) {
    // Reset Gantt tasks
    ganttTasks = [
      { id: '1', name: 'Feasibility Study & Business Plan', start: '2025-01-01', end: '2025-01-21', progress: 100 },
      { id: '2', name: 'Site Selection & Acquisition', start: '2025-01-22', end: '2025-02-15', progress: 100 },
      { id: '3', name: 'Planning & Permits', start: '2025-02-16', end: '2025-03-10', progress: 80 },
      { id: '4', name: 'Design & Engineering', start: '2025-02-20', end: '2025-03-25', progress: 60 }
    ];
    saveGanttTasks();
    renderGanttTaskList();
    drawGantt();
    
    // Clear milestones
    localStorage.removeItem('projectMilestones');
    loadMilestones();
    
    // Reset approval status
    ['budgetApproval', 'executiveApproval', 'technicalApproval', 'legalApproval'].forEach(id => {
      const select = document.getElementById(id);
      if (select) select.value = 'pending';
    });
    
    updatePaybackTracker();
    
    alert('Execution & scheduling data has been reset successfully');
  }
}

function addMilestone() {
  const name = document.getElementById('milestoneName').value;
  const date = document.getElementById('milestoneDate').value;
  const status = document.getElementById('milestoneStatus').value;
  const priority = document.getElementById('milestonePriority').value;
  
  if (!name || !date) {
    alert('Please fill in all required fields');
    return;
  }
  
  const milestones = JSON.parse(localStorage.getItem('projectMilestones') || '[]');
  const milestone = {
    id: Date.now().toString(),
    name,
    date,
    status,
    priority,
    created: new Date().toISOString()
  };
  
  milestones.push(milestone);
  localStorage.setItem('projectMilestones', JSON.stringify(milestones));
  
  // Reset form
  document.getElementById('milestoneForm').reset();
  
  // Reload milestones
  loadMilestones();
}

function loadMilestones() {
  const milestones = JSON.parse(localStorage.getItem('projectMilestones') || '[]');
  const milestonesList = document.getElementById('milestonesList');
  
  if (!milestonesList) return;
  
  milestonesList.innerHTML = '';
  
  if (milestones.length === 0) {
    milestonesList.innerHTML = '<p class="file-placeholder">No milestones added yet. Use the form above to add project milestones.</p>';
    return;
  }
  
  milestones.forEach(milestone => {
    const milestoneElement = document.createElement('div');
    milestoneElement.className = `milestone-item ${milestone.status}`;
    milestoneElement.innerHTML = `
      <div class="milestone-info">
        <h4>${milestone.name}</h4>
        <p>Due: ${milestone.date} | Priority: ${milestone.priority} | Status: ${milestone.status}</p>
      </div>
      <div class="milestone-actions">
        <button onclick="editMilestone('${milestone.id}')">Edit</button>
        <button onclick="deleteMilestone('${milestone.id}')">Delete</button>
      </div>
    `;
    milestonesList.appendChild(milestoneElement);
  });
}

function deleteMilestone(id) {
  if (confirm('Are you sure you want to delete this milestone?')) {
    let milestones = JSON.parse(localStorage.getItem('projectMilestones') || '[]');
    milestones = milestones.filter(m => m.id !== id);
    localStorage.setItem('projectMilestones', JSON.stringify(milestones));
    loadMilestones();
  }
}

function updateApprovalStatus() {
  const approvals = ['budgetApproval', 'executiveApproval', 'technicalApproval', 'legalApproval'];
  const approvalData = {};
  
  approvals.forEach(id => {
    const select = document.getElementById(id);
    if (select) {
      approvalData[id] = select.value;
    }
  });
  
  localStorage.setItem('approvalStatus', JSON.stringify(approvalData));
  updatePaybackTracker();
}

function updatePaybackTracker() {
  const padel = window.padelData || {};
  const gym = gymIncluded() && window.gymData ? window.gymData : {};
  
  const totalInvestment = getTotalInvestment();
  const annualProfit = (padel.profit || 0) + (gym.profit || 0);
  const paybackYears = annualProfit > 0 ? Math.ceil(totalInvestment / annualProfit) : '∞';
  
  const paybackSummary = document.getElementById('paybackSummary');
  if (paybackSummary) {
    paybackSummary.innerHTML = `
      <h4>Payback Analysis</h4>
      <p><b>Total Investment:</b> €${totalInvestment.toLocaleString()}</p>
      <p><b>Annual Profit:</b> €${annualProfit.toLocaleString()}</p>
      <p><b>Estimated Payback Period:</b> ${paybackYears} years</p>
    `;
  }
}

function initializeProjectFiles() {
  // Initialize file upload functionality
  const fileUploadInput = document.getElementById('fileUploadInput');
  if (fileUploadInput) {
    fileUploadInput.addEventListener('change', handleFileUpload);
  }
  
  // Initialize category filters
  document.querySelectorAll('.category-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      filterFilesByCategory(this.dataset.category);
    });
  });
  
  loadProjectFiles();
}

function openFileUpload() {
  const fileInput = document.getElementById('fileUploadInput');
  if (fileInput) {
    fileInput.click();
  }
}

function handleFileUpload(event) {
  const files = event.target.files;
  if (files.length === 0) return;
  
  // Simulate file upload (in a real app, this would upload to a server)
  const uploadedFiles = JSON.parse(localStorage.getItem('uploadedFiles') || '[]');
  
  Array.from(files).forEach(file => {
    const fileData = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      category: determineFileCategory(file.name),
      uploadDate: new Date().toISOString()
    };
    uploadedFiles.push(fileData);
  });
  
  localStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles));
  loadProjectFiles();
  
  // Reset the input
  event.target.value = '';
}

function determineFileCategory(filename) {
  const ext = filename.toLowerCase().split('.').pop();
  
  if (['pdf', 'doc', 'docx'].includes(ext)) {
    if (filename.toLowerCase().includes('business') || filename.toLowerCase().includes('plan')) {
      return 'business-plans';
    } else if (filename.toLowerCase().includes('legal') || filename.toLowerCase().includes('contract')) {
      return 'legal';
    } else {
      return 'reports';
    }
  } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return 'financial';
  } else if (['dwg', 'cad', 'zip'].includes(ext)) {
    return 'technical';
  }
  
  return 'reports';
}

function loadProjectFiles() {
  const files = JSON.parse(localStorage.getItem('uploadedFiles') || '[]');
  const filesList = document.getElementById('filesList');
  
  if (!filesList) return;
  
  if (files.length === 0) {
    filesList.innerHTML = `
      <div class="file-placeholder">
        <p>No files uploaded yet. Click "Upload Files" to get started.</p>
        <p>You can also use the <a href="https://aloc23.github.io/pci_project_file_viewer/" target="_blank">Advanced File Viewer</a> for comprehensive file management.</p>
      </div>
    `;
    return;
  }
  
  filesList.innerHTML = '';
  files.forEach(file => {
    const fileElement = document.createElement('div');
    fileElement.className = 'file-item';
    fileElement.innerHTML = `
      <div class="file-icon"><i data-feather="file-text"></i></div>
      <div class="file-info">
        <div class="file-name">${file.name}</div>
        <div class="file-meta">
          <span class="file-size">${formatFileSize(file.size)}</span> | 
          <span class="file-date">${new Date(file.uploadDate).toLocaleDateString()}</span>
        </div>
      </div>
      <div class="file-actions">
        <button onclick="deleteFile('${file.id}')">Delete</button>
      </div>
    `;
    filesList.appendChild(fileElement);
  });
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function deleteFile(fileId) {
  if (confirm('Are you sure you want to delete this file?')) {
    let files = JSON.parse(localStorage.getItem('uploadedFiles') || '[]');
    files = files.filter(f => f.id !== fileId);
    localStorage.setItem('uploadedFiles', JSON.stringify(files));
    loadProjectFiles();
  }
}

function filterFilesByCategory(category) {
  const files = JSON.parse(localStorage.getItem('uploadedFiles') || '[]');
  let filteredFiles = files;
  
  if (category !== 'all') {
    filteredFiles = files.filter(f => f.category === category);
  }
  
  // Update display with filtered files
  const filesList = document.getElementById('filesList');
  if (!filesList) return;
  
  if (filteredFiles.length === 0) {
    filesList.innerHTML = `
      <div class="file-placeholder">
        <p>No files found in this category.</p>
      </div>
    `;
    return;
  }
  
  filesList.innerHTML = '';
  filteredFiles.forEach(file => {
    const fileElement = document.createElement('div');
    fileElement.className = 'file-item';
    fileElement.innerHTML = `
      <div class="file-icon"><i data-feather="file-text"></i></div>
      <div class="file-info">
        <div class="file-name">${file.name}</div>
        <div class="file-meta">
          <span class="file-size">${formatFileSize(file.size)}</span> | 
          <span class="file-date">${new Date(file.uploadDate).toLocaleDateString()}</span>
        </div>
      </div>
      <div class="file-actions">
        <button onclick="deleteFile('${file.id}')">Delete</button>
      </div>
    `;
    filesList.appendChild(fileElement);
  });
}

function searchFiles() {
  const searchTerm = document.getElementById('fileSearch').value.toLowerCase();
  const files = JSON.parse(localStorage.getItem('uploadedFiles') || '[]');
  
  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchTerm)
  );
  
  // Update display with search results
  const filesList = document.getElementById('filesList');
  if (!filesList) return;
  
  if (filteredFiles.length === 0) {
    filesList.innerHTML = `
      <div class="file-placeholder">
        <p>No files found matching "${searchTerm}".</p>
      </div>
    `;
    return;
  }
  
  filesList.innerHTML = '';
  filteredFiles.forEach(file => {
    const fileElement = document.createElement('div');
    fileElement.className = 'file-item';
    fileElement.innerHTML = `
      <div class="file-icon"><i data-feather="file-text"></i></div>
      <div class="file-info">
        <div class="file-name">${file.name}</div>
        <div class="file-meta">
          <span class="file-size">${formatFileSize(file.size)}</span> | 
          <span class="file-date">${new Date(file.uploadDate).toLocaleDateString()}</span>
        </div>
      </div>
      <div class="file-actions">
        <button onclick="deleteFile('${file.id}')">Delete</button>
      </div>
    `;
    filesList.appendChild(fileElement);
  });
}

// Make functions available globally
window.resetInvestmentModel = resetInvestmentModel;
window.exportInvestmentSummary = exportInvestmentSummary;
window.resetStaffingResourcing = resetStaffingResourcing;
window.resetExecutionScheduling = resetExecutionScheduling;
window.openFileUpload = openFileUpload;
window.handleFileUpload = handleFileUpload;
window.searchFiles = searchFiles;
window.deleteFile = deleteFile;
window.deleteMilestone = deleteMilestone;

// Initialize the generic P&L system
function initializeGenericPLSystem() {
  // Ensure all required components are available
  if (!window.projectTypeManager) {
    console.error('Project Type Manager not loaded');
    return;
  }
  
  if (!window.calculationEngine) {
    console.error('Calculation Engine not loaded');
    return;
  }
  
  if (!window.dynamicUI) {
    console.error('Dynamic UI not loaded');
    return;
  }
  
  console.log('Generic P&L System initialized successfully');
}
document.querySelectorAll('.collapsible-toggle').forEach(btn => {
  btn.addEventListener('click', function() {
    const expanded = this.getAttribute('aria-expanded') === 'true';
    this.setAttribute('aria-expanded', String(!expanded));
    const content = document.getElementById(this.getAttribute('aria-controls'));
    if (expanded) {
      content.classList.add('collapsed');
      this.textContent = '► ' + this.textContent.replace(/^▼|^►/, '').trim();
    } else {
      content.classList.remove('collapsed');
      this.textContent = '▼ ' + this.textContent.replace(/^▼|^►/, '').trim();
    }
  });
});

// Reset functionality for tabs
window.resetPnLTab = function() {
  if (confirm('This will reset all P&L data and filters. Are you sure?')) {
    // Reset any filters or adjustments
    document.getElementById('roiRevAdjust').value = 100;
    document.getElementById('roiCostAdjust').value = 100;
    document.getElementById('roiRevAdjustLabel').textContent = '100%';
    document.getElementById('roiCostAdjustLabel').textContent = '100%';
    
    // Clear P&L summary
    const pnlSummary = document.getElementById('pnlSummary');
    if (pnlSummary) {
      pnlSummary.innerHTML = '<p><em>Select a business type and project to view P&L analysis</em></p>';
    }
    
    // Clear monthly breakdown
    const monthlyBreakdown = document.querySelector('#monthlyBreakdown tbody');
    if (monthlyBreakdown) {
      monthlyBreakdown.innerHTML = '';
    }
    
    // Clear cash flow
    const cashFlowTable = document.querySelector('#cashFlowTable tbody');
    if (cashFlowTable) {
      cashFlowTable.innerHTML = '';
    }
    
    // Reset dynamic UI if needed
    if (window.dynamicUI) {
      window.dynamicUI.resetSelection();
    }
    
    alert('P&L tab has been reset successfully');
  }
};

window.resetROITab = function() {
  if (confirm('This will reset all ROI adjustments and filters. Are you sure?')) {
    // Reset adjustment sliders
    document.getElementById('roiRevAdjust').value = 100;
    document.getElementById('roiCostAdjust').value = 100;
    document.getElementById('roiRevAdjustLabel').textContent = '100%';
    document.getElementById('roiCostAdjustLabel').textContent = '100%';
    
    // Clear ROI displays
    const yearsToROI = document.getElementById('yearsToROIText');
    if (yearsToROI) {
      yearsToROI.innerHTML = '<div class="roi-summary">Select a business type and project to view ROI analysis</div>';
    }
    
    const roiKPIs = document.getElementById('roiKPIs');
    if (roiKPIs) {
      roiKPIs.innerHTML = '';
    }
    
    // Clear payback table
    const paybackTable = document.querySelector('#paybackTable tbody');
    if (paybackTable) {
      paybackTable.innerHTML = '';
    }
    
    // Reset dynamic UI if needed
    if (window.dynamicUI) {
      window.dynamicUI.resetSelection();
    }
    
    // Recalculate with default values
    updateROI();
    
    alert('ROI tab has been reset successfully');
  }
};

// --- Template Initialization ---
function initializeTemplates() {
  // Initialize P&L collapsible sections
  const pnlSectionsContainer = document.getElementById('pnl-collapsible-sections');
  if (pnlSectionsContainer) {
    const monthlyBreakdownTable = createCollapsibleTable(
      'Monthly Breakdown', 
      'monthlyBreakdownSection', 
      'monthlyBreakdown', 
      ['Month', 'Revenue', 'Costs', 'Profit']
    );
    
    const cashFlowTable = createCollapsibleTable(
      'Cash Flow Analysis', 
      'cashFlowSection', 
      'cashFlowTable', 
      ['Month', 'Opening', 'Inflow', 'Outflow', 'Closing']
    );
    
    pnlSectionsContainer.innerHTML = monthlyBreakdownTable + cashFlowTable;
  }
  
  // Initialize ROI collapsible sections
  const roiSectionsContainer = document.getElementById('roi-collapsible-sections');
  if (roiSectionsContainer) {
    const paybackTable = createCollapsibleTable(
      'Payback Analysis',
      'paybackSection',
      'paybackTable',
      ['Year', 'Cumulative Profit']
    );
    
    roiSectionsContainer.innerHTML = paybackTable;
  }
  
  // Initialize ROI charts section
  const roiChartsContainer = document.getElementById('roi-charts-section');
  if (roiChartsContainer) {
    const charts = [
      {chartId: 'roiLineChart', height: '180'},
      {chartId: 'roiBarChart', height: '180'},
      {chartId: 'roiPieChart', height: '180'},
      {chartId: 'roiBreakEvenChart', height: '180'}
    ];
    
    const chartsSection = createSectionGroup('ROI Visualizations', createChartsGrid(charts));
    roiChartsContainer.innerHTML = chartsSection;
  }
  
  // Initialize ROI sensitivity section
  const roiSensitivityContainer = document.getElementById('roi-sensitivity-section');
  if (roiSensitivityContainer) {
    const sensitivityChart = createCollapsibleChart(
      'Sensitivity Analysis (Tornado Chart)',
      'sensitivitySection',
      'tornadoChart',
      '220'
    );
    
    roiSensitivityContainer.innerHTML = sensitivityChart;
  }
  
  // Initialize CapEx collapsible sections
  const capexSectionsContainer = document.getElementById('capex-collapsible-sections');
  if (capexSectionsContainer) {
    const capexBreakdownTable = createCollapsibleTable(
      'Investment Breakdown by Category',
      'capexBreakdownSection',
      'capexBreakdownTable',
      ['Category', 'Project Type', 'Amount', '% of Total']
    );
    
    capexSectionsContainer.innerHTML = capexBreakdownTable;
  }
  
  // Initialize CapEx charts section
  const capexChartsContainer = document.getElementById('capex-charts-section');
  if (capexChartsContainer) {
    const charts = [
      {chartId: 'capexPieChart', height: '200'},
      {chartId: 'capexBarChart', height: '200'}
    ];
    
    const chartsSection = createSectionGroup('CapEx Visualization', createChartsGrid(charts));
    capexChartsContainer.innerHTML = chartsSection;
  }
  
  // Initialize Staffing header
  const staffingHeaderContainer = document.getElementById('staffing-header');
  if (staffingHeaderContainer) {
    const actions = [
      {
        class: 'reset-btn icon-reset',
        onclick: 'resetStaffingResourcing()',
        title: 'Reset staffing data',
        text: 'Reset'
      }
    ];
    
    staffingHeaderContainer.innerHTML = createTabHeader('Staffing & Resourcing', actions);
  }
  
  // Initialize Staffing collapsible sections
  const staffingSectionsContainer = document.getElementById('staffing-collapsible-sections');
  if (staffingSectionsContainer) {
    const staffingBreakdownTable = createCollapsibleTable(
      'Staffing Breakdown by Role',
      'staffingBreakdownSection',
      'staffingBreakdownTable',
      ['Role', 'Project Type', 'Count', 'Salary/Rate', 'Annual Cost', 'Utilization']
    );
    
    const resourceUtilizationCharts = createCollapsibleCharts(
      'Resource Utilization Analysis',
      'resourceUtilizationSection',
      [
        {chartId: 'staffingPieChart', height: '200'},
        {chartId: 'utilizationChart', height: '200'}
      ]
    );
    
    const staffingCostTable = createCollapsibleTable(
      'Staffing Cost Analysis',
      'staffingCostSection',
      'staffingCostTable',
      ['Department', 'Total Staff', 'Annual Cost', '% of Total', 'Cost per Employee']
    );
    
    staffingSectionsContainer.innerHTML = staffingBreakdownTable + resourceUtilizationCharts + staffingCostTable;
  }
  
  // Re-initialize collapsible toggles for the new elements
  initializeCollapsibleToggles();
}

// --- Initialize Sub-Tab Navigation ---
function initializeSubTabNavigation() {
  document.querySelectorAll('.sub-tab').forEach(btn => {
    btn.addEventListener('click', function() {
      const subTabId = this.getAttribute('data-subtab');
      if (subTabId) {
        showSubTab(subTabId);
      }
    });
  });
}

// --- Initialize Collapsible Toggles ---
function initializeCollapsibleToggles() {
  // Add event listeners for collapsible sections  
  document.querySelectorAll('.collapsible-toggle').forEach(btn => {
    // Remove existing listeners to avoid duplicates
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.addEventListener('click', function() {
      const expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      const content = document.getElementById(this.getAttribute('aria-controls'));
      if (content) {
        if (expanded) {
          content.classList.add('collapsed');
          this.textContent = '► ' + this.textContent.replace(/^▼|^►/, '').trim();
        } else {
          content.classList.remove('collapsed');
          this.textContent = '▼ ' + this.textContent.replace(/^▼|^►/, '').trim();
        }
      }
    });
  });
}
