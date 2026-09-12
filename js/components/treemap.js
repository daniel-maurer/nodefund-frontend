/**
 * PrevInvest - Treemap Component (Distribuição da Carteira)
 * Algoritmo Squarified Treemap (Bruls, Huizing, van Wijk) que garante proporção bidimensional
 * exata de área para cada ativo da carteira, com as cores oficiais de cada fundo e tipografia responsiva.
 */

import { state } from '../state.js';
import { formatMoney, PALETTE } from '../utils/formatters.js';

function getFundColor(item, idx) {
  // 1. Explicit item color if provided and not default blue
  if (item.color && item.color !== '#3b82f6' && item.color !== '#2563eb') {
    return item.color;
  }
  // 2. Search in active portfolio funds or simulation funds
  const funds = state.activePortfolio?.funds || state.simulationResult?.funds || [];
  const itemKey = item.key || item.name || '';
  const itemCode = (item.code || '').replace(/\D/g, '');
  const found = funds.find(f => {
    const fKey = f.name || f.clean_name || '';
    const fCode = (f.cnpj || f.code || '').replace(/\D/g, '');
    return (fKey && (fKey === itemKey || fKey === item.name)) ||
           (fCode && (fCode === itemCode || fCode === itemKey.replace(/\D/g, '')));
  });
  if (found && found.color) return found.color;
  if (item.color) return item.color;
  return PALETTE.funds[idx % PALETTE.funds.length];
}

