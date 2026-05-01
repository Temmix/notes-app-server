import { buildApp } from "./app";
import { env } from "./config/env";

const app = buildApp();

app.listen(env.PORT, () => {
  console.info(`notes-app-server listening on :${env.PORT}`);
});
