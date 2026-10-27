/**
 * ITEST 雅思词汇随身助手 - 核心控制逻辑
 */
class VocabApp {
  constructor() {
    this.currentList = [...VOCAB_DATA];
    this.currentIndex = 0;
    this.isFlipped = false;
    this.currentFilter = 'all';
    this.searchQuery = '';

    this.initDOMElements();
    this.bindEvents();
    this.updateStats();
    this.renderCurrentCard();
    this.renderVocabList();
    this.renderSentences();
    this.initTheme();
  }

  initDOMElements() {
    // Navigation
    this.navItems = document.querySelectorAll('.nav-item');
    this.sections = document.querySelectorAll('.view-section');

    // Flashcard Elements
    this.cardScene = document.getElementById('card-scene');
    this.flashcard = document.getElementById('flashcard');
    this.frontTag = document.getElementById('card-front-tag');
    this.frontWord = document.getElementById('card-front-word');
    this.frontPhonetic = document.getElementById('card-front-phonetic');
    this.backWord = document.getElementById('card-back-word');
    this.backPos = document.getElementById('card-back-pos');
    this.backZh = document.getElementById('card-back-zh');
    this.backNotes = document.getElementById('card-back-notes');
    this.backSentenceEn = document.getElementById('card-back-sentence-en');
    this.backSentenceZh = document.getElementById('card-back-sentence-zh');
    this.cardCounter = document.getElementById('card-counter');
    this.progressFill = document.getElementById('progress-fill');

    // List Elements
    this.searchInput = document.getElementById('search-input');
    this.filterButtons = document.querySelectorAll('.filter-btn');
    this.vocabListContainer = document.getElementById('vocab-list-container');

    // Stats
    this.statTotal = document.getElementById('stat-total');
    this.statMastered = document.getElementById('stat-mastered');
    this.statLearning = document.getElementById('stat-learning');
    this.statUnlearned = document.getElementById('stat-unlearned');

    // Theme Toggle
    this.themeToggleBtn = document.getElementById('theme-toggle-btn');
  }

