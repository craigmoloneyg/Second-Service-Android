const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { JSDOM } = require('jsdom');
const source = readFileSync('app/src/main/assets/welcome.js', 'utf8');
function setup(url = 'https://second-service-profit-intelligence.craig-moloneyg.workers.dev/') {
  const dom = new JSDOM('<div class="shell"><main class="main"><section id="invoice-processing"><input id="invoiceFile"></section><section id="menu-costing"></section></main></div>', {url, runScripts:'outside-only'});
  dom.window.HTMLElement.prototype.scrollIntoView = function() {};
  dom.window.eval(source);
  return dom;
}
test('home actions reveal existing invoice and menu forms without recreating their state', () => {
  const dom = setup(); const doc = dom.window.document;
  const input = doc.getElementById('invoiceFile'); input.value = 'preserved';
  assert.equal(doc.querySelector('.shell').hidden, true);
  doc.querySelector('.p2p-home [data-view=invoices]').click();
  assert.equal(doc.querySelector('.shell').hidden, false);
  assert.equal(doc.activeElement.id, 'invoice-processing');
  assert.equal(input.value, 'preserved');
  doc.querySelector('.p2p-bar [data-view=home]').click();
  assert.equal(doc.querySelector('.shell').hidden, true);
  doc.querySelector('.p2p-home [data-view=menu]').click();
  assert.equal(doc.activeElement.id, 'menu-costing');
  dom.window.close();
});
test('home navigation preserves a running batch so uploads continue', () => {
  const dom = setup(); const doc = dom.window.document;
  doc.querySelector('.p2p-home [data-view=invoices]').click();
  dom.window.invoiceBatchState = {running:true};
  doc.querySelector('.p2p-bar [data-view=home]').click();
  assert.equal(doc.querySelector('.shell').hidden, true);
  assert.equal(dom.window.invoiceBatchState.running, true);
  dom.window.close();
});
test('existing deep links stay visible, injection is idempotent and external sites are untouched', () => {
  const dom = setup('https://second-service-profit-intelligence.craig-moloneyg.workers.dev/#invoice-processing');
  assert.equal(dom.window.document.querySelector('.shell').hidden, false);
  dom.window.eval(source);
  assert.equal(dom.window.document.querySelectorAll('.p2p-bar').length, 1);
  dom.window.close();
  const external = setup('https://example.com');
  assert.equal(external.window.document.getElementById('p2p-home'), null);
  external.window.close();
});
