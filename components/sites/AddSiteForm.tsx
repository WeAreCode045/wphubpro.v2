
import React, { useState } from 'react';
import { useAddSite } from '../../hooks/useSites';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Label from '../ui/Label';
import { Loader2, AlertCircle } from 'lucide-react';

interface AddSiteFormProps {
  onSuccess: () => void;
}

const AddSiteForm: React.FC<AddSiteFormProps> = ({ onSuccess }) => {
  const [siteName, setSiteName] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const addSiteMutation = useAddSite();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    addSiteMutation.mutate({
      siteName,
      siteUrl, // Pass siteUrl
      username,
      password,
    }, {
      onSuccess: () => {
        onSuccess();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {addSiteMutation.isError && (
        <div className="flex items-center p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          <AlertCircle className="w-5 h-5 mr-2" />
          <p>{addSiteMutation.error.message}</p>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="siteName">Site Name</Label>
        <Input id="siteName" placeholder="My Awesome Blog" value={siteName} onChange={(e) => setSiteName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="siteUrl">Site URL</Label>
        <Input id="siteUrl" type="url" placeholder="https://example.com" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} required />
      </div>
       <div className="space-y-2">
        <Label htmlFor="username">WordPress Username</Label>
        <Input id="username" placeholder="admin" value={username} onChange={(e) => setUsername(e.target.value)} required />
      </div>
       <div className="space-y-2">
        <Label htmlFor="password">Application Password</Label>
        <Input id="password" type="password" placeholder="xxxx xxxx xxxx xxxx" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <p className="text-xs text-muted-foreground">Create an Application Password in your WordPress admin under Users &gt; Profile.</p>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={addSiteMutation.isPending}>
          {addSiteMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            'Add Site'
          )}
        </Button>
      </div>
    </form>
  );
};

export default AddSiteForm;
