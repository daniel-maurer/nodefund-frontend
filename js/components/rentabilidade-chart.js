/**
 * PrevInvest - Rentabilidade Chart Component (Return Attribution & Benchmarks)
 * Componente modular desacoplado com design de alta fidelidade visual (estilo Dribbble)
 * para exibição da rentabilidade da carteira, alternância R$ / US$,
 * seleção de indicadores (CDI, IBOV, etc.) via Popover moderno,
 * e decomposição aditiva de retorno por ativo (Return Attribution).
 */

import { state, notify } from '../state.js';
import { formatMoney, formatPct, normalizeReturnPct, PALETTE, COLORS, getAssetKey } from '../utils/formatters.js';

let rentChart = null;
let activeRentView = 'attribution_stacked'; // 'attribution_stacked' | 'attribution_lines' | 'rentabilidade'
let activeRentBm = 'cdi'; // 'cdi' | 'ibov' | 'sp500' | 'ipca' | 'poupanca' | 'ifix' | 'bitcoin' | 'dolar' | 'none'
const hiddenDatasets = new Set();

const BENCHMARK_OPTIONS = [
  { id: 'cdi', label: 'CDI' },
  { id: 'ibov', label: 'IBOVESPA' },
  { id: 'sp500', label: 'S&P 500' },
  { id: 'ipca', label: 'IPCA' },
  { id: 'poupanca', label: 'Poupança' },
  { id: 'ifix', label: 'IFIX' },
  { id: 'bitcoin', label: 'Bitcoin' },
  { id: 'dolar', label: 'Dólar' },
  { id: 'none', label: 'Nenhum' }
];

let activeGainView = 'gain_total'; // 'gain_total' | 'gain_by_fund'

const RENT_VIEW_OPTIONS = [
  { id: 'attribution_stacked', label: 'Contribuição por Ativo (Área Empilhada)' },
  { id: 'attribution_lines', label: 'Contribuição por Ativo (Linhas)' },
  { id: 'rentabilidade', label: 'Rentabilidade (Carteira e Fundos)' }
];

const GAIN_VIEW_OPTIONS = [
  { id: 'gain_total', label: 'Total da Carteira' },
  { id: 'gain_by_fund', label: 'Composição por Fundo' }
];

function hexToRgba(hex, alpha = 1) {
  if (!hex) return `rgba(16, 185, 129, ${alpha})`;
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Inicializa os controles e popovers do gráfico de rentabilidade.
 */
export function initRentabilidadeControls() {
  const btnView = document.getElementById('btn-rent-chart-view-picker');
  const popoverView = document.getElementById('rent-chart-view-popover');
  const btnBm = document.getElementById('btn-rent-chart-bm-picker');
  const popoverBm = document.getElementById('rent-chart-bm-popover');

  function closeAllPopovers() {
    if (popoverView) popoverView.style.display = 'none';
    if (popoverBm) popoverBm.style.display = 'none';
  }

  if (btnView && popoverView) {
    btnView.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVis = popoverView.style.display === 'block';
      closeAllPopovers();
      popoverView.style.display = isVis ? 'none' : 'block';
    });
  }

  if (btnBm && popoverBm) {
    btnBm.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVis = popoverBm.style.display === 'block';
      closeAllPopovers();
      popoverBm.style.display = isVis ? 'none' : 'block';
    });
  }

  document.addEventListener('click', (e) => {
    if (popoverView && !popoverView.contains(e.target) && e.target !== btnView && !btnView.contains(e.target)) {
      popoverView.style.display = 'none';
    }
    if (popoverBm && !popoverBm.contains(e.target) && e.target !== btnBm && !btnBm.contains(e.target)) {
      popoverBm.style.display = 'none';
    }
  });

  const legendWrap = document.getElementById('rent-attribution-legend');
  if (legendWrap) {
    legendWrap.addEventListener('wheel', (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        legendWrap.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  }

  renderViewPickerOptions();
  renderBmPickerOptions();
}

export function renderViewPickerOptions() {
  const grid = document.getElementById('rent-chart-view-grid');
  const labelEl = document.getElementById('rent-chart-view-picker-label');
  const bmWrapper = document.getElementById('wrap-rent-chart-bm-picker');

  const isGainMode = state.activeChartMode === 'monthly_gain';

  if (bmWrapper) {
    bmWrapper.style.display = isGainMode ? 'none' : 'block';
  }

  if (isGainMode) {
    const SHORT_LABELS = {
      gain_total: 'Total da Carteira',
      gain_by_fund: 'Composição por Fundo'
    };
    if (labelEl) {
      labelEl.innerText = SHORT_LABELS[activeGainView] || 'Total da Carteira';
    }
    if (!grid) return;

    grid.innerHTML = '';
    GAIN_VIEW_OPTIONS.forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `month-pill-item ${activeGainView === opt.id ? 'active' : ''}`;
      btn.style.textAlign = 'left';
      btn.style.padding = '8px 12px';
      btn.innerText = opt.label;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        activeGainView = opt.id;
        const pop = document.getElementById('rent-chart-view-popover');
        if (pop) pop.style.display = 'none';
        renderViewPickerOptions();
        renderCapitalGainChart();
      });
      grid.appendChild(btn);
    });
  } else {
    const SHORT_LABELS = {
      attribution_stacked: 'Área Empilhada',
      attribution_lines: 'Linhas Contribuição',
      rentabilidade: 'Rentabilidade'
    };
    if (labelEl) {
      labelEl.innerText = SHORT_LABELS[activeRentView] || 'Área Empilhada';
    }
    if (!grid) return;

    grid.innerHTML = '';
    RENT_VIEW_OPTIONS.forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `month-pill-item ${activeRentView === opt.id ? 'active' : ''}`;
      btn.style.textAlign = 'left';
      btn.style.padding = '8px 12px';
      btn.innerText = opt.label;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        activeRentView = opt.id;
        const pop = document.getElementById('rent-chart-view-popover');
        if (pop) pop.style.display = 'none';
        renderViewPickerOptions();
        renderRentabilidadeChart();
      });
      grid.appendChild(btn);
    });
  }
}

