import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// ── Usuarios demo (se reemplazará con fetch al backend) ─────
const USUARIOS_DEMO = [
  {
    id: 2,
    nombre: "María",
    apellido: "González",
    cedula: "V-11223344",
    email: "maria@asic.gob.ve",
    rol: "personal",
    activo: true,
  },
  {
    id: 3,
    nombre: "Juan",
    apellido: "Pérez",
    cedula: "V-55667788",
    email: "juan@asic.gob.ve",
    rol: "personal",
    activo: true,
  },
  {
    id: 4,
    nombre: "Ana",
    apellido: "López",
    cedula: "V-99001122",
    email: "ana@asic.gob.ve",
    rol: "personal",
    activo: false,
  },
];

const FORM_VACIO = {
  nombre: "",
  apellido: "",
  cedula: "",
  email: "",
  password: "",
  confirmar: "",
};
const FORM_PWD = { actual: "", nueva: "", confirmar: "" };

// ── Componente principal ────────────────────────────────────
export default function Perfil() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [usuarios, setUsuarios] = useState(USUARIOS_DEMO);

  // Modales
  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalEditar, setModalEditar] = useState(null); // usuario a editar
  const [modalPwd, setModalPwd] = useState(false);
  const [modalConfirm, setModalConfirm] = useState(null); // { id, activo }

  // Formularios
  const [formNuevo, setFormNuevo] = useState(FORM_VACIO);
  const [formEditar, setFormEditar] = useState(FORM_VACIO);
  const [formPwd, setFormPwd] = useState(FORM_PWD);

  // Estados
  const [errorNuevo, setErrorNuevo] = useState("");
  const [errorEditar, setErrorEditar] = useState("");
  const [errorPwd, setErrorPwd] = useState("");
  const [okNuevo, setOkNuevo] = useState(false);
  const [okEditar, setOkEditar] = useState(false);
  const [okPwd, setOkPwd] = useState(false);

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

  const esAdmin = usuario?.rol === "administrador";
  const iniciales = usuario?.nombre
    ? usuario.nombre
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "??";

  // ── Crear nuevo usuario ─────────────────────────────────
  function abrirNuevo() {
    setFormNuevo(FORM_VACIO);
    setErrorNuevo("");
    setOkNuevo(false);
    setModalNuevo(true);
  }

  function guardarNuevo(e) {
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
    if (usuarios.some((u) => u.email === email || u.cedula === cedula)) {
      setErrorNuevo("Ya existe un usuario con ese email o cédula.");
      return;
    }
    const nuevo = {
      id: usuarios.length + 2,
      nombre,
      apellido,
      cedula,
      email,
      rol: "personal",
      activo: true,
    };
    setUsuarios((prev) => [...prev, nuevo]);
    setOkNuevo(true);
    setTimeout(() => {
      setModalNuevo(false);
      setOkNuevo(false);
    }, 1200);
  }

  // ── Editar usuario ──────────────────────────────────────
  function abrirEditar(u) {
    setFormEditar({
      nombre: u.nombre,
      apellido: u.apellido,
      cedula: u.cedula,
      email: u.email,
      password: "",
      confirmar: "",
    });
    setErrorEditar("");
    setOkEditar(false);
    setModalEditar(u);
  }

  function guardarEditar(e) {
    e.preventDefault();
    setErrorEditar("");
    const { nombre, apellido, cedula, email, password, confirmar } = formEditar;
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
    setUsuarios((prev) =>
      prev.map((u) =>
        u.id === modalEditar.id ? { ...u, nombre, apellido, cedula, email } : u,
      ),
    );
    setOkEditar(true);
    setTimeout(() => {
      setModalEditar(null);
      setOkEditar(false);
    }, 1200);
  }

  // ── Cambiar estado activo/inactivo ──────────────────────
  function cambiarEstado(id, nuevoEstado) {
    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, activo: nuevoEstado } : u)),
    );
    setModalConfirm(null);
  }

  // ── Cambiar contraseña propia ───────────────────────────
  function guardarPwd(e) {
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
    setOkPwd(true);
    setFormPwd(FORM_PWD);
    setTimeout(() => setOkPwd(false), 2500);
  }

  const NAV = [
    { label: "Inicio", ruta: "/dashboard", activo: false },
    { label: "Vacunas", ruta: "/vacunas", activo: false },
    { label: "Inventario", ruta: "/inventario", activo: false },
    { label: "Reportes", ruta: "/reportes", activo: false },
    { label: "Perfil", ruta: "/perfil", activo: true },
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
          <span className="text-white text-sm font-semibold">Mi perfil</span>
          <div
            className="w-9 h-9 bg-white rounded-full flex items-center
                          justify-center text-blue-600 font-bold text-xs"
          >
            {iniciales}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
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
              className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-600 rounded-2xl
                            flex items-center justify-center text-white
                            font-bold text-2xl sm:text-3xl flex-shrink-0 shadow-lg
                            shadow-blue-200"
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
                  className="px-3 py-1 bg-blue-100 text-blue-700
                                 rounded-full text-xs font-semibold capitalize"
                >
                  {usuario?.rol === "administrador"
                    ? "Coordinador / Administrador"
                    : "Personal administrativo"}
                </span>
                <span
                  className="px-3 py-1 bg-green-100 text-green-700
                                 rounded-full text-xs font-semibold"
                >
                  Cuenta activa
                </span>
              </div>
            </div>
          </div>

          {/* ── Datos personales ─────────────────────────── */}
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
                label="Estado de cuenta"
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
                <FormField label="Contraseña actual *">
                  <input
                    type="password"
                    value={formPwd.actual}
                    onChange={(e) =>
                      setFormPwd((f) => ({ ...f, actual: e.target.value }))
                    }
                    placeholder="••••••••"
                    className={inputCls}
                  />
                </FormField>
                <FormField label="Nueva contraseña *">
                  <input
                    type="password"
                    value={formPwd.nueva}
                    onChange={(e) =>
                      setFormPwd((f) => ({ ...f, nueva: e.target.value }))
                    }
                    placeholder="Mínimo 8 caracteres"
                    className={inputCls}
                  />
                </FormField>
                <FormField label="Confirmar contraseña *">
                  <input
                    type="password"
                    value={formPwd.confirmar}
                    onChange={(e) =>
                      setFormPwd((f) => ({ ...f, confirmar: e.target.value }))
                    }
                    placeholder="Repetir contraseña"
                    className={inputCls}
                  />
                </FormField>
              </div>
              {errorPwd && <Alerta tipo="error" msg={errorPwd} />}
              {okPwd && (
                <Alerta tipo="ok" msg="Contraseña actualizada correctamente." />
              )}
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold
                           px-5 py-2.5 rounded-xl text-sm transition active:scale-[0.98]
                           touch-manipulation"
              >
                Actualizar contraseña
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
                    {usuarios.filter((u) => u.activo).length} activos ·{" "}
                    {usuarios.length} total
                  </p>
                </div>
                <button
                  onClick={abrirNuevo}
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
                  <span className="hidden sm:inline">Nuevo usuario</span>
                  <span className="sm:hidden">Nuevo</span>
                </button>
              </div>

              {/* Tabla de usuarios */}
              <div className="overflow-x-auto rounded-xl border border-blue-50">
                <table className="w-full text-sm">
                  <thead className="bg-blue-50 border-b border-blue-100">
                    <tr>
                      {["Usuario", "Cédula", "Email", "Estado", ""].map((h) => (
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
                    {usuarios.map((u) => (
                      <tr key={u.id} className="hover:bg-blue-50/40 transition">
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
                              <p className="text-xs text-gray-400 capitalize">
                                {u.rol}
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
                              u.activo
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {u.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => abrirEditar(u)}
                              className="text-blue-600 hover:text-blue-800 text-xs
                                         font-medium hover:underline transition"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() =>
                                setModalConfirm({
                                  id: u.id,
                                  activo: u.activo,
                                  nombre: `${u.nombre} ${u.apellido}`,
                                })
                              }
                              className={`text-xs font-medium hover:underline transition
                                ${u.activo ? "text-red-500 hover:text-red-700" : "text-green-600 hover:text-green-800"}`}
                            >
                              {u.activo ? "Desactivar" : "Activar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
          titulo="Crear cuenta de personal"
          onClose={() => setModalNuevo(false)}
        >
          <form onSubmit={guardarNuevo} noValidate>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Nombre *">
                  <input
                    type="text"
                    value={formNuevo.nombre}
                    onChange={(e) =>
                      setFormNuevo((f) => ({ ...f, nombre: e.target.value }))
                    }
                    placeholder="Nombre"
                    className={inputCls}
                  />
                </FormField>
                <FormField label="Apellido *">
                  <input
                    type="text"
                    value={formNuevo.apellido}
                    onChange={(e) =>
                      setFormNuevo((f) => ({ ...f, apellido: e.target.value }))
                    }
                    placeholder="Apellido"
                    className={inputCls}
                  />
                </FormField>
              </div>
              <FormField label="Cédula *">
                <input
                  type="text"
                  value={formNuevo.cedula}
                  onChange={(e) =>
                    setFormNuevo((f) => ({ ...f, cedula: e.target.value }))
                  }
                  placeholder="V-12345678"
                  className={inputCls}
                />
              </FormField>
              <FormField label="Correo electrónico *">
                <input
                  type="email"
                  value={formNuevo.email}
                  onChange={(e) =>
                    setFormNuevo((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="usuario@asic.gob.ve"
                  className={inputCls}
                />
              </FormField>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Contraseña inicial *">
                  <input
                    type="password"
                    value={formNuevo.password}
                    onChange={(e) =>
                      setFormNuevo((f) => ({ ...f, password: e.target.value }))
                    }
                    placeholder="Mínimo 8 caracteres"
                    className={inputCls}
                  />
                </FormField>
                <FormField label="Confirmar contraseña *">
                  <input
                    type="password"
                    value={formNuevo.confirmar}
                    onChange={(e) =>
                      setFormNuevo((f) => ({ ...f, confirmar: e.target.value }))
                    }
                    placeholder="Repetir contraseña"
                    className={inputCls}
                  />
                </FormField>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-xs text-blue-700">
                  La cuenta se creará con rol de{" "}
                  <strong>Personal administrativo</strong>. El usuario podrá
                  cambiar su contraseña al ingresar.
                </p>
              </div>
              {errorNuevo && <Alerta tipo="error" msg={errorNuevo} />}
              {okNuevo && (
                <Alerta tipo="ok" msg="Usuario creado correctamente." />
              )}
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
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white
                           font-semibold py-2.5 rounded-xl text-sm transition
                           active:scale-[0.98]"
              >
                Crear cuenta
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
                <FormField label="Nombre *">
                  <input
                    type="text"
                    value={formEditar.nombre}
                    onChange={(e) =>
                      setFormEditar((f) => ({ ...f, nombre: e.target.value }))
                    }
                    className={inputCls}
                  />
                </FormField>
                <FormField label="Apellido *">
                  <input
                    type="text"
                    value={formEditar.apellido}
                    onChange={(e) =>
                      setFormEditar((f) => ({ ...f, apellido: e.target.value }))
                    }
                    className={inputCls}
                  />
                </FormField>
              </div>
              <FormField label="Cédula *">
                <input
                  type="text"
                  value={formEditar.cedula}
                  onChange={(e) =>
                    setFormEditar((f) => ({ ...f, cedula: e.target.value }))
                  }
                  className={inputCls}
                />
              </FormField>
              <FormField label="Correo electrónico *">
                <input
                  type="email"
                  value={formEditar.email}
                  onChange={(e) =>
                    setFormEditar((f) => ({ ...f, email: e.target.value }))
                  }
                  className={inputCls}
                />
              </FormField>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Nueva contraseña (opcional)">
                  <input
                    type="password"
                    value={formEditar.password}
                    onChange={(e) =>
                      setFormEditar((f) => ({ ...f, password: e.target.value }))
                    }
                    placeholder="Dejar en blanco para no cambiar"
                    className={inputCls}
                  />
                </FormField>
                <FormField label="Confirmar contraseña">
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
                    className={inputCls}
                  />
                </FormField>
              </div>
              {errorEditar && <Alerta tipo="error" msg={errorEditar} />}
              {okEditar && (
                <Alerta tipo="ok" msg="Usuario actualizado correctamente." />
              )}
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
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white
                           font-semibold py-2.5 rounded-xl text-sm transition
                           active:scale-[0.98]"
              >
                Guardar cambios
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ══ MODAL: Confirmar activar/desactivar ══════════ */}
      {modalConfirm && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center
                        z-50 p-4"
        >
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
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">
              ¿{modalConfirm.activo ? "Desactivar" : "Activar"} usuario?
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              <span className="font-medium">{modalConfirm.nombre}</span>
              {modalConfirm.activo
                ? " perderá acceso al sistema."
                : " recuperará acceso al sistema."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setModalConfirm(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm
                           text-gray-600 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={() =>
                  cambiarEstado(modalConfirm.id, !modalConfirm.activo)
                }
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold
                           text-white transition active:scale-[0.98]
                           ${
                             modalConfirm.activo
                               ? "bg-red-500 hover:bg-red-600"
                               : "bg-green-500 hover:bg-green-600"
                           }`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componentes reutilizables ───────────────────────────────
function Modal({ titulo, onClose, children }) {
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center
                    z-50 p-4"
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

function Alerta({ tipo, msg }) {
  return (
    <div
      className={`px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2
      ${
        tipo === "ok"
          ? "bg-green-50 border border-green-200 text-green-700"
          : "bg-red-50 border border-red-200 text-red-600"
      }`}
    >
      {tipo === "ok" ? (
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
      ) : (
        <svg
          className="w-4 h-4 flex-shrink-0"
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
      )}
      {msg}
    </div>
  );
}

const inputCls = `w-full px-3 py-2.5 border border-blue-200 rounded-xl text-sm
  focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent
  transition text-gray-700 bg-white`;

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
