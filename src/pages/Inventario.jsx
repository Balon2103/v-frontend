import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

// ── Datos iniciales del inventario ──────────────────────────
const INVENTARIO_INICIAL = [
  {
    id: 1,
    vacuna: "BCG",
    stock: 320,
    minimo: 50,
    lote: "BCG-003",
    ultimaEntrada: "2025-04-05",
    vencimiento: "2026-01-15",
  },
  {
    id: 2,
    vacuna: "Polio Inyectable (IPV)",
    stock: 180,
    minimo: 30,
    lote: "IPV-008",
    ultimaEntrada: "2025-04-09",
    vencimiento: "2025-12-20",
  },
  {
    id: 3,
    vacuna: "Polio Oral",
    stock: 15,
    minimo: 20,
    lote: "PO-034",
    ultimaEntrada: "2025-04-06",
    vencimiento: "2025-10-30",
  },
  {
    id: 4,
    vacuna: "Pentavalente",
    stock: 8,
    minimo: 30,
    lote: "PV-044",
    ultimaEntrada: "2025-04-04",
    vencimiento: "2025-11-10",
  },
  {
    id: 5,
    vacuna: "Hepatitis B",
    stock: 240,
    minimo: 40,
    lote: "HB-013",
    ultimaEntrada: "2025-04-02",
    vencimiento: "2026-03-22",
  },
  {
    id: 6,
    vacuna: "SRP",
    stock: 6,
    minimo: 25,
    lote: "SRP-020",
    ultimaEntrada: "2025-04-03",
    vencimiento: "2025-09-15",
  },
  {
    id: 7,
    vacuna: "Fiebre Amarilla",
    stock: 95,
    minimo: 20,
    lote: "FA-024",
    ultimaEntrada: "2025-04-07",
    vencimiento: "2026-02-28",
  },
  {
    id: 8,
    vacuna: "Toxoide",
    stock: 110,
    minimo: 30,
    lote: "TX-006",
    ultimaEntrada: "2025-04-08",
    vencimiento: "2025-12-01",
  },
];

