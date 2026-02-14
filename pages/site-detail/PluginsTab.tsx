
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
  const { data: plugins, isLoading, isError, error, refetch } = usePlugins(siteId);
  const togglePluginMutation = useTogglePlugin(siteId);

  const handleToggle = (plugin: WordPressPlugin) => {
    togglePluginMutation.mutate({ 
      pluginSlug: plugin.plugin, 
      status: plugin.status,
      pluginName: plugin.name 
    });
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
    const message = error?.message || String(error);
    return (
      <div className="p-4 rounded-md border border-border bg-card">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-destructive mt-1" />
          <div className="flex-1">
            <p className="font-semibold">Error loading plugins</p>
            <p className="text-sm text-muted-foreground mt-1">{message}</p>

            <div className="mt-3 text-sm space-y-2">
              <p><strong>Wat te controleren</strong></p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground">
                <li>Controleer of de WordPress REST API beschikbaar is op <code>/wp-json/wp/v2/plugins</code>.</li>
                <li>Controleer of de opgeslagen site-credentials correct zijn en dat de runtime `ENCRYPTION_KEY` heeft om versleutelde wachtwoorden te ontsleutelen.</li>
                <li>Zorg dat de gebruiker met de opgeslagen credentials voldoende rechten heeft om plugins te zien (Administrator).</li>
              </ul>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
              <Button variant="ghost" size="sm" onClick={() => {
                // Copy a diagnostic curl command to clipboard for manual testing
                const curl = `curl -u <username>:<password> "https://<site_url>/wp-json/wp/v2/plugins"`;
                try { navigator.clipboard.writeText(curl); } catch { void 0; }
              }}>Copy test command</Button>
            </div>

            <details className="mt-3 text-xs text-muted-foreground">
              <summary className="cursor-pointer">Fout details</summary>
              <pre className="whitespace-pre-wrap mt-2 text-xs">{message}</pre>
            </details>
          </div>
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