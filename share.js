let shareTargetUrl = 'https://line.me/R/msg/text/?';

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
            const availableRates = Array.from(new Set(shareData.map(item => item.playRate || 4))).sort((a, b) => b - a);
            availableRates.forEach(rate => {
                let sumSpins = 0, sumWork = 0, sumInvestK = 0, sumCashK = 0, sumBonusRounds = 0, sumAcquiredBalls = 0, sumDiffBalls = 0, sumBallYen = 0, sumTotalInvestYen = 0, count = 0;
                const machineCounts = {};
                const machinesOldestFirst = [];
                shareData.forEach(item => {
                    if ((item.playRate || 4) == rate) {
                        sumSpins += item.totalSpinsMeasured || 0;
                        sumWork += item.dailyEV || 0;
                        sumInvestK += item.totalInvestedK || 0;
                        sumCashK += item.cashInvestedK || 0;
                        sumBonusRounds += item.bonusRounds || 0;
                        sumAcquiredBalls += item.acquiredBalls || 0;
                        sumDiffBalls += item.diffBalls || 0;
                        sumBallYen += item.positiveBallsYen || 0;
                        sumTotalInvestYen += item.totalInvestedYen || 0;
                        count++;

                        const mName = item.machineName || "不明";
                        if (!machineCounts[mName]) {
                            machineCounts[mName] = 0;
                            machinesOldestFirst.unshift(mName); // shareDataはunshiftで追加された逆順(最新順)なので、unshiftで戻すと古い順になる
                        }
                        machineCounts[mName]++;
                    }
                });
                const machineInfoText = machinesOldestFirst.map(name => `${name} (${machineCounts[name]}台)`).join(' / ');
                const avgTurn = sumInvestK > 0 ? (sumSpins / sumInvestK).toFixed(2) : "0.00";
                const avgRb = sumBonusRounds > 0 ? (sumAcquiredBalls / sumBonusRounds).toFixed(1) : "0";
                const avgBallEv = sumSpins > 0 ? (sumWork / sumSpins).toFixed(1) : "0";
                const avgBallRatio = sumTotalInvestYen > 0 ? ((sumBallYen / sumTotalInvestYen) * 100).toFixed(1) : "0.0";

                const dateStat = showDate ? `${formatHistoryDate(Date.now())}\n` : '';
                text += `${dateStat}${machineInfoText}\n【${rate}円】総投資/${sumInvestK.toFixed(3)}k/通常回転数/${sumSpins}/回転率${avgTurn}/使用現金${sumCashK.toFixed(2)}k/RB${avgRb}/総R回数${sumBonusRounds}/総獲得玉${Math.round(sumAcquiredBalls)}/総差玉${sumDiffBalls.toLocaleString()}/単(持)${avgBallEv}/期待値￥${Math.round(sumWork).toLocaleString()}/持比${avgBallRatio}%/🎯or台毎数${count}\n\n`;
            });
            text = text.trimEnd();
        } else {
            const availableRates = Array.from(new Set(shareData.map(item => item.playRate || 4))).sort((a, b) => b - a);

            availableRates.forEach(rate => {
                let totalEv = 0;
                let sumSpins = 0;
                let sumWork = 0;
                let sumInvestK = 0;
                const machineCounts = {};
                const machinesOldestFirst = [];

                shareData.forEach(item => {
                    if ((item.playRate || 4) == rate) {
                        totalEv += item.dailyEV || 0;
                        sumSpins += item.totalSpinsMeasured || 0;
                        sumWork += item.dailyEV || 0;
                        sumInvestK += item.totalInvestedK || 0;

                        const mName = item.machineName || "不明";
                        if (!machineCounts[mName]) {
                            machineCounts[mName] = 0;
                            machinesOldestFirst.unshift(mName);
                        }
                        machineCounts[mName]++;
                    }
                });

                const machineInfoText = machinesOldestFirst.map(name => `${name} (${machineCounts[name]}台)`).join(' / ');
                const avgTurn = sumInvestK > 0 ? (sumSpins / sumInvestK).toFixed(2) : "0.00";
                const avgBallEv = sumSpins > 0 ? (sumWork / sumSpins).toFixed(1) : "0";

                const dateStat = showDate ? `${formatHistoryDate(Date.now())}\n` : '';
                text += `${dateStat}機種内訳: ${machineInfoText}\n【${rate}円 統計】\n`;
                text += `💰 合計期待値: ${formatCurrency(Math.round(totalEv))}\n`;
                text += `📈 平均回転率: ${avgTurn} / 1k\n`;
                text += `✨ 平均持比単価: ¥${avgBallEv}\n`;
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
            text = text.trimEnd();
        }
    }

    // URLエンコードの前に、末尾の不要な改行をすべて削除する
    const encodedText = encodeURIComponent(text.trimEnd());
    const lineUrl = `${shareTargetUrl}${encodedText}`;

    // LINEを開く
    window.open(lineUrl, '_blank');
}
