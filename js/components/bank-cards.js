/**
 * PrevInvest - Bank Accounts Component
 * Renderiza os dois cartões coloridos (Menta e Azul Céu):
 * - Cartão 1: Patrimônio atual em Real (BRL) e Ganho de Capital do mês em Real
 * - Cartão 2: Patrimônio atual em Dólar (USD) e Ganho de Capital do mês em Dólar
 * 
 * Sparklines dinâmicas fiéis à realidade:
 * - Acima do Saldo Atual: Evolução histórica do patrimônio com granularidade adaptativa:
 *   • Menos de 1 ano: Mensal
 *   • Menos de 2 anos: Trimestral
 *   • Menos de 3 anos: Semestral
 *   • Mais de 3 anos: Anual
 * - Acima do Ganho no Mês: Evolução diária do ganho acumulado restrito ao mês de referência atual.
 */

import { state } from '../state.js';
import { formatBRL, formatUSD, formatPct } from '../utils/formatters.js';

/**
 * Gera um path SVG suave (curva cúbica de Bézier baseada em Catmull-Rom)
 * a partir de uma série de valores numéricos, mapeados para viewBox 120 x 30.
 */
export function generateSmoothSvgPath(values, width = 120, height = 30) {
  if (!values || values.length === 0) return '';
  if (values.length === 1) {
    return `M 4 ${height / 2} L ${width - 4} ${height / 2}`;
  }

  const padX = 4;
  const padY = 5;
  const usableW = width - 2 * padX;
  const usableH = height - 2 * padY;

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const valRange = maxVal - minVal;

  const points = values.map((v, i) => {
    const x = padX + (i / (values.length - 1)) * usableW;
    const y = Math.abs(valRange) < 1e-6
      ? height / 2
      : (height - padY) - ((v - minVal) / valRange) * usableH;
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  });

  if (points.length === 2) {
    const cx = (points[0].x + points[1].x) / 2;
    return `M ${points[0].x} ${points[0].y} Q ${cx} ${(points[0].y + points[1].y) / 2} ${points[1].x} ${points[1].y}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x} ${p2.y}`;
  }

  return d;
}

/**
 * Extrai a série histórica de patrimônio com a granularidade exigida:
 * - < 1 ano: mensal
 * - < 2 anos: trimestral
 * - < 3 anos: semestral
 * - >= 3 anos: anual
 */
function getHistoricalEquityValues(sim, isUSD) {
  const monthly = sim.monthly_summary || [];
  if (monthly.length === 0) {
    const tl = sim.timeline || [];
    if (tl.length === 0) return { values: [], granLabel: 'N/A' };
    return {
      values: tl.map(t => isUSD ? (t.smart_val_usd || 0) : (t.smart_val || 0)),
      granLabel: 'Diária'
    };
  }

  // Calcular a idade/duração da carteira em anos
  let years = monthly.length / 12.0;
  if (sim.start_date && sim.end_date) {
    const d0 = new Date(sim.start_date + 'T00:00:00');
    const d1 = new Date(sim.end_date + 'T00:00:00');
    const diffDays = (d1 - d0) / (1000 * 60 * 60 * 24);
    if (!isNaN(diffDays) && diffDays > 0) {
      years = diffDays / 365.25;
    }
  }

  let stepMonths = 1;
  let granLabel = 'Mensal';
  if (years < 1) {
    stepMonths = 1;
    granLabel = 'Mensal';
  } else if (years < 2) {
    stepMonths = 3;
    granLabel = 'Trimestral';
  } else if (years < 3) {
    stepMonths = 6;
    granLabel = 'Semestral';
  } else {
    stepMonths = 12;
    granLabel = 'Anual';
  }

  const values = [];
  const firstVal = isUSD 
    ? (monthly[0].start_val_usd ?? (monthly[0].start_val / (sim.timeline?.[0]?.usd_rate || 5.5)))
    : monthly[0].start_val;
  values.push(firstVal);

  for (let i = stepMonths - 1; i < monthly.length; i += stepMonths) {
    const val = isUSD ? monthly[i].end_val_usd : monthly[i].end_val;
    values.push(val);
  }

  // Assegurar que o valor final da simulação conste no encerramento da curva
  const lastMonth = monthly[monthly.length - 1];
  const lastVal = isUSD ? lastMonth.end_val_usd : lastMonth.end_val;
  if (values[values.length - 1] !== lastVal) {
    values.push(lastVal);
  }

  return { values, granLabel };
}

/**
 * Extrai a série diária de ganho acumulado restrita ao mês atual da simulação.
 */
function getCurrentMonthDailyGainValues(sim, isUSD) {
  const monthly = sim.monthly_summary || [];
  const timeline = sim.timeline || [];
  if (monthly.length === 0 || timeline.length === 0) return [];

  const lastMonth = monthly[monthly.length - 1];
  const ym = lastMonth.month; // ex: "2026-08"

  const monthDaily = timeline.filter(t => t.date && t.date.startsWith(ym));
  if (monthDaily.length === 0) {
    return timeline.slice(-30).map(t => isUSD ? (t.smart_profit_usd || 0) : (t.smart_profit || 0));
  }

  // Lucro acumulado anterior ao início deste mês
  const lastPt = monthDaily[monthDaily.length - 1];
  const lastProfit = isUSD ? (lastPt.smart_profit_usd ?? 0) : (lastPt.smart_profit ?? 0);
  const monthCapitalGain = isUSD ? (lastMonth.capital_gain_usd || 0) : (lastMonth.capital_gain || 0);
  const baseProfit = lastProfit - monthCapitalGain;

  // Iniciar no zero do início do mês e registrar a evolução diária
  const dailyGains = [0];
  monthDaily.forEach(t => {
    const curProfit = isUSD ? (t.smart_profit_usd || 0) : (t.smart_profit || 0);
    dailyGains.push(curProfit - baseProfit);
  });

  return dailyGains;
}

