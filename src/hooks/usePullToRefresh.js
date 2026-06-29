import { useEffect } from 'react';

export function usePullToRefresh(onRefresh) {
  useEffect(() => {
    let startY = 0;
    let isPulling = false;

    const handleTouchStart = (e) => {
      // Check if we are at the top of the container or window
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      if (scrollTop <= 0) {
        startY = e.touches[0].clientY;
        isPulling = true;
      }
    };

    const handleTouchMove = (e) => {
      if (!isPulling) return;
      const currentY = e.touches[0].clientY;
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      
      if (currentY - startY > 80 && scrollTop <= 0) {
        onRefresh();
        isPulling = false;
      }
    };

    const handleTouchEnd = () => {
      isPulling = false;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh]);
}