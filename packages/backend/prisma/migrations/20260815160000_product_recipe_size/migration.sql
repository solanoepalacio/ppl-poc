-- How many units one receta of a product yields. 0 means none is recorded, which
-- is every product when this is applied, so the column changes nothing on its
-- own. Quantities stay in units everywhere; the receta is only a way of reading
-- them on the production views.
ALTER TABLE "Product" ADD COLUMN "recipeSize" INTEGER NOT NULL DEFAULT 0;
