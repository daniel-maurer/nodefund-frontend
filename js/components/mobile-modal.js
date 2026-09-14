/**
 * PrevInvest - Mobile & Interactive Detail Sheet/Modal Component
 * Exibe detalhes aprofundados ao tocar/clicar em células da Grade Anual,
 * linhas do Extrato de Proventos e blocos de ativos do Treemap.
 */

let modalEl = null;
let titleEl = null;
let subEl = null;
let badgeEl = null;
let bodyEl = null;
let footerEl = null;
let footerTextEl = null;
let closeBtnEl = null;
let isInitialized = false;

export function initMobileDetailModal() {
  if (isInitialized) return;
  
  modalEl = document.getElementById('mobile-detail-modal');
  titleEl = document.getElementById('mobile-detail-title');
  subEl = document.getElementById('mobile-detail-sub');
  badgeEl = document.getElementById('mobile-detail-badge');
  bodyEl = document.getElementById('mobile-detail-body');
  footerEl = document.getElementById('mobile-detail-footer');
  footerTextEl = document.getElementById('mobile-detail-footer-text');
  closeBtnEl = document.getElementById('btn-close-mobile-detail');

  if (closeBtnEl && modalEl) {
    closeBtnEl.addEventListener('click', () => closeMobileDetailModal());
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) {
        closeMobileDetailModal();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalEl.classList.contains('open')) {
        closeMobileDetailModal();
      }
    });
    isInitialized = true;
  }
}

/**
 * Abre o Modal / Bottom Sheet com os detalhes estruturados
 * @param {Object} options
 * @param {string} options.title - Título principal (ex: "Rentabilidade - Março / 2026")
 * @param {string} [options.subtitle] - Subtítulo informativo (ex: "Carteira: Principal | Benchmark: CDI")
 * @param {string} [options.badge] - Badge de destaque no cabeçalho
 * @param {string} [options.badgeColor] - Cor da badge
 * @param {string} [options.badgeClass] - Classe CSS da badge (ex: 'badge-mint')
 * @param {Array<{label: string, value: string, sub?: string, color?: string, badge?: string, badgeClass?: string, isFull?: boolean}>} options.items - Lista de KPIs
 * @param {string} [options.footerText] - Nota explicativa de rodapé
 */
export function openMobileDetailModal({
  title = 'Detalhes',
  subtitle = '',
  badge = '',
  badgeColor = '',
  badgeClass = 'badge-mint',
  items = [],
  footerText = ''
}) {
  if (!isInitialized) initMobileDetailModal();
  if (!modalEl || !bodyEl) return;

  if (titleEl) titleEl.textContent = title;

  if (subEl) {
    subEl.textContent = subtitle;
    subEl.style.display = subtitle ? 'block' : 'none';
  }

  if (badgeEl) {
    if (badge) {
      badgeEl.textContent = badge;
      badgeEl.className = `badge-pill ${badgeClass}`;
      badgeEl.style.display = 'inline-flex';
      if (badgeColor) {
        badgeEl.style.color = badgeColor;
      } else {
        badgeEl.style.color = '';
      }
    } else {
      badgeEl.style.display = 'none';
    }
  }

  let html = '<div class="mobile-sheet-grid">';
  items.forEach(it => {
    const isFull = it.isFull ? 'full-width' : '';
    const valColor = it.color ? `style="color: ${it.color};"` : '';
    const badgeHtml = it.badge ? `<span class="badge-pill ${it.badgeClass || 'badge-mint'}" style="margin-left: 6px; font-size: 0.65rem;">${it.badge}</span>` : '';
    
    html += `
      <div class="mobile-sheet-kpi ${isFull}">
        <div class="mobile-sheet-kpi-label">${it.label}</div>
        <div class="mobile-sheet-kpi-val" ${valColor}>
          ${it.value}
          ${badgeHtml}
        </div>
        ${it.sub ? `<div class="mobile-sheet-kpi-sub">${it.sub}</div>` : ''}
      </div>
    `;
  });
  html += '</div>';
  bodyEl.innerHTML = html;

  if (footerEl && footerTextEl) {
    if (footerText) {
      footerTextEl.textContent = footerText;
      footerEl.style.display = 'block';
    } else {
      footerEl.style.display = 'none';
    }
  }

  modalEl.classList.add('open');
}

export function closeMobileDetailModal() {
  if (modalEl) {
    modalEl.classList.remove('open');
  }
}
