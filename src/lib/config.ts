/**
 * Application Configuration & Environment Management
 *
 * Supported Environments:
 * - 'PROD': Points to production API / Vercel cloud store. Fetches live mock history and tests.
 * - 'LOCAL': Isolated local development mode using local disk (public/data/).
 *
 * Resolution Order:
 * 1. process.env.environment
 * 2. process.env.ENVIRONMENT
 * 3. process.env.NEXT_PUBLIC_ENVIRONMENT
 * 4. Fallback: 'PROD' on Vercel deployment, 'LOCAL' on local machine
 */

export const APP_ENVIRONMENTS = {
  LOCAL: "LOCAL",
  PROD: "PROD",
} as const;

export type AppEnvironment =
  (typeof APP_ENVIRONMENTS)[keyof typeof APP_ENVIRONMENTS];

// Production server endpoints constants (used when PROD_API_URL is not explicitly set)
export const DEFAULT_PROD_URL = "https://upsc-practice.vercel.app";
export const FALLBACK_PROD_URL = "https://exam-prep-mcqs.vercel.app";

/**
 * Returns the current application environment: 'LOCAL' | 'PROD'
 */
export function getAppEnvironment(): AppEnvironment {
  const envVal = (
    process.env.environment ||
    process.env.ENVIRONMENT ||
    process.env.NEXT_PUBLIC_ENVIRONMENT ||
    ""
  )
    .trim()
    .toUpperCase();

  if (envVal.includes("PROD")) {
    return APP_ENVIRONMENTS.PROD;
  }
  if (envVal.includes("LOCAL")) {
    return APP_ENVIRONMENTS.LOCAL;
  }
  if (process.env.VERCEL) {
    return APP_ENVIRONMENTS.PROD;
  }
  return APP_ENVIRONMENTS.LOCAL;
}

export function isProdEnv(): boolean {
  return getAppEnvironment() === APP_ENVIRONMENTS.PROD;
}

export function isLocalEnv(): boolean {
  return getAppEnvironment() === APP_ENVIRONMENTS.LOCAL;
}

/**
 * Returns the configured production API URL without trailing slash.
 */
export function getProdApiUrl(): string {
  const url = (
    process.env.PROD_API_URL ||
    process.env.PROD_URL ||
    process.env.NEXT_PUBLIC_PROD_API_URL ||
    DEFAULT_PROD_URL
  ).trim();

  return url.replace(/\/+$/, "");
}
