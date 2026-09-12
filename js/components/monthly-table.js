/**
 * PrevInvest - Monthly Historical Table Component
 * Renderiza a Grade Anual x Mês (Visual Mais Retorno / Dribbble)
 * e permite alternância para Lista Cronológica com filtro por Ano e Benchmark.
 */

import { state } from '../state.js';
import { formatMoney, formatPct, PALETTE } from '../utils/formatters.js';

let activeView = 'grid'; // 'grid' | 'list'

const BENCHMARK_OPTIONS = [
  { id: 'cdi', label: 'CDI' },
  { id: 'ibov', label: 'IBOVESPA' },
  { id: 'ipca', label: 'IPCA' },
  { id: 'sp500', label: 'S&P 500' },
  { id: 'poupanca', label: 'Poupança' },
  { id: 'ifix', label: 'IFIX' },
  { id: 'btc', label: 'Bitcoin' },
  { id: 'usd', label: 'Dólar' }
];

export function initMonthlyTable() {
  // 1. Alternador de visualização (Grade vs Lista)
  const toggleButtons = document.querySelectorAll('#rentabilidade-view-toggle .rentabilidade-view-btn');
  toggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      toggleButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeView = btn.getAttribute('data-view') || 'grid';
      applyViewVisibility();
    });
  });

  // 2. Popover do Ano
  const btnYear = document.getElementById('btn-rent-year-picker');
  const popoverYear = document.getElementById('rent-year-popover');
  const btnYearAll = document.getElementById('btn-rent-year-all');

  if (btnYear && popoverYear) {
    btnYear.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = popoverYear.style.display === 'block';
      closeAllRentPopovers();
      popoverYear.style.display = isVisible ? 'none' : 'block';
    });

    if (btnYearAll) {
      btnYearAll.addEventListener('click', (e) => {
        e.stopPropagation();
        state.selectedMonthlyYear = 'all';
        closeAllRentPopovers();
        renderMonthlyTable();
      });
    }
  }

  // 3. Popover do Indicador / Benchmark
  const btnBm = document.getElementById('btn-rent-bm-picker');
  const popoverBm = document.getElementById('rent-bm-popover');

  if (btnBm && popoverBm) {
    btnBm.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = popoverBm.style.display === 'block';
      closeAllRentPopovers();
      popoverBm.style.display = isVisible ? 'none' : 'block';
    });
  }

  // Fechar popovers ao clicar fora
  document.addEventListener('click', (e) => {
    if (popoverYear && !popoverYear.contains(e.target) && e.target !== btnYear && !btnYear.contains(e.target)) {
      popoverYear.style.display = 'none';
    }
    if (popoverBm && !popoverBm.contains(e.target) && e.target !== btnBm && !btnBm.contains(e.target)) {
      popoverBm.style.display = 'none';
    }
  });
}

function closeAllRentPopovers() {
  const popoverYear = document.getElementById('rent-year-popover');
  const popoverBm = document.getElementById('rent-bm-popover');
  if (popoverYear) popoverYear.style.display = 'none';
  if (popoverBm) popoverBm.style.display = 'none';
}

function applyViewVisibility() {
  const gridWrap = document.getElementById('monthly-grid-container');
  const listWrap = document.getElementById('monthly-list-container');
  if (!gridWrap || !listWrap) return;

  if (activeView === 'grid') {
    gridWrap.style.display = 'block';
    listWrap.style.display = 'none';
  } else {
    gridWrap.style.display = 'none';
    listWrap.style.display = 'block';
  }
}

