import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// ── Config API ──────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function apiFetch(url) {
  const res = await fetch(url, { headers: authHeaders() });
  if (res.status === 401) {
    localStorage.clear();
    window.location.href = "/login";
    return null;
  }
  const data = await res.json();
  if (!data.ok) throw new Error(data.mensaje || "Error del servidor");
  return data;
}

// ── Helpers ─────────────────────────────────────────────────
const BAR_COLOR = {
  BCG: "#1d4ed8",
  "Polio Inyectable (IPV)": "#2563eb",
  "Polio Oral": "#3b82f6",
  Pentavalente: "#1e40af",
  "Hepatitis B": "#60a5fa",
  SRP: "#1e3a8a",
  "Fiebre Amarilla": "#93c5fd",
  Toxoide: "#172554",
};

const COLORES_GRAFICOS = [
  "#1d4ed8",
  "#2563eb",
  "#3b82f6",
  "#1e40af",
  "#60a5fa",
  "#1e3a8a",
  "#93c5fd",
  "#172554",
  "#0ea5e9",
  "#0284c7",
];

function formatFecha(f) {
  if (!f) return "—";
  const parte = String(f).split("T")[0];
  const [y, m, d] = parte.split("-");
  return `${d}/${m}/${y}`;
}

function formatFechaCortaISO(iso) {
  if (!iso) return "";
  const parte = String(iso).split("T")[0];
  const [, m, d] = parte.split("-");
  return `${d}/${m}`;
}

