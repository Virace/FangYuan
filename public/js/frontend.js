/******/ (() => { // webpackBootstrap
/*!****************************!*\
  !*** ./src/js/frontend.js ***!
  \****************************/
/**
 * 方圆主题前台 JavaScript
 * 为网站前台添加交互功能
 */

// 当 DOM 加载完成后执行
document.addEventListener('DOMContentLoaded', function () {
  console.log('方圆主题前台脚本已加载');

  // 添加主题标识到页面
  addThemeIdentifier();

  // 初始化平滑滚动
  initSmoothScroll();

  // 初始化按钮交互效果
  initButtonEffects();

  // 初始化移动端菜单（如果需要）
  initMobileMenu();
});

/**
 * 添加主题标识
 */
function addThemeIdentifier() {
  // 在页面底部添加主题标识
  const themeId = document.createElement('div');
  themeId.className = 'fangyuan-theme-identifier';
  themeId.innerHTML = '🎨 Powered by 方圆主题';
  themeId.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #007cba, #005a87);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 12px;
        z-index: 1000;
        opacity: 0.8;
        transition: opacity 0.3s ease;
    `;

  // 鼠标悬停效果
  themeId.addEventListener('mouseenter', function () {
    this.style.opacity = '1';
  });
  themeId.addEventListener('mouseleave', function () {
    this.style.opacity = '0.8';
  });
  document.body.appendChild(themeId);
}

/**
 * 初始化平滑滚动
 */
function initSmoothScroll() {
  // 为所有内部链接添加平滑滚动
  const links = document.querySelectorAll('a[href^="#"]');
  links.forEach(link => {
    link.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

/**
 * 初始化按钮交互效果
 */
function initButtonEffects() {
  // 为所有按钮添加点击波纹效果
  const buttons = document.querySelectorAll('.wp-element-button, .wp-block-button__link, button');
  buttons.forEach(button => {
    button.addEventListener('click', function (e) {
      // 创建波纹效果
      const ripple = document.createElement('span');
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(255, 255, 255, 0.5);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s ease-out;
                pointer-events: none;
            `;

      // 确保按钮有相对定位
      if (getComputedStyle(this).position === 'static') {
        this.style.position = 'relative';
      }
      this.style.overflow = 'hidden';
      this.appendChild(ripple);

      // 动画结束后移除元素
      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  });

  // 添加波纹动画的CSS
  if (!document.querySelector('#fangyuan-ripple-styles')) {
    const style = document.createElement('style');
    style.id = 'fangyuan-ripple-styles';
    style.textContent = `
            @keyframes ripple {
                to {
                    transform: scale(2);
                    opacity: 0;
                }
            }
        `;
    document.head.appendChild(style);
  }
}

/**
 * 初始化移动端菜单
 */
function initMobileMenu() {
  // 检查是否有导航菜单
  const nav = document.querySelector('.wp-block-navigation, nav');
  if (!nav) return;

  // 在小屏幕上添加菜单切换功能
  const mediaQuery = window.matchMedia('(max-width: 768px)');
  function handleMobileMenu(e) {
    if (e.matches) {
      // 移动端逻辑
      console.log('移动端模式');
    } else {
      // 桌面端逻辑
      console.log('桌面端模式');
    }
  }
  mediaQuery.addListener(handleMobileMenu);
  handleMobileMenu(mediaQuery);
}

/**
 * 工具函数：节流
 */
function throttle(func, limit) {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 工具函数：防抖
 */
function debounce(func, delay) {
  let timeoutId;
  return function () {
    const context = this;
    const args = arguments;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(context, args), delay);
  };
}

// 全局函数：供外部调用
window.fangyuanTheme = {
  version: '1.0.0',
  showInfo: function () {
    alert('方圆主题 v1.0.0 - 前台脚本运行中');
  },
  scrollToTop: function () {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
};

// 页面滚动时的效果（节流处理）
window.addEventListener('scroll', throttle(function () {
  const scrolled = window.pageYOffset;
  const rate = scrolled * -0.5;

  // 视差效果示例（如果页面有相应元素）
  const parallaxElements = document.querySelectorAll('.fangyuan-parallax');
  parallaxElements.forEach(el => {
    el.style.transform = `translateY(${rate}px)`;
  });
}, 16)); // ~60fps
/******/ })()
;
//# sourceMappingURL=frontend.js.map