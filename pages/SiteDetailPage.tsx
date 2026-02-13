
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Tabs from '../components/ui/Tabs';
import PluginsTab from './site-detail/PluginsTab';
import ThemesTab from './site-detail/ThemesTab';
import { useSite, useUpdateSite } from '../hooks/useSites';
import { ArrowLeft, Loader2, AlertCircle, Edit2 } from 'lucide-react';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Label from '../components/ui/Label';
import Button from '../components/ui/Button';
import { useToast } from '../contexts/ToastContext';

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

  const OverviewContent = () => {
    // Site fields may come in camelCase or snake_case depending on how documents were created.
    const get = (...ks: string[]) => {
      for (const k of ks) {
        const v = (site as any)[k];
        if (v !== undefined && v !== null) return v;
      }
      return '';
    };
    const name = get('siteName') || get('site_name');
    const url = get('siteUrl') || get('site_url');
    // Use top-level username field only
    const wpUser = (site as any).username || '';
    const health = get('healthStatus', 'health_status') || 'unknown';
    const lastChecked = get('lastChecked', 'last_checked');
    const wpVersion = get('wpVersion', 'wp_version');
    const phpVersion = get('phpVersion', 'php_version');

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Site</h3>
          <p className="text-sm"><strong>Name:</strong> {name}</p>
          <p className="text-sm"><strong>URL:</strong> <a href={url} target="_blank" rel="noreferrer" className="text-primary underline">{url}</a></p>
          <p className="text-sm"><strong>WP Username:</strong> {wpUser}</p>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-medium">Status</h3>
          <p className="text-sm"><strong>Health:</strong> {health}</p>
          <p className="text-sm"><strong>Last Checked:</strong> {lastChecked || 'Never'}</p>
          <p className="text-sm"><strong>WP Version:</strong> {wpVersion || 'Unknown'}</p>
          <p className="text-sm"><strong>PHP Version:</strong> {phpVersion || 'Unknown'}</p>
        </div>
      </div>
    );
  };

  const tabs = [
    { label: 'Overview', content: <OverviewContent /> },
    { label: 'Plugins', content: <PluginsTab siteId={siteId} /> },
    { label: 'Themes', content: <ThemesTab siteId={siteId} /> },
  ];

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [form, setForm] = useState({ site_name: '', site_url: '', username: '', password: '' });
  const updateSite = useUpdateSite();
  const { toast } = useToast();

  useEffect(() => {
    if (site) {
      setForm({
        site_name: (site as any).siteName || (site as any).site_name || '',
        site_url: (site as any).siteUrl || (site as any).site_url || '',
        // Do NOT populate the password field from stored credentials (server-only encrypted).
        // Use top-level `username` field on document (no legacy fallback).
        username: (site as any).username || '',
        password: '',
      });
    }
  }, [site]);

  const openEditor = () => setIsEditOpen(true);
  const closeEditor = () => setIsEditOpen(false);

  const handleSave = async () => {
    if (!site) return;
    try {
      const updates: Record<string, any> = {
        site_name: form.site_name,
        site_url: form.site_url,
      };
      // Use separate username/password fields. If password provided include it; otherwise include username only.
      if (form.username) updates.username = form.username;
      if (form.password) updates.password = form.password;
      await updateSite.mutateAsync({ siteId: site.$id, updates });
      closeEditor();
    } catch (e: any) {
      toast({ title: 'Update failed', description: e.message || 'Failed to update site', variant: 'destructive' });
    }
  };

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
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{(site as any).siteName || (site as any).site_name}</h1>
              <p className="text-muted-foreground mt-1">Manage plugins and themes for {(site as any).siteUrl || (site as any).site_url}</p>
            </div>
            <div>
              <Button onClick={openEditor} variant="outline">
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
      )}

      <Modal title="Edit Site" description="Update site connection details" isOpen={isEditOpen} onClose={closeEditor}>
        <div className="space-y-4">
          <div>
            <Label>Site Name</Label>
            <Input value={form.site_name} onChange={(e) => setForm(s => ({ ...s, site_name: e.target.value }))} />
          </div>
          <div>
            <Label>Site URL</Label>
            <Input value={form.site_url} onChange={(e) => setForm(s => ({ ...s, site_url: e.target.value }))} />
          </div>
          <div>
            <Label>WP Username</Label>
            <Input value={form.username} onChange={(e) => setForm(s => ({ ...s, username: e.target.value }))} />
          </div>
          <div>
            <Label>Application Password</Label>
            <Input value={form.password} onChange={(e) => setForm(s => ({ ...s, password: e.target.value }))} />
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="ghost" onClick={closeEditor}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateSite.isPending}>{updateSite.isPending ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      </Modal>
      
      {site && <Tabs tabs={tabs} defaultIndex={0} />}
    </div>
  );
};

export default SiteDetailPage;