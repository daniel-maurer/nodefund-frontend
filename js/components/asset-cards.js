/**
 * PrevInvest - Asset Cards Component
 * Renderiza os cartões de métricas individuais de rentabilidade e risco
 * inspirados diretamente nos Cartões de Patrimônio (estilo Dribbble QuickBooks):
 * - Cores pastel refinadas (Mint, Sky, Peach, Lavender, Teal, Rosewood)
 * - Badge circular de iniciais em branco translúcido com sombra suave
 * - Sparklines dinâmicas fiéis à realidade calculadas com alta granularidade (25 valores amostrados da timeline):
 *   (Curvas duplas: Custódia Atual e Lucro Líquido geradas por spline Bézier Catmull-Rom)
 * - Tipografia bold de alto contraste para Custódia Atual e Lucro Líquido
 * - Pílulas inferiores translúcidas com Total Aportado e Retorno anualizado
 */

import { state } from '../state.js';
import { formatMoney, formatPct, getSubtleAuxiliaryColor } from '../utils/formatters.js';
import { generateSmoothSvgPath } from './bank-cards.js';

function getInitials(name) {
  if (!name) return 'FI';
  const clean = name.replace(/[^a-zA-Z0-9À-ÿ\s]/g, '').trim();
  const words = clean.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return 'FI';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Extrai a série histórica de custódia e lucro líquido de um ativo com alta granularidade (25 valores),
 * gerando curvas detalhadas e fiéis para a evolução da custódia e do lucro líquido.
 */
function getHistoricalAssetValues(sim, assetKey, isUSD, targetPoints = 25) {
  const timeline = sim.timeline || [];

  if (timeline.length === 0) {
    const monthly = sim.monthly_summary || [];
    if (monthly.length === 0) {
      return { custodyValues: [], profitValues: [], granLabel: 'N/A' };
    }
    const custody = monthly.map(m => (m.smart_breakdown && m.smart_breakdown[assetKey]) || 0.0);
    const profit = monthly.map(m => (m.asset_profits && m.asset_profits[assetKey]) || 0.0);
    return { custodyValues: custody, profitValues: profit, granLabel: `${custody.length} pontos` };
  }

  const custodyValues = [];
  const profitValues = [];

  if (timeline.length <= targetPoints) {
    timeline.forEach(t => {
      const cMap = isUSD ? t.smart_breakdown_usd : t.smart_breakdown;
      const pMap = isUSD ? t.asset_profits_usd : t.asset_profits;
      custodyValues.push((cMap && cMap[assetKey] !== undefined) ? cMap[assetKey] : 0.0);
      profitValues.push((pMap && pMap[assetKey] !== undefined) ? pMap[assetKey] : 0.0);
    });
  } else {
    for (let i = 0; i < targetPoints; i++) {
      const idx = Math.round((i / (targetPoints - 1)) * (timeline.length - 1));
      const t = timeline[idx];
      const cMap = isUSD ? t.smart_breakdown_usd : t.smart_breakdown;
      const pMap = isUSD ? t.asset_profits_usd : t.asset_profits;
      custodyValues.push((cMap && cMap[assetKey] !== undefined) ? cMap[assetKey] : 0.0);
      profitValues.push((pMap && pMap[assetKey] !== undefined) ? pMap[assetKey] : 0.0);
    }
  }

  // Assegurar que o último ponto coincida com o valor final da simulação
  const lastT = timeline[timeline.length - 1];
  const lastCMap = isUSD ? lastT.smart_breakdown_usd : lastT.smart_breakdown;
  const lastPMap = isUSD ? lastT.asset_profits_usd : lastT.asset_profits;
  if (custodyValues.length > 0 && lastCMap && lastCMap[assetKey] !== undefined) {
    custodyValues[custodyValues.length - 1] = lastCMap[assetKey];
  }
  if (profitValues.length > 0 && lastPMap && lastPMap[assetKey] !== undefined) {
    profitValues[profitValues.length - 1] = lastPMap[assetKey];
  }

  return { custodyValues, profitValues, granLabel: `${custodyValues.length} pontos` };
}

export function renderAssetCards() {
  const container = document.getElementById('asset-perf-container');
  const sim = state.simulationResult;
  if (!container) return;

  const assetsPerf = (sim && sim.assets_performance) ? sim.assets_performance : [];

  if (assetsPerf.length === 0) {
    container.innerHTML = '<div style="color: var(--charcoal-muted); font-size: 0.85rem; padding: 20px; text-align: center; width: 100%;">Execute a simulação para visualizar o detalhamento individual por ativo.</div>';
    return;
  }

  const isUSD = (state.activeCurrency === 'usd') || (state.chartCurrency === 'usd');
  const usdRate = sim.last_usd_rate || 5.5;

  let html = '';
  assetsPerf.forEach((asset, idx) => {
    // Cor vibrante do ativo configurada na carteira
    const primaryColor = asset.color || '#2563EB';
    // Cor auxiliar suave e harmoniosa para o fundo do cartão
    const auxBgColor = asset.color_aux || getSubtleAuxiliaryColor(primaryColor);

    const { custodyValues, profitValues, granLabel } = getHistoricalAssetValues(sim, asset.key, isUSD);
    const pathCustody = generateSmoothSvgPath(custodyValues);
    const pathProfit = generateSmoothSvgPath(profitValues);

    const isPositive = asset.cumulative_return_pct >= 0;
    const cumColor = isPositive ? '#276749' : '#C55A54';

    const profit = isUSD ? asset.profit_usd : asset.profit;
    const profitSign = profit >= 0 ? '+' : '';
    const profitColor = profit >= 0 ? '#222428' : '#C55A54';
    const balance = isUSD ? (asset.current_balance_usd || asset.current_balance / usdRate) : asset.current_balance;
    const invested = isUSD ? (asset.total_contributed / usdRate) : asset.total_contributed;

    html += `
      <div class="bank-account-card asset-bank-card" style="background: ${auxBgColor};">
        <!-- Top: Badge circular + Nome + Volatilidade + Rentabilidade Acumulada -->
        <div class="bank-account-top" style="display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
            <div class="bank-circle-badge" style="color: ${primaryColor};">
              ${getInitials(asset.name)}
            </div>
            <div class="bank-info-mid" style="flex: 1; min-width: 0;">
              <div class="bank-account-name" title="${asset.name}">
                ${asset.name}
              </div>
              <div class="bank-account-time" style="font-size: 0.70rem; color: var(--charcoal-light); margin-top: 3px;">
                ${asset.volatility_annualized ? `Volatilidade: ${asset.volatility_annualized.toFixed(1)}% a.a.` : 'Baixa Volatilidade'}
              </div>
            </div>
          </div>
          <span class="bank-badge-pill" style="padding: 4px 10px; border-radius: 9999px; background: rgba(255, 255, 255, 0.85); font-size: 0.78rem; font-weight: 800; color: ${cumColor}; display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; box-shadow: 0 1px 4px rgba(0,0,0,0.03);">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            <span>${formatPct(asset.cumulative_return_pct)}</span>
          </span>
        </div>

        <!-- Ondas Duplas Reais com Granularidade Adaptativa -->
        <div class="bank-waves-row">
          <svg class="bank-wave-svg" viewBox="0 0 120 30" role="img" aria-label="Evolução da Custódia (${granLabel})">
            <title>Custódia (${granLabel}): ${formatMoney(balance, isUSD ? 'usd' : 'brl')}</title>
            <path d="${pathCustody}" fill="none" stroke="#222428" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg class="bank-wave-svg" viewBox="0 0 120 30" role="img" aria-label="Evolução do Lucro Líquido (${granLabel})">
            <title>Lucro Líquido (${granLabel}): ${profitSign}${formatMoney(profit, isUSD ? 'usd' : 'brl')}</title>
            <path d="${pathProfit}" fill="none" stroke="#222428" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>

        <!-- Linha de Valores: Custódia Atual + Lucro Líquido -->
        <div class="bank-numbers-row">
          <div>
            <div class="bank-num-big">
              ${formatMoney(balance, isUSD ? 'usd' : 'brl')}
            </div>
            <div class="bank-num-sub">
              Custódia Atual
            </div>
          </div>
          <div style="text-align: right;">
            <div class="bank-num-big" style="color: ${profitColor};">
              ${profitSign}${formatMoney(profit, isUSD ? 'usd' : 'brl')}
            </div>
            <div class="bank-num-sub">
              Lucro Líquido
            </div>
          </div>
        </div>

        <!-- Rodapé com Pílulas Translúcidas: Total Aportado e Retorno a.a. -->
        <div class="bank-card-footer-row">
          <span class="bank-badge-pill">
            <span style="color: var(--charcoal-muted); margin-right: 4px;">Aportado:</span>
            <strong>${formatMoney(invested, isUSD ? 'usd' : 'brl')}</strong>
          </span>
          <span class="bank-badge-pill">
            <span style="color: var(--charcoal-muted); margin-right: 4px;">Retorno a.a.:</span>
            <strong style="color: ${asset.annualized_return_pct >= 0 ? '#276749' : '#C55A54'};">${asset.annualized_return_pct ? formatPct(asset.annualized_return_pct) : '--'}</strong>
          </span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}
