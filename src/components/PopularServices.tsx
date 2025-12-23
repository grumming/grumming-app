import { motion } from "framer-motion";
import { Clock, TrendingUp } from "lucide-react";

const services = [
  {
    id: 1,
    name: "Classic Facial",
    category: "Skincare",
    price: "₹1,200",
    duration: "60 min",
    image: "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=400&auto=format&fit=crop&q=80",
    trending: true,
  },
  {
    id: 2,
    name: "Hair Color & Highlights",
    category: "Hair",
    price: "₹3,500",
    duration: "120 min",
    image: "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=400&auto=format&fit=crop&q=80",
    trending: true,
  },
  {
    id: 3,
    name: "Swedish Massage",
    category: "Spa",
    price: "₹2,500",
    duration: "90 min",
    image: "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=400&auto=format&fit=crop&q=80",
    trending: false,
  },
  {
    id: 4,
    name: "Gel Nail Art",
    category: "Nails",
    price: "₹800",
    duration: "45 min",
    image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&auto=format&fit=crop&q=80",
    trending: true,
  },
  {
    id: 5,
    name: "Bridal Makeup",
    category: "Makeup",
    price: "₹15,000",
    duration: "180 min",
    image: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&auto=format&fit=crop&q=80",
    trending: false,
  },
  {
    id: 6,
    name: "Keratin Treatment",
    category: "Hair",
    price: "₹8,000",
    duration: "180 min",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&auto=format&fit=crop&q=80",
    trending: true,
  },
];

const PopularServices = () => {
  return (
    <section className="py-16 px-4">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
            Popular Services
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Most booked treatments by our customers this month
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <div className="group flex gap-4 p-4 bg-card rounded-2xl border border-border/50 hover:border-primary/30 hover:shadow-card transition-all duration-300 cursor-pointer">
                {/* Image */}
                <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden">
                  <img
                    src={service.image}
                    alt={service.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {service.trending && (
                    <div className="absolute top-1 left-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <TrendingUp className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-primary mb-1 block">
                    {service.category}
                  </span>
                  <h3 className="font-display font-semibold text-foreground mb-1 truncate">
                    {service.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{service.duration}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">
                      {service.price}
                    </span>
                    <span className="text-xs text-primary font-medium group-hover:underline">
                      Book →
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PopularServices;
