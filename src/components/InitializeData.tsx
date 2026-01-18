import { useEffect, useState } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

export async function initializeDemoData() {
  if (!projectId || !publicAnonKey) {
    throw new Error('Supabase configuration missing');
  }

  const demoUsers = [
    {
      name: 'Admin User',
      email: 'admin@demo.org',
      password: 'demo123',
      role: 'Admin',
      location: 'Mombasa',
    },
    {
      name: 'M&E Officer',
      email: 'me@demo.org',
      password: 'demo123',
      role: 'M&E Officer',
      location: 'Kilifi',
    },
    {
      name: 'Data Entry Clerk',
      email: 'data@demo.org',
      password: 'demo123',
      role: 'Data Entry',
      location: 'Lamu',
    },
    {
      name: 'Viewer User',
      email: 'viewer@demo.org',
      password: 'demo123',
      role: 'Viewer',
      location: 'Mombasa',
    },
  ];

  let createdCount = 0;
  const errors = [];

  for (const user of demoUsers) {
    try {
      const response = await fetch(
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
      
      if (response.ok) {
        createdCount++;
      } else {
        const text = await response.text();
        errors.push(`${user.email}: ${text}`);
      }
    } catch (userError) {
      errors.push(`${user.email}: ${userError}`);
    }
  }

  return { createdCount, errors };
}

export function useInitializeData() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // Skip initialization if projectId or publicAnonKey is missing
        if (!projectId || !publicAnonKey) {
          console.warn('Supabase configuration missing, skipping initialization');
          setInitialized(true);
          return;
        }

        // Check if users already exist
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/users`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            },
          }
        );

        // If the fetch fails (network error, CORS, etc.), just continue
        if (!response.ok) {
          console.warn('Could not fetch users, assuming database is ready');
          setInitialized(true);
          return;
        }

        const data = await response.json();
        
        // If no users exist, create demo users
        if (data.success && data.users.length === 0) {
          const { createdCount, errors } = await initializeDemoData();
          
          if (createdCount > 0) {
            console.log('Demo users initialized successfully');
            toast.success(`Initialized ${createdCount} demo users`);
          }
          
          if (errors.length > 0) {
            console.warn('Some users failed to initialize:', errors);
          }
        }
        
        setInitialized(true);
      } catch (error) {
        // Log the error but still set initialized to true to allow app to continue
        console.warn('Error initializing data (continuing anyway):', error);
        setInitialized(true);
      }
    };

    init();
  }, []);

  return initialized;
}