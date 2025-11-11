import { useEffect, useState } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function useInitializeData() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // Check if users already exist
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/users`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            },
          }
        );

        const data = await response.json();
        
        // If no users exist, create demo users
        if (data.success && data.users.length === 0) {
          const demoUsers = [
            {
              name: 'Admin User',
              email: 'admin@demo.org',
              password: 'demo123',
              role: 'Admin',
              location: 'Location A',
            },
            {
              name: 'M&E Officer',
              email: 'me@demo.org',
              password: 'demo123',
              role: 'M&E Officer',
              location: 'Location B',
            },
            {
              name: 'Data Entry Clerk',
              email: 'data@demo.org',
              password: 'demo123',
              role: 'Data Entry',
              location: 'Location C',
            },
            {
              name: 'Viewer User',
              email: 'viewer@demo.org',
              password: 'demo123',
              role: 'Viewer',
              location: 'Location A',
            },
          ];

          for (const user of demoUsers) {
            await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/users`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${publicAnonKey}`,
                },
                body: JSON.stringify({ user }),
              }
            );
          }

          console.log('Demo users initialized successfully');
        }
        
        setInitialized(true);
      } catch (error) {
        console.error('Error initializing data:', error);
        setInitialized(true);
      }
    };

    init();
  }, []);

  return initialized;
}
