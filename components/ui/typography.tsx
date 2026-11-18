import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

export const headingVariants = cva("tracking-tight text-[#2D3436]", {
  variants: {
    level: {
      hero: "heading-hero text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight",
      h1: "heading-1 text-2xl sm:text-3xl font-bold tracking-tight",
      h2: "heading-2 text-xl sm:text-2xl font-bold tracking-tight",
      h3: "heading-3 text-base sm:text-lg font-bold tracking-tight",
      h4: "heading-4 text-sm sm:text-base font-semibold tracking-tight",
    },
  },
  defaultVariants: {
    level: "h1",
  },
})

export const textVariants = cva("", {
  variants: {
    variant: {
      subhead: "text-subhead text-sm sm:text-base text-[#4B5563] leading-relaxed",
      body: "body-base text-sm leading-normal text-[#2D3436]",
      bodyMedium: "body-medium text-sm font-medium leading-normal text-[#2D3436]",
      sm: "body-sm text-xs text-[#4B5563] leading-normal",
      smMedium: "body-sm-medium text-xs font-medium text-[#4B5563] leading-normal",
      caption: "text-caption text-xs text-[#6B7280] leading-tight",
      overline: "text-overline text-[11px] font-semibold tracking-wider uppercase text-[#6B7280]",
    },
  },
  defaultVariants: {
    variant: "body",
  },
})

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "span" | "div"

export interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
  as?: HeadingTag
}

export function Heading({
  className,
  level = "h1",
  as,
  children,
  ...props
}: HeadingProps) {
  const Tag: HeadingTag = as ?? (level === "hero" ? "h1" : (level ?? "h1"))
  return React.createElement(
    Tag,
    {
      className: cn(headingVariants({ level }), className),
      ...props,
    },
    children
  )
}

type TextTag = "p" | "span" | "div" | "label"

export interface TextProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof textVariants> {
  as?: TextTag
}

export function Text({
  className,
  variant = "body",
  as: Tag = "p",
  children,
  ...props
}: TextProps) {
  return React.createElement(
    Tag,
    {
      className: cn(textVariants({ variant }), className),
      ...props,
    },
    children
  )
}
