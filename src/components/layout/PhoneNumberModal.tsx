import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Phone } from "lucide-react";
import { useMidrangeAuth } from "@/context/MidrangeAuthContext";

interface PhoneNumberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PhoneNumberModal = ({ open, onOpenChange }: PhoneNumberModalProps) => {
  const { user, updateProfile } = useMidrangeAuth();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    setLoading(true);
    try {
      const success = await updateProfile({ phone });
      if (success) {
        toast.success("Phone number added successfully!");
        onOpenChange(false);
      } else {
        toast.error("Failed to update phone number");
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to update phone number");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    sessionStorage.setItem("skipPhoneModalMid", "true");
    onOpenChange(false);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#556b2f] border-white/20 text-[#f4f7ec]">
        <DialogHeader>
          <DialogTitle className="text-[#f7faef]">Complete Your Profile</DialogTitle>
          <DialogDescription className="text-[#d6dfbd]">
            Please add your phone number to help us serve you better.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#f3f7e6]">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#d6dfbd]" />
              <Input
                type="tel"
                placeholder="Enter 10-digit phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                className="pl-10 h-12 rounded-xl bg-white/10 border-white/20 text-[#f7faef] placeholder:text-[#d5dfbb] focus:border-[#eef4df] focus:ring-1 focus:ring-[#eef4df]"
                required
                disabled={loading}
                maxLength={10}
              />
            </div>
            <p className="text-xs text-[#d6dfbd]">We'll never share your phone number.</p>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={handleSkip}
              disabled={loading}
              className="text-[#d6dfbd] hover:text-[#f3f7e6] hover:bg-white/10"
            >
              Skip for now
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#eef4df] text-[#3f4f22] hover:bg-[#dde8c2]"
            >
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};