import { createBrowserRouter, createRoutesFromElements, RouterProvider, Route, Navigate } from "react-router-dom"
import LandingPage from "./pages/LandingPage"
import { Login } from "./pages/Login"
import { Register } from "./pages/Register"
import { ProtectedRoute } from "./components/ProtectedRoute"
import { AuthProvider } from "./contexts/AuthContext"
import { MyRecordings } from "./pages/MyRecordings"


export const Base_Url = import.meta.env.VITE_BASE_URL || 
  (import.meta.env.PROD 
    ? 'https://your-backend-url.render.com' 
    : 'http://localhost:8000')

function App() {

  const router = createBrowserRouter(
    createRoutesFromElements(
        <Route path= "/">
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
    <>
      <AuthProvider>
          <RouterProvider router={router} />
      </AuthProvider>
    </>
    )
}

export default App

