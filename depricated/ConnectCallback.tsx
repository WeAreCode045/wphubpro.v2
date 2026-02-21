import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useSites, useUpdateSite } from '../hooks/useSites';
import { useAuth } from '../contexts/AuthContext';

const ConnectCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: sites, isLoading: sitesLoading } = useSites();
  const { mutate: updateSite } = useUpdateSite();
  const { isLoading: authLoading } = useAuth();
  const processedRef = useRef(false);
  const [status, setStatus] = React.useState<'processing' | 'error' | 'success'>('processing');
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  useEffect(() => {
    if (processedRef.current) return;
    if (authLoading || sitesLoading) return;

    const siteUrlParam = searchParams.get('site_url');
    const username = searchParams.get('user_login');
    const password = searchParams.get('password');

    if (!siteUrlParam || !username || !password) {
      setStatus('error');
      setErrorMsg('Ontbrekende parameters in callback.');
      return;
    }

    // normalize
    const normalize = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
    const target = normalize(decodeURIComponent(siteUrlParam));

    // try pending site id from localStorage first
    const pendingId = localStorage.getItem('pending_site_id');
    let matched = null;
    if (pendingId && sites) matched = sites.find(s => s.$id === pendingId);

    if (!matched && sites) {
      matched = sites.find(s => normalize((s.siteUrl || '') as string) === target);
    }

    if (!matched) {
      setStatus('error');
      setErrorMsg('Geen overeenkomende site gevonden om te updaten.');
      return;
    }

    processedRef.current = true;

    // If we're running on localhost or receive a disable_encryption flag, request plaintext storage for testing
    const disableEnc = window.location.hostname.includes('localhost') || searchParams.get('disable_encryption') === '1';

    updateSite({ siteId: matched.$id, username: username, password: decodeURIComponent(password) }, {
      onSuccess: () => {
        setStatus('success');
        // Store encryption preference in localStorage for backend to consume
        if (disableEnc) localStorage.setItem(`site_${matched.$id}_disable_encryption`, '1');
        setTimeout(() => navigate('/dashboard'), 1500);
      },
      onError: (err) => {
        setStatus('error');
        setErrorMsg(err.message);
      }
    });
  }, [searchParams, sites, sitesLoading, authLoading, updateSite, navigate]);

  if (status === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-secondary">
        <Loader2 className="w-16 h-16 animate-spin text-primary mb-4" />
        <h1 className="text-xl font-semibold">Verbinding verwerken</h1>
        <p className="text-muted-foreground mt-2">We bewaren je gegevens en leiden je terug naar het dashboard.</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-secondary">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-xl font-semibold">Verbinding Mislukt</h1>
        <p className="text-muted-foreground mt-2">{errorMsg}</p>
        <button onClick={() => navigate('/sites')} className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded">Terug naar sites</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-secondary">
      <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
      <h1 className="text-xl font-semibold">Verbinding Succesvol</h1>
      <p className="text-muted-foreground mt-2">Je wordt teruggestuurd naar het dashboard...</p>
    </div>
  );
};

export default ConnectCallback;
