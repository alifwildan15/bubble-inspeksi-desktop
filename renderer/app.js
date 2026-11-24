/* Bubble Inspeksi — renderer (Electron).
   Upload PDF, klik untuk pasang bubble bernomor otomatis, ekspor ke PDF. */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const viewer = $('viewer');
  const pageWrap = $('pageWrap');
  const canvas = $('pdfCanvas');
  const overlay = $('overlay');
  const emptyState = $('emptyState');
  const toastEl = $('toast');

  const api = window.electronAPI || null;
  const Store = window.BubbleStore;
  const Exporter = window.BubbleExport;
  const pdfjsLib = window.pdfjsLib;
  pdfjsLib.GlobalWorkerOptions.workerSrc = '../node_modules/pdfjs-dist/build/pdf.worker.js';

  const store = Store.createStore();
  let pdfDoc = null;
  let pdfBytes = null;
  let fileName = '';
  let totalPages = 0;
  let currentPage = 1;
  let scale = 1;
  let mode = 'add'; // 'add' | 'move'
  let bubbleSize = 28;
  let bubbleColor = '#d32f2f';
  let selectedId = null;
  let renderTask = null;
  let toastTimer = null;

  const MIN_SCALE = 0.25;
  const MAX_SCALE = 4;

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 3500);
  }

  /* ---------- penyimpanan otomatis ---------- */
  function storageKey() {
    return 'bubble-inspeksi:' + fileName;
  }
  function autosave() {
    if (!fileName) return;
    try {
      const data = Store.serialize(store);
      data.bubbleSize = bubbleSize;
      data.bubbleColor = bubbleColor;
      localStorage.setItem(storageKey(), JSON.stringify(data));
    } catch (e) { /* penyimpanan penuh / tidak tersedia: abaikan */ }
  }
  function autoload() {
    if (!fileName) return 0;
    try {
      const raw = localStorage.getItem(storageKey());
      if (!raw) return 0;
      const data = JSON.parse(raw);
      const restored = Store.deserialize(data);
      store.bubbles = restored.bubbles;
      store.nomorAwal = restored.nomorAwal;
      store.prefix = restored.prefix;
      if (data.bubbleSize) bubbleSize = data.bubbleSize;
      if (data.bubbleColor) bubbleColor = data.bubbleColor;
      $('inpStart').value = store.nomorAwal;
      $('inpPrefix').value = store.prefix;
      $('inpSize').value = bubbleSize;
      $('inpColor').value = bubbleColor;
      return store.bubbles.length;
    } catch (e) {
      return 0;
    }
  }

  /* ---------- muat PDF ---------- */
  async function loadPdf(data, name) {
    try {
      pdfBytes = new Uint8Array(data);
      pdfDoc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
      totalPages = pdfDoc.numPages;
      fileName = name;
      currentPage = 1;
      selectedId = null;
      const restored = autoload();
      $('fileName').textContent = name;
      $('btnExport').disabled = false;
      $('btnClear').disabled = store.bubbles.length === 0;
      emptyState.hidden = true;
      pageWrap.hidden = false;
      fitToWidth();
      if (restored > 0) toast(restored + ' bubble tersimpan sebelumnya dipulihkan.');
    } catch (e) {
      toast('Gagal membuka PDF: ' + e.message);
    }
  }

  async function openPdfDialog() {
    if (!api) { toast('Buka PDF hanya tersedia di aplikasi desktop.'); return; }
    const res = await api.openPdf();
    if (res.canceled) return;
    loadPdf(res.data, res.fileName);
  }

  /* ---------- render halaman ---------- */
  function pageViewport(pageNum, s) {
    return pdfDoc.getPage(pageNum).then((page) => page.getViewport({ scale: s }));
  }

  async function renderPage() {
    if (!pdfDoc) return;
    const dpr = window.devicePixelRatio || 1;
    const page = await pdfDoc.getPage(currentPage);
    const viewport = page.getViewport({ scale: scale * dpr });
    if (renderTask) { try { renderTask.cancel(); } catch (e) { /* abaikan */ } }
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.style.width = Math.floor(viewport.width / dpr) + 'px';
    canvas.style.height = Math.floor(viewport.height / dpr) + 'px';
    pageWrap.style.width = canvas.style.width;
    pageWrap.style.height = canvas.style.height;
    const ctx = canvas.getContext('2d');
    renderTask = page.render({ canvasContext: ctx, viewport });
    try { await renderTask.promise; } catch (e) { /* render dibatalkan oleh render baru */ }
    renderTask = null;
    $('pageLabel').textContent = currentPage + ' / ' + totalPages;
    $('pagePrev').disabled = currentPage <= 1;
    $('pageNext').disabled = currentPage >= totalPages;
    drawBubbles();
    updateStats();
  }

  function setScale(next, anchor) {
    const old = scale;
    scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    syncZoomUI();
    if (anchor && pdfDoc) {
      const rect = pageWrap.getBoundingClientRect();
      const fx = (anchor.clientX - rect.left) / rect.width;
      const fy = (anchor.clientY - rect.top) / rect.height;
      renderPage().then(() => {
        const r2 = pageWrap.getBoundingClientRect();
        viewer.scrollLeft += r2.width * fx - (anchor.clientX - viewer.getBoundingClientRect().left);
        viewer.scrollTop += r2.height * fy - (anchor.clientY - viewer.getBoundingClientRect().top);
      });
    } else {
      renderPage();
    }
    void old;
  }

  function syncZoomUI() {
    $('zoomLabel').textContent = Math.round(scale * 100) + '%';
    $('zoomSlider').value = Math.round(scale * 100);
  }

  async function fitToWidth() {
    if (!pdfDoc) return;
    const page = await pdfDoc.getPage(currentPage);
    const vp = page.getViewport({ scale: 1 });
    const avail = viewer.clientWidth - 48;
    scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, avail / vp.width));
    syncZoomUI();
    renderPage();
  }

  /* ---------- bubble di layar ---------- */
  function drawBubbles() {
    overlay.innerHTML = '';
    overlay.classList.toggle('add-mode', mode === 'add');
    const entries = Store.byPage(store, currentPage);
    for (const { bubble, index } of entries) {
      const el = document.createElement('div');
      el.className = 'bubble' + (bubble.id === selectedId ? ' selected' : '');
      el.dataset.id = bubble.id;
      el.style.left = bubble.x * 100 + '%';
      el.style.top = bubble.y * 100 + '%';
      el.style.width = bubbleSize + 'px';
      el.style.height = bubbleSize + 'px';
      el.style.borderColor = bubble.color;
      el.style.color = bubble.color;
      el.style.fontSize = Math.max(11, Math.round(bubbleSize * 0.45)) + 'px';
      el.textContent = Store.label(store, index);
      el.title = 'Bubble ' + Store.label(store, index) + ' — hal. ' + bubble.page;
      overlay.appendChild(el);
    }
    renderList();
  }

  function renderList() {
    const list = $('bubbleList');
    list.innerHTML = '';
    store.bubbles.forEach((b, i) => {
      const li = document.createElement('li');
      if (b.id === selectedId) li.classList.add('selected');
      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = Store.label(store, i);
      const pg = document.createElement('span');
      pg.className = 'pg';
      pg.textContent = 'hal. ' + b.page;
      const spacer = document.createElement('span');
      spacer.className = 'spacer';
      li.append(num, pg, spacer);
      const mkBtn = (text, title, fn) => {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.title = title;
        btn.addEventListener('click', (ev) => { ev.stopPropagation(); fn(); });
        return btn;
      };
      li.append(
        mkBtn('↑', 'Naik (nomor berubah)', () => { Store.move(store, b.id, -1); afterChange(); }),
        mkBtn('↓', 'Turun (nomor berubah)', () => { Store.move(store, b.id, 1); afterChange(); }),
        mkBtn('Ke Hal.', 'Lompat ke halaman bubble ini', () => { gotoPage(b.page, b.id); }),
        mkBtn('Hapus', 'Hapus bubble ini', () => { Store.remove(store, b.id); if (selectedId === b.id) selectedId = null; afterChange(); })
      );
      li.addEventListener('click', () => { gotoPage(b.page, b.id); });
      list.appendChild(li);
    });
    $('btnClear').disabled = store.bubbles.length === 0;
  }

  function updateStats() {
    const onPage = Store.byPage(store, currentPage).length;
    $('statCount').textContent = '· ' + store.bubbles.length + ' bubble (' + onPage + ' di hal. ini)';
  }

  function afterChange() {
    autosave();
    drawBubbles();
    updateStats();
  }

  function gotoPage(page, selectId) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    if (selectId !== undefined) selectedId = selectId;
    renderPage();
  }

  /* ---------- interaksi: klik, geser, pinch ---------- */
  function pointFractions(ev) {
    const rect = pageWrap.getBoundingClientRect();
    return {
      x: Math.min(0.98, Math.max(0.02, (ev.clientX - rect.left) / rect.width)),
      y: Math.min(0.98, Math.max(0.02, (ev.clientY - rect.top) / rect.height)),
    };
  }

  overlay.addEventListener('pointerdown', (ev) => {
    if (ev.target.classList.contains('bubble')) return; // ditangani di bubble
    if (mode === 'add' && pdfDoc) {
      const p = pointFractions(ev);
      const b = Store.add(store, currentPage, p.x, p.y, bubbleColor);
      selectedId = b.id;
      afterChange();
    } else {
      selectedId = null;
      drawBubbles();
    }
  });

  overlay.addEventListener('pointerdown', (ev) => {
    const target = ev.target.closest('.bubble');
    if (!target) return;
    const id = Number(target.dataset.id);
    const bubble = store.bubbles.find((b) => b.id === id);
    if (!bubble) return;
    selectedId = id;
    drawBubbles();
    ev.preventDefault();
    target.setPointerCapture(ev.pointerId);
    target.classList.add('dragging');
    const start = pointFractions(ev);
    const orig = { x: bubble.x, y: bubble.y };
    let moved = false;
    const onMove = (me) => {
      const p = pointFractions(me);
      const dx = p.x - start.x;
      const dy = p.y - start.y;
      if (Math.abs(dx) > 0.004 || Math.abs(dy) > 0.004) moved = true;
      bubble.x = Math.min(0.98, Math.max(0.02, orig.x + dx));
      bubble.y = Math.min(0.98, Math.max(0.02, orig.y + dy));
      target.style.left = bubble.x * 100 + '%';
      target.style.top = bubble.y * 100 + '%';
    };
    const onUp = () => {
      target.classList.remove('dragging');
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('pointercancel', onUp);
      if (moved) afterChange();
    };
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onUp);
  });

  // Pinch-to-zoom (layar sentuh) + Ctrl+scroll untuk zoom.
  const pointers = new Map();
  let pinchStart = null;
  overlay.addEventListener('pointerdown', (ev) => {
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pointers.size === 2) {
      const pts = [...pointers.values()];
      pinchStart = { dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), scale };
    }
  });
  overlay.addEventListener('pointermove', (ev) => {
    if (!pointers.has(ev.pointerId)) return;
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pointers.size === 2 && pinchStart) {
      const pts = [...pointers.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (dist > 0 && pinchStart.dist > 0) setScale(pinchStart.scale * (dist / pinchStart.dist));
    }
  });
  const endPointer = (ev) => {
    pointers.delete(ev.pointerId);
    if (pointers.size < 2) pinchStart = null;
  };
  overlay.addEventListener('pointerup', endPointer);
  overlay.addEventListener('pointercancel', endPointer);

  viewer.addEventListener('wheel', (ev) => {
    if (!ev.ctrlKey || !pdfDoc) return;
    ev.preventDefault();
    setScale(scale * (ev.deltaY < 0 ? 1.12 : 1 / 1.12), ev);
  }, { passive: false });

  /* ---------- toolbar ---------- */
  $('btnOpen').addEventListener('click', openPdfDialog);
  $('btnExport').addEventListener('click', exportPdf);
  $('modeAdd').addEventListener('click', () => setMode('add'));
  $('modeMove').addEventListener('click', () => setMode('move'));
  $('zoomIn').addEventListener('click', () => setScale(scale * 1.25));
  $('zoomOut').addEventListener('click', () => setScale(scale / 1.25));
  $('zoomFit').addEventListener('click', fitToWidth);
  $('zoomSlider').addEventListener('input', (ev) => setScale(Number(ev.target.value) / 100));
  $('pagePrev').addEventListener('click', () => gotoPage(currentPage - 1));
  $('pageNext').addEventListener('click', () => gotoPage(currentPage + 1));
  $('btnClear').addEventListener('click', () => {
    if (!store.bubbles.length) return;
    if (!window.confirm('Hapus semua ' + store.bubbles.length + ' bubble?')) return;
    store.bubbles = [];
    selectedId = null;
    afterChange();
  });

  function setMode(next) {
    mode = next;
    $('modeAdd').classList.toggle('active', mode === 'add');
    $('modeMove').classList.toggle('active', mode === 'move');
    overlay.classList.toggle('add-mode', mode === 'add');
  }

  $('inpStart').addEventListener('change', (ev) => {
    const v = parseInt(ev.target.value, 10);
    if (Number.isFinite(v) && v >= 1) { store.nomorAwal = v; afterChange(); }
    else ev.target.value = store.nomorAwal;
  });
  $('inpPrefix').addEventListener('change', (ev) => {
    store.prefix = ev.target.value;
    afterChange();
  });
  $('inpSize').addEventListener('change', (ev) => {
    const v = parseInt(ev.target.value, 10);
    if (Number.isFinite(v) && v >= 16 && v <= 64) { bubbleSize = v; afterChange(); }
    else ev.target.value = bubbleSize;
  });
  $('inpColor').addEventListener('change', (ev) => { bubbleColor = ev.target.value; });

  document.addEventListener('keydown', (ev) => {
    if ((ev.key === 'Delete' || ev.key === 'Backspace') && selectedId !== null) {
      const tag = (document.activeElement || {}).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      Store.remove(store, selectedId);
      selectedId = null;
      afterChange();
    }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'o') { ev.preventDefault(); openPdfDialog(); }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'e') { ev.preventDefault(); exportPdf(); }
  });

  /* ---------- drag & drop ---------- */
  window.addEventListener('dragover', (ev) => ev.preventDefault());
  window.addEventListener('drop', async (ev) => {
    ev.preventDefault();
    const file = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
    if (!file) return;
    if (!/\.pdf$/i.test(file.name)) { toast('File harus PDF.'); return; }
    const buf = await file.arrayBuffer();
    loadPdf(buf, file.name);
  });

  /* ---------- ekspor ---------- */
  async function exportPdf() {
    if (!pdfDoc || !pdfBytes) { toast('Buka PDF dulu.'); return; }
    const btn = $('btnExport');
    btn.disabled = true;
    btn.textContent = 'Mengekspor...';
    try {
      const labeled = store.bubbles.map((b, i) => ({
        page: b.page, x: b.x, y: b.y,
        label: Store.label(store, i), colorHex: b.color,
      }));
      const out = await Exporter.exportWithBubbles(pdfBytes, labeled, {
        diameterPt: bubbleSize * 0.75,
      });
      const base = fileName.replace(/\.pdf$/i, '');
      const saveName = base + '-bubble.pdf';
      if (api) {
        const res = await api.savePdf(saveName);
        if (res.canceled) { toast('Ekspor dibatalkan.'); return; }
        await api.writeFile(res.filePath, out);
        toast('PDF hasil tersimpan: ' + res.filePath);
      } else {
        const blob = new Blob([out], { type: 'application/pdf' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = saveName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        toast('PDF hasil diunduh: ' + saveName);
      }
    } catch (e) {
      toast('Gagal ekspor: ' + e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Ekspor PDF';
    }
  }

  /* ---------- menu dari main process ---------- */
  if (api) {
    api.onMenuOpen(() => openPdfDialog());
    api.onMenuExport(() => exportPdf());
    api.onMenuZoomIn(() => setScale(scale * 1.25));
    api.onMenuZoomOut(() => setScale(scale / 1.25));
    api.onMenuZoomFit(() => fitToWidth());
  }

  window.addEventListener('resize', () => { if (pdfDoc) renderPage(); });
})();
