import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "";

// Color por tipo de actividad
const COLOR_DOT = {
  green: "bg-green-500",
  blue: "bg-blue-500",
  red: "bg-red-400",
};

// Colores de barra por posición en ranking de cobertura
const COLORES_BARRA = [
  "bg-blue-700",
  "bg-blue-600",
  "bg-blue-500",
  "bg-blue-400",
  "bg-blue-300",
  "bg-blue-200",
  "bg-blue-100",
  "bg-sky-300",
];

export default function Dashboard() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    }),
    [],
  );

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

  // ── Cargar datos del dashboard ────────────────────────────
  useEffect(() => {
    async function cargar() {
      setCargando(true);
      setError("");
      try {
        const resp = await fetch(`${API}/api/dashboard`, { headers });
        const data = await resp.json();
        if (data.ok) {
          setDatos(data);
        } else {
          setError(data.mensaje || "Error al cargar los datos.");
        }
      } catch (err) {
        console.error(err);
        setError("No se pudo conectar con el servidor.");
      } finally {
        setCargando(false);
      }
    }
    cargar();
    // Refrescar cada 2 minutos
    const intervalo = setInterval(cargar, 120000);
    return () => clearInterval(intervalo);
  }, [headers]);

  const iniciales = usuario?.nombre
    ? usuario.nombre
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "??";

  const fecha = new Date().toLocaleDateString("es-VE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const esAdmin = usuario?.rol === "administrador";

  const STATS = datos
    ? [
        {
          label: "Vacunas del mes",
          valor: datos.stats.vacunas_mes.toLocaleString(),
          color: "blue",
          icono: <IcoVacuna />,
          ruta: "/vacunas",
        },
        {
          label: "Vacunas hoy",
          valor: datos.stats.vacunas_hoy.toLocaleString(),
          color: "blue",
          icono: <IcoHoy />,
          ruta: "/vacunas",
        },
        {
          label: "Pacientes registrados",
          valor: datos.stats.pacientes.toLocaleString(),
          color: "blue",
          icono: <IcoPacientes />,
          ruta: "/vacunas",
        },
        {
          label: "Stock crítico",
          valor: datos.stats.stock_critico.toLocaleString(),
          color: datos.stats.stock_critico > 0 ? "amber" : "green",
          icono: <IcoAlerta />,
          ruta: "/inventario",
        },
        {
          label: "Movimientos del mes",
          valor: datos.stats.reportes_mes.toLocaleString(),
          color: "blue",
          icono: <IcoReportes />,
          ruta: "/inventario",
        },
      ]
    : [];

  const NAV = [
    { label: "Inicio", ruta: "/dashboard", activo: true },
    { label: "Vacunas", ruta: "/vacunas", activo: false },
    { label: "Inventario", ruta: "/inventario", activo: false },
    { label: "Reportes", ruta: "/reportes", activo: false },
    { label: "Perfil", ruta: "/perfil", activo: false },
  ];

  const MODULOS = [
    {
      titulo: "Vacunas aplicadas",
      desc: "Registra y consulta las dosis aplicadas. Historial completo por paciente.",
      ruta: "/vacunas",
      icBg: "bg-blue-100",
      icColor: "text-blue-600",
      badge: null,
      icono: <IcoVacuna />,
    },
    {
      titulo: "Inventario",
      desc: "Controla el stock de biológicos. Alertas cuando el stock baja del mínimo.",
      ruta: "/inventario",
      icBg: "bg-blue-100",
      icColor: "text-blue-600",
      badge:
        datos?.stats.stock_critico > 0
          ? {
              texto: `${datos.stats.stock_critico} alertas`,
              color: "bg-amber-100 text-amber-700",
            }
          : null,
      icono: <IcoStock />,
    },
    {
      titulo: "Reportes",
      desc: "Estadísticas de cobertura y vacunación. Exporta en PDF o Excel.",
      ruta: "/reportes",
      icBg: "bg-blue-100",
      icColor: "text-blue-600",
      badge: null,
      icono: <IcoReportes />,
    },
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
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
              className="text-white/40 hover:text-blue-300 transition p-1 flex-shrink-0"
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
          <span className="text-white text-sm font-semibold">
            Panel de control
          </span>
          <div
            className="w-9 h-9 bg-white rounded-full flex items-center
                          justify-center text-blue-600 font-bold text-xs"
          >
            {iniciales}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {/* Encabezado */}
          <div
            className="flex flex-col sm:flex-row sm:items-start
                          sm:justify-between gap-3 mb-6 sm:mb-7"
          >
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-blue-900">
                Panel de control
              </h1>
              <p className="text-xs sm:text-sm text-blue-500 mt-0.5 capitalize">
                Bienvenido,{" "}
                <span className="font-semibold text-blue-700">
                  {usuario?.nombre || "..."}
                </span>
                <span className="hidden sm:inline"> · {fecha}</span>
              </p>
            </div>

            {/* Badge alerta crítica */}
            {datos?.stats.stock_critico > 0 && (
              <button
                onClick={() => navigate("/inventario")}
                className="flex items-center gap-2 bg-amber-50 border border-amber-200
                           hover:bg-amber-100 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5
                           self-start transition"
              >
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse flex-shrink-0" />
                <span className="text-amber-700 text-xs sm:text-sm font-medium whitespace-nowrap">
                  {datos.stats.stock_critico} alerta
                  {datos.stats.stock_critico > 1 ? "s" : ""} de stock
                </span>
              </button>
            )}
          </div>

          {/* ── Error ─────────────────────────────────────── */}
          {error && (
            <div
              className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl
                            text-sm text-red-600 flex items-center gap-2"
            >
              <IcoAlerta className="w-4 h-4 flex-shrink-0" />
              {error}
              <button
                onClick={() => window.location.reload()}
                className="ml-auto text-red-600 underline text-xs"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* ── Tarjetas de estadísticas ───────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 mb-7">
            {cargando
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white border border-blue-100 rounded-2xl
                                        p-3 sm:p-4 animate-pulse"
                  >
                    <div className="w-9 h-9 bg-blue-100 rounded-xl mb-3" />
                    <div className="h-7 bg-blue-100 rounded mb-1 w-16" />
                    <div className="h-3 bg-blue-50 rounded w-24" />
                  </div>
                ))
              : STATS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => navigate(s.ruta)}
                    className="text-left hover:scale-[1.02] transition-transform active:scale-[0.98]
                           touch-manipulation"
                  >
                    <StatCard {...s} />
                  </button>
                ))}
          </div>

          {/* ── Módulos del sistema ───────────────────────── */}
          <h2
            className="text-xs sm:text-sm font-semibold text-blue-400 uppercase
                         tracking-wider mb-3 sm:mb-4"
          >
            Módulos del sistema
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-7">
            {MODULOS.map((mod) => (
              <ModCard
                key={mod.titulo}
                mod={mod}
                onClick={() => navigate(mod.ruta)}
              />
            ))}
          </div>

          {/* ── Actividad reciente + Cobertura ───────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            {/* Actividad reciente */}
            <div className="bg-white rounded-2xl border border-blue-100 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">
                  Actividad reciente
                </h3>
                {!cargando && datos?.actividad?.length === 0 && (
                  <span className="text-xs text-gray-400">Sin actividad</span>
                )}
              </div>

              {cargando ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 py-2 animate-pulse"
                    >
                      <div className="w-2 h-2 bg-blue-100 rounded-full mt-2 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="h-3 bg-blue-50 rounded w-full mb-1" />
                        <div className="h-2 bg-blue-50 rounded w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : datos?.actividad?.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-sm">
                    No hay actividad registrada aún.
                  </p>
                  <button
                    onClick={() => navigate("/vacunas")}
                    className="mt-3 text-blue-600 text-xs font-medium hover:underline"
                  >
                    Registrar primera vacuna →
                  </button>
                </div>
              ) : (
                <div>
                  {datos.actividad.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 py-3 border-b border-blue-50 last:border-0"
                    >
                      <span
                        className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0
                                       ${COLOR_DOT[a.color] || "bg-gray-300"}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-gray-700 leading-snug">
                          {a.texto}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {a.tiempo}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cobertura por vacuna */}
            <div className="bg-white rounded-2xl border border-blue-100 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">
                  Cobertura por vacuna
                </h3>
                <span className="text-xs text-gray-400">Total acumulado</span>
              </div>

              {cargando ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex justify-between mb-1">
                        <div className="h-3 bg-blue-50 rounded w-24" />
                        <div className="h-3 bg-blue-50 rounded w-10" />
                      </div>
                      <div className="h-2 bg-blue-50 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : datos?.cobertura?.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-sm">
                    Sin datos de vacunación aún.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {datos.cobertura.slice(0, 8).map((c, i) => (
                    <div key={c.vacuna}>
                      <div className="flex justify-between text-xs sm:text-sm mb-1.5">
                        <span className="text-gray-700 font-medium truncate pr-2">
                          {c.vacuna}
                        </span>
                        <span className="text-gray-500 flex-shrink-0">
                          {c.total} dosis · {c.pct}%
                        </span>
                      </div>
                      <div className="h-2 bg-blue-50 rounded-full">
                        <div
                          className={`h-2 rounded-full transition-all duration-700
                                     ${COLORES_BARRA[i] || "bg-blue-200"}`}
                          style={{
                            width: `${Math.max(c.pct, c.total > 0 ? 3 : 0)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!cargando && datos?.cobertura?.length > 0 && (
                <div className="mt-4 pt-3 border-t border-blue-50 flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    Total:{" "}
                    <span className="font-semibold text-gray-600">
                      {datos.cobertura
                        .reduce((a, c) => a + c.total, 0)
                        .toLocaleString()}{" "}
                      dosis aplicadas
                    </span>
                  </p>
                  <button
                    onClick={() => navigate("/reportes")}
                    className="text-xs text-blue-600 font-medium hover:underline transition"
                  >
                    Ver reportes →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Accesos rápidos (solo admin) ──────────────── */}
          {esAdmin && (
            <div className="mt-5 bg-white rounded-2xl border border-blue-100 p-4 sm:p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                Accesos rápidos de administración
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: "Gestionar usuarios",
                    ruta: "/perfil",
                    icono: <IcoPerfil />,
                    color: "bg-blue-50 text-blue-700 border-blue-200",
                  },
                  {
                    label: "Ver inventario",
                    ruta: "/inventario",
                    icono: <IcoStock />,
                    color: "bg-blue-50 text-blue-700 border-blue-200",
                  },
                  {
                    label: "Generar reportes",
                    ruta: "/reportes",
                    icono: <IcoReportes />,
                    color: "bg-blue-50 text-blue-700 border-blue-200",
                  },
                  {
                    label: "Registrar vacuna",
                    ruta: "/vacunas",
                    icono: <IcoVacuna />,
                    color: "bg-blue-50 text-blue-700 border-blue-200",
                  },
                ].map((a) => (
                  <button
                    key={a.label}
                    onClick={() => navigate(a.ruta)}
                    className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border
                               text-xs sm:text-sm font-medium transition
                               hover:shadow-sm active:scale-[0.98] touch-manipulation
                               ${a.color}`}
                  >
                    <span className="w-4 h-4 flex-shrink-0">{a.icono}</span>
                    <span className="text-left leading-tight">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Timestamp de última actualización */}
          {!cargando && !error && (
            <p className="text-center text-xs text-gray-400 mt-6">
              Datos actualizados ·{" "}
              {new Date().toLocaleTimeString("es-VE", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {" · "}
              <button
                onClick={() => window.location.reload()}
                className="text-blue-400 hover:text-blue-600 underline transition"
              >
                Actualizar ahora
              </button>
            </p>
          )}
        </main>
      </div>
    </div>
  );
}

// ── Tarjeta de estadística ──────────────────────────────────
function StatCard({ label, valor, color, icono }) {
  const e =
    {
      blue: {
        wrap: "bg-white border-blue-100",
        ic: "bg-blue-100 text-blue-600",
        val: "text-blue-900",
      },
      amber: {
        wrap: "bg-amber-50 border-amber-200",
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

// ── Tarjeta de módulo ───────────────────────────────────────
function ModCard({ mod, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-white border border-blue-100 rounded-2xl p-5 sm:p-6
                 text-left hover:border-blue-400 hover:shadow-lg hover:shadow-blue-100
                 transition-all duration-200 active:scale-[0.98] group w-full
                 touch-manipulation"
    >
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div
          className={`w-11 h-11 sm:w-12 sm:h-12 ${mod.icBg} rounded-xl flex items-center
                        justify-center ${mod.icColor}
                        group-hover:scale-110 transition-transform`}
        >
          {mod.icono}
        </div>
        {mod.badge && (
          <span
            className={`text-xs font-semibold px-2 py-1 rounded-full ${mod.badge.color}`}
          >
            {mod.badge.texto}
          </span>
        )}
      </div>
      <h3 className="font-semibold text-gray-800 mb-1.5 sm:mb-2 text-sm sm:text-base">
        {mod.titulo}
      </h3>
      <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
        {mod.desc}
      </p>
      <div
        className={`mt-3 sm:mt-4 flex items-center gap-1.5 text-xs sm:text-sm font-medium
                      ${mod.icColor} opacity-0 group-hover:opacity-100 transition-opacity`}
      >
        Abrir módulo
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
            d="M13 7l5 5m0 0l-5 5m5-5H6"
          />
        </svg>
      </div>
    </button>
  );
}
// ── Iconos ──────────────────────────────────────────────────
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
        d="M12 12a5 5 0 100-10 5 5 0 000 10zm-7 9a7 7 0 0114 0"
      />
    </svg>
  );
}

function IcoMenu() {
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
        d="M4 6h16M4 12h16M4 18h16"
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
        d="M17 16l4-4m0 0l-4-4m4 4H9"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 20H6a2 2 0 01-2-2V6a2 2 0 012-2h7"
      />
    </svg>
  );
}

function IcoHoy() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IcoJeringa() {
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
        d="M14 4l6 6M8 10l6 6M10 8l8-8M6 12l6 6M2 22l6-6"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 13l-7 7" />
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
