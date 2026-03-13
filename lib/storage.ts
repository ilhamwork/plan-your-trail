import { supabase } from "./supabase"
import { ParsedRoute } from "./types"

export interface SavedRoute {
  id: string
  userId: string | null
  name: string
  userName: string
  date: string
  fileName: string
  stats: ParsedRoute["stats"]
  routeData: ParsedRoute
  savedAt: string
}

const MAX_ROUTES = 5

// IndexedDB logic removed in favor of Supabase

export const storage = {
  async getRoutes(userId: string | null = null): Promise<SavedRoute[]> {
    if (!userId) return []
    try {
      const { data, error } = await supabase
        .from("saved_routes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) throw error

      return (data || []).map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        name: r.name,
        userName: r.user_name,
        date: r.race_date,
        fileName: r.file_name,
        stats: r.route_data.stats,
        routeData: r.route_data,
        savedAt: r.created_at,
      }))
    } catch (err) {
      console.error("Failed to load routes from Supabase:", err)
      return []
    }
  },

  async saveRoute(
    userId: string | null,
    name: string,
    userName: string,
    date: string,
    fileName: string,
    routeData: ParsedRoute
  ): Promise<{ success: boolean; error?: string }> {
    if (!userId) return { success: false, error: "Please sign in to save routes" }

    try {
      const routes = await this.getRoutes(userId)
      
      const existingRoute = routes.find(
        (r) => r.fileName === fileName && r.name === name
      )

      if (existingRoute) {
        // Update existing route
        const { error } = await supabase
          .from("saved_routes")
          .update({
            name,
            user_name: userName,
            race_date: date,
            route_data: routeData,
          })
          .eq("id", existingRoute.id)

        if (error) throw error
      } else {
        // Check limit
        if (routes.length >= MAX_ROUTES) {
          // Delete oldest
          const oldest = routes[routes.length - 1]
          await this.deleteRoute(oldest.id)
        }

        // Add new route
        const { error } = await supabase
          .from("saved_routes")
          .insert([
            {
              user_id: userId,
              name,
              user_name: userName,
              race_date: date,
              file_name: fileName,
              route_data: routeData,
            },
          ])

        if (error) throw error
      }

      return { success: true }
    } catch (err) {
      console.error("Failed to save route to Supabase:", err)
      return { success: false, error: "Failed to save to database." }
    }
  },

  async deleteRoute(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("saved_routes")
        .delete()
        .eq("id", id)

      if (error) throw error
    } catch (err) {
      console.error("Failed to delete route from Supabase:", err)
    }
  },

  async isLimitReached(userId: string | null = null): Promise<boolean> {
    const routes = await this.getRoutes(userId)
    return routes.length >= MAX_ROUTES
  }
}
