/**
 * PrevInvest - Main Application Bootstrap (Modular ES Architecture)
 * Orquestra a inicialização e ciclo de vida reativo de todos os componentes da aplicação.
 */

import { state, subscribe, notify } from './state.js';
import { api } from './services/api.js';
import { showToast, PALETTE } from './utils/formatters.js';
import * as auth from './services/auth.js';

// Importação dos Componentes Modulares
import { initSidebar, renderSidebarPortfolios } from './components/sidebar.js';
import { initTopBar, switchTab } from './components/topbar.js';
import { initHeroKPIs, renderHeroKPIs, refreshMarketQuotes } from './components/hero-kpis.js';
import { initSalesChart, updateChartVisibility } from './components/sales-chart.js';
import { renderBankCards } from './components/bank-cards.js';
import { initInvoices, renderInvoices } from './components/invoices.js';
import { renderTreemap } from './components/treemap.js';
import { renderCorrelationHeatmap } from './components/heatmap.js';
import { initMonthlyTable, renderMonthlyTable } from './components/monthly-table.js';
import { renderAssetCards } from './components/asset-cards.js';
import { initCalculator, renderCalculatorBalances } from './components/calculator.js';
import { initPortfolioConfig, renderPortfolioConfigTable } from './components/portfolio-config.js';
import { initParamsModal } from './components/params-modal.js';
import { initDataStatus } from './components/data-status.js';
import { initSourcesConfig } from './components/sources-config.js';
import { initColorPickerModal } from './components/color-picker-modal.js';
import { initCreatePortfolioModal, openCreatePortfolioModal } from './components/create-portfolio-modal.js';
import { initDeletePortfolioModal } from './components/delete-portfolio-modal.js';
import { initDividendsCharts, renderDividendsCharts } from './components/dividends-charts.js';
import { initDividendsHistory, renderDividendsHistory } from './components/dividends-history.js';

let componentsInitialized = false;

// Função Central para Atualização de Todas as Views do Dashboard
export function renderDashboardViews() {
  renderHeroKPIs();
  renderBankCards();
  renderInvoices();
  updateChartVisibility();
  renderTreemap();
  renderCorrelationHeatmap();
  renderMonthlyTable();
  renderDividendsCharts();
  renderDividendsHistory();
  renderAssetCards();
  renderCalculatorBalances();
  renderPortfolioConfigTable();
  renderSidebarPortfolios();
}

/**
 * Inicializa todos os listeners, botões e controladores dos componentes da interface
 */
export function initAppComponents() {
  if (componentsInitialized) return;
  componentsInitialized = true;

  initTopBar();
  initSidebar();
  initHeroKPIs();
  initSalesChart();
  initInvoices();
  initMonthlyTable();
  initDividendsCharts();
  initDividendsHistory();
  initCalculator();
  initPortfolioConfig();
  initParamsModal();
  initCreatePortfolioModal();
  initDeletePortfolioModal();
  initDataStatus();
  initSourcesConfig();
  initColorPickerModal();
  switchTab('tab-simulation');

  // Assinatura de Eventos Reativos
  subscribe((event, payload) => {
    if (event === 'portfolio_changed' || event === 'portfolio_saved') {
      runCurrentSimulation();
    } else if (event === 'simulation_updated') {
      renderDashboardViews();
    } else if (event === 'currency_changed' || event === 'chart_currency_changed') {
      state.activeCurrency = payload || state.chartCurrency || 'brl';
      updateChartVisibility();
      renderAssetCards();
    }
  });
}

