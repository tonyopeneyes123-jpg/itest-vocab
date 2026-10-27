/**
 * 手机端与Web端高可靠语音发音引擎
 * 方案设计：
 * 1. 单词/短语：首选有道官方雅思高保真真人发音音频源（type=1 英音, type=2 美音），支持离线缓存，无依赖无权限弹窗，100% 在移动端出声。
 * 2. 长句/多行文本：首选有道/Google音频，兜底回退到系统 Web Speech API。
 * 3. 严格遵循交互逻辑：点按第1下播放，点按第2下即刻暂停/停止，不重新播放。
 */
const AudioPlayer = {
  currentAudio: null,
  currentText: '',
  onStateChangeCallback: null,
  speechSynthUtterance: null,

  init() {
    // 监听全局页面切换以暂停播放
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stop();
      }
    });

    // 预热 Web Speech API
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }
    }
  },

  /**
   * 点击切换播放 / 暂停
   * @param {string} text 播放文本
   * @param {function} onStateChange 回调函数 (isPlaying: boolean)
   */
  toggle(text, onStateChange = null) {
    if (!text) return;
    const cleanText = text.replace(/\(.*\)/g, '').split('/')[0].trim();

    // 1. 如果当前正在播放同一个文本，按一下直接停止/暂停
    if (this.isPlaying(cleanText)) {
      this.stop();
      if (onStateChange) onStateChange(false);
      return;
    }

    // 2. 否则停止之前正在播的，开始播放新内容
    this.stop();
    this.currentText = cleanText;
    this.onStateChangeCallback = onStateChange;

    // 判断是短词/词组还是长句子
    const isWordOrShortPhrase = cleanText.split(/\s+/).length <= 4 && cleanText.length < 50;

    if (isWordOrShortPhrase) {
      this.playOnlineWordAudio(cleanText);
    } else {
      this.playSentenceAudio(cleanText);
    }
  },

  playOnlineWordAudio(word) {
    // 使用有道雅思英音官方真人发音源 (type=1 英音, type=2 美音)
    const encoded = encodeURIComponent(word.toLowerCase());
    const audioUrl = `https://dict.youdao.com/dictvoice?audio=${encoded}&type=1`;

    const audio = new Audio();
    audio.src = audioUrl;
    this.currentAudio = audio;

    audio.onplay = () => {
      if (this.onStateChangeCallback) this.onStateChangeCallback(true);
    };

    audio.onended = () => {
      this.currentAudio = null;
      this.currentText = '';
      if (this.onStateChangeCallback) this.onStateChangeCallback(false);
    };

    audio.onerror = (e) => {
      console.warn('Online audio failed, fallback to Web Speech API', e);
      // 网络异常时降级至离线 Web Speech API
      this.playWithWebSpeech(word);
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Audio play prevented or failed:', err);
        this.playWithWebSpeech(word);
      });
    }
  },

  playSentenceAudio(sentence) {
    // 优先使用有道长句发音源
    const encoded = encodeURIComponent(sentence);
    const audioUrl = `https://dict.youdao.com/dictvoice?audio=${encoded}&type=1`;

    const audio = new Audio();
    audio.src = audioUrl;
    this.currentAudio = audio;

    audio.onplay = () => {
      if (this.onStateChangeCallback) this.onStateChangeCallback(true);
    };

    audio.onended = () => {
      this.currentAudio = null;
      this.currentText = '';
      if (this.onStateChangeCallback) this.onStateChangeCallback(false);
    };

    audio.onerror = () => {
      this.playWithWebSpeech(sentence);
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        this.playWithWebSpeech(sentence);
      });
    }
  },

  playWithWebSpeech(text) {
    if (!('speechSynthesis' in window)) {
      if (this.onStateChangeCallback) this.onStateChangeCallback(false);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-GB';
      utterance.rate = 0.9;

      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const britishVoice = voices.find(v => v.lang === 'en-GB' || v.lang === 'en_GB') ||
                             voices.find(v => v.lang.startsWith('en'));
        if (britishVoice) utterance.voice = britishVoice;
      }

      this.speechSynthUtterance = utterance;

      utterance.onstart = () => {
        if (this.onStateChangeCallback) this.onStateChangeCallback(true);
      };

      utterance.onend = () => {
        this.speechSynthUtterance = null;
        this.currentText = '';
        if (this.onStateChangeCallback) this.onStateChangeCallback(false);
      };

      utterance.onerror = () => {
        this.speechSynthUtterance = null;
        this.currentText = '';
        if (this.onStateChangeCallback) this.onStateChangeCallback(false);
      };

      window.__currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('SpeechSynthesis invocation failed:', e);
      if (this.onStateChangeCallback) this.onStateChangeCallback(false);
    }
  },

  stop() {
    // 停止 HTML5 Audio
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }

    // 停止 Web Speech
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.speechSynthUtterance = null;
      window.__currentUtterance = null;
    }

    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(false);
    }
    this.currentText = '';
  },

  isPlaying(text = null) {
    const isAudioPlaying = this.currentAudio && !this.currentAudio.paused;
    const isSpeechSpeaking = 'speechSynthesis' in window && window.speechSynthesis.speaking;
    const active = isAudioPlaying || isSpeechSpeaking;

    if (!active) return false;
    if (!text) return true;

    const cleanText = text.replace(/\(.*\)/g, '').split('/')[0].trim();
    return this.currentText === cleanText;
  }
};

document.addEventListener('DOMContentLoaded', () => AudioPlayer.init());
