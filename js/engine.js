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
        investCashK, startBalls, currentBalls, bonusRounds, afterBonusBalls,
        customAssumedRb
    } = inputs;

    const ballsPer1k = 1000 / playRate;
    let valuePerBallCashout = (1000 / exchangeRateBalls) * (playRate / 4);

    const borderBase = machine ? machine.border : 0;
    const prob = machine ? machine.prob : 0;
    const primaryProb = machine ? machine.primaryProb : 0;
    const defaultRb = customAssumedRb > 0 ? customAssumedRb : (machine ? machine.rb : 0);
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

    // 通常時の期待値計算
    const rb = measuredRb > 0 ? measuredRb : defaultRb;
    const exchangeRateYen = valuePerBallCashout * (4 / playRate);
    const conversionFactor = 4 / exchangeRateYen;

    // 1回転あたりの期待値計算 (玉単価ベース) - [スプレッドシート J14 相当]
    // 式: ((1R出玉 / 大当たり確率) - (1kあたりの玉数 / 回転率)) * 4円 / (1kあたりの玉数 / 250玉)
    const normalEVPerSpinRaw = prob > 0 && turnRatePer1k > 0
        ? (((rb / prob) - (ballsPer1k / turnRatePer1k)) * 4) / (ballsPer1k / 250)
        : 0;

    const normalBallUnitPrice = normalEVPerSpinRaw >= 0 ? (normalEVPerSpinRaw / conversionFactor) : (normalEVPerSpinRaw * conversionFactor);

    // 現金投資時の1回転あたり期待値
    const normalCashUnitPrice = prob > 0 && turnRatePer1k > 0
        ? ((rb * valuePerBallCashout / prob) - (1000 / turnRatePer1k)) * (250 / ballsPer1k)
        : 0;

    // 持ち玉比率を考慮した1回転あたり期待値
    const normalValuePerSpin = (Math.min(normalEVPerSpinRaw, normalBallUnitPrice) * ballRatio) + (normalCashUnitPrice * (1 - ballRatio));
    const dailyEV = normalValuePerSpin * totalSpinsMeasured;

    // 遊タイム期待値の計算
    let yutimeEV = 0;
    let yutimeValuePerSpin = 0;
    let yutimeBallUnitPriceResult = 0;
    let yutimeCashUnitPriceResult = 0;
    const hasYutime = machineYutimeLimit > 0 && primaryProb > 0;

    if (hasYutime) {
        // 遊タイム到達までの残り回転数に応じた期待確率等の計算 - [スプレッドシート I17 相当]
        const yutimeSpinsRemaining = Math.max(0, machineYutimeLimit - startSpin);
        const yutimeSpinCountForCalc = machineYutimeSpinCount > 0 ? machineYutimeSpinCount : yutimeSpinsRemaining;
        const yutimeSuccessProb = 1 - Math.pow(1 - 1 / primaryProb, yutimeSpinCountForCalc);

        const missProb = (primaryProb - 1) / primaryProb;
        const effectiveProb = primaryProb * (1 - Math.pow(missProb, Math.max(0, yutimeSpinsRemaining)));

        // 遊タイム中を含めた実質的な大当たり確率の調整
        const yutimeTotalProb = machineAvgChain > 0 && effectiveProb > 0 ? effectiveProb / (machineAvgChain * 10) : prob;

        // 遊タイム考慮時の持ち玉単価計算 - [スプレッドシート I18 相当]
        const yutimeBallUnitPriceRaw = yutimeTotalProb > 0 && turnRatePer1k > 0
            ? (((((rb / yutimeTotalProb) - (ballsPer1k / turnRatePer1k)) * 4) / (ballsPer1k / 250)) * yutimeSuccessProb)
            : 0;
        yutimeBallUnitPriceResult = yutimeBallUnitPriceRaw >= 0 ? (yutimeBallUnitPriceRaw / conversionFactor) : (yutimeBallUnitPriceRaw * conversionFactor);

        // 遊タイム考慮時の現金単価計算 - [スプレッドシート I19 相当]
        const yutimeCashUnitPriceRawBase = yutimeTotalProb > 0 && turnRatePer1k > 0
            ? (((rb / yutimeTotalProb * valuePerBallCashout) - (1000 / turnRatePer1k)) * (250 / ballsPer1k))
            : 0;
        const yutimeSuccessProbSq = Math.pow(yutimeSuccessProb, 2);
        const yutimeCashUnitPriceRaw = yutimeCashUnitPriceRawBase <= 0
            ? (yutimeSuccessProbSq > 0 ? yutimeCashUnitPriceRawBase / yutimeSuccessProbSq : yutimeCashUnitPriceRawBase)
            : yutimeCashUnitPriceRawBase * yutimeSuccessProbSq;
        yutimeCashUnitPriceResult = yutimeCashUnitPriceRaw >= 0 ? (yutimeCashUnitPriceRaw / conversionFactor) : (yutimeCashUnitPriceRaw * conversionFactor);

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
