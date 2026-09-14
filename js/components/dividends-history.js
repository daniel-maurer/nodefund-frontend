/**
 * PrevInvest - Dividends History Component
 * Renderiza o Histórico de Proventos com Grade Anual (Ano x Mês)
 * e Lista Cronológica (Extrato detalhado de dividendos), com suporte a
 * seleção de Fundo Individual ou Toda a Carteira, e filtro por Ano.
 */

import { state } from '../state.js';
import { formatMoney, formatPct, getAssetKey } from '../utils/formatters.js';
import { renderRentGridRow } from './monthly-table.js';
import { openMobileDetailModal } from './mobile-modal.js';

let activeHistoryView = 'grid'; // 'grid' | 'list'
let selectedHistoryAsset = 'all'; // 'all' | asset_key
let selectedHistoryYear = 'all'; // 'all' | '2024' | '2025' ...
let selectedHistoryMonth = 'all'; // 'all' | '01' | '02' ... '12'
let currentFilteredDividendsList = [];

const MONTHS_LIST = [
  { id: '01', label: 'Jan' },
  { id: '02', label: 'Fev' },
  { id: '03', label: 'Mar' },
  { id: '04', label: 'Abr' },
  { id: '05', label: 'Mai' },
  { id: '06', label: 'Jun' },
  { id: '07', label: 'Jul' },
  { id: '08', label: 'Ago' },
  { id: '09', label: 'Set' },
  { id: '10', label: 'Out' },
  { id: '11', label: 'Nov' },
  { id: '12', label: 'Dez' }
];

export function initDividendsHistory() {
  // 1. Alternador de visualização (Grade Anual vs Lista Cronológica)
  const toggleButtons = document.querySelectorAll('#div-history-view-toggle .rentabilidade-view-btn');
  toggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      toggleButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeHistoryView = btn.getAttribute('data-view') || 'grid';
      applyHistoryViewVisibility();
    });
  });

  // 2. Popover do Seletor de Ativo / Fundo
  const btnAsset = document.getElementById('btn-div-hist-asset-picker');
  const popoverAsset = document.getElementById('div-hist-asset-popover');

  if (btnAsset && popoverAsset) {
    btnAsset.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = popoverAsset.style.display === 'block';
      closeAllHistoryPopovers();
      popoverAsset.style.display = isVisible ? 'none' : 'block';
    });
  }

  // 3. Popover de Filtro por Ano
  const btnYear = document.getElementById('btn-div-hist-year-picker');
  const popoverYear = document.getElementById('div-hist-year-popover');
  const btnYearAll = document.getElementById('btn-div-hist-year-all');

  if (btnYear && popoverYear) {
    btnYear.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = popoverYear.style.display === 'block';
      closeAllHistoryPopovers();
      popoverYear.style.display = isVisible ? 'none' : 'block';
    });

    if (btnYearAll) {
      btnYearAll.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedHistoryYear = 'all';
        closeAllHistoryPopovers();
        renderDividendsHistory();
      });
    }
  }

  // 4. Popover de Filtro por Mês (para a Lista Cronológica)
  const btnMonth = document.getElementById('btn-div-hist-month-picker');
  const popoverMonth = document.getElementById('div-hist-month-popover');
  const btnMonthAll = document.getElementById('btn-div-hist-month-all');

  if (btnMonth && popoverMonth) {
    btnMonth.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = popoverMonth.style.display === 'block';
      closeAllHistoryPopovers();
      popoverMonth.style.display = isVisible ? 'none' : 'block';
    });

    if (btnMonthAll) {
      btnMonthAll.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedHistoryMonth = 'all';
        closeAllHistoryPopovers();
        renderDividendsHistory();
      });
    }
  }

  // Fechar popovers ao clicar fora
  document.addEventListener('click', (e) => {
    if (popoverAsset && !popoverAsset.contains(e.target) && e.target !== btnAsset && !btnAsset.contains(e.target)) {
      popoverAsset.style.display = 'none';
    }
    if (popoverYear && !popoverYear.contains(e.target) && e.target !== btnYear && !btnYear.contains(e.target)) {
      popoverYear.style.display = 'none';
    }
    if (popoverMonth && !popoverMonth.contains(e.target) && e.target !== btnMonth && !btnMonth.contains(e.target)) {
      popoverMonth.style.display = 'none';
    }
  });

  // 5. Delegação de cliques para células da Grade e linhas do Extrato (Mobile Sheet)
  const divGridTbody = document.getElementById('div-grid-tbody');
  const divListTbody = document.getElementById('div-list-tbody');

  if (divGridTbody) {
    divGridTbody.addEventListener('click', (e) => {
      const cell = e.target.closest('.rent-cell-interactive');
      if (!cell) return;
      handleDividendsGridCellClick(cell);
    });
  }

  if (divListTbody) {
    divListTbody.addEventListener('click', (e) => {
      const tr = e.target.closest('tr[data-div-idx]');
      if (!tr) return;
      handleDividendsListRowClick(tr);
    });
  }
}

