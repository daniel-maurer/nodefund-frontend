/**
 * PrevInvest - Custom Vibrant & Auxiliary Color Picker Modal Component
 * Modal dedicado com opções de cores vibrantes combinadas com tons auxiliares sutis,
 * permitindo total harmonia visual entre gráficos, treemap e cartões de rentabilidade.
 */

import { VIBRANT_PALETTE, getSubtleAuxiliaryColor } from '../constants/colors.js';

let activeCallback = null;
let currentHex = '#2563EB';
let currentAuxHex = '#EBF3FF';

export function initColorPickerModal() {
  const modal = document.getElementById('color-picker-modal');
  const btnClose = document.getElementById('btn-close-color-picker');
  const btnApply = document.getElementById('btn-apply-color');
  const hexInput = document.getElementById('color-picker-hex-input');

  const closeModal = () => {
    if (modal) modal.classList.remove('open');
    activeCallback = null;
  };

  if (btnClose) btnClose.addEventListener('click', closeModal);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  if (hexInput) {
    hexInput.addEventListener('input', (e) => {
      let val = e.target.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        updateActiveColor(val);
      }
    });
  }

  if (btnApply) {
    btnApply.addEventListener('click', () => {
      if (activeCallback) {
        activeCallback(currentHex, currentAuxHex);
      }
      closeModal();
    });
  }

  renderVibrantGrid();
}

function updateActiveColor(hex, auxHex = null) {
  currentHex = hex.toUpperCase();
  const found = VIBRANT_PALETTE.find(p => p.hex.toUpperCase() === currentHex);
  currentAuxHex = (auxHex || (found ? found.aux : getSubtleAuxiliaryColor(currentHex))).toUpperCase();

  const previewBox = document.getElementById('color-picker-preview-box');
  const previewCircle = document.getElementById('color-picker-preview-circle');
  const hexInput = document.getElementById('color-picker-hex-input');
  const nameLabel = document.getElementById('color-picker-name-label');
  const auxPill = document.getElementById('color-picker-aux-pill');

  if (previewCircle) previewCircle.style.backgroundColor = currentHex;
  if (previewBox) previewBox.style.backgroundColor = currentAuxHex;
  if (hexInput && hexInput.value !== currentHex) hexInput.value = currentHex;
  if (auxPill) auxPill.innerText = currentAuxHex;

  if (nameLabel) {
    nameLabel.innerText = found ? `${found.name} (${found.group})` : 'Cor Customizada';
  }

  document.querySelectorAll('.color-swatch-item').forEach(el => {
    const swHex = el.getAttribute('data-hex');
    if (swHex && swHex.toUpperCase() === currentHex) {
      el.classList.add('selected');
    } else {
      el.classList.remove('selected');
    }
  });
}

function renderVibrantGrid() {
  const container = document.getElementById('color-picker-grid');
  if (!container) return;

  container.innerHTML = '';

  VIBRANT_PALETTE.forEach(item => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'color-swatch-item';
    btn.setAttribute('data-hex', item.hex);
    btn.setAttribute('data-aux', item.aux);
    btn.title = `${item.name} (${item.hex} / Fundo: ${item.aux})`;
    btn.style.backgroundColor = item.aux;
    btn.innerHTML = `<span class="swatch-inner-dot" style="background-color: ${item.hex};"></span>`;

    btn.addEventListener('click', () => {
      updateActiveColor(item.hex, item.aux);
      if (activeCallback) {
        activeCallback(item.hex, item.aux);
      }
      const modal = document.getElementById('color-picker-modal');
      if (modal) modal.classList.remove('open');
    });

    container.appendChild(btn);
  });
}

/**
 * Abre o Color Picker com a cor atual e callback para quando uma cor for escolhida.
 */
export function openColorPicker(colorHex, onSelect, colorAuxHex = null) {
  const modal = document.getElementById('color-picker-modal');
  if (!modal) return;

  activeCallback = onSelect;
  updateActiveColor(colorHex || '#2563EB', colorAuxHex);
  modal.classList.add('open');
}