function initLoginScreen() {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const confirmForm = document.getElementById('confirm-form');
  
  const tabBtnLogin = document.getElementById('tab-btn-login');
  const tabBtnSignup = document.getElementById('tab-btn-signup');
  const showSignupBtn = document.getElementById('show-signup');
  const showLoginBtn = document.getElementById('show-login');
  const showLoginFromConfirmBtn = document.getElementById('show-login-from-confirm');

  function clearErrors() {
    ['login-error', 'signup-error', 'confirm-error'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = '';
        el.classList.remove('visible');
      }
    });
  }

  function switchView(targetForm) {
    clearErrors();
    [loginForm, signupForm, confirmForm].forEach(f => {
      if (f) f.classList.remove('active');
    });
    if (targetForm) targetForm.classList.add('active');

    // Atualiza Abas do Topo do Card
    if (targetForm === loginForm) {
      tabBtnLogin?.classList.add('active');
      tabBtnSignup?.classList.remove('active');
    } else if (targetForm === signupForm) {
      tabBtnLogin?.classList.remove('active');
      tabBtnSignup?.classList.add('active');
    } else {
      tabBtnLogin?.classList.remove('active');
      tabBtnSignup?.classList.remove('active');
    }
  }

  tabBtnLogin?.addEventListener('click', (e) => {
    e.preventDefault();
    switchView(loginForm);
  });

  tabBtnSignup?.addEventListener('click', (e) => {
    e.preventDefault();
    switchView(signupForm);
  });

  showSignupBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    switchView(signupForm);
  });

  showLoginBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    switchView(loginForm);
  });

  showLoginFromConfirmBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    switchView(loginForm);
  });

  // Submit Login
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-login') || loginForm.querySelector('button[type="submit"]');
    const err = document.getElementById('login-error');
    
    if (btn) btn.disabled = true;
    const originalBtnHTML = btn ? btn.innerHTML : '';
    if (btn) {
      btn.innerHTML = `<span>Entrando na plataforma...</span>`;
    }
    if (err) {
      err.textContent = '';
      err.classList.remove('visible');
    }
    
    try {
      const email = document.getElementById('login-email').value.trim();
      const pass = document.getElementById('login-password').value;
      
      await auth.login(email, pass);
      hideLoginScreen();
      showApp();
      updateProfileUI();
      
      // Garante que todos os componentes e botões (+, Add New, etc) estão ativos
      initAppComponents();
      
      // Carrega dados da aplicação ou cria carteira padrão no primeiro acesso
      await loadAppData();
      showToast(`Bem-vindo, ${auth.getUser()?.name || 'investidor'}!`, 'success');
    } catch (error) {
      if (err) {
        err.textContent = error.message;
        err.classList.add('visible');
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalBtnHTML;
      }
    }
  });

  // Submit Signup
  signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-signup') || signupForm.querySelector('button[type="submit"]');
    const err = document.getElementById('signup-error');
    
    if (btn) btn.disabled = true;
    const originalBtnHTML = btn ? btn.innerHTML : '';
    if (btn) {
      btn.innerHTML = `<span>Criando sua conta...</span>`;
    }
    if (err) {
      err.textContent = '';
      err.classList.remove('visible');
    }
    
    try {
      const name = document.getElementById('signup-name').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const pass = document.getElementById('signup-password').value;
      await auth.signup(email, pass, name);
      
      const emailDisplay = document.getElementById('confirm-email-display');
      if (emailDisplay) emailDisplay.textContent = email;
      switchView(confirmForm);
      showToast('Conta criada! Insira o código enviado por email.', 'success');
    } catch (error) {
      if (err) {
        err.textContent = error.message;
        err.classList.add('visible');
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalBtnHTML;
      }
    }
  });

  // Submit Confirm
  confirmForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-confirm') || confirmForm.querySelector('button[type="submit"]');
    const err = document.getElementById('confirm-error');
    
    if (btn) btn.disabled = true;
    const originalBtnHTML = btn ? btn.innerHTML : '';
    if (btn) {
      btn.innerHTML = `<span>Validando código...</span>`;
    }
    if (err) {
      err.textContent = '';
      err.classList.remove('visible');
    }
    
    try {
      const email = document.getElementById('confirm-email-display').textContent;
      const code = document.getElementById('confirm-code').value.trim();
      await auth.confirmSignup(email, code);
      switchView(loginForm);
      showToast('Email confirmado com sucesso! Faça login para entrar.', 'success');
    } catch (error) {
      if (err) {
        err.textContent = error.message;
        err.classList.add('visible');
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalBtnHTML;
      }
    }
  });

  document.getElementById('btn-logout')?.addEventListener('click', () => {
    auth.logout();
  });

  window.addEventListener('auth_logout', () => {
    hideApp();
    showLoginScreen();
  });
}

