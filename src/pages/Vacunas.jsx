import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "";
const POR_PAGINA = 10;

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
  BCG: "bg-red-100 text-red-700",
  "Polio Inyectable (IPV)": "bg-blue-100 text-blue-700",
  "Polio Oral": "bg-green-100 text-green-700",
  Pentavalente: "bg-pink-100 text-pink-700",
  "Hepatitis B": "bg-yellow-100 text-yellow-700",
  SRP: "bg-purple-100 text-purple-700",
  "Fiebre Amarilla": "bg-orange-100 text-orange-700",
  Toxoide: "bg-gray-100 text-gray-600",
};

const FORM_VACIO = {
  cedula: "",
  nombre: "",
  apellido: "",
  fecha_nacimiento: "",
  sexo: "",
  telefono: "",
  email: "",
  direccion: "",
  tipo_vacuna_id: "",
  dosis: "",
  lote: "",
  fecha_aplicacion: new Date().toISOString().split("T")[0],
  observaciones: "",
  vacunador_id: "",
};

// Formulario vacío para nuevo vacunador
const FORM_VACUNADOR_VACIO = {
  nombre: "",
  apellido: "",
  email: "",
  password: "",
  telefono: "",
  rol: "enfermero",
};

function formatFecha(f) {
  if (!f) return "—";
  return new Date(f).toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function Vacunas() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Tabla
  const [registros, setRegistros] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargandoTabla, setCargandoTabla] = useState(false);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroVac, setFiltroVac] = useState("");

  // Modales
  const [modalForm, setModalForm] = useState(false);
  const [modalDetalle, setModalDetalle] = useState(null);
  const [modalVacunadores, setModalVacunadores] = useState(false);

  // ── NUEVO: Modal para crear vacunador ──────────────────
  const [modalNuevoVacunador, setModalNuevoVacunador] = useState(false);
  const [formVacunador, setFormVacunador] = useState(FORM_VACUNADOR_VACIO);
  const [errorVacunador, setErrorVacunador] = useState("");
  const [guardandoVacunador, setGuardandoVacunador] = useState(false);
  const [okVacunador, setOkVacunador] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  // Formulario vacuna
  const [form, setForm] = useState(FORM_VACIO);
  const [dosisOpts, setDosisOpts] = useState([]);
  const [errorForm, setErrorForm] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [okForm, setOkForm] = useState(false);

  // Paciente autocompletar
  const [buscandoPac, setBuscandoPac] = useState(false);
  const [pacEncontrado, setPacEncontrado] = useState(false);

  // Lista de vacunadores para el selector
  const [listaVacunadores, setListaVacunadores] = useState([]);

  // Panel de vacunadores (modal)
  const [vacunadores, setVacunadores] = useState([]);
  const [cargandoVac, setCargandoVac] = useState(false);
  const [vacunadorSel, setVacunadorSel] = useState(null);

  // ── Auth guard ──────────────────────────────────────────
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

  // ── Headers autenticados ────────────────────────────────
  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    }),
    [],
  );

  // ── Cargar vacunadores para el selector ─────────────────
  const cargarListaVacunadores = useCallback(async () => {
    try {
      const resp = await fetch(`${API}/api/vacunas/vacunadores`, { headers });
      const data = await resp.json();
      if (data.ok) setListaVacunadores(data.vacunadores);
    } catch (err) {
      console.error("Error cargando vacunadores:", err);
    }
  }, [headers]);

  useEffect(() => {
    cargarListaVacunadores();
  }, [cargarListaVacunadores]);

  // ── Cargar registros de vacunas ─────────────────────────
  const cargarRegistros = useCallback(
    async (pag = 1) => {
      setCargandoTabla(true);
      try {
        const params = new URLSearchParams({
          page: pag,
          limit: POR_PAGINA,
          ...(busqueda && { cedula: busqueda }),
          ...(filtroVac && { vacuna: filtroVac }),
        });
        const resp = await fetch(`${API}/api/vacunas?${params}`, { headers });
        const data = await resp.json();
        if (data.ok) {
          setRegistros(data.registros);
          setTotal(data.total);
          setPagina(pag);
        }
      } catch (err) {
        console.error("Error cargando registros:", err);
      } finally {
        setCargandoTabla(false);
      }
    },
    [busqueda, filtroVac, headers],
  );

  useEffect(() => {
    cargarRegistros(1);
  }, [busqueda, filtroVac]);

  // ── Dosis según vacuna seleccionada ─────────────────────
  useEffect(() => {
    const tipo = TIPOS_VACUNA.find(
      (t) => t.id === parseInt(form.tipo_vacuna_id),
    );
    if (tipo) {
      setDosisOpts(tipo.dosis);
      setForm((f) => ({ ...f, dosis: tipo.dosis[0] }));
    } else {
      setDosisOpts([]);
      setForm((f) => ({ ...f, dosis: "" }));
    }
  }, [form.tipo_vacuna_id]);

  // ── Buscar paciente por cédula ──────────────────────────
  const buscarPaciente = useCallback(
    async (cedula) => {
      if (cedula.length < 5) {
        setPacEncontrado(false);
        return;
      }
      setBuscandoPac(true);
      try {
        const resp = await fetch(
          `${API}/api/vacunas/paciente/${cedula.trim()}`,
          { headers },
        );
        const data = await resp.json();
        if (data.ok && data.paciente) {
          const p = data.paciente;
          setForm((f) => ({
            ...f,
            nombre: p.nombre || "",
            apellido: p.apellido || "",
            fecha_nacimiento: p.fecha_nacimiento
              ? p.fecha_nacimiento.split("T")[0]
              : "",
            sexo: p.sexo || "",
            telefono: p.telefono || "",
            email: p.email || "",
            direccion: p.direccion || "",
          }));
          setPacEncontrado(true);
        } else {
          setPacEncontrado(false);
        }
      } catch {
        setPacEncontrado(false);
      } finally {
        setBuscandoPac(false);
      }
    },
    [headers],
  );

  function handleFormChange(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    if (campo === "cedula") {
      setPacEncontrado(false);
      buscarPaciente(valor);
    }
  }

  // ── Abrir modal formulario ──────────────────────────────
  function abrirForm() {
    const usuarioActual = JSON.parse(localStorage.getItem("usuario") || "{}");
    const vacPredeterminado = listaVacunadores.find(
      (v) => v.id === usuarioActual.id,
    );

    setForm({
      ...FORM_VACIO,
      fecha_aplicacion: new Date().toISOString().split("T")[0],
      vacunador_id: vacPredeterminado ? String(vacPredeterminado.id) : "",
    });
    setErrorForm("");
    setOkForm(false);
    setPacEncontrado(false);
    setModalForm(true);
  }

  // ── Guardar vacuna ──────────────────────────────────────
  async function guardarVacuna(e) {
    e.preventDefault();
    setErrorForm("");

    if (!form.cedula.trim()) {
      setErrorForm("La cédula del paciente es obligatoria.");
      return;
    }
    if (!form.nombre.trim() || !form.apellido.trim()) {
      setErrorForm("El nombre y apellido del paciente son obligatorios.");
      return;
    }
    if (!form.tipo_vacuna_id) {
      setErrorForm("Debe seleccionar el tipo de vacuna.");
      return;
    }
    if (!form.dosis) {
      setErrorForm("Debe seleccionar el número de dosis.");
      return;
    }
    if (!form.fecha_aplicacion) {
      setErrorForm("La fecha de aplicación es obligatoria.");
      return;
    }
    if (!form.vacunador_id) {
      setErrorForm("Debe seleccionar el vacunador.");
      return;
    }

    setGuardando(true);
    try {
      const resp = await fetch(`${API}/api/vacunas`, {
        method: "POST",
        headers,
        body: JSON.stringify(form),
      });
      const data = await resp.json();

      if (data.ok) {
        setOkForm(true);
        setTimeout(() => {
          setModalForm(false);
          setOkForm(false);
          cargarRegistros(1);
          cargarListaVacunadores();
        }, 1200);
      } else {
        setErrorForm(data.mensaje || "Error al guardar el registro.");
        console.error("Error backend:", data.detalle);
      }
    } catch (err) {
      console.error("Error de red:", err);
      setErrorForm("No se pudo conectar con el servidor.");
    } finally {
      setGuardando(false);
    }
  }

  // ── Abrir panel de vacunadores ──────────────────────────
  async function abrirVacunadores() {
    setModalVacunadores(true);
    setVacunadorSel(null);
    setCargandoVac(true);
    try {
      const resp = await fetch(`${API}/api/vacunas/vacunadores`, { headers });
      const data = await resp.json();
      if (data.ok) setVacunadores(data.vacunadores);
    } catch (err) {
      console.error(err);
    } finally {
      setCargandoVac(false);
    }
  }

  // ── NUEVO: Abrir modal nuevo vacunador ──────────────────
  function abrirNuevoVacunador() {
    setFormVacunador(FORM_VACUNADOR_VACIO);
    setErrorVacunador("");
    setOkVacunador(false);
    setMostrarPassword(false);
    setModalNuevoVacunador(true);
  }

  // ── NUEVO: Guardar nuevo vacunador ──────────────────────
  async function guardarNuevoVacunador(e) {
    e.preventDefault();
    setErrorVacunador("");

    if (!formVacunador.nombre.trim()) {
      setErrorVacunador("El nombre es obligatorio.");
      return;
    }
    if (!formVacunador.apellido.trim()) {
      setErrorVacunador("El apellido es obligatorio.");
      return;
    }
    if (!formVacunador.email.trim()) {
      setErrorVacunador("El correo electrónico es obligatorio.");
      return;
    }
    if (!formVacunador.password || formVacunador.password.length < 6) {
      setErrorVacunador("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setGuardandoVacunador(true);
    try {
      const resp = await fetch(`${API}/api/usuarios`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          nombre: `${formVacunador.nombre.trim()} ${formVacunador.apellido.trim()}`,
          email: formVacunador.email.trim(),
          password: formVacunador.password,
          telefono: formVacunador.telefono.trim(),
          rol: formVacunador.rol,
        }),
      });
      const data = await resp.json();

      if (data.ok) {
        setOkVacunador(true);
        setTimeout(async () => {
          setModalNuevoVacunador(false);
          setOkVacunador(false);
          // Recargar lista de vacunadores en el modal y en el selector
          await cargarListaVacunadores();
          setCargandoVac(true);
          try {
            const r = await fetch(`${API}/api/vacunas/vacunadores`, {
              headers,
            });
            const d = await r.json();
            if (d.ok) setVacunadores(d.vacunadores);
          } catch (err) {
            console.error(err);
          } finally {
            setCargandoVac(false);
          }
        }, 1200);
      } else {
        setErrorVacunador(data.mensaje || "Error al crear el vacunador.");
      }
    } catch (err) {
      console.error("Error de red:", err);
      setErrorVacunador("No se pudo conectar con el servidor.");
    } finally {
      setGuardandoVacunador(false);
    }
  }

  // ── Paginación ──────────────────────────────────────────
  const totalPaginas = Math.ceil(total / POR_PAGINA);
  const paginas = useMemo(() => {
    if (totalPaginas <= 5)
      return Array.from({ length: totalPaginas }, (_, i) => i + 1);
    if (pagina <= 3) return [1, 2, 3, 4, 5];
    if (pagina >= totalPaginas - 2)
      return [
        totalPaginas - 4,
        totalPaginas - 3,
        totalPaginas - 2,
        totalPaginas - 1,
        totalPaginas,
      ];
    return [pagina - 2, pagina - 1, pagina, pagina + 1, pagina + 2];
  }, [totalPaginas, pagina]);

  const iniciales = usuario?.nombre
    ? usuario.nombre
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "??";

  const esAdmin = usuario?.rol === "admin";

  const NAV = [
    { label: "Inicio", ruta: "/dashboard", activo: false },
    { label: "Vacunas", ruta: "/vacunas", activo: true },
    { label: "Inventario", ruta: "/inventario", activo: false },
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
          <span className="text-white text-sm font-semibold">
            Vacunas aplicadas
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-blue-900">
                Vacunas aplicadas
              </h1>
              <p className="text-xs sm:text-sm text-blue-400 mt-0.5">
                {total} registro{total !== 1 ? "s" : ""} en total
              </p>
            </div>
            <div className="flex gap-2 flex-wrap self-start sm:self-auto">
              <button
                onClick={abrirVacunadores}
                className="flex items-center gap-2 bg-white hover:bg-blue-50 border
                           border-blue-200 text-blue-700 font-semibold px-4 py-2.5
                           rounded-xl text-sm transition active:scale-[0.98]
                           touch-manipulation shadow-sm"
              >
                <IcoPersonas />
                <span className="hidden sm:inline">Vacunadores</span>
                <span className="sm:hidden">Equipo</span>
              </button>
              <button
                onClick={abrirForm}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700
                           text-white font-semibold px-4 py-2.5 rounded-xl text-sm
                           transition active:scale-[0.98] touch-manipulation
                           shadow-md shadow-blue-200"
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
          </div>

          {/* Filtros */}
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
                placeholder="Buscar por cédula o nombre..."
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
            <select
              value={filtroVac}
              onChange={(e) => setFiltroVac(e.target.value)}
              className="px-3 py-2.5 bg-white border border-blue-200 rounded-xl text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-400
                         text-gray-700 sm:w-52"
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
                      "Fecha",
                      "Vacunador",
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
                  {cargandoTabla ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center">
                        <span
                          className="inline-block w-6 h-6 border-2 border-blue-300
                                       border-t-blue-600 rounded-full animate-spin"
                        />
                      </td>
                    </tr>
                  ) : registros.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-10 text-center text-gray-400 text-sm"
                      >
                        No se encontraron registros.
                      </td>
                    </tr>
                  ) : (
                    registros.map((r) => (
                      <tr
                        key={r.id}
                        className="hover:bg-blue-50/40 transition group"
                      >
                        <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                          {r.paciente}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {r.cedula}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap
                          ${BADGE[r.vacuna] || "bg-gray-100 text-gray-600"}`}
                          >
                            {r.vacuna}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                          {r.dosis}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                          {formatFecha(r.fecha)}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {r.vacunador}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setModalDetalle(r)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium
                                     hover:underline transition opacity-70 group-hover:opacity-100
                                     whitespace-nowrap"
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

            {/* Paginación */}
            <div
              className="px-4 py-3 border-t border-blue-50 bg-blue-50/30
                            flex flex-col sm:flex-row items-center justify-between gap-3"
            >
              <p className="text-xs text-gray-400 order-2 sm:order-1">
                Mostrando{" "}
                <span className="font-semibold text-gray-600">
                  {total === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1}–
                  {Math.min(pagina * POR_PAGINA, total)}
                </span>{" "}
                de <span className="font-semibold text-gray-600">{total}</span>{" "}
                registros
              </p>
              {totalPaginas > 1 && (
                <div className="flex items-center gap-1 order-1 sm:order-2">
                  <BtnPag
                    onClick={() => cargarRegistros(Math.max(1, pagina - 1))}
                    disabled={pagina === 1}
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
                      onClick={() => cargarRegistros(n)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs
                                 font-semibold transition border
                                 ${
                                   n === pagina
                                     ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                     : "bg-white text-gray-600 border-blue-200 hover:bg-blue-50"
                                 }`}
                    >
                      {n}
                    </button>
                  ))}
                  <BtnPag
                    onClick={() =>
                      cargarRegistros(Math.min(totalPaginas, pagina + 1))
                    }
                    disabled={pagina === totalPaginas}
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
        </main>
      </div>

      {/* ══ MODAL: Registrar vacuna ══════════════════════ */}
      {modalForm && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalForm(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div
              className="flex items-center justify-between px-6 py-4 border-b border-blue-100
                            sticky top-0 bg-white z-10"
            >
              <h3 className="text-base font-semibold text-blue-900">
                Registrar vacuna aplicada
              </h3>
              <button
                onClick={() => setModalForm(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <IcoCerrar />
              </button>
            </div>

            <form onSubmit={guardarVacuna} noValidate>
              <div className="px-6 py-5 space-y-5">
                {/* Sección 1: Datos del paciente */}
                <SeccionForm numero="1" titulo="Datos del paciente">
                  <div className="mb-3">
                    <label className={lbl}>Cédula *</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={form.cedula}
                        onChange={(e) =>
                          handleFormChange("cedula", e.target.value)
                        }
                        placeholder="V-12345678"
                        className={inp}
                      />
                      {buscandoPac && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2">
                          <span
                            className="w-4 h-4 border-2 border-blue-300 border-t-blue-600
                                           rounded-full animate-spin inline-block"
                          />
                        </span>
                      )}
                    </div>
                    {pacEncontrado && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1 font-medium">
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={3}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Paciente encontrado — datos completados automáticamente
                      </p>
                    )}
                    {!pacEncontrado &&
                      form.cedula.length >= 5 &&
                      !buscandoPac && (
                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                          <svg
                            className="w-3 h-3"
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
                          Paciente nuevo — complete los datos a continuación
                        </p>
                      )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>Nombre *</label>
                      <input
                        type="text"
                        value={form.nombre}
                        onChange={(e) =>
                          handleFormChange("nombre", e.target.value)
                        }
                        placeholder="Nombre"
                        className={inp}
                      />
                    </div>
                    <div>
                      <label className={lbl}>Apellido *</label>
                      <input
                        type="text"
                        value={form.apellido}
                        onChange={(e) =>
                          handleFormChange("apellido", e.target.value)
                        }
                        placeholder="Apellido"
                        className={inp}
                      />
                    </div>
                    <div>
                      <label className={lbl}>
                        Fecha de nacimiento {!pacEncontrado && "*"}
                      </label>
                      <input
                        type="date"
                        value={form.fecha_nacimiento}
                        onChange={(e) =>
                          handleFormChange("fecha_nacimiento", e.target.value)
                        }
                        className={inp}
                      />
                    </div>
                    <div>
                      <label className={lbl}>
                        Sexo {!pacEncontrado && "*"}
                      </label>
                      <select
                        value={form.sexo}
                        onChange={(e) =>
                          handleFormChange("sexo", e.target.value)
                        }
                        className={inp}
                      >
                        <option value="">Seleccionar...</option>
                        <option value="M">Masculino</option>
                        <option value="F">Femenino</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>Teléfono</label>
                      <input
                        type="tel"
                        value={form.telefono}
                        onChange={(e) =>
                          handleFormChange("telefono", e.target.value)
                        }
                        placeholder="0412-0000000"
                        className={inp}
                      />
                    </div>
                    <div>
                      <label className={lbl}>Correo electrónico</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          handleFormChange("email", e.target.value)
                        }
                        placeholder="correo@ejemplo.com"
                        className={inp}
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className={lbl}>Dirección</label>
                    <textarea
                      value={form.direccion}
                      onChange={(e) =>
                        handleFormChange("direccion", e.target.value)
                      }
                      placeholder="Dirección del paciente..."
                      rows={2}
                      className={`${inp} resize-none`}
                    />
                  </div>
                </SeccionForm>

                {/* Sección 2: Datos de la vacuna */}
                <SeccionForm numero="2" titulo="Datos de la vacuna">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>Tipo de vacuna *</label>
                      <select
                        value={form.tipo_vacuna_id}
                        onChange={(e) =>
                          handleFormChange("tipo_vacuna_id", e.target.value)
                        }
                        className={inp}
                      >
                        <option value="">Seleccionar...</option>
                        {TIPOS_VACUNA.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>Número de dosis *</label>
                      <select
                        value={form.dosis}
                        onChange={(e) =>
                          handleFormChange("dosis", e.target.value)
                        }
                        disabled={dosisOpts.length === 0}
                        className={`${inp} disabled:opacity-50`}
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
                    </div>
                    <div>
                      <label className={lbl}>Fecha de aplicación *</label>
                      <input
                        type="date"
                        value={form.fecha_aplicacion}
                        onChange={(e) =>
                          handleFormChange("fecha_aplicacion", e.target.value)
                        }
                        max={new Date().toISOString().split("T")[0]}
                        className={inp}
                      />
                    </div>
                    <div>
                      <label className={lbl}>Número de lote</label>
                      <input
                        type="text"
                        value={form.lote}
                        onChange={(e) =>
                          handleFormChange("lote", e.target.value)
                        }
                        placeholder="Ej: BCG-001"
                        className={inp}
                      />
                    </div>
                  </div>

                  {/* Selector de vacunador */}
                  <div className="mt-3">
                    <label className={lbl}>Vacunador responsable *</label>
                    <select
                      value={form.vacunador_id}
                      onChange={(e) =>
                        handleFormChange("vacunador_id", e.target.value)
                      }
                      className={inp}
                    >
                      <option value="">Seleccionar vacunador...</option>
                      {listaVacunadores.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.nombre} — {v.rol}
                        </option>
                      ))}
                    </select>
                    {listaVacunadores.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        No hay vacunadores registrados en el sistema.
                      </p>
                    )}
                  </div>

                  <div className="mt-3">
                    <label className={lbl}>Observaciones</label>
                    <textarea
                      value={form.observaciones}
                      onChange={(e) =>
                        handleFormChange("observaciones", e.target.value)
                      }
                      placeholder="Opcional..."
                      rows={2}
                      className={`${inp} resize-none`}
                    />
                  </div>
                </SeccionForm>

                {/* Mensajes */}
                {errorForm && (
                  <div
                    className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl
                                  text-sm text-red-600 flex items-start gap-2"
                  >
                    <svg
                      className="w-4 h-4 flex-shrink-0 mt-0.5"
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
                    {errorForm}
                  </div>
                )}
                {okForm && (
                  <div
                    className="px-4 py-3 bg-green-50 border border-green-200 rounded-xl
                                  text-sm text-green-700 font-medium flex items-center gap-2"
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
                    Vacuna registrada correctamente
                  </div>
                )}
              </div>

              <div className="flex gap-3 px-6 pb-6">
                <button
                  type="button"
                  onClick={() => setModalForm(false)}
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
                      <span
                        className="w-4 h-4 border-2 border-white/30 border-t-white
                                       rounded-full animate-spin"
                      />
                      Guardando...
                    </>
                  ) : (
                    "Guardar registro"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL: Detalle ══════════════════════════════ */}
      {modalDetalle && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalDetalle(null);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-blue-100">
              <h3 className="text-base font-semibold text-blue-900">
                Detalle del registro
              </h3>
              <button
                onClick={() => setModalDetalle(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <IcoCerrar />
              </button>
            </div>
            <div className="px-6 py-5">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Campo label="Paciente" valor={modalDetalle.paciente} />
                <Campo label="Cédula" valor={modalDetalle.cedula} />
                <Campo
                  label="Vacuna"
                  valor={
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold
                    ${BADGE[modalDetalle.vacuna] || ""}`}
                    >
                      {modalDetalle.vacuna}
                    </span>
                  }
                />
                <Campo label="Dosis" valor={modalDetalle.dosis} />
                <Campo label="Fecha" valor={formatFecha(modalDetalle.fecha)} />
                <Campo label="Lote" valor={modalDetalle.lote || "—"} />
                <Campo label="Vacunador" valor={modalDetalle.vacunador} />
                {modalDetalle.telefono && (
                  <Campo label="Teléfono" valor={modalDetalle.telefono} />
                )}
                {modalDetalle.email && (
                  <Campo label="Email" valor={modalDetalle.email} />
                )}
              </div>
              {modalDetalle.observaciones && (
                <div className="mt-2">
                  <Campo
                    label="Observaciones"
                    valor={modalDetalle.observaciones}
                  />
                </div>
              )}
              <button
                onClick={() => setModalDetalle(null)}
                className="w-full mt-5 bg-blue-600 hover:bg-blue-700 text-white
                           font-semibold py-2.5 rounded-xl text-sm transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Vacunadores ══════════════════════════ */}
      {modalVacunadores && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModalVacunadores(false);
              setVacunadorSel(null);
            }
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl
                          max-h-[90vh] overflow-y-auto"
          >
            {/* ── Header del modal ── */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b border-blue-100
                            sticky top-0 bg-white z-10"
            >
              <div>
                <h3 className="text-base font-semibold text-blue-900">
                  {vacunadorSel
                    ? `Record — ${vacunadorSel.nombre}`
                    : "Equipo de vacunadores"}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {vacunadorSel
                    ? "Detalle de actividad"
                    : `${vacunadores.length} vacunadores en el ASIC`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* ── NUEVO: Botón agregar vacunador (solo admin, solo en vista lista) ── */}
                {esAdmin && !vacunadorSel && (
                  <button
                    onClick={abrirNuevoVacunador}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700
                               text-white text-xs font-semibold px-3 py-1.5 rounded-lg
                               transition active:scale-[0.97] shadow-sm"
                    title="Agregar nuevo vacunador"
                  >
                    <svg
                      className="w-3.5 h-3.5"
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
                    Agregar
                  </button>
                )}
                {vacunadorSel && (
                  <button
                    onClick={() => setVacunadorSel(null)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium
                               flex items-center gap-1 transition"
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
                    Volver
                  </button>
                )}
                <button
                  onClick={() => {
                    setModalVacunadores(false);
                    setVacunadorSel(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <IcoCerrar />
                </button>
              </div>
            </div>

            <div className="px-6 py-5">
              {cargandoVac ? (
                <div className="flex items-center justify-center py-12">
                  <span
                    className="w-8 h-8 border-2 border-blue-300 border-t-blue-600
                                   rounded-full animate-spin"
                  />
                </div>
              ) : !vacunadorSel ? (
                // Lista de vacunadores
                <div className="space-y-3">
                  {vacunadores.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-gray-400 text-sm mb-3">
                        No hay vacunadores registrados.
                      </p>
                      {esAdmin && (
                        <button
                          onClick={abrirNuevoVacunador}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium
                                     underline transition"
                        >
                          Agregar el primero
                        </button>
                      )}
                    </div>
                  ) : (
                    vacunadores.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setVacunadorSel(v)}
                        className="w-full bg-blue-50 hover:bg-blue-100 border border-blue-100
                                 hover:border-blue-300 rounded-2xl p-4 text-left
                                 transition active:scale-[0.99] group"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className="w-12 h-12 bg-blue-600 rounded-full flex items-center
                                        justify-center text-white font-bold text-sm flex-shrink-0"
                          >
                            {v.nombre
                              .split(" ")
                              .map((p) => p[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800">
                              {v.nombre}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">
                              {v.rol} · {v.email}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-2xl font-bold text-blue-600">
                              {v.total_vacunas}
                            </p>
                            <p className="text-xs text-gray-400">vacunas</p>
                          </div>
                          <svg
                            className="w-5 h-5 text-gray-300 group-hover:text-blue-400
                                        transition flex-shrink-0"
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
                        </div>
                        <div className="flex gap-6 mt-3 pt-3 border-t border-blue-100">
                          <div>
                            <p className="text-sm font-semibold text-gray-700">
                              {v.total_pacientes}
                            </p>
                            <p className="text-xs text-gray-400">pacientes</p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-700">
                              {v.ultima_aplicacion
                                ? formatFecha(v.ultima_aplicacion)
                                : "—"}
                            </p>
                            <p className="text-xs text-gray-400">
                              última aplicación
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-700">
                              {v.primera_aplicacion
                                ? formatFecha(v.primera_aplicacion)
                                : "—"}
                            </p>
                            <p className="text-xs text-gray-400">
                              primera aplicación
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              ) : (
                // Detalle del vacunador seleccionado
                <div>
                  <div className="bg-blue-50 rounded-2xl p-5 mb-5 flex items-center gap-4">
                    <div
                      className="w-14 h-14 bg-blue-600 rounded-full flex items-center
                                    justify-center text-white font-bold text-xl flex-shrink-0"
                    >
                      {vacunadorSel.nombre
                        .split(" ")
                        .map((p) => p[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-base">
                        {vacunadorSel.nombre}
                      </h4>
                      <p className="text-sm text-gray-500 capitalize">
                        {vacunadorSel.rol}
                      </p>
                      <p className="text-xs text-gray-400">
                        {vacunadorSel.email}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="bg-white border border-blue-100 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {vacunadorSel.total_vacunas}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Total vacunas
                      </p>
                    </div>
                    <div className="bg-white border border-blue-100 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {vacunadorSel.total_pacientes}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">Pacientes</p>
                    </div>
                    <div className="bg-white border border-blue-100 rounded-xl p-3 text-center">
                      <p className="text-base font-bold text-blue-600">
                        {vacunadorSel.ultima_aplicacion
                          ? formatFecha(vacunadorSel.ultima_aplicacion)
                          : "—"}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Última aplic.
                      </p>
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                    Distribución por vacuna
                  </h4>
                  {vacunadorSel.detalle_vacunas.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">
                      Sin registros aún.
                    </p>
                  ) : (
                    vacunadorSel.detalle_vacunas.map((d) => {
                      const pct =
                        vacunadorSel.total_vacunas > 0
                          ? Math.round(
                              (d.cantidad / vacunadorSel.total_vacunas) * 100,
                            )
                          : 0;
                      return (
                        <div key={d.vacuna} className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-gray-700">
                              {d.vacuna}
                            </span>
                            <span className="text-gray-500">
                              {d.cantidad} · {pct}%
                            </span>
                          </div>
                          <div className="h-2 bg-blue-50 rounded-full">
                            <div
                              className="h-2 bg-blue-500 rounded-full transition-all duration-700"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Nuevo vacunador (solo admin) ════════════ */}
      {modalNuevoVacunador && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalNuevoVacunador(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-blue-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
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
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-blue-900">
                    Nuevo vacunador
                  </h3>
                  <p className="text-xs text-gray-400">
                    Acceso de administrador
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalNuevoVacunador(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <IcoCerrar />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={guardarNuevoVacunador} noValidate>
              <div className="px-6 py-5 space-y-4">
                {/* Nombre y apellido */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Nombre *</label>
                    <input
                      type="text"
                      value={formVacunador.nombre}
                      onChange={(e) =>
                        setFormVacunador((f) => ({
                          ...f,
                          nombre: e.target.value,
                        }))
                      }
                      placeholder="Ej: María"
                      className={inp}
                    />
                  </div>
                  <div>
                    <label className={lbl}>Apellido *</label>
                    <input
                      type="text"
                      value={formVacunador.apellido}
                      onChange={(e) =>
                        setFormVacunador((f) => ({
                          ...f,
                          apellido: e.target.value,
                        }))
                      }
                      placeholder="Ej: González"
                      className={inp}
                    />
                  </div>
                </div>

                {/* Correo */}
                <div>
                  <label className={lbl}>Correo electrónico *</label>
                  <input
                    type="email"
                    value={formVacunador.email}
                    onChange={(e) =>
                      setFormVacunador((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="correo@ejemplo.com"
                    className={inp}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Se usará como usuario para iniciar sesión.
                  </p>
                </div>

                {/* Contraseña */}
                <div>
                  <label className={lbl}>Contraseña *</label>
                  <div className="relative">
                    <input
                      type={mostrarPassword ? "text" : "password"}
                      value={formVacunador.password}
                      onChange={(e) =>
                        setFormVacunador((f) => ({
                          ...f,
                          password: e.target.value,
                        }))
                      }
                      placeholder="Mínimo 6 caracteres"
                      className={`${inp} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2
                                 text-gray-400 hover:text-gray-600 transition"
                      tabIndex={-1}
                    >
                      {mostrarPassword ? (
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
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
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
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Teléfono y Rol */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Teléfono</label>
                    <input
                      type="tel"
                      value={formVacunador.telefono}
                      onChange={(e) =>
                        setFormVacunador((f) => ({
                          ...f,
                          telefono: e.target.value,
                        }))
                      }
                      placeholder="0412-0000000"
                      className={inp}
                    />
                  </div>
                  <div>
                    <label className={lbl}>Rol *</label>
                    <select
                      value={formVacunador.rol}
                      onChange={(e) =>
                        setFormVacunador((f) => ({ ...f, rol: e.target.value }))
                      }
                      className={inp}
                    >
                      <option value="enfermero">Enfermero/a</option>
                      <option value="medico">Médico/a</option>
                      <option value="auxiliar">Auxiliar</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                </div>

                {/* Mensajes de estado */}
                {errorVacunador && (
                  <div
                    className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl
                                  text-sm text-red-600 flex items-start gap-2"
                  >
                    <svg
                      className="w-4 h-4 flex-shrink-0 mt-0.5"
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
                    {errorVacunador}
                  </div>
                )}
                {okVacunador && (
                  <div
                    className="px-4 py-3 bg-green-50 border border-green-200 rounded-xl
                                  text-sm text-green-700 font-medium flex items-center gap-2"
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
                    Vacunador creado correctamente
                  </div>
                )}
              </div>

              {/* Acciones */}
              <div className="flex gap-3 px-6 pb-6">
                <button
                  type="button"
                  onClick={() => setModalNuevoVacunador(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm
                             font-medium text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoVacunador}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50
                             text-white font-semibold py-2.5 rounded-xl text-sm
                             transition active:scale-[0.98] flex items-center
                             justify-center gap-2"
                >
                  {guardandoVacunador ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Crear vacunador"
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
function SeccionForm({ numero, titulo, children }) {
  return (
    <div>
      <h4
        className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3
                     flex items-center gap-2"
      >
        <span
          className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center
                         text-blue-600 font-bold text-xs flex-shrink-0"
        >
          {numero}
        </span>
        {titulo}
      </h4>
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

const inp = `w-full px-3 py-2.5 border border-blue-200 rounded-xl text-sm
  focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent
  transition text-gray-700 bg-white`;

const lbl = "block text-xs font-semibold text-gray-700 mb-1.5";

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
function IcoPersonas() {
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
