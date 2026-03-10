/**
 * FileFusion - Modern File Upload System
 * 
 * A comprehensive, reusable file upload component supporting:
 * - File input selection
 * - Drag & drop upload
 * - Image preview with FileReader API
 * - File metadata display (name, type, size)
 * - Visual feedback during drag operations
 * - Error handling for unsupported file types
 * - Cross-browser compatibility
 * 
 * @module FileUpload
 */

/**
 * FileUploadManager - Manages file upload UI and interactions
 */
class FileUploadManager {
  /**
   * Create a new FileUploadManager
   * @param {Object} options - Configuration options
   * @param {string} options.dropzoneId - ID of the dropzone element
   * @param {string} options.inputId - ID of the file input element
   * @param {string} options.previewId - ID of the preview container (optional)
   * @param {string|string[]} options.acceptedTypes - Accepted MIME types or file extensions
   * @param {number} options.maxSizeBytes - Maximum file size in bytes (optional)
   * @param {Function} options.onFileSelect - Callback when file is selected
   * @param {Function} options.onFileRemove - Callback when file is removed (optional)
   * @param {boolean} options.showPreview - Whether to show file preview (default: true)
   * @param {boolean} options.showMetadata - Whether to show file metadata (default: true)
   * @param {boolean} options.allowMultiple - Allow multiple file selection (default: false)
   */
  constructor(options) {
    this.dropzoneId = options.dropzoneId;
    this.inputId = options.inputId;
    this.previewId = options.previewId;
    this.acceptedTypes = Array.isArray(options.acceptedTypes) 
      ? options.acceptedTypes 
      : (options.acceptedTypes ? [options.acceptedTypes] : []);
    this.maxSizeBytes = options.maxSizeBytes || null;
    this.onFileSelect = options.onFileSelect || (() => {});
    this.onFileRemove = options.onFileRemove || (() => {});
    this.showPreview = options.showPreview !== false;
    this.showMetadata = options.showMetadata !== false;
    this.allowMultiple = options.allowMultiple || false;
    
    this.dropzone = null;
    this.input = null;
    this.previewContainer = null;
    this.currentFiles = [];
    
    this.init();
  }
  
  /**
   * Initialize the file upload component
   */
  init() {
    this.dropzone = document.getElementById(this.dropzoneId);
    this.input = document.getElementById(this.inputId);
    
    if (!this.dropzone || !this.input) {
      console.error(`FileUploadManager: Could not find dropzone or input element`);
      return;
    }
    
    // Setup preview container if needed
    if (this.previewId) {
      this.previewContainer = document.getElementById(this.previewId);
    } else if (this.showPreview || this.showMetadata) {
      // Create a default preview container
      this.previewContainer = this.createPreviewContainer();
      this.dropzone.parentNode.insertBefore(this.previewContainer, this.dropzone.nextSibling);
    }
    
    this.setupEventListeners();
  }
  
  /**
   * Create a default preview container
   */
  createPreviewContainer() {
    const container = document.createElement('div');
    container.id = `${this.dropzoneId}-preview`;
    container.className = 'file-upload-preview mt-4 hidden';
    return container;
  }
  
