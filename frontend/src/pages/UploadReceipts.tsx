import { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Loader2, Camera, LogOut, Filter, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import brain from 'brain';
import type { UploadedReceiptResponse, ReceiptUploadStatus } from 'types';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSelector from 'components/LanguageSelector';
import CameraCapture from 'components/CameraCapture';
import jsPDF from 'jspdf';
import { auth } from 'app/auth';
import { apiLogger, uiLogger } from 'utils/logger';
import CategorySelect from 'components/CategorySelect';
import { useUserGuardContext } from 'app/auth/UserGuard';

interface ProcessedFile {
  id: string;
  originalName: string;
  status: 'processing' | 'success' | 'error' | 'uploaded';
  data?: UploadedReceiptResponse;
  error?: string;
  uploadTimestamp?: string;
  dropboxPaths?: string[];
}

export default function UploadReceipts() {
  const { t } = useTranslation();
  const { user } = useUserGuardContext();
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [folderPath, setFolderPath] = useState<string>('/Smart_Receipts');
  const [showCamera, setShowCamera] = useState(false);
  const [showUploaded, setShowUploaded] = useState<boolean>(true);
  const [defaultCategory, setDefaultCategory] = useState<string>('Uncategorized');
  const navigate = useNavigate();

  // Fetch user's saved folder preference on mount
  useEffect(() => {
    const fetchFolderPreference = async () => {
      try {
        const response = await brain.get_dropbox_folder();
        const data = await response.json();
        if (data.folder_path) {
          setFolderPath(data.folder_path);
        }
      } catch (error) {
        apiLogger.error('Failed to fetch folder preference', error);
      }
    };
    fetchFolderPreference();
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    await processFiles(droppedFiles);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      await processFiles(selectedFiles);
    }
  };

  const processFiles = async (filesToProcess: File[]) => {
    // Filter for PDFs and images only
    const validFiles = filesToProcess.filter(file => 
      file.type === 'application/pdf' || 
      file.type.startsWith('image/')
    );

    if (validFiles.length === 0) {
      toast.error('Please upload PDF or image files only');
      return;
    }

    // Create initial file entries
    const newFiles: ProcessedFile[] = validFiles.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      originalName: file.name,
      status: 'processing' as const,
    }));

    setFiles(prev => [...prev, ...newFiles]);

    // Process each file
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const fileId = newFiles[i].id;

      try {
        const response = await brain.process_uploaded_receipt({ file });
        const data: UploadedReceiptResponse = await response.json();

        setFiles(prev => prev.map(f => 
          f.id === fileId 
            ? { ...f, status: data.success ? 'success' : 'error', data, error: data.error }
            : f
        ));

        if (data.success) {
          toast.success(`Processed: ${data.suggested_filename || file.name}`);
        } else {
          toast.error(`Failed to process ${file.name}: ${data.error}`);
        }
      } catch (error) {
        apiLogger.error('Failed to process uploaded file', { fileName: file.name, error });
        setFiles(prev => prev.map(f =>
          f.id === fileId
            ? { ...f, status: 'error', error: 'Failed to upload file' }
            : f
        ));
        toast.error(`Failed to process ${file.name}`);
      }
    }
  };

  const handleCameraCapture = async (base64Image: string) => {
    setShowCamera(false);
    
    const fileId = `camera-${Date.now()}`;
    const fileName = `camera-receipt-${Date.now()}.jpg`;
    
    // Add to files list as processing
    setFiles(prev => [...prev, {
      id: fileId,
      originalName: fileName,
      status: 'processing' as const,
    }]);

    try {
      // Extract receipt data using OpenAI Vision
      const extractResponse = await brain.extract_receipt_data({
        image_base64: base64Image,
      });
      const extractData = await extractResponse.json();

      if (!extractData.success || !extractData.data) {
        throw new Error(extractData.error || 'Failed to extract receipt data');
      }

      const receiptData = extractData.data;
      
      // Generate suggested filename
      const vendor = receiptData.vendor || 'Unknown';
      const date = receiptData.date || 'Unknown';
      const amount = receiptData.amount || '0';
      const suggestedFilename = `${vendor}_${date}_${amount}.pdf`;

      // Convert image to PDF using jsPDF
      const pdf = new jsPDF();
      const img = new Image();
      img.src = `data:image/jpeg;base64,${base64Image}`;
      
      await new Promise((resolve) => {
        img.onload = () => {
          const imgWidth = 190; // A4 width minus margins
          const imgHeight = (img.height * imgWidth) / img.width;
          pdf.addImage(img, 'JPEG', 10, 10, imgWidth, imgHeight);
          resolve(null);
        };
      });

      // Get PDF as base64
      const pdfBase64 = pdf.output('datauristring').split(',')[1];

      // Update file status with extracted data
      setFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { 
              ...f, 
              status: 'success', 
              data: {
                success: true,
                receipt_data: receiptData,
                suggested_filename: suggestedFilename,
                pdf_content: pdfBase64,
                original_filename: fileName,
              }
            }
          : f
      ));

      toast.success(`Captured and processed: ${suggestedFilename}`);
    } catch (error) {
      apiLogger.error('Failed to process camera image', error);
      setFiles(prev => prev.map(f =>
        f.id === fileId
          ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Failed to process image' }
          : f
      ));
      toast.error('Failed to process camera image');
    }
  };

  const uploadAllToDropbox = async () => {
    const successfulFiles = files.filter(f => f.status === 'success' && f.data?.pdf_content);

    if (successfulFiles.length === 0) {
      toast.error('No processed files to upload');
      return;
    }

    setIsUploading(true);
    let uploaded = 0;
    let failed = 0;

    for (const file of successfulFiles) {
      try {
        const receiptData = file.data!.receipt_data;
        const hasUsdConversion = receiptData?.usd_amount && receiptData?.currency && receiptData.currency.toUpperCase() !== 'USD';
        const dropboxPaths: string[] = [];

        // Upload original file
        const originalFilename = file.data!.suggested_filename || file.originalName;
        const response = await brain.upload_to_dropbox({
          filename: originalFilename,
          file_content: file.data!.pdf_content!,
          folder_path: folderPath,
        });
        const result = await response.json();

        if (!result.success) {
          failed++;
          toast.error(`Failed to upload ${originalFilename}`);
          continue;
        }

        dropboxPaths.push(result.dropbox_path);
        uploaded++;

        // If there's a USD conversion, upload a second PDF with USD amount in filename
        if (hasUsdConversion && receiptData) {
          const vendor = receiptData.vendor || 'Unknown';
          const date = receiptData.date || 'Unknown';
          const usdAmount = receiptData.usd_amount;

          // Sanitize vendor name
          const safeVendor = vendor.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s/g, '_').substring(0, 30);
          const usdFilename = `${safeVendor}_${date}_${usdAmount}USD.pdf`;

          const usdResponse = await brain.upload_to_dropbox({
            filename: usdFilename,
            file_content: file.data!.pdf_content!, // Same PDF content, different filename
            folder_path: folderPath,
          });
          const usdResult = await usdResponse.json();

          if (usdResult.success) {
            dropboxPaths.push(usdResult.dropbox_path);
            uploaded++;
            uiLogger.debug(`Uploaded USD version: ${usdFilename}`);
          } else {
            failed++;
            toast.error(`Failed to upload USD version of ${file.originalName}`);
          }
        }

        // Mark as uploaded in database
        try {
          await brain.mark_receipt_uploaded({
            receipt_key: file.id,
            dropbox_paths: dropboxPaths,
            receipt_metadata: receiptData ? {
              vendor: receiptData.vendor,
              date: receiptData.date,
              amount: receiptData.amount,
              currency: receiptData.currency,
            } : undefined,
            source_type: 'upload',
            category: defaultCategory,
            uploaded_by_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Unknown',
            uploaded_by_email: user?.email || 'unknown@example.com',
          });

          // Update file status to uploaded
          setFiles(prev => prev.map(f => f.id === file.id ? {
            ...f,
            status: 'uploaded',
            uploadTimestamp: new Date().toISOString(),
            dropboxPaths: dropboxPaths,
          } : f));
        } catch (trackError) {
          apiLogger.warn('Failed to track upload status in database', trackError);
          // Still mark as uploaded locally even if tracking fails
          setFiles(prev => prev.map(f => f.id === file.id ? {
            ...f,
            status: 'uploaded',
            uploadTimestamp: new Date().toISOString(),
            dropboxPaths: dropboxPaths,
          } : f));
        }

      } catch (error) {
        failed++;
        apiLogger.error('Failed to upload file to Dropbox', { fileName: file.originalName, error });
      }
    }

    setIsUploading(false);

    if (uploaded > 0) {
      toast.success(`Uploaded ${uploaded} file(s) to Dropbox!`);
    }
    if (failed > 0) {
      toast.error(`Failed to upload ${failed} file(s)`);
    }
  };

  const clearAll = () => {
    setFiles([]);
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
        <div className="flex justify-between items-center mb-6">
          <Button variant="ghost" onClick={() => navigate('/')}>
            ← {t('common.backToHome')}
          </Button>
          <div className="text-center flex-1">
            <h1 className="text-2xl font-bold">{t('upload.title')}</h1>
            <p className="text-gray-600 mt-2">
              {t('upload.subtitle')}
            </p>
          </div>
          <div className="w-32" />
        </div>

        {/* Camera View */}
        {showCamera && (
          <CameraCapture 
            onCapture={handleCameraCapture}
            onClose={() => setShowCamera(false)}
          />
        )}

        {/* Drop Zone and Camera Button */}
        {!showCamera && (
          <Card>
            <CardContent className="p-12">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  isDragging 
                    ? 'border-orange-500 bg-orange-50' 
                    : 'border-gray-300 hover:border-orange-400'
                }`}
              >
                <Upload className={`w-12 h-12 mx-auto mb-4 ${
                  isDragging ? 'text-orange-500' : 'text-gray-400'
                }`} />
                <h3 className="text-lg font-semibold mb-2">
                  {t('upload.dropzone.drag')}
                </h3>
                <p className="text-gray-600 mb-4">
                  {t('upload.dropzone.or')}
                </p>
                <div className="flex gap-3 justify-center">
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileSelect}
                    className="hidden"
                    aria-label="Upload receipt files (PDF, JPG, PNG)"
                  />
                  <label htmlFor="file-upload">
                    <Button variant="outline" className="cursor-pointer" asChild>
                      <span>{t('upload.dropzone.browse')}</span>
                    </Button>
                  </label>
                  <Button
                    onClick={() => setShowCamera(true)}
                    className="bg-brand-primary hover:bg-brand-primary/90"
                    aria-label="Open camera to take photo of receipt"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {t('camera.takePhoto', 'Take Photo')}
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  {t('upload.dropzone.support')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Processed Files List */}
        {files.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <CardTitle>{t('upload.receipts.title')}</CardTitle>
                  <CardDescription>
                    {t('upload.receipts.description')}
                  </CardDescription>
                  <div className="mt-4 max-w-xs">
                    <CategorySelect
                      value={defaultCategory}
                      onChange={setDefaultCategory}
                      label="Default Category"
                      showLabel={true}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUploaded(!showUploaded)}
                    className="gap-2"
                  >
                    <Filter className="w-4 h-4" />
                    {showUploaded ? 'Hide Uploaded' : 'Show Uploaded'}
                  </Button>
                  <Button variant="outline" onClick={clearAll} size="sm" className="flex-1 sm:flex-none">
                    {t('upload.actions.clearAll')}
                  </Button>
                  <Button
                    onClick={uploadAllToDropbox}
                    disabled={isUploading || !files.some(f => f.status === 'success')}
                    size="sm"
                    className="flex-1 sm:flex-none"
                  >
                    {isUploading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('upload.actions.uploading')}</>
                    ) : (
                      `${t('upload.actions.uploadAll')} (${files.filter(f => f.status === 'success').length})`
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {files.filter(file => showUploaded || file.status !== 'uploaded').map(file => (
                  <div
                    key={file.id}
                    className="border rounded-lg p-4 flex items-start justify-between bg-white"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <FileText className="w-5 h-5 text-gray-400 mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{file.originalName}</p>
                          {file.status === 'processing' && (
                            <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                          )}
                          {file.status === 'success' && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                          {file.status === 'uploaded' && (
                            <Badge className="bg-green-500 text-white gap-1">
                              <CheckCheck className="w-3 h-3" />
                              Uploaded
                            </Badge>
                          )}
                          {file.status === 'error' && (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                        
                        {file.status === 'success' && file.data?.receipt_data && (
                          <div className="mt-2 space-y-1 text-sm">
                            <p className="text-gray-600">
                              <span className="font-medium">Vendor:</span> {file.data.receipt_data.vendor || 'N/A'}
                            </p>
                            <p className="text-gray-600">
                              <span className="font-medium">Date:</span> {file.data.receipt_data.date || 'N/A'}
                            </p>
                            <p className="text-gray-600">
                              <span className="font-medium">Amount:</span> {file.data.receipt_data.currency} {file.data.receipt_data.amount || 'N/A'}
                            </p>
                            {file.data.receipt_data.usd_amount && file.data.receipt_data.exchange_rate && (
                              <p className="text-green-600 font-medium">
                                💱 USD Equivalent: ${file.data.receipt_data.usd_amount} 
                                <span className="text-xs text-gray-500">
                                  (rate: {file.data.receipt_data.exchange_rate.toFixed(4)})
                                </span>
                              </p>
                            )}
                            {file.data.suggested_filename && (
                              <p className="text-orange-600 font-mono text-xs mt-2">
                                → {file.data.suggested_filename}
                              </p>
                            )}
                            {file.data.receipt_data.usd_amount && (
                              <p className="text-blue-600 text-xs mt-1">
                                🗂️ Will create 2 PDFs: Original ({file.data.receipt_data.currency}) + USD version
                              </p>
                            )}
                          </div>
                        )}
                        
                        {file.status === 'uploaded' && file.data?.receipt_data && (
                          <div className="mt-2 space-y-1 text-sm">
                            <p className="text-green-600 font-medium">✓ Uploaded to Dropbox</p>
                            <p className="text-gray-600">
                              <span className="font-medium">Vendor:</span> {file.data.receipt_data.vendor || 'N/A'}
                            </p>
                            <p className="text-gray-600">
                              <span className="font-medium">Date:</span> {file.data.receipt_data.date || 'N/A'}
                            </p>
                            <p className="text-gray-600">
                              <span className="font-medium">Amount:</span> {file.data.receipt_data.currency} {file.data.receipt_data.amount || 'N/A'}
                            </p>
                            {file.dropboxPaths && file.dropboxPaths.length > 0 && (
                              <p className="text-blue-600 text-xs">
                                📁 {file.dropboxPaths.length} file{file.dropboxPaths.length > 1 ? 's' : ''} uploaded
                              </p>
                            )}
                            {file.uploadTimestamp && (
                              <p className="text-gray-500 text-xs">
                                Uploaded: {new Date(file.uploadTimestamp).toLocaleString()}
                              </p>
                            )}
                          </div>
                        )}

                        {file.status === 'error' && (
                          <p className="text-red-600 text-sm mt-1">{file.error}</p>
                        )}

                        {file.status === 'processing' && (
                          <p className="text-gray-500 text-sm mt-1">Extracting receipt data...</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {files.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p>No files uploaded yet. Drop some receipts above to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}
