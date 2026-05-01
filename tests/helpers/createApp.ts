// Re-exports the Express app factory so integration tests get a fresh instance per file.
// Phase 3+ will wire this to the real buildApp() once src/app.ts exists.
export function createApp(): unknown {
  throw new Error("createApp() not implemented yet — wired up in Phase 3");
}
