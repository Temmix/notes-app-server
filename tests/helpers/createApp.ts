import { Router, type Express } from "express";
import { buildApp } from "../../src/app";
import { requireAuth } from "../../src/auth/middleware";

/**
 * Builds an Express app with a test-only probe router mounted at /api/_test.
 * The probe is not present in production — it lives entirely in the test
 * harness so we can assert auth middleware behaviour before real routes exist.
 */
export function createApp(): Express {
  const testRouter = Router();

  testRouter.get("/me", requireAuth, (req, res) => {
    res.json({
      id: req.user!.id,
      email: req.user!.email,
      name: req.user!.name,
    });
  });

  return buildApp({ testRouter });
}
