/* ============================================================
   LKPD-HEART.JS — LKPD "Sistem Peredaran Darah" (IPA Kelas 8) versi interaktif
   Cara pakai: muat SETELAH extras-3d.js dan SEBELUM app.js, mis.
     <script src="js/lkpd-heart.js"></script>
   File ini membungkus HeartExperiment.init, jadi file lama tidak perlu diubah
   (kecuali daftar misi di heart-3d.js dan soal di quiz.js yang disesuaikan dengan LKPD).

   Isi (mengikuti lembar LKPD):
     Identitas + Tujuan pembelajaran + Petunjuk + Tahukah kamu
     Aktivitas 1  Kenali komponen darah
     Aktivitas 2  Jelajah jalur darah (beri label 8 bagian)
     Aktivitas 3  Peredaran darah besar & kecil
     Aktivitas 4  Analisis & berpikir kritis (kasus Andi)
     Aktivitas 5  Terapkan dalam kehidupan + Refleksi diri + Tips jantung sehat
   Jawaban tersimpan otomatis di Progress.state.lkpd (localStorage).
   ============================================================ */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const snd = (fn) => { try { if (typeof Sound !== 'undefined' && typeof Sound[fn] === 'function') Sound[fn](); } catch (e) {} };
  const toast = (m, t = 'info') => { try { if (typeof Utils !== 'undefined') Utils.toast(m, t); } catch (e) {} };
  const shuffle = (a) => (typeof Utils !== 'undefined' ? Utils.shuffle(a) : a.slice());

  /* ---------------------------------------------------------- penyimpanan */
  const store = () => {
    if (typeof Progress === 'undefined') return {};
    if (!Progress.state.lkpd) Progress.state.lkpd = {};
    return Progress.state.lkpd;
  };
  const persist = () => { try { Progress.save(); } catch (e) {} };
  const get = (k, d) => { const s = store(); return s[k] === undefined ? d : s[k]; };
  const put = (k, v) => { store()[k] = v; persist(); };
  const getAt = (k, i) => { const o = get(k, {}); return o[i] === undefined ? '' : o[i]; };
  const putAt = (k, i, v) => { const o = get(k, {}); o[i] = v; put(k, o); };
  const mission = (id) => { try { if (typeof Progress !== 'undefined') return Progress.completeMission('heart', id); } catch (e) {} return false; };
  const record = (condition, value) => { try { if (typeof Progress !== 'undefined') Progress.addData('heart', { condition, value }); } catch (e) {} };

  /* ---------------------------------------------------------- DATA (mudah diedit) */
  const TERMS = ['Vena kava', 'Arteri pulmonalis', 'Vena pulmonalis', 'Aorta', 'Serambi kanan', 'Serambi kiri', 'Bilik kanan', 'Bilik kiri'];

  const BLOOD = [
    { id: 'ery', nama: 'Eritrosit', sub: 'sel darah merah', pilihan: 'Mengangkut oksigen (O₂) ke seluruh tubuh dengan bantuan hemoglobin',
      detail: 'Eritrosit berbentuk cakram bikonkaf dan mengandung hemoglobin yang mengikat O₂. Hemoglobin inilah yang membuat darah berwarna merah.' },
    { id: 'leu', nama: 'Leukosit', sub: 'sel darah putih', pilihan: 'Melawan kuman dan penyakit (sistem kekebalan tubuh)',
      detail: 'Leukosit berinti. Sebagian menelan kuman (fagositosis), sebagian lain membentuk antibodi untuk melawan penyakit.' },
    { id: 'tro', nama: 'Trombosit', sub: 'keping darah', pilihan: 'Membantu pembekuan darah saat terjadi luka',
      detail: 'Trombosit adalah kepingan sel kecil. Saat pembuluh luka, trombosit menggumpal dan memicu pembekuan sehingga perdarahan berhenti.' },
    { id: 'pla', nama: 'Plasma Darah', sub: 'bagian cair darah', pilihan: 'Mengangkut sari makanan, hormon, sisa metabolisme, dan sel-sel darah',
      detail: 'Plasma adalah cairan kekuningan (±55% volume darah) yang mengangkut zat makanan, hormon, CO₂, sisa metabolisme, serta sel-sel darah.' }
  ];

  // Nomor 1–8 mengikuti gambar skema: 1-2 jantung kiri (serambi, bilik), 3-4 jantung kanan, 5 pembuluh ke paru-paru, 6 dari paru-paru, 7 ke tubuh, 8 dari tubuh
  const LABELS = [
    { n: 1, name: 'Serambi kiri', key: 'la' },
    { n: 2, name: 'Bilik kiri', key: 'lv' },
    { n: 3, name: 'Serambi kanan', key: 'ra' },
    { n: 4, name: 'Bilik kanan', key: 'rv' },
    { n: 5, name: 'Arteri pulmonalis', key: 'pulm' },
    { n: 6, name: 'Vena pulmonalis', key: 'pv' },
    { n: 7, name: 'Aorta', key: 'aorta' },
    { n: 8, name: 'Vena kava', key: 'svc' }
  ];

  const FLOW_BANK = ['Bilik kanan', 'Bilik kiri', 'Serambi kanan', 'Serambi kiri', 'Arteri pulmonalis', 'Vena pulmonalis', 'Aorta', 'Vena kava', 'Paru-paru', 'Seluruh tubuh'];
  const FLOW = {
    kecil: {
      judul: 'Peredaran Darah Kecil (Pulmonal)',
      steps: ['Bilik kanan', 'Arteri pulmonalis', 'Paru-paru', 'Vena pulmonalis'],
      akhir: 'Serambi kiri',
      fungsi: 'Mengalirkan darah miskin O₂ dari jantung ke paru-paru untuk melepas CO₂ dan mengambil O₂, lalu membawa darah kaya O₂ kembali ke jantung.'
    },
    besar: {
      judul: 'Peredaran Darah Besar (Sistemik)',
      steps: ['Bilik kiri', 'Aorta', 'Seluruh tubuh', 'Vena kava', 'Serambi kanan'],
      akhir: null,
      fungsi: 'Mengalirkan darah kaya O₂ dan sari makanan dari jantung ke seluruh tubuh, lalu membawa darah miskin O₂ (kaya CO₂) kembali ke jantung.'
    }
  };

  const CASE_TEXT = 'Andi sering begadang, jarang berolahraga, dan suka makanan berlemak. Akhir-akhir ini, ia mudah lelah, pusing, dan sesak napas saat naik tangga.';
  const CASE_Q = [
    'Gangguan apa yang mungkin dialami Andi pada sistem peredaran darahnya? Mengapa?',
    'Faktor apa saja yang menyebabkan gangguan tersebut?',
    'Apa yang sebaiknya dilakukan Andi agar sistem peredaran darahnya tetap sehat?'
  ];
  const CASE_A = [
    'Kemungkinan Andi mengalami gangguan jantung dan pembuluh darah, misalnya penyakit jantung koroner (penyempitan arteri koroner oleh plak lemak) atau tekanan darah tinggi. Jantung kurang efisien memompa darah kaya O₂, sehingga tubuh dan otak kekurangan O₂ (lelah, pusing, sesak napas saat naik tangga). Gejala serupa juga dapat muncul pada anemia, jadi Andi perlu memeriksakan diri ke dokter.',
    'Kurang berolahraga, makanan berlemak (kolesterol tinggi), berat badan berlebih, kurang tidur atau sering begadang, stres, dan kemungkinan merokok atau minum alkohol.',
    'Rutin berolahraga minimal 30 menit per hari, makan makanan bergizi seimbang dan mengurangi lemak, cukup minum air putih, tidur cukup dan mengelola stres, menghindari rokok dan alkohol, serta memeriksakan kesehatan ke dokter.'
  ];

  const REFLECT = [
    'Saya memahami komponen darah dan fungsinya.',
    'Saya dapat membedakan peredaran darah kecil dan besar.',
    'Saya dapat menjaga kesehatan sistem peredaran darah.',
    'Saya aktif berdiskusi dalam kelompok.'
  ];

  const TIPS = [
    ['🏃', 'Olahraga teratur', 'minimal 30 menit/hari'],
    ['🥗', 'Konsumsi makanan', 'bergizi seimbang'],
    ['💧', 'Minum air putih', 'yang cukup'],
    ['🌙', 'Kelola stres dan', 'istirahat cukup'],
    ['🚭', 'Hindari rokok dan', 'minuman beralkohol']
  ];

  const GOALS = [
    'Peserta didik dapat menjelaskan komponen penyusun darah dan fungsinya.',
    'Peserta didik dapat menjelaskan peredaran darah kecil dan besar.',
    'Peserta didik dapat menganalisis gangguan pada sistem peredaran darah dan upaya menjaganya.'
  ];
  const STEPS = [
    'Bacalah setiap instruksi dengan teliti.',
    'Kerjakan setiap aktivitas secara berkelompok (3–4 orang).',
    'Diskusikan dan tuliskan jawaban pada tempat yang tersedia.',
    'Presentasikan hasil kerja kelompokmu di depan kelas.'
  ];

  /* ---------------------------------------------------------- gaya */
  function injectStyle() {
    if ($('lkpdHeartStyle')) return;
    const s = document.createElement('style');
    s.id = 'lkpdHeartStyle';
    s.textContent = `
      #lkpdHeartRoot{display:grid;gap:1rem;margin-bottom:1rem}
      .lk-head{display:flex;flex-wrap:wrap;gap:.6rem 1rem;align-items:center;justify-content:space-between}
      .lk-pill{display:inline-block;padding:.2rem .7rem;border-radius:999px;font-size:.74rem;font-weight:700;background:#2563eb;color:#fff;letter-spacing:.02em}
      .lk-pill.o{background:#ea580c}.lk-pill.g{background:#16a34a}.lk-pill.p{background:#7c3aed}.lk-pill.r{background:#dc2626}
      .lk-id{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.5rem;margin-top:.7rem}
      .lk-id label{font-size:.72rem;opacity:.75;display:block;margin-bottom:.15rem}
      .lk-in{width:100%;box-sizing:border-box;padding:.5rem .65rem;border-radius:.6rem;border:1px solid rgba(127,127,127,.35);background:rgba(127,127,127,.08);color:inherit;font:inherit;font-size:.85rem}
      textarea.lk-in{resize:vertical;min-height:3.2rem;line-height:1.4}
      .lk-in:focus{outline:2px solid #3b82f6;outline-offset:1px}
      .lk-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:.8rem;margin-top:.8rem}
      .lk-box{padding:.7rem .85rem;border-radius:.8rem;background:rgba(127,127,127,.09);border:1px solid rgba(127,127,127,.22);font-size:.82rem;line-height:1.45}
      .lk-box h4{margin:0 0 .4rem;font-size:.82rem}
      .lk-box ol,.lk-box ul{margin:0;padding-left:1.1rem}
      .lk-fact{border-color:#f59e0b;background:rgba(245,158,11,.10)}
      .lk-sub{font-size:.82rem;opacity:.85;margin:.2rem 0 .8rem}
      .lk-grid4{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:.7rem}
      .lk-comp{padding:.75rem;border-radius:.85rem;background:rgba(127,127,127,.09);border:1px solid rgba(127,127,127,.22);display:flex;flex-direction:column;gap:.5rem}
      .lk-comp b{font-size:.92rem}.lk-comp small{opacity:.7;display:block;font-size:.72rem}
      .lk-comp svg{width:100%;height:64px;display:block}
      .lk-fb{display:none;font-size:.78rem;line-height:1.4;padding:.45rem .6rem;border-radius:.55rem}
      .lk-fb.show{display:block}
      .lk-fb.ok{background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.5)}
      .lk-fb.bad{background:rgba(239,68,68,.13);border:1px solid rgba(239,68,68,.5)}
      .lk-split{display:grid;grid-template-columns:minmax(240px,360px) 1fr;gap:1rem;align-items:start}
      @media(max-width:720px){.lk-split{grid-template-columns:1fr}}
      .lk-svg{width:100%;height:auto;display:block;border-radius:.8rem;background:rgba(127,127,127,.08);border:1px solid rgba(127,127,127,.22)}
      .lk-img{background:#fff;object-fit:contain}
      .lk-rows{display:grid;gap:.45rem}
      .lk-row{display:grid;grid-template-columns:1.8rem 1fr 1.4rem auto;gap:.45rem;align-items:center}
      .lk-n{display:inline-flex;width:1.7rem;height:1.7rem;border-radius:50%;background:#0f172a;color:#fff;align-items:center;justify-content:center;font-size:.8rem}
      .lk-st{font-weight:800;text-align:center}.lk-st.ok{color:#22c55e}.lk-st.bad{color:#ef4444}
      .lk-row .btn{white-space:nowrap}
      .lk-score{display:inline-block;padding:.15rem .6rem;border-radius:999px;background:rgba(127,127,127,.18);font-size:.78rem;font-weight:700}
      .lk-flow{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem;margin:.5rem 0}
      .lk-flow select{flex:1 1 130px;min-width:120px}
      .lk-flow select.ok{outline:2px solid #22c55e}.lk-flow select.bad{outline:2px solid #ef4444}
      .lk-arrow{font-weight:800;opacity:.7}
      .lk-end{padding:.45rem .7rem;border-radius:.6rem;background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.5);font-size:.82rem;font-weight:600}
      .lk-case{display:flex;gap:.7rem;align-items:flex-start;padding:.7rem .85rem;border-radius:.8rem;background:rgba(245,158,11,.10);border:1px solid #f59e0b;font-size:.86rem;line-height:1.5;margin-bottom:.8rem}
      .lk-case .av{font-size:2rem;line-height:1}
      .lk-q{margin-top:.7rem;font-size:.85rem}.lk-q p{margin:0 0 .3rem;font-weight:600}
      .lk-ans{display:none;margin-top:.35rem;padding:.5rem .65rem;border-radius:.55rem;background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.45);font-size:.78rem;line-height:1.45}
      .lk-ans.show{display:block}
      .lk-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.8rem}
      .lk-habit{display:flex;gap:.5rem;align-items:center;margin-bottom:.45rem}
      .lk-habit span{flex:none;color:#ef4444}
      .lk-ref{display:flex;gap:.55rem;align-items:flex-start;margin:.4rem 0;font-size:.84rem;cursor:pointer}
      .lk-ref input{margin-top:.2rem;width:1.05rem;height:1.05rem;flex:none}
      .lk-tips{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.55rem}
      .lk-tip{padding:.6rem;border-radius:.75rem;background:rgba(127,127,127,.09);border:1px solid rgba(127,127,127,.22);text-align:center;font-size:.78rem;line-height:1.35}
      .lk-tip .e{font-size:1.5rem;display:block;margin-bottom:.2rem}
      .lk-quote{text-align:center;font-style:italic;opacity:.8;font-size:.8rem;margin-top:.8rem}
    `;
    document.head.appendChild(s);
  }

  /* ---------------------------------------------------------- gambar sel darah & skema */
  const CELL_SVG = {
    ery: '<svg viewBox="0 0 120 64" aria-hidden="true"><g><ellipse cx="38" cy="32" rx="26" ry="20" fill="#d62839"/><ellipse cx="38" cy="32" rx="12" ry="8" fill="#a3152a"/></g><g><ellipse cx="84" cy="34" rx="24" ry="19" fill="#e03a4b"/><ellipse cx="84" cy="34" rx="11" ry="7" fill="#b01c31"/></g></svg>',
    leu: '<svg viewBox="0 0 120 64" aria-hidden="true"><circle cx="38" cy="32" r="22" fill="#e9e2f5" stroke="#b9a8e0" stroke-width="2"/><path d="M28 28c4-8 14-8 18 0s-4 14-10 10-8-2-8-10z" fill="#6d4aa8"/><circle cx="86" cy="32" r="18" fill="#f3e6ee" stroke="#d6a3c3" stroke-width="2"/><circle cx="82" cy="30" r="7" fill="#8b3f86"/><circle cx="92" cy="36" r="5" fill="#8b3f86"/></svg>',
    tro: '<svg viewBox="0 0 120 64" aria-hidden="true"><g fill="#b58bd0"><path d="M30 14l5 12 13 1-10 8 4 13-12-7-12 7 4-13-10-8 13-1z"/><path d="M78 10l4 9 10 1-8 6 3 10-9-5-9 5 3-10-8-6 10-1z"/><path d="M96 38l3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z"/></g></svg>',
    pla: '<svg viewBox="0 0 120 64" aria-hidden="true"><ellipse cx="60" cy="32" rx="46" ry="24" fill="#f6d365"/><ellipse cx="60" cy="28" rx="34" ry="14" fill="#fde9a2" opacity=".8"/></svg>'
  };

  // Skema peredaran darah (bentuk mengikuti gambar referensi; nomor 1-8 mengikuti LABELS)
  const SCHEMA_SVG = `
    <svg viewBox="290 40 460 950" class="lk-svg" role="img" aria-label="Skema sistem peredaran darah manusia dengan nomor 1 sampai 8">
      <rect x="290" y="40" width="460" height="950" fill="#fff"/>
      <defs><linearGradient id="lkGrad" x1="432" y1="0" x2="626" y2="0" gradientUnits="userSpaceOnUse"><stop offset=".35" stop-color="#5f9fb8"/><stop offset=".65" stop-color="#e0555a"/></linearGradient></defs>
      <!-- paru-paru -->
      <g fill="#d98a80"><path id="lkLungL" d="M468 62C440 80 428 130 432 170C436 192 470 196 500 190C520 185 522 150 518 110C516 80 495 58 468 62Z"/><path transform="translate(1058 0) scale(-1 1)" d="M468 62C440 80 428 130 432 170C436 192 470 196 500 190C520 185 522 150 518 110C516 80 495 58 468 62Z"/></g>
      <g fill="none" stroke="#5f9fb8" stroke-width="4" stroke-linecap="round"><path d="M446 92C470 76 504 96 498 130C492 164 452 166 448 134C446 112 470 100 484 116C494 130 480 148 464 142"/><path d="M450 150C470 176 500 160 504 136M440 112C436 130 440 150 452 166"/></g><g transform="translate(1058 0) scale(-1 1)"><g fill="none" stroke="#e0555a" stroke-width="4" stroke-linecap="round"><path d="M446 92C470 76 504 96 498 130C492 164 452 166 448 134C446 112 470 100 484 116C494 130 480 148 464 142"/><path d="M450 150C470 176 500 160 504 136M440 112C436 130 440 150 452 166"/></g></g>
      <path d="M432 118H626" stroke="url(#lkGrad)" stroke-width="15" fill="none" opacity=".9"/>
      <!-- kapiler tubuh -->
      <g fill="#5f9fb8"><path d="M305 596 C308 628 335 642 375 642 L482 652 L494 902 C450 905 425 880 405 840 C380 790 372 740 365 700 C335 672 308 640 305 596Z"/></g><g fill="#e0555a" transform="translate(1040 0) scale(-1 1)"><path d="M305 596 C308 628 335 642 375 642 L482 652 L494 902 C450 905 425 880 405 840 C380 790 372 740 365 700 C335 672 308 640 305 596Z"/></g>
      <g fill="#fff"><ellipse cx="370" cy="668" rx="13" ry="5.5" transform="rotate(-24 370 668)"/><ellipse cx="404" cy="668" rx="13" ry="5.5" transform="rotate(-24 404 668)"/><ellipse cx="438" cy="668" rx="13" ry="5.5" transform="rotate(-24 438 668)"/><ellipse cx="371" cy="694" rx="13" ry="5.5" transform="rotate(-24 371 694)"/><ellipse cx="405" cy="694" rx="13" ry="5.5" transform="rotate(-24 405 694)"/><ellipse cx="439" cy="694" rx="13" ry="5.5" transform="rotate(-24 439 694)"/><ellipse cx="387" cy="720" rx="13" ry="5.5" transform="rotate(-24 387 720)"/><ellipse cx="421" cy="720" rx="13" ry="5.5" transform="rotate(-24 421 720)"/><ellipse cx="455" cy="720" rx="13" ry="5.5" transform="rotate(-24 455 720)"/><ellipse cx="383" cy="746" rx="13" ry="5.5" transform="rotate(-24 383 746)"/><ellipse cx="417" cy="746" rx="13" ry="5.5" transform="rotate(-24 417 746)"/><ellipse cx="451" cy="746" rx="13" ry="5.5" transform="rotate(-24 451 746)"/><ellipse cx="403" cy="772" rx="13" ry="5.5" transform="rotate(-24 403 772)"/><ellipse cx="437" cy="772" rx="13" ry="5.5" transform="rotate(-24 437 772)"/><ellipse cx="471" cy="772" rx="13" ry="5.5" transform="rotate(-24 471 772)"/><ellipse cx="398" cy="798" rx="13" ry="5.5" transform="rotate(-24 398 798)"/><ellipse cx="432" cy="798" rx="13" ry="5.5" transform="rotate(-24 432 798)"/><ellipse cx="466" cy="798" rx="13" ry="5.5" transform="rotate(-24 466 798)"/><ellipse cx="418" cy="824" rx="13" ry="5.5" transform="rotate(-24 418 824)"/><ellipse cx="452" cy="824" rx="13" ry="5.5" transform="rotate(-24 452 824)"/><ellipse cx="414" cy="850" rx="13" ry="5.5" transform="rotate(-24 414 850)"/><ellipse cx="448" cy="850" rx="13" ry="5.5" transform="rotate(-24 448 850)"/><ellipse cx="434" cy="876" rx="13" ry="5.5" transform="rotate(-24 434 876)"/><ellipse cx="468" cy="876" rx="13" ry="5.5" transform="rotate(-24 468 876)"/></g><g fill="#fff" transform="translate(1040 0) scale(-1 1)"><ellipse cx="370" cy="668" rx="13" ry="5.5" transform="rotate(-24 370 668)"/><ellipse cx="404" cy="668" rx="13" ry="5.5" transform="rotate(-24 404 668)"/><ellipse cx="438" cy="668" rx="13" ry="5.5" transform="rotate(-24 438 668)"/><ellipse cx="371" cy="694" rx="13" ry="5.5" transform="rotate(-24 371 694)"/><ellipse cx="405" cy="694" rx="13" ry="5.5" transform="rotate(-24 405 694)"/><ellipse cx="439" cy="694" rx="13" ry="5.5" transform="rotate(-24 439 694)"/><ellipse cx="387" cy="720" rx="13" ry="5.5" transform="rotate(-24 387 720)"/><ellipse cx="421" cy="720" rx="13" ry="5.5" transform="rotate(-24 421 720)"/><ellipse cx="455" cy="720" rx="13" ry="5.5" transform="rotate(-24 455 720)"/><ellipse cx="383" cy="746" rx="13" ry="5.5" transform="rotate(-24 383 746)"/><ellipse cx="417" cy="746" rx="13" ry="5.5" transform="rotate(-24 417 746)"/><ellipse cx="451" cy="746" rx="13" ry="5.5" transform="rotate(-24 451 746)"/><ellipse cx="403" cy="772" rx="13" ry="5.5" transform="rotate(-24 403 772)"/><ellipse cx="437" cy="772" rx="13" ry="5.5" transform="rotate(-24 437 772)"/><ellipse cx="471" cy="772" rx="13" ry="5.5" transform="rotate(-24 471 772)"/><ellipse cx="398" cy="798" rx="13" ry="5.5" transform="rotate(-24 398 798)"/><ellipse cx="432" cy="798" rx="13" ry="5.5" transform="rotate(-24 432 798)"/><ellipse cx="466" cy="798" rx="13" ry="5.5" transform="rotate(-24 466 798)"/><ellipse cx="418" cy="824" rx="13" ry="5.5" transform="rotate(-24 418 824)"/><ellipse cx="452" cy="824" rx="13" ry="5.5" transform="rotate(-24 452 824)"/><ellipse cx="414" cy="850" rx="13" ry="5.5" transform="rotate(-24 414 850)"/><ellipse cx="448" cy="850" rx="13" ry="5.5" transform="rotate(-24 448 850)"/><ellipse cx="434" cy="876" rx="13" ry="5.5" transform="rotate(-24 434 876)"/><ellipse cx="468" cy="876" rx="13" ry="5.5" transform="rotate(-24 468 876)"/></g>
      <!-- pembuluh -->
      <g fill="none" stroke-linejoin="round">
        <path d="M318 630V360" stroke="#5f9fb8" stroke-width="22"/>
        <path d="M318 366Q318 326 346 326H470M318 366Q320 362 346 362H470" stroke="#5f9fb8" stroke-width="16"/>
        <path d="M530 340V292Q530 268 506 268H392Q370 268 370 246V142Q370 118 394 118H436" stroke="#5f9fb8" stroke-width="22"/>
        <path d="M548 340V288Q548 262 574 262H700Q725 262 725 288V630" stroke="#e0555a" stroke-width="22"/>
        <path d="M678 222V304" stroke="#fff" stroke-width="30"/>
        <path d="M626 118H656Q678 118 678 142V306Q678 328 656 328H570" stroke="#e0555a" stroke-width="22"/>
      </g>
      <g fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M398 111l8 7-8 7M398 319l8 7-8 7M398 355l8 7-8 7M574 256l8 6-8 6M640 322l-8 6 8 6M671 195l7 8 7-8M718 440l7 8 7-8"/>
      </g>
      <!-- tubuh manusia -->
      <g fill="#cdb995"><circle cx="520" cy="590" r="22"/><rect x="512" y="608" width="16" height="16"/>
        <polygon points="478,628 562,628 568,720 556,722 552,780 488,780 484,722 472,720"/>
        <polygon points="476,632 464,720 472,768 485,768 490,700"/><polygon points="564,632 576,720 568,768 555,768 550,700"/>
        <rect x="488" y="776" width="28" height="140"/><rect x="524" y="776" width="28" height="140"/></g>
      <!-- jantung -->
      <path d="M520 316C470 300 420 340 422 400C425 460 470 506 540 512C600 506 626 450 620 395C615 340 580 304 520 316Z" fill="#d98079"/>
      <path d="M472 326C440 340 428 375 432 405C438 450 480 490 548 494L552 470C535 440 528 400 525 340C510 330 490 322 472 326Z" fill="#5f9fb8"/>
      <path d="M528 340C560 320 590 330 605 365C618 410 608 465 585 490C575 500 560 497 552 492C548 440 530 400 528 340Z" fill="#e0555a"/>
      <g fill="none" stroke="#c4474b" stroke-width="3" stroke-linecap="round"><path d="M436 392C455 384 475 376 490 376C476 388 460 398 446 402M528 340C534 400 548 450 552 492M575 332C586 350 600 358 604 372M572 376H596"/></g>
      <circle cx="590" cy="352" r="14" fill="#0f172a" stroke="#fff" stroke-width="2.5"/><text x="590" y="357.5" text-anchor="middle" font-size="16" font-weight="800" fill="#fff">1</text><circle cx="584" cy="432" r="14" fill="#0f172a" stroke="#fff" stroke-width="2.5"/><text x="584" y="437.5" text-anchor="middle" font-size="16" font-weight="800" fill="#fff">2</text><circle cx="474" cy="364" r="14" fill="#0f172a" stroke="#fff" stroke-width="2.5"/><text x="474" y="369.5" text-anchor="middle" font-size="16" font-weight="800" fill="#fff">3</text><circle cx="492" cy="444" r="14" fill="#0f172a" stroke="#fff" stroke-width="2.5"/><text x="492" y="449.5" text-anchor="middle" font-size="16" font-weight="800" fill="#fff">4</text><circle cx="370" cy="200" r="14" fill="#0f172a" stroke="#fff" stroke-width="2.5"/><text x="370" y="205.5" text-anchor="middle" font-size="16" font-weight="800" fill="#fff">5</text><circle cx="678" cy="200" r="14" fill="#0f172a" stroke="#fff" stroke-width="2.5"/><text x="678" y="205.5" text-anchor="middle" font-size="16" font-weight="800" fill="#fff">6</text><circle cx="725" cy="420" r="14" fill="#0f172a" stroke="#fff" stroke-width="2.5"/><text x="725" y="425.5" text-anchor="middle" font-size="16" font-weight="800" fill="#fff">7</text><circle cx="318" cy="480" r="14" fill="#0f172a" stroke="#fff" stroke-width="2.5"/><text x="318" y="485.5" text-anchor="middle" font-size="16" font-weight="800" fill="#fff">8</text>
      <rect x="340" y="952" width="20" height="20" fill="#5f9fb8"/><text x="368" y="968" font-size="15" font-weight="700" fill="#334155">Kaya CO₂</text>
      <rect x="520" y="952" width="20" height="20" fill="#e0555a"/><text x="548" y="968" font-size="15" font-weight="700" fill="#334155">Kaya O₂</text>
    </svg>`;

  /* ---------------------------------------------------------- HTML */
  const optionsHtml = (list, val) => '<option value="">Pilih…</option>' +
    list.map((o) => { const v = typeof o === 'string' ? o : o.v, t = typeof o === 'string' ? o : o.t; return `<option value="${esc(v)}"${v === val ? ' selected' : ''}>${esc(t)}</option>`; }).join('');

  const card = (num, color, title, sub, body) => `
    <div class="addon-card">
      <div class="addon-header"><h3 class="addon-title"><span class="lk-pill ${color}">Aktivitas ${num}</span> ${title}</h3></div>
      <div class="lk-sub">${sub}</div>${body}
    </div>`;

  function buildHtml() {
    const idf = (k, label, ph) => `<div><label for="lkId-${k}">${label}</label><input class="lk-in" id="lkId-${k}" data-save="id" data-idx="${k}" placeholder="${ph}" value="${esc(getAt('id', k))}"></div>`;

    const head = `
      <div class="addon-card">
        <div class="addon-header lk-head">
          <h3 class="addon-title"><span class="lk-pill">LKPD</span> Sistem Peredaran Darah · IPA Kelas 8</h3>
        </div>
        <div class="lk-id">${idf('nama', 'Nama', 'Nama lengkap')}${idf('kelas', 'Kelas', 'mis. 8A')}${idf('absen', 'No. Absen', 'mis. 12')}${idf('tanggal', 'Tanggal', 'mis. 15 November 2026')}</div>
        <div class="lk-cols">
          <div class="lk-box"><h4>Tujuan pembelajaran</h4><ul>${GOALS.map((g) => `<li>${g}</li>`).join('')}</ul></div>
          <div class="lk-box"><h4>Petunjuk</h4><ol>${STEPS.map((g) => `<li>${g}</li>`).join('')}</ol></div>
          <div class="lk-box lk-fact"><h4>Tahukah kamu?</h4>Jantung manusia berdetak sekitar 100.000 kali setiap hari dan memompa lebih dari 7.000 liter darah tanpa henti untuk menjaga kita tetap hidup!</div>
        </div>
      </div>`;

    const a1 = card(1, '', 'Kenali komponen darah',
      'Pilih fungsi yang tepat untuk setiap komponen darah. Perhatikan gambar sel pada setiap kartu.',
      `<div class="lk-grid4">${BLOOD.map((b) => `
        <div class="lk-comp">
          <div><b>${b.nama}</b><small>${b.sub}</small></div>
          ${CELL_SVG[b.id]}
          <select class="select-input" data-comp="${b.id}" aria-label="Fungsi ${b.nama}">${optionsHtml(shuffle(BLOOD).map((x) => ({ v: x.id, t: x.pilihan })), getAt('comp', b.id))}</select>
          <div class="lk-fb" id="lkCompFb-${b.id}" aria-live="polite"></div>
        </div>`).join('')}</div>`);

    const a2 = card(2, 'o', 'Jelajah jalur darah',
      'Perhatikan skema peredaran darah, lalu tentukan nama bagian untuk setiap nomor. <span class="lk-score" id="lkLabScore">0/8</span>',
      `<div class="lk-split">
        ${SCHEMA_SVG}
        <div class="lk-rows">${LABELS.map((L) => `
          <div class="lk-row">
            <b class="lk-n">${L.n}</b>
            <select class="select-input" data-lab="${L.n}" aria-label="Nama bagian nomor ${L.n}">${optionsHtml(TERMS, getAt('label', L.n))}</select>
            <span class="lk-st" id="lkLabSt${L.n}" aria-hidden="true"></span>
            <button type="button" class="btn btn-secondary btn-sm" id="lkLab3d${L.n}" data-act="3d" data-key="${L.key}" style="display:none">Lihat di 3D</button>
          </div>`).join('')}
          <div class="lk-sub" style="margin:.3rem 0 0">Jika benar, tombol <b>Lihat di 3D</b> muncul untuk menyorot bagian itu pada model jantung.</div>
        </div>
      </div>`);

    const flowBlock = (k) => {
      const F = FLOW[k], saved = get('flow_' + k, {});
      return `
        <div class="lk-box" style="margin-bottom:.8rem">
          <h4>${F.judul}</h4>
          <div class="lk-flow">${F.steps.map((_, i) => `${i ? '<span class="lk-arrow">→</span>' : ''}<select class="select-input" data-flow="${k}" data-i="${i}" aria-label="${F.judul} langkah ${i + 1}">${optionsHtml(FLOW_BANK, saved[i] || '')}</select>`).join('')}
            ${F.akhir ? `<span class="lk-arrow">→</span><span class="lk-end">${F.akhir}</span>` : ''}</div>
          <button type="button" class="btn btn-primary btn-sm" data-act="flow" data-k="${k}">Periksa urutan</button>
          <div class="lk-fb" id="lkFlowFb-${k}" aria-live="polite" style="margin-top:.5rem"></div>
          <div class="lk-q"><p>Fungsi:</p><textarea class="lk-in" data-save="fungsi" data-idx="${k}" placeholder="Tuliskan fungsi peredaran darah ini dengan kata-katamu sendiri">${esc(getAt('fungsi', k))}</textarea></div>
        </div>`;
    };
    const a3 = card(3, 'g', 'Peredaran darah besar &amp; kecil',
      'Tuliskan alur peredaran darah kecil dan peredaran darah besar pada bagan berikut.', flowBlock('kecil') + flowBlock('besar'));

    const a4 = card(4, 'p', 'Analisis &amp; berpikir kritis', 'Bacalah situasi berikut, kemudian jawablah pertanyaan di bawahnya!',
      `<div class="lk-case"><span class="av" aria-hidden="true">🧑</span><div>${CASE_TEXT}</div></div>
       ${CASE_Q.map((q, i) => `<div class="lk-q"><p>${i + 1}. ${q}</p><textarea class="lk-in" data-save="case" data-idx="${i}" placeholder="Tulis jawabanmu…">${esc(getAt('case', i))}</textarea><div class="lk-ans" id="lkAns${i}"><b>Contoh jawaban:</b> ${CASE_A[i]}</div></div>`).join('')}
       <div class="lk-actions">
         <button type="button" class="btn btn-secondary btn-sm" data-act="sim">Coba simulasi penyumbatan koroner di model 3D</button>
         <button type="button" class="btn btn-secondary btn-sm" data-act="ans" id="lkAnsBtn">Lihat contoh jawaban</button>
       </div>`);

    const a5 = card(5, 'r', 'Terapkan dalam kehidupan', 'Tuliskan 3 kebiasaan baik yang dapat kamu lakukan untuk menjaga kesehatan sistem peredaran darah!',
      [0, 1, 2].map((i) => `<div class="lk-habit"><span aria-hidden="true">♥</span><input class="lk-in" data-save="habit" data-idx="${i}" placeholder="Kebiasaan ${i + 1}" value="${esc(getAt('habit', i))}"></div>`).join('') +
      `<div class="lk-cols">
        <div class="lk-box"><h4>Refleksi diri</h4><div class="lk-sub" style="margin:0 0 .3rem">Berilah tanda centang (✓) pada pernyataan yang sesuai.</div>
          ${REFLECT.map((r, i) => `<label class="lk-ref"><input type="checkbox" data-ref="${i}"${getAt('reflect', i) ? ' checked' : ''}><span>${r}</span></label>`).join('')}</div>
        <div class="lk-box"><h4>Tips jantung sehat</h4><div class="lk-tips">${TIPS.map(([e, a, b]) => `<div class="lk-tip"><span class="e" aria-hidden="true">${e}</span><b>${a}</b><br>${b}</div>`).join('')}</div></div>
      </div>
      <div class="lk-quote">“Jagalah kesehatan jantungmu, karena dari sanalah kehidupanmu berputar.”</div>`);

    return head + a1 + a2 + a3 + a4 + a5;
  }

  /* ---------------------------------------------------------- logika */
  function evalComp(root, id, notify) {
    const sel = root.querySelector(`[data-comp="${id}"]`), fb = $('lkCompFb-' + id), c = BLOOD.find((b) => b.id === id);
    if (!sel || !fb) return;
    if (!sel.value) { fb.className = 'lk-fb'; fb.innerHTML = ''; return; }
    const ok = sel.value === id;
    fb.className = 'lk-fb show ' + (ok ? 'ok' : 'bad');
    fb.innerHTML = ok ? `<b>Tepat!</b> ${c.detail}` : '<b>Belum tepat.</b> Perhatikan bentuk sel pada gambar, lalu coba pilihan lain.';
    if (notify) snd(ok ? 'success' : 'error');
  }

  function evalLabels(root, notify, changedN) {
    let ok = 0;
    LABELS.forEach((L) => {
      const sel = root.querySelector(`[data-lab="${L.n}"]`), st = $('lkLabSt' + L.n), btn = $('lkLab3d' + L.n);
      const good = sel.value === L.name;
      if (good) ok++;
      st.textContent = !sel.value ? '' : good ? '✓' : '✕';
      st.className = 'lk-st ' + (!sel.value ? '' : good ? 'ok' : 'bad');
      btn.style.display = good ? '' : 'none';
      if (notify && changedN === L.n && sel.value) snd(good ? 'success' : 'error');
    });
    $('lkLabScore').textContent = ok + '/' + LABELS.length;
    if (notify && ok === LABELS.length) {
      if (!get('labelDone', false)) { put('labelDone', true); record('LKPD Aktivitas 2: label jalur darah', '8 dari 8 benar'); }
      mission('m1');
    }
  }

  function evalFlow(root, k, notify) {
    const F = FLOW[k], sels = [...root.querySelectorAll(`[data-flow="${k}"]`)], fb = $('lkFlowFb-' + k);
    let ok = 0;
    sels.forEach((s, i) => {
      const filled = !!s.value, good = s.value === F.steps[i];
      if (good) ok++;
      s.classList.toggle('ok', filled && good); s.classList.toggle('bad', filled && !good);
    });
    const all = ok === F.steps.length;
    fb.className = 'lk-fb show ' + (all ? 'ok' : 'bad');
    fb.innerHTML = all ? `<b>Benar!</b> ${F.fungsi}` : `<b>${ok} dari ${F.steps.length} kotak sudah benar.</b> Ingat: darah miskin O₂ mengalir lewat arteri pulmonalis, sedangkan darah kaya O₂ keluar lewat aorta.`;
    if (notify) {
      snd(all ? 'success' : 'error');
      if (all) {
        if (!get('flowOk_' + k, false)) { put('flowOk_' + k, true); record('LKPD Aktivitas 3: ' + F.judul, 'Urutan benar'); }
        if (get('flowOk_kecil', false) && get('flowOk_besar', false)) mission('m2');
      }
    }
  }

  function bind(root) {
    root.addEventListener('change', (e) => {
      const t = e.target;
      if (t.matches('[data-comp]')) { putAt('comp', t.dataset.comp, t.value); evalComp(root, t.dataset.comp, true); }
      else if (t.matches('[data-lab]')) { putAt('label', t.dataset.lab, t.value); evalLabels(root, true, +t.dataset.lab); }
      else if (t.matches('[data-flow]')) {
        const k = t.dataset.flow, arr = get('flow_' + k, {}); arr[t.dataset.i] = t.value; put('flow_' + k, arr);
        t.classList.remove('ok', 'bad');
      } else if (t.matches('[data-ref]')) { putAt('reflect', t.dataset.ref, t.checked); snd('click'); }
    });
    root.addEventListener('input', (e) => {
      const t = e.target;
      if (t.matches('[data-save]')) putAt(t.dataset.save, t.dataset.idx, t.value);
    });
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'flow') { snd('click'); evalFlow(root, b.dataset.k, true); }
      else if (act === '3d' || act === 'sim') {
        snd('click');
        const run = () => {
          const sc = $('heartScene'); if (sc) sc.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (act === '3d') {
            try { HeartExperiment.select(b.dataset.key); } catch (err) { console.warn(err); }
          } else {
            const sb = $('btnHeartInfarct');
            if (sb) { if (HeartExperiment.state.infarct !== true) sb.click(); }
            else toast('Fitur simulasi penyumbatan belum dimuat.', 'error');
          }
        };
        // LKPD punya menu sendiri: pindah ke jantung dulu, tombol "Kembali" muncul otomatis
        if (typeof App !== 'undefined' && App.jumpTo) App.jumpTo(0, () => setTimeout(run, 350));
        else run();
      } else if (act === 'ans') {
        snd('click');
        const on = !$('lkAns0').classList.contains('show');
        CASE_A.forEach((_, i) => $('lkAns' + i).classList.toggle('show', on));
        b.textContent = on ? 'Sembunyikan contoh jawaban' : 'Lihat contoh jawaban';
      }
    });
  }

  function mount() {
    const host = document.getElementById('lkpdHost') || document.querySelector('#panelHeart .bottom-panel');
    if (!host || $('lkpdHeartRoot')) return;
    injectStyle();
    const root = document.createElement('div');
    root.id = 'lkpdHeartRoot';
    root.innerHTML = buildHtml();
    host.insertBefore(root, host.firstChild);
    bind(root);
    // pulihkan status dari jawaban tersimpan (tanpa notifikasi)
    BLOOD.forEach((b) => evalComp(root, b.id, false));
    evalLabels(root, false);
    ['kecil', 'besar'].forEach((k) => { if (get('flowOk_' + k, false)) evalFlow(root, k, false); });
  }

  /* ---------------------------------------------------------- pasang */
  if (typeof HeartExperiment !== 'undefined') {
    const orig = HeartExperiment.init;
    HeartExperiment.init = function () {
      orig.apply(this, arguments);
      try { mount(); } catch (err) { console.error('[lkpd-heart]', err); }
    };
  }
})();