export function renderBankCards() {
  const sim = state.simulationResult;
  if (!sim) return;

  const smartValBRL = sim.final_smart_val || 0;
  const smartValUSD = sim.final_smart_val_usd || 0;

  // Pegar o ganho de capital do mês mais recente
  let monthlyGainBRL = 0;
  let monthlyGainUSD = 0;
  let lastMonthLabel = 'Último Mês';

  if (sim.monthly_summary && sim.monthly_summary.length > 0) {
    const lastMonth = sim.monthly_summary[sim.monthly_summary.length - 1];
    monthlyGainBRL = lastMonth.capital_gain || 0;
    monthlyGainUSD = lastMonth.capital_gain_usd || 0;
    lastMonthLabel = lastMonth.month_label || 'Último Mês';
  }

  // 1. Cartão Real (BRL - Fundo Menta)
  const card1Val = document.getElementById('card-smart-val');
  const card1Profit = document.getElementById('card-smart-profit');
  const card1Pct = document.getElementById('card-smart-pct');
  const card1Name = document.getElementById('bank1-name');
  const card1Time = document.getElementById('bank1-time');

  if (card1Name) card1Name.innerText = 'Patrimônio em Reais';
  if (card1Time) card1Time.innerText = `Referência: ${lastMonthLabel}`;
  if (card1Val) card1Val.innerText = formatBRL(smartValBRL);
  if (card1Profit) {
    const sign = monthlyGainBRL >= 0 ? '+' : '';
    card1Profit.innerText = `${sign}${formatBRL(monthlyGainBRL)}`;
  }
  if (card1Pct) {
    card1Pct.innerText = `${formatPct(sim.final_smart_return_pct)} Total`;
  }

  // 2. Cartão Dólar (USD - Fundo Azul Céu)
  const card2Val = document.getElementById('card-passive-val');
  const card2Profit = document.getElementById('card-passive-profit');
  const card2Pct = document.getElementById('card-passive-pct');
  const card2Name = document.getElementById('bank2-name');
  const card2Time = document.getElementById('bank2-time');

  if (card2Name) card2Name.innerText = 'Patrimônio em Dólar';
  if (card2Time) card2Time.innerText = `Câmbio: R$ ${(sim.last_usd_rate || 5.5).toFixed(2)}`;
  if (card2Val) card2Val.innerText = formatUSD(smartValUSD);
  if (card2Profit) {
    const sign = monthlyGainUSD >= 0 ? '+' : '';
    card2Profit.innerText = `${sign}${formatUSD(monthlyGainUSD)}`;
  }
  if (card2Pct) {
    card2Pct.innerText = `${formatPct(sim.final_smart_return_pct_usd)} Total`;
  }

  // 3. Atualizar as Ondas / Sparklines com Dados Reais
  const equityBRL = getHistoricalEquityValues(sim, false);
  const gainBRL = getCurrentMonthDailyGainValues(sim, false);
  const equityUSD = getHistoricalEquityValues(sim, true);
  const gainUSD = getCurrentMonthDailyGainValues(sim, true);

  const pathSmartEq = document.getElementById('wave-smart-equity');
  const pathSmartGain = document.getElementById('wave-smart-gain');
  const pathPassiveEq = document.getElementById('wave-passive-equity');
  const pathPassiveGain = document.getElementById('wave-passive-gain');

  if (pathSmartEq) {
    const d = generateSmoothSvgPath(equityBRL.values);
    if (d) pathSmartEq.setAttribute('d', d);
  }
  if (pathSmartGain) {
    const d = generateSmoothSvgPath(gainBRL);
    if (d) pathSmartGain.setAttribute('d', d);
  }
  if (pathPassiveEq) {
    const d = generateSmoothSvgPath(equityUSD.values);
    if (d) pathPassiveEq.setAttribute('d', d);
  }
  if (pathPassiveGain) {
    const d = generateSmoothSvgPath(gainUSD);
    if (d) pathPassiveGain.setAttribute('d', d);
  }

  const svgSmartEq = document.getElementById('svg-smart-equity');
  if (svgSmartEq) svgSmartEq.setAttribute('title', `Evolução do Patrimônio (${equityBRL.granLabel})`);

  const svgSmartGain = document.getElementById('svg-smart-gain');
  if (svgSmartGain) svgSmartGain.setAttribute('title', `Ganho Diário no Mês (${lastMonthLabel})`);

  const svgPassiveEq = document.getElementById('svg-passive-equity');
  if (svgPassiveEq) svgPassiveEq.setAttribute('title', `Evolução do Patrimônio em USD (${equityUSD.granLabel})`);

  const svgPassiveGain = document.getElementById('svg-passive-gain');
  if (svgPassiveGain) svgPassiveGain.setAttribute('title', `Ganho Diário no Mês em USD (${lastMonthLabel})`);
}
