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
      // Map de database resultaten naar het Site type
      return response.documents.map(doc => ({
        ...doc,
        siteName: (doc as any).site_name || '',
        siteUrl: (doc as any).site_url || '',
      })) as unknown as Site[];
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

            // Controleer of de site van de huidige gebruiker is
            if ((document as any).user_id !== user?.$id) {
                throw new Error("Geen toegang tot deze site.");
            }
            
            // Map snake_case naar camelCase zodat de UI de data vindt
            return {
                ...document,
                siteName: (document as any).site_name,
                siteUrl: (document as any).site_url,
            } as unknown as Site;
        },
        enabled: !!siteId && !!user,
        retry: 1 // Voorkom eindeloze retries bij 404
    });
};

export const useAddSite = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { toast } = useToast();

    type NewSiteInput = {
        siteName: string;
        siteUrl: string;
        username: string;
        password?: string;
    }

    return useMutation<Site, Error, NewSiteInput>({
        mutationFn: async (newSiteData) => {
            if (!user) throw new Error("User not authenticated.");
            
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
                title: "Site Toegevoegd",
                description: `Site ${data.siteName} is succesvol aangemaakt.`,
                variant: 'success',
            });
        },
        onError: (error) => {
            toast({
                title: "Fout bij toevoegen",
                description: error.message,
                variant: 'destructive',
            });
        }
    });
};

export const useUpdateSite = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { toast } = useToast();

    return useMutation<any, Error, { siteId: string; username?: string; password?: string; siteName?: string; siteUrl?: string }>({
        mutationFn: async ({ siteId, ...updates }) => {
            if (!user) throw new Error('User not authenticated.');

            // Bepaal of we de server functie nodig hebben voor encryptie
            const needsServerProcessing = !!(updates.password || updates.username);
            
            if (!needsServerProcessing) {
                // Directe DB update voor simpele metadata
                const dbUpdates: any = {};
                if (updates.siteName) dbUpdates.site_name = updates.siteName;
                if (updates.siteUrl) dbUpdates.site_url = updates.siteUrl;
                return await databases.updateDocument(DATABASE_ID, SITES_COLLECTION_ID, siteId, dbUpdates);
            }

            // Gebruik de 'update-site' functie voor gevoelige data (password/username)
            const payload = { siteId, updates, userId: user.$id };
            const path = `/?userId=${user.$id}`;
            const exec = await functions.createExecution('update-site', JSON.stringify(payload), false, path);
            
            const status = exec.responseStatusCode || 0;
            const body = exec.responseBody || '';
            let parsed: any = null;
            try { parsed = body ? JSON.parse(body) : null; } catch { parsed = body; }
            
            if (status >= 400) {
                const msg = (parsed && parsed.message) ? parsed.message : 'Fout bij bijwerken site';
                throw new Error(msg);
            }
            return (parsed && parsed.document) ? parsed.document : parsed;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['sites', user?.$id] });
            queryClient.invalidateQueries({ queryKey: ['site', variables.siteId] });
            toast({ title: 'Site bijgewerkt', description: 'De gegevens zijn succesvol opgeslagen.', variant: 'success' });
        },
        onError: (err) => {
            toast({ title: 'Update mislukt', description: err.message, variant: 'destructive' });
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
            toast({ title: 'Site verwijderd', description: 'De site is succesvol verwijderd.', variant: 'success' });
        },
        onError: (err) => {
            toast({ title: 'Verwijderen mislukt', description: err.message, variant: 'destructive' });
        }
    });
};