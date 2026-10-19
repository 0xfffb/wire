export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { syncService } = await import("./sync/service");
    syncService.start();
  }
}
