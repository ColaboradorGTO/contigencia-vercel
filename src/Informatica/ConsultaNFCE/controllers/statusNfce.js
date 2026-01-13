import { Make, Tools, docZip } from 'node-sped-nfe';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import os from 'os';
import https from 'https';
import 'dotenv/config';
const url = process.env.API_URL

// IMPORTANTE: Desabilitar rejeição de certificado NO INÍCIO
// This is for internal SEFAZ calls que possuem certificado auto-assinado
// Suprimir aviso de NODE_TLS_REJECT_UNAUTHORIZED interceptando stderr
const originalStderr = process.stderr.write;
process.stderr.write = function(chunk, encoding, callback) {
  const message = chunk.toString();
  if (message.includes('NODE_TLS_REJECT_UNAUTHORIZED')) {
    return callback ? callback() : true;
  }
  return originalStderr.call(process.stderr, chunk, encoding, callback);
};

process.on('warning', (warning) => {
  if (warning.code === 'NODE_TLS_REJECT_UNAUTHORIZED') {
    return;
  }
  console.warn(warning);
});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Criar HTTPS Agent global que desabilita verificação de certificado
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  checkServerIdentity: () => undefined // Ignora validação de hostname
});

// Aplicar ao axios para HTTPS apenas
axios.defaults.httpsAgent = httpsAgent;

// Detectar SO e retornar extensão correta
const getToolPath = (basePath, executable) => {
  const isWindows = os.platform() === 'win32';
  
  if (!isWindows) {
    // Em Linux, tentar usar o executável do sistema primeiro
    try {
      const systemPath = `/usr/bin/${executable}`;
      if (fs.existsSync(systemPath)) {
        return systemPath;
      }
    } catch (e) {}
  }
  
  // Caso contrário, usar o caminho local
  const ext = isWindows ? '.exe' : '';
  return path.resolve(`${basePath}${executable}${ext}`);
};

export async function getCertOptions(senha, fallbackPfxPath = './GTO COMERCIO 2025-2026.pfx') {
  // -----------------------------
  // 1) PFX BASE64 VIA ENV
  // -----------------------------
  if (process.env.CERT_PFX_BASE64) {
    try {
      const buf = Buffer.from(process.env.CERT_PFX_BASE64, "base64");
      if (buf.length > 0) {
        return { pfx: buf, senha };
      }
    } catch (e) {
      console.error("ERRO: CERT_PFX_BASE64 inválido:", e.message);
    }
  }

  // -----------------------------
  // 2) PFX ARQUIVO LOCAL
  // -----------------------------
  if (fallbackPfxPath && fs.existsSync(fallbackPfxPath)) {
    try {
      const buf = fs.readFileSync(path.resolve(fallbackPfxPath));
      if (buf.length > 0) {
        return { pfx: buf, senha };
      }
    } catch (e) {
      console.error("ERRO ao ler arquivo PFX local:", e.message);
    }
  }

  // -----------------------------
  // 3) PEM BASE64 (cert + key)
  // -----------------------------
  if (process.env.CERT_PEM_CERT_BASE64 && process.env.CERT_PEM_KEY_BASE64) {
    try {
      const cert = Buffer.from(process.env.CERT_PEM_CERT_BASE64, "base64");
      const key = Buffer.from(process.env.CERT_PEM_KEY_BASE64, "base64");
      return { cert, key };
    } catch (e) {
      console.error("ERRO: CERT_PEM_*_BASE64 inválido:", e.message);
    }
  }

  // -----------------------------
  // 4) PEM POR CAMINHO
  // -----------------------------
  // if (process.env.CERT_PEM_CERT_PATH && process.env.CERT_PEM_KEY_PATH) {
  //   try {
  //     const cert = fs.readFileSync(process.env.CERT_PEM_CERT_PATH);
  //     const key = fs.readFileSync(process.env.CERT_PEM_KEY_PATH);
  //     return { cert, key };
  //   } catch (e) {
  //     console.error("ERRO ao ler caminhos PEM:", e.message);
  //   }
  // }

  // -----------------------------
  // 5) NADA ENCONTRADO
  // -----------------------------
  return null;
}


class ConsultaStatusNfeController {

  async statusSefaz(req, res) {
    try {
      let { idVenda } = req.query;

      if (!idVenda) {
        return res.status(400).json({ error: "idVenda é obrigatório" });
      }

      const apiUrl = `${url}/api/venda/lista-venda-new-xml.xsjs?id=${idVenda}`;

      const response = await axios.get(apiUrl);
      const vendaData = response.data;
      const configData = response.data.data[0]?.configuracao?.[0]?.config || {};
      const cscId = configData.IDTOKEN || "1";
      const csc = configData.TOKENCSC || "";
      const uf = vendaData.data[0]?.venda.NFE_INFNFE_EMIT_ENDEREMIT_UF;
      const mod = String(vendaData.data[0]?.venda.NFE_INFNFE_IDE_MOD || "65");
      const tpAmb = parseInt(vendaData.data[0]?.venda.NFE_INFNFE_IDE_TPAMB || 2);
      const chaveRaw = vendaData.data[0]?.venda.CHAVE || "";
      const chave = chaveRaw.replace(/^NFe/i, '').replace(/\D/g, '').slice(0, 44);
      const SENHA_CERT = process.env.SENHA || "#senhagto2024#";
      const certOptions = await getCertOptions(SENHA_CERT, path.resolve("./GTO COMERCIO 2025-2026.pfx"));

      if (!certOptions) {
        return res.status(500).json({
          error: 'Não foi possível carregar o certificado. Verifique as variáveis de ambiente ou o arquivo local.'
        });
      }
      
      // Apenas definir OPENSSL_MODULES em Windows
      if (os.platform() === 'win32') {
        const opensslModulesPath = path.resolve("./libs/openssl/lib/ossl-modules");
        process.env.OPENSSL_MODULES = opensslModulesPath;
      } else {
        // Em Linux, não usar módulos legados
        delete process.env.OPENSSL_MODULES;
      }
      
      const toolsConfig = {
        mod: mod,
        tpAmb: tpAmb,
        UF: String(uf),
        versao: "4.00",
        timeout: 180000, // Aumentado para 3 minutos
        CSC: csc,
        CSCid: cscId,
      };
      
      // Adicionar xmllint e openssl apenas em Windows
      if (os.platform() === 'win32') {
        toolsConfig.xmllint = getToolPath('./libs/libxml/bin/', 'xmllint');
        toolsConfig.openssl = getToolPath('./libs/openssl/bin/', 'openssl');
      }
      // Em Linux, usa os comandos do sistema automaticamente
      
      console.log('✅ Dados da venda carregados com sucesso');
      console.log('⏳ Inicializando Tools...');
      const tools = new Tools(toolsConfig, certOptions);
      
      console.log('⏳ Consultando status SEFAZ para chave:', chave);
      const resposta = await tools.sefazStatus(chave).catch(err => {
        console.error('❌ Erro ao consultar status da SEFAZ:', err.message);
        throw err;
      });
      
      console.log('✅ Resposta SEFAZ recebida com sucesso');
 
      return res.json({
        vendaData,
        xml: resposta
      });
    } catch (error) {
      console.error('❌ Erro completo:', error);
      console.error('Erro ao consultar XML:', error.message);
      console.error('Stack:', error.stack);
      return res.status(500).json({ error: error.message || 'Erro ao consultar venda ou gerar XML' });
    }
  }

}

export default new ConsultaStatusNfeController();