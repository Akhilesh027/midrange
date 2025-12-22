import { Link } from 'react-router-dom';
import { useState } from 'react';
import { X, Mail, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

const collections = [
  {
    id: 'affordable',
    title: 'Affordable',
    subtitle: 'Budget-friendly',
    image: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=400&q=80',
    link: '/affordable',
    available: false,
  },
  {
    id: 'mid',
    title: 'Midrange',
    subtitle: 'Stylish comfort',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80',
    link: '/mid',
    available: true,
  },
  {
    id: 'luxury',
    title: 'Luxury',
    subtitle: 'Designer pieces',
    image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&q=80',
    link: '/luxury',
    available: false,
  },
];

const Collections = () => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: 'Request Submitted',
      description: `Thank you, ${formData.name}! Your request has been submitted successfully.`,
    });
    setIsHelpOpen(false);
    setFormData({ name: '', email: '', phone: '', message: '' });
  };

  const handleCircleClick = (collection: typeof collections[0]) => {
    if (!collection.available) {
      toast({
        title: 'Coming Soon',
        description: `${collection.title} collection is coming soon!`,
      });
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div 
        className="fixed inset-0 bg-cover bg-center z-[-2]"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1920&q=80)',
          filter: 'brightness(0.65)',
        }}
      />
      <div className="fixed inset-0 bg-black/60 z-[-1]" />

      {/* Header */}
      <header className="flex flex-wrap justify-between items-center gap-5 p-5 md:p-8 lg:p-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-primary flex items-center justify-center font-bold text-primary-foreground text-xl shadow-lg shadow-primary/30 hover:rotate-[360deg] transition-transform duration-700">
            JS
          </div>
          <div>
            <div className="font-semibold text-lg text-foreground">JS GALLOR</div>
            <div className="text-xs text-muted-foreground">Furniture & Interiors</div>
          </div>
        </div>
        
        <button 
          className="px-6 py-3 rounded-full bg-transparent backdrop-blur-sm border border-primary text-foreground font-semibold text-xs tracking-wider uppercase transition-all duration-300 hover:bg-primary hover:text-primary-foreground hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/40 relative overflow-hidden group"
        >
          <span className="relative z-10">Enquiry for Interior →</span>
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-600" />
        </button>
      </header>

      {/* Main - Collection Circles */}
      <main className="flex flex-wrap items-center justify-center gap-8 md:gap-12 lg:gap-16 px-5 py-10 min-h-[calc(100vh-120px)]">
        {collections.map((collection) => (
          collection.available ? (
            <Link
              key={collection.id}
              to={collection.link}
              className="group"
            >
              <div 
                className="relative w-40 h-40 md:w-52 md:h-52 lg:w-64 lg:h-64 rounded-full border border-primary bg-cover bg-center cursor-pointer overflow-hidden transition-all duration-500 animate-pulse-gold"
                style={{ 
                  backgroundImage: `url(${collection.image})`,
                  boxShadow: '0 0 40px rgba(255, 210, 77, 0.2)',
                }}
              >
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/40 rounded-full transition-colors duration-300 group-hover:bg-primary/30" />
                
                {/* Label */}
                <div className="absolute inset-0 flex items-end justify-center pb-4 md:pb-6">
                  <div className="relative z-10 text-center transition-colors duration-300">
                    <div className="font-extrabold text-lg md:text-xl text-foreground group-hover:text-primary-foreground">
                      {collection.title}
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground mt-1 group-hover:text-foreground/80">
                      {collection.subtitle}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <div
              key={collection.id}
              onClick={() => handleCircleClick(collection)}
              className="group cursor-pointer"
            >
              <div 
                className="relative w-40 h-40 md:w-52 md:h-52 lg:w-64 lg:h-64 rounded-full border border-primary/50 bg-cover bg-center overflow-hidden transition-all duration-500"
                style={{ 
                  backgroundImage: `url(${collection.image})`,
                  boxShadow: '0 0 40px rgba(255, 210, 77, 0.15)',
                }}
              >
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/50 rounded-full transition-colors duration-300 group-hover:bg-primary/20" />
                
                {/* Label */}
                <div className="absolute inset-0 flex items-end justify-center pb-4 md:pb-6">
                  <div className="relative z-10 text-center">
                    <div className="font-extrabold text-lg md:text-xl text-foreground/70 group-hover:text-foreground">
                      {collection.title}
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground mt-1">
                      {collection.subtitle}
                    </div>
                    <div className="text-[10px] text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      Coming Soon
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        ))}
      </main>

      {/* Help Button */}
      <button
        onClick={() => setIsHelpOpen(true)}
        className="fixed left-5 bottom-5 md:left-8 md:bottom-8 flex items-center gap-3 px-4 py-2 rounded-2xl border border-primary/70 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md text-foreground text-sm font-light tracking-wide transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-lg group z-50"
      >
        Help
        <div className="w-6 h-6 rounded-xl bg-black/20 flex items-center justify-center text-primary font-bold text-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[360deg]">
          i
        </div>
      </button>

      {/* Help Modal */}
      {isHelpOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setIsHelpOpen(false)}
        >
          <div className="glass-card w-full max-w-md p-6 animate-fade-in">
            <h2 className="text-xl font-bold text-foreground mb-2">Contact Us</h2>
            <p className="text-muted-foreground text-sm mb-5">
              Please fill out this form to request help or contact our support team.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                type="text"
                placeholder="Your Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="bg-secondary border-border/50"
              />
              <Input
                type="email"
                placeholder="Your Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="bg-secondary border-border/50"
              />
              <Input
                type="tel"
                placeholder="Your Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-secondary border-border/50"
              />
              <textarea
                placeholder="How can we assist you?"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-none h-24"
              />
              <Button type="submit" variant="gold" className="w-full">
                Submit Request
              </Button>
            </form>

            <div className="mt-5 pt-5 border-t border-border/30 space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                support@jsgalore.com
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                +91 94931 20108
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Hyderabad
              </p>
            </div>

            <button
              onClick={() => setIsHelpOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Collections;
