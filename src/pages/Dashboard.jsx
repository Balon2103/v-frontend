import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const STATS = [
  {
    label: "Vacunas del mes",
    valor: "1,248",
    color: "blue",
    icono: <IcoVacuna />,
  },
  {
    label: "Pacientes registrados",
    valor: "3,540",
    color: "blue",
    icono: <IcoPacientes />,
  },
  {
    label: "Stock disponible",
    valor: "4,820",
    color: "blue",
    icono: <IcoStock />,
  },
  { label: "Stock crítico", valor: "3", color: "amber", icono: <IcoAlerta /> },
  {
    label: "Tipos de vacuna",
    valor: "8",
    color: "blue",
    icono: <IcoReportes />,
  },
];
const MODULOS = [
  {
    titulo: "Vacunas aplicadas",
    desc: "Registra y consulta las dosis aplicadas a cada paciente. Historial completo con lote, fecha y tipo de vacuna.",
    ruta: "/vacunas",
    icBg: "bg-blue-100",
    icColor: "text-blue-600",
    badge: null,
    icono: <IcoVacuna />,
  },
  {
    titulo: "Inventario",
    desc: "Controla el stock de biológicos disponibles. Alertas automáticas cuando el stock baja del mínimo.",
    ruta: "/inventario",
    icBg: "bg-blue-100",
    icColor: "text-blue-600",
    badge: { texto: "2 alertas", color: "bg-amber-100 text-amber-700" },
    icono: <IcoStock />,
  },
  {
    titulo: "Reportes",
    desc: "Genera estadísticas de cobertura y vacunación por período. Exporta en PDF o Excel.",
    ruta: "/reportes",
    icBg: "bg-blue-100",
    icColor: "text-blue-600",
    badge: null,
    icono: <IcoReportes />,
  },
];

const ACTIVIDAD = [
  {
    texto: "BCG aplicada · Paciente V-12345678",
    tiempo: "hace 5 min",
    color: "bg-blue-500",
  },
  {
    texto: "Pentavalente (dosis 2) · Paciente V-87654321",
    tiempo: "hace 18 min",
    color: "bg-blue-500",
  },
  {
    texto: "Alerta: stock crítico · Fiebre Amarilla",
    tiempo: "hace 1h",
    color: "bg-amber-400",
  },
  {
    texto: "Polio Oral registrada · Paciente V-11223344",
    tiempo: "hace 2h",
    color: "bg-blue-400",
  },
  {
    texto: "Toxoide aplicado · Paciente V-55667788",
    tiempo: "hace 3h",
    color: "bg-blue-300",
  },
];

const COBERTURA = [
  { nombre: "BCG", pct: 88, color: "bg-blue-700" },
  { nombre: "Polio Inyectable (IPV)", pct: 76, color: "bg-blue-600" },
  { nombre: "Polio Oral", pct: 82, color: "bg-blue-500" },
  { nombre: "Pentavalente", pct: 91, color: "bg-blue-400" },
  { nombre: "Hepatitis B", pct: 65, color: "bg-blue-400" },
  { nombre: "SRP", pct: 79, color: "bg-blue-300" },
  { nombre: "Fiebre Amarilla", pct: 58, color: "bg-blue-300" },
  { nombre: "Toxoide", pct: 72, color: "bg-blue-200" },
];

