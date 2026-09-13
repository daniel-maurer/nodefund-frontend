/**
 * PrevInvest - Dividends & Total Return Charts Component
 * Gerencia os gráficos de Proventos Mensais em Barras (Total vs Por Fundo)
 * e o comparativo de Rentabilidade Cota vs Cota + Dividendos (Total Return).
 */

import { state } from '../state.js';
import { formatMoney, formatPct, getAssetKey } from '../utils/formatters.js';

let barChartInstance = null;
let totalReturnChartInstance = null;
let activeBarMode = 'portfolio'; // 'portfolio' | 'by_asset'
let activeTrScope = 'portfolio'; // 'portfolio' | asset_key

export function initDividendsCharts() {
  // 1. Toggles de modo do Gráfico de Barras (Toda a Carteira vs Por Fundo)
  const barModeButtons = document.querySelectorAll('#dividend-bar-mode-pills .sales-mode-btn');
  barModeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      barModeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeBarMode = btn.getAttribute('data-mode') || 'portfolio';
      renderDividendsBarChart();
    });
  });

  // 2. Seletor Popover de Ativo do Gráfico de Total Return
  const btnTrScope = document.getElementById('btn-div-tr-scope-picker');
  const popoverTrScope = document.getElementById('div-tr-scope-popover');

  if (btnTrScope && popoverTrScope) {
    btnTrScope.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = popoverTrScope.style.display === 'block';
      popoverTrScope.style.display = isVisible ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
      if (!popoverTrScope.contains(e.target) && e.target !== btnTrScope && !btnTrScope.contains(e.target)) {
        popoverTrScope.style.display = 'none';
      }
    });
  }
}

export function renderDividendsCharts() {
  const sim = state.simulationResult;
  const divs = sim?.dividends;
  const sectionWrap = document.getElementById('dividends-charts-section');
  if (!sectionWrap) return;

  // Atualizar KPIs do cabeçalho
  const kpis = divs?.kpis || {};
  const elTotal = document.getElementById('div-kpi-total');
  const elAvg = document.getElementById('div-kpi-avg');
  const elAvgSub = document.getElementById('div-kpi-avg-sub');
  const elYield = document.getElementById('div-kpi-yield');
  const elYieldSub = document.getElementById('div-kpi-yield-sub');
  const elBest = document.getElementById('div-kpi-best');

  if (elTotal) elTotal.textContent = formatMoney(kpis.total_received || 0);
  if (elAvg) elAvg.textContent = `${(kpis.monthly_avg_yield_pct || 0).toFixed(2)}% a.m.`;
  if (elAvgSub) elAvgSub.textContent = `${formatMoney(kpis.monthly_avg || 0)}/mês`;
  if (elYield) elYield.textContent = `${(kpis.dividend_yield_12m_pct !== undefined ? kpis.dividend_yield_12m_pct : (kpis.dividend_yield_pct || 0)).toFixed(2)}%`;
  if (elYieldSub) elYieldSub.textContent = 'Últimos 12 meses';
  if (elBest) {
    if (kpis.best_month && kpis.best_month.amount > 0) {
      elBest.textContent = `${kpis.best_month.label} (${formatMoney(kpis.best_month.amount)})`;
    } else {
      elBest.textContent = '—';
    }
  }

  // Renderizar opções do Popover de Escopo do Total Return
  renderTrScopeOptions();

  // Renderizar Gráficos
  renderDividendsBarChart();
  renderTotalReturnChart();
}

