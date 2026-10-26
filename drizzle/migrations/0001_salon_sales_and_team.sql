CREATE TABLE public.team_members (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid(),
 name text NOT NULL,
 position text NOT NULL DEFAULT 'Stylist',
 phone text NOT NULL DEFAULT '',
 email text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages team directory" ON public.team_members FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TABLE public.sales (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid(),
 product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
 product_name text NOT NULL,
 quantity integer NOT NULL,
 unit_price numeric NOT NULL,
 customer text NOT NULL DEFAULT '',
 payment_method text NOT NULL DEFAULT 'Cash',
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT valid_sale_quantity CHECK (quantity > 0),
 CONSTRAINT valid_sale_price CHECK (unit_price >= 0)
);
GRANT SELECT ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads sales" ON public.sales FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE OR REPLACE FUNCTION public.record_sale(p_product_id uuid, p_quantity integer, p_unit_price numeric, p_customer text DEFAULT '', p_payment_method text DEFAULT 'Cash')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE item public.products%ROWTYPE; sale_id uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to record a sale'; END IF;
 IF p_quantity IS NULL OR p_quantity < 1 OR p_unit_price IS NULL OR p_unit_price < 0 THEN RAISE EXCEPTION 'Enter a valid quantity and price'; END IF;
 IF p_payment_method NOT IN ('Cash', 'Mobile Money', 'Card') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;
 SELECT * INTO item FROM public.products WHERE id = p_product_id AND user_id = auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
 IF item.quantity < p_quantity THEN RAISE EXCEPTION 'Not enough stock'; END IF;
 UPDATE public.products SET quantity = quantity - p_quantity, updated_at = now() WHERE id = item.id;
 INSERT INTO public.sales (user_id, product_id, product_name, quantity, unit_price, customer, payment_method) VALUES (auth.uid(), item.id, item.name, p_quantity, round(p_unit_price, 2), coalesce(p_customer, ''), p_payment_method) RETURNING id INTO sale_id;
 RETURN sale_id;
END;
$$;
REVOKE ALL ON FUNCTION public.record_sale(uuid, integer, numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_sale(uuid, integer, numeric, text, text) TO authenticated;
CREATE INDEX sales_owner_date ON public.sales(user_id, created_at DESC);
CREATE INDEX team_owner ON public.team_members(user_id);