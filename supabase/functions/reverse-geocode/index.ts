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
    const { latitude, longitude } = await req.json();

    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: "Latitude and longitude are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const mapboxToken = Deno.env.get("MAPBOX_PUBLIC_TOKEN");

    if (!mapboxToken) {
      console.error("MAPBOX_PUBLIC_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Mapbox token not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Reverse geocoding coordinates: ${latitude}, ${longitude}`);

    // Use Mapbox Geocoding API for reverse geocoding
    const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxToken}&types=address,neighborhood,locality,place,district,region&language=en`;
    
    const response = await fetch(mapboxUrl);
    const data = await response.json();

    if (!response.ok) {
      console.error("Mapbox API error:", data);
      return new Response(
        JSON.stringify({ error: "Failed to geocode location" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse Mapbox response to extract location components
    const features = data.features || [];
    
    let road = "";
    let neighborhood = "";
    let city = "";
    let state = "";
    let country = "";

    for (const feature of features) {
      const placeType = feature.place_type?.[0];
      const text = feature.text || "";

      if (placeType === "address" && !road) {
        road = text;
      } else if (placeType === "neighborhood" && !neighborhood) {
        neighborhood = text;
      } else if ((placeType === "locality" || placeType === "place") && !city) {
        city = text;
      } else if (placeType === "district" && !city) {
        city = text;
      } else if (placeType === "region" && !state) {
        state = text;
      } else if (placeType === "country" && !country) {
        country = text;
      }
    }

    // Also extract from context if available
    if (features.length > 0 && features[0].context) {
      for (const ctx of features[0].context) {
        const id = ctx.id || "";
        const text = ctx.text || "";

        if (id.startsWith("neighborhood") && !neighborhood) {
          neighborhood = text;
        } else if (id.startsWith("locality") && !city) {
          city = text;
        } else if (id.startsWith("place") && !city) {
          city = text;
        } else if (id.startsWith("district") && !city) {
          city = text;
        } else if (id.startsWith("region") && !state) {
          state = text;
        } else if (id.startsWith("country") && !country) {
          country = text;
        }
      }
    }

    // Build full city name in "City, State" format for city picker compatibility
    let fullCityName = "";
    if (city && state) {
      fullCityName = `${city}, ${state}`;
    } else if (city) {
      fullCityName = city;
    } else if (state) {
      fullCityName = state;
    } else {
      fullCityName = "Unknown Location";
    }

    // Build detailed location name (for display purposes)
    let locationName = "";
    if (road && neighborhood) {
      locationName = `${road}, ${neighborhood}`;
      if (city && city !== neighborhood) locationName += `, ${city}`;
    } else if (neighborhood) {
      locationName = city && city !== neighborhood ? `${neighborhood}, ${city}` : neighborhood;
    } else if (city) {
      locationName = state && state !== city ? `${city}, ${state}` : city;
    } else if (state) {
      locationName = state;
    } else {
      locationName = "Unknown Location";
    }

    console.log(`Geocoded location: ${fullCityName} (detailed: ${locationName})`);

    return new Response(
      JSON.stringify({
        locationName: fullCityName, // Return city, state format for city picker
        detailedLocation: locationName, // Include detailed version if needed
        road,
        neighborhood,
        city,
        state,
        country,
        rawFeatures: features.slice(0, 3), // Include first 3 features for debugging
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in reverse-geocode:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
