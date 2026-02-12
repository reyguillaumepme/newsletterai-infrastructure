
-- 1. Ajout des colonnes
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS slug text,
ADD COLUMN IF NOT EXISTS subscription_settings jsonb DEFAULT '{
  "title": "Abonnez-vous à ma newsletter",
  "subtitle": "Recevez mes meilleurs conseils chaque semaine.",
  "button_text": "Je m''inscris",
  "logo_visible": true,
  "primary_color": "#0F172A"
}'::jsonb;

-- 2. Index pour la recherche rapide
CREATE UNIQUE INDEX IF NOT EXISTS brands_slug_idx ON public.brands (slug);

-- 3. Autoriser l'accès public (Pour que la page d'inscription puisse charger les infos)
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Access" ON public.brands;
CREATE POLICY "Public Read Access" ON public.brands FOR SELECT USING (true);
