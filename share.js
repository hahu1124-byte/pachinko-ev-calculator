// 統計情報を取得する共通関数
function getStatsByRate(shareData, rate) {
    let stats = {
        sumSpins: 0, sumWork: 0, sumInvestK: 0, sumCashK: 0,
        sumBonusRounds: 0, sumAcquiredBalls: 0, sumDiffBalls: 0,
        sumBallYen: 0, sumTotalInvestYen: 0, count: 0,
        machineCounts: {}, machinesOldestFirst: []
    };

    shareData.forEach(item => {
        if ((item.playRate || 4) == rate) {
            stats.sumSpins += item.totalSpinsMeasured || 0;
            stats.sumWork += item.dailyEV || 0;
            stats.sumInvestK += item.totalInvestedK || 0;
            stats.sumCashK += item.cashInvestedK || 0;
            stats.sumBonusRounds += item.bonusRounds || 0;
            stats.sumAcquiredBalls += item.acquiredBalls || 0;
            stats.sumDiffBalls += item.diffBalls || 0;
            stats.sumBallYen += item.positiveBallsYen || 0;
            stats.sumTotalInvestYen += item.totalInvestedYen || 0;
            stats.count++;

            const mName = item.machineName || "不明";
            if (!stats.machineCounts[mName]) {
                stats.machineCounts[mName] = 0;
                stats.machinesOldestFirst.unshift(mName); // shareDataは最新順なので、unshiftで戻すと古い順になる
            }
            stats.machineCounts[mName]++;
        }
    });

    stats.machineInfoText = stats.machinesOldestFirst.map(name => `${name} (${stats.machineCounts[name]}台)`).join(' / ');
    stats.avgTurn = stats.sumInvestK > 0 ? (stats.sumSpins / stats.sumInvestK).toFixed(2) : "0.00";
    stats.avgRb = stats.sumBonusRounds > 0 ? (stats.sumAcquiredBalls / stats.sumBonusRounds).toFixed(1) : "0";
    stats.avgBallEv = stats.sumSpins > 0 ? (stats.sumWork / stats.sumSpins).toFixed(1) : "0";
    stats.avgBallRatio = stats.sumTotalInvestYen > 0 ? ((stats.sumBallYen / stats.sumTotalInvestYen) * 100).toFixed(1) : "0.0";

    return stats;
}

