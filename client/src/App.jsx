import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Navbar from './components/Navbar';

// Lazy-load pages – they may not exist yet, so we use inline fallbacks
import { lazy, Suspense } from 'react';

const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Create = lazy(() => import('./pages/Create'));
const Profile = lazy(() => import('./pages/Profile'));
const UserPage = lazy(() => import('./pages/UserProfile'));
const Settings = lazy(() => import('./pages/Settings'));
const Circles = lazy(() => import('./pages/Circle'));
const CircleDetail = lazy(() => import('./pages/CircleDetail'));
const JoinCircle = lazy(() => import('./pages/CircleJoin'));
const Admin = lazy(() => import('./pages/Admin'));
const Messages = lazy(() => import('./pages/Messages'));
const Conversation = lazy(() => import('./pages/Conversation'));

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-gray-400 text-sm">加载中...</div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/create"
          element={
            <ProtectedRoute>
              <Create />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route path="/user/:id" element={<UserPage />} />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/circles"
          element={
            <ProtectedRoute>
              <Circles />
            </ProtectedRoute>
          }
        />
        <Route
          path="/circles/:id"
          element={
            <ProtectedRoute>
              <CircleDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/circles/join/:token"
          element={
            <ProtectedRoute>
              <JoinCircle />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages/conversation/:userId"
          element={
            <ProtectedRoute>
              <Conversation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <main className="max-w-5xl mx-auto px-4 py-6 pb-20 md:pb-6">
              <AppRoutes />
            </main>
          </div>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
