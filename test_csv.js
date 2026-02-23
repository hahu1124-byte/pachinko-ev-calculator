const fs = require('fs');
const https = require('https');
const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTg_z1H5K62_019noNiZnxtSTOafCW4c5y4BghW62nHmOTneMx4JzVycIXAXHTdF9vxYSOjcnu7u3BK/pub?gid=493752965&single=true&output=csv';
https.get(url, (res) => {
    let rawData = '';
    res.on('data', (c) => rawData += c);
    res.on('end', () => {
        const rows = rawData.split('\n').map(r => r.split(','));
        const names = rows[0];
        const yutimes = rows[5];
        console.log('Row 0 length:', names.length);
        console.log('Row 5 length:', yutimes.length);
        console.log('Index 1 Name:', names[1]);
        console.log('Index 1 Yutime (row 5):', yutimes[1]);
        console.log('Index 1 Yutime (row 6):', rows[6] ? rows[6][1] : 'null');
    });
});
