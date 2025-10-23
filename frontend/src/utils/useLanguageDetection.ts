import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import brain from 'brain';

/**
 * Hook to detect user's language from IP on first visit
 * Falls back to localStorage if already set
 */
export const useLanguageDetection = () => {
  const { i18n } = useTranslation();
  const [isDetecting, setIsDetecting] = useState(false);

  useEffect(() => {
    const detectLanguage = async () => {
      // Check if language is already set in localStorage
      const savedLanguage = localStorage.getItem('i18nextLng');
      if (savedLanguage && ['en', 'ro', 'uk'].includes(savedLanguage)) {
        // Already have a saved preference, use it
        return;
      }

      // No saved preference, detect from IP
      try {
        setIsDetecting(true);
        const response = await brain.detect_language();
        const data = await response.json();
        
        if (data.language && ['en', 'ro', 'uk'].includes(data.language)) {
          // Only change if different from current
          if (i18n.language !== data.language) {
            await i18n.changeLanguage(data.language);
            console.log(`Language auto-detected: ${data.language} (from ${data.country || 'IP'})`);
          }
        }
      } catch (error) {
        // Silently fall back to English when backend is unavailable
        // This is expected during development when backend isn't running
        if (import.meta.env.DEV) {
          console.info('Language auto-detection unavailable (backend offline). Using English.');
        } else {
          console.error('Failed to detect language from IP:', error);
        }

        // Fallback to English on error
        if (!savedLanguage) {
          await i18n.changeLanguage('en');
        }
      } finally {
        setIsDetecting(false);
      }
    };

    detectLanguage();
  }, [i18n]);

  return { isDetecting };
};
