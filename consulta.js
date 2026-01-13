import { Tools } from 'node-sped-nfe';
import fs from 'fs';
import xlsx from 'xlsx';
import path from 'path';
import csvWriter from 'csv-writer';

// ===================== CONFIG ===================== //
const CERTIFICADO = './GTO COMERCIO 2025-2026.pfx';
const SENHA = '#senhagto2024#';

const ARQ_PLANILHA = './python_notas/consulta_nfe/dados.xlsx';
const PASTA_RESULTADOS = './python_notas/resultados';
const LOG_DIR = './python_notas/consulta_nfe/log';
const LOG_FILE = path.join(LOG_DIR, 'consultas.csv');
// ================================================== //

// Cria pastas se necessário
fs.mkdirSync(PASTA_RESULTADOS, { recursive: true });
fs.mkdirSync(LOG_DIR, { recursive: true });

// Função para registrar log
async function registrarLog(linhaLog) {
  const exists = fs.existsSync(LOG_FILE);
  const createCsvWriter = csvWriter.createObjectCsvWriter;
  const writer = createCsvWriter({
    path: LOG_FILE,
    header: [
      { id: 'DATA_HORA', title: 'DATA_HORA' },
      { id: 'IDVENDA', title: 'IDVENDA' },
      { id: 'UF', title: 'UF' },
      { id: 'CHAVE', title: 'CHAVE' },
      { id: 'CSTAT', title: 'CSTAT' },
      { id: 'SUBPASTA', title: 'SUBPASTA' },
      { id: 'ARQUIVO', title: 'ARQUIVO' },
    ],
    append: exists,
  });
  await writer.writeRecords([linhaLog]);
}

// Lê Excel
const workbook = xlsx.readFile(ARQ_PLANILHA);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const dados = xlsx.utils.sheet_to_json(sheet);
// console.log(dados.map(d => d.CHAVE));
// Lê chaves já consultadas
let chavesConsultadas = new Set();
if (fs.existsSync(LOG_FILE)) {
  const linhas = fs.readFileSync(LOG_FILE, 'utf8').split('\n').slice(1);
  for (const l of linhas) {
    const parts = l.split(',');
    if (parts[3]) chavesConsultadas.add(parts[3].trim());
  }
}

const tarefas = dados.filter(row => !chavesConsultadas.has(row['CHAVE']?.trim()));
// console.log('Tarefas:', tarefas.length, tarefas);
const total = tarefas.length;
let processados = 0;

// Função para extrair cStat do XML
function extrairCStat(xml) {
  const match = String(xml).match(/<cStat>(\d+)<\/cStat>/);
  return match ? match[1] : 'SEM_CSTAT';
}

(async () => {
  for (const row of tarefas) {
    const IDVENDA = String(row['IDVENDA']);
    const UF = String(row['NFE_INFNFE_EMIT_ENDEREMIT_UF']).trim();
    const CHAVE = String(row['CHAVE']).trim();
    try {
      let certificadoBuffer;
      try {
        certificadoBuffer = fs.readFileSync(CERTIFICADO);
      } catch (certErr) {
        console.error('Erro ao ler certificado:', certErr.message);
        throw certErr;
      }
      const myTools = new Tools({
        mod: '55',
        tpAmb: 1,
        UF: UF,
        versao: '4.00',
        xmllint: './libs/libxml/bin/xmllint.exe',
      }, {
        pfx: certificadoBuffer,
        senha: SENHA,
      });
      const resposta = await myTools.consultarNFe(CHAVE);
      // Se vier objeto, pega xml, senão salva string
      const xmlContent = resposta && resposta.xml ? resposta.xml : resposta;
      // console.log('Conteúdo a ser salvo:', xmlContent);
      console.log('Tipo do conteúdo:', typeof xmlContent);
      // console.log(resposta, 'resposta completa');
      console.log(resposta.xml, 'resposta.xml');
      // console.log(CHAVE, 'CHAVE sendo processada');
      const cstat = resposta && resposta.retConsSitNFe?.cStat ? resposta.retConsSitNFe.cStat : extrairCStat(xmlContent);
      const subpasta = path.join(PASTA_RESULTADOS, `${cstat}-${UF}`);
      fs.mkdirSync(subpasta, { recursive: true });
      const arquivoSaida = path.join(subpasta, `${IDVENDA}.txt`);
      fs.writeFileSync(arquivoSaida, xmlContent, 'utf8');
      await registrarLog({
        DATA_HORA: new Date().toISOString().replace('T', ' ').split('.')[0],
        IDVENDA,
        UF,
        CHAVE,
        CSTAT: cstat,
        SUBPASTA: subpasta,
        ARQUIVO: arquivoSaida,
      });
      processados++;
      console.log(`Processados ${processados}/${total}`);
    } catch (err) {
      console.error(`Erro na consulta da chave ${CHAVE}:`, err && (err.stack || err.message || JSON.stringify(err)));
      await registrarLog({
        DATA_HORA: new Date().toISOString().replace('T', ' ').split('.')[0],
        IDVENDA,
        UF,
        CHAVE,
        CSTAT: 'ERRO',
        SUBPASTA: '',
        ARQUIVO: '',
      });
    }
  }
  
  console.log('Consulta concluída!');
})();