function closeAllHistoryPopovers() {
  const pA = document.getElementById('div-hist-asset-popover');
  const pY = document.getElementById('div-hist-year-popover');
  const pM = document.getElementById('div-hist-month-popover');
  if (pA) pA.style.display = 'none';
  if (pY) pY.style.display = 'none';
  if (pM) pM.style.display = 'none';
}

function applyHistoryViewVisibility() {
  const gridWrap = document.getElementById('div-grid-container');
  const listWrap = document.getElementById('div-list-container');
  const monthWrap = document.getElementById('wrap-div-hist-month-picker');
  if (!gridWrap || !listWrap) return;

  if (activeHistoryView === 'grid') {
    gridWrap.style.display = 'block';
    listWrap.style.display = 'none';
    if (monthWrap) monthWrap.style.display = 'none';
  } else {
    gridWrap.style.display = 'none';
    listWrap.style.display = 'block';
    if (monthWrap) monthWrap.style.display = 'inline-block';
  }
}

export function renderDividendsHistory() {
  const sim = state.simulationResult;
  const divs = sim?.dividends;
  const emptyState = document.getElementById('div-history-empty');
  const contentState = document.getElementById('div-history-content');

  if (!divs || !divs.has_dividends) {
    if (emptyState) emptyState.style.display = 'flex';
    if (contentState) contentState.style.display = 'none';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (contentState) contentState.style.display = 'block';

  // Renderizar filtros Popovers
  renderAssetPickerOptions();
  renderYearPickerOptions();
  renderMonthPickerOptions();

  // Renderizar Grade e Lista
  renderDividendsGrid();
  renderDividendsList();

  applyHistoryViewVisibility();
}

function renderAssetPickerOptions() {
  const grid = document.getElementById('div-hist-asset-grid');
  const label = document.getElementById('div-hist-asset-label');
  const popover = document.getElementById('div-hist-asset-popover');
  if (!grid) return;

  const funds = state.portfolio?.funds || [];
  let html = `
    <button type="button" class="month-pill-item ${selectedHistoryAsset === 'all' ? 'active' : ''}" data-asset="all" style="width: 100%; text-align: left; padding: 7px 12px; font-weight: 700; font-size: 0.78rem;">
      💼 Toda a Carteira
    </button>
  `;

  funds.forEach(f => {
    const k = getAssetKey(f);
    const ticker = f.code || f.id || k;
    const isAct = (selectedHistoryAsset === k);
    html += `
      <button type="button" class="month-pill-item ${isAct ? 'active' : ''}" data-asset="${k}" style="width: 100%; text-align: left; padding: 7px 12px; font-size: 0.78rem; display: flex; align-items: center; gap: 8px;">
        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${f.color || '#2E7D5B'};"></span>
        <span style="font-weight: 700;">${ticker}</span>
        <span style="color: var(--charcoal-muted); font-size: 0.7rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${f.name || ticker}</span>
      </button>
    `;
  });

  grid.innerHTML = html;

  // Atualizar label
  if (label) {
    if (selectedHistoryAsset === 'all') {
      label.textContent = 'Toda a Carteira';
    } else {
      const match = funds.find(f => getAssetKey(f) === selectedHistoryAsset);
      label.textContent = match ? (match.code || match.name) : selectedHistoryAsset;
    }
  }

  // Listeners
  grid.querySelectorAll('button[data-asset]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedHistoryAsset = btn.getAttribute('data-asset');
      if (popover) popover.style.display = 'none';
      renderAssetPickerOptions();
      renderDividendsGrid();
      renderDividendsList();
    });
  });
}

