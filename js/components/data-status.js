/**
 * PrevInvest - Data Status Component
 * Gerencia a aba de atualização incremental e status dos arquivos locais CVM e B3.
 */

import { api } from '../services/api.js';
import { formatBRL, showToast } from '../utils/formatters.js';

export function initDataStatus() {
  const btnInc = document.getElementById('btn-update-incremental');
  if (btnInc) {
    btnInc.addEventListener('click', async () => {
      const alertBox = document.getElementById('update-progress-alert');
      const alertText = document.getElementById('update-progress-text');
      const startDate = document.getElementById('update-start-date').value;
      const endDate = document.getElementById('update-end-date').value;

      if (alertBox) alertBox.style.display = 'block';
      if (alertText) alertText.innerText = 'Verificando dados faltantes na CVM e B3...';

      try {
        await api.updateData({
          start_date: startDate,
          end_date: endDate,
          mode: 'incremental'
        });
        showToast('Dados atualizados com sucesso!', 'success');
        loadAndRenderDataStatus();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        if (alertBox) alertBox.style.display = 'none';
      }
    });
  }

  window.addEventListener('tab_data_activated', () => {
    loadAndRenderDataStatus();
  });
}

export async function loadAndRenderDataStatus() {
  try {
    const statusData = await api.fetchDataStatus();
    const fundsTbody = document.getElementById('status-funds-table');
    const b3Tbody = document.getElementById('status-b3-table');

    if (fundsTbody && statusData.funds) {
      fundsTbody.innerHTML = '';
      if (statusData.funds.length === 0) {
        fundsTbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--charcoal-muted);">Nenhum fundo CVM cadastrado no sistema.</td></tr>';
      } else {
        statusData.funds.forEach(f => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${f.name}</strong></td>
            <td><code>${f.cnpj}</code></td>
            <td><span class="badge-pill" style="background: rgba(0,0,0,0.06); font-size: 0.72rem;">${f.portfolios_display || 'Global'}</span></td>
            <td><span class="badge-pill ${f.record_count > 0 ? 'badge-mint' : 'badge-peach'}">${f.record_count} cotas</span></td>
            <td>${f.start_date || '--'}</td>
            <td>${f.end_date || '--'}</td>
            <td><strong>${f.last_quota ? f.last_quota.toFixed(6) : '--'}</strong></td>
          `;
          fundsTbody.appendChild(tr);
        });
      }
    }

    if (b3Tbody) {
      b3Tbody.innerHTML = '';
      const b3List = statusData.b3_assets || [];
      if (b3List.length === 0) {
        b3Tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--charcoal-muted);">Nenhum ativo B3 cadastrado no sistema.</td></tr>';
      } else {
        b3List.forEach(b => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${b.name}</strong></td>
            <td><code>${b.ticker}</code></td>
            <td><span class="badge-pill" style="background: rgba(0,0,0,0.06); font-size: 0.72rem;">${b.portfolios_display || 'Global'}</span></td>
            <td><span class="badge-pill ${b.record_count > 0 ? 'badge-mint' : 'badge-peach'}">${b.record_count} cotações</span></td>
            <td>${b.start_date || '--'}</td>
            <td>${b.end_date || '--'}</td>
            <td><strong>${b.last_close !== null && b.last_close !== undefined ? formatBRL(b.last_close) : '--'}</strong></td>
          `;
          b3Tbody.appendChild(tr);
        });
      }
    }
  } catch (err) {
    console.error('Erro ao carregar status dos dados:', err);
  }
}
