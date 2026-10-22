import Image from "next/image";
import Link from "next/link";

export function Logo({ className = "", href = "/", light = false }: { className?: string; href?: string; light?: boolean }) {
  return (
    <Link href={href} className={`group inline-flex items-center gap-2.5 ${className}`} aria-label="I.STORE home">
      <Image
        src="/brand/logo-mark.png"
        alt="I.STORE"
        width={762}
        height={1170}
        quality={100}
        className="h-11 w-auto transition-transform duration-500 ease-out-expo group-hover:scale-110 group-hover:-rotate-6"
        priority
      />
      <span className={`text-[26px] leading-none font-semibold tracking-tight ${light ? "text-white" : "text-ink"}`}>
        I<span className="text-brand-500">.</span>STORE
      </span>
    </Link>
  );
}
