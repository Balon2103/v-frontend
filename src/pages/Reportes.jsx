import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

// ── Datos de demostración ───────────────────────────────────
const VACUNAS_POR_MES = {
  "2025-04": [
    { vacuna: "BCG", dosis: 48, pacientes: 48 },
    { vacuna: "Polio Inyectable (IPV)", dosis: 35, pacientes: 30 },
    { vacuna: "Polio Oral", dosis: 41, pacientes: 35 },
    { vacuna: "Pentavalente", dosis: 52, pacientes: 42 },
    { vacuna: "Hepatitis B", dosis: 28, pacientes: 25 },
    { vacuna: "SRP", dosis: 19, pacientes: 18 },
    { vacuna: "Fiebre Amarilla", dosis: 15, pacientes: 15 },
    { vacuna: "Toxoide", dosis: 10, pacientes: 8 },
  ],
  "2025-03": [
    { vacuna: "BCG", dosis: 40, pacientes: 40 },
    { vacuna: "Polio Inyectable (IPV)", dosis: 28, pacientes: 24 },
    { vacuna: "Polio Oral", dosis: 33, pacientes: 28 },
    { vacuna: "Pentavalente", dosis: 45, pacientes: 38 },
    { vacuna: "Hepatitis B", dosis: 22, pacientes: 20 },
    { vacuna: "SRP", dosis: 14, pacientes: 13 },
    { vacuna: "Fiebre Amarilla", dosis: 11, pacientes: 11 },
    { vacuna: "Toxoide", dosis: 8, pacientes: 6 },
  ],
  "2025-02": [
    { vacuna: "BCG", dosis: 35, pacientes: 35 },
    { vacuna: "Polio Inyectable (IPV)", dosis: 22, pacientes: 19 },
    { vacuna: "Polio Oral", dosis: 27, pacientes: 23 },
    { vacuna: "Pentavalente", dosis: 38, pacientes: 32 },
    { vacuna: "Hepatitis B", dosis: 18, pacientes: 16 },
    { vacuna: "SRP", dosis: 10, pacientes: 10 },
    { vacuna: "Fiebre Amarilla", dosis: 8, pacientes: 8 },
    { vacuna: "Toxoide", dosis: 5, pacientes: 4 },
  ],
};

const MOVIMIENTOS = [
  {
    id: 1,
    vacuna: "BCG",
    tipo: "entrada",
    cantidad: 100,
    lote: "BCG-003",
    fecha: "2025-04-05",
  },
  {
    id: 2,
    vacuna: "Hepatitis B",
    tipo: "entrada",
    cantidad: 80,
    lote: "HB-013",
    fecha: "2025-04-02",
  },
  {
    id: 3,
    vacuna: "Polio Inyectable (IPV)",
    tipo: "entrada",
    cantidad: 50,
    lote: "IPV-008",
    fecha: "2025-04-09",
  },
  {
    id: 4,
    vacuna: "Fiebre Amarilla",
    tipo: "entrada",
    cantidad: 50,
    lote: "FA-024",
    fecha: "2025-04-07",
  },
  {
    id: 5,
    vacuna: "Toxoide",
    tipo: "entrada",
    cantidad: 40,
    lote: "TX-006",
    fecha: "2025-04-08",
  },
  {
    id: 6,
    vacuna: "Pentavalente",
    tipo: "salida",
    cantidad: 52,
    lote: "PV-044",
    fecha: "2025-04-10",
  },
  {
    id: 7,
    vacuna: "SRP",
    tipo: "salida",
    cantidad: 19,
    lote: "SRP-020",
    fecha: "2025-04-11",
  },
  {
    id: 8,
    vacuna: "BCG",
    tipo: "salida",
    cantidad: 48,
    lote: "BCG-003",
    fecha: "2025-04-12",
  },
  {
    id: 9,
    vacuna: "Polio Oral",
    tipo: "salida",
    cantidad: 41,
    lote: "PO-034",
    fecha: "2025-04-13",
  },
  {
    id: 10,
    vacuna: "Hepatitis B",
    tipo: "salida",
    cantidad: 28,
    lote: "HB-013",
    fecha: "2025-04-14",
  },
  {
    id: 11,
    vacuna: "BCG",
    tipo: "entrada",
    cantidad: 80,
    lote: "BCG-002",
    fecha: "2025-03-10",
  },
  {
    id: 12,
    vacuna: "Pentavalente",
    tipo: "entrada",
    cantidad: 60,
    lote: "PV-043",
    fecha: "2025-03-12",
  },
  {
    id: 13,
    vacuna: "Polio Oral",
    tipo: "salida",
    cantidad: 33,
    lote: "PO-033",
    fecha: "2025-03-15",
  },
  {
    id: 14,
    vacuna: "SRP",
    tipo: "entrada",
    cantidad: 30,
    lote: "SRP-019",
    fecha: "2025-03-18",
  },
];

