/**
 * 진단검사의학과 기출 퀴즈 마스터 (20Y ~ 26Y)
 * Core Application Engine
 */

(function () {
  'use strict';

  // Storage Keys
  const STORAGE_KEY_ANSWERS = 'KMLE_LAB_MED_ANSWERS_V1';
  const STORAGE_KEY_BOOKMARKS = 'KMLE_LAB_MED_BOOKMARKS_V1';
  const STORAGE_KEY_LAST_ID = 'KMLE_LAB_MED_LAST_ID_V1';

  // Application State
  const state = {
    allQuestions: [],
    filteredQuestions: [],
    currentIndex: 0,
    userAnswers: {},   // qId -> { selectedIndices, selectedIndex, correctIndices, isCorrect, isPartial, score, timestamp }
    bookmarks: new Set(),
    pendingSelections: new Set(), // Set of selected option indices (0-based) for multi-answer questions
    filters: {
      year: 'ALL',
      type: 'ALL',
      onlyIncorrect: false,
      onlyBookmarked: false,
      searchQuery: ''
    }
  };

  // DOM Elements Cache
  const dom = {
    // Stats
    statProgress: document.getElementById('stat-progress'),
    statBarFill: document.getElementById('stat-bar-fill'),
    statAccuracy: document.getElementById('stat-accuracy'),
    statBookmarks: document.getElementById('stat-bookmarks'),
    btnOpenGrid: document.getElementById('btn-open-grid'),

    // Filters
    yearTabs: document.getElementById('year-tabs'),
    typeTabs: document.getElementById('type-tabs'),
    filterIncorrect: document.getElementById('filter-incorrect'),
    filterBookmarked: document.getElementById('filter-bookmarked'),
    searchInput: document.getElementById('search-input'),

    // Question Card
    cardYear: document.getElementById('card-year'),
    cardQnum: document.getElementById('card-qnum'),
    cardCategory: document.getElementById('card-category'),
    cardSubspecialty: document.getElementById('card-subspecialty'),
    cardMultiBadge: document.getElementById('card-multi-badge'),
    filterCounter: document.getElementById('filter-counter'),
    btnBookmark: document.getElementById('btn-bookmark'),
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
    applyFilters();
    
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
      const res = await fetch('data/quiz_lab_med.json');
      if (!res.ok) throw new Error('Network response not ok');
      state.allQuestions = await res.json();
    } catch (err) {
      console.warn('Fetch fallback to window.QUIZ_DATA or failed:', err);
      if (window.QUIZ_DATA) {
        state.allQuestions = window.QUIZ_DATA;
      }
    }
  }

  /**
   * Filter Questions based on active settings
   */
  function applyFilters() {
    const { year, type, onlyIncorrect, onlyBookmarked, searchQuery } = state.filters;
    const query = searchQuery.trim().toLowerCase();

    state.filteredQuestions = state.allQuestions.filter(q => {
      // Year filter
      if (year !== 'ALL' && q.year !== year) {
        return false;
      }

      // Type filter
      if (type !== 'ALL') {
        if (type === '짤' && (!q.images || q.images.length === 0)) return false;
        if (type === '탈' && q.images && q.images.length > 0) return false;
        if (type === '반짤' && q.category !== '반짤') return false;
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
        const matchStem = q.stem.toLowerCase().includes(query);
        const matchTitle = (q.theme_title || '').toLowerCase().includes(query);
        const matchId = q.id.toLowerCase().includes(query);
        const matchOptions = q.options.some(opt => opt.toLowerCase().includes(query));
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

    // Top Metadata
    dom.cardYear.textContent = q.year || '기출';
    dom.cardQnum.textContent = `Q${String(q.q_num).padStart(2, '0')}`;
    dom.cardCategory.textContent = q.category || (q.images && q.images.length > 0 ? '짤' : '탈');
    dom.cardSubspecialty.textContent = q.subspecialty || '진단검사의학';

    const countText = `문항 ${state.currentIndex + 1} / ${state.filteredQuestions.length}`;
    dom.filterCounter.textContent = countText;
    dom.navIndicator.textContent = `${state.currentIndex + 1} / ${state.filteredQuestions.length}`;

    // Bookmark Toggle
    const isBookmarked = state.bookmarks.has(q.id);
    dom.btnBookmark.classList.toggle('active', isBookmarked);

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
        badge.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="11" y1="8" x2="11" y2="14"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
          <span>터치하여 고화질 확대</span>
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
   * Render Options List and Multi-Submit Action Bar
   */
  function renderOptions(q) {
    dom.optionsList.innerHTML = '';
    const config = getQuestionAnswerConfig(q);
    const answerRecord = state.userAnswers[q.id];
    const isAnswered = !!answerRecord;

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
        dom.optionsLabel.textContent = '선지를 클릭하여 정답을 선택하세요';
      }
    }

    if (dom.optionsKbdTip) {
      if (config.isMulti) {
        dom.optionsKbdTip.textContent = '단축키: 1 ~ 5 (토글), Enter (정답 확인)';
      } else {
        dom.optionsKbdTip.textContent = '단축키: 숫자키 1 ~ 5';
      }
    }

    // Render Option Buttons
    q.options.forEach((optText, optIdx) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      if (isAnswered) {
        btn.classList.add('disabled');
      }

      // Clean prefix if already in optText
      const numMatch = optText.match(/^[①②③④⑤⑥⑦⑧\d\.\)\-\s]+/);
      const numPrefix = numMatch ? numMatch[0].trim() : `${optIdx + 1}.`;
      const labelText = optText.replace(/^[①②③④⑤⑥⑦⑧\d\.\)\-\s]+/, '').trim() || optText;

      const isPending = !isAnswered && config.isMulti && state.pendingSelections.has(optIdx);
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
          <span class="option-kbd-hint">${optIdx + 1}</span>
        </div>
      `;

      btn.addEventListener('click', () => {
        if (!state.userAnswers[q.id]) {
          if (config.isMulti) {
            togglePendingSelection(q, optIdx, config);
          } else {
            handleSelectSingleOption(q, optIdx, config);
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
   * Reveal Answer, Grading Highlights, and Clinical Explanation
   */
  function revealAnswerAndExplanation(q, answerRecord, animate) {
    const config = getQuestionAnswerConfig(q);
    const correctSet = new Set(config.correctIndices);
    const selectedIndices = answerRecord.selectedIndices || [answerRecord.selectedIndex];
    const selectedSet = new Set(selectedIndices);

    const optionButtons = dom.optionsList.querySelectorAll('.option-btn');

    optionButtons.forEach((btn, idx) => {
      btn.classList.add('disabled');
      btn.classList.remove('is-selected-pending');
      const isSelected = selectedSet.has(idx);
      const isTargetCorrect = correctSet.has(idx);
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
      const correctLabels = config.correctIndices.map(i => q.options[i]).join(', ');
      dom.feedbackDetail.textContent = `정답은 [${correctLabels}] 입니다. 아래 상세 해설을 확인하세요.`;
    } else {
      dom.feedbackIcon.textContent = '💡';
      dom.feedbackStatus.textContent = '오답입니다!';
      const correctLabels = config.correctIndices.map(i => q.options[i]).join(', ');
      dom.feedbackDetail.textContent = `정답은 [${correctLabels || q.correct_answer}] 입니다. 아래 상세 해설을 확인하세요.`;
    }

    // Clinical Explanation Box
    const exp = q.explanation || {};
    dom.expThemeTitle.textContent = exp.title || q.theme_title || '임상 검사 판독 및 의의';
    
    const correctSummary = config.correctIndices.map(i => q.options[i]).join(', ') || q.correct_answer || '';
    dom.expCorrectAnswer.textContent = correctSummary;

    dom.expFindings.textContent = exp.findings || '상기 검사의 기본 원리와 기준치 판독 지침을 참조하십시오.';
    dom.expDifferential.textContent = exp.differential || '선지별 감별 임상 의의 및 관련 질환 감별 포인트를 숙지하십시오.';
    dom.expTrap.textContent = exp.trap || '실전 빈출 함정 키워드와 검체 채취 전 처치 조건을 점검하십시오.';
    dom.expTrigger.textContent = exp.trigger || `${q.theme_title} 핵심 지표 기준 즉시 정답 도출`;
    dom.expKmleLink.textContent = `📚 KMLE 연계: ${exp.kmle_link || '진단검사의학과 총론 및 각론'}`;

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
    saveStorage();
    updateStats();
    renderCurrentQuestion();
  }

  /**
   * Update Global Stats Header
   */
  function updateStats() {
    const total = state.allQuestions.length;
    const answeredKeys = Object.keys(state.userAnswers);
    const answeredCount = answeredKeys.length;

    let correctCount = 0;
    let partialCount = 0;
    answeredKeys.forEach(k => {
      const rec = state.userAnswers[k];
      if (rec) {
        if (rec.isCorrect) correctCount++;
        else if (rec.isPartial) partialCount++;
      }
    });

    const accuracyPct = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
    const progressPct = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

    dom.statProgress.textContent = `${answeredCount} / ${total}`;
    dom.statBarFill.style.width = `${progressPct}%`;
    dom.statAccuracy.textContent = `${accuracyPct}%`;
    dom.statBookmarks.textContent = `${state.bookmarks.size}`;
  }

  /**
   * Setup Event Listeners
   */
  function setupEventListeners() {
    // Navigation
    dom.btnPrev.addEventListener('click', () => navigate(-1));
    dom.btnNext.addEventListener('click', () => navigate(1));
    dom.btnRandom.addEventListener('click', navigateRandom);

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

    // Year Filter Tabs
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

    // Type Filter Tabs
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
        if (config.isMulti) {
          togglePendingSelection(q, keyNum - 1, config);
        } else {
          handleSelectSingleOption(q, keyNum - 1, config);
        }
        return;
      }
      if (e.key === 'Enter') {
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
