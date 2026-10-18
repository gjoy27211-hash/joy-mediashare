/**
 * Joy MediaShare - Frontend Application Logic
 * Strict Original Quality Media Sharing
 * Features:
 *  - Animated Upload Progress Bar with Live Percentage, Speed, and ETA (Option 3)
 *  - Dark / Light Mode Toggle with LocalStorage Persistence (Option 4)
 *  - Drag & Drop Original File Queue
 *  - Real-time Lossless Session Generation & QR Code Display
 *  - About Creator Modal Interface
 */

(function() {
  'use strict';

  // ==========================================
  // 1. THEME MANAGER (DARK / LIGHT MODE - OPTION 4)
  // ==========================================
  const THEME_STORAGE_KEY = 'joy_theme';
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeText = document.getElementById('themeText');

  function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    // Default to dark mode as requested, or detect system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);

    if (themeText) {
      themeText.textContent = theme === 'dark' ? 'ডার্ক' : 'লাইট';
    }

    if (themeToggleBtn) {
      themeToggleBtn.setAttribute('title', theme === 'dark' 
        ? 'লাইট মোড চালু করুন (Switch to Light Mode)' 
        : 'ডার্ক মোড চালু করুন (Switch to Dark Mode)');
      themeToggleBtn.setAttribute('aria-label', `Current theme: ${theme}. Click to switch theme.`);
    }
  }

  // Initialize theme
  const initialTheme = getPreferredTheme();
  applyTheme(initialTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
    });
  }

  // Listen to OS theme changes if user has not explicitly chosen
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(THEME_STORAGE_KEY)) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  // ==========================================
  // 2. DOM ELEMENTS
  // ==========================================
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const browseBtn = document.getElementById('browseBtn');
  const selectedFilesSection = document.getElementById('selectedFilesSection');
  const fileQueueList = document.getElementById('fileQueueList');
  const filesSummary = document.getElementById('filesSummary');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const startUploadBtn = document.getElementById('startUploadBtn');

  // Animated Progress Bar Elements (Option 3)
  const uploadProgressContainer = document.getElementById('uploadProgressContainer');
  const progressBarFill = document.getElementById('progressBarFill');
  const progressPercentText = document.getElementById('progressPercentText');
  const progressBytesText = document.getElementById('progressBytesText');
  const progressSpeedText = document.getElementById('progressSpeedText');
  const progressEtaText = document.getElementById('progressEtaText');
  const progressStatusText = document.getElementById('progressStatusText');
  const progressPulseDot = document.getElementById('progressPulseDot');
  const cancelUploadBtn = document.getElementById('cancelUploadBtn');

  // Main UI Sections
  const uploadSection = document.getElementById('uploadSection');
  const uploadSuccessSection = document.getElementById('uploadSuccessSection');
  const errorBanner = document.getElementById('errorBanner');
  const errorMessage = document.getElementById('errorMessage');

  // Success Screen Elements
  const shareUrlInput = document.getElementById('shareUrlInput');
  const copyLinkBtn = document.getElementById('copyLinkBtn');
  const qrCodeImg = document.getElementById('qrCodeImg');
  const downloadQrBtn = document.getElementById('downloadQrBtn');
  const openGalleryBtn = document.getElementById('openGalleryBtn');
  const startNewUploadBtn = document.getElementById('startNewUploadBtn');
  const summarySessionId = document.getElementById('summarySessionId');
  const summaryFileCount = document.getElementById('summaryFileCount');
  const summaryTotalSize = document.getElementById('summaryTotalSize');
  const summaryExpiresAt = document.getElementById('summaryExpiresAt');
  const toast = document.getElementById('toast');

  // About Creator Elements
  const aboutCreatorModal = document.getElementById('aboutCreatorModal');
  const closeAboutModalBtn = document.getElementById('closeAboutModalBtn');
  const floatingAboutBtn = document.getElementById('floatingAboutBtn');
  const headerAboutBtn = document.getElementById('headerAboutBtn');
  const footerAboutBtn = document.getElementById('footerAboutBtn');

  // State
  let selectedFiles = [];
  let currentXhr = null;
  let uploadStartTime = 0;
  let lastLoadedBytes = 0;
  let lastTimestamp = 0;

  // ==========================================
  // 3. UTILITIES & BENGALI FORMATTING
  // ==========================================
  function toBengaliNum(val) {
    if (val === undefined || val === null) return '';
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(val).replace(/[0-9]/g, (d) => bnDigits[parseInt(d, 10)]);
  }

  function formatBytes(bytes, decimals = 1) {
    if (!bytes || bytes === 0) return '০ B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const num = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
    return `${toBengaliNum(num)} ${sizes[i]}`;
  }

  function showError(msg) {
    errorMessage.textContent = msg;
    errorBanner.style.display = 'flex';
    window.scrollTo({ top: errorBanner.offsetTop - 20, behavior: 'smooth' });
  }

  function hideError() {
    errorBanner.style.display = 'none';
    errorMessage.textContent = '';
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3200);
  }

  // ==========================================
  // 4. QUEUE & FILE SELECTION
  // ==========================================
  function updateQueueUI() {
    if (selectedFiles.length === 0) {
      selectedFilesSection.classList.remove('visible');
      fileQueueList.innerHTML = '';
      return;
    }

    selectedFilesSection.classList.add('visible');
    fileQueueList.innerHTML = '';

    let totalBytes = 0;
    selectedFiles.forEach((file, index) => {
      totalBytes += file.size;
      const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|mkv|avi|3gp)$/i.test(file.name);

      const item = document.createElement('div');
      item.className = 'file-queue-item';
      item.innerHTML = `
        <div class="file-queue-left">
          <div class="file-type-icon ${isVideo ? 'video' : ''}">
            ${isVideo ? `
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
            ` : `
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            `}
          </div>
          <div class="file-info-col">
            <div class="file-name-text" title="${file.name}">${file.name}</div>
            <div class="file-meta-text">
              <span>${formatBytes(file.size)}</span>
              <span>&bull;</span>
              <span>${file.type || (isVideo ? 'ভিডিও' : 'ছবি')}</span>
            </div>
          </div>
        </div>
        <button type="button" class="remove-file-btn" data-index="${index}" title="ফাইল মুছুন">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      `;
      fileQueueList.appendChild(item);
    });

    filesSummary.textContent = `${toBengaliNum(selectedFiles.length)} টি ফাইল নির্বাচিত (${formatBytes(totalBytes)})`;
  }

  const MAX_FILE_SIZE_BYTES = 1024 * 1024 * 1024; // 1 GB (1024MB)

  function addFiles(newFiles) {
    hideError();
    const incoming = Array.from(newFiles);
    const oversizedFiles = [];

    incoming.forEach(file => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        oversizedFiles.push(`${file.name} (${formatBytes(file.size)})`);
        return;
      }
      // Check duplicate by name and size
      const exists = selectedFiles.some(f => f.name === file.name && f.size === file.size);
      if (!exists) {
        selectedFiles.push(file);
      }
    });

    if (oversizedFiles.length > 0) {
      showError(`ফাইলের সাইজ ১ GB এর চেয়ে বেশি: ${oversizedFiles.join(', ')}। প্রতি ফাইলে সর্বোচ্চ ১ GB অনুমোদিত।`);
    }

    updateQueueUI();
  }

  // Drag and Drop Listeners
  if (dropzone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('drag-over');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        addFiles(dt.files);
      }
    });

    dropzone.addEventListener('click', () => {
      fileInput.click();
    });
  }

  if (browseBtn) {
    browseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length > 0) {
        addFiles(fileInput.files);
      }
      fileInput.value = '';
    });
  }

  if (fileQueueList) {
    fileQueueList.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.remove-file-btn');
      if (removeBtn) {
        const idx = parseInt(removeBtn.getAttribute('data-index'), 10);
        selectedFiles.splice(idx, 1);
        updateQueueUI();
      }
    });
  }

  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      selectedFiles = [];
      updateQueueUI();
    });
  }

  // ==========================================
  // 5. ANIMATED UPLOAD WITH LIVE PROGRESS (OPTION 3)
  // ==========================================
  function resetUploadProgress() {
    if (uploadProgressContainer) uploadProgressContainer.classList.remove('visible');
    if (progressBarFill) progressBarFill.style.width = '0%';
    if (progressPercentText) progressPercentText.textContent = '০%';
    if (progressBytesText) progressBytesText.textContent = '০ MB / ০ MB';
    if (progressSpeedText) progressSpeedText.textContent = '-- MB/s';
    if (progressEtaText) progressEtaText.textContent = 'হিসাব করা হচ্ছে...';
    if (progressStatusText) progressStatusText.textContent = 'আসল ফাইল আপলোড হচ্ছে...';
    if (progressPulseDot) progressPulseDot.classList.remove('pulse-gold');

    if (dropzone) dropzone.style.pointerEvents = 'auto';
    if (startUploadBtn) startUploadBtn.disabled = false;
    if (clearAllBtn) clearAllBtn.disabled = false;
  }

  if (startUploadBtn) {
    startUploadBtn.addEventListener('click', () => {
      if (selectedFiles.length === 0) {
        showError('অনুগ্রহ করে আপলোড করার জন্য অন্তত একটি ফাইল নির্বাচন করুন।');
        return;
      }

      hideError();

      // Lock controls and reveal animated progress card
      uploadProgressContainer.classList.add('visible');
      dropzone.style.pointerEvents = 'none';
      startUploadBtn.disabled = true;
      clearAllBtn.disabled = true;

      // Reset progress visual state
      progressBarFill.style.width = '0%';
      progressPercentText.textContent = '০%';
      progressStatusText.textContent = 'আসল ফাইল আপলোড শুরু হচ্ছে...';
      progressPulseDot.classList.remove('pulse-gold');

      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('media', file);
      });

      const xhr = new XMLHttpRequest();
      currentXhr = xhr;
      uploadStartTime = performance.now();
      lastTimestamp = uploadStartTime;
      lastLoadedBytes = 0;

      // Configure upload request timeout to 30 minutes so 1GB transfers complete without dropping
      xhr.timeout = 30 * 60 * 1000; // 30 minutes (1,800,000 ms)

      // Track exact upload status with XMLHttpRequest upload.onprogress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && e.total > 0) {
          const now = performance.now();
          const elapsedSeconds = (now - uploadStartTime) / 1000;
          const percent = Math.min(100, Math.round((e.loaded / e.total) * 100));

          // Smooth width update
          progressBarFill.style.width = `${percent}%`;
          progressPercentText.textContent = `${toBengaliNum(percent)}%`;

          // Transferred bytes
          progressBytesText.textContent = `${formatBytes(e.loaded)} / ${formatBytes(e.total)}`;

          // Speed calculation
          const speedBytesPerSec = elapsedSeconds > 0.15 ? (e.loaded / elapsedSeconds) : 0;
          if (speedBytesPerSec > 0) {
            progressSpeedText.textContent = `${formatBytes(speedBytesPerSec)}/s`;
          } else {
            progressSpeedText.textContent = 'হিসাব হচ্ছে...';
          }

          // ETA calculation
          if (percent >= 100) {
            progressStatusText.textContent = 'প্রসেসিং হচ্ছে... আসল SHA-256 চেকসাম যাচাই ও QR তৈরি হচ্ছে...';
            progressEtaText.textContent = 'প্রসেসিং হচ্ছে...';
            progressPulseDot.classList.add('pulse-gold');
          } else if (speedBytesPerSec > 0) {
            const remainingBytes = Math.max(0, e.total - e.loaded);
            const remainingSeconds = Math.ceil(remainingBytes / speedBytesPerSec);

            if (remainingSeconds < 60) {
              progressEtaText.textContent = `আর বাকি ${toBengaliNum(remainingSeconds)} সেকেন্ড`;
            } else {
              const mins = Math.floor(remainingSeconds / 60);
              const secs = remainingSeconds % 60;
              progressEtaText.textContent = `আর বাকি ${toBengaliNum(mins)} মিনিট ${toBengaliNum(secs)} সেকেন্ড`;
            }
            progressStatusText.textContent = 'আসল ফাইল আপলোড হচ্ছে...';
          } else {
            progressEtaText.textContent = 'হিসাব করা হচ্ছে...';
          }
        }
      });

      // Handle upload network error
      xhr.upload.addEventListener('error', () => {
        currentXhr = null;
        showError('আপলোডের সময় নেটওয়ার্ক সমস্যা হয়েছে। আপনার ইন্টারনেট সংযোগ পরীক্ষা করে পুনরায় চেষ্টা করুন।');
        resetUploadProgress();
      });

      // Once upload completes
      xhr.addEventListener('load', () => {
        currentXhr = null;

        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            if (res.success) {
              // Smooth 100% completion before transition
              progressBarFill.style.width = '100%';
              progressPercentText.textContent = '১০০%';
              progressStatusText.textContent = 'সম্পন্ন হয়েছে! গ্যালারি প্রস্তুত করা হচ্ছে...';
              progressEtaText.textContent = 'সম্পন্ন!';

              // Smooth transition into the QR code screen
              setTimeout(() => {
                showSuccessState(res);
              }, 450);
            } else {
              showError(res.error || 'আপলোড ব্যর্থ হয়েছে।');
              resetUploadProgress();
            }
          } catch (err) {
            showError('সার্ভার থেকে অপ্রত্যাশিত প্রতিক্রিয়া পাওয়া গেছে।');
            resetUploadProgress();
          }
        } else {
          let errorMsg = 'আপলোড ব্যর্থ হয়েছে। ফাইলের সাইজ বা নেটওয়ার্ক চেক করুন।';
          try {
            const res = JSON.parse(xhr.responseText);
            if (res.error) errorMsg = res.error;
          } catch (_) {}
          showError(errorMsg);
          resetUploadProgress();
        }
      });

      xhr.addEventListener('timeout', () => {
        currentXhr = null;
        showError('আপলোড টাইমআউট হয়েছে। ১ জিবি ফাইলের জন্য সংযোগটি অতিরিক্ত সময় নিয়েছে বা বন্ধ হয়ে গেছে। দয়া করে পুনরায় আপলোড করুন।');
        resetUploadProgress();
      });

      xhr.addEventListener('error', () => {
        currentXhr = null;
        showError('আপলোডের সময় নেটওয়ার্ক সংযোগ বিচ্ছিন্ন হয়েছে। দয়া করে আবার চেষ্টা করুন।');
        resetUploadProgress();
      });

      xhr.addEventListener('abort', () => {
        currentXhr = null;
        showToast('আপলোড বাতিল করা হয়েছে।');
        resetUploadProgress();
      });

      xhr.open('POST', '/api/upload');
      xhr.send(formData);
    });
  }

  // Cancel upload button
  if (cancelUploadBtn) {
    cancelUploadBtn.addEventListener('click', () => {
      if (currentXhr) {
        currentXhr.abort();
      }
    });
  }

  // ==========================================
  // 6. SUCCESS STATE & QR DISPLAY
  // ==========================================
  function showSuccessState(data) {
    if (uploadSection) uploadSection.style.display = 'none';
    if (uploadSuccessSection) {
      uploadSuccessSection.classList.add('visible');
    }

    if (shareUrlInput) shareUrlInput.value = data.shareUrl;
    if (qrCodeImg) qrCodeImg.src = data.qrCodeDataUrl;
    if (downloadQrBtn) downloadQrBtn.href = data.qrCodeDataUrl;
    if (openGalleryBtn) openGalleryBtn.href = data.shareUrl;

    if (summarySessionId) summarySessionId.textContent = data.sessionId;
    if (summaryFileCount) summaryFileCount.textContent = `${toBengaliNum(data.fileCount)} টি ফাইল`;
    if (summaryTotalSize) summaryTotalSize.textContent = formatBytes(data.totalSize);
    if (summaryExpiresAt) {
      summaryExpiresAt.textContent = new Date(data.expiresAt).toLocaleString('bn-BD', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    }

    window.scrollTo({ top: uploadSuccessSection.offsetTop - 20, behavior: 'smooth' });
    showToast('সেশন ও QR কোড সফলভাবে তৈরি হয়েছে!');
  }

  // Copy link
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', () => {
      const textToCopy = shareUrlInput.value;
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          showToast('লিংক ক্লিপবোর্ডে কপি করা হয়েছে!');
        }).catch(() => {
          fallbackCopy(textToCopy);
        });
      } else {
        fallbackCopy(textToCopy);
      }
    });
  }

  function fallbackCopy(text) {
    if (!shareUrlInput) return;
    shareUrlInput.select();
    try {
      document.execCommand('copy');
      showToast('লিংক ক্লিপবোর্ডে কপি করা হয়েছে!');
    } catch (err) {
      showToast('অটোমেটিক কপি সম্ভব হয়নি। অনুগ্রহ করে লিংকটি সিলেক্ট করে কপি করুন।');
    }
  }

  // Start new upload session
  if (startNewUploadBtn) {
    startNewUploadBtn.addEventListener('click', () => {
      selectedFiles = [];
      updateQueueUI();
      resetUploadProgress();
      if (uploadSuccessSection) uploadSuccessSection.classList.remove('visible');
      if (uploadSection) uploadSection.style.display = 'block';
      window.scrollTo({ top: uploadSection.offsetTop - 20, behavior: 'smooth' });
    });
  }

  // ==========================================
  // 7. ABOUT CREATOR MODAL POPUP HANDLERS
  // ==========================================
  function openAboutModal() {
    if (aboutCreatorModal) {
      aboutCreatorModal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeAboutModal() {
    if (aboutCreatorModal) {
      aboutCreatorModal.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  if (floatingAboutBtn) floatingAboutBtn.addEventListener('click', openAboutModal);
  if (headerAboutBtn) headerAboutBtn.addEventListener('click', openAboutModal);
  if (footerAboutBtn) footerAboutBtn.addEventListener('click', openAboutModal);
  if (closeAboutModalBtn) closeAboutModalBtn.addEventListener('click', closeAboutModal);

  if (aboutCreatorModal) {
    aboutCreatorModal.addEventListener('click', (e) => {
      if (e.target === aboutCreatorModal) {
        closeAboutModal();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && aboutCreatorModal && aboutCreatorModal.classList.contains('open')) {
      closeAboutModal();
    }
  });

})();
