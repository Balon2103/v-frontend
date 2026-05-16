import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

// ── Catálogo de vacunas ─────────────────────────────────────
const TIPOS_VACUNA = [
  { id: 1, nombre: "BCG", dosis: ["Única"] },
  {
    id: 2,
    nombre: "Polio Inyectable (IPV)",
    dosis: ["1ra dosis", "2da dosis", "3ra dosis", "Refuerzo"],
  },
  {
    id: 3,
    nombre: "Polio Oral",
    dosis: ["1ra dosis", "2da dosis", "3ra dosis", "Refuerzo"],
  },
  {
    id: 4,
    nombre: "Pentavalente",
    dosis: ["1ra dosis", "2da dosis", "3ra dosis"],
  },
  {
    id: 5,
    nombre: "Hepatitis B",
    dosis: ["1ra dosis", "2da dosis", "3ra dosis"],
  },
  { id: 6, nombre: "SRP", dosis: ["1ra dosis", "2da dosis"] },
  { id: 7, nombre: "Fiebre Amarilla", dosis: ["Única"] },
  { id: 8, nombre: "Toxoide", dosis: ["1ra dosis", "2da dosis", "Refuerzo"] },
];

const BADGE = {
  BCG: "bg-blue-100 text-blue-700",
  "Polio Inyectable (IPV)": "bg-blue-100 text-blue-700",
  "Polio Oral": "bg-green-100 text-green-700",
  Pentavalente: "bg-pink-100 text-pink-700",
  "Hepatitis B": "bg-yellow-100 text-yellow-700",
  SRP: "bg-purple-100 text-purple-700",
  "Fiebre Amarilla": "bg-orange-100 text-orange-700",
  Toxoide: "bg-gray-100 text-gray-600",
};

