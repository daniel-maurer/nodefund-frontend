/**
 * PrevInvest - Hero KPIs Component
 * Renderiza os 4 blocos de KPIs de Mercado no cabeçalho Hero:
 * 1. S&P 500 (pontos / variação recente)
 * 2. Ibovespa (pontos / variação recente)
 * 3. Bitcoin em Dólar (USD / variação recente)
 * 4. Câmbio Dólar Hoje (USD/BRL, ex: R$ 5,18)
 *
 * Cada bloco inclui indicador de alta/baixa (▲/▽ %), data da cotação
 * e botão sutil com ícone de refresh interativo.
 */

import { state } from '../state.js';
import { api } from '../services/api.js';
import { formatMoney, showToast } from '../utils/formatters.js';

let isRefreshingQuotes = false;

export function initHeroKPIs() {
  const container = document.getElementById('hero-stats-row');
  if (!container) return;

  // Delegação de evento para os botões de refresh das cotações
  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('.stat-refresh-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    if (isRefreshingQuotes) return;
    isRefreshingQuotes = true;

    // Colocar ícones em rotação
    const allBtns = container.querySelectorAll('.stat-refresh-btn');
    allBtns.forEach(b => b.classList.add('spinning'));

    try {
      const res = await api.fetchMarketQuotes(true);
      if (res && res.quotes) {
        state.marketQuotes = res.quotes;
      }
      renderMarketQuotes();
      showToast('Cotações de mercado atualizadas com sucesso!');
    } catch (err) {
      console.warn('Erro ao atualizar cotações de mercado:', err);
      showToast('Falha ao atualizar cotações. Mantendo dados recentes.', 'error');
    } finally {
      isRefreshingQuotes = false;
      allBtns.forEach(b => b.classList.remove('spinning'));
    }
  });

  // Carregar cotações na inicialização se ainda não carregadas
  if (!state.marketQuotes || state.marketQuotes.length === 0) {
    api.fetchMarketQuotes(false)
      .then(res => {
        if (res && res.quotes) {
          state.marketQuotes = res.quotes;
          renderMarketQuotes();
        }
      })
      .catch(err => {
        console.warn('Cotações padrão mantidas:', err);
      });
  }
}

export function renderMarketQuotes() {
  const container = document.getElementById('hero-stats-row');
  if (!container) return;

  const quotes = (state.marketQuotes && state.marketQuotes.length > 0) ? state.marketQuotes : [
    { id: 'sp500', name: 'S&P 500', formatted_value: '7.686,14 pts', pct_change: -0.33, is_positive: false, date: '31/08/2026' },
    { id: 'ibov', name: 'Ibovespa', formatted_value: '177.419 pts', pct_change: 1.0, is_positive: true, date: '31/08/2026' },
    { id: 'btc', name: 'Bitcoin (USD)', formatted_value: 'US$ 78.548,63', pct_change: 1.13, is_positive: true, date: '31/08/2026' },
    { id: 'usd', name: 'Dólar Hoje', formatted_value: 'R$ 5,18', pct_change: -0.18, is_positive: false, date: '31/08/2026' }
  ];

  let html = '';
  quotes.forEach(q => {
    const isPos = q.is_positive || q.pct_change >= 0;
    const badgeSign = isPos ? '▲' : '▽';
    const badgeClass = isPos ? 'positive' : 'negative';
    const pctStr = `${badgeSign} ${Math.abs(q.pct_change).toFixed(1).replace('.', ',')}%`;

    html += `
      <div class="stat-block" data-market-id="${q.id}">
        <div class="stat-val-badge">
          <span class="stat-amount">${q.formatted_value}</span>
          <span class="stat-pct-badge ${badgeClass}" title="Variação da sessão: ${q.pct_change >= 0 ? '+' : ''}${q.pct_change.toFixed(2)}%">${pctStr}</span>
        </div>
        <div class="stat-label-row">
          <span class="stat-label-sub" title="${q.name}">${q.name}</span>
          <div class="stat-meta-group">
            <span class="stat-quote-date" title="Data da cotação">${q.date}</span>
            <button type="button" class="stat-refresh-btn" data-market-id="${q.id}" title="Atualizar cotações">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

export function renderHeroKPIs() {
  const sim = state.simulationResult;
  const portfolio = state.portfolio;
  const isUSD = state.activeCurrency === 'usd';

  // 1. Atualizar Nome da Carteira Ativa no Título do Dashboard e Valor de Patrimônio
  const titleEl = document.getElementById('report-portfolio-title');
  if (titleEl && portfolio) {
    titleEl.innerText = portfolio.name || 'Carteira Principal';
  }

  const networthEl = document.getElementById('hero-total-networth');
  const portPeriodTextEl = document.getElementById('portfolio-period-text');

  if (sim) {
    if (networthEl) {
      networthEl.innerText = isUSD ? formatMoney(sim.final_smart_val_usd, 'usd') : formatMoney(sim.final_smart_val, 'brl');
    }
    if (portPeriodTextEl && sim.start_date && sim.end_date) {
      portPeriodTextEl.innerText = `Parâmetros (${sim.start_date} até ${sim.end_date})`;
    }
  }

  // 2. Renderizar Cotações de Mercado (S&P 500, Ibovespa, Bitcoin em Dólar e Câmbio USD)
  renderMarketQuotes();
}
