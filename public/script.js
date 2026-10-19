/**
 * Joy MediaShare - Frontend Application Logic
 * Strict Original Quality Media Sharing
 * Features:
 *  - Multi-Language Support (Bangla & English) with LocalStorage Persistence
 *  - Animated Upload Progress Bar with Live Percentage, Speed, and ETA (Option 3)
 *  - Dark / Light Mode Toggle with LocalStorage Persistence (Option 4)
 *  - Drag & Drop Original File Queue (up to 1GB per file)
 *  - Real-time Lossless Session Generation & QR Code Display
 *  - About Creator Modal Interface
 */

(function() {
  'use strict';

  // ==========================================
  // 1. LANGUAGE & THEME STORAGE KEYS
  // ==========================================
  const LANG_STORAGE_KEY = 'joy_lang';
  const THEME_STORAGE_KEY = 'joy_theme';

  // ==========================================
  // 2. I18N DICTIONARY FOR HOMEPAGE
  // ==========================================
  const I18N = {
    bn: {
      htmlTitle: 'Joy MediaShare - আসল কোয়ালিটিতে ছবি ও ভিডিও শেয়ারিং',
      metaDesc: '১০০% আসল কোয়ালিটিতে ছবি এবং ভিডিও শেয়ার করুন। কোনো কম্প্রেশন নেই, কোনো রূপান্তর নেই। সাথে সাথে QR কোড এবং শেয়ারিং লিংক।',
      brandTag: 'আসল কোয়ালিটি',
      losslessBadge: 'লসল্যাস গ্যারান্টি (১০০% অপরিবর্তিত)',
      aboutCreatorBtn: 'About Creator',
      themeDark: 'ডার্ক',
      themeLight: 'লাইট',
      themeDarkTitle: 'লাইট মোড চালু করুন (Switch to Light Mode)',
      themeLightTitle: 'ডার্ক মোড চালু করুন (Switch to Dark Mode)',
      heroTitle: 'আসল কোয়ালিটিতে ছবি ও ভিডিও শেয়ার করুন',
      heroSubtitle: 'হাই-রেজোলিউশন ফটো ও ভিডিও আপলোড করুন। কোনো রকম কম্প্রেশন, সাইজ কমানো বা রি-এনকোডিং ছাড়াই হুবহু আসল ফাইলে ডাউনলোড করুন।',
      pill1: '১০০% অবিকৃত আসল বাইট',
      pill2: 'EXIF ও কালার প্রোফাইল অক্ষত',
      pill3: 'তাত্ক্ষণিক মোবাইল QR কোড',
      pill4: 'SHA-256 চেকসাম ভেরিফায়েড',
      dropPrimary: 'ফাইলগুলো টেনে এনে এখানে ছেড়ে দিন (Drag & Drop)',
      dropSecondary: 'অথবা আপনার ডিভাইস থেকে বেছে নিতে নিচের বাটনে চাপ দিন',
      browseBtn: 'ছবি ও ভিডিও সিলেক্ট করুন',
      dropHints: 'সমর্থিত ফরম্যাট: JPEG, PNG, WebP, GIF, AVIF, HEIC, TIFF, MP4, MOV, WebM, MKV<br>প্রতি ফাইলে সর্বোচ্চ ১ GB &bull; আপলোড থাকবে সম্পূর্ণ অরজিনাল ও অবিকৃত',
      selectedTitle: 'শেয়ার করার জন্য নির্বাচিত ফাইলসমূহ',
      clearAllBtn: 'সব মুছুন',
      startUploadBtn: 'আপলোড করুন ও শেয়ার লিংক তৈরি করুন',
      progressTitleInit: 'আসল ফাইল আপলোড শুরু হচ্ছে...',
      progressTitleUploading: 'আসল ফাইল আপলোড হচ্ছে...',
      progressTitleProcessing: 'প্রসেসিং হচ্ছে... আসল SHA-256 চেকসাম যাচাই ও QR তৈরি হচ্ছে...',
      progressTitleComplete: 'সম্পন্ন হয়েছে! গ্যালারি প্রস্তুত করা হচ্ছে...',
      statDataLabel: 'ট্রান্সফার ডাটা',
      statSpeedLabel: 'লাইভ গতি',
      statEtaLabel: 'বাকি সময় (ETA)',
      statCalculating: 'হিসাব করা হচ্ছে...',
      statProcessing: 'প্রসেসিং হচ্ছে...',
      statDone: 'সম্পন্ন!',
      progressHint: '১০০% আসল বাইট সংরক্ষিত হচ্ছে &bull; কোনো কম্প্রেশন নেই',
      cancelUploadBtn: 'আপলোড বাতিল করুন',
      successTitle: 'আপলোড সফল হয়েছে!',
      successDesc: 'আপনার ফাইলগুলো অবিকৃত আসল অবস্থায় সংরক্ষিত হয়েছে।',
      shareLabel: 'ইউনিক শেয়ারিং গ্যালারি লিংক',
      copyLinkBtn: 'লিংক কপি করুন',
      shareHint: 'এই লিংকটি যার কাছে থাকবে সে মিডিয়া প্রিভিউ দেখতে এবং আসল ফাইল ডাউনলোড করতে পারবে।',
      metaSessionId: 'সেশন আইডি:',
      metaSavedFiles: 'সংরক্ষিত ফাইল:',
      metaTotalSize: 'মোট ফাইলের সাইজ:',
      metaExpiresAt: 'সেশনের মেয়াদ:',
      metaQuality: 'অরিজিনাল কোয়ালিটি:',
      metaQualityVal: 'SHA-256 ভেরিফায়েড লসল্যাস',
      openGalleryBtn: 'এখনই গ্যালারি খুলুন',
      uploadMoreBtn: 'আরও ফাইল আপলোড করুন',
      qrCaption: 'স্মার্টফোন ক্যামেরা দিয়ে স্ক্যান করে সরাসরি মোবাইলে ফাইল ডাউনলোড করুন',
      downloadQrBtn: 'QR কোড ডাউনলোড করুন',
      aboutModalCloseTitle: 'বন্ধ করুন',
      aboutRole: 'Web Developer & Creator of Joy MediaShare',
      aboutBio: '"হ্যালো! আমি আরিফুল Hasan জয়। আমি একজন ওয়েব ডেভেলপার এবং বর্তমানে ক্লাস ৯-এ পড়াশোনা করছি। ছবি ও ভিডিওর আসল কোয়ালিটি বজায় রেখে সহজে কিউআর কোডের মাধ্যমে শেয়ার করার জন্য আমি এই প্ল্যাটফর্মটি তৈরি করেছি।"',
      aboutConnectBtn: 'Connect with Me',
      footerCopyright: '&copy; Joy MediaShare &bull; ১০০% আসল কোয়ালিটিতে ছবি ও ভিডিও শেয়ারিং',
      toastCopied: 'লিংক ক্লিপবোর্ডে কপি করা হয়েছে!',
      toastCopyFail: 'অটোমেটিক কপি সম্ভব হয়নি। অনুগ্রহ করে লিংকটি সিলেক্ট করে কপি করুন।',
      toastCancelled: 'আপলোড বাতিল করা হয়েছে।',
      toastCreated: 'সেশন ও QR কোড সফলভাবে তৈরি হয়েছে!',
      errSelectFiles: 'অনুগ্রহ করে আপলোড করার জন্য অন্তত একটি ফাইল নির্বাচন করুন।',
      errNetwork: 'আপলোডের সময় নেটওয়ার্ক সমস্যা হয়েছে। আপনার ইন্টারনেট সংযোগ পরীক্ষা করে পুনরায় চেষ্টা করুন।',
      errTimeout: 'আপলোড টাইমআউট হয়েছে। ১ জিবি ফাইলের জন্য সংযোগটি অতিরিক্ত সময় নিয়েছে বা বন্ধ হয়ে গেছে। দয়া করে পুনরায় আপলোড করুন।',
      errDiscon: 'আপলোডের সময় নেটওয়ার্ক সংযোগ বিচ্ছিন্ন হয়েছে। দয়া করে আবার চেষ্টা করুন।',
      errUnexpected: 'সার্ভার থেকে অপ্রত্যাশিত প্রতিক্রিয়া পাওয়া গেছে।',
      errFallback: 'আপলোড ব্যর্থ হয়েছে। ফাইলের সাইজ বা নেটওয়ার্ক চেক করুন।',
      oversizedMsg: (names) => `ফাইলের সাইজ ১ GB এর চেয়ে বেশি: ${names}। প্রতি ফাইলে সর্বোচ্চ ১ GB অনুমোদিত।`,
      summaryFilesText: (count, size) => `${toBengaliNum(count)} টি ফাইল নির্বাচিত (${size})`,
      countFilesText: (count) => `${toBengaliNum(count)} টি ফাইল`,
      etaSecondsText: (sec) => `আর বাকি ${toBengaliNum(sec)} সেকেন্ড`,
      etaMinsSecsText: (min, sec) => `আর বাকি ${toBengaliNum(min)} মিনিট ${toBengaliNum(sec)} সেকেন্ড`
    },
    en: {
      htmlTitle: 'Joy MediaShare - Original Quality Photo & Video Sharing',
      metaDesc: 'Share photos and videos in 100% original quality. Zero compression, zero conversion. Instant QR code and sharing link.',
      brandTag: 'ORIGINAL QUALITY',
      losslessBadge: 'Lossless Guarantee (100% Unaltered)',
      aboutCreatorBtn: 'About Creator',
      themeDark: 'Dark',
      themeLight: 'Light',
      themeDarkTitle: 'Switch to Light Mode',
      themeLightTitle: 'Switch to Dark Mode',
      heroTitle: 'Share Photos & Videos in Pure Original Quality',
      heroSubtitle: 'Upload high-resolution photos and videos. Download exact binary original files without any compression, resizing, or re-encoding.',
      pill1: '100% Unaltered Original Bytes',
      pill2: 'EXIF & Color Profiles Preserved',
      pill3: 'Instant Mobile QR Code',
      pill4: 'SHA-256 Checksum Verified',
      dropPrimary: 'Drag & drop files here (Drag & Drop)',
      dropSecondary: 'or click the button below to browse from your device',
      browseBtn: 'Select Photos & Videos',
      dropHints: 'Supported formats: JPEG, PNG, WebP, GIF, AVIF, HEIC, TIFF, MP4, MOV, WebM, MKV<br>Max 1 GB per file &bull; Completely original and lossless upload',
      selectedTitle: 'Files Selected for Sharing',
      clearAllBtn: 'Clear All',
      startUploadBtn: 'Upload & Generate Share Link',
      progressTitleInit: 'Starting original file upload...',
      progressTitleUploading: 'Uploading original files...',
      progressTitleProcessing: 'Processing... Verifying SHA-256 checksum and generating QR...',
      progressTitleComplete: 'Completed! Preparing gallery...',
      statDataLabel: 'Transferred Data',
      statSpeedLabel: 'Live Speed',
      statEtaLabel: 'Time Remaining (ETA)',
      statCalculating: 'Calculating...',
      statProcessing: 'Processing...',
      statDone: 'Completed!',
      progressHint: '100% original bytes preserved &bull; Zero compression',
      cancelUploadBtn: 'Cancel Upload',
      successTitle: 'Upload Successful!',
      successDesc: 'Your files are securely preserved in their unaltered original state.',
      shareLabel: 'Unique Sharing Gallery Link',
      copyLinkBtn: 'Copy Link',
      shareHint: 'Anyone with this link can view the media preview and download the original files.',
      metaSessionId: 'Session ID:',
      metaSavedFiles: 'Saved Files:',
      metaTotalSize: 'Total File Size:',
      metaExpiresAt: 'Session Expiry:',
      metaQuality: 'Original Quality:',
      metaQualityVal: 'SHA-256 Verified Lossless',
      openGalleryBtn: 'Open Gallery Now',
      uploadMoreBtn: 'Upload More Files',
      qrCaption: 'Scan with smartphone camera to download files directly to mobile',
      downloadQrBtn: 'Download QR Code',
      aboutModalCloseTitle: 'Close',
      aboutRole: 'Web Developer & Creator of Joy MediaShare',
      aboutBio: '"Hello! I am Ariful Hasan Joy. I am a web developer currently studying in Class 9. I built this platform to make it effortless to share photos and videos in their pure original quality via QR codes."',
      aboutConnectBtn: 'Connect with Me',
      footerCopyright: '&copy; Joy MediaShare &bull; 100% Original Quality Photo & Video Sharing',
      toastCopied: 'Link copied to clipboard!',
      toastCopyFail: 'Automatic copy failed. Please select the link manually to copy.',
      toastCancelled: 'Upload cancelled.',
      toastCreated: 'Session & QR Code generated successfully!',
      errSelectFiles: 'Please select at least one file to upload.',
      errNetwork: 'Network issue occurred during upload. Please check your internet connection and try again.',
      errTimeout: 'Upload timed out. Transferring 1GB took too long or connection dropped. Please retry.',
      errDiscon: 'Network connection lost during upload. Please try again.',
      errUnexpected: 'Unexpected response received from server.',
      errFallback: 'Upload failed. Please check file size or network connection.',
      oversizedMsg: (names) => `File size exceeds 1 GB: ${names}. Maximum 1 GB allowed per file.`,
      summaryFilesText: (count, size) => `${count} file${count === 1 ? '' : 's'} selected (${size})`,
      countFilesText: (count) => `${count} file${count === 1 ? '' : 's'}`,
      etaSecondsText: (sec) => `${sec}s remaining`,
      etaMinsSecsText: (min, sec) => `${min}m ${sec}s remaining`
    }
  };

  let currentLang = localStorage.getItem(LANG_STORAGE_KEY) || 'bn';

  // ==========================================
  // 3. THEME MANAGER (DARK / LIGHT MODE - OPTION 4)
  // ==========================================
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeText = document.getElementById('themeText');

  function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);

    const t = I18N[currentLang];
    if (themeText) {
      themeText.textContent = theme === 'dark' ? t.themeDark : t.themeLight;
    }

    if (themeToggleBtn) {
      themeToggleBtn.setAttribute('title', theme === 'dark' ? t.themeDarkTitle : t.themeLightTitle);
      themeToggleBtn.setAttribute('aria-label', `Current theme: ${theme}. Click to switch theme.`);
    }
  }

  const initialTheme = getPreferredTheme();
  applyTheme(initialTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
    });
  }

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(THEME_STORAGE_KEY)) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  // ==========================================
  // 4. LANGUAGE MANAGER (EN / বাংলা)
  // ==========================================
  const langBnBtn = document.getElementById('langBnBtn');
  const langEnBtn = document.getElementById('langEnBtn');

  function applyLanguage(lang) {
    currentLang = (lang === 'en') ? 'en' : 'bn';
    localStorage.setItem(LANG_STORAGE_KEY, currentLang);
    document.documentElement.setAttribute('lang', currentLang);

    if (langBnBtn && langEnBtn) {
      if (currentLang === 'bn') {
        langBnBtn.classList.add('active');
        langEnBtn.classList.remove('active');
      } else {
        langEnBtn.classList.add('active');
        langBnBtn.classList.remove('active');
      }
    }

    const t = I18N[currentLang];

    // Document head titles
    document.title = t.htmlTitle;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', t.metaDesc);

    // Header elements
    const brandTag = document.getElementById('brandTag');
    if (brandTag) brandTag.textContent = t.brandTag;

    const losslessBadgeText = document.getElementById('losslessBadgeText');
    if (losslessBadgeText) losslessBadgeText.textContent = t.losslessBadge;

    const headerAboutText = document.getElementById('headerAboutText');
    if (headerAboutText) headerAboutText.textContent = t.aboutCreatorBtn;

    const floatingAboutText = document.getElementById('floatingAboutText');
    if (floatingAboutText) floatingAboutText.textContent = t.aboutCreatorBtn;

    const footerAboutText = document.getElementById('footerAboutText');
    if (footerAboutText) footerAboutText.textContent = t.aboutCreatorBtn;

    // Refresh theme button label for current language
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    if (themeText) themeText.textContent = currentTheme === 'dark' ? t.themeDark : t.themeLight;
    if (themeToggleBtn) {
      themeToggleBtn.setAttribute('title', currentTheme === 'dark' ? t.themeDarkTitle : t.themeLightTitle);
    }

    // Hero section
    const heroTitle = document.getElementById('heroTitle');
    if (heroTitle) heroTitle.textContent = t.heroTitle;

    const heroSubtitle = document.getElementById('heroSubtitle');
    if (heroSubtitle) heroSubtitle.textContent = t.heroSubtitle;

    const pill1Text = document.getElementById('pill1Text');
    if (pill1Text) pill1Text.textContent = t.pill1;

    const pill2Text = document.getElementById('pill2Text');
    if (pill2Text) pill2Text.textContent = t.pill2;

    const pill3Text = document.getElementById('pill3Text');
    if (pill3Text) pill3Text.textContent = t.pill3;

    const pill4Text = document.getElementById('pill4Text');
    if (pill4Text) pill4Text.textContent = t.pill4;

    // Dropzone elements
    const dropPrimary = document.getElementById('dropPrimary');
    if (dropPrimary) dropPrimary.textContent = t.dropPrimary;

    const dropSecondary = document.getElementById('dropSecondary');
    if (dropSecondary) dropSecondary.textContent = t.dropSecondary;

    const browseBtnText = document.getElementById('browseBtnText');
    if (browseBtnText) browseBtnText.textContent = t.browseBtn;

    const dropHints = document.getElementById('dropHints');
    if (dropHints) dropHints.innerHTML = t.dropHints;

    // Selected files section
    const selectedTitle = document.getElementById('selectedTitle');
    if (selectedTitle) selectedTitle.textContent = t.selectedTitle;

    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) clearAllBtn.textContent = t.clearAllBtn;

    const startUploadBtnText = document.getElementById('startUploadBtnText');
    if (startUploadBtnText) startUploadBtnText.textContent = t.startUploadBtn;

    // Progress card elements
    const progressStatusText = document.getElementById('progressStatusText');
    if (progressStatusText && !currentXhr) progressStatusText.textContent = t.progressTitleUploading;

    const statDataLabel = document.getElementById('statDataLabel');
    if (statDataLabel) statDataLabel.textContent = t.statDataLabel;

    const statSpeedLabel = document.getElementById('statSpeedLabel');
    if (statSpeedLabel) statSpeedLabel.textContent = t.statSpeedLabel;

    const statEtaLabel = document.getElementById('statEtaLabel');
    if (statEtaLabel) statEtaLabel.textContent = t.statEtaLabel;

    const progressHintNote = document.getElementById('progressHintNote');
    if (progressHintNote) {
      const svg = progressHintNote.querySelector('svg');
      progressHintNote.innerHTML = '';
      if (svg) progressHintNote.appendChild(svg);
      progressHintNote.appendChild(document.createTextNode(' ' + t.progressHint));
    }

    const cancelUploadBtnText = document.getElementById('cancelUploadBtnText');
    if (cancelUploadBtnText) cancelUploadBtnText.textContent = t.cancelUploadBtn;

    // Success screen elements
    const successBannerText = document.getElementById('successBannerText');
    if (successBannerText) successBannerText.innerHTML = `<strong>${t.successTitle}</strong> ${t.successDesc}`;

    const shareUrlLabel = document.getElementById('shareUrlLabel');
    if (shareUrlLabel) shareUrlLabel.textContent = t.shareLabel;

    const copyLinkBtnText = document.getElementById('copyLinkBtnText');
    if (copyLinkBtnText) copyLinkBtnText.textContent = t.copyLinkBtn;

    const shareHintText = document.getElementById('shareHintText');
    if (shareHintText) shareHintText.textContent = t.shareHint;

    const metaLabelSessionId = document.getElementById('metaLabelSessionId');
    if (metaLabelSessionId) metaLabelSessionId.textContent = t.metaSessionId;

    const metaLabelSavedFiles = document.getElementById('metaLabelSavedFiles');
    if (metaLabelSavedFiles) metaLabelSavedFiles.textContent = t.metaSavedFiles;

    const metaLabelTotalSize = document.getElementById('metaLabelTotalSize');
    if (metaLabelTotalSize) metaLabelTotalSize.textContent = t.metaTotalSize;

    const metaLabelExpiresAt = document.getElementById('metaLabelExpiresAt');
    if (metaLabelExpiresAt) metaLabelExpiresAt.textContent = t.metaExpiresAt;

    const metaLabelQuality = document.getElementById('metaLabelQuality');
    if (metaLabelQuality) metaLabelQuality.textContent = t.metaQuality;

    const metaQualityVal = document.getElementById('metaQualityVal');
    if (metaQualityVal) metaQualityVal.textContent = t.metaQualityVal;

    const openGalleryBtnText = document.getElementById('openGalleryBtnText');
    if (openGalleryBtnText) openGalleryBtnText.textContent = t.openGalleryBtn;

    const startNewUploadBtnText = document.getElementById('startNewUploadBtnText');
    if (startNewUploadBtnText) startNewUploadBtnText.textContent = t.uploadMoreBtn;

    const qrCaption = document.getElementById('qrCaption');
    if (qrCaption) qrCaption.textContent = t.qrCaption;

    const downloadQrBtnText = document.getElementById('downloadQrBtnText');
    if (downloadQrBtnText) downloadQrBtnText.textContent = t.downloadQrBtn;

    // About Creator Modal
    const closeAboutModalBtn = document.getElementById('closeAboutModalBtn');
    if (closeAboutModalBtn) closeAboutModalBtn.setAttribute('title', t.aboutModalCloseTitle);

    const creatorRoleText = document.getElementById('creatorRoleText');
    if (creatorRoleText) creatorRoleText.textContent = t.aboutRole;

    const creatorBio = document.getElementById('creatorBio');
    if (creatorBio) creatorBio.textContent = t.aboutBio;

    const creatorConnectText = document.getElementById('creatorConnectText');
    if (creatorConnectText) creatorConnectText.textContent = t.aboutConnectBtn;

    // Footer
    const footerCopyright = document.getElementById('footerCopyright');
    if (footerCopyright) footerCopyright.innerHTML = t.footerCopyright;

    // Re-render file queue with current language numbers & labels
    updateQueueUI();
  }

  if (langBnBtn) {
    langBnBtn.addEventListener('click', () => applyLanguage('bn'));
  }
  if (langEnBtn) {
    langEnBtn.addEventListener('click', () => applyLanguage('en'));
  }

  // ==========================================
  // 5. DOM ELEMENTS & STATE
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
  // 6. UTILITIES & NUMBER / BYTE FORMATTING
  // ==========================================
  function toBengaliNum(val) {
    if (val === undefined || val === null) return '';
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(val).replace(/[0-9]/g, (d) => bnDigits[parseInt(d, 10)]);
  }

  function toLangNum(val) {
    if (currentLang === 'en') return String(val);
    return toBengaliNum(val);
  }

  function formatBytes(bytes, decimals = 1) {
    if (!bytes || bytes === 0) return currentLang === 'en' ? '0 B' : '০ B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const num = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
    return `${toLangNum(num)} ${sizes[i]}`;
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
  // 7. QUEUE & FILE SELECTION
  // ==========================================
  function updateQueueUI() {
    if (!filesSummary || !selectedFilesSection) return;

    if (selectedFiles.length === 0) {
      selectedFilesSection.classList.remove('visible');
      if (fileQueueList) fileQueueList.innerHTML = '';
      return;
    }

    selectedFilesSection.classList.add('visible');
    if (!fileQueueList) return;
    fileQueueList.innerHTML = '';

    let totalBytes = 0;
    selectedFiles.forEach((file, index) => {
      totalBytes += file.size;
      const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|mkv|avi|3gp)$/i.test(file.name);
      const mediaTag = isVideo 
        ? (currentLang === 'en' ? 'Video' : 'ভিডিও') 
        : (currentLang === 'en' ? 'Photo' : 'ছবি');
      const removeTitle = currentLang === 'en' ? 'Remove file' : 'ফাইল মুছুন';

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
              <span>${file.type || mediaTag}</span>
            </div>
          </div>
        </div>
        <button type="button" class="remove-file-btn" data-index="${index}" title="${removeTitle}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      `;
      fileQueueList.appendChild(item);
    });

    filesSummary.textContent = I18N[currentLang].summaryFilesText(selectedFiles.length, formatBytes(totalBytes));
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
      const exists = selectedFiles.some(f => f.name === file.name && f.size === file.size);
      if (!exists) {
        selectedFiles.push(file);
      }
    });

    if (oversizedFiles.length > 0) {
      showError(I18N[currentLang].oversizedMsg(oversizedFiles.join(', ')));
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
  // 8. ANIMATED UPLOAD WITH LIVE PROGRESS (OPTION 3)
  // ==========================================
  function resetUploadProgress() {
    const t = I18N[currentLang];
    if (uploadProgressContainer) uploadProgressContainer.classList.remove('visible');
    if (progressBarFill) progressBarFill.style.width = '0%';
    if (progressPercentText) progressPercentText.textContent = toLangNum(0) + '%';
    if (progressBytesText) progressBytesText.textContent = `${formatBytes(0)} / ${formatBytes(0)}`;
    if (progressSpeedText) progressSpeedText.textContent = '-- MB/s';
    if (progressEtaText) progressEtaText.textContent = t.statCalculating;
    if (progressStatusText) progressStatusText.textContent = t.progressTitleUploading;
    if (progressPulseDot) progressPulseDot.classList.remove('pulse-gold');

    if (dropzone) dropzone.style.pointerEvents = 'auto';
    if (startUploadBtn) startUploadBtn.disabled = false;
    if (clearAllBtn) clearAllBtn.disabled = false;
  }

  if (startUploadBtn) {
    startUploadBtn.addEventListener('click', () => {
      const t = I18N[currentLang];
      if (selectedFiles.length === 0) {
        showError(t.errSelectFiles);
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
      progressPercentText.textContent = toLangNum(0) + '%';
      progressStatusText.textContent = t.progressTitleInit;
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

      // Configure upload request timeout to 30 minutes for 1GB transfers
      xhr.timeout = 30 * 60 * 1000;

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && e.total > 0) {
          const now = performance.now();
          const elapsedSeconds = (now - uploadStartTime) / 1000;
          const percent = Math.min(100, Math.round((e.loaded / e.total) * 100));

          // Smooth width update
          progressBarFill.style.width = `${percent}%`;
          progressPercentText.textContent = `${toLangNum(percent)}%`;

          // Transferred bytes
          progressBytesText.textContent = `${formatBytes(e.loaded)} / ${formatBytes(e.total)}`;

          // Speed calculation
          const speedBytesPerSec = elapsedSeconds > 0.15 ? (e.loaded / elapsedSeconds) : 0;
          if (speedBytesPerSec > 0) {
            progressSpeedText.textContent = `${formatBytes(speedBytesPerSec)}/s`;
          } else {
            progressSpeedText.textContent = t.statCalculating;
          }

          // ETA calculation
          if (percent >= 100) {
            progressStatusText.textContent = t.progressTitleProcessing;
            progressEtaText.textContent = t.statProcessing;
            progressPulseDot.classList.add('pulse-gold');
          } else if (speedBytesPerSec > 0) {
            const remainingBytes = Math.max(0, e.total - e.loaded);
            const remainingSeconds = Math.ceil(remainingBytes / speedBytesPerSec);

            if (remainingSeconds < 60) {
              progressEtaText.textContent = t.etaSecondsText(remainingSeconds);
            } else {
              const mins = Math.floor(remainingSeconds / 60);
              const secs = remainingSeconds % 60;
              progressEtaText.textContent = t.etaMinsSecsText(mins, secs);
            }
            progressStatusText.textContent = t.progressTitleUploading;
          } else {
            progressEtaText.textContent = t.statCalculating;
          }
        }
      });

      // Handle upload network error
      xhr.upload.addEventListener('error', () => {
        currentXhr = null;
        showError(I18N[currentLang].errNetwork);
        resetUploadProgress();
      });

      // Once upload completes
      xhr.addEventListener('load', () => {
        currentXhr = null;
        const curT = I18N[currentLang];

        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            if (res.success) {
              progressBarFill.style.width = '100%';
              progressPercentText.textContent = toLangNum(100) + '%';
              progressStatusText.textContent = curT.progressTitleComplete;
              progressEtaText.textContent = curT.statDone;

              setTimeout(() => {
                showSuccessState(res);
              }, 450);
            } else {
              showError(res.error || curT.errFallback);
              resetUploadProgress();
            }
          } catch (err) {
            showError(curT.errUnexpected);
            resetUploadProgress();
          }
        } else {
          let errorMsg = curT.errFallback;
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
        showError(I18N[currentLang].errTimeout);
        resetUploadProgress();
      });

      xhr.addEventListener('error', () => {
        currentXhr = null;
        showError(I18N[currentLang].errDiscon);
        resetUploadProgress();
      });

      xhr.addEventListener('abort', () => {
        currentXhr = null;
        showToast(I18N[currentLang].toastCancelled);
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
  // 9. SUCCESS STATE & QR DISPLAY
  // ==========================================
  function showSuccessState(data) {
    const t = I18N[currentLang];
    if (uploadSection) uploadSection.style.display = 'none';
    if (uploadSuccessSection) {
      uploadSuccessSection.classList.add('visible');
    }

    if (shareUrlInput) shareUrlInput.value = data.shareUrl;
    if (qrCodeImg) qrCodeImg.src = data.qrCodeDataUrl;
    if (downloadQrBtn) downloadQrBtn.href = data.qrCodeDataUrl;
    if (openGalleryBtn) openGalleryBtn.href = data.shareUrl;

    if (summarySessionId) summarySessionId.textContent = data.sessionId;
    if (summaryFileCount) summaryFileCount.textContent = t.countFilesText(data.fileCount);
    if (summaryTotalSize) summaryTotalSize.textContent = formatBytes(data.totalSize);
    if (summaryExpiresAt) {
      summaryExpiresAt.textContent = new Date(data.expiresAt).toLocaleString(currentLang === 'en' ? 'en-US' : 'bn-BD', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    }

    window.scrollTo({ top: uploadSuccessSection.offsetTop - 20, behavior: 'smooth' });
    showToast(t.toastCreated);
  }

  // Copy link
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', () => {
      const textToCopy = shareUrlInput.value;
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          showToast(I18N[currentLang].toastCopied);
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
      showToast(I18N[currentLang].toastCopied);
    } catch (err) {
      showToast(I18N[currentLang].toastCopyFail);
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
  // 10. ABOUT CREATOR MODAL POPUP HANDLERS
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

  // Apply saved language on initial load
  applyLanguage(currentLang);

})();
