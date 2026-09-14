/**
 * PrevInvest - Modern Component Loading States (Skeletons)
 * Renderiza skeletons modernos com animação shimmer em cada componente
 * sempre que os dados analíticos, simulações ou cotações estão carregando.
 */

import { state } from '../state.js';

export function renderAllComponentsLoading() {
  state.isLoading = true;
  renderHeroLoading();
  renderBankCardsLoading();
  renderInvoicesLoading();
  renderSalesChartLoading();
  renderTreemapLoading();
  renderCorrelationLoading();
  renderMonthlyTableLoading();
  renderDividendsChartsLoading();
  renderDividendsHistoryLoading();
  renderAssetCardsLoading();
  renderCalculatorLoading();
}

export function renderHeroLoading() {
  const networth = document.getElementById('hero-total-networth');
  if (networth) {
    networth.innerHTML = '<span class="skeleton-shimmer" style="width: 140px; height: 1.85rem; border-radius: 8px;"></span>';
  }

  const statBlocks = document.querySelectorAll('#hero-stats-row .stat-block');
  statBlocks.forEach(block => {
    const amt = block.querySelector('.stat-amount');
    const badge = block.querySelector('.stat-pct-badge');
    const date = block.querySelector('.stat-quote-date');
    if (amt) amt.innerHTML = '<span class="skeleton-shimmer" style="width: 85px; height: 1.15rem;"></span>';
    if (badge) badge.innerHTML = '<span class="skeleton-shimmer" style="width: 44px; height: 1.15rem; border-radius: 9999px;"></span>';
    if (date) date.innerHTML = '<span class="skeleton-shimmer" style="width: 55px; height: 0.75rem;"></span>';
  });
}

export function renderBankCardsLoading() {
  const elements = [
    { id: 'card-smart-val', w: '110px', h: '1.4rem' },
    { id: 'card-smart-profit', w: '80px', h: '1.4rem' },
    { id: 'card-smart-pct', w: '65px', h: '1.1rem', r: '9999px' },
    { id: 'card-passive-val', w: '110px', h: '1.4rem' },
    { id: 'card-passive-profit', w: '80px', h: '1.4rem' },
    { id: 'card-passive-pct', w: '65px', h: '1.1rem', r: '9999px' }
  ];

  elements.forEach(item => {
    const el = document.getElementById(item.id);
    if (el) {
      el.innerHTML = `<span class="skeleton-shimmer" style="width: ${item.w}; height: ${item.h}; ${item.r ? `border-radius: ${item.r};` : ''}"></span>`;
    }
  });
}

export function renderInvoicesLoading() {
  const container = document.getElementById('invoices-list-container');
  if (!container) return;

  let html = '';
  for (let i = 0; i < 4; i++) {
    html += `
      <div class="invoices-skeleton-item">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="skeleton-shimmer" style="width: 32px; height: 32px; border-radius: 50%;"></div>
          <div>
            <div class="skeleton-shimmer" style="width: 80px; height: 0.9rem; margin-bottom: 4px;"></div>
            <div class="skeleton-shimmer" style="width: 50px; height: 0.7rem;"></div>
          </div>
        </div>
        <div style="text-align: right;">
          <div class="skeleton-shimmer" style="width: 75px; height: 0.95rem; margin-bottom: 4px;"></div>
          <div class="skeleton-shimmer" style="width: 45px; height: 0.75rem; border-radius: 9999px;"></div>
        </div>
      </div>
    `;
  }
  container.innerHTML = html;
}

export function renderSalesChartLoading() {
  const chartWrap = document.getElementById('dynamic-chart-canvas-wrap');
  if (!chartWrap) return;

  const existingSkeleton = document.getElementById('sales-chart-skeleton');
  if (existingSkeleton) existingSkeleton.remove();

  const skeleton = document.createElement('div');
  skeleton.id = 'sales-chart-skeleton';
  skeleton.className = 'chart-skeleton-box';
  skeleton.innerHTML = `
    <div class="chart-loading-badge">
      <span class="sync-spinner"></span>
      <span>Calculando projeções analíticas...</span>
    </div>
    <div class="chart-skeleton-bars">
      <div class="chart-skeleton-bar" style="height: 35%;"></div>
      <div class="chart-skeleton-bar" style="height: 55%;"></div>
      <div class="chart-skeleton-bar" style="height: 48%;"></div>
      <div class="chart-skeleton-bar" style="height: 72%;"></div>
      <div class="chart-skeleton-bar" style="height: 65%;"></div>
      <div class="chart-skeleton-bar" style="height: 88%;"></div>
      <div class="chart-skeleton-bar" style="height: 80%;"></div>
      <div class="chart-skeleton-bar" style="height: 95%;"></div>
    </div>
  `;
  chartWrap.style.position = 'relative';
  chartWrap.appendChild(skeleton);
  
  const canvas = document.getElementById('mainChart');
  if (canvas) canvas.style.opacity = '0.15';
}

export function removeSalesChartLoading() {
  state.isLoading = false;
  const existingSkeleton = document.getElementById('sales-chart-skeleton');
  if (existingSkeleton) existingSkeleton.remove();
  const canvas = document.getElementById('mainChart');
  if (canvas) canvas.style.opacity = '1';
  removeDividendsChartsLoading();
}

