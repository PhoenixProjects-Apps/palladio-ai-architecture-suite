import { useEffect, useRef } from 'react';

/**
 * A lightweight hook to intercept the Android/browser back button
 * and close active overlays (like sidebars or modals) instead of navigating back.
 */
export function useMobileBack(isOpen, onClose) {
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    // Push a dummy state into the history stack when the overlay opens
    window.history.pushState({ mobileOverlayOpen: true }, '');
    pushedRef.current = true;

    const handlePopState = (e) => {
      // The back button was pressed, popping our dummy state
      pushedRef.current = false;
      if (typeof onClose === 'function') {
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // If the overlay was closed programmatically (e.g. clicking a close button or backdrop),
      // we need to remove the dummy state we pushed so we don't trap the user.
      if (pushedRef.current) {
        pushedRef.current = false;
        if (window.history.state?.mobileOverlayOpen) {
          window.history.back();
        }
      }
    };
  }, [isOpen, onClose]);
}