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
    // Voorkom dubbele uitvoering en wacht tot sites geladen zijn
    if (processedRef.current || isLoading || !sites) return;

    const siteUrlParam = searchParams.get('site_url');
    const username = searchParams.get('user_login');
    const password = searchParams.get('password');

    if (siteUrlParam && username && password) {
      // Normaliseer URLs voor een betrouwbare match (verwijder trailing slashes en protocols)
      const normalize = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const targetUrl = normalize(siteUrlParam);

      const matchingSite = sites.find(s => normalize(s.siteUrl) === targetUrl);

      if (matchingSite) {
        processedRef.current = true;
        
        // Trigger de update-site functie via de hook
        updateSite({
          siteId: matchingSite.$id,
          username: username,
          password: password,
        });

        // Redirect na opslaan
        const timer = setTimeout(() => {
          navigate('/dashboard');
        }, 3000);

        return () => clearTimeout(timer);
      }
    }
  }, [searchParams, sites, isLoading, updateSite, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-secondary">
      <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
      <h1 className="text-2xl font-bold text-foreground mb-2">Connectie Geslaagd</h1>
      <p className="text-muted-foreground mb-8">
        De site is succesvol gekoppeld. Gegevens worden veilig opgeslagen...
      </p>
      <div className="flex items-center gap-2 text-primary">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Bezig met verwerken...</span>
      </div>
    </div>
  );
};

export default ConnectSuccess;