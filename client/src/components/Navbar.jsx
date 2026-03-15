import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const IconHome = ({ active }) => (
  <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" />
  </svg>
);
const IconCreate = ({ active }) => (
  <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);
const IconCircle = ({ active }) => (
  <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const IconProfile = ({ active }) => (
  <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const IconAdmin = ({ active }) => (
  <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const tabs = [
    { to: '/', label: '广场', icon: IconHome, match: (p) => p === '/' },
    { to: '/create', label: '创作', icon: IconCreate, match: (p) => p === '/create' },
    { to: '/circles', label: '私密圈', icon: IconCircle, match: (p) => p.startsWith('/circles') },
    { to: '/profile', label: '我的', icon: IconProfile, match: (p) => p === '/profile' || p === '/settings' },
  ];

  if (user?.role === 'admin') {
    tabs.push({ to: '/admin', label: '管理', icon: IconAdmin, match: (p) => p === '/admin' });
  }

  return (
    <>
      {/* Top bar */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-12">
          <Link to="/" className="text-lg font-bold text-indigo-600">
            个人空间
          </Link>

          {/* Desktop: flat links */}
          <div className="hidden md:flex items-center space-x-5">
            {tabs.map((tab) => {
              const active = tab.match(path);
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={`text-sm font-medium transition-colors ${active ? 'text-indigo-600' : 'text-gray-600 hover:text-indigo-600'}`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          {/* User area */}
          <div className="flex items-center space-x-3">
            {user ? (
              <>
                <Link to="/profile" className="text-sm text-gray-700 hover:text-indigo-600 font-medium hidden sm:block">
                  {user.nickname || user.username}
                </Link>
                <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-red-500">
                  退出
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm text-gray-600 hover:text-indigo-600">登录</Link>
                <Link to="/register" className="text-sm bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700">注册</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile: bottom tab bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
        <div className="flex justify-around items-center h-14">
          {tabs.map((tab) => {
            const active = tab.match(path);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${active ? 'text-indigo-600' : 'text-gray-400'}`}
              >
                <Icon active={active} />
                <span className="text-[10px] mt-0.5">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
