import { motion } from "framer-motion";
import { Smartphone, Star, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const AppPromo = () => {
  return (
    <section className="py-16 px-4">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl p-8 md:p-12"
          style={{ background: "var(--gradient-primary)" }}
        >
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            {/* Content */}
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 text-white text-sm font-medium mb-4">
                <Star className="w-4 h-4 fill-white" />
                <span>4.9 Rating on App Store</span>
              </div>
              
              <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
                Get the Grumming App
              </h2>
              <p className="text-white/80 text-lg mb-6 max-w-md">
                Book appointments on the go, get exclusive offers, and manage your beauty routine from anywhere.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <Button 
                  variant="glass" 
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 border-0"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download App
                </Button>
              </div>
              
              <div className="flex items-center gap-6 mt-6 justify-center md:justify-start">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">50K+</div>
                  <div className="text-xs text-white/70">Downloads</div>
                </div>
                <div className="w-px h-10 bg-white/20" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">10K+</div>
                  <div className="text-xs text-white/70">Reviews</div>
                </div>
                <div className="w-px h-10 bg-white/20" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">500+</div>
                  <div className="text-xs text-white/70">Salons</div>
                </div>
              </div>
            </div>
            
            {/* Phone mockup */}
            <div className="relative">
              <div className="w-48 h-96 bg-white/10 backdrop-blur-xl rounded-[2.5rem] border border-white/20 p-2 shadow-2xl">
                <div className="w-full h-full bg-background rounded-[2rem] overflow-hidden flex items-center justify-center">
                  <Smartphone className="w-16 h-16 text-primary/30" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AppPromo;
