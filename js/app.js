// ════════════════════════════════════════════════════
//  FileFusion – app.js   (all tools, local processing)
// ════════════════════════════════════════════════════

// ── pdf.js worker ──────────────────────────────────
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://unpkg.com/pdfjs-dist@2.11.338/build/pdf.worker.min.js';
}

// ════════════════════════════════════════════════════
//  UTILITY HELPERS
// ════════════════════════════════════════════════════

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  t.innerHTML = `<span style="font-size:1.1em">${icons[type] || 'ℹ'}</span> <span>${escapeHtml(msg)}</span>`;
  container.appendChild(t);
  setTimeout(() => {
    t.classList.add('removing');
    setTimeout(() => t.remove(), 350);
  }, 3500);
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .then(() => showToast('Copied to clipboard!', 'success'))
    .catch(() => showToast('Failed to copy.', 'error'));
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function createStatusElement(parent, text, type = 'info') {
  const colors = {
    info: 'blue', success: 'green', error: 'red', warning: 'yellow'
  };
  const c = colors[type] || 'blue';
  const el = document.createElement('p');
  el.className = `text-${c}-600 dark:text-${c}-400 text-sm mt-2 status-msg`;
  el.textContent = text;
  parent.appendChild(el);
  return el;
}

function createDownloadButton(parent, blob, filename, label = 'Download') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.className =
    'inline-flex items-center gap-2 mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors';
  a.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> ${escapeHtml(label)}`;
  parent.appendChild(a);
  return a;
}

function resetCard(element) {
  const statuses = element.querySelectorAll('.status-msg');
  statuses.forEach(s => s.remove());
  const downloads = element.querySelectorAll('a[download]');
  downloads.forEach(d => d.remove());
}

// ════════════════════════════════════════════════════
//  PANEL NAVIGATION
// ════════════════════════════════════════════════════

function showPanel(panelId) {
  const dashboard = document.getElementById('tools-dashboard');
  if (dashboard) dashboard.classList.add('hidden');

  document.querySelectorAll('.tool-panel').forEach(p => p.classList.remove('active'));

  const panel = document.getElementById(panelId);
  if (panel) {
    panel.classList.add('active');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function hidePanel(panelId) {
  const panel = document.getElementById(panelId);
  if (panel) panel.classList.remove('active');
}

function showDashboard() {
  document.querySelectorAll('.tool-panel').forEach(p => p.classList.remove('active'));
  const dashboard = document.getElementById('tools-dashboard');
  if (dashboard) {
    dashboard.classList.remove('hidden');
    dashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ════════════════════════════════════════════════════
//  DRAG & DROP HELPER
// ════════════════════════════════════════════════════

function setupDragAndDrop(dropzoneEl, inputEl) {
  if (!dropzoneEl) return;
  ['dragenter', 'dragover'].forEach(evt =>
    dropzoneEl.addEventListener(evt, e => {
      e.preventDefault();
      dropzoneEl.classList.add('drag-over');
    })
  );
  ['dragleave', 'drop'].forEach(evt =>
    dropzoneEl.addEventListener(evt, e => {
      e.preventDefault();
      dropzoneEl.classList.remove('drag-over');
    })
  );
  dropzoneEl.addEventListener('drop', e => {
    const files = e.dataTransfer.files;
    if (files.length && inputEl) {
      const dt = new DataTransfer();
      for (const f of files) dt.items.add(f);
      inputEl.files = dt.files;
      inputEl.dispatchEvent(new Event('change'));
    }
  });
  dropzoneEl.addEventListener('click', () => inputEl && inputEl.click());
}

// ════════════════════════════════════════════════════
//  DARK / LIGHT MODE
// ════════════════════════════════════════════════════

function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  const lightIcon = document.getElementById('theme-icon-light');
  const darkIcon  = document.getElementById('theme-icon-dark');
  if (lightIcon) lightIcon.style.display = theme === 'dark' ? 'none' : 'inline';
  if (darkIcon)  darkIcon.style.display  = theme === 'dark' ? 'inline' : 'none';
}

// ════════════════════════════════════════════════════
//  PDF MERGE TOOL
// ════════════════════════════════════════════════════

let filesToMerge = [];

function renderMergeList() {
  const list = document.getElementById('merge-file-list');
  if (!list) return;
  list.innerHTML = '';
  if (filesToMerge.length === 0) {
    list.innerHTML = '<p class="text-slate-400 text-sm">No files added yet.</p>';
    return;
  }
  filesToMerge.forEach((file, idx) => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      <span class="file-name truncate"></span>
      <span class="text-xs text-slate-400">${formatBytes(file.size)}</span>`;
    item.querySelector('.file-name').textContent = file.name;
    const removeBtn = document.createElement('button');
    removeBtn.className = 'ml-auto text-red-400 hover:text-red-600 text-xs px-1';
    removeBtn.textContent = '✕';
    removeBtn.dataset.idx = idx;
    removeBtn.addEventListener('click', () => {
      filesToMerge.splice(Number(removeBtn.dataset.idx), 1);
      renderMergeList();
    });
    item.appendChild(removeBtn);
    list.appendChild(item);
  });
}

