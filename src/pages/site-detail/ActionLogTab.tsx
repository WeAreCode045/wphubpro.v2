import React, { useState } from 'react';
import { useSite } from '../../hooks/useSites.ts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table.tsx';
import Button from '../../components/ui/Button.tsx';
import type { ActionLogEntry } from '../../types.ts';

interface ActionLogTabProps {
  siteId: string;
}

export const ActionLogTab: React.FC<ActionLogTabProps> = ({ siteId }) => {
  const { data: site, isLoading, isError, error } = useSite(siteId);
  const [expanded, setExpanded] = useState<number | null>(null);

  if (isLoading) return <div>Loading action log...</div>;
  if (isError || !site) return <div>Error loading action log: {error?.message}</div>;

  const log: ActionLogEntry[] = Array.isArray(site?.action_log) ? [...site.action_log].reverse() : [];

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="p-4 border-b border-border text-sm text-muted-foreground">Action Log</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Action</TableHead>
            <TableHead>Endpoint</TableHead>
            <TableHead>Date/Time</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {log.length === 0 && (
            <TableRow><TableCell colSpan={4}>No actions logged yet.</TableCell></TableRow>
          )}
          {log.map((entry, idx) => (
            <React.Fragment key={idx}>
              <TableRow>
                <TableCell>{entry.action}</TableCell>
                <TableCell>{entry.endpoint}</TableCell>
                <TableCell>{new Date(entry.timestamp).toLocaleString()}</TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => setExpanded(expanded === idx ? null : idx)}>
                    {expanded === idx ? 'Hide' : 'Show'}
                  </Button>
                </TableCell>
              </TableRow>
              {expanded === idx && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <div className="bg-muted p-3 rounded text-xs whitespace-pre-wrap break-all">
                      <strong>Request:</strong> {JSON.stringify(entry.request, null, 2)}
                      <br />
                      <strong>Response:</strong> {typeof entry.response === 'object' ? JSON.stringify(entry.response, null, 2) : String(entry.response)}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ActionLogTab;
