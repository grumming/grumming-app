import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, country = "in", limit = 10 } = await req.json();

    if (!query || query.length < 2) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mapboxToken = Deno.env.get("MAPBOX_PUBLIC_TOKEN") || Deno.env.get("MAPBOX_ACCESS_TOKEN");
    if (!mapboxToken) {
      console.error("MAPBOX_PUBLIC_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Mapbox token not configured", suggestions: [], grouped: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use Mapbox Geocoding API for place search
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${mapboxToken}&country=${country}&types=place,locality,neighborhood,district&limit=${limit}&language=en`;

    const response = await fetch(url);
    
    if (!response.ok) {
      console.error("Mapbox API error:", await response.text());
      return new Response(
        JSON.stringify({ error: "Failed to fetch suggestions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    // Transform Mapbox response to our format
    const suggestions = data.features.map((feature: any) => {
      // Extract city and state from context
      let city = feature.text;
      let state = "";
      let fullPlace = feature.place_name;
      
      if (feature.context) {
        const stateContext = feature.context.find((ctx: any) => 
          ctx.id.startsWith("region")
        );
        if (stateContext) {
          state = stateContext.text;
        }
      }

      return {
        id: feature.id,
        city,
        state,
        fullPlace,
        coordinates: {
          longitude: feature.center[0],
          latitude: feature.center[1],
        },
      };
    });

    // Group by state
    const groupedByState: Record<string, { city: string; coordinates: { latitude: number; longitude: number } }[]> = {};
    
    suggestions.forEach((suggestion: any) => {
      const stateKey = suggestion.state || "Other";
      if (!groupedByState[stateKey]) {
        groupedByState[stateKey] = [];
      }
      groupedByState[stateKey].push({
        city: suggestion.city,
        coordinates: suggestion.coordinates,
      });
    });

    const grouped = Object.entries(groupedByState).map(([state, cities]) => ({
      state,
      cities,
    }));

    return new Response(
      JSON.stringify({ suggestions, grouped }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in places-autocomplete:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
