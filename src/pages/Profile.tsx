import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Package, Heart, MapPin, CreditCard, Settings, LogOut, ChevronRight, Edit, Camera } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const Profile = () => {
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'orders', label: 'My Orders', icon: Package },
    { id: 'wishlist', label: 'Wishlist', icon: Heart },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
    { id: 'payments', label: 'Payment Methods', icon: CreditCard },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const user = {
    name: 'John Doe',
    email: 'john.doe@email.com',
    phone: '+91 98765 43210',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80',
  };

  return (
    <Layout>
      {/* Breadcrumb */}
      <nav className="bg-surface-1 py-3 border-b border-border/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 text-sm">
            <Link to="/" className="text-primary hover:underline">Home</Link>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">My Account</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
              {/* User Info */}
              <div className="p-6 border-b border-border/30 text-center">
                <div className="relative inline-block mb-4">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-24 h-24 rounded-full object-cover border-4 border-primary/20"
                  />
                  <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="font-semibold text-foreground">{user.name}</h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>

              {/* Navigation */}
              <nav className="p-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                ))}
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-destructive hover:bg-destructive/10 transition-colors mt-2">
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm font-medium">Logout</span>
                </button>
              </nav>
            </div>
          </aside>

          {/* Content */}
          <main className="lg:col-span-3">
            {activeTab === 'profile' && (
              <div className="bg-card rounded-xl border border-border/50 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-foreground">Personal Information</h2>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">Full Name</label>
                    <Input defaultValue={user.name} className="bg-secondary" />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">Email</label>
                    <Input defaultValue={user.email} className="bg-secondary" />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">Phone</label>
                    <Input defaultValue={user.phone} className="bg-secondary" />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">Date of Birth</label>
                    <Input type="date" className="bg-secondary" />
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-border/30">
                  <Button variant="gold">Save Changes</Button>
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground mb-4">My Orders</h2>
                {[1, 2, 3].map((order) => (
                  <div key={order} className="bg-card rounded-xl border border-border/50 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Order #JSG{order}2345{order}</p>
                        <p className="text-xs text-muted-foreground">Placed on Dec {order + 10}, 2025</p>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                        {order === 1 ? 'Delivered' : order === 2 ? 'In Transit' : 'Processing'}
                      </span>
                    </div>
                    <div className="flex gap-4 items-center">
                      <img
                        src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=100&q=80"
                        alt="Product"
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-foreground">Milano Velvet Sofa</p>
                        <p className="text-sm text-muted-foreground">Qty: 1 × ₹1,29,900</p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/orders">View Details</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'wishlist' && (
              <div className="bg-card rounded-xl border border-border/50 p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">My Wishlist</h2>
                <p className="text-muted-foreground">Your wishlist is empty.</p>
              </div>
            )}

            {activeTab === 'addresses' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-foreground">Saved Addresses</h2>
                  <Button variant="outline">Add New Address</Button>
                </div>
                <div className="bg-card rounded-xl border border-primary/50 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">Default</span>
                      <span className="font-medium text-foreground">Home</span>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    John Doe<br />
                    123 Main Street, Apartment 4B<br />
                    Hyderabad, Telangana 500001<br />
                    Phone: +91 98765 43210
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="bg-card rounded-xl border border-border/50 p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">Payment Methods</h2>
                <p className="text-muted-foreground">No saved payment methods.</p>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="bg-card rounded-xl border border-border/50 p-6">
                <h2 className="text-xl font-semibold text-foreground mb-6">Account Settings</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-border/30">
                    <div>
                      <p className="font-medium text-foreground">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">Receive updates about orders and promotions</p>
                    </div>
                    <input type="checkbox" defaultChecked className="accent-primary" />
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-border/30">
                    <div>
                      <p className="font-medium text-foreground">SMS Alerts</p>
                      <p className="text-sm text-muted-foreground">Get delivery updates via SMS</p>
                    </div>
                    <input type="checkbox" defaultChecked className="accent-primary" />
                  </div>
                  <div className="pt-4">
                    <Button variant="destructive">Delete Account</Button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