function renderYearPickerOptions() {
  const grid = document.getElementById('div-hist-year-grid');
  const label = document.getElementById('div-hist-year-label');
  const popover = document.getElementById('div-hist-year-popover');
  const btnAll = document.getElementById('btn-div-hist-year-all');
  if (!grid) return;

  const divs = state.simulationResult?.dividends;
  const annualGrid = divs?.annual_grid?.all || {};
  const years = Object.keys(annualGrid).sort();

  if (btnAll) {
    btnAll.classList.toggle('active', selectedHistoryYear === 'all');
  }

  let html = '';
  years.forEach(y => {
    const isAct = (selectedHistoryYear === y);
    html += `<button type="button" class="month-pill-item ${isAct ? 'active' : ''}" data-year="${y}">${y}</button>`;
  });
  grid.innerHTML = html;

  if (label) {
    label.textContent = (selectedHistoryYear === 'all') ? 'Todos os Anos' : selectedHistoryYear;
  }

  grid.querySelectorAll('button[data-year]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedHistoryYear = btn.getAttribute('data-year');
      if (popover) popover.style.display = 'none';
      renderYearPickerOptions();
      renderDividendsGrid();
      renderDividendsList();
    });
  });
}

function renderMonthPickerOptions() {
  const grid = document.getElementById('div-hist-month-grid');
  const label = document.getElementById('div-hist-month-label');
  const popover = document.getElementById('div-hist-month-popover');
  const btnAll = document.getElementById('btn-div-hist-month-all');
  if (!grid) return;

  if (btnAll) {
    btnAll.classList.toggle('active', selectedHistoryMonth === 'all');
  }

  let html = '';
  MONTHS_LIST.forEach(m => {
    const isAct = (selectedHistoryMonth === m.id);
    html += `<button type="button" class="month-pill-item ${isAct ? 'active' : ''}" data-month="${m.id}">${m.label}</button>`;
  });
  grid.innerHTML = html;

  if (label) {
    if (selectedHistoryMonth === 'all') {
      label.textContent = 'Todos os Meses';
    } else {
      const match = MONTHS_LIST.find(m => m.id === selectedHistoryMonth);
      label.textContent = match ? match.label : selectedHistoryMonth;
    }
  }

  grid.querySelectorAll('button[data-month]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedHistoryMonth = btn.getAttribute('data-month');
      if (popover) popover.style.display = 'none';
      renderMonthPickerOptions();
      renderDividendsList();
    });
  });
}

function renderDividendsGrid() {
  const tbody = document.getElementById('div-grid-tbody');
  if (!tbody) return;

  const divs = state.simulationResult?.dividends;
  const gridScope = divs?.annual_grid?.[selectedHistoryAsset] || divs?.annual_grid?.all || {};
  const years = Object.keys(gridScope).sort().reverse();

  const filteredYears = (selectedHistoryYear === 'all')
    ? years
    : years.filter(y => y === selectedHistoryYear);

  if (filteredYears.length === 0) {
    tbody.innerHTML = `<tr><td colspan="15" style="text-align: center; color: var(--charcoal-muted); padding: 24px;">Nenhum provento registrado para o filtro selecionado.</td></tr>`;
    return;
  }

  const funds = state.simulationResult?.funds || [];
  let assetDisplayName = (state.activePortfolio && state.activePortfolio.name) 
    ? state.activePortfolio.name 
    : 'CARTEIRA';

  if (selectedHistoryAsset !== 'all') {
    const match = funds.find(f => getAssetKey(f) === selectedHistoryAsset);
    assetDisplayName = match ? (match.code || match.name) : selectedHistoryAsset;
  }

  // Pré-calcular acumulado cronológico ano a ano
  const allAscendingYears = Object.keys(gridScope).sort();
  const cumAmountYear = {};
  const cumYieldYear = {};
  let runningAmount = 0.0;
  let runningYield = 0.0;

  allAscendingYears.forEach(y => {
    const r = gridScope[y] || {};
    runningAmount += (r.total || 0.0);
    runningYield += (r.yield_pct || 0.0);
    cumAmountYear[y] = runningAmount;
    cumYieldYear[y] = runningYield;
  });

  const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  let gridHtml = '';

  filteredYears.forEach(year => {
    const row = gridScope[year] || {};
    const monthsData = [];

    MONTHS.forEach(m => {
      const val = row[m] || row[`${m}_val`] || 0;
      const mYield = (row[`${m}_yield`] !== undefined && row[`${m}_yield`] > 0)
        ? row[`${m}_yield`]
        : ((row.total > 0 && row.yield_pct) ? ((val / row.total) * row.yield_pct) : 0);

      if (val > 0) {
        monthsData.push({
          mainText: formatMoney(val, state.activeCurrency),
          subText: mYield > 0 ? formatPct(mYield) : '0,00%',
          isPositive: true,
          isEmpty: false
        });
      } else {
        monthsData.push({
          mainText: '-',
          subText: '-',
          isEmpty: true
        });
      }
    });

    const yearTotal = row.total || 0;
    const yearYield = row.yield_pct || 0;
    const noAnoData = {
      mainText: yearTotal > 0 ? formatMoney(yearTotal, state.activeCurrency) : '-',
      subText: yearYield > 0 ? formatPct(yearYield) : (yearTotal > 0 ? '0,00%' : '-'),
      isPositive: yearTotal > 0 ? true : null
    };

    const cumAmount = cumAmountYear[year] || 0;
    const cumYield = cumYieldYear[year] || 0;
    const acumData = {
      mainText: cumAmount > 0 ? formatMoney(cumAmount, state.activeCurrency) : '-',
      subText: cumYield > 0 ? formatPct(cumYield) : (cumAmount > 0 ? '0,00%' : '-'),
      isPositive: cumAmount > 0 ? true : null
    };

    gridHtml += renderRentGridRow({
      year,
      assetName: assetDisplayName,
      subLabel: '% Yield',
      monthsData,
      noAno: noAnoData,
      acumulado: acumData,
      tableType: 'div'
    });
  });

  tbody.innerHTML = gridHtml;
}

