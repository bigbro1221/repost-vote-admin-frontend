'use client';

import { useEffect } from 'react';
import { attachAuthInterceptors } from '@/shared/api/axios';
import { useAuthStore } from '@/shared/store/auth.store';

export default function InitApi() {
  useEffect(() => {
    attachAuthInterceptors(useAuthStore);
  }, []);

  return null;
}
