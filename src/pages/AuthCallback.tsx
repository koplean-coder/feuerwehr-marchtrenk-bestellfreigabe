import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '@/integrations/supabase/client';

export default function AuthCallback() {
  const navigate = useNavigate();

  const handleCallback = useCallback(async () => {
    if (!supabase) {
      navigate('/login');
      return;
    }

    // Parse URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    const errorCode = hashParams.get('error_code');

    // If there's an error, redirect to reset password page with the error
    if (errorCode) {
      navigate(`/passwort-zuruecksetzen${window.location.hash}`);
      return;
    }

    // Handle password recovery
    if (type === 'recovery') {
      // Extract session from URL and redirect to reset password page
      navigate(`/passwort-zuruecksetzen${window.location.hash}`);
      return;
    }

    // For other auth callbacks (email confirmation, etc.)
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Auth callback error:', error);
        navigate('/login');
        return;
      }

      if (data.session) {
        navigate('/', { replace: true });
      } else {
        navigate('/login');
      }
    } catch (err) {
      console.error('Auth callback error:', err);
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    handleCallback();
  }, [handleCallback]);

  return (
    <div data-ev-id="ev_cafc989cb6" className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-red-50 flex items-center justify-center">
      <div data-ev-id="ev_57bc8634b0" className="text-center">
        <div data-ev-id="ev_dd337e5a8e" className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <p data-ev-id="ev_50c640a5af" className="text-muted-foreground">Wird verarbeitet...</p>
      </div>
    </div>);

}