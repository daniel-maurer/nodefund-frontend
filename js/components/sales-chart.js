/**
 * PrevInvest - Sales & Capsule Chart Component
 * Gerencia a alternância entre as 7 cápsulas oficiais do Dribbble (Visão Dribbble)
 * e os 4 modos dinâmicos do Chart.js (Rentabilidade %, Depósito vs Total, Ganho Capital, Aportes/Fundo).
 */

import { state, notify } from '../state.js';
import { formatMoney, formatPct, normalizeReturnPct, PALETTE, COLORS, getAssetKey } from '../utils/formatters.js';
import { initRentabilidadeControls, renderRentabilidadeChart, renderCapitalGainChart, renderViewPickerOptions } from './rentabilidade-chart.js';

const hiddenPatrimonioDatasets = new Set();
const hiddenInflowsDatasets = new Set();

export function initSalesChart() {
  initRentabilidadeControls();
  const modeButtons = document.querySelectorAll('#chart-mode-pills .sales-mode-btn');
  const currencyButtons = document.querySelectorAll('#currency-toggle-group .sales-mode-btn');

  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      modeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeChartMode = btn.getAttribute('data-mode') || 'pct';
      updateChartVisibility();
    });
  });

  // Suporte a parâmetro de URL (?chart_mode=pct) para inicialização direta ou testes
  const urlParams = new URLSearchParams(window.location.search);
  const initialMode = urlParams.get('chart_mode') || urlParams.get('mode');
  if (initialMode) {
    const targetBtn = document.querySelector(`#chart-mode-pills .sales-mode-btn[data-mode="${initialMode}"]`);
    if (targetBtn) {
      modeButtons.forEach(b => b.classList.remove('active'));
      targetBtn.classList.add('active');
      state.activeChartMode = initialMode;
    }
  }

  currencyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      currencyButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.chartCurrency = btn.getAttribute('data-currency') || 'brl';
      notify('chart_currency_changed', state.chartCurrency);
      updateChartVisibility();
    });
  });

  // 3. Dropdown Popover de Período (Mês, 30 dias, 90 dias, 6m, 1a, Tudo)
  const btnPeriod = document.getElementById('btn-sales-period-picker');
  const popoverPeriod = document.getElementById('sales-period-popover');
  const periodLabel = document.getElementById('sales-period-picker-label');
  const periodPills = document.querySelectorAll('#sales-period-grid .month-pill-item');

  const PERIOD_LABELS = {
    month: 'Mês',
    '30d': '30 dias',
    '90d': '90 dias',
    '6m': '6m',
    '1y': '1a',
    all: 'Tudo'
  };

  if (btnPeriod && popoverPeriod) {
    btnPeriod.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = popoverPeriod.style.display === 'block';
      popoverPeriod.style.display = isVisible ? 'none' : 'block';
    });

    periodPills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        periodPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const pKey = pill.getAttribute('data-period') || '90d';
        state.selectedSalesPeriod = pKey;
        if (periodLabel) periodLabel.innerText = PERIOD_LABELS[pKey] || pKey;
        popoverPeriod.style.display = 'none';
        updateChartVisibility();
      });
    });

    document.addEventListener('click', (e) => {
      if (!popoverPeriod.contains(e.target) && e.target !== btnPeriod && !btnPeriod.contains(e.target)) {
        popoverPeriod.style.display = 'none';
      }
    });
  }
}

function filterTimelineByPeriod(timeline, period) {
  if (!timeline || timeline.length === 0 || !period || period === 'all') {
    return timeline || [];
  }
  const lastPt = timeline[timeline.length - 1];
  if (!lastPt || !lastPt.date) return timeline;

  const lastDate = new Date(lastPt.date + 'T00:00:00');
  let cutoffDate = new Date(lastDate);

  if (period === 'month') {
    cutoffDate.setDate(1);
  } else if (period === '30d') {
    cutoffDate.setDate(cutoffDate.getDate() - 30);
  } else if (period === '90d') {
    cutoffDate.setDate(cutoffDate.getDate() - 90);
  } else if (period === '6m') {
    cutoffDate.setMonth(cutoffDate.getMonth() - 6);
  } else if (period === '1y') {
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
  }

  const cutoffStr = cutoffDate.toISOString().slice(0, 10);
  const filtered = timeline.filter(t => t.date >= cutoffStr);
  return filtered.length > 0 ? filtered : timeline;
}

