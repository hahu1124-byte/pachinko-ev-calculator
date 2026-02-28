// [v79.2] 2026-02-28 - スプレッドシート対応ドキュメント作成とGitHub連携の強化
window.onerror = function (msg, url, lineNo, columnNo, error) {
    console.log('[GLOBAL ERROR]', msg, 'at line:', lineNo, 'col:', columnNo);
    return false;
};

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. UI要素の参照管理 ---
    const ui = {
        playRateRadios: document.querySelectorAll('input[name="play-rate"]'),
        exchangeRateSelect: document.getElementById('exchange-rate'),
        customExchangeInput: document.getElementById('custom-exchange'),
        machineSelect: document.getElementById('machine-select'),
        startSpinInput: document.getElementById('start-spin'),
        currentSpinInput: document.getElementById('current-spin'),
        investCashInput: document.getElementById('invest-cash'),
        investCashPresetInt: document.getElementById('invest-cash-preset-int'),
        investCashPresetDec: document.getElementById('invest-cash-preset-dec'),
        startBallsInput: document.getElementById('start-balls'),
        currentBallsInput: document.getElementById('current-balls'),
        measuredTurnRateDisplay: document.getElementById('measured-turn-rate'),
        measuredTotalInvestKDisplay: document.getElementById('measured-total-invest-k'),
        measuredTurnRate4pDisplay: document.getElementById('measured-turn-rate-4p'),
        bonusRoundsInput: document.getElementById('bonus-rounds'),
        afterBonusBallsInput: document.getElementById('after-bonus-balls'),
        measuredRbDisplay: document.getElementById('measured-rb'),
        assumedRbIntSelect: document.getElementById('assumed-rb-int'),
        assumedRbDecSelect: document.getElementById('assumed-rb-dec'),
        assumedRbDisplay: document.getElementById('assumed-rb-display'),
        resetAssumedRbBtn: document.getElementById('reset-assumed-rb-btn'),
        prevLastBallsDisplay: document.getElementById('prev-last-balls-display'),
        evDailyDisplay: document.getElementById('expected-value-daily'),
        totalSpinsDisplay: document.getElementById('total-spins'),
        valuePerSpinDisplay: document.getElementById('value-per-spin'),
        ballEvPerSpinDisplay: document.getElementById('ball-ev-per-spin'),
        cashEvPerSpinDisplay: document.getElementById('cash-ev-per-spin'),
        noteDisplay: document.getElementById('ev-note'),
        yutimeEvRow: document.getElementById('yutime-ev-row'),
        yutimeEvOnlyDisplay: document.getElementById('yutime-ev-only'),
        saveHistoryBtn: document.getElementById('save-history-btn'),
        deleteSelectedBtn: document.getElementById('delete-selected-btn'),
        restoreHistoryBtn: document.getElementById('restore-history-btn'),
        shareLineBtn: document.getElementById('share-line-btn'),
        historyList: document.getElementById('history-list'),
        summaryBox: document.getElementById('history-summary-container'),
        historyTotalEv: document.getElementById('history-total-ev'),
        historyAvgBallEv: document.getElementById('history-avg-ball-ev'),
        toggleFormatBtn: document.getElementById('toggle-format-btn'),
        toggleDateBtn: document.getElementById('toggle-date-btn'),
        summaryPrevBtn: document.getElementById('summary-prev-btn'),
        summaryNextBtn: document.getElementById('summary-next-btn'),
        summaryRateLabel: document.getElementById('summary-rate-label'),
        selectAllBtn: document.getElementById('select-all-btn')
    };

    // --- 2. 状態管理 ---
    let latestCalculation = null;
    let isCompactHistory = false;
    let showDate = true;
    let currentSummaryRate = null;

    // --- 3. 初期化処理 ---

    function initDropdowns() {
        // 仮定RBおよび投資プルダウンの生成 (0-200)
        for (let i = 0; i <= 200; i++) {
            const opt = document.createElement('option');
            opt.value = i; opt.textContent = i;
            ui.assumedRbIntSelect.appendChild(opt);

            const invOpt = document.createElement('option');
            invOpt.value = i; invOpt.textContent = i;
            ui.investCashPresetInt.appendChild(invOpt);
        }
        // 投資プルダウン（小数位 0-9）
        for (let i = 0; i <= 9; i++) {
            const invDecOpt = document.createElement('option');
            invDecOpt.value = i / 10; invDecOpt.textContent = i;
            ui.investCashPresetDec.appendChild(invDecOpt);
        }
        // 仮定RB（小数位 0-99）
        for (let i = 0; i <= 99; i++) {
            const opt = document.createElement('option');
            opt.value = i; opt.textContent = i.toString().padStart(2, '0');
            ui.assumedRbDecSelect.appendChild(opt);
        }
    }

    /**
     * 期待値計算とUI反映
     */
    function calculateEV() {
        const playRate = parseFloat(document.querySelector('input[name="play-rate"]:checked').value);
        const exchangeRateBalls = ui.exchangeRateSelect.value === 'custom' ? parseFloat(ui.customExchangeInput.value) : parseFloat(ui.exchangeRateSelect.value);

        const investCashK = (parseFloat(ui.investCashInput.value) || 0) +
            (parseFloat(ui.investCashPresetInt.value) || 0) +
            (parseFloat(ui.investCashPresetDec.value) || 0);

        const customAssumedRb = parseFloat(ui.assumedRbIntSelect.value) + (parseFloat(ui.assumedRbDecSelect.value) / 100);

        const inputs = {
            playRate, exchangeRateBalls,
            startSpin: parseFloat(ui.startSpinInput.value) || 0,
            currentSpin: parseFloat(ui.currentSpinInput.value) || 0,
            investCashK: investCashK,
            startBalls: parseFloat(ui.startBallsInput.value) || 0,
            currentBalls: parseFloat(ui.currentBallsInput.value) || 0,
            bonusRounds: parseFloat(ui.bonusRoundsInput.value) || 0,
            afterBonusBalls: parseFloat(ui.afterBonusBallsInput.value) || 0,
            customAssumedRb: customAssumedRb
        };

        const machine = DataManager.getMachineByIndex(ui.machineSelect.value);
        const res = calculatePachinkoEV(inputs, machine);

        // UI反映
        ui.measuredTurnRateDisplay.textContent = res.totalInvestedYen > 0 ? `${res.turnRatePer1k.toFixed(2)} 回転` : '-- 回転';
        if (ui.measuredTotalInvestKDisplay) ui.measuredTotalInvestKDisplay.textContent = `${(res.totalInvestedYen / 1000).toFixed(3)}k`;

        if (ui.measuredTurnRate4pDisplay) {
            const container4p = document.getElementById('measured-turn-rate-4p-container');
            if (playRate === 4) {
                if (container4p) container4p.style.display = 'none';
            } else {
                if (container4p) container4p.style.display = 'flex';
                ui.measuredTurnRate4pDisplay.textContent = res.totalInvestedYen > 0 ? `${(res.turnRatePer1k / (4 / playRate)).toFixed(2)} 回転` : '-- 回転';
            }
        }
        ui.measuredRbDisplay.textContent = res.measuredRb > 0 ? `${res.measuredRb.toFixed(2)} 玉` : '-- 玉';
        ui.assumedRbDisplay.textContent = customAssumedRb.toFixed(2);

        if (res.activeBorderBase <= 0 || isNaN(res.activeBorderBase) || res.turnRatePer1k <= 0 || res.totalSpinsMeasured <= 0) {
            ui.evDailyDisplay.textContent = '￥0';
            ui.totalSpinsDisplay.textContent = '0 回転';
            ui.noteDisplay.textContent = res.activeBorderBase <= 0 ? '機種を選択してください。' : '実戦データを入力すると自動計算されます。';
            return;
        }

        ui.totalSpinsDisplay.textContent = `${res.totalSpinsMeasured.toLocaleString()} 回転`;
        ui.evDailyDisplay.textContent = formatCurrency(Math.round(res.mainEV));
        ui.valuePerSpinDisplay.textContent = formatSpinValue(res.finalValuePerSpin);
        ui.ballEvPerSpinDisplay.textContent = formatSpinValue(res.isYutimeApplied ? res.yutimeBallUnitPriceResult : res.normalBallUnitPrice);
        ui.cashEvPerSpinDisplay.textContent = formatSpinValue(res.isYutimeApplied ? res.yutimeCashUnitPriceResult : res.normalCashUnitPrice);

        // ラベル更新
        const isYu = res.isYutimeApplied;
        ui.valuePerSpinDisplay.previousElementSibling.textContent = isYu ? '持玉比率単価（遊）' : '持玉比率単価';
        ui.ballEvPerSpinDisplay.previousElementSibling.textContent = isYu ? '持玉単価（遊）' : '持玉単価';
        ui.cashEvPerSpinDisplay.previousElementSibling.textContent = isYu ? '現金単価（遊）' : '現金単価';

        if (isYu) {
            ui.yutimeEvRow.style.display = 'flex';
            ui.yutimeEvOnlyDisplay.textContent = formatCurrency(Math.round(res.yutimeEV));
        } else {
            ui.yutimeEvRow.style.display = 'none';
        }

        // 保存用データ保持
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

        UIManager.updateEVBadgeAndAura(Math.round(res.mainEV));
        UIManager.animateEV(Math.round(res.mainEV), ui.evDailyDisplay);

        if (res.mainEV > 0) {
            ui.evDailyDisplay.className = 'amount positive';
            ui.noteDisplay.textContent = `実質ボーダーラインを ${(res.turnRatePer1k - res.realBorder).toFixed(1)} 回転 上回っています。${res.hasYutime ? ' (遊タイム込適用)' : ''}`;
        } else if (res.mainEV < 0) {
            ui.evDailyDisplay.className = 'amount negative';
            ui.noteDisplay.innerHTML = `実質ボーダーラインに <strong>${(res.realBorder - res.turnRatePer1k).toFixed(1)} 回転 不足</strong>しています。${res.hasYutime ? ' (遊タイム込)' : ''}`;
        } else {
            ui.evDailyDisplay.className = 'amount';
            ui.noteDisplay.textContent = '期待値プラマイゼロのラインです。';
        }
    }

    /**
     * 履歴の再描画
     */
    function renderHistory() {
        const historyData = HistoryManager.getHistoryData();
        const checkedIds = SettingsManager.loadCheckedIds();
        const rates = HistoryManager.getAvailableRates();

        if (!currentSummaryRate || !rates.includes(currentSummaryRate)) {
            currentSummaryRate = rates.length > 0 ? rates[0] : 4;
        }

        if (ui.summaryRateLabel) ui.summaryRateLabel.textContent = `${currentSummaryRate}円 統計`;

        const stats = UIManager.renderHistory({
            historyData, historyList: ui.historyList, isCompactHistory, showDate,
            currentSummaryRate, checkedIds, summaryBox: ui.summaryBox
        });

        if (ui.historyTotalEv) {
            ui.historyTotalEv.parentElement.style.display = isCompactHistory ? 'none' : 'flex';
            ui.historyTotalEv.textContent = formatCurrency(Math.round(stats.sumWork));
        }
        if (ui.historyAvgBallEv) {
            ui.historyAvgBallEv.parentElement.style.display = isCompactHistory ? 'none' : 'flex';
            const avg = stats.sumSpins > 0 ? (stats.sumWork / stats.sumSpins) : 0;
            ui.historyAvgBallEv.textContent = formatSpinValue(avg);
        }

        // チェックボックスイベント付与
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

    /**
     * 機種選択肢の生成
     */
    function populateMachineSelect() {
        const previousSelection = ui.machineSelect.value;
        ui.machineSelect.innerHTML = '';
        const playRate = parseFloat(document.querySelector('input[name="play-rate"]:checked').value);
        const exchangeRateBalls = ui.exchangeRateSelect.value === 'custom' ? parseFloat(ui.customExchangeInput.value) : parseFloat(ui.exchangeRateSelect.value);
        const cashoutPrice = (1000 / exchangeRateBalls) * (playRate / 4);

        DataManager.getMachineData().forEach((m, i) => {
            const cashBorder = m.border * (playRate / cashoutPrice);
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `${m.name} (${m.border.toFixed(1)} / ${cashBorder.toFixed(1)})${m.yutimeSpins > 0 ? ` 遊${m.yutimeSpins}` : ''}`;
            ui.machineSelect.appendChild(opt);
        });

        const savedValue = ui.machineSelect.getAttribute('data-saved-value');
        if (savedValue !== null && DataManager.getMachineByIndex(savedValue)) {
            ui.machineSelect.value = savedValue;
            ui.machineSelect.removeAttribute('data-saved-value');
        } else if (previousSelection && DataManager.getMachineByIndex(previousSelection)) {
            ui.machineSelect.value = previousSelection;
        } else if (DataManager.getMachineData().length > 0) {
            ui.machineSelect.value = 0;
        }

        // 初期仮定RBセット
        const machine = DataManager.getMachineByIndex(ui.machineSelect.value);
        if (machine) {
            const val = machine.rb || 0;
            ui.assumedRbIntSelect.value = Math.floor(val);
            ui.assumedRbDecSelect.value = Math.round((val % 1) * 100);
            ui.assumedRbDisplay.textContent = val.toFixed(2);
        }
        calculateEV();
    }

    // --- 4. イベントリスナー設定 ---

    function setupEventListeners() {
        // 入力変更時の自動計算
        const autoCalcInputs = [
            ...ui.playRateRadios,
            ui.exchangeRateSelect,
            ui.customExchangeInput,
            ui.machineSelect,
            ui.startSpinInput,
            ui.currentSpinInput,
            ui.investCashInput,
            ui.investCashPresetInt,
            ui.investCashPresetDec,
            ui.startBallsInput,
            ui.currentBallsInput,
            ui.bonusRoundsInput,
            ui.afterBonusBallsInput,
            ui.assumedRbIntSelect,
            ui.assumedRbDecSelect
        ];

        autoCalcInputs.forEach(el => {
            const eventType = el.tagName === 'SELECT' || el.type === 'radio' ? 'change' : 'input';
            el.addEventListener(eventType, calculateEV);
        });

        // 交換率の「その他」入力切り替え
        ui.exchangeRateSelect.addEventListener('change', (e) => {
            ui.customExchangeInput.classList.toggle('hidden', e.target.value !== 'custom');
            populateMachineSelect();
        });

        // レート変更時の機種リスト更新
        ui.playRateRadios.forEach(r => r.addEventListener('change', populateMachineSelect));

        // 機種選択時のデフォルトRB反映
        ui.machineSelect.addEventListener('change', () => {
            const machine = DataManager.getMachineByIndex(ui.machineSelect.value);
            if (machine) {
                const val = machine.rb || 0;
                ui.assumedRbIntSelect.value = Math.floor(val);
                ui.assumedRbDecSelect.value = Math.round((val % 1) * 100);
                ui.assumedRbDisplay.textContent = val.toFixed(2);
            }
            calculateEV();
        });

        // 仮定RB初期化ボタン
        ui.resetAssumedRbBtn?.addEventListener('click', () => {
            const machine = DataManager.getMachineByIndex(ui.machineSelect.value);
            if (machine) {
                const val = machine.rb || 0;
                ui.assumedRbIntSelect.value = Math.floor(val);
                ui.assumedRbDecSelect.value = Math.round((val % 1) * 100);
                ui.assumedRbDisplay.textContent = val.toFixed(2);
                calculateEV();
            }
        });

        document.querySelectorAll('.clear-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetInput = document.getElementById(btn.getAttribute('data-target'));
                if (targetInput) { targetInput.value = ''; calculateEV(); }
            });
        });

        ui.saveHistoryBtn?.addEventListener('click', () => {
            if (!latestCalculation) return alert('計算してから保存してください。');
            if (ui.afterBonusBallsInput.value) {
                ui.prevLastBallsDisplay.textContent = `：前回最終玉 ${ui.afterBonusBallsInput.value}`;
            }
            HistoryManager.addEntry(latestCalculation);
            renderHistory();
            alert('保存しました！');
        });

        ui.deleteSelectedBtn?.addEventListener('click', () => {
            const selected = Array.from(document.querySelectorAll('.history-checkbox:checked')).map(cb => parseInt(cb.getAttribute('data-id')));
            if (selected.length > 0 && confirm('削除しますか？')) {
                HistoryManager.deleteEntries(selected);
                renderHistory();
                updateRestoreBtnState();
            }
        });

        ui.restoreHistoryBtn?.addEventListener('click', () => {
            HistoryManager.restoreEntries();
            renderHistory();
            updateRestoreBtnState();
            alert('データを復旧しました。');
        });

        ui.selectAllBtn?.addEventListener('click', () => {
            const cbs = document.querySelectorAll('.history-checkbox');
            const allChecked = Array.from(cbs).every(cb => cb.checked);
            cbs.forEach(cb => cb.checked = !allChecked);
            const newChecked = Array.from(document.querySelectorAll('.history-checkbox:checked')).map(c => parseInt(c.getAttribute('data-id')));
            SettingsManager.saveCheckedIds(newChecked);
            renderHistory();
        });

        ui.shareLineBtn?.addEventListener('click', () => handleShareLineClick(HistoryManager.getHistoryData(), isCompactHistory, showDate));

        ui.toggleFormatBtn?.addEventListener('click', () => {
            isCompactHistory = !isCompactHistory;
            ui.toggleFormatBtn.textContent = isCompactHistory ? '簡略' : '詳細';
            ui.toggleFormatBtn.style.background = isCompactHistory ? '#64748b' : '#3b82f6';
            saveSettings();
            renderHistory();
        });

        ui.toggleDateBtn?.addEventListener('click', () => {
            showDate = !showDate;
            ui.toggleDateBtn.classList.toggle('btn-on', showDate);
            saveSettings();
            renderHistory();
        });

        ui.summaryPrevBtn?.addEventListener('click', () => {
            const rates = HistoryManager.getAvailableRates();
            if (rates.length <= 1) return;
            currentSummaryRate = rates[(rates.indexOf(currentSummaryRate) - 1 + rates.length) % rates.length];
            renderHistory();
        });

        ui.summaryNextBtn?.addEventListener('click', () => {
            const rates = HistoryManager.getAvailableRates();
            if (rates.length <= 1) return;
            currentSummaryRate = rates[(rates.indexOf(currentSummaryRate) + 1) % rates.length];
            renderHistory();
        });
    }

    function updateRestoreBtnState() {
        if (!ui.restoreHistoryBtn) return;
        const backupCount = (SettingsManager.loadDeletedBackup() || []).length;
        ui.restoreHistoryBtn.disabled = backupCount === 0;
        ui.restoreHistoryBtn.className = backupCount > 0 ? 'btn-gray-active' : 'btn-gray';
    }

    function saveSettings() {
        SettingsManager.saveSettings({
            playRate: document.querySelector('input[name="play-rate"]:checked').value,
            exchangeRate: ui.exchangeRateSelect.value,
            customExchange: ui.customExchangeInput.value,
            machineSelect: ui.machineSelect.value,
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
            ui.exchangeRateSelect.value = s.exchangeRate;
            ui.customExchangeInput.classList.toggle('hidden', s.exchangeRate !== 'custom');
            if (s.customExchange) ui.customExchangeInput.value = s.customExchange;
        }
        if (s.machineSelect !== undefined) ui.machineSelect.setAttribute('data-saved-value', s.machineSelect);
        if (s.isCompactHistory !== undefined) {
            isCompactHistory = s.isCompactHistory;
            if (ui.toggleFormatBtn) {
                ui.toggleFormatBtn.textContent = isCompactHistory ? '簡略' : '詳細';
                ui.toggleFormatBtn.style.background = isCompactHistory ? '#64748b' : '#3b82f6';
            }
        }
        if (s.showDate !== undefined) {
            showDate = s.showDate;
            ui.toggleDateBtn?.classList.toggle('btn-on', showDate);
        }
    }

    // --- 5. 実行開始 ---
    initDropdowns();
    loadSettings();
    HistoryManager.init();
    DataManager.loadFromCache();
    populateMachineSelect();
    setupEventListeners();
    updateRestoreBtnState();
    renderHistory();

    // 最新データのフェッチ
    DataManager.fetchMachineData().then(() => {
        populateMachineSelect();
    });
});
