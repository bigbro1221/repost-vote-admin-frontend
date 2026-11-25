'use client';

import { useEffect } from 'react';
import { attachAuthInterceptors } from '@/shared/api/axios';
import { useAuthStore } from '@/shared/store/auth.store';
import { useEditionStore } from '@/shared/store/edition.store';
import { fetchCurrentEdition, fetchEditions } from '@/shared/api/editions.api';

export default function InitApi() {
  useEffect(() => {
    attachAuthInterceptors(useAuthStore);
  }, []);

  // load editions once, choose default year (cookie > /edition/current)
  useEffect(() => {
    (async () => {
      try {
        const editions = await fetchEditions();
        const { year, setEditions, setYear } = useEditionStore.getState();
        setEditions(editions);
        if (!year || !editions.some(e => e.year === year)) {
          const current = await fetchCurrentEdition();
          setYear(current?.year ?? editions[editions.length - 1]?.year);
        }
      } catch (e) {
        console.error('edition init failed', e);
      }
    })();
  }, []);

  return null;
}