function renderDividendsList() {
  const tbody = document.getElementById('div-list-tbody');
  const countBadge = document.getElementById('div-list-count-badge');
  if (!tbody) return;

  const divs = state.simulationResult?.dividends;
  let list = divs?.chronological_list || [];

  // Filtrar por Ativo
  if (selectedHistoryAsset !== 'all') {
    list = list.filter(item => item.asset_key === selectedHistoryAsset);
  }

  // Filtrar por Ano
  if (selectedHistoryYear !== 'all') {
    list = list.filter(item => item.date.startsWith(selectedHistoryYear));
  }

  // Filtrar por Mês
  if (selectedHistoryMonth !== 'all') {
    list = list.filter(item => {
      const parts = (item.date || '').split('-');
      return parts.length >= 2 && parts[1] === selectedHistoryMonth;
    });
  }

  currentFilteredDividendsList = list;

  if (countBadge) {
    countBadge.textContent = `${list.length} lançamento${list.length !== 1 ? 's' : ''}`;
  }

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--charcoal-muted); padding: 24px;">Nenhum lançamento de dividendo para os filtros selecionados.</td></tr>`;
    return;
  }

  let rowsHtml = '';
  let sumFiltered = 0;

  list.forEach((item, idx) => {
    sumFiltered += (item.total_amount || 0);

    const dateParts = (item.date || '').split('-');
    const dateFormatted = (dateParts.length === 3)
      ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
      : item.date;

    const typeLower = (item.type || 'dividendo').toLowerCase();
    let typeClass = 'dividendo';
    if (typeLower.includes('rendimento') || typeLower.includes('fii')) {
      typeClass = 'rendimento';
    }

    rowsHtml += `
      <tr data-div-idx="${idx}" class="div-list-row" style="cursor: pointer;">
        <td style="font-weight: 600; color: var(--charcoal-dark);">${dateFormatted}</td>
        <td>
          <div class="dividend-asset-pill">
            <span class="dividend-asset-dot" style="background: ${item.color || '#2E7D5B'};"></span>
            <span>${item.ticker || item.asset_key}</span>
            <span style="font-size: 0.75rem; color: var(--charcoal-muted); font-weight: 400;">${item.name || ''}</span>
          </div>
        </td>
        <td>
          <span class="dividend-type-tag ${typeClass}">${item.type || 'Dividendo'}</span>
        </td>
        <td style="font-family: var(--font-mono); font-size: 0.82rem;">
          ${formatMoney(item.amount_per_share || 0, 4)}
        </td>
        <td>
          <span style="font-family: var(--font-mono); font-weight: 700; color: var(--color-positive); font-size: 0.84rem;">
            ${(item.yield_pct !== undefined && item.yield_pct > 0) ? formatPct(item.yield_pct) : '—'}
          </span>
        </td>
        <td style="font-family: var(--font-mono); font-size: 0.82rem; color: var(--charcoal-dark);">
          ${(item.shares || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} cotas
        </td>
        <td style="text-align: right;">
          <span class="dividend-amount-positive">${formatMoney(item.total_amount || 0)}</span>
        </td>
      </tr>
    `;
  });

  // Linha de Rodapé com Total
  rowsHtml += `
    <tr style="background: var(--gray-slot); font-weight: 800; border-top: 2px solid var(--border-medium);">
      <td colspan="6" style="text-align: right; color: var(--charcoal-muted); font-size: 0.75rem; text-transform: uppercase;">Total Filtrado:</td>
      <td style="text-align: right; color: var(--color-positive); font-weight: 800; font-size: 0.95rem;">${formatMoney(sumFiltered)}</td>
    </tr>
  `;

  tbody.innerHTML = rowsHtml;
}