  bindEvents() {
    // Bottom Nav Switching
    this.navItems.forEach(item => {
      item.addEventListener('click', () => {
        const view = item.dataset.view;
        this.switchView(view);
      });
    });

    // Card Flip
    this.cardScene.addEventListener('click', () => {
      this.flipCard();
    });

    // Speak Button (Toggle Play / Pause)
    const speakBtn = document.getElementById('speak-btn');
    speakBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const current = this.currentList[this.currentIndex];
      if (current) {
        AudioPlayer.toggle(current.en, (isPlaying) => {
          speakBtn.classList.toggle('is-playing', isPlaying);
        });
      }
    });

    // Rating Buttons
    document.getElementById('btn-hard').addEventListener('click', (e) => {
      e.stopPropagation();
      this.rateCard(1); // 模糊/重学
    });
    document.getElementById('btn-good').addEventListener('click', (e) => {
      e.stopPropagation();
      this.rateCard(1); // 掌握中
    });
    document.getElementById('btn-easy').addEventListener('click', (e) => {
      e.stopPropagation();
      this.rateCard(2); // 完全掌握
    });

    // Mobile Swipe Gesture: Left -> 忘记/需复习; Right -> 掌握; Up -> 翻转
    setupCardGesture(this.cardScene, {
      onRateHard: () => this.rateCard(1), // 标记为模糊/需复习并进入下一词
      onRateEasy: () => this.rateCard(2), // 标记为已掌握并进入下一词
      onFlip: () => this.flipCard()       // 上滑翻转
    });

    // Search and Filter
    this.searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim().toLowerCase();
      this.renderVocabList();
    });

    this.filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.filter;
        this.renderVocabList();
      });
    });

    // Theme Toggle
    this.themeToggleBtn.addEventListener('click', () => {
      this.toggleTheme();
    });

    // Reset Progress
    const resetBtn = document.getElementById('reset-progress-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('确定要清空当前的背词与复习进度吗？')) {
          Storage.resetProgress();
          this.updateStats();
          this.renderVocabList();
          this.renderCurrentCard();
        }
      });
    }
  }

  switchView(viewId) {
    this.navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewId);
    });
    this.sections.forEach(sec => {
      sec.classList.toggle('active', sec.id === `view-${viewId}`);
    });
    if (viewId === 'stats') {
      this.updateStats();
    }
  }

  flipCard() {
    this.isFlipped = !this.isFlipped;
    this.flashcard.classList.toggle('is-flipped', this.isFlipped);
  }

  renderCurrentCard() {
    if (this.currentList.length === 0) return;
    const item = this.currentList[this.currentIndex];

    // Reset Flip & Stop previous audio
    this.isFlipped = false;
    this.flashcard.classList.remove('is-flipped');
    AudioPlayer.stop();
    document.getElementById('speak-btn')?.classList.remove('is-playing');

    // Fill Data
    this.frontTag.textContent = `${item.test} · ${item.section}`;
    this.frontWord.textContent = item.en;
    this.frontPhonetic.textContent = item.phonetic || '';

    this.backWord.textContent = item.en;
    this.backPos.textContent = item.pos;
    this.backZh.textContent = item.zh;
    this.backNotes.textContent = item.notes;
    this.backSentenceEn.textContent = item.sentence;
    this.backSentenceZh.textContent = item.sentenceZh;

    // Counter & Progress
    this.cardCounter.textContent = `${this.currentIndex + 1} / ${this.currentList.length}`;
    const pct = ((this.currentIndex + 1) / this.currentList.length) * 100;
    this.progressFill.style.width = `${pct}%`;
  }

  rateCard(status) {
    const item = this.currentList[this.currentIndex];
    if (item) {
      Storage.setStatus(item.id, status);
      this.updateStats();
    }
    this.nextCard();
  }

  nextCard() {
    if (this.currentIndex < this.currentList.length - 1) {
      this.currentIndex++;
    } else {
      this.currentIndex = 0; // 循环或提示完成
    }
    this.renderCurrentCard();
  }

  prevCard() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.renderCurrentCard();
    }
  }

  renderVocabList() {
    const progress = Storage.getProgress();
    let filtered = VOCAB_DATA.filter(item => {
      // 搜索匹配
      const matchesSearch = !this.searchQuery || 
        item.en.toLowerCase().includes(this.searchQuery) ||
        item.zh.includes(this.searchQuery);
      
      // 标签过滤
      if (!matchesSearch) return false;
      if (this.currentFilter === 'all') return true;
      if (this.currentFilter === 't1') return item.test === 'Test 1';
      if (this.currentFilter === 't2') return item.test === 'Test 2';
      if (this.currentFilter === 'unlearned') {
        return !progress[item.id] || progress[item.id].status === 0;
      }
      if (this.currentFilter === 'learning') {
        return progress[item.id]?.status === 1;
      }
      if (this.currentFilter === 'mastered') {
        return progress[item.id]?.status === 2;
      }
      return true;
    });

    this.vocabListContainer.innerHTML = '';
    if (filtered.length === 0) {
      this.vocabListContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-muted); font-size: 0.9rem;">
          没有匹配的词汇条目
        </div>
      `;
      return;
    }

    filtered.forEach(item => {
      const p = progress[item.id];
      const statusClass = p ? `status-${p.status}` : '';
      const div = document.createElement('div');
      div.className = 'vocab-list-item';
      div.innerHTML = `
        <div class="list-item-left">
          <div class="list-item-en">
            ${item.en}
            <span class="list-item-pos">${item.pos}</span>
          </div>
          <div class="list-item-zh">${item.zh}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="status-badge ${statusClass}"></div>
          <button class="icon-btn list-speak-btn" style="font-size: 1rem;" title="发音">🔊</button>
        </div>
      `;

      // 点击朗读发音 (播放/暂停切换)
      const listSpeakBtn = div.querySelector('.list-speak-btn');
      listSpeakBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        AudioPlayer.toggle(item.en, (isPlaying) => {
          listSpeakBtn.textContent = isPlaying ? '⏸️' : '🔊';
        });
      });

      // 点击切到卡片复习该词
      div.addEventListener('click', () => {
        const idx = this.currentList.findIndex(x => x.id === item.id);
        if (idx !== -1) {
          this.currentIndex = idx;
        } else {
          this.currentList = [...VOCAB_DATA];
          this.currentIndex = this.currentList.findIndex(x => x.id === item.id);
        }
        this.renderCurrentCard();
        this.switchView('flashcard');
      });

      this.vocabListContainer.appendChild(div);
    });
  }

  renderSentences() {
    const container = document.getElementById('sentences-container');
    if (!container) return;

    container.innerHTML = SENTENCE_DATA.map(item => {
      const tokensHtml = item.tokens.map(t => {
        const hl = t.highlight ? 'token-highlight' : '';
        return `
          <div class="token-badge ${hl}" title="${t.desc || ''}">
            <span>${t.text}</span>
            <span class="token-role">${t.role}</span>
          </div>
        `;
      }).join('');

      const notesHtml = item.keyNotes.map(n => `<div class="analysis-item">${n}</div>`).join('');

      return `
        <div class="sentence-card">
          <div class="sentence-header">
            <span class="sentence-tag">${item.test} · ${item.article}</span>
            <button class="icon-btn sentence-read-btn" data-text="${item.raw}">🔊 朗读原句</button>
          </div>
          <div class="tokens-flow">${tokensHtml}</div>
          <div class="sentence-zh-box"><strong>参考译文：</strong>${item.zh}</div>
          <div class="sentence-analysis">
            <div class="analysis-title">考点拆解与语法逻辑</div>
            ${notesHtml}
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.sentence-read-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        AudioPlayer.toggle(btn.dataset.text, (isPlaying) => {
          btn.innerHTML = isPlaying ? '⏸️ 暂停朗读' : '🔊 朗读原句';
        });
      });
    });
  }

  updateStats() {
    const stats = Storage.getStats();
    if (this.statTotal) this.statTotal.textContent = stats.total;
    if (this.statMastered) this.statMastered.textContent = stats.mastered;
    if (this.statLearning) this.statLearning.textContent = stats.learning;
    if (this.statUnlearned) this.statUnlearned.textContent = stats.unlearned;
  }

  initTheme() {
    const saved = localStorage.getItem('itest_theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    this.updateThemeIcon(saved);
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('itest_theme', next);
    this.updateThemeIcon(next);
  }

  updateThemeIcon(theme) {
    if (this.themeToggleBtn) {
      this.themeToggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new VocabApp();
});
