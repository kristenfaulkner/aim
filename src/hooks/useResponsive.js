import { useState, useEffect } from "react";
import { breakpoints } from "../theme/tokens";

export function useResponsive() {
  const [state, setState] = useState(() => {
    if (typeof window === "undefined")
      return { isMobile: false, isTablet: false, isDesktop: true };
    const w = window.innerWidth;
    return {
      isMobile: w < breakpoints.mobile,
      isTablet: w >= breakpoints.mobile && w < breakpoints.tablet,
      isDesktop: w >= breakpoints.tablet,
    };
  });

  useEffect(() => {
    const mobileQ = window.matchMedia(
      `(max-width: ${breakpoints.mobile - 1}px)`
    );
    const tabletQ = window.matchMedia(
      `(min-width: ${breakpoints.mobile}px) and (max-width: ${breakpoints.tablet - 1}px)`
    );

    const update = () => {
      setState({
        isMobile: mobileQ.matches,
        isTablet: tabletQ.matches,
        isDesktop: !mobileQ.matches && !tabletQ.matches,
      });
    };

    mobileQ.addEventListener("change", update);
    tabletQ.addEventListener("change", update);
    return () => {
      mobileQ.removeEventListener("change", update);
      tabletQ.removeEventListener("change", update);
    };
  }, []);

  return state;
}
