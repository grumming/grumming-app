import { motion } from "framer-motion";
import { TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const trendingStyles = [
  {
    id: 1,
    name: "Textured Fade",
    description: "Clean sides with textured top",
    image: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400&h=500&fit=crop",
    popularity: "Most Popular",
  },
  {
    id: 2,
    name: "Classic Pompadour",
    description: "Timeless volume and style",
    image: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&h=500&fit=crop",
    popularity: "Trending",
  },
  {
    id: 3,
    name: "Buzz Cut",
    description: "Low maintenance, high impact",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop",
    popularity: "Classic",
  },
  {
    id: 4,
    name: "Undercut",
    description: "Bold contrast styling",
    image: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400&h=500&fit=crop",
    popularity: "Edgy",
  },
  {
    id: 5,
    name: "Crew Cut",
    description: "Clean and professional",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=500&fit=crop",
    popularity: "Professional",
  },
  {
    id: 6,
    name: "Messy Fringe",
    description: "Casual textured look",
    image: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&h=500&fit=crop",
    popularity: "Casual",
  },
];

const TrendingStyles = () => {
  return (
    <section className="py-12 px-4 bg-gradient-to-b from-background to-secondary/20">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2 mb-6"
        >
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-playfair font-semibold text-foreground">
            Trending Styles
          </h2>
        </motion.div>

        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {trendingStyles.map((style, index) => (
              <CarouselItem
                key={style.id}
                className="pl-2 md:pl-4 basis-[70%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="group relative overflow-hidden rounded-2xl bg-card shadow-md hover:shadow-xl transition-all duration-300"
                >
                  <div className="aspect-[3/4] overflow-hidden">
                    <img
                      src={style.image}
                      alt={style.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  </div>

                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1 text-xs font-medium bg-primary/90 text-primary-foreground rounded-full backdrop-blur-sm">
                      {style.popularity}
                    </span>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <h3 className="font-playfair font-semibold text-lg mb-1">
                      {style.name}
                    </h3>
                    <p className="text-sm text-white/80 mb-3">
                      {style.description}
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-0"
                    >
                      Book This Style
                    </Button>
                  </div>
                </motion.div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex -left-4 bg-background/80 backdrop-blur-sm border-border hover:bg-background" />
          <CarouselNext className="hidden md:flex -right-4 bg-background/80 backdrop-blur-sm border-border hover:bg-background" />
        </Carousel>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-muted-foreground mt-6"
        >
          Swipe to explore more styles →
        </motion.p>
      </div>
    </section>
  );
};

export default TrendingStyles;
