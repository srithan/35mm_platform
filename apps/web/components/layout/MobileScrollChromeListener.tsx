"use client";

import { useEffect } from "react";
import { bindMobileBottomChromeScroll } from "@/stores/useMobileBottomChromeStore";

export function MobileScrollChromeListener() {
  useEffect(function () {
    return bindMobileBottomChromeScroll();
  }, []);

  return null;
}
