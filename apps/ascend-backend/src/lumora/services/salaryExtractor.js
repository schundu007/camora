/**
 * Salary Extractor — parses salary/compensation from job description text.
 *
 * Handles common formats:
 *   - "$140,000 - $348,000"
 *   - "$140K – $348K"
 *   - "Annual Base Salary Range: $140,000 - $348,000 USD"
 *   - "$120,000 to $180,000 per year"
 *   - "Base pay range: $150,000—$200,000"
 *   - "Compensation: $100k-$150k"
 *   - "$85.00 - $120.00 per hour" (converts to annual)
 */

/**
 * Parse a single dollar amount string to a number.
 * Handles: "$140,000", "$140K", "$140k", "140000", "140,000"
 */
function parseDollarAmount(str) {
  if (!str) return null;
  let cleaned = str.replace(/[,$\s]/g, '').trim();
  // Handle K/k suffix (e.g., "140K" → 140000)
  if (/k$/i.test(cleaned)) {
    const num = parseFloat(cleaned.replace(/k$/i, ''));
    return isNaN(num) ? null : num * 1000;
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Extract salary range from job description text.
 * Returns { min: number|null, max: number|null } or null if no salary found.
 */
export function extractSalary(text) {
  if (!text || typeof text !== 'string') return null;

  // Normalize whitespace and special characters
  const normalized = text
    .replace(/\u2013|\u2014|\u2012/g, '-')  // en-dash, em-dash → hyphen
    .replace(/\u00A0/g, ' ');                 // non-breaking space

  // Patterns ordered by specificity (most specific first)
  const patterns = [
    // "Annual Base Salary Range: $140,000 - $348,000 USD"
    /(?:annual|base|total|target)\s*(?:base\s*)?(?:salary|pay|compensation|cash\s*compensation)\s*(?:range)?[:\s]*\$\s*([\d,]+(?:\.\d+)?[kK]?)\s*[-–—to]+\s*\$\s*([\d,]+(?:\.\d+)?[kK]?)/i,

    // "Salary range: $X - $Y" / "Pay range: $X to $Y"
    /(?:salary|pay|compensation|wage|earning)\s*(?:range|band)?[:\s]*\$\s*([\d,]+(?:\.\d+)?[kK]?)\s*[-–—to]+\s*\$\s*([\d,]+(?:\.\d+)?[kK]?)/i,

    // "The base salary for this role is $X - $Y"
    /base\s*salary\s*(?:for\s*this\s*(?:role|position))?\s*(?:is|:)\s*\$\s*([\d,]+(?:\.\d+)?[kK]?)\s*[-–—to]+\s*\$\s*([\d,]+(?:\.\d+)?[kK]?)/i,

    // "$140,000 - $348,000 per year" / "$140K-$348K annually"
    /\$\s*([\d,]+(?:\.\d+)?[kK]?)\s*[-–—to]+\s*\$\s*([\d,]+(?:\.\d+)?[kK]?)\s*(?:per\s*year|annually|\/\s*(?:yr|year)|USD|per\s*annum|a\s*year)/i,

    // "from $X to $Y" / "between $X and $Y"
    /(?:from|between)\s*\$\s*([\d,]+(?:\.\d+)?[kK]?)\s*(?:to|and|-)\s*\$\s*([\d,]+(?:\.\d+)?[kK]?)/i,

    // Generic: "$140,000 - $348,000" (standalone range, at least one number > 20000)
    /\$\s*([\d,]+(?:\.\d+)?[kK]?)\s*[-–—to]+\s*\$\s*([\d,]+(?:\.\d+)?[kK]?)/i,
  ];

  // Try hourly patterns separately
  const hourlyPattern = /\$\s*([\d,.]+)\s*[-–—to]+\s*\$\s*([\d,.]+)\s*(?:per\s*hour|\/\s*(?:hr|hour)|hourly)/i;
  const hourlyMatch = normalized.match(hourlyPattern);
  if (hourlyMatch) {
    const minHourly = parseFloat(hourlyMatch[1].replace(/,/g, ''));
    const maxHourly = parseFloat(hourlyMatch[2].replace(/,/g, ''));
    if (minHourly > 0 && maxHourly > 0 && minHourly < 1000 && maxHourly < 1000) {
      // Convert hourly to annual (2080 hours/year)
      return {
        min: Math.round(minHourly * 2080),
        max: Math.round(maxHourly * 2080),
      };
    }
  }

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      const min = parseDollarAmount(match[1]);
      const max = parseDollarAmount(match[2]);

      // Sanity checks: salary should be reasonable (> $15K and < $5M)
      if (min && min >= 15000 && min <= 5000000 && max && max >= 15000 && max <= 5000000) {
        return {
          min: Math.round(min),
          max: Math.round(max),
        };
      }
      // If only one is reasonable, still return it
      if (min && min >= 15000 && min <= 5000000) {
        return { min: Math.round(min), max: max && max >= 15000 ? Math.round(max) : null };
      }
      if (max && max >= 15000 && max <= 5000000) {
        return { min: null, max: Math.round(max) };
      }
    }
  }

  // Single salary mention: "base salary of $150,000" or "salary: $150K"
  const singlePattern = /(?:salary|compensation|pay|base)\s*(?:of|is|:)?\s*\$\s*([\d,]+(?:\.\d+)?[kK]?)/i;
  const singleMatch = normalized.match(singlePattern);
  if (singleMatch) {
    const amount = parseDollarAmount(singleMatch[1]);
    if (amount && amount >= 15000 && amount <= 5000000) {
      return { min: Math.round(amount), max: null };
    }
  }

  return null;
}
