document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const playRateRadios = document.querySelectorAll('input[name="play-rate"]');
    const exchangeRateSelect = document.getElementById('exchange-rate');
    const customExchangeInput = document.getElementById('custom-exchange');
    const hasFeeCheckbox = document.getElementById('has-fee');
    const ballRatioGroup = document.getElementById('ball-ratio-group');
    const ballRatioInput = document.getElementById('ball-ratio');
    const ballRatioDisplay = document.getElementById('ball-ratio-display');

    const machineSelect = document.getElementById('machine-select');
    const borderInput = document.getElementById('border');
    const turnRateInput = document.getElementById('turn-rate');
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

    // UI Toggle Logic
    exchangeRateSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            customExchangeInput.classList.remove('hidden');
        } else {
            customExchangeInput.classList.add('hidden');
        }
        calculateEV();
    });

    hasFeeCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            ballRatioGroup.classList.remove('hidden');
        } else {
            ballRatioGroup.classList.add('hidden');
        }
        calculateEV();
    });

    ballRatioInput.addEventListener('input', (e) => {
        ballRatioDisplay.textContent = e.target.value;
        calculateEV();
    });

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
            const rbs = rows[2];
            const probs = rows[4];

            machineData = [];
            for (let i = 1; i < names.length; i++) {
                const name = names[i] ? names[i].trim() : "";
                if (!name) continue;

                const rb = parseFloat(rbs[i]);
                const prob = parseFloat(probs[i]);

                if (rb > 0 && prob > 0) {
                    // 等価ボーダー = 250 / (仮定RB / トータル確率)
                    const border = 250 / (rb / prob);
                    machineData.push({
                        name: name,
                        border: border.toFixed(2),
                        borderRaw: border
                    });
                }
            }
            populateMachineSelect();
        })
        .catch(error => {
            console.error('Error loading machines CSV:', error);
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "-- 機種データの読み込みに失敗しました --";
            machineSelect.appendChild(option);
        });

    function populateMachineSelect() {
        // Clear existing options except the first one
        machineSelect.innerHTML = '<option value="">-- 機種を選択するか直接入力 --</option>';

        machineData.forEach(machine => {
            const option = document.createElement('option');
            option.value = machine.borderRaw;
            option.textContent = `${machine.name} (${machine.border})`;
            machineSelect.appendChild(option);
        });
    }

    machineSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            // display up to 1 decimal place dynamically, or 2 if needed
            borderInput.value = parseFloat(e.target.value).toFixed(2);
            calculateEV();
        }
    });

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

        // 手数料設定
        const hasFee = hasFeeCheckbox.checked;
        const ballRatio = hasFee ? parseFloat(ballRatioInput.value) / 100 : 1.0;

        // --- 2. 機種・ベースデータの取得 ---
        // ここで入力するボーダーラインは「4円・等価」基準の公表値（例:18.0回/250玉）を想定しています。
        // （1円で打つ場合でも「1000円(1000玉)で72回転」ではなく「250玉あたり18回転」という共通指標で入力させる）
        const borderBase = parseFloat(borderInput.value); // 250玉あたりの回転数

        // 実測の回転率（入力は1000円あたりを想定）
        let turnRatePer1k = parseFloat(turnRateInput.value);

        const hours = parseFloat(hoursInput.value) || 0;
        const spinsPerHour = parseFloat(spinsPerHourInput.value) || 200;

        if (isNaN(borderBase) || isNaN(turnRatePer1k) || borderBase <= 0 || turnRatePer1k <= 0) {
            evDailyDisplay.textContent = '¥0';
            evHourlyDisplay.textContent = '¥0';
            totalSpinsDisplay.textContent = '0 回転';
            realBorderDisplay.textContent = '-- 回転 / 1k';
            valuePerSpinDisplay.textContent = '¥0.00';
            ballEvPerSpinDisplay.textContent = '¥0.00';
            cashEvPerSpinDisplay.textContent = '¥0.00';
            evDailyDisplay.className = 'amount';
            evHourlyDisplay.className = 'amount';
            noteDisplay.textContent = '数値を入力すると自動計算されます。';
            return;
        }

        const totalSpinsDaily = hours * spinsPerHour;
        totalSpinsDisplay.textContent = `${totalSpinsDaily.toLocaleString()} 回転`;

        // --- 3. 期待値計算のコアロジック ---
        // 1回転回すのに必要な玉数
        // ボーダー基準での1回転消費玉数
        const requiredBallsPerSpinBase = 250 / borderBase;
        // 実測での1回転消費玉数（入力された1000円あたりの回転率から算出）
        const requiredBallsPerSpinActual = ballsPer1k / turnRatePer1k;

        // 1回転あたりの期待「差引玉数」（プラスなら持ち玉が増える、マイナスなら減る）
        // スプレッドシート式: 期待玉数 = ボーダー基準1回転の消費玉数 - 実測1回転の消費玉数
        const expectedBallsPerSpin = requiredBallsPerSpinBase - requiredBallsPerSpinActual;

        // 交換ギャップを含めた金額期待値の算出
        const investmentPrice = playRate; // 4円、2円、1円
        const cashoutPrice = hasFee ? valuePerBallCashout : playRate;

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

        // 時給と日給
        const hourlyEV = valuePerSpin * spinsPerHour;
        const dailyEV = hourlyEV * hours;

        // 実質ボーダーラインの算出
        let realBorder;
        if (hasFee) {
            const gapFactor = ((1 - ballRatio) * investmentPrice + ballRatio * cashoutPrice) / cashoutPrice;
            realBorder = borderBase * (ballsPer1k / 250) * gapFactor;
        } else {
            realBorder = borderBase * (ballsPer1k / 250);
        }

        // --- 4. 結果表示 ---
        evDailyDisplay.textContent = formatCurrency(Math.round(dailyEV));
        evHourlyDisplay.textContent = formatCurrency(Math.round(hourlyEV));
        realBorderDisplay.textContent = `${realBorder.toFixed(1)} 回転 / 1k`;
        valuePerSpinDisplay.textContent = formatCurrency(valuePerSpin);
        ballEvPerSpinDisplay.textContent = formatCurrency(ballEvPerSpin);
        cashEvPerSpinDisplay.textContent = formatCurrency(cashEvPerSpin);


        // 色とメッセージの更新
        if (dailyEV > 0) {
            evDailyDisplay.className = 'amount positive';
            evHourlyDisplay.className = 'amount positive';
            const diff = turnRatePer1k - realBorder;
            noteDisplay.textContent = `実質ボーダーラインを ${diff.toFixed(1)} 回転 上回っています。`;
        } else if (dailyEV < 0) {
            evDailyDisplay.className = 'amount negative';
            evHourlyDisplay.className = 'amount negative';
            const diff = realBorder - turnRatePer1k;
            noteDisplay.innerHTML = `実質ボーダーラインに <strong>${diff.toFixed(1)} 回転 不足</strong>しています。`;
        } else {
            evDailyDisplay.className = 'amount';
            evHourlyDisplay.className = 'amount';
            noteDisplay.textContent = '期待値プラマイゼロのラインです。';
        }
    }

    // イベントリスナーの一括登録
    const inputs = document.querySelectorAll('input[type="number"], input[type="radio"]');
    inputs.forEach(input => {
        input.addEventListener('input', calculateEV);
        input.addEventListener('change', calculateEV);
    });

    // 初期計算
    calculateEV();
});
