import { useEffect, useState } from 'react';

const COMPACT_WORKSPACE_QUERY = '(max-width: 767px)';

const getIsCompactWorkspace = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(COMPACT_WORKSPACE_QUERY).matches;
};

export default function useWorkspaceMode() {
  const [isCompactWorkspace, setIsCompactWorkspace] = useState(getIsCompactWorkspace);

  useEffect(() => {
    const mediaQuery = window.matchMedia(COMPACT_WORKSPACE_QUERY);
    const update = () => setIsCompactWorkspace(mediaQuery.matches);

    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return { isCompactWorkspace };
}