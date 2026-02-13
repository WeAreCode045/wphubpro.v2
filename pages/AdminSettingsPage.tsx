import React, { useState, useEffect } from 'react';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Tabs from '../components/ui/Tabs';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Label from '../components/ui/Label';
import { 
  Globe, 
  Palette, 
  Database, 
  Cloud, 
  Save, 
  AlertCircle,
  Upload,
  Loader2,
  Undo2
} from 'lucide-react';
import { usePlatformSettings, useUpdatePlatformSettings } from '../hooks/usePlatformSettings';
import { useToast } from '../contexts/ToastContext';

const DEFAULT_BRANDING = {
  primaryColor: '#6366f1',
  secondaryColor: '#f8fafc',
  headerFont: 'Inter, sans-serif',
  bodyFont: 'Inter, sans-serif'
};

const AdminSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('details');
  const { toast } = useToast();
  const updateSettings = useUpdatePlatformSettings();

  // Settings State
  const [settings, setSettings] = useState<any>({
    details: { name: '', subtitle: '', logoUrl: '' },
    branding: { ...DEFAULT_BRANDING },
    database: { endpoint: '', projectId: '', apiKey: '' },
    s3: { endpoint: '', accessKey: '', secretKey: '', region: '' }
  });

  // Fetch all settings categories
  const { data: detailsData, isLoading: loadingDetails } = usePlatformSettings('details');
  const { data: brandingData, isLoading: loadingBranding } = usePlatformSettings('branding');
  const { data: databaseData, isLoading: loadingDatabase } = usePlatformSettings('database');
  const { data: s3Data, isLoading: loadingS3 } = usePlatformSettings('s3');

  useEffect(() => {
    if (detailsData) setSettings((prev: any) => ({ ...prev, details: { ...prev.details, ...detailsData } }));
    if (brandingData) setSettings((prev: any) => ({ ...prev, branding: { ...prev.branding, ...brandingData } }));
    if (databaseData) setSettings((prev: any) => ({ ...prev, database: { ...prev.database, ...databaseData } }));
    if (s3Data) setSettings((prev: any) => ({ ...prev, s3: { ...prev.s3, ...s3Data } }));
  }, [detailsData, brandingData, databaseData, s3Data]);

  const handleInputChange = (category: string, field: string, value: string) => {
    setSettings((prev: any) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const handleResetBranding = () => {
    setSettings((prev: any) => ({
      ...prev,
      branding: { ...DEFAULT_BRANDING }
    }));
    toast({
      title: 'Branding Reset',
      description: 'Colors and fonts have been reset to their default values. Click "Save Changes" to apply.',
      variant: 'default'
    });
  };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        category: activeTab,
        settings: settings[activeTab]
      });
      toast({
        title: 'Settings Saved',
        description: `Successfully updated ${activeTab} settings.`,
        variant: 'success'
      });
    } catch (error: any) {
      toast({
        title: 'Save Failed',
        description: error.message || 'An error occurred while saving settings.',
        variant: 'destructive'
      });
    }
  };

  const tabs = [
    { id: 'details', label: 'Platform Details', icon: Globe },
    { id: 'branding', label: 'Platform Branding', icon: Palette },
    { id: 'database', label: 'Database Connectivity', icon: Database },
    { id: 's3', label: 'AWS S3 Storage', icon: Cloud },
  ];

  const isLoading = loadingDetails || loadingBranding || loadingDatabase || loadingS3;

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Platform Settings</h1>
          <p className="text-muted-foreground mt-1">Configure global platform details, branding and infrastructure.</p>
        </div>
        <Button onClick={handleSave} disabled={updateSettings.isPending || isLoading}>
          {updateSettings.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
      </header>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <aside className="lg:w-64 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.id 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </aside>

        {/* Content Area */}
        <div className="flex-1 max-w-3xl">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {activeTab === 'details' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Platform Details</CardTitle>
                    <CardDescription>General information about your platform visible to users.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Platform Logo</Label>
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 bg-secondary rounded-lg border border-dashed border-border flex items-center justify-center overflow-hidden">
                            {settings.details.logoUrl ? (
                              <img src={settings.details.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                              <Upload className="w-6 h-6 text-muted-foreground" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <Button variant="outline" size="sm">Choose File</Button>
                            <p className="text-[10px] text-muted-foreground">PNG, SVG or JPG. Max 2MB.</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="platformName">Platform Name</Label>
                        <Input 
                          id="platformName" 
                          value={settings.details.name} 
                          onChange={(e) => handleInputChange('details', 'name', e.target.value)} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="platformSubtitle">Subtitle / Tagline</Label>
                        <Input 
                          id="platformSubtitle" 
                          value={settings.details.subtitle} 
                          onChange={(e) => handleInputChange('details', 'subtitle', e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'branding' && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Platform Branding</CardTitle>
                      <CardDescription>Customize the visual identity of the platform.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleResetBranding}>
                      <Undo2 className="w-3 h-3 mr-2" />
                      Reset to Default
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="primaryColor">Primary Color</Label>
                        <div className="flex gap-2">
                          <Input 
                            id="primaryColor" 
                            value={settings.branding.primaryColor} 
                            onChange={(e) => handleInputChange('branding', 'primaryColor', e.target.value)}
                            className="flex-1" 
                          />
                          <div className="w-10 h-10 rounded-md border border-border" style={{ backgroundColor: settings.branding.primaryColor }} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="secondaryColor">Secondary Color</Label>
                        <div className="flex gap-2">
                          <Input 
                            id="secondaryColor" 
                            value={settings.branding.secondaryColor} 
                            onChange={(e) => handleInputChange('branding', 'secondaryColor', e.target.value)}
                            className="flex-1" 
                          />
                          <div className="w-10 h-10 rounded-md border border-border" style={{ backgroundColor: settings.branding.secondaryColor }} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="headerFont">Header Font Family</Label>
                        <Input 
                          id="headerFont" 
                          value={settings.branding.headerFont} 
                          onChange={(e) => handleInputChange('branding', 'headerFont', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bodyFont">Body Text Font Family</Label>
                        <Input 
                          id="bodyFont" 
                          value={settings.branding.bodyFont} 
                          onChange={(e) => handleInputChange('branding', 'bodyFont', e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'database' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Appwrite Connectivity</CardTitle>
                    <CardDescription>Configure the connection to your Appwrite backend.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="appwriteEndpoint">API Endpoint</Label>
                      <Input 
                        id="appwriteEndpoint" 
                        value={settings.database.endpoint} 
                        onChange={(e) => handleInputChange('database', 'endpoint', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="appwriteProjectId">Project ID</Label>
                      <Input 
                        id="appwriteProjectId" 
                        value={settings.database.projectId} 
                        onChange={(e) => handleInputChange('database', 'projectId', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="appwriteApiKey">Server API Key (Optional)</Label>
                      <Input 
                        id="appwriteApiKey" 
                        type="password" 
                        placeholder="••••••••••••••••" 
                        value={settings.database.apiKey}
                        onChange={(e) => handleInputChange('database', 'apiKey', e.target.value)}
                      />
                    </div>
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex gap-3 mt-4">
                      <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                      <p className="text-xs text-amber-700 leading-relaxed">
                        Changing these values will affect how the application connects to your data. Ensure you have properly migrated your data before applying changes.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 's3' && (
                <Card>
                  <CardHeader>
                    <CardTitle>AWS S3 Connectivity</CardTitle>
                    <CardDescription>Manage storage for user data and platform assets.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="s3Endpoint">Bucket Endpoint</Label>
                        <Input 
                          id="s3Endpoint" 
                          placeholder="https://s3.region.amazonaws.com" 
                          value={settings.s3.endpoint}
                          onChange={(e) => handleInputChange('s3', 'endpoint', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="s3AccessKey">Access Key ID</Label>
                        <Input 
                          id="s3AccessKey" 
                          placeholder="AKIA..." 
                          value={settings.s3.accessKey}
                          onChange={(e) => handleInputChange('s3', 'accessKey', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="s3SecretKey">Secret Access Key</Label>
                        <Input 
                          id="s3SecretKey" 
                          type="password" 
                          placeholder="••••••••" 
                          value={settings.s3.secretKey}
                          onChange={(e) => handleInputChange('s3', 'secretKey', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="s3Region">Region</Label>
                        <Input 
                          id="s3Region" 
                          placeholder="eu-central-1" 
                          value={settings.s3.region}
                          onChange={(e) => handleInputChange('s3', 'region', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border">
                      <h3 className="text-sm font-semibold">Storage Locations</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-secondary rounded-lg border border-border">
                          <div>
                            <p className="text-sm font-medium">User Data Path</p>
                            <p className="text-xs text-muted-foreground">/user/&#123;userId&#125;/</p>
                          </div>
                          <span className="text-[10px] font-bold text-primary uppercase">Always Active</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-secondary rounded-lg border border-border">
                          <div>
                            <p className="text-sm font-medium">Platform Assets Path</p>
                            <p className="text-xs text-muted-foreground">/platform/global/</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;

