import Link from "next/link";

export function Logo({ className = "", href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={`group inline-flex items-center gap-2.5 ${className}`} aria-label="I.STORE home">
      <span className="relative grid size-10 place-items-center overflow-hidden rounded-xl bg-navy text-white shadow-[0_8px_20px_-8px_rgba(11,32,82,0.8)] transition-transform duration-500 ease-out-expo group-hover:rotate-[-6deg] group-hover:scale-105">
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19V6l8 8 8-8v13" className="stroke-brand-300" />
          <circle cx="12" cy="4.5" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      </span>
      <span className="text-[26px] leading-none font-medium tracking-wide text-brand-500">
        I<span className="text-ink">.</span>STORE
      </span>
    </Link>
  );
}
