/**
 * パチンコ期待値計算コアエンジン
 * gravity-portal/src/lib/ev-engine.ts と同一ロジック
 * 最終同期: 2026-03-04
 */

function calculatePachinkoEV(inputs, machine) {
    const {
        playRate, exchangeRateBalls, startSpin, currentSpin,
        investCashK, startBalls, currentBalls, bonusRounds, afterBonusBalls,
        customAssumedRb
    } = inputs;

    const ballsPer1k = 1000 / playRate;
    const valuePerBallCashout = (1000 / exchangeRateBalls) * (playRate / 4);

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

    const turnRatePer1k = totalInvestedYen > 0 ? (totalSpinsMeasured / totalInvestedYen) * 1000 : 0;
    const measuredRb = (bonusRounds > 0 && afterBonusBalls > 0) ? (afterBonusBalls - currentBalls) / bonusRounds : 0;

    let activeBorderBase = borderBase;
    if (measuredRb > 0 && prob > 0) {
        activeBorderBase = 250 / (measuredRb / prob);
    }
    const realBorder = activeBorderBase * (playRate / valuePerBallCashout);

    // 通常時の期待値計算
    const rb = measuredRb > 0 ? measuredRb : defaultRb;
    const exchangeRateYen = valuePerBallCashout * (4 / playRate);
    const conversionFactor = 4 / exchangeRateYen;

    // 1回転あたりの期待値計算 (玉単価ベース)
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
        const yutimeSpinsRemaining = Math.max(0, machineYutimeLimit - startSpin);
        const yutimeSpinCountForCalc = machineYutimeSpinCount > 0 ? machineYutimeSpinCount : yutimeSpinsRemaining;
        const yutimeSuccessProb = 1 - Math.pow(1 - 1 / primaryProb, yutimeSpinCountForCalc);

        const missProb = (primaryProb - 1) / primaryProb;
        const effectiveProb = primaryProb * (1 - Math.pow(missProb, Math.max(0, yutimeSpinsRemaining)));

        const yutimeTotalProb = machineAvgChain > 0 && effectiveProb > 0 ? effectiveProb / (machineAvgChain * 10) : prob;

        // J18相当: 遊タイム等価回転単価（yutimeSuccessProbはK18変換時に適用）
        const yutimeEVPerSpinRaw = yutimeTotalProb > 0 && turnRatePer1k > 0
            ? ((((rb / yutimeTotalProb) - (ballsPer1k / turnRatePer1k)) * 4) / (ballsPer1k / 250))
            : 0;
        // K18相当: 遊タイム持玉単価（交換率＋成功確率考慮）
        yutimeBallUnitPriceResult = yutimeEVPerSpinRaw >= 0
            ? (yutimeEVPerSpinRaw / conversionFactor * yutimeSuccessProb)
            : (yutimeEVPerSpinRaw * conversionFactor / yutimeSuccessProb);

        // J19のbase: (rb / yutimeTotalProb * exchangeRateYen - 1000/turnRatePer1k) * 250/ballsPer1k
        const yutimeCashBase = yutimeTotalProb > 0 && turnRatePer1k > 0
            ? (((rb / yutimeTotalProb * exchangeRateYen) - (1000 / turnRatePer1k)) * (250 / ballsPer1k))
            : 0;
        // J19: IF(base < 0, base / G23, base * G23) — yutimeSuccessProb 1回目適用
        const yutimeCashJ19 = yutimeCashBase < 0
            ? yutimeCashBase / yutimeSuccessProb
            : yutimeCashBase * yutimeSuccessProb;
        // K19: IF(J19>=0, J19/G18*G23, J19*G18/G23) — yutimeSuccessProb 2回目適用
        yutimeCashUnitPriceResult = yutimeCashJ19 >= 0
            ? (yutimeCashJ19 / conversionFactor * yutimeSuccessProb)
            : (yutimeCashJ19 * conversionFactor / yutimeSuccessProb);

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