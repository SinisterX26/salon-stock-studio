export const cedi = (n: number) => `GH₵ ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export function saleTotal(quantity: number, price: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || !Number.isFinite(price) || price < 0) throw new Error("Enter a valid quantity and price");
  return Math.round(quantity * price * 100) / 100;
}
export function stockAfterSale(stock: number, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > stock) throw new Error("Not enough stock");
  return stock - quantity;
}