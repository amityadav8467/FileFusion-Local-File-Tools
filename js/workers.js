/* FileFusion Web Worker */
self.onmessage = async function(e) {
  const { type, data } = e.data;

  try {
    if (type === 'hashFile') {
      const { buffer, algorithm } = data;
      const hashBuffer = await crypto.subtle.digest(algorithm || 'SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hexString = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      self.postMessage({ type: 'hashResult', hash: hexString, algorithm: algorithm || 'SHA-256' });
    }

    if (type === 'analyzeFile') {
      const { name, size, fileType, lastModified } = data;
      const kb = (size / 1024).toFixed(2);
      const mb = (size / (1024 * 1024)).toFixed(4);
      self.postMessage({
        type: 'analyzeResult',
        result: {
          name,
          size,
          sizeKB: kb,
          sizeMB: mb,
          fileType: fileType || 'unknown',
          lastModified: new Date(lastModified).toLocaleString(),
          readable: size > 1048576 ? mb + ' MB' : kb + ' KB'
        }
      });
    }
  } catch (err) {
    self.postMessage({ type: 'error', message: err.message });
  }
};
