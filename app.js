/**
 * 진단검사의학과 기출 퀴즈 마스터 (20Y ~ 26Y)
 * Core Application Engine
 */

(function () {
  'use strict';

  // Storage Keys
  const STORAGE_KEY_ANSWERS = 'KMLE_ALL_SUBJECT_ANSWERS_V2';
  const STORAGE_KEY_BOOKMARKS = 'KMLE_ALL_SUBJECT_BOOKMARKS_V2';
  const STORAGE_KEY_LAST_ID = 'KMLE_ALL_SUBJECT_LAST_ID_V2';
  const STORAGE_KEY_SUBJECT = 'KMLE_ACTIVE_SUBJECT_V2';
  const STORAGE_KEY_SHUFFLE = 'KMLE_SHUFFLE_OPTIONS_V2';

  // Multi-Profile & Continue Keys
  const STORAGE_KEY_PROFILES = 'KMLE_USER_PROFILES_V1';
  const STORAGE_KEY_ACTIVE_PROFILE_ID = 'KMLE_ACTIVE_PROFILE_ID_V1';
  const STORAGE_KEY_AUTO_OPEN_PROFILE = 'KMLE_AUTO_OPEN_PROFILE_V1';
  const STORAGE_KEY_REPORTS = 'KMLE_USER_REPORTS_V1';
  const STORAGE_KEY_CUSTOM_EDITS = 'KMLE_USER_CUSTOM_EDITS_V1';
  const STORAGE_KEY_EDIT_LOGS = 'KMLE_QUESTION_EDIT_LOGS_V1';
  const STORAGE_KEY_COMMENTS = 'KMLE_QUESTION_COMMENTS_V1';
  const SESSION_KEY_WELCOME_SHOWN = 'KMLE_PROFILE_WELCOME_SHOWN_V1';
  const CIRCLE_NUMS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

  // Application State
  const state = {
    allQuestions: [],
    filteredQuestions: [],
    currentIndex: 0,
    profiles: [],
    reports: JSON.parse(localStorage.getItem('KMLE_USER_REPORTS_V1') || '[]'),
    customEdits: JSON.parse(localStorage.getItem('KMLE_USER_CUSTOM_EDITS_V1') || '{}'),
    editLogs: JSON.parse(localStorage.getItem('KMLE_QUESTION_EDIT_LOGS_V1') || '[]'),
    comments: JSON.parse(localStorage.getItem('KMLE_QUESTION_COMMENTS_V1') || '{}'),
    activeProfileId: null,
    selectedNewAvatar: '🩺',
    autoOpenProfileModal: localStorage.getItem(STORAGE_KEY_AUTO_OPEN_PROFILE) !== 'false',
    userAnswers: {},   // qId -> { selectedIndices, selectedIndex, correctIndices, isCorrect, isPartial, score, timestamp }
    bookmarks: new Set(),
    lastSubjectMap: {}, // subject -> last viewed question id in that subject
    pendingSelections: new Set(), // Set of selected option indices (0-based ORIGINAL indices) for multi-answer questions
    shuffleOptions: localStorage.getItem(STORAGE_KEY_SHUFFLE) === 'true',
    shuffledOrders: {}, // qId -> number[] (displayIdx -> originalIdx)
    filters: {
      subject: localStorage.getItem(STORAGE_KEY_SUBJECT) || '진단검사의학과',
      year: 'ALL',
      section: 'ALL',
      type: 'ALL',
      onlyFrequent: false,
      onlyImages: false,
      onlyIncorrect: false,
      onlyBookmarked: false,
      searchQuery: ''
    }
  };

  // DOM Elements Cache
  const dom = {
    // Header & Brand
    brandTitle: document.getElementById('brand-title'),
    brandSubtitle: document.getElementById('brand-subtitle'),

    // Stats
    statProgress: document.getElementById('stat-progress'),
    statBarFill: document.getElementById('stat-bar-fill'),
    statAccuracy: document.getElementById('stat-accuracy'),
    statBookmarks: document.getElementById('stat-bookmarks'),
    btnOpenGrid: document.getElementById('btn-open-grid'),

    // Filters
    subjectTabs: document.getElementById('subject-tabs'),
    yearTabs: document.getElementById('year-tabs'),
    sectionFilterGroup: document.getElementById('section-filter-group'),
    sectionTabs: document.getElementById('section-tabs'),
    typeTabs: document.getElementById('type-tabs'),
    filterFrequent: document.getElementById('filter-frequent'),
    filterImages: document.getElementById('filter-images'),
    filterIncorrect: document.getElementById('filter-incorrect'),
    filterBookmarked: document.getElementById('filter-bookmarked'),
    btnToggleShuffle: document.getElementById('btn-toggle-shuffle'),
    btnReshuffleNow: document.getElementById('btn-reshuffle-now'),
    searchInput: document.getElementById('search-input'),

    // Question Card
    cardMeta: document.querySelector('.card-meta'),
    cardSubject: document.getElementById('card-subject'),
    cardYear: document.getElementById('card-year'),
    cardQnum: document.getElementById('card-qnum'),
    cardMetaLinkedChips: document.getElementById('card-meta-linked-chips'),
    cardCategory: document.getElementById('card-category'),
    cardSubspecialty: document.getElementById('card-subspecialty'),
    cardFreqBadge: document.getElementById('card-freq-badge'),
    cardMultiBadge: document.getElementById('card-multi-badge'),
    cardEditedBadge: document.getElementById('card-edited-badge'),
    btnEditQuestion: document.getElementById('btn-edit-question'),
    btnQuestionComments: document.getElementById('btn-question-comments'),
    navCommentCount: document.getElementById('nav-comment-count'),
    filterCounter: document.getElementById('filter-counter'),
    btnReportIssue: document.getElementById('btn-report-issue'),
    btnBookmark: document.getElementById('btn-bookmark'),

    // Exam Intelligence Box
    examIntelBox: document.getElementById('exam-intel-box'),
    cardThemeTitle: document.getElementById('card-theme-title'),
    cardIntelFreq: document.getElementById('card-intel-freq'),
    cardFreqStatText: document.getElementById('card-freq-stat-text'),
    cardHistoryRow: document.getElementById('card-history-row'),
    cardHistoryChips: document.getElementById('card-history-chips'),

    cardStem: document.getElementById('card-stem'),
    cardImagesContainer: document.getElementById('card-images-container'),
    cardImages: document.getElementById('card-images'),
    optionsLabel: document.getElementById('options-label'),
    optionsKbdTip: document.getElementById('options-kbd-tip'),
    optionsList: document.getElementById('options-list'),

    // Multi-Answer Action Bar
    multiActionBar: document.getElementById('multi-action-bar'),
    multiStatusText: document.getElementById('multi-status-text'),
    btnMultiReset: document.getElementById('btn-multi-reset'),
    btnMultiSubmit: document.getElementById('btn-multi-submit'),
    multiSubmitText: document.getElementById('multi-submit-text'),

    // Toast Message
    toastMessage: document.getElementById('toast-message'),

    // Feedback & Explanation
    feedbackBanner: document.getElementById('feedback-banner'),
    feedbackIcon: document.getElementById('feedback-icon'),
    feedbackStatus: document.getElementById('feedback-status'),
    feedbackDetail: document.getElementById('feedback-detail'),
    btnRetry: document.getElementById('btn-retry'),
    btnReportInline: document.getElementById('btn-report-inline'),

    cardExplanation: document.getElementById('card-explanation'),
    expThemeTitle: document.getElementById('exp-theme-title'),
    expCorrectAnswer: document.getElementById('exp-correct-answer'),
    expFindings: document.getElementById('exp-findings'),
    expDifferential: document.getElementById('exp-differential'),
    expTrap: document.getElementById('exp-trap'),
    expTrigger: document.getElementById('exp-trigger'),
    expKmleLink: document.getElementById('exp-kmle-link'),

    // Navigation
    btnPrev: document.getElementById('btn-prev'),
    btnNext: document.getElementById('btn-next'),
    btnRandom: document.getElementById('btn-random'),
    navIndicator: document.getElementById('nav-indicator'),
    navJumpForm: document.getElementById('nav-jump-form'),
    navJumpInput: document.getElementById('nav-jump-input'),
    navIndicatorTotal: document.getElementById('nav-indicator-total'),

    // Grid Modal
    gridModal: document.getElementById('grid-modal'),
    questionGrid: document.getElementById('question-grid'),
    btnCloseGrid: document.getElementById('btn-close-grid'),
    btnCloseGridBottom: document.getElementById('btn-close-grid-bottom'),
    btnResetHistory: document.getElementById('btn-reset-history'),

    // Profile & Continue Modal
    btnOpenProfile: document.getElementById('btn-open-profile'),
    headerProfileAvatar: document.getElementById('header-profile-avatar'),
    headerProfileName: document.getElementById('header-profile-name'),
    profileModal: document.getElementById('profile-modal'),
    btnCloseProfile: document.getElementById('btn-close-profile'),
    btnCloseProfileBottom: document.getElementById('btn-close-profile-bottom'),
    resumeProfileChip: document.getElementById('resume-profile-chip'),
    resumeLastTime: document.getElementById('resume-last-time'),
    resumeTargetText: document.getElementById('resume-target-text'),
    resumeStatsText: document.getElementById('resume-stats-text'),
    btnResumeLast: document.getElementById('btn-resume-last'),
    profileSubjectResumeWrap: document.getElementById('profile-subject-resume-wrap'),
    profileSubjectResumeList: document.getElementById('profile-subject-resume-list'),
    profileCountBadge: document.getElementById('profile-count-badge'),
    profileList: document.getElementById('profile-list'),
    formCreateProfile: document.getElementById('form-create-profile'),
    profileAvatarPicker: document.getElementById('profile-avatar-picker'),
    inputProfileName: document.getElementById('input-profile-name'),
    chkCopyBookmarks: document.getElementById('chk-copy-bookmarks'),
    btnExportProfiles: document.getElementById('btn-export-profiles'),
    btnImportProfiles: document.getElementById('btn-import-profiles'),
    inputImportProfiles: document.getElementById('input-import-profiles'),
    chkAutoOpenProfile: document.getElementById('chk-auto-open-profile'),
    btnViewReports: document.getElementById('btn-view-reports'),
    profileReportCount: document.getElementById('profile-report-count'),
    reportSectionCount: document.getElementById('report-section-count'),
    reportHistorySection: document.getElementById('report-history-section'),
    reportHistoryList: document.getElementById('report-history-list'),
    btnExportReports: document.getElementById('btn-export-reports'),
    btnClearReports: document.getElementById('btn-clear-reports'),

    // Question Issue Report Modal
    reportModal: document.getElementById('report-modal'),
    btnCloseReport: document.getElementById('btn-close-report'),
    btnCancelReport: document.getElementById('btn-cancel-report'),
    btnSubmitReport: document.getElementById('btn-submit-report'),

    // Direct Question Edit Modal
    editQuestionModal: document.getElementById('edit-question-modal'),
    btnCloseEditModal: document.getElementById('btn-close-edit-modal'),
    btnCancelEditModal: document.getElementById('btn-cancel-edit-modal'),
    btnSaveQuestionEdit: document.getElementById('btn-save-question-edit'),
    btnRevertQuestionEdit: document.getElementById('btn-revert-question-edit'),
    editTargetSubject: document.getElementById('edit-target-subject'),
    editTargetYear: document.getElementById('edit-target-year'),
    editTargetQnum: document.getElementById('edit-target-qnum'),
    editTargetQid: document.getElementById('edit-target-qid'),
    editStemInput: document.getElementById('edit-stem-input'),
    editOptionsContainer: document.getElementById('edit-options-container'),
    editAnswerSelect: document.getElementById('edit-answer-select'),
    editReasonInput: document.getElementById('edit-reason-input'),

    // Question Comments Modal
    commentModal: document.getElementById('comment-modal'),
    btnCloseCommentModal: document.getElementById('btn-close-comment-modal'),
    commentTargetSubject: document.getElementById('comment-target-subject'),
    commentTargetYear: document.getElementById('comment-target-year'),
    commentTargetQnum: document.getElementById('comment-target-qnum'),
    commentTargetTheme: document.getElementById('comment-target-theme'),
    commentList: document.getElementById('comment-list'),
    commentListCount: document.getElementById('comment-list-count'),
    commentAuthorAvatar: document.getElementById('comment-author-avatar'),
    commentAuthorName: document.getElementById('comment-author-name'),
    commentInput: document.getElementById('comment-input'),
    btnSubmitComment: document.getElementById('btn-submit-comment'),

    // Edit History in Profile Modal
    btnViewEdits: document.getElementById('btn-view-edits'),
    editHistorySection: document.getElementById('edit-history-section'),
    profileEditCount: document.getElementById('profile-edit-count'),
    editSectionCount: document.getElementById('edit-section-count'),
    editHistoryList: document.getElementById('edit-history-list'),
    btnExportEdits: document.getElementById('btn-export-edits'),
    btnClearEdits: document.getElementById('btn-clear-edits'),
    // Original Exam PDF Viewer Modal Elements
    btnOpenPdfViewer: document.getElementById('btn-open-pdf-viewer'),
    btnQuestionPdf: document.getElementById('btn-question-pdf'),
    pdfModal: document.getElementById('pdf-viewer-modal'),
    btnClosePdfModal: document.getElementById('btn-close-pdf-modal'),
    btnClosePdfBottom: document.getElementById('btn-close-pdf-bottom'),
    pdfSelectSubject: document.getElementById('pdf-select-subject'),
    pdfSelectYear: document.getElementById('pdf-select-year'),
    btnPdfExternal: document.getElementById('btn-pdf-external'),
    btnPdfDownload: document.getElementById('btn-pdf-download'),
    pdfFrame: document.getElementById('pdf-frame'),
    pdfEmptyState: document.getElementById('pdf-empty-state'),
    pdfActiveDocBadge: document.getElementById('pdf-active-doc-badge'),
    pdfStatusDesc: document.getElementById('pdf-status-desc'),
    reportTargetSub: document.getElementById('report-target-sub'),
    reportTargetYear: document.getElementById('report-target-year'),
    reportTargetQnum: document.getElementById('report-target-qnum'),
    reportTargetSec: document.getElementById('report-target-sec'),
    reportTargetStem: document.getElementById('report-target-stem'),
    reportTypeGrid: document.getElementById('report-type-grid'),
    reportDescInput: document.getElementById('report-desc-input'),

    // Lightbox Modal & Zoom Canvas
    lightboxModal: document.getElementById('lightbox-modal'),
    lightboxImg: document.getElementById('lightbox-img'),
    lightboxTitle: document.getElementById('lightbox-title'),
    lightboxZoomLevel: document.getElementById('lightbox-zoom-level'),
    btnZoomIn: document.getElementById('btn-zoom-in'),
    btnZoomOut: document.getElementById('btn-zoom-out'),
    btnZoomReset: document.getElementById('btn-zoom-reset'),
    lightboxViewport: document.getElementById('lightbox-viewport'),
    lightboxCanvas: document.getElementById('lightbox-canvas'),
    btnCloseLightbox: document.getElementById('btn-close-lightbox')
  };

  /**
   * Initialize Application
   */
  async function init() {
    loadStorage();
    await loadQuestions();
    setupEventListeners();
    syncFilterButtonsUI();
    updateSubjectUI();

    // Restore last viewed question for active profile if available
    const activeProfile = getActiveProfile();
    const lastId = (activeProfile && activeProfile.lastQuestionId) || localStorage.getItem(STORAGE_KEY_LAST_ID);
    if (lastId) {
      let idx = state.filteredQuestions.findIndex(q => q.id === lastId);
      if (idx === -1) {
        const targetQ = state.allQuestions.find(q => q.id === lastId);
        if (targetQ) {
          state.filters.subject = targetQ.subject;
          state.filters.year = 'ALL';
          state.filters.type = 'ALL';
          updateSubjectUI();
          idx = state.filteredQuestions.findIndex(q => q.id === lastId);
        }
      }
      if (idx !== -1) {
        state.currentIndex = idx;
      }
    }

    renderCurrentQuestion();
    updateStats();
    updateHeaderProfileUI();

    // Show Profile / Continue modal automatically once per session if enabled
    if (state.autoOpenProfileModal && !sessionStorage.getItem(SESSION_KEY_WELCOME_SHOWN)) {
      sessionStorage.setItem(SESSION_KEY_WELCOME_SHOWN, '1');
      openProfileModal();
    }
  }

  function getActiveProfile() {
    if (!state.profiles || state.profiles.length === 0) return null;
    return state.profiles.find(p => p.id === state.activeProfileId) || state.profiles[0];
  }

  function createProfileObject({ id, name, avatar, userAnswers, bookmarks, lastQuestionId, lastSubjectMap, filters, shuffleOptions }) {
    const now = Date.now();
    return {
      id: id || `profile_${now}_${Math.random().toString(36).slice(2, 7)}`,
      name: (name || '기본 프로필').trim(),
      avatar: avatar || '🩺',
      createdAt: now,
      updatedAt: now,
      userAnswers: userAnswers && typeof userAnswers === 'object' ? { ...userAnswers } : {},
      bookmarks: Array.isArray(bookmarks) ? [...bookmarks] : [],
      lastQuestionId: lastQuestionId || null,
      lastSubjectMap: lastSubjectMap && typeof lastSubjectMap === 'object' ? { ...lastSubjectMap } : {},
      filters: {
        subject: (filters && filters.subject) || '진단검사의학과',
        year: (filters && filters.year) || 'ALL',
        type: (filters && filters.type) || 'ALL',
        onlyFrequent: !!(filters && filters.onlyFrequent),
        onlyImages: !!(filters && filters.onlyImages),
        onlyIncorrect: !!(filters && filters.onlyIncorrect),
        onlyBookmarked: !!(filters && filters.onlyBookmarked)
      },
      shuffleOptions: !!shuffleOptions
    };
  }

  /**
   * Load local storage data (with automatic migration from single-profile keys)
   */
  function loadStorage() {
    try {
      const savedAutoOpen = localStorage.getItem(STORAGE_KEY_AUTO_OPEN_PROFILE);
      state.autoOpenProfileModal = savedAutoOpen !== 'false';
      if (dom.chkAutoOpenProfile) {
        dom.chkAutoOpenProfile.checked = state.autoOpenProfileModal;
      }

      const rawProfiles = localStorage.getItem(STORAGE_KEY_PROFILES);
      let loadedProfiles = [];
      if (rawProfiles) {
        const parsed = JSON.parse(rawProfiles);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedProfiles = parsed;
        }
      }

      if (loadedProfiles.length === 0) {
        // Migrate existing single-user storage into initial default profile
        let legacyAnswers = {};
        let legacyBookmarks = [];
        try {
          const sa = localStorage.getItem(STORAGE_KEY_ANSWERS);
          if (sa) legacyAnswers = JSON.parse(sa) || {};
          const sb = localStorage.getItem(STORAGE_KEY_BOOKMARKS);
          if (sb) legacyBookmarks = JSON.parse(sb) || [];
        } catch (err) {}

        const legacyLastId = localStorage.getItem(STORAGE_KEY_LAST_ID) || null;
        const legacySubject = localStorage.getItem(STORAGE_KEY_SUBJECT) || '진단검사의학과';
        const legacyShuffle = localStorage.getItem(STORAGE_KEY_SHUFFLE) === 'true';
        const initialSubMap = {};
        if (legacyLastId && legacySubject) {
          initialSubMap[legacySubject] = legacyLastId;
        }

        const defaultProfile = createProfileObject({
          id: 'profile_default',
          name: '기본 프로필',
          avatar: '🩺',
          userAnswers: legacyAnswers,
          bookmarks: legacyBookmarks,
          lastQuestionId: legacyLastId,
          lastSubjectMap: initialSubMap,
          filters: { subject: legacySubject, year: 'ALL', type: 'ALL' },
          shuffleOptions: legacyShuffle
        });
        loadedProfiles = [defaultProfile];
      }

      state.profiles = loadedProfiles;
      const savedActiveId = localStorage.getItem(STORAGE_KEY_ACTIVE_PROFILE_ID);
      const foundActive = state.profiles.find(p => p.id === savedActiveId) || state.profiles[0];
      state.activeProfileId = foundActive.id;

      loadProfileIntoMemory(foundActive);
    } catch (e) {
      console.error('Failed to load local storage:', e);
    }
  }

  function loadProfileIntoMemory(profile) {
    if (!profile) return;
    state.userAnswers = profile.userAnswers && typeof profile.userAnswers === 'object'
      ? { ...profile.userAnswers }
      : {};
    state.bookmarks = new Set(Array.isArray(profile.bookmarks) ? profile.bookmarks : []);
    state.lastSubjectMap = profile.lastSubjectMap && typeof profile.lastSubjectMap === 'object'
      ? { ...profile.lastSubjectMap }
      : {};
    state.shuffleOptions = !!profile.shuffleOptions;
    const pf = profile.filters || {};
    state.filters.subject = pf.subject || '진단검사의학과';
    state.filters.year = pf.year || 'ALL';
    state.filters.type = pf.type || 'ALL';
    state.filters.onlyFrequent = !!pf.onlyFrequent;
    state.filters.onlyImages = !!pf.onlyImages;
    state.filters.onlyIncorrect = !!pf.onlyIncorrect;
    state.filters.onlyBookmarked = !!pf.onlyBookmarked;
    state.filters.searchQuery = '';
    if (dom.searchInput) dom.searchInput.value = '';
  }

  function syncFilterButtonsUI() {
    if (dom.filterFrequent) dom.filterFrequent.classList.toggle('active', !!state.filters.onlyFrequent);
    if (dom.filterImages) dom.filterImages.classList.toggle('active', !!state.filters.onlyImages);
    if (dom.filterIncorrect) dom.filterIncorrect.classList.toggle('active', !!state.filters.onlyIncorrect);
    if (dom.filterBookmarked) dom.filterBookmarked.classList.toggle('active', !!state.filters.onlyBookmarked);
    if (dom.btnToggleShuffle) dom.btnToggleShuffle.classList.toggle('active', !!state.shuffleOptions);
  }

  function updateHeaderProfileUI() {
    const active = getActiveProfile();
    if (!active) return;
    if (dom.headerProfileAvatar) dom.headerProfileAvatar.textContent = active.avatar || '🩺';
    if (dom.headerProfileName) dom.headerProfileName.textContent = active.name || '기본 프로필';
  }

  /**
   * Save state to local storage (both active profile & legacy keys)
   */
  function saveStorage() {
    try {
      const currentQ = getCurrentQuestion();
      const active = getActiveProfile();
      if (active) {
        active.userAnswers = { ...state.userAnswers };
        active.bookmarks = [...state.bookmarks];
        active.shuffleOptions = !!state.shuffleOptions;
        if (!active.lastSubjectMap || typeof active.lastSubjectMap !== 'object') {
          active.lastSubjectMap = {};
        }
        if (currentQ) {
          active.lastQuestionId = currentQ.id;
          if (currentQ.subject) {
            active.lastSubjectMap[currentQ.subject] = currentQ.id;
          }
          if (state.filters.subject) {
            active.lastSubjectMap[state.filters.subject] = currentQ.id;
          }
          state.lastSubjectMap = { ...active.lastSubjectMap };
        }
        active.filters = {
          subject: state.filters.subject,
          year: state.filters.year,
          type: state.filters.type,
          onlyFrequent: !!state.filters.onlyFrequent,
          onlyImages: !!state.filters.onlyImages,
          onlyIncorrect: !!state.filters.onlyIncorrect,
          onlyBookmarked: !!state.filters.onlyBookmarked
        };
        active.updatedAt = Date.now();
        localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(state.profiles));
        localStorage.setItem(STORAGE_KEY_ACTIVE_PROFILE_ID, active.id);
      }

      // Sync legacy keys for backward compatibility
      localStorage.setItem(STORAGE_KEY_ANSWERS, JSON.stringify(state.userAnswers));
      localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify([...state.bookmarks]));
      localStorage.setItem(STORAGE_KEY_SUBJECT, state.filters.subject);
      localStorage.setItem(STORAGE_KEY_SHUFFLE, String(state.shuffleOptions));
      if (currentQ) {
        localStorage.setItem(STORAGE_KEY_LAST_ID, currentQ.id);
      }
      updateHeaderProfileUI();
    } catch (e) {
      console.error('Failed to save to local storage:', e);
    }
  }

  /**
   * Load Question Data
   */
  async function loadQuestions() {
    if (window.QUIZ_DATA && Array.isArray(window.QUIZ_DATA) && window.QUIZ_DATA.length > 0) {
      state.allQuestions = window.QUIZ_DATA;
      applyCustomEdits();
      return;
    }

    try {
      const res = await fetch('data/quiz_all_subjects.json');
      if (!res.ok) throw new Error('Network response not ok');
      state.allQuestions = await res.json();
      applyCustomEdits();
    } catch (err) {
      console.warn('Fetch fallback to quiz_lab_med.json or window.QUIZ_DATA:', err);
      try {
        const fallbackRes = await fetch('data/quiz_lab_med.json');
        if (fallbackRes.ok) {
          state.allQuestions = await fallbackRes.json();
        }
      } catch (e2) {
        if (window.QUIZ_DATA) {
          state.allQuestions = window.QUIZ_DATA;
        }
      }
    }
  }

  const SUBJECT_META = {
    '진단검사의학과': { icon: '🩺', title: '진단검사의학과 기출 퀴즈', desc: '임상화학·진단면역·임상미생물·진단혈액·수혈의학' },
    '내과': { icon: '🫀', title: '내과 기출 퀴즈', desc: '순환기·호흡기·소화기·신장·내분비·감염·류마티스·혈액종양' },
    '외과': { icon: '🔪', title: '외과 기출 퀴즈', desc: '위장관·대장항문·간담췌·혈관·유방내분비·외상' },
    '산부인과': { icon: '🤰', title: '산부인과 기출 퀴즈', desc: '산과학(모체태아의학) & 부인과학(부인종양·생식내분비)' },
    '소아청소년과': { icon: '👶', title: '소아청소년과 기출 퀴즈', desc: '성장발달·신생아·소아감염·소아신경·알레르기호흡기' },
    '신경과': { icon: '🧠', title: '신경과 기출 퀴즈', desc: '뇌졸중·뇌전증·이상운동질환·말초신경근육·치매' },
    '정신건강의학과': { icon: '🧩', title: '정신건강의학과 기출 퀴즈', desc: '조현병·기분장애·불안장애·물질관련장애·소아청소년/노인' },
    '정형외과': { icon: '🦴', title: '정형외과 기출 퀴즈', desc: '상지·하지·척추·골절외상·소아정형' },
    '영상의학과': { icon: '🩻', title: '영상의학과 기출 퀴즈', desc: '흉부·복부·근골격(MSK)·신경·인터벤션·유방 세부분야 239문항' },
    'ALL': { icon: '🩺', title: 'subacute (임상의학 기출 퀴즈 마스터)', desc: '20Y ~ 26Y 9개 임상 분과 2,338문항 통합 CBT' }
  };

  /**
   * Update Subject UI and re-render dynamic toolbars
   */
  function updateSubjectUI() {
    const curSub = state.filters.subject;
    const meta = SUBJECT_META[curSub] || SUBJECT_META['ALL'];

    // Update Document Title (Browser Tab)
    document.title = (curSub === 'ALL')
      ? 'subacute | 임상의학 기출 퀴즈 마스터'
      : `subacute | ${curSub} 기출 퀴즈`;

    // Update active class on subject pills
    if (dom.subjectTabs) {
      dom.subjectTabs.querySelectorAll('.subject-pill').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.subject === curSub);
      });
    }

    // Questions in current subject scope
    const subQuestions = (curSub === 'ALL')
      ? state.allQuestions
      : state.allQuestions.filter(q => q.subject === curSub);

    // Update Header Brand
    if (dom.brandTitle) {
      dom.brandTitle.textContent = (curSub === 'ALL')
        ? 'subacute (임상의학 기출 퀴즈 마스터 v4.4)'
        : `subacute v4.4 · ${meta.icon} ${meta.title}`;
    }
    if (dom.brandSubtitle) {
      dom.brandSubtitle.textContent = `20Y ~ 26Y 실전 기출 완전 정복 • ${subQuestions.length}문항 (v4.4 완결판 • ${meta.desc})`;
    }

    // Dynamic Year Tabs
    renderYearTabs(subQuestions);

    // Dynamic Section Tabs (세부분야 탭: 흉부, 복부, MSK, 신경, 인터벤션, 유방, 총론)
    renderSectionTabs(subQuestions);

    // Dynamic Category Tabs
    renderCategoryTabs(subQuestions);

    // Update Image Filter Button count
    const imgCount = subQuestions.filter(q => q.images && q.images.length > 0).length;
    if (dom.filterImages) {
      dom.filterImages.textContent = `📷 사진 문제만 (${imgCount})`;
    }

    applyFilters();
    renderCurrentQuestion();
    updateStats();
    renderGrid();
  }

  /**
   * Dynamically Render Year Tabs
   */
  function renderYearTabs(subQuestions) {
    if (!dom.yearTabs) return;
    const yearCounts = {};
    subQuestions.forEach(q => {
      if (q.year) {
        yearCounts[q.year] = (yearCounts[q.year] || 0) + 1;
      }
    });

    const years = Object.keys(yearCounts).sort().reverse();
    dom.yearTabs.innerHTML = '';
    
    // ALL button
    const allBtn = document.createElement('button');
    allBtn.className = `pill-tab ${state.filters.year === 'ALL' ? 'active' : ''}`;
    allBtn.dataset.year = 'ALL';
    allBtn.textContent = `전체 (${subQuestions.length})`;
    allBtn.addEventListener('click', () => {
      dom.yearTabs.querySelectorAll('.pill-tab').forEach(b => b.classList.remove('active'));
      allBtn.classList.add('active');
      state.filters.year = 'ALL';
      state.currentIndex = 0;
      applyFilters();
      renderCurrentQuestion();
      renderSectionTabs(subQuestions);
      renderCategoryTabs(subQuestions);
    });
    dom.yearTabs.appendChild(allBtn);

    years.forEach(yr => {
      const btn = document.createElement('button');
      btn.className = `pill-tab ${state.filters.year === yr ? 'active' : ''}`;
      btn.dataset.year = yr;
      btn.textContent = `${yr} (${yearCounts[yr]})`;
      btn.addEventListener('click', () => {
        dom.yearTabs.querySelectorAll('.pill-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.filters.year = yr;
        state.currentIndex = 0;
        applyFilters();
        renderCurrentQuestion();
        renderSectionTabs(subQuestions);
        renderCategoryTabs(subQuestions);
      });
      dom.yearTabs.appendChild(btn);
    });

    if (state.filters.year !== 'ALL' && !yearCounts[state.filters.year]) {
      state.filters.year = 'ALL';
      allBtn.classList.add('active');
    }
  }

  /**
   * Dynamically Render Section Tabs (흉부 / 복부 / MSK / 신경 / 인터벤션 / 유방 / 총론)
   */
  function renderSectionTabs(subQuestions) {
    if (!dom.sectionFilterGroup || !dom.sectionTabs) return;

    // Check if current questions have sections
    const hasSections = subQuestions.some(q => q.section);
    if (!hasSections) {
      dom.sectionFilterGroup.style.display = 'none';
      state.filters.section = 'ALL';
      return;
    }

    dom.sectionFilterGroup.style.display = 'flex';

    // Filter scope by active year if year is selected
    const scope = (state.filters.year === 'ALL')
      ? subQuestions
      : subQuestions.filter(q => q.year === state.filters.year);

    const sectionIcons = {
      '흉부': '🫁',
      '복부': '🫄',
      'MSK': '🦴',
      '신경': '🧠',
      '인터벤션': '🩸',
      '유방': '🎀',
      '총론': '💡'
    };

    const sectionOrder = ['흉부', '복부', 'MSK', '신경', '인터벤션', '유방', '총론'];
    const secCounts = {};
    scope.forEach(q => {
      if (q.section) {
        secCounts[q.section] = (secCounts[q.section] || 0) + 1;
      }
    });

    dom.sectionTabs.innerHTML = '';

    // ALL button
    const allBtn = document.createElement('button');
    allBtn.className = `pill-tab ${state.filters.section === 'ALL' ? 'active' : ''}`;
    allBtn.dataset.section = 'ALL';
    allBtn.textContent = `전체 (${scope.length})`;
    allBtn.addEventListener('click', () => {
      dom.sectionTabs.querySelectorAll('.pill-tab').forEach(b => b.classList.remove('active'));
      allBtn.classList.add('active');
      state.filters.section = 'ALL';
      state.currentIndex = 0;
      applyFilters();
      renderCurrentQuestion();
      renderGrid();
      updateStats();
    });
    dom.sectionTabs.appendChild(allBtn);

    sectionOrder.forEach(sec => {
      const count = secCounts[sec] || 0;
      if (count === 0 && state.filters.year !== 'ALL') return; // Hide empty sections in specific year
      const icon = sectionIcons[sec] || '📁';
      const btn = document.createElement('button');
      btn.className = `pill-tab ${state.filters.section === sec ? 'active' : ''}`;
      btn.dataset.section = sec;
      btn.textContent = `${icon} ${sec} (${count})`;
      btn.addEventListener('click', () => {
        dom.sectionTabs.querySelectorAll('.pill-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.filters.section = sec;
        state.currentIndex = 0;
        applyFilters();
        renderCurrentQuestion();
        renderGrid();
        updateStats();
      });
      dom.sectionTabs.appendChild(btn);
    });

    if (state.filters.section !== 'ALL' && (!secCounts[state.filters.section] || secCounts[state.filters.section] === 0)) {
      state.filters.section = 'ALL';
      allBtn.classList.add('active');
    }
  }

  /**
   * Dynamically Render Category Tabs (짤 / 반짤 / 탈 / 기출)
   */
  function renderCategoryTabs(subQuestions) {
    if (!dom.typeTabs) return;
    const scope = (state.filters.year === 'ALL')
      ? subQuestions
      : subQuestions.filter(q => q.year === state.filters.year);

    const catCounts = { '짤': 0, '반짤': 0, '탈': 0, '기출': 0 };
    scope.forEach(q => {
      const c = q.category || '기출';
      catCounts[c] = (catCounts[c] || 0) + 1;
    });

    dom.typeTabs.innerHTML = '';

    const createTab = (type, label, count, title) => {
      const btn = document.createElement('button');
      btn.className = `pill-tab ${state.filters.type === type ? 'active' : ''}`;
      btn.dataset.type = type;
      btn.title = title;
      btn.textContent = `${label} (${count})`;
      btn.addEventListener('click', () => {
        dom.typeTabs.querySelectorAll('.pill-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.filters.type = type;
        state.currentIndex = 0;
        applyFilters();
        renderCurrentQuestion();
      });
      dom.typeTabs.appendChild(btn);
    };

    createTab('ALL', '전체', scope.length, '모든 기출 유형');
    createTab('짤', '⚡ 짤', catCounts['짤'], '기출 발문과 선지가 100% 동일하게 반복 출제된 족보 복붙 문제');
    createTab('반짤', '🔄 반짤', catCounts['반짤'], '발문 조건이나 선지가 살짝 변형되어 출제된 기출 문제');
    createTab('탈', '✨ 탈', catCounts['탈'], '이전 기출에 없던 완전히 새로운 신유형/신환 출제 문제');

    if (catCounts['기출'] > 0) {
      createTab('기출', '📜 기출', catCounts['기출'], '단일 연도 기출 기본 문항');
    }
  }

  /**
   * Filter Questions based on active settings
   */
  function applyFilters() {
    const { subject, year, type, onlyFrequent, onlyImages, onlyIncorrect, onlyBookmarked, searchQuery } = state.filters;
    const query = searchQuery.trim().toLowerCase();

    state.filteredQuestions = state.allQuestions.filter(q => {
      // Subject filter
      if (subject !== 'ALL' && q.subject !== subject) {
        return false;
      }

      // Year filter
      if (year !== 'ALL' && q.year !== year) {
        return false;
      }

      // Section / Subspecialty filter (흉부 / 복부 / MSK / 신경 / 인터벤션 / 유방 / 총론)
      if (state.filters.section && state.filters.section !== 'ALL' && q.section !== state.filters.section) {
        return false;
      }

      // 족보 출제 유형 필터 (짤: 선지까지 완전일치 / 반짤: 변형기출 / 탈: 신규·탈족보 / 기출)
      if (type !== 'ALL' && q.category !== type) {
        return false;
      }

      // Frequent only filter (2회 이상 기출된 야마)
      if (onlyFrequent && (q.freq_count || 1) < 2) {
        return false;
      }

      // Image only filter (사진/영상/그림 문제만)
      if (onlyImages && (!q.images || q.images.length === 0)) {
        return false;
      }

      // Incorrect only filter
      if (onlyIncorrect) {
        const ans = state.userAnswers[q.id];
        if (!ans || ans.isCorrect) return false;
      }

      // Bookmarked only filter
      if (onlyBookmarked && !state.bookmarks.has(q.id)) {
        return false;
      }

      // Search query filter
      if (query) {
        const matchStem = (q.stem || '').toLowerCase().includes(query);
        const matchTitle = (q.theme_title || '').toLowerCase().includes(query);
        const matchId = (q.id || '').toLowerCase().includes(query);
        const matchSection = (q.section || '').toLowerCase().includes(query) || (q.q_label || '').toLowerCase().includes(query);
        const matchOptions = (q.options || []).some(opt => opt.toLowerCase().includes(query));
        if (!matchStem && !matchTitle && !matchId && !matchSection && !matchOptions) {
          return false;
        }
      }

      return true;
    });

    if (state.currentIndex >= state.filteredQuestions.length) {
      state.currentIndex = Math.max(0, state.filteredQuestions.length - 1);
    }
  }

  /**
   * Get Current Question Object
   */
  function getCurrentQuestion() {
    if (state.filteredQuestions.length === 0) return null;
    return state.filteredQuestions[state.currentIndex];
  }

  /**
   * Question Answer Configuration & Multi-Answer Detector Algorithm
   * Analyzes the question data, stem text, and answer key to determine:
   * - isMulti: boolean (is this a multi-answer question?)
   * - requiredCount: number (how many options need to be selected?)
   * - correctIndices: number[] (0-based indices of all correct options)
   * - typeLabel: string (e.g., '단일 정답' or '복수 정답 (2개)')
   */
  function getQuestionAnswerConfig(q) {
    if (!q) {
      return { isMulti: false, requiredCount: 1, correctIndices: [0], typeLabel: '단일 정답' };
    }

    // 1. Direct explicit configuration in question data (highest priority)
    if (Array.isArray(q.correct_option_indices) && q.correct_option_indices.length > 0) {
      const sorted = [...new Set(q.correct_option_indices.map(Number))].sort((a, b) => a - b);
      const isMulti = sorted.length > 1 || !!q.is_multiple_choice;
      const req = q.required_count || sorted.length;
      return {
        isMulti,
        requiredCount: req,
        correctIndices: sorted,
        typeLabel: isMulti ? `복수 정답 (${req}개)` : '단일 정답'
      };
    }

    // 2. Check Stem for explicit count: e.g. (2개), (3개), 2개를 고르시오 (avoiding '2개월')
    const stem = q.stem || '';
    const stemMatch = stem.match(/\(([2-5])개\)|\(([2-5])가지\)|(?<!월)(?<![0-9])([2-5])개를\s*고르|(?<!월)(?<![0-9])([2-5])가지를\s*고르/i);
    const stemCount = stemMatch ? parseInt(stemMatch[1] || stemMatch[2] || stemMatch[3] || stemMatch[4], 10) : null;
    const stemHasModu = /모두\s*고르/i.test(stem);

    // 3. Parse correct_answer string
    const ca = String(q.correct_answer || '');
    // Remove bracketed year tags like [26Y Q01 & 22Y Q50]
    const caClean = ca.replace(/\[.*?\]/g, ' ');
    // If separated by | (different years), check the first chunk
    const firstChunk = caClean.includes('|') ? caClean.split('|')[0] : caClean;

    // Detect circled numbers ① ~ ⑤
    const circledMap = { '①': 0, '②': 1, '③': 2, '④': 3, '⑤': 4 };
    const circledSymbols = firstChunk.match(/[①②③④⑤]/g) || [];
    let detectedIndices = circledSymbols.map(c => circledMap[c]).filter(n => typeof n === 'number');
    detectedIndices = [...new Set(detectedIndices)].sort((a, b) => a - b);

    // Fallback: if single correct_option_index is present and no circled numbers detected
    if (detectedIndices.length === 0 && q.correct_option_index !== undefined && q.correct_option_index !== null) {
      detectedIndices = [Number(q.correct_option_index)];
    }

    const hasMultiKeyword = /복수\s*정답|정답\s*2개/i.test(caClean);
    const isMulti = detectedIndices.length > 1 || (stemCount !== null && stemCount > 1) || hasMultiKeyword || stemHasModu;
    const req = stemCount || (detectedIndices.length > 1 ? detectedIndices.length : (isMulti ? 2 : 1));

    return {
      isMulti,
      requiredCount: req,
      correctIndices: detectedIndices.length > 0 ? detectedIndices : [0],
      typeLabel: isMulti ? `복수 정답 (${req}개)` : '단일 정답'
    };
  }

  /**
   * Non-intrusive Toast Notification
   */
  let toastTimer = null;
  function showToast(message) {
    if (!dom.toastMessage) return;
    dom.toastMessage.textContent = message;
    dom.toastMessage.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (dom.toastMessage) dom.toastMessage.style.display = 'none';
    }, 2400);
  }

  /**
   * Escape HTML utility to prevent XSS when injecting raw text
   */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Parse Markdown formatting into clean semantic HTML:
   * Supports:
   * - Markdown tables (| col | col |) -> <div class="table-responsive"><table class="quiz-table">...</table></div>
   * - Bold: **text** -> <strong>text</strong>
   * - Bullet items: • or - -> <div class="rich-bullet">• text</div>
   * - Line breaks and paragraphs
   */
  function renderRichText(md) {
    if (!md || typeof md !== 'string') return '';
    const lines = md.split('\n');
    const output = [];
    let inTable = false;
    let tableRows = [];

    function formatInline(s) {
      if (!s) return '';
      let str = escapeHtml(s);
      str = str.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      return str;
    }

    function flushTable() {
      if (!tableRows.length) return '';
      let html = '<div class="table-responsive"><table class="quiz-table">';
      const headerCols = tableRows[0];
      html += '<thead><tr>';
      headerCols.forEach(col => {
        html += `<th>${formatInline(col.trim())}</th>`;
      });
      html += '</tr></thead><tbody>';
      for (let r = 1; r < tableRows.length; r++) {
        html += '<tr>';
        tableRows[r].forEach(cell => {
          html += `<td>${formatInline(cell.trim())}</td>`;
        });
        html += '</tr>';
      }
      html += '</tbody></table></div>';
      tableRows = [];
      inTable = false;
      return html;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        if (/^\|[\s:\-]+(?:\|[\s:\-]+)+\|$/.test(trimmed)) {
          continue;
        }
        const rawCells = trimmed.split('|');
        const cells = rawCells.slice(1, -1);
        tableRows.push(cells);
        inTable = true;
      } else {
        if (inTable) {
          output.push(flushTable());
        }
        if (trimmed) {
          if (trimmed.startsWith('• ') || trimmed.startsWith('- ')) {
            output.push(`<div class="rich-bullet">${formatInline(trimmed)}</div>`);
          } else {
            output.push(`<div class="rich-p">${formatInline(trimmed)}</div>`);
          }
        }
      }
    }

    if (inTable) {
      output.push(flushTable());
    }

    return output.join('');
  }

  /**
   * Safe Option Prefix & Label Parser
   * Accurately extracts option number prefix (e.g. '①', '1.') and label text,
   * without EVER stripping medical content numbers (e.g. '4도', '37℃', '1등급', '0.9%', '10~20mL').
   */
  function parseOptionText(optText, optIdx) {
    if (!optText) return { prefix: `${optIdx + 1}.`, label: '' };
    const raw = String(optText).trim();
    
    // 1. Circle numbers: ①, ②, ③, ④, ⑤, ⑥, ⑦, ⑧
    const mCircle = raw.match(/^[①②③④⑤⑥⑦⑧⑨⑩]/);
    if (mCircle) {
      const prefix = mCircle[0];
      const label = raw.slice(prefix.length).trim();
      return { prefix, label };
    }

    // 2. Bracketed numbers: (1), [1], (A)
    const mBracket = raw.match(/^[\(\[\{【]\s*[\dA-Za-z]+\s*[\)\]\}】]\s*/);
    if (mBracket) {
      const prefix = mBracket[0].trim();
      const label = raw.slice(mBracket[0].length).trim();
      return { prefix, label };
    }

    // 3. Digit with explicit punctuation delimiter: 1. , 1) , 1: , 1-
    const mDigitDelim = raw.match(/^\d+\s*[\.\)\:\-]\s*/);
    if (mDigitDelim) {
      const prefix = mDigitDelim[0].trim();
      const label = raw.slice(mDigitDelim[0].length).trim();
      return { prefix, label };
    }

    // 4. Letter with explicit punctuation delimiter: A. , A) , a.
    const mLetterDelim = raw.match(/^[A-Za-z]\s*[\.\)\:\-]\s*/);
    if (mLetterDelim) {
      const prefix = mLetterDelim[0].trim();
      const label = raw.slice(mLetterDelim[0].length).trim();
      return { prefix, label };
    }

    // 5. Bullets: ⚫, ●, •, -, *
    const mBullet = raw.match(/^[\⚫\●\•\-\*\◦\▪]\s*/);
    if (mBullet) {
      const CIRCLE_MAP = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];
      const prefix = CIRCLE_MAP[optIdx] || `${optIdx + 1}.`;
      const label = raw.slice(mBullet[0].length).trim();
      return { prefix, label };
    }

    // Default fallback: attach circled number prefix, keep whole raw string
    const CIRCLE_MAP = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];
    const prefix = CIRCLE_MAP[optIdx] || `${optIdx + 1}.`;
    return { prefix, label: raw };
  }

  /**
   * Check if a raw question citation (e.g. '26Y-01', '22Y-복부01', '20Y-34', '23Y') matches question q
   */
  function isSameQuestionAsRaw(q, rawItem) {
    if (!q || !rawItem) return false;
    // Section match: e.g. 22Y-복부01, 21Y-신경05
    const sm = rawItem.match(/(\d+Y)[-_]([가-힣a-zA-Z]+)0?(\d+)/i);
    if (sm) {
      const yr = sm[1].toUpperCase();
      const sec = sm[2];
      const secQn = parseInt(sm[3], 10);
      if (yr === q.year && q.section && (q.section === sec || q.section.includes(sec) || sec.includes(q.section)) && Number(q.section_q_num) === secQn) {
        return true;
      }
    }
    const m = rawItem.match(/(\d+Y)[-_]Q?0?(\d+)/i);
    if (m) {
      return m[1].toUpperCase() === q.year && parseInt(m[2], 10) === Number(q.q_num);
    }
    const ym = rawItem.match(/^(\d+Y)$/i);
    if (ym) {
      return ym[1].toUpperCase() === q.year;
    }
    return false;
  }

  /**
   * Parse and organize cross-year question linkages for question q.
   * Returns a sorted array of consolidated chip items, one per year:
   * [
   *   { year: '26Y', isCurrent: true, label: '26Y-02 (흉부02)', targetRaw: '26Y-02', targetQ: q },
   *   { year: '22Y', isCurrent: false, label: '22Y-06 (흉부06)', targetRaw: '22Y-06', targetQ: ... },
   *   ...
   * ]
   */
  function parseAndGroupHistoryChips(q) {
    if (!q) return [];
    const rawList = (q.raw_questions && q.raw_questions.length > 0)
      ? q.raw_questions
      : [`${q.year}-${String(q.q_num).padStart(2, '0')}`];

    // Group raw tags by Year
    const yearGroups = new Map();
    const curYear = q.year || '26Y';

    rawList.forEach(rawItem => {
      if (!rawItem) return;
      const ym = rawItem.match(/(\d+Y)/i);
      const yr = ym ? ym[1].toUpperCase() : curYear;
      if (!yearGroups.has(yr)) {
        yearGroups.set(yr, []);
      }
      yearGroups.get(yr).push(rawItem);
    });

    // Ensure current year is included
    if (!yearGroups.has(curYear)) {
      yearGroups.set(curYear, [`${curYear}-${String(q.q_num).padStart(2, '0')}`]);
    }

    const yearPriority = ['26Y', '25Y', '24Y', '23Y', '22Y', '21Y', '20Y', '19Y', '18Y'];
    const sortedYears = Array.from(yearGroups.keys()).sort((a, b) => {
      const idxA = yearPriority.indexOf(a);
      const idxB = yearPriority.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return b.localeCompare(a);
    });

    const items = [];

    sortedYears.forEach(yr => {
      const tags = yearGroups.get(yr) || [];
      const isCur = (yr === curYear);

      let targetQ = isCur ? q : null;
      let targetRaw = tags[0];

      if (!targetQ) {
        // Try finding matching question in state.allQuestions
        // 1. Match by section tag first if exists (e.g. 22Y-복부01)
        const secTag = tags.find(t => /(\d+Y)[-_]([가-힣a-zA-Z]+)0?(\d+)/i.test(t));
        if (secTag) {
          const sm = secTag.match(/(\d+Y)[-_]([가-힣a-zA-Z]+)0?(\d+)/i);
          if (sm) {
            const secName = sm[2];
            const secNum = parseInt(sm[3], 10);
            targetQ = state.allQuestions.find(cand =>
              cand.subject === q.subject &&
              cand.year === yr &&
              cand.section && (cand.section === secName || cand.section.includes(secName) || secName.includes(cand.section)) &&
              Number(cand.section_q_num) === secNum
            );
          }
        }

        // 2. Match by global question number (e.g. 23Y-47, 22Y-06)
        if (!targetQ) {
          const numTag = tags.find(t => /(\d+Y)[-_]Q?0?(\d+)/i.test(t));
          if (numTag) {
            const m = numTag.match(/(\d+Y)[-_]Q?0?(\d+)/i);
            if (m) {
              const numVal = parseInt(m[2], 10);
              targetQ = state.allQuestions.find(cand =>
                cand.subject === q.subject &&
                cand.year === yr &&
                Number(cand.q_num) === numVal
              );
            }
          }
        }

        // 3. Match by raw_questions array strictly in target year
        if (!targetQ) {
          for (const t of tags) {
            targetQ = state.allQuestions.find(cand =>
              cand.subject === q.subject &&
              cand.year === yr &&
              cand.raw_questions && cand.raw_questions.includes(t)
            );
            if (targetQ) break;
          }
        }

        // 4. Match by question ID in target year
        if (!targetQ) {
          const numTag = tags.find(t => /(\d+Y)[-_]Q?0?(\d+)/i.test(t));
          if (numTag) {
            const m = numTag.match(/(\d+Y)[-_]Q?0?(\d+)/i);
            if (m) {
              const numVal = parseInt(m[2], 10);
              targetQ = state.allQuestions.find(cand =>
                cand.subject === q.subject &&
                cand.year === yr &&
                (cand.id.includes(`_Q${String(numVal).padStart(2, '0')}`) || cand.id.includes(`_Q${numVal}`))
              );
            }
          }
        }

        // 5. Cross-subject match in target year if needed
        if (!targetQ) {
          for (const t of tags) {
            targetQ = state.allQuestions.find(cand =>
              cand.year === yr &&
              cand.raw_questions && cand.raw_questions.includes(t)
            );
            if (targetQ) break;
          }
        }
      }

      // Format label
      let label = '';
      if (targetQ) {
        if (targetQ.year === '22Y' && targetQ.section && targetQ.section_q_num) {
          label = `22Y (${targetQ.section} ${String(targetQ.section_q_num).padStart(2, '0')}번)`;
          targetRaw = `22Y-${targetQ.section}${String(targetQ.section_q_num).padStart(2, '0')}`;
        } else {
          label = `${yr}-${String(targetQ.q_num).padStart(2, '0')}`;
          targetRaw = `${yr}-${String(targetQ.q_num).padStart(2, '0')}`;
        }
      } else {
        // Fallback for earlier years not in DB (e.g. 19Y-13)
        const cleanTag = tags.find(t => /[-_]/.test(t)) || tags[0];
        label = cleanTag;
        targetRaw = cleanTag;
      }

      items.push({
        year: yr,
        isCurrent: isCur,
        label: label,
        targetRaw: targetRaw,
        targetQ: targetQ
      });
    });

    return items;
  }

  /**
   * Jump directly to a question object (e.g. from cross-year linkages).
   * Robustly relaxes conflicting filters, updates tabs and UI,
   * switches the active question, and scrolls smoothly to top.
   */
  function jumpToQuestionObject(target, rawFallback = null) {
    if (!target) {
      if (rawFallback) {
        jumpToQuestionByRaw(rawFallback);
      }
      return;
    }

    const curQ = getCurrentQuestion();
    if (curQ && curQ.id === target.id) {
      showToast(`이미 현재 표시 중인 문제입니다.`);
      return;
    }

    // Check if target is already in state.filteredQuestions
    let targetIdx = state.filteredQuestions.findIndex(fq => fq.id === target.id);

    // If target was filtered out, relax filters to ensure it is included
    if (targetIdx === -1) {
      // 1. Subject filter
      if (state.filters.subject !== 'ALL' && state.filters.subject !== target.subject) {
        state.filters.subject = target.subject;
        localStorage.setItem(STORAGE_KEY_SUBJECT, target.subject);
      }

      // 2. Year filter: if restricted and doesn't match target, relax to ALL
      if (state.filters.year !== 'ALL' && state.filters.year !== target.year) {
        state.filters.year = 'ALL';
      }

      // 3. Section filter: if restricted and doesn't match target, relax to ALL
      if (state.filters.section && state.filters.section !== 'ALL' && target.section && state.filters.section !== target.section) {
        state.filters.section = 'ALL';
      }

      // 4. Type/Category filter (짤/반짤/탈/기출)
      if (state.filters.type !== 'ALL' && target.category && state.filters.type !== target.category) {
        state.filters.type = 'ALL';
      }

      // 5. Clear restrictive filters
      if (state.filters.onlyFrequent && (target.freq_count || 1) < 2) {
        state.filters.onlyFrequent = false;
      }
      if (state.filters.onlyImages && (!target.images || target.images.length === 0)) {
        state.filters.onlyImages = false;
      }
      state.filters.onlyIncorrect = false;
      state.filters.onlyBookmarked = false;
      state.filters.searchQuery = '';
      if (dom.searchInput) dom.searchInput.value = '';

      // Sync UI and re-apply filters so state.filteredQuestions includes target
      applyFilters();
      const subQuestions = (state.filters.subject === 'ALL')
        ? state.allQuestions
        : state.allQuestions.filter(cand => cand.subject === state.filters.subject);
      renderYearTabs(subQuestions);
      renderSectionTabs(subQuestions);
      renderCategoryTabs(subQuestions);
      syncFilterButtonsUI();
      updateSubjectUI();

      targetIdx = state.filteredQuestions.findIndex(fq => fq.id === target.id);
    }

    // Fail-safe fallback if still not found
    if (targetIdx === -1) {
      state.filters.subject = target.subject;
      state.filters.year = 'ALL';
      state.filters.section = 'ALL';
      state.filters.type = 'ALL';
      state.filters.onlyFrequent = false;
      state.filters.onlyImages = false;
      state.filters.onlyIncorrect = false;
      state.filters.onlyBookmarked = false;
      state.filters.searchQuery = '';
      if (dom.searchInput) dom.searchInput.value = '';
      applyFilters();
      const subQuestions = state.allQuestions.filter(cand => cand.subject === target.subject);
      renderYearTabs(subQuestions);
      renderSectionTabs(subQuestions);
      renderCategoryTabs(subQuestions);
      syncFilterButtonsUI();
      updateSubjectUI();
      targetIdx = state.filteredQuestions.findIndex(fq => fq.id === target.id);
    }

    if (targetIdx !== -1) {
      state.currentIndex = targetIdx;
      renderCurrentQuestion();
      renderGrid();
      updateStats();
      scrollToQuestionIntel();

      let targetLabel = '';
      if (target.year === '22Y' && target.section && target.section_q_num) {
        targetLabel = `22Y (${target.section} ${String(target.section_q_num).padStart(2, '0')}번)`;
      } else {
        targetLabel = `${target.year}-${String(target.q_num).padStart(2, '0')}`;
      }
      showToast(`⚡ [${targetLabel}] ${target.subject} 기출 문제로 문제를 변경했습니다.`);
    } else {
      showToast(`⚠️ [${target.id}] 문제로 이동하는 중 필터 충돌이 발생했습니다.`);
    }
  }

  /**
   * Jump to question by raw exam tag (e.g. '23Y-47', '22Y-복부01', '22Y-12')
   * Uses robust priority search scoped to target year to prevent self-matching.
   */
  function jumpToQuestionByRaw(rawItem) {
    if (!rawItem) return;
    const curQ = getCurrentQuestion();
    const curSub = curQ ? curQ.subject : (state.filters.subject !== 'ALL' ? state.filters.subject : null);

    // Section tag match: e.g. 22Y-복부01, 21Y-신경05
    const sm = rawItem.match(/(\d+Y)[-_]([가-힣a-zA-Z]+)0?(\d+)/i);
    const m = rawItem.match(/(\d+Y)[-_]Q?0?(\d+)/i);

    if (!m && !sm) {
      const ym = rawItem.match(/^(\d+Y)$/i);
      if (ym) {
        const targetYear = ym[1].toUpperCase();
        state.filters.year = targetYear;
        applyFilters();
        const subQuestions = (state.filters.subject === 'ALL')
          ? state.allQuestions
          : state.allQuestions.filter(cand => cand.subject === state.filters.subject);
        renderYearTabs(subQuestions);
        renderSectionTabs(subQuestions);
        renderCategoryTabs(subQuestions);
        state.currentIndex = 0;
        renderCurrentQuestion();
        renderGrid();
        updateStats();
        showToast(`📅 ${targetYear} 기출 문제 목록으로 필터를 전환했습니다.`);
      }
      return;
    }

    const targetYear = sm ? sm[1].toUpperCase() : m[1].toUpperCase();
    const targetSec = sm ? sm[2] : null;
    const targetSecNum = sm ? parseInt(sm[3], 10) : null;
    const targetNum = m ? parseInt(m[2], 10) : null;

    // If already viewing this exact question, alert user gently
    if (curQ && isSameQuestionAsRaw(curQ, rawItem)) {
      showToast(`이미 현재 표시 중인 문제입니다. (${rawItem})`);
      return;
    }

    // Find target question strictly scoped by targetYear
    let target = null;

    // 1. Section match in targetYear
    if (sm) {
      target = state.allQuestions.find(cand =>
        (curSub ? cand.subject === curSub : true) &&
        cand.year === targetYear &&
        cand.section && (cand.section === targetSec || cand.section.includes(targetSec) || targetSec.includes(cand.section)) &&
        Number(cand.section_q_num) === targetSecNum
      );
    }

    // 2. Exact q_num in targetYear & subject
    if (!target && targetNum) {
      target = state.allQuestions.find(cand =>
        (curSub ? cand.subject === curSub : true) &&
        cand.year === targetYear &&
        Number(cand.q_num) === targetNum
      );
    }

    // 3. raw_questions in targetYear & subject
    if (!target) {
      target = state.allQuestions.find(cand =>
        (curSub ? cand.subject === curSub : true) &&
        cand.year === targetYear &&
        cand.raw_questions && cand.raw_questions.includes(rawItem)
      );
    }

    // 4. ID match in targetYear & subject
    if (!target && targetNum) {
      target = state.allQuestions.find(cand =>
        (curSub ? cand.subject === curSub : true) &&
        cand.year === targetYear &&
        (cand.id.includes(`_Q${String(targetNum).padStart(2, '0')}`) || cand.id.includes(`_Q${targetNum}`))
      );
    }

    // 5. Cross-subject match in targetYear
    if (!target) {
      target = state.allQuestions.find(cand =>
        cand.year === targetYear &&
        cand.raw_questions && cand.raw_questions.includes(rawItem)
      );
    }

    if (!target) {
      showToast(`⚠️ [${rawItem}] 문제는 현재 5개년(20Y~26Y) 기출 DB에 포함되어 있지 않습니다.`);
      return;
    }

    // Jump to the found target question
    jumpToQuestionObject(target, rawItem);
  }

  /**
   * Update Exam Intelligence Card Theme Display with Spoiler Protection
   */
  function updateCardThemeDisplay(q, isAnswered) {
    if (!dom.cardThemeTitle || !q) return;
    const realTitle = q.theme_title || '임상 검사 판독 및 의의';
    dom.cardThemeTitle.dataset.realTheme = realTitle;

    if (isAnswered) {
      dom.cardThemeTitle.classList.remove('spoiler-masked', 'spoiler-peek');
      dom.cardThemeTitle.textContent = realTitle;
      dom.cardThemeTitle.title = '';
    } else {
      if (dom.cardThemeTitle.dataset.peeked === q.id) {
        dom.cardThemeTitle.className = 'intel-theme-text spoiler-peek';
        dom.cardThemeTitle.textContent = `🔓 ${realTitle}`;
        dom.cardThemeTitle.title = '클릭하면 다시 가려집니다.';
      } else {
        dom.cardThemeTitle.className = 'intel-theme-text spoiler-masked';
        dom.cardThemeTitle.innerHTML = '<span class="theme-lock-icon">🔒</span> 출제 테마 가림 (스포 방지 · 클릭하여 보기)';
        dom.cardThemeTitle.title = '정답 스포 방지를 위해 가려져 있습니다. 클릭하면 미리볼 수 있습니다.';
      }
    }
  }

  /**
   * Render Current Question
   */
  function renderCurrentQuestion() {
    const q = getCurrentQuestion();
    if (!q) {
      dom.cardStem.textContent = '조건에 일치하는 문제가 없습니다. 필터를 초기화해 보세요.';
      dom.cardImagesContainer.style.display = 'none';
      dom.optionsList.innerHTML = '';
      if (dom.multiActionBar) dom.multiActionBar.style.display = 'none';
      dom.feedbackBanner.style.display = 'none';
      dom.cardExplanation.style.display = 'none';
      dom.filterCounter.textContent = '문항 0 / 0';
      if (dom.navJumpInput && dom.navIndicatorTotal) {
        dom.navJumpInput.value = '0';
        dom.navJumpInput.disabled = true;
        dom.navIndicatorTotal.textContent = '0';
      } else if (dom.navIndicator) {
        dom.navIndicator.textContent = '0 / 0';
      }
      return;
    }

    // Top Metadata Badges
    if (dom.cardSubject) {
      dom.cardSubject.textContent = q.subject || '임상의학';
    }

    // Always show year & qnum badges with section-aware labels
    if (dom.cardYear) {
      dom.cardYear.style.display = '';
      dom.cardYear.textContent = q.year || '기출';
      dom.cardYear.title = `${q.year || ''} 기출 문제 필터 전환`;
    }
    if (dom.cardQnum) {
      dom.cardQnum.style.display = '';
      if (q.year === '22Y' && q.section && q.section_q_num) {
        dom.cardQnum.textContent = `${q.section} ${String(q.section_q_num).padStart(2, '0')}번`;
      } else if (q.q_label) {
        dom.cardQnum.textContent = q.q_label;
      } else if (q.section && q.section_q_num) {
        dom.cardQnum.textContent = `${q.section} Q${String(q.section_q_num).padStart(2, '0')}`;
      } else {
        dom.cardQnum.textContent = `Q${String(q.q_num).padStart(2, '0')}`;
      }
    }

    // Cross-year linked chips (links to other matching questions)
    if (dom.cardMetaLinkedChips) {
      dom.cardMetaLinkedChips.innerHTML = '';
      const historyItems = parseAndGroupHistoryChips(q);
      const otherLinks = historyItems.filter(item => !item.isCurrent);
      otherLinks.forEach(item => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = item.targetQ ? 'meta-link-chip' : 'meta-link-chip unlinked';
        chip.innerHTML = item.targetQ
          ? `${item.label} <span class="chip-arrow">↗</span>`
          : `${item.label} <span class="chip-unlinked-tag">미수록</span>`;
        chip.title = item.targetQ
          ? `[${item.label}] 기출 문제로 즉시 문제 바꾸기`
          : `[${item.label}] 문제는 20Y 이전 기출로 20Y~26Y DB에 수록되어 있지 않습니다`;
        chip.addEventListener('click', (e) => {
          e.stopPropagation();
          if (item.targetQ) {
            jumpToQuestionObject(item.targetQ, item.targetRaw);
          } else {
            showToast(`ℹ️ [${item.label}] 문제는 20Y 이전 기출로 현재 5개년 DB에는 수록되어 있지 않습니다.`);
          }
        });
        dom.cardMetaLinkedChips.appendChild(chip);
      });
    }

    // 기출 연계 유형 (짤 / 반짤 / 탈 / 기출)
    const cat = q.category || '기출';
    dom.cardCategory.className = `category-badge cat-${cat}`;
    if (cat === '짤') {
      dom.cardCategory.textContent = '⚡ 짤 (완전일치)';
      dom.cardCategory.title = '기출 발문과 선지가 100% 동일하게 반복 출제된 족보 복붙 문제';
    } else if (cat === '반짤') {
      dom.cardCategory.textContent = '🔄 반짤 (변형기출)';
      dom.cardCategory.title = '문제 유형, 발문 조건, 선지가 살짝 변형되어 출제된 문제';
    } else if (cat === '탈') {
      dom.cardCategory.textContent = '✨ 탈 (신규·탈족)';
      dom.cardCategory.title = '이전 기출에 없던 완전히 새로운 신유형/신규 출제 문제';
    } else {
      dom.cardCategory.textContent = '📜 기출';
      dom.cardCategory.title = '단일 연도 기출 기본 문항';
    }

    dom.cardSubspecialty.textContent = q.subspecialty || (q.subject ? `${q.subject} 일반` : '임상의학');

    const countText = `문항 ${state.currentIndex + 1} / ${state.filteredQuestions.length}`;
    dom.filterCounter.textContent = countText;
    if (dom.navJumpInput && dom.navIndicatorTotal) {
      dom.navJumpInput.disabled = false;
      dom.navJumpInput.value = String(state.currentIndex + 1);
      dom.navIndicatorTotal.textContent = String(state.filteredQuestions.length);
    } else if (dom.navIndicator) {
      dom.navIndicator.textContent = `${state.currentIndex + 1} / ${state.filteredQuestions.length}`;
    }

    // Bookmark Toggle
    const isBookmarked = state.bookmarks.has(q.id);
    dom.btnBookmark.classList.toggle('active', isBookmarked);

    // Update Error Report Button State
    updateReportButtonState(q);

    // Exam Intelligence (출제 테마 & 기출 빈도 이력 브리핑)
    const freqCount = q.freq_count || 1;
    const rate = q.rate || (freqCount >= 5 ? 100 : Math.round((freqCount / 6) * 100));

    // 1. Meta Bar Frequency Badge
    if (dom.cardFreqBadge) {
      if (freqCount >= 4 || rate >= 60) {
        dom.cardFreqBadge.className = 'freq-badge super';
        dom.cardFreqBadge.textContent = `★ ${freqCount}개년 빈출 (${rate}% 특급 야마)`;
      } else if (freqCount >= 2) {
        dom.cardFreqBadge.className = 'freq-badge high';
        dom.cardFreqBadge.textContent = `★ ${freqCount}개년 기출 (${rate}%)`;
      } else {
        dom.cardFreqBadge.className = 'freq-badge normal';
        dom.cardFreqBadge.textContent = '단일 기출';
      }
    }

    // 2. Exam Intelligence Box Content (Theme with Spoiler Protection)
    updateCardThemeDisplay(q, !!state.userAnswers[q.id]);

    if (dom.cardFreqStatText) {
      dom.cardFreqStatText.textContent = `6개년 중 ${freqCount}회 출제 (${rate}% 출제율)`;
    }

    if (dom.cardHistoryChips) {
      dom.cardHistoryChips.innerHTML = '';
      const historyItems = parseAndGroupHistoryChips(q);

      historyItems.forEach(item => {
        if (item.isCurrent) {
          const chip = document.createElement('span');
          chip.className = 'intel-chip current';
          chip.innerHTML = `${item.label} <span class="chip-now">현재</span>`;
          chip.title = '현재 학습 중인 기출 문항';
          dom.cardHistoryChips.appendChild(chip);
        } else if (item.targetQ) {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'intel-chip linked';
          chip.innerHTML = `${item.label} <span class="chip-arrow">↗ 문제 바꾸기</span>`;
          chip.title = `클릭 시 [${item.label}] 기출 문제로 즉시 문제 바꾸기`;
          chip.addEventListener('click', () => {
            jumpToQuestionObject(item.targetQ, item.targetRaw);
          });
          dom.cardHistoryChips.appendChild(chip);
        } else {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'intel-chip unlinked';
          chip.innerHTML = `${item.label} <span class="chip-unlinked-tag">미수록</span>`;
          chip.title = `[${item.label}] 문제는 20Y 이전 기출로 20Y~26Y DB에 수록되어 있지 않습니다`;
          chip.addEventListener('click', () => {
            showToast(`ℹ️ [${item.label}] 문제는 20Y 이전 기출로 현재 5개년 DB에는 수록되어 있지 않습니다.`);
          });
          dom.cardHistoryChips.appendChild(chip);
        }
      });
    }

    // Stem Text
    dom.cardStem.textContent = q.stem;

    // Images (Hide stem gallery if images are used directly as options)
    if (q.images && q.images.length > 0 && !q.is_image_options) {
      dom.cardImagesContainer.style.display = 'flex';
      dom.cardImages.innerHTML = '';
      q.images.forEach((imgSrc, idx) => {
        const resolvedSrc = imgSrc.includes('?') ? imgSrc : `${imgSrc}?v=20261029v2`;
        const wrapper = document.createElement('div');
        wrapper.className = 'image-item-wrapper';
        wrapper.setAttribute('role', 'button');
        wrapper.setAttribute('tabindex', '0');
        wrapper.setAttribute('aria-label', `${q.id} 고화질 사진 확대`);

        const img = document.createElement('img');
        img.src = resolvedSrc;
        img.alt = `${q.id} 임상 사진 ${idx + 1}`;
        img.className = 'quiz-image';

        const badge = document.createElement('div');
        badge.className = 'image-zoom-overlay-badge';
        badge.setAttribute('title', '고화질 원본 확대');
        badge.setAttribute('aria-hidden', 'true');
        badge.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="11" y1="8" x2="11" y2="14"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        `;

        wrapper.appendChild(img);
        wrapper.appendChild(badge);

        wrapper.addEventListener('click', () => openLightbox(resolvedSrc, `${q.id} [임상 사진 ${idx + 1}]`));
        wrapper.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openLightbox(resolvedSrc, `${q.id} [임상 사진 ${idx + 1}]`);
          }
        });

        dom.cardImages.appendChild(wrapper);
      });
    } else {
      dom.cardImagesContainer.style.display = 'none';
      dom.cardImages.innerHTML = '';
    }

    // Reset temporary selections for unanswered question
    const answerRecord = state.userAnswers[q.id];
    if (!answerRecord) {
      state.pendingSelections.clear();
    }

    // Render Options & Action Bar
    renderOptions(q);

    // Check answered state
    if (answerRecord) {
      revealAnswerAndExplanation(q, answerRecord, false);
    } else {
      hideAnswerAndExplanation();
    }

    saveStorage();
  }

  /**
   * Get or generate shuffled option order for question q
   * Returns array mapping displayIdx -> origIdx
   */
  function getDisplayOrder(q, forceRegenerate = false) {
    const n = (q && q.options) ? q.options.length : 0;
    const identity = Array.from({ length: n }, (_, i) => i);
    if (!state.shuffleOptions || n <= 1) {
      return identity;
    }
    if (!forceRegenerate && state.shuffledOrders[q.id] && state.shuffledOrders[q.id].length === n) {
      return state.shuffledOrders[q.id];
    }
    const arr = [...identity];
    // Fisher-Yates shuffle
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    // Avoid identity order when n >= 2 if possible
    if (n >= 2 && arr.every((val, idx) => val === idx)) {
      const swapIdx = 1 + Math.floor(Math.random() * (n - 1));
      [arr[0], arr[swapIdx]] = [arr[swapIdx], arr[0]];
    }
    state.shuffledOrders[q.id] = arr;
    return arr;
  }

  function formatOptionWithDisplayNum(q, origIdx) {
    if (!q || !q.options || origIdx === undefined || origIdx < 0 || origIdx >= q.options.length) return '';
    const order = getDisplayOrder(q);
    const dispIdx = order.indexOf(origIdx);
    const numSym = CIRCLE_NUMS[dispIdx !== -1 ? dispIdx : origIdx] || `${(dispIdx !== -1 ? dispIdx : origIdx) + 1}.`;
    const { label } = parseOptionText(q.options[origIdx], origIdx);
    return `${numSym} ${label}`;
  }

  /**
   * Render Options List and Multi-Submit Action Bar
   */
  function renderOptions(q) {
    dom.optionsList.innerHTML = '';
    dom.optionsList.classList.toggle('has-image-options', !!q.is_image_options);
    const config = getQuestionAnswerConfig(q);
    const answerRecord = state.userAnswers[q.id];
    const isAnswered = !!answerRecord;
    const order = getDisplayOrder(q);

    if (dom.btnToggleShuffle) {
      dom.btnToggleShuffle.classList.toggle('active', state.shuffleOptions);
      dom.btnToggleShuffle.textContent = state.shuffleOptions ? '🔀 선지 섞기 ON' : '🔀 선지 섞기';
    }
    if (dom.btnReshuffleNow) {
      dom.btnReshuffleNow.style.display = (state.shuffleOptions && !isAnswered && q.options && q.options.length > 1) ? 'inline-flex' : 'none';
    }

    // Header Badge & Tips
    if (dom.cardMultiBadge) {
      if (config.isMulti) {
        dom.cardMultiBadge.style.display = 'inline-flex';
        dom.cardMultiBadge.textContent = `복수 정답 (${config.requiredCount}개)`;
      } else {
        dom.cardMultiBadge.style.display = 'none';
      }
    }

    if (dom.optionsLabel) {
      if (config.isMulti) {
        dom.optionsLabel.textContent = `복수 정답 문항입니다. 정답 ${config.requiredCount}개를 모두 선택하세요.`;
      } else {
        dom.optionsLabel.textContent = state.shuffleOptions
          ? '선지를 클릭하여 정답을 선택하세요 (선지 순서 랜덤 섞기 적용 중)'
          : '선지를 클릭하여 정답을 선택하세요';
      }
    }

    if (dom.optionsKbdTip) {
      if (config.isMulti) {
        dom.optionsKbdTip.textContent = '단축키: 1 ~ 5 (토글), Enter (정답 확인), S (섞기)';
      } else {
        dom.optionsKbdTip.textContent = '단축키: 숫자키 1 ~ 5, S (선지 섞기)';
      }
    }

    // Handle Subjective / Essay Questions with no options
    if (!q.options || q.options.length === 0) {
      if (dom.optionsLabel) {
        dom.optionsLabel.textContent = '주관식 / 서술형 / 단답형 복기 문항입니다.';
      }
      if (dom.optionsKbdTip) {
        dom.optionsKbdTip.textContent = '단축키: Space 또는 Enter (정답 및 상세 해설 열기)';
      }
      if (dom.cardMultiBadge) {
        dom.cardMultiBadge.style.display = 'inline-flex';
        dom.cardMultiBadge.textContent = '📝 주관식 자가채점';
      }

      const subjectiveWrapper = document.createElement('div');
      subjectiveWrapper.className = 'subjective-card-wrapper';

      if (!isAnswered) {
        subjectiveWrapper.innerHTML = `
          <div class="subjective-notice-box">
            <div class="subjective-icon">📝</div>
            <div class="subjective-info">
              <div class="subjective-title">주관식 / 서술형 기출 복기 문항</div>
              <div class="subjective-sub">스스로 정답을 생각한 후, 아래 버튼을 눌러 모범 답안과 상세 해설을 확인하고 자가 채점하세요.</div>
            </div>
          </div>
          <button type="button" class="btn-subjective-reveal" id="btn-subjective-reveal">
            💡 정답 및 상세 해설 확인하기 (Enter)
          </button>
        `;
        const revealBtn = subjectiveWrapper.querySelector('#btn-subjective-reveal');
        revealBtn.addEventListener('click', () => {
          state.userAnswers[q.id] = {
            selectedIndices: [],
            isCorrect: true,
            isSubjective: true,
            timestamp: Date.now()
          };
          revealAnswerAndExplanation(q, state.userAnswers[q.id], false);
          renderOptions(q);
          renderGrid();
          updateStats();
          saveStorage();
        });
      } else {
        const isCorrect = !!answerRecord.isCorrect;
        subjectiveWrapper.innerHTML = `
          <div class="subjective-graded-box ${isCorrect ? 'graded-correct' : 'graded-wrong'}">
            <div class="subjective-graded-info">
              <span class="subjective-grade-badge ${isCorrect ? 'badge-correct' : 'badge-wrong'}">
                ${isCorrect ? '✅ 맞힘 (정답)' : '❌ 틀림 (복습 요망)'}
              </span>
              <span class="subjective-grade-hint">자가 채점 결과를 언제든 변경할 수 있습니다:</span>
            </div>
            <div class="subjective-grade-actions">
              <button type="button" class="btn-grade-toggle btn-grade-pass ${isCorrect ? 'active' : ''}">
                ✅ 맞힘
              </button>
              <button type="button" class="btn-grade-toggle btn-grade-fail ${!isCorrect ? 'active' : ''}">
                ❌ 틀림
              </button>
            </div>
          </div>
        `;
        const passBtn = subjectiveWrapper.querySelector('.btn-grade-pass');
        const failBtn = subjectiveWrapper.querySelector('.btn-grade-fail');
        passBtn.addEventListener('click', () => {
          state.userAnswers[q.id].isCorrect = true;
          revealAnswerAndExplanation(q, state.userAnswers[q.id], false);
          renderOptions(q);
          renderGrid();
          updateStats();
          saveStorage();
        });
        failBtn.addEventListener('click', () => {
          state.userAnswers[q.id].isCorrect = false;
          revealAnswerAndExplanation(q, state.userAnswers[q.id], false);
          renderOptions(q);
          renderGrid();
          updateStats();
          saveStorage();
        });
      }
      dom.optionsList.appendChild(subjectiveWrapper);
      return;
    }

    // Render Option Buttons in Display Order (displayIdx -> origIdx)
    order.forEach((origIdx, displayIdx) => {
      const optText = q.options[origIdx];
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.dataset.origIdx = String(origIdx);
      btn.dataset.displayIdx = String(displayIdx);
      if (isAnswered) {
        btn.classList.add('disabled');
      }

      // Safe option text parsing: NEVER strips numbers from labels!
      const { prefix: origPrefix, label: labelText } = parseOptionText(optText, origIdx);
      const numPrefix = state.shuffleOptions ? (CIRCLE_NUMS[displayIdx] || `${displayIdx + 1}.`) : origPrefix;

      const isPending = !isAnswered && config.isMulti && state.pendingSelections.has(origIdx);
      if (isPending) {
        btn.classList.add('is-selected-pending');
      }

      // Checkbox SVG for multi-choice
      const checkboxHtml = config.isMulti ? `
        <span class="option-checkbox" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </span>
      ` : '';

      const optImages = q.option_images || (q.is_image_options ? q.images : null);
      const isImageOpt = q.is_image_options && optImages && optImages[origIdx];
      if (isImageOpt) {
        btn.classList.add('image-option-card');
        const rawSrc = optImages[origIdx];
        const optImgSrc = rawSrc.includes('?') ? rawSrc : `${rawSrc}?v=20261031v5`;
        btn.innerHTML = `
          <div class="image-opt-header">
            <div class="image-opt-left">
              ${checkboxHtml}
              <span class="option-num">${numPrefix}</span>
              ${labelText ? `<span class="image-opt-paren">${labelText}</span>` : ''}
            </div>
            <div class="image-opt-right">
              <span class="option-status-icon"></span>
              <span class="option-kbd-hint">${displayIdx + 1}</span>
            </div>
          </div>
          <div class="image-opt-img-wrap">
            <img src="${optImgSrc}" class="image-opt-img" alt="${numPrefix} 선지 사진" />
            <span class="image-opt-zoom-btn" title="고화질 원본 확대">🔍 확대</span>
          </div>
        `;
        const zoomBtn = btn.querySelector('.image-opt-zoom-btn');
        if (zoomBtn) {
          zoomBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openLightbox(optImgSrc, `${q.id} [선지 ${numPrefix} 사진]`);
          });
        }
      } else {
        btn.innerHTML = `
          <div class="option-left">
            ${checkboxHtml}
            <span class="option-num">${numPrefix}</span>
            <span class="option-label">${labelText}</span>
          </div>
          <div class="option-right">
            <span class="option-status-icon"></span>
            <span class="option-kbd-hint">${displayIdx + 1}</span>
          </div>
        `;
      }

      btn.addEventListener('click', () => {
        if (!state.userAnswers[q.id]) {
          if (config.isMulti) {
            togglePendingSelection(q, origIdx, config);
          } else {
            handleSelectSingleOption(q, origIdx, config);
          }
        }
      });

      dom.optionsList.appendChild(btn);
    });

    // Update Multi-Answer Action Bar
    if (dom.multiActionBar) {
      if (config.isMulti && !isAnswered) {
        dom.multiActionBar.style.display = 'flex';
        const selCount = state.pendingSelections.size;
        const reqCount = config.requiredCount;

        if (dom.multiStatusText) {
          dom.multiStatusText.innerHTML = `선택 현황: <strong>${selCount} / ${reqCount}개</strong>`;
        }

        if (dom.btnMultiSubmit) {
          const isReady = (selCount === reqCount);
          dom.btnMultiSubmit.disabled = !isReady;
          if (dom.multiSubmitText) {
            dom.multiSubmitText.textContent = isReady
              ? `정답 확인 (${selCount}/${reqCount}) ✓`
              : `정답 확인 (${selCount}/${reqCount})`;
          }
        }
      } else {
        dom.multiActionBar.style.display = 'none';
      }
    }
  }

  /**
   * Toggle Multi-Choice Option Selection
   */
  function togglePendingSelection(q, optIdx, config) {
    if (state.userAnswers[q.id]) return;

    if (state.pendingSelections.has(optIdx)) {
      state.pendingSelections.delete(optIdx);
    } else {
      if (state.pendingSelections.size >= config.requiredCount) {
        showToast(`정답은 ${config.requiredCount}개만 선택할 수 있습니다. 변경하려면 기존 선택을 먼저 취소하세요.`);
        return;
      }
      state.pendingSelections.add(optIdx);
    }

    renderOptions(q);
  }

  /**
   * Submit Multi-Choice Answers
   */
  function submitMultiSelection(q, config) {
    if (state.userAnswers[q.id]) return;
    if (state.pendingSelections.size < config.requiredCount) {
      showToast(`정답 ${config.requiredCount}개를 모두 선택해주세요. (현재 ${state.pendingSelections.size}개 선택됨)`);
      return;
    }

    const selectedIndices = Array.from(state.pendingSelections).sort((a, b) => a - b);
    evaluateAndSaveAnswer(q, selectedIndices, config);
  }

  /**
   * Handle Single-Choice Instant Selection
   */
  function handleSelectSingleOption(q, selectedIdx, config) {
    evaluateAndSaveAnswer(q, [selectedIdx], config);
  }

  /**
   * Core Grading & Scoring Algorithm
   * Compares selectedIndices with correctIndices to evaluate:
   * - fully correct (100%)
   * - partially correct (proportional score)
   * - incorrect (0%)
   */
  function evaluateAndSaveAnswer(q, selectedIndices, config) {
    const correctIndices = config.correctIndices;
    const selectedSet = new Set(selectedIndices);
    const correctSet = new Set(correctIndices);

    const correctlySelected = selectedIndices.filter(i => correctSet.has(i));
    const wronglySelected = selectedIndices.filter(i => !correctSet.has(i));
    const missedCorrect = correctIndices.filter(i => !selectedSet.has(i));

    const isFullyCorrect = (wronglySelected.length === 0 && missedCorrect.length === 0);
    const isPartial = (!isFullyCorrect && correctlySelected.length > 0);
    const score = isFullyCorrect ? 1.0 : (correctlySelected.length / Math.max(1, correctIndices.length));

    // Save answer state
    state.userAnswers[q.id] = {
      selectedIndices: selectedIndices,
      selectedIndex: selectedIndices[0] !== undefined ? selectedIndices[0] : -1,
      correctIndices: correctIndices,
      isCorrect: isFullyCorrect,
      isPartial: isPartial,
      score: score,
      timestamp: Date.now()
    };

    saveStorage();
    updateStats();
    renderOptions(q);
    revealAnswerAndExplanation(q, state.userAnswers[q.id], true);
  }

  /**
   * Render Structured Option-by-Option Explanation Cards
   */
  function renderDifferentialExplanation(q, exp, answerRecord) {
    if (!dom.expDifferential) return;

    const optExps = q.option_explanations || (exp && exp.option_explanations);
    const userSelectedSet = new Set((answerRecord && answerRecord.selectedIndices) || (answerRecord && answerRecord.selectedIndex !== undefined ? [answerRecord.selectedIndex] : []));

    if (optExps && Array.isArray(optExps) && optExps.length > 0) {
      dom.expDifferential.innerHTML = '';
      const listEl = document.createElement('div');
      listEl.className = 'opt-exp-list';
      const order = getDisplayOrder(q);

      // Build map from origIdx -> explanation item
      const expByOrigIdx = new Map();
      optExps.forEach((item, idx) => {
        const origIdx = item.opt_idx !== undefined ? item.opt_idx : idx;
        expByOrigIdx.set(origIdx, item);
      });

      // Iterate in current display order so explanation cards match ① ~ ⑤ on screen
      const orderedItems = (order.length === optExps.length)
        ? order.map((origIdx, dispIdx) => ({ item: expByOrigIdx.get(origIdx) || optExps[origIdx], origIdx, dispIdx }))
        : optExps.map((item, idx) => {
            const origIdx = item.opt_idx !== undefined ? item.opt_idx : idx;
            const dispIdx = order.indexOf(origIdx);
            return { item, origIdx, dispIdx: dispIdx !== -1 ? dispIdx : idx };
          });

      orderedItems.forEach(({ item, origIdx, dispIdx }) => {
        if (!item) return;
        const isUserPicked = userSelectedSet.has(origIdx);
        const itemEl = document.createElement('div');
        itemEl.className = 'opt-exp-item ' + (item.is_correct ? 'correct' : 'wrong') + (isUserPicked ? ' user-picked' : '');

        const headerEl = document.createElement('div');
        headerEl.className = 'opt-exp-header';

        const badgeEl = document.createElement('span');
        badgeEl.className = 'opt-badge ' + (item.is_correct ? 'correct' : 'wrong');
        badgeEl.textContent = item.is_correct ? '정답' : '오답 감별';
        headerEl.appendChild(badgeEl);

        if (isUserPicked) {
          const userBadge = document.createElement('span');
          userBadge.className = 'opt-user-badge ' + (item.is_correct ? 'picked-correct' : 'picked-wrong');
          userBadge.textContent = item.is_correct ? '내 선택 (일치) ✓' : '내 선택 ✗';
          headerEl.appendChild(userBadge);
        }

        const displayNumSym = state.shuffleOptions
          ? (CIRCLE_NUMS[dispIdx] || `${dispIdx + 1}.`)
          : (item.opt_num || CIRCLE_NUMS[origIdx] || `${origIdx + 1}.`);
        if (displayNumSym) {
          const numEl = document.createElement('span');
          numEl.className = 'opt-num';
          numEl.textContent = displayNumSym;
          headerEl.appendChild(numEl);
        }

        const nameEl = document.createElement('span');
        nameEl.className = 'opt-name';
        nameEl.textContent = item.text || (q.options && q.options[origIdx]) || '';
        headerEl.appendChild(nameEl);

        itemEl.appendChild(headerEl);
        if (item.reason && item.reason.trim()) {
          const bodyEl = document.createElement('div');
          bodyEl.className = 'opt-exp-body';
          bodyEl.textContent = item.reason;
          itemEl.appendChild(bodyEl);
        }
        listEl.appendChild(itemEl);
      });

      dom.expDifferential.appendChild(listEl);

      // If there is additional general differential or KMLE theory notes, append below
      const generalText = (exp && (exp.differential_general || exp.kmle_theory_note)) || '';
      if (generalText && generalText.trim()) {
        const generalEl = document.createElement('div');
        generalEl.className = 'opt-exp-general';
        generalEl.innerHTML = `<div class="opt-exp-general-title">💡 핵심 감별 및 임상 가이드라인</div><div class="opt-exp-general-content">${renderRichText(generalText)}</div>`;
        dom.expDifferential.appendChild(generalEl);
      }
    } else {
      // Fallback for short-answer or legacy format
      const rawDiff = (exp && exp.differential) || '선지별 감별 임상 의의 및 관련 질환 감별 포인트를 숙지하십시오.';
      dom.expDifferential.innerHTML = `<div class="exp-plain-text">${renderRichText(rawDiff)}</div>`;
    }
  }

  /**
   * Reveal Answer, Grading Highlights, and Clinical Explanation
   */
  function revealAnswerAndExplanation(q, answerRecord, animate) {
    const config = getQuestionAnswerConfig(q);
    const correctSet = new Set(config.correctIndices);
    const selectedIndices = answerRecord.selectedIndices || [answerRecord.selectedIndex];
    const selectedSet = new Set(selectedIndices);

    const optionButtons = dom.optionsList.querySelectorAll('.option-btn');

    optionButtons.forEach((btn, idx) => {
      const origIdx = btn.dataset.origIdx !== undefined ? Number(btn.dataset.origIdx) : idx;
      btn.classList.add('disabled');
      btn.classList.remove('is-selected-pending');
      const isSelected = selectedSet.has(origIdx);
      const isTargetCorrect = correctSet.has(origIdx);
      const iconSpan = btn.querySelector('.option-status-icon');

      if (isSelected && isTargetCorrect) {
        // Correctly chosen!
        btn.classList.add('is-correct');
        if (iconSpan) {
          iconSpan.textContent = '✓ 정답';
          iconSpan.style.display = 'inline-block';
        }
      } else if (isSelected && !isTargetCorrect) {
        // Wrongly chosen!
        btn.classList.add('is-wrong');
        if (iconSpan) {
          iconSpan.textContent = '✗ 오답';
          iconSpan.style.display = 'inline-block';
        }
      } else if (!isSelected && isTargetCorrect) {
        // Correct option that user missed!
        btn.classList.add('is-actual-correct', 'is-missed');
        if (iconSpan) {
          iconSpan.textContent = '💡 놓친 정답';
          iconSpan.style.display = 'inline-block';
        }
      } else {
        // Neutral unselected distractor
        btn.classList.add('is-neutral');
      }

      // End of option button setup
    });

    // Feedback Banner
    const isCorrect = answerRecord.isCorrect;
    const isPartial = answerRecord.isPartial;

    dom.feedbackBanner.style.display = 'flex';
    dom.feedbackBanner.className = 'feedback-banner ' + (isCorrect ? 'correct' : (isPartial ? 'partial' : 'wrong'));
    
    const correctDisplayLabels = config.correctIndices.map(i => formatOptionWithDisplayNum(q, i)).filter(Boolean).join(', ');

    if (isCorrect) {
      dom.feedbackIcon.textContent = '🎉';
      dom.feedbackStatus.textContent = config.isMulti 
        ? `정답입니다! (복수 정답 ${config.requiredCount}개 모두 일치)` 
        : '정답입니다!';
      dom.feedbackDetail.textContent = '모든 정답을 완벽하게 맞히셨습니다. 아래 해설에서 핵심 임상 포인트를 복습하세요.';
    } else if (isPartial) {
      dom.feedbackIcon.textContent = '⚠️';
      const rightCount = selectedIndices.filter(i => correctSet.has(i)).length;
      dom.feedbackStatus.textContent = `부분 정답입니다 (${config.correctIndices.length}개 중 ${rightCount}개 정답)`;
      dom.feedbackDetail.textContent = `정답은 [${correctDisplayLabels}] 입니다. 아래 상세 해설을 확인하세요.`;
    } else {
      dom.feedbackIcon.textContent = '💡';
      dom.feedbackStatus.textContent = '오답입니다!';
      dom.feedbackDetail.textContent = `정답은 [${correctDisplayLabels || q.correct_answer}] 입니다. 아래 상세 해설을 확인하세요.`;
    }

    // Reveal theme title in Exam Intelligence Box
    updateCardThemeDisplay(q, true);

    // Clinical Explanation Box
    const exp = q.explanation || {};
    dom.expThemeTitle.textContent = exp.title || q.theme_title || '임상 검사 판독 및 의의';
    
    dom.expCorrectAnswer.textContent = correctDisplayLabels || q.correct_answer || '';

    dom.expFindings.innerHTML = renderRichText(exp.findings || '상기 검사의 기본 원리와 기준치 판독 지침을 참조하십시오.');
    dom.expTrap.innerHTML = renderRichText(exp.trap || '실전 빈출 함정 키워드와 검체 채취 전 처치 조건을 점검하십시오.');
    dom.expTrigger.textContent = exp.trigger || `${q.theme_title} 핵심 지표 기준 즉시 정답 도출`;
    dom.expKmleLink.textContent = `📚 KMLE 연계: ${exp.kmle_link || '진단검사의학과 총론 및 각론'}`;

    // Structured Option-by-Option Explanations
    renderDifferentialExplanation(q, exp, answerRecord);

    dom.cardExplanation.style.display = 'flex';

    if (animate) {
      setTimeout(() => {
        dom.feedbackBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }

  /**
   * Hide Answer and Explanation (Unanswered State)
   */
  function hideAnswerAndExplanation() {
    dom.feedbackBanner.style.display = 'none';
    dom.cardExplanation.style.display = 'none';
  }

  /**
   * Reset / Retry Current Question
   */
  function resetCurrentQuestion() {
    const q = getCurrentQuestion();
    if (!q) return;

    state.pendingSelections.clear();
    delete state.userAnswers[q.id];
    if (dom.cardThemeTitle) {
      delete dom.cardThemeTitle.dataset.peeked;
    }
    if (state.shuffleOptions) {
      getDisplayOrder(q, true);
    }
    saveStorage();
    updateStats();
    renderCurrentQuestion();
  }

  /**
   * Toggle Shuffle Options Mode
   */
  function toggleShuffleMode() {
    state.shuffleOptions = !state.shuffleOptions;
    try {
      localStorage.setItem(STORAGE_KEY_SHUFFLE, String(state.shuffleOptions));
    } catch (e) {}

    const q = getCurrentQuestion();
    if (state.shuffleOptions && q) {
      getDisplayOrder(q, true);
    }
    renderCurrentQuestion();
    showToast(state.shuffleOptions
      ? '🔀 선지 순서 섞기가 켜졌습니다! (단축키 S)'
      : '🔢 선지가 원래 기출 번호 순서로 표시됩니다.');
  }

  /**
   * Reshuffle Current Question Options Immediately
   */
  function reshuffleCurrentQuestionOptions() {
    const q = getCurrentQuestion();
    if (!q) return;
    if (!state.shuffleOptions) {
      state.shuffleOptions = true;
      try {
        localStorage.setItem(STORAGE_KEY_SHUFFLE, 'true');
      } catch (e) {}
    }
    getDisplayOrder(q, true);
    renderCurrentQuestion();
    showToast('🔄 현재 문제의 선지 순서를 다시 섞었습니다.');
  }

  /**
   * Update Global Stats Header (Scoped by Current Subject)
   */
  function updateStats() {
    const curSub = state.filters.subject;
    const subScope = (curSub === 'ALL')
      ? state.allQuestions
      : state.allQuestions.filter(q => q.subject === curSub);

    const total = subScope.length;
    let answeredCount = 0;
    let correctCount = 0;
    let partialCount = 0;
    let bookmarkCount = 0;

    subScope.forEach(q => {
      const rec = state.userAnswers[q.id];
      if (rec) {
        answeredCount++;
        if (rec.isCorrect) correctCount++;
        else if (rec.isPartial) partialCount++;
      }
      if (state.bookmarks.has(q.id)) {
        bookmarkCount++;
      }
    });

    const accuracyPct = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
    const progressPct = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

    dom.statProgress.textContent = `${answeredCount} / ${total}`;
    dom.statBarFill.style.width = `${progressPct}%`;
    dom.statAccuracy.textContent = `${accuracyPct}%`;
    dom.statBookmarks.textContent = `${bookmarkCount}`;
  }


  /**
   * ==========================================================================
   * Question Direct Edit Engine & Audit Logging
   * ==========================================================================
   */

  /**
   * Apply user custom edits onto allQuestions on initialization
   */
  function applyCustomEdits() {
    if (!state.customEdits || Object.keys(state.customEdits).length === 0) return;
    state.allQuestions.forEach(q => {
      const edit = state.customEdits[q.id];
      if (edit) {
        // Save original pristine copy if not saved
        if (!q._orig) {
          q._orig = {
            stem: q.stem,
            question: q.question,
            options: q.options ? [...q.options] : [],
            correct_option_index: q.correct_option_index,
            correct_answer: q.correct_answer
          };
        }
        if (edit.stem !== undefined) q.stem = edit.stem;
        if (edit.question !== undefined) q.question = edit.question;
        if (edit.options !== undefined) q.options = [...edit.options];
        if (edit.correct_option_index !== undefined) {
          q.correct_option_index = edit.correct_option_index;
          q.correct_answer = q.options[edit.correct_option_index] || '';
        }
      }
    });
  }

  function openEditQuestionModal() {
    const q = getCurrentQuestion();
    if (!q || !dom.editQuestionModal) return;

    if (dom.editTargetSubject) dom.editTargetSubject.textContent = q.subject || '임상의학';
    if (dom.editTargetYear) dom.editTargetYear.textContent = q.year || '기출';
    if (dom.editTargetQnum) {
      dom.editTargetQnum.textContent = (q.year === '22Y' && q.section && q.section_q_num)
        ? `${q.section} ${String(q.section_q_num).padStart(2, '0')}번`
        : `Q${String(q.q_num || '').padStart(2, '0')}`;
    }
    if (dom.editTargetQid) dom.editTargetQid.textContent = q.id;

    if (dom.editStemInput) {
      dom.editStemInput.value = q.stem || q.question || '';
    }

    if (dom.editOptionsContainer) {
      dom.editOptionsContainer.innerHTML = '';
      const opts = q.options || [];
      opts.forEach((optText, idx) => {
        const row = document.createElement('div');
        row.className = 'edit-option-row';

        const prefix = document.createElement('span');
        prefix.className = 'edit-opt-prefix';
        prefix.textContent = CIRCLE_NUMS[idx] || `${idx + 1}.`;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'edit-opt-input';
        input.value = optText;
        input.dataset.optIdx = String(idx);

        row.appendChild(prefix);
        row.appendChild(input);
        dom.editOptionsContainer.appendChild(row);
      });
    }

    if (dom.editAnswerSelect) {
      dom.editAnswerSelect.innerHTML = '';
      const opts = q.options || [];
      opts.forEach((_, idx) => {
        const optEl = document.createElement('option');
        optEl.value = String(idx);
        optEl.textContent = `${CIRCLE_NUMS[idx] || (idx + 1) + '번'} 정답`;
        if (idx === q.correct_option_index) {
          optEl.selected = true;
        }
        dom.editAnswerSelect.appendChild(optEl);
      });
    }

    if (dom.editReasonInput) dom.editReasonInput.value = '';

    // If already edited, show revert button
    if (dom.btnRevertQuestionEdit) {
      dom.btnRevertQuestionEdit.style.display = (state.customEdits && state.customEdits[q.id]) ? 'inline-block' : 'none';
    }

    dom.editQuestionModal.showModal();
  }

  function closeEditQuestionModal() {
    if (dom.editQuestionModal && dom.editQuestionModal.open) {
      dom.editQuestionModal.close();
    }
  }

  function saveQuestionEdit() {
    const q = getCurrentQuestion();
    if (!q) return;

    const newStem = dom.editStemInput ? dom.editStemInput.value.trim() : '';
    if (!newStem) {
      showToast('⚠️ 문제 발문은 비워둘 수 없습니다.');
      return;
    }

    const optInputs = dom.editOptionsContainer ? dom.editOptionsContainer.querySelectorAll('.edit-opt-input') : [];
    const newOptions = Array.from(optInputs).map(inp => inp.value.trim());

    const newAnsIdx = dom.editAnswerSelect ? parseInt(dom.editAnswerSelect.value, 10) : q.correct_option_index;
    const note = dom.editReasonInput ? dom.editReasonInput.value.trim() : '';

    // Preserve original pristine copy if not saved
    if (!q._orig) {
      q._orig = {
        stem: q.stem,
        question: q.question,
        options: q.options ? [...q.options] : [],
        correct_option_index: q.correct_option_index,
        correct_answer: q.correct_answer
      };
    }

    const oldStem = q.stem;
    const oldOptions = q.options ? [...q.options] : [];
    const oldAnsIdx = q.correct_option_index;

    // Update in memory
    q.stem = newStem;
    q.question = newStem;
    q.options = newOptions;
    q.correct_option_index = newAnsIdx;
    q.correct_answer = newOptions[newAnsIdx] || '';

    // Save to customEdits
    state.customEdits[q.id] = {
      stem: newStem,
      question: newStem,
      options: newOptions,
      correct_option_index: newAnsIdx,
      timestamp: Date.now(),
      note: note
    };
    localStorage.setItem(STORAGE_KEY_CUSTOM_EDITS, JSON.stringify(state.customEdits));

    // Append to audit log
    const logEntry = {
      id: 'edit_' + Date.now(),
      qId: q.id,
      subject: q.subject,
      year: q.year,
      qNum: q.q_num,
      timestamp: Date.now(),
      oldStem: oldStem,
      newStem: newStem,
      oldOptions: oldOptions,
      newOptions: newOptions,
      oldAnswer: oldAnsIdx,
      newAnswer: newAnsIdx,
      note: note
    };
    state.editLogs.unshift(logEntry);
    localStorage.setItem(STORAGE_KEY_EDIT_LOGS, JSON.stringify(state.editLogs));

    closeEditQuestionModal();
    renderCurrentQuestion();
    updateProfileCounters();
    showToast(`💾 [${q.id}] 문제 수정사항이 저장되었습니다.`);
  }

  function revertQuestionEdit() {
    const q = getCurrentQuestion();
    if (!q || !q._orig) return;

    if (!confirm('정말로 이 문제의 수정을 취소하고 원래 상태로 복원하시겠습니까?')) return;

    q.stem = q._orig.stem;
    q.question = q._orig.question;
    q.options = [...q._orig.options];
    q.correct_option_index = q._orig.correct_option_index;
    q.correct_answer = q._orig.correct_answer;

    delete state.customEdits[q.id];
    localStorage.setItem(STORAGE_KEY_CUSTOM_EDITS, JSON.stringify(state.customEdits));

    closeEditQuestionModal();
    renderCurrentQuestion();
    updateProfileCounters();
    showToast(`🔄 [${q.id}] 문제가 원래 상태로 복원되었습니다.`);
  }

  /**
   * ==========================================================================
   * Question Comments Engine (Nav Bar & Modal)
   * ==========================================================================
   */

  function updateNavCommentBadge(q) {
    if (!dom.btnQuestionComments || !dom.navCommentCount) return;
    if (!q) {
      dom.navCommentCount.textContent = '0';
      dom.btnQuestionComments.className = 'btn-nav-comments has-no-comments';
      return;
    }

    const qComments = (state.comments && state.comments[q.id]) || [];
    const count = qComments.length;
    dom.navCommentCount.textContent = String(count);

    if (count > 0) {
      dom.btnQuestionComments.className = 'btn-nav-comments has-comments';
      dom.btnQuestionComments.title = `이 문제에 작성된 댓글 ${count}개 보기 / 남기기 (단축키 C)`;
    } else {
      dom.btnQuestionComments.className = 'btn-nav-comments has-no-comments';
      dom.btnQuestionComments.title = `이 문제 댓글 & 암기 팁 남기기 (단축키 C)`;
    }
  }

  function openCommentModal() {
    const q = getCurrentQuestion();
    if (!q || !dom.commentModal) return;

    if (dom.commentTargetSubject) dom.commentTargetSubject.textContent = q.subject || '임상의학';
    if (dom.commentTargetYear) dom.commentTargetYear.textContent = q.year || '기출';
    if (dom.commentTargetQnum) {
      dom.commentTargetQnum.textContent = (q.year === '22Y' && q.section && q.section_q_num)
        ? `${q.section} ${String(q.section_q_num).padStart(2, '0')}번`
        : `Q${String(q.q_num || '').padStart(2, '0')}`;
    }
    if (dom.commentTargetTheme) {
      dom.commentTargetTheme.textContent = q.theme_title || '핵심 출제 테마';
    }

    const activeProfile = state.profiles.find(p => p.id === state.activeProfileId) || state.profiles[0] || { name: '기본 프로필', avatar: '🩺' };
    if (dom.commentAuthorAvatar) dom.commentAuthorAvatar.textContent = activeProfile.avatar || '🩺';
    if (dom.commentAuthorName) dom.commentAuthorName.textContent = activeProfile.name || '내 프로필';

    if (dom.commentInput) dom.commentInput.value = '';

    renderCommentList(q);
    dom.commentModal.showModal();
    setTimeout(() => {
      if (dom.commentInput) dom.commentInput.focus();
    }, 100);
  }

  function closeCommentModal() {
    if (dom.commentModal && dom.commentModal.open) {
      dom.commentModal.close();
    }
  }

  function renderCommentList(q) {
    if (!dom.commentList) return;
    dom.commentList.innerHTML = '';
    const qComments = (state.comments && state.comments[q.id]) || [];

    if (dom.commentListCount) dom.commentListCount.textContent = String(qComments.length);

    if (qComments.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'comment-empty-state';
      empty.textContent = '💡 아직 작성된 댓글이 없습니다. 첫 번째 풀이 팁이나 의견을 남겨보세요!';
      dom.commentList.appendChild(empty);
      return;
    }

    qComments.forEach(comm => {
      const item = document.createElement('div');
      item.className = 'comment-item';

      const avatar = document.createElement('div');
      avatar.className = 'comment-avatar';
      avatar.textContent = comm.authorAvatar || '🩺';

      const wrap = document.createElement('div');
      wrap.className = 'comment-content-wrap';

      const meta = document.createElement('div');
      meta.className = 'comment-meta-row';

      const name = document.createElement('span');
      name.className = 'comment-author-name';
      name.textContent = comm.authorName || '학습자';

      const time = document.createElement('span');
      time.className = 'comment-time';
      time.textContent = formatProfileTime(comm.timestamp);

      meta.appendChild(name);
      meta.appendChild(time);

      const text = document.createElement('div');
      text.className = 'comment-text';
      text.textContent = comm.text;

      wrap.appendChild(meta);
      wrap.appendChild(text);

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-comment-delete';
      delBtn.title = '이 댓글 삭제';
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', () => {
        deleteComment(q.id, comm.id);
      });

      item.appendChild(avatar);
      item.appendChild(wrap);
      item.appendChild(delBtn);

      dom.commentList.appendChild(item);
    });
  }

  function submitComment() {
    const q = getCurrentQuestion();
    if (!q) return;

    const raw = dom.commentInput ? dom.commentInput.value.trim() : '';
    if (!raw) {
      showToast('⚠️ 댓글 내용을 입력해 주세요.');
      return;
    }

    const activeProfile = state.profiles.find(p => p.id === state.activeProfileId) || state.profiles[0] || { id: 'p_default', name: '기본 프로필', avatar: '🩺' };

    if (!state.comments[q.id]) {
      state.comments[q.id] = [];
    }

    const newComment = {
      id: 'comm_' + Date.now(),
      authorId: activeProfile.id,
      authorName: activeProfile.name,
      authorAvatar: activeProfile.avatar,
      text: raw,
      timestamp: Date.now()
    };

    state.comments[q.id].push(newComment);
    localStorage.setItem(STORAGE_KEY_COMMENTS, JSON.stringify(state.comments));

    if (dom.commentInput) dom.commentInput.value = '';
    renderCommentList(q);
    updateNavCommentBadge(q);

    // Update Question PDF Tooltip
    if (dom.btnQuestionPdf) {
      dom.btnQuestionPdf.title = `현재 문제(${q.subject} ${q.year})의 원본 시험지 PDF 열기`;
    }
    showToast('💬 댓글이 등록되었습니다.');
  }

  function deleteComment(qId, commId) {
    if (!state.comments[qId]) return;
    state.comments[qId] = state.comments[qId].filter(c => c.id !== commId);
    if (state.comments[qId].length === 0) {
      delete state.comments[qId];
    }
    localStorage.setItem(STORAGE_KEY_COMMENTS, JSON.stringify(state.comments));

    const q = getCurrentQuestion();
    if (q && q.id === qId) {
      renderCommentList(q);
      updateNavCommentBadge(q);

    // Update Question PDF Tooltip
    if (dom.btnQuestionPdf) {
      dom.btnQuestionPdf.title = `현재 문제(${q.subject} ${q.year})의 원본 시험지 PDF 열기`;
    }
    }
    showToast('🗑️ 댓글이 삭제되었습니다.');
  }

  /**
   * ==========================================================================
   * Edit History in Profile Modal
   * ==========================================================================
   */
  function renderEditHistory() {
    if (!dom.editHistoryList) return;
    dom.editHistoryList.innerHTML = '';
    const logs = state.editLogs || [];

    if (dom.editSectionCount) dom.editSectionCount.textContent = String(logs.length);
    if (dom.profileEditCount) dom.profileEditCount.textContent = String(logs.length);

    if (logs.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'report-empty-state';
      empty.textContent = '✏️ 아직 직접 수정한 문제 내역이 없습니다.';
      dom.editHistoryList.appendChild(empty);
      return;
    }

    logs.forEach(log => {
      const item = document.createElement('div');
      item.className = 'edit-history-item';

      const header = document.createElement('div');
      header.className = 'edit-history-header';

      const badge = document.createElement('span');
      badge.className = 'edit-history-badge';
      badge.textContent = '수정 완료';

      const time = document.createElement('span');
      time.className = 'report-history-time';
      time.textContent = formatProfileTime(log.timestamp);

      header.appendChild(badge);
      header.appendChild(time);

      const qLink = document.createElement('div');
      qLink.className = 'edit-history-qlink';
      qLink.textContent = `📌 [${log.subject} ${log.year}] ${log.qId} 문제로 바로가기`;
      qLink.addEventListener('click', () => {
        closeProfileModal();
        const target = state.allQuestions.find(cand => cand.id === log.qId);
        if (target) jumpToQuestionObject(target);
      });

      const note = document.createElement('div');
      note.className = 'edit-history-note';
      note.textContent = log.note ? `사유: ${log.note}` : '사유: 내용 수정';

      item.appendChild(header);
      item.appendChild(qLink);
      item.appendChild(note);

      dom.editHistoryList.appendChild(item);
    });
  }


  /**
   * ==========================================================================
   * Original Exam PDF Viewer Engine
   * ==========================================================================
   */
  const DEFAULT_PDF_MANIFEST = {
    "내과": {
      "19Y": "original_pdf/내과_19Y.pdf",
      "20Y": "original_pdf/내과_20Y.pdf",
      "21Y": "original_pdf/내과_21Y.pdf",
      "22Y": "original_pdf/내과_22Y.pdf",
      "23Y": "original_pdf/내과_23Y.pdf",
      "26Y": "original_pdf/내과_26Y.pdf"
    },
    "산부인과": {
      "19Y": "original_pdf/산부인과_19Y.pdf",
      "20Y": "original_pdf/산부인과_20Y.pdf",
      "21Y": "original_pdf/산부인과_21Y.pdf",
      "22Y": "original_pdf/산부인과_22Y.pdf",
      "23Y": "original_pdf/산부인과_23Y.pdf",
      "26Y": "original_pdf/산부인과_26Y.pdf"
    },
    "소아청소년과": {
      "19Y": "original_pdf/소아청소년과_19Y.pdf",
      "20Y": "original_pdf/소아청소년과_20Y.pdf",
      "21Y": "original_pdf/소아청소년과_21Y.pdf",
      "22Y": "original_pdf/소아청소년과_22Y.pdf",
      "23Y": "original_pdf/소아청소년과_23Y.pdf",
      "26Y": "original_pdf/소아청소년과_26Y.pdf"
    },
    "신경과": {
      "19Y": "original_pdf/신경과_19Y.pdf",
      "20Y": "original_pdf/신경과_20Y.pdf",
      "21Y": "original_pdf/신경과_21Y.pdf",
      "22Y": "original_pdf/신경과_22Y.pdf",
      "23Y": "original_pdf/신경과_23Y.pdf",
      "26Y": "original_pdf/신경과_26Y.pdf"
    },
    "영상의학과": {
      "20Y": "original_pdf/영상의학과_20Y.pdf",
      "21Y": "original_pdf/영상의학과_21Y.pdf",
      "22Y": "original_pdf/영상의학과_22Y.pdf",
      "23Y": "original_pdf/영상의학과_23Y.pdf",
      "26Y": "original_pdf/영상의학과_26Y.pdf"
    },
    "외과": {
      "19Y": "original_pdf/외과_19Y.pdf",
      "20Y": "original_pdf/외과_20Y.pdf",
      "21Y": "original_pdf/외과_21Y.pdf",
      "22Y": "original_pdf/외과_22Y.pdf",
      "23Y": "original_pdf/외과_23Y.pdf",
      "26Y": "original_pdf/외과_26Y.pdf"
    },
    "정신건강의학과": {
      "19Y": "original_pdf/정신건강의학과_19Y.pdf",
      "20Y": "original_pdf/정신건강의학과_20Y.pdf",
      "21Y": "original_pdf/정신건강의학과_21Y.pdf",
      "22Y": "original_pdf/정신건강의학과_22Y.pdf",
      "23Y": "original_pdf/정신건강의학과_23Y.pdf",
      "26Y": "original_pdf/정신건강의학과_26Y.pdf"
    },
    "정형외과": {
      "19Y": "original_pdf/정형외과_19Y.pdf",
      "20Y": "original_pdf/정형외과_20Y.pdf",
      "21Y": "original_pdf/정형외과_21Y.pdf",
      "22Y": "original_pdf/정형외과_22Y.pdf",
      "23Y": "original_pdf/정형외과_23Y.pdf",
      "26Y": "original_pdf/정형외과_26Y.pdf"
    },
    "진단검사의학과": {
      "20Y": "original_pdf/진단검사의학과_20Y.pdf",
      "21Y": "original_pdf/진단검사의학과_21Y.pdf",
      "22Y": "original_pdf/진단검사의학과_22Y.pdf",
      "23Y": "original_pdf/진단검사의학과_23Y.pdf",
      "26Y": "original_pdf/진단검사의학과_26Y.pdf"
    }
  };

  let currentPdfState = {
    subject: '내과',
    year: '26Y',
    url: ''
  };

  function getPdfManifest() {
    return window.PDF_MANIFEST || DEFAULT_PDF_MANIFEST;
  }

  function populatePdfYearOptions(subject, preferredYear = null) {
    if (!dom.pdfSelectYear) return;
    const manifest = getPdfManifest();
    const yearsMap = manifest[subject] || {};
    const years = Object.keys(yearsMap).sort((a, b) => {
      const na = parseInt(a, 10) || 0;
      const nb = parseInt(b, 10) || 0;
      return nb - na;
    });

    dom.pdfSelectYear.innerHTML = '';
    if (years.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '제공 연도 없음';
      dom.pdfSelectYear.appendChild(opt);
      return;
    }

    years.forEach(y => {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = `${y} (${y.replace('Y', '년도')})`;
      dom.pdfSelectYear.appendChild(opt);
    });

    if (preferredYear && years.includes(preferredYear)) {
      dom.pdfSelectYear.value = preferredYear;
    } else {
      dom.pdfSelectYear.value = years[0];
    }
  }

  function loadPdfInViewer(subject, year, qNumHint = null) {
    const manifest = getPdfManifest();
    const subjectFiles = manifest[subject];
    const fileUrl = subjectFiles ? subjectFiles[year] : null;

    currentPdfState.subject = subject;
    currentPdfState.year = year;
    currentPdfState.url = fileUrl || '';

    if (dom.pdfActiveDocBadge) {
      dom.pdfActiveDocBadge.textContent = `${subject} · ${year}`;
    }

    if (fileUrl) {
      if (dom.pdfFrame) {
        dom.pdfFrame.style.display = 'block';
        if (!dom.pdfFrame.src.endsWith(fileUrl)) {
          dom.pdfFrame.src = fileUrl;
        }
      }
      if (dom.pdfEmptyState) {
        dom.pdfEmptyState.style.display = 'none';
      }
      if (dom.btnPdfExternal) {
        dom.btnPdfExternal.disabled = false;
        dom.btnPdfExternal.title = `${subject} ${year} 원본 시험지를 새 창/새 탭에서 열기`;
      }
      if (dom.btnPdfDownload) {
        dom.btnPdfDownload.href = fileUrl;
        dom.btnPdfDownload.setAttribute('download', `${subject}_${year}_기말고사_원본.pdf`);
        dom.btnPdfDownload.style.display = 'inline-flex';
      }
      if (dom.pdfStatusDesc) {
        if (qNumHint) {
          dom.pdfStatusDesc.innerHTML = `<strong>${subject} ${year} (현재 문항: ${qNumHint})</strong> 시험지입니다. 브라우저 PDF 검색(<strong>Ctrl + F</strong>)으로 문항 번호나 키워드를 바로 찾을 수 있습니다.`;
        } else {
          dom.pdfStatusDesc.innerHTML = `<strong>${subject} ${year}</strong> 학년말고사 원본 시험지입니다. <strong>Ctrl + F</strong>로 문제 번호나 키워드를 검색하세요.`;
        }
      }
    } else {
      if (dom.pdfFrame) {
        dom.pdfFrame.style.display = 'none';
        dom.pdfFrame.src = 'about:blank';
      }
      if (dom.pdfEmptyState) {
        dom.pdfEmptyState.style.display = 'flex';
      }
      if (dom.btnPdfExternal) {
        dom.btnPdfExternal.disabled = true;
      }
      if (dom.btnPdfDownload) {
        dom.btnPdfDownload.style.display = 'none';
      }
      if (dom.pdfStatusDesc) {
        dom.pdfStatusDesc.textContent = `${subject} ${year} 시험지는 아직 준비되지 않았습니다. 다른 과목이나 연도를 선택해주세요.`;
      }
    }
  }

  function openPdfViewerModal(targetSubject = null, targetYear = null, qNumHint = null) {
    let sub = targetSubject;
    if (!sub) {
      const q = getCurrentQuestion();
      if (q && q.subject) {
        sub = q.subject;
      } else if (state.filters.subject && state.filters.subject !== 'all') {
        sub = state.filters.subject;
      } else {
        sub = '내과';
      }
    }

    let yr = targetYear;
    if (!yr) {
      const q = getCurrentQuestion();
      if (q && q.year) {
        yr = q.year;
      } else if (state.filters.year && state.filters.year !== 'all') {
        yr = state.filters.year;
      } else {
        yr = '26Y';
      }
    }

    if (!qNumHint) {
      const q = getCurrentQuestion();
      if (q && q.subject === sub && q.year === yr) {
        qNumHint = (q.year === '22Y' && q.section && q.section_q_num)
          ? `${q.section} ${String(q.section_q_num).padStart(2, '0')}번`
          : (q.qnum || `Q${String(q.q_num || '').padStart(2, '0')}`);
      }
    }

    if (dom.pdfSelectSubject) {
      dom.pdfSelectSubject.value = sub;
    }
    populatePdfYearOptions(sub, yr);
    const selectedYear = dom.pdfSelectYear ? dom.pdfSelectYear.value : yr;

    loadPdfInViewer(sub, selectedYear, qNumHint);

    if (dom.pdfModal) {
      if (typeof dom.pdfModal.showModal === 'function') {
        dom.pdfModal.showModal();
      } else {
        dom.pdfModal.setAttribute('open', 'true');
      }
    }
  }

  function closePdfViewerModal() {
    if (dom.pdfModal && dom.pdfModal.open) {
      dom.pdfModal.close();
    }
  }

  /**
   * Setup Event Listeners
   */
  function setupEventListeners() {
    // Theme Spoiler Mask Toggle Click
    if (dom.cardThemeTitle) {
      dom.cardThemeTitle.addEventListener('click', () => {
        const q = getCurrentQuestion();
        if (!q) return;
        const isAnswered = !!state.userAnswers[q.id];
        if (isAnswered) return; // already revealed

        if (dom.cardThemeTitle.dataset.peeked === q.id) {
          delete dom.cardThemeTitle.dataset.peeked;
        } else {
          dom.cardThemeTitle.dataset.peeked = q.id;
        }
        updateCardThemeDisplay(q, false);
      });
    }

    // Navigation
    dom.btnPrev.addEventListener('click', () => navigate(-1));
    dom.btnNext.addEventListener('click', () => navigate(1));
    dom.btnRandom.addEventListener('click', navigateRandom);

    // Direct Question Number Jump Input
    if (dom.navJumpForm && dom.navJumpInput) {
      const commitJumpInput = (fromSubmit = false) => {
        const total = state.filteredQuestions.length;
        if (total === 0) {
          dom.navJumpInput.value = '0';
          return;
        }
        const raw = dom.navJumpInput.value.trim();
        if (!raw) {
          dom.navJumpInput.value = String(state.currentIndex + 1);
          return;
        }
        const targetNum = parseInt(raw, 10);
        if (isNaN(targetNum) || targetNum < 1 || targetNum > total) {
          showToast(`⚠️ 1 ~ ${total}번 사이의 문제 번호를 입력해 주세요.`);
          dom.navJumpInput.value = String(state.currentIndex + 1);
          if (fromSubmit) dom.navJumpInput.select();
          return;
        }
        const targetIndex = targetNum - 1;
        if (targetIndex !== state.currentIndex) {
          state.currentIndex = targetIndex;
          renderCurrentQuestion();
          scrollToQuestionIntel();
        } else {
          dom.navJumpInput.value = String(state.currentIndex + 1);
        }
        if (fromSubmit) {
          dom.navJumpInput.blur();
        }
      };

      dom.navJumpForm.addEventListener('submit', e => {
        e.preventDefault();
        commitJumpInput(true);
      });

      dom.navJumpInput.addEventListener('focus', () => {
        dom.navJumpInput.select();
      });

      dom.navJumpInput.addEventListener('click', () => {
        dom.navJumpInput.select();
      });

      dom.navJumpInput.addEventListener('input', () => {
        const digitsOnly = dom.navJumpInput.value.replace(/[^0-9]/g, '');
        if (dom.navJumpInput.value !== digitsOnly) {
          dom.navJumpInput.value = digitsOnly;
        }
      });

      dom.navJumpInput.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
          e.preventDefault();
          dom.navJumpInput.value = String(state.filteredQuestions.length > 0 ? state.currentIndex + 1 : 0);
          dom.navJumpInput.blur();
        }
      });

      dom.navJumpInput.addEventListener('blur', () => {
        commitJumpInput(false);
      });
    }

    // Card Year Badge Click (연도 필터 전환)
    if (dom.cardYear) {
      dom.cardYear.addEventListener('click', () => {
        const q = getCurrentQuestion();
        if (!q || !q.year) return;
        const newYear = (state.filters.year === q.year) ? 'ALL' : q.year;
        state.filters.year = newYear;

        const subQuestions = (state.filters.subject === 'ALL')
          ? state.allQuestions
          : state.allQuestions.filter(item => item.subject === state.filters.subject);
        renderYearTabs(subQuestions);
        renderCategoryTabs(subQuestions);
        applyFilters();

        const newIdx = state.filteredQuestions.findIndex(item => item.id === q.id);
        state.currentIndex = (newIdx !== -1) ? newIdx : 0;
        renderCurrentQuestion();
        renderGrid();
        updateStats();

        showToast(`📅 ${newYear === 'ALL' ? '전체 연도' : newYear + ' 기출'} 필터로 전환되었습니다.`);
      });
    }

    // Subject Selection Tabs (과목 전환 + 해당 과목의 마지막 풀이 위치로 자동 이어하기)
    if (dom.subjectTabs) {
      dom.subjectTabs.addEventListener('click', e => {
        const btn = e.target.closest('.subject-pill');
        if (!btn) return;
        const newSub = btn.dataset.subject;
        state.filters.subject = newSub;
        localStorage.setItem(STORAGE_KEY_SUBJECT, newSub);
        state.filters.year = 'ALL';
        state.filters.type = 'ALL';
        state.filters.onlyFrequent = false;
        state.filters.onlyImages = false;
        if (dom.filterFrequent) dom.filterFrequent.classList.remove('active');
        if (dom.filterImages) dom.filterImages.classList.remove('active');
        state.currentIndex = 0;
        updateSubjectUI();

        // Restore last saved question in this subject for the active profile
        const savedSubQId = state.lastSubjectMap && state.lastSubjectMap[newSub];
        if (savedSubQId) {
          const savedIdx = state.filteredQuestions.findIndex(q => q.id === savedSubQId);
          if (savedIdx !== -1 && savedIdx !== state.currentIndex) {
            state.currentIndex = savedIdx;
            renderCurrentQuestion();
            renderGrid();
          }
        }
        scrollToQuestionIntel();
      });
    }

    // Multi-Answer Action Bar
    if (dom.btnMultiReset) {
      dom.btnMultiReset.addEventListener('click', () => {
        const q = getCurrentQuestion();
        if (q && !state.userAnswers[q.id]) {
          state.pendingSelections.clear();
          renderOptions(q);
        }
      });
    }

    if (dom.btnMultiSubmit) {
      dom.btnMultiSubmit.addEventListener('click', () => {
        const q = getCurrentQuestion();
        if (q && !state.userAnswers[q.id]) {
          const config = getQuestionAnswerConfig(q);
          submitMultiSelection(q, config);
        }
      });
    }

    // Question Retry
    dom.btnRetry.addEventListener('click', resetCurrentQuestion);

    // Bookmark Toggle
    dom.btnBookmark.addEventListener('click', toggleBookmark);

    // Year Filter Tabs Delegation (Fallback)
    if (dom.yearTabs) {
      dom.yearTabs.addEventListener('click', e => {
        const btn = e.target.closest('.pill-tab');
        if (!btn) return;
        dom.yearTabs.querySelectorAll('.pill-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.filters.year = btn.dataset.year;
        state.currentIndex = 0;
        applyFilters();
        renderCurrentQuestion();
      });
    }

    // Type Filter Tabs Delegation (Fallback)
    if (dom.typeTabs) {
      dom.typeTabs.addEventListener('click', e => {
        const btn = e.target.closest('.pill-tab');
        if (!btn) return;
        dom.typeTabs.querySelectorAll('.pill-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.filters.type = btn.dataset.type;
        state.currentIndex = 0;
        applyFilters();
        renderCurrentQuestion();
      });
    }

    // Special Filter: Frequent Only (2회+ 빈출 야마)
    if (dom.filterFrequent) {
      dom.filterFrequent.addEventListener('click', () => {
        state.filters.onlyFrequent = !state.filters.onlyFrequent;
        dom.filterFrequent.classList.toggle('active', state.filters.onlyFrequent);
        state.currentIndex = 0;
        applyFilters();
        renderCurrentQuestion();
      });
    }

    // Special Filter: Images Only (사진/그림 문제만)
    if (dom.filterImages) {
      dom.filterImages.addEventListener('click', () => {
        state.filters.onlyImages = !state.filters.onlyImages;
        dom.filterImages.classList.toggle('active', state.filters.onlyImages);
        state.currentIndex = 0;
        applyFilters();
        renderCurrentQuestion();
      });
    }

    // Special Filter: Incorrect Only
    dom.filterIncorrect.addEventListener('click', () => {
      state.filters.onlyIncorrect = !state.filters.onlyIncorrect;
      dom.filterIncorrect.classList.toggle('active', state.filters.onlyIncorrect);
      state.currentIndex = 0;
      applyFilters();
      renderCurrentQuestion();
    });

    // Special Filter: Bookmarked Only
    dom.filterBookmarked.addEventListener('click', () => {
      state.filters.onlyBookmarked = !state.filters.onlyBookmarked;
      dom.filterBookmarked.classList.toggle('active', state.filters.onlyBookmarked);
      state.currentIndex = 0;
      applyFilters();
      renderCurrentQuestion();
    });

    // Shuffle Options Mode Toggle & Reshuffle
    if (dom.btnToggleShuffle) {
      dom.btnToggleShuffle.addEventListener('click', toggleShuffleMode);
    }
    if (dom.btnReshuffleNow) {
      dom.btnReshuffleNow.addEventListener('click', reshuffleCurrentQuestionOptions);
    }

    // Keyword Search
    let searchDebounce = null;
    dom.searchInput.addEventListener('input', e => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        state.filters.searchQuery = e.target.value;
        state.currentIndex = 0;
        applyFilters();
        renderCurrentQuestion();
      }, 250);
    });

    // Grid Modal
    dom.btnOpenGrid.addEventListener('click', openGridModal);
    dom.btnCloseGrid.addEventListener('click', closeGridModal);
    dom.btnCloseGridBottom.addEventListener('click', closeGridModal);
    dom.gridModal.addEventListener('click', e => {
      if (e.target === dom.gridModal) closeGridModal();
    });

    // Reset History
    dom.btnResetHistory.addEventListener('click', () => {
      const active = getActiveProfile();
      const pName = active ? active.name : '현재 프로필';
      if (confirm(`'${pName}' 프로필의 모든 문제 풀이 기록과 정답 통계를 초기화하시겠습니까?`)) {
        state.userAnswers = {};
        saveStorage();
        updateStats();
        renderGrid();
        renderCurrentQuestion();
        showToast(`🔄 '${pName}' 프로필의 풀이 기록이 초기화되었습니다.`);
      }
    });


    // Direct Question Edit Events
    if (dom.btnEditQuestion) {
      dom.btnEditQuestion.addEventListener('click', openEditQuestionModal);
    }
    if (dom.btnCloseEditModal) {
      dom.btnCloseEditModal.addEventListener('click', closeEditQuestionModal);
    }
    if (dom.btnCancelEditModal) {
      dom.btnCancelEditModal.addEventListener('click', closeEditQuestionModal);
    }
    if (dom.btnSaveQuestionEdit) {
      dom.btnSaveQuestionEdit.addEventListener('click', saveQuestionEdit);
    }
    if (dom.btnRevertQuestionEdit) {
      dom.btnRevertQuestionEdit.addEventListener('click', revertQuestionEdit);
    }

    // Question Comments Events
    if (dom.btnQuestionComments) {
      dom.btnQuestionComments.addEventListener('click', openCommentModal);
    }
    if (dom.btnCloseCommentModal) {
      dom.btnCloseCommentModal.addEventListener('click', closeCommentModal);
    }
    if (dom.btnSubmitComment) {
      dom.btnSubmitComment.addEventListener('click', submitComment);
    }
    if (dom.commentInput) {
      dom.commentInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          submitComment();
        }
      });
    }

    // Edit History View in Profile Modal
    if (dom.btnViewEdits) {
      dom.btnViewEdits.addEventListener('click', () => {
        if (!dom.editHistorySection) return;
        const isHidden = dom.editHistorySection.style.display === 'none';
        dom.editHistorySection.style.display = isHidden ? 'block' : 'none';
        if (isHidden) {
          renderEditHistory();
          dom.editHistorySection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    }

    if (dom.btnExportEdits) {
      dom.btnExportEdits.addEventListener('click', () => {
        const textToCopy = JSON.stringify(state.editLogs, null, 2);
        navigator.clipboard.writeText(textToCopy).then(() => {
          showToast('📋 수정 내역 로그 JSON이 클립보드에 복사되었습니다.');
        }).catch(() => {
          prompt('아래 수정 로그를 복사하세요:', textToCopy);
        });
      });
    }

    if (dom.btnClearEdits) {
      dom.btnClearEdits.addEventListener('click', () => {
        if (confirm('수정 내역 로그를 모두 비우시겠습니까? (이미 문제에 적용된 수정사항은 유지됩니다)')) {
          state.editLogs = [];
          localStorage.setItem(STORAGE_KEY_EDIT_LOGS, '[]');
          renderEditHistory();
          showToast('🗑️ 수정 내역 로그가 비워졌습니다.');
        }
      });
    }

    // PDF Viewer Modal Events
    if (dom.btnOpenPdfViewer) {
      dom.btnOpenPdfViewer.addEventListener('click', () => {
        openPdfViewerModal();
      });
    }

    if (dom.btnQuestionPdf) {
      dom.btnQuestionPdf.addEventListener('click', () => {
        const q = getCurrentQuestion();
        if (q) {
          openPdfViewerModal(q.subject, q.year, q.qnum || `Q${q.number}`);
        } else {
          openPdfViewerModal();
        }
      });
    }

    if (dom.btnClosePdfModal) {
      dom.btnClosePdfModal.addEventListener('click', closePdfViewerModal);
    }

    if (dom.btnClosePdfBottom) {
      dom.btnClosePdfBottom.addEventListener('click', closePdfViewerModal);
    }

    if (dom.pdfSelectSubject) {
      dom.pdfSelectSubject.addEventListener('change', () => {
        const newSub = dom.pdfSelectSubject.value;
        populatePdfYearOptions(newSub);
        const newYr = dom.pdfSelectYear ? dom.pdfSelectYear.value : '';
        loadPdfInViewer(newSub, newYr);
      });
    }

    if (dom.pdfSelectYear) {
      dom.pdfSelectYear.addEventListener('change', () => {
        const sub = dom.pdfSelectSubject ? dom.pdfSelectSubject.value : '내과';
        const newYr = dom.pdfSelectYear.value;
        loadPdfInViewer(sub, newYr);
      });
    }

    if (dom.btnPdfExternal) {
      dom.btnPdfExternal.addEventListener('click', () => {
        if (currentPdfState.url) {
          window.open(currentPdfState.url, '_blank');
        }
      });
    }

    if (dom.pdfModal) {
      dom.pdfModal.addEventListener('click', (e) => {
        const rect = dom.pdfModal.getBoundingClientRect();
        const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height
          && rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
        if (!isInDialog) {
          closePdfViewerModal();
        }
      });
    }

    // Profile & Continue Modal Events
    setupProfileModalEvents();

    // Lightbox Events (Zoom, Pan, Drag, Close)
    setupLightboxEvents();

    // Question Issue Reporting Events
    setupReportModalEvents();

    // Keyboard Shortcuts
    window.addEventListener('keydown', handleKeydown);
  }

  /**
   * Keyboard Shortcuts Handler
   */
  function handleKeydown(e) {
    // If typing in input or when modal dialogs are open, ignore global quiz shortcuts
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }
    if (dom.profileModal && dom.profileModal.open) {
      return;
    }
    if (dom.reportModal && dom.reportModal.open) {
      if (e.key === 'Escape') {
        closeReportModal();
      }
      return;
    }

    const q = getCurrentQuestion();

    // Option selection keys 1 ~ 5 and Enter for submit
    if (q && !state.userAnswers[q.id]) {
      const config = getQuestionAnswerConfig(q);
      const keyNum = parseInt(e.key, 10);
      if (keyNum >= 1 && keyNum <= q.options.length) {
        e.preventDefault();
        const order = getDisplayOrder(q);
        const origIdx = order[keyNum - 1] !== undefined ? order[keyNum - 1] : (keyNum - 1);
        if (config.isMulti) {
          togglePendingSelection(q, origIdx, config);
        } else {
          handleSelectSingleOption(q, origIdx, config);
        }
        return;
      }
      if (e.key === 'Enter') {
        if (!q.options || q.options.length === 0) {
          e.preventDefault();
          const revBtn = document.getElementById('btn-subjective-reveal');
          if (revBtn) revBtn.click();
          return;
        }
        if (config.isMulti && state.pendingSelections.size === config.requiredCount) {
          e.preventDefault();
          submitMultiSelection(q, config);
          return;
        }
      }
    }

    // Navigation keys
    if (e.key === 'ArrowLeft' || e.key === 'j' || e.key === 'J') {
      e.preventDefault();
      navigate(-1);
    } else if (e.key === 'ArrowRight' || e.key === 'k' || e.key === 'K' || e.key === ' ') {
      e.preventDefault();
      navigate(1);
    } else if (e.key === 'b' || e.key === 'B') {
      e.preventDefault();
      toggleBookmark();
    } else if (e.key === 'r' || e.key === 'R' || e.key === 'Backspace') {
      e.preventDefault();
      resetCurrentQuestion();
    } else if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      toggleShuffleMode();
    } else if (e.key === 'c' || e.key === 'C') {
      e.preventDefault();
      openCommentModal();
    } else if (e.key === 'e' || e.key === 'E') {
      e.preventDefault();
      openEditQuestionModal();
    } else if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      openProfileModal();
    } else if (e.key === 'Escape') {
      closeGridModal();
      closeLightbox();
      closeReportModal();
    }
  }

  /**
   * ==========================================================================
   * Profile Select / Create & Continue Engine
   * ==========================================================================
   */
  function setupProfileModalEvents() {
    if (dom.btnOpenProfile) {
      dom.btnOpenProfile.addEventListener('click', openProfileModal);
    }
    if (dom.btnCloseProfile) {
      dom.btnCloseProfile.addEventListener('click', closeProfileModal);
    }
    if (dom.btnCloseProfileBottom) {
      dom.btnCloseProfileBottom.addEventListener('click', closeProfileModal);
    }

    // Modern Web Guidance fallback for browsers without native <dialog closedby="any">
    if (dom.profileModal && !('closedBy' in HTMLDialogElement.prototype)) {
      const outside = (e, dialog) => {
        const r = dialog.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      let pressedOutside = false;
      dom.profileModal.addEventListener('pointerdown', e => {
        pressedOutside = outside(e, dom.profileModal);
      });
      dom.profileModal.addEventListener('pointerup', e => {
        if (pressedOutside && outside(e, dom.profileModal)) {
          dom.profileModal.close();
        }
      });
    }

    if (dom.btnResumeLast) {
      dom.btnResumeLast.addEventListener('click', () => {
        const active = getActiveProfile();
        if (active) {
          switchAndResumeProfile(active.id);
        } else {
          closeProfileModal();
        }
      });
    }

    if (dom.profileAvatarPicker) {
      dom.profileAvatarPicker.addEventListener('click', e => {
        const btn = e.target.closest('.avatar-option');
        if (!btn) return;
        state.selectedNewAvatar = btn.dataset.avatar || '🩺';
        dom.profileAvatarPicker.querySelectorAll('.avatar-option').forEach(b => {
          const isSelected = b === btn;
          b.classList.toggle('active', isSelected);
          b.setAttribute('aria-pressed', String(isSelected));
        });
      });
    }

    if (dom.formCreateProfile) {
      dom.formCreateProfile.addEventListener('submit', e => {
        e.preventDefault();
        createNewProfile();
      });
    }

    if (dom.chkAutoOpenProfile) {
      dom.chkAutoOpenProfile.addEventListener('change', () => {
        state.autoOpenProfileModal = !!dom.chkAutoOpenProfile.checked;
        try {
          localStorage.setItem(STORAGE_KEY_AUTO_OPEN_PROFILE, String(state.autoOpenProfileModal));
        } catch (err) {}
      });
    }

    if (dom.btnExportProfiles) {
      dom.btnExportProfiles.addEventListener('click', exportProfilesToFile);
    }
    if (dom.btnImportProfiles && dom.inputImportProfiles) {
      dom.btnImportProfiles.addEventListener('click', () => dom.inputImportProfiles.click());
      dom.inputImportProfiles.addEventListener('change', importProfilesFromFile);
    }
  }

  function openProfileModal() {
    if (!dom.profileModal) return;
    saveStorage();
    renderProfileModal();
    if (!dom.profileModal.open) {
      dom.profileModal.showModal();
    }
  }

  function closeProfileModal() {
    if (dom.profileModal && dom.profileModal.open) {
      dom.profileModal.close();
    }
  }

  function formatProfileTime(ts) {
    if (!ts) return '기록 없음';
    const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (diffSec < 60) return '방금 전 저장';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}분 전 저장`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}시간 전 저장`;
    const d = new Date(ts);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
  }

  function getQuestionPositionSummary(profile) {
    const lastId = profile && profile.lastQuestionId;
    if (!lastId) {
      const sub = (profile && profile.filters && profile.filters.subject) || '진단검사의학과';
      return { text: `${sub} 1번 문항 (처음부터 시작)`, q: null, subIndex: 1, subTotal: 0 };
    }
    const q = state.allQuestions.find(item => item.id === lastId);
    if (!q) {
      return { text: `문항 ID: ${lastId}`, q: null, subIndex: 1, subTotal: 0 };
    }
    const subQuestions = state.allQuestions.filter(item => item.subject === q.subject);
    const subIdx = subQuestions.findIndex(item => item.id === q.id);
    const posNum = subIdx !== -1 ? subIdx + 1 : 1;
    return {
      text: `${q.subject} ${posNum}번 / ${subQuestions.length}문항 (${q.year} Q${String(q.q_num).padStart(2, '0')})`,
      q,
      subIndex: posNum,
      subTotal: subQuestions.length
    };
  }

  function getProfileStatsSummary(profile) {
    const answers = (profile && profile.userAnswers) || {};
    const answerKeys = Object.keys(answers);
    const answeredCount = answerKeys.length;
    let correctCount = 0;
    answerKeys.forEach(k => {
      if (answers[k] && answers[k].isCorrect) correctCount++;
    });
    const total = state.allQuestions.length || 2267;
    const pct = total > 0 ? Math.round((answeredCount / total) * 100) : 0;
    const acc = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
    const bCount = Array.isArray(profile && profile.bookmarks) ? profile.bookmarks.length : 0;
    return { answeredCount, correctCount, total, pct, acc, bCount };
  }

  function renderProfileModal() {
    const active = getActiveProfile();
    if (!active) return;

    // 1. Update Active Profile Quick Resume Card
    const posInfo = getQuestionPositionSummary(active);
    const statsInfo = getProfileStatsSummary(active);

    if (dom.resumeProfileChip) {
      dom.resumeProfileChip.textContent = `${active.avatar || '🩺'} ${active.name}`;
    }
    if (dom.resumeLastTime) {
      dom.resumeLastTime.textContent = formatProfileTime(active.updatedAt);
    }
    if (dom.resumeTargetText) {
      dom.resumeTargetText.textContent = `최근 위치: ${posInfo.text}`;
    }
    if (dom.resumeStatsText) {
      dom.resumeStatsText.textContent = `전체 풀이 ${statsInfo.answeredCount} / ${statsInfo.total}문항 (${statsInfo.pct}%) · 정답률 ${statsInfo.acc}% · 북마크 ★ ${statsInfo.bCount}`;
    }

    // 2. Render Per-Subject Quick Resume Chips for Active Profile
    if (dom.profileSubjectResumeWrap && dom.profileSubjectResumeList) {
      dom.profileSubjectResumeList.innerHTML = '';
      const subjects = Object.keys(SUBJECT_META).filter(s => s !== 'ALL');
      let chipCount = 0;

      subjects.forEach(sub => {
        const subQs = state.allQuestions.filter(q => q.subject === sub);
        if (subQs.length === 0) return;
        let subSolved = 0;
        subQs.forEach(q => {
          if (active.userAnswers && active.userAnswers[q.id]) subSolved++;
        });
        const savedId = active.lastSubjectMap && active.lastSubjectMap[sub];
        if (subSolved === 0 && !savedId) return;

        let savedPos = 1;
        if (savedId) {
          const idx = subQs.findIndex(q => q.id === savedId);
          if (idx !== -1) savedPos = idx + 1;
        }
        chipCount++;
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'subject-resume-chip';
        const icon = SUBJECT_META[sub] ? SUBJECT_META[sub].icon : '📘';
        chip.textContent = `${icon} ${sub} (#${savedPos} 이어하기 · ${subSolved}/${subQs.length})`;
        chip.title = `${sub} ${savedPos}번 문제에서 바로 이어하기`;
        chip.addEventListener('click', () => {
          switchAndResumeProfile(active.id, sub);
        });
        dom.profileSubjectResumeList.appendChild(chip);
      });

      dom.profileSubjectResumeWrap.style.display = chipCount > 0 ? 'flex' : 'none';
    }

    // 3. Render Saved Profiles List
    if (dom.profileCountBadge) {
      dom.profileCountBadge.textContent = `${state.profiles.length}개 프로필`;
    }
    if (dom.profileList) {
      dom.profileList.innerHTML = '';
      state.profiles.forEach(prof => {
        const isCurrent = prof.id === state.activeProfileId;
        const pPos = getQuestionPositionSummary(prof);
        const pStats = getProfileStatsSummary(prof);

        const card = document.createElement('div');
        card.className = `profile-item-card${isCurrent ? ' active-profile' : ''}`;

        const left = document.createElement('div');
        left.className = 'profile-item-left';
        left.innerHTML = `
          <div class="profile-item-avatar">${escapeHtml(prof.avatar || '🩺')}</div>
          <div class="profile-item-meta">
            <div class="profile-item-title-row">
              <span class="profile-item-name">${escapeHtml(prof.name)}</span>
              ${isCurrent ? '<span class="profile-item-badge">현재 사용 중</span>' : ''}
              <span class="profile-resume-time">${escapeHtml(formatProfileTime(prof.updatedAt))}</span>
            </div>
            <div class="profile-item-last">📍 최근 위치: ${escapeHtml(pPos.text)}</div>
            <div class="profile-item-sub">풀이 ${pStats.answeredCount} / ${pStats.total}문항 (${pStats.pct}%) · 정답률 ${pStats.acc}% · 북마크 ★ ${pStats.bCount}</div>
          </div>
        `;

        const actions = document.createElement('div');
        actions.className = 'profile-item-actions';

        const btnSelect = document.createElement('button');
        btnSelect.type = 'button';
        btnSelect.className = 'btn-profile-select';
        btnSelect.textContent = isCurrent ? '▶ 이어하기' : '▶ 선택 · 이어하기';
        btnSelect.addEventListener('click', () => switchAndResumeProfile(prof.id));
        actions.appendChild(btnSelect);

        const btnRename = document.createElement('button');
        btnRename.type = 'button';
        btnRename.className = 'btn-profile-action';
        btnRename.textContent = '✏️ 이름 변경';
        btnRename.addEventListener('click', () => renameProfile(prof.id));
        actions.appendChild(btnRename);

        const btnReset = document.createElement('button');
        btnReset.type = 'button';
        btnReset.className = 'btn-profile-action danger';
        btnReset.textContent = '🔄 초기화';
        btnReset.addEventListener('click', () => resetProfileHistory(prof.id));
        actions.appendChild(btnReset);

        if (state.profiles.length > 1) {
          const btnDelete = document.createElement('button');
          btnDelete.type = 'button';
          btnDelete.className = 'btn-profile-action danger';
          btnDelete.textContent = '🗑️ 삭제';
          btnDelete.addEventListener('click', () => deleteProfile(prof.id));
          actions.appendChild(btnDelete);
        }

        card.appendChild(left);
        card.appendChild(actions);
        dom.profileList.appendChild(card);
      });
    }

    // 4. Update Error Reports Badge in Profile Modal
    updateProfileReportsBadge();
  }

  function switchAndResumeProfile(profileId, targetSubjectOverride = null) {
    const targetProfile = state.profiles.find(p => p.id === profileId);
    if (!targetProfile) return;

    // First save current active profile before switching
    if (state.activeProfileId && state.activeProfileId !== profileId) {
      saveStorage();
    }

    state.activeProfileId = targetProfile.id;
    loadProfileIntoMemory(targetProfile);

    let targetQId = targetProfile.lastQuestionId;
    if (targetSubjectOverride) {
      state.filters.subject = targetSubjectOverride;
      state.filters.year = 'ALL';
      state.filters.type = 'ALL';
      state.filters.onlyFrequent = false;
      state.filters.onlyImages = false;
      state.filters.onlyIncorrect = false;
      state.filters.onlyBookmarked = false;
      targetQId = (targetProfile.lastSubjectMap && targetProfile.lastSubjectMap[targetSubjectOverride]) || null;
    }

    syncFilterButtonsUI();
    updateSubjectUI();

    if (targetQId) {
      let idx = state.filteredQuestions.findIndex(q => q.id === targetQId);
      if (idx === -1) {
        // Relax sub-filters so the saved question can be resumed
        const targetQ = state.allQuestions.find(q => q.id === targetQId);
        if (targetQ) {
          state.filters.subject = targetQ.subject;
          state.filters.year = 'ALL';
          state.filters.type = 'ALL';
          state.filters.onlyFrequent = false;
          state.filters.onlyImages = false;
          state.filters.onlyIncorrect = false;
          state.filters.onlyBookmarked = false;
          syncFilterButtonsUI();
          updateSubjectUI();
          idx = state.filteredQuestions.findIndex(q => q.id === targetQId);
        }
      }
      state.currentIndex = idx !== -1 ? idx : 0;
    } else {
      state.currentIndex = 0;
    }

    renderCurrentQuestion();
    updateStats();
    renderGrid();
    saveStorage();
    closeProfileModal();
    scrollToQuestionIntel();

    const q = getCurrentQuestion();
    const locLabel = q
      ? `${q.subject} ${state.currentIndex + 1}번 (${q.year} Q${String(q.q_num).padStart(2, '0')})`
      : state.filters.subject;
    showToast(`✅ '${targetProfile.name}' 프로필 [${locLabel}]에서 이어합니다.`);
  }

  function createNewProfile() {
    const rawName = dom.inputProfileName ? dom.inputProfileName.value.trim() : '';
    const name = rawName || `프로필 ${state.profiles.length + 1}`;
    const copyBookmarks = !!(dom.chkCopyBookmarks && dom.chkCopyBookmarks.checked);
    const active = getActiveProfile();

    // Save current profile state before switching
    saveStorage();

    const newProfile = createProfileObject({
      name,
      avatar: state.selectedNewAvatar || '🩺',
      userAnswers: {},
      bookmarks: copyBookmarks && active ? [...active.bookmarks] : [],
      lastQuestionId: null,
      lastSubjectMap: {},
      filters: {
        subject: state.filters.subject || '진단검사의학과',
        year: 'ALL',
        type: 'ALL'
      },
      shuffleOptions: state.shuffleOptions
    });

    state.profiles.push(newProfile);
    if (dom.inputProfileName) dom.inputProfileName.value = '';
    if (dom.chkCopyBookmarks) dom.chkCopyBookmarks.checked = false;

    switchAndResumeProfile(newProfile.id);
    showToast(`🎉 새 프로필 '${newProfile.name}'이(가) 생성되었습니다!`);
  }

  function renameProfile(profileId) {
    const prof = state.profiles.find(p => p.id === profileId);
    if (!prof) return;
    const nextName = prompt('변경할 프로필 이름을 입력하세요:', prof.name);
    if (nextName === null) return;
    const trimmed = nextName.trim();
    if (!trimmed) {
      showToast('⚠️ 프로필 이름을 비워둘 수 없습니다.');
      return;
    }
    prof.name = trimmed.slice(0, 24);
    prof.updatedAt = Date.now();
    saveStorage();
    renderProfileModal();
    updateHeaderProfileUI();
    showToast(`✏️ 프로필 이름이 '${prof.name}'(으)로 변경되었습니다.`);
  }

  function resetProfileHistory(profileId) {
    const prof = state.profiles.find(p => p.id === profileId);
    if (!prof) return;
    if (!confirm(`'${prof.name}' 프로필의 모든 풀이 기록과 정답 통계를 초기화하시겠습니까? (북마크는 유지됩니다)`)) {
      return;
    }
    prof.userAnswers = {};
    prof.lastQuestionId = null;
    prof.lastSubjectMap = {};
    prof.updatedAt = Date.now();

    if (prof.id === state.activeProfileId) {
      state.userAnswers = {};
      state.lastSubjectMap = {};
      state.currentIndex = 0;
      renderCurrentQuestion();
      updateStats();
      renderGrid();
    }
    saveStorage();
    renderProfileModal();
    showToast(`🔄 '${prof.name}' 프로필의 풀이 기록이 초기화되었습니다.`);
  }

  function deleteProfile(profileId) {
    if (state.profiles.length <= 1) {
      showToast('⚠️ 최소 1개의 프로필은 유지되어야 합니다.');
      return;
    }
    const prof = state.profiles.find(p => p.id === profileId);
    if (!prof) return;
    if (!confirm(`'${prof.name}' 프로필과 저장된 풀이 기록을 완전히 삭제하시겠습니까?`)) {
      return;
    }
    state.profiles = state.profiles.filter(p => p.id !== profileId);
    if (state.activeProfileId === profileId) {
      const nextActive = state.profiles[0];
      state.activeProfileId = nextActive.id;
      loadProfileIntoMemory(nextActive);
      syncFilterButtonsUI();
      updateSubjectUI();
      renderCurrentQuestion();
      updateStats();
      renderGrid();
    }
    saveStorage();
    renderProfileModal();
    showToast(`🗑️ '${prof.name}' 프로필이 삭제되었습니다.`);
  }

  function exportProfilesToFile() {
    saveStorage();
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      activeProfileId: state.activeProfileId,
      profiles: state.profiles
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    a.href = url;
    a.download = `subacute_profiles_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('💾 모든 프로필 학습 데이터가 파일로 백업되었습니다.');
  }

  function importProfilesFromFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        const importedList = Array.isArray(parsed) ? parsed : parsed.profiles;
        if (!Array.isArray(importedList) || importedList.length === 0) {
          throw new Error('유효한 프로필 목록이 없습니다.');
        }
        const normalized = importedList.map(p => createProfileObject(p));
        state.profiles = normalized;
        const nextActiveId = parsed.activeProfileId && normalized.some(p => p.id === parsed.activeProfileId)
          ? parsed.activeProfileId
          : normalized[0].id;
        switchAndResumeProfile(nextActiveId);
        showToast(`📂 ${normalized.length}개의 프로필 데이터를 성공적으로 불러왔습니다!`);
      } catch (err) {
        showToast('⚠️ 백업 파일 형식이 올바르지 않습니다.');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  }

  /**
   * ==========================================================================
   * Question Issue Reporting Engine (오류 신고 시스템)
   * ==========================================================================
   */
  function getQuestionDisplayLabel(q) {
    if (!q) return '';
    if (q.section && q.section_q_num) {
      return `${q.section} Q${String(q.section_q_num).padStart(2, '0')} (#${String(q.q_num).padStart(2, '0')})`;
    }
    return `Q${String(q.q_num).padStart(2, '0')}`;
  }

  function setupReportModalEvents() {
    if (dom.btnReportIssue) {
      dom.btnReportIssue.addEventListener('click', () => openReportModal());
    }
    if (dom.btnReportInline) {
      dom.btnReportInline.addEventListener('click', () => openReportModal());
    }
    if (dom.btnCloseReport) {
      dom.btnCloseReport.addEventListener('click', closeReportModal);
    }
    if (dom.btnCancelReport) {
      dom.btnCancelReport.addEventListener('click', closeReportModal);
    }
    if (dom.btnSubmitReport) {
      dom.btnSubmitReport.addEventListener('click', submitErrorReport);
    }

    // Category Radio Selection Cards
    if (dom.reportTypeGrid) {
      const cards = dom.reportTypeGrid.querySelectorAll('.report-type-card');
      cards.forEach(card => {
        card.addEventListener('click', () => {
          cards.forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          const radio = card.querySelector('input[type="radio"]');
          if (radio) radio.checked = true;
        });
      });
    }

    // Backdrop click close for native <dialog>
    if (dom.reportModal) {
      dom.reportModal.addEventListener('click', (e) => {
        if (e.target === dom.reportModal) {
          closeReportModal();
        }
      });
    }

    // Profile Modal Reports Section Events
    if (dom.btnViewReports) {
      dom.btnViewReports.addEventListener('click', toggleReportHistorySection);
    }
    if (dom.btnExportReports) {
      dom.btnExportReports.addEventListener('click', exportReportsToClipboard);
    }
    if (dom.btnClearReports) {
      dom.btnClearReports.addEventListener('click', clearAllReports);
    }
  }

  function openReportModal(targetQuestion = null) {
    const q = targetQuestion || getCurrentQuestion();
    if (!q) {
      showToast('⚠️ 신고할 문항을 찾을 수 없습니다.');
      return;
    }

    state.reportingQuestion = q;

    // Populate Target Information
    if (dom.reportTargetSub) {
      dom.reportTargetSub.textContent = q.subject || '과목';
    }
    if (dom.reportTargetYear) {
      dom.reportTargetYear.textContent = q.year || '기출';
    }
    if (dom.reportTargetQnum) {
      dom.reportTargetQnum.textContent = getQuestionDisplayLabel(q);
    }
    if (dom.reportTargetSec) {
      if (q.section_name) {
        dom.reportTargetSec.textContent = q.section_name;
        dom.reportTargetSec.style.display = 'inline-block';
      } else {
        dom.reportTargetSec.style.display = 'none';
      }
    }
    if (dom.reportTargetStem) {
      const stemText = (q.stem || '').replace(/\s+/g, ' ').trim();
      dom.reportTargetStem.textContent = stemText ? (stemText.length > 100 ? stemText.slice(0, 100) + '...' : stemText) : '(발문 내용 없음)';
    }

    // Reset Form Input
    if (dom.reportDescInput) {
      dom.reportDescInput.value = '';
    }

    // Reset Category Selection to first option
    if (dom.reportTypeGrid) {
      const cards = dom.reportTypeGrid.querySelectorAll('.report-type-card');
      cards.forEach((c, idx) => {
        const radio = c.querySelector('input[type="radio"]');
        if (idx === 0) {
          c.classList.add('active');
          if (radio) radio.checked = true;
        } else {
          c.classList.remove('active');
          if (radio) radio.checked = false;
        }
      });
    }

    if (dom.reportModal) {
      if (typeof dom.reportModal.showModal === 'function') {
        dom.reportModal.showModal();
      } else {
        dom.reportModal.setAttribute('open', 'true');
      }
    }
  }

  function closeReportModal() {
    if (dom.reportModal && dom.reportModal.open) {
      dom.reportModal.close();
    }
    state.reportingQuestion = null;
  }

  function submitErrorReport() {
    const q = state.reportingQuestion || getCurrentQuestion();
    if (!q) {
      closeReportModal();
      return;
    }

    const selectedRadio = dom.reportTypeGrid ? dom.reportTypeGrid.querySelector('input[name="reportType"]:checked') : null;
    const category = selectedRadio ? selectedRadio.value : '기타 제보';
    const description = dom.reportDescInput ? dom.reportDescInput.value.trim() : '';
    const active = getActiveProfile();
    const profileName = active ? `${active.avatar || ''} ${active.name}`.trim() : '익명';

    const reportItem = {
      id: 'rep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      questionId: q.id,
      subject: q.subject,
      year: q.year,
      qNum: q.q_num,
      qLabel: getQuestionDisplayLabel(q),
      sectionName: q.section_name || '',
      stemPreview: (q.stem || '').replace(/\s+/g, ' ').slice(0, 60),
      category: category,
      description: description,
      profileName: profileName,
      createdAt: new Date().toISOString()
    };

    // 1. Local Storage persistence
    if (!Array.isArray(state.reports)) {
      state.reports = [];
    }
    state.reports.unshift(reportItem);
    try {
      localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(state.reports));
    } catch (e) {
      console.error('Failed to save report to localStorage:', e);
    }

    // 2. Transmit to Serverless Function (/api/report)
    fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportItem)
    }).catch(err => {
      // In local file mode or offline, gracefully fail
      console.warn('API report background submission log:', err);
    });

    closeReportModal();
    updateReportButtonState(q);
    updateProfileReportsBadge();

    showToast(`🚨 [${category}] 오류 제보가 접수되었습니다. 감사합니다!`);
  }

  function updateReportButtonState(q) {
    if (!q) return;
    const hasReport = Array.isArray(state.reports) && state.reports.some(r => r.questionId === q.id);

    if (dom.btnReportIssue) {
      dom.btnReportIssue.classList.toggle('reported', hasReport);
      if (hasReport) {
        dom.btnReportIssue.setAttribute('title', '이미 오류가 제보된 문항입니다 (추가 제보 가능)');
      } else {
        dom.btnReportIssue.setAttribute('title', '이 문제 오류 제보하기');
      }
    }

    if (dom.btnReportInline) {
      dom.btnReportInline.classList.toggle('reported', hasReport);
      if (hasReport) {
        dom.btnReportInline.innerHTML = '<span>✅ 오류 접수됨</span>';
        dom.btnReportInline.setAttribute('title', '이미 오류가 접수된 문항입니다. 클릭하여 추가 제보가 가능합니다.');
      } else {
        dom.btnReportInline.innerHTML = '<span>🚨 오류 신고</span>';
        dom.btnReportInline.setAttribute('title', '정답, 발문, 이미지, 분과 오류 제보');
      }
    }
  }

  function updateProfileReportsBadge() {
    const count = Array.isArray(state.reports) ? state.reports.length : 0;
    if (dom.profileReportCount) {
      dom.profileReportCount.textContent = count;
    }
    if (dom.reportSectionCount) {
      dom.reportSectionCount.textContent = count;
    }
    if (dom.reportHistorySection && dom.reportHistorySection.style.display !== 'none') {
      renderReportHistoryList();
    }
  }

  function toggleReportHistorySection() {
    if (!dom.reportHistorySection) return;
    const isHidden = dom.reportHistorySection.style.display === 'none';
    dom.reportHistorySection.style.display = isHidden ? 'block' : 'none';
    if (isHidden) {
      renderReportHistoryList();
      dom.reportHistorySection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function renderReportHistoryList() {
    if (!dom.reportHistoryList) return;
    dom.reportHistoryList.innerHTML = '';

    const list = state.reports || [];
    if (list.length === 0) {
      dom.reportHistoryList.innerHTML = '<div style="color:#94a3b8; font-size:0.8rem; padding:0.5rem 0; text-align:center;">아직 접수된 오류 제보 내역이 없습니다.</div>';
      return;
    }

    list.forEach(rep => {
      const item = document.createElement('div');
      item.className = 'report-history-item';

      const timeStr = rep.createdAt ? new Date(rep.createdAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

      item.innerHTML = `
        <div class="report-history-header">
          <span class="report-history-badge">${escapeHtml(rep.category || '기타')}</span>
          <span class="report-history-time">${timeStr}</span>
        </div>
        <div class="report-history-qlink" title="해당 문항으로 바로 이동하기">
          📌 [${escapeHtml(rep.subject || '')} ${escapeHtml(rep.year || '')}] ${escapeHtml(rep.qLabel || '')} ${rep.sectionName ? '· ' + escapeHtml(rep.sectionName) : ''}
        </div>
        ${rep.description ? `<div class="report-history-desc">${escapeHtml(rep.description)}</div>` : ''}
      `;

      const qLink = item.querySelector('.report-history-qlink');
      if (qLink) {
        qLink.addEventListener('click', () => {
          jumpToQuestionById(rep.questionId);
          closeProfileModal();
        });
      }

      dom.reportHistoryList.appendChild(item);
    });
  }

  function jumpToQuestionById(questionId) {
    if (!questionId) return;

    // Check if question exists in filtered list
    let idx = state.filteredQuestions.findIndex(q => q.id === questionId);
    if (idx !== -1) {
      state.currentIndex = idx;
      renderCurrentQuestion();
      showToast('🎯 제보한 문항으로 이동했습니다.');
      return;
    }

    // If not in current filter, reset filters to locate it
    const targetQ = state.allQuestions.find(q => q.id === questionId);
    if (targetQ) {
      state.filters.subject = targetQ.subject;
      state.filters.year = 'ALL';
      state.filters.type = 'ALL';
      state.filters.section = 'ALL';
      state.filters.onlyFrequent = false;
      state.filters.onlyImages = false;
      state.filters.onlyIncorrect = false;
      state.filters.onlyBookmarked = false;
      state.filters.searchQuery = '';
      if (dom.inputSearch) dom.inputSearch.value = '';
      syncFilterButtonsUI();
      updateSubjectUI();
      idx = state.filteredQuestions.findIndex(q => q.id === questionId);
      state.currentIndex = idx !== -1 ? idx : 0;
      renderCurrentQuestion();
      renderGrid();
      showToast(`🎯 '${targetQ.subject}' 과목으로 필터를 변경하여 문항으로 이동했습니다.`);
    } else {
      showToast('⚠️ 해당 문항 데이터를 찾을 수 없습니다.');
    }
  }

  function exportReportsToClipboard() {
    if (!state.reports || state.reports.length === 0) {
      showToast('⚠️ 복사할 오류 제보 내역이 없습니다.');
      return;
    }

    const jsonStr = JSON.stringify(state.reports, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(jsonStr)
        .then(() => showToast('📋 오류 제보 내역(JSON)이 클립보드에 복사되었습니다.'))
        .catch(() => showToast('⚠️ 클립보드 복사 권한이 없습니다.'));
    } else {
      showToast('⚠️ 클립보드를 지원하지 않는 환경입니다.');
    }
  }

  function clearAllReports() {
    if (!state.reports || state.reports.length === 0) {
      showToast('⚠️ 삭제할 오류 제보 내역이 없습니다.');
      return;
    }

    if (confirm('접수된 모든 오류 신고 내역을 목록에서 삭제하시겠습니까? (서버 로그는 유지됩니다)')) {
      state.reports = [];
      try {
        localStorage.removeItem(STORAGE_KEY_REPORTS);
      } catch (e) {
        console.error(e);
      }
      updateProfileReportsBadge();
      const curQ = getCurrentQuestion();
      if (curQ) updateReportButtonState(curQ);
      showToast('🗑️ 오류 제보 내역이 정리되었습니다.');
    }
  }

  /**
   * Auto-scroll so that the '핵심 출제 테마 박스' (#exam-intel-box)
   * is smoothly positioned right at the very top of the readable viewport.
   */
  function scrollToQuestionIntel(behavior = 'smooth') {
    requestAnimationFrame(() => {
      const targetBox = dom.examIntelBox || document.getElementById('exam-intel-box') || dom.cardMeta || document.getElementById('question-card');
      if (!targetBox) {
        window.scrollTo({ top: 0, behavior });
        return;
      }
      const header = document.querySelector('header');
      const headerHeight = (header && window.getComputedStyle(header).position === 'sticky') ? header.offsetHeight : 0;
      const rect = targetBox.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      // Position the top of #exam-intel-box right below the sticky header with 6px buffer
      const targetTop = rect.top + scrollTop - headerHeight - 6;
      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior
      });
    });
  }

  /**
   * Navigate Previous / Next
   */
  function navigate(delta) {
    if (state.filteredQuestions.length === 0) return;
    state.currentIndex = (state.currentIndex + delta + state.filteredQuestions.length) % state.filteredQuestions.length;
    renderCurrentQuestion();
    scrollToQuestionIntel();
  }

  /**
   * Navigate to Random Question
   */
  function navigateRandom() {
    if (state.filteredQuestions.length <= 1) return;
    let nextIdx = state.currentIndex;
    while (nextIdx === state.currentIndex) {
      nextIdx = Math.floor(Math.random() * state.filteredQuestions.length);
    }
    state.currentIndex = nextIdx;
    renderCurrentQuestion();
    scrollToQuestionIntel();
  }

  /**
   * Toggle Bookmark
   */
  function toggleBookmark() {
    const q = getCurrentQuestion();
    if (!q) return;

    if (state.bookmarks.has(q.id)) {
      state.bookmarks.delete(q.id);
    } else {
      state.bookmarks.add(q.id);
    }

    saveStorage();
    updateStats();
    dom.btnBookmark.classList.toggle('active', state.bookmarks.has(q.id));
  }

  /**
   * Question Jump Grid Modal
   */
  function openGridModal() {
    renderGrid();
    dom.gridModal.style.display = 'flex';
  }

  function closeGridModal() {
    dom.gridModal.style.display = 'none';
  }

  function renderGrid() {
    dom.questionGrid.innerHTML = '';
    const currentQ = getCurrentQuestion();

    state.filteredQuestions.forEach((q, idx) => {
      const btn = document.createElement('button');
      btn.className = 'grid-item-btn';
      
      const isCurrent = currentQ && q.id === currentQ.id;
      if (isCurrent) btn.classList.add('active-current');

      const ans = state.userAnswers[q.id];
      if (ans) {
        if (ans.isCorrect) {
          btn.classList.add('state-correct');
        } else if (ans.isPartial) {
          btn.classList.add('state-partial');
        } else {
          btn.classList.add('state-wrong');
        }
      }

      if (q.year === '22Y' && q.section && q.section_q_num) {
        btn.innerHTML = `<span class="grid-sec-tag">${q.section}</span><span class="grid-num">${String(q.section_q_num).padStart(2, '0')}</span>`;
        btn.title = `[22Y ${q.section} ${String(q.section_q_num).padStart(2, '0')}번] ${q.theme_title || ''}`;
      } else {
        btn.textContent = `${idx + 1}`;
        btn.title = `[${q.year} Q${String(q.q_num).padStart(2, '0')}]: ${q.theme_title || ''}`;
      }

      if (state.bookmarks.has(q.id)) {
        const star = document.createElement('span');
        star.className = 'grid-star';
        star.textContent = '★';
        btn.appendChild(star);
      }

      btn.addEventListener('click', () => {
        state.currentIndex = idx;
        renderCurrentQuestion();
        closeGridModal();
        scrollToQuestionIntel();
      });

      dom.questionGrid.appendChild(btn);
    });
  }

  /**
   * ==========================================================================
   * Image Lightbox & Interactive Zoom / Pan Engine
   * ==========================================================================
   */
  const zoomState = {
    scale: 1.0,
    minScale: 1.0,
    maxScale: 4.5,
    translateX: 0,
    translateY: 0,
    isDragging: false,
    startX: 0,
    startY: 0,
    initialPinchDistance: null,
    initialPinchScale: 1.0,
    lastTapTime: 0
  };

  function updateZoomTransform(smooth = false) {
    if (smooth) {
      dom.lightboxCanvas.style.transition = 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)';
    } else {
      dom.lightboxCanvas.style.transition = 'none';
    }
    dom.lightboxCanvas.style.transform = `translate(${zoomState.translateX}px, ${zoomState.translateY}px) scale(${zoomState.scale})`;
    if (dom.lightboxZoomLevel) {
      dom.lightboxZoomLevel.textContent = `${Math.round(zoomState.scale * 100)}%`;
    }
  }

  function setZoom(newScale, smooth = true) {
    zoomState.scale = Math.min(zoomState.maxScale, Math.max(zoomState.minScale, newScale));
    if (zoomState.scale <= 1.05) {
      zoomState.scale = 1.0;
      zoomState.translateX = 0;
      zoomState.translateY = 0;
    }
    updateZoomTransform(smooth);
  }

  function resetZoom() {
    setZoom(1.0, true);
  }

  function zoomIn() {
    setZoom(zoomState.scale + 0.4, true);
  }

  function zoomOut() {
    setZoom(zoomState.scale - 0.4, true);
  }

  function openLightbox(src, title) {
    dom.lightboxImg.src = src;
    dom.lightboxTitle.textContent = title;
    resetZoom();
    dom.lightboxModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    dom.lightboxModal.style.display = 'none';
    document.body.style.overflow = '';
    resetZoom();
  }

  function setupLightboxEvents() {
    // Zoom Buttons
    if (dom.btnZoomIn) dom.btnZoomIn.addEventListener('click', (e) => { e.stopPropagation(); zoomIn(); });
    if (dom.btnZoomOut) dom.btnZoomOut.addEventListener('click', (e) => { e.stopPropagation(); zoomOut(); });
    if (dom.btnZoomReset) dom.btnZoomReset.addEventListener('click', (e) => { e.stopPropagation(); resetZoom(); });
    if (dom.btnCloseLightbox) dom.btnCloseLightbox.addEventListener('click', (e) => { e.stopPropagation(); closeLightbox(); });

    // Close when tapping outside the canvas on 1x zoom
    dom.lightboxViewport.addEventListener('click', (e) => {
      if (e.target === dom.lightboxViewport && zoomState.scale <= 1.05) {
        closeLightbox();
      }
    });

    // Mouse Dragging for Desktop
    dom.lightboxViewport.addEventListener('mousedown', (e) => {
      if (e.button === 0 && zoomState.scale > 1.05) {
        zoomState.isDragging = true;
        zoomState.startX = e.clientX - zoomState.translateX;
        zoomState.startY = e.clientY - zoomState.translateY;
        dom.lightboxCanvas.classList.add('is-dragging');
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (zoomState.isDragging) {
        zoomState.translateX = e.clientX - zoomState.startX;
        zoomState.translateY = e.clientY - zoomState.startY;
        updateZoomTransform(false);
      }
    });

    window.addEventListener('mouseup', () => {
      if (zoomState.isDragging) {
        zoomState.isDragging = false;
        dom.lightboxCanvas.classList.remove('is-dragging');
      }
    });

    // Desktop Mouse Wheel Zoom
    dom.lightboxViewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.3 : -0.3;
      setZoom(zoomState.scale + delta, false);
    }, { passive: false });

    // Touch Gestures: Double-Tap Zoom & Pinch-to-Zoom
    dom.lightboxViewport.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        // Double-Tap Detection
        const now = Date.now();
        if (now - zoomState.lastTapTime < 320) {
          e.preventDefault();
          if (zoomState.scale > 1.2) {
            resetZoom();
          } else {
            setZoom(2.2, true);
          }
          zoomState.lastTapTime = 0;
          return;
        }
        zoomState.lastTapTime = now;

        // Pan Start
        if (zoomState.scale > 1.05) {
          zoomState.isDragging = true;
          zoomState.startX = e.touches[0].clientX - zoomState.translateX;
          zoomState.startY = e.touches[0].clientY - zoomState.translateY;
        }
      } else if (e.touches.length === 2) {
        // Pinch Zoom Start
        zoomState.isDragging = false;
        zoomState.initialPinchDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        zoomState.initialPinchScale = zoomState.scale;
      }
    }, { passive: false });

    dom.lightboxViewport.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && zoomState.isDragging && zoomState.scale > 1.05) {
        e.preventDefault();
        zoomState.translateX = e.touches[0].clientX - zoomState.startX;
        zoomState.translateY = e.touches[0].clientY - zoomState.startY;
        updateZoomTransform(false);
      } else if (e.touches.length === 2 && zoomState.initialPinchDistance) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = dist / zoomState.initialPinchDistance;
        setZoom(zoomState.initialPinchScale * factor, false);
      }
    }, { passive: false });

    dom.lightboxViewport.addEventListener('touchend', (e) => {
      if (e.touches.length < 2) {
        zoomState.initialPinchDistance = null;
      }
      if (e.touches.length === 0) {
        zoomState.isDragging = false;
      }
    });
  }

  // Start app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
