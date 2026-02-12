
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Tabs from '../components/ui/Tabs';
import PluginsTab from './site-detail/PluginsTab';
import ThemesTab from './site-detail/ThemesTab';
import { ArrowLeft } from 'lucide-react';

const SiteDetailPage: React.FC = () => {
  const { siteId } = useParams<{ siteId: string }>();
  
  // In een echte app zou je hier site-details ophalen met useQuery
  const mockSiteName = 'My Mock WordPress Site';

  if (!siteId) {
    return <div>Site ID not found.</div>;
  }

  const tabs = [
    { label: 'Plugins', content: <PluginsTab siteId={siteId} /> },
    { label: 'Themes', content: <ThemesTab siteId={siteId} /> },
    { label: 'Overview', content: <div>Overview Content</div> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link to="/sites" className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sites
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{mockSiteName}</h1>
        <p className="text-muted-foreground mt-1">Manage plugins and themes for your site.</p>
      </div>
      
      <Tabs tabs={tabs} defaultIndex={0} />
    </div>
  );
};

export default SiteDetailPage;