function lunesDeLaSemana(fecha = new Date()) {
  const d = new Date(fecha);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoDate(d) {
  return d.toISOString().split("T")[0];
}

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const POR_PAGINA = 10;

// ── Helper: hex "#1d4ed8" → [29, 78, 216] ──────────────────
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

// ── Helper: header compacto para páginas interiores ─────────
function _headerCompacto(
  doc,
  W,
  AZUL_OSCURO,
  AZUL_MED,
  AZUL_CLARO,
  BLANCO,
  TEXTO_GRIS,
  labelMes,
) {
  doc.setFillColor(...AZUL_OSCURO);
  doc.rect(0, 0, W, 18, "F");
  doc.setFillColor(...AZUL_MED);
  doc.triangle(W - 40, 0, W, 0, W, 18, "F");
  doc.setTextColor(...BLANCO);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("REPORTE DE VACUNACIÓN · ASIC Dr. Tulio Pineda", 12, 11);
  doc.setTextColor(...AZUL_CLARO);
  doc.setFontSize(7);
  doc.text(labelMes.toUpperCase(), 12, 16);
}
const logo = new Image();
logo.src = "/logo-t.png"; // archivo dentro de public

logo.onload = () => {
  generarPDF(logo);
};
// ═══════════════════════════════════════════════════════════
// ── PDF VACUNAS ─────────────────────────────────────────────
//   • Logo plataforma (jeringa vectorial) en lugar de cruz
//   • Sin gráficas — sólo texto y tablas
//   • Sin sección "Comparativa semanal del mes"
//   • Distribución por vacuna con detalle de vacunador
// ═══════════════════════════════════════════════════════════
function generarPDFVacunas({
  datosVac,
  porDia,
  resumenSemana,
  // resumenMes  ← eliminado
  labelMes,
  mesVac,
  totalDosisVac,
  totalPacientesVac,
  porVacunador, // [{ vacuna, vacunador, dosis, pacientes }]
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210,
    H = 297;

  // ── Paleta ──────────────────────────────────────────────
  const AZUL_OSCURO = [10, 36, 99];
  const AZUL_MED = [29, 78, 216];
  const AZUL_CLARO = [96, 165, 250];
  const BLANCO = [255, 255, 255];
  const GRIS_CLARO = [245, 247, 252];
  const TEXTO_OSCURO = [15, 23, 42];
  const TEXTO_GRIS = [100, 116, 139];
  const VERDE = [22, 163, 74];

  // ── Logotipo de la plataforma (jeringa vectorial) ────────
  function dibujarLogo(x, y, size, logo) {
  doc.setFillColor(...AZUL_MED);
  doc.roundedRect(x, y, size, size, 3, 3, "F");

  doc.addImage(
    logo,
    "PNG",
    x + 2,
    y + 2,
    size - 4,
    size - 4
  );
}
  // ════════════════════════════════════════════════════════
  // PÁGINA 1 — PORTADA + KPIs + DISTRIBUCIÓN POR VACUNA
  // ════════════════════════════════════════════════════════

  // Banda principal del header
  doc.setFillColor(...AZUL_OSCURO);
  doc.rect(0, 0, W, 62, "F");
  doc.setFillColor(...AZUL_MED);
  doc.triangle(W - 60, 0, W, 0, W, 62, "F");
  doc.setFillColor(...AZUL_CLARO);
  doc.triangle(W - 30, 0, W, 0, W, 30, "F");

  // Logotipo (jeringa)
  dibujarLogo(12, 10, 18);

  // Nombre de la plataforma (junto al logo)
  doc.setTextColor(...BLANCO);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("VACUNACIÓN ASIC", 34, 17);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...AZUL_CLARO);
  doc.text("Dr. Tulio Pineda · Municipio Juan Germán Roscio", 34, 22);

  // Título principal
  doc.setTextColor(...BLANCO);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("REPORTE DE VACUNACIÓN", 34, 34);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Período: ${labelMes.toUpperCase()}`, 34, 44);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 200, 240);
  doc.text(
    `Generado: ${new Date().toLocaleDateString("es-VE", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    })}`,
    34,
    52,
  );

  // Línea decorativa
  doc.setDrawColor(...AZUL_CLARO);
  doc.setLineWidth(0.8);
  doc.line(12, 58, 100, 58);
  doc.setDrawColor(...AZUL_MED);
  doc.setLineWidth(0.3);
  doc.line(100, 58, 198, 58);

  // ── KPIs (3 tarjetas) ──────────────────────────────────
  const kpis = [
    {
      label: "Dosis aplicadas",
      valor: totalDosisVac,
      sub: "en el mes",
      color: AZUL_MED,
    },
    {
      label: "Pacientes",
      valor: totalPacientesVac,
      sub: "atendidos",
      color: [6, 148, 162],
    },
    {
      label: "Tipos de vacuna",
      valor: datosVac.length,
      sub: "diferentes",
      color: [124, 58, 237],
    },
  ];

  let curY = 68;
  const kpiW = 56,
    kpiH = 24,
    kpiX0 = 12,
    gap = 4;

  kpis.forEach((k, i) => {
    const x = kpiX0 + i * (kpiW + gap);
    doc.setFillColor(200, 210, 235);
    doc.roundedRect(x + 0.5, curY + 0.5, kpiW, kpiH, 3, 3, "F");
    doc.setFillColor(...BLANCO);
    doc.roundedRect(x, curY, kpiW, kpiH, 3, 3, "F");
    doc.setFillColor(...k.color);
    doc.roundedRect(x, curY, 3, kpiH, 1.5, 1.5, "F");
    doc.setTextColor(...TEXTO_OSCURO);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(String(k.valor), x + 8, curY + 14);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...k.color);
    doc.text(k.label.toUpperCase(), x + 8, curY + 19);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXTO_GRIS);
    doc.text(k.sub, x + 8, curY + 23);
  });

  curY += kpiH + 10;

  // ── Sección: Distribución detallada por vacuna + vacunador ─
  doc.setFillColor(...GRIS_CLARO);
  doc.roundedRect(12, curY, 186, 7, 2, 2, "F");
  doc.setFillColor(...AZUL_MED);
  doc.roundedRect(12, curY, 3, 7, 1, 1, "F");
  doc.setTextColor(...TEXTO_OSCURO);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("DISTRIBUCIÓN DETALLADA POR VACUNA Y VACUNADOR", 18, curY + 4.8);
  curY += 11;

  // Cabecera de tabla
  function dibujarCabeceraTablaVacuna() {
    doc.setFillColor(...AZUL_OSCURO);
    doc.roundedRect(12, curY, 186, 7, 2, 2, "F");
    doc.setTextColor(...BLANCO);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.text("VACUNA / VACUNADOR", 16, curY + 4.8);
    doc.text("DOSIS", 92, curY + 4.8);
    doc.text("PACIENTES", 112, curY + 4.8);
    doc.text("% TOTAL", 136, curY + 4.8);
    doc.text("% SOBRE VACUNA", 158, curY + 4.8);
  }

  dibujarCabeceraTablaVacuna();
  curY += 7;

  datosVac.forEach((r, idx) => {
    const ROW_H = 8.5;
    const SUB_H = 7;
    const vacunadores = (porVacunador || []).filter(
      (v) => v.vacuna === r.vacuna,
    );
    const col = COLORES_GRAFICOS[idx % COLORES_GRAFICOS.length];
    const bg = idx % 2 === 0 ? BLANCO : GRIS_CLARO;

    // Salto de página preventivo
    const alturaBloque = ROW_H + vacunadores.length * SUB_H + 2;
    if (curY + alturaBloque > H - 18) {
      doc.addPage();
      _headerCompacto(
        doc,
        W,
        AZUL_OSCURO,
        AZUL_MED,
        AZUL_CLARO,
        BLANCO,
        TEXTO_GRIS,
        labelMes,
      );
      curY = 26;
      dibujarCabeceraTablaVacuna();
      curY += 7;
    }

    // ── Fila principal de la vacuna ──
    doc.setFillColor(...bg);
    doc.rect(12, curY, 186, ROW_H, "F");

    // Dot de color
    doc.setFillColor(...hexToRgb(col));
    doc.circle(15.5, curY + ROW_H / 2, 1.8, "F");

    // Nombre vacuna (bold)
    doc.setTextColor(...TEXTO_OSCURO);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    const nv = r.vacuna.length > 26 ? r.vacuna.slice(0, 24) + "…" : r.vacuna;
    doc.text(nv, 18, curY + 5.6);

    // Dosis (en color de vacuna)
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hexToRgb(col));
    doc.setFontSize(8);
    doc.text(String(r.dosis), 92, curY + 5.6);

    // Pacientes
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXTO_OSCURO);
    doc.setFontSize(7.5);
    doc.text(String(r.pacientes), 112, curY + 5.6);

    // % del total general
    const pct =
      totalDosisVac > 0 ? ((r.dosis / totalDosisVac) * 100).toFixed(1) : "0.0";
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEXTO_OSCURO);
    doc.text(`${pct}%`, 136, curY + 5.6);

    // % sobre vacuna: 100% (es la fila de totales)
    doc.setTextColor(...TEXTO_GRIS);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text("100%", 158, curY + 5.6);

    // Sub-label "vacunadores"
    if (vacunadores.length > 0) {
      doc.setTextColor(...TEXTO_GRIS);
      doc.setFontSize(6);
      doc.setFont("helvetica", "italic");
      doc.text(
        `${vacunadores.length} vacunador${vacunadores.length > 1 ? "es" : ""}`,
        18,
        curY + ROW_H - 1,
      );
    }

    curY += ROW_H;

    // ── Sub-filas por vacunador ──
    vacunadores.forEach((vEntry, vi) => {
      if (curY + SUB_H > H - 18) {
        doc.addPage();
        _headerCompacto(
          doc,
          W,
          AZUL_OSCURO,
          AZUL_MED,
          AZUL_CLARO,
          BLANCO,
          TEXTO_GRIS,
          labelMes,
        );
        curY = 26;
        dibujarCabeceraTablaVacuna();
        curY += 7;
      }

      // Fondo levemente distinto para sub-filas
      doc.setFillColor(232, 238, 255);
      doc.rect(12, curY, 186, SUB_H, "F");

      // Línea vertical de sangría (color de la vacuna)
      doc.setFillColor(...hexToRgb(col));
      doc.rect(19, curY, 1.2, SUB_H, "F");

      // Ícono de persona (simple punto + flecha)
      doc.setFillColor(...TEXTO_GRIS);
      doc.circle(23.5, curY + SUB_H / 2 - 0.5, 1, "F");

      // Nombre del vacunador
      doc.setTextColor(...TEXTO_OSCURO);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      const vNombre =
        (vEntry.vacunador || "Sin asignar").length > 30
          ? (vEntry.vacunador || "Sin asignar").slice(0, 28) + "…"
          : vEntry.vacunador || "Sin asignar";
      doc.text(`  ${vNombre}`, 25, curY + 4.5);

      // Dosis del vacunador
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...hexToRgb(col));
      doc.setFontSize(7);
      doc.text(String(vEntry.dosis), 92, curY + 4.5);

      // Pacientes del vacunador
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...TEXTO_OSCURO);
      doc.text(String(vEntry.pacientes ?? "—"), 112, curY + 4.5);

      // % del total general
      const subPctTotal =
        totalDosisVac > 0
          ? ((vEntry.dosis / totalDosisVac) * 100).toFixed(1)
          : "0.0";
      doc.setFontSize(6.5);
      doc.setTextColor(...TEXTO_GRIS);
      doc.text(`${subPctTotal}%`, 136, curY + 4.5);

      // % sobre la vacuna
      const subPctVacuna =
        r.dosis > 0 ? ((vEntry.dosis / r.dosis) * 100).toFixed(1) : "0.0";
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...hexToRgb(col));
      doc.text(`${subPctVacuna}%`, 158, curY + 4.5);

      curY += SUB_H;
    });

    // Separador sutil entre vacunas
    doc.setDrawColor(...[220, 226, 240]);
    doc.setLineWidth(0.2);
    doc.line(12, curY, 198, curY);
  });

  // Fila de total general
  if (curY + 8 > H - 18) {
    doc.addPage();
    _headerCompacto(
      doc,
      W,
      AZUL_OSCURO,
      AZUL_MED,
      AZUL_CLARO,
      BLANCO,
      TEXTO_GRIS,
      labelMes,
    );
    curY = 26;
  }
  doc.setFillColor(...AZUL_OSCURO);
  doc.rect(12, curY, 186, 8, "F");
  doc.setTextColor(...BLANCO);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL GENERAL", 16, curY + 5.2);
  doc.text(String(totalDosisVac), 92, curY + 5.2);
  doc.text(String(totalPacientesVac), 112, curY + 5.2);
  doc.text("100%", 136, curY + 5.2);
  curY += 8;

  // ════════════════════════════════════════════════════════
  // PÁGINA 2 — RESUMEN SEMANAL (solo texto, sin gráfica)
  // ════════════════════════════════════════════════════════
  doc.addPage();
  _headerCompacto(
    doc,
    W,
    AZUL_OSCURO,
    AZUL_MED,
    AZUL_CLARO,
    BLANCO,
    TEXTO_GRIS,
    labelMes,
  );
  curY = 26;

  // Encabezado de sección
  doc.setFillColor(...GRIS_CLARO);
  doc.roundedRect(12, curY, 186, 7, 2, 2, "F");
  doc.setFillColor(22, 163, 74);
  doc.roundedRect(12, curY, 3, 7, 1, 1, "F");
  doc.setTextColor(...TEXTO_OSCURO);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("RESUMEN DE LA SEMANA ACTUAL", 18, curY + 4.8);
  curY += 11;

  if (resumenSemana) {
    // KPIs de semana
    const skpis = [
      {
        label: "Dosis semana",
        valor: resumenSemana.totalDosis,
        color: AZUL_MED,
      },
      {
        label: "Pacientes",
        valor: resumenSemana.totalPacientes,
        color: [6, 148, 162],
      },
      {
        label: "Días con vacunas",
        valor: resumenSemana.diasConDatos,
        color: [124, 58, 237],
      },
      {
        label: "Prom. diario",
        valor: resumenSemana.promedioDiario,
        color: [245, 158, 11],
      },
    ];

    const sw = 43,
      sh = 20,
      sx0 = 12,
      sgap = 3;
    skpis.forEach((k, i) => {
      const x = sx0 + i * (sw + sgap);
      doc.setFillColor(200, 210, 235);
      doc.roundedRect(x + 0.5, curY + 0.5, sw, sh, 3, 3, "F");
      doc.setFillColor(...BLANCO);
      doc.roundedRect(x, curY, sw, sh, 3, 3, "F");
      doc.setFillColor(...k.color);
      doc.roundedRect(x, curY, 3, sh, 1.5, 1.5, "F");
      doc.setTextColor(...TEXTO_OSCURO);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(String(k.valor), x + 7, curY + 12);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...k.color);
      doc.text(k.label.toUpperCase(), x + 7, curY + 17);
    });
    curY += sh + 10;

    // Tabla día a día
    doc.setFillColor(...AZUL_OSCURO);
    doc.roundedRect(12, curY, 186, 7, 2, 2, "F");
    doc.setTextColor(...BLANCO);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("DÍA", 16, curY + 4.8);
    doc.text("FECHA", 50, curY + 4.8);
    doc.text("DOSIS", 90, curY + 4.8);
    doc.text("PACIENTES", 120, curY + 4.8);
    doc.text("ESTADO", 158, curY + 4.8);
    curY += 7;

    (resumenSemana.porDia || []).forEach((dia, idx) => {
      const rH = 8;
      doc.setFillColor(...(idx % 2 === 0 ? BLANCO : GRIS_CLARO));
      doc.rect(12, curY, 186, rH, "F");

      doc.setTextColor(...TEXTO_OSCURO);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.text(dia.nombre, 16, curY + 5.2);

      doc.setFont("helvetica", "normal");
      doc.text(formatFecha(dia.fecha), 50, curY + 5.2);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(...AZUL_MED);
      doc.text(String(dia.dosis), 90, curY + 5.2);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...TEXTO_OSCURO);
      doc.text(String(dia.pacientes), 120, curY + 5.2);

      if (dia.dosis > 0) {
        doc.setFillColor(220, 252, 231);
        doc.roundedRect(154, curY + 1.5, 22, 5, 1.5, 1.5, "F");
        doc.setTextColor(...VERDE);
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        doc.text("ACTIVO", 165, curY + 5.2, { align: "center" });
      } else {
        doc.setFillColor(240, 240, 245);
        doc.roundedRect(154, curY + 1.5, 22, 5, 1.5, 1.5, "F");
        doc.setTextColor(...TEXTO_GRIS);
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        doc.text("SIN DATOS", 165, curY + 5.2, { align: "center" });
      }
      curY += rH;
    });

    // Nota de resumen (reemplaza la gráfica)
    curY += 6;
    doc.setFillColor(...GRIS_CLARO);
    doc.roundedRect(12, curY, 186, 10, 2, 2, "F");
    doc.setDrawColor(...AZUL_CLARO);
    doc.setLineWidth(0.3);
    doc.roundedRect(12, curY, 186, 10, 2, 2, "S");
    doc.setTextColor(...TEXTO_GRIS);
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    const desdeSem = resumenSemana.porDia?.[0]?.fecha;
    const hastaSem = resumenSemana.porDia?.[6]?.fecha;
    doc.text(
      `Semana del ${formatFecha(desdeSem)} al ${formatFecha(hastaSem)}  ·  Total: ${resumenSemana.totalDosis} dosis  ·  Días activos: ${resumenSemana.diasConDatos}  ·  Promedio: ${resumenSemana.promedioDiario} dosis/día`,
      18,
      curY + 6.5,
    );
    curY += 16;
  }

  // ── Pie de página en todas las páginas ──────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...AZUL_MED);
    doc.setLineWidth(0.5);
    doc.line(12, H - 12, W - 12, H - 12);
    doc.setFillColor(...AZUL_MED);
    doc.circle(12, H - 12, 0.8, "F");
    doc.circle(W - 12, H - 12, 0.8, "F");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXTO_GRIS);
    doc.text("Sistema de Vacunación — ASIC Dr. Tulio Pineda", 12, H - 7);
    doc.setTextColor(...AZUL_MED);
    doc.setFont("helvetica", "bold");
    doc.text(`${p} / ${totalPages}`, W - 12, H - 7, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXTO_GRIS);
    doc.text(new Date().toLocaleDateString("es-VE"), W / 2, H - 7, {
      align: "center",
    });
  }

  doc.save(`reporte_vacunas_${mesVac}.pdf`);
}

// ── PDF INVENTARIO (sin cambios) ────────────────────────────
function generarPDFInventario({ datosInv, resumenInv, periodoInv, porVacuna }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210,
    H = 297;

  const AZUL_OSCURO = [10, 36, 99];
  const AZUL_MED = [29, 78, 216];
  const AZUL_CLARO = [96, 165, 250];
  const BLANCO = [255, 255, 255];
  const GRIS_CLARO = [245, 247, 252];
  const TEXTO_OSCURO = [15, 23, 42];
  const TEXTO_GRIS = [100, 116, 139];
  const VERDE = [22, 163, 74];
  const ROJO = [220, 38, 38];

  const periodoLabel =
    periodoInv === "mes"
      ? "ÚLTIMO MES"
      : periodoInv === "3meses"
        ? "ÚLTIMOS 3 MESES"
        : "TODOS LOS PERÍODOS";

  doc.setFillColor(...AZUL_OSCURO);
  doc.rect(0, 0, W, 58, "F");
  doc.setFillColor(...AZUL_MED);
  doc.triangle(W - 60, 0, W, 0, W, 58, "F");
  doc.setFillColor(...AZUL_CLARO);
  doc.triangle(W - 30, 0, W, 0, W, 30, "F");

  // Ícono inventario (listas)
  doc.setFillColor(...AZUL_MED);
  doc.roundedRect(12, 10, 18, 18, 3, 3, "F");
  doc.setFillColor(...BLANCO);
  doc.rect(15, 13, 12, 2.5, "F");
  doc.rect(15, 17, 12, 2.5, "F");
  doc.rect(15, 21, 12, 2.5, "F");

  doc.setTextColor(...BLANCO);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("REPORTE DE INVENTARIO", 34, 22);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...AZUL_CLARO);
  doc.text("ASIC Dr. Tulio Pineda · Municipio Juan Germán Roscio", 34, 29);
  doc.setTextColor(...BLANCO);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Período: ${periodoLabel}`, 34, 38);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 200, 240);
  doc.text(
    `Generado: ${new Date().toLocaleDateString("es-VE", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    })}`,
    34,
    45,
  );
  doc.setDrawColor(...AZUL_CLARO);
  doc.setLineWidth(0.8);
  doc.line(12, 53, 100, 53);
  doc.setDrawColor(...AZUL_MED);
  doc.setLineWidth(0.3);
  doc.line(100, 53, 198, 53);

  const { entradas, salidas, balance } = resumenInv;
  const kpis = [
    { label: "Dosis ingresadas", valor: `+${entradas}`, color: [22, 163, 74] },
    { label: "Dosis consumidas", valor: `-${salidas}`, color: [220, 38, 38] },
    {
      label: "Balance neto",
      valor: `${balance >= 0 ? "+" : ""}${balance}`,
      color: balance >= 0 ? [22, 163, 74] : [220, 38, 38],
    },
  ];

  let curY = 63;
  const kpiW = 56,
    kpiH = 24,
    kpiX0 = 12,
    gap = 4;
  kpis.forEach((k, i) => {
    const x = kpiX0 + i * (kpiW + gap);
    doc.setFillColor(200, 210, 235);
    doc.roundedRect(x + 0.5, curY + 0.5, kpiW, kpiH, 3, 3, "F");
    doc.setFillColor(...BLANCO);
    doc.roundedRect(x, curY, kpiW, kpiH, 3, 3, "F");
    doc.setFillColor(...k.color);
    doc.roundedRect(x, curY, 3, kpiH, 1.5, 1.5, "F");
    doc.setTextColor(...TEXTO_OSCURO);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(String(k.valor), x + 8, curY + 14);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...k.color);
    doc.text(k.label.toUpperCase(), x + 8, curY + 19);
  });
  curY += kpiH + 10;

  if (porVacuna && porVacuna.length > 0) {
    doc.setFillColor(...GRIS_CLARO);
    doc.roundedRect(12, curY, 186, 7, 2, 2, "F");
    doc.setFillColor(...AZUL_MED);
    doc.roundedRect(12, curY, 3, 7, 1, 1, "F");
    doc.setTextColor(...TEXTO_OSCURO);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text("BALANCE POR TIPO DE VACUNA", 18, curY + 4.8);
    curY += 11;

    doc.setFillColor(...AZUL_OSCURO);
    doc.roundedRect(12, curY, 186, 7, 2, 2, "F");
    doc.setTextColor(...BLANCO);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("VACUNA", 16, curY + 4.8);
    doc.text("ENTRADAS", 100, curY + 4.8);
    doc.text("SALIDAS", 135, curY + 4.8);
    doc.text("BALANCE", 168, curY + 4.8);
    curY += 7;

    const vacunaMap = {};
    porVacuna.forEach((r) => {
      if (!vacunaMap[r.vacuna])
        vacunaMap[r.vacuna] = { entradas: 0, salidas: 0 };
      if (r.tipo === "entrada") vacunaMap[r.vacuna].entradas += r.cantidad;
      else vacunaMap[r.vacuna].salidas += r.cantidad;
    });

    Object.entries(vacunaMap).forEach(([nombre, v], idx) => {
      const bal = v.entradas - v.salidas;
      const rH = 8;
      doc.setFillColor(...(idx % 2 === 0 ? BLANCO : GRIS_CLARO));
      doc.rect(12, curY, 186, rH, "F");
      doc.setTextColor(...TEXTO_OSCURO);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      const n = nombre.length > 26 ? nombre.slice(0, 24) + "…" : nombre;
      doc.text(n, 16, curY + 5.2);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...VERDE);
      doc.text(`+${v.entradas}`, 100, curY + 5.2);
      doc.setTextColor(...ROJO);
      doc.text(`-${v.salidas}`, 135, curY + 5.2);
      doc.setTextColor(
        bal >= 0 ? VERDE[0] : ROJO[0],
        bal >= 0 ? VERDE[1] : ROJO[1],
        bal >= 0 ? VERDE[2] : ROJO[2],
      );
      doc.text(`${bal >= 0 ? "+" : ""}${bal}`, 168, curY + 5.2);
      curY += rH;
    });
    curY += 6;
  }

  if (curY + 20 > H - 15) {
    doc.addPage();
    doc.setFillColor(...AZUL_OSCURO);
    doc.rect(0, 0, W, 18, "F");
    doc.setFillColor(...AZUL_MED);
    doc.triangle(W - 40, 0, W, 0, W, 18, "F");
    doc.setTextColor(...BLANCO);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("REPORTE DE INVENTARIO · ASIC Dr. Tulio Pineda", 12, 11);
    curY = 26;
  }

  doc.setFillColor(...GRIS_CLARO);
  doc.roundedRect(12, curY, 186, 7, 2, 2, "F");
  doc.setFillColor(...AZUL_MED);
  doc.roundedRect(12, curY, 3, 7, 1, 1, "F");
  doc.setTextColor(...TEXTO_OSCURO);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("DETALLE DE MOVIMIENTOS", 18, curY + 4.8);
  curY += 11;

  doc.setFillColor(...AZUL_OSCURO);
  doc.roundedRect(12, curY, 186, 7, 2, 2, "F");
  doc.setTextColor(...BLANCO);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.text("VACUNA", 16, curY + 4.8);
  doc.text("TIPO", 78, curY + 4.8);
  doc.text("CANTIDAD", 102, curY + 4.8);
  doc.text("LOTE", 130, curY + 4.8);
  doc.text("VENCIMIENTO", 158, curY + 4.8);
  doc.text("FECHA MOV.", 185, curY + 4.8, { align: "right" });
  curY += 7;

  datosInv.forEach((r, idx) => {
    if (curY + 9 > H - 15) {
      doc.addPage();
      doc.setFillColor(...AZUL_OSCURO);
      doc.rect(0, 0, W, 18, "F");
      doc.setFillColor(...AZUL_MED);
      doc.triangle(W - 40, 0, W, 0, W, 18, "F");
      doc.setTextColor(...BLANCO);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("REPORTE DE INVENTARIO · ASIC Dr. Tulio Pineda", 12, 11);
      curY = 26;
      doc.setFillColor(...AZUL_OSCURO);
      doc.roundedRect(12, curY, 186, 7, 2, 2, "F");
      doc.setTextColor(...BLANCO);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.text("VACUNA", 16, curY + 4.8);
      doc.text("TIPO", 78, curY + 4.8);
      doc.text("CANTIDAD", 102, curY + 4.8);
      doc.text("LOTE", 130, curY + 4.8);
      doc.text("VENCIMIENTO", 158, curY + 4.8);
      doc.text("FECHA MOV.", 185, curY + 4.8, { align: "right" });
      curY += 7;
    }

    const rH = 8;
    doc.setFillColor(...(idx % 2 === 0 ? BLANCO : GRIS_CLARO));
    doc.rect(12, curY, 186, rH, "F");
    doc.setTextColor(...TEXTO_OSCURO);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    const n = r.vacuna.length > 20 ? r.vacuna.slice(0, 18) + "…" : r.vacuna;
    doc.text(n, 16, curY + 5.2);

    const esEntrada = r.tipo === "entrada";
    doc.setFillColor(...(esEntrada ? [220, 252, 231] : [254, 226, 226]));
    doc.roundedRect(74, curY + 1.5, 20, 5, 1.5, 1.5, "F");
    doc.setTextColor(...(esEntrada ? VERDE : ROJO));
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.text(esEntrada ? "↑ ENTRADA" : "↓ SALIDA", 84, curY + 5.2, {
      align: "center",
    });

    doc.setFont("helvetica", "bold");
    doc.setTextColor(
      esEntrada ? VERDE[0] : ROJO[0],
      esEntrada ? VERDE[1] : ROJO[1],
      esEntrada ? VERDE[2] : ROJO[2],
    );
    doc.setFontSize(7);
    doc.text(`${esEntrada ? "+" : "-"}${r.cantidad}`, 102, curY + 5.2);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXTO_GRIS);
    doc.setFontSize(6.5);
    doc.text(r.lote || "—", 130, curY + 5.2);
    doc.text(r.vencimiento ? formatFecha(r.vencimiento) : "—", 158, curY + 5.2);
    doc.text(formatFecha(r.fecha), 185, curY + 5.2, { align: "right" });
    curY += rH;
  });

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...AZUL_MED);
    doc.setLineWidth(0.5);
    doc.line(12, H - 12, W - 12, H - 12);
    doc.setFillColor(...AZUL_MED);
    doc.circle(12, H - 12, 0.8, "F");
    doc.circle(W - 12, H - 12, 0.8, "F");
    doc.setFontSize(6.5);
    doc.setTextColor(...TEXTO_GRIS);
    doc.setFont("helvetica", "normal");
    doc.text("Sistema de Vacunación — ASIC Dr. Tulio Pineda", 12, H - 7);
    doc.setTextColor(...AZUL_MED);
    doc.setFont("helvetica", "bold");
    doc.text(`${p} / ${totalPages}`, W - 12, H - 7, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXTO_GRIS);
    doc.text(new Date().toLocaleDateString("es-VE"), W / 2, H - 7, {
      align: "center",
    });
  }

  doc.save(`reporte_inventario_${new Date().toISOString().split("T")[0]}.pdf`);
}

