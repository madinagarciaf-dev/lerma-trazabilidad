import React, { useEffect, useMemo, useReducer, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  useNavigate,
  useParams,
  Navigate,
} from "react-router-dom";

/**
 * PREVIEW EJECUTABLE EN CHATGPT (un solo archivo)
 * - React Router + estado en memoria
 * - Tailwind puro
 * - Sin backend real: datos mock + fakeApi
 *
 * ASUNCIÓN MOCK (solo para completar el preview):
 * - “Modelos” = familias de producto (G3X/G4X/G5X) que vienen de Datos maestros industriales.
 * - Cada modelo comparte GP (A9B) en este mock.
 * - Elementos trazables vienen del maestro industrial por fase (no los define el Editor).
 */

// ------------------------------
// UI kit mínimo (estilo industrial / Apple-like)
// ------------------------------
function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-zinc-200 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] ${className}`}
    >
      {children}
    </div>
  );
}

function Section({ title, subtitle, right, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-zinc-200 bg-white ${className}`}>
      <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-4">
        <div>
          <div className="text-sm font-semibold tracking-tight">{title}</div>
          {subtitle ? (
            <div className="mt-1 text-xs text-zinc-500">{subtitle}</div>
          ) : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function CardHeader({ title, subtitle, right }) {
  return (
    <div className="flex items-start justify-between gap-4 p-5">
      <div>
        <div className="text-base font-semibold tracking-tight">{title}</div>
        {subtitle ? (
          <div className="mt-1 text-sm text-zinc-500">{subtitle}</div>
        ) : null}
      </div>
      {right ? <div>{right}</div> : null}
    </div>
  );
}

function CardBody({ children, className = "" }) {
  return <div className={`px-5 pb-5 ${className}`}>{children}</div>;
}

function Button({ children, variant = "primary", className = "", ...props }) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-sm font-medium transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed";
  const styles = {
    primary: "bg-zinc-900 text-white hover:bg-zinc-800",
    ghost: "bg-transparent text-zinc-900 hover:bg-zinc-100",
    subtle: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
    danger: "bg-rose-600 text-white hover:bg-rose-500",
  };
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

function IconButton({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
    >
      <span className="text-xs font-semibold text-zinc-500">i</span>
      {label}
    </button>
  );
}

function Badge({ children, tone = "neutral" }) {
  const tones = {
    neutral: "bg-zinc-100 text-zinc-700 border-zinc-200",
    ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warn: "bg-amber-50 text-amber-700 border-amber-200",
    info: "bg-sky-50 text-sky-700 border-sky-200",
    draft: "bg-violet-50 text-violet-700 border-violet-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function Input({ label, hint, className = "", ...props }) {
  return (
    <label className="block">
      {label ? (
        <div className="mb-1 text-xs font-medium text-zinc-700">{label}</div>
      ) : null}
      <input
        className={`w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-zinc-400 ${className}`}
        {...props}
      />
      {hint ? <div className="mt-1 text-xs text-zinc-500">{hint}</div> : null}
    </label>
  );
}

function Select({ label, children, className = "", ...props }) {
  return (
    <label className="block">
      {label ? (
        <div className="mb-1 text-xs font-medium text-zinc-700">{label}</div>
      ) : null}
      <select
        className={`w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

function Textarea({ label, className = "", ...props }) {
  return (
    <label className="block">
      {label ? (
        <div className="mb-1 text-xs font-medium text-zinc-700">{label}</div>
      ) : null}
      <textarea
        className={`w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 ${className}`}
        {...props}
      />
    </label>
  );
}

function Divider() {
  return <div className="my-4 h-px bg-zinc-200" />;
}

function Modal({ open, title, children, onClose, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center">
      <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
        <div className="flex items-center justify-between p-5">
          <div className="text-sm font-semibold">{title}</div>
          <button
            className="rounded-lg px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
        <div className="px-5 pb-5">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-zinc-200 p-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PillNav({ items }) {
  return (
    <div className="inline-flex items-center rounded-2xl border border-zinc-200 bg-white p-1">
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          className={({ isActive }) =>
            `rounded-xl px-3 py-2 text-sm ${
              isActive
                ? "bg-zinc-900 text-white"
                : "text-zinc-700 hover:bg-zinc-100"
            }`
          }
          end={it.end}
        >
          {it.label}
        </NavLink>
      ))}
    </div>
  );
}

// ------------------------------
// Datos mock coherentes
// ------------------------------
const MOCK = {
  weeks: [
    { id: "2025-W50", year: 2025, week: 50 },
    { id: "2025-W51", year: 2025, week: 51 },
  ],

  // Datos maestros del Libro
  bookPhaseTypes: [
    { id: "pt_form", code: "FORMULARIO", name: "Formulario" },
    { id: "pt_calc", code: "CALCULO_CASQUILLO", name: "Cálculo de casquillo" },
    {
      id: "pt_bpm",
      code: "FORMULARIO_BPM",
      name: "Formulario con proceso de negocio",
    },
  ],
  bookPhases: [
    {
      id: "bp_01",
      code: "BP_RECEPCION",
      name: "Recepción de conjunto",
      typeId: "pt_form",
      displayOrder: 1,
    },
    {
      id: "bp_02",
      code: "BP_MONTAJE",
      name: "Montaje principal",
      typeId: "pt_form",
      displayOrder: 2,
    },
    {
      id: "bp_03",
      code: "BP_CASQUILLO",
      name: "Cálculo casquillo",
      typeId: "pt_calc",
      displayOrder: 3,
    },
    {
      id: "bp_04",
      code: "BP_APROBACION",
      name: "Aprobación / bloqueo",
      typeId: "pt_bpm",
      displayOrder: 4,
    },
  ],

  // Datos maestros industriales (Modelos + estructura por fase)
  industrialModels: [
    { id: "mdl_g5x", code: "G5X", name: "G5X" },
    { id: "mdl_g4x", code: "G4X", name: "G4X" },
    { id: "mdl_g3x", code: "G3X", name: "G3X" },
  ],

  // MAPEO (MAPEO): conecta Fase SAP / Fase Planificación / Fase Libro
  // + incluye Elementos trazables (maestro) de esa fase
  phaseMappings: [
    {
      id: "map_01",
      modelCode: "G5X",
      gpCode: "A9B",
      displayOrder: 1,
      sapPhaseRef: "A9B000001", // ASUNCIÓN MOCK
      sapPhaseCode: "SAP_P01",
      sapPhaseName: "Recepción",
      planningPhaseKey: "PLAN_COL_01",
      planningPhaseName: "Recepción (Plan)",
      bookPhaseId: "bp_01",
      status: "VALIDATED",
      notes: "OK",
      traceableElements: [
        { code: "RODAMIENTO", name: "Rodamiento", required: true },
      ],
    },
    {
      id: "map_02",
      modelCode: "G5X",
      gpCode: "A9B",
      displayOrder: 2,
      sapPhaseRef: "A9B000002",
      sapPhaseCode: "SAP_P02",
      sapPhaseName: "Montaje principal",
      planningPhaseKey: "PLAN_COL_02",
      planningPhaseName: "Montaje (Plan)",
      bookPhaseId: "bp_02",
      status: "VALIDATED",
      notes: "OK",
      traceableElements: [
        { code: "SELLO", name: "Sello", required: false },
        { code: "EJE", name: "Eje", required: false },
      ],
    },
    {
      id: "map_03",
      modelCode: "G5X",
      gpCode: "A9B",
      displayOrder: 3,
      sapPhaseRef: "A9B000003",
      sapPhaseCode: "SAP_P03",
      sapPhaseName: "Cálculo casquillo",
      planningPhaseKey: "PLAN_COL_03",
      planningPhaseName: "Casquillo (Plan)",
      bookPhaseId: null,
      status: "PENDING",
      notes: "Correspondencia no cerrada",
      traceableElements: [],
    },
    {
      id: "map_04",
      modelCode: "G5X",
      gpCode: "A9B",
      displayOrder: 4,
      sapPhaseRef: "A9B000004",
      sapPhaseCode: "SAP_P04",
      sapPhaseName: "Aprobación/Bloqueo",
      planningPhaseKey: "PLAN_COL_04",
      planningPhaseName: "Aprobación (Plan)",
      bookPhaseId: "bp_04",
      status: "VALIDATED",
      notes: "OK",
      traceableElements: [],
    },

    // Para que el filtro por modelo sea demostrable, clonamos (mock) el set para G4X/G3X
    {
      id: "map_11",
      modelCode: "G4X",
      gpCode: "A9B",
      displayOrder: 1,
      sapPhaseRef: "A9B100001",
      sapPhaseCode: "SAP_P01",
      sapPhaseName: "Recepción",
      planningPhaseKey: "PLAN_COL_01",
      planningPhaseName: "Recepción (Plan)",
      bookPhaseId: "bp_01",
      status: "VALIDATED",
      notes: "OK",
      traceableElements: [
        { code: "RODAMIENTO", name: "Rodamiento", required: true },
      ],
    },
    {
      id: "map_12",
      modelCode: "G4X",
      gpCode: "A9B",
      displayOrder: 2,
      sapPhaseRef: "A9B100002",
      sapPhaseCode: "SAP_P02",
      sapPhaseName: "Montaje principal",
      planningPhaseKey: "PLAN_COL_02",
      planningPhaseName: "Montaje (Plan)",
      bookPhaseId: "bp_02",
      status: "VALIDATED",
      notes: "OK",
      traceableElements: [{ code: "SELLO", name: "Sello", required: false }],
    },
    {
      id: "map_21",
      modelCode: "G3X",
      gpCode: "A9B",
      displayOrder: 1,
      sapPhaseRef: "A9B200001",
      sapPhaseCode: "SAP_P01",
      sapPhaseName: "Recepción",
      planningPhaseKey: "PLAN_COL_01",
      planningPhaseName: "Recepción (Plan)",
      bookPhaseId: "bp_01",
      status: "VALIDATED",
      notes: "OK",
      traceableElements: [
        { code: "RODAMIENTO", name: "Rodamiento", required: true },
      ],
    },
  ],

  // Entregables (editables por Editor)
  deliverables: [
    {
      id: "dlv_01",
      code: "DLV_RECEPCION",
      name: "Checklist recepción",
      phaseTypeId: "pt_form",
      currentDraftVersionId: "dv_01_d1",
      currentPublishedVersionId: "dv_01_p1",
      versions: [
        {
          id: "dv_01_p1",
          deliverableId: "dlv_01",
          versionNumber: 1,
          status: "PUBLISHED",
          title: "Checklist recepción v1",
          description: "Versión estable para producción.",
          owner: "Editor",
          createdAt: "2025-11-20",
          questions: [
            {
              id: "q_r_01",
              order: 1,
              label: "Inspección visual realizada",
              helpText:
                "Confirma que se ha realizado inspección visual del conjunto.",
              isRequired: true,
              answerType: "OPTION",
              options: [
                { value: "OK", label: "OK" },
                { value: "NOK", label: "No OK" },
              ],
            },
            {
              id: "q_r_02",
              order: 2,
              label: "Par de apriete (Nm)",
              helpText: "Registrar el valor medido.",
              isRequired: true,
              answerType: "NUMBER",
            },
            {
              id: "q_r_04",
              order: 3,
              label: "Foto / evidencia",
              helpText: "Adjunta una imagen si aplica.",
              isRequired: false,
              answerType: "IMAGE",
            },
          ],
        },
        {
          id: "dv_01_d1",
          deliverableId: "dlv_01",
          versionNumber: 2,
          status: "DRAFT",
          title: "Checklist recepción v2",
          description: "Ajuste de tolerancias y mejoras de texto.",
          owner: "Editor",
          createdAt: "2025-12-10",
          questions: [
            {
              id: "q_r_01_d",
              order: 1,
              label: "Inspección visual realizada",
              helpText: "Confirma inspección visual.",
              isRequired: true,
              answerType: "OPTION",
              options: [
                { value: "OK", label: "OK" },
                { value: "NOK", label: "No OK" },
              ],
            },
            {
              id: "q_r_02_d",
              order: 2,
              label: "Par de apriete (Nm)",
              helpText: "Registrar valor dentro del rango permitido.",
              isRequired: true,
              answerType: "NUMBER_LIMITS",
              minValue: 115,
              maxValue: 125,
            },
          ],
        },
      ],
    },
    {
      id: "dlv_02",
      code: "DLV_MONTAJE",
      name: "Checklist montaje",
      phaseTypeId: "pt_form",
      currentDraftVersionId: "dv_02_d1",
      currentPublishedVersionId: "dv_02_p1",
      versions: [
        {
          id: "dv_02_p1",
          deliverableId: "dlv_02",
          versionNumber: 1,
          status: "PUBLISHED",
          title: "Checklist montaje v1",
          description: "Versión base.",
          owner: "Editor",
          createdAt: "2025-11-25",
          questions: [
            {
              id: "q_m_01",
              order: 1,
              label: "Lubricación aplicada",
              helpText: "Confirmar lubricación según procedimiento.",
              isRequired: true,
              answerType: "OPTION",
              options: [
                { value: "SI", label: "Sí" },
                { value: "NO", label: "No" },
              ],
            },
            {
              id: "q_m_02",
              order: 2,
              label: "Observaciones",
              helpText: "Texto libre.",
              isRequired: false,
              answerType: "TEXT",
            },
            {
              id: "q_m_03",
              order: 3,
              label: "Adjunto",
              helpText: "Archivo si aplica.",
              isRequired: false,
              answerType: "FILE",
            },
          ],
        },
        {
          id: "dv_02_d1",
          deliverableId: "dlv_02",
          versionNumber: 2,
          status: "DRAFT",
          title: "Checklist montaje v2",
          description: "Limpieza de campos.",
          owner: "Editor",
          createdAt: "2025-12-12",
          questions: [
            {
              id: "q_m_01_d",
              order: 1,
              label: "Lubricación aplicada",
              helpText: "Confirmar lubricación.",
              isRequired: true,
              answerType: "OPTION",
              options: [
                { value: "SI", label: "Sí" },
                { value: "NO", label: "No" },
              ],
            },
          ],
        },
      ],
    },
  ],

  // Asignaciones (Fase Libro -> Entregable)
  assignments: [
    { id: "as_01", bookPhaseId: "bp_01", deliverableId: "dlv_01", isActive: true },
    { id: "as_02", bookPhaseId: "bp_02", deliverableId: "dlv_02", isActive: true },
  ],

  // Planificación operativa
  plannedUnits: [
    {
      id: "pu_50_01",
      year: 2025,
      week: 50,
      ns: "108001",
      gpCode: "A9B",
      modelCode: "G5X",
    },
    {
      id: "pu_50_02",
      year: 2025,
      week: 50,
      ns: "108002",
      gpCode: "A9B",
      modelCode: "G5X",
    },
    {
      id: "pu_51_01",
      year: 2025,
      week: 51,
      ns: "108994",
      gpCode: "A9B",
      modelCode: "G5X",
    },
    {
      id: "pu_51_02",
      year: 2025,
      week: 51,
      ns: "109887",
      gpCode: "A9B",
      modelCode: "G4X",
    },
  ],

  // Fases transaccionales ya “generadas” (simulando el agente)
  traceabilityPhasesTx: [
    {
      id: "tx_51_1001_01",
      plannedUnitId: "pu_51_01",
      planningPhaseKey: "PLAN_COL_01",
      of: "OF-51001-A",
      bookPhaseId: "bp_01",
      status: "IN_PROGRESS",
      appliedDeliverableVersionId: "dv_01_p1",
      incidenceCount: 1,
    },
    {
      id: "tx_51_1001_02",
      plannedUnitId: "pu_51_01",
      planningPhaseKey: "PLAN_COL_02",
      of: "OF-51001-B",
      bookPhaseId: "bp_02",
      status: "NOT_STARTED",
      appliedDeliverableVersionId: "dv_02_p1",
      incidenceCount: 0,
    },
    {
      id: "tx_51_1001_03",
      plannedUnitId: "pu_51_01",
      planningPhaseKey: "PLAN_COL_03",
      of: "OF-51001-C",
      bookPhaseId: null,
      status: "BLOCKED",
      appliedDeliverableVersionId: null,
      incidenceCount: 0,
    },
    {
      id: "tx_51_1001_04",
      plannedUnitId: "pu_51_01",
      planningPhaseKey: "PLAN_COL_04",
      of: "OF-51001-D",
      bookPhaseId: "bp_04",
      status: "NOT_STARTED",
      appliedDeliverableVersionId: null,
      incidenceCount: 0,
    },

    {
      id: "tx_51_1002_01",
      plannedUnitId: "pu_51_02",
      planningPhaseKey: "PLAN_COL_01",
      of: "OF-51002-A",
      bookPhaseId: "bp_01",
      status: "NOT_STARTED",
      appliedDeliverableVersionId: "dv_01_p1",
      incidenceCount: 0,
    },
    {
      id: "tx_51_1002_02",
      plannedUnitId: "pu_51_02",
      planningPhaseKey: "PLAN_COL_02",
      of: "OF-51002-B",
      bookPhaseId: "bp_02",
      status: "NOT_STARTED",
      appliedDeliverableVersionId: "dv_02_p1",
      incidenceCount: 0,
    },

    {
      id: "tx_50_0991_01",
      plannedUnitId: "pu_50_01",
      planningPhaseKey: "PLAN_COL_01",
      of: "OF-50091-A",
      bookPhaseId: "bp_01",
      status: "DONE",
      appliedDeliverableVersionId: "dv_01_p1",
      incidenceCount: 0,
    },
    {
      id: "tx_50_0991_02",
      plannedUnitId: "pu_50_01",
      planningPhaseKey: "PLAN_COL_02",
      of: "OF-50091-B",
      bookPhaseId: "bp_02",
      status: "DONE",
      appliedDeliverableVersionId: "dv_02_p1",
      incidenceCount: 0,
    },

    {
      id: "tx_50_0992_01",
      plannedUnitId: "pu_50_02",
      planningPhaseKey: "PLAN_COL_01",
      of: "OF-50092-A",
      bookPhaseId: "bp_01",
      status: "NOT_STARTED",
      appliedDeliverableVersionId: "dv_01_p1",
      incidenceCount: 0,
    },
  ],

  // Respuestas guardadas
  answers: {
    tx_51_1001_01: {
      q_r_01: { valueOption: "OK" },
      q_r_02: { valueNumber: 120 },
      q_r_04: { evidenceName: "foto_recepcion_1001.png" },
    },
  },

  // Reporte de trazables (por fase) — maestro, no editor
  traceableReports: {
    tx_51_1001_01: {
      RODAMIENTO: {
        serial: "SER-ROD-777",
        validatedAt: "2025-12-16T08:00:00Z",
      },
    },
  },

  incidents: [
    {
      id: "inc_01",
      phaseTxId: "tx_51_1001_01",
      scope: "FORM",
      questionId: "q_r_02",
      traceableCode: null,
      description: "Lectura inicial fuera de rango, se repite medición.",
      status: "OPEN",
      evidenceNames: ["medicion_1.txt"],
      createdAt: "2025-12-16T07:55:00Z",
    },
  ],

  // NC/observaciones previas por serial + GP
  ncObservations: [
    {
      serial: "SER-ROD-777",
      gpCode: "A9B",
      type: "NC",
      text: "NC previa: microfisuras detectadas en lote 2025-10.",
      createdAt: "2025-10-12",
    },
    {
      serial: "SER-ROD-777",
      gpCode: "A9B",
      type: "OBS",
      text: "Observación: verificar lubricación antes de montaje.",
      createdAt: "2025-10-14",
    },
  ],
};

// ------------------------------
// fakeApi (sin backend real)
// ------------------------------
const fakeApi = {
  delay(ms = 220) {
    return new Promise((r) => setTimeout(r, ms));
  },

  async getWeeks() {
    await this.delay();
    return [...MOCK.weeks];
  },

  async getPlannedUnitsByWeek(weekId) {
    await this.delay();
    const wk = MOCK.weeks.find((w) => w.id === weekId);
    return MOCK.plannedUnits.filter((u) => u.year === wk.year && u.week === wk.week);
  },

  async getPhasesTxForUnit(plannedUnitId) {
    await this.delay();
    return MOCK.traceabilityPhasesTx.filter((p) => p.plannedUnitId === plannedUnitId);
  },

  async getNcObservations(gpCode, serial) {
    // INTEGRACIÓN REAL: consulta de NC/Observaciones por serial y contexto.
    await this.delay(300);
    return MOCK.ncObservations.filter((x) => x.gpCode === gpCode && x.serial === serial);
  },
};

// ------------------------------
// Estado (en memoria) + reducer
// ------------------------------
const initialState = {
  operatorNumber: "",
  selectedWeekId: "2025-W51",

  // Operario
  answersByPhaseTxId: { ...MOCK.answers },
  traceablesByPhaseTxId: { ...MOCK.traceableReports },
  incidents: [...MOCK.incidents],

  // Editor
  phaseMappings: JSON.parse(JSON.stringify(MOCK.phaseMappings)),
  deliverables: JSON.parse(JSON.stringify(MOCK.deliverables)),
  assignments: JSON.parse(JSON.stringify(MOCK.assignments)),
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_OPERATOR":
      return { ...state, operatorNumber: action.value };

    case "SET_WEEK":
      return { ...state, selectedWeekId: action.value };

    case "SET_ANSWER": {
      const { phaseTxId, questionId, patch } = action;
      const prev = state.answersByPhaseTxId[phaseTxId] || {};
      return {
        ...state,
        answersByPhaseTxId: {
          ...state.answersByPhaseTxId,
          [phaseTxId]: {
            ...prev,
            [questionId]: { ...(prev[questionId] || {}), ...patch },
          },
        },
      };
    }

    case "SET_TRACEABLE": {
      const { phaseTxId, traceableCode, patch } = action;
      const prev = state.traceablesByPhaseTxId[phaseTxId] || {};
      return {
        ...state,
        traceablesByPhaseTxId: {
          ...state.traceablesByPhaseTxId,
          [phaseTxId]: {
            ...prev,
            [traceableCode]: { ...(prev[traceableCode] || {}), ...patch },
          },
        },
      };
    }

    case "ADD_INCIDENT":
      return { ...state, incidents: [action.incident, ...state.incidents] };

    case "UPDATE_DRAFT_QUESTIONS": {
      const { deliverableId, draftVersionId, questions } = action;
      const deliverables = state.deliverables.map((d) => {
        if (d.id !== deliverableId) return d;
        return {
          ...d,
          versions: d.versions.map((v) =>
            v.id === draftVersionId ? { ...v, questions } : v
          ),
        };
      });
      return { ...state, deliverables };
    }

    case "PUBLISH_DELIVERABLE": {
      const { deliverableId } = action;
      const deliverables = state.deliverables.map((d) => {
        if (d.id !== deliverableId) return d;
        const draft = d.versions.find((v) => v.id === d.currentDraftVersionId);
        if (!draft) return d;
        const maxVersion = Math.max(...d.versions.map((v) => v.versionNumber));
        const newPubId = `${d.id}_p${maxVersion + 1}`;
        const newPublished = {
          ...draft,
          id: newPubId,
          versionNumber: maxVersion + 1,
          status: "PUBLISHED",
          createdAt: new Date().toISOString().slice(0, 10),
          questions: JSON.parse(JSON.stringify(draft.questions)),
        };
        return {
          ...d,
          currentPublishedVersionId: newPubId,
          versions: [newPublished, ...d.versions],
        };
      });
      return { ...state, deliverables };
    }

    case "UPDATE_PHASE_MAPPING": {
      const { id, patch } = action;
      return {
        ...state,
        phaseMappings: (state.phaseMappings || []).map((m) =>
          m.id === id ? { ...m, ...patch } : m
        ),
      };
    }

    case "SET_ASSIGNMENT": {
      const { bookPhaseId, deliverableId } = action;
      const existing = state.assignments.find(
        (a) => a.bookPhaseId === bookPhaseId && a.isActive
      );
      if (existing) {
        return {
          ...state,
          assignments: state.assignments.map((a) =>
            a.id === existing.id ? { ...a, deliverableId } : a
          ),
        };
      }
      return {
        ...state,
        assignments: [
          { id: `as_${Date.now()}`, bookPhaseId, deliverableId, isActive: true },
          ...state.assignments,
        ],
      };
    }

    default:
      return state;
  }
}

function useStore() {
  const [state, dispatch] = useReducer(reducer, initialState);
  return { state, dispatch };
}

// ------------------------------
// Helpers
// ------------------------------
function toneForPhaseStatus(status) {
  if (status === "DONE") return "ok";
  if (status === "IN_PROGRESS") return "info";
  if (status === "BLOCKED") return "warn";
  if (status === "OBSOLETE") return "neutral";
  return "neutral";
}

function labelForPhaseStatus(status) {
  const map = {
    NOT_STARTED: "No iniciada",
    IN_PROGRESS: "En curso",
    DONE: "Finalizada",
    BLOCKED: "Bloqueada",
    OBSOLETE: "Obsoleta",
  };
  return map[status] || status;
}

function answerTypeLabel(t) {
  const map = {
    TEXT: "Texto",
    NUMBER: "Numérico",
    NUMBER_LIMITS: "Numérico con tolerancias (mín/máx)",
    OPTION: "Opción",
    FILE: "Archivo",
    IMAGE: "Imagen",
  };
  return map[t] || t;
}

function getBookPhaseTypeName(bookPhaseId) {
  const bp = MOCK.bookPhases.find((b) => b.id === bookPhaseId);
  if (!bp) return "-";
  return MOCK.bookPhaseTypes.find((t) => t.id === bp.typeId)?.name || "-";
}

function getDeliverableById(deliverables, id) {
  return deliverables.find((d) => d.id === id) || null;
}

function getPublishedVersion(deliverable) {
  if (!deliverable?.currentPublishedVersionId) return null;
  return deliverable.versions.find((v) => v.id === deliverable.currentPublishedVersionId);
}

function getDraftVersion(deliverable) {
  if (!deliverable?.currentDraftVersionId) return null;
  return deliverable.versions.find((v) => v.id === deliverable.currentDraftVersionId);
}

function getAssignmentForBookPhase(assignments, bookPhaseId) {
  return assignments.find((a) => a.bookPhaseId === bookPhaseId && a.isActive) || null;
}

function findMappingForContext(phaseMappings, { modelCode, gpCode, planningPhaseKey }) {
  const list = phaseMappings || [];
  return (
    list.find(
      (m) =>
        m.modelCode === modelCode &&
        m.gpCode === gpCode &&
        m.planningPhaseKey === planningPhaseKey
    ) ||
    // fallback si el modelo no está (por si hay datos legacy)
    list.find((m) => m.gpCode === gpCode && m.planningPhaseKey === planningPhaseKey) ||
    null
  );
}

// ------------------------------
// Mini "tests" runtime (sin framework): ayudan a detectar regresiones del mock
// ------------------------------
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runSelfTests() {
  // 1) La semana por defecto existe
  assert(
    MOCK.weeks.some((w) => w.id === initialState.selectedWeekId),
    `SelfTest: selectedWeekId (${initialState.selectedWeekId}) no existe en MOCK.weeks`
  );

  // 2) La semana por defecto tiene 2 NS concretos (requisito del usuario)
  const wk = MOCK.weeks.find((w) => w.id === initialState.selectedWeekId);
  const units = MOCK.plannedUnits.filter((u) => u.year === wk.year && u.week === wk.week);
  const ns = units.map((u) => u.ns).sort();
  assert(
    ns.length === 2,
    `SelfTest: se esperaban 2 NS en ${initialState.selectedWeekId} y hay ${ns.length}`
  );
  assert(
    ns.includes("108994") && ns.includes("109887"),
    `SelfTest: se esperaban NS 108994 y 109887 en ${initialState.selectedWeekId}. Encontrados: ${ns.join(", ")}`
  );

  // 3) El entregable v2 borrador tiene NUMBER_LIMITS con min/max
  const dlv1 = MOCK.deliverables.find((d) => d.id === "dlv_01");
  const dv = dlv1?.versions?.find((v) => v.id === "dv_01_d1");
  const q = dv?.questions?.find((qq) => qq.answerType === "NUMBER_LIMITS");
  assert(
    q && typeof q.minValue === "number" && typeof q.maxValue === "number",
    "SelfTest: falta pregunta NUMBER_LIMITS con min/max en dv_01_d1"
  );

  // 4) Para el modelo G5X, existen opciones SAP/Planificación (mock)
  const g5xMaps = MOCK.phaseMappings.filter((m) => m.modelCode === "G5X");
  assert(g5xMaps.length >= 1, "SelfTest: no hay mapeos para G5X");
  assert(
    g5xMaps.some((m) => !!m.sapPhaseRef) && g5xMaps.some((m) => !!m.planningPhaseKey),
    "SelfTest: faltan refs SAP o claves de planificación en mapeos G5X"
  );

  // eslint-disable-next-line no-console
  console.log("SelfTests OK");
}

// ------------------------------
// App / Layout
// ------------------------------
export default function App() {
  const store = useStore();

  useEffect(() => {
    try {
      runSelfTests();
    } catch (e) {
      console.error(e);
    }
  }, []);

  return (
    <BrowserRouter>
      <Shell store={store} />
    </BrowserRouter>
  );
}


function Shell({ store }) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <TopBar />
      <div className="mx-auto max-w-6xl px-4 pb-12 pt-6">
        <Routes>
          <Route path="/" element={<Landing />} />

          {/* Editor */}
          <Route path="/editor" element={<Navigate to="/editor/modelos" replace />} />
          <Route path="/editor/modelos" element={<EditorModels store={store} />} />
          <Route path="/editor/fases" element={<EditorPhases store={store} />} />
          <Route path="/editor/entregables" element={<EditorDeliverables store={store} />} />
          <Route
            path="/editor/entregables/:deliverableId"
            element={<EditorDeliverableForm store={store} />}
          />
          <Route path="/editor/asignacion" element={<EditorAssignment store={store} />} />

          {/* Operario */}
          <Route path="/operario" element={<Navigate to="/operario/login" replace />} />
          <Route path="/operario/login" element={<OperarioLogin store={store} />} />
          <Route path="/operario/semana" element={<OperarioWeekSelect store={store} />} />
          <Route path="/operario/unidades" element={<OperarioUnits store={store} />} />
          <Route path="/operario/ns/:plannedUnitId" element={<OperarioCover store={store} />} />
          <Route
            path="/operario/ns/:plannedUnitId/fase/:phaseTxId"
            element={<OperarioPhaseDetail store={store} />}
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <div className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-zinc-900" />
          <div>
            <div className="text-sm font-semibold tracking-tight">
              Lerma · Libro de Trazabilidad
            </div>
            <div className="text-xs text-zinc-500">Preview navegable (datos mock)</div>
          </div>
        </div>
        <div className="hidden sm:block">
          <PillNav
            items={[
              { to: "/", label: "Inicio", end: true },
              { to: "/editor/modelos", label: "Editor" },
              { to: "/operario/login", label: "Operario" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function Landing() {
  const nav = useNavigate();
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader
          title="Preview ejecutable"
          subtitle="Editor (Modelos/Fases/Entregables/Asignaciones) y Operario (reportar por NS). Sin backend real."
          right={<Badge tone="info">Mock</Badge>}
        />
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button onClick={() => nav("/editor/modelos")} className="justify-between">
              Ir a Editor <span className="opacity-80">→</span>
            </Button>
            <Button
              variant="subtle"
              onClick={() => nav("/operario/login")}
              className="justify-between"
            >
              Ir a Operario <span className="opacity-80">→</span>
            </Button>
          </div>
          <Divider />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-sm font-semibold">Editor</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-600">
                <li>Modelos (solo lectura) y sus fases.</li>
                <li>
                  Fases filtrables por modelo con relación SAP/Planificación editable, entregable
                  asociado editable y trazables del maestro.
                </li>
                <li>
                  Entregables: vista + filtros + detalles expandibles + editor y previsualización.
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-sm font-semibold">Operario</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-600">
                <li>Login → semana → NS → portada fases.</li>
                <li>Detalle fase con tabs: Entregable / Elementos trazables.</li>
                <li>Validación de serial + panel NC/observaciones (mock).</li>
              </ul>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function NotFound() {
  return (
    <Card>
      <CardHeader title="Ruta no encontrada" subtitle="Vuelve al inicio." right={<Badge>404</Badge>} />
      <CardBody>
        <NavLink to="/" className="text-sm font-medium text-zinc-900 underline">
          Ir a Inicio
        </NavLink>
      </CardBody>
    </Card>
  );
}

// ------------------------------
// EDITOR
// ------------------------------
function EditorNav() {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="text-xl font-semibold tracking-tight">Editor</div>
        <div className="text-sm text-zinc-500">
          Control del Libro: modelos (solo lectura), fases, entregables y asignaciones.
        </div>
      </div>
      <PillNav
        items={[
          { to: "/editor/modelos", label: "Modelos" },
          { to: "/editor/fases", label: "Fases" },
          { to: "/editor/entregables", label: "Entregables" },
          { to: "/editor/asignacion", label: "Asignaciones" },
        ]}
      />
    </div>
  );
}

function EditorModels({ store }) {
  const nav = useNavigate();
  const [selected, setSelected] = useState(MOCK.industrialModels[0].code);
  const phaseMappings = store.state.phaseMappings || MOCK.phaseMappings;

  const phasesForModel = useMemo(() => {
    return phaseMappings
      .filter((m) => m.modelCode === selected)
      .slice()
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [phaseMappings, selected]);

  const stats = useMemo(() => {
    const all = phaseMappings.filter((m) => m.modelCode === selected);
    return {
      total: all.length,
      pending: all.filter((m) => m.status === "PENDING" || !m.bookPhaseId).length,
      mapped: all.filter((m) => m.bookPhaseId).length,
    };
  }, [phaseMappings, selected]);

  return (
    <div className="grid gap-6">
      <EditorNav />

      <div className="grid gap-4 md:grid-cols-3">
        <Section
          className="md:col-span-1"
          title="Modelos"
          subtitle="Datos maestros industriales (solo lectura)"
          right={<Badge tone="info">SAP</Badge>}
        >
          <div className="grid gap-2">
            {MOCK.industrialModels.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelected(m.code)}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
                  selected === m.code
                    ? "border-zinc-400 bg-zinc-50"
                    : "border-zinc-200 hover:bg-zinc-50"
                }`}
              >
                <div>
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs text-zinc-500">Código: {m.code}</div>
                </div>
                <Badge tone="neutral">Fases</Badge>
              </button>
            ))}
          </div>
        </Section>

        <Section
          className="md:col-span-2"
          title={`Fases del modelo · ${selected}`}
          subtitle="Estructura industrial (SAP + Planificación) y estado"
          right={
            <div className="flex items-center gap-2">
              <Badge tone={stats.pending ? "warn" : "ok"}>{stats.pending} pendientes</Badge>
              <Badge tone="neutral">{stats.total} total</Badge>
              <Button variant="subtle" onClick={() => nav(`/editor/fases?modelo=${selected}`)}>
                Ver en Fases
              </Button>
            </div>
          }
        >
          <div className="grid gap-2">
            {phasesForModel.length === 0 ? (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
                No hay fases para este modelo (mock).
              </div>
            ) : (
              phasesForModel.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-medium">#{p.displayOrder} · {p.sapPhaseName}</div>
                    <div className="text-xs text-zinc-500">
                      GP {p.gpCode} · {p.sapPhaseRef} · {p.planningPhaseName}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={p.bookPhaseId ? "ok" : "warn"}>
                      {p.bookPhaseId ? "Libro: OK" : "Libro: Pendiente"}
                    </Badge>
                    {p.traceableElements?.length ? (
                      <Badge tone="info">{p.traceableElements.length} trazables</Badge>
                    ) : (
                      <Badge tone="neutral">0 trazables</Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}

function EditorPhases({ store }) {
  const url = new URL(window.location.href);
  const fromQuery = url.searchParams.get("modelo");

  const [modelCode, setModelCode] = useState(fromQuery || MOCK.industrialModels[0].code);
  const [selectedMapId, setSelectedMapId] = useState(null);

  const phaseMappings = store.state.phaseMappings || MOCK.phaseMappings;

  const mappings = useMemo(() => {
    return (phaseMappings || [])
      .filter((m) => m.modelCode === modelCode)
      .slice()
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [phaseMappings, modelCode]);

  // Opciones (capadas) para elegir fases disponibles por modelo (mock)
  // ASUNCIÓN MOCK: se derivan del propio conjunto de fases disponible del modelo.
  const sapPhaseOptions = useMemo(() => {
    const seen = new Set();
    return mappings
      .map((m) => ({ ref: m.sapPhaseRef, code: m.sapPhaseCode, name: m.sapPhaseName }))
      .filter((o) => {
        if (!o.ref) return false;
        if (seen.has(o.ref)) return false;
        seen.add(o.ref);
        return true;
      });
  }, [mappings]);

  const planningPhaseOptions = useMemo(() => {
    const seen = new Set();
    return mappings
      .map((m) => ({ key: m.planningPhaseKey, name: m.planningPhaseName }))
      .filter((o) => {
        if (!o.key) return false;
        if (seen.has(o.key)) return false;
        seen.add(o.key);
        return true;
      });
  }, [mappings]);

  useEffect(() => {
    if (!selectedMapId && mappings.length) setSelectedMapId(mappings[0].id);
    if (selectedMapId && !mappings.find((m) => m.id === selectedMapId) && mappings.length) {
      setSelectedMapId(mappings[0].id);
    }
  }, [modelCode, mappings, selectedMapId]);

  const selected = mappings.find((m) => m.id === selectedMapId) || null;

  const deliverableInfo = useMemo(() => {
    if (!selected?.bookPhaseId) return { deliverable: null, published: null, bookPhase: null };
    const bookPhase = MOCK.bookPhases.find((b) => b.id === selected.bookPhaseId) || null;
    const asg = getAssignmentForBookPhase(store.state.assignments, selected.bookPhaseId);
    const deliverable = asg ? getDeliverableById(store.state.deliverables, asg.deliverableId) : null;
    const published = deliverable ? getPublishedVersion(deliverable) : null;
    return { deliverable, published, bookPhase };
  }, [selected, store.state.assignments, store.state.deliverables]);

  const publishedDeliverables = useMemo(() => {
    return store.state.deliverables
      .filter((d) => !!d.currentPublishedVersionId)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [store.state.deliverables]);

  return (
    <div className="grid gap-6">
      <EditorNav />

      <div className="grid gap-4 md:grid-cols-3">
        <Section className="md:col-span-1" title="Filtro" subtitle="Selecciona modelo y fase">
          <Select
            label="Modelo"
            value={modelCode}
            onChange={(e) => {
              setModelCode(e.target.value);
              setSelectedMapId(null);
            }}
          >
            {MOCK.industrialModels.map((m) => (
              <option key={m.id} value={m.code}>
                {m.name}
              </option>
            ))}
          </Select>

          <div className="mt-3 grid gap-2">
            {mappings.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMapId(m.id)}
                className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                  selectedMapId === m.id
                    ? "border-zinc-400 bg-zinc-50"
                    : "border-zinc-200 hover:bg-zinc-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">#{m.displayOrder} · {m.sapPhaseName}</div>
                    <div className="mt-0.5 text-xs text-zinc-500">{m.planningPhaseName}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge tone={m.bookPhaseId ? "ok" : "warn"}>
                      {m.bookPhaseId ? "Libro: OK" : "Libro: Pendiente"}
                    </Badge>
                    {m.traceableElements?.length ? (
                      <Badge tone="info">{m.traceableElements.length} T</Badge>
                    ) : (
                      <Badge tone="neutral">0 T</Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Section>

        <div className="md:col-span-2 grid gap-4">
          <Section
            title="Datos de la fase"
            subtitle="SAP y Planificación (selectores)"
            right={
              selected ? (
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">Modelo {selected.modelCode}</Badge>
                  <Badge tone="neutral">GP {selected.gpCode}</Badge>
                </div>
              ) : null
            }
          >
            {!selected ? (
              <div className="text-sm text-zinc-600">Selecciona una fase.</div>
            ) : (
              <>
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                    <div className="text-xs font-semibold text-zinc-700">SAP</div>
                    <div className="mt-3 grid gap-2">
                      <Input label="Referencia (capada)" value={selected.sapPhaseRef || ""} disabled />
                      <Select
                        label="Fase SAP"
                        value={selected.sapPhaseRef || ""}
                        onChange={(e) => {
                          const ref = e.target.value;
                          const opt = sapPhaseOptions.find((x) => x.ref === ref);
                          if (!opt) return;
                          store.dispatch({
                            type: "UPDATE_PHASE_MAPPING",
                            id: selected.id,
                            patch: {
                              sapPhaseRef: opt.ref,
                              sapPhaseCode: opt.code,
                              sapPhaseName: opt.name,
                            },
                          });
                        }}
                      >
                        <option value="">Selecciona…</option>
                        {sapPhaseOptions.map((o) => (
                          <option key={o.ref} value={o.ref}>
                            {o.ref} · {o.name}
                          </option>
                        ))}
                      </Select>
                      <div className="text-xs text-zinc-500">
                        ASUNCIÓN MOCK: el desplegable lista las fases SAP disponibles para el modelo.
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                    <div className="text-xs font-semibold text-zinc-700">Planificación</div>
                    <div className="mt-3 grid gap-2">
                      <Select
                        label="Fase de Planificación"
                        value={selected.planningPhaseKey || ""}
                        onChange={(e) => {
                          const key = e.target.value;
                          const opt = planningPhaseOptions.find((x) => x.key === key);
                          if (!opt) return;
                          store.dispatch({
                            type: "UPDATE_PHASE_MAPPING",
                            id: selected.id,
                            patch: { planningPhaseKey: opt.key, planningPhaseName: opt.name },
                          });
                        }}
                      >
                        <option value="">Selecciona…</option>
                        {planningPhaseOptions.map((o) => (
                          <option key={o.key} value={o.key}>
                            {o.name}
                          </option>
                        ))}
                      </Select>
                      <div className="text-xs text-zinc-500">
                        ASUNCIÓN MOCK: la clave interna se mantiene, pero no se muestra en pantalla.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-zinc-700">Fase del Libro</div>
                      <div className="mt-1 text-sm text-zinc-900">
                        {selected.bookPhaseId ? (
                          <span className="font-semibold">
                            {MOCK.bookPhases.find((b) => b.id === selected.bookPhaseId)?.name || "-"}
                          </span>
                        ) : (
                          <span className="text-amber-800">Pendiente de validar</span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        Tipo: {selected.bookPhaseId ? getBookPhaseTypeName(selected.bookPhaseId) : "-"}
                      </div>
                    </div>
                    <div className="min-w-[280px]">
                      <Select
                        label="Cambiar fase del Libro"
                        value={selected.bookPhaseId || ""}
                        onChange={(e) => {
                          const v = e.target.value ? e.target.value : null;
                          store.dispatch({
                            type: "UPDATE_PHASE_MAPPING",
                            id: selected.id,
                            patch: { bookPhaseId: v, status: v ? "VALIDATED" : "PENDING" },
                          });
                        }}
                      >
                        <option value="">— Pendiente de validar —</option>
                        {MOCK.bookPhases
                          .slice()
                          .sort((a, b) => a.displayOrder - b.displayOrder)
                          .map((bp) => (
                            <option key={bp.id} value={bp.id}>
                              {bp.name}
                            </option>
                          ))}
                      </Select>
                    </div>
                  </div>
                </div>

                {!selected.bookPhaseId ? (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    Esta fase está <b>pendiente</b> de validación en el Libro.
                  </div>
                ) : null}
              </>
            )}
          </Section>

          <Section
            title="Entregable asociado"
            subtitle="Editable (asignación por fase del Libro)"
            right={
              deliverableInfo.deliverable ? (
                <Badge tone="ok">Asignado</Badge>
              ) : (
                <Badge tone={selected?.bookPhaseId ? "warn" : "neutral"}>
                  {selected?.bookPhaseId ? "Sin entregable" : "No aplica"}
                </Badge>
              )
            }
          >
            {!selected ? null : !selected.bookPhaseId ? (
              <div className="text-sm text-zinc-600">
                Selecciona una <b>Fase del Libro</b> para poder asociar un entregable.
              </div>
            ) : (
              <div className="grid gap-3">
                {deliverableInfo.deliverable ? (
                  <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{deliverableInfo.deliverable.name}</div>
                        <div className="mt-0.5 text-xs text-zinc-500">{deliverableInfo.deliverable.code}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone="ok">Publicado vigente</Badge>
                        <Badge tone="neutral">
                          {deliverableInfo.published ? `v${deliverableInfo.published.versionNumber}` : "-"}
                        </Badge>
                        <Badge tone="neutral">{deliverableInfo.published?.createdAt || "-"}</Badge>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    No hay entregable asignado a esta fase del Libro.
                  </div>
                )}

                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <Select
                      label="Cambiar entregable (publicado)"
                      value={deliverableInfo.deliverable?.id || ""}
                      onChange={(e) => {
                        const deliverableId = e.target.value;
                        if (!deliverableId) return;
                        store.dispatch({
                          type: "SET_ASSIGNMENT",
                          bookPhaseId: selected.bookPhaseId,
                          deliverableId,
                        });
                      }}
                    >
                      <option value="">Selecciona…</option>
                      {publishedDeliverables.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button variant="subtle" className="w-full" onClick={() => {}}>
                      Guardar (mock)
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-zinc-500">
                  Mock: el cambio ajusta la asignación en memoria. En integración real, persistiría y validaría permisos.
                </div>
              </div>
            )}
          </Section>

          <Section
            title="Elementos trazables (maestro)"
            subtitle="Definidos por datos maestros industriales (no por el Editor)"
            right={
              selected?.traceableElements?.length ? (
                <Badge tone="info">{selected.traceableElements.length}</Badge>
              ) : (
                <Badge tone="neutral">0</Badge>
              )
            }
          >
            {!selected ? null : selected.traceableElements?.length ? (
              <div className="grid gap-2">
                {selected.traceableElements.map((t) => (
                  <div
                    key={t.code}
                    className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2"
                  >
                    <div>
                      <div className="text-sm font-medium">{t.name}</div>
                      <div className="text-xs text-zinc-500">Código: {t.code}</div>
                    </div>
                    <Badge tone={t.required ? "warn" : "neutral"}>
                      {t.required ? "Requerido" : "Opcional"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-zinc-600">Esta fase no tiene trazables definidos (mock).</div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

// ------------------------------
// El resto del archivo (Entregables, Operario, etc.)
// NOTE: Se mantiene idéntico al original salvo correcciones de placeholders $1/$2.
// ------------------------------

function EditorDeliverables({ store }) {
  const nav = useNavigate();
  const deliverables = store.state.deliverables;

  const [q, setQ] = useState("");
  const [type, setType] = useState("ALL");
  const [expanded, setExpanded] = useState(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return deliverables.filter((d) => {
      const byText = !s || d.name.toLowerCase().includes(s) || d.code.toLowerCase().includes(s);
      const byType = type === "ALL" || d.phaseTypeId === type;
      return byText && byType;
    });
  }, [deliverables, q, type]);

  return (
    <div className="grid gap-6">
      <EditorNav />

      <div className="grid gap-4">
        <Section title="Filtros" subtitle="Busca por nombre/código y filtra por tipo">
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              label="Buscar"
              placeholder="Ej. recepción, DLV_…"
            />
            <Select label="Tipo de entregable" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="ALL">Todos</option>
              {MOCK.bookPhaseTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            <div className="flex items-end justify-end">
              <Badge tone="info">{filtered.length} resultados</Badge>
            </div>
          </div>
        </Section>

        <Section
          title="Entregables"
          subtitle="Vista principal + detalles expandibles (fases asociadas e histórico)"
        >
          <div className="grid gap-2">
            {filtered.map((d) => {
              const pub = getPublishedVersion(d);
              const dr = getDraftVersion(d);
              const isOpen = expanded === d.id;

              const associatedPhases = store.state.assignments
                .filter((a) => a.deliverableId === d.id && a.isActive)
                .map((a) => MOCK.bookPhases.find((bp) => bp.id === a.bookPhaseId))
                .filter(Boolean);

              return (
                <div key={d.id} className="rounded-2xl border border-zinc-200 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-[240px]">
                      <div className="text-sm font-semibold">{d.name}</div>
                      <div className="mt-0.5 text-xs text-zinc-500">
                        {d.code} · {MOCK.bookPhaseTypes.find((t) => t.id === d.phaseTypeId)?.name || "-"}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {dr ? (
                        <Badge tone="draft">Borrador v{dr.versionNumber}</Badge>
                      ) : (
                        <Badge tone="neutral">Sin borrador</Badge>
                      )}
                      {pub ? (
                        <Badge tone="ok">Publicado v{pub.versionNumber}</Badge>
                      ) : (
                        <Badge tone="warn">No publicado</Badge>
                      )}
                      <Badge tone="neutral">{pub?.createdAt || "-"}</Badge>
                      <Button variant="subtle" onClick={() => setExpanded(isOpen ? null : d.id)}>
                        {isOpen ? "Ocultar" : "Más info"}
                      </Button>
                      <Button onClick={() => nav(`/editor/entregables/${d.id}`)}>Abrir</Button>
                    </div>
                  </div>

                  {isOpen ? (
                    <div className="border-t border-zinc-200 p-4">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                          <div className="text-xs font-semibold text-zinc-700">Fases asociadas</div>
                          <div className="mt-2 grid gap-2">
                            {associatedPhases.length === 0 ? (
                              <div className="text-sm text-zinc-600">Sin fases asociadas.</div>
                            ) : (
                              associatedPhases.map((bp) => (
                                <div
                                  key={bp.id}
                                  className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2"
                                >
                                  <div>
                                    <div className="text-sm font-medium">{bp.name}</div>
                                    <div className="text-xs text-zinc-500">{bp.code}</div>
                                  </div>
                                  <Badge tone="neutral">
                                    {MOCK.bookPhaseTypes.find((t) => t.id === bp.typeId)?.name || "-"}
                                  </Badge>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                          <div className="text-xs font-semibold text-zinc-700">Histórico de versiones</div>
                          <div className="mt-2 grid gap-2">
                            {d.versions
                              .slice()
                              .sort((a, b) => b.versionNumber - a.versionNumber)
                              .map((v) => (
                                <div key={v.id} className="rounded-xl border border-zinc-200 bg-white p-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <div className="text-sm font-semibold">
                                        v{v.versionNumber} · {v.title || "(sin título)"}
                                      </div>
                                      <div className="mt-0.5 text-xs text-zinc-500">
                                        {v.createdAt} · Responsable: {v.owner || "-"}
                                      </div>
                                    </div>
                                    <Badge tone={v.status === "PUBLISHED" ? "ok" : "draft"}>{v.status}</Badge>
                                  </div>
                                  {v.description ? (
                                    <div className="mt-2 text-sm text-zinc-600">{v.description}</div>
                                  ) : null}
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Section>
      </div>
    </div>
  );
}

function EditorDeliverableForm({ store }) {
  const { deliverableId } = useParams();
  const nav = useNavigate();
  const deliverable = store.state.deliverables.find((d) => d.id === deliverableId);
  const draft = deliverable ? getDraftVersion(deliverable) : null;
  const published = deliverable ? getPublishedVersion(deliverable) : null;

  const [tab, setTab] = useState("builder");
  const [localQuestions, setLocalQuestions] = useState(() =>
    draft ? JSON.parse(JSON.stringify(draft.questions)) : []
  );
  const [toast, setToast] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    setLocalQuestions(draft ? JSON.parse(JSON.stringify(draft.questions)) : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliverableId]);

  if (!deliverable) {
    return (
      <div className="grid gap-6">
        <EditorNav />
        <Card>
          <CardHeader title="Entregable no encontrado" />
          <CardBody>
            <Button variant="subtle" onClick={() => nav("/editor/entregables")}>Volver</Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  function addQuestion(type) {
    const nextOrder = (localQuestions.reduce((m, q) => Math.max(m, q.order), 0) || 0) + 1;
    const id = `q_${deliverableId}_${Date.now()}`;
    const base = {
      id,
      order: nextOrder,
      label: "Nueva pregunta",
      helpText: "",
      isRequired: false,
      answerType: type,
    };
    if (type === "OPTION") base.options = [{ value: "OP1", label: "Opción 1" }];
    if (type === "NUMBER_LIMITS") {
      base.minValue = 0;
      base.maxValue = 0;
    }
    setLocalQuestions([...localQuestions, base].sort((a, b) => a.order - b.order));
  }

  function saveDraft() {
    if (!draft) return;
    store.dispatch({
      type: "UPDATE_DRAFT_QUESTIONS",
      deliverableId: deliverable.id,
      draftVersionId: draft.id,
      questions: localQuestions.sort((a, b) => a.order - b.order),
    });
    setToast("Borrador guardado (en memoria)");
    setTimeout(() => setToast(""), 1800);
  }

  function publish() {
    store.dispatch({ type: "PUBLISH_DELIVERABLE", deliverableId: deliverable.id });
    setToast("Publicado: nueva versión vigente (sin afectar fases existentes)");
    setTimeout(() => setToast(""), 2200);
  }

  return (
    <div className="grid gap-6">
      <EditorNav />

      <Card>
        <CardHeader
          title={deliverable.name}
          subtitle={`${deliverable.code} · Editor de formulario (implementado para tipo “Formulario”)`}
          right={
            <div className="flex flex-wrap items-center gap-2">
              {draft ? <Badge tone="draft">Borrador v{draft.versionNumber}</Badge> : <Badge>Sin borrador</Badge>}
              {published ? <Badge tone="ok">Publicado v{published.versionNumber}</Badge> : <Badge tone="warn">No publicado</Badge>}
            </div>
          }
        />
        <CardBody>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-2xl border border-zinc-200 bg-white p-1">
              <button
                onClick={() => setTab("builder")}
                className={`rounded-xl px-3 py-2 text-sm ${
                  tab === "builder" ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                Constructor
              </button>
              <button
                onClick={() => setTab("preview")}
                className={`rounded-xl px-3 py-2 text-sm ${
                  tab === "preview" ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                Previsualización
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <IconButton label="Ayuda" onClick={() => setHelpOpen(true)} />
              <Button variant="subtle" onClick={() => nav("/editor/entregables")}>Volver</Button>
              <Button variant="subtle" onClick={saveDraft} disabled={!draft}>Guardar borrador</Button>
              <Button onClick={publish} disabled={!draft}>Publicar</Button>
            </div>
          </div>

          {toast ? (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {toast}
            </div>
          ) : null}

          <Divider />

          {deliverable.phaseTypeId !== "pt_form" ? (
            <PlaceholderPhaseType typeId={deliverable.phaseTypeId} />
          ) : tab === "builder" ? (
            <div className="grid gap-4">
              <Section title="Añadir pregunta" subtitle="Tipos soportados en mock">
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="subtle" onClick={() => addQuestion("TEXT")}>+ Texto</Button>
                  <Button variant="subtle" onClick={() => addQuestion("NUMBER")}>+ Numérico</Button>
                  <Button variant="subtle" onClick={() => addQuestion("NUMBER_LIMITS")}>+ Numérico (mín/máx)</Button>
                  <Button variant="subtle" onClick={() => addQuestion("OPTION")}>+ Opción</Button>
                  <Button variant="subtle" onClick={() => addQuestion("FILE")}>+ Archivo</Button>
                  <Button variant="subtle" onClick={() => addQuestion("IMAGE")}>+ Imagen</Button>
                </div>
              </Section>

              <Section title="Preguntas" subtitle="Orden, obligatoriedad y configuración">
                <div className="grid gap-3">
                  {localQuestions.length === 0 ? (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                      No hay preguntas en el borrador.
                    </div>
                  ) : (
                    localQuestions
                      .slice()
                      .sort((a, b) => a.order - b.order)
                      .map((q, idx) => (
                        <Card key={q.id} className="shadow-none">
                          <CardHeader
                            title={`#${q.order} · ${q.label || "(sin título)"}`}
                            subtitle={`${answerTypeLabel(q.answerType)}${q.isRequired ? " · Obligatoria" : ""}`}
                            right={
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  onClick={() => {
                                    const copy = localQuestions.slice();
                                    const i = copy.findIndex((x) => x.id === q.id);
                                    if (i > 0) {
                                      const tmp = copy[i - 1].order;
                                      copy[i - 1].order = copy[i].order;
                                      copy[i].order = tmp;
                                      setLocalQuestions(copy);
                                    }
                                  }}
                                  disabled={idx === 0}
                                >
                                  ↑
                                </Button>
                                <Button
                                  variant="ghost"
                                  onClick={() => {
                                    const copy = localQuestions.slice();
                                    const i = copy.findIndex((x) => x.id === q.id);
                                    if (i < copy.length - 1) {
                                      const tmp = copy[i + 1].order;
                                      copy[i + 1].order = copy[i].order;
                                      copy[i].order = tmp;
                                      setLocalQuestions(copy);
                                    }
                                  }}
                                  disabled={idx === localQuestions.length - 1}
                                >
                                  ↓
                                </Button>
                                <Button
                                  variant="danger"
                                  onClick={() => setLocalQuestions(localQuestions.filter((x) => x.id !== q.id))}
                                >
                                  Eliminar
                                </Button>
                              </div>
                            }
                          />
                          <CardBody>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <Input
                                label="Texto de la pregunta"
                                value={q.label}
                                onChange={(e) =>
                                  setLocalQuestions(
                                    localQuestions.map((x) =>
                                      x.id === q.id ? { ...x, label: e.target.value } : x
                                    )
                                  )
                                }
                              />
                              <Input
                                label="Orden"
                                type="number"
                                value={q.order}
                                onChange={(e) => {
                                  const num = Number(e.target.value || 0);
                                  setLocalQuestions(
                                    localQuestions.map((x) => (x.id === q.id ? { ...x, order: num } : x))
                                  );
                                }}
                              />
                              <Input
                                label="Ayuda / tooltip"
                                value={q.helpText || ""}
                                onChange={(e) =>
                                  setLocalQuestions(
                                    localQuestions.map((x) =>
                                      x.id === q.id ? { ...x, helpText: e.target.value } : x
                                    )
                                  )
                                }
                              />
                              <Select
                                label="Tipo de respuesta"
                                value={q.answerType}
                                onChange={(e) => {
                                  const t = e.target.value;
                                  const patch = { answerType: t };
                                  if (t === "OPTION" && !q.options)
                                    patch.options = [{ value: "OP1", label: "Opción 1" }];
                                  if (t !== "OPTION") patch.options = undefined;
                                  if (t === "NUMBER_LIMITS") {
                                    if (q.minValue == null) patch.minValue = 0;
                                    if (q.maxValue == null) patch.maxValue = 0;
                                  }
                                  if (t !== "NUMBER_LIMITS") {
                                    patch.minValue = undefined;
                                    patch.maxValue = undefined;
                                  }
                                  setLocalQuestions(
                                    localQuestions.map((x) => (x.id === q.id ? { ...x, ...patch } : x))
                                  );
                                }}
                              >
                                <option value="TEXT">Texto</option>
                                <option value="NUMBER">Numérico</option>
                                <option value="NUMBER_LIMITS">Numérico (mín/máx)</option>
                                <option value="OPTION">Opción</option>
                                <option value="FILE">Archivo</option>
                                <option value="IMAGE">Imagen</option>
                              </Select>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <label className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={!!q.isRequired}
                                  onChange={(e) =>
                                    setLocalQuestions(
                                      localQuestions.map((x) =>
                                        x.id === q.id ? { ...x, isRequired: e.target.checked } : x
                                      )
                                    )
                                  }
                                />
                                Obligatoria
                              </label>
                            </div>

                            {q.answerType === "NUMBER_LIMITS" ? (
                              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                <Input
                                  label="Valor mínimo"
                                  type="number"
                                  value={q.minValue ?? 0}
                                  onChange={(e) =>
                                    setLocalQuestions(
                                      localQuestions.map((x) =>
                                        x.id === q.id ? { ...x, minValue: Number(e.target.value || 0) } : x
                                      )
                                    )
                                  }
                                />
                                <Input
                                  label="Valor máximo"
                                  type="number"
                                  value={q.maxValue ?? 0}
                                  onChange={(e) =>
                                    setLocalQuestions(
                                      localQuestions.map((x) =>
                                        x.id === q.id ? { ...x, maxValue: Number(e.target.value || 0) } : x
                                      )
                                    )
                                  }
                                />
                              </div>
                            ) : null}

                            {q.answerType === "OPTION" ? (
                              <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                                <div className="text-xs font-medium text-zinc-700">Opciones</div>
                                <div className="mt-2 grid gap-2">
                                  {(q.options || []).map((op, i) => (
                                    <div key={i} className="grid gap-2 sm:grid-cols-3">
                                      <Input
                                        label="Valor"
                                        value={op.value}
                                        onChange={(e) => {
                                          const copy = localQuestions.map((x) => (x.id === q.id ? { ...x } : x));
                                          const target = copy.find((x) => x.id === q.id);
                                          target.options = (target.options || []).map((o, oi) =>
                                            oi === i ? { ...o, value: e.target.value } : o
                                          );
                                          setLocalQuestions(copy);
                                        }}
                                      />
                                      <Input
                                        label="Etiqueta"
                                        value={op.label}
                                        onChange={(e) => {
                                          const copy = localQuestions.map((x) => (x.id === q.id ? { ...x } : x));
                                          const target = copy.find((x) => x.id === q.id);
                                          target.options = (target.options || []).map((o, oi) =>
                                            oi === i ? { ...o, label: e.target.value } : o
                                          );
                                          setLocalQuestions(copy);
                                        }}
                                      />
                                      <div className="flex items-end">
                                        <Button
                                          variant="danger"
                                          className="w-full"
                                          onClick={() => {
                                            const copy = localQuestions.map((x) => (x.id === q.id ? { ...x } : x));
                                            const target = copy.find((x) => x.id === q.id);
                                            target.options = (target.options || []).filter((_, oi) => oi !== i);
                                            setLocalQuestions(copy);
                                          }}
                                        >
                                          Quitar
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                  <Button
                                    variant="subtle"
                                    onClick={() => {
                                      const copy = localQuestions.map((x) => (x.id === q.id ? { ...x } : x));
                                      const target = copy.find((x) => x.id === q.id);
                                      target.options = [
                                        ...(target.options || []),
                                        {
                                          value: `OP${(target.options || []).length + 1}`,
                                          label: `Opción ${(target.options || []).length + 1}`,
                                        },
                                      ];
                                      setLocalQuestions(copy);
                                    }}
                                  >
                                    + Añadir opción
                                  </Button>
                                </div>
                              </div>
                            ) : null}
                          </CardBody>
                        </Card>
                      ))
                  )}
                </div>
              </Section>
            </div>
          ) : (
            <FormPreview questions={localQuestions} />
          )}
        </CardBody>
      </Card>

      <Modal
        open={helpOpen}
        title="Ayuda"
        onClose={() => setHelpOpen(false)}
        footer={<Button variant="subtle" onClick={() => setHelpOpen(false)}>Cerrar</Button>}
      >
        <div className="grid gap-3 text-sm text-zinc-700">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <div className="text-xs font-semibold text-zinc-700">Borrador vs Publicado</div>
            <div className="mt-1">
              Publicar crea una <b>nueva versión vigente</b> del entregable. Las fases transaccionales ya generadas
              mantienen su versión aplicada (congelada).
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <div className="text-xs font-semibold text-zinc-700">Elementos trazables</div>
            <div className="mt-1">
              En este diseño, los trazables vienen del <b>maestro industrial por fase</b> y se reportan en una pestaña
              separada en Operario.
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <div className="text-xs font-semibold text-zinc-700">Obligatoriedad</div>
            <div className="mt-1">Finalizar fase se bloquea si faltan preguntas obligatorias.</div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function FormPreview({ questions }) {
  return (
    <div className="grid gap-3">
      <div className="text-sm text-zinc-600">
        Vista previa del formulario (layout tipo galería: fila por pregunta).
      </div>
      {questions
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((q) => (
          <div key={q.id} className="rounded-xl border border-zinc-200 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium">{q.label || "(sin título)"}</div>
                {q.helpText ? <div className="mt-1 text-xs text-zinc-500">{q.helpText}</div> : null}
              </div>
              <div className="flex items-center gap-2">
                {q.isRequired ? <Badge tone="warn">Obligatoria</Badge> : <Badge>Opcional</Badge>}
              </div>
            </div>
            <div className="mt-3">
              <PreviewInput q={q} />
            </div>
          </div>
        ))}
    </div>
  );
}

function PreviewInput({ q }) {
  if (q.answerType === "TEXT") return <Input placeholder="Texto…" />;
  if (q.answerType === "NUMBER") return <Input type="number" placeholder="0" />;
  if (q.answerType === "NUMBER_LIMITS") {
    const min = q.minValue ?? 0;
    const max = q.maxValue ?? 0;
    return <Input type="number" placeholder={`0 (mín ${min} · máx ${max})`} />;
  }
  if (q.answerType === "OPTION")
    return (
      <Select>
        <option value="">Selecciona…</option>
        {(q.options || []).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    );
  if (q.answerType === "FILE") return <Input placeholder="Adjuntar archivo (mock)" />;
  if (q.answerType === "IMAGE") return <Input placeholder="Adjuntar imagen (mock)" />;

  // Nota: evitamos el carácter "—" como placeholder porque algunos parsers lo interpretan mal en JSX.
  return <Input placeholder="-" />;
}

function PlaceholderPhaseType({ typeId }) {
  const label =
    typeId === "pt_calc"
      ? "Cálculo de casquillo"
      : typeId === "pt_bpm"
      ? "Formulario con proceso de negocio"
      : "-";
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="text-sm font-semibold">{label} (placeholder)</div>
      <div className="mt-2 text-sm text-zinc-600">
        Pantalla diseñada: el modelo y navegación lo soportan, pero la lógica específica se implementará más adelante.
      </div>
    </div>
  );
}

function EditorAssignment({ store }) {
  const [bookPhases] = useState([...MOCK.bookPhases].sort((a, b) => a.displayOrder - b.displayOrder));

  const deliverables = store.state.deliverables;
  const assignments = store.state.assignments;

  return (
    <div className="grid gap-6">
      <EditorNav />
      <Section
        title="Asignaciones"
        subtitle="Asociar Entregable publicado a Fase del Libro"
        right={<Badge tone="info">Mock</Badge>}
      >
        <div className="grid gap-3">
          {bookPhases.map((bp) => {
            const as = assignments.filter((a) => a.bookPhaseId === bp.id && a.isActive);
            const type = MOCK.bookPhaseTypes.find((t) => t.id === bp.typeId)?.name;
            return (
              <div key={bp.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{bp.name}</div>
                    <div className="text-xs text-zinc-500">{bp.code} · {type}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {bp.typeId === "pt_form" ? <Badge tone="ok">Implementado</Badge> : <Badge tone="warn">Placeholder</Badge>}
                  </div>
                </div>

                <div className="mt-3 grid gap-2">
                  {as.length === 0 ? (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
                      Sin entregable asignado.
                    </div>
                  ) : (
                    as.map((a) => {
                      const d = deliverables.find((x) => x.id === a.deliverableId);
                      const pub = d ? getPublishedVersion(d) : null;
                      return (
                        <div
                          key={a.id}
                          className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2"
                        >
                          <div>
                            <div className="text-sm font-medium">{d?.name || "-"}</div>
                            <div className="text-xs text-zinc-500">Publicado vigente: {pub ? `v${pub.versionNumber}` : "-"}</div>
                          </div>
                          <Badge tone="ok">Activo</Badge>
                        </div>
                      );
                    })
                  )}

                  <div className="mt-2 rounded-xl border border-zinc-200 bg-white p-3">
                    <div className="text-xs font-medium text-zinc-700">(Mock) Selector de entregable publicado</div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      <Select defaultValue="">
                        <option value="">Selecciona entregable…</option>
                        {deliverables
                          .filter((d) => !!d.currentPublishedVersionId)
                          .map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                      </Select>
                      <Button variant="subtle" disabled>
                        Asignar (mock)
                      </Button>
                      <div className="flex items-center text-xs text-zinc-500">
                        En este preview no persistimos cambios de asignación.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

// ------------------------------
// OPERARIO
// ------------------------------
function OperarioGuard({ store, children }) {
  if (!store.state.operatorNumber) return <Navigate to="/operario/login" replace />;
  return children;
}

function OperarioHeader({ store, title, subtitle, right }) {
  const nav = useNavigate();
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="text-xl font-semibold tracking-tight">{title}</div>
        <div className="text-sm text-zinc-500">{subtitle}</div>
      </div>
      <div className="flex items-center gap-2">
        {right}
        <Badge tone="neutral">Operario: {store.state.operatorNumber || "-"}</Badge>
        <Button variant="subtle" onClick={() => nav("/operario/semana")}>Semana</Button>
      </div>
    </div>
  );
}

function OperarioLogin({ store }) {
  const nav = useNavigate();
  const [num, setNum] = useState(store.state.operatorNumber);

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader title="Login operario" subtitle="Introduce tu número de operario para entrar" />
          <CardBody>
            <div className="grid gap-3">
              <Input
                label="Número de operario"
                value={num}
                onChange={(e) => setNum(e.target.value)}
                placeholder="Ej. 01234"
              />
              <Button
                className="w-full"
                onClick={() => {
                  store.dispatch({ type: "SET_OPERATOR", value: (num || "").trim() });
                  nav("/operario/semana");
                }}
                disabled={!num.trim()}
              >
                Entrar
              </Button>
              <div className="text-center text-xs text-zinc-500">Mock: no hay validación real de credenciales.</div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function OperarioWeekSelect({ store }) {
  const nav = useNavigate();
  const [weeks, setWeeks] = useState([]);
  const [units, setUnits] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => setWeeks(await fakeApi.getWeeks()))();
  }, []);

  useEffect(() => {
    (async () => {
      const list = await fakeApi.getPlannedUnitsByWeek(store.state.selectedWeekId);
      setUnits(list);
    })();
  }, [store.state.selectedWeekId]);

  const filtered = units.filter((u) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return (
      u.ns.toLowerCase().includes(s) ||
      u.gpCode.toLowerCase().includes(s) ||
      (u.modelCode || "").toLowerCase().includes(s)
    );
  });

  return (
    <OperarioGuard store={store}>
      <div className="grid gap-6">
        <OperarioHeader
          store={store}
          title="Operario"
          subtitle="Semana (desplegable) y números de serie"
          right={<Badge tone="info">{store.state.selectedWeekId}</Badge>}
        />

        <Card>
          <CardHeader
            title="Semana"
            subtitle="Por defecto: semana actual (mock). Los NS aparecen debajo."
            right={<Badge tone="info">{store.state.selectedWeekId}</Badge>}
          />
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label="Semana"
                value={store.state.selectedWeekId}
                onChange={(e) => store.dispatch({ type: "SET_WEEK", value: e.target.value })}
              >
                {weeks.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.year} · Semana {w.week}
                  </option>
                ))}
              </Select>
              <Input label="Buscar NS" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" />
            </div>
          </CardBody>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((u) => (
            <Card key={u.id}>
              <CardHeader
                title={u.ns}
                subtitle={`Modelo: ${u.modelCode} · GP: ${u.gpCode}`}
                right={
                  <Button variant="subtle" onClick={() => nav(`/operario/ns/${u.id}`)}>
                    Abrir
                  </Button>
                }
              />
              <CardBody>
                <div className="text-sm text-zinc-600">Portada de trazabilidad con fases transaccionales.</div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </OperarioGuard>
  );
}

function OperarioUnits({ store }) {
  const nav = useNavigate();
  const [units, setUnits] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const list = await fakeApi.getPlannedUnitsByWeek(store.state.selectedWeekId);
      setUnits(list);
    })();
  }, [store.state.selectedWeekId]);

  const filtered = units.filter((u) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return (
      u.ns.toLowerCase().includes(s) ||
      u.gpCode.toLowerCase().includes(s) ||
      (u.modelCode || "").toLowerCase().includes(s)
    );
  });

  return (
    <OperarioGuard store={store}>
      <div className="grid gap-6">
        <OperarioHeader
          store={store}
          title="Multiplicadoras"
          subtitle="Lista de NS de la semana seleccionada"
          right={<Badge tone="info">{store.state.selectedWeekId}</Badge>}
        />

        <div className="grid gap-4">
          <Card>
            <CardHeader title="Buscar" subtitle="Filtra por NS, GP o modelo (mock)" />
            <CardBody>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" />
            </CardBody>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((u) => (
              <Card key={u.id}>
                <CardHeader
                  title={u.ns}
                  subtitle={`Modelo: ${u.modelCode} · GP: ${u.gpCode}`}
                  right={
                    <Button variant="subtle" onClick={() => nav(`/operario/ns/${u.id}`)}>
                      Abrir
                    </Button>
                  }
                />
                <CardBody>
                  <div className="text-sm text-zinc-600">Portada de trazabilidad con fases transaccionales.</div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </OperarioGuard>
  );
}

function OperarioCover({ store }) {
  const nav = useNavigate();
  const { plannedUnitId } = useParams();
  const unit = MOCK.plannedUnits.find((u) => u.id === plannedUnitId);
  const [phases, setPhases] = useState([]);

  useEffect(() => {
    (async () => setPhases(await fakeApi.getPhasesTxForUnit(plannedUnitId)))();
  }, [plannedUnitId]);

  if (!unit) {
    return (
      <OperarioGuard store={store}>
        <Card>
          <CardHeader title="NS no encontrado" />
          <CardBody>
            <Button variant="subtle" onClick={() => nav("/operario/unidades")}>Volver</Button>
          </CardBody>
        </Card>
      </OperarioGuard>
    );
  }

  function phaseName(p) {
    if (!p.bookPhaseId) return "Fase pendiente de mapeo";
    return MOCK.bookPhases.find((x) => x.id === p.bookPhaseId)?.name || "-";
  }

  return (
    <OperarioGuard store={store}>
      <div className="grid gap-6">
        <OperarioHeader
          store={store}
          title={`Portada · ${unit.ns}`}
          subtitle={`Modelo ${unit.modelCode} · GP ${unit.gpCode} · Semana ${store.state.selectedWeekId}`}
          right={<Button variant="subtle" onClick={() => nav("/operario/semana")}>Volver</Button>}
        />

        <Card>
          <CardHeader title="Fases" subtitle="Nombre, OF, estado, incidencias" />
          <CardBody>
            <div className="grid gap-3">
              {phases.map((p) => (
                <div key={p.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{phaseName(p)}</div>
                      <div className="mt-1 text-xs text-zinc-500">OF: {p.of || "-"} · {p.planningPhaseKey}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={toneForPhaseStatus(p.status)}>{labelForPhaseStatus(p.status)}</Badge>
                      <Badge tone={p.incidenceCount > 0 ? "warn" : "neutral"}>{p.incidenceCount} incid.</Badge>
                      <Button
                        variant={p.status === "BLOCKED" ? "subtle" : "primary"}
                        disabled={p.status === "BLOCKED"}
                        onClick={() => nav(`/operario/ns/${plannedUnitId}/fase/${p.id}`)}
                      >
                        Abrir
                      </Button>
                    </div>
                  </div>
                  {p.status === "BLOCKED" ? (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      Bloqueada: falta mapeo de fase. Contacta con el Editor.
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </OperarioGuard>
  );
}

function OperarioPhaseDetail({ store }) {
  const nav = useNavigate();
  const { plannedUnitId, phaseTxId } = useParams();
  const unit = MOCK.plannedUnits.find((u) => u.id === plannedUnitId);
  const phase = MOCK.traceabilityPhasesTx.find((p) => p.id === phaseTxId);

  const [tab, setTab] = useState("entregable");
  const [toast, setToast] = useState("");

  // Incidencias (modal)
  const [modalOpen, setModalOpen] = useState(false);
  const [incText, setIncText] = useState("");
  const [incFile, setIncFile] = useState("");
  const [incScope, setIncScope] = useState("FORM");
  const [incQuestionId, setIncQuestionId] = useState(null);
  const [incTraceableCode, setIncTraceableCode] = useState(null);

  // NC por trazable
  const [ncByTraceable, setNcByTraceable] = useState({});
  const [validatingCode, setValidatingCode] = useState(null);
  const [traceableMsg, setTraceableMsg] = useState("");

  if (!unit || !phase) {
    return (
      <OperarioGuard store={store}>
        <Card>
          <CardHeader title="Fase no encontrada" />
          <CardBody>
            <Button variant="subtle" onClick={() => nav("/operario/semana")}>Volver</Button>
          </CardBody>
        </Card>
      </OperarioGuard>
    );
  }

  const bookPhase = phase.bookPhaseId ? MOCK.bookPhases.find((x) => x.id === phase.bookPhaseId) : null;
  const isForm = bookPhase?.typeId === "pt_form";

  const mapping = findMappingForContext(store.state.phaseMappings || MOCK.phaseMappings, {
    modelCode: unit.modelCode,
    gpCode: unit.gpCode,
    planningPhaseKey: phase.planningPhaseKey,
  });

  const deliverableVersion = useMemo(() => {
    if (!phase.appliedDeliverableVersionId) return null;
    for (const d of store.state.deliverables) {
      const v = d.versions.find((x) => x.id === phase.appliedDeliverableVersionId);
      if (v) return v;
    }
    return null;
  }, [phase.appliedDeliverableVersionId, store.state.deliverables]);

  const questions = deliverableVersion?.questions || [];
  const answers = store.state.answersByPhaseTxId[phase.id] || {};

  const traceablesMaster = mapping?.traceableElements || [];
  const traceables = store.state.traceablesByPhaseTxId[phase.id] || {};

  function openIncidentForQuestion(questionId) {
    setIncScope("FORM");
    setIncQuestionId(questionId);
    setIncTraceableCode(null);
    setIncText("");
    setIncFile("");
    setModalOpen(true);
  }

  function openIncidentForTraceable(code) {
    setIncScope("TRACEABLE");
    setIncQuestionId(null);
    setIncTraceableCode(code);
    setIncText("");
    setIncFile("");
    setModalOpen(true);
  }

  async function validateTraceable(code) {
    const serial = (traceables?.[code]?.serial || "").trim();
    if (!serial) {
      setTraceableMsg("Introduce un serial antes de validar.");
      return;
    }
    setValidatingCode(code);
    setTraceableMsg("");
    const data = await fakeApi.getNcObservations(unit.gpCode, serial);
    setNcByTraceable((prev) => ({ ...prev, [code]: data }));
    store.dispatch({
      type: "SET_TRACEABLE",
      phaseTxId: phase.id,
      traceableCode: code,
      patch: { validatedAt: new Date().toISOString() },
    });
    setValidatingCode(null);
    setTraceableMsg(data.length ? "Encontradas NC/observaciones previas." : "Sin NC/observaciones previas.");
  }

  function savePartial() {
    setToast("Guardado parcial (en memoria)");
    setTimeout(() => setToast(""), 1400);
  }

  function canFinalize() {
    // Obligatorio: preguntas
    for (const q of questions) {
      if (!q.isRequired) continue;
      const a = answers[q.id] || {};
      if (q.answerType === "OPTION") {
        if (!a.valueOption) return { ok: false, reason: `Falta respuesta en: “${q.label}”` };
      } else if (q.answerType === "NUMBER" || q.answerType === "NUMBER_LIMITS") {
        if (a.valueNumber == null || a.valueNumber === "")
          return { ok: false, reason: `Falta valor numérico en: “${q.label}”` };
      } else if (q.answerType === "TEXT") {
        if (!a.valueText) return { ok: false, reason: `Falta texto en: “${q.label}”` };
      } else if (q.answerType === "FILE" || q.answerType === "IMAGE") {
        if (!a.evidenceName) return { ok: false, reason: `Falta adjunto en: “${q.label}”` };
      }
    }

    // Obligatorio: trazables por maestro
    for (const t of traceablesMaster) {
      if (!t.required) continue;
      const r = traceables?.[t.code] || {};
      if (!r.serial || !r.validatedAt) {
        return { ok: false, reason: `Falta validar trazable requerido: “${t.name}”` };
      }
    }

    return { ok: true };
  }

  function finalize() {
    const chk = canFinalize();
    if (!chk.ok) {
      setToast(`No se puede finalizar: ${chk.reason}`);
      setTimeout(() => setToast(""), 2400);
      return;
    }
    setToast("Fase finalizada (mock). En real, se actualizaría el estado a DONE.");
    setTimeout(() => setToast(""), 2200);
  }

  return (
    <OperarioGuard store={store}>
      <div className="grid gap-6">
        <OperarioHeader
          store={store}
          title={`${unit.ns} · ${bookPhase ? bookPhase.name : "Fase"}`}
          subtitle={`OF ${phase.of || "-"} · ${phase.planningPhaseKey}`}
          right={<Button variant="subtle" onClick={() => nav(`/operario/ns/${plannedUnitId}`)}>Volver</Button>}
        />

        <Section
          title="Contexto"
          subtitle="Datos de fase y referencias"
          right={<Badge tone={toneForPhaseStatus(phase.status)}>{labelForPhaseStatus(phase.status)}</Badge>}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-zinc-50 p-3">
              <div className="text-xs font-medium text-zinc-700">Modelo / GP</div>
              <div className="mt-1 text-sm text-zinc-900">{unit.modelCode} · {unit.gpCode}</div>
            </div>
            <div className="rounded-xl bg-zinc-50 p-3">
              <div className="text-xs font-medium text-zinc-700">Fase SAP</div>
              <div className="mt-1 text-sm text-zinc-900">
                {mapping ? `${mapping.sapPhaseRef} · ${mapping.sapPhaseName}` : "-"}
              </div>
            </div>
            <div className="rounded-xl bg-zinc-50 p-3">
              <div className="text-xs font-medium text-zinc-700">Fase Planificación</div>
              <div className="mt-1 text-sm text-zinc-900">
                {mapping ? mapping.planningPhaseName : phase.planningPhaseKey}
              </div>
            </div>
          </div>
        </Section>

        {!isForm ? (
          <Card>
            <CardHeader
              title="Placeholder"
              subtitle="Tipo de fase soportado por modelo y UI, lógica pendiente"
              right={<Badge tone="warn">Pendiente</Badge>}
            />
            <CardBody>
              <div className="text-sm text-zinc-600">
                Esta fase es de tipo “{bookPhase?.typeId === "pt_calc" ? "Cálculo de casquillo" : "Formulario con proceso de negocio"}”.
                En esta preview no se implementa su lógica.
              </div>
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardHeader
              title="Detalle de fase"
              subtitle="Pestañas separadas: Entregable (formulario) y Elementos trazables (maestro)"
              right={
                <div className="inline-flex rounded-2xl border border-zinc-200 bg-white p-1">
                  <button
                    onClick={() => setTab("entregable")}
                    className={`rounded-xl px-3 py-2 text-sm ${tab === "entregable" ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"}`}
                  >
                    Entregable
                  </button>
                  <button
                    onClick={() => setTab("trazables")}
                    className={`rounded-xl px-3 py-2 text-sm ${tab === "trazables" ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"}`}
                  >
                    Elementos trazables
                  </button>
                </div>
              }
            />
            <CardBody>
              {toast ? (
                <div
                  className={`mb-4 rounded-xl border px-3 py-2 text-sm ${
                    toast.startsWith("No se puede")
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800"
                  }`}
                >
                  {toast}
                </div>
              ) : null}

              {tab === "entregable" ? (
                <>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm text-zinc-600">
                      Versión aplicada (congelada): {deliverableVersion ? `v${deliverableVersion.versionNumber}` : "-"}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="subtle" onClick={savePartial}>Guardar parcial</Button>
                      <Button onClick={finalize}>Finalizar fase</Button>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {questions.map((q) => {
                      const a = answers[q.id] || {};
                      return (
                        <div key={q.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold">{q.label}</div>
                              {q.helpText ? <div className="mt-1 text-xs text-zinc-500">{q.helpText}</div> : null}
                            </div>
                            <div className="flex items-center gap-2">
                              {q.isRequired ? <Badge tone="warn">Obligatoria</Badge> : <Badge>Opcional</Badge>}
                              <Button variant="subtle" onClick={() => openIncidentForQuestion(q.id)}>Abrir incidencia</Button>
                            </div>
                          </div>
                          <div className="mt-3">
                            <AnswerInput
                              q={q}
                              value={a}
                              onChange={(patch) =>
                                store.dispatch({ type: "SET_ANSWER", phaseTxId: phase.id, questionId: q.id, patch })
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-3 text-sm text-zinc-600">
                    Estos trazables vienen del <b>maestro industrial</b> para esta fase.
                  </div>

                  {traceableMsg ? (
                    <div className="mb-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                      {traceableMsg}
                    </div>
                  ) : null}

                  {traceablesMaster.length === 0 ? (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                      Esta fase no tiene trazables definidos (mock).
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {traceablesMaster.map((t) => {
                        const r = traceables?.[t.code] || {};
                        const nc = ncByTraceable[t.code] || [];
                        const validated = !!r.validatedAt;
                        return (
                          <div key={t.code} className="rounded-2xl border border-zinc-200 bg-white p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold">{t.name}</div>
                                <div className="mt-1 text-xs text-zinc-500">Código: {t.code}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge tone={t.required ? "warn" : "neutral"}>{t.required ? "Requerido" : "Opcional"}</Badge>
                                <Badge tone={validated ? "ok" : "warn"}>{validated ? "Validado" : "Pendiente"}</Badge>
                                <Button variant="subtle" onClick={() => openIncidentForTraceable(t.code)}>Abrir incidencia</Button>
                              </div>
                            </div>

                            <div className="mt-3 grid gap-2 sm:grid-cols-3">
                              <Input
                                label="Serial"
                                value={r.serial || ""}
                                onChange={(e) =>
                                  store.dispatch({
                                    type: "SET_TRACEABLE",
                                    phaseTxId: phase.id,
                                    traceableCode: t.code,
                                    patch: { serial: e.target.value, validatedAt: null },
                                  })
                                }
                                placeholder="Ej. SER-ROD-777"
                              />
                              <div className="flex items-end">
                                <Button
                                  className="w-full"
                                  variant="subtle"
                                  onClick={() => validateTraceable(t.code)}
                                  disabled={validatingCode === t.code}
                                >
                                  {validatingCode === t.code ? "Validando…" : "Validar"}
                                </Button>
                              </div>
                              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                                <div className="text-xs font-medium text-zinc-700">Última validación</div>
                                <div className="mt-1 text-xs text-zinc-600">
                                  {r.validatedAt ? new Date(r.validatedAt).toLocaleString() : "-"}
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                              <div className="text-xs font-semibold text-zinc-700">NC / Observaciones</div>
                              <div className="mt-2">
                                {nc.length === 0 ? (
                                  <div className="text-sm text-zinc-600">Sin NC/observaciones (mock) para este serial.</div>
                                ) : (
                                  <div className="grid gap-2">
                                    {nc.map((x, i) => (
                                      <div key={i} className="rounded-xl border border-zinc-200 bg-white p-3">
                                        <div className="flex items-center justify-between">
                                          <div className="text-sm font-medium">{x.type}</div>
                                          <div className="text-xs text-zinc-500">{x.createdAt}</div>
                                        </div>
                                        <div className="mt-1 text-sm text-zinc-700">{x.text}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      <div className="flex justify-end gap-2">
                        <Button variant="subtle" onClick={savePartial}>Guardar parcial</Button>
                        <Button onClick={finalize}>Finalizar fase</Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardBody>
          </Card>
        )}

        <Modal
          open={modalOpen}
          title="Abrir incidencia"
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <Button variant="subtle" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button
                onClick={() => {
                  const id = `inc_${Date.now()}`;
                  store.dispatch({
                    type: "ADD_INCIDENT",
                    incident: {
                      id,
                      phaseTxId: phase.id,
                      scope: incScope,
                      questionId: incQuestionId,
                      traceableCode: incTraceableCode,
                      description: incText,
                      status: "OPEN",
                      evidenceNames: incFile ? [incFile] : [],
                      createdAt: new Date().toISOString(),
                    },
                  });
                  setModalOpen(false);
                  setToast("Incidencia creada (mock)");
                  setTimeout(() => setToast(""), 1600);
                }}
                disabled={!incText.trim()}
              >
                Crear
              </Button>
            </>
          }
        >
          <div className="grid gap-3">
            <div className="text-xs text-zinc-500">
              Alcance: <b>{incScope === "FORM" ? "Entregable" : "Elemento trazable"}</b>
            </div>
            <Textarea
              label="Descripción"
              rows={4}
              value={incText}
              onChange={(e) => setIncText(e.target.value)}
              placeholder="Describe la incidencia…"
            />
            <Input
              label="Adjunto (mock)"
              value={incFile}
              onChange={(e) => setIncFile(e.target.value)}
              placeholder="nombre_archivo.ext"
            />
            <div className="text-xs text-zinc-500">Mock: no se suben archivos reales en este preview.</div>
          </div>
        </Modal>
      </div>
    </OperarioGuard>
  );
}

function AnswerInput({ q, value, onChange }) {
  if (q.answerType === "TEXT") {
    return (
      <Input
        value={value.valueText || ""}
        onChange={(e) => onChange({ valueText: e.target.value })}
        placeholder="Texto…"
      />
    );
  }

  if (q.answerType === "NUMBER") {
    return (
      <Input
        type="number"
        value={value.valueNumber ?? ""}
        onChange={(e) => onChange({ valueNumber: e.target.value === "" ? null : Number(e.target.value) })}
        placeholder="0"
      />
    );
  }

  if (q.answerType === "NUMBER_LIMITS") {
    const min = q.minValue ?? 0;
    const max = q.maxValue ?? 0;
    const val = value.valueNumber;
    const inRange = val == null ? null : val >= min && val <= max;
    return (
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-zinc-500">Rango: {min} – {max}</div>
          {val == null ? (
            <Badge tone="neutral">Sin valor</Badge>
          ) : inRange ? (
            <Badge tone="ok">Dentro</Badge>
          ) : (
            <Badge tone="warn">Fuera</Badge>
          )}
        </div>
        <Input
          label="Valor"
          type="number"
          value={val ?? ""}
          onChange={(e) => onChange({ valueNumber: e.target.value === "" ? null : Number(e.target.value) })}
          placeholder={`mín ${min} · máx ${max}`}
        />
      </div>
    );
  }

  if (q.answerType === "OPTION") {
    return (
      <Select value={value.valueOption || ""} onChange={(e) => onChange({ valueOption: e.target.value })}>
        <option value="">Selecciona…</option>
        {(q.options || []).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    );
  }

  if (q.answerType === "FILE") {
    return (
      <Input
        value={value.evidenceName || ""}
        onChange={(e) => onChange({ evidenceName: e.target.value })}
        placeholder="Archivo (mock)"
      />
    );
  }

  if (q.answerType === "IMAGE") {
    return (
      <Input
        value={value.evidenceName || ""}
        onChange={(e) => onChange({ evidenceName: e.target.value })}
        placeholder="Imagen (mock)"
      />
    );
  }

  // Nota: evitamos el carácter "—" como placeholder porque algunos parsers lo interpretan mal en JSX.
  return <Input placeholder="-" disabled />;
}
