import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { functions } from '../services/appwrite';
import { WordPressPlugin, WordPressTheme } from '../types';
import { useToast } from '../contexts/ToastContext';

const FUNCTION_ID = 'wp-proxy';

// --- API Helper ---
const executeWpProxy = async <T>(payload: { siteId: string; method?: string; endpoint: string; body?: any; }): Promise<T> => {
  try {
    const result = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    
    // FIX: The Appwrite Execution model uses `responseBody`.
    const responseBody = result.responseBody;
    // FIX: The Appwrite Execution model uses `responseStatusCode`.
    const statusCode = result.responseStatusCode;

    const data = JSON.parse(responseBody);
    
    if (statusCode < 200 || statusCode >= 300) {
      throw new Error(data.message || `Request failed with status ${statusCode}`);
    }

    return data as T;
  } catch (error) {
    // Attempt to parse a more specific error from the function response
    try {
      const errorResponse = JSON.parse((error as any).response);
      throw new Error(errorResponse.message || 'An unknown error occurred while executing the function.');
    } catch (e) {
      throw error; // Throw original error if parsing fails
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
    const { toast } = useToast();

    return useMutation<WordPressPlugin, Error, { pluginSlug: string; status: 'active' | 'inactive', pluginName: string }>({
        mutationFn: ({ pluginSlug, status }) => {
            const newStatus = status === 'active' ? 'inactive' : 'active';
            // The WP REST API uses the plugin's file path (slug) in the URL, which needs encoding
            const endpointSlug = pluginSlug.replace('/', '%2F');
            return executeWpProxy<WordPressPlugin>({
                siteId: siteId!,
                method: 'POST',
                endpoint: `/wp/v2/plugins/${endpointSlug}`,
                body: { status: newStatus },
            });
        },
        onSuccess: (data, variables) => {
            // Invalidate the plugins list to refetch the updated status
            queryClient.invalidateQueries({ queryKey: ['plugins', siteId] });
            const action = data.status === 'active' ? 'activated' : 'deactivated';
            toast({
              title: "Success",
              description: `Plugin "${variables.pluginName}" has been ${action}.`,
              variant: 'success'
            });
        },
        onError: (error, variables) => {
            toast({
                title: "Action Failed",
                description: `Could not toggle plugin "${variables.pluginName}": ${error.message}`,
                variant: 'destructive',
            });
        }
    });
};