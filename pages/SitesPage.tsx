
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { ExternalLink, Trash2 } from 'lucide-react';
import { useDeleteSite } from '../hooks/useSites';
import { useSites } from '../hooks/useSites';
import { Globe, PlusCircle, Loader2, AlertCircle } from 'lucide-react';
import Modal from '../components/ui/Modal';
import { usePlatformSettings } from '../hooks/usePlatformSettings';
import AddSiteForm from '../components/sites/AddSiteForm';

const DeleteButton: React.FC<{ siteId: string }> = ({ siteId }) => {
  const deleteSite = useDeleteSite();
  return (
    <button
      onClick={() => {
        if (confirm('Are you sure you want to remove this site?')) {
          deleteSite.mutate(siteId);
        }
      }}
      className="text-destructive hover:text-destructive/80"
      aria-label="Delete site"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
};


const SitesPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: sites, isLoading, isError, error } = useSites();

  const EmptyState = () => (
    <div className="text-center py-16 border-2 border-dashed border-border rounded-lg">
        <Globe className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium text-foreground">
            No sites yet
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
            Connect your first WordPress site to start managing it.
        </p>
        <Button className="mt-6" onClick={() => setIsModalOpen(true)}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Add New Site
        </Button>
    </div>
  );

  return (
    <>
      <Modal
        title="Add New Site"
        description={`Enter your WordPress site details to connect it to ${usePlatformSettings('details').data?.name || 'the platform'}.`}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <AddSiteForm onSuccess={() => setIsModalOpen(false)} />
      </Modal>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Sites</h1>
              <p className="text-muted-foreground mt-2">Manage your connected WordPress sites.</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
              <PlusCircle className="w-4 h-4 mr-2" />
              Add New Site
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {isError && (
          <div className="flex items-center p-4 text-sm text-destructive bg-destructive/10 rounded-md">
              <AlertCircle className="w-5 h-5 mr-2" />
              <p>{error?.message || 'Failed to load sites.'}</p>
          </div>
        )}

        {!isLoading && !isError && sites && (
          sites.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sites.map(site => {
                const name = (site as any).siteName || (site as any).site_name || 'Untitled';
                const url = (site as any).siteUrl || (site as any).site_url || '#';
                return (
                <Card key={site.$id}>
                  <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{name}</h3>
                          <p className="text-sm text-muted-foreground">{url}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <a href={url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                            <ExternalLink className="w-5 h-5" />
                          </a>
                          <Button asChild variant="link" className="p-0 h-auto">
                            <Link to={`/sites/${site.$id}`}>Manage</Link>
                          </Button>
                            <DeleteButton siteId={site.$id} />
                        </div>
                      </div>
                  </CardContent>
                </Card>
              );})}
            </div>
          ) : (
            <EmptyState />
          )
        )}
      </div>
    </>
  );
};

export default SitesPage;
