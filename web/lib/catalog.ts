import type { Color, Company, Order, Product, Quote, Role, StaffUser } from "./types";

/**
 * Demo catalog. Used by the API seed script (server/prisma/seed.ts) and as an
 * offline fallback when the API is unreachable.
 */

const img = {
  pro: "/products/iphone-pro.jpg",
  phone: "/products/iphone.jpg",
  hand: "/products/phone-hand.jpg",
  ipad: "/products/ipad.jpg",
  mac: "/products/macbook.jpg",
  air: "/products/macbook-air.jpg",
  imac: "/products/imac.jpg",
  watch: "/products/watch.jpg",
  pods: "/products/airpods.jpg",
  max: "/products/airpods-max.jpg",
};

const C = {
  black: { name: "Space Black", hex: "#1C1C1E" },
  silver: { name: "Silver", hex: "#E3E4E6" },
  gold: { name: "Gold", hex: "#E9D3B4" },
  blue: { name: "Blue", hex: "#3B6FD8" },
  natural: { name: "Natural Titanium", hex: "#BFB5A6" },
  desert: { name: "Desert Titanium", hex: "#C9A27E" },
  green: { name: "Green", hex: "#7FB59A" },
  pink: { name: "Pink", hex: "#F4B8C2" },
  purple: { name: "Purple", hex: "#A78BDB" },
  starlight: { name: "Starlight", hex: "#F0E7DA" },
  midnight: { name: "Midnight", hex: "#232A35" },
  white: { name: "White", hex: "#F5F5F7" },
} satisfies Record<string, Color>;

const review = (id: string, name: string, rating: number, text: string, date: string) => ({ id, name, rating, text, date });

type Seed = Omit<Product, "id" | "image" | "rating" | "reviewCount" | "warehouses" | "createdAt" | "variants"> & { createdAt?: string };

