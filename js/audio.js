/**
 * 手机与Web原生语音发音引擎 (Web Speech API)
 * 解决问题：
 * 1. 偶发无声音 / 延迟很久才出声（浏览器垃圾回收与假死 bug）
 * 2. 交互逻辑改为：按一下播放，再按一下暂停，而不是重新从头播放
 */
const AudioPlayer = {
  voice: null,
  lang: 'en-GB', // 雅思官方首选英音
  currentUtterance: null,
  currentText: '',
  activeListener: null, // 当前正在播放的回调通知

  init() {
    if (!('speechSynthesis' in window)) return;
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;
      // 优先英音，次选美音，最后任意英语
      this.voice = voices.find(v => v.lang === 'en-GB') ||
                   voices.find(v => v.lang === 'en-US') ||
                   voices.find(v => v.lang.startsWith('en')) ||
                   voices[0];
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // 处理移动端后台切换后唤醒
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && window.speechSynthesis) {
        this.stop();
      }
    });
  },

  /**
   * 核心播放/暂停控制逻辑
   * @param {string} text - 朗读文本
   * @param {function} onStateChange - 状态变更回调 (isPlaying: boolean)
   */
  toggle(text, onStateChange = null) {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      return;
    }

    const cleanText = text.replace(/\(.*\)/g, '').split('/')[0].trim();

    // 1. 如果正在朗读同一个文本 -> 执行暂停/取消
    if (window.speechSynthesis.speaking && this.currentText === cleanText) {
      this.stop();
      if (onStateChange) onStateChange(false);
      return;
    }

    // 2. 如果正在播放别的，先彻底停止
    this.stop();

    // 3. 开始新的朗读
    this.play(cleanText, onStateChange);
  },

  play(cleanText, onStateChange) {
    // 关键修复 1：Chrome / Android Webview 中 speechSynthesis 假死时调用 resume 唤醒
    window.speechSynthesis.resume();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = this.lang;
    if (this.voice) utterance.voice = this.voice;
    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    this.currentUtterance = utterance;
    this.currentText = cleanText;

    utterance.onstart = () => {
      if (onStateChange) onStateChange(true);
    };

    utterance.onend = () => {
      this.currentUtterance = null;
      this.currentText = '';
      if (onStateChange) onStateChange(false);
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      this.currentUtterance = null;
      this.currentText = '';
      if (onStateChange) onStateChange(false);
    };

    // 关键修复 2：防止垃圾回收器在长文本或异步时回收 utterance 对象
    window.__currentUtterance = utterance;

    window.speechSynthesis.speak(utterance);
  },

  stop() {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    this.currentUtterance = null;
    this.currentText = '';
    window.__currentUtterance = null;
  },

  isPlaying(text = null) {
    if (!('speechSynthesis' in window)) return false;
    if (!window.speechSynthesis.speaking) return false;
    if (!text) return true;
    const cleanText = text.replace(/\(.*\)/g, '').split('/')[0].trim();
    return this.currentText === cleanText;
  }
};

document.addEventListener('DOMContentLoaded', () => AudioPlayer.init());
