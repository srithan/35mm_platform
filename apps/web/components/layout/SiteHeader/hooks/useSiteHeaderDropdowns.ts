import { useEffect, useRef, useState } from "react";

export function useSiteHeaderDropdowns() {
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const notifWrapRef = useRef<HTMLDivElement>(null);
  const profileWrapRef = useRef<HTMLDivElement>(null);

  useEffect(
    function () {
      if (!notifOpen && !profileMenuOpen) return;
      function onDocMouseDown(ev: MouseEvent) {
        const t = ev.target as Node;
        if (notifOpen && notifWrapRef.current && !notifWrapRef.current.contains(t)) {
          setNotifOpen(false);
        }
        if (profileMenuOpen && profileWrapRef.current && !profileWrapRef.current.contains(t)) {
          setProfileMenuOpen(false);
        }
      }
      document.addEventListener("mousedown", onDocMouseDown);
      return function () {
        document.removeEventListener("mousedown", onDocMouseDown);
      };
    },
    [notifOpen, profileMenuOpen]
  );

  useEffect(
    function () {
      if (!notifOpen && !profileMenuOpen) return;
      function onKeyDown(ev: KeyboardEvent) {
        if (ev.key !== "Escape") return;
        setNotifOpen(false);
        setProfileMenuOpen(false);
      }
      document.addEventListener("keydown", onKeyDown);
      return function () {
        document.removeEventListener("keydown", onKeyDown);
      };
    },
    [notifOpen, profileMenuOpen]
  );

  useEffect(
    function () {
      if (!notifOpen && !profileMenuOpen) return;

      function isInsideOpenPanel(target: EventTarget | null) {
        if (!(target instanceof Node)) return false;
        if (notifOpen && notifWrapRef.current && notifWrapRef.current.contains(target)) {
          return true;
        }
        if (profileMenuOpen && profileWrapRef.current && profileWrapRef.current.contains(target)) {
          return true;
        }
        return false;
      }

      function preventBackgroundScroll(ev: Event) {
        if (isInsideOpenPanel(ev.target)) return;
        ev.preventDefault();
      }

      document.addEventListener("wheel", preventBackgroundScroll, { passive: false });
      document.addEventListener("touchmove", preventBackgroundScroll, { passive: false });

      return function () {
        document.removeEventListener("wheel", preventBackgroundScroll);
        document.removeEventListener("touchmove", preventBackgroundScroll);
      };
    },
    [notifOpen, profileMenuOpen]
  );

  function toggleNotif() {
    setNotifOpen(function (v) {
      return !v;
    });
    setProfileMenuOpen(false);
  }

  function toggleProfileMenu() {
    setProfileMenuOpen(function (v) {
      return !v;
    });
    setNotifOpen(false);
  }

  function closeNotif() {
    setNotifOpen(false);
  }

  function closeProfileMenu() {
    setProfileMenuOpen(false);
  }

  return {
    notifOpen,
    profileMenuOpen,
    setNotifOpen,
    setProfileMenuOpen,
    notifWrapRef,
    profileWrapRef,
    toggleNotif,
    toggleProfileMenu,
    closeNotif,
    closeProfileMenu,
  };
}
