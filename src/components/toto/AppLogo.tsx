import { cn } from "@/lib/utils";

type AppLogoProps = {
  className?: string;
  imgClassName?: string;
};

export function AppLogo({ className, imgClassName }: AppLogoProps) {
  return (
    <div className={cn("grid shrink-0 place-items-center overflow-hidden rounded-xl bg-[#241B35]", className)}>
      <img
        src="/totoz-empire-logo.svg"
        alt="Totoz Empire"
        className={cn("h-full w-full object-contain", imgClassName)}
      />
    </div>
  );
}
