import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import StylistCard from "./StylistCard";
import { Skeleton } from "@/components/ui/skeleton";

interface StylistsListProps {
  salonId: string;
}

const StylistsList = ({ salonId }: StylistsListProps) => {
  const { data: stylists, isLoading } = useQuery({
    queryKey: ["stylists", salonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stylists")
        .select("*")
        .eq("salon_id", salonId)
        .order("rating", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4 p-4 border rounded-xl">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!stylists || stylists.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No stylists available for this salon yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {stylists.map((stylist) => (
        <StylistCard
          key={stylist.id}
          name={stylist.name}
          photoUrl={stylist.photo_url}
          bio={stylist.bio}
          specialties={stylist.specialties || []}
          experienceYears={stylist.experience_years || 0}
          rating={Number(stylist.rating) || 0}
          totalReviews={stylist.total_reviews || 0}
          isAvailable={stylist.is_available ?? true}
        />
      ))}
    </div>
  );
};

export default StylistsList;
