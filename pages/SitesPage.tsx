
import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const SitesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Sites</h1>
            <p className="text-muted-foreground mt-2">Manage your connected WordPress sites.</p>
        </div>
        <Button>Add New Site</Button>
      </div>

      <Card>
        <div className="p-6">
            <h3 className="font-semibold">My Mock WordPress Site</h3>
            <p className="text-sm text-muted-foreground">https://mock-site.com</p>
            <Button asChild variant="link" className="p-0 h-auto mt-2">
                <Link to="/sites/mock-site-id">
                    Manage Site
                </Link>
            </Button>
        </div>
      </Card>
    </div>
  );
};

export default SitesPage;
