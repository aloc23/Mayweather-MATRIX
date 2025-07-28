document.addEventListener('DOMContentLoaded', function() {
  // --- Tab navigation ---
  document.querySelectorAll('.tabs button').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(sec => sec.classList.remove('active'));
      document.getElementById(this.dataset.tab).classList.add('active');
    });
  });

  // --- Subtab navigation ---
  document.querySelectorAll('.subtabs button').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.subtabs button').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      document.querySelectorAll('.subtab-panel').forEach(sec => sec.classList.remove('active'));
      document.getElementById('subtab-' + this.dataset.subtab).classList.add('active');
    });
  });

  // --- Collapsible tables ---
  window.toggleCollapse = function(btn) {
    const caret = btn.querySelector('.caret');
    const content = btn.nextElementSibling;
    content.classList.toggle('active');
    caret.style.transform = content.classList.contains('active') ? 'none' : 'rotate(-90deg)';
    content.style.display = content.classList.contains('active') ? 'block' : 'none';
  };

  // --- Spreadsheet mapping state ---
  let rawData = [];
  let mappingConfigured = false;
  let weekOptions = [];
  let weekLabels = [];
  let weeksHeaderRowIdx = 3, repaymentRowIdx = 4, startRow = 4, endRow = 269, LABEL_COL = 1, firstWeekCol = 5;

  // --- Repayment Sensitivity ---
  const weekSelect = document.getElementById('weekSelect');
  const repaymentFrequency = document.getElementById('repaymentFrequency');
  let repaymentRows = [];

  function populateWeekDropdown(labels) {
    weekSelect.innerHTML = '';
    if (!labels || labels.length === 0) labels = Array.from({length: 52}, (_, i) => `Week ${i+1}`);
    labels.forEach(label => {
      const opt = document.createElement('option');
      opt.value = label;
      opt.textContent = label;
      weekSelect.appendChild(opt);
    });
  }
  // Initial: static weeks
  populateWeekDropdown();

  document.querySelectorAll('input[name="repaymentType"]').forEach(radio => {
    radio.addEventListener('change', function() {
      if (this.value === "week") {
        weekSelect.disabled = false;
        repaymentFrequency.disabled = true;
      } else {
        weekSelect.disabled = true;
        repaymentFrequency.disabled = false;
      }
    });
  });

  document.getElementById('addRepaymentForm').onsubmit = function(e) {
    e.preventDefault();
    const type = document.querySelector('input[name="repaymentType"]:checked').value;
    let week = null, frequency = null;
    if (type === "week") {
      week = weekSelect.value;
    } else {
      frequency = repaymentFrequency.value;
    }
    const amount = document.getElementById('repaymentAmount').value;
    if (!amount) return;
    repaymentRows.push({ type, week, frequency, amount: parseFloat(amount), editing: false });
    renderRepaymentRows();
    this.reset();
    document.getElementById('weekSelect').selectedIndex = 0;
    document.getElementById('repaymentFrequency').selectedIndex = 0;
    document.querySelector('input[name="repaymentType"][value="week"]').checked = true;
    weekSelect.disabled = false;
    repaymentFrequency.disabled = true;
    updateAllTabs();
  };
  function renderRepaymentRows() {
    const container = document.getElementById('repaymentRows');
    container.innerHTML = "";
    repaymentRows.forEach((row, i) => {
      const div = document.createElement('div');
      div.className = 'repayment-row';
      const weekSelectElem = document.createElement('select');
      (weekLabels.length ? weekLabels : Array.from({length:52}, (_,i)=>`Week ${i+1}`)).forEach(label => {
        const opt = document.createElement('option');
        opt.value = label;
        opt.textContent = label;
        weekSelectElem.appendChild(opt);
      });
      weekSelectElem.value = row.week || "";
      weekSelectElem.disabled = !row.editing || row.type !== "week";
      const freqSelect = document.createElement('select');
      ["monthly", "quarterly", "one-off"].forEach(f => {
        const opt = document.createElement('option');
        opt.value = f;
        opt.textContent = f.charAt(0).toUpperCase() + f.slice(1);
        freqSelect.appendChild(opt);
      });
      freqSelect.value = row.frequency || "monthly";
      freqSelect.disabled = !row.editing || row.type !== "frequency";
      const amountInput = document.createElement('input');
      amountInput.type = 'number';
      amountInput.value = row.amount;
      amountInput.placeholder = 'Repayment €';
      amountInput.disabled = !row.editing;
      const editBtn = document.createElement('button');
      editBtn.textContent = row.editing ? 'Save' : 'Edit';
      editBtn.onclick = function() {
        if (row.editing) {
          if (row.type === "week") {
            row.week = weekSelectElem.value;
          } else {
            row.frequency = freqSelect.value;
          }
          row.amount = parseFloat(amountInput.value);
        }
        row.editing = !row.editing;
        renderRepaymentRows();
        updateAllTabs();
      };
      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remove';
      removeBtn.onclick = function() {
        repaymentRows.splice(i, 1);
        renderRepaymentRows();
        updateAllTabs();
      };
      const typeText = document.createElement('span');
      typeText.style.marginRight = "8px";
      typeText.textContent = row.type === "week" ? "Week" : "Frequency";
      if (row.type === "week") {
        div.appendChild(typeText); div.appendChild(weekSelectElem);
      } else {
        div.appendChild(typeText); div.appendChild(freqSelect);
      }
      div.appendChild(amountInput);
      div.appendChild(editBtn);
      div.appendChild(removeBtn);
      container.appendChild(div);
    });
  }
  renderRepaymentRows();

  // --- Spreadsheet Mapping ---
  document.getElementById('fileInput').addEventListener('change', function(event) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      rawData = json;
      showSheetConfigPanel(json);
      mappingConfigured = true;
      handleMappingChange(); // update week dropdowns after mapping
      updateAllTabs();
    };
    reader.readAsArrayBuffer(event.target.files[0]);
  });

  function showSheetConfigPanel(data) {
    let maxRows = data.length, maxCols = 0;
    for (let r = 0; r < maxRows; r++) maxCols = Math.max(maxCols, data[r].length);
    let previewRows = Math.min(50, maxRows), previewCols = Math.min(50, maxCols);
    let html = '<div style="overflow:auto; max-height:400px;"><table id="sheetPreviewTable"><thead><tr>';
    for (let c = 0; c < previewCols; c++) html += `<th>Col ${c}</th>`;
    html += '</tr></thead><tbody>';
    for (let r = 0; r < previewRows; r++) {
      html += '<tr>';
      for (let c = 0; c < previewCols; c++) {
        html += `<td>${data[r]?.[c] || ''}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table></div>';
    document.getElementById('sheetPreview').innerHTML = html;
    const weekLabelRowSelector = document.getElementById('weekLabelRowSelector');
    const repaymentRowSelector = document.getElementById('repaymentRowSelector');
    const startRowSelector = document.getElementById('startRowSelector');
    const endRowSelector = document.getElementById('endRowSelector');
    const labelColSelector = document.getElementById('labelColSelector');
    const firstWeekColSelector = document.getElementById('firstWeekColSelector');
    weekLabelRowSelector.innerHTML = ''; repaymentRowSelector.innerHTML = '';
    startRowSelector.innerHTML = ''; endRowSelector.innerHTML = '';
    labelColSelector.innerHTML = ''; firstWeekColSelector.innerHTML = '';
    for (let r = 0; r < maxRows; r++) {
      let label = `Row ${r}`;
      weekLabelRowSelector.innerHTML += `<option value="${r}">${label}</option>`;
      repaymentRowSelector.innerHTML += `<option value="${r}">${label}</option>`;
      startRowSelector.innerHTML += `<option value="${r}">${label}</option>`;
      endRowSelector.innerHTML += `<option value="${r}">${label}</option>`;
    }
    for (let c = 0; c < maxCols; c++) {
      let label = `Col ${c}`;
      labelColSelector.innerHTML += `<option value="${c}">${label}</option>`;
      firstWeekColSelector.innerHTML += `<option value="${c}">${label}</option>`;
    }
    weekLabelRowSelector.value = Math.min(3, maxRows-1);
    repaymentRowSelector.value = Math.min(4, maxRows-1);
    startRowSelector.value = Math.min(4, maxRows-1);
    endRowSelector.value = Math.min(maxRows-1, 269);
    labelColSelector.value = Math.min(1, maxCols-1);
    firstWeekColSelector.value = Math.min(5, maxCols-1);
    document.getElementById('sheetConfigPanel').style.display = '';
    document.getElementById('applySheetConfig').onclick = () => {
      weeksHeaderRowIdx = parseInt(weekLabelRowSelector.value, 10);
      repaymentRowIdx = parseInt(repaymentRowSelector.value, 10);
      startRow = parseInt(startRowSelector.value, 10);
      endRow = parseInt(endRowSelector.value, 10);
      LABEL_COL = parseInt(labelColSelector.value, 10);
      firstWeekCol = parseInt(firstWeekColSelector.value, 10);
      mappingConfigured = true;
      document.getElementById('sheetConfigPanel').style.display = 'none';
      handleMappingChange();
      updateAllTabs();
    };
  }

  function handleMappingChange() {
    // Extract week labels from mapping and update dropdown
    const weeksRow = rawData[weeksHeaderRowIdx] || [];
    weekOptions = [];
    weekLabels = [];
    for (let i = firstWeekCol; i < weeksRow.length; i++) {
      const label = typeof weeksRow[i] === 'string' ? weeksRow[i].trim() : '';
      if (label && /^Week\s*\d+/i.test(label)) {
        weekOptions.push({ index: i, label: label });
        weekLabels.push(label);
      }
    }
    populateWeekDropdown(weekLabels);
    renderRepaymentRows(); // update repayment rows dropdowns
  }

  // --- Calculations ---
  function getIncomeArr() {
    if (!rawData.length || !mappingConfigured) return [];
    let arr = [];
    for (let w = 0; w < weekOptions.length; w++) {
      let sum = 0;
      for (let r = startRow; r <= endRow; r++) {
        const val = parseFloat(rawData[r]?.[weekOptions[w].index] || 0);
        if (!isNaN(val)) sum += val;
      }
      arr.push(sum);
    }
    return arr;
  }
  function getExpenditureArr() {
    if (!rawData.length || !mappingConfigured) return [];
    let arr = Array(weekOptions.length).fill(0);
    // TODO: map expenditure rows from config
    return arr;
  }
  function getRepaymentArr() {
    let arr = Array(weekOptions.length).fill(0);
    repaymentRows.forEach(r => {
      if (r.type === "week") {
        let weekNum = weekLabels.indexOf(r.week);
        if (weekNum === -1) weekNum = 0;
        arr[weekNum] += r.amount;
      } else {
        if (r.frequency === "monthly") {
          let perMonth = Math.ceil(arr.length/12);
          for (let m=0; m<12; m++) {
            for (let w=m*perMonth; w<(m+1)*perMonth && w<arr.length; w++) arr[w] += r.amount;
          }
        }
        if (r.frequency === "quarterly") {
          let perQuarter = Math.ceil(arr.length/4);
          for (let q=0;q<4;q++) {
            for (let w=q*perQuarter; w<(q+1)*perQuarter && w<arr.length; w++) arr[w] += r.amount;
          }
        }
        if (r.frequency === "one-off") { arr[0] += r.amount; }
      }
    });
    return arr;
  }
  function getNetProfitArr(incomeArr, expenditureArr, repaymentArr) {
    return incomeArr.map((inc,i)=>inc-(expenditureArr[i]||0)-(repaymentArr[i]||0));
  }
  function getMonthAgg(arr, months=12) {
    let perMonth = Math.ceil(arr.length/months);
    let out = [];
    for(let m=0;m<months;m++) {
      let sum=0;
      for(let w=m*perMonth;w<(m+1)*perMonth && w<arr.length;w++) sum += arr[w];
      out.push(sum);
    }
    return out;
  }

  // --- Rendering for All Tabs ---
  function updateAllTabs() {
    // If no mapping, show empty panels
    if (!rawData.length || !mappingConfigured || weekLabels.length === 0) {
      // Repayment, mapping, chart, etc: show empty or static
      document.getElementById('chartCanvas').getContext('2d').clearRect(0,0,900,320);
      document.getElementById('pnlSummary').innerHTML = '';
      document.getElementById('roiSummary').innerHTML = '';
      document.getElementById('summaryKeyFinancials').innerHTML = '';
      ['roiLineChart','roiBarChart','roiPieChart','tornadoChart','summaryChart'].forEach(id=>{
        const canvas=document.getElementById(id);if(canvas)canvas.getContext('2d').clearRect(0,0,900,320);
      });
      // Tables
      document.getElementById('pnlMonthlyBreakdown').querySelector('tbody').innerHTML = '';
      document.getElementById('pnlCashFlow').querySelector('tbody').innerHTML = '';
      document.getElementById('paybackTable').querySelector('tbody').innerHTML = '';
      return;
    }
    // Calculations
    const incomeArr = getIncomeArr();
    const expenditureArr = getExpenditureArr();
    const repaymentArr = getRepaymentArr();
    const netProfitArr = getNetProfitArr(incomeArr,expenditureArr,repaymentArr);
    // Profit & Loss Tab
    const months = Array.from({length:12}, (_,i)=>`Month ${i+1}`);
    const incomeMonths = getMonthAgg(incomeArr,12);
    const expenditureMonths = getMonthAgg(expenditureArr,12);
    const repaymentMonths = getMonthAgg(repaymentArr,12);
    const netProfitMonths = getMonthAgg(netProfitArr,12);
    let tbody = document.getElementById('pnlMonthlyBreakdown').querySelector('tbody');
    tbody.innerHTML = "";
    for(let i=0; i<months.length; i++) {
      let row = document.createElement('tr');
      if (repaymentMonths[i] > 0) row.classList.add('repayment-table-row');
      row.insertAdjacentHTML('beforeend', `<td>${months[i]}</td>
        <td>€${incomeMonths[i].toLocaleString()}</td>
        <td>€${expenditureMonths[i].toLocaleString()}</td>
        <td>€${netProfitMonths[i].toLocaleString()}</td>`);
      let repayCell = document.createElement('td');
      if (repaymentMonths[i] > 0) {
        let btn = document.createElement('button');
        btn.className = 'repayment-info-btn';
        btn.textContent = '💸 View';
        btn.onclick = function() {
          infoDiv.style.display = infoDiv.style.display === 'none' ? 'block' : 'none';
          btn.textContent = infoDiv.style.display === 'block' ? '🔽 Hide' : '💸 View';
        };
        let infoDiv = document.createElement('div');
        infoDiv.className = 'repayment-info'; infoDiv.style.display = 'none';
        infoDiv.innerHTML = `<b>Repayment:</b> €${repaymentMonths[i].toLocaleString()}`;
        repayCell.appendChild(btn); repayCell.appendChild(infoDiv);
      } else { repayCell.textContent = "—"; }
      row.appendChild(repayCell);
      tbody.appendChild(row);
    }
    // Cash Flow Table
    let cashTbody = document.getElementById('pnlCashFlow').querySelector('tbody');
    cashTbody.innerHTML = "";
    let opening = 20000;
    for(let i=0;i<months.length;i++) {
      let inflow = incomeMonths[i], outflow = expenditureMonths[i] + repaymentMonths[i];
      let closing = opening + inflow - outflow;
      let row = `<tr>
        <td>${months[i]}</td>
        <td>€${opening.toLocaleString()}</td>
        <td>€${inflow.toLocaleString()}</td>
        <td>€${outflow.toLocaleString()}</td>
        <td>€${closing.toLocaleString()}</td>
      </tr>`;
      cashTbody.insertAdjacentHTML('beforeend', row);
      opening = closing;
    }
    document.getElementById('pnlSummary').innerHTML =
      `<b>Total Income:</b> €${incomeMonths.reduce((a,b)=>a+b,0).toLocaleString()}<br>
       <b>Total Expenditure:</b> €${expenditureMonths.reduce((a,b)=>a+b,0).toLocaleString()}<br>
       <b>Net Profit:</b> €${netProfitMonths.reduce((a,b)=>a+b,0).toLocaleString()}`;
    // ROI Tab
    let annualProfit = netProfitMonths.reduce((a,b)=>a+b,0), investment = 120000;
    let paybackYears = annualProfit>0 ? Math.ceil(investment/annualProfit): '∞';
    document.getElementById('roiSummary').innerHTML = `
      <b>Total Investment:</b> €${investment.toLocaleString()}<br>
      <b>Annual Profit:</b> €${annualProfit.toLocaleString()}<br>
      <b>Estimated Payback:</b> ${paybackYears} years
    `;
    let paybackTbody = document.getElementById('paybackTable').querySelector('tbody');
    paybackTbody.innerHTML = "";
    let cumulative = 0;
    for(let y=1;y<=10;y++){
      cumulative += annualProfit;
      paybackTbody.insertAdjacentHTML('beforeend', `<tr><td>${y}</td><td>€${cumulative.toLocaleString()}</td></tr>`);
    }
    document.getElementById('summaryKeyFinancials').innerHTML = `
      <b>Total Income:</b> €${incomeMonths.reduce((a,b)=>a+b,0).toLocaleString()}<br>
      <b>Total Expenditure:</b> €${expenditureMonths.reduce((a,b)=>a+b,0).toLocaleString()}<br>
      <b>Net Profit:</b> €${netProfitMonths.reduce((a,b)=>a+b,0).toLocaleString()}
    `;
    // Charts (destroy if instanceof Chart)
    function safeDestroy(chartObj) {
      if (chartObj && typeof chartObj.destroy === 'function') chartObj.destroy();
    }
    safeDestroy(window.roiLineChart);
    safeDestroy(window.roiBarChart);
    safeDestroy(window.roiPieChart);
    safeDestroy(window.tornadoChart);
    safeDestroy(window.summaryChart);
    safeDestroy(window.chartCanvasChart);
    window.roiLineChart = new Chart(document.getElementById('roiLineChart').getContext('2d'),{
      type:'line',
      data:{
        labels:[...Array(10).keys()].map(i=>`Year ${i+1}`),
        datasets:[{
          label:'Cumulative Profit (€)',data:[...Array(10).keys()].map(i=>(i+1)*annualProfit),
          borderColor:'#27ae60',fill:false,tension:0.2
        }]
      },options:{responsive:true,maintainAspectRatio:false}
    });
    window.roiBarChart=new Chart(document.getElementById('roiBarChart').getContext('2d'),{
      type:'bar',
      data:{labels:['Investment','Annual Profit'],datasets:[{label:'Amount (€)',data:[investment,annualProfit],backgroundColor:['#f39c12','#4caf50']}]},
      options:{responsive:true,maintainAspectRatio:false}
    });
    window.roiPieChart=new Chart(document.getElementById('roiPieChart').getContext('2d'),{
      type:'pie',
      data:{labels:['Investment','Profit'],datasets:[{data:[investment,annualProfit],backgroundColor:['#f39c12','#4caf50']}]},
      options:{responsive:true,maintainAspectRatio:false}
    });
    window.tornadoChart = new Chart(document.getElementById('tornadoChart').getContext('2d'),{
      type:'bar',
      data:{labels:['Utilization','Fee','Staff Cost'],datasets:[{label:'Impact (€)',data:[6500,4200,3900],backgroundColor:'#f3b200'}]},
      options:{indexAxis:'y',responsive:true,maintainAspectRatio:false}
    });
    window.summaryChart=new Chart(document.getElementById('summaryChart').getContext('2d'),{
      type:'bar',
      data:{
        labels:['Income','Expenditure','Profit'],
        datasets:[{label:'Annual (€)',data:[incomeMonths.reduce((a,b)=>a+b,0),expenditureMonths.reduce((a,b)=>a+b,0),netProfitMonths.reduce((a,b)=>a+b,0)],backgroundColor:['#4caf50','#f44336','#2196f3']}]
      },options:{responsive:true,maintainAspectRatio:false}
    });
    window.chartCanvasChart = new Chart(document.getElementById('chartCanvas').getContext('2d'),{
      type:'line',
      data:{
        labels:weekLabels.slice(0,incomeArr.length),
        datasets:[{label:"Income",data:incomeArr,borderColor:"#4caf50",fill:false},
          {label:"Expenditure",data:expenditureArr,borderColor:"#f44336",fill:false},
          {label:"Repayments",data:repaymentArr,borderColor:"#f3b200",fill:false}]
      },options:{responsive:true,maintainAspectRatio:false}
    });
  }

  // --- Export Buttons ---
  document.getElementById('exportPDFBtn').onclick = function() {
    html2canvas(document.body).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
      const imgWidth = canvas.width * ratio;
      const imgHeight = canvas.height * ratio;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save("mayweather_matrix_summary.pdf");
    });
  };
  document.getElementById('exportExcelBtn').onclick = function() {
    const ws = XLSX.utils.aoa_to_sheet(rawData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, "mayweather_matrix_data.xlsx");
  };

  // Initial render
  updateAllTabs();
});
