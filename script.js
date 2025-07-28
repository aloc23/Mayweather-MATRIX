document.addEventListener('DOMContentLoaded', function() {
  // --- TABS ---
  document.querySelectorAll('.tabs button').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(sec => sec.classList.remove('active'));
      var tabId = this.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });
  // --- SUBTABS ---
  document.querySelectorAll('.subtabs button').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.subtabs button').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      document.querySelectorAll('.subtab-panel').forEach(sec => sec.classList.remove('active'));
      var subtabId = 'subtab-' + this.getAttribute('data-subtab');
      document.getElementById(subtabId).classList.add('active');
    });
  });

  // --- COLLAPSIBLE TABLE LOGIC ---
  window.toggleCollapse = function(btn) {
    const caret = btn.querySelector('.caret');
    const content = btn.nextElementSibling;
    content.classList.toggle('active');
    caret.style.transform = content.classList.contains('active') ? 'none' : 'rotate(-90deg)';
    content.style.display = content.classList.contains('active') ? 'block' : 'none';
  };

  // --- MAPPING STATE ---
  let rawData = [];
  let mappingConfigured = false;
  let weekLabels = [];
  let mappedData = null;

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

  // --- MAPPING PANEL & FILE UPLOAD ---
  document.getElementById('spreadsheetUpload')?.addEventListener('change', function(event) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      mappedData = json;
      rawData = json;
      mappingConfigured = true;
      // Extract week labels
      let weekRow = json.find(row => row.some(cell => typeof cell === "string" && cell.toLowerCase().includes("week")));
      if (weekRow) {
        weekLabels = weekRow.filter(cell => typeof cell === "string" && cell.toLowerCase().includes("week"));
        if (weekLabels.length === 0) {
          let firstWeekIdx = weekRow.findIndex(cell => typeof cell === "string" && cell.toLowerCase().includes("week"));
          weekLabels = weekRow.slice(firstWeekIdx);
        }
        if (weekLabels.length === 0) weekLabels = ["Week 1", "Week 2"];
      }
      populateWeekDropdown(weekLabels);
      renderRepaymentRows();
      document.getElementById('mappingPanel').innerHTML = "<span>Mapping loaded. Weeks found: "+weekLabels.join(", ")+"</span>";
      updateAllTabs();
    };
    reader.readAsArrayBuffer(event.target.files[0]);
  });

  // --- CALCULATIONS & CHART ---
  function getIncomeArr() {
    if (!mappedData || weekLabels.length === 0) return [];
    let incomeArr = [];
    const weekRowIdx = mappedData.findIndex(row => row.some(cell => typeof cell === "string" && cell.toLowerCase().includes("week")));
    if (weekRowIdx === -1) return [];
    const weekCols = [];
    mappedData[weekRowIdx].forEach((cell, idx) => {
      if (typeof cell === "string" && cell.toLowerCase().includes("week")) {
        weekCols.push(idx);
      }
    });
    for (let w = 0; w < weekCols.length; w++) {
      let sum = 0;
      for (let r = weekRowIdx + 1; r < mappedData.length; r++) {
        const val = parseFloat(mappedData[r][weekCols[w]]);
        if (!isNaN(val)) sum += val;
      }
      incomeArr.push(sum);
    }
    return incomeArr;
  }
  function getRepaymentArr() {
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
  function getNetProfitArr(incomeArr, repaymentArr) {
    return incomeArr.map((inc, i) => inc - (repaymentArr[i] || 0));
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
    const ctx = document.getElementById('mainChart')?.getContext('2d');
    if (mainChart && typeof mainChart.destroy === "function") mainChart.destroy();

    const incomeArr = getIncomeArr();
    const repaymentArr = getRepaymentArr();
    const netProfitArr = getNetProfitArr(incomeArr, repaymentArr);

    mainChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: weekLabels,
        datasets: [
          { label: 'Income', data: incomeArr, borderColor: '#4caf50', fill: false },
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

    let totalIncome = incomeArr.reduce((a,b)=>a+b,0);
    let totalRepayments = repaymentArr.reduce((a,b)=>a+b,0);
    let totalNet = netProfitArr.reduce((a,b)=>a+b,0);
    document.getElementById('mainChartSummary').innerHTML =
      `<b>Total Income:</b> €${totalIncome.toLocaleString()}<br>
       <b>Total Repayments:</b> €${totalRepayments.toLocaleString()}<br>
       <b>Total Net Profit:</b> €${totalNet.toLocaleString()}`;
  }

  // --- ALL TAB RENDERING ---
  function updateAllTabs() {
    renderRepaymentRows();

    if (!rawData.length || !weekLabels.length) {
      document.getElementById('pnlSummary').innerHTML = '';
      document.getElementById('roiSummary').innerHTML = '';
      document.getElementById('summaryKeyFinancials').innerHTML = '';
      ['roiLineChart','roiBarChart','roiPieChart','tornadoChart','summaryChart','chartCanvas'].forEach(id=>{
        const canvas=document.getElementById(id);if(canvas)canvas?.getContext('2d').clearRect(0,0,900,320);
      });
      document.getElementById('pnlMonthlyBreakdown').querySelector('tbody').innerHTML = '';
      document.getElementById('pnlCashFlow').querySelector('tbody').innerHTML = '';
      document.getElementById('paybackTable').querySelector('tbody').innerHTML = '';
      updateChartAndSummary();
      return;
    }
    const incomeArr = getIncomeArr();
    const repaymentArr = getRepaymentArr();
    const netProfitArr = getNetProfitArr(incomeArr, repaymentArr);
    const expenditureArr = Array(weekLabels.length).fill(0); // No expenditure mapping yet

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
    updateChartAndSummary();
  }

  // --- EXPORT BUTTONS ---
  document.getElementById('exportPDFBtn')?.onclick = function() {
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
  document.getElementById('exportExcelBtn')?.onclick = function() {
    if (!rawData?.length) return;
    const ws = XLSX.utils.aoa_to_sheet(rawData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, "mayweather_matrix_data.xlsx");
  };

  // Initial chart and summary render
  updateAllTabs();
});
