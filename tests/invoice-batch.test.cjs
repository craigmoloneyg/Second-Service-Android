const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { JSDOM } = require('jsdom');
const script = readFileSync('app/src/main/assets/invoice-batch.js', 'utf8');

function setup(count = 1, url = 'https://second-service-profit-intelligence.craig-moloneyg.workers.dev/') {
  const dom = new JSDOM(`<div class="logo">SECOND SERVICE<small>PROFIT INTELLIGENCE</small></div>
    <a href="/admin">Venues</a><span id="aiStatus">Ready</span><div><input id="invoiceFile" type="file">
    <button id="analyseInvoiceBtn">Analyse invoice</button></div><div id="invoiceResult"></div>`, {url, runScripts: 'outside-only'});
  const w = dom.window;
  const input = w.document.getElementById('invoiceFile');
  let files = Array.from({length: count}, (_, i) => new w.File(['invoice'], `invoice-${i + 1}.pdf`, {type: 'application/pdf'}));
  Object.defineProperty(input, 'files', {get: () => files});
  Object.defineProperty(input, 'value', {set: value => { if (value === '') files = []; }});
  let oldCalls = 0;
  w.document.getElementById('analyseInvoiceBtn').addEventListener('click', () => oldCalls++);
  w.fetch = async () => ({ok: true, json: async () => ({saved: true, supplier_or_source: 'Supplier', line_items: []})});
  w.eval(script);
  return {dom, w, input, get oldCalls() {return oldCalls;}, button: w.document.getElementById('analyseInvoiceBtn'),
    setFiles: value => {files = value;}, start() {this.button.click();}};
}
async function settle(s) {
  for (let i = 0; i < 1000; i++) {
    if (!s.w.invoiceBatchState.running) return;
    await new Promise(resolve => setImmediate(resolve));
  }
  throw new Error('Batch did not finish');
}

test('50 invoices upload once each, sequentially, with one menu refresh and no old handler', async () => {
  const s = setup(50);
  let active = 0, maximum = 0, ingredients = 0, recipes = 0;
  const requests = [];
  s.w.loadIngredients = async () => ingredients++;
  s.w.loadRecipes = async () => recipes++;
  s.w.fetch = async (url, request) => {
    active++; maximum = Math.max(maximum, active);
    requests.push({url, request});
    await new Promise(resolve => setImmediate(resolve));
    active--;
    return {ok: true, json: async () => ({saved: true, line_items: []})};
  };
  s.start(); s.start();
  assert.equal(s.input.disabled, true);
  await settle(s);
  assert.equal(requests.length, 50);
  assert.equal(maximum, 1);
  assert.equal(requests[49].request.headers['X-Filename'], 'invoice-50.pdf');
  assert.ok(requests.every(x => x.url === '/api/invoice/extract' && x.request.method === 'POST' && x.request.body instanceof s.w.File));
  assert.equal(s.oldCalls, 0);
  assert.equal(ingredients, 1); assert.equal(recipes, 1);
  assert.match(s.w.document.getElementById('invoiceResult').textContent, /50 of 50 processed/);
  assert.equal(s.input.files.length, 0);
  s.start(); await settle(s);
  assert.equal(requests.length, 50);
  s.dom.window.close();
});

test('51 files and an empty selection never send a request', () => {
  for (const count of [0, 51]) {
    const s = setup(count);
    let calls = 0; s.w.fetch = () => calls++;
    s.start();
    assert.equal(calls, 0);
    assert.equal(s.w.invoiceBatchState.running, false);
    s.dom.window.close();
  }
});

test('one failed extraction does not stop later invoices or retry failed submissions', async () => {
  const s = setup(3);
  let calls = 0;
  s.w.fetch = async () => {
    calls++;
    if (calls === 2) throw new Error('Connection lost');
    return {ok: true, json: async () => ({saved: true})};
  };
  s.start(); await settle(s);
  assert.equal(calls, 3);
  assert.match(s.w.document.getElementById('invoiceResult').textContent, /2 extracted · 2 saved · 1 need attention/);
  assert.match(s.w.document.getElementById('invoiceResult').textContent, /Check purchasing history before retrying/);
  s.dom.window.close();
});

test('stopping finishes the in-flight invoice and does not upload remaining files', async () => {
  const s = setup(3);
  let resolve, calls = 0;
  s.w.fetch = () => {calls++; return new Promise(done => {resolve = done;});};
  s.start();
  s.button.nextElementSibling.click();
  resolve({ok: true, json: async () => ({saved: true})});
  await settle(s);
  assert.equal(calls, 1);
  assert.match(s.w.document.getElementById('aiStatus').textContent, /Stopped/);
  assert.match(s.w.document.getElementById('invoiceResult').textContent, /Not uploaded — batch stopped/);
  s.dom.window.close();
});

test('unsupported files stay local and supplier text cannot inject markup', async () => {
  const s = setup(1);
  s.setFiles([new s.w.File(['bad'], 'script.exe'), new s.w.File(['pdf'], 'invoice.pdf')]);
  let calls = 0;
  s.w.fetch = async () => {calls++; return {ok: true, json: async () => ({saved: true, supplier_or_source: '<img src=x onerror=alert(1)>', line_items: [{description: '<script>evil</script>'}]})};};
  s.start(); await settle(s);
  assert.equal(calls, 1);
  assert.equal(s.w.document.querySelector('#invoiceResult img, #invoiceResult script'), null);
  assert.match(s.w.document.getElementById('invoiceResult').textContent, /<img/);
  s.dom.window.close();
});

test('installation is idempotent and never modifies an external origin', () => {
  const s = setup();
  s.w.eval(script);
  assert.equal(s.w.document.querySelectorAll('button').length, 2);
  assert.equal(s.input.multiple, true);
  assert.match(s.w.document.querySelector('.logo').textContent, /VENUE MARGIN/);
  s.dom.window.close();
  const outside = setup(1, 'https://example.com/');
  assert.equal(outside.input.multiple, false);
  assert.equal(outside.w.invoiceBatchState, undefined);
  outside.dom.window.close();
});
