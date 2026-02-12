
import React from 'react';
import Tabs from '../components/ui/Tabs';
import OfficialSearch from '../components/library/OfficialSearch';
import LocalUploader from '../components/library/LocalUploader';
import LibraryGrid from '../components/library/LibraryGrid';

const LibraryPage: React.FC = () => {
  const tabs = [
    { label: 'My Library', content: <LibraryGrid /> },
    { label: 'Add from WordPress.org', content: <OfficialSearch /> },
    { label: 'Upload Local', content: <LocalUploader /> },
  ];

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Library</h1>
            <p className="text-muted-foreground mt-2">Manage your collection of plugins and themes.</p>
        </div>
      </div>
      <Tabs tabs={tabs} defaultIndex={0} />
    </div>
  );
};

export default LibraryPage;