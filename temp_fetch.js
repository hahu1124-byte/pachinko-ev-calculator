const https = require('https');
function fetch(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}
(async () => {
    const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTg_z1H5K62_796u4Jr47n-XPfoOJIMbl3D0/gviz/tq?tqx=out:json&gid=493752965';
    try {
        const txt = await fetch(url);
        const jsonStr = txt.replace(/^google\.visualization\.Query\.setResponse\(/, '').replace(/\);$/, '');
        const data = JSON.parse(jsonStr);
        const rows = data.table.rows.map(r => r.c.map(c => (c && c.v !== undefined) ? c.v : ''));
        console.log('Rows count:', rows.length);
        console.log('First row sample:', rows[0].slice(0, 5));
        console.log('AvgChain row (10):', rows[10] ? rows[10].slice(0, 5) : null);
        console.log('YutimeSpinCount row (15):', rows[15] ? rows[15].slice(0, 5) : null);
    } catch (e) {
        console.error('Error:', e);
    }
})();
