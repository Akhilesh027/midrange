import { Link } from 'react-router-dom';
import { ChevronRight, Package, Truck, CheckCircle, MapPin } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';

const Orders = () => {
  const orders = [
    {
      id: 'JSG12345',
      date: 'Dec 12, 2025',
      status: 'delivered',
      total: 129900,
      items: [
        { name: 'Milano Velvet Sofa', quantity: 1, price: 129900, image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=100&q=80' },
      ],
      tracking: [
        { status: 'Order Placed', date: 'Dec 10, 2025', completed: true },
        { status: 'Confirmed', date: 'Dec 10, 2025', completed: true },
        { status: 'Shipped', date: 'Dec 11, 2025', completed: true },
        { status: 'Out for Delivery', date: 'Dec 12, 2025', completed: true },
        { status: 'Delivered', date: 'Dec 12, 2025', completed: true },
      ],
    },
    {
      id: 'JSG12346',
      date: 'Dec 14, 2025',
      status: 'in_transit',
      total: 74900,
      items: [
        { name: 'Nordic Oak Dining Table', quantity: 1, price: 74900, image: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=100&q=80' },
      ],
      tracking: [
        { status: 'Order Placed', date: 'Dec 13, 2025', completed: true },
        { status: 'Confirmed', date: 'Dec 13, 2025', completed: true },
        { status: 'Shipped', date: 'Dec 14, 2025', completed: true },
        { status: 'Out for Delivery', date: '', completed: false },
        { status: 'Delivered', date: '', completed: false },
      ],
    },
    {
      id: 'JSG12347',
      date: 'Dec 15, 2025',
      status: 'processing',
      total: 38900,
      items: [
        { name: 'Executive Office Chair', quantity: 1, price: 38900, image: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=100&q=80' },
      ],
      tracking: [
        { status: 'Order Placed', date: 'Dec 15, 2025', completed: true },
        { status: 'Confirmed', date: 'Dec 15, 2025', completed: true },
        { status: 'Shipped', date: '', completed: false },
        { status: 'Out for Delivery', date: '', completed: false },
        { status: 'Delivered', date: '', completed: false },
      ],
    },
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-500/10 text-green-500';
      case 'in_transit':
        return 'bg-blue-500/10 text-blue-500';
      case 'processing':
        return 'bg-primary/10 text-primary';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'Delivered';
      case 'in_transit':
        return 'In Transit';
      case 'processing':
        return 'Processing';
      default:
        return status;
    }
  };

  return (
    <Layout>
      {/* Breadcrumb */}
      <nav className="bg-surface-1 py-3 border-b border-border/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 text-sm">
            <Link to="/" className="text-primary hover:underline">Home</Link>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">My Orders</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-8">My Orders</h1>

        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-card rounded-xl border border-border/50 overflow-hidden">
              {/* Order Header */}
              <div className="bg-surface-1 p-4 flex flex-wrap items-center justify-between gap-4 border-b border-border/30">
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Order ID</p>
                    <p className="font-semibold text-foreground">#{order.id}</p>
                  </div>
                  <div className="hidden sm:block h-8 w-px bg-border/50" />
                  <div>
                    <p className="text-sm text-muted-foreground">Placed on</p>
                    <p className="font-medium text-foreground">{order.date}</p>
                  </div>
                  <div className="hidden sm:block h-8 w-px bg-border/50" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="font-semibold text-primary">{formatPrice(order.total)}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
              </div>

              {/* Order Items */}
              <div className="p-4">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex gap-4 items-center">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                      <p className="text-sm text-primary font-semibold">{formatPrice(item.price)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tracking Timeline */}
              <div className="px-4 pb-4">
                <div className="bg-surface-1 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-foreground mb-4">Order Tracking</h4>
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />
                    
                    <div className="space-y-4">
                      {order.tracking.map((step, idx) => (
                        <div key={idx} className="relative flex items-start gap-4 pl-8">
                          <div className={`absolute left-0 w-6 h-6 rounded-full flex items-center justify-center ${
                            step.completed ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          }`}>
                            {step.completed ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-current" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium ${step.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {step.status}
                            </p>
                            {step.date && (
                              <p className="text-xs text-muted-foreground">{step.date}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="px-4 pb-4 flex gap-3">
                <Button variant="outline" size="sm">Track Order</Button>
                {order.status === 'delivered' && (
                  <Button variant="outline" size="sm">Write Review</Button>
                )}
                <Button variant="ghost" size="sm">Need Help?</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Orders;
