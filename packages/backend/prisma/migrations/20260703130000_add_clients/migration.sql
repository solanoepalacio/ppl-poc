-- Introduce the Client directory and attach every order to a client, replacing the
-- free-text phone number. Clients are a fixed preset list loaded here (and extended by
-- future data migrations) — there is no client-management UI. `slug` is a normalized,
-- unique natural key; `INSERT OR IGNORE` on it makes re-adding an existing client a no-op.
--
-- Backfill strategy: existing orders have no client, so we create a placeholder client
-- ("Cliente sin asignar") with a deterministic id and point every existing order at it,
-- which lets Order.clientId be NOT NULL. The `phone` column is dropped in the rebuild.

-- CreateTable: Client
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_slug_key" ON "Client"("slug");

-- Placeholder client that existing orders are backfilled to. Deterministic id so the
-- Order rebuild below can reference it directly, without a join.
INSERT OR IGNORE INTO "Client" ("id", "name", "slug", "active")
VALUES ('client_unassigned', 'Cliente sin asignar', 'cliente-sin-asignar', true);

-- Initial client directory. Add future clients with further data migrations.
INSERT OR IGNORE INTO "Client" ("id", "name", "slug", "active") VALUES
    ('client_simple-intermediario', 'Simple (Intermediario)', 'simple-intermediario', true),
    ('client_hotel-hilton', 'Hotel Hilton', 'hotel-hilton', true),
    ('client_hotel-mirador-tafi-del-valle', 'Hotel Mirador Tafi Del Valle', 'hotel-mirador-tafi-del-valle', true),
    ('client_autokiosco-peron', 'Autokiosco Peron', 'autokiosco-peron', true),
    ('client_trento-intermediario', 'Trento (Intermediario)', 'trento-intermediario', true),
    ('client_alo-bar', 'Alo Bar', 'alo-bar', true),
    ('client_prbox', 'PRBox', 'prbox', true),
    ('client_desiree-panaderia', 'Desiree Panaderia', 'desiree-panaderia', true),
    ('client_beans-25', 'Beans 25', 'beans-25', true),
    ('client_beans-portal', 'Beans Portal', 'beans-portal', true),
    ('client_beans-florida', 'Beans Florida', 'beans-florida', true),
    ('client_finca-la-victoria', 'Finca La Victoria', 'finca-la-victoria', true),
    ('client_il-postino-cordoba', 'Il Postino Cordoba', 'il-postino-cordoba', true),
    ('client_il-postino-junin', 'Il Postino Junin', 'il-postino-junin', true),
    ('client_la-lenita-san-martin', 'La Leñita San Martin', 'la-lenita-san-martin', true),
    ('client_maridaje-barrio-sur', 'Maridaje Barrio Sur', 'maridaje-barrio-sur', true),
    ('client_paladares', 'Paladares', 'paladares', true),
    ('client_madame-rouges', 'Madame Rouges', 'madame-rouges', true),
    ('client_tango-almacen', 'Tango Almacen', 'tango-almacen', true),
    ('client_big-dave-la-31-picadas', 'Big Dave / La 31 Picadas', 'big-dave-la-31-picadas', true),
    ('client_drugstore-el-jockey-country', 'Drugstore El Jockey Country', 'drugstore-el-jockey-country', true),
    ('client_el-sommelier', 'El Sommelier', 'el-sommelier', true),
    ('client_raices-cafeteria-intermediario', 'Raices Cafeteria (intermediario)', 'raices-cafeteria-intermediario', true),
    ('client_il-mercato-fanzolato', 'Il Mercato Fanzolato', 'il-mercato-fanzolato', true),
    ('client_maira-granja-del-cerro', 'Maira Granja Del Cerro', 'maira-granja-del-cerro', true),
    ('client_granja-del-cerro-2', 'Granja del Cerro 2', 'granja-del-cerro-2', true),
    ('client_reyes-de-copas', 'Reyes de Copas', 'reyes-de-copas', true),
    ('client_la-verdu-congelados', 'La Verdu Congelados', 'la-verdu-congelados', true),
    ('client_quick-super-autonomo-intermediario', 'Quick Super Autonomo (intermediario)', 'quick-super-autonomo-intermediario', true),
    ('client_iruya-cafe', 'Iruya Cafe', 'iruya-cafe', true),
    ('client_gonna-intermediario', 'Gonna (Intermediario)', 'gonna-intermediario', true),
    ('client_rio-negro-cafe', 'Rio Negro Cafe', 'rio-negro-cafe', true),
    ('client_octaviano-barrio-norte', 'Octaviano Barrio Norte', 'octaviano-barrio-norte', true),
    ('client_octaviano-yerba-buena', 'Octaviano Yerba Buena', 'octaviano-yerba-buena', true),
    ('client_octaviano-ruben-dario', 'Octaviano Ruben Dario', 'octaviano-ruben-dario', true),
    ('client_octaviano-barrio-sur', 'Octaviano Barrio Sur', 'octaviano-barrio-sur', true),
    ('client_octaviano-9-de-julio', 'Octaviano 9 de julio', 'octaviano-9-de-julio', true),
    ('client_octaviano-higueritas', 'Octaviano Higueritas', 'octaviano-higueritas', true),
    ('client_organic-market-barrio-norte', 'Organic Market Barrio Norte', 'organic-market-barrio-norte', true),
    ('client_organic-market-yerba-buena', 'Organic Market Yerba Buena', 'organic-market-yerba-buena', true),
    ('client_dei-fiori', 'Dei Fiori', 'dei-fiori', true),
    ('client_mama-cafe-yerba-buena', 'Mama Cafe Yerba Buena', 'mama-cafe-yerba-buena', true),
    ('client_quates', 'Quates', 'quates', true),
    ('client_la-premium-picadas', 'La Premium Picadas', 'la-premium-picadas', true),
    ('client_fafa', 'FAFA', 'fafa', true),
    ('client_niku', 'Niku', 'niku', true),
    ('client_sarlat-yerba-buena', 'Sarlat Yerba Buena', 'sarlat-yerba-buena', true),
    ('client_la-carlota-san-juan-y-laprida', 'La Carlota San Juan Y Laprida', 'la-carlota-san-juan-y-laprida', true),
    ('client_la-carlota-san-juan-y-salta', 'La Carlota San Juan y Salta', 'la-carlota-san-juan-y-salta', true),
    ('client_luwak-intermediario', 'Luwak (intermediario)', 'luwak-intermediario', true),
    ('client_la-proveduria', 'La Proveduria', 'la-proveduria', true),
    ('client_luz-azul-centro', 'Luz Azul Centro', 'luz-azul-centro', true),
    ('client_luz-azul-yerba-buena', 'Luz Azul Yerba Buena', 'luz-azul-yerba-buena', true),
    ('client_la-vieja-escuela', 'La vieja Escuela', 'la-vieja-escuela', true),
    ('client_picadas-chevere', 'Picadas Chevere', 'picadas-chevere', true),
    ('client_asabache', 'Asabache', 'asabache', true),
    ('client_shell-siria-centro-intermediario', 'Shell Siria Centro (intermediario)', 'shell-siria-centro-intermediario', true),
    ('client_shell-solano-vera', 'Shell Solano Vera', 'shell-solano-vera', true),
    ('client_mercado-plaza-vieja-yerba-buena', 'Mercado Plaza Vieja Yerba Buena', 'mercado-plaza-vieja-yerba-buena', true),
    ('client_marti-cafe-yerba-buena', 'Marti Cafe Yerba Buena', 'marti-cafe-yerba-buena', true);

-- RedefineTable: drop "phone" and add a NOT NULL "clientId" + FK to Order. SQLite can't
-- ADD a NOT NULL column without a default (or DROP a column) on a populated table, so
-- rebuild the table, backfilling clientId = the placeholder client during the copy.
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "slotId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" DATETIME,
    "message" TEXT,
    CONSTRAINT "Order_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("id", "clientId", "token", "status", "slotId", "expiresAt", "createdAt", "confirmedAt", "message")
SELECT
    "id",
    'client_unassigned',
    "token",
    "status",
    "slotId",
    "expiresAt",
    "createdAt",
    "confirmedAt",
    "message"
FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_token_key" ON "Order"("token");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_slotId_idx" ON "Order"("slotId");
CREATE INDEX "Order_clientId_idx" ON "Order"("clientId");
PRAGMA foreign_keys=ON;