function renderBmPickerOptions() {
  const grid = document.getElementById('rent-chart-bm-grid');
  const labelEl = document.getElementById('rent-chart-bm-picker-label');
  if (labelEl) {
    const activeOpt = BENCHMARK_OPTIONS.find(b => b.id === activeRentBm);
    labelEl.innerText = activeOpt ? activeOpt.label : 'CDI';
  }
  if (!grid) return;

  grid.innerHTML = '';
  BENCHMARK_OPTIONS.forEach(b => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `month-pill-item ${activeRentBm === b.id ? 'active' : ''}`;
    btn.innerText = b.label;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      activeRentBm = b.id;
      const pop = document.getElementById('rent-chart-bm-popover');
      if (pop) pop.style.display = 'none';
      renderBmPickerOptions();
      renderRentabilidadeChart();
    });
    grid.appendChild(btn);
  });
}

/**
 * Renderiza o gráfico principal de Rentabilidade com todas as opções ativas.
 */
export function renderRentabilidadeChart() {
  const sim = state.simulationResult;
  if (!sim) return;

  const canvas = document.getElementById('mainChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Destruir instância anterior do gráfico se existir
  if (state.chart) {
    state.chart.destroy();
    state.chart = null;
  }
  if (rentChart) {
    rentChart.destroy();
    rentChart = null;
  }

  const isUSD = (state.chartCurrency || 'brl') === 'usd';
  const period = state.selectedSalesPeriod || '90d';
  const timeline = filterTimeline(sim.timeline || [], period);

  if (timeline.length === 0) return;

  const t0 = timeline[0];
  const lastPt = timeline[timeline.length - 1];
  const basePort = isUSD ? (t0.smart_return_pct_usd || 0.0) : (t0.smart_return_pct || 0.0);

  const labels = timeline.map(t => {
    const [y, m, d] = t.date.split('-');
    return `${d}/${m}/${y.slice(2)}`;
  });

  const chartHeight = canvas.parentElement ? canvas.parentElement.clientHeight : 320;

  // 1. Preparar Série Temporal do Benchmark
  let bmDataPoints = null;
  let bmLabel = '';
  let bmColor = '#94A3B8';

  if (activeRentBm !== 'none' && sim.benchmarks && sim.benchmarks[activeRentBm]) {
    const bmObj = sim.benchmarks[activeRentBm];
    const bmMap = {};
    (bmObj.timeline || []).forEach(p => { bmMap[p.date] = p; });
    bmLabel = bmObj.name || activeRentBm.toUpperCase();
    bmColor = PALETTE.benchmarks[activeRentBm] || '#94A3B8';
    const bmPt0 = bmMap[t0.date];
    const baseBm = bmPt0 ? (isUSD ? bmPt0.cash_return_pct_usd : bmPt0.cash_return_pct) : 0.0;
    bmDataPoints = timeline.map(t => {
      if (bmMap[t.date]) {
        const raw = isUSD ? bmMap[t.date].cash_return_pct_usd : bmMap[t.date].cash_return_pct;
        return normalizeReturnPct(raw, baseBm);
      }
      return null;
    });
  }

  // 2. Montar Datasets de acordo com activeRentView
  const datasets = [];

  if (activeRentView === 'rentabilidade') {
    // --- MODO 1: RENTABILIDADE (CARTEIRA E FUNDOS) ---
    // 1. Linha principal da Carteira no topo (iniciando em 0.00% no início do período)
    datasets.push({
      label: isUSD ? 'Retorno Carteira (US$)' : 'Retorno Carteira (R$)',
      shortName: 'Carteira',
      data: timeline.map(t => normalizeReturnPct(isUSD ? t.smart_return_pct_usd : t.smart_return_pct, basePort)),
      borderColor: '#0F172A',
      backgroundColor: 'rgba(15, 23, 42, 0.04)',
      borderWidth: 3.5,
      fill: false,
      tension: 0.35,
      pointRadius: 0,
      pointHoverRadius: 6,
      pointHoverBackgroundColor: '#0F172A',
      pointHoverBorderColor: '#FFFFFF',
      pointHoverBorderWidth: 2.5,
      order: 0
    });

    // 2. Linhas de rentabilidade de cada fundo (iniciando em 0.00% no início do período)
    (sim.funds || []).forEach((f, idx) => {
      const k = getAssetKey(f);
      const color = f.color || PALETTE.funds[idx % PALETTE.funds.length];
      const isHidden = hiddenDatasets.has(f.name);

      const getFundRawRent = (t) => {
        const rets = isUSD ? t.asset_return_pcts_usd : t.asset_return_pcts;
        if (rets && rets[k] !== undefined) return rets[k];
        const singles = isUSD ? t.single_return_pcts_usd : t.single_return_pcts;
        return singles && singles[k] !== undefined ? singles[k] : 0.0;
      };

      const baseFund = getFundRawRent(t0);
      const fundRentData = timeline.map(t => normalizeReturnPct(getFundRawRent(t), baseFund));

      datasets.push({
        label: `Rentabilidade: ${f.name}`,
        shortName: f.name,
        assetKey: k,
        data: fundRentData,
        borderColor: color,
        borderWidth: 2.2,
        fill: false,
        tension: 0.35,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: color,
        pointHoverBorderColor: '#FFFFFF',
        pointHoverBorderWidth: 2,
        hidden: isHidden,
        order: idx + 1
      });
    });

    if (bmDataPoints) {
      datasets.push({
        label: bmLabel,
        data: bmDataPoints,
        borderColor: bmColor,
        borderWidth: 1.8,
        borderDash: [5, 4],
        fill: false,
        tension: 0.35,
        pointRadius: 0,
        pointHoverRadius: 5,
        order: 99
      });
    }

  } else if (activeRentView === 'attribution_lines') {
    // --- MODO 2: CONTRIBUIÇÃO POR ATIVO (MULTI-LINHAS) ---
    // Linha principal da carteira no topo
    datasets.push({
      label: isUSD ? 'Retorno Total da Carteira (US$)' : 'Retorno Total da Carteira (R$)',
      data: timeline.map(t => normalizeReturnPct(isUSD ? t.smart_return_pct_usd : t.smart_return_pct, basePort)),
      borderColor: '#0F172A',
      backgroundColor: 'rgba(15, 23, 42, 0.04)',
      borderWidth: 3.5,
      fill: false,
      tension: 0.35,
      pointRadius: 0,
      pointHoverRadius: 6,
      pointHoverBackgroundColor: '#0F172A',
      pointHoverBorderColor: '#FFFFFF',
      pointHoverBorderWidth: 2.5,
      order: 0
    });

    // Linha de contribuição individual de cada fundo (iniciando em 0.00% no início do período)
    (sim.funds || []).forEach((f, idx) => {
      const k = getAssetKey(f);
      const color = f.color || PALETTE.funds[idx % PALETTE.funds.length];
      const isHidden = hiddenDatasets.has(f.name);

      const getFundContrib = (t) => {
        const contribs = isUSD ? t.smart_contributions_usd : t.smart_contributions;
        return contribs && contribs[k] !== undefined ? contribs[k] : 0.0;
      };
      const baseContrib = getFundContrib(t0);
      const contribData = timeline.map(t => getFundContrib(t) - baseContrib);

      datasets.push({
        label: `Contribuição: ${f.name}`,
        shortName: f.name,
        assetKey: k,
        data: contribData,
        borderColor: color,
        borderWidth: 2.2,
        fill: false,
        tension: 0.35,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: color,
        pointHoverBorderColor: '#FFFFFF',
        pointHoverBorderWidth: 2,
        hidden: isHidden,
        order: idx + 1
      });
    });

    if (bmDataPoints) {
      datasets.push({
        label: bmLabel,
        data: bmDataPoints,
        borderColor: bmColor,
        borderWidth: 1.8,
        borderDash: [5, 4],
        fill: false,
        tension: 0.35,
        pointRadius: 0,
        pointHoverRadius: 5,
        order: 99
      });
    }

  } else if (activeRentView === 'attribution_stacked') {
    // --- MODO 3: CONTRIBUIÇÃO POR ATIVO (ÁREA EMPILHADA) ---
    (sim.funds || []).forEach((f, idx) => {
      const k = getAssetKey(f);
      const color = f.color || PALETTE.funds[idx % PALETTE.funds.length];
      const isHidden = hiddenDatasets.has(f.name);
      const grad = ctx.createLinearGradient(0, 0, 0, chartHeight);
      grad.addColorStop(0, hexToRgba(color, 0.65));
      grad.addColorStop(1, hexToRgba(color, 0.15));

      const getFundContrib = (t) => {
        const contribs = isUSD ? t.smart_contributions_usd : t.smart_contributions;
        return contribs && contribs[k] !== undefined ? contribs[k] : 0.0;
      };
      const baseContrib = getFundContrib(t0);
      const contribData = timeline.map(t => getFundContrib(t) - baseContrib);

      datasets.push({
        label: f.name,
        shortName: f.name,
        data: contribData,
        backgroundColor: grad,
        borderColor: color,
        borderWidth: 1.6,
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        pointHoverRadius: 5,
        hidden: isHidden,
        stack: 'attribution_stack',
        order: idx + 1
      });
    });

    if (bmDataPoints) {
      const isBmHidden = hiddenDatasets.has(bmLabel);
      datasets.push({
        label: bmLabel,
        shortName: bmLabel,
        data: bmDataPoints,
        borderColor: bmColor,
        borderWidth: 2.4,
        borderDash: [5, 4],
        fill: false,
        tension: 0.35,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: bmColor,
        pointHoverBorderColor: '#FFFFFF',
        pointHoverBorderWidth: 2,
        hidden: isBmHidden,
        order: 0,
        stack: 'benchmark'
      });
    }
  }

  // 3. Inicializar Instância do Chart.js com Estética Dribbble
  rentChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false }, // Legenda customizada em pílulas renderizada abaixo
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
              const pt = timeline[idx];
              if (pt && pt.date) {
                const [y, m, d] = pt.date.split('-');
                return `Data: ${d}/${m}/${y}`;
              }
              return items[0].label;
            },
            label: (item) => {
              const val = item.raw || 0;
              const sign = val >= 0 ? '+' : '';
              const valStr = `${sign}${val.toFixed(2)}%`;
              const ds = item.dataset;

              // Em modo atribuição por linhas, destacar participação relativa
              if (activeRentView === 'attribution_lines' && ds.shortName) {
                const idx = item.dataIndex;
                const pt = timeline[idx];
                const totalRet = isUSD ? pt.smart_return_pct_usd : pt.smart_return_pct;
                let shareStr = '';
                if (Math.abs(totalRet) > 0.01) {
                  const share = (val / totalRet) * 100.0;
                  shareStr = ` (${share >= 0 ? '+' : ''}${share.toFixed(1)}% do resultado)`;
                }
                return ` ${ds.shortName}: ${valStr}${shareStr}`;
              }

              return ` ${ds.label}: ${valStr}`;
            },
            afterBody: (items) => {
              if (!items.length) return '';
              const idx = items[0].dataIndex;
              const pt = timeline[idx];
              if (!pt) return '';

              const curProfit = isUSD ? (pt.smart_profit_usd || 0) : (pt.smart_profit || 0);
              const baseProfit = isUSD ? (t0.smart_profit_usd || 0) : (t0.smart_profit || 0);
              const profitInPeriod = curProfit - baseProfit;
              const profitStr = formatMoney(profitInPeriod, isUSD ? 'usd' : 'brl');
              const sign = profitInPeriod >= 0 ? '+' : '';
              const label = (period === 'all') ? 'Lucro Nominal Acumulado' : 'Lucro Nominal no Período';
              return `\n${label}: ${sign}${profitStr}`;
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
          stacked: activeRentView === 'attribution_stacked',
          grid: { color: 'rgba(0, 0, 0, 0.04)' },
          ticks: {
            color: '#8E9097',
            font: { family: 'Plus Jakarta Sans', size: 11, weight: 600 },
            callback: v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
          }
        }
      }
    }
  });

  state.chart = rentChart;

  // 4. Renderizar Resumo Visual e Pílulas de Legenda Interativa
  renderSummaryBadge(timeline[timeline.length - 1], isUSD, t0, period);
  renderAttributionPills(timeline[timeline.length - 1], sim.funds || [], isUSD, t0, activeRentBm);
}

