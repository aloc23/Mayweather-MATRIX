document.addEventListener('DOMContentLoaded', function() {
  // --- Tabs & Subtabs ---
  document.querySelectorAll('.tabs button').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(sec => sec.classList.remove('active'));
      var tabId = btn.getAttribute('data-tab');
      var panel = document.getElementById(tabId);
      if (panel) panel.classList.add('active');
      setTimeout(updateAllTabs, 50);
    });
  });
  document.querySelectorAll('.subtabs button').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.subtabs button').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      document.querySelectorAll('.subtab-panel').forEach(sec => sec.classList.remove('active'));
      var subtabId = 'subtab-' + btn.getAttribute('data-subtab');
      var subpanel = document.getElementById(subtabId);
      if (subpanel) subpanel.classList.add('active');
      setTimeout(updateAllTabs, 50);
    });
  });

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

  // --- State ---
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
  let openingBalance = 0;
  let loanOutstanding = 0;

  // --- Spreadsheet Upload ---
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
        mappingConfigured = false;
        renderMappingPanel(mappedData);
        updateWeekLabels();
        updateAllTabs();
      };
      reader.readAsArrayBuffer(event.target.files[0]);
    });
  }

  // --- Mapping Panel UI
  function renderMappingPanel(allRows) {
    const panel = document.getElementById('mappingPanel');
    panel.innerHTML = '';

    // Mapping controls
    const drop = (label, id, max, sel, onChange, items) => {
      let lab = document.createElement('label');
      lab.textContent = label;
      let selElem = document.createElement('select');
      selElem.className = 'mapping-dropdown';
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
      panel.appendChild(lab);
    };

    drop('Which row contains week labels? ', 'row', Math.min(allRows.length, 30), config.weekLabelRow, v => { config.weekLabelRow = v; updateWeekLabels(); renderMappingPanel(allRows); updateAllTabs(); });
    panel.appendChild(document.createElement('br'));

    let weekRow = allRows[config.weekLabelRow] || [];
    drop('First week column: ', 'col', weekRow.length, config.weekColStart, v => { config.weekColStart = v; updateWeekLabels(); renderMappingPanel(allRows); updateAllTabs(); }, weekRow);
    drop('Last week column: ', 'col', weekRow.length, config.weekColEnd, v => { config.weekColEnd = v; updateWeekLabels(); renderMappingPanel(allRows); updateAllTabs(); }, weekRow);
    panel.appendChild(document.createElement('br'));

    drop('First data row: ', 'row', allRows.length, config.firstDataRow, v => { config.firstDataRow = v; renderMappingPanel(allRows); updateAllTabs(); });
    drop('Last data row: ', 'row', allRows.length, config.lastDataRow, v => { config.lastDataRow = v; renderMappingPanel(allRows); updateAllTabs(); });
    panel.appendChild(document.createElement('br'));

    // Opening balance input
    let obDiv = document.createElement('div');
    obDiv.innerHTML = `Opening Balance: <input type="number" id="openingBalanceInput" value="${openingBalance}" style="width:120px;">`;
    panel.appendChild(obDiv);
    setTimeout(() => {
      let obInput = document.getElementById('openingBalanceInput');
      if (obInput) obInput.oninput = function() {
        openingBalance = parseFloat(obInput.value) || 0;
        updateAllTabs();
        renderMappingPanel(allRows);
      };
    }, 0);

    // Week filter checkboxes
    if (weekLabels.length) {
      const weekFilterDiv = document.createElement('div');
      weekFilterDiv.id = "weekColumnFilters";
      weekFilterDiv.innerHTML = '<b>Filter week columns to include:</b> ';
      weekLabels.forEach((label, idx) => {
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
        lab.style.marginRight = '10px';
        weekFilterDiv.appendChild(cb);
        weekFilterDiv.appendChild(lab);
      });
      panel.appendChild(weekFilterDiv);
    }

    // --- Save Mapping Button ---
    const saveBtn = document.createElement('button');
    saveBtn.textContent = "Save Mapping";
    saveBtn.style.margin = "10px 0";
    saveBtn.onclick = function() {
      mappingConfigured = true;
      updateWeekLabels();
      updateAllTabs();
      renderMappingPanel(allRows);
    };
    panel.appendChild(saveBtn);

    // --- Compact Preview Table ---
    if (weekLabels.length && mappingConfigured) {
      const previewWrap = document.createElement('div');
      previewWrap.style.margin = "12px 0";

      // -- Compact Table --
      const compactTable = document.createElement('table');
      compactTable.className = "mapping-preview-table";
      compactTable.style.marginBottom = "7px";
      // Header row (week labels)
      const tr1 = document.createElement('tr');
      tr1.appendChild(document.createElement('th'));
      getFilteredWeekIndices().forEach(fi => {
        const th = document.createElement('th');
        th.textContent = weekLabels[fi];
        tr1.appendChild(th);
      });
      compactTable.appendChild(tr1);
      // Bank balance (rolling)
      const tr2 = document.createElement('tr');
      const lbl = document.createElement('td');
      lbl.textContent = "Bank Balance (rolling)";
      tr2.appendChild(lbl);
      let cashflowArr = getCashflowArr();
      let rolling = [];
      let ob = openingBalance;
      getFilteredWeekIndices().forEach((fi, i) => {
        let val = cashflowArr[fi];
        let bal = (i === 0 ? ob : rolling[i-1]) + val;
        rolling[i] = bal;
        let td = document.createElement('td');
        td.textContent = isNaN(bal) ? '' : `€${Math.round(bal)}`;
        tr2.appendChild(td);
      });
      compactTable.appendChild(tr2);

      previewWrap.appendChild(compactTable);

      // -- Expand/Collapse Full Preview --
      const toggleBtn = document.createElement('button');
      toggleBtn.textContent = "Show full spreadsheet table";
      toggleBtn.style.marginBottom = "8px";
      let showingFull = false;
      let fullTable = renderFullPreviewTable(allRows);
      toggleBtn.onclick = () => {
        showingFull = !showingFull;
        fullTable.style.display = showingFull ? '' : 'none';
        toggleBtn.textContent = showingFull ? "Hide full spreadsheet table" : "Show full spreadsheet table";
      };
      previewWrap.appendChild(toggleBtn);
      fullTable.style.display = 'none';
      previewWrap.appendChild(fullTable);

      panel.appendChild(previewWrap);
    }
  }

  function renderFullPreviewTable(allRows) {
    let table = document.createElement('table');
    table.className = 'mapping-preview-table';
    let thead = document.createElement('thead');
    let tr = document.createElement('tr');
    let colCount = Math.max(...allRows.slice(0,20).map(r=>r.length));
    for(let c=0;c<colCount;c++) {
      let th = document.createElement('th');
      th.textContent = String.fromCharCode(65+c);
      if (c >= config.weekColStart && c <= config.weekColEnd) th.className = 'highlight-mapping';
      tr.appendChild(th);
    }
    thead.appendChild(tr);
    table.appendChild(thead);
    let tbody = document.createElement('tbody');
    allRows.slice(0,20).forEach((row, rIdx) => {
      let tr = document.createElement('tr');
      for(let c=0;c<colCount;c++) {
        let td = document.createElement('td');
        td.textContent = row[c] === undefined ? '' : row[c];
        if (rIdx === config.weekLabelRow && c >= config.weekColStart && c <= config.weekColEnd) {
          td.className = 'highlight-week-labels';
        } else if (c >= config.weekColStart && c <= config.weekColEnd) {
          td.className = 'highlight-mapping';
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    return table;
  }

  // --- Mapping helpers ---
  function autoDetectMapping(sheet) {
    for (let r = 0; r < Math.min(sheet.length, 10); r++) {
      for (let c = 0; c < Math.min(sheet[r].length, 30); c++) {
        const val = (sheet[r][c] || '').toString().toLowerCase();
        if (/week\s*\d+/.test(val) || /week\s*\d+\/\d+/.test(val)) {
          config.weekLabelRow = r;
          config.weekColStart = c;
          // scan right for last week col
          let lastCol = c;
          while (
            lastCol < sheet[r].length &&
            ((sheet[r][lastCol] || '').toLowerCase().indexOf('week') >= 0 ||
            /^\d{1,2}\/\d{1,2}/.test(sheet[r][lastCol] || ''))
          ) {
            lastCol++;
          }
          config.weekColEnd = lastCol - 1;
          config.firstDataRow = r + 1;
          config.lastDataRow = sheet.length-1;
          return;
        }
      }
    }
    config.weekLabelRow = 4;
    config.weekColStart = 5;
    config.weekColEnd = Math.max(5, (sheet[4]||[]).length-1);
    config.firstDataRow = 6;
    config.lastDataRow = sheet.length-1;
  }
  function updateWeekLabels() {
    let weekRow = mappedData[config.weekLabelRow] || [];
    weekLabels = weekRow.slice(config.weekColStart, config.weekColEnd+1).map(x => x || '');
    if (!weekCheckboxStates || weekCheckboxStates.length !== weekLabels.length) {
      weekCheckboxStates = weekLabels.map(() => true);
    }
    populateWeekDropdown(weekLabels);
  }
  function getFilteredWeekIndices() {
    return weekCheckboxStates.map((checked, idx) => checked ? idx : null).filter(idx => idx !== null);
  }

  // --- Cashflow extraction ---
  function getCashflowArr() {
    if (!mappedData || !mappingConfigured) return [];
    let arr = [];
    for (let w = 0; w < weekLabels.length; w++) {
      if (!weekCheckboxStates[w]) continue; // skip if filtered out
      let absCol = config.weekColStart + w;
      let sum = 0;
      for (let r = config.firstDataRow; r <= config.lastDataRow; r++) {
        let val = mappedData[r][absCol];
        if (typeof val === "string") val = val.replace(/,/g, '').replace(/€|\s/g,'');
        let num = parseFloat(val);
        if (!isNaN(num)) sum += num;
      }
      arr[w] = sum;
    }
    return arr;
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
    // Only return filtered
    return getFilteredWeekIndices().map(idx => arr[idx]);
  }
  function getExpenditureArr() {
    if (!mappedData || !mappingConfigured) return [];
    let arr = [];
    for (let w = 0; w < weekLabels.length; w++) {
      if (!weekCheckboxStates[w]) continue;
      let absCol = config.weekColStart + w;
      let sum = 0;
      for (let r = config.firstDataRow; r <= config.lastDataRow; r++) {
        let val = mappedData[r][absCol];
        if (typeof val === "string") val = val.replace(/,/g, '').replace(/€|\s/g,'');
        let num = parseFloat(val);
        if (!isNaN(num) && num < 0) sum += Math.abs(num);
      }
      arr[w] = sum;
    }
    return arr;
  }
  function getNetProfitArr(incomeArr, expenditureArr, repaymentArr) {
    return incomeArr.map((inc, i) => inc - (expenditureArr[i] || 0) - (repaymentArr[i] || 0));
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
  function getRollingBankBalanceArr() {
    let cashflowArr = getCashflowArr();
    let rolling = [];
    let filteredIdxs = getFilteredWeekIndices();
    let ob = openingBalance;
    filteredIdxs.forEach((fi, i) => {
      let val = cashflowArr[fi];
      let bal = (i == 0 ? ob : rolling[i-1]) + val;
      rolling[i] = bal;
    });
    return rolling;
  }

  // --- Repayment Sensitivity ---
  const weekSelect = document.getElementById('weekSelect');
  const repaymentFrequency = document.getElementById('repaymentFrequency');
  function populateWeekDropdown(labels) {
    weekSelect.innerHTML = '';
    (labels && labels.length ? labels : Array.from({length: 52}, (_, i) => `Week ${i+1}`)).forEach(label => {
      const opt = document.createElement('option');
      opt.value = label;
      opt.textContent = label;
      weekSelect.appendChild(opt);
    });
  }

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
    populateWeekDropdown(weekLabels);
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

  function updateLoanSummary() {
    const totalRepaid = getRepaymentArr().reduce((a,b)=>a+b,0);
    if (document.getElementById('totalRepaidBox')) {
      document.getElementById('totalRepaidBox').textContent = "Total Repaid: €" + totalRepaid.toLocaleString();
    }
    if (document.getElementById('remainingBox')) {
      document.getElementById('remainingBox').textContent = "Remaining: €" + (loanOutstanding-totalRepaid).toLocaleString();
    }
  }

  // --- ALL TAB RENDERING ---
  function updateAllTabs() {
    renderRepaymentRows();
    updateLoanSummary();

    // P&L and cashflow
    const incomeArr = getCashflowArr();
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
    let opening = openingBalance;
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

    // --- CHARTS ---
    function safeDestroy(chartObj) {
      if (chartObj && typeof chartObj.destroy === 'function') chartObj.destroy();
    }
    safeDestroy(window.roiLineChart);
    safeDestroy(window.roiBarChart);
    safeDestroy(window.roiPieChart);
    safeDestroy(window.tornadoChart);
    safeDestroy(window.summaryChart);
    safeDestroy(window.chartCanvasChart);

    const chartCanvasElem = document.getElementById('chartCanvas');
    if (chartCanvasElem && chartCanvasElem.offsetParent !== null) {
      window.chartCanvasChart = new Chart(chartCanvasElem.getContext('2d'),{
        type:'line',
        data:{
          labels:getFilteredWeekIndices().map(idx => weekLabels[idx]),
          datasets:[
            {label:"Income",data:getFilteredWeekIndices().map(idx=>incomeArr[idx]),borderColor:"#4caf50",fill:false},
            {label:"Expenditure",data:getFilteredWeekIndices().map(idx=>expenditureArr[idx]),borderColor:"#f44336",fill:false},
            {label:"Repayments",data:getFilteredWeekIndices().map(idx=>repaymentArr[idx]),borderColor:"#f3b200",fill:false}
          ]
        },options:{responsive:true,maintainAspectRatio:false}
      });
    }
    const roiLineElem = document.getElementById('roiLineChart');
    if (roiLineElem && roiLineElem.offsetParent !== null) {
      window.roiLineChart = new Chart(roiLineElem.getContext('2d'),{
        type:'line',
        data:{
          labels:[...Array(10).keys()].map(i=>`Year ${i+1}`),
          datasets:[{
            label:'Cumulative Profit (€)',data:[...Array(10).keys()].map(i=>(i+1)*annualProfit),
            borderColor:'#27ae60',fill:false,tension:0.2
          }]
        },options:{responsive:true,maintainAspectRatio:false}
      });
    }
    const roiBarElem = document.getElementById('roiBarChart');
    if (roiBarElem && roiBarElem.offsetParent !== null) {
      window.roiBarChart=new Chart(roiBarElem.getContext('2d'),{
        type:'bar',
        data:{labels:['Investment','Annual Profit'],datasets:[{label:'Amount (€)',data:[investment,annualProfit],backgroundColor:['#f39c12','#4caf50']}]},
        options:{responsive:true,maintainAspectRatio:false}
      });
    }
    const roiPieElem = document.getElementById('roiPieChart');
    if (roiPieElem && roiPieElem.offsetParent !== null) {
      window.roiPieChart=new Chart(roiPieElem.getContext('2d'),{
        type:'pie',
        data:{labels:['Investment','Profit'],datasets:[{data:[investment,annualProfit],backgroundColor:['#f39c12','#4caf50']}]},
        options:{responsive:true,maintainAspectRatio:false}
      });
    }
    const tornadoElem = document.getElementById('tornadoChart');
    if (tornadoElem && tornadoElem.offsetParent !== null) {
      window.tornadoChart = new Chart(tornadoElem.getContext('2d'),{
        type:'bar',
        data:{labels:['Utilization','Fee','Staff Cost'],datasets:[{label:'Impact (€)',data:[6500,4200,3900],backgroundColor:'#f3b200'}]},
        options:{indexAxis:'y',responsive:true,maintainAspectRatio:false}
      });
    }
    const summaryElem = document.getElementById('summaryChart');
    if (summaryElem && summaryElem.offsetParent !== null) {
      window.summaryChart=new Chart(summaryElem.getContext('2d'),{
        type:'bar',
        data:{
          labels:['Income','Expenditure','Profit'],
          datasets:[{label:'Annual (€)',data:[incomeMonths.reduce((a,b)=>a+b,0),expenditureMonths.reduce((a,b)=>a+b,0),netProfitMonths.reduce((a,b)=>a+b,0)],backgroundColor:['#4caf50','#f44336','#2196f3']}]
        },options:{responsive:true,maintainAspectRatio:false}
      });
    }
    updateChartAndSummary();
  }

  let mainChart = null;
  function updateChartAndSummary() {
    const ctxElem = document.getElementById('mainChart');
    const ctx = ctxElem ? ctxElem.getContext('2d') : null;
    if (mainChart && typeof mainChart.destroy === "function") mainChart.destroy();

    const incomeArr = getCashflowArr();
    const expenditureArr = getExpenditureArr();
    const repaymentArr = getRepaymentArr();
    const netProfitArr = getNetProfitArr(incomeArr, expenditureArr, repaymentArr);

    if (ctx && ctxElem.offsetParent !== null) {
      mainChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: getFilteredWeekIndices().map(idx => weekLabels[idx]),
          datasets: [
            { label: 'Income', data: getFilteredWeekIndices().map(idx => incomeArr[idx]), borderColor: '#4caf50', fill: false },
            { label: 'Expenditure', data: getFilteredWeekIndices().map(idx => expenditureArr[idx]), borderColor: '#f44336', fill: false },
            { label: 'Repayments', data: getFilteredWeekIndices().map(idx => repaymentArr[idx]), borderColor: '#f3b200', fill: false },
            { label: 'Net Profit', data: getFilteredWeekIndices().map(idx => netProfitArr[idx]), borderColor: '#2196f3', fill: false }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: true } }
        }
      });
    }

    let totalIncome = getFilteredWeekIndices().reduce((a,idx)=>a+(incomeArr[idx]||0),0);
    let totalExpenditure = getFilteredWeekIndices().reduce((a,idx)=>a+(expenditureArr[idx]||0),0);
    let totalRepayments = getFilteredWeekIndices().reduce((a,idx)=>a+(repaymentArr[idx]||0),0);
    let totalNet = getFilteredWeekIndices().reduce((a,idx)=>a+(netProfitArr[idx]||0),0);
    var mainChartSummary = document.getElementById('mainChartSummary');
    if (mainChartSummary) {
      mainChartSummary.innerHTML =
        `<b>Total Income:</b> €${totalIncome.toLocaleString()}<br>
         <b>Total Expenditure:</b> €${totalExpenditure.toLocaleString()}<br>
         <b>Total Repayments:</b> €${totalRepayments.toLocaleString()}<br>
         <b>Total Net Profit:</b> €${totalNet.toLocaleString()}`;
    }
  }

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

  // Loan summary input handling
  document.getElementById('loanOutstandingInput').oninput = function() {
    loanOutstanding = parseFloat(this.value) || 0;
    updateLoanSummary();
  };

  updateAllTabs();
});
