/**
 * Finix Control - Backend Google Apps Script
 *
 * 1) Crie uma planilha no Google Sheets.
 * 2) Vá em Extensões > Apps Script.
 * 3) Cole este código.
 * 4) Atualize o ID da planilha em SPREADSHEET_ID.
 * 5) Publique como Web App com acesso para qualquer pessoa com o link.
 */

const SPREADSHEET_ID = 'COLE_AQUI_O_ID_DA_SUA_PLANILHA';
const SHEETS = {
  SALES: 'Vendas',
  PARCELS: 'Parcelas',
  RECEIPTS: 'Recebimentos',
  STOCK: 'Estoque',
  OCCURRENCES: 'Ocorrencias'
};

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'getInitialData') {
    return jsonOutput({
      sales: getSheetObjects(SHEETS.SALES),
      receipts: getSheetObjects(SHEETS.RECEIPTS),
      stock: getSheetObjects(SHEETS.STOCK),
      occurrences: getSheetObjects(SHEETS.OCCURRENCES),
      parcels: getSheetObjects(SHEETS.PARCELS)
    });
  }
  return jsonOutput({ ok: true, message: 'Finix Control API online.' });
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents || '{}');
  const action = data.action;

  if (action === 'createSale') {
    appendObject(SHEETS.SALES, data.sale);
    (data.parcels || []).forEach(parcel => appendObject(SHEETS.PARCELS, parcel));
    return jsonOutput({ ok: true });
  }

  if (action === 'recordReceipt') {
    appendObject(SHEETS.RECEIPTS, data);
    updateParcelReceipt(data.parcelaId, Number(data.valorRecebido || 0), data.status);
    return jsonOutput({ ok: true });
  }

  if (action === 'addStockEntry') {
    appendObject(SHEETS.STOCK, data);
    return jsonOutput({ ok: true });
  }

  if (action === 'addOccurrence') {
    appendObject(SHEETS.OCCURRENCES, data);
    return jsonOutput({ ok: true });
  }

  return jsonOutput({ ok: false, message: 'Ação inválida.' });
}

function jsonOutput(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getOrCreateSheet(name) {
  const ss = getSpreadsheet();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function getSheetObjects(sheetName) {
  const sheet = getOrCreateSheet(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0];
  return values.slice(1).filter(row => row.join('') !== '').map(row => {
    const obj = {};
    headers.forEach((header, index) => obj[header] = row[index]);
    return obj;
  });
}

function appendObject(sheetName, obj) {
  const sheet = getOrCreateSheet(sheetName);
  const headers = ensureHeaders(sheetName, Object.keys(obj));
  const row = headers.map(header => obj[header] ?? '');
  sheet.appendRow(row);
}

function ensureHeaders(sheetName, keys) {
  const sheet = getOrCreateSheet(sheetName);
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const currentHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].filter(Boolean);

  if (currentHeaders.length === 0) {
    sheet.getRange(1, 1, 1, keys.length).setValues([keys]);
    return keys;
  }

  const missing = keys.filter(key => !currentHeaders.includes(key));
  if (missing.length) {
    const updatedHeaders = [...currentHeaders, ...missing];
    sheet.getRange(1, 1, 1, updatedHeaders.length).setValues([updatedHeaders]);
    return updatedHeaders;
  }

  return currentHeaders;
}

function updateParcelReceipt(parcelaId, valorRecebido, status) {
  const sheet = getOrCreateSheet(SHEETS.PARCELS);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return;

  const headers = values[0];
  const idxParcela = headers.indexOf('parcelaId');
  const idxValorRecebido = headers.indexOf('valorRecebido');
  const idxValor = headers.indexOf('valor');
  const idxStatus = headers.indexOf('status');

  if ([idxParcela, idxValorRecebido, idxValor, idxStatus].includes(-1)) return;

  for (let row = 1; row < values.length; row++) {
    if (values[row][idxParcela] == parcelaId) {
      const recebidoAtual = Number(values[row][idxValorRecebido] || 0);
      const total = Number(values[row][idxValor] || 0);
      const novoRecebido = recebidoAtual + valorRecebido;
      sheet.getRange(row + 1, idxValorRecebido + 1).setValue(novoRecebido);
      const novoStatus = novoRecebido >= total ? 'Recebido' : (status || 'Parcial');
      sheet.getRange(row + 1, idxStatus + 1).setValue(novoStatus);
      break;
    }
  }
}

function setupSheets() {
  const models = {
    [SHEETS.SALES]: ['vendaId', 'data', 'cliente', 'telefone', 'produto', 'categoria', 'quantidade', 'valorTotal', 'entrada', 'parcelas', 'primeiroVencimento', 'formaEntrada', 'observacoes', 'status'],
    [SHEETS.PARCELS]: ['parcelaId', 'vendaId', 'cliente', 'numero', 'vencimento', 'valor', 'valorRecebido', 'status'],
    [SHEETS.RECEIPTS]: ['id', 'data', 'cliente', 'parcelaId', 'valorRecebido', 'formaPagamento', 'status', 'observacao'],
    [SHEETS.STOCK]: ['id', 'dataEntrada', 'produto', 'categoria', 'modelo', 'imei', 'quantidade', 'custo', 'precoVenda', 'fornecedor', 'observacao'],
    [SHEETS.OCCURRENCES]: ['id', 'data', 'cliente', 'vendaId', 'parcelaId', 'tipo', 'descricao', 'proximoContato']
  };

  Object.keys(models).forEach(name => {
    const sheet = getOrCreateSheet(name);
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, models[name].length).setValues([models[name]]);
    }
  });
}
