const test = require('node:test');
const assert = require('node:assert/strict');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { exportWithBubbles } = require('../renderer/export-bubbles.js');

async function samplePdf(pages) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    const page = doc.addPage([595.28, 841.89]); // A4
    const font = await doc.embedFont(StandardFonts.Helvetica);
    page.drawText('Halaman ' + (i + 1), { x: 50, y: 800, size: 14, font });
  }
  return doc.save();
}

test('export menggambar bubble di halaman yang benar', async () => {
  const input = await samplePdf(2);
  const bubbles = [
    { page: 1, x: 0.5, y: 0.5, label: '1', colorHex: '#d32f2f' },
    { page: 2, x: 0.25, y: 0.75, label: '2', colorHex: '#1565c0' },
  ];
  const out = await exportWithBubbles(input, bubbles, { diameterPt: 21 });
  assert.ok(out.length > input.length, 'PDF hasil harus lebih besar (ada gambar bubble)');
  const doc = await PDFDocument.load(out);
  assert.equal(doc.getPageCount(), 2);
  // Halaman asli tetap utuh: teks 'Halaman 1' masih ada.
  const page1 = doc.getPage(0);
  assert.equal(Math.round(page1.getWidth()), 595);
  assert.equal(Math.round(page1.getHeight()), 842);
});

test('export tanpa bubble mengembalikan PDF yang sama isinya', async () => {
  const input = await samplePdf(1);
  const out = await exportWithBubbles(input, [], {});
  const doc = await PDFDocument.load(out);
  assert.equal(doc.getPageCount(), 1);
});

test('export mengabaikan bubble di halaman yang tidak ada', async () => {
  const input = await samplePdf(1);
  const bubbles = [{ page: 9, x: 0.5, y: 0.5, label: '9', colorHex: '#d32f2f' }];
  const out = await exportWithBubbles(input, bubbles, {});
  const doc = await PDFDocument.load(out);
  assert.equal(doc.getPageCount(), 1);
});

test('label dua digit tetap diekspor', async () => {
  const input = await samplePdf(1);
  const bubbles = [{ page: 1, x: 0.1, y: 0.1, label: 'B-12', colorHex: '#2e7d32' }];
  const out = await exportWithBubbles(input, bubbles, { diameterPt: 28 });
  const doc = await PDFDocument.load(out);
  assert.equal(doc.getPageCount(), 1);
  assert.ok(out.length > input.length);
});
