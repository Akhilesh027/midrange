import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/context/WishlistContext";
import { Heart, Trash2, ShoppingBag, Loader2 } from "lucide-react";
const formatPrice = (price: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};
const Wishlist = () => {
  const { wishlist, loading, error, removeFromWishlist } = useWishlist();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = async (productId: string) => {
    setRemovingId(productId);
    try {
      await removeFromWishlist(productId);
    } catch (err) {
      console.error("Failed to remove from wishlist", err);
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#556b2f] text-[#f4f7ec]">
          <div className="container mx-auto px-4 py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#eef4df]" />
            <p className="mt-4 text-[#d6dfbd]">Loading your wishlist...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#556b2f] text-[#f4f7ec]">
          <div className="container mx-auto px-4 py-12 text-center">
            <p className="text-red-300 mb-4">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              className="bg-[#eef4df] text-[#3f4f22] hover:bg-[#dde8c2]"
            >
              Try Again
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!wishlist.length) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#556b2f] text-[#f4f7ec]">
          <div className="container mx-auto px-4 py-12 text-center">
            <Heart className="h-24 w-24 text-[#d6dfbd]/30 mx-auto mb-6" strokeWidth={1} />
            <h1 className="text-2xl font-bold mb-2 text-[#f4f7ec]">Your wishlist is empty</h1>
            <p className="text-[#d6dfbd] mb-6">
              Save your favorite items here for easy access later.
            </p>
            <Link to="/products">
              <Button className="bg-[#eef4df] text-[#3f4f22] hover:bg-[#dde8c2]">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-[#556b2f] text-[#f4f7ec]">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-[#f4f7ec]">My Wishlist</h1>
            <p className="text-sm text-[#d6dfbd]">
              {wishlist.length} item{wishlist.length !== 1 && "s"}
            </p>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wishlist.map((product) => {
              const isRemoving = removingId === product._id;
              const finalPrice = product.discount
                ? product.price * (1 - product.discount / 100)
                : product.price;

              return (
                <div
                  key={product._id}
                  className="group bg-[#4b5e29] rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden bg-[#3f4f22]">
                    <Link to={`/product/${product._id}`}>
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </Link>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <Link to={`/product/${product._id}`}>
                      <h3 className="font-semibold text-[#f4f7ec] hover:text-[#eef4df] transition-colors line-clamp-1">
                        {product.name}
                      </h3>
                    </Link>

                    {/* Price */}
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-lg font-bold text-[#eef4df]">
                        {formatPrice(finalPrice)}
                      </span>
                      {product.discount > 0 && (
                        <span className="text-sm text-[#d6dfbd] line-through">
                          {formatPrice(product.price)}
                        </span>
                      )}
                    </div>

                    {/* Remove Button */}
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemove(product._id)}
                        disabled={isRemoving}
                        className="w-full border-[#dce6c3] text-[#f3f7e8] bg-transparent hover:bg-[#eef4df] hover:text-[#3f4f22]"
                      >
                        {isRemoving ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Wishlist;