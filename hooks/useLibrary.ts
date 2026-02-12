
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { functions } from '../services/appwrite'; // Assuming a mock for now
import { searchWpPlugins } from '../services/wordpress';
import { LibraryItem, LibraryItemSource, LibraryItemType } from '../types';

// MOCK: Replace with actual Appwrite database calls
const mockLibraryDB: LibraryItem[] = [];
let nextId = 1;

const MOCK_USER_ID = 'admin-user';

const databases = {
  createDocument: async (dbId: string, collectionId: string, docId: string, data: Omit<LibraryItem, 'id'>) => {
    const newItem: LibraryItem = { id: docId === 'unique()' ? String(nextId++) : docId, ...data };
    mockLibraryDB.push(newItem);
    console.log("Added to mock DB:", newItem);
    return newItem;
  },
  listDocuments: async (dbId: string, collectionId: string) => {
    return { documents: mockLibraryDB };
  }
};
// --- END MOCK

export const useLibraryItems = () => {
  return useQuery<LibraryItem[], Error>({
    queryKey: ['libraryItems', MOCK_USER_ID],
    queryFn: async () => {
      const response = await databases.listDocuments('platform_db', 'library');
      return response.documents;
    },
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
  return useMutation<LibraryItem, Error, any>({
    mutationFn: async (plugin) => {
      const newLibraryItem: Omit<LibraryItem, 'id'> = {
        userId: MOCK_USER_ID,
        name: plugin.name,
        type: LibraryItemType.Plugin,
        source: LibraryItemSource.Official,
        version: plugin.version,
        author: plugin.author,
        description: plugin.short_description,
        wpSlug: plugin.slug,
      };
      return await databases.createDocument('platform_db', 'library', 'unique()', newLibraryItem);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['libraryItems', MOCK_USER_ID] });
      queryClient.invalidateQueries({ queryKey: ['usage', MOCK_USER_ID]});
    },
  });
};


export const useUploadLocalItem = () => {
    const queryClient = useQueryClient();
    return useMutation<{ success: boolean; message: string; item?: LibraryItem }, Error, { file: File, type: LibraryItemType }>({
        mutationFn: async ({ file, type }) => {
            // In a real app, you would use the Appwrite Web SDK's functions.createExecution
            // which handles file uploads properly. For this mock, we simulate the call.
            console.log(`Simulating upload for ${file.name} of type ${type}...`);
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Mock response from the zip-parser function
            const isPlugin = file.name.toLowerCase().includes('plugin');
            const mockParsedData: LibraryItem = {
                id: String(nextId++),
                userId: MOCK_USER_ID,
                name: isPlugin ? 'My Custom Uploaded Plugin' : 'My Awesome Theme',
                type: isPlugin ? LibraryItemType.Plugin : LibraryItemType.Theme,
                source: LibraryItemSource.Local,
                version: '1.0.0',
                author: 'Local Developer',
                description: 'This was uploaded locally and processed by zip-parser.',
                s3Path: `/user/${MOCK_USER_ID}/${type}/${file.name}`,
            };
            
            // Add to mock DB as if the function did it
            mockLibraryDB.push(mockParsedData);

            // Simulate a successful response from the Appwrite function
            return { success: true, message: 'File processed successfully!', item: mockParsedData };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['libraryItems', MOCK_USER_ID] });
            queryClient.invalidateQueries({ queryKey: ['usage', MOCK_USER_ID]});
        }
    });
};