function handleDividendsGridCellClick(cell) {
  const table = cell.getAttribute('data-table');
  if (table !== 'div') return;

  const divs = state.simulationResult?.dividends;
  if (!divs) return;

  const year = cell.getAttribute('data-year');
  const month = cell.getAttribute('data-month');
  const type = cell.getAttribute('data-type');
  const gridScope = divs?.annual_grid?.[selectedHistoryAsset] || divs?.annual_grid?.all || {};
  const row = gridScope[year] || {};

  let assetDisplayName = (state.activePortfolio && state.activePortfolio.name) 
    ? state.activePortfolio.name 
    : 'Toda a Carteira';

  if (selectedHistoryAsset !== 'all') {
    const funds = state.simulationResult?.funds || [];
    const match = funds.find(f => getAssetKey(f) === selectedHistoryAsset);
    assetDisplayName = match ? (match.code || match.name) : selectedHistoryAsset;
  }

  if (type === 'month' && year && month) {
    const val = row[month] || row[`${month}_val`] || 0;
    const mYield = (row[`${month}_yield`] !== undefined && row[`${month}_yield`] > 0)
      ? row[`${month}_yield`]
      : ((row.total > 0 && row.yield_pct) ? ((val / row.total) * row.yield_pct) : 0);

    const monthMatch = MONTHS_LIST.find(m => m.id === month);
    const monthLabel = monthMatch ? monthMatch.label : month;

    openMobileDetailModal({
      title: `Proventos · ${monthLabel} / ${year}`,
      subtitle: `Ativo: ${assetDisplayName}`,
      badge: val > 0 ? formatMoney(val, state.activeCurrency) : 'Sem proventos',
      badgeClass: val > 0 ? 'badge-mint' : 'badge-peach',
      items: [
        { label: 'Total Creditado no Mês', value: formatMoney(val, state.activeCurrency), color: '#166534', isFull: true },
        { label: 'Dividend Yield no Mês', value: mYield > 0 ? formatPct(mYield) : '0,00%' },
        { label: `Total no Ano (${year})`, value: formatMoney(row.total || 0, state.activeCurrency) },
        { label: `Yield no Ano (${year})`, value: formatPct(row.yield_pct || 0) },
        { label: 'Escopo do Filtro', value: assetDisplayName }
      ],
      footerText: 'Toque fora ou no X para fechar'
    });
  } else if ((type === 'no-ano' || type === 'acumulado') && year) {
    const yearTotal = row.total || 0;
    const yearYield = row.yield_pct || 0;

    openMobileDetailModal({
      title: `Proventos · Fechamento ${year}`,
      subtitle: `Ativo: ${assetDisplayName}`,
      badge: `${formatMoney(yearTotal, state.activeCurrency)}`,
      badgeClass: 'badge-mint',
      items: [
        { label: 'Total Creditado no Ano', value: formatMoney(yearTotal, state.activeCurrency), color: '#166534', isFull: true },
        { label: 'Dividend Yield no Ano', value: formatPct(yearYield) },
        { label: 'Ano Referência', value: year },
        { label: 'Ativo / Carteira', value: assetDisplayName, isFull: true }
      ],
      footerText: 'Consolidado anual de proventos'
    });
  }
}

function handleDividendsListRowClick(tr) {
  const idx = parseInt(tr.getAttribute('data-div-idx'), 10);
  if (isNaN(idx) || !currentFilteredDividendsList[idx]) return;

  const item = currentFilteredDividendsList[idx];
  const dateParts = (item.date || '').split('-');
  const dateFormatted = (dateParts.length === 3)
    ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
    : item.date;

  openMobileDetailModal({
    title: `Provento · ${dateFormatted}`,
    subtitle: `${item.ticker || item.asset_key} · ${item.name || ''}`,
    badge: item.type || 'Dividendo',
    badgeClass: 'badge-mint',
    items: [
      { label: 'Total Creditado', value: formatMoney(item.total_amount || 0), color: '#166534', isFull: true },
      { label: 'Valor por Cota', value: formatMoney(item.amount_per_share || 0, 4) },
      { label: 'Dividend Yield', value: (item.yield_pct !== undefined && item.yield_pct > 0) ? formatPct(item.yield_pct) : '—' },
      { label: 'Cotas Detidas', value: `${(item.shares || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} cotas` },
      { label: 'Tipo de Evento', value: item.type || 'Dividendo' }
    ],
    footerText: 'Toque fora ou no X para fechar'
  });
}
