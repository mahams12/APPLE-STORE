import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PRODUCTS, ROLES } from "../../web/lib/catalog";

const prisma = new PrismaClient();

function step(category: string) {
  if (category === "iPhone" || category === "iPad" || category === "Mac") return 100;
  if (category === "Watch") return 50;
  return 0;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "item";
}

async function main() {
  await prisma.storeSetting.upsert({
    where: { id: "store" },
    update: { name: "I.STORE", email: "hello@istore.example", onlineOnly: true },
    create: {
      id: "store",
      name: "I.STORE",
      email: "hello@istore.example",
      phone: "+1 (415) 555-0190",
      regNo: "IS-20481",
      taxId: "US-88-204811",
      taxRate: 0.08,
      onlineOnly: true,
      creditLimit: 50000,
      creditUsed: 0,
    },
  });
  await prisma.shippingMethod.upsert({
    where: { code: "standard" },
    update: {},
    create: { code: "standard", name: "Standard delivery", fee: 12, freeOver: 50, active: true },
  });
  for (const coupon of [
    { code: "APPLE10", type: "PERCENT", amount: 10 },
    { code: "STUDENT15", type: "PERCENT", amount: 15 },
    { code: "FREESHIP", type: "SHIPPING", amount: 0 },
  ]) {
    await prisma.coupon.upsert({ where: { code: coupon.code }, update: coupon, create: coupon });
  }
  const sections = [
    { key: "hero", title: "Premium Apple products", body: "Shop iPhone, iPad, Mac, Watch, and audio. Ships to your address.", sort: 1 },
    { key: "featured", title: "Featured", body: "Selected devices from the current catalog.", sort: 2 },
    { key: "newsletter", title: "Notes from I.STORE", body: "Product arrivals and offers. No store visits.", sort: 3 },
  ];
  for (const section of sections) {
    await prisma.homepageSection.upsert({ where: { key: section.key }, update: section, create: { ...section, enabled: true } });
  }
  const roleIds = new Map<string, string>();
  for (const role of ROLES) {
    const saved = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description, permissions: role.permissions, disabled: Boolean(role.disabled) },
      create: { name: role.name, description: role.description, permissions: role.permissions, disabled: Boolean(role.disabled) },
    });
    roleIds.set(role.name, saved.id);
  }
  const ownerId = roleIds.get("Owner");
  if (!ownerId) throw new Error("Owner role missing");
  const passwordHash = await bcrypt.hash("IstoreAdmin!2026", 10);
  const ADMIN_EMAIL = process.env.ADMIN_EMAILS?.split(",")[0]?.trim().toLowerCase() ?? "istoreadmin15@gmail.com";
  const legacy = await prisma.adminUser.findUnique({ where: { email: "admin@istore.example" } });
  if (legacy) await prisma.adminUser.update({ where: { id: legacy.id }, data: { email: ADMIN_EMAIL, passwordHash, roleId: ownerId, status: "Active" } });
  else await prisma.adminUser.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash, roleId: ownerId, status: "Active" },
    create: { email: ADMIN_EMAIL, passwordHash, firstName: "I.STORE", lastName: "Admin", roleId: ownerId, status: "Active", creditLimit: 25000 },
  });
  const customerHash = await bcrypt.hash("Customer!2026", 10);
  await prisma.user.upsert({
    where: { email: "ava@istore.example" },
    update: {},
    create: { email: "ava@istore.example", passwordHash: customerHash, firstName: "Ava", lastName: "Cole", emailVerified: true },
  });

  const existing = await prisma.product.count();
  if (existing > 0) return;

  for (const product of PRODUCTS) {
    const category = await prisma.category.upsert({
      where: { name: product.category },
      update: {},
      create: { name: product.category, slug: slug(product.category) },
    });
    const created = await prisma.product.create({
      data: {
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        brand: product.brand,
        description: product.description,
        shortDescription: product.description.slice(0, 140),
        price: product.price,
        salePrice: product.salePrice,
        extraLabel: product.extraLabel,
        highlights: product.highlights,
        featured: Boolean(product.popular),
        bestSeller: Boolean(product.popular),
        published: true,
        seoTitle: product.name,
        seoDescription: product.description.slice(0, 150),
        categoryId: category.id,
        images: { create: product.gallery.map((url, sort) => ({ url, sort, alt: product.name })) },
        specs: { create: product.specs },
        reviews: { create: product.reviews.map((review) => ({ author: review.name, rating: review.rating, text: review.text, status: "APPROVED" })) },
      },
    });
    const combos = product.colors.flatMap((color) =>
      product.storages.flatMap((storage, storageIndex) => product.extras.map((extra) => ({ color, storage, extra, storageIndex }))),
    );
    const each = Math.floor(product.stock / combos.length);
    let remainder = product.stock - each * combos.length;
    for (const combo of combos) {
      const stock = each + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
      await prisma.productVariant.create({
        data: {
          productId: created.id,
          sku: `${product.sku}-${slug(combo.color.name)}-${slug(combo.storage)}-${slug(combo.extra)}`,
          color: combo.color.name,
          colorHex: combo.color.hex,
          storage: combo.storage,
          extra: combo.extra,
          price: product.salePrice + combo.storageIndex * step(product.category),
          stock,
        },
      });
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
