"use client";

import { usePathname } from "next/navigation";
import { isPersonRolePath } from "@/lib/routing/personRoles";
import { ProfileShellClient } from "./ProfileShellClient";

export function ProfileUsernameLayout(props: {
  username: string;
  children: React.ReactNode;
}) {
  var pathname = usePathname();
  var isPostDetail = pathname != null && /\/post\//.test(pathname);

  if (isPostDetail || isPersonRolePath(pathname)) {
    return props.children;
  }

  return (
    <div className="min-h-screen w-full box-border px-0">
      <ProfileShellClient username={props.username} />
    </div>
  );
}
