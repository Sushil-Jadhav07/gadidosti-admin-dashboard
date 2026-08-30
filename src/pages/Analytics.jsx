import { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { TrendingUp, ClipboardList, IndianRupee, Users, CircleDollarSign } from 'lucide-react';
import StatCard from '../components/StatCard';
import { api, getToken } from '../services/api';

const COLORS = ['#166534', '#17D86B', '#F59E0B', '#0D9488', '#64748B'];

function money(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

function shortMoney(value) {
  const amount = Number(value || 0);
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount}`;
}

function ChartTooltip({ active, payload, label, prefix = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white px-3.5 py-2.5 shadow-dropdown text-sm">
      <p className="text-xs text-neutral-400 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="font-semibold text-secondary flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          {prefix}{Number(entry.value || 0).toLocaleString('en-IN')}
        </p>
      ))}
    </div>
  );
}

function SectionHeader({ eyebrow, title, description, metric }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div>
        {eyebrow && <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-400 font-semibold">{eyebrow}</p>}
        <h3 className="text-base font-poppins font-semibold text-secondary mt-1">{title}</h3>
        {description && <p className="text-sm text-neutral-500 mt-1">{description}</p>}
      </div>
      {metric && <div className="text-sm font-semibold text-primary">{metric}</div>}
    </div>
  );
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({});
  const [stats, setStats] = useState({});

  useEffect(() => {
    const load = async () => {
      const token = getToken();
      const [analyticsRes, statsRes] = await Promise.all([
        api.get('/api/analytics/admin', token),
        api.get('/api/admin/dashboard', token),
      ]);

      setAnalytics(analyticsRes.data || {});
      setStats(statsRes.data || {});
      setLoading(false);
    };

    load().catch(() => setLoading(false));
  }, []);

  const avgBookingsPerDay = useMemo(() => {
    const sparkline = analytics.bookingConversionSparkline || [];
    if (!sparkline.length) return 0;
    return Math.round(sparkline.reduce((sum, value) => sum + value, 0) / sparkline.length);
  }, [analytics]);

  const avgRevenuePerBooking = useMemo(() => {
    const months = analytics.gmvOverMonths || [];
    const totalGmv = months.reduce((sum, item) => sum + Number(item.gmv || 0), 0);
    const totalBookings = Number(stats.totalBookings || 0);
    if (!totalBookings) return 0;
    return Math.round(totalGmv / totalBookings);
  }, [analytics, stats]);

  const repeatClientRate = useMemo(() => {
    const clients = analytics.topClients || [];
    if (!clients.length) return 0;
    const repeatCount = clients.filter((client) => Number(client.spend || 0) > 0).length;
    return Math.round((repeatCount / clients.length) * 100);
  }, [analytics]);

  const brokerEngagementRate = useMemo(() => {
    const fleet = analytics.fleetUtilization || [];
    if (!fleet.length) return 0;
    const engaged = fleet.filter((item) => Number(item.utilization || 0) > 0).length;
    return Math.round((engaged / fleet.length) * 100);
  }, [analytics]);

  const bookingConversionData = useMemo(() => {
    const sparkline = analytics.bookingConversionSparkline || [];
    const start = new Date();
    start.setDate(start.getDate() - (sparkline.length - 1));
    return sparkline.map((value, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return {
        label: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        rate: value,
      };
    });
  }, [analytics]);

  const totalRevenue = useMemo(
    () => (analytics.revenueOverMonths || []).reduce((sum, item) => sum + Number(item.revenue || 0), 0),
    [analytics]
  );

  const averageRevenuePerBroker = useMemo(() => {
    const brokers = analytics.fleetUtilization || [];
    return Math.round(totalRevenue / Math.max(1, brokers.length));
  }, [analytics, totalRevenue]);

  const topClient = analytics.topClients?.[0];
  const topBroker = useMemo(() => {
    const list = analytics.fleetUtilization || [];
    return list.reduce((best, current) => (
      Number(current.utilization || 0) > Number(best?.utilization || 0) ? current : best
    ), null);
  }, [analytics]);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="skeleton h-44 rounded-[28px]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 skeleton h-96 rounded-2xl" />
          <div className="skeleton h-96 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="skeleton h-80 rounded-2xl" />
          <div className="skeleton h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-poppins font-bold text-secondary">Analytics</h1>
        <p className="text-sm text-neutral-500 mt-1">Platform performance metrics and insights</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Delivery Success Rate" value={stats.totalBookings ? Math.max(0, Math.min(100, Math.round((Number(stats.activeTrips || 0) / Number(stats.totalBookings || 1)) * 100))) : 0} icon={TrendingUp} change={stats.bookingsChange || 0} prefix="" />
        <StatCard title="Avg Bookings / Day" value={avgBookingsPerDay} icon={ClipboardList} change={stats.activeTripsChange || 0} />
        <StatCard title="Avg Revenue / Booking" value={avgRevenuePerBooking} icon={IndianRupee} change={stats.revenueChange || 0} prefix="₹" />
        <StatCard title="Broker Engagement" value={brokerEngagementRate} icon={Users} change={stats.trucksChange || 0} prefix="" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2 p-5">
          <SectionHeader
            eyebrow="Performance"
            title="GMV trend vs revenue trend"
            description="Twelve-month movement of gross merchandise value and realized revenue."
            metric={`${analytics.gmvOverMonths?.length || 0} months`}
          />
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={analytics.gmvOverMonths || []} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="analyticsGmvFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#166534" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#166534" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => shortMoney(v).replace('₹', '')} />
              <Tooltip content={<ChartTooltip prefix="₹" />} />
              <Area type="monotone" dataKey="gmv" stroke="#166534" fill="url(#analyticsGmvFill)" strokeWidth={2.5} />
              <Line type="monotone" data={analytics.revenueOverMonths || []} dataKey="revenue" stroke="#0D9488" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <SectionHeader
            eyebrow="Health"
            title="Repeat client share"
            description="Current split between repeat clients and new clients in the tracked top cohort."
            metric={`${repeatClientRate}%`}
          />
          <div className="relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Repeat', value: repeatClientRate },
                    { name: 'New', value: Math.max(0, 100 - repeatClientRate) },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={72}
                  outerRadius={105}
                  paddingAngle={4}
                  dataKey="value"
                >
                  <Cell fill="#166534" />
                  <Cell fill="#E2E8F0" />
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, 'Share']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center">
              <p className="text-3xl font-poppins font-bold text-secondary">{repeatClientRate}%</p>
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-400 mt-1">Repeat</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <SectionHeader
            eyebrow="Conversion"
            title="Booking conversion rhythm"
            description="Sparkline of booking conversion movement across the recent tracking window."
            metric={`${avgBookingsPerDay} avg/day`}
          />
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={bookingConversionData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="conversionFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0D9488" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="label" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="rate" stroke="#0D9488" fill="url(#conversionFill)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <SectionHeader
            eyebrow="Brokers"
            title="Fleet utilization"
            description="Utilization percentages for the most active brokers in the current dataset."
            metric={`${brokerEngagementRate}% engaged`}
          />
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={analytics.fleetUtilization || []} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="broker" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(value) => [`${value}%`, 'Utilization']} />
              <Bar dataKey="utilization" fill="#17D86B" radius={[8, 8, 0, 0]} barSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-4">
        <div className="card p-5">
          <SectionHeader
            eyebrow="Clients"
            title="Top clients by spend"
            description="Highest-spending clients across the current analytics window."
            metric={topClient ? `${money(topClient.spend)} leader` : null}
          />
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.topClients || []} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
              <XAxis type="number" stroke="#94A3B8" fontSize={12} tickFormatter={(v) => shortMoney(v)} />
              <YAxis dataKey="name" type="category" stroke="#64748B" fontSize={12} width={110} />
              <Tooltip content={<ChartTooltip prefix="₹" />} />
              <Bar dataKey="spend" fill="#166534" radius={[0, 8, 8, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <SectionHeader
              eyebrow="Revenue quality"
              title="Average revenue per broker"
              description="Monthly average revenue spread across brokers participating in the fleet dataset."
            />
            <div className="rounded-3xl border border-neutral-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ecfdf5_100%)] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">Live average</p>
                  <p className="mt-2 text-3xl font-poppins font-bold text-secondary">{money(averageRevenuePerBroker)}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
                  <CircleDollarSign size={22} />
                </div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <SectionHeader
              eyebrow="Mix"
              title="Revenue distribution snapshot"
              description="Relative weight of the tracked analytics sections."
            />
            <div className="space-y-3">
              {[
                { label: 'GMV tracked', value: shortMoney((analytics.gmvOverMonths || []).reduce((sum, item) => sum + Number(item.gmv || 0), 0)), color: COLORS[0] },
                { label: 'Revenue tracked', value: shortMoney(totalRevenue), color: COLORS[1] },
                { label: 'Top client leader', value: topClient ? money(topClient.spend) : 'No data', color: COLORS[2] },
                { label: 'Top broker utilization', value: topBroker ? `${topBroker.utilization}%` : 'No data', color: COLORS[3] },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-neutral-600">{item.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-secondary">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