const NAV = [
  { label: "Inicio", ruta: "/dashboard", activo: true, icono: <IcoHome /> },
  { label: "Vacunas", ruta: "/vacunas", activo: false, icono: <IcoVacuna /> },
  {
    label: "Inventario",
    ruta: "/inventario",
    activo: false,
    icono: <IcoStock />,
  },
  {
    label: "Reportes",
    ruta: "/reportes",
    activo: false,
    icono: <IcoReportes />,
  },
  { label: "Perfil", ruta: "/perfil", activo: false, icono: <IcoUser /> },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  function irA(ruta) {
    setSidebarOpen(false);
    navigate(ruta);
  }
  function cerrarSesion() {
    localStorage.clear();
    navigate("/login");
  }

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
        {/* Logo */}
        <div
          className="flex items-center justify-between px-4 py-5
                        border-b border-white/10"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 bg-white rounded-lg flex items-center
                            justify-center flex-shrink-0 shadow"
            >
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0
                     00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0
                     00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5
                     c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782
                     0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
            </div>
            <div>
              <p className="text-white text-sm font-semibold leading-tight">
                Vacunación
              </p>
              <p className="text-blue-300 text-xs">ASIC Dr. Tulio Pineda</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/50 hover:text-white p-1 transition"
          >
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
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => (
            <button
              key={item.label}
              onClick={() => irA(item.ruta)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg
                         text-sm font-medium transition text-left touch-manipulation
                         ${
                           item.activo
                             ? "bg-white/15 text-white"
                             : "text-white/55 hover:bg-white/10 hover:text-white"
                         }`}
            >
              <span className="w-5 h-5 flex-shrink-0">{item.icono}</span>
              {item.label}
              {item.activo && (
                <span className="ml-auto w-1.5 h-1.5 bg-blue-300 rounded-full" />
              )}
            </button>
          ))}
        </nav>

        {/* Usuario */}
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
                {usuario?.nombre || "Cargando..."}
              </p>
              <p className="text-blue-300 text-xs capitalize">
                {usuario?.rol || "—"}
              </p>
            </div>
            <button
              onClick={cerrarSesion}
              title="Cerrar sesión"
              className="text-white/40 hover:text-blue-300 transition flex-shrink-0 p-1"
            >
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
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3
                     0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
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
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-blue-600"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0
                     00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0
                     00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5
                     c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782
                     0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
            </div>
            <span className="text-white text-sm font-semibold">Vacunación</span>
          </div>
          <div
            className="w-9 h-9 bg-white rounded-full flex items-center
                          justify-center text-blue-600 font-bold text-xs"
          >
            {iniciales}
          </div>
        </header>

        {/* Página */}
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
              <p className="text-xs sm:text-sm text-blue-600 mt-0.5 capitalize">
                Bienvenido,{" "}
                <span className="font-semibold">
                  {usuario?.nombre || "..."}
                </span>
                <span className="hidden sm:inline"> · {fecha}</span>
              </p>
            </div>
            <div
              className="flex items-center gap-2 bg-amber-50 border border-amber-200
                            rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 self-start"
            >
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse flex-shrink-0" />
              <span className="text-amber-700 text-xs sm:text-sm font-medium whitespace-nowrap">
                2 alertas de stock
              </span>
            </div>
          </div>

          {/* Stats — 2 col móvil, 3 tablet, 5 desktop */}
          <div
            className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5
                          gap-3 sm:gap-4 mb-6 sm:mb-8"
          >
            {STATS.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>

          {/* Módulos */}
          <h2
            className="text-xs sm:text-sm font-semibold text-blue-800/60
                         uppercase tracking-wider mb-3 sm:mb-4"
          >
            Módulos del sistema
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-6 sm:mb-8">
            {MODULOS.map((m) => (
              <ModCard key={m.titulo} mod={m} onClick={() => irA(m.ruta)} />
            ))}
          </div>

          {/* Actividad + Cobertura */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            <div className="bg-white rounded-2xl border border-blue-100 p-4 sm:p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                Actividad reciente
              </h3>
              {ACTIVIDAD.map((a, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 py-3
                                        border-b border-blue-50 last:border-0"
                >
                  <span
                    className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${a.color}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-700 leading-snug">
                      {a.texto}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{a.tiempo}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-blue-100 p-4 sm:p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                Cobertura por vacuna
              </h3>
              <div className="space-y-3 sm:space-y-4">
                {COBERTURA.map((c) => (
                  <div key={c.nombre}>
                    <div className="flex justify-between text-xs sm:text-sm mb-1.5">
                      <span className="text-gray-700 font-medium">
                        {c.nombre}
                      </span>
                      <span className="text-gray-500">{c.pct}%</span>
                    </div>
                    <div className="h-2 bg-blue-50 rounded-full">
                      <div
                        className={`h-2 ${c.color} rounded-full transition-all duration-700`}
                        style={{ width: `${c.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-4 sm:mt-5">
                * Datos de demostración
              </p>
            </div>
          </div>
        </main>
      </div>
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
    }[color] || {};
  return (
    <div className={`${e.wrap} border rounded-2xl p-3 sm:p-4`}>
      <div
        className={`w-8 h-8 sm:w-9 sm:h-9 ${e.ic} rounded-xl
                      flex items-center justify-center mb-2 sm:mb-3`}
      >
        {icono}
      </div>
      <p className={`text-xl sm:text-2xl font-bold ${e.val}`}>{valor}</p>
      <p className="text-xs text-gray-500 mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

// ── Tarjeta módulo ──────────────────────────────────────────
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
          className={`w-11 h-11 sm:w-12 sm:h-12 ${mod.icBg} rounded-xl
                        flex items-center justify-center ${mod.icColor}
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
        className={`mt-3 sm:mt-4 flex items-center gap-1.5 text-xs sm:text-sm
                      font-medium ${mod.icColor} opacity-0 group-hover:opacity-100
                      transition-opacity duration-200`}
      >
        Abrir módulo
        <svg
          className="w-3.5 h-3.5 sm:w-4 sm:h-4"
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
        d="M5.121 17.804A9 9 0 1118.879 17.804M15 11a3 3 0 11-6 0 3 3 0 016 0z"
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
