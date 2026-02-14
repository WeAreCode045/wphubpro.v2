import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { functions } from '../services/appwrite';
import { WordPressPlugin, WordPressTheme } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

const FUNCTION_ID = 'wp-proxy';

// --- API Helper ---
const executeWpProxy = async <T>(payload: { siteId: string; method?: string; endpoint: string; body?: any; userId?: string; useApiKey?: boolean }): Promise<T> => {
  try {
    // Some Appwrite runtimes drop `req.payload`; encode parameters in the execution path as a fallback.
    const qs = new URLSearchParams();
    qs.set('siteId', payload.siteId);
    qs.set('endpoint', payload.endpoint);
    if (payload.method) qs.set('method', String(payload.method));
    if (payload.body) qs.set('body', encodeURIComponent(JSON.stringify(payload.body)));
    // include caller identity to satisfy function authorization when runtime doesn't inject it
    if (payload.userId) qs.set('userId', payload.userId);
    // instruct the proxy to prefer api_key field when available
    if (payload.useApiKey) qs.set('useApiKey', '1');

    const path = `/?${qs.toString()}`;

    // Appwrite SDK expects the HTTP method as a string (e.g. 'GET'|'POST') — pass strings to avoid enum/value mismatches
    const execMethod = payload.method ? String(payload.method) : 'GET';
    const result = await functions.createExecution(FUNCTION_ID, undefined, false, path, execMethod as any);

    // Appwrite Execution response properties
    const responseBody = result.responseBody || '';
    const statusCode = result.responseStatusCode || 0;

    // Safely attempt to parse JSON; if it fails, keep raw text
    let data: any = null;
    try {
      data = responseBody ? JSON.parse(responseBody) : null;
    } catch {
      data = responseBody;
    }

    if (statusCode < 200 || statusCode >= 300) {
      const message = (data && typeof data === 'object' && data.message) ? data.message : (typeof data === 'string' ? data : `Request failed with status ${statusCode}`);
      throw new Error(message);
    }

    // If function returned empty body (non-JSON), provide an empty-array fallback for list endpoints
    if ((data === null || data === '') && payload.endpoint && /plugins|themes/.test(payload.endpoint)) {
      return [] as unknown as T;
    }

    return data as T;
    } catch (error) {
    // Try to surface function execution details if present
    const err: any = error;
    if (err && err.response) {
      try {
        const parsed = JSON.parse(err.response);
        throw new Error(parsed.message || 'An unknown error occurred while executing the function.');
      } catch {
        throw err;
      }
    }
    throw err;
  }
};


// --- Hooks ---
// Use the new bridge endpoint for plugin list
export const usePlugins = (siteId: string | undefined) => {
  const { user } = useAuth();
  return useQuery<WordPressPlugin[], Error>({
    queryKey: ['plugins', siteId],
    queryFn: () => executeWpProxy<WordPressPlugin[]>({ siteId: siteId!, endpoint: 'wphub/v1/plugins', userId: user?.$id, useApiKey: true }),
    enabled: !!siteId,
  });
};

export const useThemes = (siteId: string | undefined) => {
  const { user } = useAuth();
  return useQuery<WordPressTheme[], Error>({
    queryKey: ['themes', siteId],
    queryFn: () => executeWpProxy<WordPressTheme[]>({ siteId: siteId!, endpoint: '/wp/v2/themes', userId: user?.$id, useApiKey: true }),
    enabled: !!siteId,
  });
};

export const useTogglePlugin = (siteId: string | undefined) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation<WordPressPlugin, Error, { pluginSlug: string; status: 'active' | 'inactive', pluginName: string }>({
    mutationFn: ({ pluginSlug, status }) => {
      const newStatus = status === 'active' ? 'deactivate' : 'activate';
      // Use the bridge endpoint for plugin management
      return executeWpProxy<WordPressPlugin>({
        siteId: siteId!,
        method: 'POST',
        endpoint: 'wphub/v1/plugins/manage',
        body: { action: newStatus, plugin: pluginSlug },
        userId: user?.$id,
        useApiKey: true,
      });
    },
    onSuccess: (_data, variables) => {
      // Invalidate the plugins list to refetch the updated status
      queryClient.invalidateQueries({ queryKey: ['plugins', siteId] });
      const action = variables.status === 'active' ? 'deactivated' : 'activated';
      toast({
        title: "Success",
        description: `Plugin \"${variables.pluginName}\" has been ${action}.`,
        variant: 'success'
      });
    },
    onError: (error, variables) => {
      toast({
        title: "Action Failed",
        description: `Could not toggle plugin \"${variables.pluginName}\": ${error.message}`,
        variant: 'destructive',
      });
    }
  });
};