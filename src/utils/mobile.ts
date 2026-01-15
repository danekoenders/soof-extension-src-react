export const isMobileViewport = () => {
  const hasMatchMedia = typeof window !== "undefined" && typeof window.matchMedia === "function";
  const isNarrow = hasMatchMedia
    ? window.matchMedia("(max-width: 768px)").matches
    : window.innerWidth <= 768;
  const isCoarse = hasMatchMedia
    ? window.matchMedia("(pointer: coarse)").matches
    : false;

  return isNarrow || isCoarse;
};
