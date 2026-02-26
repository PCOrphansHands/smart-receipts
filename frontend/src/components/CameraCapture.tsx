import { useState, useRef, useEffect } from 'react';
import { Camera, XCircle, Check, RotateCcw, Plus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { uiLogger } from 'utils/logger';

export interface Props {
  onCapture: (imageData: string[]) => void;
  onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: Props) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [isCameraReady, setIsCameraReady] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsCameraReady(true);
      }
    } catch (error) {
      uiLogger.error('Failed to access camera', error);
      toast.error('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    stopCamera();
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const addPage = () => {
    if (capturedImage) {
      setPages(prev => [...prev, capturedImage]);
      setCapturedImage(null);
      startCamera();
      toast.success(`Page ${pages.length + 1} added`);
    }
  };

  const removePage = (index: number) => {
    setPages(prev => prev.filter((_, i) => i !== index));
  };

  const confirmCapture = () => {
    if (capturedImage) {
      const allPages = [...pages, capturedImage];
      const base64Pages = allPages.map(img => img.split(',')[1]);
      onCapture(base64Pages);
    }
  };

  const totalPages = pages.length + (capturedImage ? 1 : 0);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Camera className="w-5 h-5" />
              {capturedImage ? t('camera.preview', 'Preview Photo') : t('camera.title', 'Take Photo of Receipt')}
              {totalPages > 0 && (
                <span className="text-sm font-normal text-gray-500">
                  ({totalPages} {totalPages === 1 ? 'page' : 'pages'})
                </span>
              )}
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <XCircle className="w-5 h-5" />
            </Button>
          </div>

          {/* Previously captured pages thumbnails */}
          {pages.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {pages.map((page, index) => (
                <div key={index} className="relative shrink-0 group">
                  <img
                    src={page}
                    alt={`Page ${index + 1}`}
                    className="h-20 w-16 object-cover rounded border border-gray-200"
                  />
                  <div className="absolute -top-1 -left-1 bg-gray-900 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {index + 1}
                  </div>
                  <button
                    onClick={() => removePage(index)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: '400px' }}>
            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                  style={{ minHeight: '400px' }}
                />
                <canvas ref={canvasRef} className="hidden" />
              </>
            ) : (
              <img
                src={capturedImage}
                alt="Captured receipt"
                className="w-full h-full object-contain"
                style={{ minHeight: '400px' }}
              />
            )}
          </div>

          <div className="flex justify-center gap-3">
            {!capturedImage ? (
              <>
                <Button variant="outline" onClick={onClose}>
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button
                  onClick={capturePhoto}
                  disabled={!isCameraReady}
                  size="lg"
                  className="bg-brand-secondary hover:bg-brand-secondary/90"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  {pages.length > 0
                    ? t('camera.captureNext', 'Capture Next Page')
                    : t('camera.capture', 'Capture Photo')}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={retake}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {t('camera.retake', 'Retake')}
                </Button>
                <Button
                  variant="outline"
                  onClick={addPage}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('camera.addPage', 'Add Page')}
                </Button>
                <Button
                  onClick={confirmCapture}
                  size="lg"
                  className="bg-green-500 hover:bg-green-600"
                >
                  <Check className="w-5 h-5 mr-2" />
                  {pages.length > 0
                    ? t('camera.done', 'Done')
                    : t('camera.confirm', 'Use This Photo')}
                </Button>
              </>
            )}
          </div>

          <p className="text-sm text-gray-500 text-center">
            {pages.length > 0
              ? t('camera.multiPageTip', 'Use "Add Page" for long receipts or to include both the itemized receipt and payment slip')
              : t('camera.tip', 'Tip: Make sure the receipt is well-lit and all text is clearly visible')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
