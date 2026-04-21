import React, { useEffect, useMemo, useReducer, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";

/**
 * MOCK-UP v2 · LIBRO DE TRAZABILIDAD · Siemens Energy Gearbox
 * ----------------------------------------------------------------
 * Cambios principales respecto a v1:
 * - "Modelo" → "Plataforma". Cada plataforma agrupa variantes.
 * - Elementos trazables ya no son pestaña aparte: son un tipo de pregunta (TRACEABLE).
 * - Nuevo tipo de pregunta: MASTER_TABLE (referencia de tabla maestra).
 * - Entregables pueden requerir aprobación (flag + grupo de aprobadores).
 * - Maestro de Tabla Maestra y Grupos de Aprobadores gestionables por el Editor.
 * - Preguntas con propiedad plataforma (null = todas, "5X" = solo esa).
 * - Ayudas (imágenes/docs) a nivel de entregable y pregunta.
 * - Condicionales limitados a 1 nivel de profundidad.
 * - CALC pasa a ser visor de datos de AtlantIA.
 * - Modelo de hechos: OrdenTrabajo → FaseTx → Respuestas → Aprobaciones → NCRs.
 */

// ─── Helpers ──────────────────────────────────────────────────
const deepClone = (obj) => JSON.parse(JSON.stringify(obj));
const createId = (prefix = "id") => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
function sortByOrder(list = []) { return [...list].sort((a, b) => (a.order || 0) - (b.order || 0)); }
function clampNumber(value) { if (value === "" || value == null) return null; const n = Number(value); return Number.isNaN(n) ? null : n; }
function formatDateTime(value) { if (!value) return "-"; try { return new Date(value).toLocaleString(); } catch { return value; } }
function formatPercent(value) { return `${Math.round(value)}%`; }

function toneForPhaseStatus(status) {
  switch (status) {
    case "DONE": return "ok";
    case "IN_PROGRESS": return "info";
    case "BLOCKED": return "warn";
    case "PENDING_APPROVAL": return "draft";
    default: return "neutral";
  }
}

function labelForPhaseStatus(status) {
  switch (status) {
    case "NOT_STARTED": return "No iniciada";
    case "IN_PROGRESS": return "En curso";
    case "DONE": return "Finalizada";
    case "BLOCKED": return "Bloqueada";
    case "PENDING_APPROVAL": return "Pend. aprobación";
    default: return status || "-";
  }
}

function answerTypeLabel(type) {
  const map = {
    TEXT: "Texto", NUMBER: "Numérico", NUMBER_LIMITS: "Numérico con límites",
    OPTION: "Opción", FILE: "Archivo", IMAGE: "Imagen",
    EXTERNAL_SELECT: "Lista externa", YES_NO: "Sí / No",
    TRACEABLE: "Elemento trazable", MASTER_TABLE: "Tabla maestra",
  };
  return map[type] || type;
}

// ─── Fuentes externas simuladas ───────────────────────────────
const EXTERNAL_SOURCES = {
  stations: [
    { value: "EST-01", label: "Estación 01 · Recepción" },
    { value: "EST-02", label: "Estación 02 · Montaje principal" },
    { value: "EST-03", label: "Estación 03 · Verificación" },
  ],
  ncrCategories: [
    { value: "NCR_MATERIAL", label: "Material" },
    { value: "NCR_MONTAJE", label: "Montaje" },
    { value: "NCR_MEDICION", label: "Medición" },
  ],
};

function getExternalOptions(sourceKey) { return EXTERNAL_SOURCES[sourceKey] || []; }

// ─── SEED (datos maestros mock) ───────────────────────────────
const SEED = {
  weeks: [
    { id: "2025-W50", year: 2025, week: 50 },
    { id: "2025-W51", year: 2025, week: 51 },
  ],

  phaseTypes: [
    { id: "FORM", name: "Formulario" },
    { id: "CALC", name: "Proceso de cálculo (visor)" },
    { id: "WORKFLOW", name: "Proceso con reglas" },
  ],

  // ── Plataformas (antes "Modelos") ──
  platforms: [
    { id: "plt_5x", code: "5X", name: "Plataforma 5X", gpCode: "A9B" },
    { id: "plt_4x", code: "4X", name: "Plataforma 4X", gpCode: "A9B" },
    { id: "plt_3x", code: "3X", name: "Plataforma 3X", gpCode: "A9B" },
  ],

  // ── Variantes por plataforma ──
  variants: [
    { id: "var_5x_200", code: "V5X-200", name: "5X-200", platformCode: "5X" },
    { id: "var_5x_300", code: "V5X-300", name: "5X-300", platformCode: "5X" },
    { id: "var_4x_100", code: "V4X-100", name: "4X-100", platformCode: "4X" },
    { id: "var_4x_150", code: "V4X-150", name: "4X-150", platformCode: "4X" },
    { id: "var_3x_050", code: "V3X-050", name: "3X-050", platformCode: "3X" },
  ],

  // ── Tabla Maestra (gestionada por Editor) ──
  masterTables: [
    { id: "mt_1", topic: "Par de apriete", parameter: "M6", value: "200 Nm" },
    { id: "mt_2", topic: "Par de apriete", parameter: "M8", value: "220 Nm" },
    { id: "mt_3", topic: "Par de apriete", parameter: "M10", value: "280 Nm" },
    { id: "mt_4", topic: "Par de apriete", parameter: "M12", value: "350 Nm" },
    { id: "mt_5", topic: "Equipo de medición", parameter: "Calibre digital", value: "CAL-001" },
    { id: "mt_6", topic: "Equipo de medición", parameter: "Dinamómetro", value: "DIN-003" },
    { id: "mt_7", topic: "Equipo de medición", parameter: "Galga", value: "GAL-012" },
    { id: "mt_8", topic: "Lubricante", parameter: "Rodamientos", value: "SKF LGMT 3/1" },
    { id: "mt_9", topic: "Lubricante", parameter: "Engranajes", value: "Klüber GH 6-80" },
  ],

  // ── Grupos de aprobadores (gestionados por Editor) ──
  approvalGroups: [
    {
      id: "ag_calidad",
      title: "Calidad Gearbox",
      description: "Equipo de calidad responsable de la aprobación de fases críticas",
      members: [
        { id: "ag_m1", email: "quality.lead@siemens-energy.com", name: "María García" },
        { id: "ag_m2", email: "quality.eng@siemens-energy.com", name: "Carlos López" },
      ],
    },
    {
      id: "ag_ingenieria",
      title: "Ingeniería de Proceso",
      description: "Responsables de proceso y validación técnica",
      members: [
        { id: "ag_m3", email: "proc.eng@siemens-energy.com", name: "Ana Martínez" },
      ],
    },
  ],

  // ── GPs de elementos trazables por variante + fase (simula datos de SAP / AtlantIA) ──
  // Clave: `${variantCode}__${phaseCode}` → lista de GPs aplicables a esa fase
  traceableGpsByVariantPhase: {
    // Variante V5X-200 (plataforma 5X)
    "V5X-200__P01": [
      { gpCode: "A9X000001", name: "Rodamiento principal" },
      { gpCode: "A9X000021", name: "Sello de estanqueidad" },
    ],
    "V5X-200__P02": [
      { gpCode: "A9X000031", name: "Eje intermedio" },
      { gpCode: "A9X000051", name: "Corona dentada" },
    ],
    "V5X-200__P03": [
      { gpCode: "A9X000041", name: "Casquillo de ajuste" },
    ],
    "V5X-200__P04": [
      { gpCode: "A9X000051", name: "Corona dentada" },
      { gpCode: "A9X000041", name: "Casquillo de ajuste" },
    ],

    // Variante V5X-300
    "V5X-300__P01": [
      { gpCode: "A9X000001", name: "Rodamiento principal" },
    ],
    "V5X-300__P02": [
      { gpCode: "A9X000031", name: "Eje intermedio" },
      { gpCode: "A9X000021", name: "Sello de estanqueidad" },
    ],
    "V5X-300__P04": [
      { gpCode: "A9X000031", name: "Eje intermedio" },
    ],

    // Variante V4X-100
    "V4X-100__P01": [
      { gpCode: "A9X000001", name: "Rodamiento principal" },
    ],
    "V4X-100__P02": [
      { gpCode: "A9X000021", name: "Sello de estanqueidad" },
    ],
    "V4X-100__P03": [
      { gpCode: "A9X000021", name: "Sello de estanqueidad" },
    ],

    // Variante V4X-150
    "V4X-150__P01": [
      { gpCode: "A9X000001", name: "Rodamiento principal" },
    ],
    "V4X-150__P02": [
      { gpCode: "A9X000061", name: "Piñón solar" },
      { gpCode: "A9X000021", name: "Sello de estanqueidad" },
    ],
    "V4X-150__P03": [
      { gpCode: "A9X000061", name: "Piñón solar" },
    ],

    // Variante V3X-050
    "V3X-050__P01": [
      { gpCode: "A9X000001", name: "Rodamiento principal" },
    ],
  },

  // ── Entregables ──
  deliverables: [
    {
      id: "dlv_recepcion",
      code: "DLV_RECEPCION",
      name: "Checklist recepción",
      phaseType: "FORM",
      requiresApproval: false,
      approvalGroupId: null,
      helpAttachments: [
        { id: "ha_dlv_1", name: "Manual recepción.pdf", type: "document", url: "#" },
      ],
      currentDraftVersionId: "dlv_recepcion_v2_draft",
      currentPublishedVersionId: "dlv_recepcion_v1_pub",
      versions: [
        {
          id: "dlv_recepcion_v1_pub",
          versionNumber: 1,
          status: "PUBLISHED",
          title: "Checklist recepción v1",
          createdAt: "2025-11-20",
          description: "Versión publicada para planta.",
          questions: [
            {
              id: "q_rec_01", order: 1, label: "Inspección visual conforme",
              helpText: "Confirmar inspección visual del conjunto recibido.",
              answerType: "YES_NO", isRequired: true, platformCode: null,
            },
            {
              id: "q_rec_02", order: 2, label: "Par de apriete (Nm)",
              helpText: "Registrar valor medido.",
              answerType: "NUMBER_LIMITS", minValue: 115, maxValue: 125, isRequired: true,
              platformCode: null,
            },
            {
              id: "q_rec_03", order: 3, label: "Estación de trabajo",
              answerType: "EXTERNAL_SELECT", optionSource: "stations", isRequired: true,
              platformCode: null,
            },
            {
              id: "q_rec_04", order: 4, label: "Observaciones si no es conforme",
              answerType: "TEXT", isRequired: true, platformCode: null,
              visibleWhen: { questionId: "q_rec_01", equals: "NO" },
            },
            {
              id: "q_rec_05", order: 5, label: "Verificar rodamiento principal",
              helpText: "Selecciona el GP del elemento trazable y valida su número de serie.",
              answerType: "TRACEABLE", isRequired: true, platformCode: null,
              helpAttachments: [
                { id: "ha_q5_1", name: "Guía rodamientos.png", type: "image", url: "https://placehold.co/600x400/e2e8f0/475569?text=Guia+Rodamientos" },
              ],
            },
            {
              id: "q_rec_06", order: 6, label: "Par de apriete según métrica",
              helpText: "Consultar tabla maestra para el par de apriete adecuado.",
              answerType: "MASTER_TABLE", isRequired: true, platformCode: null,
              masterTableTopic: "Par de apriete",
              masterTableParameter: "M8",
            },
            {
              id: "q_rec_07", order: 7, label: "Adjuntar imagen / evidencia",
              answerType: "IMAGE", isRequired: false, platformCode: null,
            },
            {
              id: "q_rec_08", order: 8, label: "Verificar corona dentada (solo 5X)",
              helpText: "Elemento trazable específico de la plataforma 5X.",
              answerType: "TRACEABLE", isRequired: true, platformCode: "5X",
            },
          ],
        },
        {
          id: "dlv_recepcion_v2_draft",
          versionNumber: 2,
          status: "DRAFT",
          title: "Checklist recepción v2",
          createdAt: "2025-12-10",
          description: "Borrador con nuevos tipos de pregunta.",
          questions: [
            {
              id: "q_rec_d_01", order: 1, label: "Inspección visual conforme",
              helpText: "Confirmar inspección visual del conjunto recibido.",
              answerType: "YES_NO", isRequired: true, platformCode: null,
            },
            {
              id: "q_rec_d_02", order: 2, label: "Par de apriete (Nm)",
              answerType: "NUMBER_LIMITS", minValue: 115, maxValue: 125, isRequired: true,
              platformCode: null,
            },
            {
              id: "q_rec_d_03", order: 3, label: "Estación de trabajo",
              answerType: "EXTERNAL_SELECT", optionSource: "stations", isRequired: true,
              platformCode: null,
            },
            {
              id: "q_rec_d_04", order: 4, label: "Observaciones si no es conforme",
              answerType: "TEXT", isRequired: true, platformCode: null,
              visibleWhen: { questionId: "q_rec_d_01", equals: "NO" },
            },
            {
              id: "q_rec_d_05", order: 5, label: "Verificar rodamiento principal",
              answerType: "TRACEABLE", isRequired: true, platformCode: null,
            },
            {
              id: "q_rec_d_06", order: 6, label: "Solicita soporte de calidad",
              answerType: "YES_NO", isRequired: false, platformCode: null,
            },
            {
              id: "q_rec_d_07", order: 7, label: "Motivo de solicitud a calidad",
              answerType: "TEXT", isRequired: true, platformCode: null,
              visibleWhen: { questionId: "q_rec_d_06", equals: "SI" },
            },
          ],
        },
      ],
    },
    {
      id: "dlv_montaje",
      code: "DLV_MONTAJE",
      name: "Checklist montaje principal",
      phaseType: "FORM",
      requiresApproval: true,
      approvalGroupId: "ag_calidad",
      helpAttachments: [],
      currentDraftVersionId: "dlv_montaje_v2_draft",
      currentPublishedVersionId: "dlv_montaje_v1_pub",
      versions: [
        {
          id: "dlv_montaje_v1_pub",
          versionNumber: 1,
          status: "PUBLISHED",
          title: "Checklist montaje principal v1",
          createdAt: "2025-11-25",
          description: "Versión base con aprobación.",
          questions: [
            { id: "q_mon_01", order: 1, label: "Lubricación aplicada", answerType: "YES_NO", isRequired: true, platformCode: null },
            {
              id: "q_mon_02", order: 2, label: "Verificar sello de estanqueidad",
              helpText: "Elemento trazable del sello.",
              answerType: "TRACEABLE", isRequired: true, platformCode: null,
            },
            {
              id: "q_mon_03", order: 3, label: "Par de apriete bridas M10",
              answerType: "MASTER_TABLE", isRequired: true, platformCode: null,
              masterTableTopic: "Par de apriete", masterTableParameter: "M10",
            },
            { id: "q_mon_04", order: 4, label: "Observaciones de montaje", answerType: "TEXT", isRequired: false, platformCode: null },
            { id: "q_mon_05", order: 5, label: "Adjuntar evidencia", answerType: "FILE", isRequired: false, platformCode: null },
            {
              id: "q_mon_06", order: 6, label: "Verificar piñón solar (solo 4X)",
              answerType: "TRACEABLE", isRequired: true, platformCode: "4X",
            },
          ],
        },
        {
          id: "dlv_montaje_v2_draft",
          versionNumber: 2,
          status: "DRAFT",
          title: "Checklist montaje principal v2",
          createdAt: "2025-12-12",
          description: "Añade controles previos de material.",
          questions: [
            { id: "q_mon_d_01", order: 1, label: "Material disponible y verificado", answerType: "YES_NO", isRequired: true, platformCode: null },
            { id: "q_mon_d_02", order: 2, label: "Lubricación aplicada", answerType: "YES_NO", isRequired: true, platformCode: null },
            { id: "q_mon_d_03", order: 3, label: "Verificar sello", answerType: "TRACEABLE", isRequired: true, platformCode: null },
            { id: "q_mon_d_04", order: 4, label: "Observaciones de montaje", answerType: "TEXT", isRequired: false, platformCode: null },
          ],
        },
      ],
    },
    {
      id: "dlv_casquillo",
      code: "DLV_CASQUILLO",
      name: "Ajuste de casquillos (visor)",
      phaseType: "CALC",
      requiresApproval: false,
      approvalGroupId: null,
      helpAttachments: [],
      currentDraftVersionId: "dlv_casquillo_v2_draft",
      currentPublishedVersionId: "dlv_casquillo_v1_pub",
      versions: [
        {
          id: "dlv_casquillo_v1_pub",
          versionNumber: 1,
          status: "PUBLISHED",
          title: "Ajuste de casquillos v1",
          createdAt: "2025-11-28",
          description: "Visor de datos de cálculo procedentes de AtlantIA.",
          questions: [
            { id: "q_cas_01", order: 1, label: "Diámetro alojamiento (mm)", answerType: "NUMBER", isRequired: true, platformCode: null },
            { id: "q_cas_02", order: 2, label: "Diámetro eje (mm)", answerType: "NUMBER", isRequired: true, platformCode: null },
            { id: "q_cas_03", order: 3, label: "Holgura objetivo (mm)", answerType: "NUMBER", isRequired: true, platformCode: null },
            { id: "q_cas_04", order: 4, label: "Calce instalado (mm)", answerType: "NUMBER", isRequired: true, platformCode: null },
          ],
        },
        {
          id: "dlv_casquillo_v2_draft",
          versionNumber: 2,
          status: "DRAFT",
          title: "Ajuste de casquillos v2",
          createdAt: "2025-12-12",
          description: "Preparado para traer datos externos.",
          questions: [
            { id: "q_cas_d_01", order: 1, label: "Diámetro alojamiento (mm)", answerType: "NUMBER", isRequired: true, platformCode: null },
            { id: "q_cas_d_02", order: 2, label: "Diámetro eje (mm)", answerType: "NUMBER", isRequired: true, platformCode: null },
            { id: "q_cas_d_03", order: 3, label: "Holgura objetivo (mm)", answerType: "NUMBER", isRequired: true, platformCode: null },
            { id: "q_cas_d_04", order: 4, label: "Calce instalado (mm)", answerType: "NUMBER", isRequired: true, platformCode: null },
          ],
        },
      ],
    },
    {
      id: "dlv_verif_final",
      code: "DLV_VERIF_FINAL",
      name: "Verificación final",
      phaseType: "WORKFLOW",
      requiresApproval: true,
      approvalGroupId: "ag_ingenieria",
      helpAttachments: [],
      currentDraftVersionId: "dlv_verif_v2_draft",
      currentPublishedVersionId: "dlv_verif_v1_pub",
      versions: [
        {
          id: "dlv_verif_v1_pub",
          versionNumber: 1,
          status: "PUBLISHED",
          title: "Verificación final v1",
          createdAt: "2025-11-30",
          description: "Verificación de cierre con aprobación.",
          questions: [
            {
              id: "q_fin_01", order: 1, label: "Resultado de verificación final",
              answerType: "OPTION", isRequired: true, platformCode: null,
              options: [{ value: "OK", label: "Conforme" }, { value: "NOK", label: "No conforme" }],
            },
            {
              id: "q_fin_02", order: 2, label: "Detalle de no conformidad",
              answerType: "TEXT", isRequired: true, platformCode: null,
              visibleWhen: { questionId: "q_fin_01", equals: "NOK" },
            },
            {
              id: "q_fin_03", order: 3, label: "Categoría NCR",
              answerType: "EXTERNAL_SELECT", optionSource: "ncrCategories", isRequired: true,
              platformCode: null,
              visibleWhen: { questionId: "q_fin_01", equals: "NOK" },
            },
          ],
        },
        {
          id: "dlv_verif_v2_draft",
          versionNumber: 2,
          status: "DRAFT",
          title: "Verificación final v2",
          createdAt: "2025-12-15",
          description: "Con regla de bloqueo en NOK.",
          questions: [
            {
              id: "q_fin_d_01", order: 1, label: "Resultado de verificación final",
              answerType: "OPTION", isRequired: true, platformCode: null,
              options: [{ value: "OK", label: "Conforme" }, { value: "NOK", label: "No conforme" }],
            },
            {
              id: "q_fin_d_02", order: 2, label: "Detalle de no conformidad",
              answerType: "TEXT", isRequired: true, platformCode: null,
              visibleWhen: { questionId: "q_fin_d_01", equals: "NOK" },
            },
          ],
        },
      ],
    },
  ],

  // ── Definiciones de fase por plataforma (vienen de SAP, solo lectura) ──
  phaseDefinitions: [
    {
      id: "ph_5x_01", platformCode: "5X", gpCode: "A9B", phaseCode: "P01",
      name: "Recepción de conjunto", order: 1, phaseType: "FORM",
      deliverableId: "dlv_recepcion", description: "Recepción e inspección inicial.",
    },
    {
      id: "ph_5x_02", platformCode: "5X", gpCode: "A9B", phaseCode: "P02",
      name: "Montaje principal", order: 2, phaseType: "FORM",
      deliverableId: "dlv_montaje", description: "Montaje principal del conjunto.",
    },
    {
      id: "ph_5x_03", platformCode: "5X", gpCode: "A9B", phaseCode: "P03",
      name: "Ajuste de casquillos", order: 3, phaseType: "CALC",
      deliverableId: "dlv_casquillo", description: "Visor de cálculo de ajuste y selección de calce.",
    },
    {
      id: "ph_5x_04", platformCode: "5X", gpCode: "A9B", phaseCode: "P04",
      name: "Verificación final", order: 4, phaseType: "WORKFLOW",
      deliverableId: "dlv_verif_final", description: "Verificación y cierre funcional.",
    },
    {
      id: "ph_4x_01", platformCode: "4X", gpCode: "A9B", phaseCode: "P01",
      name: "Recepción de conjunto", order: 1, phaseType: "FORM",
      deliverableId: "dlv_recepcion", description: "Recepción e inspección inicial.",
    },
    {
      id: "ph_4x_02", platformCode: "4X", gpCode: "A9B", phaseCode: "P02",
      name: "Montaje principal", order: 2, phaseType: "FORM",
      deliverableId: "dlv_montaje", description: "Montaje principal del conjunto.",
    },
    {
      id: "ph_4x_03", platformCode: "4X", gpCode: "A9B", phaseCode: "P03",
      name: "Verificación final", order: 3, phaseType: "WORKFLOW",
      deliverableId: "dlv_verif_final", description: "Verificación y cierre funcional.",
    },
  ],

  // ── Ordenes de trabajo planificadas (modelo de hechos) ──
  plannedUnits: [
    { id: "pu_50_01", year: 2025, week: 50, ns: "108001", variantCode: "V5X-200", platformCode: "5X", gpCode: "A9B" },
    { id: "pu_50_02", year: 2025, week: 50, ns: "108002", variantCode: "V5X-300", platformCode: "5X", gpCode: "A9B" },
    { id: "pu_51_01", year: 2025, week: 51, ns: "108994", variantCode: "V5X-200", platformCode: "5X", gpCode: "A9B" },
    { id: "pu_51_02", year: 2025, week: 51, ns: "109887", variantCode: "V4X-150", platformCode: "4X", gpCode: "A9B" },
  ],

  // ── Datos de ejecución precargados ──
  seedExecution: {
    answersByPhaseTxId: {
      tx_pu_51_01_P01: {
        q_rec_01: { value: "SI" },
        q_rec_02: { value: 120 },
        q_rec_03: { value: "EST-01" },
      },
    },
    incidents: [
      {
        id: "inc_01", phaseTxId: "tx_pu_51_01_P01", scope: "FORM",
        questionId: "q_rec_02", severity: "MEDIUM", blocksPhase: false,
        description: "Lectura inicial fuera de rango; se repite medición.",
        evidenceName: "medicion_inicial.txt",
        createdAt: "2025-12-16T07:55:00Z", createdBy: "01234", status: "OPEN",
        approvalGroupId: null,
      },
    ],
    approvals: [],
  },

  // ── Catálogo de validación de trazables (simula AtlantIA) ──
  traceableValidationCatalog: [
    {
      traceableGpCode: "A9X000001", serial: "SER-ROD-777",
      exists: true, source: "AtlantIA",
      ncrs: [
        { id: "NCR-45871", code: "NCR-45871", description: "Microfisuras detectadas en lote 2025-10.", comment: "Verificar montaje con conjunto emparejado." },
      ],
      pairings: [
        { id: "EMP-9001", identifier: "PAIR-2025-00045", ncrCode: "NCR-45871", description: "Usar exclusivamente con engranaje especial.", comment: "Revisar kit con etiqueta azul.", stock: null },
      ],
    },
    { traceableGpCode: "A9X000021", serial: "SER-SEL-110", exists: true, source: "AtlantIA", ncrs: [], pairings: [] },
    {
      traceableGpCode: "A9X000031", serial: "SER-EJE-220",
      exists: true, source: "AtlantIA",
      ncrs: [{ id: "NCR-47012", code: "NCR-47012", description: "Desviación dimensional corregida en origen.", comment: "Montable, pero requiere revisión." }],
      pairings: [],
    },
    { traceableGpCode: "A9X000041", serial: "SER-CAS-331", exists: true, source: "AtlantIA", ncrs: [], pairings: [] },
    { traceableGpCode: "A9X000051", serial: "SER-COR-555", exists: true, source: "AtlantIA", ncrs: [], pairings: [] },
    { traceableGpCode: "A9X000061", serial: "SER-PIN-660", exists: true, source: "AtlantIA", ncrs: [], pairings: [] },
  ],

  // ── Datos de casquillos de AtlantIA (para visor CALC) ──
  shimDataCatalog: {
    "108994": { housing: 150.023, shaft: 149.988, target: 0.025, installed: 0.010, source: "AtlantIA / Excel" },
  },
};

// ─── Materialización ─────────────────────────────────────────
function materializeExecution(seed) {
  const phaseTxs = [];
  for (const unit of seed.plannedUnits) {
    const phases = sortByOrder(
      seed.phaseDefinitions.filter((p) => p.platformCode === unit.platformCode)
    );
    phases.forEach((phaseDef) => {
      const deliverable = seed.deliverables.find((d) => d.id === phaseDef.deliverableId);
      const publishedVersionId = deliverable?.currentPublishedVersionId || null;
      phaseTxs.push({
        id: `tx_${unit.id}_${phaseDef.phaseCode}`,
        plannedUnitId: unit.id,
        phaseDefinitionId: phaseDef.id,
        phaseCode: phaseDef.phaseCode,
        ofCode: `OF-${unit.ns}-${phaseDef.phaseCode}`,
        status: "NOT_STARTED",
        appliedDeliverableVersionId: publishedVersionId,
        requiresApproval: deliverable?.requiresApproval || false,
        approvalGroupId: deliverable?.approvalGroupId || null,
        createdAt: now(),
        startedAt: null, completedAt: null, lastUpdatedAt: null, lastUpdatedBy: null,
      });
    });
  }

  // Sembrar estados iniciales realistas
  phaseTxs.forEach((tx) => {
    if (tx.id === "tx_pu_51_01_P01") {
      tx.status = "IN_PROGRESS";
      tx.startedAt = "2025-12-16T07:45:00Z";
      tx.lastUpdatedAt = "2025-12-16T08:00:00Z";
      tx.lastUpdatedBy = "01234";
    }
    if (tx.id === "tx_pu_50_01_P01" || tx.id === "tx_pu_50_01_P02") {
      tx.status = "DONE";
      tx.startedAt = "2025-12-10T07:30:00Z";
      tx.completedAt = "2025-12-10T08:10:00Z";
      tx.lastUpdatedAt = "2025-12-10T08:10:00Z";
      tx.lastUpdatedBy = "00888";
    }
  });

  return phaseTxs;
}

const MATERIALIZED_PHASES = materializeExecution(SEED);

const initialState = {
  operatorNumber: "",
  selectedWeekId: "2025-W51",
  phaseDefinitions: deepClone(SEED.phaseDefinitions),
  deliverables: deepClone(SEED.deliverables),
  plannedUnits: deepClone(SEED.plannedUnits),
  phaseTxs: deepClone(MATERIALIZED_PHASES),
  answersByPhaseTxId: deepClone(SEED.seedExecution.answersByPhaseTxId),
  incidents: deepClone(SEED.seedExecution.incidents),
  approvals: deepClone(SEED.seedExecution.approvals),
  masterTables: deepClone(SEED.masterTables),
  approvalGroups: deepClone(SEED.approvalGroups),
};

// ─── fakeApi ──────────────────────────────────────────────────
const fakeApi = {
  delay(ms = 180) { return new Promise((resolve) => setTimeout(resolve, ms)); },
  async getWeeks() { await this.delay(); return [...SEED.weeks]; },
  async getUnitsByWeek(weekId) {
    await this.delay();
    const wk = SEED.weeks.find((w) => w.id === weekId);
    if (!wk) return [];
    return initialState.plannedUnits.filter((u) => u.year === wk.year && u.week === wk.week);
  },
  async getTraceableGpsForVariantPhase(variantCode, phaseCode) {
    await this.delay(100);
    if (!variantCode || !phaseCode) return [];
    const key = `${variantCode}__${phaseCode}`;
    return deepClone(SEED.traceableGpsByVariantPhase[key] || []);
  },
  async getTraceableValidation(traceableGpCode, serial) {
    await this.delay(280);
    const record = SEED.traceableValidationCatalog.find(
      (row) => row.traceableGpCode === traceableGpCode && row.serial === serial
    );
    if (!record) return { exists: false, source: "AtlantIA", ncrs: [], pairings: [] };
    return deepClone({
      ...record,
      ncrs: (record.ncrs || []).map((item) => ({ ...item, seen: false })),
      pairings: (record.pairings || []).map((item) => ({ ...item, seen: false })),
    });
  },
  async getShimData(ns) {
    await this.delay(200);
    return deepClone(SEED.shimDataCatalog[ns] || null);
  },
};

// ─── Selectores / lógica de negocio ──────────────────────────
function getPlatformByCode(code) { return SEED.platforms.find((p) => p.code === code) || null; }

function getPhaseDefinition(state, id) { return state.phaseDefinitions.find((p) => p.id === id) || null; }
function getDeliverable(state, id) { return state.deliverables.find((d) => d.id === id) || null; }
function getPublishedVersion(d) { if (!d?.currentPublishedVersionId) return null; return d.versions.find((v) => v.id === d.currentPublishedVersionId) || null; }
function getDraftVersion(d) { if (!d?.currentDraftVersionId) return null; return d.versions.find((v) => v.id === d.currentDraftVersionId) || null; }
function getAppliedVersion(state, phaseTx) {
  if (!phaseTx?.appliedDeliverableVersionId) return null;
  for (const d of state.deliverables) { const v = d.versions.find((ver) => ver.id === phaseTx.appliedDeliverableVersionId); if (v) return v; }
  return null;
}
function getApprovalGroup(state, id) { return state.approvalGroups.find((g) => g.id === id) || null; }

function getMasterTableTopics(state) {
  const topics = new Set();
  state.masterTables.forEach((r) => topics.add(r.topic));
  return [...topics].sort();
}

function getMasterTableParams(state, topic) {
  return state.masterTables.filter((r) => r.topic === topic).map((r) => r.parameter).sort();
}

function getMasterTableValue(state, topic, parameter) {
  const r = state.masterTables.find((row) => row.topic === topic && row.parameter === parameter);
  return r?.value || null;
}

function resolveVisibleQuestions(questions = [], answers = {}, platformCode = null) {
  return sortByOrder(questions).filter((q) => {
    if (q.platformCode && platformCode && q.platformCode !== platformCode) return false;
    if (!q.visibleWhen) return true;
    const dep = answers[q.visibleWhen.questionId]?.value;
    return dep === q.visibleWhen.equals;
  });
}

function getAnswerValue(answer = {}) { return answer?.value; }

function getQuestionValidation(question, answer) {
  const value = getAnswerValue(answer);

  if (question.answerType === "TRACEABLE") {
    if (!question.isRequired) return { ok: true };
    if (answer?.noAplica) return { ok: true };
    return { ok: !!answer?.validationResult?.exists };
  }

  if (question.answerType === "MASTER_TABLE") {
    if (!question.isRequired) return { ok: true };
    return { ok: value != null && value !== "" };
  }

  if (!question.isRequired) return { ok: true };
  switch (question.answerType) {
    case "TEXT": case "FILE": case "IMAGE": case "EXTERNAL_SELECT": case "OPTION": case "YES_NO":
      return { ok: value != null && value !== "" };
    case "NUMBER":
      return { ok: value != null && value !== "" && !Number.isNaN(Number(value)) };
    case "NUMBER_LIMITS": {
      const numberOk = value != null && value !== "" && !Number.isNaN(Number(value));
      if (!numberOk) return { ok: false };
      const n = Number(value);
      return {
        ok: true,
        inRange: typeof question.minValue === "number" && typeof question.maxValue === "number"
          ? n >= question.minValue && n <= question.maxValue : true,
      };
    }
    default: return { ok: true };
  }
}

function computeSpecialProcess(state, phaseTx, unit) {
  const phaseDef = getPhaseDefinition(state, phaseTx.phaseDefinitionId);
  const answers = state.answersByPhaseTxId[phaseTx.id] || {};
  if (!phaseDef) return null;

  if (phaseDef.phaseType === "CALC") {
    const shimData = SEED.shimDataCatalog[unit?.ns] || null;
    if (!shimData) return { type: "CALC", ready: false, noData: true };
    const currentClearance = Number((shimData.housing - shimData.shaft).toFixed(3));
    const recommendedShim = Number((currentClearance - shimData.target).toFixed(3));
    const deviation = Number((shimData.installed - recommendedShim).toFixed(3));
    return {
      type: "CALC", ready: true, currentClearance, recommendedShim, deviation,
      isAccepted: Math.abs(deviation) <= 0.05, source: shimData.source,
    };
  }

  if (phaseDef.phaseType === "WORKFLOW") {
    const resultValue = answers.q_fin_01?.value || answers.q_fin_d_01?.value || null;
    return { type: "WORKFLOW", ready: !!resultValue, resultValue, blocksPhase: resultValue === "NOK" };
  }
  return null;
}

function validatePhaseExecution(state, phaseTxId) {
  const phaseTx = state.phaseTxs.find((p) => p.id === phaseTxId);
  if (!phaseTx) return { ok: false, reasons: ["Fase no encontrada"], warnings: [], visibleQuestions: [], incidents: [], special: null };

  const phaseDef = getPhaseDefinition(state, phaseTx.phaseDefinitionId);
  if (!phaseDef) return { ok: false, reasons: ["Definición no encontrada"], warnings: [], visibleQuestions: [], incidents: [], special: null };

  const version = getAppliedVersion(state, phaseTx);
  const answers = state.answersByPhaseTxId[phaseTx.id] || {};
  const incidents = state.incidents.filter((i) => i.phaseTxId === phaseTx.id && i.status === "OPEN");
  const unit = state.plannedUnits.find((u) => u.id === phaseTx.plannedUnitId);

  if (!version) return { ok: false, reasons: ["Sin versión de entregable"], warnings: [], visibleQuestions: [], incidents, special: null };

  const visibleQuestions = resolveVisibleQuestions(version.questions || [], answers, unit?.platformCode);
  const missingQuestions = [];
  const outOfRangeQuestions = [];
  const pendingReviewItems = [];

  for (const q of visibleQuestions) {
    const answer = answers[q.id];
    const validation = getQuestionValidation(q, answer);
    if (!validation.ok) missingQuestions.push(q.label);
    if (validation.ok && q.answerType === "NUMBER_LIMITS" && validation.inRange === false) {
      outOfRangeQuestions.push(q.label);
    }
    if (q.answerType === "TRACEABLE" && answer && !answer.noAplica && answer.validationResult) {
      for (const item of answer.validationResult.ncrs || []) {
        if (!item.seen) pendingReviewItems.push(`NCR pendiente en "${q.label}": ${item.code || item.id}`);
      }
      for (const item of answer.validationResult.pairings || []) {
        if (!item.seen) pendingReviewItems.push(`Emparejamiento pendiente en "${q.label}": ${item.identifier || item.id}`);
      }
    }
  }

  const blockingIncidents = incidents.filter((i) => i.blocksPhase);

  const special = computeSpecialProcess(state, phaseTx, unit);
  const specialBlockers = [];
  if (special?.type === "WORKFLOW" && special.blocksPhase) {
    specialBlockers.push("La verificación final ha resultado No Conforme");
  }

  const reasons = [
    ...missingQuestions.map((x) => `Falta respuesta en "${x}"`),
    ...pendingReviewItems,
    ...blockingIncidents.map((x) => `Incidencia bloqueante: ${x.description}`),
    ...specialBlockers,
  ];

  return { ok: reasons.length === 0, reasons, warnings: outOfRangeQuestions.map((x) => `Valor fuera de rango en "${x}"`), visibleQuestions, incidents, special, pendingReviewItems };
}

function getPhaseProgress(state, phaseTxId) {
  const validation = validatePhaseExecution(state, phaseTxId);
  const totalVisible = validation.visibleQuestions?.length || 0;
  const answers = state.answersByPhaseTxId[phaseTxId] || {};
  let completed = 0;
  for (const q of validation.visibleQuestions || []) {
    const a = answers[q.id];
    if (q.answerType === "TRACEABLE") {
      if (a?.noAplica || a?.validationResult?.exists) completed += 1;
    } else {
      const v = getAnswerValue(a);
      if (v != null && v !== "") completed += 1;
    }
  }
  return Math.min(100, (completed / (totalVisible || 1)) * 100);
}

function getUnitPhases(state, plannedUnitId) {
  return state.phaseTxs
    .filter((p) => p.plannedUnitId === plannedUnitId)
    .map((phaseTx) => {
      const phaseDef = getPhaseDefinition(state, phaseTx.phaseDefinitionId);
      return { ...phaseTx, phaseDefinition: phaseDef, validation: validatePhaseExecution(state, phaseTx.id), progress: getPhaseProgress(state, phaseTx.id) };
    })
    .sort((a, b) => (a.phaseDefinition?.order || 0) - (b.phaseDefinition?.order || 0));
}

function getUnitKpis(state, plannedUnitId) {
  const phases = getUnitPhases(state, plannedUnitId);
  const total = phases.length || 1;
  const done = phases.filter((p) => p.status === "DONE").length;
  const blocked = phases.filter((p) => p.status === "BLOCKED").length;
  const pending = phases.filter((p) => p.status === "PENDING_APPROVAL").length;
  const incidents = state.incidents.filter((i) => phases.some((p) => p.id === i.phaseTxId)).length;
  return { total, done, blocked, pending, incidents, percent: (done / total) * 100 };
}

function getPlatformReadiness(state, platformCode) {
  const phases = state.phaseDefinitions.filter((p) => p.platformCode === platformCode);
  const total = phases.length || 1;
  const ready = phases.filter((p) => !!p.deliverableId && !!getPublishedVersion(getDeliverable(state, p.deliverableId))).length;
  return { total, ready, pending: total - ready, percent: (ready / total) * 100 };
}

function statefulLinkedPhases(state, deliverableId) {
  return sortByOrder(state.phaseDefinitions.filter((p) => p.deliverableId === deliverableId));
}

// ─── Reducer ──────────────────────────────────────────────────
function touchPhase(phaseTx, operatorNumber) {
  return {
    ...phaseTx,
    status: phaseTx.status === "NOT_STARTED" ? "IN_PROGRESS" : phaseTx.status,
    startedAt: phaseTx.startedAt || now(),
    lastUpdatedAt: now(),
    lastUpdatedBy: operatorNumber || null,
  };
}

function reducer(state, action) {
  switch (action.type) {
    case "SET_OPERATOR": return { ...state, operatorNumber: action.value };
    case "SET_WEEK": return { ...state, selectedWeekId: action.value };

    case "UPSERT_PHASE_DEFINITION": {
      const incoming = action.phaseDefinition;
      const exists = state.phaseDefinitions.some((p) => p.id === incoming.id);
      return { ...state, phaseDefinitions: exists ? state.phaseDefinitions.map((p) => p.id === incoming.id ? { ...p, ...incoming } : p) : [...state.phaseDefinitions, incoming] };
    }
    case "DELETE_PHASE_DEFINITION":
      return { ...state, phaseDefinitions: state.phaseDefinitions.filter((p) => p.id !== action.phaseDefinitionId) };

    case "SET_PHASE_DELIVERABLE": {
      const { phaseDefinitionId, deliverableId } = action;
      return { ...state, phaseDefinitions: state.phaseDefinitions.map((p) => p.id === phaseDefinitionId ? { ...p, deliverableId } : p) };
    }

    case "UPDATE_DELIVERABLE_DRAFT": {
      const { deliverableId, patch } = action;
      return { ...state, deliverables: state.deliverables.map((d) => {
        if (d.id !== deliverableId) return d;
        const draft = getDraftVersion(d);
        if (!draft) return d;
        return { ...d, versions: d.versions.map((v) => v.id === draft.id ? { ...v, ...patch } : v) };
      })};
    }

    case "SET_DRAFT_QUESTIONS": {
      const { deliverableId, questions } = action;
      return { ...state, deliverables: state.deliverables.map((d) => {
        if (d.id !== deliverableId) return d;
        const draft = getDraftVersion(d);
        if (!draft) return d;
        return { ...d, versions: d.versions.map((v) => v.id === draft.id ? { ...v, questions } : v) };
      })};
    }

    case "PUBLISH_DELIVERABLE": {
      const { deliverableId } = action;
      return { ...state, deliverables: state.deliverables.map((d) => {
        if (d.id !== deliverableId) return d;
        const draft = getDraftVersion(d);
        if (!draft) return d;
        const nextVersion = Math.max(...d.versions.map((v) => v.versionNumber)) + 1;
        const newPub = { ...deepClone(draft), id: `${deliverableId}_pub_${nextVersion}`, versionNumber: nextVersion, status: "PUBLISHED", createdAt: today() };
        return { ...d, currentPublishedVersionId: newPub.id, versions: [newPub, ...d.versions] };
      })};
    }

    case "CREATE_DELIVERABLE":
      return { ...state, deliverables: [action.deliverable, ...state.deliverables] };

    case "UPDATE_DELIVERABLE_META": {
      const { deliverableId, patch } = action;
      return { ...state, deliverables: state.deliverables.map((d) => d.id === deliverableId ? { ...d, ...patch } : d) };
    }

    case "SET_ANSWER": {
      const { phaseTxId, questionId, value } = action;
      const prev = state.phaseTxs.find((p) => p.id === phaseTxId);
      return {
        ...state,
        answersByPhaseTxId: { ...state.answersByPhaseTxId, [phaseTxId]: { ...(state.answersByPhaseTxId[phaseTxId] || {}), [questionId]: value } },
        phaseTxs: state.phaseTxs.map((p) => p.id === phaseTxId ? touchPhase(prev, state.operatorNumber) : p),
      };
    }

    case "ADD_INCIDENT": {
      const prev = state.phaseTxs.find((p) => p.id === action.incident.phaseTxId);
      return {
        ...state,
        incidents: [action.incident, ...state.incidents],
        phaseTxs: state.phaseTxs.map((p) => {
          if (p.id !== action.incident.phaseTxId) return p;
          const touched = touchPhase(prev, state.operatorNumber);
          return action.incident.blocksPhase ? { ...touched, status: "BLOCKED" } : touched;
        }),
      };
    }

    case "FINALIZE_PHASE": {
      const { phaseTxId } = action;
      const phaseTx = state.phaseTxs.find((p) => p.id === phaseTxId);
      const needsApproval = phaseTx?.requiresApproval;
      const newStatus = needsApproval ? "PENDING_APPROVAL" : "DONE";
      let newApprovals = state.approvals;
      if (needsApproval) {
        newApprovals = [...state.approvals, {
          id: createId("appr"),
          phaseTxId,
          approvalGroupId: phaseTx.approvalGroupId,
          status: "PENDING",
          approvedBy: null, comments: null, approvedAt: null,
          createdAt: now(),
        }];
      }
      return {
        ...state,
        approvals: newApprovals,
        phaseTxs: state.phaseTxs.map((p) => p.id === phaseTxId ? {
          ...p, status: newStatus, startedAt: p.startedAt || now(),
          completedAt: newStatus === "DONE" ? now() : null,
          lastUpdatedAt: now(), lastUpdatedBy: state.operatorNumber || null,
        } : p),
      };
    }

    case "APPROVE_PHASE": {
      const { phaseTxId, approvedBy, comments } = action;
      return {
        ...state,
        approvals: state.approvals.map((a) => a.phaseTxId === phaseTxId && a.status === "PENDING"
          ? { ...a, status: "APPROVED", approvedBy, comments, approvedAt: now() } : a),
        phaseTxs: state.phaseTxs.map((p) => p.id === phaseTxId ? {
          ...p, status: "DONE", completedAt: now(), lastUpdatedAt: now(), lastUpdatedBy: approvedBy,
        } : p),
      };
    }

    case "REOPEN_PHASE": {
      const { phaseTxId } = action;
      return { ...state,
        phaseTxs: state.phaseTxs.map((p) => p.id === phaseTxId ? { ...p, status: "IN_PROGRESS", completedAt: null, lastUpdatedAt: now(), lastUpdatedBy: state.operatorNumber || null } : p),
        approvals: state.approvals.filter((a) => !(a.phaseTxId === phaseTxId && a.status === "PENDING")),
      };
    }

    case "ADD_MASTER_TABLE_ROW":
      return { ...state, masterTables: [...state.masterTables, action.row] };
    case "UPDATE_MASTER_TABLE_ROW":
      return { ...state, masterTables: state.masterTables.map((r) => r.id === action.row.id ? { ...r, ...action.row } : r) };
    case "DELETE_MASTER_TABLE_ROW":
      return { ...state, masterTables: state.masterTables.filter((r) => r.id !== action.rowId) };

    case "ADD_APPROVAL_GROUP":
      return { ...state, approvalGroups: [...state.approvalGroups, action.group] };
    case "UPDATE_APPROVAL_GROUP":
      return { ...state, approvalGroups: state.approvalGroups.map((g) => g.id === action.group.id ? { ...g, ...action.group } : g) };
    case "DELETE_APPROVAL_GROUP":
      return { ...state, approvalGroups: state.approvalGroups.filter((g) => g.id !== action.groupId) };

    default: return state;
  }
}

function useStore() {
  const [state, dispatch] = useReducer(reducer, initialState);
  return { state, dispatch };
}

// ─── UI Kit ───────────────────────────────────────────────────
function Card({ children, className = "" }) {
  return <div className={`rounded-3xl border border-zinc-200 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.06)] ${className}`}>{children}</div>;
}
function CardHeader({ title, subtitle, right }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 p-5">
      <div>
        <div className="text-base font-semibold tracking-tight text-zinc-900">{title}</div>
        {subtitle ? <div className="mt-1 text-sm text-zinc-500">{subtitle}</div> : null}
      </div>
      {right ? <div>{right}</div> : null}
    </div>
  );
}
function CardBody({ children, className = "" }) { return <div className={`px-5 pb-5 ${className}`}>{children}</div>; }
function Section({ title, subtitle, right, children, className = "" }) {
  return (
    <div className={`rounded-3xl border border-zinc-200 bg-white ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 p-4">
        <div>
          <div className="text-sm font-semibold tracking-tight">{title}</div>
          {subtitle ? <div className="mt-1 text-xs text-zinc-500">{subtitle}</div> : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
function Button({ children, variant = "primary", className = "", ...props }) {
  const base = "inline-flex items-center justify-center rounded-2xl px-3.5 py-2 text-sm font-medium transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50";
  const variants = { primary: "bg-zinc-900 text-white hover:bg-zinc-800", subtle: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200", ghost: "bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50", danger: "bg-rose-600 text-white hover:bg-rose-500", approval: "bg-emerald-600 text-white hover:bg-emerald-500" };
  return <button className={`${base} ${variants[variant] || ""} ${className}`} {...props}>{children}</button>;
}
function Badge({ children, tone = "neutral" }) {
  const tones = { neutral: "border-zinc-200 bg-zinc-100 text-zinc-700", ok: "border-emerald-200 bg-emerald-50 text-emerald-700", warn: "border-amber-200 bg-amber-50 text-amber-700", info: "border-sky-200 bg-sky-50 text-sky-700", draft: "border-violet-200 bg-violet-50 text-violet-700", danger: "border-rose-200 bg-rose-50 text-rose-700" };
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${tones[tone]}`}>{children}</span>;
}
function Divider() { return <div className="my-4 h-px bg-zinc-200" />; }
function Input({ label, hint, className = "", ...props }) {
  return (
    <label className="block">
      {label ? <div className="mb-1 text-xs font-medium text-zinc-700">{label}</div> : null}
      <input className={`w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 ${className}`} {...props} />
      {hint ? <div className="mt-1 text-xs text-zinc-500">{hint}</div> : null}
    </label>
  );
}
function Select({ label, children, className = "", ...props }) {
  return (
    <label className="block">
      {label ? <div className="mb-1 text-xs font-medium text-zinc-700">{label}</div> : null}
      <select className={`w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 ${className}`} {...props}>{children}</select>
    </label>
  );
}
function Textarea({ label, className = "", ...props }) {
  return (
    <label className="block">
      {label ? <div className="mb-1 text-xs font-medium text-zinc-700">{label}</div> : null}
      <textarea className={`w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 ${className}`} {...props} />
    </label>
  );
}
function PillNav({ items }) {
  return (
    <div className="inline-flex items-center rounded-2xl border border-zinc-200 bg-white p-1">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `rounded-xl px-3 py-2 text-sm ${isActive ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"}`}>{item.label}</NavLink>
      ))}
    </div>
  );
}
function Modal({ open, title, children, onClose, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-zinc-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.20)]">
        <div className="flex items-center justify-between p-5">
          <div className="text-sm font-semibold">{title}</div>
          <button className="rounded-xl px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100" onClick={onClose}>Cerrar</button>
        </div>
        <div className="px-5 pb-5">{children}</div>
        {footer ? <div className="flex justify-end gap-2 border-t border-zinc-200 p-4">{footer}</div> : null}
      </div>
    </div>
  );
}
function MetricCard({ label, value, subvalue, tone = "neutral" }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="text-xs font-medium text-zinc-500">{label}</div>
      <div className="mt-1 flex items-end gap-2"><div className="text-2xl font-semibold tracking-tight text-zinc-900">{value}</div>{subvalue ? <Badge tone={tone}>{subvalue}</Badge> : null}</div>
    </div>
  );
}
function ProgressBar({ value = 0 }) {
  return <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200"><div className="h-full rounded-full bg-zinc-900 transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

function HelpAttachmentViewer({ attachments = [] }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  if (!attachments || !attachments.length) return null;
  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2">
        {attachments.map((a) => (
          <button key={a.id} onClick={() => a.type === "image" ? setPreviewUrl(previewUrl === a.url ? null : a.url) : window.open(a.url, "_blank")}
            className="inline-flex items-center gap-1 rounded-xl border border-sky-200 bg-sky-50 px-2 py-1 text-xs text-sky-700 hover:bg-sky-100">
            {a.type === "image" ? "\uD83D\uDDBC" : "\uD83D\uDCC4"} {a.name}
          </button>
        ))}
      </div>
      {previewUrl && <div className="mt-2 rounded-xl border border-zinc-200 overflow-hidden"><img src={previewUrl} alt="Ayuda" className="max-h-64 w-full object-contain bg-zinc-50" /></div>}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────
export default function App() {
  const store = useStore();
  return <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/+$/, '')}><Shell store={store} /></BrowserRouter>;
}