function renderTrScopeOptions() {
  const grid = document.getElementById('div-tr-scope-grid');
  const label = document.getElementById('div-tr-scope-label');
  const popover = document.getElementById('div-tr-scope-popover');
  if (!grid) return;

  const funds = state.portfolio?.funds || [];
  let html = `
    <button type="button" class="month-pill-item ${activeTrScope === 'portfolio' ? 'active' : ''}" data-scope="portfolio" style="width: 100%; text-align: left; padding: 7px 12px; font-weight: 700; font-size: 0.78rem;">
      💼 Toda a Carteira
    </button>
  `;

  funds.forEach(f => {
    const k = getAssetKey(f);
    const ticker = f.code || f.id || k;
    const isAct = (activeTrScope === k);
    html += `
      <button type="button" class="month-pill-item ${isAct ? 'active' : ''}" data-scope="${k}" style="width: 100%; text-align: left; padding: 7px 12px; font-size: 0.78rem; display: flex; align-items: center; gap: 8px;">
        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${f.color || '#2E7D5B'};"></span>
        <span style="font-weight: 700;">${ticker}</span>
        <span style="color: var(--charcoal-muted); font-size: 0.7rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${f.name || ticker}</span>
      </button>
    `;
  });

  grid.innerHTML = html;

  // Atualizar label do botão
  if (label) {
    if (activeTrScope === 'portfolio') {
      label.textContent = 'Toda a Carteira';
    } else {
      const match = funds.find(f => getAssetKey(f) === activeTrScope);
      label.textContent = match ? (match.code || match.name) : activeTrScope;
    }
  }

  // Event listeners
  grid.querySelectorAll('button[data-scope]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      activeTrScope = btn.getAttribute('data-scope');
      if (popover) popover.style.display = 'none';
      renderTrScopeOptions();
      renderTotalReturnChart();
    });
  });
}

function renderDividendsBarChart() {
  const canvas = document.getElementById('dividendBarsChart');
  if (!canvas) return;

  const divs = state.simulationResult?.dividends;
  const monthly = divs?.monthly_dividends || [];
  const funds = state.portfolio?.funds || [];

  if (barChartInstance) {
    barChartInstance.destroy();
    barChartInstance = null;
  }

  if (!divs || !divs.has_dividends || monthly.length === 0) {
    renderEmptyChartState(canvas, 'Sem histórico de proventos nesta carteira');
    return;
  }

  const ctx = canvas.getContext('2d');
  const labels = monthly.map(m => m.label);

  let datasets = [];

  if (activeBarMode === 'portfolio') {
    // 1. Toda a Carteira (Barra consolidada)
    datasets = [{
      label: 'Total Recebido (R$)',
      data: monthly.map(m => m.total),
      backgroundColor: '#2E7D5B',
      hoverBackgroundColor: '#246348',
      borderRadius: 6,
      borderSkipped: false,
      maxBarThickness: 32
    }];
  } else {
    // 2. Separado por Fundo / Ativo (Barras Empilhadas com cores dos ativos)
    datasets = funds.map(f => {
      const k = getAssetKey(f);
      const ticker = f.code || f.name || k;
      const color = f.color || '#2E7D5B';
      return {
        label: ticker,
        data: monthly.map(m => m.by_asset?.[k] || 0),
        backgroundColor: color,
        borderRadius: 4,
        stack: 'dividends',
        maxBarThickness: 32
      };
    });
  }

  barChartInstance = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: (activeBarMode === 'by_asset'),
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            borderRadius: 2,
            usePointStyle: true,
            font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' }
          }
        },
        tooltip: {
          backgroundColor: '#222428',
          titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: '700' },
          bodyFont: { family: 'Plus Jakarta Sans', size: 11 },
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              const val = context.raw || 0;
              if (val === 0 && activeBarMode === 'by_asset') return null;
              return ` ${context.dataset.label}: ${formatMoney(val)}`;
            },
            footer: function(items) {
              if (activeBarMode === 'by_asset' && items.length > 1) {
                const total = items.reduce((sum, item) => sum + (item.raw || 0), 0);
                return `Total Mês: ${formatMoney(total)}`;
              }
              return '';
            }
          }
        }
      },
      scales: {
        x: {
          stacked: (activeBarMode === 'by_asset'),
          grid: { display: false },
          ticks: {
            font: { family: 'Plus Jakarta Sans', size: 10, weight: '600' },
            color: '#8E9198',
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 12
          }
        },
        y: {
          stacked: (activeBarMode === 'by_asset'),
          grid: { color: 'rgba(0, 0, 0, 0.05)' },
          ticks: {
            font: { family: 'Plus Jakarta Sans', size: 10 },
            color: '#8E9198',
            callback: (val) => `R$ ${val.toLocaleString('pt-BR')}`
          }
        }
      }
    }
  });
}

