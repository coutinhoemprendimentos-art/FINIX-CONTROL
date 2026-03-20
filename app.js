const state = {
  dashboard: null,
  sales: [],
  receipts: [],
  stock: [],
  occurrences: [],
  parcels: []
};

const demoData = {
  sales: [
    { vendaId: 'VEN-001', data: '2026-03-03', cliente: 'Maria Silva', produto: 'iPhone 13 128GB', valorTotal: 3500, entrada: 500, parcelas: 6, status: 'Em aberto' },
    { vendaId: 'VEN-002', data: '2026-03-12', cliente: 'João Alves', produto: 'Redmi Note 13', valorTotal: 1450, entrada: 0, parcelas: 5, status: 'Em aberto' },
    { vendaId: 'VEN-003', data: '2026-03-18', cliente: 'Paulo Sousa', produto: 'Capinha Premium', valorTotal: 90, entrada: 30, parcelas: 2, status: 'Em aberto' }
  ],
  receipts: [
    { data: '2026-03-05', cliente: 'Maria Silva', parcelaId: 'PAR-001', valorRecebido: 500, formaPagamento: 'PIX', status: 'Recebido integral' },
    { data: '2026-03-16', cliente: 'João Alves', parcelaId: 'PAR-004', valorRecebido: 290, formaPagamento: 'Dinheiro', status: 'Recebido parcial' }
  ],
  stock: [
    { dataEntrada: '2026-03-02', produto: 'iPhone 13 128GB', categoria: 'Celular', modelo: 'Apple', imei: '35900...', quantidade: 2, custo: 2400, precoVenda: 3500, fornecedor: 'Fornecedor A' },
    { dataEntrada: '2026-03-07', produto: 'Película 3D', categoria: 'Acessório', modelo: 'Universal', imei: '', quantidade: 25, custo: 8, precoVenda: 25, fornecedor: 'Fornecedor B' }
  ],
  occurrences: [
    { data: '2026-03-15', cliente: 'João Alves', tipo: 'Promessa de pagamento', descricao: 'Cliente informou que pagará no dia 22.', proximoContato: '2026-03-22' },
    { data: '2026-03-18', cliente: 'Ana Costa', tipo: 'Desemprego', descricao: 'Solicitou renegociação para próximo mês.', proximoContato: '2026-03-28' }
  ],
  parcels: [
    { parcelaId: 'PAR-001', vendaId: 'VEN-001', cliente: 'Maria Silva', numero: 1, vencimento: '2026-03-05', valor: 500, valorRecebido: 500, status: 'Recebido' },
    { parcelaId: 'PAR-002', vendaId: 'VEN-001', cliente: 'Maria Silva', numero: 2, vencimento: '2026-04-05', valor: 500, valorRecebido: 0, status: 'Em aberto' },
    { parcelaId: 'PAR-003', vendaId: 'VEN-001', cliente: 'Maria Silva', numero: 3, vencimento: '2026-05-05', valor: 500, valorRecebido: 0, status: 'Em aberto' },
    { parcelaId: 'PAR-004', vendaId: 'VEN-002', cliente: 'João Alves', numero: 1, vencimento: '2026-03-16', valor: 290, valorRecebido: 290, status: 'Parcial' },
    { parcelaId: 'PAR-005', vendaId: 'VEN-002', cliente: 'João Alves', numero: 2, vencimento: '2026-04-16', valor: 290, valorRecebido: 0, status: 'Em aberto' },
    { parcelaId: 'PAR-006', vendaId: 'VEN-003', cliente: 'Paulo Sousa', numero: 1, vencimento: '2026-03-25', valor: 30, valorRecebido: 0, status: 'Em aberto' }
  ]
};

let forecastChart;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const [y, m, d] = dateString.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function setDefaultDates() {
  const dateInputs = ['[name="primeiroVencimento"]', '[name="dataRecebimento"]', '[name="dataEntrada"]', '[name="proximoContato"]'];
  dateInputs.forEach((selector) => {
    const el = document.querySelector(selector);
    if (el && !el.value) el.value = today();
  });
}

function setConnectionStatus(isOnline) {
  const el = $('#connectionStatus');
  el.textContent = isOnline ? 'Google Sheets conectado' : 'Modo demonstração';
  el.className = `status-chip ${isOnline ? 'online' : 'offline'}`;
}

