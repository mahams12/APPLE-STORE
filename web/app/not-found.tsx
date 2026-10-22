import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p className="text-gradient text-8xl font-semibold">404</p>
        <h1 className="mt-4 text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-muted">The page you&apos;re looking for has moved or doesn&apos;t exist.</p>
        <div className="mt-6 flex justify-center gap-3"><Link href="/" className="btn btn-primary">Go home</Link><Link href="/shop" className="btn btn-outline">Shop</Link></div>
      </div>
    </div>
  );
}
