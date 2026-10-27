/**
 * LocalStorage 记忆状态管理
 * 状态定义:
 * 0: 新词/未复习 (new)
 * 1: 模糊/待复习 (learning)
 * 2: 已掌握 (mastered)
 */
const Storage = {
  KEY_PROGRESS: 'itest_vocab_progress',
  KEY_FAVORITES: 'itest_vocab_favorites',
  KEY_SETTINGS: 'itest_vocab_settings',

  getProgress() {
    try {
      const data = localStorage.getItem(this.KEY_PROGRESS);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  },

  setStatus(id, status) {
    const progress = this.getProgress();
    progress[id] = {
      status, // 0, 1, 2
      lastReviewed: Date.now(),
      reviewCount: (progress[id]?.reviewCount || 0) + 1
    };
    try {
      localStorage.setItem(this.KEY_PROGRESS, JSON.stringify(progress));
    } catch (e) {
      console.warn('Storage failed', e);
    }
  },

  getFavorites() {
    try {
      const data = localStorage.getItem(this.KEY_FAVORITES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  toggleFavorite(id) {
    const favs = this.getFavorites();
    const idx = favs.indexOf(id);
    if (idx > -1) {
      favs.splice(idx, 1);
    } else {
      favs.push(id);
    }
    localStorage.setItem(this.KEY_FAVORITES, JSON.stringify(favs));
    return idx === -1;
  },

  getStats() {
    const progress = this.getProgress();
    let mastered = 0;
    let learning = 0;
    let total = VOCAB_DATA.length;

    VOCAB_DATA.forEach(item => {
      const p = progress[item.id];
      if (p) {
        if (p.status === 2) mastered++;
        else if (p.status === 1) learning++;
      }
    });

    const unlearned = total - mastered - learning;
    return { total, mastered, learning, unlearned };
  },

  resetProgress() {
    localStorage.removeItem(this.KEY_PROGRESS);
  }
};
