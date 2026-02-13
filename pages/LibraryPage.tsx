
import React, { useState } from 'react';
import Tabs from '../components/ui/Tabs';
import OfficialSearch from '../components/library/OfficialSearch';
import LocalUploader from '../components/library/LocalUploader';
import LibraryGrid from '../components/library/LibraryGrid';

const LibraryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

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
      <Tabs defaultValue={tabs[activeTab].label}>
        <div className="flex gap-2 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(tabs.indexOf(tab))}
              className={`px-4 py-2 ${activeTab === tabs.indexOf(tab) ? 'border-b-2 border-primary' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {tabs.map((tab, index) => (
          <div key={index} data-tab={tab.label}>
            {activeTab === index && tab.content}
          </div>
        ))}
      </Tabs>
    </div>
  );
};

export default LibraryPage;