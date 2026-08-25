import { QRCodeSVG } from "qrcode.react";

interface QRCodeProps {
  value: string;
  size?: number;
  bgColor?: string;
  fgColor?: string;
}

export function ProductQRCode({ value, size = 128, bgColor = "#ffffff", fgColor = "#000000" }: QRCodeProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <QRCodeSVG value={value} size={size} bgColor={bgColor} fgColor={fgColor} level="H" includeMargin />
      <span className="text-xs text-muted-foreground break-all text-center max-w-[128px]">{value}</span>
    </div>
  );
}
