'use client';

import { useEffect } from 'react';

export function useRecordAnchor(pathname: string, authenticated: boolean) {
  useEffect(() => {
    if (!authenticated) return;
    const start = () => {
      const id = window.location.hash.slice(1);
      if (!['scope', 'delivery', 'request', 'comments'].includes(id)) return () => {};
      const observer = new MutationObserver(focusRecord);
      const timeout = window.setTimeout(() => observer.disconnect(), 10000);
      function focusRecord() {
        const target = document.getElementById(id);
        if (!target || target.getAttribute('aria-busy') === 'true') return;
        observer.disconnect();
        window.clearTimeout(timeout);
        target.tabIndex = -1;
        target.scrollIntoView({ block: 'start' });
        target.focus({ preventScroll: true });
      }
      // A notification anchor can precede the asynchronously loaded record.
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['aria-busy'],
      });
      focusRecord();
      return () => {
        observer.disconnect();
        window.clearTimeout(timeout);
      };
    };
    let stop = start();
    const change = () => {
      stop();
      stop = start();
    };
    window.addEventListener('hashchange', change);
    return () => {
      stop();
      window.removeEventListener('hashchange', change);
    };
  }, [pathname, authenticated]);
}
