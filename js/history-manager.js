/**
 * 履歴操作・管理マネージャー
 */

const HistoryManager = {
    historyData: [],

    /**
     * 履歴を初期化
     */
    init() {
        this.historyData = SettingsManager.loadHistory();
        return this.historyData;
    },

    /**
     * 履歴を追加
     */
    addEntry(entry) {
        this.historyData.unshift(entry);
        SettingsManager.saveHistory(this.historyData);
        return this.historyData;
    },

    /**
     * 指定されたIDの履歴を削除
     */
    deleteEntries(selectedIds) {
        const deletedItems = this.historyData.filter(item => selectedIds.includes(item.id));
        if (deletedItems.length > 0) {
            SettingsManager.saveDeletedBackup(deletedItems);
            this.historyData = this.historyData.filter(item => !selectedIds.includes(item.id));
            SettingsManager.saveHistory(this.historyData);
        }
        return this.historyData;
    },

    /**
     * バックアップから履歴を復旧
     */
    restoreEntries() {
        const backup = SettingsManager.loadDeletedBackup();
        if (backup && backup.length > 0) {
            const existingIds = this.historyData.map(h => h.id);
            const toRestore = backup.filter(item => !existingIds.includes(item.id));
            this.historyData = [...toRestore, ...this.historyData];
            this.historyData.sort((a, b) => b.id - a.id);
            SettingsManager.saveHistory(this.historyData);
            SettingsManager.saveDeletedBackup([]);
        }
        return this.historyData;
    },

    /**
     * 全ての履歴データを取得
     */
    getHistoryData() {
        return this.historyData;
    },

    /**
     * 指定レートの履歴が存在するか確認
     */
    getAvailableRates() {
        return Array.from(new Set(this.historyData.map(item => item.playRate || 4))).sort((a, b) => b - a);
    }
};
