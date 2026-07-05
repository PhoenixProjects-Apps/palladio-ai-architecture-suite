import { useState, useEffect, useRef } from 'react';

export function usePullToRefresh(configOrFn) {
  let onRefresh, enabled, threshold, scrollRef;
  
  if (typeof configOrFn === 'function') {
    onRefresh = configOrFn;
    enabled = true;
    threshold = 72;
  } else if (configOrFn) {
    onRefresh = configOrFn.onRefresh;
    enabled = configOrFn.enabled !== false;
    threshold = configOrFn.threshold || 72;
    scrollRef = configOrFn.scrollRef;
  } else {
    enabled = false;
  }

  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(null);
  const pullingRef = useRef(false);

  useEffect(() => {
    if (!enabled || typeof onRefresh !== 'function') return;

    const getScrollEl = () => {
      if (scrollRef?.current) return scrollRef.current;
      const mainEl = document.querySelector('main.flex-1.overflow-y-auto');
      if (mainEl) return mainEl;
      return document.scrollingElement || document.documentElement;
    };

    const isInteractiveTarget = (target) => {
      return target?.closest?.('input, textarea, select, button, [role="button"], [data-no-pull-refresh="true"], canvas, [role="dialog"], [role="menu"]');
    };

    const onTouchStart = (e) => {
      if (isRefreshing || isInteractiveTarget(e.target)) return;
      const scrollEl = getScrollEl();
      if ((scrollEl.scrollTop || window.scrollY || 0) > 0) return;
      startYRef.current = e.touches[0].clientY;
      pullingRef.current = true;
    };

    const onTouchMove = (e) => {
      if (!pullingRef.current || startYRef.current == null) return;
      const currentY = e.touches[0].clientY;
      const delta = currentY - startYRef.current;
      if (delta <= 0) return;

      // reduce movement so it feels native, not rubbery
      const damped = Math.min(delta * 0.45, threshold * 1.5);
      setPullDistance(damped);

      // prevent browser overscroll only once clearly pulling down
      if (delta > 10 && e.cancelable) {
        e.preventDefault();
      }
    };

    const onTouchEnd = async () => {
      if (!pullingRef.current) return;
      const shouldRefresh = pullDistance >= threshold;
      pullingRef.current = false;
      startYRef.current = null;

      if (!shouldRefresh) {
        setPullDistance(0);
        return;
      }

      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [enabled, onRefresh, threshold, pullDistance, isRefreshing, scrollRef]);

  // Inject visual indicator directly
  useEffect(() => {
    if (!enabled) return;
    
    let indicator = document.getElementById('pull-to-refresh-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'pull-to-refresh-indicator';
      indicator.style.position = 'fixed';
      // Adjust top to clear safe area inset
      indicator.style.top = 'env(safe-area-inset-top, 0px)';
      indicator.style.left = '0';
      indicator.style.width = '100%';
      indicator.style.display = 'flex';
      indicator.style.justifyContent = 'center';
      indicator.style.pointerEvents = 'none';
      indicator.style.zIndex = '9999';
      
      const spinnerContainer = document.createElement('div');
      spinnerContainer.id = 'ptr-spinner-container';
      spinnerContainer.style.background = 'hsl(var(--background))';
      spinnerContainer.style.border = '1px solid hsl(var(--border))';
      spinnerContainer.style.borderRadius = '50%';
      spinnerContainer.style.width = '40px';
      spinnerContainer.style.height = '40px';
      spinnerContainer.style.display = 'flex';
      spinnerContainer.style.alignItems = 'center';
      spinnerContainer.style.justifyContent = 'center';
      spinnerContainer.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
      spinnerContainer.style.transform = 'translateY(-60px)';
      spinnerContainer.style.transition = 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      
      spinnerContainer.innerHTML = `
        <svg id="ptr-spinner-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: hsl(var(--foreground)); transition: transform 0.1s; opacity: 0.5;">
          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path>
          <path d="M21 3v5h-5"></path>
        </svg>
      `;
      
      indicator.appendChild(spinnerContainer);
      document.body.appendChild(indicator);
    }
    
    const spinnerContainer = document.getElementById('ptr-spinner-container');
    const spinnerIcon = document.getElementById('ptr-spinner-icon');
    
    if (isRefreshing) {
      spinnerContainer.style.transform = 'translateY(24px)';
      spinnerIcon.style.opacity = '1';
      spinnerIcon.style.animation = 'ptr-spin 1s linear infinite';
    } else if (pullDistance > 0) {
      const y = Math.max(-60, -60 + pullDistance);
      spinnerContainer.style.transform = `translateY(${y}px)`;
      spinnerIcon.style.transform = `rotate(${pullDistance * 2}deg)`;
      spinnerIcon.style.animation = 'none';
      spinnerIcon.style.opacity = Math.min(1, 0.3 + (pullDistance / threshold) * 0.7).toString();
      
      if (pullDistance >= threshold) {
        spinnerIcon.style.color = 'hsl(var(--primary))';
      } else {
        spinnerIcon.style.color = 'hsl(var(--foreground))';
      }
    } else {
      spinnerContainer.style.transform = 'translateY(-60px)';
      spinnerIcon.style.animation = 'none';
    }
    
    if (!document.getElementById('ptr-keyframes')) {
      const style = document.createElement('style');
      style.id = 'ptr-keyframes';
      style.textContent = `
        @keyframes ptr-spin {
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
  }, [pullDistance, isRefreshing, threshold, enabled]);

  return { pullDistance, isRefreshing };
}