import { envSchema, type Env } from "./env-schema"

let parsedEnv: Env | null = null

/**
 * Access validated environment variables.
 * Call env(), never process.env directly.
 */
export function env(): Env {
  if (!parsedEnv) {
    const result = envSchema.safeParse(process.env)
    if (!result.success) {
      console.error("Invalid environment variables:", result.error.format())
      throw new Error("Invalid environment variables")
    }
    parsedEnv = result.data
  }
  return parsedEnv
}

/**
 * Reset cached env for testing purposes.
 */
export function _resetEnvForTesting(): void {
  parsedEnv = null
}
