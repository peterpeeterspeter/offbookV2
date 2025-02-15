export const env = {
  daily: {
    apiKey: process.env.NEXT_PUBLIC_DAILY_API_KEY,
    domain: process.env.NEXT_PUBLIC_DAILY_DOMAIN,
  },
} as const;

export function validateEnv() {
  const requiredEnvVars = [
    ['NEXT_PUBLIC_DAILY_API_KEY', env.daily.apiKey],
    ['NEXT_PUBLIC_DAILY_DOMAIN', env.daily.domain],
  ] as const;

  const missingEnvVars = requiredEnvVars.filter(([, value]) => !value);

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingEnvVars
        .map(([name]) => name)
        .join(', ')}`
    );
  }
}
