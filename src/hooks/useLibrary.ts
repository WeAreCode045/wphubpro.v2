import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// FIX: Import `storage` to handle file uploads correctly.
import { databases, functions, ID } from '../services/appwrite.ts';
import { Query } from 'appwrite';
import { searchWpPlugins } from '../services/wordpress.ts';
import { LibraryItem, LibraryItemSource, LibraryItemType } from '../types.ts';
import { useToast } from '../contexts/ToastContext.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';

const DATABASE_ID = 'platform_db';
const LIBRARY_COLLECTION_ID = 'library';
const ZIP_PARSER_FUNCTION_ID = 'zip-parser';
// FIX: Define a bucket ID for library uploads. This assumes an Appwrite Storage bucket with this ID exists.

export const useLibraryItems = () => {
  const { user } = useAuth();
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
  const { user } = useAuth();

  return useMutation<LibraryItem, Error, any>({
    mutationFn: async (plugin) => {
      if (!user) throw new Error("User not authenticated.");
      const newLibraryItem = {
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
      
      const response = await databases.createDocument(
        DATABASE_ID, 
        LIBRARY_COLLECTION_ID, 
        ID.unique(), 
        doc
      );
      return response as unknown as LibraryItem;
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
    const { user } = useAuth();

    return useMutation<{ success: boolean; message: string; item?: LibraryItem }, Error, { file: File, type: LibraryItemType }>({
        mutationFn: async ({ file, type }) => {
            if (!user) {
                throw new Error("User not authenticated.");
            }

            // Read file as base64 and send to zip-parser function which will upload contents to S3
            const readAsBase64 = (f: File) => new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const result = reader.result as string;
                    resolve(result);
                };
                reader.onerror = reject;
                reader.readAsDataURL(f);
            });

            const base64 = await readAsBase64(file);

            const execution = await functions.createExecution(
                ZIP_PARSER_FUNCTION_ID,
                JSON.stringify({ 
                    type, 
                    fileBase64: base64,
                    fileName: file.name,
                    userId: user.$id
                }),
                false // isAsync
            );

            if (execution.responseStatusCode >= 400) {
                const errorBody = JSON.parse(execution.responseBody);
                throw new Error(errorBody.message || 'Failed to process file.');
            }
            
            return JSON.parse(execution.responseBody);
        },
        onSuccess: (data) => {
            if (data.success) {
                queryClient.invalidateQueries({ queryKey: ['libraryItems', user?.$id] });
                queryClient.invalidateQueries({ queryKey: ['usage', user?.$id]});
                toast({
                    title: 'Upload Successful',
                    description: `${data.item?.name} has been added to your library.`,
                    variant: 'success'
                });
            } else {
                 toast({
                    title: 'Upload Processing Failed',
                    description: data.message,
                    variant: 'destructive'
                });
            }
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