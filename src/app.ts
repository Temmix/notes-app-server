import express, { type Express, type Router } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth/index";
import { env } from "./config/env";
import notesRouter from "./routes/notes";
import publicNotesRouter from "./routes/public-notes";

export interface BuildAppOptions {
  /**
   * Optional router mounted at /api/_test for integration tests.
   * Production callers should not pass this.
   */
  testRouter?: Router;
}

export function buildApp(options: BuildAppOptions = {}): Express {
  const app = express();

  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    }),
  );
  app.use(cookieParser());

  // better-auth must be mounted BEFORE express.json() — it needs the raw body.
  app.all("/api/auth/*splat", toNodeHandler(auth));

  app.use(express.json());

  app.use("/api/notes", notesRouter);
  app.use("/api/public-notes", publicNotesRouter);

  if (options.testRouter) {
    app.use("/api/_test", options.testRouter);
  }

  return app;
}
