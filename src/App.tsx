import React, { useState, useEffect } from "react";
import { 
  HardHat, 
  Sparkles, 
  FileText, 
  Users, 
  Wrench, 
  Layers, 
  Copy, 
  Building, 
  HelpCircle, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Clock, 
  ArrowRight, 
  Trash2, 
  Plus, 
  Edit3, 
  Save, 
  Scale, 
  Compass, 
  Info,
  Calendar,
  Printer,
  ExternalLink,
  Camera,
  UploadCloud,
  X,
  ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { RDO_TEMPLATES, Template } from "./templates";
import { RdoResponse, PanoItem, EfetivoItem, EquipamentoItem } from "./types";

export default function App() {
  const isPrintPage = typeof window !== 'undefined' && window.location.search.includes("print=true");
  const isPrintAccumulatedPage = typeof window !== 'undefined' && window.location.search.includes("printAccumulated=true");
  const [printData, setPrintData] = useState<RdoResponse | null>(null);
  const [printAccumulatedData, setPrintAccumulatedData] = useState<any[]>([]);
  const [isLocalPrintAccumulatedActive, setIsLocalPrintAccumulatedActive] = useState<boolean>(false);

  const [activeTemplateIdx, setActiveTemplateIdx] = useState<number>(0);
  const [rawText, setRawText] = useState<string>(RDO_TEMPLATES[0].rawText);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processStep, setProcessStep] = useState<string>("");
  const [rdoData, setRdoData] = useState<RdoResponse | null>(null);
  const [selectedTab, setSelectedTab] = useState<"overview" | "geometry" | "resources" | "ocorrencias" | "markdown" | "fotos">("overview");
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // States for occurrences logic
  const [newOcorrTipo, setNewOcorrTipo] = useState<string>("Equipamento Quebrado");
  const [newOcorrDesc, setNewOcorrDesc] = useState<string>("");
  const [editingOcorrIdx, setEditingOcorrIdx] = useState<number | null>(null);
  const [tempOcorrTipo, setTempOcorrTipo] = useState<string>("");
  const [tempOcorrDesc, setTempOcorrDesc] = useState<string>("");
  
  // Real-time Editing State for calculations
  const [editingPanoId, setEditingPanoId] = useState<string | null>(null);
  const [tempPanoLengths, setTempPanoLengths] = useState<{ [id: string]: number }>({});
  const [tempPanoWidths, setTempPanoWidths] = useState<{ [id: string]: number }>({});
  
  // Custom manual state additions
  const [newPano, setNewPano] = useState<{ 
    segmento: string, 
    comprimento: number, 
    largura: number, 
    espessura: number, 
    sentido: "Norte" | "Sul" 
  }>({
    segmento: "Est. Nova",
    comprimento: 50,
    largura: 3.2,
    espessura: 0.03,
    sentido: "Sul"
  });

  const [dateStr, setDateStr] = useState<string>("12/06/2026");
  const [rdoNumber, setRdoNumber] = useState<number>(1);

  // Monthly Management Panel State
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [selectedSavedReportId, setSelectedSavedReportId] = useState<string | null>(null);
  const [activeLeftTab, setActiveLeftTab] = useState<"input" | "history">("input");
  const [currentSelectedMonth, setCurrentSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${mm}`;
  });

  const [isPrintOverlayActive, setPrintOverlayActive] = useState<boolean>(false);
  const [isLocalPrintViewActive, setIsLocalPrintViewActive] = useState<boolean>(false);

  // Helper safe storage to protect state against QuotaExceededError
  const safeSaveSavedReports = (updatedList: any[]) => {
    try {
      localStorage.setItem("rdo_saved_reports_v2", JSON.stringify(updatedList));
    } catch (err: any) {
      console.error("Erro ao salvar relatórios no LocalStorage:", err);
      if (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        console.warn("Aviso: Limite do LocalStorage atingido. O histórico local de diários não pôde ser atualizado. No entanto, o diário ativo está na memória e pode ser impresso normalmente.");
      }
    }
  };

  // Load saved reports from LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("rdo_saved_reports_v2");
      if (stored) {
        const parsed = JSON.parse(stored);
        setSavedReports(parsed);
        if (parsed && parsed.length > 0) {
          const maxNum = parsed.reduce((max: number, r: any) => {
            const num = r.rdoNumber || r.data?.rdoNumber || 0;
            return num > max ? num : max;
          }, 0);
          setRdoNumber(maxNum + 1);
        } else {
          setRdoNumber(1);
        }
      }
    } catch (e) {
      console.error("Erro ao carregar histórico local:", e);
    }
  }, []);

  // Load print payload if on print page with window.opener fallback
  useEffect(() => {
    if (isPrintPage) {
      let loadedFromOpener = false;
      if (typeof window !== 'undefined' && window.opener) {
        try {
          const openerData = (window.opener as any).rdo_print_payload_global;
          if (openerData) {
            console.log("Diário carregado via window.opener");
            setPrintData(openerData);
            loadedFromOpener = true;
          }
        } catch (openerErr) {
          console.error("Erro ao ler window.opener para impressão:", openerErr);
        }
      }

      if (!loadedFromOpener) {
        try {
          const payload = localStorage.getItem("rdo_print_payload");
          if (payload) {
            setPrintData(JSON.parse(payload));
          } else {
            // Fallback load latest report if no temporary payload
            const stored = localStorage.getItem("rdo_saved_reports_v2");
            if (stored) {
              const list = JSON.parse(stored);
              if (list.length > 0) {
                setPrintData(list[list.length - 1].data);
              }
            }
          }
        } catch (err) {
          console.error("Erro ao carregar dados de impressão:", err);
        }
      }
    }
  }, [isPrintPage]);

  // Load accumulated print payload with window.opener fallback
  useEffect(() => {
    if (isPrintAccumulatedPage || isLocalPrintAccumulatedActive) {
      let loadedFromOpener = false;
      if (typeof window !== 'undefined' && window.opener) {
        try {
          const openerData = (window.opener as any).rdo_saved_reports_global;
          if (openerData) {
            console.log("Relatórios acumulados carregados via window.opener");
            setPrintAccumulatedData(openerData);
            loadedFromOpener = true;
          }
        } catch (openerErr) {
          console.error("Erro ao ler window.opener para acumulado:", openerErr);
        }
      }

      if (!loadedFromOpener) {
        try {
          const stored = localStorage.getItem("rdo_saved_reports_v2");
          if (stored) {
            setPrintAccumulatedData(JSON.parse(stored));
          }
        } catch (err) {
          console.error("Erro ao carregar dados acumulados de impressão:", err);
        }
      }
    }
  }, [isPrintAccumulatedPage, isLocalPrintAccumulatedActive]);

  // Hook to trigger print automatically
  useEffect(() => {
    if (isPrintPage && printData) {
      const timer = setTimeout(() => {
        window.print();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isPrintPage, printData]);

  // Hook to trigger print automatically for accumulated
  useEffect(() => {
    if (isPrintAccumulatedPage && printAccumulatedData.length > 0) {
      const timer = setTimeout(() => {
        window.print();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isPrintAccumulatedPage, printAccumulatedData]);

  // Synchronize state with window globals for multi-tab print sharing
  useEffect(() => {
    if (typeof window !== 'undefined' && rdoData) {
      (window as any).rdo_print_payload_global = rdoData;
    }
  }, [rdoData]);

  useEffect(() => {
    if (typeof window !== 'undefined' && savedReports) {
      (window as any).rdo_saved_reports_global = savedReports;
    }
  }, [savedReports]);

  // Helper date conversions
  const getHtmlInputDate = (dStr: string) => {
    const parts = dStr.split("/");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
    return "";
  };

  const handleDateChange = (val: string) => {
    if (!val) return;
    const parts = val.split("-");
    if (parts.length === 3) {
      const formatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
      setDateStr(formatted);
      if (rdoData) {
        setRdoData(prev => prev ? { ...prev, date: formatted } : null);
      }
    }
  };

  const isReportInSelectedMonth = (reportDateStr: string, selectedMonthStr: string) => {
    const parts = reportDateStr.split("/");
    if (parts.length === 3) {
      const reportYearMonth = `${parts[2]}-${parts[1].padStart(2, "0")}`;
      return reportYearMonth === selectedMonthStr;
    }
    return false;
  };

  const handleLoadReportFromHistory = (report: any) => {
    setSelectedSavedReportId(report.id);
    setRawText(report.rawText);
    const updatedData = report.data ? { ...report.data, date: report.date || "12/06/2026" } : null;
    if (updatedData) {
      updatedData.rdoNumber = report.rdoNumber || report.data?.rdoNumber || 1;
    }
    setRdoData(updatedData);
    setDateStr(report.date || "12/06/2026");
    setRdoNumber(report.rdoNumber || report.data?.rdoNumber || 1);
    setSelectedTab("overview");
  };

  const handleDeleteReportFromHistory = (id: string) => {
    const updated = savedReports.filter(r => r.id !== id);
    setSavedReports(updated);
    safeSaveSavedReports(updated);
    if (selectedSavedReportId === id) {
      setSelectedSavedReportId(null);
      setRdoData(null);
    }
  };

  const handleManualSaveCurrentReport = () => {
    if (!rdoData) return;
    const newId = "rdo_manual_" + Date.now();
    const formattedTitle = `${rdoData.title} (Cópia - ${new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})})`;
    
    const nextSeq = rdoNumber || 1;
    const dataWithSeq = { ...rdoData, rdoNumber: nextSeq };
    
    const newSaved = {
      id: newId,
      createdAt: new Date().toISOString(),
      title: formattedTitle,
      obra: rdoData.obra || "Trecho Pavimentação",
      date: dateStr,
      rdoNumber: nextSeq,
      rawText,
      data: dataWithSeq
    };

    const updated = [newSaved, ...savedReports];
    setSavedReports(updated);
    safeSaveSavedReports(updated);
    setSelectedSavedReportId(newId);
    setActiveLeftTab("history");
  };

  // Load selected template
  const handleSelectTemplate = (idx: number) => {
    setActiveTemplateIdx(idx);
    setRawText(RDO_TEMPLATES[idx].rawText);
    setError(null);
    setSelectedSavedReportId(null); // Clear history selection upon loading a preset
  };

  // API Call to process RDO
  const handleProcessRDO = async (forceSaveAsNew: boolean = false) => {
    setIsProcessing(true);
    setRdoData(null);
    setEditingPanoId(null);
    setError(null);

    // Dynamic cute engineering logs
    const steps = [
      "Iniciando Módulo de Saneamento RDO...",
      "Processando Unidades de Massa Asfáltica (Ton vs Kg)...",
      "Calculando Memória de Cálculo Geométrica (m² e m³)...",
      "Sufixo 003B interpretado como espessura de 3,0 cm...",
      "Resolvendo sentidos omitidos dos Panos de Massa...",
      "Cruzando dados com pesos específicos teóricos (CBUQ ~ 2.4 t/m³)...",
      "Auditando Indicadores de Desempenho e Consumo Médio...",
      "Estruturando Parecer de Conformidade Tecnológica...",
      "Formatando RDO Finalizado..."
    ];

    let currentStepIdx = 0;
    setProcessStep(steps[currentStepIdx]);
    
    const interval = setInterval(() => {
      if (currentStepIdx < steps.length - 1) {
        currentStepIdx++;
        setProcessStep(steps[currentStepIdx]);
      }
    }, 450);

    try {
      const response = await fetch("/api/process-rdo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Falha no processamento. Verifique se o backend está ativo.");
      }

      const data: RdoResponse = await response.json();
      
      const reportDate = data.date && data.date.trim() !== "" ? data.date : dateStr;
      data.date = reportDate;
      setDateStr(reportDate);

      const targetRdoNumber = rdoNumber || 1;
      data.rdoNumber = targetRdoNumber;

      if (rdoData && rdoData.fotos) {
        data.fotos = rdoData.fotos;
      }
      setRdoData(data);
      setSelectedTab("overview");

      // Auto-save or update in the Local MongoDB-style localStorage list
      if (selectedSavedReportId && !forceSaveAsNew) {
        setSavedReports(prev => {
          const updated = prev.map(item => {
            if (item.id === selectedSavedReportId) {
              const itemRdoNum = rdoNumber || item.rdoNumber || item.data?.rdoNumber || 1;
              data.rdoNumber = itemRdoNum;
              return {
                ...item,
                title: data.title || item.title,
                obra: data.obra || item.obra,
                date: reportDate,
                rdoNumber: itemRdoNum,
                rawText,
                data
              };
            }
            return item;
          });
          safeSaveSavedReports(updated);
          return updated;
        });
      } else {
        const newId = "rdo_" + Date.now();
        const newSavedItem = {
          id: newId,
          createdAt: new Date().toISOString(),
          title: data.title || `RDO - ${reportDate}`,
          obra: data.obra || "Trecho Pavimentação",
          date: reportDate,
          rdoNumber: targetRdoNumber,
          rawText,
          data
        };
        setSavedReports(prev => {
          const updated = [newSavedItem, ...prev];
          safeSaveSavedReports(updated);
          return updated;
        });
        setSelectedSavedReportId(newId);
      }
    } catch (err: any) {
      console.error("Erro na auditoria:", err);
      setError(err.message || "Erro desconhecido ao processar o RDO.");
    } finally {
      clearInterval(interval);
      setIsProcessing(false);
    }
  };

  // Copiar markdown para clipboard
  const handleCopyMarkdown = () => {
    if (!rdoData) return;
    navigator.clipboard.writeText(rdoData.markdownReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Imprimir relatório com suporte a novas guias fora do iframe e overlay local resiliente
  const handlePrint = () => {
    if (!rdoData) return;
    try {
      const finalRdo = { ...rdoData, date: rdoData.date || dateStr };
      localStorage.setItem("rdo_print_payload", JSON.stringify(finalRdo));
    } catch (err) {
      console.error("Erro ao salvar carga para impressão:", err);
    }
    setIsLocalPrintViewActive(true);
  };

  // Image compressor to prevent LocalStorage quota exceeding
  const compressImage = (base64Str: string, callback: (resized: string) => void) => {
    const img = new window.Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX_WIDTH = 640;
      const MAX_HEIGHT = 640;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const resizedBase64 = canvas.toDataURL("image/jpeg", 0.55);
        callback(resizedBase64);
      } else {
        callback(base64Str);
      }
    };
    img.onerror = () => {
      callback(base64Str);
    };
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!rdoData) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentFotos = rdoData.fotos || [];
    if (currentFotos.length >= 30) {
      alert("Limite máximo de 30 fotos atingido!");
      return;
    }

    const remaining = 30 - currentFotos.length;
    const filesArray = Array.from(files).slice(0, remaining);

    filesArray.forEach((file: any) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const rawBase64 = reader.result as string;
        compressImage(rawBase64, (compressedBase64) => {
          const newFoto = {
            id: "foto_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
            url: compressedBase64,
            caption: file.name.substring(0, file.name.lastIndexOf('.')) || "Foto da Obra"
          };

          setRdoData(prev => {
            if (!prev) return null;
            const updatedFotos = [...(prev.fotos || []), newFoto];
            const updatedRdo = {
              ...prev,
              fotos: updatedFotos
            };

            // Sync with savedReports
            if (selectedSavedReportId) {
              setSavedReports(oldReports => {
                const up = oldReports.map(item => {
                  if (item.id === selectedSavedReportId) {
                    return { ...item, data: updatedRdo };
                  }
                  return item;
                });
                safeSaveSavedReports(up);
                return up;
              });
            }

            return updatedRdo;
          });
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (photoId: string) => {
    if (!rdoData) return;
    setRdoData(prev => {
      if (!prev) return null;
      const updatedFotos = (prev.fotos || []).filter(f => f.id !== photoId);
      const updatedRdo = {
        ...prev,
        fotos: updatedFotos
      };

      if (selectedSavedReportId) {
        setSavedReports(oldReports => {
          const up = oldReports.map(item => {
            if (item.id === selectedSavedReportId) {
              return { ...item, data: updatedRdo };
            }
            return item;
          });
          safeSaveSavedReports(up);
          return up;
        });
      }

      return updatedRdo;
    });
  };

  const handleUpdatePhotoCaption = (photoId: string, newCaption: string) => {
    if (!rdoData) return;
    setRdoData(prev => {
      if (!prev) return null;
      const updatedFotos = (prev.fotos || []).map(f => {
        if (f.id === photoId) {
          return { ...f, caption: newCaption };
        }
        return f;
      });
      const updatedRdo = {
        ...prev,
        fotos: updatedFotos
      };

      if (selectedSavedReportId) {
        setSavedReports(oldReports => {
          const up = oldReports.map(item => {
            if (item.id === selectedSavedReportId) {
              return { ...item, data: updatedRdo };
            }
            return item;
          });
          safeSaveSavedReports(up);
          return up;
        });
      }

      return updatedRdo;
    });
  };

  const handleAddOcorrencia = () => {
    if (!rdoData || !newOcorrDesc.trim()) return;
    const newItems = [...(rdoData.ocorrencias || [])];
    newItems.push({
      tipo: newOcorrTipo,
      descricao: newOcorrDesc.trim()
    });

    const updatedRdo = {
      ...rdoData,
      ocorrencias: newItems
    };

    setRdoData(updatedRdo);
    setNewOcorrDesc("");

    if (selectedSavedReportId) {
      setSavedReports(oldReports => {
        const up = oldReports.map(item => {
          if (item.id === selectedSavedReportId) {
            return { ...item, data: updatedRdo };
          }
          return item;
        });
        safeSaveSavedReports(up);
        return up;
      });
    }
  };

  const handleStartEditOcorrencia = (idx: number, item: any) => {
    setEditingOcorrIdx(idx);
    setTempOcorrTipo(item.tipo);
    setTempOcorrDesc(item.descricao);
  };

  const handleSaveEditOcorrencia = (idx: number) => {
    if (!rdoData) return;
    const items = [...(rdoData.ocorrencias || [])];
    if (items[idx]) {
      items[idx] = {
        ...items[idx],
        tipo: tempOcorrTipo,
        descricao: tempOcorrDesc.trim()
      };
    }

    const updatedRdo = {
      ...rdoData,
      ocorrencias: items
    };

    setRdoData(updatedRdo);
    setEditingOcorrIdx(null);

    if (selectedSavedReportId) {
      setSavedReports(oldReports => {
        const up = oldReports.map(item => {
          if (item.id === selectedSavedReportId) {
            return { ...item, data: updatedRdo };
          }
          return item;
        });
        safeSaveSavedReports(up);
        return up;
      });
    }
  };

  const handleDeleteOcorrencia = (idx: number) => {
    if (!rdoData) return;
    const items = (rdoData.ocorrencias || []).filter((_, i) => i !== idx);

    const updatedRdo = {
      ...rdoData,
      ocorrencias: items
    };

    setRdoData(updatedRdo);

    if (selectedSavedReportId) {
      setSavedReports(oldReports => {
        const up = oldReports.map(item => {
          if (item.id === selectedSavedReportId) {
            return { ...item, data: updatedRdo };
          }
          return item;
        });
        safeSaveSavedReports(up);
        return up;
      });
    }
  };

  // Live recalculate functions for manual frontend edits
  const handleStartEditPano = (pano: PanoItem) => {
    setEditingPanoId(pano.id);
    setTempPanoLengths(prev => ({ ...prev, [pano.id]: pano.comprimento }));
    setTempPanoWidths(prev => ({ ...prev, [pano.id]: pano.largura }));
  };

  const handleSavePanoEdit = (id: string) => {
    if (!rdoData) return;

    const newLength = tempPanoLengths[id] || 0;
    const newWidth = tempPanoWidths[id] || 0;

    const updatedPanos = rdoData.panos.map(p => {
      if (p.id === id) {
        const area = Number((newLength * newWidth).toFixed(3));
        const volume = Number((area * p.espessuraNum).toFixed(3));
        return {
          ...p,
          comprimento: newLength,
          largura: newWidth,
          area,
          volume
        };
      }
      return p;
    });

    recalculateRDO(updatedPanos);
    setEditingPanoId(null);
  };

  const handleDeletePano = (id: string) => {
    if (!rdoData) return;
    const updatedPanos = rdoData.panos.filter(p => p.id !== id);
    recalculateRDO(updatedPanos);
  };

  const handleAddPano = () => {
    if (!rdoData) return;
    
    const area = Number((newPano.comprimento * newPano.largura).toFixed(3));
    const volume = Number((area * newPano.espessura).toFixed(3));
    
    const added: PanoItem = {
      id: "manual_" + Date.now(),
      segmento: newPano.segmento,
      comprimento: newPano.comprimento,
      largura: newPano.largura,
      espessuraNum: newPano.espessura,
      espessuraString: `${newPano.espessura * 100}cm`,
      sentidoOriginal: newPano.sentido,
      sentidoCalculado: newPano.sentido,
      sentidoInferido: false,
      area,
      volume
    };

    const updatedPanos = [...rdoData.panos, added];
    recalculateRDO(updatedPanos);
  };

  // Front-end mathematical engine to keep calculations absolutely synchronous & valid upon edit
  const recalculateRDO = (updatedPanos: PanoItem[]) => {
    if (!rdoData) return;

    const areaTotal = Number(updatedPanos.reduce((acc, p) => acc + p.area, 0).toFixed(3));
    const volumeTotal = Number(updatedPanos.reduce((acc, p) => acc + p.volume, 0).toFixed(3));
    const totalPanos = updatedPanos.length;
    const massaTotalKg = rdoData.massaAsfaltica.massaTotalKg;

    const consumoMedioReal = areaTotal > 0 ? Number((massaTotalKg / areaTotal).toFixed(3)) : 0;
    const consumoTeoricoRef = 72; // baseline para 3cm
    const desvioConsumoPercentual = consumoTeoricoRef > 0 
      ? Number((((consumoMedioReal - consumoTeoricoRef) / consumoTeoricoRef) * 100).toFixed(3))
      : 0;

    // Build the updated diagnostic based on consumption audit rules
    let diagnostic = "";
    if (consumoMedioReal === 0) {
      diagnostic = "Sem panos executados para cálculo.";
    } else if (Math.abs(desvioConsumoPercentual) <= 5) {
      diagnostic = "Consumo Médio Excelente! O comportamento real de consumo em campo está perfeitamente alinhado com o referencial teórico de projeto (72 kg/m² para espessura de 3cm). Execução recomendada para medição conforme e ateste tecnológico.";
    } else if (desvioConsumoPercentual < -5) {
      diagnostic = `Desvio Negativo de Consumo (${desvioConsumoPercentual}%). Possível subespessura na camada asfáltica executada ou falhas de compactação. Recomenda-se extração de corpos-de-prova rotineiros para comprovar se a espessura média cumpre os 3.0 cm contratuais.`;
    } else {
      diagnostic = `Desvio Positivo de Consumo (+${desvioConsumoPercentual}%). Alerta de superespessura ou desperdício de ligante/asfalto na usinagem ou em campo. O consumo excedente pode acarretar em glosa ou estouro do orçamento físico-financeiro do contrato de pavimentação.`;
    }

    const updatedKpis = {
      ...rdoData.kpis,
      totalPanos,
      areaTotal,
      volumeTotal,
      consumoMedioReal,
      desvioConsumoPercentual
    };

    // Auto-Regenerate Markdown text matching structural engineering compliance rules
    const markdownReport = regenerateMarkdown(
      rdoData.title,
      rdoData.obra,
      updatedPanos,
      rdoData.massaAsfaltica,
      rdoData.efetivo,
      rdoData.equipamentos,
      updatedKpis,
      diagnostic,
      rdoData.auditoria.sentidoInferidosJustificativa,
      rdoData.auditoria.statusGeralAuditoria
    );

    const updatedRdo = {
      ...rdoData,
      panos: updatedPanos,
      kpis: updatedKpis,
      auditoria: {
        ...rdoData.auditoria,
        diagnosticoConsumo: diagnostic
      },
      markdownReport
    };

    setRdoData(updatedRdo);

    // Synchronize updates immediately if viewing a saved report from monthly history
    if (selectedSavedReportId) {
      setSavedReports(prev => {
        const updated = prev.map(item => {
          if (item.id === selectedSavedReportId) {
            return {
              ...item,
              data: updatedRdo
            };
          }
          return item;
        });
        safeSaveSavedReports(updated);
        return updated;
      });
    }
  };

  const regenerateMarkdown = (
    title: string,
    obra: string,
    panos: PanoItem[],
    massa: any,
    efetivo: EfetivoItem[],
    equipamentos: EquipamentoItem[],
    kpis: any,
    diagnostico: string,
    justificativaSentidos: string,
    statusGeral: string
  ): string => {
    // Group panos for markdown table
    const sulPanos = panos.filter(p => p.sentidoCalculado === "Sul" || p.sentidoCalculado === "Oeste" || p.sentidoCalculado === "Leste"); 
    // Fallback: Group by actual calculated value or custom grouping
    const group1Name = "SENTIDO SUL / OESTE";
    const group1Panos = panos.filter(p => ["Sul", "Oeste"].includes(p.sentidoCalculado));
    const group2Name = "SENTIDO NORTE / LESTE";
    const group2Panos = panos.filter(p => ["Norte", "Leste"].includes(p.sentidoCalculado));
    const otherPanos = panos.filter(p => !["Sul", "Oeste", "Norte", "Leste"].includes(p.sentidoCalculado));

    const totalSaneadoEfetivo = efetivo.reduce((acc, curr) => acc + (curr.quantidade || 0), 0);
    const totalSaneadoEquipamentos = equipamentos.reduce((acc, curr) => acc + (curr.quantidade || 0), 0);

    let md = `# RELATÓRIO TÉCNICO DE AUDITORIA E SANEAMENTO RDO\n`;
    md += `**Título:** ${title}\n`;
    md += `**Obra:** ${obra}\n`;
    md += `**Status de Validação:** ${statusGeral} (Auditado Digitalmente)\n\n---`;
    md += `\n\n## 1. CABEÇALHO SANEADO E CONTROLE DE EFETIVOS\n\n`;
    md += `* **Total de Pessoas na Equipe:** **${totalSaneadoEfetivo} integrantes**\n`;
    md += `* **Total de Equipamentos Alocados:** **${totalSaneadoEquipamentos} máquinas**\n\n`;
    
    md += `### Efetivo e Equipes Técnicas\n`;
    efetivo.forEach(e => {
      md += `- ${e.quantidade}x ${e.funcao} ${e.nomesFormatados || ""}\n`;
    });

    md += `\n### Equipamentos Extraídos\n`;
    equipamentos.forEach(eq => {
      md += `- ${eq.quantidade}x ${eq.nome} (${eq.status})\n`;
    });

    md += `\n## 2. DETALHAMENTO DA PRODUÇÃO DIÁRIA (MEMÓRIA GEOMÉTRICA)\n\n`;
    
    const renderTable = (name: string, list: PanoItem[]) => {
      if (list.length === 0) return "";
      let t = `### ${name}\n\n`;
      t += `| ID | Segmento/Estaca | Comprimento (m) | Largura (m) | Espessura (m) | Área (m²) | Volume (m³) | Observação |\n`;
      t += `|---|---|---|---|---|---|---|---|\n`;
      list.forEach(p => {
        const obs = p.sentidoInferido ? "Sentido Inferido" : "Declarado";
        t += `| ${p.id} | ${p.segmento} | ${p.comprimento.toFixed(2)} | ${p.largura.toFixed(2)} | ${p.espessuraNum.toFixed(3)} | ${p.area.toFixed(3)} | ${p.volume.toFixed(3)} | ${obs} |\n`;
      });
      t += `\n`;
      return t;
    };

    md += renderTable("Pista Sul / Fluxos Sul-Oeste", group1Panos);
    md += renderTable("Pista Norte / Fluxos Norte-Leste", group2Panos);
    md += renderTable("Outros Trechos / Não Identificados", otherPanos);

    md += `\n## 3. SANEAMENTO DE UNIDADES DE MASSA ASFÁLTICA (CBUQ)\n\n`;
    md += `| Identificador / Nota | Valor Original Informado | Peso Saneado (kg) | Peso Saneado (t) | Parecer Técnico |\n`;
    md += `|---|---|---|---|---|\n`;
    massa.itens.forEach((it: any) => {
      md += `| ${it.identificador} | ${it.valorOriginal} | ${it.valorSaneadoKg.toLocaleString('pt-BR')} kg | ${it.valorSaneadoTons.toFixed(2)} t | ${it.observacaoSaneamento} |\n`;
    });
    md += `| **TOTAL GERAL** | - | **${massa.massaTotalKg.toLocaleString('pt-BR')} kg** | **${massa.massaTotalTons.toFixed(2)} t** | Carga Geral Descarregada |\n\n`;

    md += `## 4. INDICADORES DE PERFORMANCE E KPIs CONTROLADOS\n\n`;
    md += `- **Contagem Total de Panos:** ${kpis.totalPanos} panos\n`;
    md += `- **Área Total Executada:** ${kpis.areaTotal.toLocaleString('pt-BR')} m²\n`;
    md += `- **Volume Total Consumido:** ${kpis.volumeTotal.toLocaleString('pt-BR')} m³\n`;
    md += `- **Massa Aplicada Total Saneada:** ${kpis.massaTotalKg.toLocaleString('pt-BR')} kg (${(kpis.massaTotalKg/1000).toFixed(2)} t)\n`;
    md += `- **Total de Equipe (Efetivo):** ${totalSaneadoEfetivo} integrantes\n`;
    md += `- **Total de Equipamentos Alocados:** ${totalSaneadoEquipamentos} máquinas\n`;
    md += `- **Consumo Médio Real:** **${kpis.consumoMedioReal.toFixed(2)} kg/m²**\n`;
    md += `- **Consumo Teórico Referencial (3.0 cm):** 72.00 kg/m²\n`;
    md += `- **Desvio de Material:** **${kpis.desvioConsumoPercentual > 0 ? "+" : ""}${kpis.desvioConsumoPercentual}%**\n\n`;

    md += `## 5. PARECER DA AUDITORIA DA ENGENHARIA\n\n`;
    md += `**Inferencia de Sentidos:**\n${justificativaSentidos}\n\n`;
    md += `**Diagnóstico Físico-Financeiro:**\n${diagnostico}\n\n`;
    md += `\n---\n*Relatório emitido através do SaaS RDO Inteligente - Licença Corporativa de Engenharia de Pavimentação.*`;

    return md;
  };

  // Pre-process initial load
  useEffect(() => {
    // Pre-calculate on initial render so dashboard has instant data
    // Let's call the processing automatically on mount if not yet run
  }, []);

  const filteredReports = savedReports.filter(r => isReportInSelectedMonth(r.date, currentSelectedMonth));

  const monthlyStats = filteredReports.reduce((acc, r) => {
    const area = r.data?.kpis?.areaTotal || 0;
    const valKg = r.data?.massaAsfaltica?.massaTotalKg || 0;
    
    return {
      count: acc.count + 1,
      totalArea: acc.totalArea + area,
      totalMassaKg: acc.totalMassaKg + valKg,
    };
  }, { count: 0, totalArea: 0, totalMassaKg: 0 });

  const monthlyConsumoMedio = monthlyStats.totalArea > 0 
    ? Number((monthlyStats.totalMassaKg / monthlyStats.totalArea).toFixed(1))
    : 0;

  const totalExecStats = savedReports.reduce((acc, r) => {
    const area = r.data?.kpis?.areaTotal || 0;
    const vol = r.data?.kpis?.volumeTotal || 0;
    const valKg = r.data?.massaAsfaltica?.massaTotalKg || 0;
    
    return {
      count: acc.count + 1,
      totalArea: acc.totalArea + area,
      totalVolume: acc.totalVolume + vol,
      totalMassaKg: acc.totalMassaKg + valKg,
    };
  }, { count: 0, totalArea: 0, totalVolume: 0, totalMassaKg: 0 });

  const totalExecConsumoMedio = totalExecStats.totalArea > 0 
    ? Number((totalExecStats.totalMassaKg / totalExecStats.totalArea).toFixed(1))
    : 0;

  const totalPeople = rdoData?.efetivo ? rdoData.efetivo.reduce((acc, p) => acc + (p.quantidade || 0), 0) : 0;
  const totalEquipment = rdoData?.equipamentos ? rdoData.equipamentos.reduce((acc, eq) => acc + (eq.quantidade || 0), 0) : 0;

  if (isPrintAccumulatedPage || isLocalPrintAccumulatedActive) {
    const listData = isPrintAccumulatedPage ? printAccumulatedData : savedReports;
    const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

    // Calculate totals for accumulated printing
    const accumStats = listData.reduce((acc, r) => {
      const area = r.data?.kpis?.areaTotal || 0;
      const vol = r.data?.kpis?.volumeTotal || 0;
      const valKg = r.data?.massaAsfaltica?.massaTotalKg || 0;
      return {
        count: acc.count + 1,
        totalArea: acc.totalArea + area,
        totalVolume: acc.totalVolume + vol,
        totalMassaKg: acc.totalMassaKg + valKg,
      };
    }, { count: 0, totalArea: 0, totalVolume: 0, totalMassaKg: 0 });

    const accumConsumoMedio = accumStats.totalArea > 0 
      ? Number((accumStats.totalMassaKg / accumStats.totalArea).toFixed(1))
      : 0;

    // Get date range
    const dates = listData.map(r => r.date).filter(Boolean);
    const sortedDates = [...dates].sort((a,b) => {
      const parseDate = (s: string) => {
        const parts = s.split("/");
        return new Date(Number(parts[2]), Number(parts[1])-1, Number(parts[0])).getTime();
      };
      return parseDate(a) - parseDate(b);
    });

    const dateRangeStr = sortedDates.length > 0 
      ? `Período: ${sortedDates[0]} até ${sortedDates[sortedDates.length - 1]}`
      : "Acumulado do Período";

    if (listData.length === 0) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800 font-sans">
          <div className="bg-white p-8 border border-slate-200 shadow-sm max-w-md w-full text-center">
            <Printer className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-bounce" />
            <h1 className="text-xl font-bold text-slate-900 mb-2">Sem Relatórios no Período...</h1>
            <p className="text-sm text-slate-500 mb-6">Nenhum diário foi salvo ainda no banco local de histórico para gerar a consolidação.</p>
            <button 
              onClick={() => {
                if (isPrintAccumulatedPage) window.close();
                else setIsLocalPrintAccumulatedActive(false);
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 uppercase tracking-wider transition-all cursor-pointer"
            >
              Voltar ao Painel
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-white p-4 sm:p-8 md:p-12 text-slate-900 font-sans antialiased text-xs">
        {/* Banner de Ajuda (Ocultado na impressão física) */}
        {isInIframe ? (
          <div className="mb-8 p-5 bg-amber-50 text-amber-950 rounded-lg border border-amber-200 flex flex-col md:flex-row items-center justify-between gap-5 shadow-sm print:hidden">
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">⚠️</span>
              <div>
                <div className="text-sm font-black uppercase tracking-wider text-amber-900">Restrição de Segurança do Navegador (iFrame)</div>
                <p className="text-[11px] text-amber-800 leading-relaxed font-medium mt-1">
                  Você está visualizando este painel de consolidação dentro do ambiente seguro do AI Studio (iframe). 
                  Os navegadores modernos bloqueiam o acionamento direto do popup de impressão dentro de iframes.
                </p>
                <p className="text-[11px] text-amber-700 font-bold mt-1.5">
                  👉 Solução Simples: Clique no botão azul ao lado para abrir este laudo consolidado fora do painel em uma nova aba, onde a janela de impressão abrirá automaticamente!
                </p>
              </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto shrink-0 justify-end">
              <a 
                href={`${window.location.origin}${window.location.pathname}?printAccumulated=true`}
                target="_blank"
                rel="opener"
                className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-extrabold uppercase tracking-widest px-5 py-3 hover:shadow transition-all flex items-center gap-1.5 rounded text-center shrink-0"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir em Nova Aba & Imprimir
              </a>
              <button 
                onClick={() => setIsLocalPrintAccumulatedActive(false)} 
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-extrabold uppercase tracking-widest px-4 py-3 transition-all cursor-pointer rounded shrink-0"
              >
                ← Voltar
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-8 p-4 bg-slate-900 text-white rounded-lg border border-slate-950 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md print:hidden">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 text-white rounded">
                <Printer className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight">Otimização de Impressão de Consolidação</div>
                <p className="text-[10px] text-slate-400 font-medium">Configure para salvar como PDF corporativo ou imprimir direto.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => window.print()} 
                className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-extrabold uppercase tracking-widest px-4 py-2.5 hover:shadow transition-all cursor-pointer flex items-center gap-1.5 rounded"
              >
                <Printer className="h-3.5 w-3.5" />
                Imprimir Documento
              </button>
              <button 
                onClick={() => {
                  if (isPrintAccumulatedPage) window.close();
                  else setIsLocalPrintAccumulatedActive(false);
                }} 
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-extrabold uppercase tracking-widest px-4 py-2.5 transition-all cursor-pointer rounded"
              >
                ← Voltar
              </button>
            </div>
          </div>
        )}

        {/* Printable Paper Document Blueprint */}
        <div id="laudo-acumulado-print" className="max-w-4xl mx-auto space-y-4 print:space-y-3 bg-white p-2">
          {/* Header */}
          <div className="border-b-2 border-slate-300 pb-2.5 relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-700 via-teal-650 to-cyan-650 rounded-t-sm" />
            <div className="flex justify-between items-start pt-3">
              <div className="flex gap-2.5">
                <div className="w-1.5 bg-teal-700 rounded-sm self-stretch shrink-0"></div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">Consolidação de Diários de Obra Saneados</h1>
                  <div className="text-teal-750/90 mt-1 font-sans text-[10px] sm:text-[11px] font-extrabold tracking-widest uppercase leading-tight flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    Certificado de Saneamento Técnico Acumulado
                  </div>
                </div>
              </div>
              <div className="bg-teal-955 border border-teal-850 text-emerald-350 px-3 py-1.5 font-sans text-[10px] sm:text-[11px] font-black tracking-wider uppercase text-right rounded shadow-xs bg-slate-900 text-teal-400 leading-none">
                Acumulado Geral
              </div>
            </div>
          </div>

          {/* Dados Gerais */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-gradient-to-br from-teal-50/20 via-white to-slate-50 p-2.5 border border-slate-200/85 border-l-[5px] border-l-teal-700 rounded-r shadow-xs leading-tight">
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[8.5px] sm:text-[9.5px] block leading-none">Período de Apuração</span>
              <span className="text-teal-955 font-black text-[12.5px] sm:text-[13.5px] block mt-1 leading-none">{dateRangeStr}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[8.5px] sm:text-[9.5px] block leading-none">Duração do Controle</span>
              <span className="text-slate-800 font-bold text-[12.5px] sm:text-[13.5px] block mt-1 leading-none">{accumStats.count} Dias Ativos Gravados</span>
            </div>
            <div className="col-span-2 md:col-span-1">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[8.5px] sm:text-[9.5px] block leading-none">Parecer de Saneamento</span>
              <span className="text-emerald-700 font-extrabold text-[10px] uppercase tracking-wide block mt-1 bg-emerald-50 border border-emerald-250 rounded px-2 py-0.5 w-fit leading-none">
                Consolidação Homologada
              </span>
            </div>
          </div>

          {/* KPIs Consolidados */}
          <div>
            <h3 className="font-bold text-slate-950 uppercase tracking-wide text-xs sm:text-[13px] border-b border-slate-300 pb-1 mb-1.5 leading-tight">
              1. RESUMO EXECUTIVO E KPIS RODOVIÁRIOS CONSOLIDADOS DO PERÍODO
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-slate-900">
              <div className="bg-blue-50/65 p-2 rounded border border-blue-200/60 text-center leading-tight">
                <span className="text-[9px] sm:text-[9.5px] uppercase font-bold text-blue-600/80 block tracking-wider leading-none">Área Total Executada</span>
                <span className="text-sm sm:text-base font-black text-slate-950 block mt-1 leading-none">{accumStats.totalArea.toLocaleString('pt-BR')} m²</span>
              </div>
              <div className="bg-blue-50/65 p-2 rounded border border-blue-200/60 text-center leading-tight">
                <span className="text-[9px] sm:text-[9.5px] uppercase font-bold text-blue-600/80 block tracking-wider leading-none">Volume Total Estimado</span>
                <span className="text-sm sm:text-base font-black text-slate-950 block mt-1 leading-none">{accumStats.totalVolume.toLocaleString('pt-BR')} m³</span>
              </div>
              <div className="bg-blue-50/65 p-2 rounded border border-blue-200/60 text-center leading-tight">
                <span className="text-[9px] sm:text-[9.5px] uppercase font-bold text-blue-600/80 block tracking-wider leading-none">Consumo Médio Global</span>
                <span className="text-sm sm:text-base font-black text-slate-950 block mt-1 leading-none">{accumConsumoMedio.toFixed(1)} kg/m²</span>
              </div>
              <div className="bg-blue-50/65 p-2 rounded border border-blue-200/60 text-center leading-tight">
                <span className="text-[9px] sm:text-[9.5px] uppercase font-bold text-blue-600/80 block tracking-wider leading-none">Massa Total Aplicada</span>
                <span className="text-sm sm:text-base font-black text-slate-950 block mt-1 leading-none">{(accumStats.totalMassaKg / 1000).toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1})} t</span>
              </div>
            </div>
          </div>

          {/* Histórico Detalhado */}
          <div>
            <h3 className="font-bold text-slate-950 uppercase tracking-wide text-[11px] sm:text-xs border-b border-slate-300 pb-0.5 mb-0.5 leading-none">
              2. DETALHAMENTO DE DIÁRIOS SANEADOS E CONTROLE HISTÓRICO
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded">
              <table className="w-full text-left font-sans text-[10px] sm:text-[11px] border-collapse leading-none">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-600 font-bold bg-slate-100">
                    <th className="px-1.5 py-1 font-bold">Data</th>
                    <th className="px-1.5 py-1 font-bold">Título do Relatório</th>
                    <th className="px-1.5 py-1 font-bold">Obra / Rodovia</th>
                    <th className="px-1.5 py-1 text-right font-bold">Área (m²)</th>
                    <th className="px-1.5 py-1 text-right font-bold">Massa (t)</th>
                    <th className="px-1.5 py-1 text-right bg-slate-200/50 font-bold">Consumo (kg/m²)</th>
                    <th className="px-1.5 py-1 text-center font-bold">Auditoria</th>
                  </tr>
                </thead>
                <tbody>
                  {listData.map((r, idx) => {
                    const area = r.data?.kpis?.areaTotal || 0;
                    const valKg = r.data?.massaAsfaltica?.massaTotalKg || 0;
                    const cons = area > 0 ? Number((valKg / area).toFixed(1)) : 0;
                    const rdoStatus = r.data?.auditoria?.statusGeralAuditoria || "Conforme";

                    return (
                      <tr key={idx} className="border-b border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                        <td className="px-1.5 py-0.5 font-bold text-slate-950">{r.date || "S/D"}</td>
                        <td className="px-1.5 py-0.5 bg-white text-slate-800 font-semibold">
                          {r.rdoNumber || r.data?.rdoNumber ? `[Nº ${String(r.rdoNumber || r.data?.rdoNumber).padStart(2, '0')}] ` : ""}
                          {r.title || "Diário Geral"}
                        </td>
                        <td className="px-1.5 py-0.5 bg-white text-slate-600">{r.data?.obra || "Geral"}</td>
                        <td className="px-1.5 py-0.5 text-right bg-white font-mono">{area.toLocaleString('pt-BR')}</td>
                        <td className="px-1.5 py-0.5 text-right bg-white font-mono">{(valKg / 1000).toFixed(2)} t</td>
                        <td className="px-1.5 py-0.5 text-right font-black bg-slate-50/70 text-slate-950 font-mono">{cons.toFixed(1)}</td>
                        <td className="px-1.5 py-0.5 text-center font-bold">
                          <span className={`px-1.5 py-0.25 rounded text-[8.5px] font-black uppercase tracking-wider leading-none inline-block ${
                            rdoStatus === "Conforme" || rdoStatus.includes("OK") || rdoStatus.includes("Auditado")
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                            {rdoStatus === "Conforme" ? "OK" : "Auditado"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Assinatura do Diário Consolidado */}
          <div className="pt-6 print:pt-4 grid grid-cols-2 gap-6 font-sans">
            <div className="text-center pt-4 border-t border-slate-350 leading-tight">
              <span className="text-slate-500 uppercase tracking-wider text-[9px] sm:text-[10px] block font-bold">COORDENADOR DO CONTRATO</span>
              <div className="font-extrabold text-slate-950 text-xs sm:text-sm mt-1">SAAS DIÁRIO TÉCNICO INTEL</div>
              <div className="text-slate-400 text-[9px] sm:text-[10px] mt-0.5">SINAL E ASSINATURA ELETRÔNICA</div>
            </div>
            <div className="text-center pt-4 border-t border-slate-350 leading-tight">
              <span className="text-slate-500 uppercase tracking-wider text-[9px] sm:text-[10px] block font-bold">SUPERVISÃO DE ENGENHARIA / AUDITORIA</span>
              <div className="font-extrabold text-slate-950 text-xs sm:text-sm mt-1">AUDITADO DIGITALMENTE</div>
              <div className="text-slate-405 text-[9px] sm:text-[10px] mt-0.5">CERTIFICAÇÃO CONSOLIDADA AUTOMÁTICA</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isPrintPage || isLocalPrintViewActive) {
    const printableData = isPrintPage ? printData : rdoData;
    const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

    if (!printableData) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800 font-sans">
          <div className="bg-white p-8 border border-slate-200 shadow-sm max-w-md w-full text-center">
            <Printer className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-bounce" />
            <h1 className="text-xl font-bold text-slate-900 mb-2">Carregando Diário de Obra (RDO)...</h1>
            <p className="text-sm text-slate-500 mb-6">Estamos montando os dados da memória geométrica e frotas...</p>
            <button 
              onClick={() => {
                if (isPrintPage) window.close();
                else setIsLocalPrintViewActive(false);
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 uppercase tracking-wider transition-all cursor-pointer"
            >
              Voltar / Fechar
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-white p-4 sm:p-8 md:p-12 text-slate-900 font-sans antialiased text-xs">
        {/* Banner de Ajuda (Ocultado na impressão física) */}
        {isInIframe ? (
          <div className="mb-8 p-5 bg-amber-50 text-amber-950 rounded-lg border border-amber-200 flex flex-col md:flex-row items-center justify-between gap-5 shadow-sm print:hidden">
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">⚠️</span>
              <div>
                <div className="text-sm font-black uppercase tracking-wider text-amber-900">Restrição de Segurança do Navegador (iFrame)</div>
                <p className="text-[11px] text-amber-800 leading-relaxed font-medium mt-1">
                  Você está visualizando este painel dentro do ambiente seguro do AI Studio (iframe). 
                  Os navegadores modernos <strong>bloqueiam</strong> a caixa de diálogo de impressão direta por motivos de segurança dentro desse painel.
                </p>
                <p className="text-[11px] text-amber-700 font-bold mt-1.5">
                  👉 Solução Simples: Clique no botão azul ao lado para abrir o laudo técnico fora do painel em uma nova aba limpa, onde a caixa de impressão abrirá automaticamente!
                </p>
              </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto shrink-0 justify-end">
              <a 
                href={`${window.location.origin}${window.location.pathname}?print=true`}
                target="_blank"
                rel="opener"
                className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-extrabold uppercase tracking-widest px-5 py-3 hover:shadow transition-all flex items-center gap-1.5 rounded text-center shrink-0"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir em Nova Aba & Imprimir
              </a>
              <button 
                onClick={() => setIsLocalPrintViewActive(false)} 
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-extrabold uppercase tracking-widest px-4 py-3 transition-all cursor-pointer rounded shrink-0"
              >
                ← Voltar
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-8 p-4 bg-slate-900 text-white rounded-lg border border-slate-950 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md print:hidden">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 text-white rounded">
                <Printer className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight">Otimização de Impressão de RDO</div>
                <p className="text-[10px] text-slate-400 font-medium">Configure para salvar como PDF corporativo ou imprimir direto.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => window.print()} 
                className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-extrabold uppercase tracking-widest px-4 py-2.5 hover:shadow transition-all cursor-pointer flex items-center gap-1.5 rounded"
              >
                <Printer className="h-3.5 w-3.5" />
                Chamar Caixa de Impressão
              </button>
              <button 
                onClick={() => {
                  if (isPrintPage) window.close();
                  else setIsLocalPrintViewActive(false);
                }} 
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-extrabold uppercase tracking-widest px-4 py-2.5 transition-all cursor-pointer rounded"
              >
                ← Voltar ao Sistema
              </button>
            </div>
          </div>
        )}

        {/* Dicas Práticas de Configuração */}
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-[11px] leading-relaxed flex items-start gap-2.5 print:hidden">
          <span className="text-base">💡</span>
          <div>
            <strong>Dica Prática para PDF de Alta Qualidade:</strong> Na tela de impressão que abriu, selecione <strong>"Salvar como PDF"</strong> como destino. Em seguida, clique em <em>"Mais Configurações"</em>, defina as <strong>Margens</strong> como <strong>"Nenhuma / Padrão"</strong> e certifique-se de ativar a caixa de seleção <strong>"Gráficos de segundo plano"</strong> para preservar os detalhes de cores e marcadores técnicos de compactação.
          </div>
        </div>

        {/* Printable Stationery Document Blueprint */}
        <div id="laudo-tecnico-print" className="max-w-4xl mx-auto space-y-3 print:space-y-2.5 bg-white p-2">
          
          {/* Header */}
          <div className="border-b-2 border-slate-300 pb-2.5 relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-800 via-indigo-650 to-amber-500 rounded-t-sm" />
            <div className="flex justify-between items-start pt-3">
              <div className="flex gap-2.5">
                <div className="w-1.5 bg-blue-700 rounded-sm self-stretch shrink-0"></div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">Diário de Obra Técnica - RDO</h1>
                  <div className="text-blue-700/80 mt-1 font-sans text-[10px] sm:text-[11px] font-extrabold tracking-widest uppercase leading-tight flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                    Relatório de Auditoria Digital de Pavimentação e Saneamento
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <div className="bg-blue-900 border border-blue-800 text-amber-400 px-3 py-1.5 font-sans text-[10px] sm:text-[11px] font-black tracking-wider uppercase text-right rounded shadow-xs leading-none">
                  Diário Técnico {printableData.rdoNumber || rdoNumber ? `Nº ${String(printableData.rdoNumber || rdoNumber).padStart(2, '0')}` : ""}
                </div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 border border-blue-100 text-blue-950 font-bold text-[9px] sm:text-[10px] uppercase tracking-wide leading-none shadow-3xs">
                  <span className="w-1 h-1 rounded-full bg-blue-600 shrink-0" />
                  DATA: <span className="font-mono font-extrabold ml-0.5">{printableData.date || dateStr}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dados Gerais de Cabeçalho */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 print:gap-2 bg-gradient-to-br from-blue-50/30 via-white to-slate-50 p-2.5 border border-slate-200/85 border-l-[5px] border-l-blue-700 rounded-r shadow-xs leading-tight">
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[8.5px] sm:text-[9px] block leading-none">Título do RDO</span>
              <span className="text-blue-950 font-black text-[12.5px] sm:text-[13.5px] block mt-1 leading-none">{printableData.title}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[8.5px] sm:text-[9px] block leading-none">Rodovia / Trecho da Obra</span>
              <span className="text-slate-800 font-bold text-[12.5px] sm:text-[13.5px] block mt-1 leading-none">{printableData.obra}</span>
            </div>
            <div className="col-span-2 md:col-span-1">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[8.5px] sm:text-[9px] block leading-none">Status de Engenharia</span>
              {(() => {
                const status = printableData.auditoria.statusGeralAuditoria || "Auditado & Saneado";
                const isRessalva = status.toLowerCase().includes("ressalva") || status.toLowerCase().includes("desvio") || status.toLowerCase().includes("pendente");
                const isConforme = status.toLowerCase().includes("conforme") || status.toLowerCase().includes("aprovado") || status.toLowerCase().includes("ok");
                
                let colorClasses = "bg-blue-50 text-blue-700 border-blue-200";
                if (isRessalva) {
                  colorClasses = "bg-amber-50 text-amber-700 border-amber-200";
                } else if (isConforme) {
                  colorClasses = "bg-emerald-50 text-emerald-700 border-emerald-200";
                }
                
                return (
                  <span className={`font-black text-[10px] uppercase tracking-wide block mt-1 border px-2 py-0.5 rounded w-fit leading-none ${colorClasses}`}>
                    {status}
                  </span>
                );
              })()}
            </div>
          </div>

          {/* Recursos Humanos */}
          <div>
            <h3 className="font-bold text-slate-950 uppercase tracking-wide text-[11px] sm:text-xs border-b border-slate-300 pb-0.5 mb-0.5 leading-none">
              1. Recursos Humanos e Efetivos de Campo ({printableData.efetivo.reduce((acc, p) => acc + (p.quantidade || 0), 0)} Pessoas)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0 text-slate-800">
              {printableData.efetivo.map((ef, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_30px] items-center py-1 px-1 border-b border-slate-100/80 font-sans min-h-[24px]">
                  <span className="text-[11px] sm:text-xs leading-tight flex items-center gap-1.5 flex-wrap">
                    <span className="text-slate-700 font-bold">{ef.funcao}</span>
                    {ef.nomesFormatados && <span className="text-slate-500 text-[10px] lowercase font-light italic leading-none">({ef.nomesFormatados})</span>}
                  </span>
                  <div className="flex justify-end shrink-0 select-none">
                    <span className="inline-flex items-center justify-center min-w-[20px] h-[16px] px-1 rounded bg-blue-600 border border-blue-700 text-white font-extrabold text-[10px] leading-none">
                      {ef.quantidade}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Equipamentos Alocados */}
          <div>
            <h3 className="font-bold text-slate-950 uppercase tracking-wide text-[11px] sm:text-xs border-b border-slate-300 pb-0.5 mb-0.5 leading-none">
              2. Equipamentos e Maquinários ({printableData.equipamentos.reduce((acc, eq) => acc + (eq.quantidade || 0), 0)} Máquinas)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0 text-slate-800">
              {printableData.equipamentos.map((eq, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_30px_90px] items-center py-1 px-1 border-b border-slate-100/80 font-sans min-h-[24px]">
                  <span className="text-[11px] sm:text-xs leading-tight text-slate-700 font-bold truncate pr-1">
                    {eq.nome}
                  </span>
                  <div className="flex justify-center shrink-0 select-none">
                    <span className="inline-flex items-center justify-center min-w-[20px] h-[16px] px-1 rounded bg-amber-500 border border-amber-600 text-white font-extrabold text-[10px] leading-none">
                      {eq.quantidade}
                    </span>
                  </div>
                  <div className="flex justify-end pr-0.5 shrink-0">
                    <span className="font-sans text-[8px] uppercase font-bold tracking-wider px-1 py-0.25 bg-slate-100 border border-slate-200 text-slate-600 rounded leading-none">
                      {eq.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Memória Geométrica */}
          <div>
            <h3 className="font-bold text-slate-950 uppercase tracking-wide text-[11px] sm:text-xs border-b border-slate-300 pb-0.5 mb-0.5 leading-none">
              3. Detalhamento Geométrico das Seções Realizadas (Panos Executados)
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded">
              <table className="w-full text-left font-sans text-[10px] sm:text-[11px] border-collapse leading-none">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-600 font-bold bg-slate-100">
                    <th className="px-1.5 py-1 font-bold">ID</th>
                    <th className="px-1.5 py-1 font-bold">Segmento / Estaca</th>
                    <th className="px-1.5 py-1 text-right font-bold">Compr. (m)</th>
                    <th className="px-1.5 py-1 text-right font-bold">Larg. (m)</th>
                    <th className="px-1.5 py-1 text-right font-bold">Espessura (m)</th>
                    <th className="px-1.5 py-1 text-right bg-slate-200/50 font-bold">Área Real (m²)</th>
                    <th className="px-1.5 py-1 text-right bg-slate-200/50 font-bold">Vol. (m³)</th>
                    <th className="px-1.5 py-1 font-bold">Direção de Pista</th>
                  </tr>
                </thead>
                <tbody>
                  {printableData.panos.map((p, idx) => (
                    <tr key={idx} className="border-b border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                      <td className="px-1.5 py-0.5 font-bold text-slate-950 font-mono">{p.id}</td>
                      <td className="px-1.5 py-0.5 bg-white text-slate-800 font-medium">{p.segmento}</td>
                      <td className="px-1.5 py-0.5 text-right bg-white font-mono">{p.comprimento.toFixed(2)}</td>
                      <td className="px-1.5 py-0.5 text-right bg-white font-mono">{p.largura.toFixed(2)}</td>
                      <td className="px-1.5 py-0.5 text-right bg-white font-mono">{p.espessuraNum.toFixed(3)}</td>
                      <td className="px-1.5 py-0.5 text-right font-black bg-slate-50/70 text-slate-950 font-mono">{p.area.toFixed(3)}</td>
                      <td className="px-1.5 py-0.5 text-right font-bold bg-slate-50/70 text-slate-950 font-mono">{p.volume.toFixed(3)}</td>
                      <td className="px-1.5 py-0.5 font-semibold text-slate-700 bg-white">{p.sentidoCalculado} {p.sentidoInferido && "(inferido)"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Massa Descarregada */}
          <div>
            <h3 className="font-bold text-slate-950 uppercase tracking-wide text-[11px] sm:text-xs border-b border-slate-300 pb-0.5 mb-0.5 leading-none">
              4. Romaneios Faturados e Controle Tecnológico de Material (CBUQ)
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded">
              <table className="w-full text-left font-sans text-[10px] sm:text-[11px] border-collapse leading-none">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-600 font-bold bg-slate-100">
                    <th className="px-1.5 py-1 font-bold">NF / Controle</th>
                    <th className="px-1.5 py-1 font-bold">Descrição nos Diários de Obra</th>
                    <th className="px-1.5 py-1 text-right font-bold">Massa (kg)</th>
                    <th className="px-1.5 py-1 text-right bg-slate-200/50 font-bold">Massa Saneada (t)</th>
                    <th className="px-1.5 py-1 font-bold">Parecer e Tratamento de Engenharia</th>
                  </tr>
                </thead>
                <tbody>
                  {printableData.massaAsfaltica.itens.map((it, idx) => (
                    <tr key={idx} className="border-b border-slate-200 bg-white hover:bg-slate-50">
                      <td className="px-1.5 py-0.5 font-bold text-slate-950 font-mono">{it.identificador}</td>
                      <td className="px-1.5 py-0.5 text-slate-500 italic">"{it.valorOriginal}"</td>
                      <td className="px-1.5 py-0.5 text-right font-semibold text-emerald-800 font-mono">{it.valorSaneadoKg.toLocaleString('pt-BR')} kg</td>
                      <td className="px-1.5 py-0.5 text-right font-black bg-slate-50 text-slate-950 font-mono">{it.valorSaneadoTons.toFixed(2)} t</td>
                      <td className="px-1.5 py-0.5 text-slate-705 font-medium bg-white">{it.observacaoSaneamento}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Métricas e Indicadores Consolidados */}
          <div>
            <h3 className="font-bold text-slate-950 uppercase tracking-wide text-[11px] sm:text-xs border-b border-slate-300 pb-0.5 mb-1 leading-none">
              5. Resumo Executivo e KPIs Rodoviários Consolidados
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-slate-900">
              <div className="bg-blue-50/65 p-1.5 rounded border border-blue-200/60 text-center leading-none">
                <span className="text-[8.5px] uppercase font-bold text-blue-600/80 block tracking-wider mb-0.5">Área Executada</span>
                <span className="text-xs sm:text-sm font-black text-slate-950 block leading-none">{printableData.kpis.areaTotal.toLocaleString('pt-BR')} m²</span>
              </div>
              <div className="bg-blue-50/65 p-1.5 rounded border border-blue-200/60 text-center leading-none">
                <span className="text-[8.5px] uppercase font-bold text-blue-600/80 block tracking-wider mb-0.5">Volume Estimado</span>
                <span className="text-xs sm:text-sm font-black text-slate-950 block leading-none">{printableData.kpis.volumeTotal.toLocaleString('pt-BR')} m³</span>
              </div>
              <div className="bg-blue-50/65 p-1.5 rounded border border-blue-200/60 text-center leading-none">
                <span className="text-[8.5px] uppercase font-bold text-blue-600/80 block tracking-wider mb-0.5">Consumo Médio Real</span>
                <span className="text-xs sm:text-sm font-black text-slate-950 block leading-none">{printableData.kpis.consumoMedioReal.toFixed(2)} kg/m²</span>
              </div>
              <div className="bg-blue-50/65 p-1.5 rounded border border-blue-200/60 text-center leading-none">
                <span className="text-[8.5px] uppercase font-bold text-blue-600/80 block tracking-wider mb-0.5">Divergência de Teor</span>
                <span className={`text-xs sm:text-sm font-black block leading-none ${Math.abs(printableData.kpis.desvioConsumoPercentual) <= 5 ? "text-emerald-700" : "text-amber-700"}`}>
                  {printableData.kpis.desvioConsumoPercentual > 0 ? "+" : ""}{printableData.kpis.desvioConsumoPercentual}%
                </span>
              </div>
            </div>
          </div>

          {/* Justifications y Saneamentos */}
          {printableData.auditoria.sentidoInferidosJustificativa && (
            <div>
              <h3 className="font-bold text-slate-950 uppercase tracking-wide text-[11px] sm:text-xs border-b border-slate-300 pb-0.5 mb-0.5 leading-none">
                6. Nota Técnica de Saneamento de Georreferenciamento
              </h3>
              <div className="p-2 bg-slate-50 rounded border border-slate-200 text-slate-700 font-sans italic text-[11px] leading-tight">
                {printableData.auditoria.sentidoInferidosJustificativa}
              </div>
            </div>
          )}

          {/* Parecer Compliance */}
          <div>
            <h3 className="font-bold text-slate-950 uppercase tracking-wide text-[11px] sm:text-xs border-b border-slate-300 pb-0.5 mb-0.5 leading-none">
              7. Relatório Final de Conformidade Tecnológica
            </h3>
            <div className="p-2 bg-slate-50 rounded border border-slate-200 text-slate-900 font-sans text-[11px] leading-tight">
              <span className="font-bold block mb-0.5 uppercase text-slate-500 tracking-wider text-[8.5px]">PARECER TÉCNICO REGISTRADO</span>
              "{printableData.auditoria.diagnosticoConsumo}"
            </div>
          </div>

          {/* Registro Fotográfico no Relatório Impresso */}
          {printableData.fotos && printableData.fotos.length > 0 && (
            <div className="cursor-default">
              <h3 className="font-bold text-slate-950 uppercase tracking-wide text-xs sm:text-[13px] border-b border-slate-300 pb-1 mb-1 leading-tight mt-4 print:mt-2.5">
                8. Registro Fotográfico de Campo Assinado
              </h3>
              <div className="grid grid-cols-2 gap-3 mt-2 pr-1">
                {printableData.fotos.map((foto, fIdx) => (
                  <div key={foto.id || fIdx} className="border border-slate-200 bg-white p-1 rounded flex flex-col justify-between avoid-break">
                    <div className="aspect-video w-full overflow-hidden bg-slate-50 border-b border-slate-100 flex items-center justify-center">
                      <img
                        src={foto.url}
                        alt={foto.caption || "Registro Fotográfico"}
                        className="object-cover w-full h-full"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    {foto.caption && (
                      <p className="text-[11px] sm:text-xs font-sans text-slate-700 italic leading-snug mt-1.5 px-1 pb-1">
                        <strong>Foto {fIdx + 1}:</strong> {foto.caption}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assinatura do Diário */}
          <div className="pt-6 print:pt-4 grid grid-cols-2 gap-6 print:gap-4 font-sans">
            <div className="text-center pt-4 print:pt-2.5 border-t border-slate-350 leading-tight">
              <span className="text-slate-500 uppercase tracking-wider text-[9px] sm:text-[10px] block font-bold">COORDENADOR DO CONTRATO</span>
              <div className="font-extrabold text-slate-950 text-xs sm:text-sm mt-1">SAAS DIÁRIO TÉCNICO INTEL</div>
              <div className="text-slate-400 text-[9px] sm:text-[10px] mt-0.5">SINAL E ASSINATURA ELETRÔNICA</div>
            </div>
            <div className="text-center pt-4 print:pt-2.5 border-t border-slate-350 leading-tight">
              <span className="text-slate-500 uppercase tracking-wider text-[9px] sm:text-[10px] block font-bold">SUPERVISÃO DE ENGENHARIA / AUDITORIA</span>
              <div className="font-extrabold text-slate-950 text-xs sm:text-sm mt-1">AUDITADO DIGITALMENTE</div>
              <div className="text-slate-405 text-[9px] sm:text-[10px] mt-0.5">VALIDAÇÃO INTEGRAL POR ALGORÍTMO DE CBUQ</div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased flex flex-col selection:bg-blue-100 selection:text-slate-900">
      
      {/* Visual Navigation Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 text-white p-2.5 flex items-center justify-center">
              <HardHat className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">RDO Inteligente <span className="text-blue-600">•</span> Auditoria</h1>
                <span className="hidden sm:inline bg-slate-100 text-slate-800 text-[10px] px-2 py-0.5 font-mono border border-slate-200 uppercase font-black">v1.4 PRO</span>
              </div>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">RELATÓRIO TÉCNICO DE ENGENHARIA DE ESTRADAS</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 border border-slate-200 text-slate-600">
              <Calendar className="h-3.5 w-3.5 text-blue-600" />
              <span>{new Date().toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3 py-1.5 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">
              <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span>Saneado & Auditado</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Arena */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        
        {/* Banner Explicativo - Conceito */}
        <div className="bg-white p-6 text-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="max-w-2xl">
            <span className="bg-blue-100 text-blue-800 uppercase font-bold tracking-widest text-[9px] px-2 py-0.5">
              Auditoria de Pista Avançada
            </span>
            <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase mt-2">
              Controle de Pavimentação & Saneamento Técnico de Massa
            </h2>
            <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
              Interpreta diários confusos do campo, saneia erros de pesagem (conversões de Ton/Kg/Pontos), 
              calcula a memória geométrica de panos e audita o consumo médio em face das espessuras especificadas.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={() => {
                setRawText(RDO_TEMPLATES[0].rawText);
                setActiveTemplateIdx(0);
                setTimeout(() => handleProcessRDO(), 100);
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-blue-400" />
              Carregar Exemplo Rápido
            </button>

            <button 
              onClick={() => {
                setActiveLeftTab("history");
              }}
              className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-250 font-bold px-4 py-2 text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Calendar className="h-4 w-4 text-blue-600" />
              Ver Relatórios Salvos ({savedReports.length})
            </button>
          </div>
        </div>

        {/* PAINEL DE CONSOLIDAÇÃO GERAL (TOTAL HISTÓRICO DE DIAS EXECUTADOS) */}
        {savedReports.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border-2 border-blue-100 shadow-xs overflow-hidden flex flex-col"
          >
            <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-950">
              <div className="flex items-center gap-2">
                <div className="bg-blue-600 text-white p-1.5 flex items-center justify-center rounded-xs">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-extrabold uppercase text-xs tracking-wider">Painel de Consolidação Geral (Acumulado do Período)</h3>
                  <p className="text-[9px] text-slate-400 font-mono uppercase tracking-widest mt-0.5">Soma de todos os Diários de Obra Técnicos Saneados e Gravados no Controle</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="font-mono text-[9px] uppercase tracking-widest text-slate-400 font-bold">Resumos Integrados ({savedReports.length} Dias Ativos)</span>
                </div>
                <button
                  onClick={() => setIsLocalPrintAccumulatedActive(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-extrabold uppercase tracking-widest px-3 py-1.5 hover:shadow transition-all flex items-center gap-1.5 rounded-xs cursor-pointer ml-1 sm:ml-4"
                  id="btn-print-accumulated"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir Consolidação
                </button>
              </div>
            </div>
            
            <div className="p-5 flex flex-col xl:flex-row gap-6">
              {/* KPIs Bento-Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
                <div className="bg-slate-50 hover:bg-slate-100/75 p-4 border border-slate-200 transition-colors flex flex-col justify-between">
                  <div>
                    <span className="text-[8px] uppercase font-black text-slate-400 tracking-wider block">Dias de Pavimentação</span>
                    <span className="text-xl sm:text-2xl font-black text-slate-950 block mt-1.5 font-mono">{totalExecStats.count} <span className="text-xs font-sans text-slate-400 font-bold uppercase select-none">Dias</span></span>
                  </div>
                  <span className="text-[8px] text-slate-400 font-mono mt-3 block uppercase font-medium">Controle Diário Concluído</span>
                </div>
                
                <div className="bg-slate-50 hover:bg-slate-100/75 p-4 border border-slate-200 transition-colors flex flex-col justify-between">
                  <div>
                    <span className="text-[8px] uppercase font-black text-slate-400 tracking-wider block">Área Total Pavimentada</span>
                    <span className="text-xl sm:text-2xl font-black text-slate-950 block mt-1.5 font-mono">{totalExecStats.totalArea.toLocaleString('pt-BR')} <span className="text-xs font-sans text-slate-400 font-bold uppercase select-none">m²</span></span>
                  </div>
                  <span className="text-[8px] text-slate-400 font-mono mt-3 block uppercase font-medium">Área Mapeada por Pano</span>
                </div>

                <div className="bg-slate-50 hover:bg-slate-100/75 p-4 border border-slate-200 transition-colors flex flex-col justify-between">
                  <div>
                    <span className="text-[8px] uppercase font-black text-slate-400 tracking-wider block">Massa Total Aplicada</span>
                    <span className="text-xl sm:text-2xl font-black text-slate-950 block mt-1.5 font-mono">{(totalExecStats.totalMassaKg / 1000).toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1})} <span className="text-xs font-sans text-slate-400 font-bold uppercase select-none">t</span></span>
                  </div>
                  <span className="text-[8px] text-slate-400 font-mono mt-3 block uppercase font-medium">{totalExecStats.totalMassaKg.toLocaleString('pt-BR')} Kg Saneados</span>
                </div>

                <div className="bg-blue-50/70 p-4 border border-blue-200/50 flex flex-col justify-between">
                  <div>
                    <span className="text-[8px] uppercase font-black text-blue-600/80 tracking-wider block">Consumo Médio Global</span>
                    <span className={`text-xl sm:text-2xl font-black block mt-1.5 font-mono ${
                      totalExecConsumoMedio === 0 
                        ? "text-slate-500" 
                        : Math.abs(totalExecConsumoMedio - 72) <= 3.6 
                        ? "text-emerald-700" 
                        : "text-amber-700"
                    }`}>
                      {totalExecConsumoMedio > 0 ? `${totalExecConsumoMedio.toFixed(1)}` : "0.0"} <span className="text-xs font-sans text-slate-400 font-bold uppercase select-none">kg/m²</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[8px] text-slate-500 font-mono mt-3 uppercase font-medium">
                    <span>Espessura Acumulada RDO</span>
                  </div>
                </div>
              </div>

              {/* Tabela Simplificada de Dias Gravados */}
              <div className="w-full xl:w-96 border border-slate-200 bg-slate-50 p-4 rounded flex flex-col gap-2 shrink-0">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-[9px] uppercase font-extrabold text-slate-600 block">Soma Diária e Histórico</span>
                  <span className="text-[8px] font-mono text-slate-400 uppercase font-black">Lista Saneada</span>
                </div>
                <div className="max-h-24 overflow-y-auto flex flex-col gap-1.5 pr-1 scrollbar-thin">
                  {savedReports.map((r, i) => {
                    const rdoArea = r.data?.kpis?.areaTotal || 0;
                    const rdoMassaT = (r.data?.massaAsfaltica?.massaTotalKg || 0) / 1000;
                    const rdoStatus = r.data?.auditoria?.statusGeralAuditoria || "Conforme";
                    
                    return (
                      <div 
                        key={r.id || i} 
                        onClick={() => handleLoadReportFromHistory(r)}
                        className="flex justify-between items-center text-[10px] py-1 px-1.5 border border-slate-200 hover:border-slate-350 bg-white hover:bg-slate-50 transition-all cursor-pointer rounded-xs"
                        title="Clique para carregar este relatório no painel de edição"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-mono text-slate-900 font-extrabold shrink-0 border-r border-slate-200 pr-1.5">{r.date}</span>
                          <span className="truncate text-slate-600 max-w-[120px] font-medium leading-none">
                            {r.rdoNumber || r.data?.rdoNumber ? `Nº ${String(r.rdoNumber || r.data?.rdoNumber).padStart(2, '0')} - ` : ""}
                            {r.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[9px] shrink-0 font-bold">
                          <span className="text-slate-500">{rdoArea.toLocaleString('pt-BR')} m²</span>
                          <span className="text-blue-600">{rdoMassaT.toFixed(1)}t</span>
                          <span className={`px-1 rounded-xs text-[8px] font-black uppercase tracking-wider ${
                            rdoStatus === "Conforme" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                          }`}>
                            {rdoStatus === "Conforme" ? "OK" : "R"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Dashboard Grid split into Left (Controls/Input) and Right (Results/Audit) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT SIDE: INPUT & CONTROL STATION */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* TAB SELECTOR FOR THE LEFT COLUMN: EDITOR VS HISTORICO */}
            <div className="bg-slate-100 p-1 flex border border-slate-200">
              <button
                onClick={() => setActiveLeftTab("input")}
                className={`flex-1 py-2.5 px-3 uppercase tracking-wider text-[10px] font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeLeftTab === "input"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 bg-transparent"
                }`}
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>RDO Ativo / Editor</span>
              </button>
              
              <button
                onClick={() => setActiveLeftTab("history")}
                className={`flex-1 py-2.5 px-3 uppercase tracking-wider text-[10px] font-extrabold flex items-center justify-center gap-2 transition-all relative cursor-pointer ${
                  activeLeftTab === "history"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 bg-transparent"
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>📁 Gerenciador Mensal</span>
                {savedReports.length > 0 && (
                  <span className="ml-1.5 bg-blue-600 text-white font-mono text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-wide">
                    {savedReports.length}
                  </span>
                )}
              </button>
            </div>

            {/* TAB 1: ACTIVE EDITOR INPUT */}
            {activeLeftTab === "input" && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-6"
              >
                {/* Box de Seleção de Modelos / Casos Práticos */}
                <div className="bg-white border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Layers className="h-4 w-4 text-blue-600" />
                    <h3 className="font-extrabold uppercase text-xs tracking-wider text-slate-950">Carregar Exemplos de Campo</h3>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {RDO_TEMPLATES.map((tmpl, token) => (
                      <button
                        key={token}
                        onClick={() => handleSelectTemplate(token)}
                        className={`px-3 py-2 text-xs font-semibold text-left border transition-all rounded-xs cursor-pointer ${
                          activeTemplateIdx === token
                            ? "bg-blue-50 border-blue-600 text-blue-950 font-bold"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                        }`}
                      >
                        <div className="truncate text-[11px]">{tmpl.name}</div>
                        <div className="text-[9px] text-slate-400 truncate mt-0.5 uppercase tracking-wider">{tmpl.category}</div>
                      </button>
                    ))}
                  </div>
                  
                  <p className="text-[11px] text-slate-500 hidden sm:block leading-relaxed">
                    💡 <span className="font-bold text-slate-700">Caso Prático:</span> {RDO_TEMPLATES[activeTemplateIdx].description}
                  </p>
                </div>

                {/* Editor de Texto Bruto */}
                <div className="bg-white border border-slate-200 p-5 shadow-sm flex flex-col gap-4 relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-500" />
                      <h3 className="font-extrabold uppercase text-xs tracking-wider text-slate-950">Apontamento Bruto do Encarregado</h3>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 font-mono uppercase tracking-wider">
                      <span>Edição Livre</span>
                    </div>
                  </div>

                  {/* Date Input & Sequence inside editor block */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex-1">
                      <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Data e Sequencial do RDO</label>
                      <span className="text-[10px] text-slate-500 font-semibold uppercase">Número do RDO histórico de serviço e data</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase shrink-0 font-mono">RDO Nº:</span>
                        <input 
                          type="number"
                          min="1"
                          value={rdoNumber}
                          onChange={(e) => setRdoNumber(Math.max(1, parseInt(e.target.value) || 1))}
                          className="border border-slate-200 font-mono text-xs px-2 py-1 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 w-16 text-center"
                          title="Número Sequencial do RDO"
                        />
                      </div>
                      <input 
                        type="date"
                        value={getHtmlInputDate(dateStr)}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className="border border-slate-200 font-mono text-xs px-2.5 py-1 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 w-32"
                      />
                    </div>
                  </div>

                  <textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Insira os apontamentos brutos ou misturados do campo..."
                    rows={14}
                    className="w-full text-xs font-mono p-4 bg-slate-950 text-slate-100 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-transparent transition-all leading-relaxed shadow-inner resize-y h-96"
                  />

                  {selectedSavedReportId && (
                    <div className="text-[11px] bg-amber-50 text-amber-950 border border-amber-200 p-3.5 flex flex-col gap-2.5 shadow-2xs">
                      <div className="flex items-start gap-2">
                        <span className="h-2 w-2 bg-amber-600 rounded-full animate-ping shrink-0 mt-1" />
                        <div>
                          <p className="leading-tight font-extrabold uppercase text-[10px]">Modo Edição / Revisão Ativo</p>
                          <p className="text-slate-600 mt-1 leading-normal text-[10px]">
                            Você está editando o RDO histórico registrado em <strong className="font-extrabold text-slate-900">{dateStr}</strong>.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedSavedReportId(null);
                          const maxNum = savedReports.reduce((max: number, r: any) => {
                            const num = r.rdoNumber || r.data?.rdoNumber || 0;
                            return num > max ? num : max;
                          }, 0);
                          setRdoNumber(maxNum + 1);
                        }}
                        className="text-[9px] w-full text-center font-extrabold uppercase tracking-wider text-amber-900 hover:text-white bg-amber-100 hover:bg-amber-900 px-2.5 py-1.5 transition-colors cursor-pointer border border-amber-200"
                      >
                        Desvincular (Trabalhar como Novo RDO)
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    {selectedSavedReportId ? (
                      <div className="flex flex-col sm:flex-row gap-3 w-full">
                        <button
                          onClick={() => handleProcessRDO(false)} // Update existing
                          disabled={isProcessing}
                          className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-200 text-white font-extrabold py-3 px-4 text-[11px] tracking-wider uppercase transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                        >
                          {isProcessing ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />
                              <span>Processando...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3.5 w-3.5 text-amber-200" />
                              <span>Atualizar RDO</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleProcessRDO(true)} // Save as new
                          disabled={isProcessing}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white font-extrabold py-3 px-4 text-[11px] tracking-wider uppercase transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                        >
                          {isProcessing ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />
                              <span>Processando...</span>
                            </>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5 text-blue-200" />
                              <span>Salvar como Novo</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleProcessRDO(false)} // Save as new since selectedSavedReportId is null
                        disabled={isProcessing}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white font-extrabold py-3 px-5 text-xs tracking-wider uppercase transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                      >
                        {isProcessing ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />
                            <span>Saneando Registros...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5 text-blue-200" />
                            <span>Auditar & Sanear Relatório</span>
                          </>
                        )}
                      </button>
                    )}

                    <button 
                      onClick={() => {
                        setRawText("");
                        setSelectedSavedReportId(null);
                      }} 
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] tracking-wider uppercase font-bold transition-colors cursor-pointer text-center border border-slate-200"
                    >
                      Limpar Editor & Resetar
                    </button>
                  </div>
                </div>

                {/* Auditoria Guia Rápido */}
                <div className="bg-slate-100 p-5 border-l-4 border-slate-900 text-[11px] text-slate-600 leading-relaxed">
                  <h4 className="font-bold text-slate-900 mb-1.5 flex items-center gap-1 uppercase tracking-wider text-[10px]">
                    <Info className="h-3.5 w-3.5 text-slate-500" /> Diretrizes de Compliance Tecnológico
                  </h4>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><span className="font-bold text-slate-800">Espessura Técnica:</span> Interpretamos as codificações "003B", "003 B", "x003B" como espessura útil de 3,0 cm (0.03 metros).</li>
                    <li><span className="font-bold text-slate-800">Peso Específico Referencial:</span> Coeficiente teórico de asfalto CBUQ compactado (~2.400 kg/m³).</li>
                    <li><span className="font-bold text-slate-800">Carga Crítica de Consumo:</span> Margem ótima estabelecida em 72 kg/m² para espessura nominal de projeto.</li>
                    <li><span className="font-bold text-slate-800">Organização Digital:</span> Classificação visual imediata separada por sentido de tráfego.</li>
                  </ul>
                </div>
              </motion.div>
            )}

            {/* TAB 2: PORTFOLIO MONTHLY HISTORICAL DIRECTORY */}
            {activeLeftTab === "history" && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-4"
              >
                {/* Month Picker Selection */}
                <div className="flex items-center justify-between bg-slate-50 border border-slate-250 p-4 shadow-2xs">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Filtro de Período</span>
                    <span className="text-[11px] font-extrabold text-slate-800 uppercase mt-1">Consultar Relatórios</span>
                  </div>
                  <input 
                    type="month"
                    value={currentSelectedMonth}
                    onChange={(e) => {
                      if (e.target.value) {
                        setCurrentSelectedMonth(e.target.value);
                      }
                    }}
                    className="border border-slate-200 font-mono text-xs px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 outline-none cursor-pointer"
                  />
                </div>

                {/* Aggregated Monthly Production Dashboard */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white border border-slate-200 p-4 shadow-sm">
                    <span className="text-[8px] uppercase font-black text-slate-400 tracking-widest block mb-1">RDOs no Mês</span>
                    <span className="text-xl font-black font-mono text-slate-900 block leading-tight">{monthlyStats.count}</span>
                    <span className="text-[8px] text-slate-500 mt-1 block uppercase font-medium">Controle Diário</span>
                  </div>
                  
                  <div className="bg-white border border-slate-200 p-4 shadow-sm">
                    <span className="text-[8px] uppercase font-black text-slate-400 tracking-widest block mb-1">Área Pavimentada</span>
                    <span className="text-xl font-black font-mono text-slate-900 block leading-tight">
                      {monthlyStats.totalArea.toLocaleString('pt-BR')} <span className="text-xs font-sans text-slate-400 font-medium select-none">m²</span>
                    </span>
                    <span className="text-[8px] text-slate-500 mt-1 block uppercase font-medium">Memória Escalar</span>
                  </div>

                  <div className="bg-white border border-slate-200 p-4 shadow-sm">
                    <span className="text-[8px] uppercase font-black text-slate-400 tracking-widest block mb-1">Massa Lançada</span>
                    <span className="text-xl font-black font-mono text-slate-900 block leading-tight">
                      {(monthlyStats.totalMassaKg / 1000).toFixed(1)} <span className="text-xs font-sans text-slate-400 font-medium select-none">t</span>
                    </span>
                    <span className="text-[8px] text-slate-500 mt-1 block uppercase font-medium font-semibold">Saneada no Período</span>
                  </div>

                  <div className="bg-white border border-slate-200 p-4 shadow-sm">
                    <span className="text-[8px] uppercase font-black text-slate-400 tracking-widest block mb-1">Consumo Médio</span>
                    <span className={`text-xl font-black font-mono block leading-tight ${
                      monthlyConsumoMedio === 0
                        ? "text-slate-500"
                        : Math.abs(monthlyConsumoMedio - 72) <= 3.6
                        ? "text-emerald-700"
                        : "text-amber-700"
                    }`}>
                      {monthlyConsumoMedio > 0 ? monthlyConsumoMedio.toFixed(1) : "0.0"}{" "}
                      <span className="text-xs font-sans text-slate-400 font-medium">kg/m²</span>
                    </span>
                    <span className="text-[8px] text-slate-500 mt-1 block uppercase font-medium">Meta Projeto: 72kg/m²</span>
                  </div>
                </div>

                {/* Subtitle list of Reports */}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Lista de Relatórios do Mês</span>
                  <span className="text-[9px] font-bold text-slate-500 font-mono">Total: {filteredReports.length}</span>
                </div>

                <div className="flex flex-col gap-3 max-h-[440px] overflow-y-auto pr-1">
                  {filteredReports.length === 0 ? (
                    <div className="border border-dashed border-slate-300 p-8 text-center flex flex-col items-center justify-center gap-3 bg-white shadow-2xs">
                      <div className="h-10 w-10 bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <h5 className="font-extrabold text-[10px] text-slate-800 uppercase tracking-wider">Nenhum RDO Arquivado</h5>
                        <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed max-w-[220px] mx-auto">
                          Não há relatórios salvos em <strong className="text-slate-700">{currentSelectedMonth.split("-").reverse().join("/")}</strong>. Execute auditorias no editor para adicioná-los automaticamente!
                        </p>
                      </div>
                    </div>
                  ) : (
                    filteredReports.map((report) => (
                      <div 
                        key={report.id}
                        onClick={() => handleLoadReportFromHistory(report)}
                        className={`border p-4 bg-white hover:border-blue-600 transition-all cursor-pointer flex justify-between items-start gap-4 hover:shadow-xs group ${
                          selectedSavedReportId === report.id
                            ? "border-blue-600 bg-blue-50/15 ring-2 ring-blue-600"
                            : "border-slate-200"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-mono text-[9px] font-extrabold text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5">
                              {report.date}
                            </span>
                            <span className="font-mono text-[9px] font-black text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5">
                              Nº {String(report.rdoNumber || report.data?.rdoNumber || "").padStart(2, "0") || "S/N"}
                            </span>
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 border ${
                              report.data?.auditoria?.statusGeralAuditoria === "Conforme"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-250"
                                : report.data?.auditoria?.statusGeralAuditoria === "Aprovado com Ressalvas"
                                ? "bg-amber-50 text-amber-800 border-amber-250"
                                : "bg-rose-50 text-rose-800 border-rose-250"
                            }`}>
                              {report.data?.auditoria?.statusGeralAuditoria || "Auditado"}
                            </span>
                          </div>
                          
                          <h4 className="font-black text-[11px] text-slate-900 uppercase truncate mb-0.5 group-hover:text-blue-700 transition-colors leading-tight">
                            {report.title}
                          </h4>
                          <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest truncate">
                            {report.obra || "Trecho Não Identificado"}
                          </p>

                          <div className="grid grid-cols-3 gap-1 mt-3 pt-3 border-t border-slate-100 text-slate-600 text-[9px] font-mono leading-none">
                            <div>
                               <span className="text-slate-400 uppercase text-[8px] font-semibold block mb-0.5">Área:</span>
                               <span className="font-black text-slate-800">
                                 {report.data?.kpis?.areaTotal ? report.data.kpis.areaTotal.toFixed(0) : "0"} m²
                               </span>
                            </div>
                            <div>
                               <span className="text-slate-400 uppercase text-[8px] font-semibold block mb-0.5">Massa:</span>
                               <span className="font-black text-slate-800">
                                 {report.data?.massaAsfaltica?.massaTotalKg ? ((report.data.massaAsfaltica.massaTotalKg) / 1000).toFixed(1) : "0"} t
                               </span>
                            </div>
                            <div>
                               <span className="text-slate-400 uppercase text-[8px] font-semibold block mb-0.5">Desvio:</span>
                               <span className={`font-black ${
                                 Math.abs(report.data?.kpis?.desvioConsumoPercentual || 0) <= 5
                                   ? "text-emerald-700"
                                   : "text-amber-700"
                               }`}>
                                 {report.data?.kpis?.desvioConsumoPercentual > 0 ? "+" : ""}
                                 {report.data?.kpis?.desvioConsumoPercentual || "0"}%
                               </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteReportFromHistory(report.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-50 transition-colors self-start shrink-0 cursor-pointer"
                          title="Excluir do Histórico"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* RIGHT SIDE: AUDITED RESULTS & DASHBOARD DOCKS */}
          <div className="lg:col-span-7">
            
            <AnimatePresence mode="wait">
              {isProcessing && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white border border-slate-200 p-8 flex flex-col items-center justify-center text-center gap-6 h-[580px] shadow-xs"
                >
                  <div className="relative">
                    <div className="h-14 w-14 border-2 border-slate-100 border-t-blue-600 animate-spin" />
                    <HardHat className="h-4 w-4 absolute inset-0 m-auto text-blue-600 animate-bounce" />
                  </div>
                  
                  <div className="max-w-md">
                    <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Processando Auditoria Cognitiva</h3>
                    <p className="text-slate-500 text-xs mt-2 leading-relaxed">Varrendo relatórios diários de obras, calculando coeficientes de compactação e saneando pesagens brutas do sistema.</p>
                  </div>
                  
                  <div className="bg-slate-50 px-4 py-2 border border-slate-200 max-w-sm w-full font-mono text-[10px] text-blue-800 flex items-center justify-center gap-2">
                    <Clock className="h-3 w-3 animate-pulse" />
                    <span>{processStep}</span>
                  </div>
                </motion.div>
              )}

              {!isProcessing && error && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white border border-rose-300 p-12 text-center flex flex-col items-center justify-center gap-6 h-[580px] shadow-xs"
                >
                  <div className="h-14 w-14 bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center rounded-full">
                    <AlertTriangle className="h-6 w-6 stroke-[1.5]" />
                  </div>
                  
                  <div className="max-w-md">
                    <h3 className="font-extrabold text-rose-950 text-xs uppercase tracking-widest">Falha na Auditoria Cognitiva</h3>
                    <p className="text-slate-600 text-xs mt-3 leading-relaxed whitespace-pre-wrap">
                      {error}
                    </p>
                    {error.includes("GEMINI_API_KEY") && (
                      <div className="mt-4 bg-slate-50 border border-slate-250 p-4 text-left text-[11px] text-slate-700 leading-relaxed shadow-inner">
                        <span className="font-extrabold text-rose-900 block uppercase tracking-wide text-[9px] mb-1.5 flex items-center gap-1">
                          <Info className="h-3.5 w-3.5 text-rose-600" />
                          Configuração Necessária:
                        </span>
                        Para habilitar a auditoria baseada em IA, clique em <strong className="text-blue-700">Settings &gt; Secrets</strong> no menu superior do Google AI Studio e adicione uma Chave de API como <strong className="text-slate-900 font-mono">GEMINI_API_KEY</strong>. Após salvar, clique em tentar novamente!
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={handleProcessRDO}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs uppercase tracking-wider font-extrabold py-3 px-6 transition-all shadow-xs cursor-pointer"
                  >
                    Tentar Novamente
                  </button>
                </motion.div>
              )}

              {!isProcessing && !rdoData && !error && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white border border-dashed border-slate-300 p-12 text-center flex flex-col items-center justify-center gap-6 h-[580px] shadow-xs"
                >
                  <div className="h-14 w-14 bg-slate-50 text-slate-400 border border-slate-200 flex items-center justify-center">
                    <HardHat className="h-6 w-6 stroke-[1.5]" />
                  </div>
                  
                  <div className="max-w-md">
                    <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-widest">Aguardando Importação de RDO</h3>
                    <p className="text-slate-500 text-xs mt-2 leading-relaxed">
                      Selecione um dos Casos Práticos de Engenharia no menu lateral esquerdo ou introduza os apontamentos originais para disparar o motor inteligente de auditoria de pavimentação.
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => handleSelectTemplate(0)}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs uppercase tracking-wider font-bold py-2.5 px-4 transition-colors shadow-xs"
                  >
                    Carregar Primeiro Caso Técnico
                  </button>
                </motion.div>
              )}

              {!isProcessing && rdoData && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white border border-slate-200 shadow-xs overflow-hidden flex flex-col gap-6"
                >
                  {/* Processed Header */}
                  <div className="bg-slate-900 text-white p-6 border-b-2 border-slate-950 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-600 text-white font-extrabold text-[9px] px-2.5 py-0.5 uppercase tracking-wider">
                          Saneado & Auditado
                        </span>
                        <h3 className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Building className="h-3.5 w-3.5 text-blue-400" /> KM Saneamento</h3>
                      </div>
                      <h2 className="text-base font-black tracking-tight text-white uppercase mt-2.5 leading-tight">{rdoData.title}</h2>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-1">{rdoData.obra}</p>
                    </div>

                    <div className="flex flex-col sm:items-end gap-1.5">
                      <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">Parecer de Controle:</span>
                      <div className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                        rdoData.auditoria.statusGeralAuditoria === "Conforme"
                          ? "bg-emerald-100 text-emerald-800"
                          : rdoData.auditoria.statusGeralAuditoria === "Aprovado com Ressalvas"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{rdoData.auditoria.statusGeralAuditoria}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tabs Selector */}
                  <div className="px-6 border-b border-slate-200 flex flex-wrap gap-2 bg-slate-50">
                    <button
                      onClick={() => setSelectedTab("overview")}
                      className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                        selectedTab === "overview"
                          ? "border-blue-600 text-blue-600 font-extrabold"
                          : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                      }`}
                    >
                      <TrendingUp className="h-3.5 w-3.5" />
                      Visão Geral & KPIs
                    </button>
                    
                    <button
                      onClick={() => setSelectedTab("geometry")}
                      className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                        selectedTab === "geometry"
                          ? "border-blue-600 text-blue-600 font-extrabold"
                          : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                      }`}
                    >
                      <Scale className="h-3.5 w-3.5" />
                      Memória Geométrica ({rdoData.panos.length})
                    </button>
                    
                    <button
                      onClick={() => setSelectedTab("resources")}
                      className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                        selectedTab === "resources"
                          ? "border-blue-600 text-blue-600 font-extrabold"
                          : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                      }`}
                    >
                      <Users className="h-3.5 w-3.5" />
                      Equipe & Frota ({totalPeople} P / {totalEquipment} Eq.)
                    </button>

                    <button
                      onClick={() => setSelectedTab("ocorrencias")}
                      className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                        selectedTab === "ocorrencias"
                          ? "border-blue-600 text-blue-600 font-extrabold"
                          : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                      }`}
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      Ocorrências ({rdoData.ocorrencias?.length || 0})
                    </button>

                    <button
                      onClick={() => setSelectedTab("fotos")}
                      className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                        selectedTab === "fotos"
                          ? "border-blue-600 text-blue-600 font-extrabold"
                          : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                      }`}
                    >
                      <Camera className="h-3.5 w-3.5" />
                      Fotos de Campo ({rdoData.fotos?.length || 0})
                    </button>

                    <button
                      onClick={() => setSelectedTab("markdown")}
                      className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ml-auto ${
                        selectedTab === "markdown"
                          ? "border-blue-600 text-blue-600 font-extrabold"
                          : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Laudo Técnico
                    </button>
                  </div>

                  {/* TAB 1: VISÃO GERAL (KPIs & ANALYTICS) */}
                  {selectedTab === "overview" && (
                    <div className="px-6 pb-6 flex flex-col gap-6 animate-fadeIn">
                      
                      {/* KPIs Bento Section */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
                        
                        <div className="bg-white p-4 border border-slate-200 shadow-xs">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1 block">Massa Aplicada</span>
                          <div className="text-2xl font-bold font-mono text-slate-950 tracking-tight">{rdoData.massaAsfaltica.massaTotalKg.toLocaleString('pt-BR')} <span className="text-xs font-sans text-slate-400 font-medium">kg</span></div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 mt-1 block">({rdoData.massaAsfaltica.massaTotalTons.toFixed(2)} t) SANEADO</span>
                        </div>

                        <div className="bg-white p-4 border border-slate-200 shadow-xs">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1 block">Área Executada</span>
                          <div className="text-2xl font-bold font-mono text-slate-950 tracking-tight">{rdoData.kpis.areaTotal.toLocaleString('pt-BR')} <span className="text-xs font-sans text-slate-400 font-medium">m²</span></div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 mt-1 block">{rdoData.panos.length} SEÇÕES TOTAIS</span>
                        </div>

                        <div className="bg-white p-4 border border-slate-200 shadow-xs">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1 block">Volume de Mistura</span>
                          <div className="text-2xl font-bold font-mono text-slate-950 tracking-tight">{rdoData.kpis.volumeTotal.toLocaleString('pt-BR')} <span className="text-xs font-sans text-slate-400 font-medium">m³</span></div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 mt-1 block">ESPESSURA PROJETO</span>
                        </div>

                        <div className="bg-white p-4 border border-slate-200 shadow-xs">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1 block">Total Equipe</span>
                          <div className="text-2xl font-bold font-mono text-slate-950 tracking-tight">{totalPeople} <span className="text-xs font-sans text-slate-400 font-medium">pessoas</span></div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 mt-1 block">{rdoData.efetivo.length} FUNÇÕES</span>
                        </div>

                        <div className="bg-white p-4 border border-slate-200 shadow-xs">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1 block">Total Máquinas</span>
                          <div className="text-2xl font-bold font-mono text-slate-950 tracking-tight">{totalEquipment} <span className="text-xs font-sans text-slate-400 font-medium">máquinas</span></div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 mt-1 block">{rdoData.equipamentos.length} EXTRAÍDAS</span>
                        </div>

                        <div className="bg-blue-600 p-4 border border-blue-700 shadow-sm text-white">
                          <span className="text-[10px] uppercase font-bold text-blue-100 tracking-widest mb-1 block">Consumo Médio</span>
                          <div className="text-2xl font-bold font-mono tracking-tight">{rdoData.kpis.consumoMedioReal.toFixed(2)} <span className="text-xs font-sans text-blue-200 font-medium">kg/m²</span></div>
                          <span className="text-[9px] uppercase font-bold text-blue-200 mt-1 block">REF TEÓRICA: 72.00</span>
                        </div>

                      </div>

                      {/* Desvio do Material - Engineering Graph Bar */}
                      <div className="bg-white p-5 border border-slate-200 shadow-xs">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-1.5">
                            <Scale className="h-4 w-4 text-blue-600" />
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-905">Análise de Desvio Tecnológico de Consumo</span>
                          </div>
                          <span className={`text-[10px] font-bold font-mono px-2 py-0.5 uppercase tracking-wider ${
                            Math.abs(rdoData.kpis.desvioConsumoPercentual) <= 5
                              ? "bg-emerald-100 text-emerald-800"
                              : rdoData.kpis.desvioConsumoPercentual > 5
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}>
                            DESVIO: {rdoData.kpis.desvioConsumoPercentual > 0 ? "+" : ""}{rdoData.kpis.desvioConsumoPercentual}%
                          </span>
                        </div>

                        <div className="w-full h-3 bg-slate-100 border border-slate-200 overflow-hidden relative">
                          {/* Ideal Zone Indicator */}
                          <div className="absolute left-[45%] right-[45%] h-full bg-emerald-50 border-x border-emerald-200" title="Zona Tecnologicamente Conforme (±5%)" />
                          
                          {/* Real Point */}
                          <div 
                            className={`absolute h-full transition-all duration-300 ${
                              Math.abs(rdoData.kpis.desvioConsumoPercentual) <= 5
                                ? "bg-emerald-500"
                                : rdoData.kpis.desvioConsumoPercentual > 5
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                            style={{ 
                              left: "0%", 
                              width: `${Math.min(100, Math.max(10, 50 + (rdoData.kpis.desvioConsumoPercentual || 0)))}%` 
                            }}
                          />
                        </div>

                        <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-1.5 uppercase font-medium">
                          <span>Subespessura</span>
                          <span className="text-emerald-600 font-bold">Faixa Tolerável Projeto (72.00 kg/m²)</span>
                          <span>Superespessura / Desperdício</span>
                        </div>
                      </div>

                      {/* Technical Audit Narrative Card */}
                      <div className="bg-slate-100 p-5 border-l-4 border-slate-900 flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-slate-900">
                          <AlertTriangle className="h-4 w-4 text-slate-600" />
                          <h4 className="font-extrabold uppercase tracking-wider text-[11px] text-slate-950">Notas de Auditoria & Saneamento de Campo</h4>
                        </div>
                        
                        <div className="text-[11px] text-slate-600 space-y-3 leading-relaxed">
                          <div>
                            <div className="font-bold text-slate-900 uppercase tracking-wider text-[9px] mb-1">
                              Saneador de Massa CBUQ Descarregada
                            </div>
                            <div className="bg-white p-3 border border-slate-200 font-mono text-[10px] text-slate-600 max-h-40 overflow-y-auto w-full">
                              {rdoData.massaAsfaltica.itens.map((it, idx) => (
                                <div key={idx} className="border-b border-slate-100 py-1 last:border-none">
                                  ✔ <span className="font-bold text-slate-800">{it.identificador}:</span> "{it.valorOriginal}" → corrigido para <span className="text-blue-600 font-bold">{it.valorSaneadoKg.toLocaleString('pt-BR')} kg</span>. {it.observacaoSaneamento}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <span className="font-bold text-slate-900 uppercase tracking-widest text-[9px] block mb-0.5">Atribuição de Sentidos Reconstruída:</span> 
                            <p className="italic text-slate-600">{rdoData.auditoria.sentidoInferidosJustificativa}</p>
                          </div>

                          <div>
                            <span className="font-bold text-slate-900 uppercase tracking-widest text-[9px] block mb-0.5">Laudo de Engenharia:</span> 
                            <p className="italic text-slate-600">{rdoData.auditoria.diagnosticoConsumo}</p>
                          </div>
                        </div>
                      </div>

                      {/* Ocorrências / Eventos Imprevistos Panel */}
                      <div className="border border-slate-200 bg-white p-5">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-3">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          <h4 className="font-extrabold uppercase tracking-wider text-[11px] text-slate-950">Ocorrências & Impactos Registrados</h4>
                        </div>
                        
                        {(!rdoData.ocorrencias || rdoData.ocorrencias.length === 0) ? (
                          <p className="text-[11px] text-slate-500 italic">
                            Nenhuma intercorrência (ex: quebras de maquinário, falta de efetivo, intempéries do tempo) foi relatada hoje. O cronograma fluiu sem interferências.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {rdoData.ocorrencias.map((item, idx) => (
                              <div key={idx} className="bg-slate-50/50 border border-slate-200 p-3 rounded flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                  <span className={`text-[8px] font-mono uppercase font-black px-1.5 py-0.5 rounded-sm border shrink-0 ${
                                    item.tipo === "Equipamento Quebrado"
                                      ? "bg-rose-50 text-rose-800 border-rose-200"
                                      : item.tipo === "Intempéries do Tempo"
                                      ? "bg-sky-50 text-sky-800 border-sky-200"
                                      : item.tipo === "Falta de Efetivo"
                                      ? "bg-purple-50 text-purple-800 border-purple-200"
                                      : item.tipo === "Atraso no Fornecimento"
                                      ? "bg-amber-50 text-amber-800 border-amber-200"
                                      : "bg-slate-50 text-slate-800 border-slate-200"
                                  }`}>
                                    {item.tipo}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-700 font-medium leading-relaxed mt-1">
                                  {item.descricao}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  )}

                  {/* TAB 2: GEOMETRIC CALCULATIONS (MANUAL EDITING / REAL RECALCULATE) */}
                  {selectedTab === "geometry" && (
                    <div className="px-6 pb-6 flex flex-col gap-6 animate-fadeIn">
                      
                      <div className="bg-slate-50 p-4 border border-slate-200 flex justify-between items-center text-xs text-slate-600">
                        <div className="flex items-center gap-2 text-slate-700">
                          <Info className="h-4 w-4 text-blue-600 shrink-0" />
                          <span>Ajuste comprimentos e larguras diretamente nos campos. O sistema recalcula a conformidade de CBUQ instantaneamente.</span>
                        </div>
                      </div>

                      {/* We will render two separate tables, grouping them exactly by Sentido */}
                      {(() => {
                        const sentidos = Array.from(new Set(rdoData.panos.map(p => p.sentidoCalculado))) as string[];
                        
                        return (
                          <div className="flex flex-col gap-6">
                            {sentidos.map((sentido: string) => {
                              const panosDoSentido = rdoData.panos.filter(p => p.sentidoCalculado === sentido);
                              if (panosDoSentido.length === 0) return null;

                              return (
                                <div key={sentido} className="border border-slate-200 overflow-hidden bg-white shadow-xs">
                                  <div className="bg-slate-900 text-white px-4 py-3 font-extrabold text-[10px] tracking-wider uppercase flex justify-between items-center">
                                    <span>Pista / Sentido: {sentido.toUpperCase()}</span>
                                    <span className="bg-slate-800 text-slate-300 font-mono text-[9px] px-2 py-0.5 border border-slate-700">
                                      {panosDoSentido.length} {panosDoSentido.length === 1 ? "Seção" : "Seções"}
                                    </span>
                                  </div>

                                  <div className="overflow-x-auto text-xs">
                                    <table className="w-full text-left border-collapse">
                                      <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                          <th className="py-3 px-4 font-bold">Estaca / Segmento</th>
                                          <th className="py-3 px-3 font-bold font-mono">Compr. (C)</th>
                                          <th className="py-3 px-3 font-bold font-mono">Larg. (L)</th>
                                          <th className="py-3 px-3 font-bold font-mono">Espessura Projeto</th>
                                          <th className="py-3 px-3 font-bold text-right font-mono text-slate-700">Área (m²)</th>
                                          <th className="py-3 px-3 font-bold text-right font-mono text-slate-700">Volume (m³)</th>
                                          <th className="py-3 px-4 text-center">Auditado</th>
                                          <th className="py-3 px-4 text-right">Ação</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-150">
                                        {panosDoSentido.map(p => {
                                          const isEditing = editingPanoId === p.id;

                                          return (
                                            <tr key={p.id} className="hover:bg-slate-50/50 transition-all font-sans">
                                              <td className="py-3 px-4 font-bold text-slate-800">{p.segmento}</td>
                                              
                                              {/* Comprimento */}
                                              <td className="py-3 px-3 font-mono">
                                                {isEditing ? (
                                                  <input
                                                    type="number"
                                                    value={tempPanoLengths[p.id] !== undefined ? tempPanoLengths[p.id] : p.comprimento}
                                                    onChange={(e) => setTempPanoLengths({
                                                      ...tempPanoLengths,
                                                      [p.id]: parseFloat(e.target.value) || 0
                                                    })}
                                                    className="w-16 border border-slate-300 px-1.5 py-0.5 text-xs text-slate-900 font-mono font-bold bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                                                  />
                                                ) : (
                                                  `${p.comprimento.toFixed(2)} m`
                                                )}
                                              </td>

                                              {/* Largura */}
                                              <td className="py-3 px-3 font-mono">
                                                {isEditing ? (
                                                  <input
                                                    type="number"
                                                    value={tempPanoWidths[p.id] !== undefined ? tempPanoWidths[p.id] : p.largura}
                                                    onChange={(e) => setTempPanoWidths({
                                                      ...tempPanoWidths,
                                                      [p.id]: parseFloat(e.target.value) || 0
                                                    })}
                                                    className="w-16 border border-slate-300 px-1.5 py-0.5 text-xs text-slate-900 font-mono font-bold bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                                                  />
                                                ) : (
                                                  `${p.largura.toFixed(2)} m`
                                                )}
                                              </td>

                                              {/* Espessura */}
                                              <td className="py-3 px-3 text-slate-500 font-mono">
                                                <span>{p.espessuraNum.toFixed(3)} m </span>
                                                <span className="text-[9px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 font-sans uppercase">({p.espessuraString})</span>
                                              </td>

                                              {/* Area */}
                                              <td className="py-3 px-3 font-mono font-bold text-right text-slate-900">{p.area.toFixed(3)}</td>

                                              {/* Volume */}
                                              <td className="py-3 px-3 font-mono font-bold text-right text-slate-900">{p.volume.toFixed(3)}</td>

                                              {/* Audit Badge */}
                                              <td className="py-3 px-4 text-center">
                                                {p.sentidoInferido ? (
                                                  <span className="bg-amber-50 text-amber-800 text-[9px] font-bold uppercase px-2 py-0.5 border border-amber-250">
                                                    Inferido
                                                  </span>
                                                ) : (
                                                  <span className="bg-emerald-50 text-emerald-800 text-[9px] font-bold uppercase px-2 py-0.5 border border-emerald-250">
                                                    Ok
                                                  </span>
                                                )}
                                              </td>

                                              {/* Actions column */}
                                              <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                  {isEditing ? (
                                                    <button
                                                      onClick={() => handleSavePanoEdit(p.id)}
                                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                                    >
                                                      <Save className="h-3 w-3" />
                                                      Salvar
                                                    </button>
                                                  ) : (
                                                    <button
                                                      onClick={() => handleStartEditPano(p)}
                                                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-50 transition-colors"
                                                      title="Editar comprimento e largura"
                                                    >
                                                      <Edit3 className="h-3.5 w-3.5" />
                                                    </button>
                                                  )}

                                                  <button
                                                    onClick={() => handleDeletePano(p.id)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-50 transition-colors"
                                                    title="Deletar pano de massa"
                                                  >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                  </button>
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {/* Manual Pano Adder Dock to expand capabilities */}
                      <div className="border border-slate-200 p-5 bg-slate-50">
                        <h4 className="font-extrabold uppercase tracking-widest text-[10px] text-slate-900 mb-4 flex items-center gap-2">
                          <Plus className="h-4 w-4 text-blue-600" />
                          <span>Adicionar Pano Pós-Auditoria (Seção Manual)</span>
                        </h4>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Estaca / Segmento</label>
                            <input
                              type="text"
                              value={newPano.segmento}
                              onChange={(e) => setNewPano({ ...newPano, segmento: e.target.value })}
                              className="border border-slate-300 px-2 py-1.5 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Comprimento (m)</label>
                            <input
                              type="number"
                              value={newPano.comprimento}
                              onChange={(e) => setNewPano({ ...newPano, comprimento: parseFloat(e.target.value) || 0 })}
                              className="border border-slate-300 px-2 py-1.5 text-xs text-slate-800 bg-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-600"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Largura (m)</label>
                            <input
                              type="number"
                              value={newPano.largura}
                              onChange={(e) => setNewPano({ ...newPano, largura: parseFloat(e.target.value) || 0 })}
                              className="border border-slate-300 px-2 py-1.5 text-xs text-slate-800 bg-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-600"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Pista / Sentido</label>
                            <select
                              value={newPano.sentido}
                              onChange={(e) => setNewPano({ ...newPano, sentido: e.target.value as "Norte" | "Sul" })}
                              className="border border-slate-300 px-2 py-1.5 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                            >
                              <option value="Sul">Pista Sul (Oeste)</option>
                              <option value="Norte">Pista Norte (Leste)</option>
                            </select>
                          </div>

                          <div className="flex items-end">
                            <button
                              onClick={handleAddPano}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold uppercase tracking-wide py-2 rounded text-[11px] transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              Adicionar
                            </button>
                          </div>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* TAB 3: RESOURCES (STAFF & EQUIPMENTS) */}
                  {selectedTab === "resources" && (
                    <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn mt-6">
                      
                      {/* Human Resources Saneado card */}
                      <div className="border border-slate-200 overflow-hidden bg-white">
                        <div className="bg-slate-900 border-b border-slate-950 text-white px-4 py-3 font-extrabold text-[10px] uppercase tracking-wider flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 text-blue-400" />
                            <span>Efetivo e Equipe de Campo Saneada</span>
                          </div>
                          <span className="bg-blue-600 text-white font-mono text-xs px-2 py-0.5 rounded font-black">{totalPeople} Pessoas</span>
                        </div>

                        <div className="p-4 flex flex-col gap-2 max-h-[400px] overflow-y-auto">
                          {rdoData.efetivo.map((person, id) => (
                            <div key={id} className="bg-slate-50 border border-slate-200 p-3 grid grid-cols-[1fr_40px] items-center gap-3 text-xs">
                              <div>
                                <span className="font-bold text-slate-950 uppercase text-[10px] tracking-wider block">{person.funcao}</span>
                                {person.nomesFormatados && (
                                  <span className="text-slate-500 font-medium block mt-1 italic text-[11px]">{person.nomesFormatados}</span>
                                )}
                              </div>
                              <div className="flex justify-end pr-1 select-none shrink-0">
                                <span className="inline-flex items-center justify-center min-w-[22px] h-[20px] px-2 rounded bg-blue-600 border border-blue-700 text-white font-extrabold text-[11px] leading-none">
                                  {person.quantidade}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Equipment List Status Card */}
                      <div className="border border-slate-200 overflow-hidden bg-white">
                        <div className="bg-slate-900 border-b border-slate-950 text-white px-4 py-3 font-extrabold text-[10px] uppercase tracking-wider flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Wrench className="h-3.5 w-3.5 text-blue-400" />
                            <span>Frota Pesada Extraída</span>
                          </div>
                          <span className="bg-blue-600 text-white font-mono text-xs px-2 py-0.5 rounded font-black">{totalEquipment} Máquinas</span>
                        </div>

                        <div className="p-4 flex flex-col gap-2 max-h-[400px] overflow-y-auto">
                          {rdoData.equipamentos.map((eq, id) => (
                            <div key={id} className="bg-slate-50 border border-slate-200 p-3 grid grid-cols-[1fr_40px_110px] items-center gap-2 text-xs">
                              <span className="font-bold text-slate-950 uppercase text-[10px] tracking-wider truncate pr-1">{eq.nome}</span>
                              <div className="flex justify-center select-none shrink-0">
                                <span className="inline-flex items-center justify-center min-w-[22px] h-[20px] px-2 rounded bg-amber-500 border border-amber-600 text-white font-extrabold text-[11px] leading-none">
                                  {eq.quantidade}
                                </span>
                              </div>
                              <div className="flex justify-end shrink-0">
                                <span className={`text-[9px] font-mono uppercase font-bold tracking-wider inline-block px-1.5 py-0.5 border ${
                                  eq.status.includes("operação") || eq.status.includes("operando")
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-250"
                                    : "bg-amber-50 text-amber-800 border-amber-250"
                                }`}>
                                  {eq.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* TAB: OCORRÊNCIAS & IMPREVISTOS */}
                  {selectedTab === "ocorrencias" && (
                    <div className="px-6 pb-6 flex flex-col gap-6 animate-fadeIn mt-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-150 pb-4">
                        <div>
                          <h3 className="font-extrabold uppercase text-sm tracking-wider text-slate-900 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Registro de Ocorrências e Imprevistos
                          </h3>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Anote ou edite eventos que atrasaram, prejudicaram ou impossibilitaram os serviços de pavimentação (ex: quebras, chuva, falta de efetivo).
                          </p>
                        </div>
                        <div className="bg-slate-100 border border-slate-200 px-3 py-1 font-mono text-[10px] font-black text-slate-600 rounded">
                          {rdoData.ocorrencias?.length || 0} Ocorrências
                        </div>
                      </div>

                      {/* Add Occurrence Form */}
                      <div className="border border-slate-200 bg-white p-5">
                        <h4 className="font-bold text-xs uppercase text-slate-900 mb-3 flex items-center gap-1.5">
                          <Plus className="h-3.5 w-3.5 text-blue-600" />
                          Registrar Nova Ocorrência / Paralisação
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                          <div className="md:col-span-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tipo de Ocorrência</label>
                            <select
                              value={newOcorrTipo}
                              onChange={(e) => setNewOcorrTipo(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-800"
                            >
                              <option value="Equipamento Quebrado">⚙️ Equipamento Quebrado</option>
                              <option value="Intempéries do Tempo">🌧️ Intempéries do Tempo</option>
                              <option value="Falta de Efetivo">👤 Falta de Efetivo</option>
                              <option value="Atraso no Fornecimento">🚚 Atraso no Fornecimento</option>
                              <option value="Outros">⚠️ Outros</option>
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Descrição do Imprevisto</label>
                            <input
                              type="text"
                              value={newOcorrDesc}
                              onChange={(e) => setNewOcorrDesc(e.target.value)}
                              placeholder="Ex: Chuva torrencial impediu a aplicação de asfalto a partir das 15:30h."
                              className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleAddOcorrencia();
                              }}
                            />
                          </div>
                          <div>
                            <button
                              onClick={handleAddOcorrencia}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] uppercase tracking-wider py-2 px-4 rounded transition-all flex items-center justify-center gap-2"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Adicionar
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Occurrence List */}
                      <div className="border border-slate-200 overflow-hidden bg-white">
                        <div className="bg-slate-900 border-b border-slate-950 text-white px-4 py-3 font-extrabold text-[10px] uppercase tracking-wider">
                          Relação de Intercorrências Saneadas / Relatadas
                        </div>

                        <div className="divide-y divide-slate-150">
                          {(!rdoData.ocorrencias || rdoData.ocorrencias.length === 0) ? (
                            <div className="p-8 text-center text-xs text-slate-400">
                              Nenhuma ocorrência registrada para este dia. O serviço fluiu normalmente.
                            </div>
                          ) : (
                            rdoData.ocorrencias.map((item, id) => {
                              const isEditing = editingOcorrIdx === id;
                              return (
                                <div key={id} className="p-4 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col gap-3">
                                  {isEditing ? (
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Tipo</label>
                                        <select
                                          value={tempOcorrTipo}
                                          onChange={(e) => setTempOcorrTipo(e.target.value)}
                                          className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-800"
                                        >
                                          <option value="Equipamento Quebrado">⚙️ Equipamento Quebrado</option>
                                          <option value="Intempéries do Tempo">🌧️ Intempéries do Tempo</option>
                                          <option value="Falta de Efetivo">👤 Falta de Efetivo</option>
                                          <option value="Atraso no Fornecimento">🚚 Atraso no Fornecimento</option>
                                          <option value="Outros">⚠️ Outros</option>
                                        </select>
                                      </div>
                                      <div className="md:col-span-2">
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Descrição</label>
                                        <input
                                          type="text"
                                          value={tempOcorrDesc}
                                          onChange={(e) => setTempOcorrDesc(e.target.value)}
                                          className="w-full bg-white border border-slate-300 rounded px-3 py-1 text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                                        />
                                      </div>
                                      <div className="flex gap-2 justify-end">
                                        <button
                                          onClick={() => handleSaveEditOcorrencia(id)}
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[9px] uppercase px-3 py-1.5 rounded flex items-center gap-1"
                                        >
                                          <Save className="h-3 w-3" /> Salvar
                                        </button>
                                        <button
                                          onClick={() => setEditingOcorrIdx(null)}
                                          className="bg-slate-500 hover:bg-slate-600 text-white font-extrabold text-[9px] uppercase px-3 py-1.5 rounded flex items-center gap-1"
                                        >
                                          <X className="h-3 w-3" /> Cancelar
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between gap-4">
                                      <div className="flex items-start gap-3">
                                        <span className={`text-[9px] font-mono uppercase font-black tracking-wider inline-block px-2 py-0.5 border shrink-0 rounded-sm mt-0.5 ${
                                          item.tipo === "Equipamento Quebrado"
                                            ? "bg-rose-50 text-rose-800 border-rose-200"
                                            : item.tipo === "Intempéries do Tempo"
                                            ? "bg-sky-50 text-sky-800 border-sky-200"
                                            : item.tipo === "Falta de Efetivo"
                                            ? "bg-purple-50 text-purple-800 border-purple-200"
                                            : item.tipo === "Atraso no Fornecimento"
                                            ? "bg-amber-50 text-amber-800 border-amber-200"
                                            : "bg-slate-50 text-slate-800 border-slate-200"
                                        }`}>
                                          {item.tipo}
                                        </span>
                                        <p className="text-xs text-slate-700 font-medium leading-relaxed">
                                          {item.descricao}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          onClick={() => handleStartEditOcorrencia(id, item)}
                                          className="p-1 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-all rounded"
                                          title="Editar ocorrência"
                                        >
                                          <Edit3 className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteOcorrencia(id)}
                                          className="p-1 hover:bg-red-100 text-slate-400 hover:text-red-700 transition-all rounded"
                                          title="Remover ocorrência"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB: FOTOS DE CAMPO */}
                  {selectedTab === "fotos" && (
                    <div className="px-6 pb-6 flex flex-col gap-6 animate-fadeIn mt-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-150 pb-4">
                        <div>
                          <h3 className="font-extrabold uppercase text-sm tracking-wider text-slate-900 flex items-center gap-2">
                            <Camera className="h-5 w-5 text-blue-600" />
                            Registro Fotográfico de Campo
                          </h3>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Adicione fotos reais da obra (máximo 30 fotos). Elas serão integradas automaticamente ao laudo impresso e salvas no histórico.
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-150 border border-slate-200 px-2.5 py-1 uppercase">
                            Fotos: {rdoData.fotos?.length || 0} / 30
                          </span>
                        </div>
                      </div>

                      {/* Photo Upload Area */}
                      {(rdoData.fotos?.length || 0) < 30 ? (
                        <div className="border border-dashed border-blue-300 bg-blue-50/10 hover:bg-blue-50/20 hover:border-blue-500 transition-all p-8 text-center relative focus-within:ring-2 focus-within:ring-blue-500">
                          <input 
                            type="file" 
                            accept="image/*" 
                            multiple 
                            onChange={handlePhotoUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer h-full w-full"
                          />
                          <UploadCloud className="h-10 w-10 text-blue-500 mx-auto mb-3" />
                          <p className="text-xs font-bold text-slate-800">
                            Clique para subir ou arraste fotos de campo do dia de serviço
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1.5 font-medium leading-normal">
                            Suporta formatos padrão JPEG, PNG de até 1.5MB cada. Dimensões sugeridas: Proporção 4:3 ou 16:9.
                          </p>
                        </div>
                      ) : (
                        <div className="border border-amber-200 bg-amber-50/30 p-4 text-center text-amber-950 font-medium text-xs flex items-center justify-center gap-2">
                          <span>⚠️</span>
                          <span>O limite máximo de 30 fotos já foi atingido. Remova alguma imagem se deseja incluir novas.</span>
                        </div>
                      )}

                      {/* Photo Grid */}
                      {rdoData.fotos && rdoData.fotos.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                          {rdoData.fotos.map((foto, idx) => (
                            <div key={foto.id || idx} className="border border-slate-200 bg-white shadow-2xs group flex flex-col relative">
                              {/* Remove photo button */}
                              <button 
                                onClick={() => handleRemovePhoto(foto.id)}
                                className="absolute top-2 right-2 bg-slate-900/80 hover:bg-red-600 text-white p-1.5 transition-colors shadow shadow-slate-950/20 z-10 cursor-pointer"
                                title="Remover Foto"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>

                              {/* Photo image */}
                              <div className="aspect-video w-full bg-slate-100 overflow-hidden relative border-b border-slate-200">
                                <img 
                                  src={foto.url} 
                                  alt={foto.caption || "Foto da obra"} 
                                  className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-[1.03]"
                                  referrerPolicy="no-referrer"
                                />
                                <span className="absolute bottom-2 left-2 bg-slate-900/70 text-white font-mono text-[9px] px-1.5 py-0.5 uppercase tracking-widest font-black">
                                  Foto #{idx + 1}
                                </span>
                              </div>

                              {/* Photo caption input */}
                              <div className="p-3 bg-slate-50 flex-1 flex flex-col gap-1.5">
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                                  Legenda / Descrição da Atividade:
                                </label>
                                <input 
                                  type="text" 
                                  value={foto.caption || ""} 
                                  onChange={(e) => handleUpdatePhotoCaption(foto.id, e.target.value)}
                                  placeholder="Ex: Espalhamento de CBUQ, Compactação Estaca 15..."
                                  className="w-full border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600 px-2 py-1.5 text-[11px] bg-white text-slate-800 font-semibold"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="border border-dashed border-slate-200 py-12 text-center bg-slate-50 flex flex-col items-center justify-center gap-3">
                          <ImageIcon className="h-9 w-9 text-slate-300" />
                          <div>
                            <p className="text-xs font-bold text-slate-600">Nenhuma foto adicionada para este diário ainda</p>
                            <p className="text-[10px] text-slate-400 mt-1 max-w-[280px]">
                              As fotos sobem direto pelo navegador, gerando visualização comprimida offline que se integra ao laudo técnico de compliance.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: MARKDOWN REPORT OUTPUT & PREVIEW */}
                  {selectedTab === "markdown" && (
                    <div className="px-6 pb-6 flex flex-col gap-6 animate-fadeIn mt-6">
                      
                      <div className="flex justify-between items-center bg-slate-50 p-4 border border-slate-200 gap-4">
                        <div className="text-xs text-slate-600">
                          <p className="font-bold text-slate-900">Versão Saneada em Formato Oficial</p>
                          <p className="mt-0.5 text-[10px]">O código abaixo está pronto para ser copiado e colado em seu editor de relatórios corporativos.</p>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={handleCopyMarkdown}
                            className="bg-slate-950 hover:bg-slate-900 border border-slate-950 text-white font-extrabold uppercase tracking-wider text-[10px] px-4 py-2.5 transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            {copied ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                <span>Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Copiar Markdown</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={handlePrint}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold uppercase tracking-wider text-[10px] px-4 py-2.5 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            <span>Imprimir Laudo Técnico</span>
                          </button>
                        </div>
                      </div>

                      {/* Display Markdown Block */}
                      <div className="bg-slate-950 p-5 border border-slate-900 max-h-96 overflow-y-auto leading-relaxed shadow-inner">
                        <pre className="text-xs font-mono text-slate-350 whitespace-pre-wrap whitespace-break-spaces overflow-x-auto selection:bg-slate-800">
                          {rdoData.markdownReport}
                        </pre>
                      </div>

                      {/* Visor do Relatório Estilizado - Visual Preview Panel */}
                      <div id="laudo-tecnico-print" className="border border-slate-200 p-6 bg-white prose prose-slate max-w-none text-xs text-slate-800 leading-relaxed max-h-96 overflow-y-auto shadow-xs">
                        <div className="bg-slate-900 text-white px-3 py-1 text-[9px] font-mono tracking-widest uppercase mb-4 inline-block print:hidden">
                          VISUALIZADOR TÉCNICO INTERNO (RDO COMPLETO)
                        </div>

                        <div className="font-sans space-y-4">
                          <div className="border-b-2 border-slate-800 pb-3">
                            <h2 className="text-base font-bold text-slate-950 uppercase">RDO Saneado de Pavimentação</h2>
                            <div className="text-slate-500 mt-1 font-mono text-[10px]">DIÁRIO DE CAMPO - AUDITORIA DE COMPACTAÇÃO</div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-[11px]">
                            <div>
                              <span className="font-bold text-slate-500 uppercase tracking-wide text-[9px] block">Título do Relato</span>
                              <span className="text-slate-900 font-bold">{rdoData.title}</span>
                            </div>
                            <div>
                              <span className="font-bold text-slate-500 uppercase tracking-wide text-[9px] block">Obra de Referência</span>
                              <span className="text-slate-900 font-semibold">{rdoData.obra}</span>
                            </div>
                          </div>

                          <div className="border-t border-slate-100 pt-3">
                            <h3 className="font-bold text-slate-900 mb-2">Equipe Executiva e Efetivo de Campo</h3>
                            <ul className="space-y-1 pl-1 text-[11px] max-w-md">
                              {rdoData.efetivo.map((ef, idx) => (
                                <li key={idx} className="grid grid-cols-[1fr_30px] items-center py-0.5 border-b border-dashed border-slate-150">
                                  <span>
                                    <span className="font-bold text-slate-900">{ef.funcao}</span>
                                    {ef.nomesFormatados && <span className="text-slate-500 italic text-[10px] ml-1">({ef.nomesFormatados})</span>}
                                  </span>
                                  <div className="flex justify-end pr-1">
                                    <span className="inline-flex items-center justify-center min-w-[20px] h-[16px] px-1 rounded bg-blue-600 text-white font-extrabold text-[10px] leading-none select-none">
                                      {ef.quantidade}
                                    </span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="border-t border-slate-100 pt-3">
                            <h3 className="font-bold text-slate-900 mb-2">Lista Integrada de Maquinários</h3>
                            <ul className="space-y-1 pl-1 text-[11px] max-w-md">
                              {rdoData.equipamentos.map((eq, idx) => (
                                <li key={idx} className="grid grid-cols-[1fr_30px_90px] items-center py-0.5 border-b border-dashed border-slate-150">
                                  <span className="font-bold text-slate-900 truncate pr-1">{eq.nome}</span>
                                  <div className="flex justify-center">
                                    <span className="inline-flex items-center justify-center min-w-[20px] h-[16px] px-1 rounded bg-amber-500 text-white font-extrabold text-[10px] leading-none select-none">
                                      {eq.quantidade}
                                    </span>
                                  </div>
                                  <div className="flex justify-end">
                                    <span className="text-[8px] font-mono uppercase bg-slate-100 border border-slate-200 px-1 py-0.25 text-slate-600 rounded">({eq.status})</span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="border-t border-slate-100 pt-3 overflow-x-auto">
                            <h3 className="font-bold text-slate-900 mb-2">Seções de Pistas Executadas (Memória Geométrica)</h3>
                            <table className="w-full text-left font-mono text-[10px] border-collapse bg-slate-50 rounded">
                              <thead>
                                <tr className="border-b border-slate-300 text-slate-500 font-bold bg-slate-100">
                                  <th className="p-2">ID</th>
                                  <th className="p-2">Estaca</th>
                                  <th className="p-2 text-right">Compr (m)</th>
                                  <th className="p-2 text-right">Larg (m)</th>
                                  <th className="p-2 text-right">Espess (m)</th>
                                  <th className="p-2 text-right">Área (m²)</th>
                                  <th className="p-2 text-right">Vol (m³)</th>
                                  <th className="p-2">Sentido</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rdoData.panos.map((p, idx) => (
                                  <tr key={idx} className="border-b border-slate-200">
                                    <td className="p-2 font-bold">{p.id}</td>
                                    <td className="p-2 bg-white">{p.segmento}</td>
                                    <td className="p-2 text-right bg-white">{p.comprimento.toFixed(2)}</td>
                                    <td className="p-2 text-right bg-white">{p.largura.toFixed(2)}</td>
                                    <td className="p-2 text-right bg-white">{p.espessuraNum.toFixed(3)}</td>
                                    <td className="p-2 text-right font-extrabold">{p.area.toFixed(3)}</td>
                                    <td className="p-2 text-right font-bold">{p.volume.toFixed(3)}</td>
                                    <td className="p-2 font-semibold text-slate-700">{p.sentidoCalculado} {p.sentidoInferido && "(inferido)"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="border-t border-slate-100 pt-3">
                            <h3 className="font-bold text-slate-900 mb-2">Contas Saneadas e Trens de Asfalto Descarregados</h3>
                            <table className="w-full text-left font-mono text-[10px] border-collapse bg-slate-50 rounded">
                              <thead>
                                <tr className="border-b border-slate-300 text-slate-500 font-bold bg-slate-100">
                                  <th className="p-2">NF / Registro</th>
                                  <th className="p-2">Origem Bruta</th>
                                  <th className="p-2 text-right">Saneado (kg)</th>
                                  <th className="p-2 text-right">Saneado (t)</th>
                                  <th className="p-2">Parecer Técnico</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rdoData.massaAsfaltica.itens.map((it, idx) => (
                                  <tr key={idx} className="border-b border-slate-200">
                                    <td className="p-2 font-bold bg-white">{it.identificador}</td>
                                    <td className="p-2 bg-white text-slate-500">"{it.valorOriginal}"</td>
                                    <td className="p-2 text-right bg-white text-emerald-800 font-extrabold">{it.valorSaneadoKg.toLocaleString('pt-BR')} kg</td>
                                    <td className="p-2 text-right bg-white font-bold">{it.valorSaneadoTons.toFixed(2)} t</td>
                                    <td className="p-2 font-semibold text-slate-600">{it.observacaoSaneamento}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="border-t border-slate-100 pt-3 space-y-2 text-[11px]">
                            <h3 className="font-bold text-slate-900">Resultados e Indicadores de Obra</h3>
                            <div className="grid grid-cols-2 gap-4 font-mono">
                              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                                <div>ÁREA TOTAL ESTRUTUADA: <span className="font-extrabold text-slate-950">{rdoData.kpis.areaTotal} m²</span></div>
                                <div className="mt-1">VOLUME TOTAL MODELADO: <span className="font-bold">{rdoData.kpis.volumeTotal} m³</span></div>
                              </div>
                              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                                <div>CONSUMO MÉDIO REAL: <span className="font-extrabold text-emerald-700">{rdoData.kpis.consumoMedioReal} kg/m²</span></div>
                                <div className="mt-1">DIVERGÊNCIA CBUQ REGISTRADA: <span className="font-extrabold text-amber-700">{rdoData.kpis.desvioConsumoPercentual > 0 ? "+" : ""}{rdoData.kpis.desvioConsumoPercentual}%</span></div>
                              </div>
                            </div>
                          </div>

                           {rdoData.auditoria.sentidoInferidosJustificativa && (
                            <div className="border-t border-slate-150 pt-3">
                              <h4 className="font-bold text-[10px] text-slate-500 tracking-wider uppercase mb-1">Nota Técnica de Georreferenciamento (Sentidos Inferidos)</h4>
                              <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-700 leading-relaxed font-sans italic">
                                {rdoData.auditoria.sentidoInferidosJustificativa}
                              </div>
                            </div>
                          )}

                          {rdoData.ocorrencias && rdoData.ocorrencias.length > 0 && (
                            <div className="border-t border-slate-150 pt-3">
                              <h4 className="font-bold text-[10px] text-slate-500 tracking-wider uppercase mb-1">Histórico de Ocorrências e Incidentes do Turno</h4>
                              <div className="space-y-1.5 mt-2">
                                {rdoData.ocorrencias.map((item, idx) => (
                                  <div key={idx} className="bg-slate-50 p-2 border border-slate-200 rounded text-[11px] flex items-start gap-2">
                                    <span className={`font-bold font-mono text-[8px] uppercase border px-1.5 py-0.5 rounded-sm shrink-0 ${
                                      item.tipo === "Equipamento Quebrado"
                                        ? "bg-rose-50 text-rose-800 border-rose-200"
                                        : item.tipo === "Intempéries do Tempo"
                                        ? "bg-sky-50 text-sky-800 border-sky-150"
                                        : item.tipo === "Falta de Efetivo"
                                        ? "bg-purple-50 text-purple-800 border-purple-150"
                                        : item.tipo === "Atraso no Fornecimento"
                                        ? "bg-amber-50 text-amber-800 border-amber-150"
                                        : "bg-slate-50 text-slate-800 border-slate-150"
                                    }`}>
                                      {item.tipo}
                                    </span>
                                    <span className="text-slate-700 text-xs">{item.descricao}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="border-t-2 border-dashed border-slate-300 pt-3">
                            <h4 className="font-bold text-[10px] text-slate-400 tracking-wider uppercase mb-1">Parecer de Conformidade da Engenharia</h4>
                            <div className="p-4 bg-slate-50 rounded border border-slate-200 text-xs text-slate-700 leading-relaxed font-sans italic">
                              "{rdoData.auditoria.diagnosticoConsumo}"
                            </div>
                          </div>

                          {rdoData.fotos && rdoData.fotos.length > 0 && (
                            <div className="border-t border-slate-150 pt-3">
                              <h4 className="font-bold text-[10px] text-slate-400 tracking-wider uppercase mb-2">Anexo: Registro Fotográfico de Campo</h4>
                              <div className="grid grid-cols-2 gap-3">
                                {rdoData.fotos.map((foto, fIdx) => (
                                  <div key={foto.id || fIdx} className="border border-slate-200 bg-white p-1.5 shadow-2xs rounded">
                                    <div className="aspect-video w-full overflow-hidden bg-slate-50 flex items-center justify-center border-b border-slate-100">
                                      <img
                                        src={foto.url}
                                        alt={foto.caption || "Foto de campo"}
                                        className="object-cover w-full h-full"
                                        referrerPolicy="no-referrer"
                                      />
                                    </div>
                                    {foto.caption && (
                                      <p className="text-[10px] text-slate-600 italic leading-snug mt-1.5 px-1 font-medium">
                                        Foto #{fIdx + 1}: {foto.caption}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        </div>
                      </div>

                    </div>
                  )}

                </motion.div>
              )}
            </AnimatePresence>

          </div>

        </div>

      </main>

      {/* Visually Stunning App Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-6 border-t border-slate-800 mt-12">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <HardHat className="h-4.5 w-4.5 text-amber-500" />
            <span className="font-bold text-white">SaaS RDO Inteligente</span>
            <span className="text-slate-600">|</span>
            <span>Sistema Inteligente de Engenharia Rodoviária</span>
          </div>
          
          <div className="font-mono text-[10px] flex items-center gap-4">
            <span>Powered by Gemini 3.5 AI Engine</span>
            <span className="text-slate-600">•</span>
            <span>Conformidade DER/SP e Normas DNIT</span>
          </div>
        </div>
      </footer>

      {/* Modal de Impressão e PDF Resiliente contra Sandbox/IFrame */}
      <AnimatePresence>
        {isPrintOverlayActive && (
          <div className="fixed inset-0 z-100 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white max-w-xl w-full rounded-lg border border-slate-200 shadow-2xl overflow-hidden"
            >
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-950">
                <div className="flex items-center gap-2.5">
                  <div className="bg-blue-600 p-1.5 rounded">
                    <Printer className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-sans font-extrabold text-sm uppercase tracking-wider">Impressão do Laudo Técnico</h3>
                    <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5 tracking-wider">Ambiente Altamente Resiliente</p>
                  </div>
                </div>
                <button 
                  onClick={() => setPrintOverlayActive(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white h-7 w-7 rounded-full flex items-center justify-center transition-all cursor-pointer font-bold"
                >
                  ✕
                </button>
              </div>
              
              <div className="p-6 space-y-4 font-sans text-xs text-slate-600 leading-relaxed">
                <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-lg text-[11px] flex items-start gap-2">
                  <span className="text-base leading-none">⚠️</span>
                  <div>
                    <strong>Proteção de Segurança (iFrame Sandbox) Ativa:</strong>
                    <p className="mt-1">
                      Você está visualizando este painel dentro de uma área segura integrada (AI Studio Frame). O navegador bloqueia chamadas diretas de impressão de dentro deste espaço.
                    </p>
                  </div>
                </div>
                
                <p className="font-extrabold text-slate-900 text-[11px] uppercase tracking-wider">
                  Selecione uma das duas formas oficiais para imprimir ou gerar PDF:
                </p>
                
                <div className="space-y-4">
                  {/* Opção da Nova Aba */}
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg hover:border-blue-400 transition-colors">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <strong className="text-blue-600 font-extrabold text-[11px] uppercase tracking-wider block mb-1">
                          Opção 1 - Abrir Página em Nova Guia (Recomendado)
                        </strong>
                        <p className="text-[11px] text-slate-600 leading-normal">
                          Libera o laudo em uma aba externa dedicada no seu navegador, livre de restrições do editor. O assistente de impressão do seu dispositivo abrirá automaticamente ao carregar!
                        </p>
                      </div>
                      <a 
                        href={`${window.location.origin}${window.location.pathname}?print=true`} 
                        target="_blank" 
                        rel="opener"
                        onClick={() => setPrintOverlayActive(false)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold uppercase tracking-widest text-[9px] px-3.5 py-2.5 transition-all text-center rounded whitespace-nowrap hover:shadow-xs self-center"
                      >
                        Abrir Guia ↗
                      </a>
                    </div>
                  </div>
                  
                  {/* Opção do Overlay Local */}
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg hover:border-indigo-400 transition-colors">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <strong className="text-indigo-600 font-extrabold text-[11px] uppercase tracking-wider block mb-1">
                          Opção 2 - Modo de Impressão na Tela Atual
                        </strong>
                        <p className="text-[11px] text-slate-600 leading-normal">
                          Configura esta guia em tela cheia na folha A4 limpa do diário físico, ocultando toda a barra lateral e editor. Após carregar, basta pressionar o atalho <strong>Ctrl + P</strong> (ou Cmd + P) no seu teclado!
                        </p>
                      </div>
                      <button 
                        onClick={() => {
                          setPrintOverlayActive(false);
                          setIsLocalPrintViewActive(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold uppercase tracking-widest text-[9px] px-3.5 py-2.5 transition-all text-center rounded whitespace-nowrap hover:shadow-xs self-center cursor-pointer"
                      >
                        Ver Tela Cheia
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
