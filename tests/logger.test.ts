import { describe, it, expect } from "vitest"
import { logger, childLogger } from "@/lib/logger"

describe("lib/logger", () => {
  it("should create logger instance with child helper", () => {
    expect(logger).toBeDefined()
    expect(typeof logger.info).toBe("function")
    expect(typeof logger.error).toBe("function")
    expect(typeof logger.warn).toBe("function")
    expect(typeof logger.debug).toBe("function")

    const child = childLogger({ action: "testAction", userId: "123" })
    expect(child).toBeDefined()
    expect(typeof child.info).toBe("function")
    expect(typeof child.error).toBe("function")
  })
})
