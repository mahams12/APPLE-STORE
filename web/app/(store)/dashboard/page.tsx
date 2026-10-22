import type { Metadata } from "next";
import { CustomerDashboard } from "@/components/dashboard/customer-dashboard";
import { getProducts } from "@/lib/api";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const products = await getProducts();
  return <CustomerDashboard products={products} />;
}