export function renderTreemapLoading() {
  const container = document.getElementById('treemap-container');
  if (!container) return;

  container.innerHTML = `
    <div class="treemap-skeleton-grid">
      <div class="treemap-skeleton-block" style="grid-column: 1; grid-row: 1 / span 2;"></div>
      <div class="treemap-skeleton-block" style="grid-column: 2; grid-row: 1;"></div>
      <div class="treemap-skeleton-block" style="grid-column: 2; grid-row: 2;"></div>
      <div class="treemap-skeleton-block" style="grid-column: 3; grid-row: 1 / span 2;"></div>
    </div>
  `;
}

export function renderCorrelationLoading() {
  const container = document.getElementById('correlation-heatmap-container');
  if (!container) return;

  let cells = '';
  for (let i = 0; i < 16; i++) {
    cells += '<div class="heatmap-skeleton-cell"></div>';
  }
  container.innerHTML = `<div class="heatmap-skeleton-grid">${cells}</div>`;
}

export function renderMonthlyTableLoading() {
  const gridTbody = document.getElementById('monthly-grid-tbody');
  const listTbody = document.getElementById('monthly-table-body');

  if (gridTbody) {
    let rows = '';
    for (let r = 0; r < 2; r++) {
      let cells = `
        <td style="padding: 12px 14px;">
          <div class="skeleton-shimmer" style="width: 80px; height: 18px; border-radius: 4px;"></div>
        </td>
      `;
      for (let c = 1; c <= 12; c++) {
        cells += `
          <td style="padding: 10px 6px; text-align: center;">
            <div class="skeleton-shimmer" style="width: 42px; height: 16px; margin: 0 auto 3px auto;"></div>
            <div class="skeleton-shimmer" style="width: 28px; height: 11px; margin: 0 auto;"></div>
          </td>
        `;
      }
      cells += `
        <td style="padding: 10px 8px; text-align: right;">
          <div class="skeleton-shimmer" style="width: 48px; height: 16px; margin-left: auto; margin-bottom: 3px;"></div>
          <div class="skeleton-shimmer" style="width: 32px; height: 11px; margin-left: auto;"></div>
        </td>
        <td style="padding: 10px 8px; text-align: right;">
          <div class="skeleton-shimmer" style="width: 52px; height: 16px; margin-left: auto; margin-bottom: 3px;"></div>
          <div class="skeleton-shimmer" style="width: 34px; height: 11px; margin-left: auto;"></div>
        </td>
      `;
      rows += `<tr>${cells}</tr>`;
    }
    gridTbody.innerHTML = rows;
  }

  if (listTbody) {
    let rows = '';
    for (let r = 0; r < 4; r++) {
      rows += `
        <tr>
          <td><div class="skeleton-shimmer" style="width: 60px; height: 16px;"></div></td>
          <td><div class="skeleton-shimmer" style="width: 80px; height: 16px;"></div></td>
          <td><div class="skeleton-shimmer" style="width: 60px; height: 16px;"></div></td>
          <td><div class="skeleton-shimmer" style="width: 55px; height: 16px;"></div></td>
          <td><div class="skeleton-shimmer" style="width: 48px; height: 18px; border-radius: 9999px;"></div></td>
          <td><div class="skeleton-shimmer" style="width: 60px; height: 16px;"></div></td>
          <td><div class="skeleton-shimmer" style="width: 48px; height: 18px; border-radius: 9999px;"></div></td>
          <td><div class="skeleton-shimmer" style="width: 90px; height: 14px;"></div></td>
          <td><div class="skeleton-shimmer" style="width: 85px; height: 16px;"></div></td>
        </tr>
      `;
    }
    listTbody.innerHTML = rows;
  }
}

export function renderDividendsChartsLoading() {
  const kpis = [
    { id: 'div-kpi-total', w: '95px' },
    { id: 'div-kpi-avg', w: '85px' },
    { id: 'div-kpi-yield', w: '70px' },
    { id: 'div-kpi-best', w: '75px' }
  ];

  kpis.forEach(item => {
    const el = document.getElementById(item.id);
    if (el) el.innerHTML = `<span class="skeleton-shimmer" style="width: ${item.w}; height: 1.25rem;"></span>`;
  });

  const canvas1 = document.getElementById('dividendBarsChart');
  const canvas2 = document.getElementById('totalReturnChart');
  if (canvas1) canvas1.style.opacity = '0.15';
  if (canvas2) canvas2.style.opacity = '0.15';

  const wraps = document.querySelectorAll('.dividends-chart-canvas-wrap');
  wraps.forEach((wrap) => {
    if (!wrap.querySelector('.div-chart-skeleton')) {
      const box = document.createElement('div');
      box.className = 'chart-skeleton-box div-chart-skeleton';
      box.innerHTML = `
        <div class="chart-loading-badge">
          <span class="sync-spinner"></span>
          <span>Carregando proventos...</span>
        </div>
        <div class="chart-skeleton-bars">
          <div class="chart-skeleton-bar" style="height: 30%;"></div>
          <div class="chart-skeleton-bar" style="height: 60%;"></div>
          <div class="chart-skeleton-bar" style="height: 45%;"></div>
          <div class="chart-skeleton-bar" style="height: 75%;"></div>
          <div class="chart-skeleton-bar" style="height: 50%;"></div>
          <div class="chart-skeleton-bar" style="height: 90%;"></div>
        </div>
      `;
      wrap.style.position = 'relative';
      wrap.appendChild(box);
    }
  });
}