function renderTotalReturnChart() {
  const canvas = document.getElementById('totalReturnChart');
  const badgeAlpha = document.getElementById('div-tr-alpha-badge');
  if (!canvas) return;

  const divs = state.simulationResult?.dividends;
  const trSeries = divs?.total_return_series;

  if (totalReturnChartInstance) {
    totalReturnChartInstance.destroy();
    totalReturnChartInstance = null;
  }

  if (!divs || !divs.has_dividends || !trSeries) {
    if (badgeAlpha) badgeAlpha.style.display = 'none';
    renderEmptyChartState(canvas, 'Dados insuficientes para comparação de Total Return');
    return;
  }

  let seriesData = null;
  let titlePrefix = '';
  let activeColor = '#2E7D5B';

  if (activeTrScope === 'portfolio') {
    seriesData = trSeries.portfolio;
    titlePrefix = 'Carteira';
    activeColor = '#2E7D5B';
  } else {
    seriesData = trSeries.assets?.[activeTrScope];
    titlePrefix = seriesData?.ticker || activeTrScope;
    activeColor = seriesData?.color || '#2E7D5B';
  }

  if (!seriesData || !seriesData.dates || seriesData.dates.length === 0) {
    if (badgeAlpha) badgeAlpha.style.display = 'none';
    renderEmptyChartState(canvas, 'Ativo sem histórico no período');
    return;
  }

  // Atualizar badge de Alpha de Proventos
  if (badgeAlpha) {
    const spread = seriesData.spread_pct || 0;
    badgeAlpha.style.display = 'inline-flex';
    badgeAlpha.textContent = `Alpha de Proventos: +${spread.toFixed(2)}%`;
  }

  const ctx = canvas.getContext('2d');
  const dates = seriesData.dates;
  const priceData = seriesData.price_return_pct || [];
  const trData = seriesData.total_return_pct || [];

  // Formatação de labels
  const labels = dates.map(d => {
    const parts = d.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
  });

  totalReturnChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: `${titlePrefix} (Cota Pura)`,
          data: priceData,
          borderColor: '#94A3B8',
          borderWidth: 2,
          borderDash: [5, 4],
          pointRadius: 0,
          pointHoverRadius: 5,
          fill: false,
          tension: 0.2
        },
        {
          label: `${titlePrefix} (Total Return com Proventos)`,
          data: trData,
          borderColor: activeColor,
          backgroundColor: 'rgba(46, 125, 91, 0.08)',
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointBackgroundColor: activeColor,
          fill: true,
          tension: 0.2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 16,
            boxHeight: 3,
            font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' }
          }
        },
        tooltip: {
          backgroundColor: '#222428',
          titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: '700' },
          bodyFont: { family: 'Plus Jakarta Sans', size: 11 },
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              const val = context.raw || 0;
              return ` ${context.dataset.label}: ${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;
            },
            footer: function(items) {
              if (items.length >= 2) {
                const diff = (items[1].raw || 0) - (items[0].raw || 0);
                return `Ganho por Dividendos: +${diff.toFixed(2)}%`;
              }
              return '';
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { family: 'Plus Jakarta Sans', size: 10, weight: '600' },
            color: '#8E9198',
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 10
          }
        },
        y: {
          grid: { color: 'rgba(0, 0, 0, 0.05)' },
          ticks: {
            font: { family: 'Plus Jakarta Sans', size: 10 },
            color: '#8E9198',
            callback: (val) => `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`
          }
        }
      }
    }
  });
}

function renderEmptyChartState(canvas, msg) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 13px Plus Jakarta Sans';
  ctx.fillStyle = '#8E9198';
  ctx.fillText(msg, canvas.width / 2, canvas.height / 2);
  ctx.restore();
}
