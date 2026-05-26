"use client";

import { useEffect, useState } from "react";

type NetworkInfo = {
  saveData?: boolean;
  effectiveType?: string;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
};

function readConnectionState() {
  if (typeof navigator === "undefined") {
    return {
      saveData: false,
      effectiveType: "unknown",
      slow: false,
    };
  }

  var connection = (navigator as Navigator & { connection?: NetworkInfo }).connection;
  var effectiveType = connection?.effectiveType || "unknown";
  var saveData = connection?.saveData === true;
  var slow =
    effectiveType === "slow-2g" ||
    effectiveType === "2g" ||
    effectiveType === "3g";

  return {
    saveData,
    effectiveType,
    slow,
  };
}

export function useConnectionPreferences() {
  const [state, setState] = useState(readConnectionState);

  useEffect(function () {
    if (typeof navigator === "undefined") return;
    var connection = (navigator as Navigator & { connection?: NetworkInfo }).connection;
    if (!connection) return;
    var activeConnection = connection;

    function onChange() {
      setState(readConnectionState());
    }

    activeConnection.addEventListener?.("change", onChange);
    return function () {
      activeConnection.removeEventListener?.("change", onChange);
    };
  }, []);

  return state;
}
