import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, RotateCcw, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CameraCaptureProps {
  onImageCapture: (imageData: string, analysis?: any) => void;
  isActive?: boolean;
  className?: string;
}

export const CameraCapture = ({ onImageCapture, isActive: externalActive, className }: CameraCaptureProps) => {
  const [isActive, setIsActive] = useState(false);
  const [hasCapture, setHasCapture] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsActive(true);
    } catch (err) {
      const error = err as Error;
      setError(`Camera access denied: ${error.message}`);
      console.error('Camera access error:', error);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get image data
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageData);
    setHasCapture(true);
    
    // Trigger callback with image data
    onImageCapture(imageData);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setHasCapture(false);
  };

  const downloadImage = () => {
    if (!capturedImage) return;
    
    const link = document.createElement('a');
    link.download = `eliza-capture-${Date.now()}.jpg`;
    link.href = capturedImage;
    link.click();
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const active = externalActive ?? isActive;

  return (
    <div className={cn("flex flex-col space-y-4", className)}>
      {/* Camera Controls */}
      <div className="flex items-center justify-center space-x-3">
        <Button
          onClick={active ? stopCamera : startCamera}
          variant={active ? "destructive" : "default"}
          disabled={!!error}
        >
          {active ? (
            <>
              <CameraOff className="h-4 w-4 mr-2" />
              Stop Camera
            </>
          ) : (
            <>
              <Camera className="h-4 w-4 mr-2" />
              Start Camera
            </>
          )}
        </Button>
        
        {active && !hasCapture && (
          <Button onClick={captureImage} variant="secondary">
            <Camera className="h-4 w-4 mr-2" />
            Capture
          </Button>
        )}
        
        {hasCapture && (
          <>
            <Button onClick={retakePhoto} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Retake
            </Button>
            <Button onClick={downloadImage} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-sm text-destructive text-center p-2 bg-destructive/10 rounded-lg">
          {error}
        </div>
      )}

      {/* Camera Feed / Captured Image */}
      <div className="relative bg-secondary rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
        {active && !hasCapture && (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />
        )}
        
        {hasCapture && capturedImage && (
          <img
            src={capturedImage}
            alt="Captured"
            className="w-full h-full object-cover"
          />
        )}
        
        {!active && !hasCapture && (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Camera not active</p>
            </div>
          </div>
        )}
        
        {/* Recording indicator */}
        {active && !hasCapture && (
          <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black/50 text-white px-2 py-1 rounded-full text-xs">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span>LIVE</span>
          </div>
        )}
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};