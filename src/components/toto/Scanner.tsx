import { useEffect, useRef, useState } from "react";
import { X, Camera, Loader2, QrCode, Barcode } from "lucide-react";
import { cn } from "@/lib/utils";

export type ScannerMode = "barcode" | "qr";

export type ScannerProps = {
  open: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
  mode?: ScannerMode;
};

export function Scanner({ open, onClose, onScan, mode = "barcode" }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any | null>(null);
  const scanningRef = useRef(false);
  const frameIdRef = useRef<number | null>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "scanning" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);

  const isQR = mode === "qr";
  const label = isQR ? "QR Code" : "Barcode";
  const Icon = isQR ? QrCode : Barcode;

  useEffect(() => {
    if (!open) {
      stopScanner();
      return;
    }

    let cancelled = false;
    setStatus("starting");
    setError(null);

    const stopScanner = () => {
      scanningRef.current = false;
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
        frameIdRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      detectorRef.current = null;
      setStatus("idle");
    };

    const startScanner = async () => {
      // Check if BarcodeDetector is supported
      if (!window.BarcodeDetector) {
        if (cancelled) return;
        setError(
          "Your browser doesn't support scanning. Please type the data manually.",
        );
        setStatus("error");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: "environment", 
            width: { ideal: 1280 }, 
            height: { ideal: 720 } 
          },
        });
        
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Create detector with appropriate formats
        const formats = isQR 
          ? ["qr_code"] 
          : ["ean_13", "ean_8", "upc_a", "upc_e", "code_39", "code_128", "itf"];
        
        detectorRef.current = new window.BarcodeDetector({
          formats: formats,
        });

        setStatus("scanning");
        scanningRef.current = true;
        detectLoop();
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not access the camera.");
        setStatus("error");
      }
    };

    const detectLoop = () => {
      if (!scanningRef.current || cancelled) return;
      
      const video = videoRef.current;
      const detector = detectorRef.current;
      
      if (!video || !detector) {
        frameIdRef.current = requestAnimationFrame(detectLoop);
        return;
      }
      
      if (video.readyState < 2) {
        frameIdRef.current = requestAnimationFrame(detectLoop);
        return;
      }

      try {
        detector.detect(video)
          .then((results: any[]) => {
            if (results && results.length > 0 && !cancelled) {
              const data = results[0]?.rawValue;
              if (data) {
                console.log(`✅ ${label} detected:`, data);
                scanningRef.current = false;
                onScan(data);
                stopScanner();
                return;
              }
            }
            frameIdRef.current = requestAnimationFrame(detectLoop);
          })
          .catch(() => {
            frameIdRef.current = requestAnimationFrame(detectLoop);
          });
      } catch {
        frameIdRef.current = requestAnimationFrame(detectLoop);
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [open, onScan, mode]);

  const toggleTorch = async () => {
    try {
      if (streamRef.current) {
        const track = streamRef.current.getVideoTracks()[0];
        if (track) {
          const capabilities = track.getCapabilities() as any;
          if (capabilities.torch) {
            const newState = !torchOn;
            await track.applyConstraints({
              advanced: [{ torch: newState }] as any,
            });
            setTorchOn(newState);
          } else {
            setError("Torch not available on this device.");
          }
        }
      }
    } catch (err) {
      console.error("Error toggling torch:", err);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-lg border border-border bg-card p-5 shadow-panel">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="size-4 text-primary" />
            <h3 className="text-[15px] font-semibold text-white">Scan {label}</h3>
          </div>
          <button
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Close scanner"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-border bg-black">
          <video 
            ref={videoRef} 
            className="size-full object-cover" 
            muted 
            playsInline 
            autoPlay
          />
          
          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-6 text-center">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          
          {status === "starting" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
                <p className="text-white text-sm mt-2">Starting camera...</p>
              </div>
            </div>
          )}
          
          {status === "scanning" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <div className="absolute -top-0.5 -left-0.5 w-8 h-8 border-t-2 border-l-2 border-blue-400" />
                <div className="absolute -top-0.5 -right-0.5 w-8 h-8 border-t-2 border-r-2 border-blue-400" />
                <div className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-b-2 border-l-2 border-blue-400" />
                <div className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-b-2 border-r-2 border-blue-400" />
                <div className="w-64 h-44 border-2 border-blue-400/30 rounded-lg" />
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <p className="text-[12px] text-muted-foreground text-center">
            {status === "scanning" 
              ? `📷 Position ${label.toLowerCase()} in the center of the frame` 
              : status === "error"
              ? "⚠️ " + error
              : "Starting camera..."
            }
          </p>

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={toggleTorch}
              className={cn(
                "px-3 py-2 rounded-lg border text-sm transition-colors",
                torchOn 
                  ? "bg-yellow-500/20 border-yellow-500 text-yellow-400" 
                  : "bg-white/10 border-white/20 text-white hover:bg-white/20"
              )}
            >
              <Camera className="w-4 h-4 inline mr-1" />
              {torchOn ? "Torch ON" : "Torch OFF"}
            </button>

            <button 
              className={cn("px-3 py-2 rounded-lg border text-sm transition-colors bg-white/10 text-white hover:bg-white/20 border-white/20")} 
              onClick={onClose}
            >
              Cancel
            </button>
          </div>

          <div className="mt-2">
            <p className="text-[11px] text-muted-foreground text-center mb-1">
              Or enter manually:
            </p>
            <input
              type="text"
              placeholder={`Type ${label.toLowerCase()} data...`}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const value = (e.target as HTMLInputElement).value.trim();
                  if (value) {
                    onScan(value);
                    onClose();
                  }
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
