import { useQuery } from '@tanstack/react-query';
import { account } from '../services/appwrite';

/**
 * Hook om de huidige ingelogde gebruiker op te halen inclusief rollen/labels.
 */
export const useUser = () => {
  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        const user = await account.get();
        
        // We voegen een isAdmin helper toe op basis van het Appwrite Auth Label
        return {
          ...user,
          isAdmin: user.labels?.includes('Admin') || false,
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