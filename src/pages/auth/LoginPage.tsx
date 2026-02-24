
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.tsx';
import Button from '../../components/ui/Button.tsx';
import { usePlatformSettings } from '../../hooks/usePlatformSettings.ts';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card.tsx';
import Input from '../../components/ui/Input.tsx';
import Label from '../../components/ui/Label.tsx';
import { Loader2, AlertCircle } from 'lucide-react';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(email, password);
      // Navigation handled automatically by App.tsx route when user state updates
    } catch (err: any) {
      setError(err.message || 'Invalid email or password. Please try again.');
      setIsLoading(false);
    }
  };

  const { data: details } = usePlatformSettings('details');

  const PlatformBrandLogin: React.FC = () => {
    const name = details?.name || 'The Platform';
    const logo = details?.logoUrl || details?.logoDataUrl || null;
    return (
      <div className="flex items-center space-x-2">
        {logo ? (
          <img src={logo} alt="Logo" className="w-10 h-10 object-contain" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-primary">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
          </svg>
        )}
        <span className="text-2xl font-bold text-foreground">{name}</span>
      </div>
    );
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <PlatformBrandLogin />
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>Enter your credentials to access your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
                  <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
                  <p>{error}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/forgot-password" title="Coming Soon" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  'Log In'
                )}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
