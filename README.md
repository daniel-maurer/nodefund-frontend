# nodefund · Frontend Repository

Interface web e mobile moderna para a **Distributed Node Architecture (nodefund)**.
Inspirada no design de alta fidelidade do QuickBooks CRM Dashboard (Dribbble 24029270), desenvolvida com arquitetura modular de CSS (`@layer`), JavaScript ESM nativo e gráficos interativos via Chart.js.

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- **Node.js**: Versão 18 ou superior (recomendado 20 LTS).
- **Backend (BFF)**: O serviço `bff` deve estar em execução (porta padrão: `8000`).

### 1. Iniciar o Servidor de Desenvolvimento
O frontend inclui um servidor local leve com suporte a live-reload e proxy transparente para a API do BFF:

```bash
# Iniciar o frontend na porta 3000
npm start
```

Ou para desenvolvimento com reinicialização automática:
```bash
npm run dev
```

Acesse a aplicação no navegador em:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## ⚙️ Variáveis de Ambiente & Configuração

Você pode customizar a porta local e o endereço do BFF passando variáveis de ambiente na execução:

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3000` | Porta local do servidor frontend |
| `API_URL` | `http://127.0.0.1:8000` | Endereço do BFF para onde as chamadas `/api/*` serão repassadas |

Exemplo de execução em porta customizada conectando a um BFF remoto:
```bash
PORT=4000 API_URL=http://api.nodefund.local:8000 npm start
```

---

## 🧪 Como Executar os Testes

O repositório inclui testes automatizados verificando a integridade dos arquivos, tokens de design CSS e o servidor de desenvolvimento:

```bash
npm test
```

Saída esperada:
```
✔ Frontend Files - integridade da estrutura HTML, CSS e JS
✔ Frontend CSS - variáveis de design tokens declaradas em :root
✔ Dev Server - carrega arquivos estáticos com MIME types corretos
ℹ tests 3 | pass 3
```

---

## 📁 Estrutura de Diretórios

```
frontend/
├── index.html                # Aplicação Single-Page (SPA)
├── dev-server.js             # Servidor HTTP local com proxy para o BFF
├── package.json              # Configuração do projeto e scripts npm
├── README.md                 # Guia de execução e desenvolvimento
├── tests/                    # Suíte de testes automatizados
│   └── frontend.test.js
├── css/                      # Arquitetura de CSS Modular
│   ├── variables.css         # Design tokens (:root com cores, fontes e espaçamentos)
│   ├── base.css              # Reset moderno e scrollbars
│   ├── layout.css            # Moldura Dribbble e superfícies principais
│   ├── components/           # Estilos isolados por componente (sidebar, topbar, cards, etc.)
│   ├── pages/                # Estilos isolados por aba (rebalancear, config, etc.)
│   ├── responsive.css        # Adaptação para tablets, smartphones e drawer off-canvas
│   └── style.css             # Orquestrador mestre compacto com @layer e @import
└── js/                       # Código-fonte JavaScript Modular (ESM)
    ├── app.js                # Orquestrador principal da aplicação
    ├── state.js              # Gerenciamento de estado reativo
    ├── chart.umd.min.js      # Biblioteca de gráficos Chart.js
    ├── components/           # Componentes de interface (sidebar, topbar, gráficos, etc.)
    ├── services/             # Cliente HTTP da API REST (/api/...)
    ├── constants/            # Configurações e constantes do front
    └── utils/                # Formatadores de moeda, datas e cálculos
```
