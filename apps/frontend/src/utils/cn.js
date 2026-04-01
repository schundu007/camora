/**
 * Utility function for merging Tailwind CSS classes
 *
 * Combines clsx (conditional classes) with tailwind-merge (deduplication)
 * This is the industry standard approach used by shadcn/ui and other modern component libraries
 *
 * @example
 * cn('px-4 py-2', isActive && 'bg-blue-500', 'px-6')
 * // Returns: 'py-2 px-6 bg-blue-500' (px-4 is overridden by px-6)
 */

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Utility for creating variant-based class strings
 * Useful for creating component variants without cva
 *
 * @example
 * const buttonClasses = variants({
 *   base: 'px-4 py-2 rounded',
 *   variants: {
 *     color: {
 *       primary: 'bg-blue-500 text-white',
 *       secondary: 'bg-gray-200 text-gray-800',
 *     },
 *     size: {
 *       sm: 'text-sm',
 *       lg: 'text-lg px-6 py-3',
 *     },
 *   },
 *   defaultVariants: {
 *     color: 'primary',
 *     size: 'sm',
 *   },
 * });
 *
 * buttonClasses({ color: 'secondary', size: 'lg' })
 */
export function variants(config) {
  return (props = {}) => {
    const { base = '', variants = {}, defaultVariants = {} } = config;
    const mergedProps = { ...defaultVariants, ...props };

    const variantClasses = Object.entries(variants)
      .map(([key, values]) => {
        const value = mergedProps[key];
        return value ? values[value] : '';
      })
      .filter(Boolean);

    return cn(base, ...variantClasses, props.className);
  };
}

export default cn;
