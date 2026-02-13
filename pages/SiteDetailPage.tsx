
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Tabs from '../components/ui/Tabs';
import PluginsTab from './site-detail/PluginsTab';
import ThemesTab from './site-detail/ThemesTab';
import { useSite } from '../hooks/useSites';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

const SiteDetailPage: React.FC = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const { data: site, isLoading, isError, error } = useSite(siteId);

  if (!siteId) {
    return (
        <div className="text-center p-8">
            <h2 className="text-xl font-semibold">Site ID not found.</h2>
            <p className="text-muted-foreground">Please return to the sites list and select a site.</p>
        </div>
    );
  }

  const tabs = [
    { label: 'Plugins', content: <PluginsTab siteId={siteId} /> },
    { label: 'Themes', content: <ThemesTab siteId={siteId} /> },
    { label: 'Overview', content: <div>Overview Content</div> },
  ];

  return (
    <div className="space-y-6">
       <Link to="/sites" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sites
        </Link>
        
        {isLoading && (
            <div className="flex items-center space-x-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <h1 className="text-3xl font-bold tracking-tight text-muted-foreground">Loading Site...</h1>
            </div>
        )}

        {isError && (
             <div className="flex items-center p-4 text-sm text-destructive bg-destructive/10 rounded-md">
                <AlertCircle className="w-5 h-5 mr-3" />
                <div>
                    <p className="font-semibold">Error loading site</p>
                    <p>{error?.message}</p>
                </div>
            </div>
        )}
      
      {site && (
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{site.siteName}</h1>
            <p className="text-muted-foreground mt-1">Manage plugins and themes for {site.siteUrl}</p>
          </div>
      )}
      
      {site && <Tabs tabs={tabs} defaultIndex={0} />}
    </div>
  );
};

export default SiteDetailPage;