// 20 registros demo para mostrar la paginación
const DEMO = [
  {
    id: 1,
    cedula: "V-12345678",
    paciente: "María González",
    vacuna: "BCG",
    dosis: "Única",
    fecha: "2025-04-21",
    lote: "BCG-001",
    obs: "",
  },
  {
    id: 2,
    cedula: "V-87654321",
    paciente: "Juan Pérez",
    vacuna: "Pentavalente",
    dosis: "2da dosis",
    fecha: "2025-04-20",
    lote: "PV-042",
    obs: "",
  },
  {
    id: 3,
    cedula: "V-11223344",
    paciente: "Ana Rodríguez",
    vacuna: "SRP",
    dosis: "1ra dosis",
    fecha: "2025-04-19",
    lote: "SRP-018",
    obs: "Sin novedades",
  },
  {
    id: 4,
    cedula: "V-55667788",
    paciente: "Carlos López",
    vacuna: "Polio Inyectable (IPV)",
    dosis: "3ra dosis",
    fecha: "2025-04-18",
    lote: "IPV-007",
    obs: "",
  },
  {
    id: 5,
    cedula: "V-99001122",
    paciente: "Luisa Martínez",
    vacuna: "Fiebre Amarilla",
    dosis: "Única",
    fecha: "2025-04-17",
    lote: "FA-023",
    obs: "",
  },
  {
    id: 6,
    cedula: "V-33445566",
    paciente: "Pedro Ramírez",
    vacuna: "Hepatitis B",
    dosis: "1ra dosis",
    fecha: "2025-04-16",
    lote: "HB-011",
    obs: "",
  },
  {
    id: 7,
    cedula: "V-77889900",
    paciente: "Carmen Torres",
    vacuna: "Toxoide",
    dosis: "Refuerzo",
    fecha: "2025-04-15",
    lote: "TX-005",
    obs: "Paciente embarazada",
  },
  {
    id: 8,
    cedula: "V-12398765",
    paciente: "José Hernández",
    vacuna: "Polio Oral",
    dosis: "2da dosis",
    fecha: "2025-04-14",
    lote: "PO-033",
    obs: "",
  },
  {
    id: 9,
    cedula: "V-44556677",
    paciente: "Rosa Castillo",
    vacuna: "BCG",
    dosis: "Única",
    fecha: "2025-04-13",
    lote: "BCG-002",
    obs: "",
  },
  {
    id: 10,
    cedula: "V-66778899",
    paciente: "Luis Morales",
    vacuna: "Pentavalente",
    dosis: "1ra dosis",
    fecha: "2025-04-12",
    lote: "PV-043",
    obs: "",
  },
  {
    id: 11,
    cedula: "V-21436587",
    paciente: "Elena Vargas",
    vacuna: "SRP",
    dosis: "2da dosis",
    fecha: "2025-04-11",
    lote: "SRP-019",
    obs: "",
  },
  {
    id: 12,
    cedula: "V-98765432",
    paciente: "Marco Díaz",
    vacuna: "Hepatitis B",
    dosis: "2da dosis",
    fecha: "2025-04-10",
    lote: "HB-012",
    obs: "",
  },
  {
    id: 13,
    cedula: "V-13245678",
    paciente: "Sofía Jiménez",
    vacuna: "Polio Inyectable (IPV)",
    dosis: "1ra dosis",
    fecha: "2025-04-09",
    lote: "IPV-008",
    obs: "",
  },
  {
    id: 14,
    cedula: "V-87612345",
    paciente: "Daniel Suárez",
    vacuna: "Toxoide",
    dosis: "1ra dosis",
    fecha: "2025-04-08",
    lote: "TX-006",
    obs: "",
  },
  {
    id: 15,
    cedula: "V-11334455",
    paciente: "Valentina Cruz",
    vacuna: "Fiebre Amarilla",
    dosis: "Única",
    fecha: "2025-04-07",
    lote: "FA-024",
    obs: "",
  },
  {
    id: 16,
    cedula: "V-55443322",
    paciente: "Roberto Flores",
    vacuna: "Polio Oral",
    dosis: "3ra dosis",
    fecha: "2025-04-06",
    lote: "PO-034",
    obs: "",
  },
  {
    id: 17,
    cedula: "V-99887766",
    paciente: "Patricia Reyes",
    vacuna: "BCG",
    dosis: "Única",
    fecha: "2025-04-05",
    lote: "BCG-003",
    obs: "Recién nacido",
  },
  {
    id: 18,
    cedula: "V-33221100",
    paciente: "Andrés Medina",
    vacuna: "Pentavalente",
    dosis: "3ra dosis",
    fecha: "2025-04-04",
    lote: "PV-044",
    obs: "",
  },
  {
    id: 19,
    cedula: "V-77665544",
    paciente: "Isabel Rojas",
    vacuna: "SRP",
    dosis: "1ra dosis",
    fecha: "2025-04-03",
    lote: "SRP-020",
    obs: "",
  },
  {
    id: 20,
    cedula: "V-12312312",
    paciente: "Fernando Gómez",
    vacuna: "Hepatitis B",
    dosis: "3ra dosis",
    fecha: "2025-04-02",
    lote: "HB-013",
    obs: "Completó esquema",
  },
];

const FORM_VACIO = {
  cedula: "",
  paciente: "",
  vacuna: "",
  dosis: "",
  fecha: "",
  lote: "",
  obs: "",
};
const POR_PAGINA = 10;