const seeds: Seed[] = [
  {
    slug: "iphone-16-pro-max", sku: "AP-82349", name: "iPhone 16 Pro Max", category: "iPhone", brand: "Apple",
    gallery: [img.pro, img.phone, img.hand], price: 1299, salePrice: 1149, stock: 140,
    colors: [C.natural, C.desert, C.black, C.white], storages: ["256GB", "512GB", "1TB"], extraLabel: "Plan", extras: ["Unlocked", "eSIM"],
    description: "Titanium design, the A18 Pro chip and a 48MP Fusion camera system with a new Camera Control. The biggest Pro display yet with the longest battery life ever on an iPhone.",
    highlights: ["6.9-inch Super Retina XDR display", "A18 Pro chip with 6-core GPU", "48MP Fusion + 5x Telephoto", "Up to 33 hours video playback"],
    specs: [{ label: "Display", value: "6.9\" OLED, ProMotion 120Hz" }, { label: "Chip", value: "A18 Pro" }, { label: "Camera", value: "48MP Fusion, 48MP Ultra Wide, 12MP 5x" }, { label: "Battery", value: "Up to 33 hrs video" }, { label: "Weight", value: "227 g" }],
    reviews: [review("r1", "Kibriya Zameer", 5, "Camera control is genuinely useful. Battery easily lasts two days.", "2026-09-14"), review("r2", "Ava Cole", 5, "Fast delivery and the wholesale pricing was great for our team.", "2026-09-02")],
    popular: true,
  },
  {
    slug: "iphone-16", sku: "AP-82350", name: "iPhone 16", category: "iPhone", brand: "Apple",
    gallery: [img.phone, img.hand, img.pro], price: 829, salePrice: 749, stock: 220,
    colors: [C.black, C.white, C.pink, C.blue, C.green], storages: ["128GB", "256GB", "512GB"], extraLabel: "Plan", extras: ["Unlocked"],
    description: "Built for Apple Intelligence with the A18 chip, Camera Control and an advanced 48MP Fusion camera. A colorful aluminum design that's tougher than ever.",
    highlights: ["6.1-inch Super Retina XDR", "A18 chip", "Action button + Camera Control", "USB-C with fast charging"],
    specs: [{ label: "Display", value: "6.1\" OLED" }, { label: "Chip", value: "A18" }, { label: "Camera", value: "48MP Fusion, 12MP Ultra Wide" }, { label: "Battery", value: "Up to 22 hrs video" }],
    reviews: [review("r3", "Zuraid Zameer", 4, "Great all-rounder. The pink is gorgeous.", "2026-08-21")],
    popular: true,
  },
  {
    slug: "iphone-15", sku: "AP-81120", name: "iPhone 15", category: "iPhone", brand: "Apple",
    gallery: [img.hand, img.phone], price: 729, salePrice: 629, stock: 0,
    colors: [C.black, C.blue, C.pink], storages: ["128GB", "256GB"], extraLabel: "Plan", extras: ["Unlocked"],
    description: "Dynamic Island, a 48MP main camera and USB-C — all in a durable color-infused glass and aluminum design.",
    highlights: ["Dynamic Island", "48MP Main camera", "A16 Bionic", "USB-C"],
    specs: [{ label: "Display", value: "6.1\" OLED" }, { label: "Chip", value: "A16 Bionic" }],
    reviews: [], popular: false,
  },
  {
    slug: "ipad-pro-13-m4", sku: "AP-72110", name: "iPad Pro 13\" M4", category: "iPad", brand: "Apple",
    gallery: [img.ipad, img.mac], price: 1299, salePrice: 1179, stock: 64,
    colors: [C.black, C.silver], storages: ["256GB", "512GB", "1TB"], extraLabel: "Connectivity", extras: ["Wi-Fi", "Wi-Fi + Cellular"],
    description: "The thinnest Apple product ever, with the outrageous performance of M4 and a breakthrough Ultra Retina XDR display.",
    highlights: ["Ultra Retina XDR tandem OLED", "M4 chip", "Apple Pencil Pro support", "5.1 mm thin"],
    specs: [{ label: "Display", value: "13\" Tandem OLED" }, { label: "Chip", value: "M4" }, { label: "Weight", value: "579 g" }],
    reviews: [review("r4", "Ava Cole", 5, "The display is unreal. Perfect for design work.", "2026-07-30")], popular: true,
  },
  {
    slug: "ipad-10-9", sku: "AP-72001", name: "Apple iPad 2021 10.2\" Space 64GB Wi-Fi Tablet", category: "iPad", brand: "Apple",
    gallery: [img.ipad, img.hand], price: 1000, salePrice: 700, stock: 105,
    colors: [C.black, C.silver], storages: ["64GB", "256GB"], extraLabel: "Connectivity", extras: ["Wi-Fi", "Wi-Fi + Cellular"],
    description: "Introducing the Apple iPad 2021, a cutting-edge 10.2-inch tablet that seamlessly combines power, performance and portability to elevate your digital experience.",
    highlights: ["10.2-inch Retina display", "A13 Bionic", "12MP Ultra Wide front camera", "All-day battery"],
    specs: [{ label: "Display", value: "10.2\" Retina" }, { label: "Chip", value: "A13 Bionic" }, { label: "Storage", value: "64GB / 256GB" }],
    reviews: [review("r5", "Kibriya Zameer", 5, "Great value tablet for the whole office.", "2026-06-11"), review("r6", "Sana Malik", 4, "Solid build and battery.", "2026-05-02")], popular: false,
  },
  {
    slug: "macbook-pro-14-m4", sku: "AP-61400", name: "MacBook Pro 14\" M4 Pro", category: "Mac", brand: "Apple",
    gallery: [img.mac, img.air], price: 1999, salePrice: 1849, stock: 48,
    colors: [C.black, C.silver], storages: ["512GB", "1TB", "2TB"], extraLabel: "Memory", extras: ["24GB", "48GB"],
    description: "A mind-blowing pro laptop with M4 Pro, a stunning Liquid Retina XDR display and up to 22 hours of battery life.",
    highlights: ["M4 Pro chip", "Liquid Retina XDR display", "Thunderbolt 5", "Up to 22 hrs battery"],
    specs: [{ label: "Display", value: "14.2\" Liquid Retina XDR" }, { label: "Chip", value: "M4 Pro 12-core" }, { label: "Weight", value: "1.6 kg" }],
    reviews: [review("r7", "Zuraid Zameer", 5, "Compiles our whole repo in seconds. Silent too.", "2026-09-20")], popular: true,
  },
  {
    slug: "macbook-air-13-m3", sku: "AP-61300", name: "MacBook Air 13\" M3", category: "Mac", brand: "Apple",
    gallery: [img.air, img.mac], price: 1099, salePrice: 979, stock: 90,
    colors: [C.midnight, C.starlight, C.silver], storages: ["256GB", "512GB"], extraLabel: "Memory", extras: ["16GB", "24GB"],
    description: "Supercharged by M3, the strikingly thin MacBook Air is a portable powerhouse with up to 18 hours of battery life.",
    highlights: ["M3 chip", "13.6\" Liquid Retina", "Fanless, silent design", "MagSafe charging"],
    specs: [{ label: "Display", value: "13.6\" Liquid Retina" }, { label: "Chip", value: "M3" }, { label: "Weight", value: "1.24 kg" }],
    reviews: [review("r8", "Ava Cole", 5, "Light, fast and the battery is endless.", "2026-04-18")], popular: true,
  },
  {
    slug: "imac-24-m4", sku: "AP-62400", name: "iMac 24\" M4", category: "Mac", brand: "Apple",
    gallery: [img.imac, img.mac], price: 1299, salePrice: 1199, stock: 22,
    colors: [C.blue, C.green, C.pink, C.silver, C.purple], storages: ["256GB", "512GB"], extraLabel: "Memory", extras: ["16GB", "24GB"],
    description: "The ultimate all-in-one, now with M4 and Apple Intelligence. A stunning 4.5K Retina display in seven vibrant colors.",
    highlights: ["24\" 4.5K Retina", "M4 chip", "12MP Center Stage camera", "Color-matched accessories"],
    specs: [{ label: "Display", value: "23.5\" 4.5K Retina" }, { label: "Chip", value: "M4" }],
    reviews: [], popular: false,
  },
  {
    slug: "apple-watch-series-10", sku: "AP-51000", name: "Apple Watch Series 10", category: "Watch", brand: "Apple",
    gallery: [img.watch], price: 429, salePrice: 379, stock: 130,
    colors: [C.black, C.silver, C.gold], storages: ["42mm", "46mm"], extraLabel: "Band", extras: ["Sport Band", "Sport Loop"],
    description: "Thinner, with a bigger display. Series 10 brings sleep apnea notifications, depth and water temperature sensing and faster charging.",
    highlights: ["Biggest, brightest display", "Sleep apnea notifications", "Fast charging", "Water resistant 50 m"],
    specs: [{ label: "Case", value: "Aluminum" }, { label: "Display", value: "Always-On Retina LTPO3" }],
    reviews: [review("r9", "Sana Malik", 5, "So thin and comfortable to sleep with.", "2026-09-05")], popular: true,
  },
  {
    slug: "apple-watch-ultra-2", sku: "AP-51200", name: "Apple Watch Ultra 2", category: "Watch", brand: "Apple",
    gallery: [img.watch], price: 799, salePrice: 739, stock: 0,
    colors: [C.natural, C.black], storages: ["49mm"], extraLabel: "Band", extras: ["Trail Loop", "Ocean Band"],
    description: "The most rugged and capable Apple Watch, with a 3000-nit display, precision dual-frequency GPS and up to 72 hours of battery.",
    highlights: ["49mm titanium case", "3000-nit display", "Dual-frequency GPS", "Up to 72 hrs battery"],
    specs: [{ label: "Case", value: "Titanium" }], reviews: [], popular: false,
  },
  {
    slug: "airpods-pro-2", sku: "AP-41200", name: "AirPods Pro 2", category: "AirPods", brand: "Apple",
    gallery: [img.pods], price: 249, salePrice: 199, stock: 300,
    colors: [C.white], storages: ["USB-C"], extraLabel: "Engraving", extras: ["None", "Custom"],
    description: "Up to 2x more Active Noise Cancellation, Adaptive Audio, and a clinical-grade Hearing Aid feature.",
    highlights: ["Active Noise Cancellation", "Adaptive Audio", "Personalized Spatial Audio", "MagSafe case"],
    specs: [{ label: "Chip", value: "H2" }, { label: "Battery", value: "Up to 30 hrs with case" }],
    reviews: [review("r10", "Kibriya Zameer", 5, "ANC is incredible on flights.", "2026-08-01")], popular: true,
  },
  {
    slug: "airpods-max", sku: "AP-41500", name: "AirPods Max", category: "AirPods", brand: "Apple",
    gallery: [img.max], price: 549, salePrice: 499, stock: 40,
    colors: [C.midnight, C.starlight, C.blue, C.purple], storages: ["USB-C"], extraLabel: "Engraving", extras: ["None"],
    description: "High-fidelity audio, industry-leading Active Noise Cancellation and Personalized Spatial Audio in an iconic over-ear design.",
    highlights: ["Computational audio", "Active Noise Cancellation", "Transparency mode", "20 hrs battery"],
    specs: [{ label: "Chip", value: "H1 (x2)" }, { label: "Weight", value: "385 g" }],
    reviews: [review("r11", "Ava Cole", 4, "Sound is amazing, a bit heavy for long sessions.", "2026-03-12")], popular: false,
  },
  {
    slug: "airpods-4", sku: "AP-41400", name: "AirPods 4", category: "AirPods", brand: "Apple",
    gallery: [img.pods], price: 179, salePrice: 149, stock: 0,
    colors: [C.white], storages: ["USB-C"], extraLabel: "Option", extras: ["Standard", "With ANC"],
    description: "Rebuilt for comfort with an all-new open-ear design, H2 chip and an optional Active Noise Cancellation model.",
    highlights: ["Open-ear design", "H2 chip", "USB-C case"], specs: [{ label: "Chip", value: "H2" }], reviews: [], popular: false,
  },
];

