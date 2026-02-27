/**
 * 設定管理マネージャー
 */

const STORAGE_KEY_SETTINGS = 'pachinkoSettings';
const STORAGE_KEY_HISTORY = 'pachinkoHistory';
const STORAGE_KEY_MACHINES = 'pachinkoMachineData';
const SESSION_KEY_CHECKED_IDS = 'checkedHistoryIds';

const SettingsManager = {
    // 基本設定の保存
    saveSettings(config) {
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(config));
    },

    // 基本設定の読み込み
    loadSettings() {
        const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse settings", e);
            }
        }
        return null;
    },

    // 履歴の保存
    saveHistory(historyData) {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(historyData));
    },

    // 履歴の読み込み
    loadHistory() {
        const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse history", e);
            }
        }
        return [];
    },

    // チェック状態の保存
    saveCheckedIds(ids) {
        sessionStorage.setItem(SESSION_KEY_CHECKED_IDS, JSON.stringify(ids));
    },

    // チェック状態の読み込み
    loadCheckedIds() {
        return JSON.parse(sessionStorage.getItem(SESSION_KEY_CHECKED_IDS) || '[]');
    },

    // キャッシュされた機種データの取得
    getParametricMachines() {
        const saved = localStorage.getItem(STORAGE_KEY_MACHINES);
        return saved ? JSON.parse(saved) : null;
    },

    // 機種データのキャッシュ保存
    saveParametricMachines(data) {
        localStorage.setItem(STORAGE_KEY_MACHINES, JSON.stringify(data));
    }
};
