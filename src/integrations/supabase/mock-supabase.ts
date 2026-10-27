// In-memory mock Supabase client used when Supabase environment variables are not set.
// Allows the salon inventory, sales, dashboard, and team features to boot and function in AI Studio.

import type { Database } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface MockProduct {
  id: string;
  user_id: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface MockSale {
  id: string;
  user_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  customer: string;
  payment_method: string;
  created_at: string;
  staff_name?: string;
  notes?: string;
}

export interface MockTeamMember {
  id: string;
  user_id: string;
  name: string;
  position: string;
  phone: string;
  email: string;
  role: "admin" | "staff";
  active: boolean;
  commission_rate: number;
  created_at: string;
}

const initialProducts: MockProduct[] = [
  {
    id: "prod-1",
    user_id: "demo-user-id",
    name: "Body Wave Bundle 22”",
    category: "Hair Extensions",
    quantity: 18,
    price: 350.0,
    low_stock_threshold: 5,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prod-2",
    user_id: "demo-user-id",
    name: "Straight Virgin Bundle 20”",
    category: "Hair Extensions",
    quantity: 4,
    price: 320.0,
    low_stock_threshold: 5,
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prod-3",
    user_id: "demo-user-id",
    name: "Argan Oil Moisture Shampoo 500ml",
    category: "Shampoo",
    quantity: 12,
    price: 65.0,
    low_stock_threshold: 4,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prod-4",
    user_id: "demo-user-id",
    name: "Keratin Deep Conditioner 350ml",
    category: "Conditioner",
    quantity: 3,
    price: 80.0,
    low_stock_threshold: 5,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prod-5",
    user_id: "demo-user-id",
    name: "Organic Castor & Rosemary Growth Oil 100ml",
    category: "Hair Growth Oils",
    quantity: 24,
    price: 95.0,
    low_stock_threshold: 6,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prod-6",
    user_id: "demo-user-id",
    name: "Raw Shea Butter Hair Cream 250g",
    category: "Cream",
    quantity: 15,
    price: 45.0,
    low_stock_threshold: 5,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prod-7",
    user_id: "demo-user-id",
    name: "Silk Satin Bonnet & Edge Wrap Set",
    category: "Accessories",
    quantity: 2,
    price: 30.0,
    low_stock_threshold: 5,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prod-8",
    user_id: "demo-user-id",
    name: "Ceramic Wide-Plate Hair Straightener",
    category: "Tools & Equipment",
    quantity: 4,
    price: 280.0,
    low_stock_threshold: 2,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const initialSales: MockSale[] = [
  {
    id: "sale-1",
    user_id: "demo-user-id",
    product_id: "prod-1",
    product_name: "Body Wave Bundle 22”",
    quantity: 2,
    unit_price: 350.0,
    customer: "Ama Serwaa",
    payment_method: "Mobile Money",
    staff_name: "Akua Mansa",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "sale-2",
    user_id: "demo-user-id",
    product_id: "prod-5",
    product_name: "Organic Castor & Rosemary Growth Oil 100ml",
    quantity: 1,
    unit_price: 95.0,
    customer: "Kofi Mensah",
    payment_method: "Cash",
    staff_name: "Salome Donkor",
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: "sale-3",
    user_id: "demo-user-id",
    product_id: "prod-3",
    product_name: "Argan Oil Moisture Shampoo 500ml",
    quantity: 2,
    unit_price: 65.0,
    customer: "Efua Appiah",
    payment_method: "Mobile Money",
    staff_name: "Esi Boateng",
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "sale-4",
    user_id: "demo-user-id",
    product_id: "prod-2",
    product_name: "Straight Virgin Bundle 20”",
    quantity: 1,
    unit_price: 320.0,
    customer: "Naa Borley",
    payment_method: "Card",
    staff_name: "Akua Mansa",
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "sale-5",
    user_id: "demo-user-id",
    product_id: "prod-7",
    product_name: "Silk Satin Bonnet & Edge Wrap Set",
    quantity: 3,
    unit_price: 30.0,
    customer: "Abena Osei",
    payment_method: "Cash",
    staff_name: "Salome Donkor",
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

const initialTeam: MockTeamMember[] = [
  {
    id: "team-1",
    user_id: "demo-user-id",
    name: "Akua Mansa",
    position: "Senior Stylist & Branch Lead",
    phone: "+233 24 123 4567",
    email: "akua@heavic.com",
    role: "admin",
    active: true,
    commission_rate: 15,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: "team-2",
    user_id: "demo-user-id",
    name: "Esi Boateng",
    position: "Braider & Weave Specialist",
    phone: "+233 20 987 6543",
    email: "esi@heavic.com",
    role: "staff",
    active: true,
    commission_rate: 10,
    created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
  },
  {
    id: "team-3",
    user_id: "demo-user-id",
    name: "Salome Donkor",
    position: "Cashier & Inventory Assistant",
    phone: "+233 55 332 1100",
    email: "salome@heavic.com",
    role: "staff",
    active: true,
    commission_rate: 5,
    created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
  },
  {
    id: "team-4",
    user_id: "demo-user-id",
    name: "Kofi Owusu",
    position: "Salon General Manager",
    phone: "+233 27 554 8899",
    email: "admin@heavicventures.com",
    role: "admin",
    active: true,
    commission_rate: 20,
    created_at: new Date(Date.now() - 86400000 * 45).toISOString(),
  },
];

type TableRow = Record<string, unknown>;

class MockStore {
  products: MockProduct[] = [...initialProducts];
  sales: MockSale[] = [...initialSales];
  team_members: MockTeamMember[] = [...initialTeam];

  getTable(name: string): TableRow[] {
    if (name === "products") return this.products as unknown as TableRow[];
    if (name === "sales") return this.sales as unknown as TableRow[];
    if (name === "team_members") return this.team_members as unknown as TableRow[];
    return [];
  }

  setTable(name: string, data: TableRow[]) {
    if (name === "products") this.products = data as unknown as MockProduct[];
    if (name === "sales") this.sales = data as unknown as MockSale[];
    if (name === "team_members") this.team_members = data as unknown as MockTeamMember[];
  }
}

// Global in-memory store preserved across requests
const store = new MockStore();

export interface MockUser {
  id: string;
  email: string;
  user_metadata: Record<string, unknown>;
  app_metadata: Record<string, unknown>;
  aud: string;
  created_at: string;
}

export interface MockSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: MockUser;
}

const defaultUser: MockUser = {
  id: "demo-user-id",
  email: "demo@heavicventures.com",
  user_metadata: { name: "Heavic Admin" },
  app_metadata: { provider: "email" },
  aud: "authenticated",
  created_at: new Date().toISOString(),
};

const defaultSession: MockSession = {
  access_token:
    "mock-jwt-header.eyJzdWIiOiJkZW1vLXVzZXItaWQiLCJlbWFpbCI6ImRlbW9AaGVhdmljdmVudHVyZXMuY29tIn0.mock-sig",
  refresh_token: "mock-refresh-token",
  expires_in: 86400,
  token_type: "bearer",
  user: defaultUser,
};

let currentUser: MockUser | null = defaultUser;
let currentSession: MockSession | null = defaultSession;
const authListeners = new Set<(event: string, session: MockSession | null) => void>();

export class MockQueryBuilder {
  private tableName: string;
  private filters: Array<(row: TableRow) => boolean> = [];
  private orderField?: string;
  private orderAsc: boolean = true;
  private operation: "select" | "insert" | "update" | "delete" = "select";
  private payload: unknown = null;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(_cols: string = "*") {
    this.operation = "select";
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orderField = field;
    this.orderAsc = options?.ascending ?? true;
    return this;
  }

  eq(field: string, value: unknown) {
    this.filters.push((row) => String(row[field]) === String(value));
    return this;
  }

  insert(values: TableRow | TableRow[]) {
    this.operation = "insert";
    this.payload = values;
    return this;
  }

  update(values: TableRow) {
    this.operation = "update";
    this.payload = values;
    return this;
  }

  delete() {
    this.operation = "delete";
    return this;
  }

  single() {
    return this;
  }

  maybeSingle() {
    return this;
  }

  async then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    try {
      const result = this.execute();
      return onfulfilled ? onfulfilled(result) : (result as unknown as TResult1);
    } catch (err) {
      if (onrejected) return onrejected(err);
      return { data: null, error: err } as unknown as TResult1;
    }
  }

  private execute() {
    const list = store.getTable(this.tableName);

    if (this.operation === "insert") {
      const rawPayload = this.payload as TableRow | TableRow[];
      const items = Array.isArray(rawPayload) ? rawPayload : [rawPayload];
      const inserted: TableRow[] = items.map((item) => ({
        id: item["id"] || `mock-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        created_at: item["created_at"] || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: currentUser?.id || "demo-user-id",
        ...item,
      }));
      store.setTable(this.tableName, [...list, ...inserted]);

      // If recording a sale, automatically decrement the product stock!
      if (this.tableName === "sales") {
        for (const sale of inserted) {
          const prodId = sale["product_id"];
          if (prodId) {
            const prod = store.products.find((p) => p.id === String(prodId));
            if (prod) {
              const qty = Math.max(0, Number(sale["quantity"]) || 1);
              prod.quantity = Math.max(0, prod.quantity - qty);
              prod.updated_at = new Date().toISOString();
            }
          }
        }
      }

      return {
        data: Array.isArray(rawPayload) ? inserted : inserted[0],
        error: null,
      };
    }

    if (this.operation === "update") {
      const rawUpdate = (this.payload as TableRow) || {};
      const updated = list.map((item) => {
        const matches = this.filters.every((f) => f(item));
        if (matches) {
          return {
            ...item,
            ...rawUpdate,
            updated_at: new Date().toISOString(),
          };
        }
        return item;
      });
      store.setTable(this.tableName, updated);
      return { data: updated, error: null };
    }

    if (this.operation === "delete") {
      // If deleting a sale, restore the inventory quantity
      if (this.tableName === "sales") {
        const toDelete = list.filter((item) => this.filters.every((f) => f(item)));
        for (const s of toDelete) {
          const prodId = s["product_id"];
          if (prodId) {
            const prod = store.products.find((p) => p.id === String(prodId));
            if (prod) {
              const qty = Math.max(0, Number(s["quantity"]) || 1);
              prod.quantity += qty;
              prod.updated_at = new Date().toISOString();
            }
          }
        }
      }

      const remaining = list.filter((item) => !this.filters.every((f) => f(item)));
      store.setTable(this.tableName, remaining);
      return { data: null, error: null };
    }

    // select
    let result = [...list];
    for (const f of this.filters) {
      result = result.filter(f);
    }
    if (this.orderField) {
      const f = this.orderField;
      const asc = this.orderAsc;
      result.sort((a, b) => {
        const va = String(a[f] ?? "");
        const vb = String(b[f] ?? "");
        if (va < vb) return asc ? -1 : 1;
        if (va > vb) return asc ? 1 : -1;
        return 0;
      });
    }
    return { data: result, error: null };
  }
}

export const mockAuth = {
  getUser: async () => ({
    data: { user: currentUser },
    error: null,
  }),
  getSession: async () => ({
    data: { session: currentSession },
    error: null,
  }),
  onAuthStateChange: (callback: (event: string, session: MockSession | null) => void) => {
    authListeners.add(callback);
    // Notify immediately on registration
    setTimeout(() => {
      callback(currentSession ? "SIGNED_IN" : "SIGNED_OUT", currentSession);
    }, 0);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            authListeners.delete(callback);
          },
        },
      },
    };
  },
  signInWithPassword: async ({ email }: { email: string; password?: string }) => {
    currentUser = {
      ...defaultUser,
      email: email || defaultUser.email,
    };
    currentSession = {
      ...defaultSession,
      user: currentUser,
    };
    authListeners.forEach((cb) => cb("SIGNED_IN", currentSession));
    return { data: { user: currentUser, session: currentSession }, error: null };
  },
  signUp: async ({ email }: { email: string; password?: string }) => {
    currentUser = {
      ...defaultUser,
      email: email || defaultUser.email,
    };
    currentSession = {
      ...defaultSession,
      user: currentUser,
    };
    authListeners.forEach((cb) => cb("SIGNED_IN", currentSession));
    return { data: { user: currentUser, session: currentSession }, error: null };
  },
  signOut: async () => {
    currentUser = null;
    currentSession = null;
    authListeners.forEach((cb) => cb("SIGNED_OUT", null));
    return { error: null };
  },
  setSession: async (tokens: { access_token?: string; [key: string]: unknown }) => {
    if (tokens.access_token) {
      currentSession = { ...defaultSession, ...tokens, access_token: tokens.access_token };
      currentUser = currentSession.user ?? defaultUser;
    }
    return { data: { session: currentSession }, error: null };
  },
  getClaims: async (_token: string) => ({
    data: {
      claims: {
        sub: currentUser?.id ?? "demo-user-id",
        email: currentUser?.email ?? defaultUser.email,
      },
    },
    error: null,
  }),
};

export function createMockSupabaseClient(): SupabaseClient<Database> {
  return {
    auth: mockAuth,
    from: (table: string) => new MockQueryBuilder(table),
    rpc: async (fnName: string, args?: Record<string, unknown>) => {
      if (fnName === "record_sale" && args) {
        const prodId = String(args["p_product_id"] ?? "");
        const qty = Number(args["p_quantity"] ?? 1);
        const price = Number(args["p_unit_price"] ?? 0);
        const customer = String(args["p_customer"] ?? "");
        const paymentMethod = String(args["p_payment_method"] ?? "Cash");

        const prod = store.products.find((p) => p.id === prodId);
        if (!prod) {
          return { data: null, error: new Error("Product not found") };
        }
        if (prod.quantity < qty) {
          return { data: null, error: new Error("Not enough stock available") };
        }

        prod.quantity -= qty;
        prod.updated_at = new Date().toISOString();

        const saleId = `sale-${Date.now()}`;
        store.sales.unshift({
          id: saleId,
          user_id: currentUser?.id ?? "demo-user-id",
          product_id: prod.id,
          product_name: prod.name,
          quantity: qty,
          unit_price: price,
          customer,
          payment_method: paymentMethod,
          created_at: new Date().toISOString(),
        });

        return { data: saleId, error: null };
      }
      return {
        data: "mock-result",
        error: null,
      };
    },
  } as unknown as SupabaseClient<Database>;
}
