import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// ── Config API ──────────────────────────────────────────────
// Sin "/api" al final: las rutas ya lo incluyen
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

// Soporta fechas ISO con timestamp ("2025-06-01T00:00:00.000Z") y fechas simples ("2025-06-01")
function formatFecha(f) {
  if (!f) return "—";
  const parte = String(f).split("T")[0];
  const [y, m, d] = parte.split("-");
  return `${d}/${m}/${y}`;
}

const POR_PAGINA = 10;

// ── Componente principal ────────────────────────────────────
export default function Reportes() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tab, setTab] = useState("vacunas");

  // ── Datos del servidor ──────────────────────────────────
  const [mesesDisponibles, setMesesDisponibles] = useState([]);
  const [tiposVacuna, setTiposVacuna] = useState([]);

  // Vacunas
  const [mesVac, setMesVac] = useState(""); // formato "YYYY-MM"
  const [filtroVac, setFiltroVac] = useState("");
  const [datosVac, setDatosVac] = useState([]);
  const [cargandoVac, setCargandoVac] = useState(false);
  const [errorVac, setErrorVac] = useState("");

  // Inventario
  const [periodoInv, setPeriodoInv] = useState("mes");
  const [filtroInvVac, setFiltroInvVac] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [datosInv, setDatosInv] = useState([]);
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

  // ── Auth + carga inicial ────────────────────────────────
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

  // ── Carga de selectores al montar ───────────────────────
  // El backend NO tiene /vacunas/tipos ni /vacunas/meses:
  //   - meses → GET /api/reportes/meses
  //   - tipos → se extrae del primer fetch de /api/reportes/vacunas (campo por_vacuna)
  useEffect(() => {
    apiFetch(`${API}/api/reportes/meses`)
      .then((d) => {
        if (!d) return;
        setMesesDisponibles(d.meses);
        if (d.meses.length > 0) setMesVac(d.meses[0].value); // "YYYY-MM"
      })
      .catch(() => setErrorVac("No se pudieron cargar los meses disponibles."));
  }, []);

  // ── Fetch vacunas ───────────────────────────────────────
  // El backend espera:  GET /api/reportes/vacunas?anio=YYYY&mes=M[&vacuna=nombre]
  // El backend responde: { ok, por_vacuna: [{vacuna, dosis, pacientes}], resumen, por_dia }
  const fetchVacunas = useCallback(async () => {
    if (!mesVac) return;
    setCargandoVac(true);
    setErrorVac("");
    try {
      // mesVac es "YYYY-MM" → separar en anio y mes
      const [anio, mes] = mesVac.split("-");
      const params = new URLSearchParams({ anio, mes });
      if (filtroVac) params.set("vacuna", filtroVac);

      const data = await apiFetch(`${API}/api/reportes/vacunas?${params}`);
      if (data) {
        setDatosVac(data.por_vacuna); // campo real del backend
        // Poblar el selector de tipos con la primera respuesta exitosa
        if (tiposVacuna.length === 0 && data.por_vacuna.length > 0) {
          setTiposVacuna(data.por_vacuna.map((v) => v.vacuna));
        }
        setPaginaVac(1);
      }
    } catch (e) {
      setErrorVac(e.message);
      setDatosVac([]);
    } finally {
      setCargandoVac(false);
    }
    // tiposVacuna excluido intencionalmente de las deps para no causar loop infinito
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesVac, filtroVac]);

  useEffect(() => {
    fetchVacunas();
  }, [fetchVacunas]);

  // ── Fetch inventario ────────────────────────────────────
  // El backend espera:  GET /api/reportes/inventario?periodo=mes|3meses|todos[&vacuna=nombre][&tipo=entrada|salida]
  // El backend responde: { ok, movimientos: [{id,vacuna,tipo,cantidad,lote,fecha,...}], resumen, por_vacuna }
  const fetchInventario = useCallback(async () => {
    setCargandoInv(true);
    setErrorInv("");
    try {
      const params = new URLSearchParams({ periodo: periodoInv });
      if (filtroInvVac) params.set("vacuna", filtroInvVac);
      if (filtroTipo) params.set("tipo", filtroTipo);

      const data = await apiFetch(`${API}/api/reportes/inventario?${params}`);
      if (data) {
        setDatosInv(data.movimientos); // campo real del backend
        setResumenInv(data.resumen);
        setPaginaInv(1);
      }
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

  // ── Cálculos derivados (memoizados) ─────────────────────
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

  // ── Paginación calculada ────────────────────────────────
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

  // ── Nombre del mes para mostrar ─────────────────────────
  const labelMesActual =
    mesesDisponibles.find((m) => m.value === mesVac)?.label || mesVac;

  // ── Exportar PDF ────────────────────────────────────────
  function exportarPDF() {
    try {
      const doc = new jsPDF();
      const estaEnVacunas = tab === "vacunas";

      doc.setFillColor(2, 62, 138);
      doc.rect(0, 0, 210, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("SISTEMA DE VACUNACIÓN", 14, 11);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("ASIC Dr. Tulio Pineda · Municipio Juan Germán Roscio", 14, 18);
      doc.text(
        `Generado: ${new Date().toLocaleDateString("es-VE", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}`,
        14,
        24,
      );

      doc.setTextColor(2, 62, 138);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");

      if (estaEnVacunas) {
        doc.text(
          `REPORTE DE VACUNAS APLICADAS — ${labelMesActual.toUpperCase()}`,
          14,
          38,
        );
      } else {
        const pTexto =
          periodoInv === "mes"
            ? "ÚLTIMO MES"
            : periodoInv === "3meses"
              ? "ÚLTIMOS 3 MESES"
              : "TODOS LOS PERÍODOS";
        doc.text(`REPORTE DE MOVIMIENTOS DE INVENTARIO — ${pTexto}`, 14, 38);
      }

      doc.setDrawColor(0, 119, 182);
      doc.setLineWidth(0.5);
      doc.line(14, 41, 196, 41);

      if (estaEnVacunas) {
        const stats = [
          { label: "Total dosis aplicadas", valor: totalDosisVac.toString() },
          { label: "Pacientes atendidos", valor: totalPacientesVac.toString() },
          { label: "Tipos de vacuna", valor: datosVac.length.toString() },
        ];
        stats.forEach((s, i) => {
          const x = 14 + i * 62;
          doc.setFillColor(240, 248, 255);
          doc.roundedRect(x, 45, 58, 16, 2, 2, "F");
          doc.setTextColor(2, 62, 138);
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.text(s.valor, x + 29, 55, { align: "center" });
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 100, 100);
          doc.text(s.label, x + 29, 59, { align: "center" });
        });
        autoTable(doc, {
          startY: 67,
          head: [
            ["Vacuna", "Dosis aplicadas", "Pacientes atendidos", "% del total"],
          ],
          body: datosVac.map((r) => [
            r.vacuna,
            r.dosis.toString(),
            r.pacientes.toString(),
            totalDosisVac > 0
              ? `${((r.dosis / totalDosisVac) * 100).toFixed(1)}%`
              : "—",
          ]),
          headStyles: {
            fillColor: [0, 119, 182],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 9,
          },
          bodyStyles: { fontSize: 9, textColor: [55, 65, 81] },
          alternateRowStyles: { fillColor: [240, 248, 255] },
          columnStyles: {
            0: { cellWidth: 75 },
            1: { cellWidth: 38, halign: "center" },
            2: { cellWidth: 45, halign: "center" },
            3: { cellWidth: 30, halign: "center" },
          },
          foot: [
            [
              "TOTAL",
              totalDosisVac.toString(),
              totalPacientesVac.toString(),
              "100%",
            ],
          ],
          footStyles: {
            fillColor: [2, 62, 138],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 9,
          },
        });
      } else {
        const { entradas, salidas, balance } = resumenInv;
        const stats = [
          { label: "Dosis ingresadas", valor: `+${entradas}` },
          { label: "Dosis consumidas", valor: `-${salidas}` },
          {
            label: "Balance neto",
            valor: `${balance >= 0 ? "+" : ""}${balance}`,
          },
        ];
        stats.forEach((s, i) => {
          const x = 14 + i * 62;
          doc.setFillColor(240, 248, 255);
          doc.roundedRect(x, 45, 58, 16, 2, 2, "F");
          doc.setTextColor(2, 62, 138);
          doc.setFontSize(13);
          doc.setFont("helvetica", "bold");
          doc.text(s.valor, x + 29, 55, { align: "center" });
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 100, 100);
          doc.text(s.label, x + 29, 59, { align: "center" });
        });
        autoTable(doc, {
          startY: 67,
          head: [["Vacuna", "Tipo", "Cantidad", "Lote", "Fecha"]],
          body: datosInv.map((r) => [
            r.vacuna,
            r.tipo === "entrada" ? "↑ Entrada" : "↓ Salida",
            `${r.tipo === "entrada" ? "+" : "-"}${r.cantidad} dosis`,
            r.lote || "—",
            formatFecha(r.fecha),
          ]),
          headStyles: {
            fillColor: [0, 119, 182],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 9,
          },
          bodyStyles: { fontSize: 9, textColor: [55, 65, 81] },
          alternateRowStyles: { fillColor: [240, 248, 255] },
          columnStyles: {
            0: { cellWidth: 65 },
            1: { cellWidth: 28, halign: "center" },
            2: { cellWidth: 35, halign: "center" },
            3: { cellWidth: 32, halign: "center" },
            4: { cellWidth: 28, halign: "center" },
          },
        });
      }

      const totalPags = doc.getNumberOfPages();
      for (let i = 1; i <= totalPags; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.setDrawColor(200, 200, 200);
        doc.line(14, 286, 196, 286);
        doc.text(
          `Sistema de Vacunación ASIC Dr. Tulio Pineda — Página ${i} de ${totalPags}`,
          105,
          290,
          { align: "center" },
        );
      }

      doc.save(
        estaEnVacunas
          ? `reporte_vacunas_${mesVac}.pdf`
          : `reporte_inventario_${new Date().toISOString().split("T")[0]}.pdf`,
      );
    } catch (err) {
      console.error("[exportarPDF]", err);
      alert("No se pudo generar el PDF. Intente nuevamente.");
    }
  }

  // ── Exportar Excel ──────────────────────────────────────
  function exportarExcel() {
    try {
      const estaEnVacunas = tab === "vacunas";
      const wb = XLSX.utils.book_new();
      const hoy = new Date().toLocaleDateString("es-VE");

      if (estaEnVacunas) {
        const filas = [
          ["SISTEMA DE VACUNACIÓN — ASIC DR. TULIO PINEDA", "", "", ""],
          [`Reporte de vacunas aplicadas — ${labelMesActual}`, "", "", ""],
          [`Generado: ${hoy}`, "", "", ""],
          [],
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
        XLSX.utils.book_append_sheet(wb, ws, "Vacunas aplicadas");

        const resumen = [
          ["RESUMEN DEL PERÍODO", ""],
          [],
          ["Indicador", "Valor"],
          ["Período", labelMesActual],
          ["Total dosis", totalDosisVac],
          ["Total pacientes", totalPacientesVac],
          ["Tipos de vacuna", datosVac.length],
          [
            "Vacuna más aplicada",
            [...datosVac].sort((a, b) => b.dosis - a.dosis)[0]?.vacuna || "—",
          ],
          ["Fecha de generación", hoy],
        ];
        const wsR = XLSX.utils.aoa_to_sheet(resumen);
        wsR["!cols"] = [{ wch: 24 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, wsR, "Resumen");
      } else {
        const { entradas, salidas, balance } = resumenInv;
        const filas = [
          ["SISTEMA DE VACUNACIÓN — ASIC DR. TULIO PINEDA", "", "", "", ""],
          ["Reporte de movimientos de inventario", "", "", "", ""],
          [`Generado: ${hoy}`, "", "", "", ""],
          [],
          ["VACUNA", "TIPO", "CANTIDAD", "LOTE", "FECHA"],
          ...datosInv.map((r) => [
            r.vacuna,
            r.tipo === "entrada" ? "Entrada" : "Salida",
            r.tipo === "entrada" ? r.cantidad : -r.cantidad,
            r.lote || "—",
            formatFecha(r.fecha),
          ]),
          [],
          ["RESUMEN", "", "", "", ""],
          ["Total entradas", entradas, "", "", ""],
          ["Total salidas", salidas, "", "", ""],
          ["Balance neto", balance, "", "", ""],
          ["Fecha", hoy, "", "", ""],
        ];
        const ws = XLSX.utils.aoa_to_sheet(filas);
        ws["!cols"] = [
          { wch: 30 },
          { wch: 12 },
          { wch: 12 },
          { wch: 16 },
          { wch: 14 },
        ];
        ws["!merges"] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
          { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
        ];
        XLSX.utils.book_append_sheet(wb, ws, "Movimientos inventario");
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

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="min-h-screen flex bg-blue-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-blue-900 flex flex-col z-30 transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:w-60`}
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
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition text-left touch-manipulation ${
                item.activo
                  ? "bg-white/15 text-white"
                  : "text-white/55 hover:bg-white/10 hover:text-white"
              }`}
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

      {/* Contenido */}
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
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition touch-manipulation whitespace-nowrap ${
                  tab === t.key
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-blue-700 hover:bg-blue-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ══ TAB VACUNAS ══════════════════════════════════ */}
          {tab === "vacunas" && (
            <div>
              {/* Filtros */}
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
                    onClick={exportarPDF}
                    disabled={cargandoVac || datosVac.length === 0}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-xl text-xs transition touch-manipulation disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <IcoDescargar /> PDF
                  </button>
                  <button
                    onClick={exportarExcel}
                    disabled={cargandoVac || datosVac.length === 0}
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 font-semibold rounded-xl text-xs transition touch-manipulation disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <IcoDescargar /> Excel
                  </button>
                </div>
              </div>

              {/* Error */}
              {errorVac && (
                <MensajeError mensaje={errorVac} onReintentar={fetchVacunas} />
              )}

              {/* Skeleton / contenido */}
              {cargandoVac ? (
                <SkeletonReporte />
              ) : (
                <>
                  {/* Tarjetas resumen */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-5">
                    <StatCard
                      label="Total dosis aplicadas"
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
                  </div>

                  {/* Gráfica */}
                  <div className="bg-white rounded-2xl border border-blue-100 p-4 sm:p-6 mb-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">
                      Dosis aplicadas por vacuna — {labelMesActual}
                    </h3>
                    {datosVac.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-6">
                        Sin datos para el período seleccionado.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <div className="flex items-end gap-2 sm:gap-3 h-36 min-w-[320px] pb-1">
                          {datosVac.map((r) => (
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
                                  // Gris neutro para vacunas sin color asignado (evita el rojo engañoso)
                                  background: BAR_COLOR[r.vacuna] || "#6b7280",
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

                  {/* Tabla */}
                  <div className="bg-white rounded-2xl border border-blue-100 overflow-hidden">
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
                            datosVacPag.map((r) => (
                              <tr
                                key={r.vacuna}
                                className="hover:bg-blue-50/40 transition"
                              >
                                <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">
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
                                            BAR_COLOR[r.vacuna] || "#6b7280",
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
              {/* Filtros */}
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
                    onClick={exportarPDF}
                    disabled={cargandoInv || datosInv.length === 0}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-xl text-xs transition touch-manipulation disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <IcoDescargar /> PDF
                  </button>
                  <button
                    onClick={exportarExcel}
                    disabled={cargandoInv || datosInv.length === 0}
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 font-semibold rounded-xl text-xs transition touch-manipulation disabled:opacity-40 disabled:cursor-not-allowed"
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
                  {/* Tarjetas */}
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

                  {/* Gráfica */}
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
                          {datosInv.slice(0, 10).map((r) => (
                            // key estable: id único del movimiento en lugar del índice
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

                  {/* Tabla */}
                  <div className="bg-white rounded-2xl border border-blue-100 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-blue-50 border-b border-blue-100">
                          <tr>
                            {[
                              "Vacuna",
                              "Tipo",
                              "Cantidad",
                              "Lote",
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
                                colSpan={5}
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
                                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                      r.tipo === "entrada"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-blue-100 text-blue-700"
                                    }`}
                                  >
                                    {r.tipo === "entrada"
                                      ? "↑ Entrada"
                                      : "↓ Salida"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-bold text-gray-800">
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

// ── Skeleton de carga ───────────────────────────────────────
function SkeletonReporte() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
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
      <div className="bg-white border border-blue-100 rounded-2xl h-52" />
      <div className="bg-white border border-blue-100 rounded-2xl h-64" />
    </div>
  );
}

// ── Mensaje de error con reintento ──────────────────────────
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

// ── Paginación ──────────────────────────────────────────────
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
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition border ${
                n === paginaActual
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white text-gray-600 border-blue-200 hover:bg-blue-50"
              }`}
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

// ── Stat card ───────────────────────────────────────────────
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
