/**
 * PrevInvest - Sources & Benchmarks Configuration Component
 */

import { api } from '../services/api.js';
import { showToast } from '../utils/formatters.js';
import { openColorPicker } from './color-picker-modal.js';

export function initSourcesConfig() {
  const btnSaveBm = document.getElementById('btn-save-benchmarks');
  const btnAddBm = document.getElementById('btn-add-benchmark');
  const btnSaveSrc = document.getElementById('btn-save-sources');

  if (btnSaveBm) btnSaveBm.addEventListener('click', saveBenchmarks);
  if (btnAddBm) btnAddBm.addEventListener('click', addBenchmarkRow);
  if (btnSaveSrc) btnSaveSrc.addEventListener('click', saveSourcesConfig);

  window.addEventListener('tab_sources_activated', () => {
    loadSourcesConfig();
    loadBenchmarksConfig();
  });
}

let sourcesData = {};
let benchmarksList = [];

export async function loadSourcesConfig() {
  try {
    sourcesData = await api.fetchSources();
    renderSourcesCards();
  } catch (err) {
    console.error('Erro ao carregar fontes de dados:', err);
  }
}

function renderSourcesCards() {
  const container = document.getElementById('sources-cards-grid');
  if (!container) return;
  container.innerHTML = '';

  const entries = Object.entries(sourcesData || {});
  if (entries.length === 0) {
    container.innerHTML = '<div style="font-size: 0.85rem; color: var(--charcoal-muted); padding: 12px;">Nenhuma fonte configurada.</div>';
    return;
  }

  entries.forEach(([key, src]) => {
    const card = document.createElement('div');
    card.className = 'source-card-box';

    card.innerHTML = `
      <div class="source-card-header">
        <span class="source-card-title">${src.name || key}</span>
        <span class="source-card-badge">${(src.id || key).toUpperCase()}</span>
      </div>
      <div class="source-card-desc">${src.description || 'Provedor de dados de mercado.'}</div>
      <div style="margin-top: 6px;">
        <label class="source-card-input-label">URL Template / Endpoint</label>
        <input type="text" class="form-input-clean input-source-url" value="${src.url_template || ''}" style="font-size: 0.76rem; font-family: monospace;" data-key="${key}">
      </div>
      ${src.ticker_suffix ? `
        <div style="display: flex; gap: 8px; align-items: center; font-size: 0.72rem; color: var(--charcoal-muted); margin-top: 4px;">
          <span>Sufixo Ticker B3: <code>${src.ticker_suffix}</code></span>
        </div>
      ` : ''}
      ${src.encoding ? `
        <div style="display: flex; gap: 8px; align-items: center; font-size: 0.72rem; color: var(--charcoal-muted); margin-top: 4px;">
          <span>Encoding: <code>${src.encoding}</code></span>
          <span>Delimitador: <code>${src.delimiter || ';'}</code></span>
        </div>
      ` : ''}
    `;

    const urlInput = card.querySelector('.input-source-url');
    if (urlInput) {
      urlInput.addEventListener('input', (e) => {
        if (sourcesData[key]) {
          sourcesData[key].url_template = e.target.value.trim();
        }
      });
    }

    container.appendChild(card);
  });
}

async function saveSourcesConfig() {
  try {
    await api.saveSources(sourcesData);
    showToast('Configurações de APIs e fontes salvas com sucesso!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

export async function loadBenchmarksConfig() {
  try {
    const data = await api.fetchBenchmarks();
    benchmarksList = Array.isArray(data) ? data : (data.benchmarks || []);
    renderBenchmarksTable();
  } catch (err) {
    console.error('Erro ao carregar benchmarks:', err);
  }
}

function renderBenchmarksTable() {
  const tbody = document.getElementById('benchmarks-config-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  benchmarksList.forEach((b, idx) => {
    const tr = document.createElement('tr');

    // Checkbox Habilitado
    const tdEnabled = document.createElement('td');
    tdEnabled.style.textAlign = 'center';
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = b.enabled !== false;
    chk.addEventListener('change', () => { b.enabled = chk.checked; });
    tdEnabled.appendChild(chk);

    // Cor (com seletor pastel)
    const tdColor = document.createElement('td');
    const colorBtn = document.createElement('button');
    colorBtn.type = 'button';
    colorBtn.className = 'fund-color-swatch-btn';
    colorBtn.style.backgroundColor = b.color || '#94a3b8';
    colorBtn.title = 'Escolher cor pastel';
    colorBtn.addEventListener('click', () => {
      openColorPicker(b.color || '#94a3b8', (newHex) => {
        b.color = newHex;
        colorBtn.style.backgroundColor = newHex;
      });
    });
    tdColor.appendChild(colorBtn);

    // ID
    const tdId = document.createElement('td');
    tdId.innerHTML = `<code>${b.id}</code>`;

    // Nome
    const tdName = document.createElement('td');
    const inputName = document.createElement('input');
    inputName.type = 'text';
    inputName.className = 'form-input-clean';
    inputName.value = b.name || '';
    inputName.addEventListener('input', () => { b.name = inputName.value; });
    tdName.appendChild(inputName);

    // Fonte
    const tdSource = document.createElement('td');
    tdSource.innerText = b.source || 'Oficial';

    // Código/Ticker
    const tdCode = document.createElement('td');
    tdCode.innerHTML = `<code>${b.code || b.ticker || '--'}</code>`;

    // Unidade
    const tdUnit = document.createElement('td');
    tdUnit.innerText = b.unit || '% a.m.';

    // Ações
    const tdActions = document.createElement('td');
    tdActions.style.textAlign = 'center';
    const btnDel = document.createElement('button');
    btnDel.className = 'icon-btn-ghost';
    btnDel.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
    btnDel.style.color = '#DC2626';
    btnDel.title = 'Excluir benchmark';
    btnDel.addEventListener('click', () => {
      benchmarksList.splice(idx, 1);
      renderBenchmarksTable();
    });
    tdActions.appendChild(btnDel);

    tr.appendChild(tdEnabled);
    tr.appendChild(tdColor);
    tr.appendChild(tdId);
    tr.appendChild(tdName);
    tr.appendChild(tdSource);
    tr.appendChild(tdCode);
    tr.appendChild(tdUnit);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });
}

function addBenchmarkRow() {
  const id = prompt('ID do novo Benchmark (ex: ipca_plus):');
  if (!id) return;
  benchmarksList.push({
    id: id.trim().toLowerCase(),
    name: 'Novo Índice',
    source: 'bcb_sgs',
    code: '12',
    unit: '% a.m.',
    enabled: true,
    color: '#8FB8DE'
  });
  renderBenchmarksTable();
}

async function saveBenchmarks() {
  try {
    await api.saveBenchmarks(benchmarksList);
    showToast('Configurações de benchmarks salvas com sucesso!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

