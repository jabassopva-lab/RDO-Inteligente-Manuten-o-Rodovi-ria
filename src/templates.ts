export interface Template {
  name: string;
  description: string;
  category: "Pavimentação" | "Tapa-Buraco" | "Conservação";
  rawText: string;
}

export const RDO_TEMPLATES: Template[] = [
  {
    name: "CBUQ Rodovia SP-070",
    description: "Recapeamento de pista com espessura 3,0 cm, mistura de Ton e Kg, sentidos omitidos, e nomes brutos de encarregados.",
    category: "Pavimentação",
    rawText: `APONTAMENTO DE CAMPO - DIA 12/06/2026
OBRA: Conservação Especial Rodovia SP-070 (Rod. Ayrton Senna) - KM 12 ao 18.
Subtrecho 01 - Recapeamento de Pista de Rolamento em CBUQ Faixa 1.
Encarregado de Pavimentação: Jose Carlos da Silva
Apontador Geral: Marcos Antonio de Souza

Efetivo:
1 Encarregado de pavimentação Jose Carlos da Silva
1 Apontador geral Marcos Antonio de Souza
2 Operadores de Vibroacabadora (Kleber e Valdir)
3 Operadores de Rolo de Chapa (Antenor, Francisco, Luis)
2 Operadores de Rolo de Pneus (Geraldo, Carlos)
8 Rasteleiros e Serventes de pista

Equipamentos:
1 Vibroacabadora Caterpillar AP1055 (em operação)
1 Rolo Compactador de Chapa Hamm HD90 (em operação)
1 Rolo Compactador de Pneus Dynapac CP221 (em operação)
1 Rolo Compactador Tandem Hamm HD14 (à disposição)
1 Caminhão Espargidor Mercedes-Benz 1718 (em operação)

Produção da Pavimentação:
Pano 1: Est. 210 a 212 - Custo 40 x 3,2 x 003B - Sentido Sul
Pano 2: Est. 212 a 215 - Custo 60 x 3,5 x 003 B - Sentido Sul
Pano 3: Est. 215 a 218 - Custo 65 x 3,2 x x003B
Pano 4: Est. 220 a 221 - Custo 20 x 3,0 x 003B - Sentido Norte
Pano 5: Est. 221 a 224 - Custo 60 x 3,2 x 003 B

Massa Asfáltica CBUQ Recebida da Usina:
- Nota Fiscal Nº 24590: 14.430.00. Ton
- Nota Fiscal Nº 24591: 13 .440.00 .Ton
- Nota Fiscal Nº 24592: 12.130,00 Kg
Totalizando carregamento do dia.`
  },
  {
    name: "Tapa-Buraco Rodoanel",
    description: "Operação tapa-buraco emergencial com panos dispersos de diferentes larguras e massas com erros grosseiros de digitação de unidades.",
    category: "Tapa-Buraco",
    rawText: `DIÁRIO DE OBRAS - CONTRATO RODOANEL OESTE
DATA: 12 de Junho de 2026
OBRA: Recuperação de Pavimento Rodoanel Mário Covas - Km 14 ao 22
Encarregado de Equipe: Wanderley dos Santos
Apontador Técnico: Carlos Alberto de Oliveira

RECURSOS HUMANOS:
- Wanderley dos Santos (Encarregado)
- Carlos Alberto de Oliveira (Apontador)
- 4 Serventes de pavimentação
- 2 Motoristas de Basculante
- 1 Operador de caminhão espargidor

MÁQUINAS:
- 1 Caminhão Basculante VW 24.250 (em operação)
- 1 Mini Vibroacabadora Ammann (à disposição)
- 1 Rolo de Chapa Dynapac CC1200 (em operação)
- 1 Rompedor Hidráulico Atlas Copco (à disposição)

APONTAMENTO DOS PANOS EXECUTADOS:
Pano T1: Km 14+300 - Faustolo 5 x 2.2 x 003B - Sentido Oeste
Pano T2: Km 14+450 - Faustolo 8 x 3.0 x 003 B - Sentido Oeste
Pano T3: Km 15+110 - Faustolo 15 x 3.1 x 003B
Pano T4: Km 18+200 - Faustolo 12 x 2.0 x 003B - Sentido Leste
Pano T5: Km 18+350 - Faustolo 6 x 1.8 x 003 B

MASSA EXECUTADA:
Massa asfalto CBUQ entregue no caminhão 01: 9.870.00. Ton
Massa entregue no caminhão 02: 8 . 120 .00. Ton
Massa complementar: 1.550,00 kg
Nota: Trânsito estava pesado na SP-270 o que atrasou a descarga.`
  },
  {
    name: "SP-300 Conservação (Erros)",
    description: "Mensagem extremamente caótica enviada por WhatsApp pelo apontador de campo, cheia de abreviações e erros ortográficos.",
    category: "Conservação",
    rawText: `Rodovia SP-300 Marechal Rondon - RDO DO DIA 12/06
apontador do dia robson de oliveira
Encarregado do asfarto marcos antonio silva

pessoal de hj:
1 encarregado marcos antonio silva
1 apontador robson de oliveira
2 operador de maquinas: kleber lima e felipe dias
4 caras de pista ajudantes

maquinas em pista:
1 rolo ham hm12 (operando)
1 caminhonao espargidor (operando)
1 mini carregadeira (à disposicao)

panos de hj:
pano a: KM 112 ao 113 - 100 x 3.2 x 003B - Norte
pano b: KM 113 ao 115 - 150 x 3.5 x 003 B - Norte
pano c: KM 115 ao 117 - 80 x 3.2 x x003B
pano d: KM 118 ao 120 - 70 x 3.0 x 003B - Sul
pano e: KM 120 ao 122 - 120 x 3.2 x 003 B

massa que chego da usina:
massa NF 982: 24 . 500 . 00 . TON (pesagem de balança)
massa NF 983: 22.800.00. Ton (pesagem de balança)
massa NF 984: 5.400,00 Kg (pesagem de balança)
Total asfalto recebido.`
  }
];
