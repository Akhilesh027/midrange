// src/components/banners/HomeBannerSection.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// Local backend port default as requested
const API_BASE = import.meta.env.VITE_BACKEND_URL || "https://api.jsgallor.com";

interface VideoBanner {
  videoUrl: string;
  posterUrl?: string;
  ctaLink?: string;
  isActive?: boolean;
}

interface DualBannerItem {
  bannerIndex: number;
  imageUrl: string;
  ctaLink?: string;
  isActive?: boolean;
}

const DEFAULT_MIDRANGE_BANNERS = {
  videoBanner: {
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-modern-apartment-living-room-interior-design-4825-large.mp4",
    posterUrl: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1600&q=80",
    ctaLink: "",
    isActive: true,
  },
  dualBanners: [
    {
      bannerIndex: 1,
      imageUrl: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=1200&q=80",
      ctaLink: "/products",
      isActive: true,
    },
    {
      bannerIndex: 2,
      imageUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80",
      ctaLink: "/products",
      isActive: true,
    },
  ],
};

// Helper to detect YouTube video IDs
const getYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  return match ? match[1] : null;
};

// Helper to detect Vimeo video IDs
const getVimeoVideoId = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)/);
  return match ? match[3] : null;
};

// Helper to detect Google Drive video IDs
const getGoogleDriveVideoId = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
};

export const HomeBannerSection = () => {
  const [videoBanner, setVideoBanner] = useState<VideoBanner>(DEFAULT_MIDRANGE_BANNERS.videoBanner);
  const [dualBanners, setDualBanners] = useState<DualBannerItem[]>(DEFAULT_MIDRANGE_BANNERS.dualBanners);

  useEffect(() => {
    let isMounted = true;
    const loadBanners = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/public/banners/midrange?t=${Date.now()}`);
        if (!res.ok) throw new Error("Could not fetch midrange banners");
        const json = await res.json();
        if (json.success && json.data && isMounted) {
          if (json.data.videoBanner && json.data.videoBanner.videoUrl) {
            setVideoBanner(json.data.videoBanner);
          }
          if (Array.isArray(json.data.dualBanners) && json.data.dualBanners.length > 0) {
            setDualBanners(json.data.dualBanners);
          }
        }
      } catch (err) {
        // Fallback to default preset smoothly
      }
    };

    loadBanners();
    return () => {
      isMounted = false;
    };
  }, []);

  const youtubeId = videoBanner.videoUrl ? getYouTubeVideoId(videoBanner.videoUrl) : null;
  const vimeoId = videoBanner.videoUrl ? getVimeoVideoId(videoBanner.videoUrl) : null;
  const driveId = videoBanner.videoUrl ? getGoogleDriveVideoId(videoBanner.videoUrl) : null;

  return (
    <section className="w-full bg-[#495c27] pt-3 pb-6 space-y-4 md:space-y-6">
      <div className="container mx-auto px-4 space-y-4 md:space-y-6">
        {/* 1. Hero Video Banner (Pure video only - absolutely no action buttons, no text) */}
        {videoBanner.isActive !== false && videoBanner.videoUrl && (
          <div className="relative w-full rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-white/15 bg-black aspect-[16/9] md:aspect-[21/9] max-h-[560px]">
            {youtubeId ? (
              <div className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center pointer-events-none">
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&controls=0&modestbranding=1&rel=0&playsinline=1&showinfo=0&iv_load_policy=3&disablekb=1&fs=0`}
                  className="w-[130%] h-[130%] object-cover pointer-events-none"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  title="Hero Video"
                />
              </div>
            ) : vimeoId ? (
              <div className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center pointer-events-none">
                <iframe
                  src={`https://player.vimeo.com/video/${vimeoId}?background=1&autoplay=1&loop=1&muted=1&controls=0`}
                  className="w-[125%] h-[125%] object-cover pointer-events-none"
                  allow="autoplay; fullscreen"
                  title="Hero Video"
                />
              </div>
            ) : driveId ? (
              <div className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center pointer-events-none">
                <iframe
                  src={`https://drive.google.com/file/d/${driveId}/preview`}
                  className="w-[125%] h-[125%] object-cover pointer-events-none"
                  allow="autoplay"
                  title="Google Drive Video"
                />
              </div>
            ) : (
              <video
                key={videoBanner.videoUrl}
                src={videoBanner.videoUrl}
                poster={videoBanner.posterUrl}
                autoPlay
                loop
                muted
                playsInline
                disablePictureInPicture
                className="w-full h-full object-cover pointer-events-none"
              />
            )}
          </div>
        )}

        {/* 2. Dual Promotional Banners (Pure images only - no action buttons, no text) */}
        {dualBanners.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {dualBanners.map((banner, index) => {
              if (banner.isActive === false) return null;
              if (!banner.imageUrl) return null;

              const bannerImage = (
                <div className="group relative w-full rounded-xl md:rounded-2xl overflow-hidden border border-white/15 bg-black/40 aspect-[16/9] shadow-md hover:shadow-2xl transition-all duration-300">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={banner.imageUrl}
                    alt={`Promotional Banner ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    loading="lazy"
                  />
                </div>
              );

              return banner.ctaLink ? (
                <Link
                  key={index}
                  to={banner.ctaLink}
                  className="block focus:outline-none transition-transform active:scale-[0.99]"
                >
                  {bannerImage}
                </Link>
              ) : (
                <div key={index}>{bannerImage}</div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
