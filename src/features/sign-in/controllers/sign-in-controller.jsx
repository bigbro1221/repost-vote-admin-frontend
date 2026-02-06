'use client';

import { routeNames } from "@/shared/config/route-names";
import { useAuthStore } from "@/shared/store/auth.store";
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react";

export default function SignInController() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuth } = useAuthStore();

  const redirectToSignInIfIsNotAuth = () => {
    if (!isAuth) {
      router.push(routeNames.signIn);
    }
  };

  const redirectToMainIfIsAuth = () => {
    redirectToSignInIfIsNotAuth();

    if (isAuth && pathname.startsWith(routeNames.signIn)) {
      router.push(routeNames.nominations.list);
    }
  };

  useEffect(
    () => {
      redirectToMainIfIsAuth();
    },
    [ isAuth ]
  );

  useEffect(
    () => {
      redirectToSignInIfIsNotAuth();
    },
    [ pathname ]
  );
}