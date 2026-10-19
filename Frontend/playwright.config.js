
import dotenv from "dotenv";

import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";
import path from "node:path";
dotenv.config({
  path: path.resolve(process.cwd(), ".env.e2e")
});
const frontendDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryDirectory = path.resolve(frontendDirectory, "..");
const backendDirectory = path.join(repositoryDirectory, "Backend");

// E2E uses dedicated ports so it never reuses active development servers.
const frontendUrl = "http://localhost:5174";
const backendUrl = "http://localhost:5001";
const musicProviderUrl = "http://localhost:5051";

const requiredEnvironment = [
  "JAMIFY_E2E_MONGODB_URI",
  "JAMIFY_E2E_REDIS_URL",
  "JAMIFY_E2E_JWT_SECRET"
];

const missingEnvironment = requiredEnvironment.filter(
  (name) => !process.env[name]
);

if (missingEnvironment.length > 0) {
  throw new Error(
    "Jamify E2E requires an isolated MongoDB database, Redis instance, and JWT secret. " +
      `Set: ${missingEnvironment.join(", ")}. See e2e/README.md.`
  );
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // Realtime tests run with one worker by default. Independent suites can opt
  // into more workers with JAMIFY_E2E_WORKERS without changing the tests.
  workers: Number(process.env.JAMIFY_E2E_WORKERS || 1),
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: frontendUrl,
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          args: ["--autoplay-policy=no-user-gesture-required"]
        }
      }
    }
  ],
  webServer: [
    {
      command: "node e2e/music-provider-stub.js",
      cwd: backendDirectory,
      url: `${musicProviderUrl}/health`,
      timeout: 30_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        MUSIC_PROVIDER_PORT: "5051"
      }
    },
    {
      command: "npm run start",
      cwd: backendDirectory,
      url: `${backendUrl}/rooms`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: "5001",
        MONGODB_URI: process.env.JAMIFY_E2E_MONGODB_URI,
        REDIS_URL: process.env.JAMIFY_E2E_REDIS_URL,
        JWT_SECRET: process.env.JAMIFY_E2E_JWT_SECRET,
        CLIENT_ORIGIN: frontendUrl,
        MUSIC_PROVIDER_BASE_URL: musicProviderUrl
      }
    },
    {
      command: "npm run dev -- --host localhost --port 5174",
      cwd: frontendDirectory,
      url: frontendUrl,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        VITE_API_URL: backendUrl
      }
    }
  ]
});
