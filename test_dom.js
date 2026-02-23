const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('app.js', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously' });
const window = dom.window;
const document = window.document;
// mock fetch
window.fetch = () => Promise.reject(new Error('CORS'));
eval(js);
document.dispatchEvent(new window.Event('DOMContentLoaded'));
setTimeout(() => {
    try {
        document.getElementById('start-spin').value = 0;
        document.getElementById('current-spin').value = 200;
        document.getElementById('invest-cash').value = 10;
        document.getElementById('current-spin').dispatchEvent(new window.Event('input'));
    } catch(e) {
        console.error('Crash:', e);
    }
}, 500);
