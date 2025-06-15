import { useMemo } from "react";

export function useHost() {
  return useMemo(() => window.location.origin, []);
} 