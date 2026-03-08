import { useLocation, useNavigate } from 'react-router-dom';

const tabs = [
  { path: '/', label: 'Rules' },
  { path: '/collections', label: 'Collections' },
  { path: '/log', label: 'Log' },
  { path: '/recording', label: 'Record' },
];

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/' || location.pathname.startsWith('/rules');
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="flex border-b border-border px-md">
      {tabs.map((tab) => (
        <button
          key={tab.path}
          onClick={() => navigate(tab.path)}
          className={`px-md py-sm text-base font-medium border-b-2 transition-colors ${
            isActive(tab.path)
              ? 'border-primary text-primary'
              : 'border-transparent text-content-secondary hover:text-content-primary'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
