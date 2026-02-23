const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const html = fs.readFileSync('index.html', 'utf8');
const dom = new JSDOM(html, { runScripts: "dangerously" });
const window = dom.window;

global.document = window.document;
global.window = window;
global.localStorage = { getItem: () => null, setItem: () => { } };
global.alert = console.log;
global.confirm = () => false;

const appjs = fs.readFileSync('app.js', 'utf8');

// replace fetch to mock
global.fetch = function (url) {
    console.log('[MOCK] Fetching:', url);
    return Promise.resolve({
        status: 200,
        text: () => Promise.resolve('"", "P大海物語5"\n"大当たり確率", "319.6"\n"仮定RB", "140"\n"遊抜け", "0"\n"トータル確率", "31.9"\n"遊タイム", "950"\n"",""\n"",""\n"",""\n"",""\n"平均連荘", "3.011"\n"",""\n"",""\n"",""\n"",""\n"遊タイム回数", "350"')
    });
};

try {
    window.eval(appjs);
} catch (e) {
    console.log('[EVAL ERROR]', e);
}

// wait for promises to resolve
setTimeout(() => {
    console.log('--- AFTER FETCH ---');
    const sel = document.getElementById('machine-select');
    console.log('Options count:', sel.options.length);
    for (let i = 0; i < Math.min(3, sel.options.length); i++) {
        console.log(`Option ${i}:`, sel.options[i].textContent);
    }
}, 1000);
