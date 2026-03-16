import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { User, Mail, Upload, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";

export default function EditProfilePage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "Sarah Johnson",
    email: "sarah.johnson@example.com",
    bio: "Digital nomad and productivity enthusiast. Using Aria to streamline my life and focus on what matters.",
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
    navigate("/app/profile");
  };

  const handleCancel = () => {
    navigate("/app/profile");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/app/profile"
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-3xl">
          <span className="bg-gradient-to-r from-[#BC3908] to-[#F6AA1C] bg-clip-text text-transparent">
            Edit Profile
          </span>
        </h1>
      </div>

      {/* Form card */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar upload */}
          <div className="space-y-3">
            <Label className="text-gray-300">Profile Picture</Label>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#941B0C] to-[#F6AA1C] flex items-center justify-center text-white text-3xl shadow-lg shadow-[#941B0C]/25 overflow-hidden">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  "SJ"
                )}
              </div>
              <div>
                <input
                  type="file"
                  id="avatar"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <label htmlFor="avatar">
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-[#941B0C]/50 cursor-pointer"
                    onClick={() => document.getElementById("avatar")?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload New Photo
                  </Button>
                </label>
                <p className="text-sm text-gray-500 mt-2">
                  JPG, PNG or GIF. Max size 2MB
                </p>
              </div>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-300">
              Full Name
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#941B0C] focus:ring-[#941B0C]/20"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-300">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#941B0C] focus:ring-[#941B0C]/20"
              />
            </div>
            <p className="text-sm text-gray-500">
              Changing your email will require verification
            </p>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio" className="text-gray-300">
              Bio
            </Label>
            <Textarea
              id="bio"
              rows={4}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#941B0C] focus:ring-[#941B0C]/20 resize-none"
              placeholder="Tell us a bit about yourself..."
            />
            <p className="text-sm text-gray-500">
              {formData.bio.length} / 200 characters
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-[#941B0C] to-[#F6AA1C] hover:from-[#621708] hover:to-[#BC3908] text-white border-0 shadow-lg shadow-[#941B0C]/25"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
              className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>

      {/* Danger zone */}
      <div className="backdrop-blur-xl bg-red-500/5 border border-red-500/20 rounded-xl p-6">
        <h3 className="text-xl text-red-400 mb-2">Danger Zone</h3>
        <p className="text-sm text-gray-400 mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <Button
          variant="outline"
          className="bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/50"
        >
          Delete Account
        </Button>
      </div>
    </div>
  );
}