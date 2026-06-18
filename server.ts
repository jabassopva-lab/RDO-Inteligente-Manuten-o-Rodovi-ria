import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Set up Google GenAI inside a safe getter to prevent startup crashes when GEMINI_API_KEY is missing.
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("A chave do Google Gemini API (GEMINI_API_KEY) não foi detectada. Verifique suas configurações.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Resilient helper to execute content generation with exponential retry and alternative capacity pool model fallback if primary is congested (503 / 429)
async function generateContentWithRetry(params: any, maxRetries = 3, initialDelay = 1000): Promise<any> {
  const client = getGeminiClient();
  let attempt = 0;
  let currentModel = params.model || "gemini-3.5-flash";

  while (true) {
    try {
      console.log(`[Gemini API] Iniciando chamada com modelo: ${currentModel} (tentativa ${attempt + 1}/${maxRetries})`);
      return await client.models.generateContent({
        ...params,
        model: currentModel
      });
    } catch (error: any) {
      attempt++;
      const errorMessage = error?.message || String(error);
      const isTransient = 
        errorMessage.includes("503") || 
        errorMessage.includes("high demand") || 
        errorMessage.includes("UNAVAILABLE") || 
        errorMessage.includes("RESOURCE_EXHAUSTED") ||
        errorMessage.includes("429") ||
        error?.status === "UNAVAILABLE" ||
        error?.status === 503;

      if (isTransient) {
        if (attempt < maxRetries) {
          const delay = initialDelay * Math.pow(2.2, attempt - 1);
          console.warn(`[Gemini API] Falha temporária com ${currentModel}. Retentando em ${Math.round(delay)}ms... Erro:`, errorMessage);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        } else if (currentModel === "gemini-3.5-flash") {
          // If gemini-3.5-flash is consistently overloaded, failover to gemini-3.1-flash-lite (separate capacity pool)
          console.warn(`[Gemini API] Todas as ${maxRetries} tentativas com gemini-3.5-flash falharam com erro temporário. Ativando fallback alternativo para gemini-3.1-flash-lite...`);
          currentModel = "gemini-3.1-flash-lite";
          attempt = 0; // reset attempts for the fallback model
          await new Promise((resolve) => setTimeout(resolve, 500)); // small grace pause
          continue;
        }
      }
      throw error;
    }
  }
}

app.use(express.json({ limit: '10mb' }));

// Health Check API
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Main AI processing endpoint
app.post("/api/process-rdo", async (req, res) => {
  const { rawText } = req.body;

  if (!rawText || typeof rawText !== "string") {
    return res.status(400).json({ error: "O texto bruto do apontamento é obrigatório." });
  }

  try {
    const prompt = `
      Analise o relato bruto de campo (apontamento de pavimentação/tapa-buracos rodoviário) fornecido abaixo e produza uma auditoria estruturada de Relatório Diário de Obra (RDO) de acordo com regras de engenharia civil rígidas:

      Texto Bruto do Apontamento:
      """
      ${rawText}
      """

      INSTRUÇÕES E REGRAS RÍGIDAS DE NEGÓCIO:

      1. Saneamento de Massa Asfáltica (Unidades):
         - Identifique erros de digitação comuns de massa asfáltica (Ex: "14.430.00. Ton" quer dizer 14.430,00 kg ou 14.43 Toneladas, baseado no limite físico de cargas de caminhões de asfalto normais de 12 a 15 Toneladas por viagem).
         - Sempre converta os valores de massa para KG (valores inteiros) e para Toneladas.
         - Liste individualmente cada nota fiscal ou registro de massa asfáltica encontrado, mostrando o valor bruto interpretado, o valor final saneado em kg/tons e o status de auditoria de cada item.

      2. Memória de Cálculo Geométrico (Produção):
         - Para cada "Pano" ou "Pano de massa" executado (comprimento, largura e espessura):
           * Símbolos ou sufixos como "003B", "003 B", "x003B", etc., devem ser estritamente interpretados como espessura de projeto de 0.03 metros (3,0 cm). Outros valores como "004B" seriam 0.04m, etc.
           * Calcule para cada pano: Área (m²) = Comprimento * Largura.
           * Calcule para cada pano: Volume (m³) = Área * Espessura (Ex: Espessura de 3cm é 0.03).
           * ATENÇÃO CRÍTICA A ESPAÇAMENTOS E ERROS DE DIGITAÇÃO NAS DIMENSÕES: Apontadores de campo digitam dimensões de forma descuidada (ex: '1 80 X1 .60' ou '1 .80 X 1.6' ou '1,80x1,60'). Interprete e normalize isso para valores numéricos corretos (ex: comprimento = 1.80 e largura = 1.60). Trate espaços flutuantes ou pontos decimais incorretamente posicionados com inteligência técnica para manter a integridade dos dados reais de campo.
         - Se o "Sentido" (Norte / Sul) de algum dos panos for omitido pelo apontador, utilize inferência lógica e contextual com base nos panos anteriores ou posteriores que estejam no mesmo subtrecho para atribuir o Sentido correto.
         - Agrupe e organize a listagem de produção dividida estritamente por Sentido (ex: todos Pista Sul primeiro, depois todos Pista Norte, ou vice-versa).
         - Retorne se o sentido foi inferido (inferred: true/false).

      3. Recursos Humanos (Efetivo) e Equipamentos:
         - Identifique os nomes dos Encarregados e Apontadores explicitamente informados de forma bruta. Formate-os de modo a constar a função desejada e os nomes entre parênteses logo ao lado de sua função, ex: "Encarregado de Pavimentação (José Carlos da Silva)".
         - Extraia a lista completa de pessoal com suas contagens.
         - Liste todos os equipamentos pesados em uso ou à disposição. Se houver observações como "(à disposição)" ou "(em operação)", mantenha exatamente como descrito na nota final.

      4. Ocorrências / Eventos Imprevistos:
         - Identifique qualquer ocorrência, imprevisto, atraso, paralisação ou evento que tenha prejudicado ou impossibilitado a execução das atividades de campo (ex: equipamentos quebrados, intempéries do tempo/chuva, falta de efetivo/pessoal, atrasos de asfalto, incidentes).
         - Para cada ocorrência, determine o tipo correspondente ("Equipamento Quebrado", "Intempéries do Tempo", "Falta de Efetivo", "Atraso no Fornecimento", "Outros") e uma descrição clara da situação.

      5. Cálculo de Indicadores de Performance (KPIs) de Engenharia:
         - Total de Panos: Contagem exata de panos.
         - Área Total (m²): Somatório de todas as áreas (m²).
         - Volume Total (m³): Somatório de todos os volumes (m³).
         - Massa Total Aplicada (kg): Somatório das massas após saneamento de unidades.
         - Consumo Médio (kg/m²): Massa Total Aplicada (kg) / Área Total (m²).
         - Consumo Teórico de Referência: Para asfalto CBUQ/Concreto Asfáltico, a densidade teórica compactada gira em torno de 2.400 kg/m³ (2,4 t/m³). Com espessura de 0.03m (3cm), o consumo padrão teórico é de aproximadamente 72 kg/m² (0.03 * 2400).
          - Desvio percentual do Consumo Real vs. Teórico.

      6. Parecer de Auditoria Técnica:
         - Descreva de forma técnica e formal os desvios corrigidos de massa asfáltica.
         - Explique as inferências lógicas efetuadas nos sentidos dos panos (quais panos estavam sem sentido e por que foram classificados como Norte/Sul).
         - Emita um parecer técnico comentando o Consumo Médio Calculado. Explique se está dentro da conformidade esperada (ex: se o consumo médio for muito menor que 72 kg/m² para espessura de 3cm, indique "Alerta de Subespessura ou Compactação Insuficiente"; se for muito superior, indique "Alerta de Superespessura ou Desperdício de Massa").

      7. Extração de Data do RDO:
         - Recupere a data em que o diário de obra foi executado (formato DD/MM/AAAA) a partir do texto fornecido. Se houver dia e mês mas não ano, assuma o ano corrente (2026). Se a data não for fornecida no texto brutos, use string vazia para que o sistema use o valor padrão.

       Sua resposta JSON DEVE seguir estritamente o esquema responseSchema fornecido para garantir conformidade técnica.
    `;

    const response = await generateContentWithRetry({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["title", "obra", "date", "panos", "massaAsfaltica", "efetivo", "equipamentos", "ocorrencias", "kpis", "auditoria", "markdownReport"],
          properties: {
            title: { type: Type.STRING, description: "Título do Relatório Diário de Obra (RDO), ex: RDO SP-070 Ayrton Senna 12/06/2026" },
            obra: { type: Type.STRING, description: "Nome/Descrição da Obra" },
            date: { type: Type.STRING, description: "Data de execução do RDO no formato DD/MM/AAAA extraída do texto (ex: 17/06/2026). Caso não seja identificável, envie string vazia para manter compatibilidade." },
            panos: {
              type: Type.ARRAY,
              description: "Lista de todos os Panos calculados, obrigatoriamente ordenados/organizados por Sentido",
              items: {
                type: Type.OBJECT,
                required: ["id", "segmento", "comprimento", "largura", "espessuraNum", "espessuraString", "sentidoCalculado", "sentidoOriginal", "sentidoInferido", "area", "volume"],
                properties: {
                  id: { type: Type.STRING },
                  segmento: { type: Type.STRING, description: "Ex: Estaca 210 a 212" },
                  comprimento: { type: Type.NUMBER },
                  largura: { type: Type.NUMBER },
                  espessuraNum: { type: Type.NUMBER, description: "Valor em metros, ex: 0.03" },
                  espessuraString: { type: Type.STRING, description: "Identificação bruta de espessura de projeto, ex: 003B" },
                  sentidoCalculado: { type: Type.STRING, description: "Norte ou Sul" },
                  sentidoOriginal: { type: Type.STRING, description: "Sentido conforme enviado originalmente, ou vazio" },
                  sentidoInferido: { type: Type.BOOLEAN, description: "Se o sentido foi inferido no pós-processamento" },
                  area: { type: Type.NUMBER, description: "Comprimento * Largura em m²" },
                  volume: { type: Type.NUMBER, description: "Area * Espessura em m³" }
                }
              }
            },
            massaAsfaltica: {
              type: Type.OBJECT,
              required: ["itens", "massaTotalKg", "massaTotalTons"],
              properties: {
                itens: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    required: ["identificador", "valorOriginal", "valorSaneadoKg", "valorSaneadoTons", "observacaoSaneamento"],
                    properties: {
                      identificador: { type: Type.STRING, description: "Ex: NF 24590 ou Ticket 01" },
                      valorOriginal: { type: Type.STRING, description: "Ex: 14.430.00. Ton" },
                      valorSaneadoKg: { type: Type.NUMBER, description: "Valor asfáltico convertido em kg" },
                      valorSaneadoTons: { type: Type.NUMBER, description: "Valor asfáltico convertido em toneladas" },
                      observacaoSaneamento: { type: Type.STRING, description: "Explicação técnica da conversão de digitação" }
                    }
                  }
                },
                massaTotalKg: { type: Type.NUMBER },
                massaTotalTons: { type: Type.NUMBER }
              }
            },
            efetivo: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["funcao", "nomesFormatados", "quantidade"],
                properties: {
                  funcao: { type: Type.STRING, description: "Ex: Encarregado de pavimentação" },
                  nomesFormatados: { type: Type.STRING, description: "Ex: (José Carlos da Silva) se houver nome, ou vazio" },
                  quantidade: { type: Type.INTEGER }
                }
              }
            },
            equipamentos: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["nome", "quantidade", "status"],
                properties: {
                  nome: { type: Type.STRING, description: "Ex: Vibroacabadora Caterpillar AP1055" },
                  quantidade: { type: Type.INTEGER },
                  status: { type: Type.STRING, description: "Ex: em operação, à disposição" }
                }
              }
            },
            ocorrencias: {
              type: Type.ARRAY,
              description: "Ocorrências relatadas que prejudicaram ou impediram os trabalhos",
              items: {
                type: Type.OBJECT,
                required: ["tipo", "descricao"],
                properties: {
                  tipo: { type: Type.STRING, description: "Tipo de imprevisto, ex: Equipamento Quebrado, Intempéries do Tempo, Falta de Efetivo, Atraso no Fornecimento, Outros" },
                  descricao: { type: Type.STRING }
                }
              }
            },
            kpis: {
              type: Type.OBJECT,
              required: ["totalPanos", "areaTotal", "volumeTotal", "massaTotalKg", "consumoMedioReal", "consumoTeoricoReferencia", "desvioConsumoPercentual"],
              properties: {
                totalPanos: { type: Type.INTEGER },
                areaTotal: { type: Type.NUMBER },
                volumeTotal: { type: Type.NUMBER },
                massaTotalKg: { type: Type.NUMBER },
                consumoMedioReal: { type: Type.NUMBER, description: "Massa total em kg dividida pela Área total em m²" },
                consumoTeoricoReferencia: { type: Type.NUMBER, description: "Consumo padrão, ex: 72" },
                desvioConsumoPercentual: { type: Type.NUMBER, description: "((Real - Teórico) / Teórico) * 100" }
              }
            },
            auditoria: {
              type: Type.OBJECT,
              required: ["conclusoes", "diagnosticoConsumo", "sentidoInferidosJustificativa", "statusGeralAuditoria"],
              properties: {
                conclusoes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista de observações de saneamento ou cálculos corrigidos" },
                diagnosticoConsumo: { type: Type.STRING, description: "Laudo técnico sobre o consumo médio real" },
                sentidoInferidosJustificativa: { type: Type.STRING, description: "Justificativa lógica por trás do preenchimento de sentidos omitidos" },
                statusGeralAuditoria: { type: Type.STRING, description: "Ex: Conforme, Aprovado com Ressalvas, Inconsistente" }
              }
            },
            markdownReport: {
              type: Type.STRING,
              description: "Relatório RDO completo formatado em Markdown profissional com tabelas e cabeçalhos formais"
            }
          }
        }
      }
    });

    let rawResponseText = response.text;
    if (!rawResponseText) {
      throw new Error("O modelo não retornou nenhum texto.");
    }

    // Clean up any potential markdown formatting block wrappers
    rawResponseText = rawResponseText.trim();
    if (rawResponseText.startsWith("```")) {
      rawResponseText = rawResponseText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    }

    const parsedData = JSON.parse(rawResponseText);

    // ----------------------------------------------------------------------
    // MATHEMATICAL COMPLIANCE LAYER: Recalculate everything programmatically!
    // To solve any AI hallucination or spreadsheet discrepancy, we enforce
    // 100% strict, double-precision engineering math on all panos and KPIs.
    // ----------------------------------------------------------------------
    if (parsedData && parsedData.panos && Array.isArray(parsedData.panos)) {
      parsedData.panos = parsedData.panos.map((p: any) => {
        const comp = typeof p.comprimento === "number" ? p.comprimento : (parseFloat(String(p.comprimento || 0)) || 0);
        const larg = typeof p.largura === "number" ? p.largura : (parseFloat(String(p.largura || 0)) || 0);
        const esp = typeof p.espessuraNum === "number" ? p.espessuraNum : (parseFloat(String(p.espessuraNum || 0.03)) || 0.03);
        
        // Compute area and volume to exactly 3 decimal places to support high-precision engineering math
        const area = Number((comp * larg).toFixed(3));
        const volume = Number((area * esp).toFixed(3));

        return {
          ...p,
          comprimento: comp,
          largura: larg,
          espessuraNum: esp,
          area: area,
          volume: volume
        };
      });

      // Programmatically sum and compute KPIs with absolute mathematical precision
      const totalPanos = parsedData.panos.length;
      const areaTotal = Number(parsedData.panos.reduce((acc: number, p: any) => acc + p.area, 0).toFixed(3));
      const volumeTotal = Number(parsedData.panos.reduce((acc: number, p: any) => acc + p.volume, 0).toFixed(3));
      
      let massaTotalKg = 0;
      if (parsedData.massaAsfaltica && Array.isArray(parsedData.massaAsfaltica.itens)) {
        massaTotalKg = parsedData.massaAsfaltica.itens.reduce((acc: number, item: any) => {
          return acc + (typeof item.valorSaneadoKg === "number" ? item.valorSaneadoKg : (parseFloat(String(item.valorSaneadoKg || 0)) || 0));
        }, 0);
        parsedData.massaAsfaltica.massaTotalKg = massaTotalKg;
        parsedData.massaAsfaltica.massaTotalTons = Number((massaTotalKg / 1000).toFixed(3));
      } else {
        massaTotalKg = typeof parsedData.massaAsfaltica?.massaTotalKg === "number"
          ? parsedData.massaAsfaltica.massaTotalKg
          : (parseFloat(String(parsedData.massaAsfaltica?.massaTotalKg || 0)) || 0);
      }

      const consumoMedioReal = areaTotal > 0 ? Number((massaTotalKg / areaTotal).toFixed(3)) : 0;
      const consumoTeoricoReferencia = typeof parsedData.kpis?.consumoTeoricoReferencia === "number" 
        ? parsedData.kpis.consumoTeoricoReferencia 
        : 72; // Standard default 72 kg/m² for 3cm thickness

      const desvioConsumoPercentual = consumoTeoricoReferencia > 0 
        ? Number((((consumoMedioReal - consumoTeoricoReferencia) / consumoTeoricoReferencia) * 100).toFixed(3))
        : 0;

      parsedData.kpis = {
        totalPanos,
        areaTotal,
        volumeTotal,
        massaTotalKg,
        consumoMedioReal,
        consumoTeoricoReferencia,
        desvioConsumoPercentual
      };
    }

    if (!parsedData.ocorrencias || !Array.isArray(parsedData.ocorrencias)) {
      parsedData.ocorrencias = [];
    }

    return res.json(parsedData);
  } catch (error: any) {
    console.error("Erro no processamento da IA:", error);
    return res.status(500).json({ error: "Erro interno ao processar o RDO com Inteligência Artificial: " + error.message });
  }
});

// Setup Vite client environment
async function start() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Iniciando Vite em modo desenvolvimento...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Iniciando servidor em modo produção...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor SaaS RDO Inteligente rodando na porta ${PORT}`);
  });
}

start();
