import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

// Placeholder pages — will be migrated from existing Lumora
function LandingPage() {
  return <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <h1 className="text-4xl font-display font-bold text-gray-900">Lumora</h1>
  </div>;
}

function InterviewApp() {
  return <div className="min-h-screen flex items-center justify-center bg-white">
    <h1 className="text-2xl font-display font-bold text-emerald-600">Interview App — Coming Soon</h1>
  </div>;
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<InterviewApp />} />
        <Route path="/app/coding" element={<InterviewApp />} />
        <Route path="/app/design" element={<InterviewApp />} />
        <Route path="/pricing" element={<LandingPage />} />
      </Routes>
    </AuthProvider>
  );
}
