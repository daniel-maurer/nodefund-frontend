/**
 * PrevInvest - Main Application Bootstrap (Modular ES Architecture)
 * Orquestra a inicialização e ciclo de vida reativo de todos os componentes da aplicação.
 */

import { state, subscribe, notify } from './state.js';
import { api } from './services/api.js';
import { showToast } from './utils/formatters.js';
import * as auth from './services/auth.js';

// Importação dos Componentes Modulares
import { initSidebar, renderSidebarPortfolios } from './components/sidebar.js';
import { initTopBar, switchTab } from './components/topbar.js';
import { initHeroKPIs, renderHeroKPIs } from './components/hero-kpis.js';
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
import { initCreatePortfolioModal } from './components/create-portfolio-modal.js';
import { initDeletePortfolioModal } from './components/delete-portfolio-modal.js';

// Função Central para Atualização de Todas as Views do Dashboard
export function renderDashboardViews() {
  renderHeroKPIs();
  renderBankCards();
  renderInvoices();
  updateChartVisibility();
  renderTreemap();
  renderCorrelationHeatmap();
  renderMonthlyTable();
  renderAssetCards();
  renderCalculatorBalances();
  renderPortfolioConfigTable();
  renderSidebarPortfolios();
}

function initLoginScreen() {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const confirmForm = document.getElementById('confirm-form');
  
  const showSignupBtn = document.getElementById('show-signup');
  const showLoginBtn = document.getElementById('show-login');
  const showLoginFromConfirmBtn = document.getElementById('show-login-from-confirm');

  function switchView(view) {
    [loginForm, signupForm, confirmForm].forEach(f => f.classList.remove('active'));
    view.classList.add('active');
  }

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

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = loginForm.querySelector('button');
    const err = document.getElementById('login-error');
    btn.disabled = true;
    err.textContent = '';
    
    try {
      const email = document.getElementById('login-email').value;
      const pass = document.getElementById('login-password').value;
      await auth.login(email, pass);
      hideLoginScreen();
      showApp();
      updateProfileUI();
      // Retrigger bootstrap flow safely
      await loadAppData();
    } catch (error) {
      err.textContent = error.message;
    } finally {
      btn.disabled = false;
    }
  });

  signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = signupForm.querySelector('button');
    const err = document.getElementById('signup-error');
    btn.disabled = true;
    err.textContent = '';
    
    try {
      const name = document.getElementById('signup-name').value;
      const email = document.getElementById('signup-email').value;
      const pass = document.getElementById('signup-password').value;
      await auth.signup(email, pass, name);
      document.getElementById('confirm-email-display').textContent = email;
      switchView(confirmForm);
    } catch (error) {
      err.textContent = error.message;
    } finally {
      btn.disabled = false;
    }
  });

  confirmForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = confirmForm.querySelector('button');
    const err = document.getElementById('confirm-error');
    btn.disabled = true;
    err.textContent = '';
    
    try {
      const email = document.getElementById('confirm-email-display').textContent;
      const code = document.getElementById('confirm-code').value;
      await auth.confirmSignup(email, code);
      switchView(loginForm);
      showToast('Conta criada com sucesso! Faça login.', 'success');
    } catch (error) {
      err.textContent = error.message;
    } finally {
      btn.disabled = false;
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
    const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    avatarEl.textContent = initials;
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

async function loadAppData() {
  try {
    const pData = await api.fetchPortfolios();
    state.portfolios = pData.portfolios || [];
    state.activePortfolioId = pData.active_portfolio_id;

    const activeData = await api.fetchActivePortfolio();
    state.portfolio = activeData;
    state.activePortfolioId = activeData.id;

    const initialSim = await api.runSimulation({
      initial_capital: 20000,
      monthly_contribution: 2000,
      start_date: '2024-05-02',
      end_date: '2026-08-31',
      rebalance_mode: 'smart_inflow',
      portfolio: state.portfolio
    });

    state.simulationResult = initialSim;
    renderDashboardViews();
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
    initTopBar();
    initSidebar();
    initHeroKPIs();
    initSalesChart();
    initInvoices();
    initMonthlyTable();
    initCalculator();
    initPortfolioConfig();
    initParamsModal();
    initCreatePortfolioModal();
    initDeletePortfolioModal();
    initDataStatus();
    initSourcesConfig();
    initColorPickerModal();
    switchTab('tab-simulation');

    // 2. Carregar Lista de Carteiras, Simulação e Atualizar UI
    await loadAppData();

    // 5. Configurar Assinatura de Eventos do Sistema
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

  } catch (err) {
    console.error('Erro na inicialização da aplicação:', err);
    showToast(`Erro ao inicializar: ${err.message}`, 'error');
  }
}

async function runCurrentSimulation() {
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
    showToast(err.message, 'error');
  }
}

// Inicialização no DOM Ready
window.addEventListener('DOMContentLoaded', async () => {
  // Restore auth state on page load
  try {
    await auth.getIdToken();
  } catch(e) {}
  bootstrap();
});
