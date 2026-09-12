/**
 * PrevInvest - Invoices Component (Desempenho por Mês)
 * Renderiza os cartões de Invoices exibindo:
 * - Ganho de capital no mês selecionado para cada ativo da carteira ativa
 * - Percentual de rendimento no mês selecionado para cada ativo (sem ícone ▾)
 * - Cartões verdes para desempenho positivo e laranjinha para negativo
 * - Popover moderno em grade para seleção de mês (sem select gigante)
 */

import { state } from '../state.js';
import { formatMoney, formatPct, getAssetKey, getAssetCodeDisplay } from '../utils/formatters.js';

let selectedInvoicesMonth = null;
let pickerBrowsingYear = null;

const PT_MONTHS = [
  { num: '01', label: 'Jan' },
  { num: '02', label: 'Fev' },
  { num: '03', label: 'Mar' },
  { num: '04', label: 'Abr' },
  { num: '05', label: 'Mai' },
  { num: '06', label: 'Jun' },
  { num: '07', label: 'Jul' },
  { num: '08', label: 'Ago' },
  { num: '09', label: 'Set' },
  { num: '10', label: 'Out' },
  { num: '11', label: 'Nov' },
  { num: '12', label: 'Dez' }
];

export function initInvoices() {
  const btnPicker = document.getElementById('btn-invoices-month-picker');
  const popover = document.getElementById('invoices-month-popover');
  const btnPrev = document.getElementById('btn-picker-prev-year');
  const btnNext = document.getElementById('btn-picker-next-year');

  if (btnPicker && popover) {
    btnPicker.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = popover.style.display === 'block';
      popover.style.display = isVisible ? 'none' : 'block';
      if (!isVisible) renderMonthPickerGrid();
    });

    document.addEventListener('click', (e) => {
      if (!popover.contains(e.target) && e.target !== btnPicker && !btnPicker.contains(e.target)) {
        popover.style.display = 'none';
      }
    });
  }

  if (btnPrev) {
    btnPrev.addEventListener('click', (e) => {
      e.stopPropagation();
      if (pickerBrowsingYear) {
        pickerBrowsingYear -= 1;
        renderMonthPickerGrid();
      }
    });
  }

  if (btnNext) {
    btnNext.addEventListener('click', (e) => {
      e.stopPropagation();
      if (pickerBrowsingYear) {
        pickerBrowsingYear += 1;
        renderMonthPickerGrid();
      }
    });
  }
}

function renderMonthPickerGrid() {
  const sim = state.simulationResult;
  const grid = document.getElementById('picker-months-grid');
  const yearLabel = document.getElementById('picker-current-year');
  const popover = document.getElementById('invoices-month-popover');
  const pickerLabel = document.getElementById('invoices-picker-label');

  if (!grid || !sim) return;

  const tl = sim.timeline || [];
  const uniqueMonths = [...new Set(tl.map(t => t.date.slice(0, 7)))].sort();
  if (uniqueMonths.length === 0) return;

  if (!selectedInvoicesMonth || !uniqueMonths.includes(selectedInvoicesMonth)) {
    selectedInvoicesMonth = uniqueMonths[uniqueMonths.length - 1];
  }

  const [activeY, activeM] = selectedInvoicesMonth.split('-');
  if (!pickerBrowsingYear) {
    pickerBrowsingYear = parseInt(activeY, 10);
  }

  if (yearLabel) yearLabel.innerText = pickerBrowsingYear;

  grid.innerHTML = '';
  PT_MONTHS.forEach(mObj => {
    const ym = `${pickerBrowsingYear}-${mObj.num}`;
    const hasData = uniqueMonths.includes(ym);
    const isSelected = ym === selectedInvoicesMonth;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `month-pill-item ${isSelected ? 'active' : ''} ${!hasData ? 'disabled' : ''}`;
    btn.innerText = mObj.label;

    if (hasData) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedInvoicesMonth = ym;
        if (pickerLabel) {
          pickerLabel.innerText = `${mObj.label} ${pickerBrowsingYear}`;
        }
        if (popover) popover.style.display = 'none';
        renderInvoices();
      });
    }

    grid.appendChild(btn);
  });
}