// ═══════════════════════════════════════════════════════════
// ── COMPONENTE PRINCIPAL ────────────────────────────────────
// ═══════════════════════════════════════════════════════════
export default function Reportes() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tab, setTab] = useState("vacunas");

  const [mesesDisponibles, setMesesDisponibles] = useState([]);
  const [tiposVacuna, setTiposVacuna] = useState([]);

  // — Tab Vacunas —
  const [mesVac, setMesVac] = useState("");
  const [filtroVac, setFiltroVac] = useState("");
  const [datosVac, setDatosVac] = useState([]);
  const [porDiaMes, setPorDiaMes] = useState([]);
  const [porVacunadorVac, setPorVacunadorVac] = useState([]); // NUEVO
  const [resumenSemana, setResumenSemana] = useState(null);
  const [resumenMes, setResumenMes] = useState(null);
  const [cargandoVac, setCargandoVac] = useState(false);
  const [errorVac, setErrorVac] = useState("");

  // — Tab Inventario —
  const [periodoInv, setPeriodoInv] = useState("mes");
  const [filtroInvVac, setFiltroInvVac] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [datosInv, setDatosInv] = useState([]);
  const [porVacunaInv, setPorVacunaInv] = useState([]);
  const [resumenInv, setResumenInv] = useState({
    entradas: 0,
    salidas: 0,
    balance: 0,
  });
  const [cargandoInv, setCargandoInv] = useState(false);
  const [errorInv, setErrorInv] = useState("");

  // Paginación
  const [paginaVac, setPaginaVac] = useState(1);
  const [paginaInv, setPaginaInv] = useState(1);

  // ── Auth ────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    const u = localStorage.getItem("usuario");
    if (!token || !u) {
      navigate("/login");
      return;
    }
    setUsuario(JSON.parse(u));
  }, [navigate]);

  useEffect(() => {
    const fn = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(false);
    };
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  // ── Carga de meses disponibles ──────────────────────────
  useEffect(() => {
    apiFetch(`${API}/api/reportes/meses`)
      .then((d) => {
        if (!d) return;
        setMesesDisponibles(d.meses);
        if (d.meses.length > 0) setMesVac(d.meses[0].value);
      })
      .catch(() => setErrorVac("No se pudieron cargar los meses disponibles."));
  }, []);

  // ── Fetch vacunas ───────────────────────────────────────
  const fetchVacunas = useCallback(async () => {
    if (!mesVac) return;
    setCargandoVac(true);
    setErrorVac("");
    try {
      const [anio, mes] = mesVac.split("-");
      const params = new URLSearchParams({ anio, mes });
      if (filtroVac) params.set("vacuna", filtroVac);

      const data = await apiFetch(`${API}/api/reportes/vacunas?${params}`);
      if (!data) return;

      setDatosVac(data.por_vacuna || []);
      setPorDiaMes(data.por_dia || []);

      // ── Desglose por vacunador ──
      // El endpoint debería devolver data.por_vacunador como:
      // [{ vacuna, vacunador, dosis, pacientes }]
      // Si no existe aún, se deja vacío y la tabla simplemente mostrará "—"
      setPorVacunadorVac(data.por_vacunador || []);

      if (tiposVacuna.length === 0 && (data.por_vacuna || []).length > 0) {
        setTiposVacuna(data.por_vacuna.map((v) => v.vacuna));
      }

      // Resumen semanal
      const hoy = new Date();
      const lunesActual = lunesDeLaSemana(hoy);
      const diasSemana = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(lunesActual);
        d.setDate(d.getDate() + i);
        return d;
      });

      const porDiaMap = {};
      (data.por_dia || []).forEach((d) => {
        const k = String(d.fecha).split("T")[0];
        porDiaMap[k] = d.dosis;
      });

      const porDiaSemana = diasSemana.map((d, i) => {
        const iso = isoDate(d);
        return {
          nombre: DIAS_SEMANA[i],
          fecha: iso,
          dosis: porDiaMap[iso] || 0,
          pacientes: 0,
        };
      });

      const totalDosisSemana = porDiaSemana.reduce((a, d) => a + d.dosis, 0);
      const diasConDatos = porDiaSemana.filter((d) => d.dosis > 0).length;

      setResumenSemana({
        totalDosis: totalDosisSemana,
        totalPacientes: "—",
        diasConDatos,
        promedioDiario:
          diasConDatos > 0 ? Math.round(totalDosisSemana / diasConDatos) : 0,
        porDia: porDiaSemana,
      });

      // Comparativa semanal del mes (se mantiene para la UI web, no para PDF)
      const semanas = [];
      const primerDia = new Date(parseInt(anio), parseInt(mes) - 1, 1);
      const ultimoDia = new Date(parseInt(anio), parseInt(mes), 0);
      let cursor = lunesDeLaSemana(primerDia);
      while (cursor <= ultimoDia) {
        const domingo = new Date(cursor);
        domingo.setDate(domingo.getDate() + 6);
        const desdeISO = isoDate(cursor);
        const hastaISO = isoDate(domingo > ultimoDia ? ultimoDia : domingo);
        const dosisS = (data.por_dia || [])
          .filter((d) => {
            const f = String(d.fecha).split("T")[0];
            return f >= desdeISO && f <= hastaISO;
          })
          .reduce((a, d) => a + d.dosis, 0);
        semanas.push({
          desde: desdeISO,
          hasta: hastaISO,
          dosis: dosisS,
          pacientes: "—",
        });
        cursor = new Date(cursor);
        cursor.setDate(cursor.getDate() + 7);
      }
      setResumenMes({ semanas });
      setPaginaVac(1);
    } catch (e) {
      setErrorVac(e.message);
      setDatosVac([]);
    } finally {
      setCargandoVac(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesVac, filtroVac]);

  useEffect(() => {
    fetchVacunas();
  }, [fetchVacunas]);

  // ── Fetch inventario ────────────────────────────────────
  const fetchInventario = useCallback(async () => {
    setCargandoInv(true);
    setErrorInv("");
    try {
      const params = new URLSearchParams({ periodo: periodoInv });
      if (filtroInvVac) params.set("vacuna", filtroInvVac);
      if (filtroTipo) params.set("tipo", filtroTipo);
      const data = await apiFetch(`${API}/api/reportes/inventario?${params}`);
      if (!data) return;
      setDatosInv(data.movimientos || []);
      setPorVacunaInv(data.por_vacuna || []);
      setResumenInv(data.resumen);
      setPaginaInv(1);
    } catch (e) {
      setErrorInv(e.message);
      setDatosInv([]);
    } finally {
      setCargandoInv(false);
    }
  }, [periodoInv, filtroInvVac, filtroTipo]);

  useEffect(() => {
    if (tab === "inventario") fetchInventario();
  }, [fetchInventario, tab]);

  // ── Cálculos derivados ──────────────────────────────────
  const totalDosisVac = useMemo(
    () => datosVac.reduce((a, r) => a + r.dosis, 0),
    [datosVac],
  );
  const totalPacientesVac = useMemo(
    () => datosVac.reduce((a, r) => a + r.pacientes, 0),
    [datosVac],
  );
  const maxDosis = useMemo(
    () => Math.max(...datosVac.map((r) => r.dosis), 1),
    [datosVac],
  );
  const maxMov = useMemo(
    () => Math.max(...datosInv.map((r) => r.cantidad), 1),
    [datosInv],
  );
  const vacunaMasAplicada = useMemo(
    () => [...datosVac].sort((a, b) => b.dosis - a.dosis)[0] || null,
    [datosVac],
  );
  const diaPico = useMemo(() => {
    if (!porDiaMes.length) return null;
    return [...porDiaMes].sort((a, b) => b.dosis - a.dosis)[0];
  }, [porDiaMes]);

  // Paginación
  const totalPagVac = Math.ceil(datosVac.length / POR_PAGINA);
  const pagVacActual = Math.min(paginaVac, totalPagVac || 1);
  const datosVacPag = datosVac.slice(
    (pagVacActual - 1) * POR_PAGINA,
    pagVacActual * POR_PAGINA,
  );

  const totalPagInv = Math.ceil(datosInv.length / POR_PAGINA);
  const pagInvActual = Math.min(paginaInv, totalPagInv || 1);
  const datosInvPag = datosInv.slice(
    (pagInvActual - 1) * POR_PAGINA,
    pagInvActual * POR_PAGINA,
  );

  const labelMesActual =
    mesesDisponibles.find((m) => m.value === mesVac)?.label || mesVac;

  // ── Handlers de exportación ─────────────────────────────
  function handleExportarPDF() {
    try {
      if (tab === "vacunas") {
        generarPDFVacunas({
          datosVac,
          porDia: porDiaMes,
          resumenSemana,
          // resumenMes eliminado del PDF
          labelMes: labelMesActual,
          mesVac,
          totalDosisVac,
          totalPacientesVac,
          porVacunador: porVacunadorVac, // NUEVO: desglose por vacunador
        });
      } else {
        generarPDFInventario({
          datosInv,
          resumenInv,
          periodoInv,
          porVacuna: porVacunaInv,
        });
      }
    } catch (err) {
      console.error("[exportarPDF]", err);
      alert("No se pudo generar el PDF. Intente nuevamente.");
    }
  }

  function exportarExcel() {
    try {
      const estaEnVacunas = tab === "vacunas";
      const wb = XLSX.utils.book_new();
      const hoy = new Date().toLocaleDateString("es-VE");

      if (estaEnVacunas) {
        // Hoja 1: Resumen del mes
        const filas = [
          ["SISTEMA DE VACUNACIÓN — ASIC DR. TULIO PINEDA", "", "", ""],
          [`Reporte de vacunas aplicadas — ${labelMesActual}`, "", "", ""],
          [`Generado: ${hoy}`, "", "", ""],
          [],
          ["RESUMEN GENERAL", "", "", ""],
          ["Total dosis", totalDosisVac, "", ""],
          ["Total pacientes", totalPacientesVac, "", ""],
          ["Tipos de vacuna", datosVac.length, "", ""],
          ["Vacuna más aplicada", vacunaMasAplicada?.vacuna || "—", "", ""],
          [
            "Día pico",
            diaPico
              ? `${formatFecha(diaPico.fecha)} (${diaPico.dosis} dosis)`
              : "—",
            "",
            "",
          ],
          [],
          ["DISTRIBUCIÓN POR VACUNA", "", "", ""],
          ["VACUNA", "DOSIS APLICADAS", "PACIENTES ATENDIDOS", "% DEL TOTAL"],
          ...datosVac.map((r) => [
            r.vacuna,
            r.dosis,
            r.pacientes,
            totalDosisVac > 0
              ? `${((r.dosis / totalDosisVac) * 100).toFixed(1)}%`
              : "—",
          ]),
          [],
          ["TOTAL", totalDosisVac, totalPacientesVac, "100%"],
        ];
        const ws = XLSX.utils.aoa_to_sheet(filas);
        ws["!cols"] = [{ wch: 32 }, { wch: 18 }, { wch: 22 }, { wch: 14 }];
        ws["!merges"] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
          { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } },
        ];
        XLSX.utils.book_append_sheet(wb, ws, "Resumen mensual");

        // Hoja 2: Detalle por vacunador (NUEVO)
        if (porVacunadorVac.length > 0) {
          const filasV = [
            ["DESGLOSE POR VACUNADOR", "", "", "", ""],
            [],
            ["VACUNA", "VACUNADOR", "DOSIS", "PACIENTES", "% DEL TOTAL"],
            ...porVacunadorVac.map((v) => [
              v.vacuna,
              v.vacunador || "Sin asignar",
              v.dosis,
              v.pacientes ?? "—",
              totalDosisVac > 0
                ? `${((v.dosis / totalDosisVac) * 100).toFixed(1)}%`
                : "—",
            ]),
          ];
          const wsV = XLSX.utils.aoa_to_sheet(filasV);
          wsV["!cols"] = [
            { wch: 30 },
            { wch: 28 },
            { wch: 10 },
            { wch: 12 },
            { wch: 14 },
          ];
          XLSX.utils.book_append_sheet(wb, wsV, "Por vacunador");
        }

        // Hoja 3: Evolución diaria
        if (porDiaMes.length > 0) {
          const filasD = [
            ["EVOLUCIÓN DIARIA", ""],
            [],
            ["FECHA", "DOSIS"],
            ...porDiaMes.map((d) => [formatFecha(d.fecha), d.dosis]),
          ];
          const wsD = XLSX.utils.aoa_to_sheet(filasD);
          wsD["!cols"] = [{ wch: 16 }, { wch: 12 }];
          XLSX.utils.book_append_sheet(wb, wsD, "Evolución diaria");
        }

        // Hoja 4: Semanas del mes
        if (resumenMes?.semanas?.length > 0) {
          const filasS = [
            ["COMPARATIVA SEMANAL", "", "", ""],
            [],
            ["SEMANA", "DESDE", "HASTA", "DOSIS"],
            ...resumenMes.semanas.map((s, i) => [
              `Semana ${i + 1}`,
              formatFecha(s.desde),
              formatFecha(s.hasta),
              s.dosis,
            ]),
          ];
          const wsS = XLSX.utils.aoa_to_sheet(filasS);
          wsS["!cols"] = [{ wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 10 }];
          XLSX.utils.book_append_sheet(wb, wsS, "Comparativa semanal");
        }

        // Hoja 5: Semana actual
        if (resumenSemana?.porDia) {
          const filasW = [
            ["SEMANA ACTUAL", "", "", ""],
            [],
            ["DÍA", "FECHA", "DOSIS", "ESTADO"],
            ...resumenSemana.porDia.map((d) => [
              d.nombre,
              formatFecha(d.fecha),
              d.dosis,
              d.dosis > 0 ? "Activo" : "Sin datos",
            ]),
            [],
            ["Total semana", "", resumenSemana.totalDosis, ""],
            ["Promedio diario", "", resumenSemana.promedioDiario, ""],
          ];
          const wsW = XLSX.utils.aoa_to_sheet(filasW);
          wsW["!cols"] = [{ wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 12 }];
          XLSX.utils.book_append_sheet(wb, wsW, "Semana actual");
        }
      } else {
        const { entradas, salidas, balance } = resumenInv;
        const filas = [
          ["SISTEMA DE VACUNACIÓN — ASIC DR. TULIO PINEDA", "", "", "", ""],
          ["Reporte de movimientos de inventario", "", "", "", ""],
          [`Generado: ${hoy}`, "", "", "", ""],
          [],
          ["RESUMEN", "", "", "", ""],
          ["Total entradas", entradas, "", "", ""],
          ["Total salidas", salidas, "", "", ""],
          ["Balance neto", balance, "", "", ""],
          [],
          ["DETALLE DE MOVIMIENTOS", "", "", "", ""],
          ["VACUNA", "TIPO", "CANTIDAD", "LOTE", "VENCIMIENTO", "FECHA"],
          ...datosInv.map((r) => [
            r.vacuna,
            r.tipo === "entrada" ? "Entrada" : "Salida",
            r.tipo === "entrada" ? r.cantidad : -r.cantidad,
            r.lote || "—",
            r.vencimiento ? formatFecha(r.vencimiento) : "—",
            formatFecha(r.fecha),
          ]),
        ];
        const ws = XLSX.utils.aoa_to_sheet(filas);
        ws["!cols"] = [
          { wch: 30 },
          { wch: 12 },
          { wch: 12 },
          { wch: 16 },
          { wch: 14 },
          { wch: 14 },
        ];
        ws["!merges"] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
          { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
        ];
        XLSX.utils.book_append_sheet(wb, ws, "Movimientos inventario");

        if (porVacunaInv.length > 0) {
          const vacunaMap = {};
          porVacunaInv.forEach((r) => {
            if (!vacunaMap[r.vacuna])
              vacunaMap[r.vacuna] = { entradas: 0, salidas: 0 };
            if (r.tipo === "entrada")
              vacunaMap[r.vacuna].entradas += r.cantidad;
            else vacunaMap[r.vacuna].salidas += r.cantidad;
          });
          const filas2 = [
            ["BALANCE POR VACUNA", "", "", ""],
            [],
            ["VACUNA", "ENTRADAS", "SALIDAS", "BALANCE"],
            ...Object.entries(vacunaMap).map(([n, v]) => [
              n,
              v.entradas,
              v.salidas,
              v.entradas - v.salidas,
            ]),
          ];
          const ws2 = XLSX.utils.aoa_to_sheet(filas2);
          ws2["!cols"] = [{ wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
          XLSX.utils.book_append_sheet(wb, ws2, "Balance por vacuna");
        }
      }

      XLSX.writeFile(
        wb,
        tab === "vacunas"
          ? `reporte_vacunas_${mesVac}.xlsx`
          : `reporte_inventario_${new Date().toISOString().split("T")[0]}.xlsx`,
      );
    } catch (err) {
      console.error("[exportarExcel]", err);
      alert("No se pudo generar el Excel. Intente nuevamente.");
    }
  }

  const iniciales = usuario?.nombre
    ? usuario.nombre
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "??";

  const NAV = [
    { label: "Inicio", ruta: "/dashboard", activo: false },
    { label: "Vacunas", ruta: "/vacunas", activo: false },
    { label: "Inventario", ruta: "/inventario", activo: false },
    { label: "Reportes", ruta: "/reportes", activo: true },
    { label: "Perfil", ruta: "/perfil", activo: false },
  ];

  const cargando = tab === "vacunas" ? cargandoVac : cargandoInv;
  const sinDatos =
    tab === "vacunas" ? datosVac.length === 0 : datosInv.length === 0;

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="min-h-screen flex bg-blue-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-blue-900 flex flex-col z-30 transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:w-60`}
      >
        <div className="flex items-center justify-between px-4 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow">
              <IcoJeringa className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Vacunación</p>
              <p className="text-blue-300 text-xs">ASIC Dr. Tulio Pineda</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/50 hover:text-white p-1"
          >
            <IcoCerrar />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setSidebarOpen(false);
                navigate(item.ruta);
              }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition text-left touch-manipulation ${item.activo ? "bg-white/15 text-white" : "text-white/55 hover:bg-white/10 hover:text-white"}`}
            >
              <span className="w-5 h-5 flex-shrink-0">
                {item.label === "Inicio" && <IcoHome />}
                {item.label === "Vacunas" && <IcoVacuna />}
                {item.label === "Inventario" && <IcoStock />}
                {item.label === "Reportes" && <IcoReportes />}
                {item.label === "Perfil" && <IcoUser />}
              </span>
              {item.label}
              {item.activo && (
                <span className="ml-auto w-1.5 h-1.5 bg-blue-300 rounded-full" />
              )}
            </button>
          ))}
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
              {iniciales}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-medium truncate">
                {usuario?.nombre || "..."}
              </p>
              <p className="text-blue-300 text-xs capitalize">{usuario?.rol}</p>
            </div>
            <button
              onClick={() => {
                localStorage.clear();
                navigate("/login");
              }}
              className="text-white/40 hover:text-blue-300 transition p-1"
            >
              <IcoSalir />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Contenido ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-60">
        <header className="lg:hidden sticky top-0 z-10 bg-blue-900 border-b border-white/10 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white p-1 touch-manipulation"
          >
            <IcoMenu />
          </button>
          <span className="text-white text-sm font-semibold">Reportes</span>
          <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
            {iniciales}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-blue-900">
              Reportes y estadísticas
            </h1>
            <p className="text-xs sm:text-sm text-blue-400 mt-0.5">
              Generación y exportación de informes del sistema
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-5 bg-blue-100/60 rounded-xl p-1 w-fit">
            {[
              { key: "vacunas", label: "Vacunas por período" },
              { key: "inventario", label: "Movimientos inventario" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition touch-manipulation whitespace-nowrap ${tab === t.key ? "bg-blue-600 text-white shadow-sm" : "text-blue-700 hover:bg-blue-100"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ══ TAB VACUNAS ══════════════════════════════════ */}
          {tab === "vacunas" && (
            <div>
              <div className="flex flex-wrap gap-2 sm:gap-3 mb-5 items-center">
                <select
                  value={mesVac}
                  onChange={(e) => setMesVac(e.target.value)}
                  className="px-3 py-2 bg-white border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
                >
                  {mesesDisponibles.length === 0 ? (
                    <option value="">Cargando...</option>
                  ) : (
                    mesesDisponibles.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))
                  )}
                </select>
                <select
                  value={filtroVac}
                  onChange={(e) => setFiltroVac(e.target.value)}
                  className="px-3 py-2 bg-white border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
                >
                  <option value="">Todas las vacunas</option>
                  {tiposVacuna.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={handleExportarPDF}
                    disabled={cargandoVac || sinDatos}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-xl text-xs transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <IcoDescargar /> PDF
                  </button>
                  <button
                    onClick={exportarExcel}
                    disabled={cargandoVac || sinDatos}
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 font-semibold rounded-xl text-xs transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <IcoDescargar /> Excel
                  </button>
                </div>
              </div>

              {errorVac && (
                <MensajeError mensaje={errorVac} onReintentar={fetchVacunas} />
              )}

              {cargandoVac ? (
                <SkeletonReporte />
              ) : (
                <>
                  {/* KPIs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-5">
                    <StatCard
                      label="Total dosis (mes)"
                      valor={totalDosisVac}
                      color="blue"
                      icono={<IcoVacuna />}
                    />
                    <StatCard
                      label="Pacientes atendidos"
                      valor={totalPacientesVac}
                      color="blue"
                      icono={<IcoPacientes />}
                    />
                    <StatCard
                      label="Tipos de vacuna"
                      valor={datosVac.length}
                      color="blue"
                      icono={<IcoReportes />}
                    />
                    <StatCard
                      label="Dosis esta semana"
                      valor={resumenSemana?.totalDosis ?? "—"}
                      color="green"
                      icono={<IcoCheck />}
                    />
                  </div>

                  {(vacunaMasAplicada || diaPico) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                      {vacunaMasAplicada && (
                        <div className="bg-white border border-blue-100 rounded-2xl p-4 flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <IcoVacuna />
                          </div>
                          <div>
                            <p className="text-xs text-blue-400 font-semibold uppercase tracking-wide">
                              Vacuna más aplicada
                            </p>
                            <p className="text-gray-900 font-bold text-sm">
                              {vacunaMasAplicada.vacuna}
                            </p>
                            <p className="text-xs text-gray-500">
                              {vacunaMasAplicada.dosis} dosis ·{" "}
                              {vacunaMasAplicada.pacientes} pacientes
                            </p>
                          </div>
                        </div>
                      )}
                      {diaPico && (
                        <div className="bg-white border border-blue-100 rounded-2xl p-4 flex items-center gap-4">
                          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <IcoCheck />
                          </div>
                          <div>
                            <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">
                              Día de mayor actividad
                            </p>
                            <p className="text-gray-900 font-bold text-sm">
                              {formatFecha(diaPico.fecha)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {diaPico.dosis} dosis aplicadas
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Evolución diaria */}
                  {porDiaMes.length > 0 && (
                    <div className="bg-white rounded-2xl border border-blue-100 p-4 sm:p-6 mb-5">
                      <h3 className="text-sm font-semibold text-gray-700 mb-4">
                        Evolución diaria — {labelMesActual}
                      </h3>
                      <div className="overflow-x-auto">
                        <div className="flex items-end gap-1 h-28 min-w-[400px] pb-1">
                          {porDiaMes.map((d, i) => {
                            const maxD = Math.max(
                              ...porDiaMes.map((x) => x.dosis),
                              1,
                            );
                            return (
                              <div
                                key={i}
                                className="flex-1 flex flex-col items-center gap-0.5 min-w-[6px]"
                                title={`${formatFecha(d.fecha)}: ${d.dosis} dosis`}
                              >
                                <div
                                  className="w-full rounded-t transition-all duration-500"
                                  style={{
                                    height: `${Math.max(2, (d.dosis / maxD) * 96)}px`,
                                    background: "#1d4ed8",
                                    opacity: d.dosis === 0 ? 0.15 : 1,
                                  }}
                                />
                                {i % 7 === 0 && (
                                  <span
                                    className="text-gray-400 text-center leading-tight"
                                    style={{ fontSize: "5px" }}
                                  >
                                    {formatFechaCortaISO(d.fecha)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Semana actual */}
                  {resumenSemana && (
                    <div className="bg-white rounded-2xl border border-blue-100 p-4 sm:p-6 mb-5">
                      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                        Semana actual
                      </h3>
                      <div className="grid grid-cols-7 gap-1 mb-4">
                        {(resumenSemana.porDia || []).map((dia) => {
                          const maxD = Math.max(
                            ...resumenSemana.porDia.map((d) => d.dosis),
                            1,
                          );
                          return (
                            <div
                              key={dia.nombre}
                              className="flex flex-col items-center gap-1"
                            >
                              <span className="text-xs font-semibold text-gray-500">
                                {dia.nombre}
                              </span>
                              <div className="w-full flex flex-col items-center justify-end h-16 bg-gray-50 rounded-lg overflow-hidden relative">
                                <div
                                  className="w-full rounded-t transition-all duration-500"
                                  style={{
                                    height: `${dia.dosis > 0 ? Math.max(8, (dia.dosis / maxD) * 60) : 0}px`,
                                    background:
                                      dia.dosis > 0 ? "#16a34a" : "transparent",
                                  }}
                                />
                              </div>
                              <span
                                className={`text-xs font-bold ${dia.dosis > 0 ? "text-green-600" : "text-gray-300"}`}
                              >
                                {dia.dosis}
                              </span>
                              <span
                                className="text-gray-400 text-center leading-tight"
                                style={{ fontSize: "9px" }}
                              >
                                {formatFechaCortaISO(dia.fecha)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex gap-4 text-xs text-gray-500 border-t border-gray-100 pt-3">
                        <span>
                          Total semana:{" "}
                          <strong className="text-gray-800">
                            {resumenSemana.totalDosis}
                          </strong>{" "}
                          dosis
                        </span>
                        <span>
                          Días activos:{" "}
                          <strong className="text-gray-800">
                            {resumenSemana.diasConDatos}
                          </strong>
                        </span>
                        <span>
                          Promedio:{" "}
                          <strong className="text-gray-800">
                            {resumenSemana.promedioDiario}
                          </strong>{" "}
                          dosis/día
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Comparativa semanal del mes (solo en UI web, no en PDF) */}
                  {resumenMes?.semanas?.length > 0 && (
                    <div className="bg-white rounded-2xl border border-blue-100 p-4 sm:p-6 mb-5">
                      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                        Comparativa semanal — {labelMesActual}
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-blue-50 border-b border-blue-100">
                              {["Semana", "Período", "Dosis", "Variación"].map(
                                (h) => (
                                  <th
                                    key={h}
                                    className="text-left px-3 py-2 text-xs font-semibold text-blue-400 uppercase tracking-wider"
                                  >
                                    {h}
                                  </th>
                                ),
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-blue-50">
                            {resumenMes.semanas.map((sem, idx) => {
                              const prev =
                                idx > 0
                                  ? resumenMes.semanas[idx - 1].dosis
                                  : null;
                              const diff =
                                prev !== null ? sem.dosis - prev : null;
                              const pct =
                                prev !== null && prev > 0
                                  ? ((diff / prev) * 100).toFixed(0)
                                  : null;
                              return (
                                <tr
                                  key={idx}
                                  className="hover:bg-blue-50/30 transition"
                                >
                                  <td className="px-3 py-2 font-semibold text-gray-700">
                                    Semana {idx + 1}
                                  </td>
                                  <td className="px-3 py-2 text-gray-500 text-xs">
                                    {formatFecha(sem.desde)} –{" "}
                                    {formatFecha(sem.hasta)}
                                  </td>
                                  <td className="px-3 py-2 font-bold text-blue-700">
                                    {sem.dosis}
                                  </td>
                                  <td className="px-3 py-2">
                                    {diff !== null ? (
                                      <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${diff >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                                      >
                                        {diff >= 0 ? "▲" : "▼"} {Math.abs(diff)}
                                        {pct ? ` (${pct}%)` : ""}
                                      </span>
                                    ) : (
                                      <span className="text-gray-300 text-xs">
                                        —
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Gráfica por vacuna */}
                  <div className="bg-white rounded-2xl border border-blue-100 p-4 sm:p-6 mb-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">
                      Dosis por tipo de vacuna — {labelMesActual}
                    </h3>
                    {datosVac.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-6">
                        Sin datos para el período seleccionado.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <div className="flex items-end gap-2 sm:gap-3 h-36 min-w-[320px] pb-1">
                          {datosVac.map((r, idx) => (
                            <div
                              key={r.vacuna}
                              className="flex-1 flex flex-col items-center gap-1 min-w-[36px]"
                            >
                              <span className="text-xs font-semibold text-gray-700">
                                {r.dosis}
                              </span>
                              <div
                                className="w-full rounded-t-lg transition-all duration-700"
                                style={{
                                  height: `${Math.max(8, (r.dosis / maxDosis) * 100)}px`,
                                  background:
                                    COLORES_GRAFICOS[
                                      idx % COLORES_GRAFICOS.length
                                    ],
                                }}
                              />
                              <span className="text-xs text-gray-400 text-center leading-tight">
                                {r.vacuna.length > 8
                                  ? r.vacuna.split(" ")[0]
                                  : r.vacuna}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tabla detalle */}
                  <div className="bg-white rounded-2xl border border-blue-100 overflow-hidden">
                    <div className="px-4 py-3 border-b border-blue-50 bg-blue-50/40">
                      <h3 className="text-sm font-semibold text-gray-700">
                        Detalle por vacuna
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-blue-50 border-b border-blue-100">
                          <tr>
                            {[
                              "Vacuna",
                              "Dosis aplicadas",
                              "Pacientes",
                              "% del total",
                            ].map((h) => (
                              <th
                                key={h}
                                className="text-left px-4 py-3 text-xs font-semibold text-blue-400 uppercase tracking-wider whitespace-nowrap"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-50">
                          {datosVacPag.length === 0 ? (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-4 py-10 text-center text-gray-400 text-sm"
                              >
                                Sin registros.
                              </td>
                            </tr>
                          ) : (
                            datosVacPag.map((r, idx) => (
                              <tr
                                key={r.vacuna}
                                className="hover:bg-blue-50/40 transition"
                              >
                                <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">
                                  <span
                                    className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle"
                                    style={{
                                      background:
                                        COLORES_GRAFICOS[
                                          idx % COLORES_GRAFICOS.length
                                        ],
                                    }}
                                  />
                                  {r.vacuna}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <span className="font-bold text-blue-700 text-base">
                                      {r.dosis}
                                    </span>
                                    <div className="flex-1 h-2 bg-blue-50 rounded-full min-w-[60px]">
                                      <div
                                        className="h-2 rounded-full transition-all duration-700"
                                        style={{
                                          width: `${(r.dosis / maxDosis) * 100}%`,
                                          background:
                                            COLORES_GRAFICOS[
                                              idx % COLORES_GRAFICOS.length
                                            ],
                                        }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-gray-600">
                                  {r.pacientes}
                                </td>
                                <td className="px-4 py-3 text-gray-600 font-medium">
                                  {totalDosisVac > 0
                                    ? `${((r.dosis / totalDosisVac) * 100).toFixed(1)}%`
                                    : "—"}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    <Paginacion
                      inicio={(pagVacActual - 1) * POR_PAGINA}
                      porPagina={POR_PAGINA}
                      total={datosVac.length}
                      totalPaginas={totalPagVac}
                      paginaActual={pagVacActual}
                      setPagina={setPaginaVac}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* ══ TAB INVENTARIO ═══════════════════════════════ */}
          {tab === "inventario" && (
            <div>
              <div className="flex flex-wrap gap-2 sm:gap-3 mb-5 items-center">
                <select
                  value={periodoInv}
                  onChange={(e) => setPeriodoInv(e.target.value)}
                  className="px-3 py-2 bg-white border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
                >
                  <option value="mes">Último mes</option>
                  <option value="3meses">Últimos 3 meses</option>
                  <option value="todos">Todos</option>
                </select>
                <select
                  value={filtroInvVac}
                  onChange={(e) => setFiltroInvVac(e.target.value)}
                  className="px-3 py-2 bg-white border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
                >
                  <option value="">Todas las vacunas</option>
                  {tiposVacuna.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className="px-3 py-2 bg-white border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
                >
                  <option value="">Entradas y salidas</option>
                  <option value="entrada">Solo entradas</option>
                  <option value="salida">Solo salidas</option>
                </select>
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={handleExportarPDF}
                    disabled={cargandoInv || datosInv.length === 0}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-xl text-xs transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <IcoDescargar /> PDF
                  </button>
                  <button
                    onClick={exportarExcel}
                    disabled={cargandoInv || datosInv.length === 0}
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 font-semibold rounded-xl text-xs transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <IcoDescargar /> Excel
                  </button>
                </div>
              </div>

              {errorInv && (
                <MensajeError
                  mensaje={errorInv}
                  onReintentar={fetchInventario}
                />
              )}

              {cargandoInv ? (
                <SkeletonReporte />
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-5">
                    <StatCard
                      label="Dosis ingresadas"
                      valor={`+${resumenInv.entradas}`}
                      color="green"
                      icono={<IcoCheck />}
                    />
                    <StatCard
                      label="Dosis consumidas"
                      valor={`-${resumenInv.salidas}`}
                      color="blue"
                      icono={<IcoAlerta />}
                    />
                    <StatCard
                      label="Balance neto"
                      valor={`${resumenInv.balance >= 0 ? "+" : ""}${resumenInv.balance}`}
                      color={resumenInv.balance >= 0 ? "green" : "blue"}
                      icono={<IcoReportes />}
                    />
                  </div>

                  {porVacunaInv.length > 0 &&
                    (() => {
                      const vacunaMap = {};
                      porVacunaInv.forEach((r) => {
                        if (!vacunaMap[r.vacuna])
                          vacunaMap[r.vacuna] = { entradas: 0, salidas: 0 };
                        if (r.tipo === "entrada")
                          vacunaMap[r.vacuna].entradas += r.cantidad;
                        else vacunaMap[r.vacuna].salidas += r.cantidad;
                      });
                      return (
                        <div className="bg-white rounded-2xl border border-blue-100 overflow-hidden mb-5">
                          <div className="px-4 py-3 border-b border-blue-50 bg-blue-50/40">
                            <h3 className="text-sm font-semibold text-gray-700">
                              Balance por vacuna
                            </h3>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-blue-50 border-b border-blue-100">
                                <tr>
                                  {[
                                    "Vacuna",
                                    "Entradas",
                                    "Salidas",
                                    "Balance",
                                  ].map((h) => (
                                    <th
                                      key={h}
                                      className="text-left px-4 py-3 text-xs font-semibold text-blue-400 uppercase tracking-wider"
                                    >
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-blue-50">
                                {Object.entries(vacunaMap).map(
                                  ([nombre, v]) => {
                                    const bal = v.entradas - v.salidas;
                                    return (
                                      <tr
                                        key={nombre}
                                        className="hover:bg-blue-50/40 transition"
                                      >
                                        <td className="px-4 py-3 font-semibold text-gray-800">
                                          {nombre}
                                        </td>
                                        <td className="px-4 py-3 font-bold text-green-600">
                                          +{v.entradas}
                                        </td>
                                        <td className="px-4 py-3 font-bold text-red-500">
                                          -{v.salidas}
                                        </td>
                                        <td className="px-4 py-3">
                                          <span
                                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${bal >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                                          >
                                            {bal >= 0 ? "+" : ""}
                                            {bal}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  },
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}

                  <div className="bg-white rounded-2xl border border-blue-100 p-4 sm:p-6 mb-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">
                      Movimientos por vacuna
                    </h3>
                    <div className="flex gap-3 mb-4">
                      <span className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />{" "}
                        Entradas
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" />{" "}
                        Salidas
                      </span>
                    </div>
                    {datosInv.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-6">
                        Sin movimientos para el período seleccionado.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <div className="flex items-end gap-2 sm:gap-3 h-36 min-w-[320px] pb-1">
                          {datosInv.slice(0, 12).map((r) => (
                            <div
                              key={r.id}
                              className="flex-1 flex flex-col items-center gap-1 min-w-[36px]"
                            >
                              <span className="text-xs font-semibold text-gray-700">
                                {r.cantidad}
                              </span>
                              <div
                                className="w-full rounded-t-lg transition-all duration-700"
                                style={{
                                  height: `${Math.max(8, (r.cantidad / maxMov) * 100)}px`,
                                  background:
                                    r.tipo === "entrada"
                                      ? "#16a34a"
                                      : "#3b82f6",
                                }}
                              />
                              <span className="text-xs text-gray-400 text-center leading-tight">
                                {r.vacuna.split(" ")[0]}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl border border-blue-100 overflow-hidden">
                    <div className="px-4 py-3 border-b border-blue-50 bg-blue-50/40">
                      <h3 className="text-sm font-semibold text-gray-700">
                        Detalle de movimientos
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-blue-50 border-b border-blue-100">
                          <tr>
                            {[
                              "Vacuna",
                              "Tipo",
                              "Cantidad",
                              "Lote",
                              "Vencimiento",
                              "Fecha",
                            ].map((h) => (
                              <th
                                key={h}
                                className="text-left px-4 py-3 text-xs font-semibold text-blue-400 uppercase tracking-wider whitespace-nowrap"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-50">
                          {datosInvPag.length === 0 ? (
                            <tr>
                              <td
                                colSpan={6}
                                className="px-4 py-10 text-center text-gray-400 text-sm"
                              >
                                Sin movimientos.
                              </td>
                            </tr>
                          ) : (
                            datosInvPag.map((r) => (
                              <tr
                                key={r.id}
                                className="hover:bg-blue-50/40 transition"
                              >
                                <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">
                                  {r.vacuna}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${r.tipo === "entrada" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}
                                  >
                                    {r.tipo === "entrada"
                                      ? "↑ Entrada"
                                      : "↓ Salida"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-bold">
                                  <span
                                    className={
                                      r.tipo === "entrada"
                                        ? "text-green-600"
                                        : "text-blue-600"
                                    }
                                  >
                                    {r.tipo === "entrada" ? "+" : "-"}
                                    {r.cantidad}
                                  </span>
                                  <span className="text-gray-400 text-xs ml-1">
                                    dosis
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                                  {r.lote || "—"}
                                </td>
                                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                                  {r.vencimiento
                                    ? formatFecha(r.vencimiento)
                                    : "—"}
                                </td>
                                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                                  {formatFecha(r.fecha)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    <Paginacion
                      inicio={(pagInvActual - 1) * POR_PAGINA}
                      porPagina={POR_PAGINA}
                      total={datosInv.length}
                      totalPaginas={totalPagInv}
                      paginaActual={pagInvActual}
                      setPagina={setPaginaInv}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ── Skeleton ────────────────────────────────────────────────
function SkeletonReporte() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white border border-blue-100 rounded-2xl p-4 h-24"
          >
            <div className="w-9 h-9 bg-blue-100 rounded-xl mb-3" />
            <div className="h-6 bg-blue-100 rounded w-1/2 mb-1" />
            <div className="h-3 bg-blue-50 rounded w-3/4" />
          </div>
        ))}
      </div>
      <div className="bg-white border border-blue-100 rounded-2xl h-40" />
      <div className="bg-white border border-blue-100 rounded-2xl h-52" />
      <div className="bg-white border border-blue-100 rounded-2xl h-64" />
    </div>
  );
}

function MensajeError({ mensaje, onReintentar }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 text-sm">
      <div className="flex items-center gap-2">
        <IcoAlerta />
        <span>{mensaje}</span>
      </div>
      <button
        onClick={onReintentar}
        className="text-xs font-semibold underline whitespace-nowrap hover:text-red-900 transition"
      >
        Reintentar
      </button>
    </div>
  );
}

function Paginacion({
  inicio,
  porPagina,
  total,
  totalPaginas,
  paginaActual,
  setPagina,
}) {
  const paginas = useMemo(() => {
    if (totalPaginas <= 5)
      return Array.from({ length: totalPaginas }, (_, i) => i + 1);
    if (paginaActual <= 3) return [1, 2, 3, 4, 5];
    if (paginaActual >= totalPaginas - 2)
      return [
        totalPaginas - 4,
        totalPaginas - 3,
        totalPaginas - 2,
        totalPaginas - 1,
        totalPaginas,
      ];
    return [
      paginaActual - 2,
      paginaActual - 1,
      paginaActual,
      paginaActual + 1,
      paginaActual + 2,
    ];
  }, [totalPaginas, paginaActual]);

  return (
    <div className="px-4 py-3 border-t border-blue-50 bg-blue-50/30 flex flex-col sm:flex-row items-center justify-between gap-3">
      <p className="text-xs text-gray-400 order-2 sm:order-1">
        Mostrando{" "}
        <span className="font-semibold text-gray-600">
          {total === 0 ? 0 : inicio + 1}–{Math.min(inicio + porPagina, total)}
        </span>{" "}
        de <span className="font-semibold text-gray-600">{total}</span>{" "}
        registros
      </p>
      {totalPaginas > 1 && (
        <div className="flex items-center gap-1 order-1 sm:order-2">
          <BtnPag
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={paginaActual === 1}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </BtnPag>
          {paginas.map((n) => (
            <button
              key={n}
              onClick={() => setPagina(n)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition border ${n === paginaActual ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-gray-600 border-blue-200 hover:bg-blue-50"}`}
            >
              {n}
            </button>
          ))}
          <BtnPag
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={paginaActual === totalPaginas}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </BtnPag>
        </div>
      )}
    </div>
  );
}

