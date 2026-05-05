import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className="block h-[22px] w-[22px] rounded-full bg-accent"
      />
      {showWordmark && (
        <span className="text-[18px] font-semibold tracking-tight">Olokas</span>
      )}
    </div>
  );
}