const MESES = [
  { value: "2025-04", label: "Abril 2025" },
  { value: "2025-03", label: "Marzo 2025" },
  { value: "2025-02", label: "Febrero 2025" },
];

const TIPOS_VACUNA = [
  "BCG",
  "Polio Inyectable (IPV)",
  "Polio Oral",
  "Pentavalente",
  "Hepatitis B",
  "SRP",
  "Fiebre Amarilla",
  "Toxoide",
];

// Colores de barras por vacuna
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
function formatFecha(f) {
  if (!f) return "—";
  const [y, m, d] = f.split("-");
  return `${d}/${m}/${y}`;
}

function formatMes(v) {
  return MESES.find((m) => m.value === v)?.label || v;
}

const POR_PAGINA = 10;

// ── Componente principal ────────────────────────────────────
export default function Reportes() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tab, setTab] = useState("vacunas");

  // Filtros vacunas
  const [mesVac, setMesVac] = useState("2025-04");
  const [filtroVac, setFiltroVac] = useState("");

  // Filtros inventario
  const [periodoInv, setPeriodoInv] = useState("mes");
  const [filtroInvVac, setFiltroInvVac] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");

  // Paginación
  const [paginaVac, setPaginaVac] = useState(1);
  const [paginaInv, setPaginaInv] = useState(1);

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

  // ── Datos vacunas filtrados ─────────────────────────────
  const datosVac = useMemo(() => {
    const base = VACUNAS_POR_MES[mesVac] || [];
    return filtroVac ? base.filter((r) => r.vacuna === filtroVac) : base;
  }, [mesVac, filtroVac]);

  const totalDosisVac = datosVac.reduce((a, r) => a + r.dosis, 0);
  const totalPacientesVac = datosVac.reduce((a, r) => a + r.pacientes, 0);
  const maxDosis = Math.max(...datosVac.map((r) => r.dosis), 1);

  const totalPagVac = Math.ceil(datosVac.length / POR_PAGINA);
  const pagVacActual = Math.min(paginaVac, totalPagVac || 1);
  const datosVacPag = datosVac.slice(
    (pagVacActual - 1) * POR_PAGINA,
    pagVacActual * POR_PAGINA,
  );

  useEffect(() => {
    setPaginaVac(1);
  }, [mesVac, filtroVac]);

  // ── Datos inventario filtrados ──────────────────────────
  const datosInv = useMemo(() => {
    let base = [...MOVIMIENTOS];
    if (periodoInv === "mes")
      base = base.filter((r) => r.fecha.startsWith("2025-04"));
    else if (periodoInv === "3meses")
      base = base.filter((r) => r.fecha >= "2025-02-01");
    if (filtroInvVac) base = base.filter((r) => r.vacuna === filtroInvVac);
    if (filtroTipo) base = base.filter((r) => r.tipo === filtroTipo);
    return base;
  }, [periodoInv, filtroInvVac, filtroTipo]);

  const entradas = datosInv
    .filter((r) => r.tipo === "entrada")
    .reduce((a, r) => a + r.cantidad, 0);
  const salidas = datosInv
    .filter((r) => r.tipo === "salida")
    .reduce((a, r) => a + r.cantidad, 0);
  const maxMov = Math.max(...datosInv.map((r) => r.cantidad), 1);

  const totalPagInv = Math.ceil(datosInv.length / POR_PAGINA);
  const pagInvActual = Math.min(paginaInv, totalPagInv || 1);
  const datosInvPag = datosInv.slice(
    (pagInvActual - 1) * POR_PAGINA,
    pagInvActual * POR_PAGINA,
  );

  useEffect(() => {
    setPaginaInv(1);
  }, [periodoInv, filtroInvVac, filtroTipo]);

  // ── Exportación simulada ────────────────────────────────
  function exportar(formato) {
    alert(
      `Exportando reporte en formato ${formato}.\n\nEsta función se conectará al backend cuando esté disponible.`,
    );
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
  ];

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
        className={`fixed top-0 left-0 h-full w-64 bg-blue-900
                        flex flex-col z-30 transition-transform duration-300
                        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
                        lg:translate-x-0 lg:w-60`}
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
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg
                         text-sm font-medium transition text-left touch-manipulation
                         ${item.activo ? "bg-white/15 text-white" : "text-white/55 hover:bg-white/10 hover:text-white"}`}
            >
              <span className="w-5 h-5 flex-shrink-0">
                {item.label === "Inicio" && <IcoHome />}
                {item.label === "Vacunas" && <IcoVacuna />}
                {item.label === "Inventario" && <IcoStock />}
                {item.label === "Reportes" && <IcoReportes />}
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
            <div
              className="w-9 h-9 bg-white rounded-full flex items-center
                            justify-center text-blue-600 font-bold text-sm flex-shrink-0"
            >
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
        {/* Topbar móvil */}
        <header
          className="lg:hidden sticky top-0 z-10 bg-blue-900 border-b border-white/10
                           px-4 py-3 flex items-center justify-between"
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white p-1 touch-manipulation"
          >
            <IcoMenu />
          </button>
          <span className="text-white text-sm font-semibold">Reportes</span>
          <div
            className="w-9 h-9 bg-white rounded-full flex items-center justify-center
                          text-blue-600 font-bold text-xs"
          >
            {iniciales}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {/* Encabezado */}
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
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium
                           transition touch-manipulation whitespace-nowrap
                           ${
                             tab === t.key
                               ? "bg-blue-600 text-white shadow-sm"
                               : "text-blue-700 hover:bg-blue-100"
                           }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ══════════════════════════════════════════════
              TAB: VACUNAS APLICADAS POR PERÍODO
          ══════════════════════════════════════════════ */}
          {tab === "vacunas" && (
            <div>
              {/* Filtros + exportar */}
              <div className="flex flex-wrap gap-2 sm:gap-3 mb-5 items-center">
                <select
                  value={mesVac}
                  onChange={(e) => setMesVac(e.target.value)}
                  className="px-3 py-2 bg-white border border-blue-200 rounded-xl text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
                >
                  {MESES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <select
                  value={filtroVac}
                  onChange={(e) => setFiltroVac(e.target.value)}
                  className="px-3 py-2 bg-white border border-blue-200 rounded-xl text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
                >
                  <option value="">Todas las vacunas</option>
                  {TIPOS_VACUNA.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={() => exportar("PDF")}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-100
                               hover:bg-blue-200 text-blue-700 font-semibold rounded-xl
                               text-xs transition touch-manipulation"
                  >
                    <IcoDescargar /> PDF
                  </button>
                  <button
                    onClick={() => exportar("Excel")}
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-100
                               hover:bg-green-200 text-green-700 font-semibold rounded-xl
                               text-xs transition touch-manipulation"
                  >
                    <IcoDescargar /> Excel
                  </button>
                </div>
              </div>

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

              {/* Gráfica de barras */}
              <div className="bg-white rounded-2xl border border-blue-100 p-4 sm:p-6 mb-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                  Dosis aplicadas por vacuna — {formatMes(mesVac)}
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
                              background: BAR_COLOR[r.vacuna] || "#dc2626",
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
                            className="text-left px-4 py-3 text-xs font-semibold
                                                 text-blue-400 uppercase tracking-wider whitespace-nowrap"
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
                                        BAR_COLOR[r.vacuna] || "#dc2626",
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
            </div>
          )}

          {/* ══════════════════════════════════════════════
              TAB: MOVIMIENTOS DE INVENTARIO
          ══════════════════════════════════════════════ */}
          {tab === "inventario" && (
            <div>
              {/* Filtros + exportar */}
              <div className="flex flex-wrap gap-2 sm:gap-3 mb-5 items-center">
                <select
                  value={periodoInv}
                  onChange={(e) => setPeriodoInv(e.target.value)}
                  className="px-3 py-2 bg-white border border-blue-200 rounded-xl text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
                >
                  <option value="mes">Último mes</option>
                  <option value="3meses">Últimos 3 meses</option>
                  <option value="todos">Todos</option>
                </select>
                <select
                  value={filtroInvVac}
                  onChange={(e) => setFiltroInvVac(e.target.value)}
                  className="px-3 py-2 bg-white border border-blue-200 rounded-xl text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
                >
                  <option value="">Todas las vacunas</option>
                  {TIPOS_VACUNA.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className="px-3 py-2 bg-white border border-blue-200 rounded-xl text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
                >
                  <option value="">Entradas y salidas</option>
                  <option value="entrada">Solo entradas</option>
                  <option value="salida">Solo salidas</option>
                </select>
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={() => exportar("PDF")}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-100
                               hover:bg-blue-200 text-blue-700 font-semibold rounded-xl
                               text-xs transition touch-manipulation"
                  >
                    <IcoDescargar /> PDF
                  </button>
                  <button
                    onClick={() => exportar("Excel")}
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-100
                               hover:bg-green-200 text-green-700 font-semibold rounded-xl
                               text-xs transition touch-manipulation"
                  >
                    <IcoDescargar /> Excel
                  </button>
                </div>
              </div>

              {/* Tarjetas resumen */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-5">
                <StatCard
                  label="Dosis ingresadas"
                  valor={`+${entradas}`}
                  color="green"
                  icono={<IcoCheck />}
                />
                <StatCard
                  label="Dosis consumidas"
                  valor={`-${salidas}`}
                  color="blue"
                  icono={<IcoAlerta />}
                />
                <StatCard
                  label="Balance neto"
                  valor={`${entradas - salidas >= 0 ? "+" : ""}${entradas - salidas}`}
                  color={entradas - salidas >= 0 ? "green" : "blue"}
                  icono={<IcoReportes />}
                />
              </div>

              {/* Gráfica de barras movimientos */}
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
                      {datosInv.slice(0, 10).map((r, i) => (
                        <div
                          key={i}
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
                                r.tipo === "entrada" ? "#16a34a" : "#dc2626",
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

              {/* Tabla movimientos */}
              <div className="bg-white rounded-2xl border border-blue-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-blue-50 border-b border-blue-100">
                      <tr>
                        {["Vacuna", "Tipo", "Cantidad", "Lote", "Fecha"].map(
                          (h) => (
                            <th
                              key={h}
                              className="text-left px-4 py-3 text-xs font-semibold
                                                 text-blue-400 uppercase tracking-wider whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ),
                        )}
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
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold
                              ${
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
                              {r.lote}
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
            </div>
          )}
        </main>
      </div>
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
    <div
      className="px-4 py-3 border-t border-blue-50 bg-blue-50/30
                    flex flex-col sm:flex-row items-center justify-between gap-3"
    >
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
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs
                         font-semibold transition border
                         ${
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
      className="w-8 h-8 flex items-center justify-center rounded-lg border
                 border-blue-200 bg-white text-blue-500 hover:bg-blue-50
                 disabled:opacity-40 disabled:cursor-not-allowed transition"
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
        className={`w-8 h-8 sm:w-9 sm:h-9 ${e.ic} rounded-xl flex items-center
                      justify-center mb-2 sm:mb-3`}
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
