import React from "react";
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from "../../ui/Card.tsx";
import Button from "../../ui/Button.tsx";
import Badge from "../../ui/Badge.tsx";
import Table, {
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../ui/Table.tsx";
import { Loader2, Users } from "lucide-react";

export interface PlanUserRow {
  id: string;
  userId: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
}

interface PlanUsersTableProps {
  rows: PlanUserRow[];
  isLoading: boolean;
  canUnassign: boolean;
  isUnassigning: boolean;
  onViewProfile: (userId: string) => void;
  onUnassign: (userId: string) => void;
}

const PlanUsersTable: React.FC<PlanUsersTableProps> = ({
  rows,
  isLoading,
  canUnassign,
  isUnassigning,
  onViewProfile,
  onUnassign,
}) => {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-4 h-4" /> Current Users
          </CardTitle>
          <CardDescription>
            Users currently subscribed to this plan ({rows.length})
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No users found on this plan.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{row.name}</span>
                      <span className="text-xs text-muted-foreground">{row.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.status === "active" ? "success" : "secondary"}>
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{row.createdAt}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => onViewProfile(row.userId)}>
                        Profile
                      </Button>
                      {canUnassign && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive border-destructive hover:bg-destructive/10"
                          onClick={() => onUnassign(row.userId)}
                          disabled={isUnassigning}
                        >
                          {isUnassigning ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            "Unassign"
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default PlanUsersTable;
