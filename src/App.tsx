import { createBrowserRouter, createRoutesFromElements, RouterProvider, Route, Navigate, Outlet } from "react-router-dom"
import LandingPage from "./pages/LandingPage"
import { Login } from "./pages/Login"
import { Register } from "./pages/Register"
import { ProtectedRoute } from "./components/ProtectedRoute"
import { AuthProvider } from "./contexts/AuthContext"
import { RecordingProvider } from "./contexts/RecordingContext"
import { ThemeProvider } from "./contexts/ThemeContext"
import { MyRecordings } from "./pages/MyRecordings"
import { FloatingBar } from "./components/Floatingbar"
import { RecordingPreviewModal } from "./components/RecordingPreviewModal"

export const Base_Url = import.meta.env.VITE_BASE_URL || 
  (import.meta.env.PROD 
    ? 'https://your-backend-url.render.com' 
    : 'http://localhost:8000')

// Layout component that provides recording context within router context
function Layout() {
  return (
    <RecordingProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#090a10] dark:text-slate-100 transition-colors duration-200">
        <Outlet />
        <FloatingBar />
        <RecordingPreviewModal />
      </div>
    </RecordingProvider>
  )
}

function App() {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route path="/" element={<Layout />}>
        <Route index element={<LandingPage />} />
        <Route path="/record" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/recordings" 
          element={
            <ProtectedRoute>
              <MyRecordings />
            </ProtectedRoute>
          } />  
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    )
  )

  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
