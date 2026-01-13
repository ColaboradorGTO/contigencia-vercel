import { Make, Tools, docZip } from 'node-sped-nfe';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import https from 'https';
import forge from 'node-forge';
import 'dotenv/config';

const url = process.env.API_URL;

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

export async function getCertOptions(senha, fallbackPfxPath = './GTO COMERCIO 2025-2026.pfx') {
  // -----------------------------
  // 1) PFX BASE64 VIA ENV (usando node-forge)
  // -----------------------------
  if (process.env.CERT_PFX_BASE64) {
    try {
      console.log('📥 Tentando decodificar PFX base64 com node-forge...');
      
      // Decodificar base64 para buffer
      const pfxDer = Buffer.from(process.env.CERT_PFX_BASE64, "base64");
      
      // Converter DER para ASN.1
      const p12Asn1 = forge.asn1.fromDer(pfxDer.toString('binary'));
      
      // Extrair PKCS12 com a senha
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, senha);
      
      // Buscar certificados (pode haver vários, pegamos o primeiro)
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const certBag = certBags[forge.pki.oids.certBag];
      
      if (!certBag || certBag.length === 0) {
        throw new Error('Nenhum certificado encontrado no arquivo PFX');
      }
      
      // Buscar chave privada
      const keyBags = p12.getBags({ 
        bagType: forge.pki.oids.pkcs8ShroudedKeyBag 
      });
      const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];
      
      if (!keyBag || keyBag.length === 0) {
        // Tentar outro tipo de bag para chave privada
        const keyBags2 = p12.getBags({ 
          bagType: forge.pki.oids.keyBag 
        });
        const keyBag2 = keyBags2[forge.pki.oids.keyBag];
        
        if (!keyBag2 || keyBag2.length === 0) {
          throw new Error('Nenhuma chave privada encontrada no arquivo PFX');
        }
        
        const privateKey = keyBag2[0].key;
        const cert = certBag[0].cert;
        
        // Converter para PEM
        const certPem = forge.pki.certificateToPem(cert);
        const keyPem = forge.pki.privateKeyToPem(privateKey);
        
        console.log('✅ PFX decodificado com sucesso usando node-forge');
        return { 
          cert: Buffer.from(certPem), 
          key: Buffer.from(keyPem) 
        };
      }
      
      const privateKey = keyBag[0].key;
      const cert = certBag[0].cert;
      
      // Converter para PEM
      const certPem = forge.pki.certificateToPem(cert);
      const keyPem = forge.pki.privateKeyToPem(privateKey);
      
      console.log('✅ PFX decodificado com sucesso usando node-forge');
      return { 
        cert: Buffer.from(certPem), 
        key: Buffer.from(keyPem) 
      };
    } catch (e) {
      console.error("❌ ERRO ao decodificar PFX com node-forge:", e.message);
      console.error("Detalhes:", e);
    }
  }

  // -----------------------------
  // 2) PFX ARQUIVO LOCAL (usando node-forge também)
  // -----------------------------
  if (fallbackPfxPath && fs.existsSync(fallbackPfxPath)) {
    try {
      console.log('📂 Tentando ler arquivo PFX local com node-forge...');
      
      // Ler arquivo local
      const pfxBuffer = fs.readFileSync(path.resolve(fallbackPfxPath));
      const pfxDer = Buffer.from(pfxBuffer);
      
      // Converter DER para ASN.1
      const p12Asn1 = forge.asn1.fromDer(pfxDer.toString('binary'));
      
      // Extrair PKCS12 com a senha
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, senha);
      
      // Buscar certificados
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const certBag = certBags[forge.pki.oids.certBag];
      
      if (!certBag || certBag.length === 0) {
        throw new Error('Nenhum certificado encontrado no arquivo PFX local');
      }
      
      // Buscar chave privada
      const keyBags = p12.getBags({ 
        bagType: forge.pki.oids.pkcs8ShroudedKeyBag 
      });
      const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];
      
      if (!keyBag || keyBag.length === 0) {
        throw new Error('Nenhuma chave privada encontrada no arquivo PFX local');
      }
      
      const privateKey = keyBag[0].key;
      const cert = certBag[0].cert;
      
      // Converter para PEM
      const certPem = forge.pki.certificateToPem(cert);
      const keyPem = forge.pki.privateKeyToPem(privateKey);
      
      console.log('✅ PFX local decodificado com sucesso usando node-forge');
      return { 
        cert: Buffer.from(certPem), 
        key: Buffer.from(keyPem) 
      };
    } catch (e) {
      console.error("❌ ERRO ao ler arquivo PFX local com node-forge:", e.message);
      console.error("Detalhes:", e);
    }
  }

  // -----------------------------
  // 3) PEM BASE64 (cert + key) - Formato direto
  // -----------------------------
  if (process.env.CERT_PEM_CERT_BASE64 && process.env.CERT_PEM_KEY_BASE64) {
    try {
      console.log('📥 Usando certificado PEM base64...');
      const cert = Buffer.from(process.env.CERT_PEM_CERT_BASE64, "base64");
      const key = Buffer.from(process.env.CERT_PEM_KEY_BASE64, "base64");
      
      // Verificar se são realmente PEM (contêm BEGIN markers)
      const certStr = cert.toString();
      const keyStr = key.toString();
      
      if (!certStr.includes('-----BEGIN CERTIFICATE-----') || 
          !keyStr.includes('-----BEGIN ')) {
        console.warn('⚠️  Os dados base64 podem não estar em formato PEM válido');
      }
      
      console.log('✅ Certificado PEM base64 carregado');
      return { cert, key };
    } catch (e) {
      console.error("❌ ERRO: CERT_PEM_*_BASE64 inválido:", e.message);
    }
  }

  // -----------------------------
  // 4) FALLBACK: Tentar o método antigo (pfx buffer) se tudo falhar
  // -----------------------------
  console.log('⚠️  Todos os métodos com node-forge falharam, tentando fallback...');
  
  if (process.env.CERT_PFX_BASE64) {
    try {
      const buf = Buffer.from(process.env.CERT_PFX_BASE64, "base64");
      if (buf.length > 0) {
        console.log('⚠️  Usando PFX buffer diretamente (pode falhar no Vercel)');
        return { pfx: buf, senha };
      }
    } catch (e) {
      console.error("❌ ERRO no fallback PFX:", e.message);
    }
  }

  // -----------------------------
  // 5) NADA ENCONTRADO
  // -----------------------------
  console.error('❌ Nenhum certificado pôde ser carregado');
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
      
      console.log('🔧 Carregando certificado...');
      const certOptions = await getCertOptions(SENHA_CERT, path.resolve("./GTO COMERCIO 2025-2026.pfx"));

      if (!certOptions) {
        return res.status(500).json({
          error: 'Não foi possível carregar o certificado. Verifique as variáveis de ambiente ou o arquivo local.'
        });
      }
      
      // Detectar SO para usar os caminhos corretos (para xmllint apenas)
      const isWindows = process.platform === 'win32';
      const xmllintPath = isWindows ? path.resolve("./libs/libxml/bin/xmllint.exe") : "xmllint";
      
      // IMPORTANTE: Não usamos mais o binário openssl diretamente
      // Apenas configuramos para o caso do Tools ainda precisar
      const opensslPath = isWindows ? path.resolve("./libs/openssl/bin/openssl.exe") : "/usr/bin/openssl";
      
      // Limpar variáveis de OpenSSL que possam causar conflitos
      if (!isWindows) {
        delete process.env.OPENSSL_MODULES;
        delete process.env.OPENSSL_CONF;
      }
      
      console.log('✅ Certificado carregado. Criando configuração Tools...');
      const toolsConfig = {
        mod: mod,
        tpAmb: tpAmb,
        UF: String(uf),
        versao: "4.00",
        timeout: 180000,
        CSC: csc,
        CSCid: cscId,
        xmllint: xmllintPath,
        openssl: opensslPath, // Ainda configurado, mas o Tools deve usar cert/key direto
      };
      
      console.log('🔧 Inicializando Tools com certificado...');
      console.log('Tipo do certificado:', certOptions.pfx ? 'PFX' : 'PEM (cert+key)');
      
      const tools = new Tools(toolsConfig, certOptions);
      
      console.log('🌐 Consultando status SEFAZ para chave:', chave);
      console.log('UF:', uf, '| Ambiente:', tpAmb === 1 ? 'Produção' : 'Homologação');
      
      const resposta = await tools.sefazStatus(chave).catch(err => {
        console.error('❌ Erro ao consultar status da SEFAZ:', err.message);
        console.error('Tipo de erro:', err.constructor.name);
        
        // Log adicional para erros de certificado
        if (err.message.includes('certificate') || err.message.includes('certificado')) {
          console.error('⚠️  Possível problema com o certificado:');
          console.error('- Certificado carregado como:', certOptions.cert ? 'PEM' : 'PFX');
          if (certOptions.cert) {
            const certStr = certOptions.cert.toString();
            console.error('- Tamanho do cert:', certOptions.cert.length, 'bytes');
            console.error('- Começo do cert:', certStr.substring(0, 100));
          }
        }
        
        throw err;
      });
      
      console.log('✅ Consulta SEFAZ realizada com sucesso');
      console.log('📦 Resposta recebida:', resposta ? 'Dados disponíveis' : 'Vazia');

      return res.json({
        vendaData,
        xml: resposta
      });
    } catch (error) {
      console.error('❌ Erro completo no controller:');
      console.error('Mensagem:', error.message);
      console.error('Stack:', error.stack);
      
      // Informações adicionais para diagnóstico
      console.error('--- DIAGNÓSTICO ---');
      console.error('Node.js version:', process.version);
      console.error('Platform:', process.platform, process.arch);
      console.error('OpenSSL version (via process):', process.versions.openssl);
      
      return res.status(500).json({ 
        error: error.message || 'Erro ao consultar venda ou gerar XML',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
}

export default new ConsultaStatusNfeController();