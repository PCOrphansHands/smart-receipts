import React, { useState, useEffect } from "react";
import { Mail, FolderOpen, Upload, ExternalLink, AlertCircle, CheckCircle2, Search, Loader2, LogOut } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import LanguageSelector from 'components/LanguageSelector';
import brain from "brain";
import type { DropboxReceiptsResponse, DropboxStatusResponse, GmailStatusResponse } from "types";
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { auth } from 'app/auth';
import { apiLogger } from 'utils/logger';

export default function App() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  
  const [receiptsData, setReceiptsData] = useState<DropboxReceiptsResponse | null>(null);
  const [dropboxStatus, setDropboxStatus] = useState<DropboxStatusResponse | null>(null);
  const [gmailStatus, setGmailStatus] = useState<GmailStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Check for OAuth callback query params
  useEffect(() => {
    const gmailParam = searchParams.get('gmail');
    const dropboxParam = searchParams.get('dropbox');

    // Handle Gmail OAuth callback
    if (gmailParam === 'success') {
      toast.success('Gmail connected successfully!');
      checkGmailStatus(); // Refresh status
      navigate('/', { replace: true });
    } else if (gmailParam === 'error') {
      toast.error('Failed to connect Gmail');
      navigate('/', { replace: true });
    }

    // Handle Dropbox OAuth callback
    if (dropboxParam === 'success') {
      toast.success('Dropbox connected successfully!');
      checkDropboxStatus(); // Refresh status
      navigate('/', { replace: true });
    } else if (dropboxParam === 'error') {
      toast.error('Failed to connect Dropbox');
      navigate('/', { replace: true });
    }
  }, [searchParams, navigate]);

  // Auto-load receipts when Dropbox is connected
  useEffect(() => {
    if (dropboxStatus?.connected && !receiptsData && !loading) {
      loadReceipts();
    }
  }, [dropboxStatus?.connected]);

  useEffect(() => {
    const loadStatuses = async () => {
      setLoadingStatus(true);
      await Promise.all([
        checkGmailStatus(),
        checkDropboxStatus()
      ]);
      setLoadingStatus(false);
    };
    loadStatuses();
  }, []);

  const checkGmailStatus = async () => {
    try {
      const response = await brain.get_gmail_status();
      const data = await response.json();
      setGmailStatus(data);
    } catch (error) {
      apiLogger.error("Failed to check Gmail status", error);
    }
  };

  const checkDropboxStatus = async () => {
    try {
      const statusResponse = await brain.get_dropbox_status();
      const statusData = await statusResponse.json();
      setDropboxStatus(statusData);
    } catch (error) {
      apiLogger.error("Failed to check Dropbox status", error);
    }
  };

  const loadReceipts = async () => {
    try {
      setLoading(true);
      const receiptsResponse = await brain.list_dropbox_receipts();
      const receiptsDataResult = await receiptsResponse.json();
      setReceiptsData(receiptsDataResult);
    } catch (error) {
      apiLogger.error("Failed to load receipts from Dropbox", error);
      toast.error('Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  const startGmailAuth = async () => {
    try {
      const response = await brain.start_gmail_auth();
      const data = await response.json();
      if (data.auth_url) {
        // Redirect to OAuth (will come back after auth completes)
        window.location.href = data.auth_url;
      }
    } catch (error) {
      apiLogger.error('Gmail authentication failed', error);
      toast.error('Failed to start Gmail authentication');
    }
  };

  const startDropboxAuth = async () => {
    try {
      const response = await brain.get_dropbox_auth_url();
      const data = await response.json();
      if (data.auth_url) {
        // Redirect to OAuth (will come back after auth completes)
        window.location.href = data.auth_url;
      }
    } catch (error) {
      apiLogger.error('Dropbox authentication failed', error);
      toast.error('Failed to start Dropbox authentication');
    }
  };

  const loadConnectionStatus = async () => {
    await Promise.all([checkGmailStatus(), checkDropboxStatus()]);
  };

  const receipts = receiptsData?.receipts || [];
  const totalReceipts = receiptsData?.total_count || 0;
  
  // Calculate stats
  const totalAmount = receipts.reduce((sum, r) => {
    const amount = parseFloat(r.amount || "0");
    return sum + amount;
  }, 0);
  
  // Recent receipts (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentReceipts = receipts.filter(r => {
    if (!r.modified_time) return false;
    const modifiedDate = new Date(r.modified_time);
    return modifiedDate >= sevenDaysAgo;
  });

  const isFirstTimeUser = !dropboxStatus?.connected;

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
              <h1 className="text-2xl sm:text-3xl font-bold text-brand-primary">{t('home.title')}</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <LanguageSelector />
              <Button
                variant="outline"
                size="sm"
                onClick={() => auth.signOut()}
                aria-label={t('common.signOut', 'Sign out')}
              >
                <LogOut className="w-4 h-4 sm:mr-2" aria-hidden="true" />
                <span className="hidden sm:inline">{t('common.signOut')}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Quick Actions - Prominent at top */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('home.quickActions.title')}</h2>
          {loadingStatus ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-3"></div>
              <p className="text-sm text-gray-600">{t('home.quickActions.checkingStatus')}</p>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Scan Gmail */}
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6 hover:border-brand-secondary hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Mail className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-medium text-gray-900">{t('home.quickActions.scanGmail.title')}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {t('home.quickActions.scanGmail.description')}
                  </p>
                  {!gmailStatus?.connected ? (
                    <Button
                      onClick={startGmailAuth}
                      size="sm"
                      className="w-full"
                    >
                      {t('home.quickActions.scanGmail.connectButton')}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => navigate('/GmailSetup')}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      {t('home.quickActions.scanGmail.scanButton')}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Upload Local Files */}
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6 hover:border-brand-secondary hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-50 rounded-lg">
                  <Upload className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-medium text-gray-900 mb-1">{t('home.quickActions.uploadFiles.title')}</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {t('home.quickActions.uploadFiles.description')}
                  </p>
                  <Button
                    onClick={() => navigate('/UploadReceipts')}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    {t('home.quickActions.uploadFiles.button')}
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Dropbox Setup */}
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6 hover:border-brand-secondary hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <FolderOpen className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-medium text-gray-900">Dropbox Setup</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {dropboxStatus?.connected
                      ? 'Manage your Dropbox connection and settings'
                      : 'Connect your Dropbox to save receipts automatically'}
                  </p>
                  {!dropboxStatus?.connected ? (
                    <Button
                      onClick={() => navigate('/dropbox-setup')}
                      size="sm"
                      className="w-full"
                    >
                      Connect Dropbox
                    </Button>
                  ) : (
                    <Button
                      onClick={() => navigate('/dropbox-setup')}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      Manage Settings
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* First-time user onboarding */}
        {isFirstTimeUser && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="text-base font-medium text-blue-900 mb-2">{t('home.welcome.title')}</h3>
                <p className="text-sm text-blue-800 mb-3">
                  {t('home.welcome.description')}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate('/GmailSetup')}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {t('home.welcome.setupGmailButton')}
                  </button>
                  <button
                    onClick={() => navigate('/UploadReceipts')}
                    className="px-4 py-2 bg-white text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors border border-blue-200"
                  >
                    {t('home.welcome.uploadButton')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Stats */}
        {!isFirstTimeUser && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('home.dashboard.title')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FolderOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('home.dashboard.totalReceipts')}</p>
                    <p className="text-2xl font-semibold tabular-nums text-gray-900">{totalReceipts}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('home.dashboard.last7Days')}</p>
                    <p className="text-2xl font-semibold tabular-nums text-gray-900">{recentReceipts.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <Mail className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('home.dashboard.totalSpent')}</p>
                    <p className="text-2xl font-semibold tabular-nums text-gray-900">${totalAmount.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {!isFirstTimeUser && receipts.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('home.recentReceipts.title')}</h2>
            <div className="space-y-3">
              {receipts.slice(0, 10).map((receipt, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg border border-gray-200 p-5 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-base font-medium text-gray-900">
                          {receipt.vendor || "Unknown Vendor"}
                        </h3>
                        {receipt.currency && receipt.currency !== "USD" && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            {receipt.currency}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-1 truncate">{receipt.filename}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {receipt.date && <span className="tabular-nums">{receipt.date}</span>}
                        {receipt.modified_time && (
                          <span className="text-xs">
                            Uploaded {new Date(receipt.modified_time).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {receipt.amount && (
                        <p className="text-lg font-semibold tabular-nums text-gray-900">
                          {receipt.currency && receipt.currency !== "USD" ? receipt.currency : "$"}{receipt.amount}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state - when connected but no receipts */}
        {!isFirstTimeUser && receipts.length === 0 && !loading && receiptsData === null && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-base font-medium text-gray-900 mb-2">Ready to View Your Receipts</h3>
            <p className="text-sm text-gray-600 mb-4">
              Click the button below to load your receipts from Dropbox.
            </p>
            <Button
              onClick={loadReceipts}
              className="px-6 py-2"
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Load Receipts
            </Button>
          </div>
        )}

        {/* Empty state - when receipts loaded but none found */}
        {!isFirstTimeUser && receipts.length === 0 && !loading && receiptsData !== null && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-base font-medium text-gray-900 mb-2">No Receipts Yet</h3>
            <p className="text-sm text-gray-600 mb-4">
              {receiptsData?.error || "Start by scanning your Gmail or uploading local receipt files."}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate('/GmailSetup')}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                Scan Gmail
              </button>
              <button
                onClick={() => navigate('/UploadReceipts')}
                className="px-4 py-2 bg-white text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
              >
                Upload Files
              </button>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Loading your receipts...</p>
          </div>
        )}
      </div>
    </div>
  );
}
