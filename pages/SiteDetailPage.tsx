import React from 'react';
import { useParams } from 'react-router-dom';
import { useSite } from '../hooks/useSites';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useUpdateSite } from '../hooks/useSites';
import Button from '../components/ui/Button';
import Card, { CardContent } from '../components/ui/Card';
import Tabs from '../components/ui/Tabs';
import PluginsTab from './site-detail/PluginsTab';
import ThemesTab from './site-detail/ThemesTab';

const SiteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: site, isLoading, isError, error } = useSite(id);
  // Hooks must be called unconditionally - keep mutations at top-level
  const { mutate: disconnectSite, isPending: disconnecting } = useUpdateSite();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Site gegevens ophalen...</p>
      </div>
    );
  }

  if (isError || !site) {
    return (
      <div className="p-12 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
        <h2 className="text-2xl font-bold">Site niet gevonden</h2>
        <p className="text-muted-foreground">
          {error?.message || `We konden geen site vinden met ID: ${id}`}
        </p>
        <Button onClick={() => window.location.href = '/sites'} variant="outline">
          Terug naar overzicht
        </Button>
      </div>
    );
  }

  // Controleer of de site verbonden is op basis van de aanwezigheid van an api_key or password
  const isConnected = !!(site as any).api_key || !!(site as any).password;

  const handleDisconnect = () => {
    if (!site) return;
    const ok = window.confirm('Weet je zeker dat je de verbinding wilt verbreken? De opgeslagen gebruikersnaam en het wachtwoord worden verwijderd.');
    if (!ok) return;

    disconnectSite({ siteId: site.$id, username: '', password: '' });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {(site as any).siteName || (site as any).site_name || 'Naamloze site'}
        </h1>
        <p className="text-muted-foreground">
          {(site as any).siteUrl || (site as any).site_url}
        </p>
        {isConnected && (
          <div className="mt-3">
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Ontkoppelen
            </button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-6">
          {!isConnected && (
            <div className="mb-4 p-4 rounded-md bg-amber-50 border border-amber-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-700 mt-1" />
                <div>
                  <p className="font-semibold">Verbinding Vereist</p>
                  <p className="text-sm text-amber-700">Deze site heeft nog geen API-key. Gebruik de Bridge plugin in WordPress om de koppeling te maken.</p>
                </div>
              </div>
            </div>
          )}
          <Tabs defaultValue="overview">
            <Tabs.List>
              <Tabs.Trigger value="overview">Overzicht</Tabs.Trigger>
              <Tabs.Trigger value="plugins">Plugins</Tabs.Trigger>
              <Tabs.Trigger value="themes">Themes</Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="overview">
               <Card>
                 <CardContent className="p-6">
                   <h3 className="text-lg font-medium">Status</h3>
                   <p className={isConnected ? "text-green-600 flex items-center mt-2" : "text-amber-700 flex items-center mt-2"}>
                     <span className={`w-2 h-2 ${isConnected ? 'bg-green-500' : 'bg-amber-500'} rounded-full mr-2`}></span>
                     {isConnected ? 'Actief verbonden met de WordPress REST API' : 'Niet verbonden'}
                   </p>
                 </CardContent>
               </Card>
            </Tabs.Content>

            <Tabs.Content value="plugins">
              <PluginsTab siteId={site.$id} />
            </Tabs.Content>

            <Tabs.Content value="themes">
              <ThemesTab siteId={site.$id} />
            </Tabs.Content>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SiteDetailPage;