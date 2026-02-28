// ユーティリティ関数群
function formatCurrency(amount) {
    const absAmount = Math.abs(amount);
    const formatted = new Intl.NumberFormat('ja-JP').format(absAmount);
    return amount < 0 ? `￥-${formatted}` : `￥+${formatted}`;
}

function formatSpinValue(value) {
    const absValue = Math.abs(value);
    const formatted = absValue.toFixed(2);
    return value < 0 ? `￥-${formatted}` : `￥+${formatted}`;
}

// 引用符付きCSVを正しくパースする関数 (セル内改行・カンマ対応)
function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"' && text[i + 1] === '"') {
                cell += '"';
                i++;
            } else if (c === '"') {
                inQuotes = false;
            } else {
                cell += c;
            }
        } else {
            if (c === '"') {
                inQuotes = true;
            } else if (c === ',') {
                row.push(cell);
                cell = '';
            } else if (c === '\n' || (c === '\r' && text[i + 1] === '\n')) {
                if (c === '\r') i++;
                row.push(cell);
                cell = '';
                rows.push(row);
                row = [];
            } else if (c === '\r') {
                row.push(cell);
                cell = '';
                rows.push(row);
                row = [];
            } else {
                cell += c;
            }
        }
    }
    if (cell || row.length > 0) {
        row.push(cell);
        rows.push(row);
    }
    return rows;
}

function formatHistoryDate(timestamp) {
    const d = new Date(timestamp);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const h = d.getHours();
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}/${m}/${dd} - ${h}:${mm}`;
}
