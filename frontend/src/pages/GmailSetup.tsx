import { useState, useEffect, useRef } from 'react';
import brain from 'brain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { ReceiptEmailsResponse, AttachmentsResponse, ProcessReceiptResponse, DropboxStatusResponse, ReceiptUploadStatus } from 'types';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, FileText, CheckCircle2, Upload, FolderOpen, LogOut, Filter, CheckCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSelector from 'components/LanguageSelector';
import { useNavigate } from 'react-router-dom';
import { auth } from 'app/auth';
import { useUserGuardContext } from 'app/auth/UserGuard';

export default function GmailSetup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUserGuardContext();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [emails, setEmails] = useState<ReceiptEmailsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [emailAttachments, setEmailAttachments] = useState<Record<string, AttachmentsResponse>>({});
  const [processingAttachment, setProcessingAttachment] = useState<string | null>(null);
  const [processedReceipts, setProcessedReceipts] = useState<Record<string, ProcessReceiptResponse>>({});
  const [processingEmailBody, setProcessingEmailBody] = useState<string | null>(null);
  const [dropboxStatus, setDropboxStatus] = useState<DropboxStatusResponse | null>(null);
  const [uploadingToDropbox, setUploadingToDropbox] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<string>('/Smart Receipts');
  const [savingFolder, setSavingFolder] = useState<boolean>(false);
  const [uploadStatuses, setUploadStatuses] = useState<Record<string, ReceiptUploadStatus>>({});
  const [showUploaded, setShowUploaded] = useState<boolean>(true);
  const hasCheckedStatus = useRef(false);

  // Check Gmail connection status on mount (only once)
  useEffect(() => {
    const checkGmailStatus = async () => {
      if (hasCheckedStatus.current) return;
      hasCheckedStatus.current = true;
      
      try {
        const response = await brain.get_gmail_status();
        const data = await response.json();
        setIsAuthenticated(data.connected);
      } catch (error) {
        console.error('Failed to check Gmail status:', error);
      }
    };
    
    checkGmailStatus();
  }, []);

  // Check Dropbox status on mount
  useEffect(() => {
    checkDropboxStatus();
  }, []);

  // Load upload statuses when emails change
  useEffect(() => {
    if (emails && emails.emails.length > 0) {
      loadUploadStatuses();
    }
  }, [emails]);

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

  const loadUploadStatuses = async () => {
    if (!emails) return;

    try {
      // Generate receipt keys for all emails
      const receiptKeys: string[] = [];
      emails.emails.forEach(email => {
        if (email.has_attachments && emailAttachments[email.email_id]) {
          emailAttachments[email.email_id].attachments.forEach(attachment => {
            receiptKeys.push(`${email.email_id}_${attachment.filename}`);
          });
        } else if (!email.has_attachments) {
          receiptKeys.push(`${email.email_id}_body`);
        }
      });

      if (receiptKeys.length === 0) return;

      const response = await brain.get_upload_status({ receipt_keys: receiptKeys });
      const data = await response.json();

      if (data.success) {
        setUploadStatuses(data.statuses || {});
      }
    } catch (error) {
      console.error('Failed to load upload statuses:', error);
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
    } catch (error) {
      console.error('Dropbox auth start failed:', error);
      toast.error('Failed to start Dropbox authentication');
    } finally {
      setLoading(false);
    }
  };

  const uploadToDropbox = async (receiptKey: string) => {
    const receipt = processedReceipts[receiptKey];
    if (!receipt || !receipt.pdf_content || !receipt.suggested_filename) {
      toast.error('Receipt not ready for upload');
      return;
    }

    setUploadingToDropbox(receiptKey);
    try {
      const receiptData = receipt.receipt_data;
      const hasUsdConversion = receiptData?.usd_amount && receiptData?.currency && receiptData.currency.toUpperCase() !== 'USD';
      const dropboxPaths: string[] = [];

      // Upload original file
      const response = await brain.upload_to_dropbox({
        file_content: receipt.pdf_content,
        filename: receipt.suggested_filename,
        folder_path: folderPath
      });
      const data = await response.json();

      if (!data.success) {
        toast.error(data.error || 'Failed to upload to Dropbox');
        return;
      }

      dropboxPaths.push(data.dropbox_path);
      let message = `Uploaded to Dropbox: ${data.dropbox_path}`;

      // If there's a USD conversion, upload a second PDF with USD amount in filename
      if (hasUsdConversion && receiptData) {
        const vendor = receiptData.vendor || 'Unknown';
        const date = receiptData.date || 'Unknown';
        const usdAmount = receiptData.usd_amount;

        // Sanitize vendor name
        const safeVendor = vendor.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s/g, '_').substring(0, 30);
        const usdFilename = `${safeVendor}_${date}_${usdAmount}USD.pdf`;

        const usdResponse = await brain.upload_to_dropbox({
          file_content: receipt.pdf_content, // Same PDF content, different filename
          filename: usdFilename,
          folder_path: folderPath
        });
        const usdData = await usdResponse.json();

        if (usdData.success) {
          dropboxPaths.push(usdData.dropbox_path);
          message = `Uploaded 2 PDFs (original + USD): ${data.dropbox_path}`;
        } else {
          message += ` (USD version failed: ${usdData.error})`;
        }
      }

      // Mark as uploaded in database
      try {
        const sourceType = receiptKey.endsWith('_body') ? 'gmail_body' : 'gmail_attachment';
        await brain.mark_receipt_uploaded({
          receipt_key: receiptKey,
          dropbox_paths: dropboxPaths,
          receipt_metadata: receiptData ? {
            vendor: receiptData.vendor,
            date: receiptData.date,
            amount: receiptData.amount,
            currency: receiptData.currency,
          } : undefined,
          source_type: sourceType,
        });

        // Update local state to show as uploaded
        setUploadStatuses(prev => ({
          ...prev,
          [receiptKey]: {
            receipt_key: receiptKey,
            uploaded_to_dropbox: true,
            upload_timestamp: new Date().toISOString(),
            dropbox_paths: dropboxPaths,
            receipt_metadata: receiptData ? {
              vendor: receiptData.vendor,
              date: receiptData.date,
              amount: receiptData.amount,
              currency: receiptData.currency,
            } : undefined,
            source_type: sourceType,
          }
        }));
      } catch (trackError) {
        console.error('Failed to track upload status:', trackError);
        // Don't fail the upload if tracking fails
      }

      toast.success(message);
    } catch (error) {
      console.error('Failed to upload to Dropbox:', error);
      toast.error('Failed to upload to Dropbox');
    } finally {
      setUploadingToDropbox(null);
    }
  };

  const startAuth = async () => {
    try {
      // Check if user is authenticated before starting OAuth
      if (!user) {
        toast.error('Please log in to connect your Gmail account.');
        navigate('/auth/sign-in');
        return;
      }
      
      console.log('Starting Gmail auth...');
      setLoading(true);
      console.log('Calling brain.start_gmail_auth()...');
      
      const response = await brain.start_gmail_auth();
      console.log('Got response:', response.status);
      
      // Check for auth errors
      if (response.status === 401) {
        console.log('Got 401, session expired');
        toast.error('Your session has expired. Please log in again.');
        navigate('/auth/sign-in');
        return;
      }
      
      if (!response.ok) {
        console.error('Response not ok:', response.status);
        throw new Error(`Failed to start Gmail auth: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Got auth URL:', data.auth_url);
      console.log('Opening popup window...');
      
      // Open Gmail OAuth in a popup window
      const popup = window.open(data.auth_url, 'gmailAuth', 'width=600,height=800,scrollbars=yes');
      if (!popup) {
        console.error('Popup was blocked!');
        throw new Error('Popup was blocked. Please allow popups for this site.');
      }
      
      console.log('Popup opened successfully');
      
      // Monitor popup closure
      const checkPopup = setInterval(() => {
        if (popup.closed) {
          console.log('Popup was closed');
          clearInterval(checkPopup);
          setLoading(false);
        }
      }, 500);
      
    } catch (error) {
      console.error('Gmail auth start failed:', error);
      // Check if it's a 401 error from the response
      if (error instanceof Response && error.status === 401) {
        console.log('Caught 401 error, redirecting to login');
        toast.error('Your session has expired. Please log in again.');
        navigate('/auth/sign-in');
      } else if (typeof error === 'object' && error !== null && 'status' in error && error.status === 401) {
        console.log('Caught 401 in error object, redirecting to login');
        toast.error('Your session has expired. Please log in again.');
        navigate('/auth/sign-in');
      } else {
        toast.error('Failed to start Gmail authentication. Please try again.');
      }
      setLoading(false);
    }
  };

  const scanEmails = async () => {
    setLoading(true);
    try {
      // Convert dates from YYYY-MM-DD to YYYY/MM/DD format for Gmail
      const params: { start_date?: string; end_date?: string } = {};
      
      if (startDate) {
        params.start_date = startDate.replace(/-/g, '/');
      }
      if (endDate) {
        params.end_date = endDate.replace(/-/g, '/');
      }
      
      const response = await brain.scan_receipt_emails(params);
      const data = await response.json();
      console.log('Scanned emails:', data);
      console.log('First email has_attachments:', data.emails[0]?.has_attachments);
      setEmails(data);
      toast.success(`Found ${data.count} receipt emails!`);
    } catch (error) {
      toast.error("Failed to scan emails");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEmailExpansion = async (emailId: string) => {
    if (expandedEmail === emailId) {
      setExpandedEmail(null);
    } else {
      setExpandedEmail(emailId);
      // Fetch attachments if not already loaded
      if (!emailAttachments[emailId]) {
        try {
          const response = await brain.get_email_attachments({ emailId });
          const data = await response.json();
          setEmailAttachments(prev => ({ ...prev, [emailId]: data }));
        } catch (error) {
          console.error('Failed to fetch attachments:', error);
          toast.error('Failed to load attachments');
        }
      }
    }
  };

  const processReceipt = async (emailId: string, filename: string) => {
    const attachmentKey = `${emailId}_${filename}`;
    setProcessingAttachment(attachmentKey);
    
    try {
      const response = await brain.process_gmail_receipt({
        email_id: emailId,
        attachment_filename: filename
      });
      const data = await response.json();
      
      if (data.success) {
        setProcessedReceipts(prev => ({ ...prev, [attachmentKey]: data }));
        toast.success(`Receipt processed! ${data.suggested_filename || 'Data extracted'}`);
      } else {
        toast.error(data.error || 'Failed to process receipt');
      }
    } catch (error) {
      console.error('Failed to process receipt:', error);
      toast.error('Failed to process receipt');
    } finally {
      setProcessingAttachment(null);
    }
  };

  const processEmailBody = async (emailId: string) => {
    const emailKey = `${emailId}_body`;
    setProcessingEmailBody(emailKey);
    
    try {
      // Find the email to get its date
      const email = emails?.emails.find(e => e.email_id === emailId);
      
      // Parse email date and format to DD.MM.YYYY
      let formattedDate: string | undefined;
      if (email?.date) {
        try {
          const emailDate = new Date(email.date);
          const day = String(emailDate.getDate()).padStart(2, '0');
          const month = String(emailDate.getMonth() + 1).padStart(2, '0');
          const year = emailDate.getFullYear();
          formattedDate = `${day}.${month}.${year}`;
          console.log('Formatted email date as fallback:', formattedDate);
        } catch (e) {
          console.warn('Failed to parse email date:', e);
        }
      }
      
      const response = await brain.process_email_body({
        email_id: emailId,
        email_date: formattedDate
      });
      const data = await response.json();
      
      if (data.success) {
        setProcessedReceipts(prev => ({ ...prev, [emailKey]: data }));
        toast.success(`Email processed! ${data.suggested_filename || 'Data extracted'}`);
      } else {
        toast.error(data.error || 'Failed to process email body');
      }
    } catch (error) {
      console.error('Failed to process email body:', error);
      toast.error('Failed to process email body');
    } finally {
      setProcessingEmailBody(null);
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
        <>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">{t('gmailSetup.title')}</h1>
              <p className="text-gray-600">
                {t('gmailSetup.subtitle')}
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/')}>
              ← {t('gmailSetup.backButton')}
            </Button>
          </div>

          {/* Authentication Card */}
          <div className="max-w-4xl mx-auto space-y-6 pb-8">
            {/* Gmail Connection Card - Hide when connected */}
            {!isAuthenticated && (
              <Card className="border-brand-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {t('gmailSetup.gmailSection.title')}
                  </CardTitle>
                  <CardDescription>
                    {t('gmailSetup.gmailSection.title')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Click the button below to authorize Smart Receipts to access your Gmail. 
                      You'll be redirected to Google to grant permissions, then automatically returned here.
                    </p>
                    <Button 
                      onClick={startAuth} 
                      disabled={loading}
                      className="w-full bg-brand-primary hover:bg-brand-primary/90"
                    >
                      {loading ? 'Redirecting to Google...' : t('gmailSetup.gmailSection.connect')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Dropbox Connection Card */}
            {isAuthenticated && (
              <Card className="border-brand-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {t('gmailSetup.dropboxSection.title')}
                    {dropboxStatus?.connected && (
                      <Badge className="bg-green-500">{t('gmailSetup.dropboxSection.connected')}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {t('gmailSetup.dropboxSection.title')}
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
                        {loading ? 'Redirecting to Dropbox...' : t('gmailSetup.dropboxSection.connect')}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Hide connected status message, only show folder selector */}
                      <div className="space-y-2">
                        <Label htmlFor="folder-path" className="flex items-center gap-2">
                          <FolderOpen className="w-4 h-4" />
                          {t('gmailSetup.dropboxSection.folder')}
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
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Scan Receipts Card */}
            {isAuthenticated && (
              <Card className="border-brand-primary/20">
                <CardHeader>
                  <CardTitle>{t('gmailSetup.scanSection.title')}</CardTitle>
                  <CardDescription>
                    {t('gmailSetup.scanSection.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label htmlFor="start-date">{t('gmailSetup.scanSection.startDate')}</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-date">{t('gmailSetup.scanSection.endDate')}</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={scanEmails} 
                    disabled={loading}
                    className="w-full bg-brand-primary hover:bg-brand-primary/90"
                  >
                    {loading ? t('gmailSetup.scanSection.scanning') : t('gmailSetup.scanSection.scanButton')}
                  </Button>

                  {emails && (
                    <div className="space-y-4 mt-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">{t('gmailSetup.scanSection.foundReceipts').replace('{count}', emails.count.toString())}</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowUploaded(!showUploaded)}
                          className="gap-2"
                        >
                          <Filter className="w-4 h-4" />
                          {showUploaded ? 'Hide Uploaded' : 'Show Uploaded'}
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        {emails.emails.filter((email) => {
                          // Generate receipt key for this email
                          let receiptKey: string;
                          if (email.has_attachments && emailAttachments[email.email_id]) {
                            // For attachments, check if ANY attachment is uploaded
                            const anyUploaded = emailAttachments[email.email_id].attachments.some(attachment => {
                              const key = `${email.email_id}_${attachment.filename}`;
                              return uploadStatuses[key]?.uploaded_to_dropbox;
                            });
                            return showUploaded || !anyUploaded;
                          } else {
                            // For email body
                            receiptKey = `${email.email_id}_body`;
                            const isUploaded = uploadStatuses[receiptKey]?.uploaded_to_dropbox;
                            return showUploaded || !isUploaded;
                          }
                        }).map((email) => {
                          // Check if this email has any uploaded receipts
                          let hasUploadedReceipts = false;
                          if (email.has_attachments && emailAttachments[email.email_id]) {
                            hasUploadedReceipts = emailAttachments[email.email_id].attachments.some(attachment => {
                              const key = `${email.email_id}_${attachment.filename}`;
                              return uploadStatuses[key]?.uploaded_to_dropbox;
                            });
                          } else {
                            const emailKey = `${email.email_id}_body`;
                            hasUploadedReceipts = uploadStatuses[emailKey]?.uploaded_to_dropbox || false;
                          }

                          return (
                          <Card key={email.email_id} className="border-gray-200">
                            <CardContent className="p-4">
                              <div className="space-y-2">
                                <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-gray-900">
                                      {email.subject}
                                    </h4>
                                    <p className="text-sm text-gray-600 mt-1">
                                      From: {email.sender}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {email.date}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {hasUploadedReceipts && (
                                      <Badge className="bg-green-500 text-white gap-1">
                                        <CheckCheck className="w-3 h-3" />
                                        Uploaded
                                      </Badge>
                                    )}
                                    {email.has_attachments && (
                                      <Badge variant="outline">
                                        {email.attachment_count} attachment{email.attachment_count !== 1 ? 's' : ''}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                
                                {email.has_attachments && (
                                  <div className="mt-3">
                                    <Button
                                      onClick={() => toggleEmailExpansion(email.email_id)}
                                      variant="outline"
                                      size="sm"
                                      className="w-full"
                                    >
                                      {expandedEmail === email.email_id ? 'Hide' : 'View'} Attachments
                                    </Button>
                                    
                                    {expandedEmail === email.email_id && emailAttachments[email.email_id] && (
                                      <div className="mt-3 space-y-2 border-t pt-3">
                                        {emailAttachments[email.email_id].attachments.map((attachment, idx) => {
                                          const attachmentKey = `${email.email_id}_${attachment.filename}`;
                                          const processed = processedReceipts[attachmentKey];
                                          const isProcessing = processingAttachment === attachmentKey;
                                          
                                          return (
                                            <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                              <div className="flex items-center gap-2 flex-1 min-w-0 w-full">
                                                <FileText className="w-4 h-4 text-gray-500" />
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-sm font-medium truncate">{attachment.filename}</p>
                                                  <p className="text-xs text-gray-500">
                                                    {attachment.mime_type} • {(attachment.size / 1024).toFixed(1)} KB
                                                  </p>
                                                  {processed?.success && processed.receipt_data && (
                                                    <div className="mt-2 text-xs space-y-1">
                                                      <p className="text-green-600 font-medium flex items-center gap-1">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Processed
                                                      </p>
                                                      <p><span className="font-medium">Vendor:</span> {processed.receipt_data.vendor}</p>
                                                      <p><span className="font-medium">Date:</span> {processed.receipt_data.date}</p>
                                                      <p><span className="font-medium">Amount:</span> {processed.receipt_data.amount} {processed.receipt_data.currency}</p>
                                                      {processed.receipt_data.usd_amount && processed.receipt_data.exchange_rate && (
                                                        <p className="text-blue-600 font-medium">
                                                          💱 USD: ${processed.receipt_data.usd_amount} 
                                                          <span className="text-gray-500">
                                                            (rate: {processed.receipt_data.exchange_rate.toFixed(4)})
                                                          </span>
                                                        </p>
                                                      )}
                                                      <p><span className="font-medium">Filename:</span> {processed.suggested_filename}</p>
                                                      {processed.receipt_data.usd_amount && (
                                                        <p className="text-orange-600 text-xs">
                                                          🗂️ Will upload 2 PDFs to Dropbox
                                                        </p>
                                                      )}
                                                      {dropboxStatus?.connected && (
                                                        <Button
                                                          onClick={() => uploadToDropbox(attachmentKey)}
                                                          disabled={uploadingToDropbox === attachmentKey || uploadStatuses[attachmentKey]?.uploaded_to_dropbox}
                                                          size="sm"
                                                          className={`mt-2 w-full ${uploadStatuses[attachmentKey]?.uploaded_to_dropbox ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'}`}
                                                        >
                                                          {uploadingToDropbox === attachmentKey ? (
                                                            <>
                                                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                              Uploading...
                                                            </>
                                                          ) : uploadStatuses[attachmentKey]?.uploaded_to_dropbox ? (
                                                            <>
                                                              <CheckCheck className="w-3 h-3 mr-1" />
                                                              Uploaded to Dropbox
                                                            </>
                                                          ) : (
                                                            <>
                                                              <Upload className="w-3 h-3 mr-1" />
                                                              Upload to Dropbox
                                                            </>
                                                          )}
                                                        </Button>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                              <Button
                                                onClick={() => processReceipt(email.email_id, attachment.filename)}
                                                disabled={isProcessing || !!processed?.success}
                                                size="sm"
                                                className="bg-brand-primary hover:bg-brand-primary/90 w-full sm:w-auto shrink-0"
                                              >
                                                {isProcessing ? (
                                                  <>
                                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                    Processing...
                                                  </>
                                                ) : processed?.success ? (
                                                  'Processed'
                                                ) : (
                                                  'Process'
                                                )}
                                              </Button>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {!email.has_attachments && (
                                  <div className="mt-3">
                                    {(() => {
                                      const emailKey = `${email.email_id}_body`;
                                      const processed = processedReceipts[emailKey];
                                      const isProcessing = processingEmailBody === emailKey;
                                      
                                      return (
                                        <div className="space-y-2">
                                          <Button
                                            onClick={() => processEmailBody(email.email_id)}
                                            disabled={isProcessing || !!processed?.success}
                                            size="sm"
                                            className="w-full bg-brand-primary hover:bg-brand-primary/90"
                                          >
                                            {isProcessing ? (
                                              <>
                                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                Converting & Processing...
                                              </>
                                            ) : processed?.success ? (
                                              <>
                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                Processed
                                              </>
                                            ) : (
                                              'Convert & Process Email'
                                            )}
                                          </Button>
                                          
                                          {processed?.success && processed.receipt_data && (
                                            <div className="p-3 bg-green-50 rounded-lg text-xs space-y-1">
                                              <p className="text-green-600 font-medium flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Email Processed
                                              </p>
                                              <p><span className="font-medium">Vendor:</span> {processed.receipt_data.vendor}</p>
                                              <p><span className="font-medium">Date:</span> {processed.receipt_data.date}</p>
                                              <p><span className="font-medium">Amount:</span> {processed.receipt_data.amount} {processed.receipt_data.currency}</p>
                                              <p><span className="font-medium">Filename:</span> {processed.suggested_filename}</p>
                                              {dropboxStatus?.connected && (
                                                <Button
                                                  onClick={() => uploadToDropbox(emailKey)}
                                                  disabled={uploadingToDropbox === emailKey || uploadStatuses[emailKey]?.uploaded_to_dropbox}
                                                  size="sm"
                                                  className={`mt-2 w-full ${uploadStatuses[emailKey]?.uploaded_to_dropbox ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'}`}
                                                >
                                                  {uploadingToDropbox === emailKey ? (
                                                    <>
                                                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                      Uploading...
                                                    </>
                                                  ) : uploadStatuses[emailKey]?.uploaded_to_dropbox ? (
                                                    <>
                                                      <CheckCheck className="w-3 h-3 mr-1" />
                                                      Uploaded to Dropbox
                                                    </>
                                                  ) : (
                                                    <>
                                                      <Upload className="w-3 h-3 mr-1" />
                                                      Upload to Dropbox
                                                    </>
                                                  )}
                                                </Button>
                                              )}
                                            </div>
                                          )}
                                          
                                          {processed && !processed.success && (
                                            <div className="p-3 bg-red-50 rounded-lg text-xs">
                                              <p className="text-red-600">{processed.error || 'Failed to process email'}</p>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </>
      </div>
    </div>
  );
}
