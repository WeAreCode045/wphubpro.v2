import React from 'react';
import { useParams } from 'react-router-dom';
import { useSite } from '../hooks/useSites';
import { Globe, AlertTriangle, Loader2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Card, { CardContent } from '../components/ui/Card';
import Tabs from '../components/ui/Tabs';
import PluginsTab from './site-detail/PluginsTab';
import ThemesTab from './site-detail/ThemesTab';

const SiteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: site, isLoading, isError } = useSite(id!);

  const handleConnectWordPress = () => {
    if (!site) return;
    localStorage.setItem('pending_site_id', site.$id);

    const callbackUrl = `${window.location.origin}/dashboard/connect-success`;
    const params = new URLSearchParams({
      app_name: "WPHubPro",
      success_url: callbackUrl,
    });

    const targetUrl = (site as any).siteUrl || (site as any).site_url;
    window.location.href = `${targetUrl}/wp-admin/authorize-application.php?${params.toString()}`;
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;
  if (isError || !site) return <div className="p-8 text-center text-destructive">Site niet gevonden.</div>;

  const isConnected = !!(site as any).password && (site as any).password !== "";

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{(site as any).siteName}</h1>
        <p className="text-muted-foreground">{(site as any).siteUrl}</p>
      </div>

      {!isConnected ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-12 flex flex-col items-center text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-amber-600" />
            <h2 className="text-2xl font-bold text-amber-900">Verbinding Vereist</h2>
            <p className="text-amber-700 max-w-md">Klik op de knop om deze site veilig te koppelen via WordPress.</p>
            <Button onClick={handleConnectWordPress} size="lg" className="bg-blue-600 hover:bg-blue-700">
              <Globe className="w-4 h-4 mr-2" />
              Nu Verbinden met WordPress
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview">
          <Tabs.List>
            <Tabs.Trigger value="overview">Overzicht</Tabs.Trigger>
            <Tabs.Trigger value="plugins">Plugins</Tabs.Trigger>
            <Tabs.Trigger value="themes">Themes</Tabs.Trigger>
          </Tabs.List>
          
          <Tabs.Content value="overview">
            <div className="p-6 border rounded-lg bg-card text-card-foreground">
              <h3 className="font-semibold mb-2">Systeeminformatie</h3>
              <p className="text-sm text-muted-foreground">Je bent verbonden met de WordPress REST API.</p>
            </div>
          </Tabs.Content>

          <Tabs.Content value="plugins">
            <PluginsTab siteId={site.$id} />
          </Tabs.Content>

          <Tabs.Content value="themes">
            <ThemesTab siteId={site.$id} />
          </Tabs.Content>
        </Tabs>
      )}
    </div>
  );
};

export default SiteDetailPage;