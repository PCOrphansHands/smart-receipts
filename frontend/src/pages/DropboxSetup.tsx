import { useState, useEffect } from 'react';
import brain from 'brain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { DropboxStatusResponse } from 'types';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, FolderOpen, LogOut, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSelector from 'components/LanguageSelector';
import { useNavigate } from 'react-router-dom';
import { auth } from 'app/auth';

export default function DropboxSetup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [dropboxStatus, setDropboxStatus] = useState<DropboxStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [folderPath, setFolderPath] = useState<string>('/Smart Receipts');
  const [savingFolder, setSavingFolder] = useState<boolean>(false);

  // Check Dropbox status on mount
  useEffect(() => {
    checkDropboxStatus();
  }, []);

  const checkDropboxStatus = async () => {
    try {
      const response = await brain.get_dropbox_status();
      const data = await response.json();
      setDropboxStatus(data);

      // Load folder preference if connected
      if (data.connected) {
        loadFolderPreference();
      }
    } catch (error) {
      console.error('Failed to check Dropbox status:', error);
    }
  };

  const loadFolderPreference = async () => {
    try {
      const response = await brain.get_dropbox_folder();
      const data = await response.json();
      setFolderPath(data.folder_path);
    } catch (error) {
      console.error('Failed to load folder preference:', error);
    }
  };

  const saveFolderPreference = async (newPath: string) => {
    setSavingFolder(true);
    try {
      const response = await brain.set_dropbox_folder({ folder_path: newPath });
      const data = await response.json();
      setFolderPath(data.folder_path);
      toast.success('Folder preference saved');
    } catch (error) {
      console.error('Failed to save folder preference:', error);
      toast.error('Failed to save folder preference');
    } finally {
      setSavingFolder(false);
    }
  };

  const connectDropbox = async () => {
    try {
      setLoading(true);
      const response = await brain.get_dropbox_auth_url();
      const data = await response.json();
      // Open Dropbox OAuth in a popup window
      const popup = window.open(data.auth_url, '_blank', 'width=600,height=800');
      if (!popup) {
        throw new Error('Failed to open popup window');
      }

      // Monitor popup closure
      const checkPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopup);
          setLoading(false);
          // Refresh status after popup closes
          setTimeout(() => checkDropboxStatus(), 1000);
        }
      }, 500);
    } catch (error) {
      console.error('Dropbox auth start failed:', error);
      toast.error('Failed to start Dropbox authentication');
      setLoading(false);
    }
  };

  const disconnectDropbox = async () => {
    if (!confirm('Are you sure you want to disconnect your Dropbox account? You can reconnect anytime.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await brain.disconnect_dropbox();
      const data = await response.json();

      if (data.success) {
        toast.success('Dropbox disconnected successfully');
        setDropboxStatus({ connected: false, account_name: null });
      } else {
        toast.error('Failed to disconnect Dropbox');
      }
    } catch (error) {
      console.error('Dropbox disconnect failed:', error);
      toast.error('Failed to disconnect Dropbox');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Logo */}
      <header className="bg-white border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Smart Receipts Logo"
                className="h-12 w-auto"
              />
              <h1 className="text-2xl sm:text-3xl font-bold text-brand-primary">Smart Receipts</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <LanguageSelector />
              <Button variant="outline" size="sm" onClick={() => auth.signOut()}>
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('common.signOut')}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dropbox Setup</h1>
            <p className="text-gray-600">
              Connect your Dropbox account to automatically save processed receipts
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>
            ← Back to Home
          </Button>
        </div>

        {/* Dropbox Connection Card */}
        <div className="max-w-4xl mx-auto">
          <Card className="border-brand-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Dropbox Connection
                {dropboxStatus?.connected && (
                  <Badge className="bg-green-500">Connected</Badge>
                )}
              </CardTitle>
              <CardDescription>
                {dropboxStatus?.connected
                  ? `Connected as: ${dropboxStatus.account_name || 'Unknown'}`
                  : 'Connect your Dropbox to save receipts automatically'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!dropboxStatus?.connected ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Click the button below to connect your Dropbox account. You'll be able to choose which folder to use after connecting.
                  </p>
                  <Button
                    onClick={connectDropbox}
                    disabled={loading}
                    className="w-full bg-brand-primary hover:bg-brand-primary/90"
                  >
                    {loading ? 'Redirecting to Dropbox...' : 'Connect to Dropbox'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Folder selector */}
                  <div className="space-y-2">
                    <Label htmlFor="folder-path" className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4" />
                      Dropbox Folder
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="folder-path"
                        type="text"
                        value={folderPath}
                        onChange={(e) => setFolderPath(e.target.value)}
                        placeholder="/Smart Receipts"
                        className="flex-1"
                      />
                      <Button
                        onClick={() => saveFolderPreference(folderPath)}
                        disabled={savingFolder}
                        className="bg-brand-primary hover:bg-brand-primary/90"
                      >
                        {savingFolder ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save'
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Receipts will be uploaded to this folder in your Dropbox
                    </p>
                  </div>

                  {/* Open Dropbox button */}
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600 mb-3">
                      View your receipts folder in Dropbox
                    </p>
                    <Button
                      onClick={() => window.open(`https://www.dropbox.com/home${folderPath}`, '_blank')}
                      variant="outline"
                      className="w-full"
                    >
                      <FolderOpen className="w-4 h-4 mr-2" />
                      Open Dropbox Folder
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </Button>
                  </div>

                  {/* Disconnect button */}
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600 mb-3">
                      Connected to the wrong Dropbox account? You can disconnect and reconnect with a different one.
                    </p>
                    <Button
                      onClick={disconnectDropbox}
                      disabled={loading}
                      variant="destructive"
                      size="sm"
                      className="w-full"
                    >
                      {loading ? 'Disconnecting...' : 'Disconnect Dropbox'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
