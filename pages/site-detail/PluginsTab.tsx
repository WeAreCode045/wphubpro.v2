
import React from 'react';
import { usePlugins, useTogglePlugin } from '../../hooks/useWordPress';
import { WordPressPlugin } from '../../types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import { Loader2, AlertCircle, Power, PowerOff } from 'lucide-react';

interface PluginsTabProps {
  siteId: string;
}

const PluginsTab: React.FC<PluginsTabProps> = ({ siteId }) => {
  const { data: plugins, isLoading, isError, error } = usePlugins(siteId);
  const togglePluginMutation = useTogglePlugin(siteId);

  const handleToggle = (plugin: WordPressPlugin) => {
    togglePluginMutation.mutate({ pluginSlug: plugin.plugin, status: plugin.status });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Loading plugins...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center p-4 text-sm text-destructive bg-destructive/10 rounded-md">
        <AlertCircle className="w-5 h-5 mr-2" />
        <div>
          <p className="font-semibold">Error loading plugins</p>
          <p>{error?.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Plugin</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Version</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plugins?.map((plugin) => (
            <TableRow key={plugin.plugin}>
              <TableCell className="font-medium">{plugin.name}</TableCell>
              <TableCell>
                <div className="flex items-center">
                  <span className={`w-2.5 h-2.5 rounded-full mr-2 ${plugin.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                  <span className="capitalize">{plugin.status}</span>
                </div>
              </TableCell>
              <TableCell>{plugin.version}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleToggle(plugin)}
                    disabled={togglePluginMutation.isPending && togglePluginMutation.variables?.pluginSlug === plugin.plugin}
                    aria-label={plugin.status === 'active' ? 'Deactivate' : 'Activate'}
                >
                    {togglePluginMutation.isPending && togglePluginMutation.variables?.pluginSlug === plugin.plugin 
                        ? <Loader2 className="w-4 h-4 animate-spin"/>
                        : plugin.status === 'active' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />
                    }
                </Button>
                <Button variant="outline" size="sm" disabled>Update</Button>
                <Button variant="destructive" size="sm" disabled>Delete</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default PluginsTab;
