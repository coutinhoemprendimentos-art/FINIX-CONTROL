# Finix Control

Sistema em HTML + CSS + JavaScript para controle de:

- vendas parceladas de celulares e acessórios
- previsão de recebimentos do mês
- lançamento de recebidos
- controle de parcelas
- estoque e entrada de mercadorias
- registro de imprevistos e renegociações
- integração com Google Sheets via Google Apps Script

## Arquivos

- `index.html` → interface principal
- `styles.css` → visual moderno e responsivo
- `app.js` → lógica do painel
- `config.example.js` → local para inserir a URL do Apps Script
- `apps_script.gs` → backend para integrar com Google Sheets

## Como publicar no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie `index.html`, `styles.css`, `app.js` e `config.example.js`.
3. Ative o GitHub Pages nas configurações do repositório.
4. Renomeie `config.example.js` para `config.js` se quiser, ou mantenha como está e só altere o conteúdo.

## Como ligar no Google Sheets

### 1) Crie a planilha
Crie uma planilha no Google Sheets e copie o ID dela.

### 2) Apps Script
Na planilha, vá em **Extensões > Apps Script** e cole o conteúdo de `apps_script.gs`.

### 3) Configure o ID da planilha
No topo do arquivo Apps Script, troque:

```javascript
const SPREADSHEET_ID = 'COLE_AQUI_O_ID_DA_SUA_PLANILHA';
```

### 4) Crie as abas automaticamente
No Apps Script, execute manualmente a função:

```javascript
setupSheets()
```

Isso cria as abas:
- Vendas
- Parcelas
- Recebimentos
- Estoque
- Ocorrencias

### 5) Publique como Web App
- Clique em **Implantar**
- **Nova implantação**
- Tipo: **Aplicativo da web**
- Permissão: **Qualquer pessoa com o link**

Copie a URL gerada.

### 6) Cole a URL no front
Abra `config.example.js` e adicione a URL:

```javascript
window.APP_CONFIG = {
  API_URL: "SUA_URL_DO_APPS_SCRIPT_AQUI"
};
```

## Observações importantes

- Sem configurar a `API_URL`, o sistema entra em **modo demonstração**.
- O layout já está pronto para celular e desktop.
- O projeto foi feito para ser simples de subir no GitHub e fácil de evoluir.

## Próximas melhorias sugeridas

- login com senha
- filtro por cliente
- edição e exclusão de lançamentos
- WhatsApp automático para cobrança
- relatório mensal por vendedor
- cálculo de lucro por item
- controle de saída automática do estoque ao vender
