
import React from 'react';
import { useThemes } from '../../hooks/useWordPress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import { Loader2, AlertCircle } from 'lucide-react';

interface ThemesTabProps {
  siteId: string;
}

const ThemesTab: React.FC<ThemesTabProps> = ({ siteId }) => {
  const { data: themes, isLoading, isError, error } = useThemes(siteId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Loading themes...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center p-4 text-sm text-destructive bg-destructive/10 rounded-md">
        <AlertCircle className="w-5 h-5 mr-2" />
        <div>
          <p className="font-semibold">Error loading themes</p>
          <p>{error?.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Theme</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Version</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {themes?.map((theme) => (
            <TableRow key={theme.name}>
              <TableCell className="font-medium">{theme.name}</TableCell>
              <TableCell>
                 <div className="flex items-center">
                  <span className={`w-2.5 h-2.5 rounded-full mr-2 ${theme.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                  <span className="capitalize">{theme.status}</span>
                </div>
              </TableCell>
              <TableCell>{theme.version}</TableCell>
              <TableCell className="text-right space-x-2">
                 <Button variant="ghost" size="sm" disabled={theme.status === 'active'}>Activate</Button>
                 <Button variant="outline" size="sm" disabled>Update</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ThemesTab;
