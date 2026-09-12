/**
 * PrevInvest - TopBar Component
 * Gerencia a navegação superior (Dashboard, Rebalancear, Configuração Carteira),
 * atalhos, botão flutuante Voltar ao Topo e comportamento das abas globais.
 */

import { state } from '../state.js';
import { openCreatePortfolioModal } from './create-portfolio-modal.js';

export function initTopBar() {
  const topTabs = document.querySelectorAll('.top-nav-tab[data-tab]');
  const btnAddNew = document.getElementById('btn-top-add-new');
  const btnSettings = document.getElementById('btn-top-settings');
  const backToTopBtn = document.getElementById('btn-back-to-top');
  const contentArea = document.querySelector('.dribbble-content');

  topTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-tab');
      if (!target) return;
      switchTab(target);
    });
  });

  if (btnAddNew) {
    btnAddNew.addEventListener('click', () => {
      openCreatePortfolioModal();
    });
  }

  if (btnSettings) {
    btnSettings.addEventListener('click', () => {
      const modal = document.getElementById('params-modal');
      if (modal) modal.classList.add('open');
    });
  }

  // Sincronizar navegação das abas da sidebar
  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');
      if (!target) return;
      switchTab(target);
    });
  });

  // Clicar na marca nodefund volta ao Dashboard
  const brandHeader = document.querySelector('.brand-header');
  if (brandHeader) {
    brandHeader.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab('tab-simulation');
    });
  }

  // Botão Flutuante Voltar ao Topo
  if (backToTopBtn) {
    const handleScroll = () => {
      const scrollY = contentArea ? contentArea.scrollTop : (window.scrollY || document.documentElement.scrollTop);
      if (scrollY > 220) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    };

    if (contentArea) contentArea.addEventListener('scroll', handleScroll);
    window.addEventListener('scroll', handleScroll);

    backToTopBtn.addEventListener('click', () => {
      if (contentArea && contentArea.scrollTop > 0) {
        contentArea.scrollTo({ top: 0, behavior: 'smooth' });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

export function switchTab(tabId) {
  if (window.closeSidebarDrawer) {
    window.closeSidebarDrawer();
  }
  const isGlobalTab = (tabId === 'tab-data' || tabId === 'tab-sources');
  const topNavTabs = document.querySelector('.top-nav-tabs');

  // Atualiza atmosfera e transição de cores de fundo da janela de desktop
  const frame = document.querySelector('.dribbble-frame');
  if (frame) {
    frame.setAttribute('data-active-tab', tabId);
  }

  // Oculta abas específicas de carteira no topo ao navegar para seções globais
  if (topNavTabs) {
    topNavTabs.style.display = isGlobalTab ? 'none' : 'flex';
  }

  // Desseleciona carteiras na barra lateral se estiver numa aba global
  if (isGlobalTab) {
    document.querySelectorAll('.sidebar-portfolio-item, .portfolio-item-bullet').forEach(el => {
      el.classList.remove('active');
    });
  } else {
    // Restaura destaque da carteira ativa na barra lateral
    document.querySelectorAll('.sidebar-portfolio-item').forEach(item => {
      const pId = item.getAttribute('data-portfolio-id');
      const isAct = Boolean(pId && state.activePortfolioId && pId === state.activePortfolioId);
      item.classList.toggle('active', isAct);
      const bullet = item.querySelector('.portfolio-item-bullet');
      if (bullet) bullet.classList.toggle('active', isAct);
    });
  }

  // Atualiza classes ativas nas abas do topo
  document.querySelectorAll('.top-nav-tab').forEach(t => {
    if (t.getAttribute('data-tab') === tabId) {
      t.classList.add('active');
    } else {
      t.classList.remove('active');
    }
  });

  // Atualiza classes ativas nos itens da sidebar
  document.querySelectorAll('.tab-btn').forEach(b => {
    if (b.getAttribute('data-tab') === tabId) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });

  // Exibe o conteúdo da aba selecionada e oculta rigorosamente todas as outras
  document.querySelectorAll('.tab-content').forEach(c => {
    c.classList.remove('active');
    c.style.display = 'none';
  });
  const content = document.getElementById(tabId);
  if (content) {
    content.classList.add('active');
    content.style.display = 'block';
  }

  // Oculta o cabeçalho Hero Expenses Report nas abas que não sejam o Dashboard
  const heroHeader = document.querySelector('.hero-report-header');
  if (heroHeader) {
    heroHeader.style.display = (tabId === 'tab-simulation') ? 'block' : 'none';
  }

  // Eventos de carga específica para abas
  if (tabId === 'tab-calculator') {
    const event = new CustomEvent('tab_calculator_activated');
    window.dispatchEvent(event);
  } else if (tabId === 'tab-portfolio') {
    const event = new CustomEvent('tab_portfolio_activated');
    window.dispatchEvent(event);
  } else if (tabId === 'tab-data') {
    const event = new CustomEvent('tab_data_activated');
    window.dispatchEvent(event);
  } else if (tabId === 'tab-sources') {
    const event = new CustomEvent('tab_sources_activated');
    window.dispatchEvent(event);
  }
}

