/**
 * PrevInvest - Design Tokens & Color Palette
 * Paleta refinada e sóbria inspirada no dashboard Dribbble (QuickBooks CRM).
 * Elimina saturação excessiva/neons e harmoniza com as superfícies claras e neutras.
 */

export const PALETTE = {
  // 1. Paleta de Ativos & Fundos (Curadoria sofisticada para fácil distinção visual)
  funds: [
    '#2E7D5B', // Sage Forest (Verde sálvia profundo / neutro positivo)
    '#3B6978', // Slate Marine (Azul ardósia / petróleo elegante)
    '#B86B43', // Warm Terracotta (Terracota quente / areia)
    '#5D506E', // Heather Plum (Ameixa acinzentada / lavanda sóbria)
    '#A68032', // Warm Ochre (Ocre suave / dourado antigo)
    '#3D6F6B', // Muted Teal (Verde-azulado fosco)
    '#8C7AA9', // Dusty Lavender (Lavanda fosca)
    '#A65B62', // Soft Rosewood (Rosa queimado / argila)
    '#4F6D7A', // Dusty Denim (Jeans cinzento)
    '#7D6B58', // Warm Umber (Castanho neutro)
    '#4A7C59', // Olive Pine (Verde pinheiro)
    '#345E49'  // Deep Forest (Verde floresta escuro)
  ],

  // 2. Gráficos Principais (Rentabilidade, Depósito vs Total, Ganho de Capital)
  charts: {
    smart: '#2E7D5B',               // Rebalanceada (Sage Forest)
    smart_usd: '#3B6978',           // Rebalanceada em Dólar (Slate Marine)
    passive: '#8E95A5',             // Passiva (Ardósia neutro pontilhado)
    passive_usd: '#A0A3AA',         // Passiva em Dólar (Cinza médio pontilhado)
    deposits: '#38393D',           // Linha de Depósitos (Charcoal Dribbble)
    deposits_fill: 'rgba(56, 57, 61, 0.08)',
    equity_fill: 'rgba(46, 125, 91, 0.12)',
    gain_positive: '#2E7D5B',       // Mês positivo (Verde floresta nobre)
    gain_negative: '#C25953'        // Mês negativo (Terracota/crimson suave)
  },

  // 3. Benchmarks de Mercado
  benchmarks: {
    cdi: '#B86B43',       // Terracota
    ipca: '#3B6978',      // Slate Marine
    ibov: '#2E7D5B',      // Sage Forest
    sp500: '#5D506E',     // Heather Plum
    ifix: '#A68032',      // Warm Ochre
    btc: '#C88D48',       // Muted Amber
    usd: '#718096',       // Slate Gray
    poupanca: '#8E95A5'   // Neutral Gray
  }
};

// Aliases para retrocompatibilidade
export const COLORS = {
  smart: PALETTE.charts.smart,
  smart_usd: PALETTE.charts.smart_usd,
  passive: PALETTE.charts.passive,
  passive_usd: PALETTE.charts.passive_usd,
  cdi: PALETTE.benchmarks.cdi,
  ipca: PALETTE.benchmarks.ipca,
  ibov: PALETTE.benchmarks.ibov,
  sp500: PALETTE.benchmarks.sp500,
  ifix: PALETTE.benchmarks.ifix,
  btc: PALETTE.benchmarks.btc,
  usd: PALETTE.benchmarks.usd,
  poupanca: PALETTE.benchmarks.poupanca,
  funds: PALETTE.funds
};

/**
 * Calcula dinamicamente uma cor auxiliar sutil/pastel a partir de qualquer código hexadecimal,
 * misturando 88% de branco puro (#FFFFFF) com 12% da cor vibrante.
 */
