import { existsSync } from "node:fs";
import { resolve } from "node:path";
import express from "express";
import type { Deps, Paths } from "./data/deps.js";
import type { Wardrobe, WardrobeUpdate } from "./data/wardrobe.js";
import { broadcast } from "./actions/events.js";
import { recheckSetup } from "./actions/setup.js";
import { mutateWardrobe, readWardrobe } from "./actions/store.js";
import { registerExtractionRoutes } from "./http/extractions.js";
import { registerGarmentRoutes } from "./http/garments.js";
import { localHostOnly } from "./http/guard.js";
import { registerLookRoutes } from "./http/looks.js";
import { registerPeopleRoutes } from "./http/people.js";
import { registerSetupRoutes } from "./http/setup.js";
import { registerWardrobeRoutes } from "./http/wardrobe.js";
import { failInterrupted } from "./pure/wardrobe.js";

const HOST = "127.0.0.1";
const PORT = 3100;

// src/ (tsx) and dist/ (node) both sit one level below vestis/server.
const root = resolve(import.meta.dirname, "..", "..");
const paths: Paths = {
  root,
  wardrobe: resolve(root, "data", "wardrobe.json"),
  media: resolve(root, "data", "media"),
  skills: resolve(root, "skills"),
  webDist: resolve(root, "web", "dist"),
};

const deps: Deps = {
  paths,
  read: (): Promise<Wardrobe> => readWardrobe(paths.wardrobe),
  commit: (update: WardrobeUpdate): Promise<Wardrobe> => mutateWardrobe({ path: paths.wardrobe, update, onWrite: broadcast }),
};

await deps.commit(failInterrupted);

const app = express();
app.disable("x-powered-by");
app.use(localHostOnly);
registerWardrobeRoutes({ app, deps });
registerGarmentRoutes({ app, deps });
registerPeopleRoutes({ app, deps });
registerLookRoutes({ app, deps });
registerExtractionRoutes({ app, deps });
registerSetupRoutes({ app });
const servesWeb = existsSync(paths.webDist);
if (servesWeb) app.use(express.static(paths.webDist));

app.listen(PORT, HOST, (error?: Error): void => {
  if (error) {
    console.error("Failed to start Vestis server:", error);
    process.exit(1);
  }
  console.log(`Vestis server on http://${HOST}:${PORT}`);
  console.log(`  data  ${paths.wardrobe}`);
  void recheckSetup().then((setup): void => console.log(`  setup ${setup.problem ?? "Claude and Higgsfield ready"}`));
  console.log(`  web   ${servesWeb ? paths.webDist : "(not built; use the Vite dev server on 5174)"}`);
});
