/**
 * PrevInvest - Monthly Historical Table Component
 * Renderiza a Grade Anual x Mês (Visual Mais Retorno / Dribbble)
 * e permite alternância para Lista Cronológica com filtro por Ano e Benchmark.
 */

import { state } from '../state.js';
import { formatMoney, formatPct, PALETTE } from '../utils/formatters.js';
import { openMobileDetailModal } from './mobile-modal.js';

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

  // 4. Delegação de cliques interativos para células da Grade e linhas da Lista (Mobile Sheet)
  const gridTbody = document.getElementById('monthly-grid-tbody');
  const listTbody = document.getElementById('monthly-table-body');

  if (gridTbody) {
    gridTbody.addEventListener('click', (e) => {
      const cell = e.target.closest('.rent-cell-interactive');
      if (!cell) return;
      handleRentGridCellClick(cell);
    });
  }

  if (listTbody) {
    listTbody.addEventListener('click', (e) => {
      const tr = e.target.closest('tr[data-ym]');
      if (!tr) return;
      const ym = tr.getAttribute('data-ym');
      handleRentListRowClick(ym);
    });
  }
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
    : (sim.portfolio_name || 'CARTEIRA');

  // 5. Renderizar Grade Anual
  const yearsToRender = selectedYear === 'all' ? allYears : [selectedYear];
  let gridHtml = '';

  yearsToRender.forEach(year => {
    let yearPortFactor = 1.0;
    let yearBmFactor = 1.0;
    let hasYearData = false;

    // Gerar células para os 12 meses (01 a 12)
    const monthsData = [];
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

        monthsData.push({
          monthNum: String(m).padStart(2, '0'),
          mainText: formatPct(val),
          subText: pctBm,
          isPositive: val >= 0,
          isEmpty: false
        });
      } else {
        monthsData.push({
          monthNum: String(m).padStart(2, '0'),
          mainText: '-',
          subText: '-',
          isEmpty: true
        });
      }
    }

    // Cálculo do No Ano
    let noAnoData = { mainText: '-', subText: '-', isPositive: null };
    if (hasYearData) {
      const yearRet = (yearPortFactor - 1.0) * 100.0;
      const yearBmRet = (yearBmFactor - 1.0) * 100.0;

      let yearPctBm = '-';
      if (yearBmRet !== 0) {
        yearPctBm = `${((yearRet / yearBmRet) * 100.0).toFixed(2).replace('.', ',')}%`;
      }

      noAnoData = {
        mainText: formatPct(yearRet),
        subText: yearPctBm,
        isPositive: yearRet >= 0
      };
    }

    // Cálculo do Acumulado até o fim do ano
    let acumData = { mainText: '-', subText: '-', isPositive: null };
    if (cumYearReturn[year] !== undefined) {
      const cumRet = cumYearReturn[year];
      const cumBmRet = cumBmYearReturn[year];

      let cumPctBm = '-';
      if (cumBmRet !== 0) {
        cumPctBm = `${((cumRet / cumBmRet) * 100.0).toFixed(2).replace('.', ',')}%`;
      }

      acumData = {
        mainText: formatPct(cumRet),
        subText: cumPctBm,
        isPositive: cumRet >= 0
      };
    }

    gridHtml += renderRentGridRow({
      year,
      assetName: portfolioName,
      subLabel: `% ${bmLabel}`,
      monthsData,
      noAno: noAnoData,
      acumulado: acumData
    });
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
      <tr data-ym="${m.month}" class="rent-list-row" style="cursor: pointer;">
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

/**
 * Componente compartilhado de linha da grade anual (Ano x Mês + No ano + Acumulado).
 * Reutilizado tanto pela Rentabilidade Histórica quanto pelo Histórico de Proventos (Dividendos).
 */
