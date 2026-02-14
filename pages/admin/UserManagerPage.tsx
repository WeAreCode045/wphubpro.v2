import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { databases } from '../../services/appwrite';
import { COLLECTIONS, DATABASE_ID } from '../../services/appwrite';
import { 
  Search, 
  MoreHorizontal, 
  UserPlus, 
  Mail, 
  Shield, 
  CreditCard,
  Filter
} from 'lucide-react';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const UserManagerPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: users = [], isLoading, isError, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.SITES);
      return res.documents.map((doc) => ({
        id: doc.$id,
        name: doc.user_name || doc.name || 'Unknown',
        email: doc.user_email || doc.email || '',
        role: doc.role || 'User',
        stripeId: doc.stripe_customer_id || 'n/a',
        status: doc.status || 'Active',
        joined: doc.joined || doc.$createdAt,
      }));
    },
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
          <Table>
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-4 px-4 font-semibold text-sm">User</th>
                <th className="text-left py-4 px-4 font-semibold text-sm">Role</th>
                <th className="text-left py-4 px-4 font-semibold text-sm">Stripe Customer</th>
                <th className="text-left py-4 px-4 font-semibold text-sm">Status</th>
                <th className="text-left py-4 px-4 font-semibold text-sm">Joined</th>
                <th className="text-right py-4 px-4 font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6}>Loading...</td></tr>
              ) : isError ? (
                <tr><td colSpan={6}>Error: {error.message}</td></tr>
              ) : (
                users.map((user) => (
                <tr key={user.id} className="border-b border-border hover:bg-muted/30 transition-colors group">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {user.name.charAt(0)}
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
                      <span className="text-sm">{user.role}</span>
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
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagerPage;