function showToast(message, isError = false) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.style.borderColor = isError ? 'rgba(255,108,122,.35)' : 'rgba(255,255,255,.08)';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function badgeClass(status = '') {
  const s = status.toLowerCase();
  if (s.includes('recebido')) return 'success';
  if (s.includes('parcial') || s.includes('prometeu') || s.includes('renegociado')) return 'warning';
  if (s.includes('atras') || s.includes('venc')) return 'danger';
  return 'info';
}

function computeDashboard(parcels, receipts, stock, sales) {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const monthParcels = parcels.filter((p) => {
    const dt = new Date(p.vencimento);
    return dt.getMonth() === month && dt.getFullYear() === year;
  });

  const monthReceipts = receipts.filter((r) => {
    const dt = new Date(r.data);
    return dt.getMonth() === month && dt.getFullYear() === year;
  });

  const previstoMes = monthParcels.reduce((acc, cur) => acc + Number(cur.valor || 0), 0);
  const recebidoMes = monthReceipts.reduce((acc, cur) => acc + Number(cur.valorRecebido || 0), 0);
  const atrasadoMes = parcels
    .filter((p) => new Date(p.vencimento) < now && !String(p.status).toLowerCase().includes('recebido'))
    .reduce((acc, cur) => acc + Math.max(0, Number(cur.valor || 0) - Number(cur.valorRecebido || 0)), 0);

  const topClientesMap = {};
  parcels.forEach((p) => {
    const aberto = Math.max(0, Number(p.valor || 0) - Number(p.valorRecebido || 0));
    if (aberto > 0) topClientesMap[p.cliente] = (topClientesMap[p.cliente] || 0) + aberto;
  });

  const topClientes = Object.entries(topClientesMap)
    .map(([cliente, saldo]) => ({ cliente, saldo }))
    .sort((a, b) => b.saldo - a.saldo)
    .slice(0, 5);

  const upcoming = [...parcels]
    .filter((p) => !String(p.status).toLowerCase().includes('recebido'))
    .sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento))
    .slice(0, 5);

  const forecastMap = {};
  parcels.forEach((p) => {
    const key = p.vencimento?.slice(0, 7) || 'Sem data';
    forecastMap[key] = forecastMap[key] || { previsto: 0, recebido: 0 };
    forecastMap[key].previsto += Number(p.valor || 0);
    forecastMap[key].recebido += Number(p.valorRecebido || 0);
  });

  const chartData = Object.entries(forecastMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([mes, values]) => ({ mes, ...values }));

  return {
    previstoMes,
    recebidoMes,
    pendenteMes: Math.max(0, previstoMes - recebidoMes),
    atrasadoMes,
    upcoming,
    topClientes,
    chartData,
    quickSummary: [
      { label: 'Total de vendas', value: sales.length },
      { label: 'Itens em estoque', value: stock.reduce((acc, item) => acc + Number(item.quantidade || 0), 0) },
      { label: 'Parcelas em aberto', value: parcels.filter((p) => String(p.status).toLowerCase().includes('aberto') || String(p.status).toLowerCase().includes('parcial')).length },
      { label: 'Ocorrências lançadas', value: state.occurrences.length }
    ]
  };
}

async function apiRequest(action, payload = {}, method = 'POST') {
  const apiUrl = window.APP_CONFIG?.API_URL;
  if (!apiUrl) throw new Error('API_URL não configurada');

  if (method === 'GET') {
    const params = new URLSearchParams({ action, ...payload });
    const res = await fetch(`${apiUrl}?${params.toString()}`);
    return res.json();
  }

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload })
  });
  return res.json();
}

async function loadData() {
  const online = Boolean(window.APP_CONFIG?.API_URL);
  setConnectionStatus(online);

  if (online) {
    try {
      const data = await apiRequest('getInitialData', {}, 'GET');
      state.sales = data.sales || [];
      state.receipts = data.receipts || [];
      state.stock = data.stock || [];
      state.occurrences = data.occurrences || [];
      state.parcels = data.parcels || [];
    } catch (error) {
      console.error(error);
      showToast('Falha ao conectar ao Google Sheets. Exibindo modo demonstração.', true);
      Object.assign(state, demoData);
      setConnectionStatus(false);
    }
  } else {
    Object.assign(state, demoData);
  }

  state.dashboard = computeDashboard(state.parcels, state.receipts, state.stock, state.sales);
  renderAll();
}

