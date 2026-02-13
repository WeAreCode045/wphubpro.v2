
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, functions } from '../services/appwrite';
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

    // The mutation now expects a more specific object type from the form
        type NewSiteInput = {
            siteName: string;
            siteUrl: string;
            username: string;
            password?: string; // kept for form compatibility
        }

    return useMutation<Site, Error, NewSiteInput>({
        mutationFn: async (newSiteData) => {
            if (!user) throw new Error("User not authenticated.");
            // First: validate WP credentials server-side using `validate-wp` function
                        // Create site through server function which will validate and encrypt the app password
                        const payload = {
                            site_url: newSiteData.siteUrl,
                            site_name: newSiteData.siteName,
                            username: newSiteData.username,
                            password: newSiteData.password || '',
                            userId: user.$id,
                        };

                        const path = `/?userId=${user.$id}`;
                        const exec = await functions.createExecution('create-site', JSON.stringify(payload), false, path);
                        const status = exec.responseStatusCode || 0;
                        const body = exec.responseBody || '';
                        let parsed: any = null;
                        try { parsed = body ? JSON.parse(body) : null; } catch { parsed = body; }

                        if (status >= 400) {
                            const msg = (parsed && parsed.message) ? parsed.message : (typeof parsed === 'string' ? parsed : 'Failed to create site');
                            throw new Error(msg);
                        }

                        return (parsed && parsed.document) ? (parsed.document as unknown as Site) : (parsed as unknown as Site);
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

export const useDeleteSite = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { toast } = useToast();

    return useMutation<void, Error, string>({
        mutationFn: async (siteId: string) => {
            if (!user) throw new Error('User not authenticated.');
            await databases.deleteDocument(DATABASE_ID, SITES_COLLECTION_ID, siteId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sites', user?.$id] });
            toast({ title: 'Site removed', description: 'The site was removed successfully.', variant: 'success' });
        },
        onError: (err) => {
            toast({ title: 'Failed to remove site', description: err.message, variant: 'destructive' });
        }
    });
};

export const useUpdateSite = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { toast } = useToast();

    return useMutation<any, Error, { siteId: string; updates: Record<string, any> }>({
                mutationFn: async ({ siteId, updates }) => {
                        if (!user) throw new Error('User not authenticated.');

                        // If updates do not include username/password, perform a direct DB update using the Appwrite SDK.
                        // This avoids calling the server function for plain metadata changes.
                const needsServerProcessing = !!(updates && (updates.password || updates.username));
                if (!needsServerProcessing) {
                    return await databases.updateDocument(DATABASE_ID, SITES_COLLECTION_ID, siteId, updates);
                }

                // For password/username updates, call the server function synchronously so it can encrypt/manage passwords.
                const payload = { siteId, updates, userId: user.$id };
                const path = `/?userId=${user.$id}`;
                const exec = await functions.createExecution('update-site', JSON.stringify(payload), false, path);
                const status = exec.responseStatusCode || 0;
                const body = exec.responseBody || '';
                let parsed: any = null;
                try { parsed = body ? JSON.parse(body) : null; } catch { parsed = body; }
                if (status >= 400) {
                    const msg = (parsed && parsed.message) ? parsed.message : (typeof parsed === 'string' ? parsed : 'Failed to update site');
                    throw new Error(msg);
                }
                return (parsed && parsed.document) ? parsed.document : parsed;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['sites', user?.$id] });
            queryClient.invalidateQueries({ queryKey: ['site', variables.siteId] });
            toast({ title: 'Site updated', description: 'Site details were updated successfully.', variant: 'success' });
        },
        onError: (err) => {
            toast({ title: 'Failed to update site', description: err.message, variant: 'destructive' });
        }
    });
};