function BtnPag({ onClick, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-8 h-8 flex items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-500 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
    >
      {children}
    </button>
  );
}

function StatCard({ label, valor, color, icono }) {
  const e =
    {
      blue: {
        wrap: "bg-white border-blue-100",
        ic: "bg-blue-100 text-blue-600",
        val: "text-blue-900",
      },
      green: {
        wrap: "bg-green-50 border-green-100",
        ic: "bg-green-100 text-green-600",
        val: "text-green-900",
      },
    }[color] || {};
  return (
    <div className={`${e.wrap} border rounded-2xl p-3 sm:p-4`}>
      <div
        className={`w-8 h-8 sm:w-9 sm:h-9 ${e.ic} rounded-xl flex items-center justify-center mb-2 sm:mb-3`}
      >
        {icono}
      </div>
      <p className={`text-xl sm:text-2xl font-bold ${e.val}`}>{valor}</p>
      <p className="text-xs text-gray-500 mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

// ── Iconos ──────────────────────────────────────────────────
function IcoJeringa({ className }) {
  return (
    <svg
      className={className || "w-5 h-5"}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
      />
    </svg>
  );
}
function IcoUser() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}
function IcoHome() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  );
}
function IcoVacuna() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
  );
}
function IcoStock() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  );
}
function IcoReportes() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}
function IcoPacientes() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}
function IcoAlerta() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
      />
    </svg>
  );
}
function IcoCheck() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
function IcoSalir() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
      />
    </svg>
  );
}
function IcoCerrar() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}
function IcoMenu() {
  return (
    <svg
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  );
}
function IcoDescargar() {
  return (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );
}
