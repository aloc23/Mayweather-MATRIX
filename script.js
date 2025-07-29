document.addEventListener('DOMContentLoaded', function() {
  // --- Tabs ---
  document.querySelectorAll('.tabs button').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(sec => sec.classList.remove('active'));
      var tabId = btn.getAttribute('data-tab');
      var panel = document.getElementById(tabId);
      if (panel) panel.classList.add('active');
    });
  });

  // --- Subtabs ---
  document.querySelectorAll('.subtabs button').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.subtabs button').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      document.querySelectorAll('.subtab-panel').forEach(sec => sec.classList.remove('active'));
      var subtabId = 'subtab-' + btn.getAttribute('data-subtab');
      var subpanel = document.getElementById(subtabId);
      if (subpanel) subpanel.classList.add('active');
    });
  });

  // --- Collapsibles ---
  document.querySelectorAll('.collapsible-header').forEach(btn => {
    btn.addEventListener('click', function() {
      var content = btn.nextElementSibling;
      var caret = btn.querySelector('.caret');
      if (content.classList.contains('active')) {
        content.classList.remove('active');
        if (caret) caret.style.transform = 'rotate(-90deg)';
      } else {
        content.classList.add('active');
        if (caret) caret.style.transform = 'none';
      }
    });
  });

  // --- MAPPING STATE ---
  let rawData = [];
  let mappingConfigured = false;
  let mappedData = null;
  let weekLabels = [];
  let mappingSelection = { week: 0, income: 1, expenditure: 2 };

  // --- Spreadsheet Mapping UI ---
  function renderMappingPanel(headers, data) {
    var panel = document.getElementById('mappingPanel');
    panel.innerHTML = '';

    // Create mapping dropdowns
    var roles = ['Week', 'Income', 'Expenditure'];
    roles.forEach(role => {
      var label = document.createElement('label');
      label.textContent = role + ' Column: ';
      var select = document.createElement('select');
      select.id = 'mapping-' + role.toLowerCase();
      headers.forEach((header, idx) => {
        var opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = header;
        select.appendChild(opt);
      });
      select.value = mappingSelection[role.toLowerCase()] || 0;
      select.onchange = function() {
        mappingSelection[role.toLowerCase()] = parseInt(this.value, 10);
        updateWeekLabels();
        updateAllTabs();
      };
      label.appendChild(select);
      panel.appendChild(label);
      panel.appendChild(document.createElement('br'));
    });

    // Preview all rows of the spreadsheet
    var table = document.createElement('table');
    table.border = "1";
    table.style.borderCollapse = "collapse";
    var thead = document.createElement('thead');
    var tr = document.createElement('tr');
    headers.forEach(h => { var th = document.createElement('th'); th.textContent = h; tr.appendChild(th); });
    thead.appendChild(tr);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    data.forEach(row => {
      var tr = document.createElement('tr');
      row.forEach(cell => {
        var td = document.createElement('td');
        td.textContent = cell === undefined ? '' : cell;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    panel.appendChild(table);

    // Save mapping button
    var saveBtn = document.createElement('button');
    saveBtn.textContent = "Use This Mapping";
    saveBtn.onclick = function() {
      mappingConfigured = true;
      updateWeekLabels();
      updateAllTabs();
    };
    panel.appendChild(saveBtn);
  }

  // --- Update week labels from mapping selection
  function updateWeekLabels() {
    if (!mappedData) return;
    let weekCol = mappingSelection.week;
    weekLabels = mappedData.map(row => row[weekCol]);
  }

  // --- Spreadsheet upload handler
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
        mappedData = json.slice(1); // all rows except header
        rawData = json;
        let headers = json[0];
        renderMappingPanel(headers, mappedData);
        updateWeekLabels();
        updateAllTabs();
      };
      reader.readAsArrayBuffer(event.target.files[0]);
    });
  }

  // --- REPAYMENT SENSITIVITY STATE ---
  const weekSelect = document.getElementById('weekSelect');
  const repaymentFrequency = document.getElementById('repaymentFrequency');
  let repaymentRows = [];

  function populateWeekDropdown(labels) {
    weekSelect.innerHTML = '';
    (labels && labels.length ? labels : Array.from({length: 52}, (_, i) => `Week ${i+1}`)).forEach(label => {
      const opt = document.createElement('option');
      opt.value = label;
      opt.textContent = label;
      weekSelect.appendChild(opt);
    });
  }

  // --- RADIO TOGGLE FOR WEEK / FREQUENCY ---
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

  // --- ADD REPAYMENT ROW ---
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
    populateWeekDropdown(weekLabels);
    document.getElementById('weekSelect').selectedIndex = 0;
    document.getElementById('repaymentFrequency').selectedIndex = 0;
    document.querySelector('input[name="repaymentType"][value="week"]').checked = true;
    weekSelect.disabled = false;
    repaymentFrequency.disabled = true;
    updateAllTabs();
  };

  // --- EDITABLE REPAYMENT ROWS ---
  function renderRepaymentRows() {
    const container = document.getElementById('repaymentRows');
    container.innerHTML = "";
    repaymentRows.forEach((row, i) => {
      const div = document.createElement('div');
      div.className = 'repayment-row';

      // Week dropdown
      const weekSelectElem = document.createElement('select');
      (weekLabels.length ? weekLabels : Array.from({length:52}, (_,i)=>`Week ${i+1}`)).forEach(label => {
        const opt = document.createElement('option');
        opt.value = label;
        opt.textContent = label;
        weekSelectElem.appendChild(opt);
      });
      weekSelectElem.value = row.week || "";
      weekSelectElem.disabled = !row.editing || row.type !== "week";

      // Frequency select
      const freqSelect = document.createElement('select');
      ["monthly", "quarterly", "one-off"].forEach(f => {
        const opt = document.createElement('option');
        opt.value = f;
        opt.textContent = f.charAt(0).toUpperCase() + f.slice(1);
        freqSelect.appendChild(opt);
      });
      freqSelect.value = row.frequency || "monthly";
      freqSelect.disabled = !row.editing || row.type !== "frequency";

      // Amount input
      const amountInput = document.createElement('input');
      amountInput.type = 'number';
      amountInput.value = row.amount;
      amountInput.placeholder = 'Repayment €';
      amountInput.disabled = !row.editing;

      // Edit button
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

      // Remove button
      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remove';
      removeBtn.onclick = function() {
        repaymentRows.splice(i, 1);
        renderRepaymentRows();
        updateAllTabs();
      };

      // Mode label
      const modeLabel = document.createElement('span');
      modeLabel.style.marginRight = "10px";
      modeLabel.textContent = row.type === "week" ? "Week" : "Frequency";

      if (row.type === "week") {
        div.appendChild(modeLabel);
        div.appendChild(weekSelectElem);
      } else {
        div.appendChild(modeLabel);
        div.appendChild(freqSelect);
      }
      div.appendChild(amountInput);
      div.appendChild(editBtn);
      div.appendChild(removeBtn);

      container.appendChild(div);
    });
  }
  populateWeekDropdown();
  renderRepaymentRows();

  // --- Analysis Functions using Mapped Columns ---
  function getIncomeArr() {
    if (!mappedData || !mappingConfigured) return [];
    let incomeCol = mappingSelection.income;
    return mappedData.map(row => parseFloat(row[incomeCol]) || 0);
  }
  function getExpenditureArr() {
    if (!mappedData || !mappingConfigured) return [];
    let expenditureCol = mappingSelection.expenditure;
    return mappedData.map(row => parseFloat(row[expenditureCol]) || 0);
  }
  function getRepaymentArr() {
    if (!mappingConfigured || !weekLabels.length) return [];
    let arr = Array(weekLabels.length).fill(0);
    repaymentRows.forEach(r => {
      if (r.type === "week") {
        let weekIdx = weekLabels.indexOf(r.week);
        if (weekIdx === -1) weekIdx = 0;
        arr[weekIdx] += r.amount;
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
    return incomeArr.map((inc, i) => inc - (expenditureArr[i] || 0) - (repaymentArr[i] || 0));
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

  // --- CHART & SUMMARY FOR CHARTS PANEL ---
  let mainChart = null;
  function updateChartAndSummary() {
    const ctxElem = document.getElementById('mainChart');
    const ctx = ctxElem ? ctxElem.getContext('2d') : null;
    if (mainChart && typeof mainChart.destroy === "function") mainChart.destroy();

    const incomeArr = getIncomeArr();
    const expenditureArr = getExpenditureArr();
    const repaymentArr = getRepaymentArr();
    const netProfitArr = getNetProfitArr(incomeArr, expenditureArr, repaymentArr);

    if (ctx) {
      mainChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: weekLabels,
          datasets: [
            { label: 'Income', data: incomeArr, borderColor: '#4caf50', fill: false },
            { label: 'Expenditure', data: expenditureArr, borderColor: '#f44336', fill: false },
            { label: 'Repayments', data: repaymentArr, borderColor: '#f3b200', fill: false },
            { label: 'Net Profit', data: netProfitArr, borderColor: '#2196f3', fill: false }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: true } }
        }
      });
    }

    let totalIncome = incomeArr.reduce((a,b)=>a+b,0);
    let totalExpenditure = expenditureArr.reduce((a,b)=>a+b,0);
    let totalRepayments = repaymentArr.reduce((a,b)=>a+b,0);
    let totalNet = netProfitArr.reduce((a,b)=>a+b,0);
    var mainChartSummary = document.getElementById('mainChartSummary');
    if (mainChartSummary) {
      mainChartSummary.innerHTML =
        `<b>Total Income:</b> €${totalIncome.toLocaleString()}<br>
         <b>Total Expenditure:</b> €${totalExpenditure.toLocaleString()}<br>
         <b>Total Repayments:</b> €${totalRepayments.toLocaleString()}<br>
         <b>Total Net Profit:</b> €${totalNet.toLocaleString()}`;
    }
  }

  // --- ALL TAB RENDERING ---
  function updateAllTabs() {
    renderRepaymentRows();

    var pnlSummary = document.getElementById('pnlSummary');
    var roiSummary = document.getElementById('roiSummary');
    var summaryKeyFinancials = document.getElementById('summaryKeyFinancials');
    if (!rawData.length || !weekLabels.length || !mappingConfigured) {
      if (pnlSummary) pnlSummary.innerHTML = '';
      if (roiSummary) roiSummary.innerHTML = '';
      if (summaryKeyFinancials) summaryKeyFinancials.innerHTML = '';
      ['roiLineChart','roiBarChart','roiPieChart','tornadoChart','summaryChart','chartCanvas'].forEach(id=>{
        var canvas=document.getElementById(id);
        if(canvas && canvas.getContext) canvas.getContext('2d').clearRect(0,0,900,320);
      });
      var monthlyTbody = document.getElementById('pnlMonthlyBreakdown');
      var cashTbody = document.getElementById('pnlCashFlow');
      var paybackTbody = document.getElementById('paybackTable');
      if (monthlyTbody) monthlyTbody.querySelector('tbody').innerHTML = '';
      if (cashTbody) cashTbody.querySelector('tbody').innerHTML = '';
      if (paybackTbody) paybackTbody.querySelector('tbody').innerHTML = '';
      updateChartAndSummary();
      return;
    }
    const incomeArr = getIncomeArr();
    const expenditureArr = getExpenditureArr();
    const repaymentArr = getRepaymentArr();
    const netProfitArr = getNetProfitArr(incomeArr, expenditureArr, repaymentArr);

    const months = Array.from({length:12}, (_,i)=>`Month ${i+1}`);
    const incomeMonths = getMonthAgg(incomeArr,12);
    const expenditureMonths = getMonthAgg(expenditureArr,12);
    const repaymentMonths = getMonthAgg(repaymentArr,12);
    const netProfitMonths = getMonthAgg(netProfitArr,12);

    var tbody = document.getElementById('pnlMonthlyBreakdown').querySelector('tbody');
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
    var cashTbody = document.getElementById('pnlCashFlow').querySelector('tbody');
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

    let annualProfit = netProfitMonths.reduce((a,b)=>a+b,0), investment = 120000;
    let paybackYears = annualProfit>0 ? Math.ceil(investment/annualProfit): '∞';
    document.getElementById('roiSummary').innerHTML = `
      <b>Total Investment:</b> €${investment.toLocaleString()}<br>
      <b>Annual Profit:</b> €${annualProfit.toLocaleString()}<br>
      <b>Estimated Payback:</b> ${paybackYears} years
    `;
    var paybackTbody = document.getElementById('paybackTable').querySelector('tbody');
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
    // Charts
    function safeDestroy(chartObj) {
      if (chartObj && typeof chartObj.destroy === 'function') chartObj.destroy();
    }
    safeDestroy(window.roiLineChart);
    safeDestroy(window.roiBarChart);
    safeDestroy(window.roiPieChart);
    safeDestroy(window.tornadoChart);
    safeDestroy(window.summaryChart);
    safeDestroy(window.chartCanvasChart);

    // Only create chartCanvasChart if the element exists
    const chartCanvasElem = document.getElementById('chartCanvas');
    if (chartCanvasElem) {
      window.chartCanvasChart = new Chart(chartCanvasElem.getContext('2d'),{
        type:'line',
        data:{
          labels:weekLabels,
          datasets:[
            {label:"Income",data:incomeArr,borderColor:"#4caf50",fill:false},
            {label:"Expenditure",data:expenditureArr,borderColor:"#f44336",fill:false},
            {label:"Repayments",data:repaymentArr,borderColor:"#f3b200",fill:false}
          ]
        },options:{responsive:true,maintainAspectRatio:false}
      });
    }
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
    updateChartAndSummary();
  }

  // --- EXPORT BUTTONS ---
  var exportPDFBtn = document.getElementById('exportPDFBtn');
  if (exportPDFBtn) {
    exportPDFBtn.onclick = function() {
      html2canvas(document.body).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width * ratio, canvas.height * ratio);
        pdf.save("mayweather_matrix_summary.pdf");
      });
    };
  }
  var exportExcelBtn = document.getElementById('exportExcelBtn');
  if (exportExcelBtn) {
    exportExcelBtn.onclick = function() {
      if (!rawData || !rawData.length) return;
      const ws = XLSX.utils.aoa_to_sheet(rawData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(wb, "mayweather_matrix_data.xlsx");
    };
  }

  // Initial chart and summary render
  updateAllTabs();
});
