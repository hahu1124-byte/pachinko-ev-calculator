window.onerror = function (msg, url, lineNo, columnNo, error) {
    console.log('[GLOBAL ERROR]', msg, 'at line:', lineNo, 'col:', columnNo);
    return false;
};
console.log('[DEBUG] app.js start executing');

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
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
    const bonusRoundsInput = document.getElementById('bonus-rounds');
    const afterBonusBallsInput = document.getElementById('after-bonus-balls');
    const measuredRbDisplay = document.getElementById('measured-rb');
    const hoursInput = document.getElementById('hours');
    const spinsPerHourInput = document.getElementById('spins-per-hour');

    // Result Elements
    const evDailyDisplay = document.getElementById('expected-value-daily');
    const totalSpinsDisplay = document.getElementById('total-spins');
    const realBorderDisplay = document.getElementById('real-border');
    const valuePerSpinDisplay = document.getElementById('value-per-spin');
    const ballEvPerSpinDisplay = document.getElementById('ball-ev-per-spin');
    const cashEvPerSpinDisplay = document.getElementById('cash-ev-per-spin');
    const noteDisplay = document.getElementById('ev-note');
    const yutimeEvRow = document.getElementById('yutime-ev-row');
    const yutimeEvOnlyDisplay = document.getElementById('yutime-ev-only');
    const yutimeValueRow = document.getElementById('yutime-value-row');
    const yutimeValuePerSpinDisplay = document.getElementById('yutime-value-per-spin');

    // History Elements
    const saveHistoryBtn = document.getElementById('save-history-btn');
    const deleteSelectedBtn = document.getElementById('delete-selected-btn');
    const deleteAllBtn = document.getElementById('delete-all-btn');
    const historyList = document.getElementById('history-list');
    const historyTotalEv = document.getElementById('history-total-ev');
    const historyAvgBallEv = document.getElementById('history-avg-ball-ev');

    let historyData = JSON.parse(localStorage.getItem('pachinkoHistory')) || [];
    let latestCalculation = null;

    // UI Toggle Logic
    exchangeRateSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            customExchangeInput.classList.remove('hidden');
        } else {
            customExchangeInput.classList.add('hidden');
        }
        calculateEV();
    });

    // イベントリスナーの一括登録を最優先で実行（後続の処理が失敗しても更新機能は生かす）
    const inputs = document.querySelectorAll('input[type="number"], input[type="radio"]');
    inputs.forEach(input => {
        input.addEventListener('input', calculateEV);
        input.addEventListener('change', calculateEV);
    });

    // Preset Machine Logic
    let machineData = [];

    // 初回の計算呼び出し（DOM未完全やデータ未ロード時のエラーで後続処理が止まるのを防ぐ）
    try {
        calculateEV();
    } catch (e) {
        console.warn('Initial calculateEV skipped or failed:', e);
    }

    // Google Sheets CSV URL
    const sheetCsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTg_z1H5K62_019noNiZnxtSTOafCW4c5y4BghW62nHmOTneMx4JzVycIXAXHTdF9vxYSOjcnu7u3BK/pub?gid=493752965&single=true&output=csv';

    // 引用符付きCSVを正しくパースする関数 (セル内改行・カンマ対応)
    function parseCsv(text) {
        const rows = [];
        let row = [];
        let cell = '';
        let inQuotes = false;
        for (let i = 0; i < text.length; i++) {
            const c = text[i];
            if (inQuotes) {
                if (c === '"' && text[i + 1] === '"') {
                    cell += '"';
                    i++;
                } else if (c === '"') {
                    inQuotes = false;
                } else {
                    cell += c;
                }
            } else {
                if (c === '"') {
                    inQuotes = true;
                } else if (c === ',') {
                    row.push(cell);
                    cell = '';
                } else if (c === '\n' || (c === '\r' && text[i + 1] === '\n')) {
                    if (c === '\r') i++;
                    row.push(cell);
                    cell = '';
                    rows.push(row);
                    row = [];
                } else if (c === '\r') {
                    row.push(cell);
                    cell = '';
                    rows.push(row);
                    row = [];
                } else {
                    cell += c;
                }
            }
        }
        if (cell || row.length > 0) {
            row.push(cell);
            rows.push(row);
        }
        return rows;
    }

    console.log('[DEBUG] Starting CSV fetch from:', sheetCsvUrl);
    fetch(sheetCsvUrl)
        .then(response => {
            console.log('[DEBUG] CSV fetch response status:', response.status);
            return response.text();
        })
        .then(csvText => {
            console.log('[DEBUG] CSV text received, length:', csvText.length);
            csvText = csvText.trim();
            const rows = parseCsv(csvText);
            console.log('[DEBUG] CSV rows parsed:', rows.length, 'first row cols:', rows[0] ? rows[0].length : 0);

            const names = rows[0];
            const primaryProbs = rows[1];
            const rbs = rows[2];
            const yutimeRbs = rows[3];
            const probs = rows[4];
            const yutimes = rows[5];
            const avgChains = rows.length > 10 ? rows[10] : null;
            const yutimeSpinCounts = rows.length > 15 ? rows[15] : null;

            machineData = [];
            for (let i = 1; i < names.length; i++) {
                const name = names[i] ? names[i].trim() : '';
                if (!name) continue;
                const primaryProb = parseFloat(primaryProbs[i]);
                const rb = parseFloat(rbs[i]);
                const prob = parseFloat(probs[i]);
                const yutimeSpinLimit = parseFloat(yutimes[i]) || 0;
                const yutimeRbMulti = parseFloat(yutimeRbs[i]) || 0;
                const avgChain = (avgChains && avgChains[i]) ? parseFloat(avgChains[i]) || 0 : 0;
                const yutimeSpinCount = (yutimeSpinCounts && yutimeSpinCounts[i]) ? parseFloat(yutimeSpinCounts[i]) || 0 : 0;
                if (rb > 0 && prob > 0) {
                    const border = 250 / (rb / prob);
                    machineData.push({
                        name,
                        border,
                        prob,
                        primaryProb,
                        rb,
                        yutimeSpins: yutimeSpinLimit,
                        yutimeRb: yutimeRbMulti,
                        avgChain,
                        yutimeSpinCount
                    });
                }
            }
            populateMachineSelect();
        })
        .catch(error => {
            console.error('Error loading machines CSV:', error);
            machineData = [
                { name: "【サンプル】P大海物語5", border: 16.5, prob: 31.9, primaryProb: 319.6, rb: 140, yutimeSpins: 950, yutimeRb: 10.23, avgChain: 3.011, yutimeSpinCount: 350 },
                { name: "【サンプル】Pエヴァ15", border: 16.7, prob: 31.9, primaryProb: 319.6, rb: 140, yutimeSpins: 0, yutimeRb: 0, avgChain: 0, yutimeSpinCount: 0 },
                { name: "【サンプル】eRe:ゼロ2", border: 16.3, prob: 34.9, primaryProb: 349.9, rb: 140, yutimeSpins: 0, yutimeRb: 0, avgChain: 0, yutimeSpinCount: 0 }
            ];
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "-- 通信エラー: サンプル機種データを読み込みました --";
            option.disabled = true;
            machineSelect.appendChild(option);
            populateMachineSelect();
        });

    function populateMachineSelect() {
        const previousSelection = machineSelect.value;
        // 機種情報をリセット（「直接入力」の古いプレースホルダーを完全に廃止し即時計算を活性化）
        machineSelect.innerHTML = '';

        const playRate = parseFloat(document.querySelector('input[name="play-rate"]:checked').value);
        let exchangeRateBalls = exchangeRateSelect.value === 'custom'
            ? parseFloat(customExchangeInput.value)
            : parseFloat(exchangeRateSelect.value);

        // 貸玉単価と換金単価
        const investmentPrice = playRate;
        const cashoutPrice = (1000 / exchangeRateBalls) * (playRate / 4);

        machineData.forEach((machine, index) => {
            // 現金ボーダー（持ち玉比率0%のときの実質ボーダー）
            const gapFactor = investmentPrice / cashoutPrice;
            const cashBorder = machine.border * gapFactor;
            const yutimeText = machine.yutimeSpins > 0 ? ` 遊${machine.yutimeSpins}` : '';

            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${machine.name} (${machine.border.toFixed(1)} / ${cashBorder.toFixed(1)})${yutimeText}`;
            machineSelect.appendChild(option);
        });

        // 過去の選択状態を復元、なければ先頭の機種を自動選択し、未選択による計算エラー（反映されない問題）を防止する
        if (previousSelection !== "" && previousSelection !== null && machineData[previousSelection]) {
            machineSelect.value = previousSelection;
        } else if (machineData.length > 0) {
            machineSelect.value = 0;
        }

        calculateEV();
    }

    // 再計算時や設定変更時にリストの表示（現金ボーダー）も更新する
    exchangeRateSelect.addEventListener('change', populateMachineSelect);
    playRateRadios.forEach(radio => radio.addEventListener('change', populateMachineSelect));

    machineSelect.addEventListener('change', calculateEV);

    // Utilities
    function formatCurrency(amount) {
        const absAmount = Math.abs(amount);
        const formatted = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(absAmount);
        return amount < 0 ? `-${formatted}` : `+${formatted}`;
    }

    function formatSpinValue(value) {
        const absValue = Math.abs(value);
        const formatted = absValue.toFixed(2);
        return value < 0 ? `-¥${formatted}` : `+¥${formatted}`;
    }

    // Main Calculation
    function calculateEV() {
        // --- 1. 入力値の取得 ---
        const playRate = parseFloat(document.querySelector('input[name="play-rate"]:checked').value);
        const ballsPer1k = 1000 / playRate; // 4円=250玉, 2円=500玉, 1円=1000玉

        let exchangeRateBalls = exchangeRateSelect.value === 'custom'
            ? parseFloat(customExchangeInput.value)
            : parseFloat(exchangeRateSelect.value);

        // "1000円あたりの交換玉数" を "1玉あたりの換金単価"に直す (例: 250玉 -> 4.0 , 280玉 -> 約3.57)
        // 4円設定の時: 1000 / 250 = 4.0円/玉
        // 1円設定の時は入力欄の「玉数」基準が変わるため、比率で計算
        // （一般的な非等価表記に合わせるため、入力された「1000円あたりの玉数(4円相当)」から基準単価を出す）

        // ユーザーが選ぶ交換率（250枠/280枠など）は基本的に「4円パチンコ換算での玉数」として扱う方が直感的
        // なので、1玉の価値 = (1000(円) / 交換率玉数) × (貸玉レート / 4) とする
        // 例: 1円パチンコ、等価(250選択) -> (1000/250) * (1/4) = 4 * 0.25 = 1.0円/玉
        let valuePerBallCashout = (1000 / exchangeRateBalls) * (playRate / 4);

        // --- 2. 機種・ベースデータの取得 ---
        let borderBase = 0;
        let prob = 0;
        let primaryProb = 0;
        let defaultRb = 0;
        let machineYutimeLimit = 0;
        let machineYutimeRb = 0;

        const selectedIdx = machineSelect.value;
        if (selectedIdx !== "" && machineData[selectedIdx]) {
            const machine = machineData[selectedIdx];
            borderBase = machine.border;
            prob = machine.prob;
            primaryProb = machine.primaryProb;
            defaultRb = machine.rb;
            machineYutimeLimit = machine.yutimeSpins || 0;
            machineYutimeRb = machine.yutimeRb || 0;
        }

        // 追加データ (平均連荘, 遊タイム回数)
        const machineAvgChain = machineData[selectedIdx] ? (machineData[selectedIdx].avgChain || 0) : 0;
        const machineYutimeSpinCount = machineData[selectedIdx] ? (machineData[selectedIdx].yutimeSpinCount || 0) : 0;

        // 実戦データからの回転率計算
        const startSpin = parseFloat(startSpinInput.value) || 0;
        const currentSpin = parseFloat(currentSpinInput.value) || 0;
        const investCashK = parseFloat(investCashInput.value) || 0;
        const startBalls = parseFloat(startBallsInput.value) || 0;
        const currentBalls = parseFloat(currentBallsInput.value) || 0;

        const totalSpinsMeasured = currentSpin - startSpin;

        // 投資額と持ち玉比率の計算
        const cashInvestedYen = investCashK * 1000;
        const usedBalls = startBalls - currentBalls;
        const totalInvestedYen = cashInvestedYen + (usedBalls * playRate);

        let ballRatio = 1.0;
        if (totalInvestedYen > 0) {
            const positiveBallsYen = Math.max(0, usedBalls * playRate);
            if (cashInvestedYen + positiveBallsYen > 0) {
                ballRatio = positiveBallsYen / (cashInvestedYen + positiveBallsYen);
            } else {
                ballRatio = 1.0;
            }
        }

        let turnRatePer1k = 0;
        if (totalInvestedYen > 0) {
            // 1000円あたりの回転数 = (総回転数 / 総投資額) * 1000
            turnRatePer1k = (totalSpinsMeasured / totalInvestedYen) * 1000;
        }

        measuredTurnRateDisplay.textContent = totalInvestedYen > 0 ? `${turnRatePer1k.toFixed(2)} 回転` : '-- 回転';

        measuredTurnRateDisplay.textContent = totalInvestedYen > 0 ? `${turnRatePer1k.toFixed(2)} 回転` : '-- 回転';

        // 実測1R出玉の計算
        const bonusRounds = parseFloat(bonusRoundsInput.value) || 0;
        const afterBonusBalls = parseFloat(afterBonusBallsInput.value) || 0;

        let measuredRb = 0;
        if (bonusRounds > 0 && afterBonusBalls > 0) {
            // 当たり後の玉数 - 現在の玉数 = 獲得出玉
            const acquiredBalls = afterBonusBalls - currentBalls;
            measuredRb = acquiredBalls / bonusRounds;
        }

        if (measuredRb > 0) {
            measuredRbDisplay.textContent = `${measuredRb.toFixed(2)} 玉`;
        } else {
            measuredRbDisplay.textContent = '-- 玉';
        }

        // もし実測1R出玉があれば、等価ボーダーラインをそれで再計算する
        let activeBorderBase = borderBase;
        if (measuredRb > 0 && prob > 0) {
            // 実測1R出玉(measuredRb) × トータル確率(prob) = 新しい仮定RB相当
            activeBorderBase = 250 / (measuredRb / prob);
        }

        if (activeBorderBase <= 0 || isNaN(activeBorderBase) || turnRatePer1k <= 0 || totalSpinsMeasured <= 0) {
            evDailyDisplay.textContent = '¥0';
            totalSpinsDisplay.textContent = '0 回転';
            realBorderDisplay.textContent = '-- 回転 / 1k';
            valuePerSpinDisplay.textContent = '¥0.00';
            ballEvPerSpinDisplay.textContent = '¥0.00';
            cashEvPerSpinDisplay.textContent = '¥0.00';
            evDailyDisplay.className = 'amount';
            noteDisplay.textContent = activeBorderBase <= 0 ? '機種を選択してください。' : '実戦データを入力すると自動計算されます。';
            return;
        }
        const totalSpinsDaily = totalSpinsMeasured;
        totalSpinsDisplay.textContent = `${totalSpinsDaily.toLocaleString()} 回転`;

        // --- 3. 期待値計算 (通常時 + 遊タイム期待度) ---

        // 実質ボーダーラインの算出
        const gapFactor = ((1 - ballRatio) * playRate + ballRatio * valuePerBallCashout) / valuePerBallCashout;
        const realBorder = activeBorderBase * (ballsPer1k / 250) * gapFactor;

        // 1回転あたりの期待「差引玉数」 (Profit in balls per spin)
        // ボーダー比での収支期待値
        const expectedBallsPerSpin = (250 / activeBorderBase) - (250 / turnRatePer1k);

        // 通常時の単価 (1回転あたり)
        // 持玉単価 (1回転あたり)
        const normalBallUnitPrice = expectedBallsPerSpin * playRate;
        // 現金単価 (1回転あたり)
        // 現金投資分に対して、換金ギャップ(貸玉価格 - 換金価格)による損失を差し引く
        const actualBallsPerSpin = (250 / turnRatePer1k);
        const normalCashUnitPrice = normalBallUnitPrice - (actualBallsPerSpin * (playRate - valuePerBallCashout));

        // 通常時の持玉比率単価 (J20相当)
        const normalValuePerSpin = (normalBallUnitPrice * ballRatio) + (normalCashUnitPrice * (1 - ballRatio));
        const dailyEV = normalValuePerSpin * totalSpinsMeasured;

        // 2. 遊タイム期待値の計算 (スプレッドシート F5, G4, K18, K19, J20 準拠)
        let yutimeEV = 0;
        let yutimeValuePerSpin = 0;
        let yutimeBallUnitPriceResult = 0;
        let yutimeCashUnitPriceResult = 0;
        const hasYutime = machineYutimeLimit > 0 && primaryProb > 0;

        if (hasYutime) {
            const yutimeSpinsRemaining = Math.max(0, machineYutimeLimit - currentSpin);

            // === G18: 換算係数 = 4 / 交換率(円) ===
            const exchangeRateYen = valuePerBallCashout * (4 / playRate);
            const conversionFactor = 4 / exchangeRateYen;

            // === G23: 遊タイム期待度 (天井到達率) ===
            // CSV 16行目の「遊タイム回数」を指数に使用（大海5SP = 350）
            const yutimeSpinCountForCalc = machineYutimeSpinCount > 0 ? machineYutimeSpinCount : yutimeSpinsRemaining;
            const yutimeExpectancy = 1 - Math.pow(1 - 1 / primaryProb, yutimeSpinCountForCalc);

            // === F5: 実質確率 ===
            // F5 = 大当たり確率 × (1 - ((大当たり確率-1)/大当たり確率)^MAX(0, 残り回転数))
            const missProb = (primaryProb - 1) / primaryProb;
            const effectiveProb = primaryProb * (1 - Math.pow(missProb, Math.max(0, yutimeSpinsRemaining)));

            // === G4: 遊タイムのトータル確率 ===
            // CSV 11行目の「平均連荘」を使用（大海5SP = 3.011）
            // G4 = effectiveProb / (平均連荘 × 10)
            const yutimeTotalProb = machineAvgChain > 0 && effectiveProb > 0
                ? effectiveProb / (machineAvgChain * 10)
                : prob;

            // === K18: 遊タイム持玉単価 ===
            // K18 = IF(J18>=0, J18/G18*G23, J18*G18/G23)
            yutimeBallUnitPriceResult = normalBallUnitPrice >= 0
                ? (normalBallUnitPrice / conversionFactor * yutimeExpectancy)
                : (normalBallUnitPrice * conversionFactor / yutimeExpectancy);

            // === K19: 遊タイム現金単価 ===
            // K19 = IF(J19>=0, J19/G18*G23, J19*G18/G23)
            yutimeCashUnitPriceResult = normalCashUnitPrice >= 0
                ? (normalCashUnitPrice / conversionFactor * yutimeExpectancy)
                : (normalCashUnitPrice * conversionFactor / yutimeExpectancy);

            // === J20: 持玉比率単価 ===
            // J20 = K18×持玉比率 + K19×(1-持玉比率)
            yutimeValuePerSpin = (yutimeBallUnitPriceResult * ballRatio) + (yutimeCashUnitPriceResult * (1 - ballRatio));

            // 遊タイム期待値 = 遊タイム持玉比率単価 × 総回転数
            yutimeEV = yutimeValuePerSpin * totalSpinsMeasured;
        }

        // --- 4. 結果表示 ---
        // メインの期待値表示：通常と遊タイムの高い方を採用 (遊込表示)
        let mainEV = hasYutime ? Math.max(dailyEV, yutimeEV) : dailyEV;
        // 履歴保存用の単価：通常と遊タイムの高い方を採用
        let finalValuePerSpin = hasYutime && yutimeValuePerSpin > normalValuePerSpin
            ? yutimeValuePerSpin
            : normalValuePerSpin;

        if (!isFinite(mainEV)) mainEV = 0;
        if (!isFinite(finalValuePerSpin)) finalValuePerSpin = 0;

        evDailyDisplay.textContent = formatCurrency(Math.round(mainEV));
        realBorderDisplay.textContent = `${realBorder.toFixed(1)} 回転 / 1k`;
        valuePerSpinDisplay.textContent = formatSpinValue(finalValuePerSpin);
        ballEvPerSpinDisplay.textContent = formatSpinValue(normalBallUnitPrice);
        cashEvPerSpinDisplay.textContent = formatSpinValue(normalCashUnitPrice);

        // 遊タイム情報の表示
        if (hasYutime) {
            yutimeEvRow.style.display = 'flex';
            yutimeEvOnlyDisplay.textContent = formatCurrency(Math.round(yutimeEV));
            yutimeValueRow.style.display = 'flex';
            yutimeValuePerSpinDisplay.textContent = formatSpinValue(yutimeValuePerSpin);
        } else {
            yutimeEvRow.style.display = 'none';
            yutimeValueRow.style.display = 'none';
        }

        // 保存用のデータを一時保持
        const selectedMachine = machineData[selectedIdx];
        latestCalculation = {
            id: Date.now(),
            machineName: selectedMachine ? selectedMachine.name + (hasYutime ? ' (遊込)' : '') : '手入力台',
            playRate: playRate,
            turnRate: turnRatePer1k,
            totalSpinsMeasured: totalSpinsMeasured,
            dailyEV: mainEV,
            valuePerSpin: finalValuePerSpin,
            ballEv: normalBallUnitPrice,
            cashEv: normalCashUnitPrice,
            hasYutime: hasYutime,
            yutimeEV: yutimeEV
        };

        // 色とメッセージの更新
        if (mainEV > 0) {
            evDailyDisplay.className = 'amount positive';
            const diff = turnRatePer1k - realBorder;
            let note = `実質ボーダーラインを ${diff.toFixed(1)} 回転 上回っています。`;
            if (hasYutime) note += ` (遊タイム込期待値適用)`;
            noteDisplay.textContent = note;
        } else if (mainEV < 0) {
            evDailyDisplay.className = 'amount negative';
            const diff = realBorder - turnRatePer1k;
            let note = `実質ボーダーラインに <strong>${diff.toFixed(1)} 回転 不足</strong>しています。`;
            if (hasYutime) note += ` (遊タイム込)`;
            noteDisplay.innerHTML = note;
        } else {
            evDailyDisplay.className = 'amount';
            noteDisplay.textContent = '期待値プラマイゼロのラインです。';
        }
        console.log('Calculation complete. latestCalculation updated:', latestCalculation.id);
    }

    function renderHistory() {
        if (!historyList) return;
        try {
            historyList.innerHTML = '';
            let totalEv = 0;
            let totalBallEv = 0;

            historyData.forEach((item, index) => {
                totalEv += (item.dailyEV || 0);
                totalBallEv += (item.valuePerSpin || item.ballEv || 0);

                const div = document.createElement('div');
                div.className = 'history-item';
                div.innerHTML = `
                    <div class="history-item-header">
                        <h4>${item.machineName || "不明な機種"} <span style="font-size:0.75rem; color:#94A3B8;">(${item.playRate || "?"}円)</span></h4>
                        <input type="checkbox" class="history-checkbox" data-id="${item.id}">
                    </div>
                    <div class="history-item-body">
                        <p><span>回転率:</span> <span>${(item.turnRate || 0).toFixed(2)} / 1k (${item.totalSpinsMeasured || 0}回転)</span></p>
                        <p><span>持比単価:</span> <span>${formatSpinValue(item.valuePerSpin || item.ballEv || 0)}</span></p>
                        <p class="history-ev"><span>期待値${item.hasYutime ? '(遊込)' : ''}:</span> <span class="${(item.dailyEV || 0) >= 0 ? 'amount positive' : 'amount negative'}" style="font-size:1rem; text-shadow:none;">${formatCurrency(Math.round(item.dailyEV || 0))}</span></p>
                    </div>
                `;
                historyList.appendChild(div);
            });

            if (historyTotalEv) historyTotalEv.textContent = formatCurrency(Math.round(totalEv));
            if (historyAvgBallEv) {
                const avg = historyData.length > 0 ? (totalBallEv / historyData.length) : 0;
                historyAvgBallEv.textContent = `¥${avg.toFixed(2)}`;
            }
        } catch (e) {
            console.error('History Rendering Error:', e);
        }
    }

    if (saveHistoryBtn) {
        saveHistoryBtn.addEventListener('click', () => {
            if (latestCalculation) {
                try {
                    historyData.push(latestCalculation);
                    localStorage.setItem('pachinkoHistory', JSON.stringify(historyData));
                    renderHistory();
                    alert('保存しました！');
                } catch (e) {
                    console.error('Save to History Error:', e);
                    alert('保存に失敗しました。ブラウザの保存容量がいっぱいかもしれません。');
                }
            } else {
                alert('実戦データを入力して期待値を計算してから保存してください。');
            }
        });
    }

    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('.history-checkbox:checked');
            const idsToDelete = Array.from(checkboxes).map(cb => parseInt(cb.getAttribute('data-id')));

            if (idsToDelete.length > 0) {
                if (confirm('選択した履歴を削除しますか？')) {
                    historyData = historyData.filter(item => !idsToDelete.includes(item.id));
                    localStorage.setItem('pachinkoHistory', JSON.stringify(historyData));
                    renderHistory();
                }
            } else {
                alert('削除する項目を選択してください。');
            }
        });
    }

    if (deleteAllBtn) {
        deleteAllBtn.addEventListener('click', () => {
            if (historyData.length === 0) {
                alert('削除する履歴がありません。');
                return;
            }
            if (confirm('すべての履歴を削除してもよろしいですか？')) {
                historyData = [];
                localStorage.setItem('pachinkoHistory', JSON.stringify(historyData));
                renderHistory();
                alert('すべての履歴を削除しました。');
            }
        });
    }

    renderHistory();
    // 初期計算
    try {
        calculateEV();
    } catch (e) {
        console.warn('Final calculateEV skipped or failed:', e);
    }
});