function updateProfileUI() {
  const user = auth.getUser();
  if (!user) return;
  const nameEl = document.getElementById('user-name');
  const emailEl = document.getElementById('user-email');
  const avatarEl = document.getElementById('profile-avatar');

  if (nameEl) nameEl.textContent = user.name;
  if (emailEl) emailEl.textContent = user.email;
  if (avatarEl) {
    const initials = (user.name || 'U').split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase();
    avatarEl.textContent = initials || 'NF';
  }
}

function showLoginScreen() {
  const screen = document.getElementById('login-screen');
  if (screen) screen.classList.remove('hidden');
}

function hideLoginScreen() {
  const screen = document.getElementById('login-screen');
  if (screen) screen.classList.add('hidden');
}

function showApp() {
  const frame = document.querySelector('.dribbble-frame');
  if (frame) frame.style.display = '';
}

function hideApp() {
  const frame = document.querySelector('.dribbble-frame');
  if (frame) frame.style.display = 'none';
}

/**
 * Cria a carteira inicial equilibrada para usuários no primeiro acesso
 */
async function createDefaultStarterPortfolio() {
  const starter = {
    name: 'Carteira Principal',
    funds: [
      {
        id: `b3_bova11_${Date.now()}`,
        type: 'b3',
        name: 'iShares Ibovespa (BOVA11)',
        code: 'BOVA11',
        cnpj: '',
        target_pct: 50.0,
        min_investment: 150.0,
        color: PALETTE.funds[0] || '#2E7D5B'
      },
      {
        id: `b3_ivvb11_${Date.now() + 1}`,
        type: 'b3',
        name: 'iShares S&P 500 (IVVB11)',
        code: 'IVVB11',
        cnpj: '',
        target_pct: 50.0,
        min_investment: 350.0,
        color: PALETTE.funds[1] || '#3B6978'
      }
    ]
  };

  try {
    const res = await api.createPortfolio(starter);
    return res;
  } catch (err) {
    console.error('Falha ao criar carteira padrão inicial:', err);
    return null;
  }
}

async function loadAppData() {
  try {
    let pData = await api.fetchPortfolios();
    let portfolios = pData.portfolios || [];

    // Cenário: Primeiro acesso (0 carteiras cadastradas)
    if (portfolios.length === 0) {
      console.log('[nodefund] Primeiro acesso detectado: criando carteira padrão inicial...');
      const created = await createDefaultStarterPortfolio();
      
      if (created && created.portfolio) {
        state.portfolio = created.portfolio;
        state.portfolios = created.portfolios || [created.portfolio];
        state.activePortfolioId = created.portfolio.id;
        
        showToast('Bem-vindo! Criamos sua carteira inicial com BOVA11 e IVVB11.', 'success');
        
        // Abre o modal de criação para o usuário explorar templates e personalização
        setTimeout(() => {
          openCreatePortfolioModal();
        }, 500);
      } else {
        // Fallback gracioso caso a criação automática falhe
        state.portfolios = [];
        state.portfolio = null;
        renderDashboardViews();
        openCreatePortfolioModal();
        showToast('Crie sua primeira carteira para iniciar a simulação!', 'info');
        return;
      }
    } else {
      state.portfolios = portfolios;
      state.activePortfolioId = pData.active_portfolio_id || portfolios[0].id;

      try {
        const activeData = await api.fetchActivePortfolio();
        state.portfolio = activeData;
        state.activePortfolioId = activeData.id;
      } catch (err) {
        state.portfolio = portfolios[0];
        state.activePortfolioId = portfolios[0].id;
      }
    }

    // Executa a simulação inicial caso haja carteira ativa
    if (state.portfolio) {
      try {
        const initialSim = await api.runSimulation({
          initial_capital: 20000,
          monthly_contribution: 2000,
          start_date: '2024-05-02',
          end_date: '2026-08-31',
          rebalance_mode: 'smart_inflow',
          portfolio: state.portfolio
        });
        state.simulationResult = initialSim;
      } catch (simErr) {
        console.warn('Simulação inicial retornou aviso:', simErr);
      }
    }

    renderDashboardViews();
    refreshMarketQuotes();
  } catch (err) {
    console.error('Erro ao carregar dados:', err);
    showToast(`Erro ao carregar dados: ${err.message}`, 'error');
  }
}

