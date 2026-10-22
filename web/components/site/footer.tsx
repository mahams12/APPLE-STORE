import Link from "next/link";
import { Logo } from "./logo";

const COLS = [
  { title: "Customer Care", links: [["Contact Us", "/services#contact"], ["Shipping & Handling", "/services#shipping"], ["Returns Policy", "/services#returns"], ["Track Order", "/account"]] },
  { title: "Company", links: [["About Us", "/about"], ["Our Team", "/about#team"], ["Partners", "/about#partners"], ["Promotions", "/promotions"]] },
  { title: "Resources", links: [["FAQ's", "/services#faq"], ["Accessibility", "/about"], ["Advanced Search", "/shop"], ["Business Portal", "/admin"]] },
];

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-white">
      <div className="container-x grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-5 text-sm text-muted">I.STORE Commerce</p>
          <p className="mt-2 text-sm text-muted">Reg Number: IS-20481</p>
          <p className="mt-2 text-sm text-muted">hello@istore.example · +1 (415) 555-0190</p>
        </div>
        {COLS.map((col) => (
          <div key={col.title}>
            <h3 className="text-lg font-medium">{col.title}</h3>
            <ul className="mt-4 space-y-3 text-sm text-muted">
              {col.links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="inline-block transition-all duration-300 hover:translate-x-1 hover:text-brand-500">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="container-x flex flex-col items-center justify-between gap-3 py-6 text-xs text-muted sm:flex-row">
          <p>© {new Date().getFullYear()} I.STORE. All rights reserved.</p>
          <p>Apple, iPhone, iPad, Mac and AirPods are trademarks of Apple Inc.</p>
        </div>
      </div>
    </footer>
  );
}