function Shell({ store }) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <TopBar />
      <div className="mx-auto max-w-7xl px-4 pb-12 pt-6">
        <Routes>
          <Route path="/" element={<Landing store={store} />} />
          <Route path="/editor" element={<Navigate to="/editor/plataformas" replace />} />
          <Route path="/editor/plataformas" element={<EditorPlatforms store={store} />} />
          <Route path="/editor/fases" element={<EditorPhases store={store} />} />
          <Route path="/editor/entregables" element={<EditorDeliverables store={store} />} />
          <Route path="/editor/entregables/:deliverableId" element={<EditorDeliverableForm store={store} />} />
          <Route path="/editor/tabla-maestra" element={<EditorMasterTable store={store} />} />
          <Route path="/editor/aprobadores" element={<EditorApprovalGroups store={store} />} />
          <Route path="/operario" element={<Navigate to="/operario/login" replace />} />
          <Route path="/operario/login" element={<OperarioLogin store={store} />} />
          <Route path="/operario/semana" element={<OperarioWeekSelect store={store} />} />
          <Route path="/operario/unidades" element={<OperarioWeekSelect store={store} />} />
          <Route path="/operario/ns/:plannedUnitId" element={<OperarioCover store={store} />} />
          <Route path="/operario/ns/:plannedUnitId/fase/:phaseTxId" element={<OperarioPhaseDetail store={store} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <div className="sticky top-0 z-40 border-b border-zinc-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-zinc-900" />
          <div>
            <div className="text-sm font-semibold tracking-tight">Lerma · Libro de Trazabilidad</div>
            <div className="text-xs text-zinc-500">Mock-up v2 · Siemens Energy Gearbox</div>
          </div>
        </div>
        <div className="hidden sm:block">
          <PillNav items={[
            { to: "/", label: "Inicio", end: true },
            { to: "/editor/plataformas", label: "Editor" },
            { to: "/operario/login", label: "Operario" },
          ]} />
        </div>
      </div>
    </div>
  );
}