function renderSummaryBadge(lastPt, isUSD, t0, period) {
  const container = document.getElementById('rent-chart-summary-badge');
  if (!container || !lastPt) return;

  const basePort = t0 ? (isUSD ? t0.smart_return_pct_usd : t0.smart_return_pct) : 0.0;
  const rawPort = isUSD ? lastPt.smart_return_pct_usd : lastPt.smart_return_pct;
  const portRet = normalizeReturnPct(rawPort, basePort);
  const sign = portRet >= 0 ? '+' : '';
  const label = (!period || period === 'all') ? 'Retorno Carteira:' : 'Retorno no Período:';

  container.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; font-size: 0.76rem;">
      <span style="color: var(--charcoal-muted); font-weight: 600;">${label}</span>
      <span style="font-weight: 800; color: ${portRet >= 0 ? '#10B981' : '#EF4444'};">${sign}${portRet.toFixed(2)}%</span>
    </div>
  `;
}

function renderAttributionPills(lastPt, funds, isUSD, t0, currentBm) {
  const container = document.getElementById('rent-attribution-legend');
  if (!container || !lastPt) return;

  container.style.display = 'grid';
  container.classList.remove('single-row');
  container.innerHTML = '';

  const isRentMode = activeRentView === 'rentabilidade';

  // 1. Pílula da Carteira Total (Retorno no período)
  const basePort = t0 ? (isUSD ? t0.smart_return_pct_usd : t0.smart_return_pct) : 0.0;
  const rawPort = isUSD ? lastPt.smart_return_pct_usd : lastPt.smart_return_pct;
  const portRet = normalizeReturnPct(rawPort, basePort);
  const portSign = portRet >= 0 ? '+' : '';
  const portPill = document.createElement('div');
  portPill.className = 'rent-legend-pill';
  portPill.style.cursor = 'default';
  portPill.innerHTML = `
    <span class="rent-pill-dot" style="background: #0F172A;"></span>
    <span class="rent-pill-name" style="font-weight: 700;">Carteira Total</span>
    <span class="rent-pill-val ${portRet >= 0 ? 'pos' : 'neg'}">${portSign}${portRet.toFixed(2)}%</span>
  `;
  container.appendChild(portPill);

  // 2. Pílula do Benchmark (se selecionado e ativo)
  const sim = state.simulationResult;
  if (currentBm !== 'none' && sim && sim.benchmarks && sim.benchmarks[currentBm]) {
    const bmObj = sim.benchmarks[currentBm];
    const bmLabel = bmObj.name || currentBm.toUpperCase();
    const isBmHidden = hiddenDatasets.has(bmLabel);
    const bmMap = {};
    (bmObj.timeline || []).forEach(p => { bmMap[p.date] = p; });
    const bmPt = bmMap[lastPt.date];
    const bmPt0 = t0 ? bmMap[t0.date] : null;
    if (bmPt) {
      const baseBm = bmPt0 ? (isUSD ? bmPt0.cash_return_pct_usd : bmPt0.cash_return_pct) : 0.0;
      const rawBm = isUSD ? bmPt.cash_return_pct_usd : bmPt.cash_return_pct;
      const bmRet = normalizeReturnPct(rawBm, baseBm);
      const bmSign = bmRet >= 0 ? '+' : '';
      const bmPill = document.createElement('div');
      bmPill.className = `rent-legend-pill ${isBmHidden ? 'disabled' : ''}`;
      bmPill.style.cursor = 'pointer';
      bmPill.title = 'Clique para ocultar/exibir este indicador no gráfico';
      bmPill.innerHTML = `
        <span class="rent-pill-dot" style="background: ${PALETTE.benchmarks[currentBm] || '#94A3B8'};"></span>
        <span class="rent-pill-name" style="font-weight: 700;">${bmLabel}</span>
        <span class="rent-pill-val ${bmRet >= 0 ? 'pos' : 'neg'}">${bmSign}${bmRet.toFixed(2)}%</span>
      `;
      bmPill.addEventListener('click', () => {
        if (hiddenDatasets.has(bmLabel)) {
          hiddenDatasets.delete(bmLabel);
        } else {
          hiddenDatasets.add(bmLabel);
        }
        renderRentabilidadeChart();
      });
      container.appendChild(bmPill);
    }
  }

  // 3. Pílulas de cada Fundo (com toggle de visibilidade ao clicar)
  funds.forEach((f, idx) => {
    const k = getAssetKey(f);
    let val = 0.0;
    if (isRentMode) {
      const getFundVal = (pt) => {
        if (!pt) return 0.0;
        const rets = isUSD ? pt.asset_return_pcts_usd : pt.asset_return_pcts;
        if (rets && rets[k] !== undefined) return rets[k];
        const singles = isUSD ? pt.single_return_pcts_usd : pt.single_return_pcts;
        return singles && singles[k] !== undefined ? singles[k] : 0.0;
      };
      const baseFund = t0 ? getFundVal(t0) : 0.0;
      const rawFund = getFundVal(lastPt);
      val = normalizeReturnPct(rawFund, baseFund);
    } else {
      const baseContrib = t0 ? ((isUSD ? t0.smart_contributions_usd : t0.smart_contributions)?.[k] || 0.0) : 0.0;
      const rawContrib = ((isUSD ? lastPt.smart_contributions_usd : lastPt.smart_contributions)?.[k] || 0.0);
      val = rawContrib - baseContrib;
    }

    const color = f.color || PALETTE.funds[idx % PALETTE.funds.length];
    const isHidden = hiddenDatasets.has(f.name);

    const pill = document.createElement('div');
    pill.className = `rent-legend-pill ${isHidden ? 'disabled' : ''}`;
    pill.style.cursor = 'pointer';
    pill.title = 'Clique para ocultar/exibir este ativo no gráfico';

    const sign = val >= 0 ? '+' : '';
    pill.innerHTML = `
      <span class="rent-pill-dot" style="background: ${color};"></span>
      <span class="rent-pill-name">${f.name}</span>
      <span class="rent-pill-val ${val >= 0 ? 'pos' : 'neg'}">${sign}${val.toFixed(2)}%</span>
    `;

    pill.addEventListener('click', () => {
      if (hiddenDatasets.has(f.name)) {
        hiddenDatasets.delete(f.name);
      } else {
        hiddenDatasets.add(f.name);
      }
      renderRentabilidadeChart();
    });

    container.appendChild(pill);
  });
}

function filterTimeline(timeline, period) {
  if (!timeline || timeline.length === 0 || !period || period === 'all') {
    return timeline || [];
  }
  const lastPt = timeline[timeline.length - 1];
  if (!lastPt || !lastPt.date) return timeline;

  const lastDate = new Date(lastPt.date + 'T00:00:00');
  const cutoffDate = new Date(lastDate);

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

function filterMonthly(monthly, period) {
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

function formatYMoneyTick(v, isUSD) {
  const prefix = isUSD ? 'US$ ' : 'R$ ';
  const abs = Math.abs(v);
  if (abs === 0) return `${prefix}0`;
  if (abs < 1000) return `${prefix}${Math.round(v)}`;
  const k = (v / 1000).toFixed(1).replace(/\.0$/, '');
  return `${prefix}${k}k`;
}

/**
 * Renderiza o gráfico de Ganho de Capital via Chart.js no canvas principal,
 * fiel ao design visual com:
 * - Eixo X com os meses (Mai/24, Jun/24, etc.) inclinados a 45°
 * - Eixo Y com valores em moeda (R$ ou US$), exibindo negativos abaixo do 0
 * - Barras tipo cápsula arredondada (borderRadius: 14, borderSkipped: false)
 * - Cores semânticas fiéis: verde (#276749) para meses positivos e terracota (#C55A54) para negativos
 * - Tooltip interativo ao passar o mouse exibindo o ganho total do mês e
 *   o detalhamento de cada fundo (composição por fundo).
 */
export function renderCapitalGainChart() {
  const sim = state.simulationResult;
  if (!sim) return;

  const canvasWrap = document.getElementById('dynamic-chart-canvas-wrap');
  const container = document.getElementById('gain-capsules-container');
  if (container) container.style.display = 'none';
  if (canvasWrap) canvasWrap.style.display = 'block';

  const canvas = document.getElementById('mainChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (state.chart) {
    state.chart.destroy();
    state.chart = null;
  }
  if (rentChart) {
    rentChart.destroy();
    rentChart = null;
  }

  const isUSD = (state.chartCurrency || 'brl') === 'usd';
  const period = state.selectedSalesPeriod || '90d';
  const timeline = filterTimeline(sim.timeline || [], period);
  const monthly = filterMonthly(sim.monthly_summary || [], period);
  const funds = sim.funds || [];

  if (monthly.length === 0) {
    return;
  }

  const lastPt = timeline.length > 0 ? timeline[timeline.length - 1] : null;
  const labels = monthly.map(m => m.month_label);

  let datasets = [];

  if (activeGainView === 'gain_total') {
    // 1. MODO CONSOLIDADO: Total da Carteira (fiel à print)
    const gains = monthly.map(m => isUSD ? (m.capital_gain_usd || 0) : (m.capital_gain || 0));
    const bgColors = gains.map(g => g >= 0 ? '#276749' : '#C55A54');
    const hoverColors = gains.map(g => g >= 0 ? '#2F855A' : '#E53E3E');

    datasets.push({
      label: 'Ganho da Carteira',
      data: gains,
      backgroundColor: bgColors,
      hoverBackgroundColor: hoverColors,
      borderRadius: 14,
      borderSkipped: false,
      maxBarThickness: 32
    });
  } else {
    // 2. MODO DETALHADO: Barras por Fundo Lado a Lado
    const activeFunds = funds.filter(f => !hiddenDatasets.has(f.name));
    datasets = activeFunds.map((f, idx) => {
      const k = getAssetKey(f);
      const color = f.color || PALETTE.funds[idx % PALETTE.funds.length];
      const dataPoints = monthly.map(m => {
        const assetGains = isUSD ? (m.asset_capital_gains_usd || {}) : (m.asset_capital_gains || {});
        return assetGains[k] !== undefined ? assetGains[k] : 0.0;
      });

      return {
        label: f.name,
        data: dataPoints,
        backgroundColor: color,
        hoverBackgroundColor: color,
        borderRadius: 8,
        borderSkipped: false,
        maxBarThickness: 20
      };
    });
  }

  rentChart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
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
              const m = monthly[items[0].dataIndex];
              return m ? `Mês: ${m.month_label}` : items[0].label;
            },
            label: (item) => {
              const idx = item.dataIndex;
              const m = monthly[idx];
              if (!m) return '';

              if (activeGainView === 'gain_total') {
                const gain = isUSD ? (m.capital_gain_usd || 0) : (m.capital_gain || 0);
                const pct = isUSD ? (m.return_pct_usd || 0) : (m.return_pct || 0);
                const sign = gain >= 0 ? '+' : '';
                const formatted = isUSD ? formatMoney(gain, 'usd') : formatMoney(gain, 'brl');
                return ` Ganho Total: ${sign}${formatted} (${sign}${pct.toFixed(2)}%)`;
              } else {
                const val = item.raw || 0;
                const sign = val >= 0 ? '+' : '';
                const formatted = isUSD ? formatMoney(val, 'usd') : formatMoney(val, 'brl');
                return ` ${item.dataset.label}: ${sign}${formatted}`;
              }
            },
            labelColor: (context) => {
              if (activeGainView === 'gain_total') {
                const m = monthly[context.dataIndex];
                const gain = isUSD ? (m?.capital_gain_usd || 0) : (m?.capital_gain || 0);
                const col = gain >= 0 ? '#276749' : '#C55A54';
                return { borderColor: col, backgroundColor: col, borderRadius: 4 };
              } else {
                const ds = context.dataset;
                return { borderColor: ds.backgroundColor, backgroundColor: ds.backgroundColor, borderRadius: 4 };
              }
            },
            afterBody: (items) => {
              if (!items.length) return '';
              const idx = items[0].dataIndex;
              const m = monthly[idx];
              if (!m) return '';

              const lines = [];
              if (activeGainView === 'gain_total') {
                lines.push('\nComposição por Fundo:');
                const assetGains = isUSD ? (m.asset_capital_gains_usd || {}) : (m.asset_capital_gains || {});
                funds.forEach(f => {
                  const k = getAssetKey(f);
                  const fGain = assetGains[k] !== undefined ? assetGains[k] : 0.0;
                  const isHidden = hiddenDatasets.has(f.name);
                  if (isHidden) return;
                  const fSign = fGain >= 0 ? '+' : '';
                  const fFormatted = isUSD ? formatMoney(fGain, 'usd') : formatMoney(fGain, 'brl');
                  lines.push(`  • ${f.name}: ${fSign}${fFormatted}`);
                });
              } else {
                const gain = isUSD ? (m.capital_gain_usd || 0) : (m.capital_gain || 0);
                const pct = isUSD ? (m.return_pct_usd || 0) : (m.return_pct || 0);
                const sign = gain >= 0 ? '+' : '';
                const formatted = isUSD ? formatMoney(gain, 'usd') : formatMoney(gain, 'brl');
                lines.push(`\nGanho Total do Mês: ${sign}${formatted} (${sign}${pct.toFixed(2)}%)`);
              }
              return lines.join('\n');
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#8E9097',
            font: { family: 'Plus Jakarta Sans', size: 11, weight: 600 },
            maxRotation: 45,
            minRotation: 45
          }
        },
        y: {
          grid: {
            color: (ctx) => (ctx.tick && ctx.tick.value === 0) ? 'rgba(0, 0, 0, 0.22)' : 'rgba(0, 0, 0, 0.04)',
            lineWidth: (ctx) => (ctx.tick && ctx.tick.value === 0) ? 1.5 : 1
          },
          ticks: {
            color: '#8E9097',
            font: { family: 'Plus Jakarta Sans', size: 11, weight: 600 },
            callback: (v) => {
              const sign = v < 0 ? '-' : '';
              const prefix = isUSD ? 'US$ ' : 'R$ ';
              return `${sign}${prefix}${Math.abs(v).toLocaleString(isUSD ? 'en-US' : 'pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }
          }
        }
      }
    }
  });

  state.chart = rentChart;

  renderCapitalGainSummaryBadge(monthly, timeline, isUSD, period);
  renderCapitalGainAttributionPills(monthly, funds, isUSD);
}

