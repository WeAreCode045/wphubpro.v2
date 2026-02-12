
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { functions } from '../services/appwrite';
import { WordPressPlugin, WordPressTheme } from '../types';

const FUNCTION_ID = 'wp-proxy';

// --- API Helper ---
const executeWpProxy = async <T>(payload: { siteId: string; method?: string; endpoint: string; body?: any; }): Promise<T> => {
  try {
    const result = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    
    const responseBody = result.response;
    const statusCode = result.statusCode;

    const data = JSON.parse(responseBody);
    
    if (statusCode < 200 || statusCode >= 300) {
      throw new Error(data.message || `Request failed with status ${statusCode}`);
    }

    return data as T;
  } catch (error) {
    try {
      // Probeer de foutstructuur van Appwrite te parsen voor een duidelijkere foutmelding
      const errorResponse = JSON.parse((error as any).response);
      throw new Error(errorResponse.message || 'An unknown error occurred while executing the function.');
    } catch (e) {
      throw error; // Gooi de oorspronkelijke fout als het parsen mislukt
    }
  }
};


// --- Hooks ---
export const usePlugins = (siteId: string | undefined) => {
  return useQuery<WordPressPlugin[], Error>({
    queryKey: ['plugins', siteId],
    queryFn: () => executeWpProxy<WordPressPlugin[]>({ siteId: siteId!, endpoint: '/wp/v2/plugins' }),
    enabled: !!siteId,
  });
};

export const useThemes = (siteId: string | undefined) => {
  return useQuery<WordPressTheme[], Error>({
    queryKey: ['themes', siteId],
    queryFn: () => executeWpProxy<WordPressTheme[]>({ siteId: siteId!, endpoint: '/wp/v2/themes' }),
    enabled: !!siteId,
  });
};

export const useTogglePlugin = (siteId: string | undefined) => {
    const queryClient = useQueryClient();

    return useMutation<WordPressPlugin, Error, { pluginSlug: string; status: 'active' | 'inactive' }>({
        mutationFn: ({ pluginSlug, status }) => {
            const newStatus = status === 'active' ? 'inactive' : 'active';
            // De WP REST API gebruikt de bestandsnaam van de plugin (slug) in de URL
            const endpointSlug = pluginSlug.replace('/', '%2F');
            return executeWpProxy<WordPressPlugin>({
                siteId: siteId!,
                method: 'POST',
                endpoint: `/wp/v2/plugins/${endpointSlug}`,
                body: { status: newStatus },
            });
        },
        onSuccess: () => {
            // Invalideer de pluginlijst om de bijgewerkte status op te halen
            queryClient.invalidateQueries({ queryKey: ['plugins', siteId] });
        },
    });
};
