import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Login      from "./pages/Login"
import Dashboard  from "./pages/Dashboard"
import Vacunas    from "./pages/Vacunas"
import Inventario from "./pages/Inventario"
import Reportes   from "./pages/Reportes"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"           element={<Navigate to="/login" replace />} />
        <Route path="/login"      element={<Login />} />
        <Route path="/dashboard"  element={<Dashboard />} />
        <Route path="/vacunas"    element={<Vacunas />} />
        <Route path="/inventario" element={<Inventario />} />
        <Route path="/reportes"   element={<Reportes />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App