function filterMonthlyByPeriod(monthly, period) {
  if (!monthly || monthly.length === 0 || !period || period === 'all') {
    return monthly || [];
  }
  if (period === 'month' || period === '30d') {
    return monthly.slice(-1);
  } else if (period === '90d') {
    return monthly.slice(-3);
  } else if (period === '6m') {
    return monthly.slice(-6);
  } else if (period === '1y') {
    return monthly.slice(-12);
  }
  return monthly;
}

export function updateChartVisibility() {
  const canvasWrap = document.getElementById('dynamic-chart-canvas-wrap');
  const rentToolbar = document.getElementById('rentabilidade-chart-toolbar');
  const rentLegend = document.getElementById('rent-attribution-legend');

  if (!canvasWrap) return;
  canvasWrap.style.display = 'block';

  const wrapViewPicker = document.getElementById('wrap-rent-chart-view-picker');
  const wrapBmPicker = document.getElementById('wrap-rent-chart-bm-picker');

  // Sincronizar botões de moeda ativos com state.chartCurrency
  const currBtns = document.querySelectorAll('#currency-toggle-group .sales-mode-btn');
  currBtns.forEach(btn => {
    if (btn.getAttribute('data-currency') === (state.chartCurrency || 'brl')) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  if (state.activeChartMode === 'monthly_gain') {
    if (rentToolbar) rentToolbar.style.display = 'flex';
    if (rentLegend) rentLegend.style.display = 'grid';
    if (wrapViewPicker) wrapViewPicker.style.display = 'block';
    if (wrapBmPicker) wrapBmPicker.style.display = 'none';
    renderViewPickerOptions();
    renderCapitalGainChart();
  } else {
    if (state.activeChartMode === 'pct') {
      if (rentToolbar) rentToolbar.style.display = 'flex';
      if (rentLegend) rentLegend.style.display = 'grid';
      if (wrapViewPicker) wrapViewPicker.style.display = 'block';
      if (wrapBmPicker) wrapBmPicker.style.display = 'block';
      renderViewPickerOptions();
    } else if (state.activeChartMode === 'deposits_vs_total') {
      if (rentToolbar) rentToolbar.style.display = 'flex';
      if (rentLegend) rentLegend.style.display = 'grid';
      if (wrapViewPicker) wrapViewPicker.style.display = 'none';
    } else if (state.activeChartMode === 'inflows_by_asset') {
      if (rentToolbar) rentToolbar.style.display = 'flex';
      if (rentLegend) rentLegend.style.display = 'grid';
      if (wrapViewPicker) wrapViewPicker.style.display = 'none';
      if (wrapBmPicker) wrapBmPicker.style.display = 'none';
    } else {
      // Outros modos
      if (rentToolbar) rentToolbar.style.display = 'none';
      if (rentLegend) rentLegend.style.display = 'none';
    }
    renderDynamicChart();
  }
}

export function renderCapsuleValues() {}

function renderPatrimonioSummaryBadge(lastPt, isUSD, t0, period) {
  const container = document.getElementById('rent-chart-summary-badge');
  if (!container) return;
  if (!lastPt) {
    container.innerHTML = '';
    return;
  }

  const isAll = !period || period === 'all' || !t0 || t0 === lastPt;
  let profit, pct, label;

  if (isAll) {
    const pat = isUSD ? lastPt.smart_val_usd : lastPt.smart_val;
    const inv = isUSD ? (lastPt.total_invested_usd != null ? lastPt.total_invested_usd : (lastPt.total_invested / (lastPt.usd_rate || 5.5))) : lastPt.total_invested;
    profit = pat - inv;
    pct = inv > 0 ? (profit / inv) * 100.0 : 0.0;
    label = 'Lucro Acumulado:';
  } else {
    const pat0 = isUSD ? t0.smart_val_usd : t0.smart_val;
    const pat1 = isUSD ? lastPt.smart_val_usd : lastPt.smart_val;
    const inv0 = isUSD ? (t0.total_invested_usd != null ? t0.total_invested_usd : (t0.total_invested / (t0.usd_rate || 5.5))) : t0.total_invested;
    const inv1 = isUSD ? (lastPt.total_invested_usd != null ? lastPt.total_invested_usd : (lastPt.total_invested / (lastPt.usd_rate || 5.5))) : lastPt.total_invested;
    const inflows = inv1 - inv0;
    profit = (pat1 - pat0) - inflows;
    const basePort = isUSD ? t0.smart_return_pct_usd : t0.smart_return_pct;
    const rawPort = isUSD ? lastPt.smart_return_pct_usd : lastPt.smart_return_pct;
    pct = normalizeReturnPct(rawPort, basePort) || 0.0;
    label = 'Resultado no Período:';
  }

  const sign = profit >= 0 ? '+' : '';
  const pctSign = pct >= 0 ? '+' : '';
  const formattedProfit = isUSD ? formatMoney(profit, 'usd') : formatMoney(profit, 'brl');

  container.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; font-size: 0.76rem;">
      <span style="color: var(--charcoal-muted); font-weight: 600;">${label}</span>
      <span style="font-weight: 800; color: ${profit >= 0 ? '#10B981' : '#EF4444'};">${sign}${formattedProfit} (${pctSign}${pct.toFixed(2)}%)</span>
    </div>
  `;
}

function renderPatrimonioPills(lastPt, isUSD) {
  const container = document.getElementById('rent-attribution-legend');
  if (!container) return;
  if (!lastPt) {
    container.innerHTML = '';
    return;
  }

  container.style.display = 'grid';
  container.classList.add('single-row');
  container.innerHTML = '';

  const pat = isUSD ? lastPt.smart_val_usd : lastPt.smart_val;
  const inv = isUSD ? (lastPt.total_invested_usd != null ? lastPt.total_invested_usd : (lastPt.total_invested / (lastPt.usd_rate || 5.5))) : lastPt.total_invested;

  const patFormatted = isUSD ? formatMoney(pat, 'usd') : formatMoney(pat, 'brl');
  const invFormatted = isUSD ? formatMoney(inv, 'usd') : formatMoney(inv, 'brl');

  const isPatHidden = hiddenPatrimonioDatasets.has('patrimonio');
  const isInvHidden = hiddenPatrimonioDatasets.has('invested');

  // 1. Pílula Patrimônio Líquido (Esmeralda / Sage Forest #2E7D5B)
  const patPill = document.createElement('div');
  patPill.className = `rent-legend-pill ${isPatHidden ? 'disabled' : ''}`;
  patPill.style.cursor = 'pointer';
  patPill.title = 'Clique para ocultar/exibir o patrimônio líquido no gráfico';
  patPill.innerHTML = `
    <span class="rent-pill-dot" style="background: #2E7D5B;"></span>
    <span class="rent-pill-name" style="font-weight: 700;">Patrimônio Líquido</span>
    <span class="rent-pill-val pos">${patFormatted}</span>
  `;
  patPill.addEventListener('click', () => {
    if (hiddenPatrimonioDatasets.has('patrimonio')) {
      hiddenPatrimonioDatasets.delete('patrimonio');
    } else {
      hiddenPatrimonioDatasets.add('patrimonio');
    }
    renderDynamicChart();
  });
  container.appendChild(patPill);

  // 2. Pílula Valor Aplicado (Charcoal #0F172A)
  const invPill = document.createElement('div');
  invPill.className = `rent-legend-pill ${isInvHidden ? 'disabled' : ''}`;
  invPill.style.cursor = 'pointer';
  invPill.title = 'Clique para ocultar/exibir o valor aplicado no gráfico';
  invPill.innerHTML = `
    <span class="rent-pill-dot" style="background: #0F172A;"></span>
    <span class="rent-pill-name" style="font-weight: 700;">Valor Aplicado</span>
    <span class="rent-pill-val" style="color: #0F172A;">${invFormatted}</span>
  `;
  invPill.addEventListener('click', () => {
    if (hiddenPatrimonioDatasets.has('invested')) {
      hiddenPatrimonioDatasets.delete('invested');
    } else {
      hiddenPatrimonioDatasets.add('invested');
    }
    renderDynamicChart();
  });
  container.appendChild(invPill);
}

function renderInflowsSummaryBadge(inflows, isUSD, sim) {
  const container = document.getElementById('rent-chart-summary-badge');
  if (!container) return;
  if (!inflows || inflows.length === 0) {
    container.innerHTML = '';
    return;
  }

  const usdRate = (sim && sim.last_usd_rate) || 5.5;
  const total = inflows.reduce((sum, i) => {
    const val = isUSD ? (i.amount_usd != null ? i.amount_usd : (i.amount / usdRate)) : i.amount;
    return sum + (val || 0);
  }, 0);

  const formatted = isUSD ? formatMoney(total, 'usd') : formatMoney(total, 'brl');

  container.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; font-size: 0.76rem;">
      <span style="color: var(--charcoal-muted); font-weight: 600;">Total Aportado no Período:</span>
      <span style="font-weight: 800; color: #10B981;">${formatted}</span>
    </div>
  `;
}

function renderInflowsPills(inflows, funds, isUSD, sim) {
  const container = document.getElementById('rent-attribution-legend');
  if (!container) return;

  container.style.display = 'grid';
  container.classList.remove('single-row');
  container.innerHTML = '';

  const usdRate = (sim && sim.last_usd_rate) || 5.5;

  // 1. Pílula Total de Aportes
  const totalInflows = (inflows || []).reduce((sum, i) => {
    const val = isUSD ? (i.amount_usd != null ? i.amount_usd : (i.amount / usdRate)) : i.amount;
    return sum + (val || 0);
  }, 0);
  const totalFormatted = isUSD ? formatMoney(totalInflows, 'usd') : formatMoney(totalInflows, 'brl');

  const totalPill = document.createElement('div');
  totalPill.className = 'rent-legend-pill';
  totalPill.style.cursor = 'default';
  totalPill.innerHTML = `
    <span class="rent-pill-dot" style="background: #0F172A;"></span>
    <span class="rent-pill-name" style="font-weight: 700;">Total Aportado</span>
    <span class="rent-pill-val pos">${totalFormatted}</span>
  `;
  container.appendChild(totalPill);

  // 2. Pílula de cada Fundo com o total aportado nele no período
  (funds || []).forEach((f, idx) => {
    const k = getAssetKey(f);
    const fundTotal = (inflows || []).reduce((sum, i) => {
      const val = (i.allocations && i.allocations[k]) ? i.allocations[k] : 0.0;
      return sum + (isUSD ? (val / usdRate) : val);
    }, 0);

    const color = f.color || PALETTE.funds[idx % PALETTE.funds.length];
    const isHidden = hiddenInflowsDatasets.has(f.name);
    const formatted = isUSD ? formatMoney(fundTotal, 'usd') : formatMoney(fundTotal, 'brl');

    const pill = document.createElement('div');
    pill.className = `rent-legend-pill ${isHidden ? 'disabled' : ''}`;
    pill.style.cursor = 'pointer';
    pill.title = 'Clique para ocultar/exibir este fundo no gráfico de aportes';
    pill.innerHTML = `
      <span class="rent-pill-dot" style="background: ${color};"></span>
      <span class="rent-pill-name">${f.name}</span>
      <span class="rent-pill-val" style="color: var(--charcoal-dark); font-weight: 700;">${formatted}</span>
    `;

    pill.addEventListener('click', () => {
      if (hiddenInflowsDatasets.has(f.name)) {
        hiddenInflowsDatasets.delete(f.name);
      } else {
        hiddenInflowsDatasets.add(f.name);
      }
      renderDynamicChart();
    });

    container.appendChild(pill);
  });
}

export function renderDynamicChart() {
  const sim = state.simulationResult;
  if (!sim) return;

  const canvas = document.getElementById('mainChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (state.chart) {
    state.chart.destroy();
    state.chart = null;
  }

  const isUSD = (state.chartCurrency || 'brl') === 'usd';
  const mode = state.activeChartMode;
  const period = state.selectedSalesPeriod || '90d';
  const timeline = filterTimelineByPeriod(sim.timeline || [], period);

  // 1. MODO: PATRIMÔNIO LÍQUIDO VS VALOR APLICADO (2 Curvas com visual elegante Dribbble)
  if (mode === 'deposits_vs_total') {
    const t0 = timeline.length > 0 ? timeline[0] : null;
    const lastPt = timeline.length > 0 ? timeline[timeline.length - 1] : null;
    renderPatrimonioSummaryBadge(lastPt, isUSD, t0, period);
    renderPatrimonioPills(lastPt, isUSD);

    const labels = timeline.map(t => {
      const [y, m, d] = t.date.split('-');
      return `${d}/${m}/${y.slice(2)}`;
    });

    const chartHeight = canvas.height || 360;

    // Gradiente esmeralda elegante para o Patrimônio Líquido (estilo rentabilidade)
    const gradPatrimonio = ctx.createLinearGradient(0, 0, 0, chartHeight);
    gradPatrimonio.addColorStop(0, 'rgba(46, 125, 91, 0.30)');
    gradPatrimonio.addColorStop(0.7, 'rgba(46, 125, 91, 0.08)');
    gradPatrimonio.addColorStop(1, 'rgba(46, 125, 91, 0.01)');

    // Gradiente charcoal sutil para o Valor Aplicado (capital investido)
    const gradAplicado = ctx.createLinearGradient(0, 0, 0, chartHeight);
    gradAplicado.addColorStop(0, 'rgba(15, 23, 42, 0.14)');
    gradAplicado.addColorStop(0.7, 'rgba(15, 23, 42, 0.04)');
    gradAplicado.addColorStop(1, 'rgba(15, 23, 42, 0.01)');

    state.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Patrimônio líquido',
            data: timeline.map(t => isUSD ? t.smart_val_usd : t.smart_val),
            borderColor: '#2E7D5B',
            backgroundColor: gradPatrimonio,
            borderWidth: 2.8,
            fill: true,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#2E7D5B',
            pointHoverBorderColor: '#FFFFFF',
            pointHoverBorderWidth: 2.5,
            order: 1,
            hidden: hiddenPatrimonioDatasets.has('patrimonio')
          },
          {
            label: 'Valor aplicado',
            data: timeline.map(t => isUSD ? (t.total_invested_usd != null ? t.total_invested_usd : (t.total_invested / (t.usd_rate || 5.5))) : t.total_invested),
            borderColor: '#0F172A',
            backgroundColor: gradAplicado,
            borderWidth: 2.4,
            fill: true,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#0F172A',
            pointHoverBorderColor: '#FFFFFF',
            pointHoverBorderWidth: 2.5,
            order: 2,
            hidden: hiddenPatrimonioDatasets.has('invested')
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            titleColor: '#0F172A',
            bodyColor: '#334155',
            borderColor: 'rgba(0, 0, 0, 0.08)',
            borderWidth: 1,
            padding: 14,
            cornerRadius: 14,
            boxPadding: 6,
            usePointStyle: true,
            titleFont: { family: 'Plus Jakarta Sans', size: 13, weight: 800 },
            bodyFont: { family: 'Plus Jakarta Sans', size: 12, weight: 600 },
            callbacks: {
              title: (items) => {
                if (!items.length) return '';
                const idx = items[0].dataIndex;
                const pt = timeline[idx];
                if (pt && pt.date) {
                  const [y, m, d] = pt.date.split('-');
                  return `Data: ${d}/${m}/${y}`;
                }
                return items[0].label;
              },
              label: (item) => {
                const val = item.raw || 0;
                const formatted = isUSD ? formatMoney(val, 'usd') : formatMoney(val, 'brl');
                return ` ${item.dataset.label}: ${formatted}`;
              },
              afterBody: (items) => {
                const patItem = items.find(i => i.dataset.label === 'Patrimônio líquido');
                const aplItem = items.find(i => i.dataset.label === 'Valor aplicado');
                if (patItem && aplItem) {
                  const pat = patItem.raw || 0;
                  const apl = aplItem.raw || 0;
                  const diff = pat - apl;
                  const pct = apl > 0 ? (diff / apl) * 100.0 : 0.0;
                  const sign = diff >= 0 ? '+' : '';
                  const diffFormatted = isUSD ? formatMoney(diff, 'usd') : formatMoney(diff, 'brl');
                  return `\nLucro Nominal Acumulado: ${sign}${diffFormatted} (${sign}${pct.toFixed(2)}%)`;
                }
                return '';
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(0, 0, 0, 0.03)' },
            ticks: {
              color: '#8E9097',
              font: { family: 'Plus Jakarta Sans', size: 11, weight: 500 },
              maxTicksLimit: 10
            }
          },
          y: {
            grid: { color: 'rgba(0, 0, 0, 0.04)' },
            ticks: {
              color: '#8E9097',
              font: { family: 'Plus Jakarta Sans', size: 11, weight: 500 },
              callback: v => isUSD ? 'US$ ' + (v / 1000).toFixed(0) + 'k' : 'R$ ' + (v / 1000).toFixed(0) + 'k'
            }
          }
        }
      }
    });
    return;
  }

  // 2. MODO: GANHO DE CAPITAL (COM CONTRIBUIÇÃO DE CADA FUNDO)
  if (mode === 'monthly_gain') {
    renderCapitalGainChart();
    return;
  }

  // 3. MODO: APORTES (STACKED BARS COM BORDER RADIUS APENAS NO TOPO DO COMPONENTE SUPERIOR)
  if (mode === 'inflows_by_asset') {
    const inflows = filterMonthlyByPeriod(sim.monthly_inflows || [], period);
    const labels = inflows.map(i => i.month_label);
    const usdRate = sim.last_usd_rate || 5.5;
    const funds = sim.funds || [];

    renderInflowsSummaryBadge(inflows, isUSD, sim);
    renderInflowsPills(inflows, funds, isUSD, sim);

    // Filtrar fundos visíveis
    const visibleFunds = funds.filter(f => !hiddenInflowsDatasets.has(f.name));

    // Pré-calcular matriz de valores [fundIdx][monthIdx]
    const matrix = visibleFunds.map((f, idx) => {
      const k = getAssetKey(f);
      return inflows.map(i => {
        const val = (i.allocations && i.allocations[k]) ? i.allocations[k] : 0.0;
        return isUSD ? (val / usdRate) : val;
      });
    });

    // Para cada mês m, encontrar qual fundo é o topo da barra empilhada (o último índice com valor > 0)
    const numMonths = inflows.length;
    const topFundPerMonth = [];
    for (let m = 0; m < numMonths; m++) {
      let topIdx = -1;
      for (let fIdx = visibleFunds.length - 1; fIdx >= 0; fIdx--) {
        if (matrix[fIdx][m] > 0.001) {
          topIdx = fIdx;
          break;
        }
      }
      topFundPerMonth.push(topIdx);
    }

    const datasets = visibleFunds.map((f, fIdx) => {
      const color = f.color || PALETTE.funds[fIdx % PALETTE.funds.length];
      const dataPoints = matrix[fIdx];

      // Array de borderRadius: se for o topo do mês m, arredonda apenas o topo { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 }.
      // No fundo inferior e em todos os intermediários, borderRadius é 0 (sem arredondamento na base inferior!).
      const borderRadiusArray = [];
      for (let m = 0; m < numMonths; m++) {
        if (topFundPerMonth[m] === fIdx) {
          borderRadiusArray.push({
            topLeft: 6,
            topRight: 6,
            bottomLeft: 0,
            bottomRight: 0
          });
        } else {
          borderRadiusArray.push(0);
        }
      }

      return {
        label: f.name,
        data: dataPoints,
        backgroundColor: color,
        hoverBackgroundColor: color,
        borderRadius: borderRadiusArray,
        borderSkipped: false,
        maxBarThickness: 34
      };
    });

    state.chart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        categoryPercentage: 0.72,
        barPercentage: 0.88,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            titleColor: '#0F172A',
            bodyColor: '#334155',
            borderColor: 'rgba(0, 0, 0, 0.08)',
            borderWidth: 1,
            padding: 14,
            cornerRadius: 14,
            boxPadding: 6,
            usePointStyle: true,
            titleFont: { family: 'Plus Jakarta Sans', size: 13, weight: 800 },
            bodyFont: { family: 'Plus Jakarta Sans', size: 12, weight: 600 },
            callbacks: {
              title: (items) => {
                if (!items.length) return '';
                const idx = items[0].dataIndex;
                const inf = inflows[idx];
                return inf ? `Mês: ${inf.month_label}` : items[0].label;
              },
              label: (item) => {
                const val = item.raw || 0;
                if (val <= 0.001) return null;
                const formatted = isUSD ? formatMoney(val, 'usd') : formatMoney(val, 'brl');
                return ` ${item.dataset.label}: ${formatted}`;
              },
              afterBody: (items) => {
                if (!items.length) return '';
                const idx = items[0].dataIndex;
                const inf = inflows[idx];
                if (!inf) return '';
                const monthTotal = visibleFunds.reduce((sum, f, fIdx) => sum + (matrix[fIdx][idx] || 0), 0);
                const formatted = isUSD ? formatMoney(monthTotal, 'usd') : formatMoney(monthTotal, 'brl');
                return `\nTotal Aportado: ${formatted}`;
              }
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: {
              color: '#8E9097',
              font: { family: 'Plus Jakarta Sans', size: 11, weight: 600 },
              maxTicksLimit: 12
            }
          },
          y: {
            stacked: true,
            grid: { color: 'rgba(0, 0, 0, 0.04)' },
            ticks: {
              color: '#8E9097',
              font: { family: 'Plus Jakarta Sans', size: 11, weight: 500 },
              callback: v => {
                if (v === 0) return '0';
                return isUSD
                  ? '$ ' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v.toFixed(0))
                  : 'R$ ' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v.toFixed(0));
              }
            }
          }
        }
      }
    });
    return;
  }

  // 4. MODO: RENTABILIDADE ACUMULADA (%) & CONTRIBUIÇÃO (RETURN ATTRIBUTION)
  if (mode === 'pct') {
    renderRentabilidadeChart();
    return;
  }
}
