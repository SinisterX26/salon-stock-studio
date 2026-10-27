export const cedi = (n: number) =>
  `GH₵ ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function saleTotal(quantity: number, price: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || !Number.isFinite(price) || price < 0) {
    throw new Error("Enter a valid quantity and price");
  }
  return Math.round(quantity * price * 100) / 100;
}

export function stockAfterSale(stock: number, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > stock) {
    throw new Error("Not enough stock");
  }
  return stock - quantity;
}

export const CATEGORIES = [
  "Hair Extensions",
  "Shampoo",
  "Conditioner",
  "Hair Growth Oils",
  "Cream",
  "Accessories",
  "Tools & Equipment",
] as const;

export const PAYMENT_METHODS = ["Cash", "Mobile Money", "Card"] as const;

export const TEAM_POSITIONS = [
  "Senior Stylist & Branch Lead",
  "Braider & Weave Specialist",
  "Hair Color & Chemical Specialist",
  "Nail & Lash Technician",
  "Cashier & Inventory Assistant",
  "Salon General Manager",
  "Apprentice Stylist",
] as const;

export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

export function formatDateShort(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return isoString;
  }
}
