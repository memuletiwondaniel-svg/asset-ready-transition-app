import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Key, AlertTriangle, CalendarCheck, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePermissions } from '@/hooks/usePermissions';

const baseNavItems = [
  { icon: Home, labelKey: 'navHome', path: '/home', section: 'home' },
  { icon: Key, labelKey: 'navProjects', path: '/vcrs', section: 'projects' },
  { icon: AlertTriangle, labelKey: 'navPSSR', path: '/pssr', section: 'pssr' },
  { icon: CalendarCheck, labelKey: 'navMyTasks', path: '/my-tasks', section: 'my-tasks' },
  { icon: Settings, labelKey: 'adminTools', path: '/admin-tools', section: 'admin-tools', requiresPermission: 'access_admin' as const },
];

export const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { translations: t } = useLanguage();
  const { hasPermission } = usePermissions();

  const navItems = baseNavItems.filter(item => 
    !item.requiresPermission || hasPermission(item.requiresPermission)
  );

  const getLabel = (key: string) => (t as any)[key] || key;

  const isActive = (item: typeof baseNavItems[0]) => {
    const path = location.pathname;
    if (item.section === 'home') return path === '/' || path === '/home';
    if (item.section === 'projects') return path.startsWith('/vcrs') || path.startsWith('/projects') || path.startsWith('/project/');
    return path.startsWith(item.path);
  };

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-card/95 backdrop-blur-xl border-t border-border/40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <button
              key={item.section}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[56px] py-2 px-1 transition-colors touch-manipulation',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground active:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'text-primary')} />
              <span className={cn(
                'text-[10px] font-medium leading-tight truncate max-w-[64px]',
                active && 'font-semibold'
              )}>
                {getLabel(item.labelKey)}
              </span>
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
