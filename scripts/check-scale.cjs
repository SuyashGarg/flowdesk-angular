// Dependency-free regression checks against the actual transpiled source.
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
function load(file, imports, extras = {}) {
  const context = { exports: {}, require: name => { if (!(name in imports)) throw Error(name); return imports[name]; }, ...extras };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true } }).outputText, context);
  return context.exports;
}
const signal = initial => { let value = initial; const s = () => value; s.set = v => value = v; s.update = fn => value = fn(value); s.asReadonly = () => () => value; return s; };
const core = { signal, computed: fn => fn, effect: () => {}, inject: () => ({ list: async () => data }), Injectable: () => klass => klass, Component: () => klass => klass, ChangeDetectionStrategy: { OnPush: 0 }, DestroyRef: Symbol() };
const data = Array.from({ length: 1500 }, (_, i) => ({ id: `REQ-${2000+i}`, title: `Request ${i}`, category: ['Software', 'Travel', 'Equipment'][i%3], amount: i+1, requester: i%2 ? 'You' : 'Sam Lee', createdAt: new Date(Date.UTC(2026, 0, 1+i%300)).toISOString(), status: ['Pending', 'Approved', 'Rejected'][i%3], description: 'A detailed business justification.', history: [{at: '2026-01-01', action: 'Submitted', by: 'You'}] }));
const { RequestStore } = load('src/app/request.store.ts', { '@angular/core': core, './request.api': {} });
const store = new RequestStore();
store.itemsState.set(data);
const { paginate } = load('src/app/pagination.ts', {});
let timer;
core.inject = token => token === core.DestroyRef ? {onDestroy: () => {}} : store;
const { AppComponent } = load('src/app/app.component.ts', { '@angular/core': core, '@angular/common': {}, '@angular/forms': {}, '@angular/material/button': {}, '@angular/material/form-field': {}, '@angular/material/input': {}, '@angular/material/select': {}, '@angular/material/checkbox': {}, '@angular/material/progress-bar': {}, './request.store': { RequestStore }, './pagination': { paginate }, './dialog-focus.directive': {}, './request-form.component': {} }, { setTimeout: fn => { timer = fn; return 1; }, clearTimeout: () => { timer = undefined; } });
const app = new AppComponent();
assert.equal(app.requestPage().rows.length, 25);
assert.equal(app.requestPage().pageCount, 60);
const ids = new Set();
for (let page = 1; page <= 60; page++) { app.changePage(page); for (const row of app.requestPage().rows) ids.add(row.id); }
assert.equal(ids.size, 1500, 'Every request is reachable without duplicates');
store.categoryFilter.set('Software'); assert.equal(app.requestPage().page, 1);
app.changePage(10); store.onlyMine.set(true); assert.equal(app.requestPage().page, 1);
assert.equal(app.requestPage().total, 250);
app.setPageSize(100); assert.equal(app.requestPage().rows.length, 100);
app.changePage(3); assert.equal(app.requestPage().rows.length, 50);
app.search('no such request'); assert.equal(store.query(), '', 'Search waits for debounce');
timer(); assert.equal(app.requestPage().total, 0); assert.equal(app.requestPage().start, 0); assert.equal(app.requestPage().page, 1);
app.search('stale'); app.navigate('requests'); assert.equal(timer, undefined, 'Navigation cancels pending search'); assert.equal(app.searchText(), '');
assert.equal(app.activityPage().rows.length, 25); app.activityPageIndex.set(60); assert.equal(app.activityPage().rows.length, 25);
assert.equal(paginate(data.slice(0, 26), 2, 25).rows.length, 1);
assert.equal(paginate(data.slice(0, 25), 2, 25).page, 1, 'Result shrink clamps page');
const start = performance.now();
for (let i = 0; i < 100; i++) paginate(store.filtered(), 10, 25);
console.log('Passed 1,500-request checks: all pages, filters, sizes, empty results, search debounce/cancellation, activity bounds, page clamping.');
console.log(`100 filter/sort/page operations: ${(performance.now()-start).toFixed(1)} ms (Node smoke measurement, not a browser benchmark).`);
