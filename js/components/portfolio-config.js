/**
 * PrevInvest - Portfolio Configuration Component
 * Gerencia a aba de edição da carteira ativa: cadastro de fundos CVM e ativos B3,
 * ajuste de metas percentuais, aportes mínimos e persistência em arquivo.
 */

import { state, notify, subscribe } from '../state.js';
import { api } from '../services/api.js';
import { PALETTE, COLORS, showToast, getSubtleAuxiliaryColor } from '../utils/formatters.js';
import { openColorPicker } from './color-picker-modal.js';
import { openCreatePortfolioModal } from './create-portfolio-modal.js';
import { openDeletePortfolioModal } from './delete-portfolio-modal.js';
import { renderSidebarPortfolios } from './sidebar.js';

export function initPortfolioConfig() {
  const btnSave = document.getElementById('btn-save-portfolio');
  const btnNew = document.getElementById('btn-new-portfolio');
  const btnDelete = document.getElementById('btn-delete-portfolio');
  const btnAddFund = document.getElementById('btn-add-fund');
  const btnAddB3 = document.getElementById('btn-add-b3');
  const nameInput = document.getElementById('portfolio-name-input');

  if (nameInput) {
    nameInput.addEventListener('input', () => {
      const newName = nameInput.value.trim() || 'Sem nome';
      if (state.portfolio) state.portfolio.name = newName;
      const activeSummary = state.portfolios?.find(p => p.id === state.activePortfolioId);
      if (activeSummary) activeSummary.name = newName;

      const activeLabel = document.getElementById('sidebar-active-portfolio-label');
      if (activeLabel) activeLabel.innerText = newName;

      const activeSideItem = document.querySelector(`.sidebar-portfolio-item[data-portfolio-id="${state.activePortfolioId}"] .portfolio-item-name`);
      if (activeSideItem) activeSideItem.textContent = newName;

      const titleEl = document.getElementById('report-portfolio-title');
      if (titleEl) titleEl.innerText = newName;
    });
  }

  if (btnSave) btnSave.addEventListener('click', saveActivePortfolio);
  if (btnNew) btnNew.addEventListener('click', openCreatePortfolioModal);
  if (btnDelete) {
    btnDelete.addEventListener('click', () => {
      if (state.portfolio) {
        openDeletePortfolioModal(state.portfolio.id, state.portfolio.name);
      }
    });
  }
  if (btnAddFund) btnAddFund.addEventListener('click', () => addAsset('fund'));
  if (btnAddB3) btnAddB3.addEventListener('click', () => addAsset('b3'));

  window.addEventListener('portfolio_activated', () => {
    loadAndRenderPortfolioConfig();
  });
  window.addEventListener('tab_portfolio_activated', () => {
    loadAndRenderPortfolioConfig();
  });

  subscribe('portfolio_changed', () => {
    loadAndRenderPortfolioConfig();
  });
}

export function loadAndRenderPortfolioConfig() {
  const p = state.portfolio;
  if (!p) return;

  const nameInput = document.getElementById('portfolio-name-input');
  if (nameInput) nameInput.value = p.name || '';

  const btnDelete = document.getElementById('btn-delete-portfolio');
  if (btnDelete) {
    const isOnly = !state.portfolios || state.portfolios.length <= 1;
    btnDelete.disabled = isOnly;
    btnDelete.title = isOnly ? 'Não é possível excluir a única carteira restante' : 'Excluir esta carteira';
  }

  renderPortfolioConfigTable();
}

