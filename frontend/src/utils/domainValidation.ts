/**
 * Validates if an email belongs to the allowed domain
 */
export const ALLOWED_DOMAIN = '@theorphanshands.org';

/**
 * Check if email has the allowed domain
 * @param email - User email to validate
 * @returns true if email ends with allowed domain
 */
export const isAllowedDomain = (email: string | null | undefined): boolean => {
  if (!email) return false;
  return email.toLowerCase().endsWith(ALLOWED_DOMAIN.toLowerCase());
};

/**
 * Extract domain from email
 * @param email - Email address
 * @returns domain portion of email (e.g., '@example.com')
 */
export const extractDomain = (email: string): string => {
  const atIndex = email.lastIndexOf('@');
  if (atIndex === -1) return '';
  return email.substring(atIndex);
};
