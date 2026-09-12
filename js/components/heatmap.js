/**
 * PrevInvest - Correlation Heatmap Component
 * Renderiza a matriz de correlação de retornos diários (Pearson) entre ativos e benchmarks,
 * com seletor interativo de índices para evitar poluição visual.
 */

import { state } from '../state.js';

// Índices disponíveis para comparação
const BENCHMARK_KEYS = new Set(['cdi', 'ibov', 'sp500', 'ifix', 'btc', 'usd', 'poupanca', 'ipca']);
const BENCHMARKS_CATALOG = [
  { id: 'cdi', name: 'CDI' },
  { id: 'ibov', name: 'IBOVESPA' },
  { id: 'sp500', name: 'S&P 500' },
  { id: 'ipca', name: 'IPCA' },
  { id: 'ifix', name: 'IFIX' },
  { id: 'btc', name: 'Bitcoin' },
  { id: 'usd', name: 'Dólar' },
  { id: 'poupanca', name: 'Poupança' }
];

// Estado dos benchmarks selecionados (por padrão exibe apenas CDI para manter limpo)
const selectedBenchmarks = new Set(['cdi']);

export function renderCorrelationHeatmap() {
  const container = document.getElementById('correlation-heatmap-container');
  const filterBar = document.getElementById('heatmap-filter-bar');
  const sim = state.simulationResult;
  if (!container) return;

  const corrData = (sim && sim.correlation_matrix) ? sim.correlation_matrix : null;

  if (!corrData || !corrData.matrix || corrData.matrix.length === 0) {
    if (filterBar) filterBar.innerHTML = '';
    container.innerHTML = '<div style="color: var(--charcoal-muted); font-size: 0.85rem; padding: 40px; text-align: center; width: 100%;">Execute a simulação para carregar a matriz de correlação.</div>';
    return;
  }

  const { keys, labels, matrix } = corrData;

  // 1. Renderizar Barra de Filtros de Índices (Pills Selecionáveis)
  if (filterBar) {
    filterBar.innerHTML = '';
    const labelTitle = document.createElement('span');
    labelTitle.style.fontSize = '0.76rem';
    labelTitle.style.fontWeight = '700';
    labelTitle.style.color = 'var(--charcoal-muted)';
    labelTitle.style.marginRight = '6px';
    labelTitle.innerText = 'Comparar com Índices:';
    filterBar.appendChild(labelTitle);

    // Filtrar apenas benchmarks que realmente vieram nos dados da simulação
    const availableBmKeys = new Set(keys.filter(k => BENCHMARK_KEYS.has(k)));

    BENCHMARKS_CATALOG.forEach(bm => {
      if (!availableBmKeys.has(bm.id)) return;
      const isSelected = selectedBenchmarks.has(bm.id);
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = `corr-bm-pill ${isSelected ? 'active' : ''}`;
      pill.innerHTML = `<span>${isSelected ? '✓' : '+'}</span><span>${bm.name}</span>`;
      pill.title = isSelected ? `Remover ${bm.name} da matriz` : `Incluir ${bm.name} na matriz`;
      pill.addEventListener('click', () => {
        if (selectedBenchmarks.has(bm.id)) {
          selectedBenchmarks.delete(bm.id);
        } else {
          selectedBenchmarks.add(bm.id);
        }
        renderCorrelationHeatmap();
      });
      filterBar.appendChild(pill);
    });

    // Botão auxiliar: "Apenas Ativos" (limpar todos os índices)
    if (selectedBenchmarks.size > 0) {
      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'icon-btn-ghost';
      clearBtn.style.fontSize = '0.72rem';
      clearBtn.style.width = 'auto';
      clearBtn.style.padding = '0 6px';
      clearBtn.style.textDecoration = 'underline';
      clearBtn.innerText = 'Ocultar índices';
      clearBtn.title = 'Mostrar apenas os ativos da carteira';
      clearBtn.addEventListener('click', () => {
        selectedBenchmarks.clear();
        renderCorrelationHeatmap();
      });
      filterBar.appendChild(clearBtn);
    }
  }

  // 2. Determinar índices a exibir (todos os ativos da carteira + benchmarks marcados)
  const includedIndices = [];
  keys.forEach((k, idx) => {
    const isBm = BENCHMARK_KEYS.has(k);
    if (!isBm || selectedBenchmarks.has(k)) {
      includedIndices.push(idx);
    }
  });

  // 3. Renderizar Tabela da Matriz Filtrada
  let html = '<table class="heatmap-table"><thead><tr><th></th>';
  includedIndices.forEach(idx => {
    const l = labels[idx] || keys[idx];
    const isBm = BENCHMARK_KEYS.has(keys[idx]);
    const thStyle = isBm ? 'color: var(--charcoal-dark); font-weight: 800;' : '';
    html += `<th style="${thStyle}" title="${l}">${l.length > 14 ? l.slice(0, 12) + '…' : l}</th>`;
  });
  html += '</tr></thead><tbody>';

  for (let r = 0; r < includedIndices.length; r++) {
    const i = includedIndices[r];
    const rowLabel = labels[i] || keys[i];
    const isBmRow = BENCHMARK_KEYS.has(keys[i]);
    const rowThStyle = isBmRow ? 'font-weight: 800;' : '';
    html += `<tr><th style="text-align: right; padding-right: 10px; ${rowThStyle}" title="${rowLabel}">${rowLabel.length > 18 ? rowLabel.slice(0, 16) + '…' : rowLabel}</th>`;

    for (let c = 0; c < includedIndices.length; c++) {
      const j = includedIndices[c];
      const val = matrix[i][j];
      let bg = '#F9FAFB';
      let textColor = '#38393D';

      if (i === j) {
        bg = '#E5E7EB';
        textColor = '#111827';
      } else if (val > 0) {
        const alpha = Math.min(val, 1.0) * 0.45;
        bg = `rgba(46, 125, 91, ${alpha.toFixed(2)})`;
        textColor = val > 0.4 ? '#1B4D38' : '#1F2937';
      } else if (val < 0) {
        const alpha = Math.min(Math.abs(val), 1.0) * 0.4;
        bg = `rgba(194, 89, 83, ${alpha.toFixed(2)})`;
        textColor = Math.abs(val) > 0.4 ? '#7A2E2A' : '#1F2937';
      }

      const valFormatted = (val >= 0 && i !== j ? '+' : '') + val.toFixed(2);
      html += `<td style="background: ${bg}; color: ${textColor};" title="Correlação ${labels[i]} x ${labels[j]}: ${valFormatted}">${valFormatted}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  container.innerHTML = html;
}
