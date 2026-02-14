
import React from 'react';
import { useThemes, useManageTheme } from '../../hooks/useWordPress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import { Loader2, AlertCircle } from 'lucide-react';

interface ThemesTabProps {
  siteId: string;
}

const ThemesTab: React.FC<ThemesTabProps> = ({ siteId }) => {
  const { data: themes, isLoading, isError, error } = useThemes(siteId);
  const manageTheme = useManageTheme(siteId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Loading themes...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 rounded-md border border-border bg-card">
        <div className="mb-2 text-sm text-muted-foreground">API: /wp-json/wphub/v1/themes</div>
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-destructive mt-1" />
          <div className="flex-1">
            <p className="font-semibold">Error loading themes</p>
            <p className="text-sm text-muted-foreground mt-1">{error?.message}</p>

            <div className="mt-3 text-sm space-y-2">
              <p><strong>Wat te controleren</strong></p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground">
                <li>Controleer of de WPHub Bridge plugin actief is en de endpoint <code>/wp-json/wphub/v1/themes</code> beschikbaar is.</li>
                <li>Controleer of de opgeslagen API key correct is en overeenkomt met de WordPress Bridge plugin.</li>
                <li>Zorg dat de gebruiker met de opgeslagen credentials voldoende rechten heeft om themes te zien (Administrator).</li>
              </ul>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
              <Button variant="ghost" size="sm" onClick={() => {
                const curl = `curl -H \"X-WPHub-Key: <api_key>\" \"<site_url>/wp-json/wphub/v1/themes\"`;
                try { navigator.clipboard.writeText(curl); } catch { void 0; }
              }}>Copy test command</Button>
            </div>

            <details className="mt-3 text-xs text-muted-foreground">
              <summary className="cursor-pointer">Fout details</summary>
              <pre className="whitespace-pre-wrap mt-2 text-xs">{error?.message}</pre>
            </details>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="p-4 border-b border-border text-sm text-muted-foreground">API: /wp-json/wphub/v1/themes</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Theme</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Version</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {themes?.map((theme) => (
            <TableRow key={theme.name}>
              <TableCell className="font-medium">{theme.name}</TableCell>
              <TableCell>
                 <div className="flex items-center">
                  <span className={`w-2.5 h-2.5 rounded-full mr-2 ${theme.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                  <span className="capitalize">{theme.status}</span>
                </div>
              </TableCell>
              <TableCell>{theme.version}</TableCell>
              <TableCell className="text-right space-x-2">
                 <Button
                   size="sm"
                   variant="primary"
                   disabled={manageTheme.isPending || theme.status === 'active'}
                   onClick={() => handleAction(theme, 'activate')}
                 >
                   {theme.status === 'active' ? 'Active' : 'Activate'}
                 </Button>
                 <Button
                   size="sm"
                   variant="secondary"
                   disabled={manageTheme.isPending}
                   onClick={() => handleAction(theme, 'update')}
                 >
                   Update
                 </Button>
                 <Button
                   size="sm"
                   variant="destructive"
                   disabled={manageTheme.isPending}
                   onClick={() => handleAction(theme, 'delete')}
                 >
                   Delete
                 </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ThemesTab;
