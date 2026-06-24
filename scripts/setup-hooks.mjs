import { execFileSync } from "node:child_process";

try {
  execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
    stdio: "ignore",
  });
  execFileSync("git", ["config", "--local", "core.hooksPath", ".githooks"], {
    stdio: "ignore",
  });
} catch {
  // Ignore environments without git metadata; the hook is only relevant in a repo checkout.
}
