// [v50] 2026-02-27 - 統計データの選択項目反映・機種内訳フォーマット変更（○台）
window.onerror = function (msg, url, lineNo, columnNo, error) {
    console.log('[GLOBAL ERROR]', msg, 'at line:', lineNo, 'col:', columnNo);
    return false;
};
console.log('[DEBUG] app.js start executing');

document.addEventListener('DOMContentLoaded', () => {
    // UI要素
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
    const hoursInput = document.getElementById('hours');
    const spinsPerHourInput = document.getElementById('spins-per-hour');

    // 結果表示要素
    const evDailyDisplay = document.getElementById('expected-value-daily');
    const totalSpinsDisplay = document.getElementById('total-spins');
    const valuePerSpinDisplay = document.getElementById('value-per-spin');
    const ballEvPerSpinDisplay = document.getElementById('ball-ev-per-spin');
    const cashEvPerSpinDisplay = document.getElementById('cash-ev-per-spin');
    const noteDisplay = document.getElementById('ev-note');
    const yutimeEvRow = document.getElementById('yutime-ev-row');
    const yutimeEvOnlyDisplay = document.getElementById('yutime-ev-only');
    const yutimeValueRow = document.getElementById('yutime-value-row');
    const yutimeValuePerSpinDisplay = document.getElementById('yutime-value-per-spin');

    // 履歴関連要素
    const saveHistoryBtn = document.getElementById('save-history-btn');
    const deleteSelectedBtn = document.getElementById('delete-selected-btn');
    const shareLineBtn = document.getElementById('share-line-btn');
    const historyList = document.getElementById('history-list');
    const historyTotalEv = document.getElementById('history-total-ev');
    const historyAvgBallEv = document.getElementById('history-avg-ball-ev');
    let historyData = JSON.parse(localStorage.getItem('pachinkoHistory')) || [];
    let latestCalculation = null;
    let isCompactHistory = false; // true = 詳細(v38以降の区切り), false = 簡略(v37相当・デフォルト)
    let showDate = true; // 日時表示フラグ (v43からデフォルトON)
    let currentSummaryRate = null; // 統計表示で現在選択されている貸玉レート

    // UI切り替えロジック
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

    // プリセット機種ロジック
    let machineData = [];

    // 初回の計算呼び出し（DOM未完全やデータ未ロード時のエラーで後続処理が止まるのを防ぐ）
    try {
        calculateEV();
    } catch (e) {
        console.warn('Initial calculateEV skipped or failed:', e);
    }

    // GoogleスプレッドシートのCSV URL
    const sheetCsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTg_z1H5K62_019noNiZnxtSTOafCW4c5y4BghW62nHmOTneMx4JzVycIXAXHTdF9vxYSOjcnu7u3BK/pub?gid=493752965&single=true&output=csv';



    // 機種プリセットのロード（キャッシュ優先 → バックグラウンドで最新取得）
    const STORAGE_KEY_MACHINES = 'pachinkoMachineData';
    const savedMachines = localStorage.getItem(STORAGE_KEY_MACHINES);
    if (savedMachines) {
        try {
            machineData = JSON.parse(savedMachines);
            console.log('[DEBUG] Loaded machines from cache:', machineData.length);
            populateMachineSelect();
        } catch (e) {
            console.warn('Failed to parse cached machine data:', e);
        }
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

            const newMachineData = [];
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
                    newMachineData.push({
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

            // データが正常に取得できている場合のみ更新・キャッシュ
            if (newMachineData.length > 0) {
                machineData = newMachineData;
                localStorage.setItem(STORAGE_KEY_MACHINES, JSON.stringify(machineData));
                console.log('[DEBUG] Machine data updated and cached.');
                populateMachineSelect();
            }
        })
        .catch(error => {
            console.error('Error loading machines CSV:', error);
            if (machineData.length === 0) {
                machineData = [
                    { name: "【サンプル】P大海物語5", border: 16.5, prob: 31.9, primaryProb: 319.6, rb: 140, yutimeSpins: 950, yutimeRb: 10.23, avgChain: 3.011, yutimeSpinCount: 350 },
                    { name: "【サンプル】Pエヴァ15", border: 16.7, prob: 31.9, primaryProb: 319.6, rb: 140, yutimeSpins: 0, yutimeRb: 0, avgChain: 0, yutimeSpinCount: 0 },
                    { name: "【サンプル】eRe:ゼロ2", border: 16.3, prob: 34.9, primaryProb: 349.9, rb: 140, yutimeSpins: 0, yutimeRb: 0, avgChain: 0, yutimeSpinCount: 0 }
                ];
                populateMachineSelect();
            }
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

        const fragment = document.createDocumentFragment();
        machineData.forEach((machine, index) => {
            // 現金ボーダー（持ち玉比率0%のときの実質ボーダー）
            const gapFactor = investmentPrice / cashoutPrice;
            const cashBorder = machine.border * gapFactor;
            const yutimeText = machine.yutimeSpins > 0 ? ` 遊${machine.yutimeSpins}` : '';

            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${machine.name} (${machine.border.toFixed(1)} / ${cashBorder.toFixed(1)})${yutimeText}`;
            fragment.appendChild(option);
        });
        machineSelect.appendChild(fragment);

        // 過去の選択状態を復元、なければ先頭の機種を自動選択し、未選択による計算エラー（反映されない問題）を防止する
        const savedMachineValue = machineSelect.getAttribute('data-saved-value');
        if (savedMachineValue !== null && machineData[savedMachineValue]) {
            machineSelect.value = savedMachineValue;
            // 1度復元したら消去しておく（以降はユーザーの操作が優先）
            machineSelect.removeAttribute('data-saved-value');
        } else if (previousSelection !== "" && previousSelection !== null && machineData[previousSelection]) {
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



    // メイン計算処理
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

        if (measuredTurnRate4pDisplay) {
            const container4p = document.getElementById('measured-turn-rate-4p-container');
            if (playRate === 4) {
                if (container4p) container4p.style.display = 'none';
            } else {
                if (container4p) container4p.style.display = 'flex';
                if (totalInvestedYen > 0) {
                    const turnRate4p = turnRatePer1k / (4 / playRate);
                    measuredTurnRate4pDisplay.textContent = `${turnRate4p.toFixed(2)} 回転`;
                } else {
                    measuredTurnRate4pDisplay.textContent = '-- 回転';
                }
            }
        }

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

        // --- 現金ボーダー（実質ボーダー）の計算 ---
        // 換金差（ギャップ）を考慮したボーダーライン
        const realBorder = activeBorderBase * (playRate / valuePerBallCashout);

        if (activeBorderBase <= 0 || isNaN(activeBorderBase) || turnRatePer1k <= 0 || totalSpinsMeasured <= 0) {
            evDailyDisplay.textContent = '¥0';
            totalSpinsDisplay.textContent = '0 回転';
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

        // 実測優先の1R出玉 (rb) を定義
        const rb = measuredRb > 0 ? measuredRb : defaultRb;

        // === G18: 換算係数 = 4 / 交換率(円) ===
        // 遊タイム計算でも使用する換算係数をここで共通化
        const exchangeRateYen = valuePerBallCashout * (4 / playRate);
        const conversionFactor = 4 / exchangeRateYen;

        // === J14: 回転単価(等価) ===
        // スプレッドシートJ14相当：消費玉数を固定値250からレートごとの貸玉数(ballsPer1k)へ可変化
        const j14Result = (((rb / prob) - (ballsPer1k / turnRatePer1k)) * 4) / (ballsPer1k / 250);

        // === K14: 通常時の持玉単価 (交換率考慮) ===
        // K14 = IF(J14>=0, J14/G18, J14*G18)
        const normalBallUnitPrice = j14Result >= 0
            ? (j14Result / conversionFactor)
            : (j14Result * conversionFactor);

        // === J15: 通常時の現金単価 ===
        // J15 = ((rb / トータル確率 * valuePerBallCashout) - (1000 / 回転率)) * (250 / ballsPer1k)
        const normalCashUnitPrice = ((rb * valuePerBallCashout / prob) - (1000 / turnRatePer1k)) * (250 / ballsPer1k);

        // === J16: 通常時の持玉比率単価 ===
        // J16 = (MIN(J14, K14) * ballRatio) + J15 * (1 - ballRatio)
        const normalValuePerSpin = (Math.min(j14Result, normalBallUnitPrice) * ballRatio) + (normalCashUnitPrice * (1 - ballRatio));

        const dailyEV = normalValuePerSpin * totalSpinsMeasured;

        // 2. 遊タイム期待値の計算 (スプレッドシート F5, G4, K18, K19, J20 準拠)
        let yutimeEV = 0;
        let yutimeValuePerSpin = 0;
        let yutimeBallUnitPriceResult = 0;
        let yutimeCashUnitPriceResult = 0;
        const hasYutime = machineYutimeLimit > 0 && primaryProb > 0;

        if (hasYutime) {
            const yutimeSpinsRemaining = Math.max(0, machineYutimeLimit - startSpin);

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

            // 交換率係数 (等価比: 例 275/250 = 1.1)
            const exchangeFactorVal = exchangeRateBalls / 250;

            // === I18相当: 通常持玉単価 (期待度G23の1乗を反映) ===
            // ユーザー指定式: ((((1R出玉 / 遊トータル確率) - (ballsPer1k / 実測回転率)) * 4) / (ballsPer1k / 250)) * G23
            const rawI18 = (((((rb / yutimeTotalProb) - (ballsPer1k / turnRatePer1k)) * 4) / (ballsPer1k / 250)) * yutimeExpectancy);
            const i18Result = rawI18 >= 0
                ? (rawI18 / conversionFactor)
                : (rawI18 * conversionFactor);

            // === I19相当: 現金単価 (期待度G23の2乗による条件分岐反映) ===
            // ユーザー指定式: ((1R出玉 / 遊トータル確率 * 換金単価) - (1000 / 実測回転率 ))*(250 / 1000円あたりの玉数)
            // この値が0以下なら G23^2 で割る、それ以外なら G23^2 を掛ける
            const rawI19Base = (((rb / yutimeTotalProb * valuePerBallCashout) - (1000 / turnRatePer1k)) * (250 / ballsPer1k));
            const yutimeExpectancySq = Math.pow(yutimeExpectancy, 2);
            const rawI19 = rawI19Base <= 0
                ? (yutimeExpectancySq > 0 ? rawI19Base / yutimeExpectancySq : rawI19Base)
                : rawI19Base * yutimeExpectancySq;
            const i19Result = rawI19 >= 0
                ? (rawI19 / conversionFactor)
                : (rawI19 * conversionFactor);

            // === K18/K19: 遊タイム持玉/現金単価 (rawI18/I19をそのまま継承) ===
            yutimeBallUnitPriceResult = i18Result;
            yutimeCashUnitPriceResult = i19Result;

            // === J20相当: 遊タイム持玉比率単価 ===
            // ユーザー指定式: (K18 * 持玉比率) + (K19 * (1 - 持玉比率))
            yutimeValuePerSpin = (yutimeBallUnitPriceResult * ballRatio) + (yutimeCashUnitPriceResult * (1 - ballRatio));

            // 遊タイム期待値 = 遊タイム持玉比率単価 * 総実測回転数
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

        // UIラベルと表示値の更新
        const isYutimeApplied = hasYutime && yutimeValuePerSpin > normalValuePerSpin;

        // 1. ラベルの更新
        const valuePerSpinLabel = valuePerSpinDisplay.previousElementSibling;
        if (valuePerSpinLabel && valuePerSpinLabel.tagName.toLowerCase() === 'h3') {
            valuePerSpinLabel.textContent = isYutimeApplied ? '持玉比率単価（遊）' : '持玉比率単価';
        }

        const ballEvLabel = ballEvPerSpinDisplay.previousElementSibling;
        if (ballEvLabel && ballEvLabel.tagName.toLowerCase() === 'h3') {
            ballEvLabel.textContent = isYutimeApplied ? '持玉単価（遊）' : '持玉単価';
        }

        const cashEvLabel = cashEvPerSpinDisplay.previousElementSibling;
        if (cashEvLabel && cashEvLabel.tagName.toLowerCase() === 'h3') {
            cashEvLabel.textContent = isYutimeApplied ? '現金単価（遊）' : '現金単価';
        }

        // 2. 表示値の反映
        evDailyDisplay.textContent = formatCurrency(Math.round(mainEV));
        valuePerSpinDisplay.textContent = formatSpinValue(finalValuePerSpin);
        ballEvPerSpinDisplay.textContent = formatSpinValue(isYutimeApplied ? yutimeBallUnitPriceResult : normalBallUnitPrice);
        cashEvPerSpinDisplay.textContent = formatSpinValue(isYutimeApplied ? yutimeCashUnitPriceResult : normalCashUnitPrice);

        // 遊タイム情報の表示
        if (isYutimeApplied) {
            yutimeEvRow.style.display = 'flex';
            yutimeEvOnlyDisplay.textContent = formatCurrency(Math.round(yutimeEV));
        } else {
            yutimeEvRow.style.display = 'none';
        }
        // 遊タイム持比単価行はメイン項目に統合されたため常に非表示
        if (yutimeValueRow) yutimeValueRow.style.display = 'none';

        // 保存用のデータを一時保持
        const selectedMachine = machineData[selectedIdx];
        latestCalculation = {
            id: Date.now(),
            machineName: selectedMachine ? selectedMachine.name : '手入力台',
            playRate: playRate,
            turnRate: turnRatePer1k,
            totalSpinsMeasured: totalSpinsMeasured,
            dailyEV: mainEV,
            valuePerSpin: finalValuePerSpin,
            ballEv: normalBallUnitPrice,
            cashEv: normalCashUnitPrice,
            hasYutime: hasYutime,
            yutimeEV: yutimeEV,
            totalInvestedK: totalInvestedYen / 1000,
            cashInvestedK: investCashK,
            measuredRb: measuredRb > 0 ? measuredRb : 0,
            bonusRounds: bonusRounds,
            acquiredBalls: bonusRounds > 0 && afterBonusBalls > 0 ? (afterBonusBalls - currentBalls) : 0,
            diffBalls: (afterBonusBalls > 0 ? afterBonusBalls : currentBalls) - startBalls - Math.floor(cashInvestedYen / playRate),
            ballRatio: ballRatio,
            positiveBallsYen: Math.max(0, usedBalls * playRate),
            totalInvestedYen: totalInvestedYen
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

        // --- 遊びの演出 (v41) ---
        animateEV(Math.round(mainEV));
        updateEVBadgeAndAura(Math.round(mainEV));

        console.log('Calculation complete. latestCalculation updated:', latestCalculation.id);
    }

    // カウントアップアニメーション
    function animateEV(targetValue) {
        const startValue = 0;
        const duration = 800;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOutQuad = t => t * (2 - t);
            const currentValue = Math.round(startValue + (targetValue - startValue) * easeOutQuad(progress));

            evDailyDisplay.textContent = formatCurrency(currentValue);

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }
        requestAnimationFrame(update);
    }

    // バッジとオーラ演出の更新
    function updateEVBadgeAndAura(ev) {
        const evBoxInner = document.getElementById('ev-box-inner');
        const badge = document.getElementById('ev-badge');
        if (!evBoxInner || !badge) return;

        // 全レベルクラスを一旦削除
        evBoxInner.classList.remove('ev-level-gold', 'ev-level-blue', 'ev-level-green', 'ev-level-soft-green', 'ev-level-soft-red', 'ev-level-red', 'ev-level-skull');
        badge.classList.remove('ev-badge-skull');
        badge.classList.add('hidden');

        if (ev >= 20000) {
            evBoxInner.classList.add('ev-level-gold');
            badge.textContent = '⭐大勝利の予感';
            badge.classList.remove('hidden');
        } else if (ev >= 10000) {
            evBoxInner.classList.add('ev-level-blue');
            badge.textContent = '💎絶好調';
            badge.classList.remove('hidden');
        } else if (ev >= 5000) {
            evBoxInner.classList.add('ev-level-green');
            badge.textContent = '✨期待大';
            badge.classList.remove('hidden');
        } else if (ev > 0) {
            evBoxInner.classList.add('ev-level-soft-green');
            badge.textContent = '👍プラス';
            badge.classList.remove('hidden');
        } else if (ev > -1000) {
            evBoxInner.classList.add('ev-level-soft-red');
            badge.textContent = '🤏微減';
            badge.classList.remove('hidden');
        } else if (ev > -5000) {
            evBoxInner.classList.add('ev-level-red');
            badge.textContent = '⚠️要注意';
            badge.classList.remove('hidden');
        } else {
            evBoxInner.classList.add('ev-level-skull');
            badge.classList.add('ev-badge-skull');
            badge.textContent = '💀警告';
            badge.classList.remove('hidden');
        }
    }

    function renderHistory() {
        if (!historyList) return;
        try {
            // チェック済みIDの更新ロジック
            const allBoxes = document.querySelectorAll('.history-checkbox');
            let checkedIds;
            if (allBoxes.length > 0) {
                // DOMが存在する場合（表示切替や再描画時）: 現在の画面の状態を最新の真実とする
                checkedIds = Array.from(document.querySelectorAll('.history-checkbox:checked')).map(cb => parseInt(cb.getAttribute('data-id')));
            } else {
                // DOMが存在しない場合（ページ初期ロード時）: sessionStorage から読み込む
                checkedIds = JSON.parse(sessionStorage.getItem('checkedHistoryIds') || '[]');
            }

            // 履歴データに既に存在しないIDをクリーンアップ
            const validIds = new Set(historyData.map(item => item.id));
            checkedIds = checkedIds.filter(id => validIds.has(id));

            // 最新の状態を保存
            sessionStorage.setItem('checkedHistoryIds', JSON.stringify(checkedIds));
            historyList.innerHTML = '';

            let sumInvestK = 0;
            let sumSpins = 0;
            let sumCashK = 0;
            let sumBonusRounds = 0;
            let sumAcquiredBalls = 0;
            let sumDiffBalls = 0;
            let sumWork = 0;
            let sumBallYen = 0;
            let sumTotalInvestYen = 0;

            // 履歴データから存在する貸玉レートを収集
            const availableRates = Array.from(new Set(historyData.map(item => item.playRate || 4))).sort((a, b) => b - a);

            // 初期の currentSummaryRate が設定されていない、または存在しないレートならリストの先頭(4など)をセット
            if (!currentSummaryRate || !availableRates.includes(currentSummaryRate)) {
                currentSummaryRate = availableRates.length > 0 ? availableRates[0] : 4;
            }

            // 統計パネル側のUI制御
            const summaryLabel = document.getElementById('summary-rate-label');
            const summaryControls = document.getElementById('summary-carousel-controls');
            if (summaryLabel && summaryControls) {
                if (historyData.length === 0) {
                    summaryControls.style.display = 'none';
                } else {
                    summaryControls.style.display = 'flex';
                    summaryLabel.textContent = `${currentSummaryRate}円 統計`;
                }
            }

            const isFilterActive = checkedIds.length > 0;

            historyData.forEach((item, index) => {
                // そのレートが現在の表示レート一致、かつ「フィルタ非アクティブ」または「チェック入り」の時のみ統計加算
                if ((item.playRate || 4) == currentSummaryRate && (!isFilterActive || checkedIds.includes(item.id))) {
                    sumInvestK += (item.totalInvestedK || 0);
                    sumSpins += (item.totalSpinsMeasured || 0);
                    sumCashK += (item.cashInvestedK || 0);
                    sumBonusRounds += (item.bonusRounds || 0);
                    sumAcquiredBalls += (item.acquiredBalls || 0);
                    sumDiffBalls += (item.diffBalls || 0);
                    sumWork += (item.dailyEV || 0);
                    sumBallYen += (item.positiveBallsYen || 0);
                    sumTotalInvestYen += (item.totalInvestedYen || 0);
                }
            });

            // 機種内訳の集計（古い順）: フィルタを考慮
            for (let i = historyData.length - 1; i >= 0; i--) {
                const item = historyData[i];
                if ((item.playRate || 4) == currentSummaryRate && (!isFilterActive || checkedIds.includes(item.id))) {
                    const name = item.machineName || "不明";
                    if (!machineCounts[name]) {
                        machineCounts[name] = 0;
                        machinesOldestFirst.push(name);
                    }
                    machineCounts[name]++;
                }
            }
            const machineInfoText = machinesOldestFirst.map(name => `${name} (${machineCounts[name]}台)`).join(' / ');

            historyData.forEach((item, index) => {
                const div = document.createElement('div');
                div.className = 'history-item';
                div.style.padding = '0.75rem';
                div.style.position = 'relative';
                div.style.borderBottom = '1px solid rgba(255,255,255,0.1)';

                const mName = item.machineName || "不明";
                const invK = (item.totalInvestedK || 0).toFixed(3);
                const spins = item.totalSpinsMeasured || 0;
                let turn = (item.turnRate || 0).toFixed(2);

                // 4円以外なら4P換算の回転率を併記する処理
                if (item.playRate && item.playRate != 4) {
                    const turn4p = (item.turnRate / (4 / item.playRate)).toFixed(2);
                    turn = `${turn}(${turn4p})`;
                }

                const cshK = (item.cashInvestedK || 0).toFixed(2);
                const rb = item.measuredRb ? item.measuredRb.toFixed(1) : '';
                const br = item.bonusRounds || '';
                const acq = item.acquiredBalls ? Math.round(item.acquiredBalls) : '';
                const diff = (item.diffBalls || 0).toLocaleString();
                const ballEv = (item.valuePerSpin || 0).toFixed(1);
                const work = Math.round(item.dailyEV || 0).toLocaleString();
                const bRat = ((item.ballRatio || 0) * 100).toFixed(1);
                const rateSuffix = (item.playRate && item.playRate != 4) ? `/${item.playRate}円` : "";

                const dateText = showDate ? `${formatHistoryDate(item.id)}\n` : '';

                if (isCompactHistory) {
                    const text = `${dateText}${mName}/総投資/${invK}k/通常回転数/${spins}/回転率${turn}/使用現金${cshK}k/RB${rb}/R回数${br}/獲得${acq}/差玉${diff}/単(持)${ballEv}/期待値￥${work}/持比${bRat}%${rateSuffix}`;
                    div.innerHTML = `<div style="font-size: 0.8rem; word-break: break-all; padding-right: 24px; line-height: 1.4; white-space: pre-wrap;">${text}</div><input type="checkbox" class="history-checkbox" data-id="${item.id}" style="position: absolute; right: 0.5rem; top: 0.75rem; transform: scale(1.2);">`;
                } else {
                    div.style.padding = '0';
                    div.style.borderBottom = 'none';
                    let turnDisplayText = `${(item.turnRate || 0).toFixed(2)} / 1k`;
                    if (item.playRate && item.playRate != 4) {
                        turnDisplayText += ` (4P換算: ${(item.turnRate / (4 / item.playRate)).toFixed(2)})`;
                    }
                    div.innerHTML = `
                        <div class="history-item-header">
                            <h4 style="display: flex; flex-direction: column;">
                                ${showDate ? `<span style="font-size:0.7rem; color:#94A3B8; margin-bottom: 2px;">${formatHistoryDate(item.id)}</span>` : ''}
                                <span>${item.machineName || "不明な機種"} <span style="font-size:0.75rem; color:#94A3B8;">(${item.playRate || "?"}円)</span></span>
                            </h4>
                            <input type="checkbox" class="history-checkbox" data-id="${item.id}">
                        </div>
                        <div class="history-item-body">
                            <p><span>回転率:</span> <span>${turnDisplayText} (${item.totalSpinsMeasured || 0}回転)</span></p>
                            <p><span>持比単価:</span> <span>${formatSpinValue(item.valuePerSpin || item.ballEv || 0)}</span></p>
                            <p class="history-ev"><span>期待値${item.hasYutime ? '(遊込)' : ''}:</span> <span class="${(item.dailyEV || 0) >= 0 ? 'amount positive' : 'amount negative'}" style="font-size:1rem; text-shadow:none;">${formatCurrency(Math.round(item.dailyEV || 0))}</span></p>
                        </div>
                    `;
                }

                historyList.appendChild(div);
            });

            const summaryBox = document.getElementById('history-summary-container');
            if (summaryBox) {
                // どちらの表示モードでも共通して統計情報（長文テキスト）を作成・表示する
                const avgTurn = sumInvestK > 0 ? (sumSpins / sumInvestK).toFixed(2) : "0.00";
                const avgRb = sumBonusRounds > 0 ? (sumAcquiredBalls / sumBonusRounds).toFixed(1) : "0";
                const avgBallEv = sumSpins > 0 ? (sumWork / sumSpins).toFixed(1) : "0";
                const avgBallRatio = sumTotalInvestYen > 0 ? ((sumBallYen / sumTotalInvestYen) * 100).toFixed(1) : "0.0";
                const count = historyData.filter(i => (i.playRate || 4) == currentSummaryRate && (!isFilterActive || checkedIds.includes(i.id))).length;

                if (isCompactHistory) {
                    // 詳細表示モード（昔はcompactと呼んでいた方、今はtrueで詳細）
                    const statDateText = showDate ? `${formatHistoryDate(Date.now())} ` : '';
                    summaryBox.style.display = 'block';
                    summaryBox.style.whiteSpace = 'pre-wrap';
                    summaryBox.textContent = `${statDateText}${machineInfoText}\n総投資/${sumInvestK.toFixed(3)}k/通常回転数/${sumSpins}/回転率${avgTurn}/使用現金${sumCashK.toFixed(2)}k/RB${avgRb}/総R回数${sumBonusRounds}/総獲得玉${Math.round(sumAcquiredBalls)}/総差玉${sumDiffBalls.toLocaleString()}/単(持)${avgBallEv}/期待値￥${Math.round(sumWork).toLocaleString()}/持比${avgBallRatio}%/🎯or台毎数${count}`;
                    if (historyTotalEv) historyTotalEv.parentElement.style.display = 'none';
                    if (historyAvgBallEv) historyAvgBallEv.parentElement.style.display = 'none';
                } else {
                    // 簡略表示モード時は、サマリーデータも縦並びの簡略版フォーマットで表示する
                    summaryBox.style.display = 'block';
                    summaryBox.style.whiteSpace = 'normal';
                    summaryBox.innerHTML = `
                        <div class="history-item-body" style="padding: 0;">
                            ${showDate ? `<p style="margin-bottom: 0.5rem;"><span>算出日時:</span> <span style="display: block; text-align: right; margin-top: 2px;">${formatHistoryDate(Date.now())}</span></p>` : ''}
                            <p style="margin-bottom: 0.5rem;"><span>機種内訳:</span> <span style="display: block; text-align: right; margin-top: 2px;">${machineInfoText || 'なし'}</span></p>
                            <p><span>総投資:</span> <span>${sumInvestK.toFixed(3)}k</span></p>
                            <p><span>通常回転数:</span> <span>${sumSpins}回</span></p>
                            <p><span>平均回転率:</span> <span>${avgTurn} / 1k</span></p>
                            <p><span>平均持比単価:</span> <span>${avgBallEv}</span></p>
                            <p><span>総期待値:</span> <span>￥${Math.round(sumWork).toLocaleString()}</span></p>
                            <p style="margin-top: 0.25rem; font-size: 0.75rem; color: #94A3B8;">(台数: ${count} / 持比: ${avgBallRatio}%)</p>
                        </div>
                    `;
                    if (historyTotalEv) {
                        historyTotalEv.parentElement.style.display = 'flex';
                        historyTotalEv.textContent = formatCurrency(Math.round(sumWork));
                    }
                    if (historyAvgBallEv) {
                        historyAvgBallEv.parentElement.style.display = 'flex';
                        const avg = sumSpins > 0 ? (sumWork / sumSpins) : 0;
                        historyAvgBallEv.textContent = `¥${avg.toFixed(2)}`;
                    }
                }
            }

            // チェック状態を復元
            if (checkedIds.length > 0) {
                checkedIds.forEach(id => {
                    const cb = document.querySelector(`.history-checkbox[data-id="${id}"]`);
                    if (cb) cb.checked = true;
                });
            }
            // チェックボックスの変更時にsessionStorageを更新
            document.querySelectorAll('.history-checkbox').forEach(cb => {
                cb.addEventListener('change', () => {
                    const currentChecked = Array.from(document.querySelectorAll('.history-checkbox:checked')).map(c => parseInt(c.getAttribute('data-id')));
                    sessionStorage.setItem('checkedHistoryIds', JSON.stringify(currentChecked));
                });
            });
        } catch (e) {
            console.error('History Rendering Error:', e);
        }
    }

    if (saveHistoryBtn) {
        saveHistoryBtn.addEventListener('click', () => {
            if (latestCalculation) {
                try {
                    historyData.unshift(latestCalculation);
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

    const selectAllBtn = document.getElementById('select-all-btn');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('.history-checkbox');
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            checkboxes.forEach(cb => cb.checked = !allChecked);
            // 全選択/解除後にsessionStorageを即時更新
            const currentChecked = Array.from(document.querySelectorAll('.history-checkbox:checked')).map(c => parseInt(c.getAttribute('data-id')));
            sessionStorage.setItem('checkedHistoryIds', JSON.stringify(currentChecked));
        });
    }



    if (shareLineBtn) {
        shareLineBtn.addEventListener('click', () => {
            if (typeof handleShareLineClick === 'function') {
                handleShareLineClick(historyData, isCompactHistory, showDate);
            } else {
                console.error("share.js is not loaded properly.");
            }
        });
    }

    // ==========================================
    // 表示形式の切替ロジック
    // ==========================================
    const toggleFormatBtn = document.getElementById('toggle-format-btn');
    if (toggleFormatBtn) {
        // 初期状態のボタン表示
        toggleFormatBtn.textContent = isCompactHistory ? '簡略' : '詳細';
        toggleFormatBtn.style.background = isCompactHistory ? '#64748b' : '#3b82f6';

        toggleFormatBtn.addEventListener('click', () => {
            isCompactHistory = !isCompactHistory;
            // isCompactHistory=true(詳細表示中) なら「簡略(に戻す)」ボタン、false(簡略表示中) なら「詳細(にする)」ボタン
            toggleFormatBtn.textContent = isCompactHistory ? '簡略' : '詳細';
            toggleFormatBtn.style.background = isCompactHistory ? '#64748b' : '#3b82f6';
            saveSettings(); // 切り替え状態も保存
            renderHistory();
        });
    }

    // ==========================================
    // 統計切り替えロジック
    // ==========================================
    const summaryPrevBtn = document.getElementById('summary-prev-btn');
    const summaryNextBtn = document.getElementById('summary-next-btn');

    if (summaryPrevBtn && summaryNextBtn) {
        summaryPrevBtn.addEventListener('click', () => {
            const availableRates = Array.from(new Set(historyData.map(item => item.playRate || 4))).sort((a, b) => b - a);
            if (availableRates.length <= 1) return;
            let idx = availableRates.indexOf(currentSummaryRate);
            idx = (idx - 1 + availableRates.length) % availableRates.length; // 前に戻る
            currentSummaryRate = availableRates[idx];
            renderHistory();
        });

        summaryNextBtn.addEventListener('click', () => {
            const availableRates = Array.from(new Set(historyData.map(item => item.playRate || 4))).sort((a, b) => b - a);
            if (availableRates.length <= 1) return;
            let idx = availableRates.indexOf(currentSummaryRate);
            idx = (idx + 1) % availableRates.length; // 次へ進む
            currentSummaryRate = availableRates[idx];
            renderHistory();
        });
    }

    // ========== LocalStorage を用いた基本設定値の保存と復元 ==========
    const STORAGE_KEY_SETTINGS = 'pachinkoSettings';

    function saveSettings() {
        const settings = {
            playRate: document.querySelector('input[name="play-rate"]:checked').value,
            exchangeRate: exchangeRateSelect.value,
            customExchange: customExchangeInput.value,
            machineSelect: machineSelect.value,
            isCompactHistory: isCompactHistory,
            showDate: showDate
        };
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    }

    // 各入力項目が変更されたら保存する
    playRateRadios.forEach(radio => radio.addEventListener('change', saveSettings));
    exchangeRateSelect.addEventListener('change', saveSettings);
    customExchangeInput.addEventListener('input', saveSettings);
    machineSelect.addEventListener('change', saveSettings);

    function loadSettings() {
        const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
        if (saved) {
            try {
                const settings = JSON.parse(saved);

                // 貸玉
                if (settings.playRate) {
                    const radio = document.querySelector(`input[name="play-rate"][value="${settings.playRate}"]`);
                    if (radio) radio.checked = true;
                }

                // 交換率
                if (settings.exchangeRate) {
                    exchangeRateSelect.value = settings.exchangeRate;
                    if (settings.exchangeRate === 'custom') {
                        customExchangeInput.classList.remove('hidden');
                        if (settings.customExchange) customExchangeInput.value = settings.customExchange;
                    } else {
                        customExchangeInput.classList.add('hidden');
                    }
                }

                // 機種選択 (CSV読み込み後に適用する必要があるため、別途グローバル変数等で通知するか、
                // ここではいったん値をセットするだけにとどめる。populateMachineSelect 内で復元処理を強化する)
                if (settings.machineSelect !== undefined && settings.machineSelect !== "") {
                    // 機種リストが構築された後に復元されるように、データ属性等に一時保存
                    machineSelect.setAttribute('data-saved-value', settings.machineSelect);
                }

                // 表示形式
                if (settings.isCompactHistory !== undefined) {
                    isCompactHistory = settings.isCompactHistory;
                    if (toggleFormatBtn) {
                        toggleFormatBtn.textContent = isCompactHistory ? '簡略' : '詳細';
                        toggleFormatBtn.style.background = isCompactHistory ? '#64748b' : '#3b82f6';
                    }
                }

                // 日時表示状態の復元
                if (settings.showDate !== undefined) {
                    showDate = settings.showDate;
                    if (toggleDateBtn) {
                        toggleDateBtn.classList.toggle('btn-on', showDate);
                    }
                }
            } catch (e) {
                console.error("Failed to load settings from localStorage", e);
            }
        }
    }

    // 日時表示切り替え
    const toggleDateBtn = document.getElementById('toggle-date-btn');
    if (toggleDateBtn) {
        toggleDateBtn.addEventListener('click', () => {
            showDate = !showDate;
            toggleDateBtn.classList.toggle('btn-on', showDate);
            saveSettings();
            renderHistory();
        });
    }

    // CSVロード前に一旦設定を復元する
    loadSettings();

    // 設定復元後に履歴と初期EVを描画・計算する
    renderHistory();
    try {
        calculateEV();
    } catch (e) {
        console.warn('Final calculateEV skipped or failed:', e);
    }
});