export function removeDividendsChartsLoading() {
  document.querySelectorAll('.div-chart-skeleton').forEach(el => el.remove());
  const canvas1 = document.getElementById('dividendBarsChart');
  const canvas2 = document.getElementById('totalReturnChart');
  if (canvas1) canvas1.style.opacity = '1';
  if (canvas2) canvas2.style.opacity = '1';
}

export function renderDividendsHistoryLoading() {
  const tbody = document.getElementById('div-grid-tbody');
  const listTbody = document.getElementById('div-list-tbody');

  if (tbody) {
    let rows = '';
    for (let r = 0; r < 2; r++) {
      let cells = `
        <td style="padding: 12px 14px;">
          <div class="skeleton-shimmer" style="width: 80px; height: 18px; border-radius: 4px;"></div>
        </td>
      `;
      for (let c = 1; c <= 12; c++) {
        cells += `
          <td style="padding: 10px 6px; text-align: center;">
            <div class="skeleton-shimmer" style="width: 45px; height: 16px; margin: 0 auto 3px auto;"></div>
            <div class="skeleton-shimmer" style="width: 32px; height: 11px; margin: 0 auto;"></div>
          </td>
        `;
      }
      cells += `
        <td style="padding: 10px 8px; text-align: right;">
          <div class="skeleton-shimmer" style="width: 55px; height: 16px; margin-left: auto; margin-bottom: 3px;"></div>
          <div class="skeleton-shimmer" style="width: 34px; height: 11px; margin-left: auto;"></div>
        </td>
        <td style="padding: 10px 8px; text-align: right;">
          <div class="skeleton-shimmer" style="width: 60px; height: 16px; margin-left: auto; margin-bottom: 3px;"></div>
          <div class="skeleton-shimmer" style="width: 36px; height: 11px; margin-left: auto;"></div>
        </td>
      `;
      rows += `<tr>${cells}</tr>`;
    }
    tbody.innerHTML = rows;
  }

  if (listTbody) {
    let rows = '';
    for (let r = 0; r < 3; r++) {
      rows += `
        <tr>
          <td><div class="skeleton-shimmer" style="width: 75px; height: 16px;"></div></td>
          <td><div class="skeleton-shimmer" style="width: 90px; height: 16px;"></div></td>
          <td><div class="skeleton-shimmer" style="width: 65px; height: 16px; border-radius: 4px;"></div></td>
          <td><div class="skeleton-shimmer" style="width: 60px; height: 16px;"></div></td>
          <td><div class="skeleton-shimmer" style="width: 50px; height: 16px;"></div></td>
          <td><div class="skeleton-shimmer" style="width: 55px; height: 16px;"></div></td>
          <td style="text-align: right;"><div class="skeleton-shimmer" style="width: 75px; height: 16px; margin-left: auto;"></div></td>
        </tr>
      `;
    }
    listTbody.innerHTML = rows;
  }
}

export function renderAssetCardsLoading() {
  const container = document.getElementById('asset-perf-container') || document.getElementById('portfolio-funds-container');
  if (!container) return;

  let html = '';
  for (let i = 0; i < 3; i++) {
    html += `
      <div class="asset-card-skeleton">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div class="skeleton-shimmer" style="width: 100px; height: 1.1rem;"></div>
          <div class="skeleton-shimmer" style="width: 50px; height: 1.2rem; border-radius: 9999px;"></div>
        </div>
        <div class="skeleton-shimmer" style="width: 70%; height: 0.8rem;"></div>
        <div class="skeleton-shimmer" style="width: 100%; height: 6px; border-radius: 9999px; margin-top: 6px;"></div>
      </div>
    `;
  }
  container.innerHTML = html;
}

export function renderCalculatorLoading() {
  const tbody = document.getElementById('calc-funds-tbody') || document.getElementById('calc-balances-tbody');
  if (!tbody) return;

  let rows = '';
  for (let i = 0; i < 3; i++) {
    rows += `
      <tr>
        <td><div class="skeleton-shimmer" style="width: 120px; height: 16px;"></div></td>
        <td><div class="skeleton-shimmer" style="width: 50px; height: 16px;"></div></td>
        <td><div class="skeleton-shimmer" style="width: 70px; height: 16px;"></div></td>
        <td><div class="skeleton-shimmer" style="width: 50px; height: 16px;"></div></td>
        <td><div class="skeleton-shimmer" style="width: 70px; height: 16px;"></div></td>
        <td><div class="skeleton-shimmer" style="width: 70px; height: 16px;"></div></td>
      </tr>
    `;
  }
  tbody.innerHTML = rows;
}
