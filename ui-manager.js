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
        const stats = this._calculateStats(historyData, currentSummaryRate, checkedIds);
        const machineInfoText = this._generateMachineInfo(historyData, currentSummaryRate, checkedIds);

        // 2. 履歴アイテムの描画
        historyData.forEach(item => {
            if ((item.playRate || 4) == currentSummaryRate) {
                const div = this._createHistoryItemElement(item, isCompactHistory, showDate);
                historyList.appendChild(div);
            }
        });

        // 3. サマリー表示の更新
        if (summaryBox) {
            this._updateSummary(summaryBox, stats, machineInfoText, countHistoryEntries(historyData, currentSummaryRate, checkedIds), isCompactHistory, showDate);
        }
        return stats;
    },

    // 統計計算ロジック
    _calculateStats(historyData, targetRate, checkedIds) {
        const stats = {
            sumInvestK: 0, sumSpins: 0, sumCashK: 0, sumBonusRounds: 0,
            sumAcquiredBalls: 0, sumDiffBalls: 0, sumWork: 0, sumBallYen: 0,
            sumTotalInvestYen: 0
        };
        const isFilterActive = checkedIds.length > 0;

        historyData.forEach(item => {
            const isTargetRate = (item.playRate || 4) == targetRate;
            if (isTargetRate && (!isFilterActive || checkedIds.includes(item.id))) {
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
        });
        return stats;
    },

    // 機種情報の生成
    _generateMachineInfo(historyData, targetRate, checkedIds) {
        const machineCounts = {};
        const machinesOldestFirst = [];
        const isFilterActive = checkedIds.length > 0;

        for (let i = historyData.length - 1; i >= 0; i--) {
            const item = historyData[i];
            if ((item.playRate || 4) == targetRate && (!isFilterActive || checkedIds.includes(item.id))) {
                const name = item.machineName || "不明";
                if (!machineCounts[name]) {
                    machineCounts[name] = 0;
                    machinesOldestFirst.push(name);
                }
                machineCounts[name]++;
            }
        }
        return machinesOldestFirst.map(name => `${name} (${machineCounts[name]}台)`).join(' / ');
    },

    // 履歴アイテムのDOM作成
    _createHistoryItemElement(item, isCompact, showDate) {
        const div = document.createElement('div');
        div.className = 'history-item';

        const mName = item.machineName || "不明";
        const invK = (item.totalInvestedK || 0).toFixed(3);
        const spins = item.totalSpinsMeasured || 0;
        let turn = (item.turnRate || 0).toFixed(2);
        if (item.playRate && item.playRate != 4) {
            turn = `${turn}(${(item.turnRate / (4 / item.playRate)).toFixed(2)})`;
        }

        const dateMeta = showDate ? formatHistoryDate(item.id) : '';

        // ==========================================
        // 【詳細モード】isCompact=true / ボタン表示「簡略」
        //  → compact表示（全データ1行詰め込み）
        //  → 機種名の色: 白 (--text-main)
        // ==========================================
        if (isCompact) {
            const cshK = (item.cashInvestedK || 0).toFixed(2);
            const rb = item.measuredRb ? item.measuredRb.toFixed(1) : '';
            const br = item.bonusRounds || '';
            const acq = item.acquiredBalls ? Math.round(item.acquiredBalls) : '';
            const diff = (item.diffBalls || 0).toLocaleString();
            const ballEv = (item.valuePerSpin || 0).toFixed(1);
            const work = formatCurrency(Math.round(item.dailyEV || 0));
            const bRat = ((item.ballRatio || 0) * 100).toFixed(1);
            const rateSuffix = (item.playRate && item.playRate != 4) ? `/${item.playRate}円` : "";

            const dateTime = showDate ? `<span class="compact-date">${dateMeta}</span>` : '';
            const rateText = (item.playRate && item.playRate != 4) ? ` (${item.playRate}円)` : "";
            const headerRow = `<div class="compact-header">${dateTime}<span class="compact-machine">${mName}${rateText}</span><input type="checkbox" class="history-checkbox history-checkbox-inline" data-id="${item.id}"></div>`;
            const statsText = `総投資/${invK}k/通常回転数/${spins}/回転率${turn}/使用現金${cshK}k/RB${rb}/R回数${br}/獲得${acq}/差玉${diff}/単(持)${ballEv}/期待値${work}/持比${bRat}%`;

            div.innerHTML = `
                <div class="history-item-compact-container">
                    ${headerRow}
                    <div class="compact-stats">${statsText}</div>
                </div>
            `;
            // ==========================================
            // 【簡略モード】isCompact=false / ボタン表示「詳細」
            //  → 展開表示（回転率/持比/期待値の3項目）
            //  → 機種名の色: 紫 (--primary)
            // ==========================================
        } else {
            let turnDisplayText = `${(item.turnRate || 0).toFixed(2)} / 1k`;
            if (item.playRate && item.playRate != 4) {
                turnDisplayText += ` (4P換算: ${(item.turnRate / (4 / item.playRate)).toFixed(2)})`;
            }
            div.innerHTML = `
                <div class="history-item-header">
                    <div class="header-left">
                        ${showDate ? `<div class="history-date-label">${dateMeta}</div>` : ''}
                        <h4 class="history-machine-title">${mName} <span class="play-rate-label">(${item.playRate || "?"}円)</span></h4>
                    </div>
                    <input type="checkbox" class="history-checkbox history-checkbox-inline" data-id="${item.id}">
                </div>
                <div class="history-item-body">
                    <p><span>回転率:</span> <span>${turnDisplayText} (${spins}回転)</span></p>
                    <p><span>持比単価:</span> <span>${formatSpinValue(item.valuePerSpin || item.ballEv || 0)}</span></p>
                    <p class="history-ev"><span>期待値${item.hasYutime ? '(遊込)' : ''}:</span> <span class="${(item.dailyEV || 0) >= 0 ? 'amount positive' : 'amount negative'}" style="font-size:1.1rem; text-shadow:none;">${formatCurrency(Math.round(item.dailyEV || 0))}</span></p>
                </div>
            `;
        }
        return div;
    },

    // サマリーの描画更新
    _updateSummary(summaryBox, stats, machineInfoText, count, isCompact, showDate) {
        const avgTurn = stats.sumInvestK > 0 ? (stats.sumSpins / stats.sumInvestK).toFixed(2) : "0.00";
        const avgRb = stats.sumBonusRounds > 0 ? (stats.sumAcquiredBalls / stats.sumBonusRounds).toFixed(1) : "0";
        const avgBallEv = stats.sumSpins > 0 ? (stats.sumWork / stats.sumSpins).toFixed(1) : "0";
        const avgBallRatio = stats.sumTotalInvestYen > 0 ? ((stats.sumBallYen / stats.sumTotalInvestYen) * 100).toFixed(1) : "0.0";

        summaryBox.style.display = 'block';
        summaryBox.classList.remove('summary-aura-green', 'summary-aura-blue', 'summary-aura-bluegold', 'summary-aura-gold');
        this._applyAura(summaryBox, stats.sumWork);

        if (isCompact) {
            summaryBox.style.whiteSpace = 'pre-wrap';
            const statDateText = showDate ? `${formatHistoryDate(Date.now())} ` : '';
            summaryBox.innerHTML = `${statDateText}${machineInfoText}\n総投資/${stats.sumInvestK.toFixed(3)}k/通常回転数/${stats.sumSpins}/回転率${avgTurn}/使用現金${stats.sumCashK.toFixed(2)}k/RB${avgRb}/総R回数${stats.sumBonusRounds}/総獲得玉${Math.round(stats.sumAcquiredBalls)}/総差玉${stats.sumDiffBalls.toLocaleString()}/単(持)${avgBallEv}/期待値<span id="history-summary-ev-total">${formatCurrency(Math.round(stats.sumWork))}</span>/持比${avgBallRatio}%/🎯or台毎数${count}`;
        } else {
            summaryBox.style.whiteSpace = 'normal';
            summaryBox.innerHTML = `
                <div class="history-summary-inner">
                    ${showDate ? `<p><span>算出日時:</span> <span>${formatHistoryDate(Date.now())}</span></p>` : ''}
                    <p style="margin-bottom: 0.5rem;"><span>機種内訳:</span> <span style="display: block; text-align: right; margin-top: 2px;">${machineInfoText || 'なし'}</span></p>
                    <p><span>総投資:</span> <span>${stats.sumInvestK.toFixed(3)}k</span></p>
                    <p><span>通常回転数:</span> <span>${stats.sumSpins}回</span></p>
                    <p><span>平均回転率:</span> <span>${avgTurn} / 1k</span></p>
                    <p><span>平均持比単価:</span> <span>${avgBallEv}</span></p>
                    <p><span>総期待値:</span> <span class="${stats.sumWork >= 0 ? 'positive' : 'negative'} history-summary-ev-highlight"><span id="history-summary-ev-total">${formatCurrency(Math.round(stats.sumWork))}</span></span></p>
                    <p style="margin-top: 0.25rem; font-size: 0.75rem; color: var(--text-muted);">(台数: ${count} / 持比: ${avgBallRatio}%)</p>
                </div>
            `;
        }

        const summaryEvElem = document.getElementById('history-summary-ev-total');
        if (summaryEvElem) {
            this.animateEV(Math.round(stats.sumWork), summaryEvElem);
            this._applyTextHighlight(summaryEvElem, stats.sumWork);
        }
    },

    // オーラ適用（共通化）
    _applyAura(element, ev) {
        if (ev >= 30000) element.classList.add('summary-aura-gold');
        else if (ev >= 2000) element.classList.add('summary-aura-bluegold');
        else if (ev >= 1000) element.classList.add('summary-aura-blue');
        else if (ev > 0) element.classList.add('summary-aura-green');
    },

    // テキストハイライト適用（共通化）
    _applyTextHighlight(element, ev) {
        element.classList.remove('text-highlight-green', 'text-highlight-blue', 'text-highlight-bluegold', 'text-highlight-gold');
        if (ev >= 30000) element.classList.add('text-highlight-gold');
        else if (ev >= 2000) element.classList.add('text-highlight-bluegold');
        else if (ev >= 1000) element.classList.add('text-highlight-blue');
        else if (ev > 0) element.classList.add('text-highlight-green');
    },

    // 演出の更新（メイン画面用）
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

    // カウントアップアニメーション
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

// ヘルパー関数: 指定レートの履歴件数をカウント
function countHistoryEntries(historyData, targetRate, checkedIds) {
    const isFilterActive = checkedIds.length > 0;
    return historyData.filter(i => (i.playRate || 4) == targetRate && (!isFilterActive || checkedIds.includes(i.id))).length;
}