async function handlePdfMerge() {
  if (filesToMerge.length < 2) { showToast('Add at least 2 PDF files.', 'warning'); return; }
  const statusEl = document.getElementById('merge-status');
  const { PDFDocument } = PDFLib;
  try {
    statusEl.textContent = 'Merging…';
    const merged = await PDFDocument.create();
    for (const file of filesToMerge) {
      const buf = await file.arrayBuffer();
      const doc = await PDFDocument.load(buf);
      const pages = await merged.copyPages(doc, doc.getPageIndices());
      pages.forEach(p => merged.addPage(p));
    }
    const bytes = await merged.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const area = document.getElementById('merge-download-area');
    area.innerHTML = '';
    createDownloadButton(area, blob, 'merged.pdf', 'Download Merged PDF');
    statusEl.textContent = `✓ Merged ${filesToMerge.length} files (${formatBytes(blob.size)})`;
    showToast('PDFs merged successfully!', 'success');
  } catch (err) {
    statusEl.textContent = 'Error: ' + err.message;
    showToast('Merge failed: ' + err.message, 'error');
  }
}

// ════════════════════════════════════════════════════
//  PDF SPLIT TOOL
// ════════════════════════════════════════════════════

async function handlePdfSplit() {
  const input = document.getElementById('split-pdf-input');
  const mode = document.getElementById('split-mode').value;
  const statusEl = document.getElementById('split-status');
  const area = document.getElementById('split-download-area');
  if (!input.files.length) { showToast('Select a PDF file.', 'warning'); return; }
  area.innerHTML = '';
  const { PDFDocument } = PDFLib;
  try {
    statusEl.textContent = 'Splitting…';
    const buf = await input.files[0].arrayBuffer();
    const src = await PDFDocument.load(buf);
    const total = src.getPageCount();

    if (mode === 'all') {
      for (let i = 0; i < total; i++) {
        const doc = await PDFDocument.create();
        const [page] = await doc.copyPages(src, [i]);
        doc.addPage(page);
        const bytes = await doc.save();
        const blob = new Blob([bytes], { type: 'application/pdf' });
        createDownloadButton(area, blob, `page-${i + 1}.pdf`, `Page ${i + 1}`);
      }
      statusEl.textContent = `✓ Split into ${total} pages.`;
    } else {
      const rangeInput = document.getElementById('split-range').value.trim();
      const parts = parsePageRanges(rangeInput, total);
      if (!parts.length) { statusEl.textContent = 'Invalid range.'; return; }
      let idx = 0;
      for (const pages of parts) {
        idx++;
        const doc = await PDFDocument.create();
        const copied = await doc.copyPages(src, pages);
        copied.forEach(p => doc.addPage(p));
        const bytes = await doc.save();
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const label = pages.length === 1 ? `Page ${pages[0]+1}` : `Pages ${pages[0]+1}-${pages[pages.length-1]+1}`;
        createDownloadButton(area, blob, `part-${idx}.pdf`, label);
      }
      statusEl.textContent = `✓ Split into ${idx} part(s).`;
    }
    showToast('PDF split complete!', 'success');
  } catch (err) {
    statusEl.textContent = 'Error: ' + err.message;
    showToast('Split failed.', 'error');
  }
}

function parsePageRanges(input, total) {
  const parts = [];
  const segments = input.split(',');
  for (const seg of segments) {
    const trimmed = seg.trim();
    if (!trimmed) continue;
    if (trimmed.includes('-')) {
      const [a, b] = trimmed.split('-').map(n => parseInt(n.trim()) - 1);
      if (isNaN(a) || isNaN(b) || a < 0 || b >= total || a > b) continue;
      const group = [];
      for (let i = a; i <= b; i++) group.push(i);
      parts.push(group);
    } else {
      const n = parseInt(trimmed) - 1;
      if (isNaN(n) || n < 0 || n >= total) continue;
      parts.push([n]);
    }
  }
  return parts;
}

// ════════════════════════════════════════════════════
//  PDF COMPRESS TOOL
// ════════════════════════════════════════════════════

async function handlePdfCompress() {
  const input = document.getElementById('compress-pdf-input');
  const statusEl = document.getElementById('compress-pdf-status');
  const area = document.getElementById('compress-pdf-download');
  if (!input.files.length) { showToast('Select a PDF file.', 'warning'); return; }
  area.innerHTML = '';
  const { PDFDocument } = PDFLib;
  try {
    statusEl.textContent = 'Compressing…';
    const buf = await input.files[0].arrayBuffer();
    const origSize = buf.byteLength;
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
    const bytes = await doc.save({ useObjectStreams: true });
    const newSize = bytes.byteLength;
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const ratio = (((origSize - newSize) / origSize) * 100).toFixed(1);
    statusEl.textContent = `Before: ${formatBytes(origSize)} → After: ${formatBytes(newSize)} (${ratio >= 0 ? '-' : '+'}${Math.abs(ratio)}%)`;
    createDownloadButton(area, blob, 'compressed.pdf', 'Download Compressed PDF');
    showToast('PDF compressed!', 'success');
  } catch (err) {
    statusEl.textContent = 'Error: ' + err.message;
    showToast('Compression failed.', 'error');
  }
}

// ════════════════════════════════════════════════════
//  PDF TO IMAGE TOOL
// ════════════════════════════════════════════════════

