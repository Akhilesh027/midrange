import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: string | number;
  name: string;
  image: string;
  price: {
    old: number;
    new: number;
  };
}

interface ProductSliderProps {
  products: Product[];
  autoSlideInterval?: number; // in milliseconds
  onProductClick?: (product: Product) => void; // 👈 new prop for navigation
}

export function ProductSlider({ products, autoSlideInterval = 10000, onProductClick }: ProductSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [isAnimating, setIsAnimating] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef(0);

  const totalSlides = products.length;

  // Auto-slide logic
  const startAutoSlide = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (totalSlides <= 1) return;
    intervalRef.current = setInterval(() => {
      nextSlide();
    }, autoSlideInterval);
  }, [autoSlideInterval, totalSlides]);

  const stopAutoSlide = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  // Navigate to next slide (right to left)
  const nextSlide = () => {
    if (isAnimating || totalSlides <= 1) return;
    setIsAnimating(true);
    setDirection("right");
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
    setTimeout(() => setIsAnimating(false), 500);
  };

  // Navigate to previous slide (left to right)
  const prevSlide = () => {
    if (isAnimating || totalSlides <= 1) return;
    setIsAnimating(true);
    setDirection("left");
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
    setTimeout(() => setIsAnimating(false), 500);
  };

  // Reset interval on manual navigation
  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation(); // 👈 prevent click from bubbling to image
    stopAutoSlide();
    nextSlide();
    startAutoSlide();
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation(); // 👈 prevent click from bubbling to image
    stopAutoSlide();
    prevSlide();
    startAutoSlide();
  };

  const goToSlide = (index: number) => {
    if (isAnimating || index === currentIndex || totalSlides <= 1) return;
    stopAutoSlide();
    setDirection(index > currentIndex ? "right" : "left");
    setCurrentIndex(index);
    startAutoSlide();
  };

  // Start auto-slide on mount
  useEffect(() => {
    startAutoSlide();
    return () => stopAutoSlide();
  }, [startAutoSlide]);

  // Pause on hover (optional – keeps user experience smooth)
  const handleMouseEnter = () => stopAutoSlide();
  const handleMouseLeave = () => startAutoSlide();

  // Touch gestures for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      if (delta > 0) handlePrev(e as any);
      else handleNext(e as any);
    }
  };

  if (!products.length) {
    return (
      <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-gray-800 h-[400px] md:h-[500px] flex items-center justify-center">
        <p className="text-white/60">No products available</p>
      </div>
    );
  }

  const currentProduct = products[currentIndex];

  const handleImageClick = () => {
    if (onProductClick) {
      onProductClick(currentProduct);
    }
  };

  return (
    <div
      className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Image with slide animation – clickable */}
      <div
        className="relative w-full h-[400px] md:h-[500px] overflow-hidden cursor-pointer"
        onClick={handleImageClick}
      >
        <div
          className={cn(
            "absolute inset-0 flex transition-transform duration-500 ease-out",
            direction === "right" ? "translate-x-0" : "-translate-x-0"
          )}
          style={{
            transform: isAnimating
              ? direction === "right"
                ? "translateX(-100%)"
                : "translateX(100%)"
              : "translateX(0)",
          }}
        >
          <img
            src={currentProduct.image}
            alt={currentProduct.name}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Gradient overlay – also clickable (but transparent) */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-[#1d240f]/80 via-[#1d240f]/20 to-transparent cursor-pointer"
        onClick={handleImageClick}
      />

      {/* Product details card – also clickable */}
      <div
        className="absolute bottom-6 left-6 right-6 rounded-2xl bg-[#f7faef]/10 backdrop-blur-md border border-[#f7faef]/20 p-4 shadow-lg cursor-pointer"
        onClick={handleImageClick}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-[#e0e8c9]/75">Featured Product</p>
            <p className="font-semibold text-[#f8fbf2] truncate">{currentProduct.name}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm text-[#d4ddba]/65 line-through">
              ₹{currentProduct.price.old.toLocaleString()}
            </p>
            <p className="text-xl font-bold text-[#f2f7e6]">
              ₹{currentProduct.price.new.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Arrows (only if more than 1 product) */}
      {totalSlides > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 rounded-full p-2 backdrop-blur-sm transition-all z-10"
            aria-label="Previous product"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 rounded-full p-2 backdrop-blur-sm transition-all z-10"
            aria-label="Next product"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>

          {/* Dots indicator */}
          <div className="absolute bottom-28 left-0 right-0 flex justify-center gap-2 z-10">
            {products.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation(); // 👈 prevent image click
                  goToSlide(idx);
                }}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  idx === currentIndex
                    ? "bg-white w-4"
                    : "bg-white/40 hover:bg-white/60"
                )}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}