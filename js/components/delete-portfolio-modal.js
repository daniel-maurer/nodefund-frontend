/**
 * PrevInvest - Delete Portfolio Modal Component
 * Modal de confirmação seguro para exclusão de carteiras, com alerta visual elegante,
 * validação contra exclusão da única carteira restante e atualização reativa do dashboard.
 */

import { state, notify } from '../state.js';
import { api } from '../services/api.js';
import { showToast } from '../utils/formatters.js';
import { renderSidebarPortfolios } from './sidebar.js';

let pendingPortfolioId = null;
let pendingPortfolioName = '';

export function initDeletePortfolioModal() {
  const modal = document.getElementById('delete-portfolio-modal');
  const btnClose = document.getElementById('btn-close-delete-portfolio');
  const btnCancel = document.getElementById('btn-cancel-delete-portfolio');
  const btnConfirm = document.getElementById('btn-confirm-delete-portfolio');

  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove('open');
    pendingPortfolioId = null;
    pendingPortfolioName = '';
  };

  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (btnCancel) btnCancel.addEventListener('click', closeModal);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  if (btnConfirm) {
    btnConfirm.addEventListener('click', async () => {
      if (!pendingPortfolioId) return;

      if (!state.portfolios || state.portfolios.length <= 1) {
        showToast('Não é possível excluir a única carteira restante do sistema.', 'error');
        closeModal();
        return;
      }

      const originalHtml = btnConfirm.innerHTML;
      btnConfirm.disabled = true;
      btnConfirm.innerHTML = `<span>Excluindo...</span>`;

      try {
        const res = await api.deletePortfolio(pendingPortfolioId);
        showToast(`Carteira "${pendingPortfolioName}" excluída com sucesso!`, 'success');
        closeModal();

        state.portfolios = res.portfolios || [];
        state.portfolio = res.active || null;
        state.activePortfolioId = state.portfolio ? state.portfolio.id : null;

        renderSidebarPortfolios();
        notify('portfolio_changed', state.portfolio);
        window.dispatchEvent(new CustomEvent('portfolio_activated', { detail: state.portfolio }));
      } catch (err) {
        showToast(err.message || 'Erro ao excluir carteira', 'error');
      } finally {
        btnConfirm.disabled = false;
        btnConfirm.innerHTML = originalHtml;
      }
    });
  }

  window.openDeletePortfolioModal = openDeletePortfolioModal;
}

export function openDeletePortfolioModal(portfolioId, portfolioName) {
  const modal = document.getElementById('delete-portfolio-modal');
  const nameLabel = document.getElementById('delete-portfolio-target-name');

  if (!portfolioId) {
    if (state.portfolio) {
      portfolioId = state.portfolio.id;
      portfolioName = state.portfolio.name;
    } else {
      return;
    }
  }

  if (!state.portfolios || state.portfolios.length <= 1) {
    showToast('Não é possível excluir a única carteira restante do sistema.', 'error');
    return;
  }

  pendingPortfolioId = portfolioId;
  pendingPortfolioName = portfolioName || 'esta carteira';

  if (nameLabel) {
    nameLabel.innerText = `"${pendingPortfolioName}"`;
  }

  if (modal) {
    modal.classList.add('open');
  }
}
