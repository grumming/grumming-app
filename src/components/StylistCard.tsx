import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

interface StylistCardProps {
  name: string;
  photoUrl: string | null;
  bio: string | null;
  specialties: string[];
  experienceYears: number;
  rating: number;
  totalReviews: number;
  isAvailable: boolean;
}

const StylistCard = ({
  name,
  photoUrl,
  bio,
  specialties,
  experienceYears,
  rating,
  totalReviews,
  isAvailable,
}: StylistCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="w-16 h-16 border-2 border-primary/20">
            <AvatarImage src={photoUrl || undefined} alt={name} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {name.split(" ").map((n) => n[0]).join("")}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display font-semibold text-foreground truncate">
                {name}
              </h3>
              {isAvailable ? (
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0">
                  Available
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-muted text-muted-foreground shrink-0">
                  Busy
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-primary text-primary" />
                <span className="text-sm font-medium text-foreground">{rating}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                ({totalReviews} reviews)
              </span>
              <span className="text-sm text-muted-foreground">
                • {experienceYears} yrs exp
              </span>
            </div>

            {bio && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {bio}
              </p>
            )}

            <div className="flex flex-wrap gap-1.5 mt-3">
              {specialties.slice(0, 3).map((specialty) => (
                <Badge
                  key={specialty}
                  variant="outline"
                  className="text-xs bg-primary/5 border-primary/20 text-primary"
                >
                  {specialty}
                </Badge>
              ))}
              {specialties.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{specialties.length - 3}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StylistCard;
