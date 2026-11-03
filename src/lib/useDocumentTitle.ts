import { useEffect } from 'react';

/**
 * Sets the browser tab title: "Jobs · Wera". A page whose title already
 * names Wera passes brand=false, so the name appears once.
 */
export function useDocumentTitle(title: string, brand = true) {
  useEffect(() => {
    document.title = brand ? `${title} · Wera` : title;
  }, [title, brand]);
}
