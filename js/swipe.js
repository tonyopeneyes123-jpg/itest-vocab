/**
 * 手机触控交互与卡片滑动反馈
 * 左右滑动：带触感阻尼与复习意图反馈 (左滑忘记，右滑掌握)
 * 上滑：翻转卡片
 */
function setupCardGesture(element, callbacks) {
  const { onRateHard, onRateEasy, onFlip } = callbacks;

  let touchStartX = 0;
  let touchStartY = 0;
  let currentX = 0;
  let isDragging = false;
  const threshold = 80; // 触发判定的水平滑动距离

  // 动态创建指示浮层 (左滑显示红色的“忘记”，右滑显示绿色的“掌握”)
  let badgeLeft = document.getElementById('swipe-indicator-left');
  let badgeRight = document.getElementById('swipe-indicator-right');

  if (!badgeLeft) {
    badgeLeft = document.createElement('div');
    badgeLeft.id = 'swipe-indicator-left';
    badgeLeft.className = 'swipe-indicator indicator-hard';
    badgeLeft.innerHTML = '<span>❌ 忘记 / 重学</span>';
    element.appendChild(badgeLeft);
  }

  if (!badgeRight) {
    badgeRight = document.createElement('div');
    badgeRight.id = 'swipe-indicator-right';
    badgeRight.className = 'swipe-indicator indicator-easy';
    badgeRight.innerHTML = '<span>✔️ 已掌握</span>';
    element.appendChild(badgeRight);
  }

  const cardInner = element.querySelector('.flashcard');

  element.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    currentX = touchStartX;
    isDragging = true;
    if (cardInner) {
      cardInner.style.transition = 'none';
    }
  }, { passive: true });

  element.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    currentX = e.touches[0].clientX;
    const diffX = currentX - touchStartX;
    const diffY = e.touches[0].clientY - touchStartY;

    // 如果水平移动显著大于垂直移动，产生卡片跟手拖拽效果与徽标透明度变化
    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (cardInner) {
        const rotate = diffX * 0.05;
        cardInner.style.transform = `translateX(${diffX}px) rotate(${rotate}deg)`;
      }

      const opacity = Math.min(Math.abs(diffX) / threshold, 1);
      if (diffX < 0) {
        // 向左拖动 -> 忘记
        badgeLeft.style.opacity = opacity;
        badgeRight.style.opacity = 0;
      } else {
        // 向右拖动 -> 掌握
        badgeRight.style.opacity = opacity;
        badgeLeft.style.opacity = 0;
      }
    }
  }, { passive: true });

  element.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    isDragging = false;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    // 恢复卡片与徽章过渡效果
    if (cardInner) {
      cardInner.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    }
    badgeLeft.style.opacity = 0;
    badgeRight.style.opacity = 0;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      // 水平滑动达到判定阈值
      if (diffX < -threshold) {
        // 向左滑 -> 判定为“忘记/重学”并切入下一词
        if (cardInner) {
          cardInner.style.transform = `translateX(-120%) rotate(-15deg)`;
          setTimeout(() => {
            cardInner.style.transform = '';
            if (onRateHard) onRateHard();
          }, 200);
        } else if (onRateHard) {
          onRateHard();
        }
      } else if (diffX > threshold) {
        // 向右滑 -> 判定为“已掌握”并切入下一词
        if (cardInner) {
          cardInner.style.transform = `translateX(120%) rotate(15deg)`;
          setTimeout(() => {
            cardInner.style.transform = '';
            if (onRateEasy) onRateEasy();
          }, 200);
        } else if (onRateEasy) {
          onRateEasy();
        }
      } else {
        // 未达阈值回弹
        if (cardInner) {
          cardInner.style.transform = '';
        }
      }
    } else {
      // 垂直向上滑动 -> 翻转卡片
      if (diffY < -50 && onFlip) {
        onFlip();
      }
      if (cardInner) {
        cardInner.style.transform = '';
      }
    }
  }, { passive: true });
}
