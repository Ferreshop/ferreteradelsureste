/* =========================================================
   FASE 1 — MEJORAS DE CONVERSIÓN
   Ferreteral del Sureste
   No reemplaza el carrito ni la lógica existente.
   ========================================================= */
(function () {
  'use strict';

  const KEY_FAV = 'fds_favoritos_v1';
  const KEY_VIEW = 'fds_vistos_v1';
  const KEY_CLICKS = 'fds_clicks_v1';

  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch (_) { return fallback; }
  };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  let favoritos = read(KEY_FAV, []);
  let vistos = read(KEY_VIEW, []);
  let clicks = read(KEY_CLICKS, {});

  const css = `
    .fase1-popular-badge{position:absolute;top:10px;left:10px;z-index:8;background:#111;color:#fff;padding:5px 9px;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:.3px;box-shadow:0 4px 10px rgba(0,0,0,.18)}
    .fase1-fav{position:absolute;top:9px;right:9px;z-index:9;width:38px;height:38px;border:0;border-radius:50%;background:#fff;color:#6b7280;box-shadow:0 5px 15px rgba(0,0,0,.14);cursor:pointer;font-size:17px;transition:.2s}
    .fase1-fav:hover{transform:scale(1.08);color:#ff6600}
    .fase1-fav.active{color:#ff6600}
    .fase1-buy-now{width:100%;margin-top:7px;border:0;border-radius:10px;padding:10px 12px;background:linear-gradient(135deg,#ff8c00,#ff5500);color:#fff;font-weight:800;cursor:pointer;transition:.2s;font-size:13px}
    .fase1-buy-now:hover{transform:translateY(-2px);box-shadow:0 8px 18px rgba(255,102,0,.25)}
    .fase1-section{max-width:1250px;margin:34px auto;padding:0 12px}
    .fase1-section h2{font-size:24px;margin-bottom:15px}
    .fase1-strip{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .fase1-mini-card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:12px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:.2s}
    .fase1-mini-card:hover{transform:translateY(-3px);box-shadow:0 10px 24px rgba(0,0,0,.08)}
    .fase1-mini-card img{width:58px;height:58px;object-fit:contain;border-radius:9px;background:#f8f9fa}
    .fase1-mini-card strong{display:block;font-size:13px;line-height:1.25}
    .fase1-mini-card small{display:block;margin-top:4px;color:#6b7280;font-size:11px}
    body.dark-mode .fase1-fav,body.dark-mode .fase1-mini-card{background:#161b22;color:#f0f6fc;border-color:#30363d}
    @media(max-width:600px){.fase1-strip{grid-template-columns:1fr}.fase1-section h2{font-size:20px}}
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  function productId(card) {
    const title = card.querySelector('.product-title,h3,h4')?.textContent?.trim() || '';
    const img = card.querySelector('img')?.src || '';
    return btoa(unescape(encodeURIComponent(title + '|' + img))).slice(0, 80);
  }

  function productTitle(card) {
    return card.querySelector('.product-title,h3,h4')?.textContent?.trim() || 'Producto';
  }

  function registerView(card) {
    const id = productId(card);
    const item = { id, title: productTitle(card), image: card.querySelector('img')?.src || '' };
    vistos = [item, ...vistos.filter(x => x.id !== id)].slice(0, 8);
    write(KEY_VIEW, vistos);
  }

  function addFavorite(card, button) {
    const id = productId(card);
    const item = { id, title: productTitle(card), image: card.querySelector('img')?.src || '' };
    const exists = favoritos.some(x => x.id === id);
    favoritos = exists ? favoritos.filter(x => x.id !== id) : [item, ...favoritos];
    write(KEY_FAV, favoritos);
    button.classList.toggle('active', !exists);
    button.innerHTML = !exists ? '<i class="fa-solid fa-heart"></i>' : '<i class="fa-regular fa-heart"></i>';
    button.title = !exists ? 'Quitar de favoritos' : 'Agregar a favoritos';
  }

  function enhanceCards() {
    const cards = [...document.querySelectorAll('.card')];
    if (!cards.length) return;

    cards.forEach(card => {
      if (card.dataset.fase1 === '1') return;
      card.dataset.fase1 = '1';
      const id = productId(card);

      // 1) Favoritos
      const fav = document.createElement('button');
      fav.className = 'fase1-fav' + (favoritos.some(x => x.id === id) ? ' active' : '');
      fav.innerHTML = favoritos.some(x => x.id === id) ? '<i class="fa-solid fa-heart"></i>' : '<i class="fa-regular fa-heart"></i>';
      fav.title = 'Agregar a favoritos';
      fav.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); addFavorite(card, fav); });
      card.appendChild(fav);

      // 2) Más vendidos: empieza a medir clics reales del usuario
      if ((clicks[id] || 0) >= 2) {
        const badge = document.createElement('span');
        badge.className = 'fase1-popular-badge';
        badge.innerHTML = '<i class="fa-solid fa-fire"></i> MÁS VENDIDO';
        card.appendChild(badge);
      }

      // 3) Comprar ahora: reutiliza el botón de compra existente para no romper el carrito
      const buy = card.querySelector('.btn-buy,button[class*="buy"],button[onclick*="cart"],button[onclick*="Carrito"]');
      if (buy && !card.querySelector('.fase1-buy-now')) {
        const quick = document.createElement('button');
        quick.className = 'fase1-buy-now';
        quick.innerHTML = '<i class="fa-solid fa-bolt"></i> Comprar ahora';
        quick.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          clicks[id] = (clicks[id] || 0) + 1;
          write(KEY_CLICKS, clicks);
          buy.click();
          setTimeout(enhanceCards, 100);
        });
        buy.insertAdjacentElement('afterend', quick);
      }

      // Medición de producto visto/clicado
      card.addEventListener('click', () => {
        clicks[id] = (clicks[id] || 0) + 1;
        write(KEY_CLICKS, clicks);
        registerView(card);
      }, { passive: true });
    });
  }

  function renderRecentlyViewed() {
    if (!vistos.length || document.querySelector('#fase1-vistos')) return;
    const section = document.createElement('section');
    section.id = 'fase1-vistos';
    section.className = 'fase1-section';
    section.innerHTML = '<h2><i class="fa-solid fa-clock-rotate-left"></i> Vistos recientemente</h2><div class="fase1-strip"></div>';
    const strip = section.querySelector('.fase1-strip');
    vistos.slice(0, 6).forEach(item => {
      const el = document.createElement('div');
      el.className = 'fase1-mini-card';
      el.innerHTML = `<img src="${item.image}" alt=""><div><strong>${item.title}</strong><small>Volver a ver producto</small></div>`;
      el.addEventListener('click', () => {
        const cards = [...document.querySelectorAll('.card')];
        const match = cards.find(c => productId(c) === item.id);
        if (match) match.scrollIntoView({ behavior:'smooth', block:'center' });
      });
      strip.appendChild(el);
    });
    const grid = document.querySelector('.grid');
    if (grid?.parentElement) grid.parentElement.insertAdjacentElement('afterend', section);
  }

  function start() {
    enhanceCards();
    renderRecentlyViewed();
    // Para catálogos cargados dinámicamente
    new MutationObserver(() => enhanceCards()).observe(document.body, { childList:true, subtree:true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
