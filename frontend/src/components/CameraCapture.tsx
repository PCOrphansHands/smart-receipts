import { useState, useRef, useEffect } from 'react';
import { Camera, XCircle, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { uiLogger } from 'utils/logger';

export interface Props {
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: Props) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
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
          facingMode: 'environment', // Use back camera on mobile
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

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64 image
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    
    // Stop camera after capture
    stopCamera();
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirmCapture = () => {
    if (capturedImage) {
      // Extract base64 data without the data:image/jpeg;base64, prefix
      const base64Data = capturedImage.split(',')[1];
      onCapture(base64Data);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Camera className="w-5 h-5" />
              {capturedImage ? t('camera.preview', 'Preview Photo') : t('camera.title', 'Take Photo of Receipt')}
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <XCircle className="w-5 h-5" />
            </Button>
          </div>

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
                  {t('camera.capture', 'Capture Photo')}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={retake}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {t('camera.retake', 'Retake')}
                </Button>
                <Button 
                  onClick={confirmCapture}
                  size="lg"
                  className="bg-green-500 hover:bg-green-600"
                >
                  <Check className="w-5 h-5 mr-2" />
                  {t('camera.confirm', 'Use This Photo')}
                </Button>
              </>
            )}
          </div>

          <p className="text-sm text-gray-500 text-center">
            {t('camera.tip', 'Tip: Make sure the receipt is well-lit and all text is clearly visible')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
