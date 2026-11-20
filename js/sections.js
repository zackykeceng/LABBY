/* SECTIONS.JS - LKPD dan Kuis sebagai menu tersendiri di beranda
   Keduanya didaftarkan sebagai "eksperimen" nomor 2 (LKPD) dan 3 (Kuis) agar memakai
   navigasi App yang sama. Isinya dipindahkan dari halaman jantung/paru-paru. */

(function () {
  const STYLE_ID = 'sectionsStyle';
  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = `
      .qz-block { margin-top: var(--space-6, 1.5rem); }
      .qz-block:first-child { margin-top: 0; }
      .qz-title { font-family: var(--font-display, inherit); font-weight: 700; font-size: 1.25rem; margin: 0 0 .75rem; letter-spacing: -0.02em; }
      .return-pill {
        position: fixed; left: 16px; bottom: 16px; z-index: 900; display: none; align-items: center; gap: .4rem;
        padding: .7rem 1.1rem; border: 0; border-radius: 999px; cursor: pointer;
        background: #0b1418; color: #fff; font: 700 .95rem/1 var(--font-body, inherit);
        box-shadow: 0 10px 28px -10px rgba(0,0,0,.55);
      }
      .return-pill:hover { transform: translateY(-2px); }
      .return-pill:focus-visible { outline: 3px solid #bdb0ff; outline-offset: 3px; }
    `;
    document.head.appendChild(st);
  }

  // Memindahkan elemen yang sudah dirender oleh eksperimen lain ke panel baru
  function moveInto(host, id, title) {
    const el = document.getElementById(id);
    if (!host || !el) return;
    if (title) {
      const wrap = document.createElement('section');
      wrap.className = 'qz-block';
      const h = document.createElement('h3');
      h.className = 'qz-title';
      h.textContent = title;
      wrap.appendChild(h);
      wrap.appendChild(el);
      host.appendChild(wrap);
    } else {
      host.appendChild(el);
    }
  }

  window.LkpdSection = {
    state: {},
    render() {
      injectStyle();
      // Daftar misi jantung (Aktivitas 2, 3 dan kuis) ikut pindah ke sini
      moveInto(document.getElementById('lkpdHost'), 'missionHeart');
    },
    setVisible() {}
  };

  window.QuizSection = {
    state: {},
    render() {
      injectStyle();
      const host = document.getElementById('quizHost');
      moveInto(host, 'quizHeart', 'Jantung dan peredaran darah');
      moveInto(host, 'quizLungs', 'Sistem pernapasan');
    },
    setVisible() {}
  };
})();
