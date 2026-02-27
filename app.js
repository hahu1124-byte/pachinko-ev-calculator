// [v71] 2026-02-27 - 簡略チェックボックスの行内配置と文字色修正
window.onerror = function (msg, url, lineNo, columnNo, error) {
    console.log('[GLOBAL ERROR]', msg, 'at line:', lineNo, 'col:', columnNo);
    return false;
};

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. UI要素の取得 ---
    const playRateRadios = document.querySelectorAll('input[name="play-rate"]');
    const exchangeRateSelect = document.getElementById('exchange-rate');
    const customExchangeInput = document.getElementById('custom-exchange');
    const machineSelect = document.getElementById('machine-select');
    const startSpinInput = document.getElementById('start-spin');
    const currentSpinInput = document.getElementById('current-spin');
    const investCashInput = document.getElementById('invest-cash');
    const startBallsInput = document.getElementById('start-balls');
    const currentBallsInput = document.getElementById('current-balls');
    const measuredTurnRateDisplay = document.getElementById('measured-turn-rate');
    const measuredTurnRate4pDisplay = document.getElementById('measured-turn-rate-4p');
    const bonusRoundsInput = document.getElementById('bonus-rounds');
    const afterBonusBallsInput = document.getElementById('after-bonus-balls');
    const measuredRbDisplay = document.getElementById('measured-rb');

    const evDailyDisplay = document.getElementById('expected-value-daily');
    const totalSpinsDisplay = document.getElementById('total-spins');
    const valuePerSpinDisplay = document.getElementById('value-per-spin');
    const ballEvPerSpinDisplay = document.getElementById('ball-ev-per-spin');
    const cashEvPerSpinDisplay = document.getElementById('cash-ev-per-spin');
    const noteDisplay = document.getElementById('ev-note');
    const yutimeEvRow = document.getElementById('yutime-ev-row');
    const yutimeEvOnlyDisplay = document.getElementById('yutime-ev-only');

    const saveHistoryBtn = document.getElementById('save-history-btn');
    const deleteSelectedBtn = document.getElementById('delete-selected-btn');
    const shareLineBtn = document.getElementById('share-line-btn');
    const historyList = document.getElementById('history-list');
    const summaryBox = document.getElementById('history-summary-container');
    const historyTotalEv = document.getElementById('history-total-ev');
    const historyAvgBallEv = document.getElementById('history-avg-ball-ev');

    // --- 2. 状態管理（グローバル変数の最小化） ---
    let machineData = [];
    let historyData = SettingsManager.loadHistory();
    let latestCalculation = null;
    let isCompactHistory = false;
    let showDate = true;
    let currentSummaryRate = null;

    // --- 3. メイン処理 (Engine/UI/Settingsの連携) ---

    function calculateEV() {
        const playRate = parseFloat(document.querySelector('input[name="play-rate"]:checked').value);
        const exchangeRateBalls = exchangeRateSelect.value === 'custom' ? parseFloat(customExchangeInput.value) : parseFloat(exchangeRateSelect.value);

        const inputs = {
            playRate, exchangeRateBalls,
            startSpin: parseFloat(startSpinInput.value) || 0,
            currentSpin: parseFloat(currentSpinInput.value) || 0,
            investCashK: parseFloat(investCashInput.value) || 0,
            startBalls: parseFloat(startBallsInput.value) || 0,
            currentBalls: parseFloat(currentBallsInput.value) || 0,
            bonusRounds: parseFloat(bonusRoundsInput.value) || 0,
            afterBonusBalls: parseFloat(afterBonusBallsInput.value) || 0
        };

        const machine = machineData[machineSelect.value];
        const res = calculatePachinkoEV(inputs, machine);

        // UI更新 (数値表示)
        measuredTurnRateDisplay.textContent = res.totalInvestedYen > 0 ? `${res.turnRatePer1k.toFixed(2)} 回転` : '-- 回転';
        if (measuredTurnRate4pDisplay) {
            const container4p = document.getElementById('measured-turn-rate-4p-container');
            if (playRate === 4) {
                if (container4p) container4p.style.display = 'none';
            } else {
                if (container4p) container4p.style.display = 'flex';
                measuredTurnRate4pDisplay.textContent = res.totalInvestedYen > 0 ? `${(res.turnRatePer1k / (4 / playRate)).toFixed(2)} 回転` : '-- 回転';
            }
        }
        measuredRbDisplay.textContent = res.measuredRb > 0 ? `${res.measuredRb.toFixed(2)} 玉` : '-- 玉';

        if (res.activeBorderBase <= 0 || isNaN(res.activeBorderBase) || res.turnRatePer1k <= 0 || res.totalSpinsMeasured <= 0) {
            evDailyDisplay.textContent = '￥0';
            totalSpinsDisplay.textContent = '0 回転';
            noteDisplay.textContent = res.activeBorderBase <= 0 ? '機種を選択してください。' : '実戦データを入力すると自動計算されます。';
            return;
        }

        totalSpinsDisplay.textContent = `${res.totalSpinsMeasured.toLocaleString()} 回転`;
        evDailyDisplay.textContent = formatCurrency(Math.round(res.mainEV));
        valuePerSpinDisplay.textContent = formatSpinValue(res.finalValuePerSpin);
        ballEvPerSpinDisplay.textContent = formatSpinValue(res.isYutimeApplied ? res.yutimeBallUnitPriceResult : res.normalBallUnitPrice);
        cashEvPerSpinDisplay.textContent = formatSpinValue(res.isYutimeApplied ? res.yutimeCashUnitPriceResult : res.normalCashUnitPrice);

        // ラベル・バッジ更新
        const labels = {
            unit: res.isYutimeApplied ? '持玉比率単価（遊）' : '持玉比率単価',
            ball: res.isYutimeApplied ? '持玉単価（遊）' : '持玉単価',
            cash: res.isYutimeApplied ? '現金単価（遊）' : '現金単価'
        };
        valuePerSpinDisplay.previousElementSibling.textContent = labels.unit;
        ballEvPerSpinDisplay.previousElementSibling.textContent = labels.ball;
        cashEvPerSpinDisplay.previousElementSibling.textContent = labels.cash;

        if (res.isYutimeApplied) {
            yutimeEvRow.style.display = 'flex';
            yutimeEvOnlyDisplay.textContent = formatCurrency(Math.round(res.yutimeEV));
        } else {
            yutimeEvRow.style.display = 'none';
        }

        // 保存用データの作成
        latestCalculation = {
            id: Date.now(),
            machineName: machine ? machine.name : '手入力台',
            playRate, turnRate: res.turnRatePer1k, totalSpinsMeasured: res.totalSpinsMeasured,
            dailyEV: res.mainEV, valuePerSpin: res.finalValuePerSpin, ballEv: res.normalBallUnitPrice, cashEv: res.normalCashUnitPrice,
            hasYutime: res.hasYutime, yutimeEV: res.yutimeEV, totalInvestedK: res.totalInvestedYen / 1000, cashInvestedK: inputs.investCashK,
            measuredRb: res.measuredRb, bonusRounds: inputs.bonusRounds, acquiredBalls: (inputs.bonusRounds > 0 && inputs.afterBonusBalls > 0) ? (inputs.afterBonusBalls - inputs.currentBalls) : 0,
            diffBalls: (inputs.afterBonusBalls > 0 ? inputs.afterBonusBalls : inputs.currentBalls) - inputs.startBalls - Math.floor(res.cashInvestedYen / playRate),
            ballRatio: res.ballRatio, positiveBallsYen: Math.max(0, res.usedBalls * playRate), totalInvestedYen: res.totalInvestedYen
        };

        // 演出
        UIManager.updateEVBadgeAndAura(Math.round(res.mainEV));
        UIManager.animateEV(Math.round(res.mainEV), evDailyDisplay);

        // メッセージ更新
        if (res.mainEV > 0) {
            evDailyDisplay.className = 'amount positive';
            noteDisplay.textContent = `実質ボーダーラインを ${(res.turnRatePer1k - res.realBorder).toFixed(1)} 回転 上回っています。${res.hasYutime ? ' (遊タイム込適用)' : ''}`;
        } else if (res.mainEV < 0) {
            evDailyDisplay.className = 'amount negative';
            noteDisplay.innerHTML = `実質ボーダーラインに <strong>${(res.realBorder - res.turnRatePer1k).toFixed(1)} 回転 不足</strong>しています。${res.hasYutime ? ' (遊タイム込)' : ''}`;
        } else {
            evDailyDisplay.className = 'amount';
            noteDisplay.textContent = '期待値プラマイゼロのラインです。';
        }
    }

    function renderHistory() {
        const checkedIds = SettingsManager.loadCheckedIds();
        const availableRates = Array.from(new Set(historyData.map(item => item.playRate || 4))).sort((a, b) => b - a);
        if (!currentSummaryRate || !availableRates.includes(currentSummaryRate)) {
            currentSummaryRate = availableRates.length > 0 ? availableRates[0] : 4;
        }

        const summaryLabel = document.getElementById('summary-rate-label');
        if (summaryLabel) summaryLabel.textContent = `${currentSummaryRate}円 統計`;

        const stats = UIManager.renderHistory({
            historyData, historyList, isCompactHistory, showDate,
            currentSummaryRate, checkedIds, summaryBox
        });

        if (historyTotalEv) {
            historyTotalEv.parentElement.style.display = isCompactHistory ? 'none' : 'flex';
            historyTotalEv.textContent = formatCurrency(Math.round(stats.sumWork));
        }
        if (historyAvgBallEv) {
            historyAvgBallEv.parentElement.style.display = isCompactHistory ? 'none' : 'flex';
            const avg = stats.sumSpins > 0 ? (stats.sumWork / stats.sumSpins) : 0;
            historyAvgBallEv.textContent = formatSpinValue(avg);
        }

        // チェック状態復元とイベント
        document.querySelectorAll('.history-checkbox').forEach(cb => {
            const id = parseInt(cb.getAttribute('data-id'));
            if (checkedIds.includes(id)) cb.checked = true;
            cb.addEventListener('change', () => {
                const newChecked = Array.from(document.querySelectorAll('.history-checkbox:checked')).map(c => parseInt(c.getAttribute('data-id')));
                SettingsManager.saveCheckedIds(newChecked);
                renderHistory();
            });
        });
    }

    // --- 4. CSVフェッチ・機種データ ---
    function populateMachineSelect() {
        const previousSelection = machineSelect.value;
        machineSelect.innerHTML = '';
        const playRate = parseFloat(document.querySelector('input[name="play-rate"]:checked').value);
        const exchangeRateBalls = exchangeRateSelect.value === 'custom' ? parseFloat(customExchangeInput.value) : parseFloat(exchangeRateSelect.value);
        const cashoutPrice = (1000 / exchangeRateBalls) * (playRate / 4);

        machineData.forEach((m, i) => {
            const cashBorder = m.border * (playRate / cashoutPrice);
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `${m.name} (${m.border.toFixed(1)} / ${cashBorder.toFixed(1)})${m.yutimeSpins > 0 ? ` 遊${m.yutimeSpins}` : ''}`;
            machineSelect.appendChild(opt);
        });

        const savedValue = machineSelect.getAttribute('data-saved-value');
        if (savedValue !== null && machineData[savedValue]) {
            machineSelect.value = savedValue;
            machineSelect.removeAttribute('data-saved-value');
        } else if (previousSelection && machineData[previousSelection]) {
            machineSelect.value = previousSelection;
        } else if (machineData.length > 0) {
            machineSelect.value = 0;
        }
        calculateEV();
    }

    const sheetCsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTg_z1H5K62_019noNiZnxtSTOafCW4c5y4BghW62nHmOTneMx4JzVycIXAXHTdF9vxYSOjcnu7u3BK/pub?gid=493752965&single=true&output=csv';
    const cachedMachines = SettingsManager.getParametricMachines();
    if (cachedMachines) {
        machineData = cachedMachines;
        populateMachineSelect();
    }

    fetch(sheetCsvUrl).then(r => r.text()).then(csv => {
        const rows = parseCsv(csv.trim());
        const names = rows[0], pProbs = rows[1], rbs = rows[2], yRbs = rows[3], probs = rows[4], yts = rows[5], acs = rows[10] || [], yscs = rows[15] || [];
        const newData = [];
        for (let i = 1; i < names.length; i++) {
            const name = names[i]?.trim();
            if (!name) continue;
            const rb = parseFloat(rbs[i]), prob = parseFloat(probs[i]);
            if (rb > 0 && prob > 0) {
                newData.push({
                    name, prob, rb, border: 250 / (rb / prob),
                    primaryProb: parseFloat(pProbs[i]),
                    yutimeSpins: parseFloat(yts[i]) || 0,
                    yutimeRb: parseFloat(yRbs[i]) || 0,
                    avgChain: parseFloat(acs[i]) || 0,
                    yutimeSpinCount: parseFloat(yscs[i]) || 0
                });
            }
        }
        if (newData.length > 0) {
            machineData = newData;
            SettingsManager.saveParametricMachines(machineData);
            populateMachineSelect();
        }
    }).catch(e => {
        console.warn('CSV load error, using sample data');
        if (machineData.length === 0) {
            machineData = [{ name: "【サンプル】大海5", border: 16.5, prob: 31.9, primaryProb: 319.6, rb: 140, yutimeSpins: 950, yutimeRb: 10.23, avgChain: 3.011, yutimeSpinCount: 350 }];
            populateMachineSelect();
        }
    });

    // --- 5. イベントリスナー ---
    const inputs_all = document.querySelectorAll('input[type="number"], input[type="radio"], select');
    inputs_all.forEach(el => el.addEventListener('input', calculateEV));
    inputs_all.forEach(el => el.addEventListener('change', calculateEV));

    exchangeRateSelect.addEventListener('change', (e) => {
        customExchangeInput.classList.toggle('hidden', e.target.value !== 'custom');
        populateMachineSelect();
    });
    playRateRadios.forEach(r => r.addEventListener('change', populateMachineSelect));
    machineSelect.addEventListener('change', calculateEV);

    saveHistoryBtn?.addEventListener('click', () => {
        if (!latestCalculation) return alert('計算してから保存してください。');
        historyData.unshift(latestCalculation);
        SettingsManager.saveHistory(historyData);
        renderHistory();
        alert('保存しました！');
    });

    deleteSelectedBtn?.addEventListener('click', () => {
        const selected = Array.from(document.querySelectorAll('.history-checkbox:checked')).map(cb => parseInt(cb.getAttribute('data-id')));
        if (selected.length > 0 && confirm('削除しますか？')) {
            historyData = historyData.filter(item => !selected.includes(item.id));
            SettingsManager.saveHistory(historyData);
            renderHistory();
        }
    });

    document.getElementById('select-all-btn')?.addEventListener('click', () => {
        const cbs = document.querySelectorAll('.history-checkbox');
        const allChecked = Array.from(cbs).every(cb => cb.checked);
        cbs.forEach(cb => cb.checked = !allChecked);
        const newChecked = Array.from(document.querySelectorAll('.history-checkbox:checked')).map(c => parseInt(c.getAttribute('data-id')));
        SettingsManager.saveCheckedIds(newChecked);
        renderHistory();
    });

    shareLineBtn?.addEventListener('click', () => handleShareLineClick(historyData, isCompactHistory, showDate));

    const toggleFormatBtn = document.getElementById('toggle-format-btn');
    toggleFormatBtn?.addEventListener('click', () => {
        isCompactHistory = !isCompactHistory;
        toggleFormatBtn.textContent = isCompactHistory ? '簡略' : '詳細';
        toggleFormatBtn.style.background = isCompactHistory ? '#64748b' : '#3b82f6';
        saveSettings();
        renderHistory();
    });

    const toggleDateBtn = document.getElementById('toggle-date-btn');
    toggleDateBtn?.addEventListener('click', () => {
        showDate = !showDate;
        toggleDateBtn.classList.toggle('btn-on', showDate);
        saveSettings();
        renderHistory();
    });

    document.getElementById('summary-prev-btn')?.addEventListener('click', () => {
        const rates = Array.from(new Set(historyData.map(item => item.playRate || 4))).sort((a, b) => b - a);
        if (rates.length <= 1) return;
        let idx = (rates.indexOf(currentSummaryRate) - 1 + rates.length) % rates.length;
        currentSummaryRate = rates[idx];
        renderHistory();
    });

    document.getElementById('summary-next-btn')?.addEventListener('click', () => {
        const rates = Array.from(new Set(historyData.map(item => item.playRate || 4))).sort((a, b) => b - a);
        if (rates.length <= 1) return;
        let idx = (rates.indexOf(currentSummaryRate) + 1) % rates.length;
        currentSummaryRate = rates[idx];
        renderHistory();
    });

    function saveSettings() {
        SettingsManager.saveSettings({
            playRate: document.querySelector('input[name="play-rate"]:checked').value,
            exchangeRate: exchangeRateSelect.value,
            customExchange: customExchangeInput.value,
            machineSelect: machineSelect.value,
            isCompactHistory, showDate
        });
    }

    function loadSettings() {
        const s = SettingsManager.loadSettings();
        if (!s) return;
        if (s.playRate) {
            const r = document.querySelector(`input[name="play-rate"][value="${s.playRate}"]`);
            if (r) r.checked = true;
        }
        if (s.exchangeRate) {
            exchangeRateSelect.value = s.exchangeRate;
            customExchangeInput.classList.toggle('hidden', s.exchangeRate !== 'custom');
            if (s.customExchange) customExchangeInput.value = s.customExchange;
        }
        if (s.machineSelect !== undefined) machineSelect.setAttribute('data-saved-value', s.machineSelect);
        if (s.isCompactHistory !== undefined) {
            isCompactHistory = s.isCompactHistory;
            if (toggleFormatBtn) {
                toggleFormatBtn.textContent = isCompactHistory ? '簡略' : '詳細';
                toggleFormatBtn.style.background = isCompactHistory ? '#64748b' : '#3b82f6';
            }
        }
        if (s.showDate !== undefined) {
            showDate = s.showDate;
            toggleDateBtn?.classList.toggle('btn-on', showDate);
        }
    }

    loadSettings();
    renderHistory();
    calculateEV();
});
