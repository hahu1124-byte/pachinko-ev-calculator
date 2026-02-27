/**
 * UI制御・描画マネージャー
 */

const UIManager = {
    // 履歴の描画
    renderHistory(params) {
        const {
            historyData, historyList, isCompactHistory, showDate,
            currentSummaryRate, checkedIds, summaryBox
        } = params;

        if (!historyList) return;

        historyList.innerHTML = '';
        let stats = {
            sumInvestK: 0, sumSpins: 0, sumCashK: 0, sumBonusRounds: 0,
            sumAcquiredBalls: 0, sumDiffBalls: 0, sumWork: 0, sumBallYen: 0,
            sumTotalInvestYen: 0
        };

        const isFilterActive = checkedIds.length > 0;
        const machineCounts = {};
        const machinesOldestFirst = [];

        // 1. 機種集計（表示対象レートかつ選択中のもの）
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

        // 2. 統計加算と描画
        historyData.forEach(item => {
            const isTargetRate = (item.playRate || 4) == currentSummaryRate;
            const isSelected = checkedIds.includes(item.id);

            if (isTargetRate && (!isFilterActive || isSelected)) {
                stats.sumInvestK += (item.totalInvestedK || 0);
                stats.sumSpins += (item.totalSpinsMeasured || 0);
                stats.sumCashK += (item.cashInvestedK || 0);
                stats.sumBonusRounds += (item.bonusRounds || 0);
                stats.sumAcquiredBalls += (item.acquiredBalls || 0);
                stats.sumDiffBalls += (item.diffBalls || 0);
                stats.sumWork += (item.dailyEV || 0);
                stats.sumBallYen += (item.positiveBallsYen || 0);
                stats.sumTotalInvestYen += (item.totalInvestedYen || 0);
            }

            if (isTargetRate) {
                const div = document.createElement('div');
                div.className = 'history-item';
                div.style.padding = '0.75rem';
                div.style.position = 'relative';
                div.style.borderBottom = '1px solid rgba(255,255,255,0.1)';

                const mName = item.machineName || "不明";
                const invK = (item.totalInvestedK || 0).toFixed(3);
                const spins = item.totalSpinsMeasured || 0;
                let turn = (item.turnRate || 0).toFixed(2);
                if (item.playRate && item.playRate != 4) {
                    turn = `${turn}(${(item.turnRate / (4 / item.playRate)).toFixed(2)})`;
                }

                const dateText = showDate ? `${formatHistoryDate(item.id)}\n` : '';

                if (isCompactHistory) {
                    const cshK = (item.cashInvestedK || 0).toFixed(2);
                    const rb = item.measuredRb ? item.measuredRb.toFixed(1) : '';
                    const br = item.bonusRounds || '';
                    const acq = item.acquiredBalls ? Math.round(item.acquiredBalls) : '';
                    const diff = (item.diffBalls || 0).toLocaleString();
                    const ballEv = (item.valuePerSpin || 0).toFixed(1);
                    const work = Math.round(item.dailyEV || 0).toLocaleString();
                    const bRat = ((item.ballRatio || 0) * 100).toFixed(1);
                    const rateSuffix = (item.playRate && item.playRate != 4) ? `/${item.playRate}円` : "";

                    const text = `${dateText}${mName}/総投資/${invK}k/通常回転数/${spins}/回転率${turn}/使用現金${cshK}k/RB${rb}/R回数${br}/獲得${acq}/差玉${diff}/単(持)${ballEv}/期待値￥${work}/持比${bRat}%${rateSuffix}`;
                    div.innerHTML = `<div style="font-size: 0.8rem; word-break: break-all; padding: 0 0.75rem; padding-right: 32px; line-height: 1.4; white-space: pre-wrap;">${text}</div><input type="checkbox" class="history-checkbox" data-id="${item.id}" style="position: absolute; right: 0.5rem; top: 0.75rem; transform: scale(1.2);">`;
                } else {
                    // 詳細表示時のパディングと中央寄せ調整
                    div.style.padding = '0.75rem 1.5rem'; // 左右パディングを増やす
                    div.style.textAlign = 'center'; // テキストを中央寄せ
                    div.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
                    let turnDisplayText = `${(item.turnRate || 0).toFixed(2)} / 1k`;
                    if (item.playRate && item.playRate != 4) {
                        turnDisplayText += ` (4P換算: ${(item.turnRate / (4 / item.playRate)).toFixed(2)})`;
                    }
                    div.innerHTML = `
                        <div class="history-item-header" style="justify-content: center;">
                            <h4 style="display: flex; flex-direction: column; align-items: center;">
                                ${showDate ? `<span style="font-size:0.7rem; color:#94A3B8; margin-bottom: 2px;">${formatHistoryDate(item.id)}</span>` : ''}
                                <span>${mName} <span style="font-size:0.75rem; color:#94A3B8;">(${item.playRate || "?"}円)</span></span>
                            </h4>
                            <input type="checkbox" class="history-checkbox" data-id="${item.id}" style="position: absolute; right: 0.5rem; top: 50%; transform: translateY(-50%);">
                        </div>
                        <div class="history-item-body">
                            <p style="justify-content: center; gap: 0.5rem;"><span>回転率:</span> <span>${turnDisplayText} (${spins}回転)</span></p>
                            <p style="justify-content: center; gap: 0.5rem;"><span>持比単価:</span> <span>${formatSpinValue(item.valuePerSpin || item.ballEv || 0)}</span></p>
                            <p class="history-ev" style="justify-content: center; gap: 1rem;"><span>期待値${item.hasYutime ? '(遊込)' : ''}:</span> <span class="${(item.dailyEV || 0) >= 0 ? 'amount positive' : 'amount negative'}" style="font-size:1.1rem; text-shadow:none;">${formatCurrency(Math.round(item.dailyEV || 0))}</span></p>
                        </div>
                    `;
                }
                historyList.appendChild(div);
            }
        });

        // 3. サマリー表示
        if (summaryBox) {
            const avgTurn = stats.sumInvestK > 0 ? (stats.sumSpins / stats.sumInvestK).toFixed(2) : "0.00";
            const avgRb = stats.sumBonusRounds > 0 ? (stats.sumAcquiredBalls / stats.sumBonusRounds).toFixed(1) : "0";
            const avgBallEv = stats.sumSpins > 0 ? (stats.sumWork / stats.sumSpins).toFixed(1) : "0";
            const avgBallRatio = stats.sumTotalInvestYen > 0 ? ((stats.sumBallYen / stats.sumTotalInvestYen) * 100).toFixed(1) : "0.0";
            const count = historyData.filter(i => (i.playRate || 4) == currentSummaryRate && (!isFilterActive || checkedIds.includes(i.id))).length;

            if (isCompactHistory) {
                const statDateText = showDate ? `${formatHistoryDate(Date.now())} ` : '';
                summaryBox.style.display = 'block';
                summaryBox.style.whiteSpace = 'pre-wrap';
                summaryBox.textContent = `${statDateText}${machineInfoText}\n総投資/${stats.sumInvestK.toFixed(3)}k/通常回転数/${stats.sumSpins}/回転率${avgTurn}/使用現金${stats.sumCashK.toFixed(2)}k/RB${avgRb}/総R回数${stats.sumBonusRounds}/総獲得玉${Math.round(stats.sumAcquiredBalls)}/総差玉${stats.sumDiffBalls.toLocaleString()}/単(持)${avgBallEv}/期待値￥${Math.round(stats.sumWork).toLocaleString()}/持比${avgBallRatio}%/🎯or台毎数${count}`;
            } else {
                summaryBox.style.display = 'block';
                summaryBox.style.whiteSpace = 'normal';
                summaryBox.innerHTML = `
                    <div class="history-item-body" style="padding: 0;">
                        ${showDate ? `<p style="margin-bottom: 0.5rem;"><span>算出日時:</span> <span style="display: block; text-align: right; margin-top: 2px;">${formatHistoryDate(Date.now())}</span></p>` : ''}
                        <p style="margin-bottom: 0.5rem;"><span>機種内訳:</span> <span style="display: block; text-align: right; margin-top: 2px;">${machineInfoText || 'なし'}</span></p>
                        <p><span>総投資:</span> <span>${stats.sumInvestK.toFixed(3)}k</span></p>
                        <p><span>通常回転数:</span> <span>${stats.sumSpins}回</span></p>
                        <p><span>平均回転率:</span> <span>${avgTurn} / 1k</span></p>
                        <p><span>平均持比単価:</span> <span>${avgBallEv}</span></p>
                        <p><span>総期待値:</span> <span>￥${Math.round(stats.sumWork).toLocaleString()}</span></p>
                        <p style="margin-top: 0.25rem; font-size: 0.75rem; color: #94A3B8;">(台数: ${count} / 持比: ${avgBallRatio}%)</p>
                    </div>
                `;
            }
        }
        return stats;
    },

    // 演出の更新
    updateEVBadgeAndAura(ev) {
        const evBoxInner = document.getElementById('ev-box-inner');
        const badge = document.getElementById('ev-badge');
        if (!evBoxInner || !badge) return;

        evBoxInner.classList.remove('ev-level-gold', 'ev-level-blue', 'ev-level-green', 'ev-level-soft-green', 'ev-level-soft-red', 'ev-level-red', 'ev-level-skull');
        badge.classList.remove('ev-badge-skull');
        badge.classList.add('hidden');

        if (ev >= 20000) {
            evBoxInner.classList.add('ev-level-gold');
            badge.textContent = '⭐大勝利の予感';
        } else if (ev >= 10000) {
            evBoxInner.classList.add('ev-level-blue');
            badge.textContent = '💎絶好調';
        } else if (ev >= 5000) {
            evBoxInner.classList.add('ev-level-green');
            badge.textContent = '✨期待大';
        } else if (ev > 0) {
            evBoxInner.classList.add('ev-level-soft-green');
            badge.textContent = '👍プラス';
        } else if (ev > -1000) {
            evBoxInner.classList.add('ev-level-soft-red');
            badge.textContent = '🤏微減';
        } else if (ev > -5000) {
            evBoxInner.classList.add('ev-level-red');
            badge.textContent = '⚠️要注意';
        } else {
            evBoxInner.classList.add('ev-level-skull');
            badge.classList.add('ev-badge-skull');
            badge.textContent = '💀警告';
        }
        badge.classList.remove('hidden');
    },

    // アニメーション
    animateEV(targetValue, displayElement) {
        const startValue = 0;
        const duration = 800;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOutQuad = t => t * (2 - t);
            const currentValue = Math.round(startValue + (targetValue - startValue) * easeOutQuad(progress));

            displayElement.textContent = formatCurrency(currentValue);

            if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    }
};
