document.addEventListener('DOMContentLoaded', function() {

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
  let openingBalance = 0;
  let loanOutstanding = 0;
  let negativeWeeks = [];
  let roiInvestment = 120000;
  let roiInterest = 0.0;

  // -------------------- Tabs & UI Interactions --------------------

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

  // -------------------- Spreadsheet Upload & Mapping --------------------

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

  function renderMappingPanel(allRows) {
    const panel = document.getElementById('mappingPanel');
    panel.innerHTML = '';

    // Mapping controls
    function drop(label, id, max, sel, onChange, items) {
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
    }

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

    // Reset button
    const resetBtn = document.createElement('button');
    resetBtn.textContent = "Reset Mapping";
    resetBtn.style.marginLeft = '10px';
    resetBtn.onclick = function() {
      autoDetectMapping(allRows);
      weekCheckboxStates = weekLabels.map(()=>true);
      openingBalance = 0;
      renderMappingPanel(allRows);
      updateWeekLabels();
      updateAllTabs();
    };
    panel.appendChild(resetBtn);

    // Week filter improved UI
    if (weekLabels.length) {
      const weekFilterDiv = document.createElement('div');
      weekFilterDiv.innerHTML = '<b>Filter week columns to include:</b>';
      const groupDiv = document.createElement('div');
      groupDiv.className = 'week-checkbox-group';
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
        groupDiv.appendChild(cb);
        groupDiv.appendChild(lab);
      });
      // Select All / Deselect All controls
      const selectAllBtn = document.createElement('button');
      selectAllBtn.textContent = "Select All";
      selectAllBtn.onclick = function() {
        weekCheckboxStates = weekCheckboxStates.map(()=>true);
        updateAllTabs();
        renderMappingPanel(allRows);
      };
      const deselectAllBtn = document.createElement('button');
      deselectAllBtn.textContent = "Deselect All";
      deselectAllBtn.onclick = function() {
        weekCheckboxStates = weekCheckboxStates.map(()=>false);
        updateAllTabs();
        renderMappingPanel(allRows);
      };
      weekFilterDiv.appendChild(selectAllBtn);
      weekFilterDiv.appendChild(deselectAllBtn);
      weekFilterDiv.appendChild(groupDiv);
      panel.appendChild(weekFilterDiv);
    }

    // Save Mapping Button
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

    // Compact preview: Improved style and scrolling
    if (weekLabels.length && mappingConfigured) {
      const previewWrap = document.createElement('div');
      const compactTable = document.createElement('table');
      compactTable.className = "compact-preview-table";
      const tr1 = document.createElement('tr');
      tr1.appendChild(document.createElement('th'));
      getFilteredWeekIndices().forEach(fi => {
        const th = document.createElement('th');
        th.textContent = weekLabels[fi];
        tr1.appendChild(th);
      });
      compactTable.appendChild(tr1);
      const tr2 = document.createElement('tr');
      const lbl = document.createElement('td');
      lbl.textContent = "Bank Balance (rolling)";
      tr2.appendChild(lbl);
      let rolling = getRollingBankBalanceArr();
      getFilteredWeekIndices().forEach((fi, i) => {
        let bal = rolling[i];
        let td = document.createElement('td');
        td.textContent = isNaN(bal) ? '' : `€${Math.round(bal)}`;
        if (bal < 0) td.style.background = "#ffeaea";
        tr2.appendChild(td);
      });
      compactTable.appendChild(tr2);
      previewWrap.style.overflowX = "auto";
      previewWrap.appendChild(compactTable);
      panel.appendChild(previewWrap);
    }
  }

  function autoDetectMapping(sheet) {
    for (let r = 0; r < Math.min(sheet.length, 10); r++) {
      for (let c = 0; c < Math.min(sheet[r].length, 30); c++) {
        const val = (sheet[r][c] || '').toString().toLowerCase();
        if (/week\s*\d+/.test(val) || /week\s*\d+\/\d+/.test(val)) {
          config.weekLabelRow = r;
          config.weekColStart = c;
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

  // -------------------- Calculation Helpers --------------------

  function getIncomeArr() {
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
        if (!isNaN(num) && num > 0) sum += num;
      }
      arr[w] = sum;
    }
    return arr;
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
    return getFilteredWeekIndices().map(idx => arr[idx]);
  }
  function getNetProfitArr(incomeArr, expenditureArr, repaymentArr) {
    return incomeArr.map((inc, i) => (inc || 0) - (expenditureArr[i] || 0) - (repaymentArr[i] || 0));
  }
  function getRollingBankBalanceArr() {
    let incomeArr = getIncomeArr();
    let expenditureArr = getExpenditureArr();
    let repaymentArr = getRepaymentArr();
    let rolling = [];
    let ob = openingBalance;
    getFilteredWeekIndices().forEach((fi, i) => {
      let income = incomeArr[fi] || 0;
      let out = expenditureArr[fi] || 0;
      let repay = repaymentArr[i] || 0;
      let prev = (i === 0 ? ob : rolling[i-1]);
      rolling[i] = prev + income - out - repay;
    });
    return rolling;
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

  // -------------------- Tornado Chart --------------------
  // Top 15 absolute-impact rows (across all filtered weeks)
  function getRowImpact() {
    let impact = [];
    if (!mappedData || !mappingConfigured) return impact;
    for (let r = config.firstDataRow; r <= config.lastDataRow; r++) {
      let label = mappedData[r][0] || `Row ${r}`;
      let vals = [];
      for (let w = 0; w < weekLabels.length; w++) {
        if (!weekCheckboxStates[w]) continue;
        let absCol = config.weekColStart + w;
        let val = mappedData[r][absCol];
        if (typeof val === "string") val = val.replace(/,/g, '').replace(/€|\s/g,'');
        let num = parseFloat(val);
        if (!isNaN(num)) vals.push(num);
      }
      let total = vals.reduce((a,b)=>a+Math.abs(b),0);
      impact.push({label, total});
    }
    impact.sort((a,b)=>b.total-a.total);
    return impact.slice(0,15);
  }
  function renderTornadoChart() {
    let tornadoCanvas = document.getElementById('tornadoChart');
    if (!tornadoCanvas) return;
    let impact = getRowImpact();
    let ctx = tornadoCanvas.getContext('2d');
    if (window.tornadoChartObj) window.tornadoChartObj.destroy();
    window.tornadoChartObj = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: impact.map(x=>x.label),
        datasets: [{ label: "Total Impact (€)", data: impact.map(x=>x.total), backgroundColor: '#ff9800' }]
      },
      options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } } }
    });
  }

  // -------------------- Repayments UI --------------------

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

  // Loan summary input handling
  document.getElementById('loanOutstandingInput').oninput = function() {
    loanOutstanding = parseFloat(this.value) || 0;
    updateLoanSummary();
  };

  // -------------------- Weekly Breakdown Table & Negative Weeks Dropdown --------------------

  function renderWeeklyBreakdown() {
    const tbody = document.getElementById('pnlWeeklyBreakdown').querySelector('tbody');
    tbody.innerHTML = "";
    if (!mappingConfigured || !weekLabels.length) return;
    let incomeArr = getIncomeArr();
    let expenditureArr = getExpenditureArr();
    let repaymentArr = getRepaymentArr();
    let netProfitArr = getNetProfitArr(incomeArr, expenditureArr, repaymentArr);
    let rolling = getRollingBankBalanceArr();
    negativeWeeks = [];
    getFilteredWeekIndices().forEach((fi, idx) => {
      let week = weekLabels[fi];
      let income = incomeArr[fi] || 0;
      let out = expenditureArr[fi] || 0;
      let repay = repaymentArr[idx] || 0;
      let net = netProfitArr[fi] || 0;
      let bal = rolling[idx];
      let tr = document.createElement('tr');
      if (bal < 0) {
        tr.className = "negative-balance-row";
        negativeWeeks.push({ week, balance: bal });
      }
      tr.innerHTML = `
        <td>${week}</td>
        <td>€${income.toLocaleString()}</td>
        <td>€${out.toLocaleString()}</td>
        <td>€${repay.toLocaleString()}</td>
        <td>€${net.toLocaleString()}</td>
        <td>€${bal.toLocaleString()}</td>
      `;
      tbody.appendChild(tr);
    });
    renderNegativeWeeksDropdown();
  }

  function renderNegativeWeeksDropdown() {
    let container = document.getElementById('negativeWeeksDropdown');
    if (!container) {
      container = document.createElement('div');
      container.id = "negativeWeeksDropdown";
      container.style = "margin:12px 0 0 0; font-size:1.06em";
      let mainChartSummary = document.getElementById('mainChartSummary');
      if (mainChartSummary) {
        mainChartSummary.parentNode.insertBefore(container, mainChartSummary.nextSibling);
      }
    }
    if (negativeWeeks.length === 0) {
      container.innerHTML = "";
      return;
    }
    let html = `<label style="font-weight:bold;">Weeks with Negative Bank Balance:</label> `;
    html += `<select id="negativeWeeksSelect"><option value="">Select week</option>`;
    negativeWeeks.forEach((w, i) => {
      html += `<option value="${i}">${w.week} (Bank: €${w.balance.toLocaleString()})</option>`;
    });
    html += `</select>`;
    container.innerHTML = html;
    document.getElementById('negativeWeeksSelect').onchange = function() {
      let idx = this.value;
      if (idx !== "") {
        let table = document.getElementById('pnlWeeklyBreakdown');
        let rows = table.querySelectorAll('tbody tr');
        rows[idx].scrollIntoView({ behavior: "smooth", block: "center" });
        rows[idx].style.outline = "2px solid #c00";
        setTimeout(()=>{ rows[idx].style.outline = ""; }, 2000);
      }
    };
  }

  // -------------------- P&L, Monthly, Cashflow, and Charts --------------------

  function updateAllTabs() {
    renderRepaymentRows();
    updateLoanSummary();
    renderWeeklyBreakdown();

    // P&L and cashflow
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

    // Charts & summary
    updateChartAndSummary();
    renderRoiSection();
    renderTornadoChart();
  }

  let mainChart = null;
  function updateChartAndSummary() {
    const ctxElem = document.getElementById('mainChart');
    const ctx = ctxElem ? ctxElem.getContext('2d') : null;
    if (mainChart && typeof mainChart.destroy === "function") mainChart.destroy();

    let incomeArr = getIncomeArr();
    let expenditureArr = getExpenditureArr();
    let repaymentArr = getRepaymentArr();
    let netProfitArr = getNetProfitArr(incomeArr, expenditureArr, repaymentArr);
    let rolling = getRollingBankBalanceArr();

    // Always show chart, even if empty
    document.getElementById('mainChart').style.display = "";
    document.getElementById('mainChartNoData').style.display = incomeArr.length && expenditureArr.length ? "none" : "";

    if (ctx && ctxElem.offsetParent !== null) {
      mainChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: getFilteredWeekIndices().map(idx => weekLabels[idx]),
          datasets: [
            { label: 'Income', data: getFilteredWeekIndices().map(idx => incomeArr[idx]), borderColor: '#4caf50', fill: false },
            { label: 'Expenditure', data: getFilteredWeekIndices().map(idx => expenditureArr[idx]), borderColor: '#f44336', fill: false },
            { label: 'Repayments', data: getFilteredWeekIndices().map(idx => repaymentArr[idx]), borderColor: '#f3b200', fill: false },
            { label: 'Net Profit', data: getFilteredWeekIndices().map(idx => netProfitArr[idx]), borderColor: '#2196f3', fill: false },
            { label: 'Bank Balance', data: rolling, borderColor: '#000', fill: false, pointRadius: 2, borderDash: [3,3] }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: true } }
        }
      });
    }

    // Totals
    let sumIncome = getFilteredWeekIndices().reduce((a,idx)=>a+(incomeArr[idx]||0),0);
    let sumExpenditure = getFilteredWeekIndices().reduce((a,idx)=>a+(expenditureArr[idx]||0),0);
    let sumRepayments = getFilteredWeekIndices().reduce((a,idx)=>a+(repaymentArr[idx]||0),0);
    let sumNet = getFilteredWeekIndices().reduce((a,idx)=>a+(netProfitArr[idx]||0),0);
    let finalBank = rolling[rolling.length-1] || 0;
    var mainChartSummary = document.getElementById('mainChartSummary');
    if (mainChartSummary) {
      mainChartSummary.innerHTML =
        `<b>Total Income:</b> €${sumIncome.toLocaleString()}<br>
         <b>Total Expenditure:</b> €${sumExpenditure.toLocaleString()}<br>
         <b>Total Repayments:</b> €${sumRepayments.toLocaleString()}<br>
         <b>Final Bank Balance:</b> €${finalBank.toLocaleString()}<br>
         <b>Total Net Profit:</b> €${sumNet.toLocaleString()}`;
    }
  }

  // -------------------- ROI/Payback Section --------------------

  // NPV/IRR helpers (investor-centric: repayments only)
  function npv(rate, cashflows) {
    if (!cashflows.length) return 0;
    return cashflows.reduce((acc, val, i) => acc + val/Math.pow(1+rate, i), 0);
  }
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

  const roiInvInput = document.getElementById('roiInvestmentInput');
  const roiIntInput = document.getElementById('roiInterestInput');
  const refreshRoiBtn = document.getElementById('refreshRoiBtn');
  roiInvInput.value = roiInvestment;
  roiIntInput.value = roiInterest;

  function updateRoiSettings() {
    roiInvestment = parseFloat(roiInvInput.value) || 0;
    roiInterest = parseFloat(roiIntInput.value) || 0;
    renderRoiSection();
  }
  roiInvInput.addEventListener('input', updateRoiSettings);
  roiIntInput.addEventListener('input', updateRoiSettings);
  refreshRoiBtn.addEventListener('click', updateRoiSettings);

  function renderRoiSection() {
    // Investor-centric cashflows: -investment, then repayments (not profits)
    let repayments = getRepaymentArr();
    let cashflows = [-roiInvestment, ...repayments];
    let cum = 0, payback = null;
    for (let i=1; i<cashflows.length; i++) {
      cum += cashflows[i];
      if (payback === null && cum >= roiInvestment) payback = i;
    }
    let npvVal = roiInterest ? npv(roiInterest/100, cashflows) : null;
    let irrVal = irr(cashflows);

    let summary = `<b>Total Investment:</b> €${roiInvestment.toLocaleString()}<br>
      <b>Total Repayments:</b> €${repayments.reduce((a,b)=>a+b,0).toLocaleString()}<br>
      <b>NPV (${roiInterest}%):</b> ${typeof npvVal === "number" ? "€"+npvVal.toLocaleString(undefined,{maximumFractionDigits:2}) : "n/a"}<br>
      <b>IRR:</b> ${isFinite(irrVal) && !isNaN(irrVal) ? (irrVal*100).toFixed(2)+'%' : 'n/a'}<br>
      <b>Payback (weeks):</b> ${payback ?? 'n/a'}`;
    document.getElementById('roiSummary').innerHTML = summary;

    renderRoiCharts();
  }

  function renderRoiCharts() {
    let repayments = getRepaymentArr();
    let cumArr = [];
    let cum = 0;
    for (let i=0; i<repayments.length; i++) {
      cum += repayments[i]||0;
      cumArr.push(cum);
    }
    // Pie chart
    const roiPieCtx = document.getElementById('roiPieChart').getContext('2d');
    if (window.roiPieChart) window.roiPieChart.destroy();
    window.roiPieChart = new Chart(roiPieCtx, {
      type: 'pie',
      data: {
        labels: ["Total Repayments", "Unrecouped"],
        datasets: [{ data: [
          cumArr[cumArr.length-1]||0,
          Math.max(roiInvestment-(cumArr[cumArr.length-1]||0), 0)
        ], backgroundColor:["#4caf50","#f3b200"]}]
      },
      options: {responsive:true,maintainAspectRatio:false}
    });
    // Bar chart
    const roiBarCtx = document.getElementById('roiBarChart').getContext('2d');
    if (window.roiBarChart) window.roiBarChart.destroy();
    window.roiBarChart = new Chart(roiBarCtx, {
      type: 'bar',
      data: {
        labels: repayments.map((_, i) => 'W'+(i+1)),
        datasets: [
          { label: "Repayments", data: repayments, backgroundColor: "#4caf50" }
        ]
      },
      options: {responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true}}}
    });
    // Line chart - Cumulative
    const roiLineCtx = document.getElementById('roiLineChart').getContext('2d');
    if (window.roiLineChart) window.roiLineChart.destroy();
    window.roiLineChart = new Chart(roiLineCtx, {
      type: 'line',
      data: {
        labels: repayments.map((_, i) => 'W'+(i+1)),
        datasets: [
          { label: "Cumulative Repayments", data: cumArr, borderColor: "#2196f3", fill: false }
        ]
      },
      options: {responsive:true,maintainAspectRatio:false, plugins:{legend:{display:true}}}
    });
  }

  // -------------------- Export Buttons --------------------
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

  // -------------------- Initial Render --------------------
  updateAllTabs();
});
