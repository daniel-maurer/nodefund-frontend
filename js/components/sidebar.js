/**
 * PrevInvest - Sidebar Component
 * Gerencia a navegação lateral, lista dinâmica de carteiras cadastradas com troca instantânea,
 * perfil Edgar Duncan e acionamento do modal de parâmetros.
 */

import { state, notify, subscribe } from '../state.js';
import { api } from '../services/api.js';
import { showToast } from '../utils/formatters.js';
import { switchTab } from './topbar.js';
import { openCreatePortfolioModal } from './create-portfolio-modal.js';
import { openDeletePortfolioModal } from './delete-portfolio-modal.js';

export function initSidebar() {
  subscribe('portfolio_saved', () => {
    renderSidebarPortfolios();
  });
  subscribe('portfolio_changed', () => {
    renderSidebarPortfolios();
  });
  const container = document.getElementById('sidebar-portfolios-list');
  const btnOpenParams = document.getElementById('btn-open-params');
  const searchInput = document.getElementById('sidebar-search-input');
  const sidebar = document.getElementById('dribbble-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const btnMobileMenu = document.getElementById('btn-mobile-menu');
  const btnCloseSidebar = document.getElementById('btn-close-sidebar');

  const openDrawer = () => {
    if (sidebar) sidebar.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
    document.body.classList.add('sidebar-drawer-open');
  };

  const closeDrawer = () => {
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    document.body.classList.remove('sidebar-drawer-open');
  };

  if (btnMobileMenu) btnMobileMenu.addEventListener('click', openDrawer);
  if (btnCloseSidebar) btnCloseSidebar.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  window.closeSidebarDrawer = closeDrawer;

  const btnAddPortfolio = document.getElementById('btn-sidebar-add-portfolio');
  if (btnAddPortfolio) {
    btnAddPortfolio.addEventListener('click', () => {
      closeDrawer();
      openCreatePortfolioModal();
    });
  }

  if (btnOpenParams) {
    btnOpenParams.addEventListener('click', () => {
      closeDrawer();
      const modal = document.getElementById('params-modal');
      if (modal) modal.classList.add('open');
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll('#portfolio-funds-table tr, #status-funds-table tr, #status-b3-table tr').forEach(tr => {
        if (!q) {
          tr.style.display = '';
        } else {
          tr.style.display = tr.innerText.toLowerCase().includes(q) ? '' : 'none';
        }
      });
    });
  }

  renderSidebarPortfolios();
}

export function renderSidebarPortfolios() {
  const container = document.getElementById('sidebar-portfolios-list');
  const activeLabel = document.getElementById('sidebar-active-portfolio-label');

  if (activeLabel && state.portfolio) {
    activeLabel.innerText = state.portfolio.name || 'Carteira Principal';
  }

  if (!container) return;
  container.innerHTML = '';

  if (!state.portfolios || state.portfolios.length === 0) {
    container.innerHTML = '<div style="font-size: 0.72rem; color: var(--charcoal-muted); padding: 4px 8px;">Nenhuma carteira</div>';
    return;
  }

  const canDelete = state.portfolios && state.portfolios.length > 1;

  state.portfolios.forEach(p => {
    const isActive = p.id === state.activePortfolioId;
    const btn = document.createElement('button');
    btn.className = `sidebar-portfolio-item ${isActive ? 'active' : ''}`;
    btn.setAttribute('data-portfolio-id', p.id);
    btn.innerHTML = `
      <span class="portfolio-item-bullet ${isActive ? 'active' : ''}"></span>
      <div class="portfolio-item-text">
        <span class="portfolio-item-name">${p.name}</span>
        <span class="portfolio-item-count">${p.asset_count} ativos</span>
      </div>
      ${canDelete ? `
        <span class="sidebar-portfolio-delete-btn" role="button" tabindex="0" title="Excluir carteira: ${p.name}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </span>
      ` : ''}
    `;

    // Handler para exclusão isolada
    const delBtn = btn.querySelector('.sidebar-portfolio-delete-btn');
    if (delBtn) {
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        openDeletePortfolioModal(p.id, p.name);
      });
      delBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.stopPropagation();
          e.preventDefault();
          openDeletePortfolioModal(p.id, p.name);
        }
      });
    }

    btn.addEventListener('click', async () => {
      if (window.closeSidebarDrawer) window.closeSidebarDrawer();
      const isGlobalTab = document.getElementById('tab-data')?.classList.contains('active') ||
                          document.getElementById('tab-sources')?.classList.contains('active');
      if (p.id === state.activePortfolioId && !isGlobalTab) return;
      try {
        if (p.id !== state.activePortfolioId) {
          const data = await api.selectPortfolio(p.id);
          state.portfolio = data.active || data.portfolio;
          state.activePortfolioId = state.portfolio.id;
          showToast(`Carteira ativa: "${state.portfolio.name}"`, 'info');
          notify('portfolio_changed', state.portfolio);
        }
        switchTab('tab-simulation');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    container.appendChild(btn);
  });
}
