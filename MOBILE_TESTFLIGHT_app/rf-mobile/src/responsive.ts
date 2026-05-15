import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

// ════════════════════════════════════════════════════════════════════
// RESPONSIVE — масштабирование под iPhone SE … iPad
// ════════════════════════════════════════════════════════════════════

export type Resp = {
  width: number; height: number;
  isTiny: boolean;     // < 340 (iPhone SE 1g, маленькие Android)
  isSmall: boolean;    // < 380 (iPhone SE 2g/3g, mini)
  isLarge: boolean;    // >= 430 (Pro Max, большие Android)
  isTablet: boolean;   // >= 600
  scale: (n: number) => number;
  pad: number;
  cardRadius: number;
  kpiCols: 1 | 2 | 4;
  fabBottom: number;
};

export function useResponsive(): Resp {
  const { width, height } = useWindowDimensions();
  return useMemo(() => {
    const isTiny = width < 340;
    const isSmall = width < 380;
    const isLarge = width >= 430;
    const isTablet = width >= 600;
    const scale = (n: number) => {
      if (isTablet) return Math.round(n * 1.1);
      if (isLarge) return Math.round(n * 1.04);
      if (isTiny) return Math.round(n * 0.82);
      if (isSmall) return Math.round(n * 0.92);
      return n;
    };
    return {
      width, height, isTiny, isSmall, isLarge, isTablet, scale,
      pad: isTiny ? 14 : isSmall ? 16 : isTablet ? 28 : 20,
      cardRadius: isTablet ? 18 : 14,
      kpiCols: isTablet ? 4 : isTiny ? 1 : 2,
      fabBottom: isTablet ? 100 : 92,
    };
  }, [width, height]);
}
