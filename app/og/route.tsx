import { ImageResponse } from "next/og"

export const runtime = "edge"

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#081C15", // Darkest forest green
          backgroundImage:
            "linear-gradient(to bottom right, #1B4332 0%, #081C15 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px",
            border: "2px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "40px",
            backgroundColor: "rgba(0, 0, 0, 0.2)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                fontSize: 80,
                fontWeight: 900,
                color: "white",
                letterSpacing: "-0.05em",
                display: "flex",
              }}
            >
              PlanYourTrail
            </div>
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 500,
              color: "rgba(255, 255, 255, 0.6)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            GPX Trail Route Analyzer
          </div>
        </div>

        {/* Decorative elements */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            left: "40px",
            display: "flex",
            alignItems: "center",
            opacity: 0.3,
          }}
        >
          <div
            style={{
              fontSize: 20,
              color: "white",
              letterSpacing: "0.1em",
            }}
          >
            planyourtrail.run
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
