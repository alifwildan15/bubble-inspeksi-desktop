/* Manajemen bubble: penomoran otomatis, urutkan ulang, hapus.
   Modul murni tanpa DOM, bisa diuji di Node.
   Bubble: { id, page, x, y } dengan x,y pecahan 0..1 dari ukuran halaman.
   Nomor tampil = prefix + (nomorAwal + indeks urutan). */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BubbleStore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  let nextId = 1;

  function createStore() {
    return { bubbles: [], nomorAwal: 1, prefix: '' };
  }

  function label(store, index) {
    return store.prefix + String(store.nomorAwal + index);
  }

  function labels(store) {
    return store.bubbles.map((_, i) => label(store, i));
  }

  function add(store, page, x, y, color) {
    const bubble = { id: nextId++, page, x, y, color: color || '#d32f2f' };
    store.bubbles.push(bubble);
    return bubble;
  }

  function remove(store, id) {
    const i = store.bubbles.findIndex((b) => b.id === id);
    if (i === -1) return false;
    store.bubbles.splice(i, 1);
    return true;
  }

  function move(store, id, direction) {
    const i = store.bubbles.findIndex((b) => b.id === id);
    if (i === -1) return false;
    const j = i + direction;
    if (j < 0 || j >= store.bubbles.length) return false;
    const tmp = store.bubbles[i];
    store.bubbles[i] = store.bubbles[j];
    store.bubbles[j] = tmp;
    return true;
  }

  function byPage(store, page) {
    return store.bubbles
      .map((b, i) => ({ bubble: b, index: i }))
      .filter((entry) => entry.bubble.page === page);
  }

  function serialize(store) {
    return {
      bubbles: store.bubbles.map((b) => ({ id: b.id, page: b.page, x: b.x, y: b.y, color: b.color })),
      nomorAwal: store.nomorAwal,
      prefix: store.prefix,
    };
  }

  function deserialize(data) {
    const store = createStore();
    store.nomorAwal = data.nomorAwal || 1;
    store.prefix = data.prefix || '';
    store.bubbles = (data.bubbles || []).map((b) => ({
      id: b.id, page: b.page, x: b.x, y: b.y, color: b.color || '#d32f2f',
    }));
    const maxId = store.bubbles.reduce((m, b) => Math.max(m, b.id), 0);
    nextId = Math.max(nextId, maxId + 1);
    return store;
  }

  return { createStore, label, labels, add, remove, move, byPage, serialize, deserialize };
});
