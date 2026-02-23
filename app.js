document.addEventListener('DOMContentLoaded', () => {
    const borderInput = document.getElementById('border');
    const turnRateInput = document.getElementById('turn-rate');
    const hoursInput = document.getElementById('hours');
    const spinsPerHourInput = document.getElementById('spins-per-hour');

    const evDailyDisplay = document.getElementById('expected-value-daily');
    const evHourlyDisplay = document.getElementById('expected-value-hourly');
    const totalSpinsDisplay = document.getElementById('total-spins');
    const noteDisplay = document.getElementById('ev-note');

    function formatCurrency(amount) {
        const absAmount = Math.abs(amount);
        const formatted = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(absAmount);
        return amount < 0 ? `-${formatted}` : `+${formatted}`;
    }

    function calculateEV() {
        const border = parseFloat(borderInput.value);
        const turnRate = parseFloat(turnRateInput.value);
        const hours = parseFloat(hoursInput.value) || 0;
        const spinsPerHour = parseFloat(spinsPerHourInput.value) || 200;

        if (isNaN(border) || isNaN(turnRate) || border <= 0 || turnRate <= 0) {
            evDailyDisplay.textContent = '¥0';
            evHourlyDisplay.textContent = '¥0';
            totalSpinsDisplay.textContent = '0 回転';
            evDailyDisplay.className = 'amount';
            evHourlyDisplay.className = 'amount';
            noteDisplay.textContent = '数値を入力すると自動計算されます。';
            return;
        }

        const totalSpinsDaily = hours * spinsPerHour;
        totalSpinsDisplay.textContent = `${totalSpinsDaily.toLocaleString()} 回転`;

        // パチンコの期待値計算（等価交換の簡易計算式）
        // 1回転あたりの単価 = (250玉 / ボーダー - 250玉 / 回転率) × 4円（等価として）
        // ※ 1000円=250玉 で計算（4円パチンコ）

        // 回転率（千円あたり）で割ることで、1回転させるのに必要な玉数を出す
        const tamasPerSpinBorder = 250 / border;
        const tamasPerSpinActual = 250 / turnRate;

        // 1回転あたりの差引玉数
        const expectedBallsPerSpin = tamasPerSpinBorder - tamasPerSpinActual;

        // 4円等価と仮定して1回転あたりの金額に換算
        const valuePerSpin = expectedBallsPerSpin * 4;

        // 時給と日給
        const hourlyEV = valuePerSpin * spinsPerHour;
        const dailyEV = hourlyEV * hours;

        // 表示の更新
        evDailyDisplay.textContent = formatCurrency(Math.round(dailyEV));
        evHourlyDisplay.textContent = formatCurrency(Math.round(hourlyEV));

        // 色の変更
        if (dailyEV > 0) {
            evDailyDisplay.className = 'amount positive';
            evHourlyDisplay.className = 'amount positive';
            noteDisplay.textContent = `ボーダー比 ${((turnRate / border) * 100 - 100).toFixed(1)}% プラスです。`;
        } else if (dailyEV < 0) {
            evDailyDisplay.className = 'amount negative';
            evHourlyDisplay.className = 'amount negative';
            noteDisplay.textContent = `ボーダーを下回っています。マイナス期待値です。`;
        } else {
            evDailyDisplay.className = 'amount';
            evHourlyDisplay.className = 'amount';
            noteDisplay.textContent = 'ボーダープラマイゼロです。';
        }
    }

    borderInput.addEventListener('input', calculateEV);
    turnRateInput.addEventListener('input', calculateEV);
    hoursInput.addEventListener('input', calculateEV);
    spinsPerHourInput.addEventListener('input', calculateEV);

    calculateEV();
});