  /**
   * Setup all event listeners for drag-and-drop and file selection
   */
  setupEventListeners() {
    // Prevent default drag behaviors on window
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      this.dropzone.addEventListener(eventName, this.preventDefaults.bind(this), false);
    });
    
    // Highlight dropzone when dragging files over it
    ['dragenter', 'dragover'].forEach(eventName => {
      this.dropzone.addEventListener(eventName, this.highlight.bind(this), false);
    });
    
    // Remove highlight when dragging leaves or dropping
    ['dragleave', 'drop'].forEach(eventName => {
      this.dropzone.addEventListener(eventName, this.unhighlight.bind(this), false);
    });
    
    // Handle dropped files
    this.dropzone.addEventListener('drop', this.handleDrop.bind(this), false);
    
    // Handle file input change (for browse button)
    this.input.addEventListener('change', this.handleFileInputChange.bind(this), false);
    
    // Handle click on dropzone (trigger file input)
    this.dropzone.addEventListener('click', (e) => {
      // Only trigger if not clicking on a label (which already triggers input)
      if (!e.target.closest('label')) {
        this.input.click();
      }
    });
  }
  
  /**
   * Prevent default drag behaviors
   */
  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  /**
   * Highlight dropzone during drag over
   */
  highlight(e) {
    // Only add drag-over class if it's the actual dropzone, not child elements
    if (e.currentTarget === this.dropzone) {
      this.dropzone.classList.add('drag-over');
    }
  }
  
  /**
   * Remove highlight from dropzone
   */
  unhighlight(e) {
    // Only remove if leaving the dropzone entirely (not just entering child elements)
    if (e.type === 'dragleave') {
      if (!this.dropzone.contains(e.relatedTarget)) {
        this.dropzone.classList.remove('drag-over');
      }
    } else {
      this.dropzone.classList.remove('drag-over');
    }
  }
  
  /**
   * Handle file drop event
   */
  handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
      // Transfer files to input element
      this.transferFilesToInput(files);
    }
  }
  
  /**
   * Handle file input change event
   */
  handleFileInputChange(e) {
    const files = e.target.files;
    if (files.length > 0) {
      this.handleFiles(files);
    }
  }
  
  /**
   * Transfer dropped files to the file input element
   */
  transferFilesToInput(files) {
    try {
      const dt = new DataTransfer();
      
      // Add files to DataTransfer object
      for (let i = 0; i < files.length; i++) {
        if (!this.allowMultiple && i > 0) break;
        dt.items.add(files[i]);
      }
      
      // Assign to input
      this.input.files = dt.files;
      
      // Trigger change event
      this.input.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (error) {
      // Fallback: directly handle files if DataTransfer not supported
      console.warn('DataTransfer not fully supported, handling files directly');
      this.handleFiles(files);
    }
  }
  
  /**
   * Handle selected files
   */
  handleFiles(files) {
    // Validate files
    const validFiles = [];
    const errors = [];
    
    for (let i = 0; i < files.length; i++) {
      if (!this.allowMultiple && i > 0) break;
      
      const file = files[i];
      const validation = this.validateFile(file);
      
      if (validation.valid) {
        validFiles.push(file);
      } else {
        errors.push({ file: file.name, error: validation.error });
      }
    }
    
    // Show errors if any
    if (errors.length > 0) {
      this.showErrors(errors);
    }
    
    // Process valid files
    if (validFiles.length > 0) {
      this.currentFiles = validFiles;
      this.displayFiles(validFiles);
      this.onFileSelect(validFiles);
    }
  }
  
  /**
   * Validate a single file
   */
  validateFile(file) {
    // Check file size
    if (this.maxSizeBytes && file.size > this.maxSizeBytes) {
      return {
        valid: false,
        error: `File size (${this.formatBytes(file.size)}) exceeds maximum allowed size (${this.formatBytes(this.maxSizeBytes)})`
      };
    }
    
    // Check file type if acceptedTypes is specified
    if (this.acceptedTypes.length > 0) {
      const fileType = file.type;
      const fileName = file.name.toLowerCase();
      
      let typeMatched = false;
      
      for (const acceptedType of this.acceptedTypes) {
        if (acceptedType.startsWith('.')) {
          // Extension match
          if (fileName.endsWith(acceptedType.toLowerCase())) {
            typeMatched = true;
            break;
          }
        } else if (acceptedType.includes('*')) {
          // Wildcard match (e.g., "image/*")
          const pattern = acceptedType.replace('*', '.*');
          const regex = new RegExp(`^${pattern}$`);
          if (regex.test(fileType)) {
            typeMatched = true;
            break;
          }
        } else {
          // Exact MIME type match
          if (fileType === acceptedType) {
            typeMatched = true;
            break;
          }
        }
      }
      
      if (!typeMatched) {
        return {
          valid: false,
          error: `File type "${fileType || 'unknown'}" is not supported. Accepted types: ${this.acceptedTypes.join(', ')}`
        };
      }
    }
    
    return { valid: true };
  }
  
  /**
   * Display files in preview container
   */
  displayFiles(files) {
    if (!this.previewContainer) return;
    
    // Clear previous preview
    this.previewContainer.innerHTML = '';
    this.previewContainer.classList.remove('hidden');
    
    files.forEach((file, index) => {
      const fileItem = this.createFileItem(file, index);
      this.previewContainer.appendChild(fileItem);
    });
  }
  
  /**
   * Create a file item element
   */
  createFileItem(file, index) {
    const container = document.createElement('div');
    container.className = 'file-item-container bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700';
    
    // Create preview if it's an image
    if (this.showPreview && file.type.startsWith('image/')) {
      const preview = this.createImagePreview(file);
      container.appendChild(preview);
    } else if (this.showPreview && file.type === 'application/pdf') {
      const pdfIcon = this.createPDFPreview(file);
      container.appendChild(pdfIcon);
    } else if (this.showPreview) {
      const genericIcon = this.createGenericPreview(file);
      container.appendChild(genericIcon);
    }
    
    // Create metadata section
    if (this.showMetadata) {
      const metadata = this.createMetadata(file);
      container.appendChild(metadata);
    }
    
    // Create remove button
    const removeBtn = this.createRemoveButton(index);
    container.appendChild(removeBtn);
    
    return container;
  }
  
  /**
   * Create image preview element
   */
  createImagePreview(file) {
    const img = document.createElement('img');
    img.className = 'file-preview-image w-full max-h-64 object-contain rounded-lg mb-3';
    img.alt = 'File preview';
    
    // Use FileReader to generate preview
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.onerror = () => {
      console.error('Error reading file for preview');
      img.src = '';
      img.alt = 'Preview unavailable';
    };
    reader.readAsDataURL(file);
    
    return img;
  }
  
  /**
   * Create PDF preview icon
   */
  createPDFPreview(file) {
    const container = document.createElement('div');
    container.className = 'file-preview-pdf flex items-center justify-center py-8 mb-3';
    container.innerHTML = `
      <div class="text-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 mx-auto text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <p class="text-sm text-slate-600 dark:text-slate-400">PDF Document</p>
      </div>
    `;
    return container;
  }
  
  /**
   * Create generic file preview icon
   */
  createGenericPreview(file) {
    const container = document.createElement('div');
    container.className = 'file-preview-generic flex items-center justify-center py-8 mb-3';
    container.innerHTML = `
      <div class="text-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 mx-auto text-blue-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p class="text-sm text-slate-600 dark:text-slate-400">File</p>
      </div>
    `;
    return container;
  }
  
  /**
   * Create metadata display element
   */
  createMetadata(file) {
    const metadata = document.createElement('div');
    metadata.className = 'file-metadata space-y-1 mb-3';
    
    const nameEl = document.createElement('p');
    nameEl.className = 'text-sm font-semibold text-slate-800 dark:text-slate-200 truncate';
    nameEl.textContent = file.name;
    nameEl.title = file.name;
    
    const detailsEl = document.createElement('p');
    detailsEl.className = 'text-xs text-slate-500 dark:text-slate-400';
    detailsEl.textContent = `${file.type || 'Unknown type'} • ${this.formatBytes(file.size)}`;
    
    metadata.appendChild(nameEl);
    metadata.appendChild(detailsEl);
    
    return metadata;
  }
  
  /**
   * Create remove button
   */
  createRemoveButton(index) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'file-remove-btn w-full px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2';
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      Remove File
    `;
    
    btn.addEventListener('click', () => this.removeFile(index));
    
    return btn;
  }
  
  /**
   * Show validation errors
   */
  showErrors(errors) {
    errors.forEach(({ file, error }) => {
      // Use toast notification if available
      if (typeof showToast === 'function') {
        showToast(`${file}: ${error}`, 'error');
      } else {
        console.error(`File validation error for ${file}: ${error}`);
        alert(`${file}: ${error}`);
      }
    });
  }
  
  /**
   * Remove a file from the selection
   */
  removeFile(index) {
    // Remove from current files array
    this.currentFiles.splice(index, 1);
    
    // Update file input
    if (this.currentFiles.length === 0) {
      // Clear the input
      this.input.value = '';
      this.previewContainer.classList.add('hidden');
      this.previewContainer.innerHTML = '';
    } else {
      // Recreate DataTransfer with remaining files
      const dt = new DataTransfer();
      this.currentFiles.forEach(file => dt.items.add(file));
      this.input.files = dt.files;
      
      // Redisplay files
      this.displayFiles(this.currentFiles);
    }
    
    // Call callback
    this.onFileRemove(index, this.currentFiles);
  }
  
  /**
   * Format bytes to human-readable string
   */
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
  
  /**
   * Get currently selected files
   */
  getFiles() {
    return this.currentFiles;
  }
  
  /**
   * Clear all files
   */
  clearFiles() {
    this.currentFiles = [];
    this.input.value = '';
    if (this.previewContainer) {
      this.previewContainer.classList.add('hidden');
      this.previewContainer.innerHTML = '';
    }
  }
  
  /**
   * Destroy the manager and clean up event listeners
   */
  destroy() {
    // Remove event listeners
    if (this.dropzone) {
      this.dropzone.removeEventListener('drop', this.handleDrop);
      this.dropzone.removeEventListener('dragenter', this.highlight);
      this.dropzone.removeEventListener('dragover', this.highlight);
      this.dropzone.removeEventListener('dragleave', this.unhighlight);
      this.dropzone.removeEventListener('drop', this.unhighlight);
    }
    
    if (this.input) {
      this.input.removeEventListener('change', this.handleFileInputChange);
    }
    
    this.clearFiles();
  }
}

/**
 * Legacy compatibility function - maintains backward compatibility with existing setupDragAndDrop
 */
function setupEnhancedDragAndDrop(dropzoneId, inputId, options = {}) {
  return new FileUploadManager({
    dropzoneId,
    inputId,
    ...options
  });
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FileUploadManager, setupEnhancedDragAndDrop };
}