// Inicialização e Assinatura de Eventos Reativos
export async function bootstrap() {
  window.state = state;
  try {
    initLoginScreen();
    
    if (!auth.isAuthenticated()) {
      hideApp();
      showLoginScreen();
      return;
    }

    hideLoginScreen();
    showApp();
    updateProfileUI();

    // 1. Inicializar Handlers e Listeners de Todos os Componentes
    initAppComponents();

    // 2. Carregar Lista de Carteiras, Simulação e Atualizar UI
    await loadAppData();

  } catch (err) {
    console.error('Erro na inicialização da aplicação:', err);
    showToast(`Erro ao inicializar: ${err.message}`, 'error');
  }
}

let isSyncingHistoricalData = false;

/**
 * Coleta cotações em segundo plano e notifica quando estiverem prontas
 */
export async function triggerBackgroundDataSync(portfolio) {
  if (isSyncingHistoricalData) return;
  if (!portfolio || !portfolio.funds || portfolio.funds.length === 0) return;

  isSyncingHistoricalData = true;
  const indicator = document.getElementById('bg-sync-indicator');
  if (indicator) indicator.classList.add('active');

  showToast('Sincronizando cotações históricas em segundo plano...', 'info');

  try {
    const startDate = document.getElementById('input-start-date')?.value || '2024-05-02';
    const endDate = document.getElementById('input-end-date')?.value || '2026-08-31';

    await api.updateData({
      funds: portfolio.funds,
      start_date: startDate,
      end_date: endDate,
      mode: 'incremental'
    });

    showToast('Cotações históricas disponíveis! Simulação atualizada.', 'success');
    await runCurrentSimulation(true);
  } catch (err) {
    console.warn('Sincronização em segundo plano:', err);
    showToast(`Aviso: não foi possível carregar o histórico de todos os ativos (${err.message})`, 'warning');
  } finally {
    isSyncingHistoricalData = false;
    if (indicator) indicator.classList.remove('active');
  }
}

window.triggerBackgroundDataSync = triggerBackgroundDataSync;

async function runCurrentSimulation(isRetryAfterSync = false) {
  if (!state.portfolio) return;
  try {
    const data = await api.runSimulation({
      initial_capital: parseFloat(document.getElementById('input-initial-capital')?.value) || 20000,
      monthly_contribution: parseFloat(document.getElementById('input-monthly-contribution')?.value) || 2000,
      start_date: document.getElementById('input-start-date')?.value || '2024-05-02',
      end_date: document.getElementById('input-end-date')?.value || '2026-08-31',
      rebalance_mode: document.getElementById('input-rebalance-mode')?.value || 'smart_inflow',
      portfolio: state.portfolio
    });

    state.simulationResult = data;
    renderDashboardViews();
  } catch (err) {
    if (err.message && err.message.includes('Dados históricos insuficientes') && !isRetryAfterSync) {
      console.log('[nodefund] Dados históricos insuficientes. Disparando sincronização em segundo plano...');
      triggerBackgroundDataSync(state.portfolio);
    } else {
      showToast(err.message, 'error');
    }
  }
}

// Inicialização no DOM Ready
window.addEventListener('DOMContentLoaded', async () => {
  try {
    await auth.getIdToken();
  } catch (e) {}
  bootstrap();
});
