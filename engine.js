/**
 * 期待値計算コアエンジン
 */

/**
 * Pachinko期待値計算メイン
 * @param {Object} inputs 入力データ (playRate, exchangeRateBalls, startSpin, currentSpin, investCashK, startBalls, currentBalls, bonusRounds, afterBonusBalls)
 * @param {Object} machine 機種データ (prob, primaryProb, border, rb, yutimeSpins, yutimeRb, avgChain, yutimeSpinCount)
 * @returns {Object} 計算結果
 */
function calculatePachinkoEV(inputs, machine) {
    const {
        playRate, exchangeRateBalls, startSpin, currentSpin,
        investCashK, startBalls, currentBalls, bonusRounds, afterBonusBalls
    } = inputs;

    const ballsPer1k = 1000 / playRate;
    let valuePerBallCashout = (1000 / exchangeRateBalls) * (playRate / 4);

    const borderBase = machine ? machine.border : 0;
    const prob = machine ? machine.prob : 0;
    const primaryProb = machine ? machine.primaryProb : 0;
    const defaultRb = machine ? machine.rb : 0;
    const machineYutimeLimit = machine ? (machine.yutimeSpins || 0) : 0;
    const machineAvgChain = machine ? (machine.avgChain || 0) : 0;
    const machineYutimeSpinCount = machine ? (machine.yutimeSpinCount || 0) : 0;

    const totalSpinsMeasured = currentSpin - startSpin;
    const cashInvestedYen = investCashK * 1000;
    const usedBalls = startBalls - currentBalls;
    const totalInvestedYen = cashInvestedYen + (usedBalls * playRate);

    let ballRatio = 1.0;
    if (totalInvestedYen > 0) {
        const positiveBallsYen = Math.max(0, usedBalls * playRate);
        ballRatio = (cashInvestedYen + positiveBallsYen > 0)
            ? positiveBallsYen / (cashInvestedYen + positiveBallsYen)
            : 1.0;
    }

    let turnRatePer1k = totalInvestedYen > 0 ? (totalSpinsMeasured / totalInvestedYen) * 1000 : 0;
    let measuredRb = (bonusRounds > 0 && afterBonusBalls > 0) ? (afterBonusBalls - currentBalls) / bonusRounds : 0;

    let activeBorderBase = borderBase;
    if (measuredRb > 0 && prob > 0) {
        activeBorderBase = 250 / (measuredRb / prob);
    }
    const realBorder = activeBorderBase * (playRate / valuePerBallCashout);

    // 通常時の計算
    const rb = measuredRb > 0 ? measuredRb : defaultRb;
    const exchangeRateYen = valuePerBallCashout * (4 / playRate);
    const conversionFactor = 4 / exchangeRateYen;

    const j14Result = prob > 0 && turnRatePer1k > 0
        ? (((rb / prob) - (ballsPer1k / turnRatePer1k)) * 4) / (ballsPer1k / 250)
        : 0;

    const normalBallUnitPrice = j14Result >= 0 ? (j14Result / conversionFactor) : (j14Result * conversionFactor);
    const normalCashUnitPrice = prob > 0 && turnRatePer1k > 0
        ? ((rb * valuePerBallCashout / prob) - (1000 / turnRatePer1k)) * (250 / ballsPer1k)
        : 0;
    const normalValuePerSpin = (Math.min(j14Result, normalBallUnitPrice) * ballRatio) + (normalCashUnitPrice * (1 - ballRatio));
    const dailyEV = normalValuePerSpin * totalSpinsMeasured;

    // 遊タイム期待値の計算
    let yutimeEV = 0;
    let yutimeValuePerSpin = 0;
    let yutimeBallUnitPriceResult = 0;
    let yutimeCashUnitPriceResult = 0;
    const hasYutime = machineYutimeLimit > 0 && primaryProb > 0;

    if (hasYutime) {
        const yutimeSpinsRemaining = Math.max(0, machineYutimeLimit - startSpin);
        const yutimeSpinCountForCalc = machineYutimeSpinCount > 0 ? machineYutimeSpinCount : yutimeSpinsRemaining;
        const yutimeExpectancy = 1 - Math.pow(1 - 1 / primaryProb, yutimeSpinCountForCalc);

        const missProb = (primaryProb - 1) / primaryProb;
        const effectiveProb = primaryProb * (1 - Math.pow(missProb, Math.max(0, yutimeSpinsRemaining)));

        const yutimeTotalProb = machineAvgChain > 0 && effectiveProb > 0 ? effectiveProb / (machineAvgChain * 10) : prob;

        const rawI18 = yutimeTotalProb > 0 && turnRatePer1k > 0
            ? (((((rb / yutimeTotalProb) - (ballsPer1k / turnRatePer1k)) * 4) / (ballsPer1k / 250)) * yutimeExpectancy)
            : 0;
        yutimeBallUnitPriceResult = rawI18 >= 0 ? (rawI18 / conversionFactor) : (rawI18 * conversionFactor);

        const rawI19Base = yutimeTotalProb > 0 && turnRatePer1k > 0
            ? (((rb / yutimeTotalProb * valuePerBallCashout) - (1000 / turnRatePer1k)) * (250 / ballsPer1k))
            : 0;
        const yutimeExpectancySq = Math.pow(yutimeExpectancy, 2);
        const rawI19 = rawI19Base <= 0
            ? (yutimeExpectancySq > 0 ? rawI19Base / yutimeExpectancySq : rawI19Base)
            : rawI19Base * yutimeExpectancySq;
        yutimeCashUnitPriceResult = rawI19 >= 0 ? (rawI19 / conversionFactor) : (rawI19 * conversionFactor);

        yutimeValuePerSpin = (yutimeBallUnitPriceResult * ballRatio) + (yutimeCashUnitPriceResult * (1 - ballRatio));
        yutimeEV = yutimeValuePerSpin * totalSpinsMeasured;
    }

    const mainEV = hasYutime ? Math.max(dailyEV, yutimeEV) : dailyEV;
    const finalValuePerSpin = (hasYutime && yutimeValuePerSpin > normalValuePerSpin) ? yutimeValuePerSpin : normalValuePerSpin;
    const isYutimeApplied = hasYutime && yutimeValuePerSpin > normalValuePerSpin;

    return {
        mainEV: isFinite(mainEV) ? mainEV : 0,
        finalValuePerSpin: isFinite(finalValuePerSpin) ? finalValuePerSpin : 0,
        normalValuePerSpin,
        normalBallUnitPrice,
        normalCashUnitPrice,
        yutimeBallUnitPriceResult,
        yutimeCashUnitPriceResult,
        yutimeValuePerSpin,
        yutimeEV,
        isYutimeApplied,
        hasYutime,
        totalSpinsMeasured,
        turnRatePer1k,
        measuredRb,
        realBorder,
        activeBorderBase,
        ballRatio,
        totalInvestedYen,
        cashInvestedYen,
        usedBalls
    };
}
