import { useState } from "react";
import { useNavigate } from "react-router-dom";

// ── Reemplaza estas rutas con tus imágenes reales ───────────
// Coloca tus logos en: src/assets/logo-ministerio.png
//                      src/assets/logo-asic.png
// Y cambia las líneas de abajo:
import logoMinisterio from "/logo-s.png";
import logoAsic from "/logo-t.png";
// import logoAsic       from "../assets/logo-asic.png";
// Luego reemplaza logoPlaceholder1 y logoPlaceholder2 por esas variables.
// ────────────────────────────────────────────────────────────

export default function Login() {
  const API = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPwd, setMostrarPwd] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    // limpiar error previo
    setError("");

    // evitar múltiples submits
    if (cargando) return;

    // ─────────────────────────────
    // VALIDACIONES FRONTEND
    // ─────────────────────────────

    const emailLimpio = email.trim().toLowerCase();
    const passwordLimpia = password.trim();

    // campos vacíos
    if (!emailLimpio || !passwordLimpia) {
      setError("Debe completar todos los campos.");
      return;
    }

    // validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(emailLimpio)) {
      setError("Ingrese un correo electrónico válido.");
      return;
    }

    // longitud mínima password
    if (passwordLimpia.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setCargando(true);

    try {
      const response = await fetch(`${API}/api/auth/login`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          email: emailLimpio,
          password: passwordLimpia,
        }),
      });

      // ─────────────────────────────
      // VALIDAR RESPUESTA JSON
      // ─────────────────────────────
      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error("Respuesta inválida del servidor.");
      }

      // ─────────────────────────────
      // MANEJO DE ERRORES HTTP
      // ─────────────────────────────

      // credenciales incorrectas
      if (response.status === 401) {
        setError("Correo o contraseña incorrectos.");
        return;
      }

      // demasiados intentos
      if (response.status === 429) {
        setError("Demasiados intentos. Intente nuevamente más tarde.");
        return;
      }

      // error servidor
      if (response.status >= 500) {
        setError("Error interno del servidor.");
        return;
      }

      // otras respuestas
      if (!response.ok) {
        setError(data?.mensaje || "No se pudo iniciar sesión.");
        return;
      }

      // ─────────────────────────────
      // VALIDAR TOKEN
      // ─────────────────────────────

      if (!data.token) {
        setError("El servidor no devolvió un token válido.");
        return;
      }

      // validar usuario
      if (!data.user) {
        setError("No se recibió información del usuario.");
        return;
      }

      // ─────────────────────────────
      // GUARDAR SESIÓN
      // ─────────────────────────────

      localStorage.setItem("token", data.token);

      localStorage.setItem("usuario", JSON.stringify(data.user));

      // timestamp login
      localStorage.setItem("loginTime", Date.now().toString());

      // ─────────────────────────────
      // REDIRECCIÓN
      // ─────────────────────────────

      navigate("/dashboard", {
        replace: true,
      });
    } catch (error) {
      console.error(error);

      // backend caído
      if (error.message.includes("Failed to fetch")) {
        setError("No se pudo conectar con el servidor.");
      } else {
        setError(error.message || "Ocurrió un error inesperado.");
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-6
                    relative overflow-hidden
                    bg-gradient-to-br from-blue-900 via-blue-600 to-blue-800"
    >
      {/* ── Logos institucionales — esquina superior derecha ── */}
      <div
        className="absolute top-4 right-4 sm:top-5 sm:right-5
                      flex items-center gap-3 z-20"
      >
        {/* Logo 1: Ministerio */}
        <div className="flex flex-col items-center gap-1">
          <div
            className="w-48 h-14 sm:w-64 sm:h-32 bg-white/80 backdrop-blur-sm
                          border-2 border-white/40 rounded-xl overflow-hidden
                          flex items-center justify-center
                          hover:bg-white/30 transition group"
          >
            <img
              src={logoMinisterio}
              alt="Ministerio de Salud"
              className="w-full h-full object-contain p-1"
            />
          </div>
        </div>

        {/* Divisor */}
        <div className="w-px h-12 sm:h-14 bg-white/25" />

        {/* Logo 2: ASIC */}
        <div className="flex flex-col items-center gap-1">
          <div
            className="w-14 h-14 sm:w-36 sm:h-32 bg-white/80 backdrop-blur-sm
                          border-2 border-white/40 rounded-xl overflow-hidden
                          flex items-center justify-center
                          hover:bg-white/30 transition group"
          >
            <img
              src={logoAsic}
              alt="ASIC Dr. Tulio Pineda"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      </div>

      {/* Formas geométricas de fondo */}
      <div
        className="absolute w-48 h-48 sm:w-72 sm:h-72 bg-white
                      rounded-full opacity-10 -top-16 -left-16"
      />
      <div
        className="absolute w-36 h-36 sm:w-56 sm:h-56 bg-blue-300
                      rounded-full opacity-10 -bottom-12 -right-12"
      />
      <div
        className="absolute w-20 h-20 sm:w-28 sm:h-28 bg-white opacity-5
                      top-1/3 left-3/4 rotate-45 rounded-2xl hidden sm:block"
      />
      <div
        className="absolute w-14 h-14 bg-blue-300 opacity-10
                      top-1/4 left-10 rotate-12 rounded-xl hidden md:block"
      />
      {/* Cruz médica decorativa */}
      <div className="absolute bottom-10 left-10 opacity-10 hidden lg:block">
        <svg width="80" height="80" fill="white" viewBox="0 0 24 24">
          <path
            d="M19 11h-6V5a1 1 0 00-2 0v6H5a1 1 0 000 2h6v6a1 1
                   0 002 0v-6h6a1 1 0 000-2z"
          />
        </svg>
      </div>

      {/* ── Tarjeta central ─────────────────────────────── */}
      <div className="relative z-10 w-full max-w-sm sm:max-w-md mt-16 sm:mt-14">
        {/* Logo sistema */}
        <div className="text-center mb-6 sm:mb-8">
          <div
            className="inline-flex items-center justify-center
                          w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-2xl
                          mb-3 sm:mb-4 shadow-lg"
          >
            <svg
              className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600"
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
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Sistema de Vacunación
          </h1>
          <p className="text-blue-200 text-xs sm:text-sm mt-1 px-4">
            ASIC Dr. Tulio Pineda · Municipio Juan Germán Roscio
          </p>
        </div>

        {/* Formulario */}
        <div
          className="bg-white/15 backdrop-blur-md border border-white/25
                        rounded-2xl p-6 sm:p-8 shadow-2xl"
        >
          <h2 className="text-white text-base sm:text-lg font-semibold mb-5 sm:mb-6">
            Iniciar sesión
          </h2>

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="mb-4">
              <label
                htmlFor="email"
                className="block text-blue-100 text-xs sm:text-sm font-medium mb-1.5"
              >
                Correo electrónico
              </label>
              <div className="relative">
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
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2
                         0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  autoComplete="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@asic.gob.ve"
                  className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white/15
                             border border-white/25 rounded-lg text-white
                             placeholder-blue-200/50 text-sm focus:outline-none
                             focus:ring-2 focus:ring-white/50
                             focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="mb-5 sm:mb-6">
              <label
                htmlFor="password"
                className="block text-blue-100 text-xs sm:text-sm font-medium mb-1.5"
              >
                Contraseña
              </label>
              <div className="relative">
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
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2
                         0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </span>
                <input
                  id="password"
                  type={mostrarPwd ? "text" : "password"}
                  value={password}
                  autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-2.5 sm:py-3 bg-white/15
                             border border-white/25 rounded-lg text-white
                             placeholder-blue-200/50 text-sm focus:outline-none
                             focus:ring-2 focus:ring-white/50
                             focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                             text-blue-200 hover:text-white transition p-1
                             touch-manipulation"
                >
                  {mostrarPwd ? <IcoOjoOculto /> : <IcoOjoVisible />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="mb-4 px-4 py-3 rounded-lg bg-black/20
                              border border-white/20 text-blue-100 text-sm"
              >
                {error}
              </div>
            )}

            {/* Botón */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-white hover:bg-blue-50 active:bg-blue-100
                         disabled:opacity-50 disabled:cursor-not-allowed
                         text-blue-600 font-bold py-3 rounded-lg text-sm
                         transition-all duration-150 active:scale-[0.98]
                         flex items-center justify-center gap-2
                         shadow-lg touch-manipulation"
            >
              {cargando ? (
                <>
                  <span
                    className="w-4 h-4 border-2 border-blue-200
                                   border-t-blue-600 rounded-full animate-spin"
                  />
                  Verificando...
                </>
              ) : (
                <>
                  Iniciar sesión
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
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-blue-300/60 text-xs mt-4 sm:mt-6">
          © 2025 Sistema de Vacunación · ASIC Dr. Tulio Pineda
        </p>
      </div>
    </div>
  );
}

function IcoOjoVisible() {
  return (
    <svg
      className="w-4 h-4 sm:w-5 sm:h-5"
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
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7
           -1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}
function IcoOjoOculto() {
  return (
    <svg
      className="w-4 h-4 sm:w-5 sm:h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7
           a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878
           9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29
           M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943
           9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
      />
    </svg>
  );
}
