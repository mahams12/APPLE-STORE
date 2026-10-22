export type Color = { name: string; hex: string };

export type Review = { id: string; name: string; rating: number; text: string; date: string };

export type Spec = { label: string; value: string };

export type Variant = { id: string; sku: string; color: string; storage: string; extra: string; price: number; stock: number };

export type Product = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  image: string;
  gallery: string[];
  rating: number;
  reviewCount: number;
  /** Recommended retail ("RR") price. */
  price: number;
  /** Wholesale / sale price. */
  salePrice: number;
  stock: number;
  warehouses: { name: string; qty: number }[];
  colors: Color[];
  storages: string[];
  extraLabel: string;
  extras: string[];
  description: string;
  highlights: string[];
  specs: Spec[];
  reviews: Review[];
  popular: boolean;
  createdAt: string;
  variants?: Variant[];
};

export type CartItem = {
  id: string;
  productId: string;
  name: string;
  image: string;
  color: string;
  storage: string;
  extra: string;
  unitPrice: number;
  qty: number;
};

export type Totals = { subtotal: number; discount: number; discounted: number; shipping: number; tax: number; total: number; valid: boolean };

export type Cart = { items: CartItem[]; coupon: string; totals: Totals };

export type OrderStatus = "Processing" | "Confirmed" | "Packed" | "Shipped" | "Delivered" | "Cancelled" | "On Hold" | "Refunded";

export type Order = {
  id: string;
  number: string;
  date: string;
  customer: string;
  email: string;
  status: OrderStatus;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  address: string;
  paymentMethod: string;
  coupon?: string;
  trackingNumber: string;
  paymentStatus: string;
};

export type Role = { id: string; name: string; description: string; permissions: string[]; disabled?: boolean };

export type StaffUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roleId: string;
  creditLimit: number;
  status: "Active" | "Disabled" | string;
  password: string;
  address: string;
};

export type Quote = { id: string; name: string; email: string; amount: number; note: string; date: string; status: string };

export type Address = { id: string; label: string; line: string; city: string; postal: string; country?: string; isDefault?: boolean };

export type Company = {
  name: string;
  email: string;
  phone: string;
  regNo: string;
  taxId: string;
  taxRate: number;
  creditLimit: number;
  creditUsed: number;
  addresses: Omit<Address, "id">[];
  onlineOnly: boolean;
};

export type Profile = { id: string; email: string; firstName: string; lastName: string; phone?: string | null; emailVerified: boolean };

export type AdminProfile = { id: string; email: string; firstName: string; lastName: string; role: { name: string; permissions: string[] } };

export type Customer = { id: string; name: string; email: string; orders: number; verified: boolean };

export type Coupon = { id: string; code: string; type: string; amount: number; active: boolean };

export type InventoryRow = { id: string; sku: string; name: string; color: string; storage: string; stock: number; reserved: number; available: number };

export type AuditRow = { id: string; action: string; entity: string; entityId: string; before: string; after: string; admin: string; date: string };
