import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

// ----- Hotspot Component (with green theme) -----
interface HotspotProps {
  top: string;
  left: string;
  productId: number;
  productName: string;
  price: number;
}

const InteractiveHotspot = ({ top, left, productId, productName, price }: HotspotProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<"right" | "left">("right");
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const formatPrice = (p: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(p);

  const handleClick = () => {
    navigate(`/product/${productId}`);
  };

  useEffect(() => {
    if (containerRef.current) {
      const parent = containerRef.current.closest(".relative, [style*='position']");
      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        const hotspotRect = containerRef.current.getBoundingClientRect();
        const hotspotCenterX = hotspotRect.left + hotspotRect.width / 2;
        const parentCenterX = parentRect.left + parentRect.width / 2;

        if (hotspotCenterX > parentCenterX) {
          setTooltipPosition("left");
        } else {
          setTooltipPosition("right");
        }
      }
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute group cursor-pointer z-20"
      style={{ top, left }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {/* Outer ring animation – using light green */}
      <motion.div
        className="absolute -inset-3 rounded-full border border-[#8ab35c]/40"
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Main dot – gradient from dark green to light green */}
      <motion.div
        className="relative w-4 h-4 rounded-full bg-gradient-to-br from-[#3f4f22] to-[#8ab35c] shadow-[0_0_20px_rgba(106,139,48,0.6)] z-10"
        whileHover={{ scale: 1.3 }}
        transition={{ type: "spring", stiffness: 400 }}
      >
        {/* Inner glow */}
        <div className="absolute inset-0.5 rounded-full bg-gradient-to-br from-white/40 to-transparent" />
      </motion.div>

      {/* Tooltip on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, x: tooltipPosition === "right" ? -10 : 10, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: tooltipPosition === "right" ? -10 : 10, scale: 0.9 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`absolute top-1/2 -translate-y-1/2 z-50 min-w-48 ${
              tooltipPosition === "right" ? "left-8" : "right-8"
            }`}
          >
            {/* Connector line – gradient based on tooltip position */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-4 h-px bg-gradient-to-r ${
                tooltipPosition === "right"
                  ? "left-0 -translate-x-full from-transparent to-[#8ab35c]/60"
                  : "right-0 translate-x-full from-[#8ab35c]/60 to-transparent"
              }`}
            />

            {/* Content card – dark background with green border */}
            <div className="bg-black/95 backdrop-blur-xl rounded-lg border border-[#8ab35c]/30 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(106,139,48,0.1)] overflow-hidden">
              {/* Green accent line */}
              <div className="h-0.5 bg-gradient-to-r from-[#3f4f22] to-[#8ab35c]" />

              <div className="p-4">
                <h4 className="font-heading text-sm font-semibold text-white tracking-wide leading-tight">
                  {productName}
                </h4>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[#8ab35c] font-bold text-lg">{formatPrice(price)}</p>
                  <div className="flex items-center gap-1 text-xs text-white/60 group-hover:text-[#8ab35c] transition-colors">
                    <span>View</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ----- Data (unchanged) -----
const ideasData = [
  {
    image: "https://images.unsplash.com/photo-1582133776712-0b942f3ef601?q=80&w=1074",
    title: "Organizing a place for reading",
    hotspots: [
      { top: "30%", left: "40%", productId: 5, productName: "Milano Armchair", price: 241500 },
      { top: "60%", left: "70%", productId: 3, productName: "Bruno TV Stand", price: 149990 },
    ],
  },
  {
    image: "https://plus.unsplash.com/premium_photo-1690971631383-326a8b5d8ed7?q=80&w=880",
    title: "A romantic armchair in a modern interior",
    hotspots: [
      { top: "35%", left: "30%", productId: 5, productName: "Milano Armchair", price: 241500 },
      { top: "65%", left: "55%", productId: 9, productName: "Marble Luxe Table", price: 169192 },
    ],
  },
  {
    image: "https://plus.unsplash.com/premium_photo-1725295198039-b92478b0ff30?q=80&w=674",
    title: "A modern take on the Gustavian style",
    hotspots: [
      { top: "25%", left: "50%", productId: 1, productName: "Haynes Sofa", price: 958990 },
      { top: "50%", left: "30%", productId: 8, productName: "Enzo Chair", price: 41391 },
      { top: "70%", left: "65%", productId: 9, productName: "Marble Luxe Table", price: 169192 },
    ],
  },
];
const IdeasSection = () => {
  return (
    <section className="py-16 lg:py-24 bg-gradient-to-r from-[#2c3e1c] via-[#4b5e29] to-[#2c3e1c] relative">
      {/* Soft overlay to improve text contrast */}
      <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px]" />

      <div className="container mx-auto px-4 relative z-10">
        <h2 className="text-3xl lg:text-4xl font-heading font-bold text-center mb-12 text-white drop-shadow-lg">
          Need Ideas?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ideasData.map((idea, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.15 }}
              viewport={{ once: true }}
              className="group relative overflow-hidden rounded-2xl aspect-[3/4] cursor-pointer shadow-lg hover:shadow-2xl transition-shadow duration-300"
            >
              <img
                src={idea.image}
                alt={idea.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />

              {/* Dark overlay for text contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              {/* Hotspots */}
              {idea.hotspots.map((hotspot, idx) => (
                <motion.div
                  key={idx}
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 + idx * 0.15 }}
                >
                  <InteractiveHotspot
                    top={hotspot.top}
                    left={hotspot.left}
                    productId={hotspot.productId}
                    productName={hotspot.productName}
                    price={hotspot.price}
                  />
                </motion.div>
              ))}

              {/* Label – green gradient icon + dark glass background */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-black/40 backdrop-blur-xl rounded-xl p-4 border border-white/20 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3f4f22] to-[#8ab35c] flex items-center justify-center shadow-md">
                      <ShoppingBag className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-sm font-medium text-white drop-shadow-md">
                      {idea.title} →
                    </p>
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

export default IdeasSection;