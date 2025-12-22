export interface Product {
  id: number;
  name: string;
  category: string;
  oldPrice: number;
  newPrice: number;
  image: string;
  hoverImage: string;
  material: string;
  color: string;
  description: string;
  rating: number;
  reviews: number;
  inStock: boolean;
}

export const products: Product[] = [
  {
    id: 1,
    name: "Milano Velvet Sofa",
    category: "Living Room",
    oldPrice: 149900,
    newPrice: 129900,
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80",
    hoverImage: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=600&q=80",
    material: "Velvet",
    color: "Brown",
    description: "Luxurious velvet sofa with premium foam cushioning and solid wood frame.",
    rating: 4.8,
    reviews: 124,
    inStock: true,
  },
  {
    id: 2,
    name: "Nordic Oak Dining Table",
    category: "Dining",
    oldPrice: 89900,
    newPrice: 74900,
    image: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=600&q=80",
    hoverImage: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600&q=80",
    material: "Wood",
    color: "Natural",
    description: "Scandinavian-inspired dining table crafted from solid oak wood.",
    rating: 4.9,
    reviews: 89,
    inStock: true,
  },
  {
    id: 3,
    name: "Executive Office Chair",
    category: "Office",
    oldPrice: 45900,
    newPrice: 38900,
    image: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=600&q=80",
    hoverImage: "https://images.unsplash.com/photo-1589384267710-7a170981ca78?w=600&q=80",
    material: "Leather",
    color: "Black",
    description: "Ergonomic office chair with lumbar support and adjustable armrests.",
    rating: 4.7,
    reviews: 256,
    inStock: true,
  },
  {
    id: 4,
    name: "King Size Platform Bed",
    category: "Bedroom",
    oldPrice: 125900,
    newPrice: 109900,
    image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&q=80",
    hoverImage: "https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=600&q=80",
    material: "Wood",
    color: "Walnut",
    description: "Modern platform bed with integrated headboard and storage drawers.",
    rating: 4.9,
    reviews: 178,
    inStock: true,
  },
  {
    id: 5,
    name: "Marble Coffee Table",
    category: "Living Room",
    oldPrice: 67900,
    newPrice: 54900,
    image: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=600&q=80",
    hoverImage: "https://images.unsplash.com/photo-1618220179428-22790b461013?w=600&q=80",
    material: "Marble",
    color: "White",
    description: "Elegant marble top coffee table with gold-finished steel legs.",
    rating: 4.6,
    reviews: 92,
    inStock: true,
  },
  {
    id: 6,
    name: "Rattan Outdoor Lounge Set",
    category: "Outdoor",
    oldPrice: 189900,
    newPrice: 159900,
    image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=600&q=80",
    hoverImage: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=600&q=80",
    material: "Rattan",
    color: "Natural",
    description: "Weather-resistant rattan set perfect for patios and gardens.",
    rating: 4.5,
    reviews: 67,
    inStock: true,
  },
  {
    id: 7,
    name: "Modern TV Console",
    category: "Living Room",
    oldPrice: 55900,
    newPrice: 47900,
    image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&q=80",
    hoverImage: "https://images.unsplash.com/photo-1585412727339-54e4bae3bbf9?w=600&q=80",
    material: "Wood",
    color: "Black",
    description: "Sleek TV console with cable management and soft-close drawers.",
    rating: 4.7,
    reviews: 143,
    inStock: true,
  },
  {
    id: 8,
    name: "Upholstered Dining Chair",
    category: "Dining",
    oldPrice: 18900,
    newPrice: 14900,
    image: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=600&q=80",
    hoverImage: "https://images.unsplash.com/photo-1551298370-9d3d53f2eb29?w=600&q=80",
    material: "Fabric",
    color: "Grey",
    description: "Comfortable upholstered chair with solid beech wood legs.",
    rating: 4.8,
    reviews: 312,
    inStock: true,
  },
];

export const categories = [
  "Living Room",
  "Bedroom",
  "Dining",
  "Office",
  "Outdoor",
  "Decor",
];

export const materials = ["Wood", "Metal", "Fabric", "Leather", "Velvet", "Marble", "Rattan"];

export const colors = ["Brown", "Black", "White", "Grey", "Natural", "Walnut"];