function getContrastColor(hex) {
  if (!hex || typeof hex !== 'string') return '#FFFFFF';
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  if (c.length !== 6) return '#FFFFFF';
  const r = parseInt(c.substr(0, 2), 16);
  const g = parseInt(c.substr(2, 2), 16);
  const b = parseInt(c.substr(4, 2), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 175 ? '#0F172A' : '#FFFFFF';
}

/**
 * Algoritmo Squarified Treemap para calcular coordenadas 2D (x, y, w, h)
 * cujas áreas são estritamente proporcionais aos valores percentuais dos ativos.
 */
function computeSquarifiedTreemap(items, width, height) {
  const data = items.map((item, idx) => ({
    rawItem: item,
    idx,
    val: Math.max(0.1, item.effective_pct || item.current_pct || 1)
  })).sort((a, b) => b.val - a.val);

  const totalVal = data.reduce((s, d) => s + d.val, 0);
  if (totalVal <= 0 || width <= 0 || height <= 0) return [];

  const totalArea = width * height;
  data.forEach(d => {
    d.area = (d.val / totalVal) * totalArea;
  });

  const rects = [];
  squarify(data, [], { x: 0, y: 0, w: width, h: height }, rects);
  return rects;

  function worst(row, w) {
    if (row.length === 0) return Infinity;
    let maxArea = -Infinity, minArea = Infinity, sum = 0;
    for (const d of row) {
      sum += d.area;
      if (d.area > maxArea) maxArea = d.area;
      if (d.area < minArea) minArea = d.area;
    }
    const w2 = w * w;
    const sum2 = sum * sum;
    return Math.max((w2 * maxArea) / sum2, sum2 / (w2 * minArea));
  }

  function squarify(children, row, container, out) {
    if (children.length === 0) {
      layoutRow(row, container, out);
      return;
    }
    const c = children[0];
    const shorterSide = Math.min(container.w, container.h);
    if (row.length === 0) {
      squarify(children.slice(1), [c], container, out);
      return;
    }
    const currentWorst = worst(row, shorterSide);
    const nextWorst = worst(row.concat([c]), shorterSide);
    if (currentWorst >= nextWorst) {
      squarify(children.slice(1), row.concat([c]), container, out);
    } else {
      const newContainer = layoutRow(row, container, out);
      squarify(children, [], newContainer, out);
    }
  }

  function layoutRow(row, container, out) {
    const isHorizontal = container.w >= container.h;
    const sumArea = row.reduce((s, d) => s + d.area, 0);
    if (isHorizontal) {
      const rowWidth = container.h > 0 ? (sumArea / container.h) : 0;
      let currentY = container.y;
      row.forEach(d => {
        const itemHeight = rowWidth > 0 ? (d.area / rowWidth) : 0;
        out.push({
          item: d.rawItem,
          idx: d.idx,
          x: container.x,
          y: currentY,
          w: rowWidth,
          h: itemHeight
        });
        currentY += itemHeight;
      });
      return {
        x: container.x + rowWidth,
        y: container.y,
        w: Math.max(0, container.w - rowWidth),
        h: container.h
      };
    } else {
      const rowHeight = container.w > 0 ? (sumArea / container.w) : 0;
      let currentX = container.x;
      row.forEach(d => {
        const itemWidth = rowHeight > 0 ? (d.area / rowHeight) : 0;
        out.push({
          item: d.rawItem,
          idx: d.idx,
          x: currentX,
          y: container.y,
          w: itemWidth,
          h: rowHeight
        });
        currentX += itemWidth;
      });
      return {
        x: container.x,
        y: container.y + rowHeight,
        w: container.w,
        h: Math.max(0, container.h - rowHeight)
      };
    }
  }
}

let resizeHandlerAttached = false;

export function renderTreemap() {
  const container = document.getElementById('treemap-container');
  const sim = state.simulationResult;
  if (!container) return;

  const treemapData = (sim && sim.treemap_distribution) ? sim.treemap_distribution : [];

  if (treemapData.length === 0) {
    container.innerHTML = '<div style="color: var(--charcoal-muted); font-size: 0.85rem; padding: 40px; text-align: center; width: 100%;">Execute a simulação para visualizar a distribuição da carteira.</div>';
    return;
  }

  if (!resizeHandlerAttached) {
    resizeHandlerAttached = true;
    window.addEventListener('resize', () => {
      if (state.simulationResult?.treemap_distribution) {
        renderTreemap();
      }
    });
  }

  container.innerHTML = '';
  const isUSD = state.activeCurrency === 'usd';

  const totalW = container.clientWidth || container.getBoundingClientRect().width || 900;
  const totalH = Math.max(280, Math.min(Math.round(totalW * 0.38), 350));
  const gap = 8;

  container.style.position = 'relative';
  container.style.width = '100%';
  container.style.height = `${totalH}px`;
  container.style.minHeight = `${totalH}px`;

  const rects = computeSquarifiedTreemap(treemapData, totalW, totalH);

  rects.forEach(r => {
    const item = r.item;
    const fundColor = getFundColor(item, r.idx);
    const textColor = getContrastColor(fundColor);
    const isLightText = textColor === '#FFFFFF';

    const subColor = isLightText ? 'rgba(255, 255, 255, 0.78)' : 'rgba(15, 23, 42, 0.65)';
    const badgeBg = isLightText ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.08)';
    const badgeBorder = isLightText ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid rgba(0, 0, 0, 0.12)';
    const cardBorder = isLightText ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.08)';

    const node = document.createElement('div');
    node.className = 'treemap-node';
    node.title = item.name;

    node.style.position = 'absolute';
    node.style.left = `${Math.round(r.x)}px`;
    node.style.top = `${Math.round(r.y)}px`;
    node.style.width = `${Math.max(0, Math.round(r.w - gap))}px`;
    node.style.height = `${Math.max(0, Math.round(r.h - gap))}px`;
    node.style.boxSizing = 'border-box';

    node.style.background = `linear-gradient(145deg, ${fundColor} 0%, ${fundColor}E6 100%)`;
    node.style.border = cardBorder;
    node.style.color = textColor;
    node.style.borderRadius = '16px';
    node.style.padding = (r.h < 170) ? '10px 12px' : '14px 16px';
    node.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.06)';
    node.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease';
    node.style.display = 'flex';
    node.style.flexDirection = 'column';
    node.style.justifyContent = 'space-between';
    node.style.overflow = 'hidden';

    node.addEventListener('mouseenter', () => {
      node.style.boxShadow = '0 8px 22px rgba(0, 0, 0, 0.14)';
      node.style.zIndex = '5';
    });
    node.addEventListener('mouseleave', () => {
      node.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.06)';
      node.style.zIndex = '1';
    });

    const pct = item.effective_pct || item.current_pct || 0;
    const dev = item.dev_pct !== undefined ? item.dev_pct : (pct - (item.target_pct || 0));
    const devSign = dev >= 0 ? '+' : '';
    const balance = isUSD ? formatMoney(item.current_balance_usd || item.balance_usd, 'usd') : formatMoney(item.current_balance || item.balance_brl, 'brl');

    const isSmallH = r.h < 170;
    const isNarrow = r.w < 210;
    const titleSize = (isSmallH || isNarrow) ? '0.78rem' : '0.86rem';
    const valSize = (r.w > 300 && r.h > 220) ? '1.5rem' : ((isSmallH || isNarrow) ? '1.2rem' : '1.35rem');

    node.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 6px;">
        <div style="min-width: 0; flex: 1;">
          <div style="font-weight: 700; font-size: ${titleSize}; line-height: 1.2; color: ${textColor}; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">${item.name}</div>
          <div style="font-size: 0.68rem; color: ${subColor}; margin-top: 2px; font-weight: 500;">${item.code || item.key}</div>
        </div>
        <span style="font-size: 0.70rem; font-weight: 700; padding: 2px 6px; border-radius: 9999px; background: ${badgeBg}; color: ${textColor}; border: ${badgeBorder}; backdrop-filter: blur(4px); white-space: nowrap; flex-shrink: 0;">
          ${devSign}${dev.toFixed(1)}%
        </span>
      </div>
      <div style="margin-top: ${isSmallH ? '4px' : '10px'}; display: flex; justify-content: space-between; align-items: flex-end; gap: 6px;">
        <div>
          <div style="font-size: ${valSize}; font-weight: 800; color: ${textColor}; line-height: 1.05;">${pct.toFixed(1)}%</div>
          <div style="font-size: 0.68rem; color: ${subColor}; margin-top: 2px; font-weight: 500;">Meta: ${(item.target_pct || 0).toFixed(1)}%</div>
        </div>
        <div style="font-weight: 800; font-size: ${(isSmallH || isNarrow) ? '0.82rem' : '0.95rem'}; color: ${textColor}; white-space: nowrap;">${balance}</div>
      </div>
    `;

    container.appendChild(node);
  });
}