export function renderRentGridRow({
  year,
  assetName,
  subLabel,
  monthsData,
  noAno,
  acumulado,
  tableType = 'rent'
}) {
  let monthsHtml = '';
  monthsData.forEach((m, idx) => {
    const monthNum = m.monthNum || String(idx + 1).padStart(2, '0');
    if (m.isEmpty) {
      monthsHtml += `
        <td>
          <span class="rent-cell-val" style="color: var(--charcoal-muted); font-weight: normal;">-</span>
          <span class="rent-cell-sub">-</span>
        </td>
      `;
    } else {
      const valClass = m.isPositive === true ? 'positive' : (m.isPositive === false ? 'negative' : '');
      monthsHtml += `
        <td class="rent-cell-interactive" data-table="${tableType}" data-year="${year}" data-month="${monthNum}" data-type="month" style="cursor: pointer;">
          <span class="rent-cell-val ${valClass}">${m.mainText}</span>
          <span class="rent-cell-sub">${m.subText}</span>
        </td>
      `;
    }
  });

  const renderSummaryCell = (data, type) => {
    if (!data || data.mainText === '-' || data.mainText === undefined) {
      return `
        <td>
          <span class="rent-cell-val" style="color: var(--charcoal-muted); font-weight: normal;">-</span>
          <span class="rent-cell-sub">-</span>
        </td>
      `;
    }
    const cls = data.isPositive === true ? 'positive' : (data.isPositive === false ? 'negative' : '');
    return `
      <td class="rent-cell-interactive" data-table="${tableType}" data-year="${year}" data-type="${type}" style="cursor: pointer;">
        <span class="rent-cell-val ${cls}">${data.mainText}</span>
        <span class="rent-cell-sub">${data.subText || '-'}</span>
      </td>
    `;
  };

  return `
    <tr>
      <td style="white-space: nowrap;">
        <div style="display: flex; align-items: baseline; gap: 10px;">
          <span class="rent-cell-year">${year}</span>
          <div style="overflow: hidden; text-align: left;">
            <span class="rent-cell-asset-name" title="${assetName}">${assetName}</span>
            <span class="rent-cell-bm-label">${subLabel}</span>
          </div>
        </div>
      </td>
      ${monthsHtml}
      ${renderSummaryCell(noAno, 'no-ano')}
      ${renderSummaryCell(acumulado, 'acumulado')}
    </tr>
  `;
}

function handleRentGridCellClick(cell) {
  const sim = state.simulationResult;
  if (!sim || !sim.monthly_summary) return;

  const table = cell.getAttribute('data-table');
  if (table === 'div') return; // Manipulado pelo componente de dividendos

  const year = cell.getAttribute('data-year');
  const month = cell.getAttribute('data-month');
  const type = cell.getAttribute('data-type');
  const isUSD = state.activeCurrency === 'usd';
  const selectedBm = state.selectedMonthlyBenchmark || 'cdi';
  const bmNames = {
    cdi: 'CDI', ibov: 'IBOVESPA', ipca: 'IPCA', sp500: 'S&P 500',
    poupanca: 'Poupança', ifix: 'IFIX', btc: 'Bitcoin', usd: 'Dólar'
  };
  const bmLabel = bmNames[selectedBm] || selectedBm.toUpperCase();
  const portfolioName = (state.activePortfolio && state.activePortfolio.name) 
    ? state.activePortfolio.name 
    : (sim.portfolio_name || 'CARTEIRA');

  if (type === 'month' && year && month) {
    const ym = `${year}-${month}`;
    handleRentListRowClick(ym);
  } else if ((type === 'no-ano' || type === 'acumulado') && year) {
    const yearMonths = sim.monthly_summary.filter(x => x.month.startsWith(`${year}-`));
    if (yearMonths.length === 0) return;

    let portFactor = 1.0;
    let bmFactor = 1.0;
    let totalGain = 0;

    yearMonths.forEach(m => {
      const ret = isUSD ? (m.return_pct_usd || 0) : (m.return_pct || 0);
      const bmRet = m.benchmarks_returns ? (m.benchmarks_returns[selectedBm] || 0) : 0;
      const gain = isUSD ? (m.capital_gain_usd || 0) : (m.capital_gain || 0);

      portFactor *= (1.0 + ret / 100.0);
      bmFactor *= (1.0 + bmRet / 100.0);
      totalGain += gain;
    });

    const yearRet = (portFactor - 1.0) * 100.0;
    const yearBmRet = (bmFactor - 1.0) * 100.0;
    const yearAlpha = yearRet - yearBmRet;
    let yearPctBm = '-';
    if (yearBmRet !== 0) {
      yearPctBm = `${((yearRet / yearBmRet) * 100.0).toFixed(1).replace('.', ',')}% do ${bmLabel}`;
    }

    openMobileDetailModal({
      title: `Rentabilidade · Ano ${year}`,
      subtitle: `${portfolioName} · Benchmark: ${bmLabel}`,
      badge: `${yearRet >= 0 ? '+' : ''}${yearRet.toFixed(2).replace('.', ',')}% no Ano`,
      badgeClass: yearRet >= 0 ? 'badge-mint' : 'badge-peach',
      items: [
        { label: 'Retorno Carteira (Ano)', value: formatPct(yearRet), color: yearRet >= 0 ? '#166534' : '#DC2626', isFull: true },
        { label: `Benchmark (${bmLabel})`, value: formatPct(yearBmRet) },
        { label: '% do Benchmark', value: yearPctBm },
        { label: 'Alfa no Ano', value: `${yearAlpha >= 0 ? '+' : ''}${yearAlpha.toFixed(2).replace('.', ',')}%`, color: yearAlpha >= 0 ? '#166534' : '#DC2626' },
        { label: 'Ganho Líquido Total', value: `${totalGain >= 0 ? '+' : ''}${formatMoney(totalGain, state.activeCurrency)}`, color: totalGain >= 0 ? '#166534' : '#DC2626', isFull: true }
      ],
      footerText: `Consolidado anual de ${yearMonths.length} meses apurados em ${year}`
    });
  }
}

