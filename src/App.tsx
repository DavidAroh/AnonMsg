import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Landing from './pages/Landing';
import ProfileSetup from './pages/ProfileSetup';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import PublicProfile from './pages/PublicProfile';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/setup" element={<ProfileSetup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/:handle" element={<PublicProfile />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
