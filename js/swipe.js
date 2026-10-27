/**
 * 手机触控滑动手势监听
 */
function setupSwipe(element, onSwipeLeft, onSwipeRight, onSwipeUp) {
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;
  const minDistance = 50; // 最小滑动像素阈值

  element.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  element.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleGesture();
  }, { passive: true });

  function handleGesture() {
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      // 水平滑动
      if (Math.abs(diffX) > minDistance) {
        if (diffX < 0 && onSwipeLeft) onSwipeLeft();
        else if (diffX > 0 && onSwipeRight) onSwipeRight();
      }
    } else {
      // 垂直滑动
      if (Math.abs(diffY) > minDistance) {
        if (diffY < 0 && onSwipeUp) onSwipeUp();
      }
    }
  }
}