function handleRentListRowClick(ym) {
  const sim = state.simulationResult;
  if (!sim || !sim.monthly_summary) return;

  const m = sim.monthly_summary.find(x => x.month === ym);
  if (!m) return;

  const isUSD = state.activeCurrency === 'usd';
  const selectedBm = state.selectedMonthlyBenchmark || 'cdi';
  const bmNames = {
    cdi: 'CDI', ibov: 'IBOVESPA', ipca: 'IPCA', sp500: 'S&P 500',
    poupanca: 'Poupança', ifix: 'IFIX', btc: 'Bitcoin', usd: 'Dólar'
  };
  const bmLabel = bmNames[selectedBm] || selectedBm.toUpperCase();
  const portfolioName = (state.activePortfolio && state.activePortfolio.name) 
    ? state.activePortfolio.name 
    : (sim.portfolio_name || 'CARTEIRA');

  const ret = isUSD ? (m.return_pct_usd || 0) : (m.return_pct || 0);
  const bmRet = m.benchmarks_returns ? (m.benchmarks_returns[selectedBm] || 0) : 0;
  const alpha = ret - bmRet;
  const gain = isUSD ? (m.capital_gain_usd || 0) : (m.capital_gain || 0);
  const endVal = isUSD ? (m.end_val_usd || 0) : (m.end_val || 0);

  let pctOfBm = '-';
  if (bmRet > 0) {
    pctOfBm = `${((ret / bmRet) * 100.0).toFixed(0)}% do ${bmLabel}`;
  } else if (bmRet < 0 && ret > 0) {
    pctOfBm = 'Superou (Índice Negativo)';
  }

  openMobileDetailModal({
    title: `Rentabilidade · ${m.month_label || ym}`,
    subtitle: `${portfolioName} · Benchmark: ${bmLabel}`,
    badge: `${alpha >= 0 ? '+' : ''}${alpha.toFixed(2).replace('.', ',')}% Alfa`,
    badgeClass: alpha >= 0 ? 'badge-mint' : 'badge-peach',
    items: [
      { label: 'Retorno Carteira', value: formatPct(ret), color: ret >= 0 ? '#166534' : '#DC2626', isFull: true },
      { label: `Retorno ${bmLabel}`, value: formatPct(bmRet) },
      { label: '% do Benchmark', value: pctOfBm },
      { label: 'Ganho Líquido', value: `${gain >= 0 ? '+' : ''}${formatMoney(gain, state.activeCurrency)}`, color: gain >= 0 ? '#166534' : '#DC2626' },
      { label: 'Saldo ao Final', value: formatMoney(endVal, state.activeCurrency) },
      { label: 'Alfa no Mês', value: `${alpha >= 0 ? '+' : ''}${alpha.toFixed(2).replace('.', ',')}%`, color: alpha >= 0 ? '#166534' : '#DC2626' }
    ],
    footerText: 'Toque fora ou no X para fechar'
  });
}