const warehousesFor = (stock: number) => {
  const main = Math.round(stock * 0.25);
  const central = stock - main;
  return [
    { name: "Main Warehouse", qty: main },
    { name: "Central Warehouse", qty: central },
    { name: "North District", qty: 0 },
  ];
};

export const PRODUCTS: Product[] = seeds.map((seed, index) => {
  const rating = seed.reviews.length ? seed.reviews.reduce((sum, r) => sum + r.rating, 0) / seed.reviews.length : 4.8;
  return {
    ...seed,
    id: `demo-${seed.slug}`,
    image: seed.gallery[0],
    rating: Math.round(rating * 10) / 10,
    reviewCount: seed.reviews.length,
    warehouses: warehousesFor(seed.stock),
    createdAt: seed.createdAt ?? `2026-0${(index % 9) + 1}-1${index % 9}`,
  };
});

export const CATEGORIES = ["iPhone", "iPad", "Mac", "Watch", "AirPods"] as const;

export const PERMISSION_GROUPS: { key: string; label: string; actions: { key: string; label: string }[] }[] = [
  { key: "company", label: "Company Information", actions: [{ key: "company.view", label: "View" }, { key: "company.edit", label: "Edit" }] },
  { key: "users", label: "Company Users", actions: [{ key: "users.view", label: "View All" }, { key: "users.create", label: "Add New" }, { key: "users.edit", label: "Edit" }, { key: "users.status", label: "Change Status" }] },
  { key: "roles", label: "Company Roles", actions: [{ key: "roles.view", label: "View All" }, { key: "roles.create", label: "Add New" }, { key: "roles.edit", label: "Edit" }] },
  { key: "orders", label: "Orders", actions: [{ key: "orders.view", label: "View All" }, { key: "orders.update", label: "Update" }, { key: "orders.refund", label: "Refund" }] },
  { key: "products", label: "Products", actions: [{ key: "products.view", label: "View All" }, { key: "products.create", label: "Add New" }, { key: "products.edit", label: "Edit" }, { key: "products.archive", label: "Archive" }] },
];

