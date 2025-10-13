import type { ReactNode } from "react";
import 'utils/i18n';
import { useLanguageDetection } from 'utils/useLanguageDetection';
import { useUser } from '@stackframe/react';
import { useEffect, useState } from 'react';
import { isAllowedDomain, ALLOWED_DOMAIN } from 'utils/domainValidation';
import { stackClientApp } from 'app/auth';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
}

/**
 * DomainGuard checks if authenticated users have an allowed email domain.
 * Signs out users with unauthorized domains and shows an error message.
 */
const DomainGuard = ({ children }: { children: ReactNode }) => {
  const user = useUser();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const checkDomain = async () => {
      // Only check if user is authenticated and we haven't checked yet
      if (user && !hasChecked) {
        const userEmail = user.primaryEmail;
        
        if (!isAllowedDomain(userEmail)) {
          // Show error message
          toast.error(
            `Access Denied`,
            {
              description: `Only ${ALLOWED_DOMAIN} email addresses are allowed to access this app. Please sign in with an authorized email.`,
              duration: 10000,
            }
          );
          
          // Sign out the user
          await stackClientApp.signOut();
        }
        
        setHasChecked(true);
      } else if (!user) {
        // Reset check when user signs out
        setHasChecked(false);
      }
    };

    checkDomain();
  }, [user, hasChecked]);

  return <>{children}</>;
};

/**
 * A provider wrapping the whole app.
 *
 * You can add multiple providers here by nesting them,
 * and they will all be applied to the app.
 *
 * Note: ThemeProvider is already included in AppWrapper.tsx and does not need to be added here.
 */
export const AppProvider = ({ children }: Props) => {
  // Initialize language detection on app load
  useLanguageDetection();
  
  return (
    <DomainGuard>
      {children}
    </DomainGuard>
  );
};
