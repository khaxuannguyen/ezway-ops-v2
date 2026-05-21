function readEnv(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    if (fallback !== undefined) return fallback;
    throw new Error(`Thiếu biến môi trường: ${name}`);
  }
  return value;
}

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value === "" ? undefined : value;
}

export const env = {
  NODE_ENV: (process.env.NODE_ENV ?? "development") as
    | "development"
    | "production"
    | "test",
  DATABASE_URL: readOptionalEnv("DATABASE_URL"),
  APP_NAME: readEnv("APP_NAME", "EZWAY Ops"),
};

export type Env = typeof env;