function Landing({ store }) {
  const nav = useNavigate();
  const readiness = useMemo(
    () => SEED.platforms.map((p) => ({ platform: p, metrics: getPlatformReadiness(store.state, p.code) })),
    [store.state]
  );
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader title="Mock-up v2 · Libro de Trazabilidad" subtitle="Plataformas, entregables multi-plataforma, trazables como pregunta, tabla maestra, aprobaciones y ayudas." right={<Badge tone="info">Single file</Badge>} />
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button onClick={() => nav("/editor/plataformas")} className="justify-between">Ir a Editor <span className="opacity-70">→</span></Button>
            <Button variant="subtle" onClick={() => nav("/operario/login")} className="justify-between">Ir a Operario <span className="opacity-70">→</span></Button>
          </div>
          <Divider />
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-sm font-semibold">Novedades v2</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-600">
                <li>Modelo → Plataforma (con variantes)</li>
                <li>Trazables como tipo de pregunta inline</li>
                <li>Pregunta de Tabla Maestra con valor de referencia</li>
                <li>Entregables con aprobación + grupos de aprobadores</li>
                <li>Preguntas filtradas por plataforma</li>
                <li>Ayudas (img/doc) en entregable y pregunta</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-sm font-semibold">Editor</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-600">
                <li>Plataformas con indicador de preparación</li>
                <li>Gestión de Tabla Maestra</li>
                <li>Gestión de Grupos de Aprobadores</li>
                <li>Constructor de entregables con todos los tipos</li>
                <li>Previsualizador por plataforma</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-sm font-semibold">Operario</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-600">
                <li>Trazables integrados en el reporte</li>
                <li>Botón NO APLICA para trazables</li>
                <li>Referencia de tabla maestra + valor real</li>
                <li>Flujo de aprobación tras finalización</li>
                <li>Visor de casquillos (datos AtlantIA)</li>
              </ul>
            </div>
          </div>
        </CardBody>
      </Card>
      <Section title="Readiness por plataforma" subtitle="Preparación del proceso: fases con entregable publicado.">
        <div className="grid gap-4 md:grid-cols-3">
          {readiness.map(({ platform, metrics }) => (
            <Card key={platform.id} className="shadow-none">
              <CardBody className="pt-5">
                <div className="flex items-center justify-between">
                  <div><div className="text-sm font-semibold">{platform.name}</div><div className="text-xs text-zinc-500">GP {platform.gpCode}</div></div>
                  <Badge tone={metrics.pending === 0 ? "ok" : "warn"}>{metrics.pending === 0 ? "Listo" : "Pendiente"}</Badge>
                </div>
                <div className="mt-4"><ProgressBar value={metrics.percent} /><div className="mt-2 text-xs text-zinc-500">{metrics.ready} de {metrics.total} fases · {formatPercent(metrics.percent)}</div></div>
              </CardBody>
            </Card>
          ))}
        </div>
      </Section>
    </div>
  );
}

