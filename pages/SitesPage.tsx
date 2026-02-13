
import React from 'react';
import { Link } from 'react-router-dom';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useSites } from '../hooks/useSites';
import { Globe, PlusCircle, Loader2, AlertCircle } from 'lucide-react';

const SitesPage: React.FC = () => {
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
        <Button className="mt-6">
            <PlusCircle className="w-4 h-4 mr-2" />
            Add New Site
        </Button>
    </div>
  );


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Sites</h1>
            <p className="text-muted-foreground mt-2">Manage your connected WordPress sites.</p>
        </div>
        <Button>
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
            {sites.map(site => (
              <Card key={site.id}>
                <CardContent className="p-6">
                    <h3 className="font-semibold">{site.siteName}</h3>
                    <p className="text-sm text-muted-foreground">{site.siteUrl}</p>
                    <Button asChild variant="link" className="p-0 h-auto mt-2">
                        <Link to={`/sites/${site.id}`}>
                            Manage Site
                        </Link>
                    </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState />
        )
      )}
    </div>
  );
};

export default SitesPage;