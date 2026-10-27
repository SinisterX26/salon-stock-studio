import { queryOptions } from "@tanstack/react-query";
import { getProducts, getSales, getTeam } from "./salon.functions";
export const productsOptions = queryOptions({
  queryKey: ["products"],
  queryFn: () => getProducts(),
});
export const salesOptions = queryOptions({ queryKey: ["sales"], queryFn: () => getSales() });
export const teamOptions = queryOptions({ queryKey: ["team"], queryFn: () => getTeam() });