function renderCapitalGainSummaryBadge(monthly, timeline, isUSD, period) {
  const container = document.getElementById('rent-chart-summary-badge');
  if (!container) return;

  const totalGain = (monthly || []).reduce((sum, m) => sum + (isUSD ? (m.capital_gain_usd || 0) : (m.capital_gain || 0)), 0);
  const t0 = timeline && timeline.length > 0 ? timeline[0] : null;
  const lastPt = timeline && timeline.length > 0 ? timeline[timeline.length - 1] : null;

  const basePort = t0 ? (isUSD ? t0.smart_return_pct_usd : t0.smart_return_pct) : 0.0;
  const rawPort = lastPt ? (isUSD ? lastPt.smart_return_pct_usd : lastPt.smart_return_pct) : 0.0;
  const pct = normalizeReturnPct(rawPort, basePort) || 0.0;

  const sign = totalGain >= 0 ? '+' : '';
  const pctSign = pct >= 0 ? '+' : '';
  const formatted = isUSD ? formatMoney(totalGain, 'usd') : formatMoney(totalGain, 'brl');
  const label = (!period || period === 'all') ? 'Ganho de Capital Acumulado:' : 'Ganho de Capital no Período:';

  container.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; font-size: 0.76rem;">
      <span style="color: var(--charcoal-muted); font-weight: 600;">${label}</span>
      <span style="font-weight: 800; color: ${totalGain >= 0 ? '#10B981' : '#EF4444'};">${sign}${formatted} (${pctSign}${pct.toFixed(2)}%)</span>
    </div>
  `;
}

function renderCapitalGainAttributionPills(monthly, funds, isUSD) {
  const container = document.getElementById('rent-attribution-legend');
  if (!container) return;

  container.style.display = 'grid';
  container.classList.remove('single-row');
  container.innerHTML = '';

  // 1. Pílula da Carteira Total
  const totalGain = (monthly || []).reduce((sum, m) => sum + (isUSD ? (m.capital_gain_usd || 0) : (m.capital_gain || 0)), 0);
  const totalSign = totalGain >= 0 ? '+' : '';
  const totalFormatted = isUSD ? formatMoney(totalGain, 'usd') : formatMoney(totalGain, 'brl');
  const portPill = document.createElement('div');
  portPill.className = 'rent-legend-pill';
  portPill.style.cursor = 'default';
  portPill.innerHTML = `
    <span class="rent-pill-dot" style="background: #0F172A;"></span>
    <span class="rent-pill-name" style="font-weight: 700;">Carteira Total</span>
    <span class="rent-pill-val ${totalGain >= 0 ? 'pos' : 'neg'}">${totalSign}${totalFormatted}</span>
  `;
  container.appendChild(portPill);

  // 2. Pílula de cada Fundo com ganho nominal (+R$ / +US$) somado no período
  funds.forEach((f, idx) => {
    const k = getAssetKey(f);
    const fundGain = (monthly || []).reduce((sum, m) => {
      const map = isUSD ? (m.asset_capital_gains_usd || {}) : (m.asset_capital_gains || {});
      return sum + (map[k] || 0);
    }, 0);

    const color = f.color || PALETTE.funds[idx % PALETTE.funds.length];
    const isHidden = hiddenDatasets.has(f.name);
    const sign = fundGain >= 0 ? '+' : '';
    const formatted = isUSD ? formatMoney(fundGain, 'usd') : formatMoney(fundGain, 'brl');

    const pill = document.createElement('div');
    pill.className = `rent-legend-pill ${isHidden ? 'disabled' : ''}`;
    pill.style.cursor = 'pointer';
    pill.title = 'Clique para ocultar/exibir este fundo no gráfico';
    pill.innerHTML = `
      <span class="rent-pill-dot" style="background: ${color};"></span>
      <span class="rent-pill-name">${f.name}</span>
      <span class="rent-pill-val ${fundGain >= 0 ? 'pos' : 'neg'}">${sign}${formatted}</span>
    `;

    pill.addEventListener('click', () => {
      if (hiddenDatasets.has(f.name)) {
        hiddenDatasets.delete(f.name);
      } else {
        hiddenDatasets.add(f.name);
      }
      renderCapitalGainChart();
    });

    container.appendChild(pill);
  });
}
