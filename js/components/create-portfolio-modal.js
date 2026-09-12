/**
 * PrevInvest - Create Portfolio Modal Component
 * Modal com estética Dribbble / QuickBooks PrevInvest para criação de novas carteiras.
 * Suporta predefinições de ativos (ETFs B3, Fundos Previdência CVM ou Personalizada).
 */

import { state, notify } from '../state.js';
import { api } from '../services/api.js';
import { PALETTE, showToast } from '../utils/formatters.js';
import { switchTab } from './topbar.js';

export function initCreatePortfolioModal() {
  const modal = document.getElementById('create-portfolio-modal');
  const btnClose = document.getElementById('btn-close-create-portfolio');
  const btnCancel = document.getElementById('btn-cancel-create-portfolio');
  const form = document.getElementById('form-create-portfolio');
  const nameInput = document.getElementById('input-new-portfolio-name');
  const templateCards = document.querySelectorAll('.portfolio-template-card');

  const openModal = () => {
    if (!modal) return;
    modal.classList.add('open');
    if (nameInput) {
      nameInput.value = '';
      setTimeout(() => nameInput.focus(), 60);
    }
  };

  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove('open');
  };

  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (btnCancel) btnCancel.addEventListener('click', closeModal);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // Seleção de cards de templates
  templateCards.forEach(card => {
    card.addEventListener('click', () => {
      templateCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    });
  });

  // Envio do formulário de criação
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = nameInput ? nameInput.value.trim() : '';
      if (!name) {
        showToast('Por favor, digite um nome para a carteira.', 'error');
        if (nameInput) nameInput.focus();
        return;
      }

      const selectedTemplateRadio = form.querySelector('input[name="portfolio_template"]:checked');
      const template = selectedTemplateRadio ? selectedTemplateRadio.value : 'b3';

      let funds = [];
      if (template === 'b3') {
        funds = [
          {
            id: `b3_${Date.now()}`,
            type: 'b3',
            name: 'iShares Ibovespa (BOVA11)',
            code: 'BOVA11',
            cnpj: '',
            target_pct: 50.0,
            min_investment: 150.0,
            color: PALETTE.funds[0]
          },
          {
            id: `b3_${Date.now() + 1}`,
            type: 'b3',
            name: 'iShares S&P 500 (IVVB11)',
            code: 'IVVB11',
            cnpj: '',
            target_pct: 50.0,
            min_investment: 350.0,
            color: PALETTE.funds[1]
          }
        ];
      } else if (template === 'cvm') {
        funds = [
          {
            id: `fundo_${Date.now()}`,
            type: 'fund',
            name: 'Giant Prev FIFE FIF Multimercado',
            cnpj: '32.849.296/0001-06',
            code: '32.849.296/0001-06',
            target_pct: 20.0,
            min_investment: 100.0,
            color: PALETTE.funds[0]
          },
          {
            id: `fundo_${Date.now() + 1}`,
            type: 'fund',
            name: 'Tyton Crédito Privado FIFE Previdenciário',
            cnpj: '33.588.607/0001-93',
            code: '33.588.607/0001-93',
            target_pct: 20.0,
            min_investment: 100.0,
            color: PALETTE.funds[1]
          },
          {
            id: `fundo_${Date.now() + 2}`,
            type: 'fund',
            name: 'Trígono 70 Previdência FIA',
            cnpj: '53.847.333/0001-17',
            code: '53.847.333/0001-17',
            target_pct: 20.0,
            min_investment: 100.0,
            color: PALETTE.funds[2]
          },
          {
            id: `fundo_${Date.now() + 3}`,
            type: 'fund',
            name: 'Real Investor 70 Prev FIFE FIC FIA',
            cnpj: '33.600.869/0001-26',
            code: '33.600.869/0001-26',
            target_pct: 20.0,
            min_investment: 100.0,
            color: PALETTE.funds[3]
          },
          {
            id: `fundo_${Date.now() + 4}`,
            type: 'fund',
            name: 'Kinea Prev FIFE FIF Multimercado',
            cnpj: '42.847.903/0001-52',
            code: '42.847.903/0001-52',
            target_pct: 20.0,
            min_investment: 100.0,
            color: PALETTE.funds[4]
          }
        ];
      } else {
        // Custom
        funds = [
          {
            id: `b3_${Date.now()}`,
            type: 'b3',
            name: 'iShares Ibovespa (BOVA11)',
            code: 'BOVA11',
            cnpj: '',
            target_pct: 100.0,
            min_investment: 100.0,
            color: PALETTE.funds[0]
          }
        ];
      }

      const submitBtn = document.getElementById('btn-submit-create-portfolio');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>Criando...</span>`;
      }

      try {
        const data = await api.createPortfolio({ name, funds });
        showToast(`Carteira "${name}" criada com sucesso!`, 'success');
        closeModal();

        const pList = await api.fetchPortfolios();
        state.portfolios = pList.portfolios || [];
        state.portfolio = data.portfolio;
        state.activePortfolioId = data.portfolio.id;

        notify('portfolio_changed', state.portfolio);
        window.dispatchEvent(new CustomEvent('portfolio_activated', { detail: data.portfolio }));
        switchTab('tab-portfolio');
      } catch (err) {
        showToast(`Erro ao criar carteira: ${err.message}`, 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>Criar Carteira</span>
          `;
        }
      }
    });
  }

  window.openCreatePortfolioModal = openModal;
}

export function openCreatePortfolioModal() {
  if (typeof window.openCreatePortfolioModal === 'function') {
    window.openCreatePortfolioModal();
  } else {
    const modal = document.getElementById('create-portfolio-modal');
    if (modal) modal.classList.add('open');
  }
}
