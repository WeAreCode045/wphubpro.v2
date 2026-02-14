import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useSites, useUpdateSite } from '../hooks/useSites';

const ConnectSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: sites, isLoading } = useSites();
  const { mutate: updateSite } = useUpdateSite();
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current || isLoading || !sites) return;

    const siteUrlParam = searchParams.get('site_url');
    const userLogin = searchParams.get('user_login');
    const apiKey = searchParams.get('api_key');

    if (siteUrlParam && apiKey) {
      const normalize = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
      const targetUrl = normalize(siteUrlParam);
      const matchingSite = sites.find(s => normalize(s.siteUrl) === targetUrl);

      processedRef.current = true;

      const payload: any = {
        username: userLogin || 'admin',
        api_key: apiKey,
        site_url: siteUrlParam,
      };

      if (matchingSite) payload.siteId = matchingSite.$id;

      // Save credentials; do not redirect the user further.
      updateSite(payload);
    }
  }, [searchParams, sites, isLoading, updateSite, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-secondary">
      <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
      <h1 className="text-2xl font-bold">Bridge Verbinding Voltooid</h1>
      <p className="text-muted-foreground">Uw site is nu beveiligd gekoppeld via de Bridge plugin.</p>
      <Loader2 className="w-6 h-6 animate-spin mt-4 text-primary" />
    </div>
  );
};

export default ConnectSuccess;