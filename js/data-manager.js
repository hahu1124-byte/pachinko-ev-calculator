/**
 * 機種データ・CSV管理マネージャー
 */

const DataManager = {
    machineData: [],
    sheetCsvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTg_z1H5K62_019noNiZnxtSTOafCW4c5y4BghW62nHmOTneMx4JzVycIXAXHTdF9vxYSOjcnu7u3BK/pub?gid=493752965&single=true&output=csv',

    /**
     * CSVデータを取得・パースして機種データを更新する
     * @returns {Promise<Array>} 更新された機種データ
     */
    async fetchMachineData() {
        try {
            const response = await fetch(this.sheetCsvUrl);
            const csv = await response.text();
            const rows = parseCsv(csv.trim());

            if (!rows || rows.length < 6) return this.machineData;

            const names = rows[0], pProbs = rows[1], rbs = rows[2], yRbs = rows[3], probs = rows[4], yts = rows[5], acs = rows[10] || [], yscs = rows[15] || [];
            const newData = [];

            for (let i = 1; i < names.length; i++) {
                const name = names[i]?.trim();
                if (!name) continue;

                const rb = parseFloat(rbs[i]), prob = parseFloat(probs[i]);
                if (rb > 0 && prob > 0) {
                    newData.push({
                        name,
                        prob,
                        rb,
                        border: 250 / (rb / prob),
                        primaryProb: parseFloat(pProbs[i]) || 0,
                        yutimeSpins: parseFloat(yts[i]) || 0,
                        yutimeRb: parseFloat(yRbs[i]) || 0,
                        avgChain: parseFloat(acs[i]) || 0,
                        yutimeSpinCount: parseFloat(yscs[i]) || 0
                    });
                }
            }

            if (newData.length > 0) {
                this.machineData = newData;
                SettingsManager.saveParametricMachines(this.machineData);
            }
            return this.machineData;
        } catch (e) {
            console.warn('CSV load error, using cached or sample data', e);
            if (this.machineData.length === 0) {
                this.machineData = [{ name: "【サンプル】大海5", border: 16.5, prob: 31.9, primaryProb: 319.6, rb: 140, yutimeSpins: 950, yutimeRb: 10.23, avgChain: 3.011, yutimeSpinCount: 350 }];
            }
            return this.machineData;
        }
    },

    /**
     * キャッシュからデータをロードする
     */
    loadFromCache() {
        const cached = SettingsManager.getParametricMachines();
        if (cached) {
            this.machineData = cached;
        }
        return this.machineData;
    },

    /**
     * 現在の機種データを取得
     */
    getMachineData() {
        return this.machineData;
    },

    /**
     * インデックス指定で機種を取得
     */
    getMachineByIndex(index) {
        return this.machineData[index] || null;
    }
};
