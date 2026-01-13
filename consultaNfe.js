import fs from "fs";
import path from "path";
import https from "https";
import soap from "soap";
const PASTA_RESULTADOS = "./python_notas/resultados";
const LOG_DIR = "./python_notas/consulta_nfe/log";
const SENHA = "#senhagto2024#";

// Cria pastas
fs.mkdirSync(PASTA_RESULTADOS, { recursive: true });
fs.mkdirSync(LOG_DIR, { recursive: true });

// ----------------- Endpoints UF ----------------- //
const ENDPOINTS = {
  DF: "https://nfe.fazenda.df.gov.br/NFeConsulta/NFeConsulta2.asmx",
  GO: "https://nfe.sefaz.go.gov.br/nfe/services/NFeConsultaProtocolo4",
  MG: "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeConsultaProtocolo4",
  RS: "https://nfe.sefaz.rs.gov.br/ws/nfeconsulta/NfeConsulta.asmx?WSDL",
  SP: "https://nfe.fazenda.sp.gov.br/ws/NfeConsultaProtocolo4.asmx"
};


// ----------------- Consulta NFe ----------------- //
async function consultarNFe(UF, chave) {
  const endpoint = ENDPOINTS[UF.toUpperCase()];
  if (!endpoint) throw new Error(`UF ${UF} não possui endpoint configurado`);

  const xmlEnvelope = `
  <?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <soap:Body>
    <nfe:consSitNFe xmlns:nfe="http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4" versao="4.00">
      <tpAmb>1</tpAmb>
      <xServ>CONSULTAR</xServ>
      <chNFe>${chave}</chNFe>
    </nfe:consSitNFe>
  </soap:Body>
</soap:Envelope>
`;


  const options = {
    key: fs.readFileSync("chave.pem"),
    cert: fs.readFileSync("cert.pem"),
    passphrase: SENHA,
    method: "POST",
    secureProtocol: "TLSv1_2_method",
    headers: {
      "Content-Type": "application/soap+xml; charset=utf-8",
      "SOAPAction": "https://www.portalfiscal.inf.br/nfe/wsdl/NFeConsulta/NFeConsulta2"

    }
  };


  const req = https.request("https://www.portalfiscal.inf.br/nfe/wsdl/NFeConsulta/NFeConsulta2", options, (res) => {
    let data = "";
    res.on("data", chunk => data += chunk);
    res.on("end", () => console.log(data));
  });

  req.on("error", console.error);
  req.write("<XML_ENVELOPE_DA_CONSULTA>");
  req.end();

  return new Promise((resolve, reject) => {
    const req = https.request(endpoint, options, res => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.write(xmlEnvelope);
    req.end();
  });
}
