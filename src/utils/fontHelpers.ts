import { typography } from '../constants/theme';
import { FontSizeKey, FontWeightKey, FontFamilyKey } from '../constants/typography';

/**
 * Helper to get font style object
 */
export const getFontStyle = (
  size: FontSizeKey = 'md',
  weight: FontWeightKey = 'regular'
) => {
  const fontFamilyKey: FontFamilyKey =
    weight === 'regular'
      ? 'regular'
      : weight === 'medium'
      ? 'medium'
      : weight === 'semibold'
      ? 'semibold'
      : 'bold';

  return {
    fontFamily: typography.fontFamily[fontFamilyKey],
    fontSize: typography.fontSize[size],
    fontWeight: typography.fontWeight[weight],
  };
};