function NotFound() {
  return <Card><CardHeader title="Ruta no encontrada" right={<Badge tone="warn">404</Badge>} /><CardBody><NavLink to="/" className="text-sm font-medium underline">Ir a inicio</NavLink></CardBody></Card>;
}

// ─── EDITOR ───────────────────────────────────────────────────
function EditorNav() {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="text-xl font-semibold tracking-tight">Editor</div>
        <div className="text-sm text-zinc-500">Gobierno del proceso, entregables y maestros.</div>
      </div>
      <PillNav items={[
        { to: "/editor/plataformas", label: "Plataformas" },
        { to: "/editor/fases", label: "Fases" },
        { to: "/editor/entregables", label: "Entregables" },
        { to: "/editor/tabla-maestra", label: "Tabla Maestra" },
        { to: "/editor/aprobadores", label: "Aprobadores" },
      ]} />
    </div>
  );
}

function EditorPlatforms({ store }) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(SEED.platforms[0].code);
  const readiness = getPlatformReadiness(store.state, selected);
  const phases = sortByOrder(store.state.phaseDefinitions.filter((p) => p.platformCode === selected));
  const variants = SEED.variants.filter((v) => v.platformCode === selected);

  return (
    <div className="grid gap-6">
      <EditorNav />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Section title="Plataformas" subtitle="Familias de producto" right={<Badge tone="info">Datos SAP</Badge>}>
          <div className="grid gap-2">
            {SEED.platforms.map((p) => {
              const m = getPlatformReadiness(store.state, p.code);
              return (
                <button key={p.id} onClick={() => setSelected(p.code)}
                  className={`rounded-2xl border px-3 py-3 text-left ${selected === p.code ? "border-zinc-400 bg-zinc-50" : "border-zinc-200 hover:bg-zinc-50"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div><div className="text-sm font-semibold">{p.name}</div><div className="text-xs text-zinc-500">GP {p.gpCode}</div></div>
                    <Badge tone={m.pending === 0 ? "ok" : "warn"}>{m.ready}/{m.total}</Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </Section>
        <div className="grid gap-4">
          <Section title={`Plataforma · ${selected}`} subtitle="Fases, variantes y preparación."
            right={<div className="flex items-center gap-2"><Badge tone={readiness.pending === 0 ? "ok" : "warn"}>{readiness.pending} pendientes</Badge><Button variant="subtle" onClick={() => navigate(`/editor/fases?platform=${selected}`)}>Abrir fases</Button></div>}>
            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard label="Fases totales" value={readiness.total} />
              <MetricCard label="Preparadas" value={readiness.ready} tone="ok" subvalue={formatPercent(readiness.percent)} />
              <MetricCard label="Pendientes" value={readiness.pending} tone={readiness.pending === 0 ? "ok" : "warn"} />
            </div>
            <Divider />
            <div className="text-xs font-semibold text-zinc-700 mb-2">Variantes de esta plataforma</div>
            <div className="flex flex-wrap gap-2 mb-4">
              {variants.map((v) => <Badge key={v.id} tone="info">{v.name}</Badge>)}
            </div>
            <div className="grid gap-3">
              {phases.map((phase) => {
                const d = getDeliverable(store.state, phase.deliverableId);
                const pub = getPublishedVersion(d);
                return (
                  <div key={phase.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">#{phase.order} · {phase.name}</div>
                        <div className="mt-1 text-xs text-zinc-500">{phase.phaseCode} · {phase.phaseType}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={pub ? "ok" : "warn"}>{pub ? `v${pub.versionNumber}` : "Sin publicar"}</Badge>
                        {d?.requiresApproval && <Badge tone="draft">Aprobación</Badge>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function EditorPhases({ store }) {
  const search = new URLSearchParams(window.location.search);
  const initialPlatform = search.get("platform") || SEED.platforms[0].code;
  const [platformCode, setPlatformCode] = useState(initialPlatform);
  const [selectedPhaseId, setSelectedPhaseId] = useState(null);

  const phaseList = sortByOrder(store.state.phaseDefinitions.filter((p) => p.platformCode === platformCode));
  const selectedPhase = phaseList.find((p) => p.id === selectedPhaseId) || phaseList[0] || null;
  const deliverableOptions = store.state.deliverables.map((d) => ({ id: d.id, name: d.name, published: !!getPublishedVersion(d) }));

  useEffect(() => {
    if (!selectedPhaseId && phaseList.length) setSelectedPhaseId(phaseList[0].id);
    else if (selectedPhaseId && !phaseList.some((p) => p.id === selectedPhaseId) && phaseList.length) setSelectedPhaseId(phaseList[0].id);
  }, [phaseList, selectedPhaseId]);

  return (
    <div className="grid gap-6">
      <EditorNav />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Section title="Fases" subtitle="Definiciones de fase por plataforma." right={<Badge tone="info">Datos SAP</Badge>}>
          <Select label="Plataforma" value={platformCode} onChange={(e) => { setPlatformCode(e.target.value); setSelectedPhaseId(null); }}>
            {SEED.platforms.map((p) => <option key={p.id} value={p.code}>{p.name}</option>)}
          </Select>
          <div className="mt-3 grid gap-2">
            {phaseList.map((phase) => {
              const d = getDeliverable(store.state, phase.deliverableId);
              const pub = getPublishedVersion(d);
              return (
                <button key={phase.id} onClick={() => setSelectedPhaseId(phase.id)}
                  className={`rounded-2xl border px-3 py-3 text-left ${selectedPhase?.id === phase.id ? "border-zinc-400 bg-zinc-50" : "border-zinc-200 hover:bg-zinc-50"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div><div className="text-sm font-semibold">#{phase.order} · {phase.name}</div><div className="text-xs text-zinc-500">{phase.phaseCode} · {phase.phaseType}</div></div>
                    <Badge tone={pub ? "ok" : "warn"}>{pub ? `v${pub.versionNumber}` : "Sin pub."}</Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </Section>
        <Section title="Detalle de fase" subtitle="Configuración funcional.">
          {!selectedPhase ? <div className="text-sm text-zinc-600">Selecciona una fase.</div> : (
            <div className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Input label="Nombre" value={selectedPhase.name} disabled />
                <Input label="Código" value={selectedPhase.phaseCode} disabled />
                <Input label="Orden" type="number" value={selectedPhase.order} disabled />
                <Input label="Tipo" value={selectedPhase.phaseType} disabled />
              </div>
              <Textarea label="Descripción" rows={3} value={selectedPhase.description || ""} disabled />
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="text-xs font-semibold text-zinc-700">Entregable asociado</div>
                <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
                  <Select label="Entregable" value={selectedPhase.deliverableId || ""}
                    onChange={(e) => store.dispatch({ type: "SET_PHASE_DELIVERABLE", phaseDefinitionId: selectedPhase.id, deliverableId: e.target.value })}>
                    <option value="">Selecciona…</option>
                    {deliverableOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </Select>
                  <div className="flex items-end">
                    <Button variant="subtle" onClick={() => window.location.assign(`/editor/entregables/${selectedPhase.deliverableId}`)} disabled={!selectedPhase.deliverableId}>Abrir entregable</Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function EditorMasterTable({ store }) {
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ topic: "", parameter: "", value: "" });
  const topics = getMasterTableTopics(store.state);
  const [filterTopic, setFilterTopic] = useState("ALL");
  const filtered = filterTopic === "ALL" ? store.state.masterTables : store.state.masterTables.filter((r) => r.topic === filterTopic);

  function save() {
    if (!form.topic.trim() || !form.parameter.trim() || !form.value.trim()) return;
    if (editId) store.dispatch({ type: "UPDATE_MASTER_TABLE_ROW", row: { id: editId, ...form } });
    else store.dispatch({ type: "ADD_MASTER_TABLE_ROW", row: { id: createId("mt"), ...form } });
    setForm({ topic: "", parameter: "", value: "" }); setEditId(null);
  }

  return (
    <div className="grid gap-6">
      <EditorNav />
      <Section title="Tabla Maestra" subtitle="Datos de referencia: Tema, Parámetro y Valor. Usados en preguntas tipo Tabla Maestra."
        right={<Badge tone="info">{store.state.masterTables.length} registros</Badge>}>
        <div className="grid gap-4">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-xs font-semibold text-zinc-700 mb-3">{editId ? "Editar registro" : "Nuevo registro"}</div>
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
              <Input label="Tema" value={form.topic} onChange={(e) => setForm((p) => ({ ...p, topic: e.target.value }))} placeholder="Ej. Par de apriete" />
              <Input label="Parámetro" value={form.parameter} onChange={(e) => setForm((p) => ({ ...p, parameter: e.target.value }))} placeholder="Ej. M6" />
              <Input label="Valor" value={form.value} onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))} placeholder="Ej. 200 Nm" />
              <div className="flex items-end gap-2">
                <Button onClick={save} disabled={!form.topic.trim() || !form.parameter.trim()}>{editId ? "Actualizar" : "Añadir"}</Button>
                {editId && <Button variant="ghost" onClick={() => { setEditId(null); setForm({ topic: "", parameter: "", value: "" }); }}>Cancelar</Button>}
              </div>
            </div>
          </div>
          <Select label="Filtrar por tema" value={filterTopic} onChange={(e) => setFilterTopic(e.target.value)}>
            <option value="ALL">Todos los temas</option>
            {topics.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-zinc-200 text-left text-xs font-semibold text-zinc-500"><th className="px-3 py-2">Tema</th><th className="px-3 py-2">Parámetro</th><th className="px-3 py-2">Valor</th><th className="px-3 py-2 text-right">Acciones</th></tr></thead>
              <tbody>{filtered.map((r) => (
                <tr key={r.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="px-3 py-2">{r.topic}</td><td className="px-3 py-2">{r.parameter}</td><td className="px-3 py-2 font-medium">{r.value}</td>
                  <td className="px-3 py-2 text-right"><div className="flex justify-end gap-1">
                    <Button variant="ghost" onClick={() => { setEditId(r.id); setForm({ topic: r.topic, parameter: r.parameter, value: r.value }); }}>Editar</Button>
                    <Button variant="danger" onClick={() => store.dispatch({ type: "DELETE_MASTER_TABLE_ROW", rowId: r.id })}>Eliminar</Button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
            {filtered.length === 0 && <div className="p-4 text-sm text-zinc-500 text-center">Sin registros.</div>}
          </div>
        </div>
      </Section>
    </div>
  );
}

function EditorApprovalGroups({ store }) {
  const [selectedId, setSelectedId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [memberForm, setMemberForm] = useState({ name: "", email: "" });
  const selected = store.state.approvalGroups.find((g) => g.id === selectedId) || null;

  function createGroup(form) {
    const group = { id: createId("ag"), title: form.title.trim(), description: form.description.trim(), members: [] };
    store.dispatch({ type: "ADD_APPROVAL_GROUP", group });
    setSelectedId(group.id); setCreateOpen(false);
  }
  function addMember() {
    if (!memberForm.email.trim() || !selected) return;
    store.dispatch({ type: "UPDATE_APPROVAL_GROUP", group: { ...selected, members: [...selected.members, { id: createId("m"), name: memberForm.name.trim(), email: memberForm.email.trim() }] } });
    setMemberForm({ name: "", email: "" });
  }
  function removeMember(memberId) {
    if (!selected) return;
    store.dispatch({ type: "UPDATE_APPROVAL_GROUP", group: { ...selected, members: selected.members.filter((m) => m.id !== memberId) } });
  }

  return (
    <div className="grid gap-6">
      <EditorNav />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Section title="Grupos de aprobadores" subtitle="Asignables a entregables que requieran aprobación."
          right={<Button variant="subtle" onClick={() => setCreateOpen(true)}>Nuevo grupo</Button>}>
          <div className="grid gap-2">
            {store.state.approvalGroups.map((g) => (
              <button key={g.id} onClick={() => setSelectedId(g.id)}
                className={`rounded-2xl border px-3 py-3 text-left ${selectedId === g.id ? "border-zinc-400 bg-zinc-50" : "border-zinc-200 hover:bg-zinc-50"}`}>
                <div className="text-sm font-semibold">{g.title}</div>
                <div className="text-xs text-zinc-500">{g.members.length} miembros</div>
              </button>
            ))}
            {store.state.approvalGroups.length === 0 && <div className="text-sm text-zinc-500">Sin grupos.</div>}
          </div>
        </Section>
        <Section title={selected ? selected.title : "Detalle"} subtitle={selected?.description || "Selecciona un grupo."}>
          {!selected ? <div className="text-sm text-zinc-600">Selecciona un grupo para gestionar sus miembros.</div> : (
            <div className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Input label="Título" value={selected.title} onChange={(e) => store.dispatch({ type: "UPDATE_APPROVAL_GROUP", group: { ...selected, title: e.target.value } })} />
                <Input label="Descripción" value={selected.description} onChange={(e) => store.dispatch({ type: "UPDATE_APPROVAL_GROUP", group: { ...selected, description: e.target.value } })} />
              </div>
              <Divider />
              <div className="text-xs font-semibold text-zinc-700">Miembros</div>
              <div className="grid gap-2">
                {selected.members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-3">
                    <div><div className="text-sm font-medium">{m.name || m.email}</div><div className="text-xs text-zinc-500">{m.email}</div></div>
                    <Button variant="danger" onClick={() => removeMember(m.id)}>Quitar</Button>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="text-xs font-semibold text-zinc-700 mb-3">Añadir miembro</div>
                <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <Input label="Nombre" value={memberForm.name} onChange={(e) => setMemberForm((p) => ({ ...p, name: e.target.value }))} />
                  <Input label="Email" value={memberForm.email} onChange={(e) => setMemberForm((p) => ({ ...p, email: e.target.value }))} placeholder="email@empresa.com" />
                  <div className="flex items-end"><Button onClick={addMember} disabled={!memberForm.email.trim()}>Añadir</Button></div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="danger" onClick={() => { store.dispatch({ type: "DELETE_APPROVAL_GROUP", groupId: selected.id }); setSelectedId(null); }}>Eliminar grupo</Button>
              </div>
            </div>
          )}
        </Section>
      </div>
      <CreateGroupModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={createGroup} />
    </div>
  );
}

function CreateGroupModal({ open, onClose, onCreate }) {
  const [form, setForm] = useState({ title: "", description: "" });
  useEffect(() => { if (open) setForm({ title: "", description: "" }); }, [open]);
  return (
    <Modal open={open} title="Nuevo grupo de aprobadores" onClose={onClose}
      footer={<><Button variant="subtle" onClick={onClose}>Cancelar</Button><Button disabled={!form.title.trim()} onClick={() => onCreate(form)}>Crear grupo</Button></>}>
      <div className="grid gap-3">
        <Input label="Título" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
        <Textarea label="Descripción" rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
      </div>
    </Modal>
  );
}

function EditorDeliverables({ store }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("ALL");
  const [expandedId, setExpandedId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return store.state.deliverables.filter((d) => {
      const byText = !needle || d.name.toLowerCase().includes(needle) || d.code.toLowerCase().includes(needle);
      const byType = type === "ALL" || d.phaseType === type;
      return byText && byType;
    });
  }, [search, store.state.deliverables, type]);

  function createDeliverable(form) {
    const baseCode = (form.code || form.name || "ENTREGABLE").toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
    const deliverableId = createId("dlv");
    const draftVersionId = `${deliverableId}_draft_v1`;
    const deliverable = {
      id: deliverableId, code: baseCode, name: form.name.trim(), phaseType: form.phaseType,
      requiresApproval: false, approvalGroupId: null, helpAttachments: [],
      currentDraftVersionId: draftVersionId, currentPublishedVersionId: null,
      versions: [{ id: draftVersionId, versionNumber: 1, status: "DRAFT", title: `${form.name.trim()} v1`, createdAt: today(), description: form.description.trim(),
        questions: form.includeQuestion ? [{ id: createId("q"), order: 1, label: form.initialQuestionLabel || "Nueva pregunta", helpText: "", answerType: "TEXT", isRequired: true, platformCode: null }] : [],
      }],
    };
    store.dispatch({ type: "CREATE_DELIVERABLE", deliverable });
    setCreateOpen(false); navigate(`/editor/entregables/${deliverableId}`);
  }

  return (
    <div className="grid gap-6">
      <EditorNav />
      <Section title="Filtros" subtitle="Busca por nombre, código o tipo">
        <div className="grid gap-3 md:grid-cols-3">
          <Input label="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ej. recepción" />
          <Select label="Tipo" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="ALL">Todos</option>
            {SEED.phaseTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <div className="flex items-end justify-end gap-2">
            <Badge tone="info">{filtered.length} resultados</Badge>
            <Button onClick={() => setCreateOpen(true)}>Nuevo entregable</Button>
          </div>
        </div>
      </Section>
      <Section title="Entregables" subtitle="Borrador, publicación, preguntas y reutilización.">
        <div className="grid gap-3">
          {filtered.map((d) => {
            const draft = getDraftVersion(d); const pub = getPublishedVersion(d);
            const linked = statefulLinkedPhases(store.state, d.id);
            const open = expandedId === d.id;
            return (
              <div key={d.id} className="rounded-2xl border border-zinc-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div><div className="text-sm font-semibold">{d.name}</div><div className="text-xs text-zinc-500">{d.code} · {d.phaseType}{d.requiresApproval ? " · Requiere aprobación" : ""}</div></div>
                  <div className="flex flex-wrap items-center gap-2">
                    {draft ? <Badge tone="draft">Borrador v{draft.versionNumber}</Badge> : <Badge tone="neutral">Sin borrador</Badge>}
                    {pub ? <Badge tone="ok">Pub. v{pub.versionNumber}</Badge> : <Badge tone="warn">No publicado</Badge>}
                    {d.requiresApproval && <Badge tone="draft">Aprobación</Badge>}
                    <Button variant="subtle" onClick={() => setExpandedId(open ? null : d.id)}>{open ? "Ocultar" : "Más"}</Button>
                    <Button onClick={() => navigate(`/editor/entregables/${d.id}`)}>Abrir</Button>
                  </div>
                </div>
                {open && (
                  <div className="border-t border-zinc-200 p-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                        <div className="text-xs font-semibold text-zinc-700">Fases que lo usan</div>
                        <div className="mt-2 grid gap-2">
                          {linked.length === 0 ? <div className="text-sm text-zinc-600">No asignado.</div> : linked.map((ph) => (
                            <div key={ph.id} className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
                              <div className="text-sm font-medium">{ph.platformCode} · {ph.name}</div>
                              <div className="text-xs text-zinc-500">{ph.phaseCode}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                        <div className="text-xs font-semibold text-zinc-700">Versiones</div>
                        <div className="mt-2 grid gap-2">
                          {d.versions.slice().sort((a, b) => b.versionNumber - a.versionNumber).map((v) => (
                            <div key={v.id} className="rounded-xl border border-zinc-200 bg-white p-3">
                              <div className="flex items-center justify-between gap-2"><div className="text-sm font-medium">v{v.versionNumber}</div><Badge tone={v.status === "PUBLISHED" ? "ok" : "draft"}>{v.status}</Badge></div>
                              <div className="mt-1 text-xs text-zinc-500">{v.createdAt}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>
      <CreateDeliverableModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={createDeliverable} />
    </div>
  );
}

function CreateDeliverableModal({ open, onClose, onCreate }) {
  const [form, setForm] = useState({ name: "", code: "", phaseType: "FORM", description: "", includeQuestion: true, initialQuestionLabel: "Nueva pregunta" });
  useEffect(() => { if (open) setForm({ name: "", code: "", phaseType: "FORM", description: "", includeQuestion: true, initialQuestionLabel: "Nueva pregunta" }); }, [open]);
  return (
    <Modal open={open} title="Nuevo entregable" onClose={onClose}
      footer={<><Button variant="subtle" onClick={onClose}>Cancelar</Button><Button disabled={!form.name.trim()} onClick={() => onCreate(form)}>Crear</Button></>}>
      <div className="grid gap-3">
        <Input label="Nombre" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        <Input label="Código (opcional)" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
        <Select label="Tipo" value={form.phaseType} onChange={(e) => setForm((p) => ({ ...p, phaseType: e.target.value }))}>
          {SEED.phaseTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
        <Textarea label="Descripción" rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
        <label className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 px-3 py-2 text-sm">
          <input type="checkbox" checked={form.includeQuestion} onChange={(e) => setForm((p) => ({ ...p, includeQuestion: e.target.checked }))} /> Crear pregunta inicial
        </label>
        {form.includeQuestion && <Input label="Texto de la pregunta" value={form.initialQuestionLabel} onChange={(e) => setForm((p) => ({ ...p, initialQuestionLabel: e.target.value }))} />}
      </div>
    </Modal>
  );
}

function EditorDeliverableForm({ store }) {
  const navigate = useNavigate();
  const { deliverableId } = useParams();
  const deliverable = getDeliverable(store.state, deliverableId);
  const draft = getDraftVersion(deliverable);
  const published = getPublishedVersion(deliverable);
  const [tab, setTab] = useState("builder");
  const [previewPlatform, setPreviewPlatform] = useState("ALL");
  const [toast, setToast] = useState("");
  const [localQuestions, setLocalQuestions] = useState(() => deepClone(draft?.questions || []));

  useEffect(() => { setLocalQuestions(deepClone(draft?.questions || [])); }, [draft?.id]);

  if (!deliverable) return <div className="grid gap-6"><EditorNav /><Card><CardHeader title="No encontrado" /><CardBody><Button variant="subtle" onClick={() => navigate("/editor/entregables")}>Volver</Button></CardBody></Card></div>;

  const linkedPlatforms = [...new Set(statefulLinkedPhases(store.state, deliverable.id).map((p) => p.platformCode))];

  function commitDraft(questions) { setLocalQuestions(questions); store.dispatch({ type: "SET_DRAFT_QUESTIONS", deliverableId: deliverable.id, questions }); }

  function addQuestion(type) {
    const nextOrder = (localQuestions.reduce((max, q) => Math.max(max, q.order || 0), 0) || 0) + 1;
    const base = { id: createId("q"), order: nextOrder, label: "Nueva pregunta", helpText: "", answerType: type, isRequired: false, platformCode: null };
    if (type === "OPTION") base.options = [{ value: "OP_1", label: "Opción 1" }];
    if (type === "EXTERNAL_SELECT") base.optionSource = "stations";
    if (type === "NUMBER_LIMITS") { base.minValue = 0; base.maxValue = 0; }
    if (type === "MASTER_TABLE") { base.masterTableTopic = ""; base.masterTableParameter = ""; }
    commitDraft(sortByOrder([...localQuestions, base]));
  }

  function publish() {
    store.dispatch({ type: "PUBLISH_DELIVERABLE", deliverableId: deliverable.id });
    setToast("Publicado."); setTimeout(() => setToast(""), 2000);
  }

  return (
    <div className="grid gap-6">
      <EditorNav />
      <Card>
        <CardHeader title={deliverable.name} subtitle={`${deliverable.code} · ${deliverable.phaseType}`}
          right={<div className="flex flex-wrap items-center gap-2">
            {draft && <Badge tone="draft">Borrador v{draft.versionNumber}</Badge>}
            {published && <Badge tone="ok">Pub. v{published.versionNumber}</Badge>}
            {deliverable.requiresApproval && <Badge tone="draft">Aprobación</Badge>}
          </div>} />
        <CardBody>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 mb-4">
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={deliverable.requiresApproval}
                  onChange={(e) => store.dispatch({ type: "UPDATE_DELIVERABLE_META", deliverableId: deliverable.id, patch: { requiresApproval: e.target.checked } })} />
                Este entregable requiere aprobación al finalizar
              </label>
              {deliverable.requiresApproval && (
                <Select value={deliverable.approvalGroupId || ""}
                  onChange={(e) => store.dispatch({ type: "UPDATE_DELIVERABLE_META", deliverableId: deliverable.id, patch: { approvalGroupId: e.target.value || null } })}>
                  <option value="">Selecciona grupo…</option>
                  {store.state.approvalGroups.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                </Select>
              )}
            </div>
            {deliverable.requiresApproval && deliverable.approvalGroupId && (
              <div className="mt-2 text-xs text-zinc-500">Grupo: {getApprovalGroup(store.state, deliverable.approvalGroupId)?.title} ({getApprovalGroup(store.state, deliverable.approvalGroupId)?.members.length} miembros)</div>
            )}
          </div>

          <HelpAttachmentViewer attachments={deliverable.helpAttachments} />

          <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
            <div className="inline-flex rounded-2xl border border-zinc-200 bg-white p-1">
              <button className={`rounded-xl px-3 py-2 text-sm ${tab === "builder" ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"}`} onClick={() => setTab("builder")}>Constructor</button>
              <button className={`rounded-xl px-3 py-2 text-sm ${tab === "preview" ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"}`} onClick={() => setTab("preview")}>Previsualización</button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="subtle" onClick={() => navigate("/editor/entregables")}>Volver</Button>
              <Button variant="subtle" onClick={() => { store.dispatch({ type: "SET_DRAFT_QUESTIONS", deliverableId: deliverable.id, questions: localQuestions }); setToast("Guardado."); setTimeout(() => setToast(""), 1500); }}>Guardar borrador</Button>
              <Button onClick={publish}>Publicar</Button>
            </div>
          </div>

          {toast && <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{toast}</div>}
          <Divider />

          {tab === "builder" ? (
            <div className="grid gap-4">
              <Section title="Añadir pregunta" subtitle="Todos los tipos disponibles.">
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="subtle" onClick={() => addQuestion("TEXT")}>+ Texto</Button>
                  <Button variant="subtle" onClick={() => addQuestion("NUMBER")}>+ Numérico</Button>
                  <Button variant="subtle" onClick={() => addQuestion("NUMBER_LIMITS")}>+ Num. límites</Button>
                  <Button variant="subtle" onClick={() => addQuestion("OPTION")}>+ Opción</Button>
                  <Button variant="subtle" onClick={() => addQuestion("EXTERNAL_SELECT")}>+ Lista ext.</Button>
                  <Button variant="subtle" onClick={() => addQuestion("YES_NO")}>+ Sí/No</Button>
                  <Button variant="subtle" onClick={() => addQuestion("FILE")}>+ Archivo</Button>
                  <Button variant="subtle" onClick={() => addQuestion("IMAGE")}>+ Imagen</Button>
                  <Button className="bg-sky-700 hover:bg-sky-600 text-white" onClick={() => addQuestion("TRACEABLE")}>+ Trazable</Button>
                  <Button className="bg-violet-700 hover:bg-violet-600 text-white" onClick={() => addQuestion("MASTER_TABLE")}>+ Tabla Maestra</Button>
                </div>
              </Section>
              <Section title="Preguntas del borrador" subtitle="Orden, plataforma, condicional y configuración.">
                <div className="grid gap-3">
                  {sortByOrder(localQuestions).map((q, i) => (
                    <QuestionBuilderCard key={q.id} question={q} questions={localQuestions} index={i} store={store} linkedPlatforms={linkedPlatforms}
                      onChange={(patch) => commitDraft(localQuestions.map((x) => x.id === q.id ? { ...x, ...patch } : x))}
                      onDelete={() => commitDraft(localQuestions.filter((x) => x.id !== q.id))}
                      onMoveUp={() => { if (i === 0) return; const c = sortByOrder(localQuestions); const t = c[i - 1].order; c[i - 1].order = c[i].order; c[i].order = t; commitDraft(sortByOrder(c)); }}
                      onMoveDown={() => { if (i >= localQuestions.length - 1) return; const c = sortByOrder(localQuestions); const t = c[i + 1].order; c[i + 1].order = c[i].order; c[i].order = t; commitDraft(sortByOrder(c)); }}
                    />
                  ))}
                  {localQuestions.length === 0 && <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">Sin preguntas.</div>}
                </div>
              </Section>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium text-zinc-700">Vista previa para plataforma:</div>
                <Select value={previewPlatform} onChange={(e) => setPreviewPlatform(e.target.value)}>
                  <option value="ALL">Todas</option>
                  {linkedPlatforms.map((p) => <option key={p} value={p}>{p}</option>)}
                  {SEED.platforms.filter((p) => !linkedPlatforms.includes(p.code)).map((p) => <option key={p.code} value={p.code}>{p.code} (no vinculada)</option>)}
                </Select>
              </div>
              <FormPreview questions={localQuestions} platformCode={previewPlatform === "ALL" ? null : previewPlatform} store={store} />
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function QuestionBuilderCard({ question, questions, index, onChange, onDelete, onMoveUp, onMoveDown, store, linkedPlatforms }) {
  const topics = getMasterTableTopics(store.state);
  const params = question.masterTableTopic ? getMasterTableParams(store.state, question.masterTableTopic) : [];
  const refValue = question.masterTableTopic && question.masterTableParameter ? getMasterTableValue(store.state, question.masterTableTopic, question.masterTableParameter) : null;
  const parentCandidates = questions.filter((q) => q.id !== question.id && !q.visibleWhen);

  return (
    <Card className="shadow-none">
      <CardHeader
        title={<span>#{question.order} · {question.label || "(sin título)"} {question.platformCode && <Badge tone="info">{question.platformCode}</Badge>}</span>}
        subtitle={`${answerTypeLabel(question.answerType)}${question.isRequired ? " · Obligatoria" : ""}`}
        right={<div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onMoveUp} disabled={index === 0}>↑</Button>
          <Button variant="ghost" onClick={onMoveDown} disabled={index === questions.length - 1}>↓</Button>
          <Button variant="danger" onClick={onDelete}>Eliminar</Button>
        </div>}
      />
      <CardBody>
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Texto" value={question.label || ""} onChange={(e) => onChange({ label: e.target.value })} />
          <Input label="Orden" type="number" value={question.order || 1} onChange={(e) => onChange({ order: Number(e.target.value || 1) })} />
          <Input label="Ayuda" value={question.helpText || ""} onChange={(e) => onChange({ helpText: e.target.value })} />
          <Select label="Tipo" value={question.answerType} onChange={(e) => onChange({ answerType: e.target.value })}>
            <option value="TEXT">Texto</option><option value="NUMBER">Numérico</option><option value="NUMBER_LIMITS">Num. límites</option>
            <option value="OPTION">Opción</option><option value="EXTERNAL_SELECT">Lista externa</option>
            <option value="FILE">Archivo</option><option value="IMAGE">Imagen</option><option value="YES_NO">Sí / No</option>
            <option value="TRACEABLE">Elemento trazable</option><option value="MASTER_TABLE">Tabla maestra</option>
          </Select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm">
            <input type="checkbox" checked={!!question.isRequired} onChange={(e) => onChange({ isRequired: e.target.checked })} /> Obligatoria
          </label>
          <Select label="Plataforma" value={question.platformCode || ""} onChange={(e) => onChange({ platformCode: e.target.value || null })}>
            <option value="">Todas</option>
            {SEED.platforms.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
          </Select>
        </div>

        {question.answerType === "NUMBER_LIMITS" && (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Input label="Mínimo" type="number" value={question.minValue ?? 0} onChange={(e) => onChange({ minValue: clampNumber(e.target.value) ?? 0 })} />
            <Input label="Máximo" type="number" value={question.maxValue ?? 0} onChange={(e) => onChange({ maxValue: clampNumber(e.target.value) ?? 0 })} />
          </div>
        )}

        {question.answerType === "OPTION" && (
          <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
            <div className="text-xs font-semibold text-zinc-700">Opciones</div>
            <div className="mt-2 grid gap-2">
              {(question.options || []).map((opt, oi) => (
                <div key={`${opt.value}_${oi}`} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                  <Input label="Valor" value={opt.value} onChange={(e) => { const n = [...(question.options || [])]; n[oi] = { ...n[oi], value: e.target.value }; onChange({ options: n }); }} />
                  <Input label="Etiqueta" value={opt.label} onChange={(e) => { const n = [...(question.options || [])]; n[oi] = { ...n[oi], label: e.target.value }; onChange({ options: n }); }} />
                  <div className="flex items-end"><Button variant="danger" onClick={() => onChange({ options: (question.options || []).filter((_, i) => i !== oi) })}>Quitar</Button></div>
                </div>
              ))}
              <Button variant="subtle" onClick={() => onChange({ options: [...(question.options || []), { value: `OP_${(question.options || []).length + 1}`, label: `Opci\u00f3n ${(question.options || []).length + 1}` }] })}>Añadir opción</Button>
            </div>
          </div>
        )}

        {question.answerType === "EXTERNAL_SELECT" && (
          <div className="mt-3"><Select label="Fuente externa" value={question.optionSource || "stations"} onChange={(e) => onChange({ optionSource: e.target.value })}>
            {Object.keys(EXTERNAL_SOURCES).map((k) => <option key={k} value={k}>{k}</option>)}
          </Select></div>
        )}

        {question.answerType === "TRACEABLE" && (
          <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 p-3">
            <div className="text-xs font-semibold text-sky-700">Pregunta tipo Trazable</div>
            <div className="mt-1 text-xs text-sky-600">El operario verá un desplegable con los GPs de la variante, podrá introducir serial, validar y marcar NO APLICA.</div>
          </div>
        )}

        {question.answerType === "MASTER_TABLE" && (
          <div className="mt-3 rounded-2xl border border-violet-200 bg-violet-50 p-3">
            <div className="text-xs font-semibold text-violet-700 mb-2">Tabla Maestra</div>
            <div className="grid gap-3 md:grid-cols-3">
              <Select label="Tema" value={question.masterTableTopic || ""} onChange={(e) => onChange({ masterTableTopic: e.target.value, masterTableParameter: "" })}>
                <option value="">Tema…</option>
                {topics.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
              <Select label="Parámetro" value={question.masterTableParameter || ""} onChange={(e) => onChange({ masterTableParameter: e.target.value })}>
                <option value="">Parámetro…</option>
                {params.map((p) => <option key={p} value={p}>{p}</option>)}
              </Select>
              <div className="flex items-end">
                <div className="rounded-2xl border border-violet-300 bg-white px-3 py-2 text-sm font-medium text-violet-800 w-full text-center">
                  {refValue ? `Ref: ${refValue}` : "Sin valor"}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
          <div className="text-xs font-semibold text-zinc-700">Visibilidad condicional <span className="font-normal text-zinc-500">(solo 1 nivel)</span></div>
          <div className="mt-2 grid gap-3 md:grid-cols-3">
            <Select label="Pregunta origen" value={question.visibleWhen?.questionId || ""}
              onChange={(e) => { const qId = e.target.value || null; if (!qId) return onChange({ visibleWhen: undefined }); onChange({ visibleWhen: { ...(question.visibleWhen || {}), questionId: qId, equals: question.visibleWhen?.equals || "" } }); }}>
              <option value="">Sin regla</option>
              {parentCandidates.map((q) => <option key={q.id} value={q.id}>{q.label || q.id}</option>)}
            </Select>
            <Input label="Cuando valor =" value={question.visibleWhen?.equals || ""}
              onChange={(e) => { if (!question.visibleWhen?.questionId) return; onChange({ visibleWhen: { ...question.visibleWhen, equals: e.target.value } }); }} />
            <div className="flex items-end"><Button variant="ghost" className="w-full" onClick={() => onChange({ visibleWhen: undefined })}>Limpiar</Button></div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function FormPreview({ questions, platformCode = null, store }) {
  const filtered = resolveVisibleQuestions(questions, {}, platformCode);
  return (
    <div className="grid gap-3">
      {filtered.length === 0 && <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">Sin preguntas para esta plataforma.</div>}
      {filtered.map((q) => (
        <div key={q.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">{q.label}</div>
              {q.helpText && <div className="mt-1 text-xs text-zinc-500">{q.helpText}</div>}
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={q.isRequired ? "warn" : "neutral"}>{q.isRequired ? "Oblig." : "Opc."}</Badge>
              {q.platformCode && <Badge tone="info">{q.platformCode}</Badge>}
              <Badge tone="neutral">{answerTypeLabel(q.answerType)}</Badge>
            </div>
          </div>
          {q.answerType === "MASTER_TABLE" && q.masterTableTopic && (
            <div className="mt-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-700">
              Ref: {getMasterTableValue(store.state, q.masterTableTopic, q.masterTableParameter) || "-"} ({q.masterTableTopic} / {q.masterTableParameter})
            </div>
          )}
          {q.answerType === "TRACEABLE" && <div className="mt-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">Trazable · GP + Serial + Validación</div>}
          <HelpAttachmentViewer attachments={q.helpAttachments} />
          <div className="mt-3"><AnswerField question={q} value={{}} onChange={() => {}} disabled store={store} /></div>
        </div>
      ))}
    </div>
  );
}

// ─── OPERARIO ─────────────────────────────────────────────────
function OperarioGuard({ store, children }) {
  if (!store.state.operatorNumber) return <Navigate to="/operario/login" replace />;
  return children;
}

function OperarioHeader({ store, title, subtitle, right }) {
  const navigate = useNavigate();
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div><div className="text-xl font-semibold tracking-tight">{title}</div><div className="text-sm text-zinc-500">{subtitle}</div></div>
      <div className="flex flex-wrap items-center gap-2">{right}<Badge tone="neutral">Operario {store.state.operatorNumber || "-"}</Badge><Button variant="subtle" onClick={() => navigate("/operario/semana")}>Semana</Button></div>
    </div>
  );
}

function OperarioLogin({ store }) {
  const navigate = useNavigate();
  const [op, setOp] = useState(store.state.operatorNumber || "");
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-md">
        <Card><CardHeader title="Login operario" subtitle="Identificación para ejecución en planta" /><CardBody>
          <div className="grid gap-3">
            <Input label="Número de operario" value={op} onChange={(e) => setOp(e.target.value)} placeholder="Ej. 01234" />
            <Button className="w-full" disabled={!op.trim()} onClick={() => { store.dispatch({ type: "SET_OPERATOR", value: op.trim() }); navigate("/operario/semana"); }}>Entrar</Button>
          </div>
        </CardBody></Card>
      </div>
    </div>
  );
}

function OperarioWeekSelect({ store }) {
  const navigate = useNavigate();
  const [weeks, setWeeks] = useState([]);
  const [units, setUnits] = useState([]);
  const [search, setSearch] = useState("");
  useEffect(() => { fakeApi.getWeeks().then(setWeeks); }, []);
  useEffect(() => { fakeApi.getUnitsByWeek(store.state.selectedWeekId).then(setUnits); }, [store.state.selectedWeekId]);
  const filtered = units.filter((u) => { const n = search.trim().toLowerCase(); if (!n) return true; return u.ns.toLowerCase().includes(n) || u.platformCode.toLowerCase().includes(n) || u.variantCode.toLowerCase().includes(n); });

  return (
    <OperarioGuard store={store}>
      <div className="grid gap-6">
        <OperarioHeader store={store} title="Operario" subtitle="Selecciona semana y multiplicadoras" right={<Badge tone="info">{store.state.selectedWeekId}</Badge>} />
        <Card><CardHeader title="Semana y búsqueda" /><CardBody>
          <div className="grid gap-3 md:grid-cols-2">
            <Select label="Semana" value={store.state.selectedWeekId} onChange={(e) => store.dispatch({ type: "SET_WEEK", value: e.target.value })}>
              {weeks.map((w) => <option key={w.id} value={w.id}>{w.year} · Semana {w.week}</option>)}
            </Select>
            <Input label="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="NS / plataforma / variante" />
          </div>
        </CardBody></Card>
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((u) => {
            const kpis = getUnitKpis(store.state, u.id);
            return (
              <Card key={u.id}>
                <CardHeader title={u.ns} subtitle={`${u.platformCode} · ${u.variantCode} · GP ${u.gpCode}`}
                  right={<Button variant="subtle" onClick={() => navigate(`/operario/ns/${u.id}`)}>Abrir</Button>} />
                <CardBody>
                  <ProgressBar value={kpis.percent} />
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-zinc-50 p-2"><div className="font-semibold">{kpis.done}/{kpis.total}</div><div className="text-zinc-500">Fases</div></div>
                    <div className="rounded-xl bg-zinc-50 p-2"><div className="font-semibold">{kpis.incidents}</div><div className="text-zinc-500">Incid.</div></div>
                    <div className="rounded-xl bg-zinc-50 p-2"><div className="font-semibold">{kpis.blocked}</div><div className="text-zinc-500">Bloq.</div></div>
                    <div className="rounded-xl bg-zinc-50 p-2"><div className="font-semibold">{kpis.pending}</div><div className="text-zinc-500">Aprob.</div></div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </div>
    </OperarioGuard>
  );
}

function OperarioCover({ store }) {
  const navigate = useNavigate();
  const { plannedUnitId } = useParams();
  const unit = store.state.plannedUnits.find((u) => u.id === plannedUnitId);
  if (!unit) return <OperarioGuard store={store}><Card><CardHeader title="NS no encontrado" /><CardBody><Button variant="subtle" onClick={() => navigate("/operario/semana")}>Volver</Button></CardBody></Card></OperarioGuard>;

  const phases = getUnitPhases(store.state, unit.id);
  const kpis = getUnitKpis(store.state, unit.id);

  return (
    <OperarioGuard store={store}>
      <div className="grid gap-6">
        <OperarioHeader store={store} title={`${unit.ns}`} subtitle={`${unit.platformCode} · ${unit.variantCode} · Semana ${store.state.selectedWeekId}`}
          right={<Button variant="subtle" onClick={() => navigate("/operario/semana")}>Volver</Button>} />
        <div className="grid gap-4 lg:grid-cols-5">
          <MetricCard label="Avance" value={formatPercent(kpis.percent)} />
          <MetricCard label="Finalizadas" value={`${kpis.done}/${kpis.total}`} tone="ok" />
          <MetricCard label="Incidencias" value={kpis.incidents} tone={kpis.incidents ? "warn" : "ok"} />
          <MetricCard label="Bloqueadas" value={kpis.blocked} tone={kpis.blocked ? "warn" : "ok"} />
          <MetricCard label="Pend. aprob." value={kpis.pending} tone={kpis.pending ? "draft" : "ok"} />
        </div>
        <Section title="Fases del montaje">
          <div className="grid gap-3">
            {phases.map((ph) => (
              <div key={ph.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">#{ph.phaseDefinition?.order} · {ph.phaseDefinition?.name}</div>
                    <div className="mt-1 text-xs text-zinc-500">{ph.phaseCode} · OF {ph.ofCode}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={toneForPhaseStatus(ph.status)}>{labelForPhaseStatus(ph.status)}</Badge>
                    {ph.requiresApproval && <Badge tone="draft">Aprob.</Badge>}
                    <Button variant="subtle" onClick={() => navigate(`/operario/ns/${unit.id}/fase/${ph.id}`)}>Abrir</Button>
                  </div>
                </div>
                <div className="mt-3"><ProgressBar value={ph.progress} /><div className="mt-2 text-xs text-zinc-500">{formatPercent(ph.progress)}</div></div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </OperarioGuard>
  );
}

function OperarioPhaseDetail({ store }) {
  const navigate = useNavigate();
  const { plannedUnitId, phaseTxId } = useParams();
  const unit = store.state.plannedUnits.find((u) => u.id === plannedUnitId);
  const phaseTx = store.state.phaseTxs.find((p) => p.id === phaseTxId);
  const phaseDef = phaseTx ? getPhaseDefinition(store.state, phaseTx.phaseDefinitionId) : null;
  const appliedVersion = phaseTx ? getAppliedVersion(store.state, phaseTx) : null;
  const deliverable = phaseDef ? getDeliverable(store.state, phaseDef.deliverableId) : null;

  const [tab, setTab] = useState("reporte");
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [incidentForm, setIncidentForm] = useState({ scope: "FORM", questionId: "", severity: "MEDIUM", blocksPhase: false, description: "", evidenceName: "", approvalGroupId: "" });
  const [toast, setToast] = useState("");
  const [approvalComment, setApprovalComment] = useState("");

  if (!unit || !phaseTx || !phaseDef || !appliedVersion) return <OperarioGuard store={store}><Card><CardHeader title="Fase no encontrada" /><CardBody><Button variant="subtle" onClick={() => navigate("/operario/semana")}>Volver</Button></CardBody></Card></OperarioGuard>;

  const answers = store.state.answersByPhaseTxId[phaseTx.id] || {};
  const incidents = store.state.incidents.filter((i) => i.phaseTxId === phaseTx.id);
  const validation = validatePhaseExecution(store.state, phaseTx.id);
  const visibleQuestions = validation.visibleQuestions || [];
  const special = validation.special;
  const progress = getPhaseProgress(store.state, phaseTx.id);
  const approval = store.state.approvals.find((a) => a.phaseTxId === phaseTx.id);

  function showToast(msg, duration = 1800) { setToast(msg); setTimeout(() => setToast(""), duration); }

  function finalize() {
    const check = validatePhaseExecution(store.state, phaseTx.id);
    if (!check.ok) { showToast(`No se puede finalizar: ${check.reasons[0]}`, 2200); return; }
    store.dispatch({ type: "FINALIZE_PHASE", phaseTxId: phaseTx.id });
    showToast(phaseTx.requiresApproval ? "Enviada a aprobaci\u00f3n." : "Fase finalizada.");
  }
  function approve() {
    store.dispatch({ type: "APPROVE_PHASE", phaseTxId: phaseTx.id, approvedBy: store.state.operatorNumber || "aprobador", comments: approvalComment });
    showToast("Aprobada."); setApprovalComment("");
  }
  function reopen() { store.dispatch({ type: "REOPEN_PHASE", phaseTxId: phaseTx.id }); showToast("Reabierta."); }

  return (
    <OperarioGuard store={store}>
      <div className="grid gap-6">
        <OperarioHeader store={store} title={`${unit.ns} · ${phaseDef.name}`}
          subtitle={`OF ${phaseTx.ofCode} · ${unit.platformCode} · ${unit.variantCode}`}
          right={<Button variant="subtle" onClick={() => navigate(`/operario/ns/${plannedUnitId}`)}>Portada</Button>} />

        <Section title="Estado" right={<Badge tone={toneForPhaseStatus(phaseTx.status)}>{labelForPhaseStatus(phaseTx.status)}</Badge>}>
          <div className="grid gap-4 lg:grid-cols-4">
            <MetricCard label="Progreso" value={formatPercent(progress)} />
            <MetricCard label="Incidencias" value={incidents.length} tone={incidents.some((i) => i.blocksPhase) ? "warn" : "neutral"} />
            <MetricCard label="Actualizado" value={phaseTx.lastUpdatedAt ? formatDateTime(phaseTx.lastUpdatedAt) : "-"} />
            <MetricCard label="Versión" value={`v${appliedVersion.versionNumber}`} />
          </div>
        </Section>

        {phaseTx.status === "PENDING_APPROVAL" && (
          <Section title="Aprobación pendiente" subtitle={`Grupo: ${getApprovalGroup(store.state, phaseTx.approvalGroupId)?.title || "-"}`} right={<Badge tone="draft">Pendiente</Badge>}>
            <div className="grid gap-3">
              <div className="text-sm text-zinc-600">Un miembro del grupo debe revisar y aprobar.</div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                <div className="text-xs font-semibold text-zinc-700 mb-2">Miembros</div>
                <div className="flex flex-wrap gap-2">{(getApprovalGroup(store.state, phaseTx.approvalGroupId)?.members || []).map((m) => <Badge key={m.id} tone="info">{m.name || m.email}</Badge>)}</div>
              </div>
              <Textarea label="Comentarios" rows={3} value={approvalComment} onChange={(e) => setApprovalComment(e.target.value)} placeholder="Qué se revisó o corrigió…" />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={reopen}>Reabrir</Button>
                <Button variant="approval" onClick={approve}>Aprobar</Button>
              </div>
            </div>
          </Section>
        )}

        {phaseTx.status === "DONE" && approval?.status === "APPROVED" && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-sm font-semibold text-emerald-700">Aprobada por {approval.approvedBy} · {formatDateTime(approval.approvedAt)}</div>
            {approval.comments && <div className="mt-1 text-sm text-emerald-600">{approval.comments}</div>}
          </div>
        )}

        <HelpAttachmentViewer attachments={deliverable?.helpAttachments} />

        <Card>
          <CardHeader title="Trabajo" right={
            <div className="inline-flex rounded-2xl border border-zinc-200 bg-white p-1">
              {[{ id: "reporte", label: "Reporte" }, { id: "incidencias", label: `NCRs (${incidents.length})` }, { id: "resumen", label: "Resumen" }].map((t) =>
                <button key={t.id} onClick={() => setTab(t.id)} className={`rounded-xl px-3 py-2 text-sm ${tab === t.id ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"}`}>{t.label}</button>
              )}
            </div>
          } />
          <CardBody>
            {toast && <div className={`mb-4 rounded-2xl border px-3 py-2 text-sm ${toast.startsWith("No se puede") ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{toast}</div>}

            {tab === "reporte" && (
              <div className="grid gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm text-zinc-600">Preguntas filtradas para {unit.platformCode}.</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="subtle" onClick={() => showToast("Guardado.")}>Guardar parcial</Button>
                    {phaseTx.status === "DONE" ? <Button variant="ghost" onClick={reopen}>Reabrir</Button>
                      : phaseTx.status === "PENDING_APPROVAL" ? <Badge tone="draft">Pend. aprobación</Badge>
                      : <Button onClick={finalize}>Finalizar</Button>}
                  </div>
                </div>

                {visibleQuestions.map((q) => (
                  <div key={q.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{q.label}</div>
                        {q.helpText && <div className="mt-1 text-xs text-zinc-500">{q.helpText}</div>}
                        <HelpAttachmentViewer attachments={q.helpAttachments} />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={q.isRequired ? "warn" : "neutral"}>{q.isRequired ? "Oblig." : "Opc."}</Badge>
                        {q.platformCode && <Badge tone="info">{q.platformCode}</Badge>}
                        <Button variant="subtle" onClick={() => { setIncidentForm({ scope: "FORM", questionId: q.id, severity: "MEDIUM", blocksPhase: false, description: "", evidenceName: "", approvalGroupId: "" }); setIncidentOpen(true); }}>NCR</Button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <AnswerField question={q} value={answers[q.id] || {}} store={store} unit={unit} phaseTxId={phaseTx.id} phaseCode={phaseDef.phaseCode}
                        onChange={(nextValue) => store.dispatch({ type: "SET_ANSWER", phaseTxId: phaseTx.id, questionId: q.id, value: nextValue })} />
                    </div>
                  </div>
                ))}

                {phaseDef.phaseType === "CALC" && <CalculationPanel special={special} />}
                {phaseDef.phaseType === "WORKFLOW" && <WorkflowPanel special={special} />}
              </div>
            )}

            {tab === "incidencias" && (
              <div className="grid gap-3">
                <div className="flex justify-end"><Button variant="subtle" onClick={() => { setIncidentForm({ scope: "FORM", questionId: "", severity: "MEDIUM", blocksPhase: false, description: "", evidenceName: "", approvalGroupId: "" }); setIncidentOpen(true); }}>Nueva NCR</Button></div>
                {incidents.length === 0 ? <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">Sin incidencias.</div> : incidents.map((inc) => (
                  <div key={inc.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">NCR · {inc.scope === "FORM" ? "Reporte" : "Fase"}</div>
                        <div className="mt-1 text-xs text-zinc-500">{formatDateTime(inc.createdAt)} · {inc.createdBy}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={inc.blocksPhase ? "warn" : "neutral"}>{inc.blocksPhase ? "Bloq." : "No bloq."}</Badge>
                        <Badge tone={inc.severity === "HIGH" ? "danger" : inc.severity === "MEDIUM" ? "warn" : "info"}>{inc.severity}</Badge>
                        {inc.approvalGroupId && <Badge tone="draft">{getApprovalGroup(store.state, inc.approvalGroupId)?.title}</Badge>}
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-zinc-700">{inc.description}</div>
                    {inc.evidenceName && <div className="mt-2 text-xs text-zinc-500">Adjunto: {inc.evidenceName}</div>}
                  </div>
                ))}
              </div>
            )}

            {tab === "resumen" && (
              <div className="grid gap-4 lg:grid-cols-2">
                <Section title="Validación" className="shadow-none border-zinc-200">
                  <div className="grid gap-2">
                    {validation.reasons.length === 0 ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">Lista para finalizar.</div>
                      : validation.reasons.map((r, i) => <div key={i} className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{r}</div>)}
                    {validation.warnings.map((w, i) => <div key={`w${i}`} className="rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-700">{w}</div>)}
                  </div>
                </Section>
                <Section title="Historial" className="shadow-none border-zinc-200">
                  <div className="grid gap-2 text-sm text-zinc-700">
                    <div className="rounded-2xl bg-zinc-50 p-3"><b>Creada:</b> {formatDateTime(phaseTx.createdAt)}</div>
                    <div className="rounded-2xl bg-zinc-50 p-3"><b>Iniciada:</b> {formatDateTime(phaseTx.startedAt)}</div>
                    <div className="rounded-2xl bg-zinc-50 p-3"><b>Finalizada:</b> {formatDateTime(phaseTx.completedAt)}</div>
                    <div className="rounded-2xl bg-zinc-50 p-3"><b>Versión:</b> v{appliedVersion.versionNumber}</div>
                    {approval && <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3"><b>Aprobación:</b> {approval.status} {approval.approvedBy ? `por ${approval.approvedBy}` : ""}</div>}
                  </div>
                </Section>
              </div>
            )}
          </CardBody>
        </Card>

        <Modal open={incidentOpen} title="Nueva NCR" onClose={() => setIncidentOpen(false)}
          footer={<><Button variant="subtle" onClick={() => setIncidentOpen(false)}>Cancelar</Button>
            <Button disabled={!incidentForm.description.trim()} onClick={() => {
              store.dispatch({ type: "ADD_INCIDENT", incident: {
                id: createId("inc"), phaseTxId: phaseTx.id, scope: incidentForm.scope,
                questionId: incidentForm.questionId || null, severity: incidentForm.severity,
                blocksPhase: incidentForm.blocksPhase, description: incidentForm.description.trim(),
                evidenceName: incidentForm.evidenceName.trim(), createdAt: now(),
                createdBy: store.state.operatorNumber || "-", status: "OPEN",
                approvalGroupId: incidentForm.approvalGroupId || null,
              }});
              setIncidentOpen(false); showToast("NCR registrada.");
            }}>Registrar</Button></>}>
          <div className="grid gap-3">
            <Select label="Ámbito" value={incidentForm.scope} onChange={(e) => setIncidentForm((p) => ({ ...p, scope: e.target.value }))}>
              <option value="FORM">Pregunta</option><option value="FASE">Fase</option>
            </Select>
            {incidentForm.scope === "FORM" && (
              <Select label="Pregunta" value={incidentForm.questionId} onChange={(e) => setIncidentForm((p) => ({ ...p, questionId: e.target.value }))}>
                <option value="">General</option>
                {visibleQuestions.map((q) => <option key={q.id} value={q.id}>{q.label}</option>)}
              </Select>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              <Select label="Severidad" value={incidentForm.severity} onChange={(e) => setIncidentForm((p) => ({ ...p, severity: e.target.value }))}>
                <option value="LOW">Baja</option><option value="MEDIUM">Media</option><option value="HIGH">Alta</option>
              </Select>
              <label className="flex items-end gap-2 rounded-2xl border border-zinc-200 px-3 py-2 text-sm"><input type="checkbox" checked={incidentForm.blocksPhase} onChange={(e) => setIncidentForm((p) => ({ ...p, blocksPhase: e.target.checked }))} /> Bloquea fase</label>
            </div>
            <Select label="Notificar a grupo (opcional)" value={incidentForm.approvalGroupId} onChange={(e) => setIncidentForm((p) => ({ ...p, approvalGroupId: e.target.value }))}>
              <option value="">Sin notificación</option>
              {store.state.approvalGroups.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
            </Select>
            <Textarea label="Descripción" rows={4} value={incidentForm.description} onChange={(e) => setIncidentForm((p) => ({ ...p, description: e.target.value }))} />
            <Input label="Adjunto (mock)" value={incidentForm.evidenceName} onChange={(e) => setIncidentForm((p) => ({ ...p, evidenceName: e.target.value }))} placeholder="archivo.ext" />
          </div>
        </Modal>
      </div>
    </OperarioGuard>
  );
}

// ── AnswerField ──
function AnswerField({ question, value, onChange, disabled = false, store, unit, phaseTxId, phaseCode }) {
  const current = value?.value ?? "";

  if (question.answerType === "TRACEABLE") return <TraceableField question={question} answer={value} onChange={onChange} disabled={disabled} store={store} unit={unit} phaseCode={phaseCode} />;
  if (question.answerType === "MASTER_TABLE") return <MasterTableField question={question} value={current} onChange={onChange} disabled={disabled} store={store} />;
  if (question.answerType === "TEXT") return <Input disabled={disabled} value={current} onChange={(e) => onChange({ value: e.target.value })} placeholder="Texto…" />;
  if (question.answerType === "NUMBER") return <Input disabled={disabled} type="number" value={current} onChange={(e) => onChange({ value: clampNumber(e.target.value) })} placeholder="0" />;

  if (question.answerType === "NUMBER_LIMITS") {
    const n = current === "" ? null : Number(current);
    const inRange = n == null ? null : n >= question.minValue && n <= question.maxValue;
    return (
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
          <span>Rango: {question.minValue} – {question.maxValue}</span>
          {n == null ? <Badge tone="neutral">Sin valor</Badge> : <Badge tone={inRange ? "ok" : "warn"}>{inRange ? "Dentro" : "Fuera"}</Badge>}
        </div>
        <Input disabled={disabled} type="number" value={current} onChange={(e) => onChange({ value: clampNumber(e.target.value) })} />
      </div>
    );
  }

  if (question.answerType === "OPTION") return <Select disabled={disabled} value={current} onChange={(e) => onChange({ value: e.target.value })}><option value="">Selecciona…</option>{(question.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>;
  if (question.answerType === "EXTERNAL_SELECT") { const opts = getExternalOptions(question.optionSource); return <Select disabled={disabled} value={current} onChange={(e) => onChange({ value: e.target.value })}><option value="">Selecciona…</option>{opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>; }

  if (question.answerType === "YES_NO") return (
    <div className="flex flex-wrap items-center gap-2">
      {["SI", "NO"].map((opt) => (
        <button key={opt} type="button" disabled={disabled} onClick={() => onChange({ value: opt })}
          className={`rounded-2xl border px-4 py-2 text-sm ${current === opt ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"}`}>
          {opt === "SI" ? "S\u00ed" : "No"}
        </button>
      ))}
    </div>
  );

  if (question.answerType === "FILE" || question.answerType === "IMAGE") return <Input disabled={disabled} value={current} onChange={(e) => onChange({ value: e.target.value })} placeholder={question.answerType === "FILE" ? "archivo.ext" : "imagen.png"} />;

  return <Input disabled placeholder="-" />;
}

// ── TraceableField ──
function TraceableField({ question, answer = {}, onChange, disabled, store, unit, phaseCode }) {
  const [gps, setGps] = useState([]);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (unit?.variantCode && phaseCode) fakeApi.getTraceableGpsForVariantPhase(unit.variantCode, phaseCode).then(setGps);
    else setGps([]);
  }, [unit?.variantCode, phaseCode]);

  const selectedGp = answer?.gpCode || "";
  const serial = answer?.serial || "";
  const noAplica = answer?.noAplica || false;
  const vr = answer?.validationResult || null;
  const pendingNcrs = (vr?.ncrs || []).filter((i) => !i.seen).length;
  const pendingPairings = (vr?.pairings || []).filter((i) => !i.seen).length;

  async function validate() {
    if (!serial.trim() || !selectedGp) return;
    setValidating(true);
    const result = await fakeApi.getTraceableValidation(selectedGp, serial.trim());
    onChange({ ...answer, validationResult: result, validatedAt: now() });
    setValidating(false);
  }

  function ackItem(collection, itemId) {
    if (!vr) return;
    onChange({ ...answer, validationResult: { ...vr, [collection]: vr[collection].map((i) => i.id === itemId ? { ...i, seen: true, seenAt: now() } : i) } });
  }

  if (disabled) return <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">Trazable · GP + Serial + Validación</div>;

  if (noAplica) return (
    <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-amber-800">NO APLICA — No corresponde a esta variante</div>
        <Button variant="ghost" onClick={() => onChange({ noAplica: false, gpCode: null, serial: "", validationResult: null })}>Deshacer</Button>
      </div>
    </div>
  );

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
        <Select label="GP" value={selectedGp} onChange={(e) => onChange({ ...answer, gpCode: e.target.value, serial: "", validationResult: null, validatedAt: null, noAplica: false })}>
          <option value="">Selecciona…</option>
          {gps.map((gp) => <option key={gp.gpCode} value={gp.gpCode}>{gp.name} ({gp.gpCode})</option>)}
        </Select>
        <Input label="Serial" value={serial} onChange={(e) => onChange({ ...answer, serial: e.target.value, validationResult: null, validatedAt: null })} placeholder="SER-ROD-777" disabled={!selectedGp} />
        <div className="flex items-end"><Button variant="subtle" disabled={!selectedGp || !serial.trim() || validating} onClick={validate}>{validating ? "Validando\u2026" : "Validar"}</Button></div>
        <div className="flex items-end">
          <button onClick={() => onChange({ noAplica: true, gpCode: null, serial: "", validationResult: null })}
            className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 transition">NO APLICA</button>
        </div>
      </div>

      {vr && (
        <div className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className={`rounded-2xl border p-3 ${vr.exists ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
              <div className="text-xs font-semibold text-zinc-700">Existencia</div>
              <div className="mt-1 text-sm font-medium">{vr.exists ? "Existe \u2713" : "No existe !"}</div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
              <div className="text-xs font-semibold text-zinc-700">NCRs</div>
              <div className="mt-1 text-sm font-medium">{vr.ncrs?.length || 0}</div>
              {pendingNcrs > 0 && <div className="mt-1 text-xs text-amber-700">Pend: {pendingNcrs}</div>}
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
              <div className="text-xs font-semibold text-zinc-700">Emparejam.</div>
              <div className="mt-1 text-sm font-medium">{vr.pairings?.length || 0}</div>
              {pendingPairings > 0 && <div className="mt-1 text-xs text-amber-700">Pend: {pendingPairings}</div>}
            </div>
          </div>

          {(vr.ncrs || []).length > 0 && <ValidationCollection title="NCRs" items={vr.ncrs} itemLabel={(i) => i.code || i.id} itemDesc={(i) => i.description} itemComment={(i) => i.comment} onAck={(id) => ackItem("ncrs", id)} />}
          {(vr.pairings || []).length > 0 && <ValidationCollection title="Emparejamientos" items={vr.pairings} itemLabel={(i) => i.identifier || i.id} itemDesc={(i) => i.description} itemComment={(i) => `${i.ncrCode ? `NCR ${i.ncrCode} \u00b7 ` : ""}${i.comment || ""}`} onAck={(id) => ackItem("pairings", id)} />}

          {vr.exists && pendingNcrs === 0 && pendingPairings === 0 && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">Trazable revisado completamente.</div>}
        </div>
      )}
    </div>
  );
}

function MasterTableField({ question, value, onChange, disabled, store }) {
  const refValue = getMasterTableValue(store.state, question.masterTableTopic, question.masterTableParameter);
  return (
    <div className="grid gap-3">
      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-violet-700">{question.masterTableTopic} · {question.masterTableParameter}</div>
            <div className="mt-1 text-lg font-semibold text-violet-800">Referencia: {refValue || "Sin dato"}</div>
          </div>
          <Badge tone="draft">Tabla Maestra</Badge>
        </div>
      </div>
      <Input label="Valor obtenido" disabled={disabled} value={value} onChange={(e) => onChange({ value: e.target.value })} placeholder={`Ref: ${refValue || "-"}`} />
    </div>
  );
}

function ValidationCollection({ title, items, itemLabel, itemDesc, itemComment, onAck }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
      <div className="text-xs font-semibold text-zinc-700">{title}</div>
      <div className="mt-2 grid gap-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-zinc-200 bg-white p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium">{itemLabel(item)}</div>
                <div className="mt-1 text-sm text-zinc-700">{itemDesc(item)}</div>
                {itemComment(item) && <div className="mt-1 text-xs text-zinc-500">{itemComment(item)}</div>}
              </div>
              <div className="flex items-center gap-2">
                {item.seen ? <Badge tone="ok">✓ Visto</Badge> : <Badge tone="warn">Pendiente</Badge>}
                <Button variant={item.seen ? "ghost" : "subtle"} disabled={item.seen} onClick={() => onAck(item.id)}>{item.seen ? "OK" : "Visto"}</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalculationPanel({ special }) {
  return (
    <Section title="Cálculo de casquillos (visor)" subtitle="Datos de AtlantIA / Excel">
      {special?.noData ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">No hay datos de casquillos para esta OT en AtlantIA.</div>
        : !special?.ready ? <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">Cargando…</div>
        : (
          <div className="grid gap-4">
            <div className="text-xs text-zinc-500">Fuente: {special.source}</div>
            <div className="grid gap-4 md:grid-cols-4">
              <MetricCard label="Holgura actual" value={special.currentClearance} />
              <MetricCard label="Calce recomendado" value={special.recommendedShim} />
              <MetricCard label="Desviación" value={special.deviation} tone={special.isAccepted ? "ok" : "warn"} subvalue={special.isAccepted ? "Dentro" : "Fuera"} />
              <MetricCard label="Resultado" value={special.isAccepted ? "Aceptado" : "Revisar"} tone={special.isAccepted ? "ok" : "warn"} />
            </div>
          </div>
        )}
    </Section>
  );
}

function WorkflowPanel({ special }) {
  return (
    <Section title="Workflow" subtitle="Lógica sobre resultado final">
      {!special?.ready ? <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">Completa el resultado.</div>
        : special.blocksPhase ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Resultado <b>No Conforme</b>. Documentar no conformidad.</div>
        : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">Resultado <b>Conforme</b>.</div>}
    </Section>
  );
}
