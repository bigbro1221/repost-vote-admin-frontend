'use client';

import Link from "@/shared/ui/Link";
import { useAuthStore } from "@/shared/store/auth.store";
import dynamic from "next/dynamic";

const HeaderLinks = () => {
  const { signOut, isAuth } = useAuthStore();

  if (!isAuth) return null;

  return (
    <div>
      <ul className="text-white flex items-center gap-4">
        <li>
            <Link href="/">Голосование</Link>
        </li>

        <li>
            <Link href="/user">Пользователи</Link>
        </li>

        <li>
          <span
            className="cursor-pointer"
            onClick={signOut}
          >
              Выйти
          </span>
        </li>
      </ul>
    </div>
  );
};

export default dynamic(async () => HeaderLinks, {
  ssr: false
});
