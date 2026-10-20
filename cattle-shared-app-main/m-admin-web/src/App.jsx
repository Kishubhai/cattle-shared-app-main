import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Verification from './pages/Verification';
import IdentificationRequests from './pages/IdentificationRequests';
import IdentificationVerification from './pages/IdentificationVerification';
import VerificationHistory from './pages/VerificationHistory';
import IdentificationHistory from './pages/IdentificationHistory';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Private Routes */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/verify/:cattleId"
            element={
              <PrivateRoute>
                <Verification />
              </PrivateRoute>
            }
          />
          <Route
            path="/identification-requests"
            element={
              <PrivateRoute>
                <IdentificationRequests />
              </PrivateRoute>
            }
          />
          <Route
            path="/identification/:requestId"
            element={
              <PrivateRoute>
                <IdentificationVerification />
              </PrivateRoute>
            }
          />
          <Route
            path="/verification-history"
            element={
              <PrivateRoute>
                <VerificationHistory />
              </PrivateRoute>
            }
          />
          <Route
            path="/identification-history"
            element={
              <PrivateRoute>
                <IdentificationHistory />
              </PrivateRoute>
            }
          />

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
