import app from './index.js';
import swaggerAutogen from 'swagger-autogen';

const doc = {
  
  info: {
    version: '1.0.0',
    title: 'API SOFQUALITY',
    description: 'Descrição da API SOFQUALITY',
  },
  definitions: {
    Funcionario: {
      $ID: 22824,
      $IDFUNCIONARIO: 22824,
      $IDGRUPOEMPRESARIAL: 1,
      $IDSUBGRUPOEMPRESARIAL: 1,
      $IDEMPRESA: 1,
      $NOFUNCIONARIO: "ADANEUZA MARIA DE MORAIS DINIZ",
      $IDPERFIL: 0,
      $NUCPF: "70201250420",
      $NOLOGIN: "22824",
      $PWSENHA: "",
      $DSFUNCAO: "Financeiro",
      $DTULTALTERACAO: "2023-07-06 10:07:41",
      $VALORSALARIO: "0.00",
      $DATA_DEMISSAO: null,
      $PERC: "20.00",
      $STATIVO: "True",
      $PERCDESCPDV: "0.00",
      $DSTIPO: "PN",
      $VALORDISPONIVEL: "0.00",
      $DTINICIODESC: "2021-01-01 12:01:00",
      $DTFIMDESC: "2050-12-31 12:12:00",
      $PERCDESCUSUAUTORIZADO: "0.00"
    },
    Loja: {
      $IDEMPRESA: 1,
      $STGRUPOEMPRESARIAL: 1,
      $IDGRUPOEMPRESARIAL: 1,
      $IDSUBGRUPOEMPRESARIAL: 1,
      $NORAZAOSOCIAL: "Gto Comercio Atacadista De Confec E Calçados Ltda",
      $NOFANTASIA: "0001 - TO - Recanto 1 Matriz",
      $NUCNPJ: "36769602000155",
      $NUINSCESTADUAL: "0733785500180",
      $NUINSCMUNICIPAL: "",
      $CNAE: "4781400",
      $EENDERECO: "Qd 103, Comercial Local S/N, Lt 01",
      $ECOMPLEMENTO: "",
      $EBAIRRO: "Recanto Das Emas",
      $ECIDADE: "Brasília",
      $SGUF: "DF",
      $NUUF: 53,
      $NUCEP: "72600329",
      $NUIBGE: "5300108",
      $EEMAILPRINCIPAL: "to001@tesouradeouro.com.br",
      $EEMAILCOMERCIAL: "",
      $EEMAILFINANCEIRO: "",
      $EEMAILCONTABILIDADE: "",
      $NUTELPUBLICO: "",
      $NUTELCOMERCIAL: "",
      $NUTELFINANCEIRO: "",
      $NUTELGERENCIA: "",
      $EURL: "",
      $PATHIMG: "",
      $NUCNAE: "4781400",
      $STECOMMERCE: "False",
      $DTULTATUALIZACAO: "2021-08-31 00:00:00",
      $STATIVO: "True",
      $ALIQPIS: "1.65",
      $ALIQCOFINS: "7.60"
    },
    Marca: {
      $IDGRUPOEMPRESARIAL: 1,
      $DSGRUPOEMPRESARIAL: "TO - TESOURA DE OURO",
      $STATIVO: "True"
    }
  },
 
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./swagger/endpoints.js'];

swaggerAutogen({openapi: '3.0.0'})(outputFile, endpointsFiles, doc);

