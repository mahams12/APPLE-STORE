import { CartDrawer } from "@/components/site/cart-drawer";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-[60vh]">{children}</main>
      <Footer />
      <CartDrawer />
    </>
  );
}