function renderAll() {
  renderDashboard();
  renderSales();
  renderReceipts();
  renderStock();
  renderOccurrences();
  renderParcels();
}

function renderDashboard() {
  const d = state.dashboard;
  $('#previstoMes').textContent = money(d.previstoMes);
  $('#recebidoMes').textContent = money(d.recebidoMes);
  $('#pendenteMes').textContent = money(d.pendenteMes);
  $('#atrasadoMes').textContent = money(d.atrasadoMes);

  $('#upcomingList').innerHTML = d.upcoming.length ? d.upcoming.map(item => `
    <div class="list-item">
      <div>
        <h4>${item.cliente}</h4>
        <p>${item.parcelaId} • vence em ${formatDate(item.vencimento)}</p>
      </div>
      <strong>${money(item.valor - (item.valorRecebido || 0))}</strong>
    </div>
  `).join('') : '<div class="empty-state-inline">Nenhum vencimento próximo.</div>';

  $('#clientesSaldoList').innerHTML = d.topClientes.length ? d.topClientes.map(item => `
    <div class="list-item">
      <div>
        <h4>${item.cliente}</h4>
        <p>Saldo em aberto</p>
      </div>
      <strong>${money(item.saldo)}</strong>
    </div>
  `).join('') : '<div class="empty-state-inline">Sem clientes com saldo em aberto.</div>';

  $('#quickSummary').innerHTML = d.quickSummary.map(item => `
    <div class="summary-pill">
      <span>${item.label}</span>
      <strong>${item.value}</strong>
    </div>
  `).join('');

  renderChart(d.chartData);
}

function renderChart(chartData) {
  const ctx = document.getElementById('forecastChart');
  if (forecastChart) forecastChart.destroy();

  forecastChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: chartData.map(item => item.mes),
      datasets: [
        { label: 'Previsto', data: chartData.map(item => item.previsto), borderRadius: 8 },
        { label: 'Recebido', data: chartData.map(item => item.recebido), borderRadius: 8 }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#dbe3f6' } } },
      scales: {
        x: { ticks: { color: '#9ca8c3' }, grid: { color: 'rgba(255,255,255,.04)' } },
        y: { ticks: { color: '#9ca8c3' }, grid: { color: 'rgba(255,255,255,.04)' } }
      }
    }
  });
}

