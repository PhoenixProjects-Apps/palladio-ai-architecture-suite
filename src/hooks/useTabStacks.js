import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';

function getBaseTab(pathname) {
  if (pathname.startsWith('/SavedChats')) return '/SavedChats';
  if (pathname.startsWith('/Projects')) return '/Projects';
  if (pathname.startsWith('/UserProfile')) return '/UserProfile';
  return '/';
}

export function useTabStacks() {
  const location = useLocation();
  const navigate = useNavigate();
  const navType = useNavigationType();

  const [tabStacks, setTabStacks] = useState(() => {
    const saved = sessionStorage.getItem('mobile-tab-stacks');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      '/': ['/'],
      '/SavedChats': ['/SavedChats'],
      '/Projects': ['/Projects'],
      '/UserProfile': ['/UserProfile']
    };
  });

  const lastPathRef = useRef(location.pathname + location.search);
  const isHandlingPop = useRef(false);

  useEffect(() => {
    sessionStorage.setItem('mobile-tab-stacks', JSON.stringify(tabStacks));
  }, [tabStacks]);

  useEffect(() => {
    if (isHandlingPop.current) {
      isHandlingPop.current = false;
      lastPathRef.current = location.pathname + location.search;
      return;
    }

    const currentPath = location.pathname + location.search;
    const currentTab = getBaseTab(location.pathname);
    
    const previousPath = lastPathRef.current;
    const previousTab = getBaseTab(previousPath.split('?')[0]);

    setTabStacks(prev => {
      const newStacks = { ...prev };
      
      if (navType === 'POP') {
        let prevStack = [...(newStacks[previousTab] || [previousTab])];
        let targetRoute = null;
        
        // Determine what the back button SHOULD have done based on the previous state
        if (prevStack.length > 1) {
          // Pop within the previous tab
          prevStack.pop();
          targetRoute = prevStack[prevStack.length - 1];
          newStacks[previousTab] = prevStack;
        } else {
          // Previous tab stack length was 1
          if (previousTab !== '/') {
            // Should go to home
            targetRoute = '/';
            // Also reset previous tab stack
            newStacks[previousTab] = [previousTab];
          } else {
            // Normal exit/back behaviour, do nothing to override
            return newStacks; 
          }
        }

        // If the browser didn't naturally go to targetRoute, force it
        if (targetRoute && targetRoute !== currentPath) {
          isHandlingPop.current = true;
          setTimeout(() => navigate(targetRoute, { replace: true }), 0);
          return newStacks;
        }

      } else if (navType === 'PUSH') {
        const currentStack = [...(newStacks[currentTab] || [currentTab])];
        if (currentStack[currentStack.length - 1] !== currentPath) {
          currentStack.push(currentPath);
        }
        newStacks[currentTab] = currentStack;
      } else if (navType === 'REPLACE') {
        const currentStack = [...(newStacks[currentTab] || [currentTab])];
        currentStack[currentStack.length - 1] = currentPath;
        newStacks[currentTab] = currentStack;
      }
      
      return newStacks;
    });

    lastPathRef.current = currentPath;
  }, [location.pathname, location.search, navType, navigate]);

  return tabStacks;
}