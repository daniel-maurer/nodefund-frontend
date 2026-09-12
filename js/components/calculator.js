/**
 * PrevInvest - Rebalancing Calculator Component
 * Gerencia a inserção de saldos em custódia, cálculo de boletas de aporte e verificação de mínimos.
 */

import { state } from '../state.js';
import { api } from '../services/api.js';
import { formatBRL, formatPct, getAssetKey, getAssetCodeDisplay, showToast } from '../utils/formatters.js';

const calcState = {
  balances: {},
  lastResult: null
};

export function initCalculator() {
  const btnCalc = document.getElementById('btn-calculate-rebalance');
  const btnPull = document.getElementById('btn-pull-sim-balances');

  if (btnCalc) btnCalc.addEventListener('click', calculateRebalance);
  if (btnPull) btnPull.addEventListener('click', pullSimulationBalances);

  window.addEventListener('tab_calculator_activated', () => {
    renderCalculatorBalances();
  });
}

export function pullSimulationBalances() {
  if (!state.simulationResult || !state.simulationResult.timeline || state.simulationResult.timeline.length === 0) {
    showToast('Nenhuma simulação calculada ainda para puxar saldos.', 'error');
    return;
  }

  const lastEntry = state.simulationResult.timeline[state.simulationResult.timeline.length - 1];
  const funds = state.portfolio ? state.portfolio.funds : [];

  funds.forEach(f => {
    const key = getAssetKey(f);
    const effPct = (lastEntry.effective_pcts && lastEntry.effective_pcts[key]) ? lastEntry.effective_pcts[key] : (f.target_pct || 0);
    const bal = (lastEntry.smart_val * effPct) / 100.0;
    calcState.balances[key] = parseFloat(bal.toFixed(2));
  });

  renderCalculatorBalances();
  showToast('Saldos da simulação carregados na calculadora!', 'success');
}

export function renderCalculatorBalances() {
  const tbody = document.getElementById('calc-balances-tbody');
  const footerTotal = document.getElementById('calc-footer-total-balance');
  const footerPct = document.getElementById('calc-footer-total-pct');
  if (!tbody || !state.portfolio) return;

  tbody.innerHTML = '';
  let totalBalance = 0;
  state.portfolio.funds.forEach(f => {
    const k = getAssetKey(f);
    const val = calcState.balances[k] !== undefined ? calcState.balances[k] : 0;
    totalBalance += val;
  });

  state.portfolio.funds.forEach(f => {
    const key = getAssetKey(f);
    const displayCode = getAssetCodeDisplay(f);
    const bal = calcState.balances[key] !== undefined ? calcState.balances[key] : 0;
    const partPct = totalBalance > 0 ? (bal / totalBalance) * 100.0 : 0.0;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${f.name}</strong></td>
      <td><code>${displayCode}</code></td>
      <td><span class="badge-pill badge-mint" style="font-weight: 700;">${f.target_pct}%</span></td>
      <td>${formatBRL(f.min_investment || 100)}</td>
      <td>
        <input type="number" class="form-input-clean" style="width: 150px; font-weight: 700;" value="${bal}" step="100" min="0" data-asset="${key}">
      </td>
      <td><strong style="color: var(--charcoal-dark);">${partPct.toFixed(1)}%</strong></td>
    `;

    const input = tr.querySelector('input');
    input.addEventListener('input', (e) => {
      calcState.balances[key] = parseFloat(e.target.value) || 0;
      updateCalculatorTotals();
    });

    tbody.appendChild(tr);
  });

  if (footerTotal) footerTotal.innerText = formatBRL(totalBalance);
  if (footerPct) footerPct.innerText = '100.0%';
}

function updateCalculatorTotals() {
  let total = 0;
  if (state.portfolio) {
    state.portfolio.funds.forEach(f => {
      const k = getAssetKey(f);
      total += calcState.balances[k] || 0;
    });
  }
  const footerTotal = document.getElementById('calc-footer-total-balance');
  if (footerTotal) footerTotal.innerText = formatBRL(total);
}

export async function calculateRebalance() {
  const contribInput = document.getElementById('calc-contribution-input');
  const contribution = parseFloat(contribInput ? contribInput.value : 5000) || 0;

  if (contribution <= 0) {
    showToast('Informe um valor de aporte maior que zero.', 'error');
    return;
  }

  try {
    const data = await api.calculateRebalance({
      portfolio: state.portfolio,
      current_balances: calcState.balances,
      contribution: contribution
    });

    calcState.lastResult = data;
    renderRebalanceOrders(data);
    showToast('Rebalanceamento calculado com sucesso!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

export function renderRebalanceOrders(res) {
  const section = document.getElementById('calc-results-section');
  const tbody = document.getElementById('calc-orders-tbody');
  if (!section || !tbody || !res || !res.orders) return;

  section.style.display = 'block';
  tbody.innerHTML = '';

  res.orders.forEach(ord => {
    const tr = document.createElement('tr');
    const isBought = ord.allocated_contribution > 0;
    const highlightBg = isBought ? 'rgba(45, 106, 79, 0.08)' : '';
    const allocColor = isBought ? 'var(--mint-dark)' : 'var(--charcoal-muted)';

    tr.innerHTML = `
      <td><strong>${ord.name}</strong></td>
      <td>${formatBRL(ord.old_balance)}</td>
      <td><span class="badge-pill badge-mint">${ord.target_pct}%</span></td>
      <td style="background: ${highlightBg}; font-weight: 800; font-size: 0.95rem; color: ${allocColor};">
        ${isBought ? '+' : ''}${formatBRL(ord.allocated_contribution)}
      </td>
      <td style="color: var(--charcoal-muted);">${formatBRL(ord.min_investment)}</td>
      <td><strong>${formatBRL(ord.new_balance)}</strong></td>
      <td><strong>${ord.new_pct.toFixed(1)}%</strong></td>
      <td><span style="font-weight: 700; color: ${Math.abs(ord.dev_pct) > 2 ? '#EF4444' : '#10B981'};">${ord.dev_pct >= 0 ? '+' : ''}${ord.dev_pct.toFixed(1)}%</span></td>
    `;
    tbody.appendChild(tr);
  });
}