// ── Componente principal ────────────────────────────────────
export default function Vacunas() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [registros, setRegistros] = useState(DEMO);
  const [busqueda, setBusqueda] = useState("");
  const [filtroVac, setFiltroVac] = useState("");
  const [pagina, setPagina] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [dosisOpts, setDosisOpts] = useState([]);
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

  // Actualizar dosis al cambiar vacuna
  useEffect(() => {
    const tipo = TIPOS_VACUNA.find((t) => t.nombre === form.vacuna);
    if (tipo) {
      setDosisOpts(tipo.dosis);
      setForm((f) => ({ ...f, dosis: tipo.dosis[0] }));
    } else {
      setDosisOpts([]);
      setForm((f) => ({ ...f, dosis: "" }));
    }
  }, [form.vacuna]);

  // Filtrar registros
  const filtrados = useMemo(() => {
    return registros.filter((r) => {
      const q = busqueda.toLowerCase();
      const matchTexto =
        r.cedula.toLowerCase().includes(q) ||
        r.paciente.toLowerCase().includes(q);
      const matchVac = filtroVac === "" || r.vacuna === filtroVac;
      return matchTexto && matchVac;
    });
  }, [registros, busqueda, filtroVac]);

  // Resetear página al filtrar
  useEffect(() => {
    setPagina(1);
  }, [busqueda, filtroVac]);

  // Paginación
  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA);
  const paginaActual = Math.min(pagina, totalPaginas || 1);
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const registrosPag = filtrados.slice(inicio, inicio + POR_PAGINA);

  // Números de página a mostrar (máx 5)
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

  function abrirModal() {
    setForm({ ...FORM_VACIO, fecha: new Date().toISOString().split("T")[0] });
    setError("");
    setGuardado(false);
    setDetalle(null);
    setModalOpen(true);
  }

  function verDetalle(reg) {
    setDetalle(reg);
    setModalOpen(true);
  }

  function cerrarModal() {
    setModalOpen(false);
    setDetalle(null);
    setError("");
  }

  function handleForm(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function guardar(e) {
    e.preventDefault();
    setError("");
    if (
      !form.cedula ||
      !form.paciente ||
      !form.vacuna ||
      !form.dosis ||
      !form.fecha
    ) {
      setError("Por favor complete todos los campos obligatorios.");
      return;
    }
    const nuevo = {
      id: registros.length + 1,
      cedula: form.cedula.trim(),
      paciente: form.paciente.trim(),
      vacuna: form.vacuna,
      dosis: form.dosis,
      fecha: form.fecha,
      lote: form.lote.trim(),
      obs: form.obs.trim(),
    };
    setRegistros((prev) => [nuevo, ...prev]);
    setGuardado(true);
    setTimeout(() => {
      setModalOpen(false);
      setGuardado(false);
    }, 1200);
  }

  function formatFecha(f) {
    if (!f) return "—";
    const [y, m, d] = f.split("-");
    return `${d}/${m}/${y}`;
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
    { label: "Vacunas", ruta: "/vacunas", activo: true },
    { label: "Inventario", ruta: "/inventario", activo: false },
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
        <div
          className="flex items-center justify-between px-4 py-5
                        border-b border-white/10"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 bg-white rounded-lg flex items-center
                            justify-center flex-shrink-0 shadow"
            >
              <IcoJeringa className="w-5 h-5 text-blue-600" />
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
            <IcoCerrar />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
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
            Vacunas aplicadas
          </span>
          <div
            className="w-9 h-9 bg-white rounded-full flex items-center
                          justify-center text-blue-600 font-bold text-xs flex-shrink-0"
          >
            {iniciales}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {/* Encabezado */}
          <div
            className="flex flex-col sm:flex-row sm:items-center
                          sm:justify-between gap-3 mb-6"
          >
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-blue-900">
                Vacunas aplicadas
              </h1>
              <p className="text-xs sm:text-sm text-blue-400 mt-0.5">
                {filtrados.length} registro{filtrados.length !== 1 ? "s" : ""}{" "}
                encontrado{filtrados.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={abrirModal}
              className="flex items-center justify-center gap-2 bg-blue-600
                         hover:bg-blue-700 active:scale-[0.98] text-white font-semibold
                         px-4 py-2.5 rounded-xl text-sm transition-all
                         shadow-md shadow-blue-200 touch-manipulation self-start sm:self-auto"
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
              Nueva vacuna
            </button>
          </div>

          {/* Buscador + filtro */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
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
                placeholder="Buscar por cédula o nombre del paciente..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-blue-200
                           rounded-xl text-sm focus:outline-none focus:ring-2
                           focus:ring-blue-400 focus:border-transparent transition"
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                             text-gray-400 hover:text-gray-600 transition"
                >
                  <IcoCerrar />
                </button>
              )}
            </div>
            <select
              value={filtroVac}
              onChange={(e) => setFiltroVac(e.target.value)}
              className="px-3 py-2.5 bg-white border border-blue-200 rounded-xl
                         text-sm focus:outline-none focus:ring-2 focus:ring-blue-400
                         text-gray-700 transition sm:w-52"
            >
              <option value="">Todas las vacunas</option>
              {TIPOS_VACUNA.map((t) => (
                <option key={t.id} value={t.nombre}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Tabla */}
          <div className="bg-white rounded-2xl border border-blue-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-blue-50 border-b border-blue-100">
                  <tr>
                    {[
                      "Paciente",
                      "Cédula",
                      "Vacuna",
                      "Dosis",
                      "Fecha aplic.",
                      "Lote",
                      "",
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
                  {registrosPag.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-12 text-center text-gray-400 text-sm"
                      >
                        No se encontraron registros.
                      </td>
                    </tr>
                  ) : (
                    registrosPag.map((r) => (
                      <tr
                        key={r.id}
                        className="hover:bg-blue-50/40 transition group"
                      >
                        <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                          {r.paciente}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                          {r.cedula}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold
                                         whitespace-nowrap
                                         ${BADGE[r.vacuna] || "bg-gray-100 text-gray-600"}`}
                          >
                            {r.vacuna}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                          {r.dosis}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                          {formatFecha(r.fecha)}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                          {r.lote || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => verDetalle(r)}
                            className="text-blue-600 hover:text-blue-800 text-xs
                                     font-medium hover:underline transition
                                     whitespace-nowrap opacity-70
                                     group-hover:opacity-100"
                          >
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Paginación ─────────────────────────────── */}
            <div
              className="px-4 py-3 border-t border-blue-50 bg-blue-50/30
                            flex flex-col sm:flex-row items-center
                            justify-between gap-3"
            >
              {/* Info */}
              <p className="text-xs text-gray-400 order-2 sm:order-1">
                Mostrando{" "}
                <span className="font-semibold text-gray-600">
                  {filtrados.length === 0 ? 0 : inicio + 1}–
                  {Math.min(inicio + POR_PAGINA, filtrados.length)}
                </span>{" "}
                de{" "}
                <span className="font-semibold text-gray-600">
                  {filtrados.length}
                </span>{" "}
                registros
              </p>

              {/* Controles */}
              {totalPaginas > 1 && (
                <div className="flex items-center gap-1 order-1 sm:order-2">
                  {/* Anterior */}
                  <button
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                    disabled={paginaActual === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg
                               border border-blue-200 bg-white text-blue-500
                               hover:bg-blue-50 disabled:opacity-40
                               disabled:cursor-not-allowed transition text-sm"
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

                  {/* Números */}
                  {paginas.map((n) => (
                    <button
                      key={n}
                      onClick={() => setPagina(n)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg
                                 text-xs font-semibold transition border
                                 ${
                                   n === paginaActual
                                     ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                     : "bg-white text-gray-600 border-blue-200 hover:bg-blue-50"
                                 }`}
                    >
                      {n}
                    </button>
                  ))}

                  {/* Siguiente */}
                  <button
                    onClick={() =>
                      setPagina((p) => Math.min(totalPaginas, p + 1))
                    }
                    disabled={paginaActual === totalPaginas}
                    className="w-8 h-8 flex items-center justify-center rounded-lg
                               border border-blue-200 bg-white text-blue-500
                               hover:bg-blue-50 disabled:opacity-40
                               disabled:cursor-not-allowed transition text-sm"
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
          </div>
        </main>
      </div>

      {/* ── Modal ───────────────────────────────────────── */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center
                        justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) cerrarModal();
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg
                          max-h-[90vh] overflow-y-auto"
          >
            {/* Header modal */}
            <div
              className="flex items-center justify-between px-6 py-4
                            border-b border-blue-100 sticky top-0 bg-white z-10"
            >
              <h3 className="text-base font-semibold text-blue-900">
                {detalle ? "Detalle del registro" : "Registrar vacuna aplicada"}
              </h3>
              <button
                onClick={cerrarModal}
                className="text-gray-400 hover:text-gray-600 transition p-1
                           touch-manipulation"
              >
                <IcoCerrar />
              </button>
            </div>

            {/* Vista detalle */}
            {detalle ? (
              <div className="px-6 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <Campo label="Paciente" valor={detalle.paciente} />
                  <Campo label="Cédula" valor={detalle.cedula} />
                  <Campo
                    label="Vacuna"
                    valor={
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold
                                     ${BADGE[detalle.vacuna] || ""}`}
                      >
                        {detalle.vacuna}
                      </span>
                    }
                  />
                  <Campo label="Dosis" valor={detalle.dosis} />
                  <Campo label="Fecha" valor={formatFecha(detalle.fecha)} />
                  <Campo label="Lote" valor={detalle.lote || "—"} />
                </div>
                <Campo
                  label="Observaciones"
                  valor={detalle.obs || "Sin observaciones"}
                />
                <button
                  onClick={cerrarModal}
                  className="w-full mt-5 bg-blue-600 hover:bg-blue-700 text-white
                             font-semibold py-2.5 rounded-xl text-sm transition
                             touch-manipulation"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              /* Formulario */
              <form onSubmit={guardar} noValidate>
                <div className="px-6 py-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Cédula del paciente *">
                      <input
                        type="text"
                        value={form.cedula}
                        onChange={(e) => handleForm("cedula", e.target.value)}
                        placeholder="Ej: V-12345678"
                        className={inputCls}
                      />
                    </FormField>
                    <FormField label="Nombre del paciente *">
                      <input
                        type="text"
                        value={form.paciente}
                        onChange={(e) => handleForm("paciente", e.target.value)}
                        placeholder="Nombre completo"
                        className={inputCls}
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Tipo de vacuna *">
                      <select
                        value={form.vacuna}
                        onChange={(e) => handleForm("vacuna", e.target.value)}
                        className={inputCls}
                      >
                        <option value="">Seleccionar...</option>
                        {TIPOS_VACUNA.map((t) => (
                          <option key={t.id} value={t.nombre}>
                            {t.nombre}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Número de dosis *">
                      <select
                        value={form.dosis}
                        onChange={(e) => handleForm("dosis", e.target.value)}
                        disabled={dosisOpts.length === 0}
                        className={`${inputCls} disabled:opacity-50`}
                      >
                        {dosisOpts.length === 0 ? (
                          <option>Seleccione vacuna primero</option>
                        ) : (
                          dosisOpts.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))
                        )}
                      </select>
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Fecha de aplicación *">
                      <input
                        type="date"
                        value={form.fecha}
                        onChange={(e) => handleForm("fecha", e.target.value)}
                        max={new Date().toISOString().split("T")[0]}
                        className={inputCls}
                      />
                    </FormField>
                    <FormField label="Número de lote">
                      <input
                        type="text"
                        value={form.lote}
                        onChange={(e) => handleForm("lote", e.target.value)}
                        placeholder="Ej: BCG-001"
                        className={inputCls}
                      />
                    </FormField>
                  </div>

                  <FormField label="Observaciones">
                    <textarea
                      value={form.obs}
                      onChange={(e) => handleForm("obs", e.target.value)}
                      placeholder="Opcional..."
                      rows={2}
                      className={`${inputCls} resize-none`}
                    />
                  </FormField>

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
                      Registro guardado correctamente
                    </div>
                  )}
                </div>

                <div className="flex gap-3 px-6 pb-6">
                  <button
                    type="button"
                    onClick={cerrarModal}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl
                               text-sm font-medium text-gray-600
                               hover:bg-gray-50 transition touch-manipulation"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white
                               font-semibold py-2.5 rounded-xl text-sm
                               transition active:scale-[0.98] touch-manipulation"
                  >
                    Guardar registro
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers de UI ───────────────────────────────────────────
const inputCls = `w-full px-3 py-2.5 border border-blue-200 rounded-xl text-sm
  focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent
  transition text-gray-700 bg-white`;

function FormField({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function Campo({ label, valor }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
        {label}
      </p>
      <div className="text-sm text-gray-800 font-medium">{valor}</div>
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
        d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0
           00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0
           00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5
           c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782
           0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
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
