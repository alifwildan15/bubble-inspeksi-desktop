/* Gambar bubble nomor ke PDF hasil dengan pdf-lib.
   pdfBytes: isi file PDF asli (Uint8Array).
   bubbles: array { page (1-based), x, y (pecahan 0..1), label }.
   opts: { diameterPt, color } — diameter lingkaran dalam poin PDF,
         warna garis/teks sebagai [r, g, b] 0..1.
   Mengembalikan Uint8Array PDF baru. Murni, bisa diuji di Node. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BubbleExport = api;
})(typeof self !== 'undefined' ? self : this, function () {
  function getLib() {
    if (typeof PDFLib !== 'undefined') return PDFLib;
    if (typeof require === 'function') return require('pdf-lib');
    throw new Error('pdf-lib tidak tersedia');
  }

  function hexToRgb(hex) {
    const h = String(hex || '#d32f2f').replace('#', '');
    const v = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return [(v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255];
  }

  async function exportWithBubbles(pdfBytes, bubbles, opts) {
    const { PDFDocument, StandardFonts, rgb } = getLib();
    const options = Object.assign({ diameterPt: 21, color: [0.83, 0.11, 0.16] }, opts || {});
    const doc = await PDFDocument.load(pdfBytes);
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const pages = doc.getPages();
    const radius = options.diameterPt / 2;
    const white = rgb(1, 1, 1);

    for (const b of bubbles) {
      const page = pages[b.page - 1];
      if (!page) continue;
      const { width, height } = page.getSize();
      const cx = b.x * width;
      const cy = (1 - b.y) * height; // y PDF dihitung dari bawah
      const c = b.colorHex ? hexToRgb(b.colorHex) : options.color;
      const color = rgb(c[0], c[1], c[2]);
      page.drawCircle({
        x: cx,
        y: cy,
        size: radius,
        borderColor: color,
        borderWidth: 1.5,
        color: white,
        opacity: 1,
      });
      const text = String(b.label);
      const fontSize = Math.max(8, options.diameterPt * 0.52);
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      page.drawText(text, {
        x: cx - textWidth / 2,
        y: cy - fontSize * 0.35,
        size: fontSize,
        font,
        color,
      });
    }
    return doc.save();
  }

  return { exportWithBubbles };
});
