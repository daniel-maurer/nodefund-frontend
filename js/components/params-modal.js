/**
 * PrevInvest - Simulation Parameters Modal Component
 * Gerencia o modal flutuante com backdrop blur para configuração de aportes,
 * capital inicial, datas e modo de rebalanceamento.
 */

import { state, notify } from '../state.js';
import { api } from '../services/api.js';
import { showToast } from '../utils/formatters.js';

export function initParamsModal() {
  const modal = document.getElementById('params-modal');
  const btnClose = document.getElementById('btn-close-params');
  const btnCancel = document.getElementById('btn-cancel-params');
  const btnRun = document.getElementById('btn-run-simulation');
  const portParamsBtn = document.getElementById('btn-portfolio-params');

  const openModal = () => { if (modal) modal.classList.add('open'); };
  const closeModal = () => { if (modal) modal.classList.remove('open'); };

  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (btnCancel) btnCancel.addEventListener('click', closeModal);
  if (portParamsBtn) portParamsBtn.addEventListener('click', openModal);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  if (btnRun) {
    btnRun.addEventListener('click', async () => {
      const initialCap = parseFloat(document.getElementById('input-initial-capital').value) || 20000;
      const monthlyContrib = parseFloat(document.getElementById('input-monthly-contribution').value) || 2000;
      const startDate = document.getElementById('input-start-date').value || '2024-05-02';
      const endDate = document.getElementById('input-end-date').value || '2026-08-31';
      const rebalanceMode = document.getElementById('input-rebalance-mode').value || 'smart_inflow';

      btnRun.disabled = true;
      btnRun.innerHTML = `
        <svg class="spin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
        <span>Calculando...</span>
      `;

      try {
        const data = await api.runSimulation({
          initial_capital: initialCap,
          monthly_contribution: monthlyContrib,
          start_date: startDate,
          end_date: endDate,
          rebalance_mode: rebalanceMode,
          portfolio: state.portfolio
        });

        state.simulationResult = data;
        closeModal();
        showToast('Simulação calculada com sucesso!', 'success');
        notify('simulation_updated', data);
      } catch (err) {
        showToast(`Erro na simulação: ${err.message}`, 'error');
      } finally {
        btnRun.disabled = false;
        btnRun.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          <span>Executar Simulação</span>
        `;
      }
    });
  }
}
