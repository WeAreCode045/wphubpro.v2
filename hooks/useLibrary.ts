
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, functions, ID } from '../services/appwrite';
import { Query } from 'appwrite';
import { searchWpPlugins } from '../services/wordpress';
import { LibraryItem, LibraryItemSource, LibraryItemType } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useUser } from './useAuth';

const DATABASE_ID = 'platform_db';
const LIBRARY_COLLECTION_ID = 'library';
const ZIP_PARSER_FUNCTION_ID = 'zip-parser';

export const useLibraryItems = () => {
  const { data: user } = useUser();
  return useQuery<LibraryItem[], Error>({
    queryKey: ['libraryItems', user?.$id],
    queryFn: async () => {
      if (!user?.$id) return [];
      const response = await databases.listDocuments(
        DATABASE_ID,
        LIBRARY_COLLECTION_ID,
        [Query.equal('user_id', user.$id)]
      );
      return response.documents as unknown as LibraryItem[];
    },
    enabled: !!user,
  });
};

export const useSearchWpPlugins = (searchTerm: string) => {
  return useQuery({
    queryKey: ['wpPluginsSearch', searchTerm],
    queryFn: () => searchWpPlugins(searchTerm),
    enabled: !!searchTerm && searchTerm.length > 2,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

export const useAddOfficialPlugin = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: user } = useUser();

  return useMutation<LibraryItem, Error, any>({
    mutationFn: async (plugin) => {
      if (!user) throw new Error("User not authenticated.");
      const newLibraryItem: Omit<LibraryItem, 'id' | 'userId'> = {
        name: plugin.name,
        type: LibraryItemType.Plugin,
        source: LibraryItemSource.Official,
        version: plugin.version,
        author: plugin.author.replace(/<[^>]*>/g, ''),
        description: plugin.short_description,
        wpSlug: plugin.slug,
      };
      
      const doc = {
        ...newLibraryItem,
        user_id: user.$id
      }
      
      return await databases.createDocument(
        DATABASE_ID, 
        LIBRARY_COLLECTION_ID, 
        ID.unique(), 
        doc
      ) as unknown as LibraryItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['libraryItems', user?.$id] });
      queryClient.invalidateQueries({ queryKey: ['usage', user?.$id]});
      toast({
        title: "Plugin Added",
        description: `${data.name} has been successfully added to your library.`,
        variant: 'success',
      });
    },
    onError: (error) => {
       toast({
        title: "Error",
        description: `Failed to add plugin: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
};


export const useUploadLocalItem = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { data: user } = useUser();

    return useMutation<{ success: boolean; message: string; item?: LibraryItem }, Error, { file: File, type: LibraryItemType }>({
        mutationFn: async ({ file, type }) => {
            const execution = await functions.createExecution(
                ZIP_PARSER_FUNCTION_ID,
                JSON.stringify({ type }), // Body
                false, // isAsync
                'POST', // Method
                {}, // Headers
                file // File
            );

            if (execution.statusCode >= 400) {
                throw new Error(JSON.parse(execution.response).message || 'Failed to process file.');
            }
            return JSON.parse(execution.response);
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['libraryItems', user?.$id] });
            queryClient.invalidateQueries({ queryKey: ['usage', user?.$id]});
            toast({
                title: 'Upload Successful',
                description: `${data.item?.name} has been added to your library.`,
                variant: 'success'
            });
        },
        onError: (error) => {
            toast({
                title: 'Upload Failed',
                description: error.message,
                variant: 'destructive'
            });
        }
    });
};