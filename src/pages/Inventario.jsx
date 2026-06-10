import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "";
const POR_PAGINA = 10;

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

function estadoStock(stock, minimo) {
  if (stock <= 0)
    return {
      label: "Sin stock",
      color: "bg-gray-100 text-gray-500",
      barra: "bg-gray-400",
      pct: 0,
    };
  if (stock < minimo)
    return {
      label: "Crítico",
      color: "bg-red-100 text-red-700",
      barra: "bg-red-500",
      pct: Math.max(5, Math.min((stock / (minimo * 3)) * 100, 100)),
    };
  if (stock < minimo * 1.5)
    return {
      label: "Bajo",
      color: "bg-amber-100 text-amber-700",
      barra: "bg-amber-400",
      pct: Math.min((stock / (minimo * 3)) * 100, 100),
    };
  return {
    label: "OK",
    color: "bg-green-100 text-green-700",
    barra: "bg-green-500",
    pct: Math.min((stock / (minimo * 3)) * 100, 100),
  };
}

function formatFecha(f) {
  if (!f) return "—";
  return new Date(f).toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const FORM_VACIO = {
  tipo_vacuna_id: "",
  lote: "",
  cantidad: "",
  fecha_entrada: new Date().toISOString().split("T")[0],
  vencimiento: "",
  observaciones: "",
};

export default function Inventario() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Datos
  const [inventario, setInventario] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [alertas, setAlertas] = useState([]);

  // Movimientos
  const [movimientos, setMovimientos] = useState([]);
  const [totalMov, setTotalMov] = useState(0);
  const [paginaMov, setPaginaMov] = useState(1);

  // Estados de carga
  const [cargandoInv, setCargandoInv] = useState(false);
  const [cargandoMov, setCargandoMov] = useState(false);

  // UI
  const [tab, setTab] = useState("inventario");
  const [busqueda, setBusqueda] = useState("");
  const [filtroVac, setFiltroVac] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");

  // Modal entrada
  const [modalEntrada, setModalEntrada] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [errorForm, setErrorForm] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [okForm, setOkForm] = useState(false);

  // Modal editar mínimo (solo admin)
  const [modalMinimo, setModalMinimo] = useState(null); // { id, vacuna, stock_minimo }
  const [nuevoMinimo, setNuevoMinimo] = useState("");
  const [guardandoMin, setGuardandoMin] = useState(false);
  const [okMin, setOkMin] = useState(false);
  const [errorMin, setErrorMin] = useState("");

  // ── Auth guard ────────────────────────────────────────────
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

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    }),
    [],
  );

  const esAdmin = usuario?.rol === "administrador";

  // ── Cargar inventario + resumen + alertas ─────────────────
  const cargarInventario = useCallback(async () => {
    setCargandoInv(true);
    try {
      const [rInv, rRes, rAl] = await Promise.all([
        fetch(
          `${API}/api/inventario${busqueda ? `?busqueda=${busqueda}` : ""}`,
          { headers },
        ),
        fetch(`${API}/api/inventario/resumen`, { headers }),
        fetch(`${API}/api/inventario/alertas`, { headers }),
      ]);
      const [dInv, dRes, dAl] = await Promise.all([
        rInv.json(),
        rRes.json(),
        rAl.json(),
      ]);
      if (dInv.ok) setInventario(dInv.inventario);
      if (dRes.ok) setResumen(dRes.resumen);
      if (dAl.ok) setAlertas(dAl.alertas);
    } catch (err) {
      console.error("Error cargando inventario:", err);
    } finally {
      setCargandoInv(false);
    }
  }, [busqueda, headers]);

  // ── Cargar movimientos ────────────────────────────────────
  const cargarMovimientos = useCallback(
    async (pag = 1) => {
      setCargandoMov(true);
      try {
        const params = new URLSearchParams({
          page: pag,
          limit: POR_PAGINA,
          ...(filtroVac && { vacuna: filtroVac }),
          ...(filtroTipo && { tipo: filtroTipo }),
        });
        const resp = await fetch(
          `${API}/api/inventario/movimientos?${params}`,
          { headers },
        );
        const data = await resp.json();
        if (data.ok) {
          setMovimientos(data.movimientos);
          setTotalMov(data.total);
          setPaginaMov(pag);
        }
      } catch (err) {
        console.error("Error cargando movimientos:", err);
      } finally {
        setCargandoMov(false);
      }
    },
    [filtroVac, filtroTipo, headers],
  );

  useEffect(() => {
    cargarInventario();
  }, [busqueda]);
  useEffect(() => {
    cargarMovimientos(1);
  }, [filtroVac, filtroTipo]);

  // ── Paginación movimientos ────────────────────────────────
  const totalPagsMov = Math.ceil(totalMov / POR_PAGINA);
  const paginasMov = useMemo(() => {
    if (totalPagsMov <= 5)
      return Array.from({ length: totalPagsMov }, (_, i) => i + 1);
    if (paginaMov <= 3) return [1, 2, 3, 4, 5];
    if (paginaMov >= totalPagsMov - 2)
      return [
        totalPagsMov - 4,
        totalPagsMov - 3,
        totalPagsMov - 2,
        totalPagsMov - 1,
        totalPagsMov,
      ];
    return [
      paginaMov - 2,
      paginaMov - 1,
      paginaMov,
      paginaMov + 1,
      paginaMov + 2,
    ];
  }, [totalPagsMov, paginaMov]);

  // ── Registrar entrada ─────────────────────────────────────
  async function guardarEntrada(e) {
    e.preventDefault();
    setErrorForm("");
    if (!form.tipo_vacuna_id) {
      setErrorForm("Seleccione el tipo de vacuna.");
      return;
    }
    if (!form.lote.trim()) {
      setErrorForm("El número de lote es obligatorio.");
      return;
    }
    if (!form.cantidad || parseInt(form.cantidad) <= 0) {
      setErrorForm("La cantidad debe ser mayor a 0.");
      return;
    }
    if (!form.fecha_entrada) {
      setErrorForm("La fecha de entrada es obligatoria.");
      return;
    }

    setGuardando(true);
    try {
      const resp = await fetch(`${API}/api/inventario/entrada`, {
        method: "POST",
        headers,
        body: JSON.stringify(form),
      });
      const data = await resp.json();
      if (data.ok) {
        setOkForm(true);
        setTimeout(() => {
          setModalEntrada(false);
          setOkForm(false);
          cargarInventario();
          cargarMovimientos(1);
        }, 1200);
      } else {
        setErrorForm(data.mensaje || "Error al registrar la entrada.");
        console.error("Backend:", data.detalle);
      }
    } catch {
      setErrorForm("No se pudo conectar con el servidor.");
    } finally {
      setGuardando(false);
    }
  }

  // ── Actualizar stock mínimo ───────────────────────────────
  async function guardarMinimo(e) {
    e.preventDefault();
    setErrorMin("");
    if (
      !nuevoMinimo ||
      isNaN(parseInt(nuevoMinimo)) ||
      parseInt(nuevoMinimo) < 0
    ) {
      setErrorMin("Ingrese un número válido mayor o igual a 0.");
      return;
    }
    setGuardandoMin(true);
    try {
      const resp = await fetch(
        `${API}/api/inventario/${modalMinimo.id}/minimo`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ stock_minimo: parseInt(nuevoMinimo) }),
        },
      );
      const data = await resp.json();
      if (data.ok) {
        setOkMin(true);
        setTimeout(() => {
          setModalMinimo(null);
          setOkMin(false);
          cargarInventario();
        }, 1200);
      } else {
        setErrorMin(data.mensaje || "Error al actualizar.");
      }
    } catch {
      setErrorMin("No se pudo conectar.");
    } finally {
      setGuardandoMin(false);
    }
  }

  // ── Preview del nuevo stock en el form ────────────────────
  const stockActualForm = useMemo(() => {
    if (!form.tipo_vacuna_id) return null;
    const item = inventario.find(
      (i) => i.tipo_vacuna_id === parseInt(form.tipo_vacuna_id),
    );
    return item ? item.stock_actual : 0;
  }, [form.tipo_vacuna_id, inventario]);

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
                         ${
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
                {item.label === "Perfil" && <IcoPerfil />}
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
                {usuario?.nombre}
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
        <header
          className="lg:hidden sticky top-0 z-10 bg-blue-900
                           border-b border-white/10 px-4 py-3
                           flex items-center justify-between"
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white p-1 touch-manipulation"
          >
            <IcoMenu />
          </button>
          <span className="text-white text-sm font-semibold">Inventario</span>
          <div
            className="w-9 h-9 bg-white rounded-full flex items-center
                          justify-center text-blue-600 font-bold text-xs"
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
              onClick={() => {
                setForm({
                  ...FORM_VACIO,
                  fecha_entrada: new Date().toISOString().split("T")[0],
                });
                setErrorForm("");
                setOkForm(false);
                setModalEntrada(true);
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700
                         text-white font-semibold px-4 py-2.5 rounded-xl text-sm
                         transition active:scale-[0.98] touch-manipulation
                         shadow-md shadow-blue-200 self-start sm:self-auto"
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

          {/* Tarjetas de resumen */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-5">
            <StatCard
              label="Tipos de vacuna"
              valor={resumen ? parseInt(resumen.total_tipos) : "—"}
              color="blue"
              icono={<IcoStock />}
            />
            <StatCard
              label="Dosis totales"
              valor={
                resumen ? parseInt(resumen.total_dosis).toLocaleString() : "—"
              }
              color="blue"
              icono={<IcoReportes />}
            />
            <StatCard
              label="Stock crítico"
              valor={resumen ? parseInt(resumen.criticos) : "—"}
              color="amber"
              icono={<IcoAlerta />}
            />
            <StatCard
              label="En buen estado"
              valor={resumen ? parseInt(resumen.en_buen_estado) : "—"}
              color="green"
              icono={<IcoCheck />}
            />
          </div>

          {/* Banner alertas críticas */}
          {alertas.length > 0 && (
            <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <p className="text-sm font-semibold text-red-700">
                  {
                    alertas.filter(
                      (a) => a.estado === "critico" || a.estado === "sin_stock",
                    ).length
                  }{" "}
                  vacuna(s) con stock crítico
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {alertas
                  .filter(
                    (a) => a.estado === "critico" || a.estado === "sin_stock",
                  )
                  .map((a) => (
                    <span
                      key={a.vacuna}
                      className="px-2.5 py-1 bg-red-100 text-red-700 rounded-full
                               text-xs font-semibold"
                    >
                      {a.vacuna} — {a.stock_actual} dosis
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-blue-100/60 rounded-xl p-1 w-fit">
            {[
              { key: "inventario", label: "Stock actual" },
              { key: "movimientos", label: "Historial de lotes" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition
                           touch-manipulation whitespace-nowrap
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

          {/* ── TAB: Stock actual ──────────────────────────── */}
          {tab === "inventario" && (
            <>
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
                  placeholder="Buscar vacuna..."
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-blue-200
                             rounded-xl text-sm focus:outline-none focus:ring-2
                             focus:ring-blue-400 transition"
                />
                {busqueda && (
                  <button
                    onClick={() => setBusqueda("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2
                               text-gray-400 hover:text-gray-600"
                  >
                    <IcoCerrar />
                  </button>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-blue-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-blue-50 border-b border-blue-100">
                      <tr>
                        {[
                          "Vacuna",
                          "Stock actual",
                          "Mínimo",
                          "Nivel",
                          "Último lote",
                          "Últ. entrada",
                          "Estado",
                          esAdmin ? "Acciones" : "",
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
                      {cargandoInv ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-10 text-center">
                            <span
                              className="inline-block w-6 h-6 border-2 border-blue-300
                                           border-t-blue-600 rounded-full animate-spin"
                            />
                          </td>
                        </tr>
                      ) : inventario.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-4 py-10 text-center text-gray-400"
                          >
                            No se encontraron vacunas.
                          </td>
                        </tr>
                      ) : (
                        inventario.map((r) => {
                          const est = estadoStock(
                            r.stock_actual,
                            r.stock_minimo,
                          );
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
                                  className={`font-bold text-lg ${
                                    r.stock_actual < r.stock_minimo
                                      ? "text-red-600"
                                      : r.stock_actual < r.stock_minimo * 1.5
                                        ? "text-amber-600"
                                        : "text-gray-800"
                                  }`}
                                >
                                  {r.stock_actual}
                                </span>
                                <span className="text-gray-400 text-xs ml-1">
                                  dosis
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                                {r.stock_minimo} dosis
                              </td>
                              <td className="px-4 py-3 min-w-[130px]">
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
                                {r.ultimo_lote || "—"}
                              </td>
                              <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                                {formatFecha(r.ultima_entrada)}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-xs
                                             font-semibold whitespace-nowrap ${est.color}`}
                                >
                                  {est.label}
                                </span>
                              </td>
                              {esAdmin && (
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() => {
                                      setModalMinimo({
                                        id: r.id,
                                        vacuna: r.vacuna,
                                        stock_minimo: r.stock_minimo,
                                      });
                                      setNuevoMinimo(String(r.stock_minimo));
                                      setErrorMin("");
                                      setOkMin(false);
                                    }}
                                    className="text-blue-600 hover:text-blue-800 text-xs
                                             font-medium hover:underline transition whitespace-nowrap"
                                  >
                                    Editar mínimo
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 border-t border-blue-50 bg-blue-50/30">
                  <p className="text-xs text-gray-400">
                    {inventario.length} vacunas en el inventario
                    {alertas.length > 0 && (
                      <span className="ml-2 text-amber-600 font-medium">
                        · {alertas.length} con stock bajo o crítico
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* ── TAB: Historial de movimientos ─────────────── */}
          {tab === "movimientos" && (
            <>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <select
                  value={filtroVac}
                  onChange={(e) => setFiltroVac(e.target.value)}
                  className="px-3 py-2.5 bg-white border border-blue-200 rounded-xl text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-400
                             text-gray-700 sm:w-52"
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
                  className="px-3 py-2.5 bg-white border border-blue-200 rounded-xl text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-400
                             text-gray-700 sm:w-44"
                >
                  <option value="">Entradas y salidas</option>
                  <option value="entrada">Solo entradas</option>
                  <option value="salida">Solo salidas</option>
                </select>
              </div>

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
                          "Vencimiento",
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
                      {cargandoMov ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-10 text-center">
                            <span
                              className="inline-block w-6 h-6 border-2 border-blue-300
                                           border-t-blue-600 rounded-full animate-spin"
                            />
                          </td>
                        </tr>
                      ) : movimientos.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-10 text-center text-gray-400"
                          >
                            No se encontraron movimientos.
                          </td>
                        </tr>
                      ) : (
                        movimientos.map((r) => (
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
                                  : "bg-red-100 text-red-700"
                              }`}
                              >
                                {r.tipo === "entrada"
                                  ? "↑ Entrada"
                                  : "↓ Salida"}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-bold whitespace-nowrap">
                              <span
                                className={
                                  r.tipo === "entrada"
                                    ? "text-green-600"
                                    : "text-red-600"
                                }
                              >
                                {r.tipo === "entrada" ? "+" : "-"}
                                {r.cantidad}
                              </span>
                              <span className="text-gray-400 text-xs ml-1">
                                dosis
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs">
                              {r.lote || "—"}
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                              {formatFecha(r.fecha)}
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                              {formatFecha(r.vencimiento)}
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

                {/* Paginación movimientos */}
                <div
                  className="px-4 py-3 border-t border-blue-50 bg-blue-50/30
                                flex flex-col sm:flex-row items-center justify-between gap-3"
                >
                  <p className="text-xs text-gray-400 order-2 sm:order-1">
                    Mostrando{" "}
                    <span className="font-semibold text-gray-600">
                      {totalMov === 0 ? 0 : (paginaMov - 1) * POR_PAGINA + 1}–
                      {Math.min(paginaMov * POR_PAGINA, totalMov)}
                    </span>{" "}
                    de{" "}
                    <span className="font-semibold text-gray-600">
                      {totalMov}
                    </span>{" "}
                    registros
                  </p>
                  {totalPagsMov > 1 && (
                    <div className="flex items-center gap-1 order-1 sm:order-2">
                      <BtnPag
                        onClick={() =>
                          cargarMovimientos(Math.max(1, paginaMov - 1))
                        }
                        disabled={paginaMov === 1}
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
                      {paginasMov.map((n) => (
                        <button
                          key={n}
                          onClick={() => cargarMovimientos(n)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs
                                     font-semibold transition border
                                     ${
                                       n === paginaMov
                                         ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                         : "bg-white text-gray-600 border-blue-200 hover:bg-blue-50"
                                     }`}
                        >
                          {n}
                        </button>
                      ))}
                      <BtnPag
                        onClick={() =>
                          cargarMovimientos(
                            Math.min(totalPagsMov, paginaMov + 1),
                          )
                        }
                        disabled={paginaMov === totalPagsMov}
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
              </div>
            </>
          )}
        </main>
      </div>

      {/* ══ MODAL: Registrar entrada de lote ═════════════ */}
      {modalEntrada && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalEntrada(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div
              className="flex items-center justify-between px-6 py-4
                            border-b border-blue-100 sticky top-0 bg-white z-10"
            >
              <h3 className="text-base font-semibold text-blue-900">
                Registrar entrada de lote
              </h3>
              <button
                onClick={() => setModalEntrada(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <IcoCerrar />
              </button>
            </div>

            <form onSubmit={guardarEntrada} noValidate>
              <div className="px-6 py-5 space-y-4">
                {/* Tipo de vacuna */}
                <div>
                  <label className={LBL}>Tipo de vacuna *</label>
                  <select
                    value={form.tipo_vacuna_id}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, tipo_vacuna_id: e.target.value }))
                    }
                    className={INP}
                  >
                    <option value="">Seleccionar...</option>
                    {inventario.map((i) => (
                      <option key={i.tipo_vacuna_id} value={i.tipo_vacuna_id}>
                        {i.vacuna} (stock: {i.stock_actual})
                      </option>
                    ))}
                  </select>

                  {/* Preview stock actual */}
                  {stockActualForm !== null && (
                    <p className="text-xs text-gray-500 mt-1">
                      Stock actual:{" "}
                      <span className="font-semibold text-gray-700">
                        {stockActualForm} dosis
                      </span>
                      {form.cantidad && parseInt(form.cantidad) > 0 && (
                        <span className="ml-2 text-green-600 font-semibold">
                          → {stockActualForm + parseInt(form.cantidad)} dosis
                          después del registro
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {/* Lote + Cantidad */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LBL}>Número de lote *</label>
                    <input
                      type="text"
                      value={form.lote}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, lote: e.target.value }))
                      }
                      placeholder="Ej: BCG-004"
                      className={INP}
                    />
                  </div>
                  <div>
                    <label className={LBL}>Cantidad de dosis *</label>
                    <input
                      type="number"
                      min="1"
                      value={form.cantidad}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, cantidad: e.target.value }))
                      }
                      placeholder="Ej: 100"
                      className={INP}
                    />
                  </div>
                </div>

                {/* Fechas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LBL}>Fecha de entrada *</label>
                    <input
                      type="date"
                      value={form.fecha_entrada}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          fecha_entrada: e.target.value,
                        }))
                      }
                      max={new Date().toISOString().split("T")[0]}
                      className={INP}
                    />
                  </div>
                  <div>
                    <label className={LBL}>Fecha de vencimiento</label>
                    <input
                      type="date"
                      value={form.vencimiento}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, vencimiento: e.target.value }))
                      }
                      min={new Date().toISOString().split("T")[0]}
                      className={INP}
                    />
                  </div>
                </div>

                {/* Observaciones */}
                <div>
                  <label className={LBL}>Observaciones</label>
                  <textarea
                    value={form.observaciones}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, observaciones: e.target.value }))
                    }
                    placeholder="Opcional..."
                    rows={2}
                    className={`${INP} resize-none`}
                  />
                </div>

                {errorForm && <MsgError msg={errorForm} />}
                {okForm && <MsgOk msg="Entrada registrada correctamente." />}
              </div>

              <div className="flex gap-3 px-6 pb-6">
                <button
                  type="button"
                  onClick={() => setModalEntrada(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm
                             font-medium text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50
                             text-white font-semibold py-2.5 rounded-xl text-sm
                             transition active:scale-[0.98] flex items-center
                             justify-center gap-2"
                >
                  {guardando ? (
                    <>
                      <Spinner /> Guardando...
                    </>
                  ) : (
                    "Registrar entrada"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL: Editar stock mínimo (solo admin) ══════ */}
      {modalMinimo && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalMinimo(null);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-blue-100">
              <div>
                <h3 className="text-base font-semibold text-blue-900">
                  Editar stock mínimo
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {modalMinimo.vacuna}
                </p>
              </div>
              <button
                onClick={() => setModalMinimo(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <IcoCerrar />
              </button>
            </div>
            <form onSubmit={guardarMinimo} noValidate>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className={LBL}>Stock mínimo actual</label>
                  <p className="text-2xl font-bold text-blue-600">
                    {modalMinimo.stock_minimo} dosis
                  </p>
                </div>
                <div>
                  <label className={LBL}>Nuevo stock mínimo *</label>
                  <input
                    type="number"
                    min="0"
                    value={nuevoMinimo}
                    onChange={(e) => setNuevoMinimo(e.target.value)}
                    placeholder="Ej: 20"
                    className={INP}
                    autoFocus
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Se generará alerta cuando el stock baje de este número.
                  </p>
                </div>
                {errorMin && <MsgError msg={errorMin} />}
                {okMin && <MsgOk msg="Stock mínimo actualizado." />}
              </div>
              <div className="flex gap-3 px-6 pb-6">
                <button
                  type="button"
                  onClick={() => setModalMinimo(null)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm
                             font-medium text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoMin}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50
                             text-white font-semibold py-2.5 rounded-xl text-sm
                             transition active:scale-[0.98] flex items-center
                             justify-center gap-2"
                >
                  {guardandoMin ? (
                    <>
                      <Spinner /> Guardando...
                    </>
                  ) : (
                    "Guardar"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componentes helper ──────────────────────────────────────
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

function MsgError({ msg }) {
  return (
    <div
      className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl
                    text-sm text-red-600 flex items-start gap-2"
    >
      <IcoAlerta className="w-4 h-4 flex-shrink-0 mt-0.5" />
      {msg}
    </div>
  );
}

function MsgOk({ msg }) {
  return (
    <div
      className="px-4 py-3 bg-green-50 border border-green-200 rounded-xl
                    text-sm text-green-700 font-medium flex items-center gap-2"
    >
      <IcoCheck className="w-4 h-4 flex-shrink-0" />
      {msg}
    </div>
  );
}

function Spinner() {
  return (
    <span
      className="w-4 h-4 border-2 border-white/30 border-t-white
                     rounded-full animate-spin inline-block"
    />
  );
}

const INP = `w-full px-3 py-2.5 border border-blue-200 rounded-xl text-sm
  focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent
  transition text-gray-700 bg-white`;

const LBL = "block text-xs font-semibold text-gray-700 mb-1.5";

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
function IcoPerfil() {
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
function IcoAlerta({ className }) {
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
        d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
      />
    </svg>
  );
}
function IcoCheck({ className }) {
  return (
    <svg
      className={className || "w-5 h-5"}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
