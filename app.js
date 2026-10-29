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
  const CIRCLE_NUMS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

  // Application State
  const state = {
    allQuestions: [],
    filteredQuestions: [],
    currentIndex: 0,
    userAnswers: {},   // qId -> { selectedIndices, selectedIndex, correctIndices, isCorrect, isPartial, score, timestamp }
    bookmarks: new Set(),
    pendingSelections: new Set(), // Set of selected option indices (0-based ORIGINAL indices) for multi-answer questions
    shuffleOptions: localStorage.getItem(STORAGE_KEY_SHUFFLE) === 'true',
    shuffledOrders: {}, // qId -> number[] (displayIdx -> originalIdx)
    filters: {
      subject: localStorage.getItem(STORAGE_KEY_SUBJECT) || '진단검사의학과',
      year: 'ALL',
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
    typeTabs: document.getElementById('type-tabs'),
    filterFrequent: document.getElementById('filter-frequent'),
    filterImages: document.getElementById('filter-images'),
    filterIncorrect: document.getElementById('filter-incorrect'),
    filterBookmarked: document.getElementById('filter-bookmarked'),
    btnToggleShuffle: document.getElementById('btn-toggle-shuffle'),
    btnReshuffleNow: document.getElementById('btn-reshuffle-now'),
    searchInput: document.getElementById('search-input'),

    // Question Card
    cardSubject: document.getElementById('card-subject'),
    cardYear: document.getElementById('card-year'),
    cardQnum: document.getElementById('card-qnum'),
    cardMetaLinkedChips: document.getElementById('card-meta-linked-chips'),
    cardCategory: document.getElementById('card-category'),
    cardSubspecialty: document.getElementById('card-subspecialty'),
    cardFreqBadge: document.getElementById('card-freq-badge'),
    cardMultiBadge: document.getElementById('card-multi-badge'),
    filterCounter: document.getElementById('filter-counter'),
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

    // Grid Modal
    gridModal: document.getElementById('grid-modal'),
    questionGrid: document.getElementById('question-grid'),
    btnCloseGrid: document.getElementById('btn-close-grid'),
    btnCloseGridBottom: document.getElementById('btn-close-grid-bottom'),
    btnResetHistory: document.getElementById('btn-reset-history'),

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
    updateSubjectUI();
    
    // Restore last viewed question if available
    const lastId = localStorage.getItem(STORAGE_KEY_LAST_ID);
    if (lastId) {
      const idx = state.filteredQuestions.findIndex(q => q.id === lastId);
      if (idx !== -1) {
        state.currentIndex = idx;
      }
    }
    
    renderCurrentQuestion();
    updateStats();
  }

  /**
   * Load local storage data
   */
  function loadStorage() {
    try {
      const savedAnswers = localStorage.getItem(STORAGE_KEY_ANSWERS);
      if (savedAnswers) {
        state.userAnswers = JSON.parse(savedAnswers);
      }
      const savedBookmarks = localStorage.getItem(STORAGE_KEY_BOOKMARKS);
      if (savedBookmarks) {
        state.bookmarks = new Set(JSON.parse(savedBookmarks));
      }
    } catch (e) {
      console.error('Failed to load local storage:', e);
    }
  }

  /**
   * Save state to local storage
   */
  function saveStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_ANSWERS, JSON.stringify(state.userAnswers));
      localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify([...state.bookmarks]));
      const currentQ = getCurrentQuestion();
      if (currentQ) {
        localStorage.setItem(STORAGE_KEY_LAST_ID, currentQ.id);
      }
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
      return;
    }

    try {
      const res = await fetch('data/quiz_all_subjects.json');
      if (!res.ok) throw new Error('Network response not ok');
      state.allQuestions = await res.json();
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
    '영상의학과': { icon: '🩻', title: '영상의학과 기출 퀴즈', desc: '흉부·복부·신경두경부·근골격·인터벤션 영상 판독' },
    'ALL': { icon: '🩺', title: 'subacute (임상의학 기출 퀴즈 마스터)', desc: '20Y ~ 26Y 9개 임상 분과 2,267문항 통합 CBT' }
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
      dom.brandSubtitle.textContent = `20Y ~ 26Y 실전 기출 완전 정복 • ${subQuestions.length}문항 (v4.4 정밀검수 완결판 • ${meta.desc})`;
    }

    // Dynamic Year Tabs
    renderYearTabs(subQuestions);

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
        const matchOptions = (q.options || []).some(opt => opt.toLowerCase().includes(query));
        if (!matchStem && !matchTitle && !matchId && !matchOptions) {
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
   * Check if a raw question citation (e.g. '26Y-01', '20Y-34', '23Y') matches question q
   */
  function isSameQuestionAsRaw(q, rawItem) {
    if (!q || !rawItem) return false;
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
   * Jump to question by raw exam tag (e.g. '23Y-47', '22Y-25')
   * Accurately finds the question in state.allQuestions, adjusts filters if needed,
   * updates the currentIndex, and smoothly transitions to the target question.
   */
  function jumpToQuestionByRaw(rawItem) {
    if (!rawItem) return;
    const curQ = getCurrentQuestion();
    const curSub = curQ ? curQ.subject : (state.filters.subject !== 'ALL' ? state.filters.subject : null);

    const m = rawItem.match(/(\d+Y)[-_]Q?0?(\d+)/i);
    if (!m) {
      const ym = rawItem.match(/^(\d+Y)$/i);
      if (ym) {
        const targetYear = ym[1].toUpperCase();
        state.filters.year = targetYear;
        applyFilters();
        const subQuestions = (state.filters.subject === 'ALL')
          ? state.allQuestions
          : state.allQuestions.filter(cand => cand.subject === state.filters.subject);
        renderYearTabs(subQuestions);
        renderCategoryTabs(subQuestions);
        state.currentIndex = 0;
        renderCurrentQuestion();
        renderGrid();
        updateStats();
        showToast(`📅 ${targetYear} 기출 문제 목록으로 필터를 전환했습니다.`);
      }
      return;
    }
    const targetYear = m[1].toUpperCase();
    const targetNum = parseInt(m[2], 10);

    // If already viewing this exact question, alert user gently
    if (curQ && curQ.year === targetYear && Number(curQ.q_num) === targetNum) {
      showToast(`이미 현재 표시 중인 문제입니다. (${targetYear} Q${String(targetNum).padStart(2, '0')})`);
      return;
    }

    // 1. Find target question
    let target = null;

    // 1-a. Priority: Same subject, exact year & q_num
    if (curSub) {
      target = state.allQuestions.find(cand =>
        cand.subject === curSub &&
        cand.year === targetYear &&
        Number(cand.q_num) === targetNum
      );
      if (!target) {
        target = state.allQuestions.find(cand =>
          cand.subject === curSub &&
          cand.year === targetYear &&
          (cand.id.includes(`_Q${String(targetNum).padStart(2, '0')}`) ||
           cand.id.includes(`_Q${targetNum}`))
        );
      }
    }

    // 1-b. Global search: exact year & q_num
    if (!target) {
      target = state.allQuestions.find(cand =>
        cand.year === targetYear &&
        Number(cand.q_num) === targetNum
      );
    }

    // 1-c. Global ID match
    if (!target) {
      target = state.allQuestions.find(cand =>
        cand.year === targetYear &&
        (cand.id.includes(`_Q${String(targetNum).padStart(2, '0')}`) ||
         cand.id.includes(`_Q${targetNum}`))
      );
    }

    if (!target) {
      showToast(`⚠️ [${rawItem}] 문제는 현재 5개년(20Y~26Y) 기출 DB에 포함되어 있지 않습니다.`);
      return;
    }

    // 2. Check if target is in current filtered list
    let targetIdx = state.filteredQuestions.findIndex(fq => fq.id === target.id);

    // If target was filtered out, adjust filters to include it!
    if (targetIdx === -1) {
      // If subject was restricted, adjust to target subject
      if (state.filters.subject !== 'ALL' && state.filters.subject !== target.subject) {
        state.filters.subject = target.subject;
        localStorage.setItem(STORAGE_KEY_SUBJECT, target.subject);
      }

      // If year was restricted, adjust to ALL
      if (state.filters.year !== 'ALL' && state.filters.year !== target.year) {
        state.filters.year = 'ALL';
      }

      // Clear restrictive filters
      state.filters.type = 'ALL';
      state.filters.onlyFrequent = false;
      state.filters.onlyImages = false;
      state.filters.onlyIncorrect = false;
      state.filters.onlyBookmarked = false;
      state.filters.searchQuery = '';
      if (dom.searchInput) dom.searchInput.value = '';

      // Re-apply filters
      applyFilters();

      // Synchronize UI filter tabs
      const subQuestions = (state.filters.subject === 'ALL')
        ? state.allQuestions
        : state.allQuestions.filter(q => q.subject === state.filters.subject);
      renderYearTabs(subQuestions);
      renderCategoryTabs(subQuestions);

      if (dom.subjectTabs) {
        dom.subjectTabs.querySelectorAll('.subject-pill').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.subject === state.filters.subject);
        });
      }
      if (dom.filterFrequent) dom.filterFrequent.classList.remove('active');
      if (dom.filterImages) dom.filterImages.classList.remove('active');
      if (dom.filterIncorrect) dom.filterIncorrect.classList.remove('active');
      if (dom.filterBookmarked) dom.filterBookmarked.classList.remove('active');

      targetIdx = state.filteredQuestions.findIndex(fq => fq.id === target.id);
    }

    if (targetIdx !== -1) {
      state.currentIndex = targetIdx;
      renderCurrentQuestion();
      renderGrid();
      updateStats();
      showToast(`🔄 [${target.year}-${String(target.q_num).padStart(2, '0')}] ${target.subject} 기출 문제로 이동했습니다.`);
    } else {
      showToast(`⚠️ [${rawItem}] 문제로 이동하는 중 필터 충돌이 발생했습니다.`);
    }
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
      dom.navIndicator.textContent = '0 / 0';
      return;
    }

    // Top Metadata Badges
    if (dom.cardSubject) {
      dom.cardSubject.textContent = q.subject || '임상의학';
    }

    const hasMultipleLinks = q.raw_questions && q.raw_questions.length > 1;

    if (hasMultipleLinks) {
      // Hide separate year & qnum badges so buttons maintain fixed positions without jumping to the left
      if (dom.cardYear) dom.cardYear.style.display = 'none';
      if (dom.cardQnum) dom.cardQnum.style.display = 'none';

      if (dom.cardMetaLinkedChips) {
        dom.cardMetaLinkedChips.innerHTML = '';
        q.raw_questions.forEach(rawItem => {
          const isCurrent = isSameQuestionAsRaw(q, rawItem);
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = `meta-link-chip${isCurrent ? ' current' : ''}`;

          if (isCurrent) {
            chip.textContent = rawItem;
            chip.title = `현재 문제 (${rawItem})`;
            chip.setAttribute('aria-current', 'true');
            chip.addEventListener('click', (e) => {
              e.stopPropagation();
              showToast(`이미 현재 표시 중인 문제입니다. (${rawItem})`);
            });
          } else {
            chip.innerHTML = `${rawItem} <span class="chip-arrow">↗</span>`;
            chip.title = `${rawItem} 기출 문제로 즉시 이동`;
            chip.addEventListener('click', (e) => {
              e.stopPropagation();
              jumpToQuestionByRaw(rawItem);
            });
          }
          dom.cardMetaLinkedChips.appendChild(chip);
        });
      }
    } else {
      // Single question appearance: show standard year & qnum badges
      if (dom.cardYear) {
        dom.cardYear.style.display = '';
        dom.cardYear.textContent = q.year || '기출';
        dom.cardYear.title = `${q.year || ''} 기출 문제 필터 전환`;
      }
      if (dom.cardQnum) {
        dom.cardQnum.style.display = '';
        dom.cardQnum.textContent = `Q${String(q.q_num).padStart(2, '0')}`;
      }
      if (dom.cardMetaLinkedChips) {
        dom.cardMetaLinkedChips.innerHTML = '';
      }
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
    dom.navIndicator.textContent = `${state.currentIndex + 1} / ${state.filteredQuestions.length}`;

    // Bookmark Toggle
    const isBookmarked = state.bookmarks.has(q.id);
    dom.btnBookmark.classList.toggle('active', isBookmarked);

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
      const rawList = q.raw_questions && q.raw_questions.length > 0
        ? q.raw_questions
        : [`${q.year}-${String(q.q_num).padStart(2, '0')}`];

      rawList.forEach(rawItem => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'intel-chip';

        // Check if rawItem refers to current question
        const isCurrent = isSameQuestionAsRaw(q, rawItem);
        if (isCurrent) {
          chip.classList.add('current');
          chip.textContent = `${rawItem} (현재)`;
        } else {
          chip.innerHTML = `${rawItem} <span style="font-size:0.7em;opacity:0.8;">↗</span>`;
          chip.title = `${rawItem} 기출 문제로 즉시 이동`;
          chip.addEventListener('click', () => {
            jumpToQuestionByRaw(rawItem);
          });
        }
        dom.cardHistoryChips.appendChild(chip);
      });
    }

    // Stem Text
    dom.cardStem.textContent = q.stem;

    // Images
    if (q.images && q.images.length > 0) {
      dom.cardImagesContainer.style.display = 'flex';
      dom.cardImages.innerHTML = '';
      q.images.forEach((imgSrc, idx) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'image-item-wrapper';
        wrapper.setAttribute('role', 'button');
        wrapper.setAttribute('tabindex', '0');
        wrapper.setAttribute('aria-label', `${q.id} 고화질 사진 확대`);

        const img = document.createElement('img');
        img.src = imgSrc;
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

        wrapper.addEventListener('click', () => openLightbox(imgSrc, `${q.id} [임상 사진 ${idx + 1}]`));
        wrapper.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openLightbox(imgSrc, `${q.id} [임상 사진 ${idx + 1}]`);
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
        generalEl.innerHTML = `<div class="opt-exp-general-title">💡 핵심 감별 및 임상 가이드라인</div><div class="opt-exp-general-content">${escapeHtml(generalText).replace(/\n/g, '<br>')}</div>`;
        dom.expDifferential.appendChild(generalEl);
      }
    } else {
      // Fallback for short-answer or legacy format
      const rawDiff = (exp && exp.differential) || '선지별 감별 임상 의의 및 관련 질환 감별 포인트를 숙지하십시오.';
      dom.expDifferential.innerHTML = `<div class="exp-plain-text">${escapeHtml(rawDiff).replace(/\n/g, '<br>')}</div>`;
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

    dom.expFindings.textContent = exp.findings || '상기 검사의 기본 원리와 기준치 판독 지침을 참조하십시오.';
    dom.expTrap.textContent = exp.trap || '실전 빈출 함정 키워드와 검체 채취 전 처치 조건을 점검하십시오.';
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

    // Subject Selection Tabs (과목 전환)
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
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
      if (confirm('모든 문제 풀이 기록과 정답 통계를 초기화하시겠습니까?')) {
        state.userAnswers = {};
        saveStorage();
        updateStats();
        renderGrid();
        renderCurrentQuestion();
      }
    });

    // Lightbox Events (Zoom, Pan, Drag, Close)
    setupLightboxEvents();

    // Keyboard Shortcuts
    window.addEventListener('keydown', handleKeydown);
  }

  /**
   * Keyboard Shortcuts Handler
   */
  function handleKeydown(e) {
    // If typing in input, ignore
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
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
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      resetCurrentQuestion();
    } else if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      toggleShuffleMode();
    } else if (e.key === 'Escape') {
      closeGridModal();
      closeLightbox();
    }
  }

  /**
   * Navigate Previous / Next
   */
  function navigate(delta) {
    if (state.filteredQuestions.length === 0) return;
    state.currentIndex = (state.currentIndex + delta + state.filteredQuestions.length) % state.filteredQuestions.length;
    renderCurrentQuestion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

      btn.textContent = `${idx + 1}`;

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
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
