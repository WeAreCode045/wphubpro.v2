
import React, { useState, useEffect } from 'react';
import { useSearchWpPlugins, useAddOfficialPlugin } from '../../hooks/useLibrary';
import { useLibraryItems } from '../../hooks/useLibrary';
import Button from '../ui/Button';
import { Search, Loader2, Plus, Check } from 'lucide-react';

// Debounce hook
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const OfficialSearch: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const { data: searchResults, isLoading } = useSearchWpPlugins(debouncedSearchTerm);
    const { data: libraryItems } = useLibraryItems();
    const addPluginMutation = useAddOfficialPlugin();

    const librarySlugs = new Set(libraryItems?.filter(item => item.wpSlug).map(item => item.wpSlug));

    return (
        <div className="space-y-6">
            <div className="relative max-w-xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search for plugins on WordPress.org..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
            </div>

            {isLoading && (
                <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {searchResults?.map((plugin: any) => {
                    const isInLibrary = librarySlugs.has(plugin.slug);
                    const isAdding = addPluginMutation.isPending && addPluginMutation.variables?.slug === plugin.slug;

                    return (
                        <div key={plugin.slug} className="bg-card border border-border rounded-lg p-4 flex flex-col">
                            <h3 className="font-semibold text-foreground truncate" title={plugin.name}>{plugin.name}</h3>
                            <p className="text-xs text-muted-foreground">By {plugin.author.replace(/<[^>]*>/g, '')}</p>
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-3 flex-grow">
                                {plugin.short_description}
                            </p>
                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
                                <span className="text-xs font-mono bg-secondary px-2 py-1 rounded">v{plugin.version}</span>
                                 <Button 
                                    size="sm" 
                                    onClick={() => addPluginMutation.mutate(plugin)}
                                    disabled={isInLibrary || isAdding}
                                >
                                    {isAdding ? <Loader2 className="w-4 h-4 animate-spin" />
                                     : isInLibrary ? <><Check className="w-4 h-4 mr-2" /> Added</>
                                     : <><Plus className="w-4 h-4 mr-2" /> Add to Library</>
                                    }
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>
             {debouncedSearchTerm && !isLoading && searchResults?.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No plugins found for "{debouncedSearchTerm}".</p>
            )}
        </div>
    );
};

export default OfficialSearch;