// Historial de movimientos
const MOVIMIENTOS_INICIAL = [
  {
    id: 1,
    vacuna: "BCG",
    tipo: "entrada",
    cantidad: 100,
    lote: "BCG-003",
    fecha: "2025-04-05",
    responsable: "Coordinador ASIC",
  },
  {
    id: 2,
    vacuna: "Polio Inyectable (IPV)",
    tipo: "entrada",
    cantidad: 50,
    lote: "IPV-008",
    fecha: "2025-04-09",
    responsable: "Coordinador ASIC",
  },
  {
    id: 3,
    vacuna: "Pentavalente",
    tipo: "salida",
    cantidad: 22,
    lote: "PV-044",
    fecha: "2025-04-10",
    responsable: "Personal admin.",
  },
  {
    id: 4,
    vacuna: "SRP",
    tipo: "salida",
    cantidad: 19,
    lote: "SRP-020",
    fecha: "2025-04-11",
    responsable: "Personal admin.",
  },
  {
    id: 5,
    vacuna: "Hepatitis B",
    tipo: "entrada",
    cantidad: 80,
    lote: "HB-013",
    fecha: "2025-04-02",
    responsable: "Coordinador ASIC",
  },
  {
    id: 6,
    vacuna: "Fiebre Amarilla",
    tipo: "entrada",
    cantidad: 50,
    lote: "FA-024",
    fecha: "2025-04-07",
    responsable: "Coordinador ASIC",
  },
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

const FORM_VACIO = {
  vacuna: "",
  lote: "",
  cantidad: "",
  fechaEntrada: "",
  vencimiento: "",
};
const POR_PAGINA = 10;

// ── Helpers ─────────────────────────────────────────────────
function estadoStock(stock, minimo) {
  const pct = (stock / (minimo * 3)) * 100;
  if (stock <= 0)
    return {
      label: "Sin stock",
      color: "bg-gray-100 text-gray-500",
      barra: "bg-gray-300",
      pct: 0,
    };
  if (stock < minimo)
    return {
      label: "Crítico",
      color: "bg-blue-100 text-blue-700",
      barra: "bg-blue-500",
      pct: Math.max(5, Math.min(pct, 100)),
    };
  if (stock < minimo * 1.5)
    return {
      label: "Bajo",
      color: "bg-amber-100 text-amber-700",
      barra: "bg-amber-400",
      pct: Math.min(pct, 100),
    };
  return {
    label: "OK",
    color: "bg-green-100 text-green-700",
    barra: "bg-green-500",
    pct: Math.min(pct, 100),
  };
}

function formatFecha(f) {
  if (!f) return "—";
  const [y, m, d] = f.split("-");
  return `${d}/${m}/${y}`;
}

const inputCls = `w-full px-3 py-2.5 border border-blue-200 rounded-xl text-sm
  focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent
  transition text-gray-700 bg-white`;

// ── Componente principal ────────────────────────────────────
export default function Inventario() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inventario, setInventario] = useState(INVENTARIO_INICIAL);
  const [movimientos, setMovimientos] = useState(MOVIMIENTOS_INICIAL);
  const [tab, setTab] = useState("inventario"); // "inventario" | "movimientos"
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [error, setError] = useState("");
  const [guardado, setGuardado] = useState(false);

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

  // Filtrar según tab activo
  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    if (tab === "inventario") {
      return inventario.filter((r) => r.vacuna.toLowerCase().includes(q));
    }
    return movimientos.filter(
      (r) =>
        r.vacuna.toLowerCase().includes(q) || r.lote.toLowerCase().includes(q),
    );
  }, [inventario, movimientos, busqueda, tab]);

  useEffect(() => {
    setPagina(1);
  }, [busqueda, tab]);

  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA);
  const paginaActual = Math.min(pagina, totalPaginas || 1);
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const datos = filtrados.slice(inicio, inicio + POR_PAGINA);

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

  // Stats resumen
  const criticos = inventario.filter((r) => r.stock < r.minimo).length;
  const bajos = inventario.filter(
    (r) => r.stock >= r.minimo && r.stock < r.minimo * 1.5,
  ).length;
  const totalDosis = inventario.reduce((a, r) => a + r.stock, 0);
  const enBuenEstado = inventario.filter(
    (r) => r.stock >= r.minimo * 1.5,
  ).length;

  function abrirModal() {
    setForm({
      ...FORM_VACIO,
      fechaEntrada: new Date().toISOString().split("T")[0],
    });
    setError("");
    setGuardado(false);
    setModalOpen(true);
  }

  function handleForm(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function guardar(e) {
    e.preventDefault();
    setError("");
    if (!form.vacuna || !form.lote || !form.cantidad || !form.fechaEntrada) {
      setError("Complete todos los campos obligatorios.");
      return;
    }
    const cant = parseInt(form.cantidad);
    if (isNaN(cant) || cant <= 0) {
      setError("La cantidad debe ser un número mayor a 0.");
      return;
    }

    // Actualizar stock en inventario
    setInventario((prev) =>
      prev.map((r) =>
        r.vacuna === form.vacuna
          ? {
              ...r,
              stock: r.stock + cant,
              lote: form.lote,
              ultimaEntrada: form.fechaEntrada,
            }
          : r,
      ),
    );

    // Agregar movimiento
    setMovimientos((prev) => [
      {
        id: prev.length + 1,
        vacuna: form.vacuna,
        tipo: "entrada",
        cantidad: cant,
        lote: form.lote,
        fecha: form.fechaEntrada,
        responsable: usuario?.nombre || "Usuario",
      },
      ...prev,
    ]);

    setGuardado(true);
    setTimeout(() => {
      setModalOpen(false);
      setGuardado(false);
    }, 1200);
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
    { label: "Inventario", ruta: "/inventario", activo: true },
    { label: "Reportes", ruta: "/reportes", activo: false },
    { label: "Perfil", ruta: "/perfil", activo: false },
  ];

  return (
    <div className="min-h-screen flex bg-blue-50">
      {/* Overlay móvil */}
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
              className="w-9 h-9 bg-white rounded-full flex items-center justify-center
                            text-blue-600 font-bold text-sm flex-shrink-0"
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
          <span className="text-white text-sm font-semibold">Inventario</span>
          <div
            className="w-9 h-9 bg-white rounded-full flex items-center justify-center
                          text-blue-600 font-bold text-xs"
          >
            {iniciales}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {/* Encabezado */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-blue-900">
                Inventario de vacunas
              </h1>
              <p className="text-xs sm:text-sm text-blue-400 mt-0.5">
                Control de stock de biológicos
              </p>
            </div>
            <button
              onClick={abrirModal}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700
                         active:scale-[0.98] text-white font-semibold px-4 py-2.5 rounded-xl
                         text-sm transition-all shadow-md shadow-blue-200 touch-manipulation
                         self-start sm:self-auto"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Registrar entrada
            </button>
          </div>

          {/* ── Tarjetas resumen ─────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <StatCard
              label="Tipos de vacuna"
              valor={inventario.length}
              color="blue"
              icono={<IcoStock />}
            />
            <StatCard
              label="Dosis totales"
              valor={totalDosis.toLocaleString()}
              color="blue"
              icono={<IcoReportes />}
            />
            <StatCard
              label="Stock crítico"
              valor={criticos}
              color="amber"
              icono={<IcoAlerta />}
            />
            <StatCard
              label="En buen estado"
              valor={enBuenEstado}
              color="green"
              icono={<IcoCheck />}
            />
          </div>

          {/* Alertas críticas */}
          {criticos > 0 && (
            <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <p className="text-sm font-semibold text-blue-700">
                  {criticos} vacuna{criticos > 1 ? "s" : ""} con stock crítico
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {inventario
                  .filter((r) => r.stock < r.minimo)
                  .map((r) => (
                    <span
                      key={r.id}
                      className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full
                               text-xs font-semibold"
                    >
                      {r.vacuna} — {r.stock} dosis
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-blue-100/50 rounded-xl p-1 w-fit">
            {[
              { key: "inventario", label: "Stock actual" },
              { key: "movimientos", label: "Historial de lotes" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition touch-manipulation
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

          {/* Buscador */}
          <div className="relative mb-4">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300">
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </span>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={
                tab === "inventario"
                  ? "Buscar vacuna..."
                  : "Buscar vacuna o lote..."
              }
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-blue-200 rounded-xl
                         text-sm focus:outline-none focus:ring-2 focus:ring-blue-400
                         focus:border-transparent transition"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <IcoCerrar />
              </button>
            )}
          </div>

          {/* ── Tabla stock actual ───────────────────────── */}
          {tab === "inventario" && (
            <div className="bg-white rounded-2xl border border-blue-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-blue-50 border-b border-blue-100">
                    <tr>
                      {[
                        "Vacuna",
                        "Stock actual",
                        "Mínimo",
                        "Nivel de stock",
                        "Último lote",
                        "Últ. entrada",
                        "Estado",
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
                    {datos.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-10 text-center text-gray-400 text-sm"
                        >
                          No se encontraron vacunas.
                        </td>
                      </tr>
                    ) : (
                      datos.map((r) => {
                        const est = estadoStock(r.stock, r.minimo);
                        return (
                          <tr
                            key={r.id}
                            className="hover:bg-blue-50/40 transition"
                          >
                            <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">
                              {r.vacuna}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`font-bold text-base ${
                                  r.stock < r.minimo
                                    ? "text-blue-600"
                                    : r.stock < r.minimo * 1.5
                                      ? "text-amber-600"
                                      : "text-gray-800"
                                }`}
                              >
                                {r.stock}
                              </span>
                              <span className="text-gray-400 text-xs ml-1">
                                dosis
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                              {r.minimo} dosis
                            </td>
                            <td className="px-4 py-3 min-w-[120px]">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-blue-50 rounded-full">
                                  <div
                                    className={`h-2 ${est.barra} rounded-full transition-all duration-700`}
                                    style={{ width: `${est.pct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-400 w-8 text-right">
                                  {Math.round(est.pct)}%
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                              {r.lote}
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                              {formatFecha(r.ultimaEntrada)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold
                                             whitespace-nowrap ${est.color}`}
                              >
                                {est.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <Paginacion
                inicio={inicio}
                porPagina={POR_PAGINA}
                total={filtrados.length}
                totalPaginas={totalPaginas}
                paginaActual={paginaActual}
                paginas={paginas}
                setPagina={setPagina}
              />
            </div>
          )}

          {/* ── Tabla historial de movimientos ──────────── */}
          {tab === "movimientos" && (
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
                        "Responsable",
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
                    {datos.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-10 text-center text-gray-400 text-sm"
                        >
                          No se encontraron movimientos.
                        </td>
                      </tr>
                    ) : (
                      datos.map((r) => (
                        <tr
                          key={r.id}
                          className="hover:bg-blue-50/40 transition"
                        >
                          <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
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
                              {r.tipo === "entrada" ? "↑ Entrada" : "↓ Salida"}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-800">
                            {r.tipo === "entrada" ? "+" : "-"}
                            {r.cantidad} dosis
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {r.lote}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                            {formatFecha(r.fecha)}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                            {r.responsable}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <Paginacion
                inicio={inicio}
                porPagina={POR_PAGINA}
                total={filtrados.length}
                totalPaginas={totalPaginas}
                paginaActual={paginaActual}
                paginas={paginas}
                setPagina={setPagina}
              />
            </div>
          )}
        </main>
      </div>

      {/* ── Modal registrar entrada ──────────────────────── */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md
                          max-h-[90vh] overflow-y-auto"
          >
            <div
              className="flex items-center justify-between px-6 py-4
                            border-b border-blue-100 sticky top-0 bg-white z-10"
            >
              <h3 className="text-base font-semibold text-blue-900">
                Registrar entrada de lote
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition p-1"
              >
                <IcoCerrar />
              </button>
            </div>

            <form onSubmit={guardar} noValidate>
              <div className="px-6 py-5 space-y-4">
                {/* Vacuna */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Tipo de vacuna *
                  </label>
                  <select
                    value={form.vacuna}
                    onChange={(e) => handleForm("vacuna", e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Seleccionar...</option>
                    {TIPOS_VACUNA.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  {form.vacuna && (
                    <p className="text-xs text-gray-400 mt-1">
                      Stock actual:{" "}
                      <span className="font-semibold text-gray-600">
                        {inventario.find((r) => r.vacuna === form.vacuna)
                          ?.stock ?? 0}{" "}
                        dosis
                      </span>
                    </p>
                  )}
                </div>

                {/* Lote + Cantidad */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Número de lote *
                    </label>
                    <input
                      type="text"
                      value={form.lote}
                      onChange={(e) => handleForm("lote", e.target.value)}
                      placeholder="Ej: BCG-004"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Cantidad de dosis *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.cantidad}
                      onChange={(e) => handleForm("cantidad", e.target.value)}
                      placeholder="Ej: 100"
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Fechas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Fecha de entrada *
                    </label>
                    <input
                      type="date"
                      value={form.fechaEntrada}
                      onChange={(e) =>
                        handleForm("fechaEntrada", e.target.value)
                      }
                      max={new Date().toISOString().split("T")[0]}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Fecha de vencimiento
                    </label>
                    <input
                      type="date"
                      value={form.vencimiento}
                      onChange={(e) =>
                        handleForm("vencimiento", e.target.value)
                      }
                      min={new Date().toISOString().split("T")[0]}
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Preview del nuevo stock */}
                {form.vacuna &&
                  form.cantidad &&
                  parseInt(form.cantidad) > 0 && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                      <p className="text-xs text-green-700 font-medium">
                        Stock después del registro:{" "}
                        <span className="font-bold text-green-800 text-sm">
                          {(inventario.find((r) => r.vacuna === form.vacuna)
                            ?.stock ?? 0) + parseInt(form.cantidad)}{" "}
                          dosis
                        </span>
                      </p>
                    </div>
                  )}

                {error && (
                  <div
                    className="px-4 py-3 bg-blue-50 border border-blue-200
                                  rounded-xl text-sm text-blue-600"
                  >
                    {error}
                  </div>
                )}
                {guardado && (
                  <div
                    className="px-4 py-3 bg-green-50 border border-green-200
                                  rounded-xl text-sm text-green-700 font-medium
                                  flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Entrada registrada correctamente
                  </div>
                )}
              </div>

              <div className="flex gap-3 px-6 pb-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm
                             font-medium text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold
                             py-2.5 rounded-xl text-sm transition active:scale-[0.98]"
                >
                  Registrar entrada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente paginación reutilizable ──────────────────────
function Paginacion({
  inicio,
  porPagina,
  total,
  totalPaginas,
  paginaActual,
  paginas,
  setPagina,
}) {
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
          <button
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={paginaActual === 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg border
                       border-blue-200 bg-white text-blue-500 hover:bg-blue-50
                       disabled:opacity-40 disabled:cursor-not-allowed transition"
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
          </button>
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
          <button
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={paginaActual === totalPaginas}
            className="w-8 h-8 flex items-center justify-center rounded-lg border
                       border-blue-200 bg-white text-blue-500 hover:bg-blue-50
                       disabled:opacity-40 disabled:cursor-not-allowed transition"
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
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tarjeta stat ────────────────────────────────────────────
function StatCard({ label, valor, color, icono }) {
  const e =
    {
      blue: {
        wrap: "bg-white border-blue-100",
        ic: "bg-blue-100 text-blue-600",
        val: "text-blue-900",
      },
      amber: {
        wrap: "bg-amber-50 border-amber-100",
        ic: "bg-amber-100 text-amber-600",
        val: "text-amber-900",
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
