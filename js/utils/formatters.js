/**
 * PrevInvest - Formatters & Utilities
 */

export { PALETTE, COLORS, PASTEL_PALETTE, VIBRANT_PALETTE, getSubtleAuxiliaryColor } from '../constants/colors.js';

export function formatBRL(val) {
  if (val === null || val === undefined || isNaN(val)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

export function formatUSD(val) {
  if (val === null || val === undefined || isNaN(val)) return 'US$ 0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

export function formatMoney(val, curr = 'brl') {
  if (curr === 'usd') return formatUSD(val);
  return formatBRL(val);
}

export function formatPct(val) {
  if (val === null || val === undefined || isNaN(val)) return '0,00%';
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(2).replace('.', ',')}%`;
}

export function normalizeReturnPct(rawVal, baseVal) {
  if (rawVal === null || rawVal === undefined || isNaN(rawVal)) return null;
  if (rawVal === baseVal) return 0.0;
  const baseFactor = 1.0 + (baseVal || 0.0) / 100.0;
  if (Math.abs(baseFactor) < 1e-9) return 0.0;
  const rawFactor = 1.0 + rawVal / 100.0;
  return ((rawFactor / baseFactor) - 1.0) * 100.0;
}

export function getAssetKey(asset) {
  if (!asset) return '';
  if (asset.type === 'b3') {
    return (asset.code || asset.id || '').toUpperCase().trim();
  }
  const clean = (asset.cnpj || asset.code || '').replace(/\D/g, '');
  if (clean) return clean;
  return (asset.code || asset.id || '').toUpperCase().trim();
}

export function getAssetCodeDisplay(asset) {
  if (!asset) return '';
  if (asset.type === 'b3') {
    return (asset.code || asset.id || '').toUpperCase().trim();
  }
  return asset.cnpj || asset.code || '';
}

export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