export function renderInvoices() {
  const container = document.getElementById('invoices-cards-grid');
  const pickerLabel = document.getElementById('invoices-picker-label');
  const sim = state.simulationResult;
  if (!container) return;

  if (!sim || !sim.funds || sim.funds.length === 0) {
    container.innerHTML = '<div style="padding: 16px; color: var(--charcoal-muted); font-size: 0.85rem;">Execute a simulação para visualizar o desempenho dos ativos.</div>';
    return;
  }

  const isUSD = state.activeCurrency === 'usd';
  const usdRate = sim.last_usd_rate || 5.5;
  const tl = sim.timeline || [];

  if (tl.length === 0) return;

  // 1. Extrair lista única de meses disponíveis na simulação
  const uniqueMonths = [...new Set(tl.map(t => t.date.slice(0, 7)))].sort();

  if (!selectedInvoicesMonth || !uniqueMonths.includes(selectedInvoicesMonth)) {
    selectedInvoicesMonth = uniqueMonths[uniqueMonths.length - 1];
  }

  // 2. Atualizar label do botão seletor moderno
  const [selY, selM] = selectedInvoicesMonth.split('-');
  const mMatch = PT_MONTHS.find(m => m.num === selM);
  if (pickerLabel && mMatch) {
    pickerLabel.innerText = `${mMatch.label} ${selY}`;
  }

  // 3. Obter dados de início e fim para o mês selecionado
  const monthEntries = tl.filter(t => t.date.startsWith(selectedInvoicesMonth));
  const firstEntry = monthEntries[0] || tl[0];
  const lastEntry = monthEntries[monthEntries.length - 1] || tl[tl.length - 1];

  let html = '';
  sim.funds.forEach((fund) => {
    const key = getAssetKey(fund);
    const displayCode = getAssetCodeDisplay(fund);

    // Saldo inicial e final do ativo no mês selecionado dentro da carteira
    const startEff = (firstEntry.effective_pcts && firstEntry.effective_pcts[key]) ? firstEntry.effective_pcts[key] : (fund.target_pct || 0);
    const endEff = (lastEntry.effective_pcts && lastEntry.effective_pcts[key]) ? lastEntry.effective_pcts[key] : (fund.target_pct || 0);

    const startBalBRL = (firstEntry.smart_val * startEff) / 100.0;
    const endBalBRL = (lastEntry.smart_val * endEff) / 100.0;

    // Ganho de capital no mês
    let monthlyGainBRL = endBalBRL - startBalBRL;
    const monthlyGain = isUSD ? (monthlyGainBRL / usdRate) : monthlyGainBRL;

    // Percentual de rendimento no mês
    let retPct = 0;
    if (isUSD && lastEntry.single_return_pcts_usd && firstEntry.single_return_pcts_usd) {
      const retEnd = lastEntry.single_return_pcts_usd[key] || 0;
      const retStart = firstEntry.single_return_pcts_usd[key] || 0;
      retPct = retEnd - retStart;
    } else if (lastEntry.single_return_pcts && firstEntry.single_return_pcts) {
      const retEnd = lastEntry.single_return_pcts[key] || 0;
      const retStart = firstEntry.single_return_pcts[key] || 0;
      retPct = retEnd - retStart;
    }

    // Cores semânticas solicitadas: verde para positivo, laranjinha para negativo
    const isPositive = (monthlyGain >= 0 && retPct >= 0);
    const cardClass = isPositive ? 'invoice-card-mint' : 'invoice-card-peach';
    const gainSign = monthlyGain >= 0 ? '+' : '';
    const gainColor = monthlyGain >= 0 ? 'var(--charcoal-dark)' : '#DC2626';

    html += `
      <div class="invoice-card ${cardClass}">
        <div class="invoice-card-top">
          <div>
            <div class="invoice-card-val" style="color: ${gainColor}; font-size: 1.35rem;">
              ${gainSign}${formatMoney(monthlyGain, state.activeCurrency)}
            </div>
            <div class="invoice-card-lbl" title="${fund.name}">
              ${fund.name} (${displayCode})
            </div>
          </div>
          <!-- Badge limpo sem o ícone ▾ solicitado -->
          <div class="invoice-period-pill" title="Rendimento no mês selecionado">
            ${formatPct(retPct)}
          </div>
        </div>
        <div class="invoice-card-ticks"></div>
      </div>
    `;
  });

  container.innerHTML = html;
}


