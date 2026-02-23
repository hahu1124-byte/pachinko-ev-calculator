const fs = require('fs');

const appjs = fs.readFileSync('app.js', 'utf8');

const mocks = `
const document = {
  addEventListener: (e, cb) => { if (e === 'DOMContentLoaded') setTimeout(cb, 10); },
  querySelectorAll: () => [],
  getElementById: (id) => {
    return {
      id,
      addEventListener: () => {},
      classList: { add: () => {}, remove: () => {} },
      appendChild: () => {},
      options: [],
      value: "4"
    };
  },
  querySelector: () => ({ value: "4" }),
  createElement: () => ({})
};
const window = { document };
const localStorage = { getItem: () => null, setItem: () => {} };
const alert = console.log;
const confirm = () => false;

const fetch = function(url) {
  console.log('[MOCK] Fetching:', url);
  return Promise.resolve({
    status: 200,
    text: () => {
      console.log('[MOCK] text() called');
      return Promise.resolve('"", "P大海物語5"\\n"大当たり確率", "319.6"\\n"仮定RB", "140"\\n"遊抜けor右打ち継続率", "0"\\n"トータル確率", "31.9"\\n"遊タイム突入回転数", "950"\\n"",""\\n"",""\\n"",""\\n"",""\\n"平均連荘", "3.011"\\n"",""\\n"",""\\n"",""\\n"",""\\n"遊タイム回数", "350"');
    }
  });
};
`;

try {
    eval(mocks + appjs);
    console.log('Eval successful');
} catch (e) {
    console.log('Eval Error:', e);
}
