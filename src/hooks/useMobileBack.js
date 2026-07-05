import { useEffect, useRef } from 'react';

/**
 * Intercepts Android/browser back while an overlay is open.
 * Important: when the overlay is closed programmatically, e.g. by clicking
 * a sidebar Link, do NOT call history.back(), because that undoes navigation.
 */
export function useMobileBack(isOpen, onClose) {
  const pushedRef = useRef(false);
  const closedByBackRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    pushedRef.current = true;
    closedByBackRef.current = false;

    window.history.pushState(
      { ...(window.history.state || {}), mobileOverlayOpen: true },
      '',
      window.location.href
    );

    const handlePopState = () => {
      closedByBackRef.current = true;
      pushedRef.current = false;

      if (typeof onClose === 'function') {
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);

      // If the overlay was closed by the browser back button, the dummy state
      // has already been popped. Nothing else to do.
      if (closedByBackRef.current) {
        pushedRef.current = false;
        return;
      }

      // If the overlay was closed programmatically — close button, backdrop,
      // or clicking a sidebar route Link — DO NOT call history.back().
      // Calling back here can undo the route change and send the user to Dashboard.
      if (pushedRef.current && window.history.state?.mobileOverlayOpen) {
        const nextState = { ...(window.history.state || {}) };
        delete nextState.mobileOverlayOpen;
        window.history.replaceState(nextState, '', window.location.href);
      }

      pushedRef.current = false;
    };
  }, [isOpen, onClose]);
}