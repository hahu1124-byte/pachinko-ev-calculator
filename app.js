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
    const evHourlyDisplay = document.getElementById('expected-value-hourly');
    const totalSpinsDisplay = document.getElementById('total-spins');
    const realBorderDisplay = document.getElementById('real-border');
    const valuePerSpinDisplay = document.getElementById('value-per-spin');
    const ballEvPerSpinDisplay = document.getElementById('ball-ev-per-spin');
    const cashEvPerSpinDisplay = document.getElementById('cash-ev-per-spin');
    const noteDisplay = document.getElementById('ev-note');
    const yutimeEvRow = document.getElementById('yutime-ev-row');
    const yutimeEvOnlyDisplay = document.getElementById('yutime-ev-only');

    // History Elements
    const saveHistoryBtn = document.getElementById('save-history-btn');
    const deleteSelectedBtn = document.getElementById('delete-selected-btn');
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

    calculateEV();

    // Preset Machine Logic
    let machineData = [];

    // Google Sheets CSV URL
    const sheetCsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTg_z1H5K62_019noNiZnxtSTOafCW4c5y4BghW62nHmOTneMx4JzVycIXAXHTdF9vxYSOjcnu7u3BK/pub?gid=493752965&single=true&output=csv';

    // Fetch machines data from Google Sheets CSV
    fetch(sheetCsvUrl)
        .then(response => response.text())
        .then(csvText => {
            const rows = csvText.split('\n').map(row => row.split(','));

            // CSV Rows:
            // 0: "", "Machine 1", "Machine 2"...
            // 1: "大当たり確率", ...
            // 2: "仮定RB", ...
            // 3: "遊抜けor右打ち継続率", ...
            // 4: "トータル確率", ...

            const names = rows[0];
            const primaryProbs = rows[1]; // 大当たり確率
            const rbs = rows[2];
            const probs = rows[4]; // トータル確率
            const yutimes = rows[6]; // 遊タイム突入回転数

            machineData = [];
            for (let i = 1; i < names.length; i++) {
                const name = names[i] ? names[i].trim() : "";
                if (!name) continue;

                const primaryProb = parseFloat(primaryProbs[i]);
                const rb = parseFloat(rbs[i]);
                const prob = parseFloat(probs[i]);
                const yutimeSpinLimit = parseFloat(yutimes[i]) || 0;

                if (rb > 0 && prob > 0) {
                    // 等価ボーダー = 250 / (仮定RB / トータル確率)
                    const border = 250 / (rb / prob);
                    machineData.push({
                        name: name,
                        border: border,
                        prob: prob,
                        primaryProb: primaryProb,
                        rb: rb,
                        yutimeSpins: yutimeSpinLimit
                    });
                }
            }
            populateMachineSelect();
        })
        .catch(error => {
            console.error('Error loading machines CSV (CORS likely blocked local access):', error);
            // ローカル実行時など、CORSエラーで取得できない場合のフォールバックデータ
            machineData = [
                { name: "【サンプル】P大海物語5", border: 16.5, prob: 31.9, primaryProb: 319.6, rb: 140, yutimeSpins: 950 },
                { name: "【サンプル】Pエヴァ15", border: 16.7, prob: 31.9, primaryProb: 319.6, rb: 140, yutimeSpins: 0 },
                { name: "【サンプル】eRe:ゼロ2", border: 16.3, prob: 34.9, primaryProb: 349.9, rb: 140, yutimeSpins: 0 }
            ];

            const option = document.createElement('option');
            option.value = "";
            option.textContent = "-- 通信エラー: サンプル機種データを読み込みました --";
            option.disabled = true;
            machineSelect.appendChild(option);

            populateMachineSelect();
        });

    function populateMachineSelect() {
        // Clear existing options except the first one
        machineSelect.innerHTML = '<option value="">-- 機種を選択するか直接入力 --</option>';

        const playRate = parseFloat(document.querySelector('input[name="play-rate"]:checked').value);
        let exchangeRateBalls = exchangeRateSelect.value === 'custom'
            ? parseFloat(customExchangeInput.value)
            : parseFloat(exchangeRateSelect.value);

        // 貸玉単価と換金単価
        const investmentPrice = playRate;
        const cashoutPrice = (1000 / exchangeRateBalls) * (playRate / 4);

        machineData.forEach((machine, index) => {
            // 現金ボーダー（持ち玉比率0%のときの実質ボーダー）
            // gapFactor = (1 * investmentPrice + 0 * cashoutPrice) / cashoutPrice = investmentPrice / cashoutPrice
            const gapFactor = investmentPrice / cashoutPrice;
            const cashBorder = machine.border * gapFactor;

            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${machine.name} (${machine.border.toFixed(1)} / ${cashBorder.toFixed(1)})`;
            machineSelect.appendChild(option);
        });
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

        const selectedIdx = machineSelect.value;
        if (selectedIdx !== "" && machineData[selectedIdx]) {
            const machine = machineData[selectedIdx];
            borderBase = machine.border;
            prob = machine.prob;
            primaryProb = machine.primaryProb;
            defaultRb = machine.rb;
            machineYutimeLimit = machine.yutimeSpins || 0;
        }

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
            evHourlyDisplay.textContent = '¥0';
            totalSpinsDisplay.textContent = '0 回転';
            realBorderDisplay.textContent = '-- 回転 / 1k';
            valuePerSpinDisplay.textContent = '¥0.00';
            ballEvPerSpinDisplay.textContent = '¥0.00';
            cashEvPerSpinDisplay.textContent = '¥0.00';
            evDailyDisplay.className = 'amount';
            evHourlyDisplay.className = 'amount';
            noteDisplay.textContent = activeBorderBase <= 0 ? '機種を選択してください。' : '実戦データを入力すると自動計算されます。';
            return;
        }

        const totalSpinsDaily = totalSpinsMeasured;
        totalSpinsDisplay.textContent = `${totalSpinsDaily.toLocaleString()} 回転`;

        // --- 3. 期待値計算のコアロジック ---
        // 1回転回すのに必要な玉数
        // ボーダー基準での1回転消費玉数
        const requiredBallsPerSpinBase = 250 / activeBorderBase;
        // 実測での1回転消費玉数（入力された1000円あたりの回転率から算出）
        const requiredBallsPerSpinActual = ballsPer1k / turnRatePer1k;

        // 1回転あたりの期待「差引玉数」（プラスなら持ち玉が増える、マイナスなら減る）
        // スプレッドシート式: 期待玉数 = ボーダー基準1回転の消費玉数 - 実測1回転の消費玉数
        const expectedBallsPerSpin = requiredBallsPerSpinBase - requiredBallsPerSpinActual;

        // 交換ギャップを含めた金額期待値の算出
        const investmentPrice = playRate; // 4円、2円、1円
        const cashoutPrice = valuePerBallCashout;

        // 持玉単価 (1回転)
        // = 期待差引玉数 × 換金価格（※手数料なしなら貸玉と同じ）
        // スプレッドシート式: 持ち玉単価 = 期待玉数 × (等価時の単価)
        const ballEvPerSpin = expectedBallsPerSpin * cashoutPrice;

        // 現金単価 (1回転)
        // = 持玉単価 - 実測1回転の消費玉数 × 換金ギャップ(貸玉価格 - 換金価格)
        // スプレッドシート式: 現金単価 = 持玉単価 - ( 250 / 回転率 ) × ( 4円 - 換金等価 )
        const cashEvPerSpin = expectedBallsPerSpin * cashoutPrice - requiredBallsPerSpinActual * (investmentPrice - cashoutPrice);

        // 総合単価 (1回転)
        // = 持玉単価 × 持ち玉比率 + 現金単価 × 現金比率
        const valuePerSpin = (ballEvPerSpin * ballRatio) + (cashEvPerSpin * (1 - ballRatio));

        // 時給入力廃止にともない、総期待値＝（総合単価×実際の総回転数）とする
        const dailyEV = valuePerSpin * totalSpinsMeasured;

        // 遊タイム期待値算出 (スプレッドシート準拠)
        let yutimeEV = 0;
        let yutimeBonusEV = 0;
        let hasYutime = false;

        // DBから取得した天井から現在の打ち始めを引いて残り回転数を算出
        const yutimeSpins = machineYutimeLimit > 0 ? Math.max(0, machineYutimeLimit - startSpin) : 0;

        // primaryProb (大当たり確率) が取得できている場合のみ遊タイム計算を行う
        if (yutimeSpins > 0 && primaryProb > 0 && prob > 0) {
            hasYutime = true;
            // 天井到達率 (K8) = 1 - (1 - 1/大当たり確率) ^ 残り回転数  ※スプレッドシートは到達しない確率を引く形が一般的
            // スプレッドシートの到達率: (1 - 1/319.688)^950 = 0.05098 (非到達)
            // 到達率は 1 - 0.05098 = 0.949019
            const missProb = Math.pow(1 - (1 / primaryProb), yutimeSpins);
            const reachProb = 1 - missProb;

            // 天井到達時の獲得期待玉数 (実測RBまたは機種データRBを使用)
            const yutimeExpectedBalls = (measuredRb > 0 ? measuredRb : defaultRb);

            // J15: 遊タイム期待値 (等価) = 到達率 × 期待玉数 × 等価交換単価 
            // 等価交換単価は、貸玉料金と同等 (投資にギャップがない状態)
            const yutimeEvEq = reachProb * yutimeExpectedBalls * investmentPrice;

            // J16: 遊タイム期待値 (現金) 
            // 現金投資で遊タイムを追う場合、到達までに消費する玉数に対するギャップ損失分を引く必要がある
            // 遊タイム到達までに必要な期待消費玉数（平均到達回転数に基づく厳密な計算が必要だが、スプレッドシート近似として）
            // スプレッドシートの J16 は等価期待値にギャップ係数や現金投資割合を掛けて算出されている可能性が高い
            // ここでは換金率を用いた現金単価の計算として YutimeEq * (換金単価 / 貸玉単価) または到達消費分のギャップ引きと解釈
            // ユーザー指定「J15=等価単価, J16=現金単価」の通り、交換率直接の価格差を反映する
            const yutimeEvCash = reachProb * yutimeExpectedBalls * cashoutPrice - (yutimeSpins * requiredBallsPerSpinActual * (investmentPrice - cashoutPrice));

            // J14: 遊タイム期待値 (持玉比率単価) = 等価 × 持ち玉比率 + 現金 × 現金比率 
            // ※スプレッドシートの期待値合算に合わせる
            yutimeBonusEV = (yutimeEvEq * ballRatio) + (yutimeEvCash * (1 - ballRatio));

            // 通常の期待値に遊タイム分の期待値を上乗せする
            yutimeEV = dailyEV + yutimeBonusEV;
        }

        // 実質ボーダーラインの算出
        const gapFactor = ((1 - ballRatio) * investmentPrice + ballRatio * cashoutPrice) / cashoutPrice;
        const realBorder = activeBorderBase * (ballsPer1k / 250) * gapFactor;

        // --- 4. 結果表示 ---
        function formatSpinValue(value) {
            const absValue = Math.abs(value);
            const formatted = absValue.toFixed(2);
            return value < 0 ? `-¥${formatted}` : `+¥${formatted}`;
        }

        const mainEV = hasYutime ? yutimeEV : dailyEV;

        evDailyDisplay.textContent = formatCurrency(Math.round(mainEV));
        // 時間あたりの期待値の代わりに総回転数からの期待値を直接表示
        // evHourlyDisplay (時給換算) の要素はUI上削除されたが、例外エラーを防ぐためチェックして更新
        if (evHourlyDisplay) {
            evHourlyDisplay.parentElement.style.display = 'none'; // 親ごと非表示にしておく
        }
        realBorderDisplay.textContent = `${realBorder.toFixed(1)} 回転 / 1k`;
        valuePerSpinDisplay.textContent = formatSpinValue(valuePerSpin);
        ballEvPerSpinDisplay.textContent = formatSpinValue(ballEvPerSpin);
        cashEvPerSpinDisplay.textContent = formatSpinValue(cashEvPerSpin);

        if (hasYutime && yutimeEvRow && yutimeEvOnlyDisplay) {
            yutimeEvRow.style.display = 'flex';
            yutimeEvOnlyDisplay.textContent = formatCurrency(Math.round(yutimeEV - dailyEV));
        } else if (yutimeEvRow) {
            yutimeEvRow.style.display = 'none';
        }

        // 保存用のデータを一時保持
        latestCalculation = {
            id: Date.now(),
            machineName: machineData[selectedIdx] ? machineData[selectedIdx].name : "手入力台",
            playRate: playRate,
            investCashK: investCashK,
            turnRate: turnRatePer1k,
            totalSpinsMeasured: totalSpinsMeasured,
            dailyEV: mainEV,
            valuePerSpin: valuePerSpin,
            hasYutime: hasYutime,
            yutimeEV: yutimeEV
        };

        // 色とメッセージの更新
        if (mainEV > 0) {
            evDailyDisplay.className = 'amount positive';
            evHourlyDisplay.className = 'amount positive';
            const diff = turnRatePer1k - realBorder;
            let note = `実質ボーダーラインを ${diff.toFixed(1)} 回転 上回っています。`;
            if (hasYutime) note += ` (遊タイム込期待値適用)`;
            noteDisplay.textContent = note;
        } else if (mainEV < 0) {
            evDailyDisplay.className = 'amount negative';
            evHourlyDisplay.className = 'amount negative';
            const diff = realBorder - turnRatePer1k;
            let note = `実質ボーダーラインに <strong>${diff.toFixed(1)} 回転 不足</strong>しています。`;
            if (hasYutime) note += ` (遊タイム込)`;
            noteDisplay.innerHTML = note;
        } else {
            evDailyDisplay.className = 'amount';
            evHourlyDisplay.className = 'amount';
            noteDisplay.textContent = '期待値プラマイゼロのラインです。';
        }
    }

    function renderHistory() {
        if (!historyList) return;
        historyList.innerHTML = '';
        let totalEv = 0;
        let totalBallEv = 0;

        historyData.forEach((item, index) => {
            totalEv += item.dailyEV;
            totalBallEv += (item.valuePerSpin || item.ballEv || 0);

            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div class="history-item-header">
                    <h4>${item.machineName} <span style="font-size:0.75rem; color:#94A3B8;">(${item.playRate}円)</span></h4>
                    <input type="checkbox" class="history-checkbox" data-id="${item.id}">
                </div>
                <div class="history-item-body">
                    <p><span>回転率:</span> <span>${item.turnRate.toFixed(2)} / 1k (${item.totalSpinsMeasured}回転)</span></p>
                    <p><span>持比単価:</span> <span>${formatSpinValue(item.valuePerSpin || item.ballEv || 0)}</span></p>
                    <p class="history-ev"><span>期待値${item.hasYutime ? '(遊込)' : ''}:</span> <span class="${item.dailyEV >= 0 ? 'amount positive' : 'amount negative'}" style="font-size:1rem; text-shadow:none;">${formatCurrency(Math.round(item.dailyEV))}</span></p>
                </div>
            `;
            historyList.appendChild(div);
        });

        if (historyTotalEv) historyTotalEv.textContent = formatCurrency(Math.round(totalEv));
        if (historyAvgBallEv) {
            const avg = historyData.length > 0 ? (totalBallEv / historyData.length) : 0;
            historyAvgBallEv.textContent = `¥${avg.toFixed(2)}`;
        }
    }

    if (saveHistoryBtn) {
        saveHistoryBtn.addEventListener('click', () => {
            if (latestCalculation) {
                historyData.push(latestCalculation);
                localStorage.setItem('pachinkoHistory', JSON.stringify(historyData));
                renderHistory();
            }
        });
    }

    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('.history-checkbox:checked');
            const idsToDelete = Array.from(checkboxes).map(cb => parseInt(cb.getAttribute('data-id')));

            if (idsToDelete.length > 0) {
                historyData = historyData.filter(item => !idsToDelete.includes(item.id));
                localStorage.setItem('pachinkoHistory', JSON.stringify(historyData));
                renderHistory();
            }
        });
    }

    renderHistory();

    // イベントリスナーの一括登録
    const inputs = document.querySelectorAll('input[type="number"], input[type="radio"]');
    inputs.forEach(input => {
        input.addEventListener('input', calculateEV);
        input.addEventListener('change', calculateEV);
    });

    // 初期計算
    calculateEV();
});
