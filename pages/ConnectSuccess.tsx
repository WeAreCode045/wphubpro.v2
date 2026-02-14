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
    // Instead of processing and redirecting here, forward to the dedicated callback route
    if (processedRef.current) return;
    processedRef.current = true;

    const qs = searchParams.toString();
    // Preserve the query string when navigating to the callback page
    navigate(`/connect/callback${qs ? `?${qs}` : ''}`);
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