
import { useQuery } from '@tanstack/react-query';
import { databases } from '../services/appwrite';
import { Query } from 'appwrite';
import { Site } from '../types';
import { useUser } from './useAuth';

const DATABASE_ID = 'platform_db';
const SITES_COLLECTION_ID = 'sites';

export const useSites = () => {
  const { data: user } = useUser();
  
  return useQuery<Site[], Error>({
    queryKey: ['sites', user?.$id],
    queryFn: async () => {
      if (!user?.$id) return [];
      const response = await databases.listDocuments(
        DATABASE_ID,
        SITES_COLLECTION_ID,
        [Query.equal('user_id', user.$id)]
      );
      return response.documents as unknown as Site[];
    },
    enabled: !!user?.$id, // Only run query if user is loaded
  });
};


export const useSite = (siteId: string | undefined) => {
    const { data: user } = useUser();

    return useQuery<Site, Error>({
        queryKey: ['site', siteId],
        queryFn: async () => {
            if (!siteId) throw new Error("Site ID is required.");
            const document = await databases.getDocument(
                DATABASE_ID,
                SITES_COLLECTION_ID,
                siteId
            );

            // Additional security check: ensure the fetched site belongs to the current user.
            if (document.user_id !== user?.$id) {
                throw new Error("Forbidden: You do not have permission to view this site.");
            }
            
            return document as unknown as Site;
        },
        enabled: !!siteId && !!user,
    });
};