import { useEffect, useRef, useState } from "react";
import { Scan, X } from "lucide-react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    BarcodeDetector?: typeof BarcodeDetector;
  }
  class BarcodeDetector {
    constructor(options?: { formats?: string[] });
    detect(image: ImageBitmapSource): Promise<{ rawValue: string }[]>;
  }
}

const btn =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-[13px] font-medium transition-colors hover:bg-accent";

export type BarcodeScannerProps = {
  open: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
};

export function BarcodeScanner({ open, onClose, onScan }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetector | null>(null);
  const scanningRef = useRef(false);
  const [status, setStatus] = useState<"idle" | "starting" | "scanning" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      stop();
      return;
    }

    let cancelled = false;
    setStatus("starting");
    setError(null);

    function stop() {
      scanningRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      detectorRef.current = null;
      setStatus("idle");
    }

    async function start() {
      // Check if BarcodeDetector is supported
      if (!window.BarcodeDetector) {
        if (cancelled) return;
        setError(
          "Your browser does not support camera barcode scanning. Use a USB barcode scanner or type the barcode manually.",
        );
        setStatus("error");
        return;
      }

      try {
        // Try to get the best camera
        let stream: MediaStream;
        try {
          // First try: back camera with high resolution
          stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              facingMode: "environment", 
              width: { ideal: 1920 }, 
              height: { ideal: 1080 } 
            },
          });
        } catch {
          // Fallback: any camera
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
          });
        }

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          // Wait for video to be ready
          await new Promise((resolve) => {
            if (videoRef.current?.readyState >= 2) {
              resolve(true);
            } else {
              videoRef.current?.addEventListener('loadeddata', resolve, { once: true });
            }
          });
        }

        // Create detector with all supported formats
        detectorRef.current = new window.BarcodeDetector({
          formats: [
            "aztec",
            "code_128",
            "code_39",
            "code_93",
            "codabar",
            "data_matrix",
            "ean_13",
            "ean_8",
            "itf",
            "pdf417",
            "qr_code",
            "upc_a",
            "upc_e",
          ],
        });

        setStatus("scanning");
        scanningRef.current = true;
        detectLoop();
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not access the camera.");
        setStatus("error");
      }
    }

    async function detectLoop() {
      if (!scanningRef.current || cancelled) return;
      
      const video = videoRef.current;
      const detector = detectorRef.current;
      
      if (!video || !detector) {
        requestAnimationFrame(detectLoop);
        return;
      }
      
      if (video.readyState < 2) {
        requestAnimationFrame(detectLoop);
        return;
      }

      try {
        // Take a snapshot and detect
        const results = await detector.detect(video);
        
        if (results && results.length > 0 && !cancelled) {
          const barcode = results[0]?.rawValue;
          if (barcode) {
            console.log("✅ Barcode detected:", barcode);
            scanningRef.current = false;
            onScan(barcode);
            stop();
            return;
          }
        }
      } catch (err) {
        // Ignore frame errors - they happen between frames
        console.debug("Detection error:", err);
      }

      // Continue detection
      requestAnimationFrame(detectLoop);
    }

    start();

    return () => {
      cancelled = true;
      stop();
    };
  }, [open, onScan]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-lg border border-border bg-card p-5 shadow-panel">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scan className="size-4 text-primary" />
            <h3 className="text-[15px] font-semibold">Scan barcode</h3>
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
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card p-6 text-center">
              <p className="text-[13px] leading-relaxed text-muted-foreground">{error}</p>
            </div>
          )}
          
          {status === "starting" && (
            <div className="absolute inset-0 flex items-center justify-center bg-card">
              <p className="text-[13px] text-muted-foreground">Starting camera…</p>
            </div>
          )}
          
          {/* Scan overlay - helps users align the barcode */}
          <div
            className={cn(
              "pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity",
              status === "scanning" ? "opacity-100" : "opacity-0",
            )}
          >
            <div className="relative">
              <div className="border-2 border-primary/80 bg-primary/5 p-12 rounded-lg">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-0.5 bg-primary/50 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <p className="text-[12px] text-muted-foreground text-center">
            {status === "scanning" 
              ? "📷 Position barcode in the center of the frame" 
              : "Point the camera at a barcode. On a desktop, you can also plug in a USB scanner and scan directly into the search box."
            }
          </p>
          <div className="flex justify-end">
            <button className={cn(btn, "w-full sm:w-auto")} onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
