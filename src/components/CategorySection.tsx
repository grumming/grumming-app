import { motion } from "framer-motion";
import { Scissors, Sparkles, Heart, Hand, Palette, Crown } from "lucide-react";

const categories = [
  { name: "Haircut", icon: Scissors, color: "from-primary/20 to-primary/5" },
];

const CategorySection = () => {
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
            Browse by Category
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Find the perfect service for your beauty needs
          </p>
        </motion.div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category, index) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <button className="w-full group">
                <div className={`relative p-6 rounded-2xl bg-gradient-to-b ${category.color} border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-card hover:-translate-y-1`}>
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-card flex items-center justify-center shadow-soft group-hover:shadow-glow transition-shadow duration-300">
                      <category.icon className="w-6 h-6 text-primary" />
                    </div>
                    <span className="font-medium text-foreground text-sm">
                      {category.name}
                    </span>
                  </div>
                </div>
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategorySection;
