import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Icon } from '../../shared/Icons';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

/**
 * DownloadPage - Desktop app download page after purchase
 */
export default function DownloadPage() {
  const { user, token: accessToken } = useAuth();
  const [downloadInfo, setDownloadInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detectedPlatform, setDetectedPlatform] = useState(null);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('mac')) {
      const isArmMac = ua.includes('arm') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      setDetectedPlatform(isArmMac ? 'mac-arm64' : 'mac-x64');
    } else if (ua.includes('win')) {
      setDetectedPlatform('windows-x64');
    } else {
      setDetectedPlatform('unknown');
    }
    checkDownloadAccess();
  }, []);

  const checkDownloadAccess = async () => {
    try {
      const token = accessToken;
      if (!token) { window.location.href = '/login'; return; }
      const response = await fetch(`${API_URL}/api/billing/download-access`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Failed to check download access');
      const data = await response.json();
      setDownloadInfo(data);
    } catch (err) {
      console.error('Failed to check download access:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (url) => { window.open(url, '_blank'); };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center landing-root">
        <div className="text-center"><Icon name="loader" size={48} className="animate-spin text-emerald-500 mx-auto mb-4" /><p className="text-gray-500 landing-body">Checking download access...</p></div>
        <style>{`.landing-root { -webkit-font-smoothing: antialiased; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; } .landing-body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center landing-root">
        <div className="text-center max-w-md p-8 rounded-lg border border-red-200 bg-red-50">
          <Icon name="alertTriangle" size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="landing-display text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-500 landing-body mb-4">{error}</p>
          <button onClick={() => window.location.href = '/capra/prepare'} className="px-6 py-2 rounded-lg bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 transition-colors landing-body">Go Home</button>
        </div>
        <style>{`.landing-root { -webkit-font-smoothing: antialiased; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; } .landing-display { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; } .landing-body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }`}</style>
      </div>
    );
  }

  if (!downloadInfo?.hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center landing-root">
        <div className="text-center max-w-md p-8 rounded-lg border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm">
          <Icon name="lock" size={48} className="text-yellow-500 mx-auto mb-4" />
          <h2 className="landing-display text-xl font-bold text-gray-900 mb-2">Purchase Required</h2>
          <p className="text-gray-500 landing-body mb-6">You need an Elite subscription to download the desktop app.</p>
          <button onClick={() => window.location.href = '/?pricing=true'} className="px-6 py-3 rounded-lg bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 transition-all hover:scale-105 landing-body">View Pricing</button>
        </div>
        <style>{`.landing-root { -webkit-font-smoothing: antialiased; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; } .landing-display { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; } .landing-body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }`}</style>
      </div>
    );
  }

  const { downloads, version, purchaseDate } = downloadInfo;
  const getRecommendedDownload = () => {
    if (detectedPlatform === 'mac-arm64') return { ...downloads.mac.arm64, key: 'mac-arm64' };
    if (detectedPlatform === 'mac-x64') return { ...downloads.mac.x64, key: 'mac-x64' };
    if (detectedPlatform === 'windows-x64') return { ...downloads.windows.x64, key: 'windows-x64' };
    return null;
  };
  const recommended = getRecommendedDownload();

  return (
    <div className="min-h-screen landing-root" style={{ background: 'linear-gradient(180deg, #fdf2f8 0%, #ede9fe 50%, #e0e7ff 100%)' }}>
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 border border-emerald-200 bg-emerald-50"><Icon name="check" size={16} className="text-emerald-500" /><span className="text-emerald-700 font-medium text-sm landing-body">Purchase Complete</span></div>
          <h1 className="landing-display text-4xl font-bold text-gray-900 mb-4 tracking-tight">Download <span className="bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">Camora Desktop</span></h1>
          <p className="text-gray-500 text-lg landing-body">Thank you for your purchase! Download the app for your platform below.</p>
          <p className="text-gray-400 text-sm mt-2 landing-mono">Version {version} -- Purchased {new Date(purchaseDate).toLocaleDateString()}</p>
        </div>

        {recommended && (
          <div className="mb-12">
            <h2 className="landing-display text-lg font-semibold text-gray-900 mb-4 text-center">Recommended for your system</h2>
            <div className="p-8 rounded-lg text-center cursor-pointer transition-all hover:scale-[1.02] border-2 border-emerald-500 bg-emerald-50/50 hover:shadow-sm" onClick={() => handleDownload(recommended.url)}>
              <div className="w-16 h-16 rounded-lg mx-auto mb-4 flex items-center justify-center bg-emerald-100 border border-emerald-200"><Icon name={detectedPlatform?.includes('mac') ? 'apple' : 'terminal'} size={32} className="text-emerald-600" /></div>
              <h3 className="landing-display text-xl font-bold text-gray-900 mb-2">{recommended.label}</h3>
              <p className="text-gray-400 text-sm mb-4 landing-body">{recommended.size}</p>
              <button className="px-8 py-3 rounded-lg bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 transition-colors landing-body"><span className="flex items-center gap-2"><Icon name="download" size={20} />Download Now</span></button>
            </div>
          </div>
        )}

        <div className="mb-12">
          <h2 className="landing-display text-lg font-semibold text-gray-900 mb-4">All Platforms</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-6 rounded-lg cursor-pointer transition-all hover:scale-[1.02] border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm" onClick={() => handleDownload(downloads.mac.arm64.url)}>
              <div className="w-12 h-12 rounded-lg mb-3 flex items-center justify-center bg-gray-50 border border-gray-200"><Icon name="apple" size={24} className="text-gray-400" /></div>
              <h3 className="landing-display font-semibold text-gray-900 mb-1">{downloads.mac.arm64.label}</h3>
              <p className="text-gray-500 text-sm mb-3 landing-body">M1, M2, M3 chips -- {downloads.mac.arm64.size}</p>
              <button className="flex items-center gap-2 text-emerald-500 text-sm font-medium landing-body"><Icon name="download" size={16} />Download .dmg</button>
            </div>
            <div className="p-6 rounded-lg cursor-pointer transition-all hover:scale-[1.02] border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm" onClick={() => handleDownload(downloads.mac.x64.url)}>
              <div className="w-12 h-12 rounded-lg mb-3 flex items-center justify-center bg-gray-50 border border-gray-200"><Icon name="apple" size={24} className="text-gray-400" /></div>
              <h3 className="landing-display font-semibold text-gray-900 mb-1">{downloads.mac.x64.label}</h3>
              <p className="text-gray-500 text-sm mb-3 landing-body">Intel processors -- {downloads.mac.x64.size}</p>
              <button className="flex items-center gap-2 text-emerald-500 text-sm font-medium landing-body"><Icon name="download" size={16} />Download .dmg</button>
            </div>
            <div className="p-6 rounded-lg cursor-pointer transition-all hover:scale-[1.02] border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm" onClick={() => handleDownload(downloads.windows.x64.url)}>
              <div className="w-12 h-12 rounded-lg mb-3 flex items-center justify-center bg-gray-50 border border-gray-200"><Icon name="terminal" size={24} className="text-gray-400" /></div>
              <h3 className="landing-display font-semibold text-gray-900 mb-1">{downloads.windows.x64.label}</h3>
              <p className="text-gray-500 text-sm mb-3 landing-body">Windows 10/11 -- {downloads.windows.x64.size}</p>
              <button className="flex items-center gap-2 text-emerald-500 text-sm font-medium landing-body"><Icon name="download" size={16} />Download .exe</button>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-lg border border-gray-200 bg-white">
          <h2 className="landing-display text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Icon name="book" size={20} className="text-emerald-500" />Installation Instructions</h2>
          <div className="space-y-4">
            <div><h3 className="landing-display font-medium text-gray-900 mb-2">macOS</h3><ol className="list-decimal list-inside space-y-1 text-sm text-gray-500 landing-body"><li>Open the downloaded .dmg file</li><li>Drag Ascend to your Applications folder</li><li>Right-click and select "Open" the first time (to bypass Gatekeeper)</li><li>Enter your API keys in Settings when prompted</li></ol></div>
            <div><h3 className="landing-display font-medium text-gray-900 mb-2">Windows</h3><ol className="list-decimal list-inside space-y-1 text-sm text-gray-500 landing-body"><li>Run the downloaded .exe installer</li><li>Follow the installation wizard</li><li>Launch Ascend from the Start Menu or Desktop</li><li>Enter your API keys in Settings when prompted</li></ol></div>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-lg border border-blue-200 bg-blue-50">
          <div className="flex items-start gap-3">
            <Icon name="info" size={20} className="text-blue-500 mt-0.5" />
            <div><h3 className="landing-display font-medium text-gray-900 mb-1">You'll need your own API keys</h3><p className="text-gray-500 text-sm landing-body">The desktop app uses your own API keys for unlimited usage. You can get keys from <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Anthropic</a> and <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">OpenAI</a>.</p></div>
          </div>
        </div>

        <div className="mt-8 text-center"><button onClick={() => window.location.href = '/capra/prepare'} className="text-gray-500 hover:text-gray-900 transition-colors landing-body">&larr; Back to Home</button></div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@300;400;500;600&display=swap');
        .landing-root { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
        .landing-display { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
        .landing-body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
        .landing-mono { font-family: 'IBM Plex Mono', monospace; }
      `}</style>
    </div>
  );
}
