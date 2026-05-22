import { useEffect } from 'react';

const AuthCallback = () => {
  useEffect(() => {
    // Parse the URL for the code
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const isZoom = window.location.pathname.includes('zoom');

    if (code) {
      // Send the code back to the opener window
      window.opener.postMessage(
        { type: isZoom ? 'ZOOM_AUTH_CODE' : 'MS_AUTH_CODE', code },
        window.location.origin
      );
      // Close the popup
      window.close();
    } else {
      console.error('No code found in URL');
      // Optionally notify the opener of failure
      window.opener.postMessage(
        { type: isZoom ? 'ZOOM_AUTH_ERROR' : 'MS_AUTH_ERROR', error: 'No code found' },
        window.location.origin
      );
      setTimeout(() => window.close(), 3000);
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <h2 className="text-xl font-semibold">Autenticando...</h2>
        <p className="text-muted-foreground text-sm">Esta ventana se cerrará automáticamente.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
