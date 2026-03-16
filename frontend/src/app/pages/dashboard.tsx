import { Mail, DollarSign, Calendar, Zap, TrendingUp, Activity } from "lucide-react";

export default function DashboardPage() {
  const stats = [
    {
      title: "Emails Processed",
      value: "847",
      change: "+12%",
      icon: Mail,
      gradient: "from-[#941B0C] to-[#BC3908]",
    },
    {
      title: "Financial Updates",
      value: "23",
      change: "+5%",
      icon: DollarSign,
      gradient: "from-[#BC3908] to-[#F6AA1C]",
    },
    {
      title: "Bookings Managed",
      value: "14",
      change: "+8%",
      icon: Calendar,
      gradient: "from-green-500 to-emerald-500",
    },
    {
      title: "API Queries",
      value: "1.2K",
      change: "+18%",
      icon: Zap,
      gradient: "from-[#F6AA1C] to-yellow-500",
    },
  ];

  const recentActivity = [
    {
      action: "Processed 15 new emails",
      time: "2 minutes ago",
      type: "email",
    },
    {
      action: "Updated financial summary",
      time: "1 hour ago",
      type: "finance",
    },
    {
      action: "Confirmed hotel booking for NYC",
      time: "3 hours ago",
      type: "booking",
    },
    {
      action: "Executed 45 API queries",
      time: "5 hours ago",
      type: "api",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-4xl mb-2">
          <span className="bg-gradient-to-r from-[#BC3908] to-[#F6AA1C] bg-clip-text text-transparent">
            Welcome back, Sarah
          </span>
        </h1>
        <p className="text-gray-400">Here's what your AI operator has been working on</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-6 hover:border-[#941B0C]/30 transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center group-hover:scale-110 transition-transform`}
              >
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-1 text-green-400 text-sm">
                <TrendingUp className="w-4 h-4" />
                {stat.change}
              </div>
            </div>
            <div>
              <div className="text-3xl text-white mb-1">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.title}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Two column layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent activity */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-[#941B0C]" />
            <h2 className="text-xl text-white">Recent Activity</h2>
          </div>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-[#F6AA1C] mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{activity.action}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Zap className="w-5 h-5 text-[#F6AA1C]" />
            <h2 className="text-xl text-white">Quick Actions</h2>
          </div>
          <div className="space-y-3">
            {[
              { label: "Check Unread Emails", count: 23 },
              { label: "Review Financial Alerts", count: 5 },
              { label: "View Upcoming Bookings", count: 3 },
              { label: "Run Custom Query", count: null },
            ].map((action, index) => (
              <button
                key={index}
                className="w-full flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-gradient-to-r hover:from-[#941B0C]/10 hover:to-[#F6AA1C]/10 border border-white/10 hover:border-[#941B0C]/30 transition-all text-left group"
              >
                <span className="text-white group-hover:text-[#F6AA1C] transition-colors">
                  {action.label}
                </span>
                {action.count !== null && (
                  <span className="px-2 py-1 rounded-full bg-[#941B0C]/20 text-[#F6AA1C] text-xs">
                    {action.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Status banner */}
      <div className="backdrop-blur-xl bg-gradient-to-r from-[#941B0C]/10 to-[#F6AA1C]/10 border border-[#941B0C]/30 rounded-xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#941B0C] to-[#F6AA1C] flex items-center justify-center">
              <Activity className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <h3 className="text-white">AI Operator Status</h3>
              <p className="text-sm text-gray-400">All systems operational</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-green-400">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}