const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((group) => group.actions.map((action) => action.key));

export const ROLES: Role[] = [
  { id: "role-owner", name: "Owner", description: "Full access to every area of the company account.", permissions: ALL_PERMISSIONS },
  { id: "role-admin", name: "Admin", description: "Manage users, orders and the catalog.", permissions: ALL_PERMISSIONS.filter((p) => !p.startsWith("company.edit")) },
  { id: "role-buyer", name: "Buyer", description: "Place orders and request quotes.", permissions: ["orders.view", "products.view", "company.view"] },
  { id: "role-viewer", name: "Viewer", description: "Read-only access to orders and products.", permissions: ["orders.view", "products.view"] },
];

export const STAFF: StaffUser[] = [
  { id: "staff-1", firstName: "Kibriya", lastName: "Zameer", email: "kibriyazameer5@gmail.com", roleId: "role-owner", creditLimit: 832, status: "Active", password: "", address: "City 83 Sindh Pakistan" },
  { id: "staff-2", firstName: "Zuraid", lastName: "Zameer", email: "zuraid@istore.example", roleId: "role-admin", creditLimit: 500, status: "Active", password: "", address: "Karachi, Pakistan" },
  { id: "staff-3", firstName: "Ava", lastName: "Cole", email: "ava@istore.example", roleId: "role-buyer", creditLimit: 250, status: "Active", password: "", address: "San Francisco, CA" },
  { id: "staff-4", firstName: "Sana", lastName: "Malik", email: "sana@istore.example", roleId: "role-viewer", creditLimit: 0, status: "Disabled", password: "", address: "Lahore, Pakistan" },
];

