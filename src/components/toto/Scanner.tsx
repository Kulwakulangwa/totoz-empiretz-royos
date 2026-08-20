import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Scan, X, Camera, Loader2, QrCode, Barcode } from "lucide-react";
import { cn } from "@/lib/utils";

export type ScannerMode = "barcode" | "qr";

export type ScannerProps = {
  open: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
  mode?: ScannerMode;
};

export function Scanner({ open, onClose, onScan, mode = "barcode" }: ScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isQR = mode === "qr";
  const label = isQR ? "QR Code" : "Barcode";
  const Icon = isQR ? QrCode : Barcode;

  useEffect(() => {
    if (!open) {
      stopScanner();
      return;
    }

    const startScanner = async () => {
      if (!containerRef.current) return;

      try {
        setIsScanning(true);
        setError(null);

        const scanner = new Html5Qrcode(containerRef.current.id);

        const config = {
          fps: 15,
          qrbox: { width: 280, height: 200 },
          aspectRatio: 1.0,
        };

        await scanner.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            console.log(`✅ ${label} detected:`, decodedText);
            onScan(decodedText);
            stopScanner();
          },
          (errorMessage) => {
            // Ignore frame errors
          }
        );

        scannerRef.current = scanner;
      } catch (err: any) {
        console.error("Error starting scanner:", err);
        setError(err.message || "Failed to start camera. Please check permissions.");
        setIsScanning(false);
      }
    };

    const timeoutId = setTimeout(startScanner, 100);

    return () => {
      clearTimeout(timeoutId);
      stopScanner();
    };
  }, [open, onScan, mode]);

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch (err) {
      console.error("Error stopping scanner:", err);
    }
    setIsScanning(false);
  };

  const toggleTorch = async () => {
    try {
      if (scannerRef.current) {
        const newState = !torchOn;
        await scannerRef.current.applyVideoConstraints({
          advanced: [{ torch: newState }] as any,
        });
        setTorchOn(newState);
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
          <div
            id="scanner-container"
            ref={containerRef}
            className="size-full"
          />

          {isScanning && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                <p className="text-white text-sm mt-2">Starting camera...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-6 text-center">
              <p className="text-red-400 text-sm">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {!error && (
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
            {error 
              ? "⚠️ Error occurred. Please try again." 
              : `📷 Position ${label.toLowerCase()} in the center of the frame`
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
