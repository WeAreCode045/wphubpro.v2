import { useQuery } from '@tanstack/react-query';
import { account, teams } from '../services/appwrite.ts';

/**
 * Hook om de huidige ingelogde gebruiker op te halen inclusief rollen/team membership.
 */
export const useUser = () => {
  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        const user = await account.get();
        
        // Check if user is in the admin team
        let isAdmin = false;
        try {
          const teamMemberships = await teams.listMemberships('admin');
          isAdmin = teamMemberships.memberships.some(m => m.userId === user.$id);
        } catch (err) {
          console.warn('Could not fetch admin team membership');
          isAdmin = false;
        }
        
        return {
          ...user,
          isAdmin,
        } as any; 
      } catch {
        // Als er geen actieve sessie is, geven we null terug
        return null;
      }
    },
    // Voorkom onnodige retries als de gebruiker simpelweg niet is ingelogd
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minuten
  });
};

/**
 * Placeholder voor login logica
 */
export const useLogin = () => {
  // Hier kun je later de login mutatie toevoegen
};

/**
 * Placeholder voor logout logica
 */
export const useLogout = () => {
  // Hier kun je later de logout mutatie toevoegen
};