export function renderPortfolioConfigTable() {
  const tbody = document.getElementById('portfolio-funds-table');
  const p = state.portfolio;
  if (!tbody || !p) return;

  const nameInput = document.getElementById('portfolio-name-input');
  if (nameInput) nameInput.value = p.name || '';

  tbody.innerHTML = '';

  state.portfolio.funds.forEach((fund, index) => {
    const isB3 = fund.type === 'b3';
    const displayCode = isB3 ? (fund.code || fund.id || '') : (fund.cnpj || fund.code || '');
    const fundColor = fund.color || PALETTE.funds[index % PALETTE.funds.length];
    const fundAuxColor = fund.color_aux || getSubtleAuxiliaryColor(fundColor);
    fund.color = fundColor;
    fund.color_aux = fundAuxColor;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <button type="button" class="fund-color-swatch-btn" title="Cor Principal: ${fundColor} | Fundo: ${fundAuxColor}" style="width: 38px; height: 38px; border-radius: 12px; background-color: ${fundAuxColor}; border: 1.5px solid rgba(0,0,0,0.08); box-shadow: 0 1px 4px rgba(0,0,0,0.08); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.15s ease;">
          <span class="fund-swatch-dot" style="width: 18px; height: 18px; border-radius: 50%; background-color: ${fundColor}; box-shadow: 0 1px 4px rgba(0,0,0,0.18); border: 1.5px solid #FFFFFF;"></span>
        </button>
      </td>
      <td>
        <select class="form-input-clean" style="font-size: 0.85rem; padding: 6px;">
          <option value="fund" ${!isB3 ? 'selected' : ''}>Fundo CVM</option>
          <option value="b3" ${isB3 ? 'selected' : ''}>Ativo B3</option>
        </select>
      </td>
      <td>
        <input type="text" class="form-input-clean" style="font-family: monospace; font-size: 0.85rem;" 
          value="${displayCode}" placeholder="${isB3 ? 'Ex: BOVA11' : '00.000.000/0001-00'}">
      </td>
      <td>
        <input type="text" class="form-input-clean" value="${fund.name}" placeholder="Nome do ativo">
      </td>
      <td>
        <div style="display: flex; align-items: center; gap: 4px;">
          <input type="number" class="form-input-clean" value="${fund.target_pct}" step="1" min="0" max="100" style="width: 80px;">
          <span>%</span>
        </div>
      </td>
      <td>
        <div style="display: flex; align-items: center; gap: 4px;">
          <span style="color: var(--charcoal-muted); font-size: 0.85rem;">R$</span>
          <input type="number" class="form-input-clean" value="${fund.min_investment || 100}" step="50" min="0" style="width: 100px;">
        </div>
      </td>
      <td style="text-align: center;">
        <button class="icon-btn-ghost btn-remove-fund" title="Remover Ativo" style="color: #DC2626;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </td>
    `;

    const colorBtn = tr.querySelector('.fund-color-swatch-btn');
    const typeSelect = tr.querySelector('select');
    const codeInput = tr.querySelectorAll('input[type="text"]')[0];
    const nameInputField = tr.querySelectorAll('input[type="text"]')[1];
    const pctInput = tr.querySelectorAll('input[type="number"]')[0];
    const minInput = tr.querySelectorAll('input[type="number"]')[1];
    const delBtn = tr.querySelector('.btn-remove-fund');

    if (colorBtn) {
      colorBtn.addEventListener('click', () => {
        openColorPicker(fund.color, (newColor, newAuxColor) => {
          fund.color = newColor;
          fund.color_aux = newAuxColor;
          colorBtn.style.backgroundColor = newAuxColor;
          const dot = colorBtn.querySelector('.fund-swatch-dot');
          if (dot) dot.style.backgroundColor = newColor;
          colorBtn.title = `Cor Principal: ${newColor} | Fundo: ${newAuxColor}`;
        }, fund.color_aux);
      });
    }

    typeSelect.addEventListener('change', (e) => {
      fund.type = e.target.value;
      if (fund.type === 'b3') {
        fund.cnpj = '';
        if (!fund.code || fund.code.includes('.')) fund.code = 'BOVA11';
      } else {
        if (!fund.cnpj || !fund.cnpj.includes('.')) fund.cnpj = fund.code || '00.000.000/0001-00';
      }
      renderPortfolioConfigTable();
    });

    codeInput.addEventListener('change', (e) => {
      const val = e.target.value.trim();
      if (fund.type === 'b3') {
        fund.code = val.toUpperCase();
        fund.cnpj = '';
      } else {
        fund.cnpj = val;
        fund.code = val;
      }
    });

    nameInputField.addEventListener('change', (e) => { fund.name = e.target.value; });
    pctInput.addEventListener('input', (e) => {
      fund.target_pct = parseFloat(e.target.value) || 0;
      updateTotalWeightIndicator();
    });
    minInput.addEventListener('change', (e) => { fund.min_investment = parseFloat(e.target.value) || 0; });
    delBtn.addEventListener('click', () => { removeAsset(index); });

    tbody.appendChild(tr);
  });

  updateTotalWeightIndicator();
}

function updateTotalWeightIndicator() {
  const ind = document.getElementById('total-weight-indicator');
  if (!ind || !state.portfolio) return;
  const total = state.portfolio.funds.reduce((acc, f) => acc + (parseFloat(f.target_pct) || 0), 0);
  ind.innerText = `Soma: ${total.toFixed(1)}%`;
  ind.style.color = Math.abs(total - 100.0) < 0.01 ? 'var(--mint-dark)' : '#DC2626';
}

function addAsset(type = 'fund') {
  if (!state.portfolio) return;
  const newIndex = state.portfolio.funds.length;
  const defaultColor = PALETTE.funds[newIndex % PALETTE.funds.length];
  const defaultAux = getSubtleAuxiliaryColor(defaultColor);

  if (type === 'b3') {
    state.portfolio.funds.push({
      id: `b3_${Date.now()}`,
      type: 'b3',
      name: `Novo Ativo B3`,
      cnpj: '',
      code: 'BOVA11',
      target_pct: 0,
      min_investment: 100.0,
      color: defaultColor,
      color_aux: defaultAux
    });
  } else {
    state.portfolio.funds.push({
      id: `fundo_${Date.now()}`,
      type: 'fund',
      name: `Novo Fundo CVM ${newIndex + 1}`,
      cnpj: '00.000.000/0001-00',
      code: '00.000.000/0001-00',
      target_pct: 0,
      min_investment: 100.0,
      color: defaultColor,
      color_aux: defaultAux
    });
  }
  renderPortfolioConfigTable();
}

function removeAsset(index) {
  if (!state.portfolio || state.portfolio.funds.length <= 1) {
    showToast('A carteira deve ter ao menos um ativo cadastrado.', 'error');
    return;
  }
  state.portfolio.funds.splice(index, 1);
  renderPortfolioConfigTable();
}

export async function saveActivePortfolio() {
  if (!state.portfolio) return;
  const nameInput = document.getElementById('portfolio-name-input');
  if (nameInput && nameInput.value.trim()) {
    state.portfolio.name = nameInput.value.trim();
    const titleEl = document.getElementById('report-portfolio-title');
    if (titleEl) titleEl.innerText = state.portfolio.name;
  }

  const total = state.portfolio.funds.reduce((acc, f) => acc + (parseFloat(f.target_pct) || 0), 0);
  if (Math.abs(total - 100.0) > 0.01) {
    showToast(`A soma dos percentuais deve ser exatamente 100%. Atual: ${total.toFixed(1)}%`, 'error');
    return;
  }

  try {
    const data = await api.savePortfolio(state.portfolio);
    if (data && data.portfolios) {
      state.portfolios = data.portfolios;
    } else if (state.portfolios) {
      const idx = state.portfolios.findIndex(p => p.id === state.portfolio.id);
      if (idx !== -1) {
        state.portfolios[idx].name = state.portfolio.name;
        state.portfolios[idx].asset_count = state.portfolio.funds.length;
      }
    }
    renderSidebarPortfolios();
    showToast(`Carteira "${state.portfolio.name}" salva com sucesso!`, 'success');
    notify('portfolio_saved', state.portfolio);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

export function createNewPortfolio() {
  openCreatePortfolioModal();
}
