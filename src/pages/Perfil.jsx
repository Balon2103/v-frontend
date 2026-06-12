import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "";

const FORM_VACIO_USUARIO = {
  nombre: "",
  apellido: "",
  cedula: "",
  email: "",
  password: "",
  confirmar: "",
};

const FORM_VACIO_EDITAR = {
  nombre: "",
  apellido: "",
  cedula: "",
  email: "",
  rol_id: "2",
  activo: true,
  password: "",
  confirmar: "",
};

const FORM_VACIO_PWD = { actual: "", nueva: "", confirmar: "" };

export default function Perfil() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Lista de usuarios del sistema
  const [usuarios, setUsuarios] = useState([]);
  const [cargandoUsers, setCargandoUsers] = useState(false);

  // Modales
  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalEditar, setModalEditar] = useState(null); // usuario a editar
  const [modalConfirm, setModalConfirm] = useState(null); // { id, activo, nombre }

  // Formularios
  const [formNuevo, setFormNuevo] = useState(FORM_VACIO_USUARIO);
  const [formEditar, setFormEditar] = useState(FORM_VACIO_EDITAR);
  const [formPwd, setFormPwd] = useState(FORM_VACIO_PWD);

  // Estados feedback
  const [errorNuevo, setErrorNuevo] = useState("");
  const [okNuevo, setOkNuevo] = useState(false);
  const [cargandoNuevo, setCargandoNuevo] = useState(false);

  const [errorEditar, setErrorEditar] = useState("");
  const [okEditar, setOkEditar] = useState(false);
  const [cargandoEditar, setCargandoEditar] = useState(false);

  const [errorPwd, setErrorPwd] = useState("");
  const [okPwd, setOkPwd] = useState(false);
  const [cargandoPwd, setCargandoPwd] = useState(false);

  const [errorConfirm, setErrorConfirm] = useState("");
  const [cargandoConf, setCargandoConf] = useState(false);

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

  // ── Cargar lista de usuarios ──────────────────────────────
  const cargarUsuarios = useCallback(async () => {
    if (!esAdmin) return;
    setCargandoUsers(true);
    try {
      const resp = await fetch(`${API}/api/usuarios`, { headers });
      const data = await resp.json();
      if (data.ok) setUsuarios(data.usuarios);
    } catch (err) {
      console.error("Error cargando usuarios:", err);
    } finally {
      setCargandoUsers(false);
    }
  }, [esAdmin, headers]);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  // ── Cambiar contraseña propia ─────────────────────────────
  async function guardarPwd(e) {
    e.preventDefault();
    setErrorPwd("");
    const { actual, nueva, confirmar } = formPwd;
    if (!actual || !nueva || !confirmar) {
      setErrorPwd("Todos los campos son obligatorios.");
      return;
    }
    if (nueva.length < 8) {
      setErrorPwd("La nueva contraseña debe tener mínimo 8 caracteres.");
      return;
    }
    if (nueva !== confirmar) {
      setErrorPwd("Las contraseñas no coinciden.");
      return;
    }

    setCargandoPwd(true);
    try {
      const resp = await fetch(`${API}/api/usuarios/perfil/cambiar-password`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          password_actual: actual,
          password_nueva: nueva,
        }),
      });
      const data = await resp.json();
      if (data.ok) {
        setOkPwd(true);
        setFormPwd(FORM_VACIO_PWD);
        setTimeout(() => setOkPwd(false), 3000);
      } else {
        setErrorPwd(data.mensaje || "Error al actualizar la contraseña.");
      }
    } catch {
      setErrorPwd("No se pudo conectar con el servidor.");
    } finally {
      setCargandoPwd(false);
    }
  }

  // ── Crear nuevo usuario ───────────────────────────────────
  async function guardarNuevo(e) {
    e.preventDefault();
    setErrorNuevo("");
    const { nombre, apellido, cedula, email, password, confirmar } = formNuevo;
    if (!nombre || !apellido || !cedula || !email || !password) {
      setErrorNuevo("Todos los campos son obligatorios.");
      return;
    }
    if (password.length < 8) {
      setErrorNuevo("La contraseña debe tener mínimo 8 caracteres.");
      return;
    }
    if (password !== confirmar) {
      setErrorNuevo("Las contraseñas no coinciden.");
      return;
    }

    setCargandoNuevo(true);
    try {
      const resp = await fetch(`${API}/api/usuarios`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          nombre,
          apellido,
          cedula,
          email,
          password,
          rol_id: 2,
        }),
      });
      const data = await resp.json();
      if (data.ok) {
        setOkNuevo(true);
        setTimeout(() => {
          setModalNuevo(false);
          setOkNuevo(false);
          setFormNuevo(FORM_VACIO_USUARIO);
          cargarUsuarios();
        }, 1200);
      } else {
        setErrorNuevo(data.mensaje || "Error al crear el usuario.");
      }
    } catch {
      setErrorNuevo("No se pudo conectar con el servidor.");
    } finally {
      setCargandoNuevo(false);
    }
  }

  // ── Abrir modal editar ────────────────────────────────────
  function abrirEditar(u) {
    setFormEditar({
      nombre: u.nombre,
      apellido: u.apellido,
      cedula: u.cedula,
      email: u.email,
      rol_id: String(u.rol_id),
      activo: u.activo,
      password: "",
      confirmar: "",
    });
    setErrorEditar("");
    setOkEditar(false);
    setModalEditar(u);
  }

  // ── Guardar edición de usuario ────────────────────────────
  async function guardarEditar(e) {
    e.preventDefault();
    setErrorEditar("");
    const {
      nombre,
      apellido,
      cedula,
      email,
      rol_id,
      activo,
      password,
      confirmar,
    } = formEditar;
    if (!nombre || !apellido || !cedula || !email) {
      setErrorEditar("Nombre, apellido, cédula y email son obligatorios.");
      return;
    }
    if (password && password.length < 8) {
      setErrorEditar("La nueva contraseña debe tener mínimo 8 caracteres.");
      return;
    }
    if (password && password !== confirmar) {
      setErrorEditar("Las contraseñas no coinciden.");
      return;
    }

    setCargandoEditar(true);
    try {
      const body = {
        nombre,
        apellido,
        cedula,
        email,
        rol_id: parseInt(rol_id),
        activo,
      };
      if (password) body.password = password;

      const resp = await fetch(`${API}/api/usuarios/${modalEditar.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (data.ok) {
        setOkEditar(true);
        setTimeout(() => {
          setModalEditar(null);
          setOkEditar(false);
          cargarUsuarios();
        }, 1200);
      } else {
        setErrorEditar(data.mensaje || "Error al actualizar.");
      }
    } catch {
      setErrorEditar("No se pudo conectar con el servidor.");
    } finally {
      setCargandoEditar(false);
    }
  }

  // ── Confirmar cambio de estado ────────────────────────────
  async function confirmarCambioEstado() {
    setErrorConfirm("");
    setCargandoConf(true);
    try {
      const resp = await fetch(
        `${API}/api/usuarios/${modalConfirm.id}/estado`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ activo: !modalConfirm.activo }),
        },
      );
      const data = await resp.json();
      if (data.ok) {
        setModalConfirm(null);
        cargarUsuarios();
      } else {
        setErrorConfirm(data.mensaje || "Error al cambiar el estado.");
      }
    } catch {
      setErrorConfirm("No se pudo conectar con el servidor.");
    } finally {
      setCargandoConf(false);
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
    { label: "Reportes", ruta: "/reportes", activo: false },
    { label: "Perfil", ruta: "/perfil", activo: true },
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
          <span className="text-white text-sm font-semibold">Mi perfil</span>
          <div
            className="w-9 h-9 bg-white rounded-full flex items-center
                          justify-center text-blue-600 font-bold text-xs"
          >
            {iniciales}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {/* Encabezado */}
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-blue-900">
              Mi perfil
            </h1>
            <p className="text-xs sm:text-sm text-blue-400 mt-0.5">
              Información de cuenta y configuración
            </p>
          </div>

          {/* ── Tarjeta de perfil ────────────────────────── */}
          <div
            className="bg-white rounded-2xl border border-blue-100 p-5 sm:p-6 mb-5
                          flex flex-col sm:flex-row items-start sm:items-center gap-4"
          >
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-600 rounded-2xl flex items-center
                            justify-center text-white font-bold text-2xl sm:text-3xl
                            flex-shrink-0 shadow-lg shadow-blue-200"
            >
              {iniciales}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-blue-900">
                {usuario?.nombre}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">{usuario?.email}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full
                                 text-xs font-semibold capitalize"
                >
                  {usuario?.rol === "administrador"
                    ? "Coordinador / Administrador"
                    : "Personal administrativo"}
                </span>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                  Cuenta activa
                </span>
              </div>
            </div>
          </div>

          {/* ── Información personal ─────────────────────── */}
          <div className="bg-white rounded-2xl border border-blue-100 p-5 sm:p-6 mb-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Información personal
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo label="Nombre completo" valor={usuario?.nombre || "—"} />
              <Campo label="Correo electrónico" valor={usuario?.email || "—"} />
              <Campo
                label="Rol en el sistema"
                valor={
                  <span
                    className="px-2.5 py-1 bg-blue-100 text-blue-700
                                   rounded-full text-xs font-semibold capitalize"
                  >
                    {usuario?.rol === "administrador"
                      ? "Administrador"
                      : "Personal"}
                  </span>
                }
              />
              <Campo
                label="Estado"
                valor={
                  <span
                    className="px-2.5 py-1 bg-green-100 text-green-700
                                   rounded-full text-xs font-semibold"
                  >
                    Activo
                  </span>
                }
              />
            </div>
          </div>

          {/* ── Cambiar contraseña ───────────────────────── */}
          <div className="bg-white rounded-2xl border border-blue-100 p-5 sm:p-6 mb-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Cambiar contraseña
            </h3>
            <form onSubmit={guardarPwd} noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className={LBL}>Contraseña actual *</label>
                  <input
                    type="password"
                    value={formPwd.actual}
                    onChange={(e) =>
                      setFormPwd((f) => ({ ...f, actual: e.target.value }))
                    }
                    placeholder="••••••••"
                    className={INP}
                  />
                </div>
                <div>
                  <label className={LBL}>Nueva contraseña *</label>
                  <input
                    type="password"
                    value={formPwd.nueva}
                    onChange={(e) =>
                      setFormPwd((f) => ({ ...f, nueva: e.target.value }))
                    }
                    placeholder="Mínimo 8 caracteres"
                    className={INP}
                  />
                </div>
                <div>
                  <label className={LBL}>Confirmar contraseña *</label>
                  <input
                    type="password"
                    value={formPwd.confirmar}
                    onChange={(e) =>
                      setFormPwd((f) => ({ ...f, confirmar: e.target.value }))
                    }
                    placeholder="Repetir contraseña"
                    className={INP}
                  />
                </div>
              </div>
              {errorPwd && <MsgError msg={errorPwd} />}
              {okPwd && <MsgOk msg="Contraseña actualizada correctamente." />}
              <button
                type="submit"
                disabled={cargandoPwd}
                className="mt-4 flex items-center gap-2 bg-blue-600 hover:bg-blue-700
                           disabled:opacity-50 text-white font-semibold px-5 py-2.5
                           rounded-xl text-sm transition active:scale-[0.98]
                           touch-manipulation"
              >
                {cargandoPwd ? (
                  <>
                    <Spinner /> Actualizando...
                  </>
                ) : (
                  "Actualizar contraseña"
                )}
              </button>
            </form>
          </div>

          {/* ── Gestión de usuarios (solo admin) ─────────── */}
          {esAdmin && (
            <div className="bg-white rounded-2xl border border-blue-100 p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700">
                    Usuarios del sistema
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {cargandoUsers
                      ? "Cargando..."
                      : `${usuarios.filter((u) => u.activo).length} activos · ${usuarios.length} total`}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setFormNuevo(FORM_VACIO_USUARIO);
                    setErrorNuevo("");
                    setOkNuevo(false);
                    setModalNuevo(true);
                  }}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700
                             text-white font-semibold px-3 sm:px-4 py-2 sm:py-2.5
                             rounded-xl text-xs sm:text-sm transition active:scale-[0.98]
                             touch-manipulation"
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
                  Nuevo usuario
                </button>
              </div>

              {/* Tabla usuarios */}
              <div className="overflow-x-auto rounded-xl border border-blue-50">
                <table className="w-full text-sm">
                  <thead className="bg-blue-50 border-b border-blue-100">
                    <tr>
                      {[
                        "Usuario",
                        "Cédula",
                        "Email",
                        "Rol",
                        "Estado",
                        "Acciones",
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
                    {cargandoUsers ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center">
                          <span
                            className="inline-block w-6 h-6 border-2 border-blue-300
                                         border-t-blue-600 rounded-full animate-spin"
                          />
                        </td>
                      </tr>
                    ) : usuarios.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-gray-400 text-sm"
                        >
                          No hay usuarios registrados.
                        </td>
                      </tr>
                    ) : (
                      usuarios.map((u) => (
                        <tr
                          key={u.id}
                          className="hover:bg-blue-50/40 transition"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-8 h-8 bg-blue-100 rounded-full flex items-center
                                            justify-center text-blue-600 font-bold text-xs flex-shrink-0"
                              >
                                {u.nombre[0]}
                                {u.apellido[0]}
                              </div>
                              <div>
                                <p className="font-medium text-gray-800 text-sm">
                                  {u.nombre} {u.apellido}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                            {u.cedula}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                            {u.email}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold
                            ${
                              u.rol === "administrador"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                            >
                              {u.rol}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold
                            ${
                              u.activo
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                            >
                              {u.activo ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => abrirEditar(u)}
                                className="text-blue-600 hover:text-blue-800 text-xs
                                         font-medium hover:underline transition"
                              >
                                Editar
                              </button>
                              {u.id !== usuario?.id && (
                                <button
                                  onClick={() =>
                                    setModalConfirm({
                                      id: u.id,
                                      activo: u.activo,
                                      nombre: `${u.nombre} ${u.apellido}`,
                                    })
                                  }
                                  className={`text-xs font-medium hover:underline transition
                                  ${
                                    u.activo
                                      ? "text-red-500 hover:text-red-700"
                                      : "text-green-600 hover:text-green-800"
                                  }`}
                                >
                                  {u.activo ? "Desactivar" : "Activar"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ══ MODAL: Nuevo usuario ══════════════════════════ */}
      {modalNuevo && (
        <Modal
          titulo="Crear nuevo usuario"
          onClose={() => setModalNuevo(false)}
        >
          <form onSubmit={guardarNuevo} noValidate>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LBL}>Nombre *</label>
                  <input
                    type="text"
                    value={formNuevo.nombre}
                    onChange={(e) =>
                      setFormNuevo((f) => ({ ...f, nombre: e.target.value }))
                    }
                    placeholder="Nombre"
                    className={INP}
                  />
                </div>
                <div>
                  <label className={LBL}>Apellido *</label>
                  <input
                    type="text"
                    value={formNuevo.apellido}
                    onChange={(e) =>
                      setFormNuevo((f) => ({ ...f, apellido: e.target.value }))
                    }
                    placeholder="Apellido"
                    className={INP}
                  />
                </div>
              </div>
              <div>
                <label className={LBL}>Cédula *</label>
                <input
                  type="text"
                  value={formNuevo.cedula}
                  onChange={(e) =>
                    setFormNuevo((f) => ({ ...f, cedula: e.target.value }))
                  }
                  placeholder="V-12345678"
                  className={INP}
                />
              </div>
              <div>
                <label className={LBL}>Correo electrónico *</label>
                <input
                  type="email"
                  value={formNuevo.email}
                  onChange={(e) =>
                    setFormNuevo((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="usuario@asic.gob.ve"
                  className={INP}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LBL}>Contraseña inicial *</label>
                  <input
                    type="password"
                    value={formNuevo.password}
                    onChange={(e) =>
                      setFormNuevo((f) => ({ ...f, password: e.target.value }))
                    }
                    placeholder="Mínimo 8 caracteres"
                    className={INP}
                  />
                </div>
                <div>
                  <label className={LBL}>Confirmar contraseña *</label>
                  <input
                    type="password"
                    value={formNuevo.confirmar}
                    onChange={(e) =>
                      setFormNuevo((f) => ({ ...f, confirmar: e.target.value }))
                    }
                    placeholder="Repetir contraseña"
                    className={INP}
                  />
                </div>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-xs text-blue-700 flex items-start gap-2">
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
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  La cuenta se creará con rol de{" "}
                  <strong>Personal administrativo</strong>.
                </p>
              </div>
              {errorNuevo && <MsgError msg={errorNuevo} />}
              {okNuevo && <MsgOk msg="Usuario creado correctamente." />}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                type="button"
                onClick={() => setModalNuevo(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm
                           font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={cargandoNuevo}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50
                           text-white font-semibold py-2.5 rounded-xl text-sm
                           transition active:scale-[0.98] flex items-center
                           justify-center gap-2"
              >
                {cargandoNuevo ? (
                  <>
                    <Spinner /> Guardando...
                  </>
                ) : (
                  "Crear usuario"
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ══ MODAL: Editar usuario ════════════════════════ */}
      {modalEditar && (
        <Modal
          titulo={`Editar · ${modalEditar.nombre} ${modalEditar.apellido}`}
          onClose={() => setModalEditar(null)}
        >
          <form onSubmit={guardarEditar} noValidate>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LBL}>Nombre *</label>
                  <input
                    type="text"
                    value={formEditar.nombre}
                    onChange={(e) =>
                      setFormEditar((f) => ({ ...f, nombre: e.target.value }))
                    }
                    className={INP}
                  />
                </div>
                <div>
                  <label className={LBL}>Apellido *</label>
                  <input
                    type="text"
                    value={formEditar.apellido}
                    onChange={(e) =>
                      setFormEditar((f) => ({ ...f, apellido: e.target.value }))
                    }
                    className={INP}
                  />
                </div>
              </div>
              <div>
                <label className={LBL}>Cédula *</label>
                <input
                  type="text"
                  value={formEditar.cedula}
                  onChange={(e) =>
                    setFormEditar((f) => ({ ...f, cedula: e.target.value }))
                  }
                  className={INP}
                />
              </div>
              <div>
                <label className={LBL}>Correo electrónico *</label>
                <input
                  type="email"
                  value={formEditar.email}
                  onChange={(e) =>
                    setFormEditar((f) => ({ ...f, email: e.target.value }))
                  }
                  className={INP}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LBL}>Rol</label>
                  <select
                    value={formEditar.rol_id}
                    onChange={(e) =>
                      setFormEditar((f) => ({ ...f, rol_id: e.target.value }))
                    }
                    className={INP}
                  >
                    <option value="2">Personal administrativo</option>
                    <option value="1">Administrador</option>
                  </select>
                </div>
                <div>
                  <label className={LBL}>Estado</label>
                  <select
                    value={formEditar.activo ? "true" : "false"}
                    onChange={(e) =>
                      setFormEditar((f) => ({
                        ...f,
                        activo: e.target.value === "true",
                      }))
                    }
                    disabled={modalEditar.id === usuario?.id}
                    className={`${INP} disabled:opacity-50`}
                  >
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LBL}>Nueva contraseña</label>
                  <input
                    type="password"
                    value={formEditar.password}
                    onChange={(e) =>
                      setFormEditar((f) => ({ ...f, password: e.target.value }))
                    }
                    placeholder="Dejar vacío para no cambiar"
                    className={INP}
                  />
                </div>
                <div>
                  <label className={LBL}>Confirmar</label>
                  <input
                    type="password"
                    value={formEditar.confirmar}
                    onChange={(e) =>
                      setFormEditar((f) => ({
                        ...f,
                        confirmar: e.target.value,
                      }))
                    }
                    placeholder="Repetir si cambió"
                    className={INP}
                  />
                </div>
              </div>
              {errorEditar && <MsgError msg={errorEditar} />}
              {okEditar && <MsgOk msg="Usuario actualizado correctamente." />}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                type="button"
                onClick={() => setModalEditar(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm
                           font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={cargandoEditar}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50
                           text-white font-semibold py-2.5 rounded-xl text-sm
                           transition active:scale-[0.98] flex items-center
                           justify-center gap-2"
              >
                {cargandoEditar ? (
                  <>
                    <Spinner /> Guardando...
                  </>
                ) : (
                  "Guardar cambios"
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ══ MODAL: Confirmar cambio de estado ════════════ */}
      {modalConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center
                            mx-auto mb-4
                            ${modalConfirm.activo ? "bg-red-100" : "bg-green-100"}`}
            >
              <svg
                className={`w-6 h-6 ${modalConfirm.activo ? "text-red-500" : "text-green-500"}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94
                     a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">
              ¿{modalConfirm.activo ? "Desactivar" : "Activar"} usuario?
            </h3>
            <p className="text-sm text-gray-500 mb-2">
              <span className="font-medium">{modalConfirm.nombre}</span>
              {modalConfirm.activo
                ? " perderá acceso al sistema."
                : " recuperará acceso al sistema."}
            </p>
            {errorConfirm && <MsgError msg={errorConfirm} />}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setModalConfirm(null);
                  setErrorConfirm("");
                }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm
                           text-gray-600 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarCambioEstado}
                disabled={cargandoConf}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white
                           transition active:scale-[0.98] flex items-center
                           justify-center gap-2 disabled:opacity-50
                           ${
                             modalConfirm.activo
                               ? "bg-red-500 hover:bg-red-600"
                               : "bg-green-500 hover:bg-green-600"
                           }`}
              >
                {cargandoConf ? (
                  <>
                    <Spinner /> Procesando...
                  </>
                ) : (
                  "Confirmar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componentes helper ──────────────────────────────────────
function Modal({ titulo, onClose, children }) {
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg
                      max-h-[90vh] overflow-y-auto"
      >
        <div
          className="flex items-center justify-between px-6 py-4
                        border-b border-blue-100 sticky top-0 bg-white z-10"
        >
          <h3 className="text-base font-semibold text-blue-900">{titulo}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition p-1"
          >
            <IcoCerrar />
          </button>
        </div>
        {children}
      </div>
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

function MsgError({ msg }) {
  return (
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
          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94
             a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        />
      </svg>
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
      <svg
        className="w-4 h-4 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
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