async function handlePdfToImage() {
  const input = document.getElementById('pdf-to-image-input');
  const statusEl = document.getElementById('pdf-to-image-status');
  const area = document.getElementById('pdf-to-image-download');
  if (!input.files.length) { showToast('Select a PDF file.', 'warning'); return; }
  if (typeof pdfjsLib === 'undefined') { showToast('pdf.js not loaded.', 'error'); return; }
  area.innerHTML = '';
  try {
    statusEl.textContent = 'Rendering pages…';
    const buf = await input.files[0].arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const totalPages = pdf.numPages;
    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
      canvas.toBlob(blob => {
        createDownloadButton(area, blob, `page-${i}.png`, `Page ${i} PNG`);
      }, 'image/png');
    }
    statusEl.textContent = `✓ Rendered ${totalPages} page(s).`;
    showToast('PDF converted to images!', 'success');
  } catch (err) {
    statusEl.textContent = 'Error: ' + err.message;
    showToast('Conversion failed.', 'error');
  }
}

// ════════════════════════════════════════════════════
//  IMAGE TO PDF TOOL
// ════════════════════════════════════════════════════

async function handleImageToPdf() {
  const input = document.getElementById('image-to-pdf-input');
  const statusEl = document.getElementById('image-to-pdf-status');
  const area = document.getElementById('image-to-pdf-download');
  if (!input.files.length) { showToast('Select image files.', 'warning'); return; }
  area.innerHTML = '';
  const { PDFDocument } = PDFLib;
  try {
    statusEl.textContent = 'Creating PDF…';
    const doc = await PDFDocument.create();
    for (const file of input.files) {
      const buf = await file.arrayBuffer();
      let img;
      if (file.type === 'image/jpeg') {
        img = await doc.embedJpg(buf);
      } else if (file.type === 'image/png') {
        img = await doc.embedPng(buf);
      } else {
        // Convert to PNG via canvas
        const url = URL.createObjectURL(file);
        const pngBuf = await imageUrlToPngBuffer(url);
        img = await doc.embedPng(pngBuf);
        URL.revokeObjectURL(url);
      }
      const page = doc.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    }
    const bytes = await doc.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    statusEl.textContent = `✓ Created PDF from ${input.files.length} image(s).`;
    createDownloadButton(area, blob, 'images.pdf', 'Download PDF');
    showToast('PDF created from images!', 'success');
  } catch (err) {
    statusEl.textContent = 'Error: ' + err.message;
    showToast('Failed to create PDF.', 'error');
  }
}