// --- 共有ロジック ---
function handleShareLineClick(historyData, isCompactHistory, showDate) {
    if (historyData.length === 0) {
        alert('共有する履歴がありません。');
        return;
    }

    const checkboxes = document.querySelectorAll('.history-checkbox:checked');
    const selectedIds = Array.from(checkboxes).map(cb => parseInt(cb.getAttribute('data-id')));

    let shareData = [];
    if (selectedIds.length > 0) {
        shareData = historyData.filter(item => selectedIds.includes(item.id));
    } else {
        // 何も選択されていない場合は、最後に保存された履歴のみを対象とする
        shareData = [historyData[0]];
    }

    let text = '📊 パチンコ期待値 履歴\n--------------------\n';

    if (shareData.length === 1) {
        const item = shareData[0];
        const dailyEV = item.dailyEV || 0;
        let turnText = `${(item.turnRate || 0).toFixed(2)} / 1k - 通常${item.totalSpinsMeasured || 0}回転`;
        if (item.playRate && item.playRate != 4) {
            turnText = `${(item.turnRate || 0).toFixed(2)}(${((item.turnRate || 0) / (4 / item.playRate)).toFixed(2)}/4P1k) / 1k - 通常${item.totalSpinsMeasured || 0}回転`;
        }

        const dateLine = showDate ? `${formatHistoryDate(item.id)}\n` : '';

        if (isCompactHistory) {
            const mName = item.machineName || "不明";
            const invK = (item.totalInvestedK || 0).toFixed(3);
            const spins = item.totalSpinsMeasured || 0;
            let turn = (item.turnRate || 0).toFixed(2);
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

            text += `${dateLine}${mName}/総投資/${invK}k/通常回転数/${spins}/回転率${turn}/使用現金${cshK}k/RB${rb}/R回数${br}/獲得${acq}/差玉${diff}/単(持)${ballEv}/期待値￥${work}/持比${bRat}%${rateSuffix}\n`;
        } else {
            text += `${dateLine}🎰 ${item.machineName || "不明な機種"} (${item.playRate || "?"}円)\n`;
            text += `回転率: ${turnText}\n`;
            text += `持比単価: ${formatSpinValue(item.valuePerSpin || item.ballEv || 0)}\n`;
            text += `期待値${item.hasYutime ? '(遊込)' : ''}: ${formatCurrency(Math.round(dailyEV))}\n`;
        }
    } else {
        const availableRates = Array.from(new Set(shareData.map(item => item.playRate || 4))).sort((a, b) => b - a);

        if (isCompactHistory) {
            shareData.forEach(item => {
                const dateLine = showDate ? `${formatHistoryDate(item.id)}\n` : '';
                const mName = item.machineName || "不明";
                const invK = (item.totalInvestedK || 0).toFixed(3);
                const spins = item.totalSpinsMeasured || 0;
                let turn = (item.turnRate || 0).toFixed(2);

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

                text += `${dateLine}${mName}/総投資/${invK}k/通常回転数/${spins}/回転率${turn}/使用現金${cshK}k/RB${rb}/R回数${br}/獲得${acq}/差玉${diff}/単(持)${ballEv}/期待値￥${work}/持比${bRat}%${rateSuffix}\n\n`;
            });
            text = text.trimEnd() + '\n';
            text += `--------------------\n総計:\n`;

            availableRates.forEach(rate => {
                const s = getStatsByRate(shareData, rate);
                const dateStat = showDate ? `${formatHistoryDate(Date.now())}\n` : '';
                text += `${dateStat}${s.machineInfoText}\n【${rate}円】総投資/${s.sumInvestK.toFixed(3)}k/通常回転数/${s.sumSpins}/回転率${s.avgTurn}/使用現金${s.sumCashK.toFixed(2)}k/RB${s.avgRb}/総R回数${s.sumBonusRounds}/総獲得玉${Math.round(s.sumAcquiredBalls)}/総差玉${s.sumDiffBalls.toLocaleString()}/単(持)${s.avgBallEv}/期待値￥${Math.round(s.sumWork).toLocaleString()}/持比${s.avgBallRatio}%/🎯or台毎数${s.count}\n\n`;
            });
        } else {
            availableRates.forEach(rate => {
                const s = getStatsByRate(shareData, rate);
                const dateStat = showDate ? `${formatHistoryDate(Date.now())}\n` : '';
                text += `${dateStat}機種内訳: ${s.machineInfoText}\n【${rate}円 統計】\n`;
                text += `💰 合計期待値: ${formatCurrency(Math.round(s.sumWork))}\n`;
                text += `📈 平均回転率: ${s.avgTurn} / 1k\n`;
                text += `✨ 平均持比単価: ¥${s.avgBallEv}\n`;
                text += `--------------------\n\n`;
            });
            text = text.trimEnd() + '\n';

            shareData.forEach(item => {
                const dailyEV = item.dailyEV || 0;
                let turnText = `${(item.turnRate || 0).toFixed(2)} / 1k - 通常${item.totalSpinsMeasured || 0}回転`;
                if (item.playRate && item.playRate != 4) {
                    turnText = `${(item.turnRate || 0).toFixed(2)}(${((item.turnRate || 0) / (4 / item.playRate)).toFixed(2)}/4P1k) / 1k - 通常${item.totalSpinsMeasured || 0}回転`;
                }

                const dateLine = showDate ? `${formatHistoryDate(item.id)}\n` : '';
                text += `${dateLine}🎰 ${item.machineName || "不明な機種"} (${item.playRate || "?"}円)\n`;
                text += `回転率: ${turnText}\n`;
                text += `持比単価: ${formatSpinValue(item.valuePerSpin || item.ballEv || 0)}\n`;
                text += `期待値${item.hasYutime ? '(遊込)' : ''}: ${formatCurrency(Math.round(dailyEV))}\n\n`;
            });
        }
        text = text.trimEnd();
    }

    const encodedText = encodeURIComponent(text.trimEnd());
    const lineUrl = `line://msg/text/${encodedText}`;

    // スマホブラウザでのポップアップブロックを回避するため、window.open ではなく location.href を使用
    window.location.href = lineUrl;

    // 万が一 line:// スキームで反応しない環境（古いPCブラウザ等）のためのフォールバック
    setTimeout(() => {
        if (document.hasFocus()) {
            window.open(`https://line.me/R/msg/text/?${encodedText}`, '_blank');
        }
    }, 500);
}
