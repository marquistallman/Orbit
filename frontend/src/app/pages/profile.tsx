import { Link } from "react-router";
import { User, Mail, Calendar, Edit } from "lucide-react";
import { Button } from "../components/ui/button";

export default function ProfilePage() {
  const user = {
    name: "Sarah Johnson",
    email: "sarah.johnson@example.com",
    joinedDate: "March 13, 2025",
    bio: "Digital nomad and productivity enthusiast. Using Aria to streamline my life and focus on what matters.",
    avatar: "SJ",
  };

  const stats = [
    { label: "Tasks Automated", value: "1,247" },
    { label: "Hours Saved", value: "156" },
    { label: "Active Integrations", value: "12" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">
          <span className="bg-gradient-to-r from-[#BC3908] to-[#F6AA1C] bg-clip-text text-transparent">
            Profile
          </span>
        </h1>
        <Link to="/app/profile/edit">
          <Button className="bg-gradient-to-r from-[#941B0C] to-[#F6AA1C] hover:from-[#621708] hover:to-[#BC3908] text-white border-0">
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        </Link>
      </div>

      {/* Profile card */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Avatar */}
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-[#941B0C] to-[#F6AA1C] flex items-center justify-center text-white text-4xl shadow-lg shadow-[#941B0C]/25">
              {user.avatar}
            </div>
            <div className="text-center md:text-left">
              <h2 className="text-2xl text-white mb-1">{user.name}</h2>
              <p className="text-gray-400">Member</p>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 space-y-6">
            {/* Details */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-[#941B0C] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-400">Email Address</p>
                  <p className="text-white">{user.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-[#F6AA1C] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-400">Joined</p>
                  <p className="text-white">{user.joinedDate}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-400">Bio</p>
                  <p className="text-white">{user.bio}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-6 text-center hover:border-[#941B0C]/30 transition-all"
          >
            <div className="text-3xl bg-gradient-to-r from-[#BC3908] to-[#F6AA1C] bg-clip-text text-transparent mb-2">
              {stat.value}
            </div>
            <div className="text-sm text-gray-400">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Account settings preview */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-xl text-white mb-4">Account Settings</h3>
        <div className="space-y-3">
          {[
            { label: "Email Notifications", status: "Enabled" },
            { label: "Two-Factor Authentication", status: "Disabled" },
            { label: "API Access", status: "Active" },
            { label: "Data Export", status: "Available" },
          ].map((setting, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10"
            >
              <span className="text-white">{setting.label}</span>
              <span
                className={`px-3 py-1 rounded-full text-xs ${
                  setting.status === "Enabled" || setting.status === "Active"
                    ? "bg-green-500/20 text-green-300 border border-green-500/30"
                    : setting.status === "Disabled"
                    ? "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                    : "bg-[#F6AA1C]/20 text-[#F6AA1C] border border-[#F6AA1C]/30"
                }`}
              >
                {setting.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}