function buildTable(columns, rows, formatter) {
  if (!rows.length) return '<div class="empty-state-inline">Sem registros.</div>';
  return `
    <table>
      <thead><tr>${columns.map(col => `<th>${col}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(formatter).join('')}</tbody>
    </table>
  `;
}

function renderSales() {
  $('#salesList').innerHTML = buildTable(
    ['Data', 'Venda', 'Cliente', 'Produto', 'Valor', 'Entrada', 'Parcelas', 'Status'],
    state.sales.slice().reverse().slice(0, 10),
    (row) => `
      <tr>
        <td>${formatDate(row.data)}</td>
        <td>${row.vendaId}</td>
        <td>${row.cliente}</td>
        <td>${row.produto}</td>
        <td>${money(row.valorTotal)}</td>
        <td>${money(row.entrada)}</td>
        <td>${row.parcelas}</td>
        <td><span class="badge ${badgeClass(row.status)}">${row.status}</span></td>
      </tr>
    `
  );
}

function renderReceipts() {
  $('#receiptList').innerHTML = buildTable(
    ['Data', 'Cliente', 'Parcela', 'Valor', 'Forma', 'Status'],
    state.receipts.slice().reverse().slice(0, 10),
    (row) => `
      <tr>
        <td>${formatDate(row.data)}</td>
        <td>${row.cliente}</td>
        <td>${row.parcelaId}</td>
        <td>${money(row.valorRecebido)}</td>
        <td>${row.formaPagamento}</td>
        <td><span class="badge ${badgeClass(row.status)}">${row.status}</span></td>
      </tr>
    `
  );
}

function renderStock() {
  $('#stockList').innerHTML = buildTable(
    ['Entrada', 'Produto', 'Categoria', 'Modelo', 'Qtd.', 'Custo', 'Preço', 'Fornecedor'],
    state.stock.slice().reverse().slice(0, 12),
    (row) => `
      <tr>
        <td>${formatDate(row.dataEntrada)}</td>
        <td>${row.produto}</td>
        <td>${row.categoria}</td>
        <td>${row.modelo || '-'}</td>
        <td>${row.quantidade}</td>
        <td>${money(row.custo)}</td>
        <td>${money(row.precoVenda)}</td>
        <td>${row.fornecedor || '-'}</td>
      </tr>
    `
  );
}

function renderOccurrences() {
  $('#occurrenceList').innerHTML = buildTable(
    ['Data', 'Cliente', 'Tipo', 'Descrição', 'Próximo contato'],
    state.occurrences.slice().reverse().slice(0, 10),
    (row) => `
      <tr>
        <td>${formatDate(row.data || today())}</td>
        <td>${row.cliente}</td>
        <td><span class="badge ${badgeClass(row.tipo)}">${row.tipo}</span></td>
        <td>${row.descricao}</td>
        <td>${formatDate(row.proximoContato)}</td>
      </tr>
    `
  );
}

function renderParcels() {
  $('#parcelList').innerHTML = buildTable(
    ['Parcela', 'Venda', 'Cliente', 'Nº', 'Vencimento', 'Valor', 'Recebido', 'Status'],
    state.parcels.slice().sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento)),
    (row) => `
      <tr>
        <td>${row.parcelaId}</td>
        <td>${row.vendaId}</td>
        <td>${row.cliente}</td>
        <td>${row.numero}</td>
        <td>${formatDate(row.vencimento)}</td>
        <td>${money(row.valor)}</td>
        <td>${money(row.valorRecebido)}</td>
        <td><span class="badge ${badgeClass(row.status)}">${row.status}</span></td>
      </tr>
    `
  );
}

function serializeForm(form) {
  const data = new FormData(form);
  return Object.fromEntries(data.entries());
}

function genId(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

function addMonths(dateString, months) {
  const date = new Date(dateString + 'T00:00:00');
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

async function handleSaleSubmit(event) {
  event.preventDefault();
  const payload = serializeForm(event.target);
  const vendaId = genId('VEN');
  const valorTotal = Number(payload.valorTotal || 0);
  const entrada = Number(payload.entrada || 0);
  const parcelas = Number(payload.parcelas || 1);
  const quantidade = Number(payload.quantidade || 1);
  const saldo = Math.max(0, valorTotal - entrada);
  const valorParcela = parcelas > 0 ? Number((saldo / parcelas).toFixed(2)) : saldo;

  const sale = {
    vendaId,
    data: today(),
    cliente: payload.cliente,
    telefone: payload.telefone,
    produto: payload.produto,
    categoria: payload.categoria,
    quantidade,
    valorTotal,
    entrada,
    parcelas,
    primeiroVencimento: payload.primeiroVencimento,
    formaEntrada: payload.formaEntrada,
    observacoes: payload.observacoes,
    status: saldo > 0 ? 'Em aberto' : 'Recebido'
  };

  const parcelRows = Array.from({ length: parcelas }, (_, index) => ({
    parcelaId: genId(`PAR${index + 1}`),
    vendaId,
    cliente: payload.cliente,
    numero: index + 1,
    vencimento: addMonths(payload.primeiroVencimento, index),
    valor: valorParcela,
    valorRecebido: 0,
    status: 'Em aberto'
  }));

  try {
    if (window.APP_CONFIG?.API_URL) {
      await apiRequest('createSale', { sale, parcels: parcelRows });
    }
    state.sales.push(sale);
    state.parcels.push(...parcelRows);
    state.dashboard = computeDashboard(state.parcels, state.receipts, state.stock, state.sales);
    renderAll();
    event.target.reset();
    setDefaultDates();
    showToast('Venda lançada com sucesso.');
  } catch (error) {
    console.error(error);
    showToast('Erro ao salvar venda.', true);
  }
}

async function handleReceiptSubmit(event) {
  event.preventDefault();
  const payload = serializeForm(event.target);
  const receipt = {
    id: genId('REC'),
    data: payload.dataRecebimento,
    cliente: payload.cliente,
    parcelaId: payload.parcelaId,
    valorRecebido: Number(payload.valorRecebido || 0),
    formaPagamento: payload.formaPagamento,
    status: payload.status,
    observacao: payload.observacao
  };

  try {
    if (window.APP_CONFIG?.API_URL) {
      await apiRequest('recordReceipt', receipt);
    }
    state.receipts.push(receipt);

    const parcel = state.parcels.find((item) => item.parcelaId === payload.parcelaId);
    if (parcel) {
      parcel.valorRecebido = Number(parcel.valorRecebido || 0) + receipt.valorRecebido;
      parcel.status = parcel.valorRecebido >= Number(parcel.valor) ? 'Recebido' : (payload.status || 'Parcial');
      if (!receipt.cliente) receipt.cliente = parcel.cliente;
    }

    state.dashboard = computeDashboard(state.parcels, state.receipts, state.stock, state.sales);
    renderAll();
    event.target.reset();
    setDefaultDates();
    showToast('Recebimento registrado.');
  } catch (error) {
    console.error(error);
    showToast('Erro ao registrar recebimento.', true);
  }
}

async function handleStockSubmit(event) {
  event.preventDefault();
  const payload = serializeForm(event.target);
  const item = {
    id: genId('EST'),
    dataEntrada: payload.dataEntrada,
    produto: payload.produto,
    categoria: payload.categoria,
    modelo: payload.modelo,
    imei: payload.imei,
    quantidade: Number(payload.quantidade || 0),
    custo: Number(payload.custo || 0),
    precoVenda: Number(payload.precoVenda || 0),
    fornecedor: payload.fornecedor,
    observacao: payload.observacao
  };

  try {
    if (window.APP_CONFIG?.API_URL) {
      await apiRequest('addStockEntry', item);
    }
    state.stock.push(item);
    state.dashboard = computeDashboard(state.parcels, state.receipts, state.stock, state.sales);
    renderAll();
    event.target.reset();
    setDefaultDates();
    showToast('Entrada de estoque registrada.');
  } catch (error) {
    console.error(error);
    showToast('Erro ao salvar estoque.', true);
  }
}

async function handleOccurrenceSubmit(event) {
  event.preventDefault();
  const payload = serializeForm(event.target);
  const occurrence = {
    id: genId('OCO'),
    data: today(),
    cliente: payload.cliente,
    vendaId: payload.vendaId,
    parcelaId: payload.parcelaId,
    tipo: payload.tipo,
    descricao: payload.descricao,
    proximoContato: payload.proximoContato
  };

  try {
    if (window.APP_CONFIG?.API_URL) {
      await apiRequest('addOccurrence', occurrence);
    }
    state.occurrences.push(occurrence);
    state.dashboard = computeDashboard(state.parcels, state.receipts, state.stock, state.sales);
    renderAll();
    event.target.reset();
    setDefaultDates();
    showToast('Ocorrência salva.');
  } catch (error) {
    console.error(error);
    showToast('Erro ao salvar ocorrência.', true);
  }
}

function bindNavigation() {
  const titles = {
    dashboard: ['Dashboard', 'Controle geral das suas vendas parceladas.'],
    vendas: ['Lançar venda', 'Cadastre vendas com entrada e parcelamento automático.'],
    recebimentos: ['Recebimentos', 'Lance pagamentos totais ou parciais das parcelas.'],
    estoque: ['Estoque', 'Controle de mercadorias recebidas e itens disponíveis.'],
    ocorrencias: ['Imprevistos', 'Histórico de promessas, renegociações e ocorrências.'],
    parcelas: ['Parcelas', 'Acompanhe a situação de todas as cobranças.']
  };

  $$('.nav-item').forEach((button) => {
    button.addEventListener('click', () => {
      $$('.nav-item').forEach((el) => el.classList.remove('active'));
      $$('.section').forEach((el) => el.classList.remove('active'));
      button.classList.add('active');
      const section = button.dataset.section;
      document.getElementById(section).classList.add('active');
      $('#sectionTitle').textContent = titles[section][0];
      $('#sectionSubtitle').textContent = titles[section][1];
    });
  });
}

function bindForms() {
  $('#saleForm').addEventListener('submit', handleSaleSubmit);
  $('#receiptForm').addEventListener('submit', handleReceiptSubmit);
  $('#stockForm').addEventListener('submit', handleStockSubmit);
  $('#occurrenceForm').addEventListener('submit', handleOccurrenceSubmit);
  $('#refreshDataBtn').addEventListener('click', loadData);
}

function init() {
  setDefaultDates();
  bindNavigation();
  bindForms();
  loadData();
}

document.addEventListener('DOMContentLoaded', init);
