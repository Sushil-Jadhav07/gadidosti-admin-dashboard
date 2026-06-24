import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend, Area, AreaChart,
} from 'recharts';
import { ClipboardList, Truck, IndianRupee, CarFront, Eye, TrendingUp, Users, AlertTriangle } from 'lucide-react';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import {
  dashboardStats, bookingsOverDays, revenueByWeek, truckTypeDistribution, recentBookings,
} from '../data/mockData';

const PIE_COLORS = ['#1976FF', '#17D86B', '#F59E0B', '#041E42'];

function ChartTooltip({ active, payload, label, prefix = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-secondary text-white px-3.5 py-2.5 rounded-xl shadow-lg text-sm">
      <p className="text-white/60 text-xs mb-1">{label}</p>
      <p className="font-semibold">{prefix}{payload[0].value?.toLocaleString('en-IN')}</p>
    </div>
  );
}

function SectionHeader({ title, action, onAction }) {
  return (
    <div className="card-header">
      <h3 className="card-title">{title}</h3>
      {action && (
        <button onClick={onAction} className="text-sm text-primary font-semibold hover:text-primary-dark transition-colors">
          {action}
        </button>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(t);
  }, []);

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="skeleton h-16 w-72 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 skeleton h-80 rounded-2xl" />
          <div className="skeleton h-80 rounded-2xl" />
        </div>
        <div className="skeleton h-72 rounded-2xl" />
        <div className="skeleton h-72 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-poppins font-bold text-secondary">{greeting}, Admin 👋</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{dateStr} · Here's what's happening today.</p>
        </div>
        <div className="hidden md:flex items-center gap-2 bg-white border border-neutral-200 rounded-xl px-4 py-2.5 shadow-card">
          <span className="w-2 h-2 bg-tertiary rounded-full animate-pulse" />
          <span className="text-sm font-medium text-neutral-700">Live Dashboard</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Bookings"     value={dashboardStats.totalBookings}    icon={ClipboardList} change={dashboardStats.bookingsChange}    changeType="positive" variant="primary" />
        <StatCard title="Active Trips"       value={dashboardStats.activeTrips}      icon={Truck}         change={dashboardStats.activeTripsChange}  changeType="positive" variant="warning" />
        <StatCard title="Total Revenue"      value={dashboardStats.totalRevenue}     icon={IndianRupee}   change={dashboardStats.revenueChange}      changeType="positive" variant="success" prefix="₹" />
        <StatCard title="Registered Trucks"  value={dashboardStats.registeredTrucks} icon={CarFront}      change={dashboardStats.trucksChange}       changeType="positive" variant="secondary" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area Chart - Bookings */}
        <div className="card lg:col-span-2">
          <SectionHeader title="Bookings — Last 7 Days" />
          <div className="p-5">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={bookingsOverDays} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="bookingsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1976FF" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1976FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="day" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#1976FF', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="bookings" stroke="#1976FF" strokeWidth={2.5}
                  fill="url(#bookingsGrad)" dot={{ fill: '#1976FF', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#1976FF', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart - Truck Types */}
        <div className="card">
          <SectionHeader title="Fleet Distribution" />
          <div className="p-5">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={truckTypeDistribution} cx="50%" cy="50%" innerRadius={52} outerRadius={78}
                  paddingAngle={4} dataKey="value">
                  {truckTypeDistribution.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {truckTypeDistribution.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i] }} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-neutral-700 truncate">{item.name}</p>
                    <p className="text-xs text-neutral-400">{item.value} trucks</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Bar Chart */}
      <div className="card">
        <SectionHeader title="Weekly Revenue" />
        <div className="p-5">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenueByWeek} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="week" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false}
                tickFormatter={(v) => `₹${(v/100000).toFixed(1)}L`} />
              <Tooltip content={<ChartTooltip prefix="₹" />} cursor={{ fill: '#1976FF', fillOpacity: 0.05 }} />
              <Bar dataKey="revenue" radius={[8, 8, 0, 0]} barSize={52}>
                {revenueByWeek.map((_, i) => (
                  <Cell key={i} fill={i === revenueByWeek.length - 1 ? '#1976FF' : '#E3F2FD'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-neutral-400 mt-2 text-right">Latest week highlighted in blue</p>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="card">
        <SectionHeader title="Recent Bookings" action="View all →" onAction={() => navigate('/bookings')} />
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Client</th>
                <th>Route</th>
                <th>Truck Type</th>
                <th>Status</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((b) => (
                <tr key={b.id}>
                  <td className="font-semibold text-primary">{b.id}</td>
                  <td className="font-medium text-neutral-800">{b.clientName}</td>
                  <td className="text-neutral-500">{b.route}</td>
                  <td>{b.truckType}</td>
                  <td><Badge status={b.status} /></td>
                  <td className="text-right font-semibold text-neutral-800">₹{b.amount.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