function imageUrlToPngBuffer(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      canvas.toBlob(blob => {
        blob.arrayBuffer().then(resolve).catch(reject);
      }, 'image/png');
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ════════════════════════════════════════════════════
//  COMPRESS & RESIZE IMAGE TOOL
// ════════════════════════════════════════════════════

let compressImageFile = null;

function handleCompressImageChange(e) {
  const file = e.target.files[0];
  if (!file) return;
  compressImageFile = file;
  document.getElementById('compress-img-original-size').textContent = 'Original: ' + formatBytes(file.size);
  const preview = document.getElementById('compress-img-preview');
  if (preview) {
    preview.src = URL.createObjectURL(file);
    preview.classList.remove('hidden');
  }
}

async function handleCompressImage() {
  if (!compressImageFile) { showToast('Select an image.', 'warning'); return; }
  const quality = parseFloat(document.getElementById('compress-quality').value) / 100;
  const statusEl = document.getElementById('compress-img-status');
  const area = document.getElementById('compress-img-download');
  area.innerHTML = '';
  try {
    statusEl.textContent = 'Compressing…';
    const url = URL.createObjectURL(compressImageFile);
    const blob = await compressImageToBlob(url, quality, compressImageFile.type === 'image/png' ? 'image/png' : 'image/jpeg');
    URL.revokeObjectURL(url);
    const ratio = (((compressImageFile.size - blob.size) / compressImageFile.size) * 100).toFixed(1);
    statusEl.textContent = `Before: ${formatBytes(compressImageFile.size)} → After: ${formatBytes(blob.size)} (${ratio >= 0 ? '-' : '+'}${Math.abs(ratio)}%)`;
    const baseName = compressImageFile.name.replace(/\.[^.]+$/, '');
    createDownloadButton(area, blob, baseName + '-compressed.' + (compressImageFile.type === 'image/png' ? 'png' : 'jpg'), 'Download');
    showToast('Image compressed!', 'success');
  } catch (err) {
    statusEl.textContent = 'Error: ' + err.message;
    showToast('Failed.', 'error');
  }
}

function compressImageToBlob(url, quality, mimeType) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')), mimeType, quality);
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ════════════════════════════════════════════════════
//  RESIZE IMAGE TOOL
// ════════════════════════════════════════════════════

let resizeOriginalW = 0, resizeOriginalH = 0, resizeImageFile = null;

function handleResizeFileChange(e) {
  const file = e.target.files[0];
  if (!file) return;
  resizeImageFile = file;
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    resizeOriginalW = img.naturalWidth;
    resizeOriginalH = img.naturalHeight;
    document.getElementById('resize-width').value = resizeOriginalW;
    document.getElementById('resize-height').value = resizeOriginalH;
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

function handleResizeWidthChange() {
  const lock = document.getElementById('resize-aspect-lock')?.checked;
  if (lock && resizeOriginalW) {
    const w = parseInt(document.getElementById('resize-width').value);
    document.getElementById('resize-height').value = Math.round(w * resizeOriginalH / resizeOriginalW);
  }
}

function handleResizeHeightChange() {
  const lock = document.getElementById('resize-aspect-lock')?.checked;
  if (lock && resizeOriginalH) {
    const h = parseInt(document.getElementById('resize-height').value);
    document.getElementById('resize-width').value = Math.round(h * resizeOriginalW / resizeOriginalH);
  }
}

async function handleResizeImage() {
  if (!resizeImageFile) { showToast('Select an image.', 'warning'); return; }
  const w = parseInt(document.getElementById('resize-width').value);
  const h = parseInt(document.getElementById('resize-height').value);
  if (!w || !h || w <= 0 || h <= 0) { showToast('Enter valid dimensions.', 'warning'); return; }
  const statusEl = document.getElementById('resize-img-status');
  const area = document.getElementById('resize-img-download');
  area.innerHTML = '';
  try {
    statusEl.textContent = 'Resizing…';
    const url = URL.createObjectURL(resizeImageFile);
    const blob = await resizeImageToBlob(url, w, h, 'image/jpeg', 0.92);
    URL.revokeObjectURL(url);
    statusEl.textContent = `✓ Resized to ${w}×${h}px (${formatBytes(blob.size)})`;
    const name = resizeImageFile.name.replace(/\.[^.]+$/, '');
    createDownloadButton(area, blob, `${name}-${w}x${h}.jpg`, 'Download Resized');
    showToast('Image resized!', 'success');
  } catch (err) {
    statusEl.textContent = 'Error: ' + err.message;
    showToast('Resize failed.', 'error');
  }
}

function resizeImageToBlob(url, w, h, mimeType, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')), mimeType, quality);
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ════════════════════════════════════════════════════
//  PNG TO JPG TOOL
// ════════════════════════════════════════════════════

async function handlePngToJpg() {
  const input = document.getElementById('png-to-jpg-input');
  const statusEl = document.getElementById('png-to-jpg-status');
  const area = document.getElementById('png-to-jpg-download');
  const bgColor = document.getElementById('png-jpg-bg')?.value || '#ffffff';
  const quality = parseFloat(document.getElementById('png-jpg-quality')?.value || 92) / 100;
  if (!input.files.length) { showToast('Select a PNG file.', 'warning'); return; }
  area.innerHTML = '';
  try {
    statusEl.textContent = 'Converting…';
    for (const file of input.files) {
      const url = URL.createObjectURL(file);
      const blob = await convertPngToJpg(url, bgColor, quality);
      URL.revokeObjectURL(url);
      const name = file.name.replace(/\.png$/i, '') + '.jpg';
      statusEl.textContent = `✓ Converted: ${formatBytes(file.size)} → ${formatBytes(blob.size)}`;
      createDownloadButton(area, blob, name, 'Download JPG');
    }
    showToast('PNG converted to JPG!', 'success');
  } catch (err) {
    statusEl.textContent = 'Error: ' + err.message;
    showToast('Conversion failed.', 'error');
  }
}

function convertPngToJpg(url, bgColor, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/jpeg', quality);
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ════════════════════════════════════════════════════
//  JPG TO PNG TOOL
// ════════════════════════════════════════════════════

async function handleJpgToPng() {
  const input = document.getElementById('jpg-to-png-input');
  const statusEl = document.getElementById('jpg-to-png-status');
  const area = document.getElementById('jpg-to-png-download');
  if (!input.files.length) { showToast('Select a JPG file.', 'warning'); return; }
  area.innerHTML = '';
  try {
    statusEl.textContent = 'Converting…';
    for (const file of input.files) {
      const url = URL.createObjectURL(file);
      const blob = await convertJpgToPng(url);
      URL.revokeObjectURL(url);
      const name = file.name.replace(/\.(jpg|jpeg)$/i, '') + '.png';
      statusEl.textContent = `✓ Converted: ${formatBytes(file.size)} → ${formatBytes(blob.size)}`;
      createDownloadButton(area, blob, name, 'Download PNG');
    }
    showToast('JPG converted to PNG!', 'success');
  } catch (err) {
    statusEl.textContent = 'Error: ' + err.message;
    showToast('Conversion failed.', 'error');
  }
}

function convertJpgToPng(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/png');
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ════════════════════════════════════════════════════
//  PDF TO TEXT TOOL
// ════════════════════════════════════════════════════

async function handlePdfToText() {
  const input = document.getElementById('pdf-to-text-input');
  const outputArea = document.getElementById('pdf-text-output');
  const statusEl = document.getElementById('pdf-to-text-status');
  if (!input.files.length) { showToast('Select a PDF file.', 'warning'); return; }
  if (typeof pdfjsLib === 'undefined') { showToast('pdf.js not loaded.', 'error'); return; }
  try {
    statusEl.textContent = 'Extracting text…';
    const buf = await input.files[0].arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      fullText += `--- Page ${i} ---\n${pageText}\n\n`;
    }
    outputArea.value = fullText;
    statusEl.textContent = `✓ Extracted text from ${pdf.numPages} page(s).`;
    showToast('Text extracted!', 'success');
  } catch (err) {
    statusEl.textContent = 'Error: ' + err.message;
    showToast('Extraction failed.', 'error');
  }
}

function downloadPdfText() {
  const text = document.getElementById('pdf-text-output')?.value;
  if (!text) { showToast('No text to download.', 'warning'); return; }
  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'extracted-text.txt';
  a.click();
}

// ════════════════════════════════════════════════════
//  IMAGE CONVERTER TOOL (JPG → PNG/PDF, PNG → JPG/PDF)
// ════════════════════════════════════════════════════

let imageConverterFile = null;
let imageConverterTargetFmt = 'png';

function setImageConverterFormat(fmt) {
  imageConverterTargetFmt = fmt;
  document.querySelectorAll('.img-converter-btn').forEach(btn => {
    btn.classList.toggle('bg-blue-600', btn.dataset.fmt === fmt);
    btn.classList.toggle('text-white', btn.dataset.fmt === fmt);
    btn.classList.toggle('bg-slate-100', btn.dataset.fmt !== fmt);
    btn.classList.toggle('dark:bg-slate-700', btn.dataset.fmt !== fmt);
  });
}

async function handleImageConverter() {
  if (!imageConverterFile) { showToast('Select an image.', 'warning'); return; }
  const statusEl = document.getElementById('img-converter-status');
  const area = document.getElementById('img-converter-download');
  area.innerHTML = '';
  try {
    statusEl.textContent = 'Converting…';
    const url = URL.createObjectURL(imageConverterFile);
    const name = imageConverterFile.name.replace(/\.[^.]+$/, '');
    if (imageConverterTargetFmt === 'png') {
      const blob = await convertJpgToPng(url);
      createDownloadButton(area, blob, name + '.png', 'Download PNG');
    } else if (imageConverterTargetFmt === 'jpg') {
      const blob = await convertPngToJpg(url, '#ffffff', 0.92);
      createDownloadButton(area, blob, name + '.jpg', 'Download JPG');
    } else if (imageConverterTargetFmt === 'pdf') {
      const { PDFDocument } = PDFLib;
      const doc = await PDFDocument.create();
      const pngBuf = await imageUrlToPngBuffer(url);
      const img = await doc.embedPng(pngBuf);
      const page = doc.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      const bytes = await doc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      createDownloadButton(area, blob, name + '.pdf', 'Download PDF');
    }
    URL.revokeObjectURL(url);
    statusEl.textContent = `✓ Converted to ${imageConverterTargetFmt.toUpperCase()}`;
    showToast('Image converted!', 'success');
  } catch (err) {
    statusEl.textContent = 'Error: ' + err.message;
    showToast('Conversion failed.', 'error');
  }
}

// ════════════════════════════════════════════════════
//  MEDIA CONVERTER TOOL (FFmpeg.wasm)
// ════════════════════════════════════════════════════

let ffmpegInstance = null;
let mediaConverterTargetFmt = 'mp4';

async function getFFmpeg() {
  if (ffmpegInstance) return ffmpegInstance;
  if (typeof FFmpeg === 'undefined') throw new Error('FFmpeg not loaded');
  const { createFFmpeg, fetchFile } = FFmpeg;
  ffmpegInstance = createFFmpeg({ log: false });
  await ffmpegInstance.load();
  return ffmpegInstance;
}

function setMediaFormat(fmt) {
  mediaConverterTargetFmt = fmt;
  document.querySelectorAll('.media-fmt-btn').forEach(btn => {
    btn.classList.toggle('bg-blue-600', btn.dataset.fmt === fmt);
    btn.classList.toggle('text-white', btn.dataset.fmt === fmt);
    btn.classList.toggle('bg-slate-100', btn.dataset.fmt !== fmt);
    btn.classList.toggle('dark:bg-slate-700', btn.dataset.fmt !== fmt);
  });
}

async function handleMediaConvert() {
  const input = document.getElementById('media-input');
  const statusEl = document.getElementById('media-status');
  const area = document.getElementById('media-download');
  const progressBar = document.getElementById('media-progress-fill');
  if (!input.files.length) { showToast('Select a media file.', 'warning'); return; }
  area.innerHTML = '';
  statusEl.textContent = 'Loading FFmpeg…';
  try {
    const ffmpeg = await getFFmpeg();
    const { fetchFile } = FFmpeg;
    const file = input.files[0];
    const inName = 'input.' + file.name.split('.').pop();
    const outName = 'output.' + mediaConverterTargetFmt;
    ffmpeg.setProgress(({ ratio }) => {
      if (progressBar) progressBar.style.width = (ratio * 100).toFixed(0) + '%';
    });
    ffmpeg.FS('writeFile', inName, await fetchFile(file));
    statusEl.textContent = 'Converting… (may take a while)';
    await ffmpeg.run('-i', inName, outName);
    const data = ffmpeg.FS('readFile', outName);
    const mimeMap = { mp4:'video/mp4', webm:'video/webm', mp3:'audio/mpeg', wav:'audio/wav', ogg:'audio/ogg', gif:'image/gif', avi:'video/x-msvideo' };
    const blob = new Blob([data.buffer], { type: mimeMap[mediaConverterTargetFmt] || 'application/octet-stream' });
    const baseName = file.name.replace(/\.[^.]+$/, '');
    statusEl.textContent = `✓ Converted to ${mediaConverterTargetFmt.toUpperCase()} (${formatBytes(blob.size)})`;
    createDownloadButton(area, blob, baseName + '.' + mediaConverterTargetFmt, 'Download');
    showToast('Media converted!', 'success');
  } catch (err) {
    statusEl.textContent = 'Error: ' + err.message;
    showToast('Conversion failed: ' + err.message, 'error');
  }
}

// ════════════════════════════════════════════════════
//  FILE RENAME TOOL
// ════════════════════════════════════════════════════

let renameFiles = [];

function handleRenameFilesChange(e) {
  renameFiles = Array.from(e.target.files);
  renderRenameList();
}

function renderRenameList() {
  const list = document.getElementById('rename-file-list');
  if (!list) return;
  list.innerHTML = '';
  if (!renameFiles.length) { list.innerHTML = '<p class="text-slate-400 text-sm">No files selected.</p>'; return; }
  renameFiles.forEach((file, idx) => {
    const item = document.createElement('div');
    item.className = 'file-item flex-col sm:flex-row gap-2 mb-2';
    item.innerHTML = `
      <span class="text-xs text-slate-400 w-5">${idx + 1}.</span>
      <input type="text" id="rename-name-${idx}"
        class="flex-1 text-sm border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
      <span class="text-xs text-slate-400">${formatBytes(file.size)}</span>`;
    const nameInput = item.querySelector(`#rename-name-${idx}`);
    if (nameInput) nameInput.value = file.name;
    list.appendChild(item);
  });
}

function applyRenamePattern() {
  const prefix = document.getElementById('rename-prefix')?.value || '';
  const suffix = document.getElementById('rename-suffix')?.value || '';
  const find = document.getElementById('rename-find')?.value || '';
  const replace = document.getElementById('rename-replace')?.value || '';
  renameFiles.forEach((file, idx) => {
    const input = document.getElementById(`rename-name-${idx}`);
    if (!input) return;
    const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : '';
    let base = file.name.includes('.') ? file.name.slice(0, file.name.lastIndexOf('.')) : file.name;
    if (find) base = base.split(find).join(replace);
    input.value = prefix + base + suffix + ext;
  });
}

function downloadRenamedFiles() {
  renameFiles.forEach((file, idx) => {
    const input = document.getElementById(`rename-name-${idx}`);
    const newName = input ? input.value.trim() : file.name;
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = newName || file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  showToast(`Downloading ${renameFiles.length} renamed file(s).`, 'success');
}

// ════════════════════════════════════════════════════
//  FILE SIZE ANALYZER
// ════════════════════════════════════════════════════

function handleFileSizeAnalyze(e) {
  const files = Array.from(e.target.files);
  const table = document.getElementById('file-size-table');
  if (!table) return;
  if (!files.length) { table.innerHTML = ''; return; }
  let html = `<table class="w-full text-sm border-collapse">
    <thead><tr class="text-left bg-slate-100 dark:bg-slate-700">
      <th class="px-3 py-2 rounded-tl">Name</th>
      <th class="px-3 py-2">Type</th>
      <th class="px-3 py-2">Size</th>
      <th class="px-3 py-2 rounded-tr">Last Modified</th>
    </tr></thead><tbody>`;
  let total = 0;
  files.forEach(f => {
    total += f.size;
    html += `<tr class="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
      <td class="px-3 py-2" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(f.name)}</td>
      <td class="px-3 py-2 text-slate-500">${f.type || 'unknown'}</td>
      <td class="px-3 py-2 font-mono">${formatBytes(f.size)}</td>
      <td class="px-3 py-2 text-slate-500">${new Date(f.lastModified).toLocaleDateString()}</td>
    </tr>`;
  });
  html += `</tbody><tfoot><tr class="font-semibold bg-slate-50 dark:bg-slate-800">
    <td class="px-3 py-2" colspan="2">Total (${files.length} files)</td>
    <td class="px-3 py-2 font-mono">${formatBytes(total)}</td>
    <td></td>
  </tr></tfoot></table>`;
  table.innerHTML = html;
}

// ════════════════════════════════════════════════════
//  TEXT FILE CLEANER
// ════════════════════════════════════════════════════

async function handleTextClean() {
  const input = document.getElementById('text-cleaner-input');
  const preview = document.getElementById('text-cleaner-preview');
  const statusEl = document.getElementById('text-cleaner-status');
  if (!input.files.length) { showToast('Select a text file.', 'warning'); return; }
  const file = input.files[0];
  let text = await file.text();

  const trimLines = document.getElementById('tc-trim')?.checked;
  const removeBlank = document.getElementById('tc-blank')?.checked;
  const collapseSpaces = document.getElementById('tc-spaces')?.checked;
  const removeSpecial = document.getElementById('tc-special')?.checked;

  const origLen = text.length;
  if (trimLines) text = text.split('\n').map(l => l.trim()).join('\n');
  if (collapseSpaces) text = text.replace(/ {2,}/g, ' ');
  if (removeBlank) text = text.replace(/\n{3,}/g, '\n\n').replace(/^\n+|\n+$/g, '');
  if (removeSpecial) text = text.replace(/[^\x20-\x7E\n\r\t]/g, '');

  preview.value = text;
  statusEl.textContent = `✓ Cleaned. ${origLen} → ${text.length} chars.`;

  const area = document.getElementById('text-cleaner-download');
  area.innerHTML = '';
  const blob = new Blob([text], { type: 'text/plain' });
  createDownloadButton(area, blob, 'cleaned.txt', 'Download Cleaned');
}

// ════════════════════════════════════════════════════
//  QR CODE GENERATOR
// ════════════════════════════════════════════════════

function generateQrCode() {
  const text = document.getElementById('qr-input')?.value.trim();
  const container = document.getElementById('qrcode-output');
  if (!text) { showToast('Enter text or URL for QR code.', 'warning'); return; }
  if (typeof QRCode === 'undefined') { showToast('QRCode.js not loaded.', 'error'); return; }
  container.innerHTML = '';
  new QRCode(container, {
    text,
    width: 256, height: 256,
    colorDark: '#0f172a',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
  });
  document.getElementById('qr-download-area').innerHTML = '';
  setTimeout(() => {
    const canvas = container.querySelector('canvas');
    if (canvas) {
      canvas.toBlob(blob => {
        createDownloadButton(document.getElementById('qr-download-area'), blob, 'qrcode.png', 'Download QR');
      }, 'image/png');
    }
  }, 200);
  showToast('QR code generated!', 'success');
}

// ════════════════════════════════════════════════════
//  FILE HASH GENERATOR
// ════════════════════════════════════════════════════

async function handleFileHash() {
  const input = document.getElementById('hash-file-input');
  const algo = document.getElementById('hash-algorithm')?.value || 'SHA-256';
  const output = document.getElementById('hash-output');
  const statusEl = document.getElementById('hash-status');
  if (!input.files.length) { showToast('Select a file.', 'warning'); return; }
  const file = input.files[0];
  statusEl.textContent = `Computing ${algo}…`;
  try {
    const buf = await file.arrayBuffer();
    const hashBuf = await crypto.subtle.digest(algo, buf);
    const hex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2,'0')).join('');
    output.textContent = hex;
    statusEl.textContent = `✓ ${algo} hash of ${file.name}`;
    showToast('Hash computed!', 'success');
  } catch (err) {
    statusEl.textContent = 'Error: ' + err.message;
    showToast('Hash failed.', 'error');
  }
}

// ════════════════════════════════════════════════════
//  MOBILE MENU
// ════════════════════════════════════════════════════

function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  if (!menu) return;
  menu.classList.toggle('hidden');
}

// ════════════════════════════════════════════════════
//  DOM CONTENT LOADED – WIRE UP EVERYTHING
// ════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

  // ── Copyright year ──────────────────────────────
  const yearEl = document.getElementById('copyright-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ── Dark mode ───────────────────────────────────
  const savedTheme = localStorage.getItem('theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(savedTheme);

  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isDark = document.documentElement.classList.contains('dark');
      const next = isDark ? 'light' : 'dark';
      localStorage.setItem('theme', next);
      applyTheme(next);
    });
  }

  // ── Mobile hamburger ────────────────────────────
  const hamburger = document.getElementById('hamburger-btn');
  if (hamburger) hamburger.addEventListener('click', toggleMobileMenu);

  // ── Feather icons ────────────────────────────────
  if (typeof feather !== 'undefined') feather.replace();

  // ── PDF Merge ────────────────────────────────────
  setupDragAndDrop(
    document.getElementById('pdf-merge-dropzone'),
    document.getElementById('pdf-merge-input')
  );
  const pdfMergeInput = document.getElementById('pdf-merge-input');
  if (pdfMergeInput) {
    pdfMergeInput.addEventListener('change', e => {
      Array.from(e.target.files).forEach(f => filesToMerge.push(f));
      renderMergeList();
    });
  }
  document.getElementById('merge-btn')?.addEventListener('click', handlePdfMerge);
  document.getElementById('merge-clear-btn')?.addEventListener('click', () => {
    filesToMerge = [];
    renderMergeList();
    const area = document.getElementById('merge-download-area');
    if (area) area.innerHTML = '';
    const status = document.getElementById('merge-status');
    if (status) status.textContent = '';
  });

  // ── PDF Split ─────────────────────────────────────
  setupDragAndDrop(
    document.getElementById('split-pdf-dropzone'),
    document.getElementById('split-pdf-input')
  );
  const splitMode = document.getElementById('split-mode');
  if (splitMode) {
    splitMode.addEventListener('change', () => {
      const rangeGroup = document.getElementById('split-range-group');
      if (rangeGroup) rangeGroup.classList.toggle('hidden', splitMode.value !== 'range');
    });
  }
  document.getElementById('split-btn')?.addEventListener('click', handlePdfSplit);

  // ── PDF Compress ──────────────────────────────────
  setupDragAndDrop(
    document.getElementById('compress-pdf-dropzone'),
    document.getElementById('compress-pdf-input')
  );
  document.getElementById('compress-pdf-btn')?.addEventListener('click', handlePdfCompress);

  // ── PDF to Image ──────────────────────────────────
  setupDragAndDrop(
    document.getElementById('pdf-to-image-dropzone'),
    document.getElementById('pdf-to-image-input')
  );
  document.getElementById('pdf-to-image-btn')?.addEventListener('click', handlePdfToImage);

  // ── Image to PDF ──────────────────────────────────
  setupDragAndDrop(
    document.getElementById('image-to-pdf-dropzone'),
    document.getElementById('image-to-pdf-input')
  );
  document.getElementById('image-to-pdf-btn')?.addEventListener('click', handleImageToPdf);

  // ── Compress Image ────────────────────────────────
  setupDragAndDrop(
    document.getElementById('compress-img-dropzone'),
    document.getElementById('compress-img-input')
  );
  document.getElementById('compress-img-input')?.addEventListener('change', handleCompressImageChange);
  document.getElementById('compress-quality')?.addEventListener('input', e => {
    const label = document.getElementById('compress-quality-label');
    if (label) label.textContent = e.target.value + '%';
  });
  document.getElementById('compress-img-btn')?.addEventListener('click', handleCompressImage);

  // ── Resize Image ───────────────────────────────────
  setupDragAndDrop(
    document.getElementById('resize-img-dropzone'),
    document.getElementById('resize-img-input')
  );
  document.getElementById('resize-img-input')?.addEventListener('change', handleResizeFileChange);
  document.getElementById('resize-width')?.addEventListener('change', handleResizeWidthChange);
  document.getElementById('resize-height')?.addEventListener('change', handleResizeHeightChange);
  document.getElementById('resize-img-btn')?.addEventListener('click', handleResizeImage);

  // ── PNG to JPG ────────────────────────────────────
  setupDragAndDrop(
    document.getElementById('png-to-jpg-dropzone'),
    document.getElementById('png-to-jpg-input')
  );
  document.getElementById('png-jpg-quality')?.addEventListener('input', e => {
    const label = document.getElementById('png-jpg-quality-label');
    if (label) label.textContent = e.target.value + '%';
  });
  document.getElementById('png-to-jpg-btn')?.addEventListener('click', handlePngToJpg);

  // ── JPG to PNG ────────────────────────────────────
  setupDragAndDrop(
    document.getElementById('jpg-to-png-dropzone'),
    document.getElementById('jpg-to-png-input')
  );
  document.getElementById('jpg-to-png-btn')?.addEventListener('click', handleJpgToPng);

  // ── PDF to Text ────────────────────────────────────
  setupDragAndDrop(
    document.getElementById('pdf-to-text-dropzone'),
    document.getElementById('pdf-to-text-input')
  );
  document.getElementById('pdf-to-text-btn')?.addEventListener('click', handlePdfToText);
  document.getElementById('pdf-text-copy-btn')?.addEventListener('click', () => {
    copyToClipboard(document.getElementById('pdf-text-output')?.value || '');
  });
  document.getElementById('pdf-text-download-btn')?.addEventListener('click', downloadPdfText);

  // ── Image Converter ────────────────────────────────
  setupDragAndDrop(
    document.getElementById('img-converter-dropzone'),
    document.getElementById('img-converter-input')
  );
  document.getElementById('img-converter-input')?.addEventListener('change', e => {
    imageConverterFile = e.target.files[0] || null;
  });
  document.querySelectorAll('.img-converter-btn').forEach(btn => {
    btn.addEventListener('click', () => setImageConverterFormat(btn.dataset.fmt));
  });
  document.getElementById('img-converter-btn')?.addEventListener('click', handleImageConverter);

  // ── Media Converter ────────────────────────────────
  setupDragAndDrop(
    document.getElementById('media-dropzone'),
    document.getElementById('media-input')
  );
  document.querySelectorAll('.media-fmt-btn').forEach(btn => {
    btn.addEventListener('click', () => setMediaFormat(btn.dataset.fmt));
  });
  document.getElementById('media-convert-btn')?.addEventListener('click', handleMediaConvert);

  // ── File Rename ─────────────────────────────────────
  document.getElementById('rename-files-input')?.addEventListener('change', handleRenameFilesChange);
  document.getElementById('rename-apply-btn')?.addEventListener('click', applyRenamePattern);
  document.getElementById('rename-download-btn')?.addEventListener('click', downloadRenamedFiles);

  // ── File Size Analyzer ──────────────────────────────
  document.getElementById('file-size-input')?.addEventListener('change', handleFileSizeAnalyze);

  // ── Text Cleaner ────────────────────────────────────
  document.getElementById('text-cleaner-btn')?.addEventListener('click', handleTextClean);
  document.getElementById('text-cleaner-copy-btn')?.addEventListener('click', () => {
    copyToClipboard(document.getElementById('text-cleaner-preview')?.value || '');
  });

  // ── QR Code ──────────────────────────────────────────
  document.getElementById('qr-generate-btn')?.addEventListener('click', generateQrCode);
  document.getElementById('qr-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') generateQrCode();
  });

  // ── File Hash ─────────────────────────────────────────
  setupDragAndDrop(
    document.getElementById('hash-dropzone'),
    document.getElementById('hash-file-input')
  );
  document.getElementById('hash-btn')?.addEventListener('click', handleFileHash);
  document.getElementById('hash-copy-btn')?.addEventListener('click', () => {
    copyToClipboard(document.getElementById('hash-output')?.textContent || '');
  });

  // ── Smooth scroll for nav links ────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
          mobileMenu.classList.add('hidden');
        }
      }
    });
  });

  // ── "Back to Tools" buttons ──────────────────────────────
  document.querySelectorAll('[data-action="show-dashboard"]').forEach(btn => {
    btn.addEventListener('click', showDashboard);
  });

  // ── Tool card click handlers ──────────────────────────────
  document.querySelectorAll('[data-panel]').forEach(card => {
    card.addEventListener('click', () => showPanel(card.dataset.panel));
  });

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  }
});
