import { Link, useLocation } from 'wouter';
import { Moon, Sun, Folder, GitBranch, History } from 'lucide-react';
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
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-semibold text-foreground">
                Панель ревью проектов
              </h1>
              
              <nav className="flex space-x-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = location === tab.path;
                  
                  return (
                    <Link key={tab.id} href={tab.path}>
                      <button
                        data-testid={`tab-${tab.id}`}
                        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center space-x-2 ${
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                      </button>
                    </Link>
                  );
                })}
              </nav>
            </div>
            
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
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