export function renderMonthlyTable() {
  const gridTbody = document.getElementById('monthly-grid-tbody');
  const listTbody = document.getElementById('monthly-table-body');
  const thBm = document.getElementById('th-monthly-bm-name');
  const sim = state.simulationResult;

  if (!gridTbody || !listTbody) return;

  const monthlyData = (sim && sim.monthly_summary) ? sim.monthly_summary : [];

  if (monthlyData.length === 0) {
    const emptyRow = '<tr><td colspan="15" style="text-align: center; color: var(--charcoal-muted); padding: 32px;">Execute a simulação para visualizar a rentabilidade histórica.</td></tr>';
    gridTbody.innerHTML = emptyRow;
    listTbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--charcoal-muted); padding: 32px;">Execute a simulação para visualizar o histórico mensal.</td></tr>';
    return;
  }

  const selectedBm = state.selectedMonthlyBenchmark || 'cdi';
  const selectedYear = state.selectedMonthlyYear || 'all';
  const isUSD = state.activeCurrency === 'usd';

  const bmNames = {
    cdi: 'CDI',
    ibov: 'IBOVESPA',
    ipca: 'IPCA',
    sp500: 'S&P 500',
    poupanca: 'Poupança',
    ifix: 'IFIX',
    btc: 'Bitcoin',
    usd: 'Dólar PTAX'
  };

  const bmLabel = bmNames[selectedBm] || selectedBm.toUpperCase();
  if (thBm) {
    thBm.innerText = `Retorno ${bmLabel} (%)`;
  }

  // 1. Extrair anos únicos ordenados decrescentemente
  const yearsSet = new Set();
  monthlyData.forEach(m => {
    if (m.month) {
      yearsSet.add(m.month.split('-')[0]);
    }
  });
  const allYears = Array.from(yearsSet).sort((a, b) => b.localeCompare(a));

  // 2. Atualizar Popover de Seleção de Ano
  const yearLabel = document.getElementById('rent-year-picker-label');
  const yearGrid = document.getElementById('rent-year-grid');
  const btnYearAll = document.getElementById('btn-rent-year-all');

  if (yearLabel) {
    yearLabel.innerText = selectedYear === 'all' ? 'Todos os Anos' : selectedYear;
  }
  if (btnYearAll) {
    btnYearAll.classList.toggle('active', selectedYear === 'all');
  }
  if (yearGrid) {
    yearGrid.innerHTML = '';
    allYears.forEach(y => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `month-pill-item ${selectedYear === y ? 'active' : ''}`;
      btn.innerText = y;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.selectedMonthlyYear = y;
        closeAllRentPopovers();
        renderMonthlyTable();
      });
      yearGrid.appendChild(btn);
    });
  }

  // 3. Atualizar Popover de Seleção de Indicador / Benchmark
  const bmLabelEl = document.getElementById('rent-bm-picker-label');
  const bmGrid = document.getElementById('rent-bm-grid');

  if (bmLabelEl) {
    bmLabelEl.innerText = bmNames[selectedBm] || selectedBm.toUpperCase();
  }
  if (bmGrid) {
    bmGrid.innerHTML = '';
    BENCHMARK_OPTIONS.forEach(b => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `month-pill-item ${selectedBm === b.id ? 'active' : ''}`;
      btn.innerText = b.label;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.selectedMonthlyBenchmark = b.id;
        closeAllRentPopovers();
        renderMonthlyTable();
      });
      bmGrid.appendChild(btn);
    });
  }

  // 2. Mapear dados mensais por YYYY-MM
  const monthMap = {};
  monthlyData.forEach(m => {
    monthMap[m.month] = m;
  });

  // 3. Pré-calcular Retorno Acumulado desde o início da série até o fim de cada ano e para cada mês
  // Ordenar todos os meses cronologicamente para compor a série temporal
  const sortedMonths = [...monthlyData].sort((a, b) => a.month.localeCompare(b.month));
  const cumYearReturn = {};
  const cumBmYearReturn = {};
  const cumMonthReturn = {};
  const cumBmMonthReturn = {};
  const cumAlphaMonth = {};

  let cumPortFactor = 1.0;
  let cumBmFactor = 1.0;

  sortedMonths.forEach(m => {
    const y = m.month.split('-')[0];
    const ret = isUSD ? (m.return_pct_usd || 0.0) : (m.return_pct || 0.0);
    const bmRet = m.benchmarks_returns ? (m.benchmarks_returns[selectedBm] || 0.0) : 0.0;

    cumPortFactor *= (1.0 + ret / 100.0);
    cumBmFactor *= (1.0 + bmRet / 100.0);

    const portCum = (cumPortFactor - 1.0) * 100.0;
    const bmCum = (cumBmFactor - 1.0) * 100.0;

    // Salvar o fator acumulado até este mês individual
    cumMonthReturn[m.month] = portCum;
    cumBmMonthReturn[m.month] = bmCum;
    cumAlphaMonth[m.month] = portCum - bmCum;

    // Salvar o fator acumulado até este mês para o respectivo ano
    cumYearReturn[y] = portCum;
    cumBmYearReturn[y] = bmCum;
  });

  // 4. Determinar nome da carteira a exibir
  const portfolioName = (state.activePortfolio && state.activePortfolio.name) 
    ? state.activePortfolio.name 
    : (sim.portfolio_name || 'CARTEIRA ATIVA');

  // 5. Renderizar Grade Anual
  const yearsToRender = selectedYear === 'all' ? allYears : [selectedYear];
  let gridHtml = '';

  yearsToRender.forEach(year => {
    let yearPortFactor = 1.0;
    let yearBmFactor = 1.0;
    let hasYearData = false;

    // Gerar células para os 12 meses (01 a 12)
    let monthsHtml = '';
    for (let m = 1; m <= 12; m++) {
      const ym = `${year}-${String(m).padStart(2, '0')}`;
      const item = monthMap[ym];

      if (item) {
        hasYearData = true;
        const val = isUSD ? item.return_pct_usd : item.return_pct;
        const bmVal = item.benchmarks_returns ? (item.benchmarks_returns[selectedBm] || 0.0) : 0.0;

        yearPortFactor *= (1.0 + val / 100.0);
        yearBmFactor *= (1.0 + bmVal / 100.0);

        let pctBm = '-';
        if (bmVal !== 0) {
          const ratio = (val / bmVal) * 100.0;
          pctBm = `${ratio.toFixed(2).replace('.', ',')}%`;
        }

        const valClass = val >= 0 ? 'positive' : 'negative';
        monthsHtml += `
          <td>
            <span class="rent-cell-val ${valClass}">${formatPct(val)}</span>
            <span class="rent-cell-sub">${pctBm}</span>
          </td>
        `;
      } else {
        monthsHtml += `
          <td>
            <span class="rent-cell-val" style="color: var(--charcoal-muted); font-weight: normal;">-</span>
            <span class="rent-cell-sub">-</span>
          </td>
        `;
      }
    }

    // Cálculo do No Ano
    let noAnoValHtml = '<span class="rent-cell-val" style="color: var(--charcoal-muted); font-weight: normal;">-</span>';
    let noAnoSubHtml = '<span class="rent-cell-sub">-</span>';

    if (hasYearData) {
      const yearRet = (yearPortFactor - 1.0) * 100.0;
      const yearBmRet = (yearBmFactor - 1.0) * 100.0;
      const yearClass = yearRet >= 0 ? 'positive' : 'negative';

      let yearPctBm = '-';
      if (yearBmRet !== 0) {
        yearPctBm = `${((yearRet / yearBmRet) * 100.0).toFixed(2).replace('.', ',')}%`;
      }

      noAnoValHtml = `<span class="rent-cell-val ${yearClass}">${formatPct(yearRet)}</span>`;
      noAnoSubHtml = `<span class="rent-cell-sub">${yearPctBm}</span>`;
    }

    // Cálculo do Acumulado até o fim do ano
    let acumValHtml = '<span class="rent-cell-val" style="color: var(--charcoal-muted); font-weight: normal;">-</span>';
    let acumSubHtml = '<span class="rent-cell-sub">-</span>';

    if (cumYearReturn[year] !== undefined) {
      const cumRet = cumYearReturn[year];
      const cumBmRet = cumBmYearReturn[year];
      const cumClass = cumRet >= 0 ? 'positive' : 'negative';

      let cumPctBm = '-';
      if (cumBmRet !== 0) {
        cumPctBm = `${((cumRet / cumBmRet) * 100.0).toFixed(2).replace('.', ',')}%`;
      }

      acumValHtml = `<span class="rent-cell-val ${cumClass}">${formatPct(cumRet)}</span>`;
      acumSubHtml = `<span class="rent-cell-sub">${cumPctBm}</span>`;
    }

    gridHtml += `
      <tr>
        <td style="white-space: nowrap;">
          <div style="display: flex; align-items: baseline; gap: 10px;">
            <span class="rent-cell-year">${year}</span>
            <div style="overflow: hidden; text-align: left;">
              <span class="rent-cell-asset-name" title="${portfolioName}">${portfolioName}</span>
              <span class="rent-cell-bm-label">% ${bmLabel}</span>
            </div>
          </div>
        </td>
        ${monthsHtml}
        <td>
          ${noAnoValHtml}
          ${noAnoSubHtml}
        </td>
        <td>
          ${acumValHtml}
          ${acumSubHtml}
        </td>
      </tr>
    `;
  });

  gridTbody.innerHTML = gridHtml;

  // 6. Renderizar Lista Cronológica (Ordenada de forma decrescente: mês mais recente primeiro)
  const listData = (selectedYear === 'all' 
    ? monthlyData 
    : monthlyData.filter(m => m.month.startsWith(`${selectedYear}-`)))
    .slice()
    .sort((a, b) => b.month.localeCompare(a.month));

  let listHtml = '';
  listData.forEach(m => {
    const endVal = isUSD ? m.end_val_usd : m.end_val;
    const gain = isUSD ? m.capital_gain_usd : m.capital_gain;
    const retPct = isUSD ? m.return_pct_usd : m.return_pct;

    const bmRet = m.benchmarks_returns ? (m.benchmarks_returns[selectedBm] || 0.0) : 0.0;
    const alpha = retPct - bmRet;

    const cumRet = cumMonthReturn[m.month] !== undefined ? cumMonthReturn[m.month] : retPct;
    const cumAlpha = cumAlphaMonth[m.month] !== undefined ? cumAlphaMonth[m.month] : alpha;

    let pctOfBm = '-';
    if (bmRet > 0) {
      pctOfBm = `${((retPct / bmRet) * 100.0).toFixed(0)}% do ${bmLabel}`;
    } else if (bmRet < 0 && retPct > 0) {
      pctOfBm = 'Superou (Índice Negativo)';
    }

    const gainSign = gain >= 0 ? '+' : '';
    const gainColor = gain >= 0 ? PALETTE.charts.gain_positive : PALETTE.charts.gain_negative;
    const retPctColor = retPct >= 0 ? PALETTE.charts.gain_positive : PALETTE.charts.gain_negative;
    const alphaSign = alpha >= 0 ? '+' : '';
    const alphaColor = alpha >= 0 ? PALETTE.charts.gain_positive : PALETTE.charts.gain_negative;
    const cumRetColor = cumRet >= 0 ? PALETTE.charts.gain_positive : PALETTE.charts.gain_negative;
    const cumAlphaSign = cumAlpha >= 0 ? '+' : '';
    const cumAlphaColor = cumAlpha >= 0 ? PALETTE.charts.gain_positive : PALETTE.charts.gain_negative;

    listHtml += `
      <tr>
        <td><strong>${m.month_label}</strong></td>
        <td style="color: ${gainColor}; font-weight: 700;">${gainSign}${formatMoney(gain, state.activeCurrency)}</td>
        <td><strong style="color: ${retPctColor};">${formatPct(retPct)}</strong></td>
        <td><strong>${formatPct(bmRet)}</strong></td>
        <td><span class="badge-pill ${alpha >= 0 ? 'badge-mint' : 'badge-peach'}" style="color: ${alphaColor}; font-weight: 700;">${alphaSign}${alpha.toFixed(2).replace('.', ',')}%</span></td>
        <td><strong style="color: ${cumRetColor};">${formatPct(cumRet)}</strong></td>
        <td><span class="badge-pill ${cumAlpha >= 0 ? 'badge-mint' : 'badge-peach'}" style="color: ${cumAlphaColor}; font-weight: 700;">${cumAlphaSign}${cumAlpha.toFixed(2).replace('.', ',')}%</span></td>
        <td style="font-size: 0.78rem; font-weight: 600; color: var(--charcoal-light);">${pctOfBm}</td>
        <td><strong>${formatMoney(endVal, state.activeCurrency)}</strong></td>
      </tr>
    `;
  });

  listTbody.innerHTML = listHtml;
  applyViewVisibility();
}