export function getSubtleAuxiliaryColor(hex) {
  if (!hex || typeof hex !== 'string') return '#F4F6F8';
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length !== 6) return '#F4F6F8';

  const num = parseInt(clean, 16);
  if (isNaN(num)) return '#F4F6F8';

  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;

  const auxR = Math.round(255 * 0.88 + r * 0.12);
  const auxG = Math.round(255 * 0.88 + g * 0.12);
  const auxB = Math.round(255 * 0.88 + b * 0.12);

  const toHex = (n) => n.toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(auxR)}${toHex(auxG)}${toHex(auxB)}`;
}

// 4. Paleta Curada de Cores Vibrantes para Ativos com Cores Auxiliares Sutis Harmonizadas
export const VIBRANT_PALETTE = [
  // 1. Verdes
  { hex: '#059669', aux: '#E6F8F0', name: 'Esmeralda Nobre', group: 'Verdes' },
  { hex: '#16A34A', aux: '#EAF7EE', name: 'Verde Floresta', group: 'Verdes' },
  { hex: '#10B981', aux: '#E6F9F3', name: 'Menta Vibrante', group: 'Verdes' },
  { hex: '#2E7D5B', aux: '#E7F2EC', name: 'Verde Sálvia', group: 'Verdes' },

  // 2. Azuis
  { hex: '#2563EB', aux: '#EBF3FF', name: 'Azul Safira', group: 'Azuis' },
  { hex: '#1D4ED8', aux: '#E8EEFC', name: 'Azul Royal', group: 'Azuis' },
  { hex: '#0284C7', aux: '#E8F5FD', name: 'Azul Petróleo', group: 'Azuis' },
  { hex: '#3B6978', aux: '#EAF1F4', name: 'Slate Marine', group: 'Azuis' },

  // 3. Cianos & Teals
  { hex: '#0D9488', aux: '#E6F8F6', name: 'Teal Profundo', group: 'Cianos' },
  { hex: '#0891B2', aux: '#E7F6FA', name: 'Turquesa Marinho', group: 'Cianos' },
  { hex: '#06B6D4', aux: '#E6FAFD', name: 'Ciano Oceano', group: 'Cianos' },
  { hex: '#3D6F6B', aux: '#EBF2F1', name: 'Teal Fosco', group: 'Cianos' },

  // 4. Violetas & Roxos
  { hex: '#4F46E5', aux: '#EEF0FE', name: 'Índigo Elétrico', group: 'Violetas' },
  { hex: '#7C3AED', aux: '#F4EEFE', name: 'Violeta Nobre', group: 'Violetas' },
  { hex: '#9333EA', aux: '#F8EEFE', name: 'Roxo Real', group: 'Violetas' },
  { hex: '#5D506E', aux: '#EFECEF', name: 'Ameixa Nobre', group: 'Violetas' },

  // 5. Magentas & Rosas
  { hex: '#C026D3', aux: '#FCEEFD', name: 'Fúcsia Vibrante', group: 'Magentas' },
  { hex: '#E11D48', aux: '#FFEBF0', name: 'Rosa Carmim', group: 'Rosas' },
  { hex: '#DC2626', aux: '#FEECEB', name: 'Vermelho Rubi', group: 'Vermelhos' },
  { hex: '#A65B62', aux: '#F8ECED', name: 'Rosa Queimado', group: 'Rosas' },

  // 6. Laranjas, Dourados & Neutros
  { hex: '#EA580C', aux: '#FFF0E8', name: 'Laranja Sunset', group: 'Laranjas' },
  { hex: '#F97316', aux: '#FFF3EB', name: 'Tangerina Solar', group: 'Laranjas' },
  { hex: '#B86B43', aux: '#FAF0EA', name: 'Terracota Quente', group: 'Laranjas' },
  { hex: '#D97706', aux: '#FEF8E7', name: 'Âmbar Dourado', group: 'Dourados' },
  { hex: '#A68032', aux: '#FAF5EA', name: 'Ocre Imperial', group: 'Dourados' },
  { hex: '#7D6B58', aux: '#F5F1EE', name: 'Canela Terroso', group: 'Neutros' },
  { hex: '#475569', aux: '#F1F4F7', name: 'Ardósia Escuro', group: 'Neutros' }
];

// Alias para manter compatibilidade com módulos legados
export const PASTEL_PALETTE = VIBRANT_PALETTE;

