/**
 * Shared receipt filename utilities used by both GmailSetup and UploadReceipts.
 */

/**
 * Convert date from MM/DD/YYYY (or similar) to YYYY.MM.DD format for filenames.
 */
export function convertDateFormat(dateStr: string): string {
  try {
    const normalized = dateStr.replace(/\./g, '/').replace(/-/g, '/');
    if (normalized.includes('/')) {
      const parts = normalized.split('/');
      if (parts.length === 3) {
        const [month, day, year] = parts;
        return `${year}.${month.padStart(2, '0')}.${day.padStart(2, '0')}`;
      }
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

/**
 * Generate a standardized receipt filename: VENDOR_YYYY.MM.DD_Amount.ext
 */
export function generateFilename(
  vendor: string | null,
  date: string | null,
  amount: string | null,
  currentFilename: string | null,
): string | null {
  if (!vendor || !date || !amount) return currentFilename;
  const cleanVendor = vendor.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const formattedDate = convertDateFormat(date);
  const extension = currentFilename?.split('.').pop() || 'pdf';
  return `${cleanVendor}_${formattedDate}_${amount}.${extension}`;
}

/**
 * Sanitize a vendor name for use in filenames (preserves spaces as underscores).
 */
export function sanitizeVendor(vendor: string, maxLength = 30): string {
  return vendor
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s/g, '_')
    .substring(0, maxLength);
}
