import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ThemeToggle({ collapsed = false }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <Button
      type="button"
      variant="outline"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`w-full min-h-11 rounded-xl border-border bg-muted/40 hover:bg-muted text-foreground ${collapsed ? 'px-0 justify-center' : 'justify-start px-3'}`}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
      {!collapsed && <span className="text-sm font-medium">{isDark ? 'Light mode' : 'Dark mode'}</span>}
    </Button>
  );
}