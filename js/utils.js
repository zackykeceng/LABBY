const Utils = {
  el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  },
  toast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    if (typeof Sound !== 'undefined' && Sound.enabled) {
      if (type === 'success') Sound.success();
      else if (type === 'error') Sound.error();
      else Sound.info();
    }
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const toast = this.el(`
      <div class="toast ${type}" role="status" aria-live="polite">
        <span aria-hidden="true">${icons[type] || 'ℹ'}</span>
        <span>${message}</span>
      </div>
    `);
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideInRight 0.3s ease-out reverse';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },
  modal({ emoji = '🎉', title = 'Hebat!', text = '', onClose }) {
    const overlay = document.getElementById('modalOverlay');
    document.getElementById('modalEmoji').textContent = emoji;
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalText').textContent = text;
    const btn = document.getElementById('modalBtn');
    const closeBtn = document.getElementById('modalClose');
    const newBtn = btn.cloneNode(true);
    const newClose = closeBtn.cloneNode(true);
    btn.replaceWith(newBtn); closeBtn.replaceWith(newClose);
    const close = () => {
      overlay.classList.remove('show');
      if (typeof Sound !== 'undefined') Sound.click();
      overlay.onclick = null;
      if (onClose) onClose();
    };
    newBtn.onclick = close;
    newClose.onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
    overlay.classList.add('show');
    if (typeof Sound !== 'undefined') Sound.fanfare();
  },
  random(min, max) { return Math.random() * (max - min) + min; },
  lerp(a, b, t) { return a + (b - a) * t; },
  clamp(v, min, max) { return Math.min(Math.max(v, min), max); },
  throttle(fn, limit = 100) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },
  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
};