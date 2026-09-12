/**
 * PrevInvest - Global State Management
 */

export const state = {
  portfolios: [],
  activePortfolioId: null,
  portfolio: null,
  simulationResult: null,
  chart: null,
  activeChartMode: 'pct', // 'pct', 'deposits_vs_total', 'monthly_gain', 'inflows_by_asset'
  selectedMonthlyBenchmark: 'cdi',
  activeCurrency: 'brl', // 'brl', 'usd'
  chartCurrency: 'brl', // 'brl', 'usd' (exclusive to the main chart)
  activePeriod: 'all', // '1m', '3m', '6m', '1y', '2y', 'all'
  visibleSeries: {
    'smart': true,
    'passive': true,
    'smart_brl': true,
    'smart_usd': true,
    'passive_brl': true,
    'passive_usd': true,
    'cdi': true,
    'ipca': true,
    'ibov': true,
    'sp500': true,
    'poupanca': true,
    'ifix': true,
    'btc': true,
    'usd': true
  },
  dataSources: null,
  benchmarksConfig: [],
  marketQuotes: []
};

const listeners = [];

export function subscribe(listener) {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

export function notify(event, payload) {
  listeners.forEach(fn => {
    try {
      fn(event, payload, state);
    } catch (err) {
      console.error('Erro no listener de estado:', err);
    }
  });
}
