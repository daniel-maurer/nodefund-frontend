/**
 * PrevInvest - API Service Client
 */

import * as auth from './auth.js';

async function request(endpoint, options = {}) {
  const token = await auth.getIdToken();
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(endpoint, { ...options, headers });

  if (res.status === 401) {
    auth.logout();
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erro na requisição');
  }

  return data;
}

export const api = {
  async fetchPortfolios() {
    try {
      return await request('/api/portfolios');
    } catch (err) {
      throw new Error(err.message === 'Sessão expirada. Faça login novamente.' ? err.message : 'Erro ao buscar lista de carteiras');
    }
  },

  async fetchActivePortfolio() {
    try {
      return await request('/api/portfolio');
    } catch (err) {
      throw new Error(err.message === 'Sessão expirada. Faça login novamente.' ? err.message : 'Erro ao buscar carteira ativa');
    }
  },

  async selectPortfolio(portfolioId) {
    try {
      return await request('/api/portfolios/select', {
        method: 'POST',
        body: JSON.stringify({ portfolio_id: portfolioId })
      });
    } catch (err) {
      throw new Error(err.message === 'Sessão expirada. Faça login novamente.' ? err.message : err.message || 'Erro ao selecionar carteira');
    }
  },

  async createPortfolio(payload) {
    try {
      return await request('/api/portfolios/create', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    } catch (err) {
      throw new Error(err.message === 'Sessão expirada. Faça login novamente.' ? err.message : err.message || 'Erro ao criar carteira');
    }
  },

  async savePortfolio(portfolio) {
    try {
      return await request('/api/portfolios', {
        method: 'POST',
        body: JSON.stringify(portfolio)
      });
    } catch (err) {
      throw new Error(err.message === 'Sessão expirada. Faça login novamente.' ? err.message : err.message || 'Erro ao salvar carteira');
    }
  },

  async deletePortfolio(portfolioId) {
    try {
      return await request('/api/portfolios/delete', {
        method: 'POST',
        body: JSON.stringify({ portfolio_id: portfolioId })
      });
    } catch (err) {
      throw new Error(err.message === 'Sessão expirada. Faça login novamente.' ? err.message : err.message || 'Erro ao excluir carteira');
    }
  },

  async runSimulation(params) {
    try {
      return await request('/api/simulate', {
        method: 'POST',
        body: JSON.stringify(params)
      });
    } catch (err) {
      throw new Error(err.message === 'Sessão expirada. Faça login novamente.' ? err.message : err.message || 'Erro ao simular');
    }
  },

  async calculateRebalance(payload) {
    try {
      return await request('/api/rebalance/calculate', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    } catch (err) {
      throw new Error(err.message === 'Sessão expirada. Faça login novamente.' ? err.message : err.message || 'Erro ao calcular rebalanceamento');
    }
  },

  async fetchDataStatus() {
    try {
      return await request('/api/data/status');
    } catch (err) {
      throw new Error(err.message === 'Sessão expirada. Faça login novamente.' ? err.message : 'Erro ao buscar status dos dados');
    }
  },

  async updateData(payload) {
    try {
      return await request('/api/data/update', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    } catch (err) {
      throw new Error(err.message === 'Sessão expirada. Faça login novamente.' ? err.message : err.message || 'Erro ao atualizar dados');
    }
  },

  async fetchSources() {
    try {
      return await request('/api/config/sources');
    } catch (err) {
      throw new Error(err.message === 'Sessão expirada. Faça login novamente.' ? err.message : 'Erro ao carregar fontes');
    }
  },

  async saveSources(payload) {
    try {
      return await request('/api/config/sources', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    } catch (err) {
      throw new Error(err.message === 'Sessão expirada. Faça login novamente.' ? err.message : err.message || 'Erro ao salvar fontes');
    }
  },

  async fetchBenchmarks() {
    try {
      return await request('/api/config/benchmarks');
    } catch (err) {
      throw new Error(err.message === 'Sessão expirada. Faça login novamente.' ? err.message : 'Erro ao carregar benchmarks');
    }
  },

  async saveBenchmarks(payload) {
    try {
      return await request('/api/config/benchmarks', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    } catch (err) {
      throw new Error(err.message === 'Sessão expirada. Faça login novamente.' ? err.message : err.message || 'Erro ao salvar benchmarks');
    }
  },

  async fetchMarketQuotes(refresh = false) {
    try {
      return await request(`/api/market/quotes${refresh ? '?refresh=true' : ''}`);
    } catch (err) {
      throw new Error(err.message === 'Sessão expirada. Faça login novamente.' ? err.message : 'Erro ao carregar cotações de mercado');
    }
  }
};
