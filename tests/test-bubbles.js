const test = require('node:test');
const assert = require('node:assert/strict');
const BubbleStore = require('../renderer/bubbles.js');

test('penomoran otomatis berurutan', () => {
  const s = BubbleStore.createStore();
  BubbleStore.add(s, 1, 0.1, 0.2);
  BubbleStore.add(s, 1, 0.3, 0.4);
  BubbleStore.add(s, 2, 0.5, 0.5);
  assert.deepEqual(BubbleStore.labels(s), ['1', '2', '3']);
});

test('nomor awal dan awalan', () => {
  const s = BubbleStore.createStore();
  s.nomorAwal = 10;
  s.prefix = 'B-';
  BubbleStore.add(s, 1, 0.1, 0.2);
  BubbleStore.add(s, 1, 0.3, 0.4);
  assert.deepEqual(BubbleStore.labels(s), ['B-10', 'B-11']);
});

test('hapus menomori ulang', () => {
  const s = BubbleStore.createStore();
  const a = BubbleStore.add(s, 1, 0.1, 0.2);
  BubbleStore.add(s, 1, 0.3, 0.4);
  BubbleStore.add(s, 1, 0.5, 0.5);
  assert.equal(BubbleStore.remove(s, a.id), true);
  assert.deepEqual(BubbleStore.labels(s), ['1', '2']);
  assert.equal(BubbleStore.remove(s, 99999), false);
});

test('urutkan ulang mengubah nomor', () => {
  const s = BubbleStore.createStore();
  const a = BubbleStore.add(s, 1, 0.1, 0.2);
  const b = BubbleStore.add(s, 1, 0.3, 0.4);
  const c = BubbleStore.add(s, 1, 0.5, 0.5);
  assert.equal(BubbleStore.move(s, c.id, -1), true);
  assert.deepEqual(s.bubbles.map((x) => x.id), [a.id, c.id, b.id]);
  assert.deepEqual(BubbleStore.labels(s), ['1', '2', '3']);
  assert.equal(BubbleStore.move(s, a.id, -1), false); // sudah paling atas
  assert.equal(BubbleStore.move(s, b.id, 1), false); // sudah paling bawah
});

test('byPage hanya halaman itu', () => {
  const s = BubbleStore.createStore();
  BubbleStore.add(s, 1, 0.1, 0.2);
  BubbleStore.add(s, 2, 0.3, 0.4);
  BubbleStore.add(s, 1, 0.5, 0.5);
  assert.equal(BubbleStore.byPage(s, 1).length, 2);
  assert.equal(BubbleStore.byPage(s, 2).length, 1);
  assert.equal(BubbleStore.byPage(s, 3).length, 0);
});

test('serialize dan deserialize pulih', () => {
  const s = BubbleStore.createStore();
  s.nomorAwal = 5;
  s.prefix = 'X';
  BubbleStore.add(s, 2, 0.25, 0.75, '#1565c0');
  const data = BubbleStore.serialize(s);
  const s2 = BubbleStore.deserialize(data);
  assert.deepEqual(BubbleStore.labels(s2), ['X5']);
  assert.equal(s2.bubbles[0].color, '#1565c0');
  assert.equal(s2.bubbles[0].page, 2);
});
