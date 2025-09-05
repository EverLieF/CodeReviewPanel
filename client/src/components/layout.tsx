import { Link, useLocation } from 'wouter';
import { Moon, Sun, Folder, GitBranch, History, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useTheme } from './theme-provider';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();

  const tabs = [
    { id: 'project', path: '/', label: 'Проект', icon: Folder },
    { id: 'review', path: '/review', label: 'Ревью', icon: GitBranch },
    { id: 'history', path: '/history', label: 'История', icon: History }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-8">
              {/* User Profile */}
              <div className="flex items-center space-x-3">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                    ВБ
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Валерий Боровиков
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Студент • Работа принята. Таймер SLA: осталось 0ч 0м
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <nav className="flex space-x-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = location === tab.path;
                  
                  return (
                    <Link key={tab.id} href={tab.path}>
                      <button
                        data-testid={`tab-${tab.id}`}
                        className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                          isActive
                            ? 'border-primary text-foreground'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                        }`}
                      >
                        {tab.label}
                      </button>
                    </Link>
                  );
                })}
              </nav>
              
              <button
                data-testid="theme-toggle"
                onClick={toggleTheme}
                className="p-2 rounded-md hover:bg-accent transition-colors"
              >
                {theme === 'light' ? (
                  <Moon className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Sun className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
