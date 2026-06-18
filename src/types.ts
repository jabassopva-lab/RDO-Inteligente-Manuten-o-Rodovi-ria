export interface PanoItem {
  id: string;
  segmento: string;
  comprimento: number;
  largura: number;
  espessuraNum: number;
  espessuraString: string;
  sentidoCalculado: string;
  sentidoOriginal: string;
  sentidoInferido: boolean;
  area: number;
  volume: number;
}

export interface MassaItem {
  identificador: string;
  valorOriginal: string;
  valorSaneadoKg: number;
  valorSaneadoTons: number;
  observacaoSaneamento: string;
}

export interface MassaAsfaltica {
  itens: MassaItem[];
  massaTotalKg: number;
  massaTotalTons: number;
}

export interface EfetivoItem {
  funcao: string;
  nomesFormatados: string;
  quantidade: number;
}

export interface EquipamentoItem {
  nome: string;
  quantidade: number;
  status: string;
}

export interface Kpis {
  totalPanos: number;
  areaTotal: number;
  volumeTotal: number;
  massaTotalKg: number;
  consumoMedioReal: number;
  consumoTeoricoReferencia: number;
  desvioConsumoPercentual: number;
}

export interface Auditoria {
  conclusoes: string[];
  diagnosticoConsumo: string;
  sentidoInferidosJustificativa: string;
  statusGeralAuditoria: string;
}

export interface FotoItem {
  id: string;
  url: string;
  caption?: string;
}

export interface OcorrenciaItem {
  id?: string;
  tipo: string;
  descricao: string;
}

export interface RdoResponse {
  title: string;
  obra: string;
  date?: string;
  rdoNumber?: number;
  panos: PanoItem[];
  massaAsfaltica: MassaAsfaltica;
  efetivo: EfetivoItem[];
  equipamentos: EquipamentoItem[];
  ocorrencias?: OcorrenciaItem[];
  kpis: Kpis;
  auditoria: Auditoria;
  markdownReport: string;
  fotos?: FotoItem[];
}
