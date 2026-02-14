import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { functions } from '../../services/appwrite';
import { 
  Search, 
  MoreHorizontal, 
  UserPlus, 
  Mail, 
  Shield, 
  CreditCard,
  Filter,
  Loader2,
  AlertCircle
} from 'lucide-react';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Label from '../../components/ui/Label';
import EditUserForm from './EditUserForm';

const UserManagerPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const waitForExecutionResponse = async (executionId: string, functionId: string) => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const execution = await functions.getExecution(functionId, executionId);
      const body = execution.responseBody;
      if (body && typeof body === 'string' && body.trim() !== '') {
        return execution;
      }
      if (execution.status === 'completed' || execution.status === 'failed') {
        return execution;
      }
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
    return null;
  };

  const { data: users = [], isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const functionId = 'admin-list-users';
      const result = await functions.createExecution(functionId, JSON.stringify({ limit: 100 }), false);
      let finalResult = result;
      let body = result.responseBody;
      if (!body || typeof body !== 'string' || body.trim() === '') {
        const execution = await waitForExecutionResponse(result.$id, functionId);
        if (execution) {
          finalResult = execution;
          body = execution.responseBody;
        }
      }
      if (!body || typeof body !== 'string' || body.trim() === '') {
        throw new Error(`No response from server. Status: ${finalResult.responseStatusCode || 'n/a'}.`);
      }
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error('Invalid JSON response from server.');
      }
      if (finalResult.responseStatusCode >= 400) {
        throw new Error(parsed?.message || 'Failed to fetch users.');
      }
      return parsed.users || [];
    },
    staleTime: 1000 * 60, // 1 minute
  });

  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  const openEdit = (user: any) => {
    setSelectedUser(user);
    setIsEditOpen(true);
  };

  const closeEdit = () => {
    setSelectedUser(null);
    setIsEditOpen(false);
  };

  const editMutation = useMutation({
    mutationFn: async (payload: { userId: string; updates: any }) => {
      const functionId = 'admin-update-user';
      const exec = await functions.createExecution(functionId, JSON.stringify(payload), false);
      // poll if needed
      if (!exec.responseBody || exec.responseBody.trim() === '') {
        const polled = await (async () => {
          for (let i = 0; i < 5; i++) {
            const e = await functions.getExecution(functionId, exec.$id);
            if (e.responseBody && e.responseBody.trim() !== '') return e;
            if (e.status === 'completed' || e.status === 'failed') return e;
            await new Promise((r) => setTimeout(r, 600));
          }
          return exec;
        })();
        if (polled) return polled;
      }
      return exec;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      closeEdit();
    }
  });

  const filteredUsers = users.filter((user: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.stripeId?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Manager</h1>
          <p className="text-muted-foreground mt-1">Manage platform users and their Stripe customer links.</p>
        </div>
        <Button>
          <UserPlus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </header>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search users by name or email..." 
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">Export CSV</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="flex items-center p-4 text-sm text-destructive bg-destructive/10 rounded-md">
              <AlertCircle className="w-5 h-5 mr-2" />
              <p>{error?.message || 'Failed to load users'}</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4" />
              <p>No users found</p>
            </div>
          ) : (
            <Table>
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-4 font-semibold text-sm">User</th>
                  <th className="text-left py-4 px-4 font-semibold text-sm">Plan</th>
                  <th className="text-left py-4 px-4 font-semibold text-sm">Stripe Customer</th>
                  <th className="text-left py-4 px-4 font-semibold text-sm">Status</th>
                  <th className="text-left py-4 px-4 font-semibold text-sm">Joined</th>
                  <th className="text-right py-4 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user: any) => (
                  <tr key={user.id} className="border-b border-border hover:bg-muted/30 transition-colors group">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{user.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5">
                        <Shield className={`w-3.5 h-3.5 ${user.role === 'Admin' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="text-sm">{user.planId || 'Free Tier'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {user.stripeId !== 'n/a' ? (
                        <div className="flex items-center gap-1.5 text-sm font-mono bg-secondary/50 px-2 py-1 rounded w-fit border border-border">
                          <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                          {user.stripeId}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">None</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        user.status === 'Active' ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-muted-foreground">{user.joined}</td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex justify-end">
                        <Button onClick={() => openEdit(user)} variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      <Modal isOpen={isEditOpen} onClose={closeEdit} title={selectedUser ? `Edit ${selectedUser.name}` : 'Edit User'}>
        {selectedUser && (
          <EditUserForm
            user={selectedUser}
            onCancel={closeEdit}
            onSave={async (updates: any) => {
              await editMutation.mutateAsync({ userId: selectedUser.id, updates });
            }}
          />
        )}
      </Modal>
    </div>
  );
};

export default UserManagerPage;
