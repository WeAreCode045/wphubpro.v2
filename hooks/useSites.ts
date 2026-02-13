
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, ID } from '../services/appwrite';
import { Query } from 'appwrite';
import { Site } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const DATABASE_ID = 'platform_db';
const SITES_COLLECTION_ID = 'sites';

export const useSites = () => {
  const { user } = useAuth();
  
  return useQuery<Site[], Error>({
    queryKey: ['sites', user?.$id],
    queryFn: async () => {
      if (!user?.$id) return [];
      const response = await databases.listDocuments(
        DATABASE_ID,
        SITES_COLLECTION_ID,
        [Query.equal('user_id', user.$id)]
      );
      // The Appwrite SDK types don't perfectly match our custom types, so casting is needed.
      return response.documents as unknown as Site[];
    },
    enabled: !!user?.$id,
  });
};


export const useSite = (siteId: string | undefined) => {
    const { user } = useAuth();

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
            if ((document as any).user_id !== user?.$id) {
                throw new Error("Forbidden: You do not have permission to view this site.");
            }
            
            return document as unknown as Site;
        },
        enabled: !!siteId && !!user,
    });
};

export const useAddSite = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { toast } = useToast();

    return useMutation<Site, Error, Omit<Site, '$id' | 'userId' | 'healthStatus' | 'lastChecked' | 'wpVersion' | 'phpVersion'>>({
        mutationFn: async (newSite) => {
            if (!user) throw new Error("User not authenticated.");
            
            // In a real app, encrypt wp_app_password before sending.
            const document = {
                ...newSite,
                user_id: user.$id,
            };
            
            const response = await databases.createDocument(
                DATABASE_ID,
                SITES_COLLECTION_ID,
                ID.unique(),
                document
            );
            return response as unknown as Site;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['sites', user?.$id] });
            queryClient.invalidateQueries({ queryKey: ['usage', user?.$id]});
            toast({
                title: "Site Added",
                description: `Successfully connected to ${data.siteName}.`,
                variant: 'success',
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to Add Site",
                description: error.message,
                variant: 'destructive',
            });
        }
    });
};