export const COMPANY: Company = {
  name: "I.STORE",
  email: "hello@istore.example",
  phone: "+1 (415) 555-0190",
  regNo: "IS-20481",
  taxId: "US-88-204811",
  taxRate: 0.08,
  creditLimit: 50000,
  creditUsed: 18240,
  addresses: [
    { label: "Head office", line: "1 Infinite Loop", city: "Cupertino", postal: "95014" },
    { label: "Warehouse", line: "500 Logistics Way", city: "Reno", postal: "89502" },
  ],
  onlineOnly: true,
};

export const QUOTES: Quote[] = [
  { id: "q-1", name: "Kibriya Zameer", email: "kibriyazameer5@gmail.com", amount: 640, note: "20x AirPods Pro 2 for team gifts", date: "2026-10-18", status: "PENDING" },
  { id: "q-2", name: "Zuraid Zameer", email: "zuraid@istore.example", amount: 14200, note: "8x MacBook Pro 14 for engineering", date: "2026-10-12", status: "ACCEPTED" },
  { id: "q-3", name: "Ava Cole", email: "ava@istore.example", amount: 3100, note: "iPads for retail counter", date: "2026-10-02", status: "DECLINED" },
];

const line = (p: Product, qty: number, i: number) => ({
  id: `${p.id}-l${i}`, productId: p.id, name: p.name, image: p.image, color: p.colors[0].name, storage: p.storages[0], extra: p.extras[0], unitPrice: p.salePrice, qty,
});

export const ORDERS: Order[] = [
  { id: "ord-3423", number: "IST-3423", date: "2026-10-07", customer: "Kibriya Zameer", email: "kibriyazameer5@gmail.com", status: "Processing", items: [line(PRODUCTS[0], 1, 1), line(PRODUCTS[10], 2, 2)], subtotal: 1547, discount: 0, shipping: 0, tax: 123.76, total: 1670.76, address: "City 83, Sindh 74000", paymentMethod: "Card", trackingNumber: "", paymentStatus: "PENDING" },
  { id: "ord-3342", number: "IST-3342", date: "2026-10-04", customer: "Zuraid Zameer", email: "zuraid@istore.example", status: "On Hold", items: [line(PRODUCTS[5], 1, 1)], subtotal: 1849, discount: 0, shipping: 0, tax: 147.92, total: 1996.92, address: "Karachi 75500", paymentMethod: "Bank transfer", trackingNumber: "", paymentStatus: "PENDING" },
  { id: "ord-3301", number: "IST-3301", date: "2026-09-28", customer: "Ava Cole", email: "ava@istore.example", status: "Confirmed", items: [line(PRODUCTS[6], 2, 1)], subtotal: 1958, discount: 195.8, shipping: 0, tax: 140.98, total: 1903.18, address: "San Francisco 94107", paymentMethod: "Card", coupon: "APPLE10", trackingNumber: "", paymentStatus: "PAID" },
  { id: "ord-3255", number: "IST-3255", date: "2026-09-19", customer: "Sana Malik", email: "sana@istore.example", status: "Shipped", items: [line(PRODUCTS[8], 1, 1)], subtotal: 379, discount: 0, shipping: 0, tax: 30.32, total: 409.32, address: "Lahore 54000", paymentMethod: "Card", trackingNumber: "1Z999AA10123456784", paymentStatus: "PAID" },
  { id: "ord-3190", number: "IST-3190", date: "2026-09-02", customer: "Kibriya Zameer", email: "kibriyazameer5@gmail.com", status: "Delivered", items: [line(PRODUCTS[3], 1, 1)], subtotal: 1179, discount: 0, shipping: 0, tax: 94.32, total: 1273.32, address: "City 83, Sindh 74000", paymentMethod: "Cash on delivery", trackingNumber: "1Z999AA10123456700", paymentStatus: "PAID" },
];

/** Monthly order volume used by dashboards when the API has no history yet. */
export const ORDER_SERIES = [120, 210, 180, 260, 230, 290, 240, 310, 270, 330, 300, 360];
