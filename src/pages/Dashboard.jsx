import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  ClipboardList, Truck, IndianRupee, CarFront, AlertTriangle, MapPin,
  MoreVertical, ChevronLeft, ChevronRight, Search, Filter,
} from "lucide-react";
import StatCard from "../components/StatCard";
import Badge from "../components/Badge";
import { api, getToken } from "../services/api";
import { STATUS_MAP, bookingRef } from "./Bookings";

const PIE_COLORS = ["#166534", "#0D9488", "#F59E0B", "#64748B", "#94A3B8"];
const TRUCK_TYPE_OPTIONS = ["All Types", "Small", "Medium", "Large"];
const TABLE_PAGE_SIZE = 8;

// Every non-terminal trip status — same set Bookings.jsx's status tabs cover between
// "Accepted" and "Delivered", excluding the request-only "Requested" stage (no trip row
// exists yet for a booking that's still just pending broker acceptance).
const ACTIVE_TRIP_STATUSES = "confirmed,en_route_pickup,picked_up,in_transit";

function ChartTooltip({ active, payload, label, prefix = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-secondary text-white px-3.5 py-2.5 rounded-xl shadow-lg text-sm">
      <p className="text-white/60 text-xs mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="font-semibold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
          {prefix}{Number(entry.value ?? 0).toLocaleString("en-IN")}
        </p>
      ))}
    </div>
  );
}

function SectionHeader({ title, action, onAction, menu }) {
  return (
    <div className="card-header">
      <h3 className="card-title">{title}</h3>
      {action && (
        <button onClick={onAction} className="text-sm text-primary font-semibold hover:text-primary-dark transition-colors">
          {action}
        </button>
      )}
      {menu && (
        <button type="button" aria-label="More options" className="text-neutral-400 hover:text-neutral-600 transition-colors">
          <MoreVertical size={18} />
        </button>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [analytics, setAnalytics] = useState({});
  const [bookings, setBookings] = useState([]);
  const [activeTrips, setActiveTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [tripsError, setTripsError] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [hiddenSeries, setHiddenSeries] = useState({});
  const [tableSearch, setTableSearch] = useState("");
  const [tableTruckFilter, setTableTruckFilter] = useState("All Types");
  const [tablePage, setTablePage] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const token = getToken();
      const [statsRes, analyticsRes, bookingsRes] = await Promise.all([
        api.get("/api/admin/dashboard", token),
        api.get("/api/analytics/admin", token),
        api.get("/api/bookings?limit=200&sort=desc", token),
      ]);

      setStats(statsRes.data || {});
      setAnalytics(analyticsRes.data || {});
      setBookings(bookingsRes.data?.bookings || []);
      setLoading(false);

      // Separate call, not blocking the rest of the dashboard on it — the tracking card has
      // its own loading/error state below.
      try {
        const tripsRes = await api.get(`/api/trips?status=${ACTIVE_TRIP_STATUSES}&limit=50`, token);
        setActiveTrips(tripsRes.data?.trips || []);
      } catch {
        setTripsError(true);
      } finally {
        setTripsLoading(false);
      }
    };

    load().catch(() => setLoading(false));
  }, []);

  useEffect(() => { setTrackIndex(0); }, [activeTrips.length]);
  useEffect(() => { setTablePage(1); }, [tableSearch, tableTruckFilter]);

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const trackedTrip = activeTrips[trackIndex] || null;
  const toggleSeries = (key) => setHiddenSeries((prev) => ({ ...prev, [key]: !prev[key] }));

  // Real week-over-week comparison — the last 7 days of the conversion sparkline against the
  // 7 days before that, aligned by weekday. If there isn't 2 full weeks of history yet, the
  // "last week" side just comes back empty for those points rather than being invented.
  const weeklyComparison = useMemo(() => {
    const sparkline = analytics.bookingConversionSparkline || [];
    const last14 = sparkline.slice(-14);
    const start = new Date();
    start.setDate(start.getDate() - (last14.length - 1));
    return last14.slice(-7).map((_, i) => {
      const thisWeekIndex = last14.length - 7 + i;
      const lastWeekIndex = thisWeekIndex - 7;
      const date = new Date(start);
      date.setDate(start.getDate() + thisWeekIndex);
      return {
        day: date.toLocaleDateString("en-IN", { weekday: "short" }),
        thisWeek: last14[thisWeekIndex] ?? null,
        lastWeek: lastWeekIndex >= 0 ? last14[lastWeekIndex] : null,
      };
    });
  }, [analytics]);

  // Pickup-city breakdown of fetched bookings — top 4 cities plus an "Other" bucket.
  const locationDistribution = useMemo(() => {
    const counts = bookings.reduce((acc, b) => {
      const city = (b.pickup || "Unknown").split(",")[0].trim() || "Unknown";
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {});
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 4).map(([name, value]) => ({ name, value }));
    const restCount = sorted.slice(4).reduce((sum, [, v]) => sum + v, 0);
    if (restCount > 0) top.push({ name: "Other", value: restCount });
    return top;
  }, [bookings]);
  const totalLocationBookings = useMemo(() => locationDistribution.reduce((sum, i) => sum + i.value, 0), [locationDistribution]);

  const filteredBookings = useMemo(() => bookings.filter((b) => {
    const matchTruck = tableTruckFilter === "All Types" ||
      (b.truckCategory || "").toLowerCase() === tableTruckFilter.toLowerCase() ||
      (b.truckType || "").toLowerCase().includes(tableTruckFilter.toLowerCase());
    const term = tableSearch.trim().toLowerCase();
    const matchSearch = !term ||
      String(b.bookingNumber || b.id || "").toLowerCase().includes(term) ||
      String(b.client || "").toLowerCase().includes(term) ||
      String(b.pickup || "").toLowerCase().includes(term) ||
      String(b.drop || "").toLowerCase().includes(term);
    return matchTruck && matchSearch;
  }), [bookings, tableSearch, tableTruckFilter]);

  const tableTotalPages = Math.ceil(filteredBookings.length / TABLE_PAGE_SIZE) || 1;
  const tableStart = (tablePage - 1) * TABLE_PAGE_SIZE;
  const paginatedBookings = filteredBookings.slice(tableStart, tableStart + TABLE_PAGE_SIZE);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="skeleton h-16 w-72 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2 skeleton h-80 rounded-2xl" />
          <div className="skeleton h-80 rounded-2xl" />
          <div className="skeleton h-80 rounded-2xl" />
        </div>
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-poppins font-bold text-secondary">{greeting}, Admin</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{dateStr} · Here's what's happening today.</p>
        </div>
        <div className="hidden md:flex items-center gap-2 bg-white border border-neutral-200 rounded-xl px-4 py-2.5 shadow-card">
          <span className="w-2 h-2 bg-tertiary rounded-full animate-pulse" />
          <span className="text-sm font-medium text-neutral-700">Live Dashboard</span>
        </div>
      </div>

      {stats.stalePendingBookings > 0 && (
        <button
          onClick={() => navigate("/bookings")}
          className="w-full flex items-center gap-3 bg-danger/5 border border-danger/20 rounded-xl px-4 py-3 text-left hover:bg-danger/10 transition-colors"
        >
          <AlertTriangle size={18} className="text-danger flex-shrink-0" />
          <span className="text-sm text-secondary">
            <span className="font-semibold">{stats.stalePendingBookings}</span> booking{stats.stalePendingBookings === 1 ? "" : "s"} {stats.stalePendingBookings === 1 ? "has" : "have"} been pending with no broker response for over 2 hours.
          </span>
        </button>
      )}

      {stats.openIncidents > 0 && (
        <button
          onClick={() => navigate("/incidents")}
          className="w-full flex items-center gap-3 bg-warning/5 border border-warning/20 rounded-xl px-4 py-3 text-left hover:bg-warning/10 transition-colors"
        >
          <AlertTriangle size={18} className="text-warning flex-shrink-0" />
          <span className="text-sm text-secondary">
            <span className="font-semibold">{stats.openIncidents}</span> open trip incident{stats.openIncidents === 1 ? "" : "s"} need{stats.openIncidents === 1 ? "s" : ""} attention.
          </span>
        </button>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Bookings" value={stats.totalBookings || 0} icon={ClipboardList} change={stats.bookingsChange || 0} />
        <StatCard title="Active Trips" value={stats.activeTrips || 0} icon={Truck} change={stats.activeTripsChange || 0} />
        <StatCard title="Total Revenue" value={stats.totalRevenue || 0} icon={IndianRupee} change={stats.revenueChange || 0} prefix="₹" />
        <StatCard title="Registered Trucks" value={stats.registeredTrucks || 0} icon={CarFront} change={stats.trucksChange || 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h3 className="card-title">Shipments Analytics</h3>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => toggleSeries("thisWeek")} className={`flex items-center gap-1.5 text-xs font-medium text-neutral-600 transition-opacity ${hiddenSeries.thisWeek ? "opacity-30" : ""}`}>
                <span className="w-2 h-2 rounded-full bg-primary" /> This week
              </button>
              <button type="button" onClick={() => toggleSeries("lastWeek")} className={`flex items-center gap-1.5 text-xs font-medium text-neutral-600 transition-opacity ${hiddenSeries.lastWeek ? "opacity-30" : ""}`}>
                <span className="w-2 h-2 rounded-full bg-accent" /> Last week
              </button>
            </div>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={weeklyComparison} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="thisWeekGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#166534" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#166534" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="day" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                {!hiddenSeries.thisWeek && (
                  <Area
                    type="monotone" dataKey="thisWeek" name="This week" stroke="#166534" strokeWidth={2.5}
                    fill="url(#thisWeekGrad)" dot={{ fill: "#166534", r: 3, strokeWidth: 0 }} connectNulls
                  />
                )}
                {!hiddenSeries.lastWeek && (
                  <Line
                    type="monotone" dataKey="lastWeek" name="Last week" stroke="#0D9488" strokeWidth={2}
                    strokeDasharray="5 5" dot={{ fill: "#0D9488", r: 3, strokeWidth: 0 }} connectNulls
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Tracking History</h3>
            <div className="flex items-center gap-1">
              <button
                type="button" onClick={() => setTrackIndex((i) => i - 1)} disabled={trackIndex === 0}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button" onClick={() => setTrackIndex((i) => i + 1)} disabled={trackIndex >= activeTrips.length - 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="p-5">
            {tripsLoading ? (
              <div className="skeleton h-52 rounded-xl" />
            ) : tripsError ? (
              <p className="text-sm text-danger">Failed to load active trips.</p>
            ) : !trackedTrip ? (
              <div className="h-52 flex flex-col items-center justify-center text-neutral-400 text-sm">
                <MapPin size={24} className="mb-2 opacity-30" />
                No active trip to track
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between bg-primary-50 rounded-xl px-4 py-3 mb-5">
                  <div className="min-w-0">
                    <p className="text-[11px] text-neutral-400 uppercase tracking-wide">Tracking ID</p>
                    <p className="text-sm font-bold text-secondary truncate">{bookingRef(trackedTrip)}</p>
                  </div>
                  <Badge status={STATUS_MAP[trackedTrip.status] || trackedTrip.status} />
                </div>
                <div>
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center pt-1 flex-shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                      <span className="w-px flex-1 bg-neutral-200 my-1" style={{ minHeight: 28 }} />
                    </div>
                    <div className="pb-5 min-w-0">
                      <p className="text-xs text-neutral-400">Departure Waypoint</p>
                      <p className="text-sm font-semibold text-secondary truncate">{trackedTrip.pickup?.location || "—"}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary block" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-neutral-400">Arrival Waypoint</p>
                      <p className="text-sm font-semibold text-secondary truncate">{trackedTrip.drop?.location || "—"}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="card">
          <SectionHeader title="Traffic by Location" menu />
          <div className="p-5">
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={locationDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value" stroke="none">
                  {locationDistribution.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-3">
              {!locationDistribution.length ? (
                <p className="text-sm text-neutral-400 text-center py-4">No booking data yet</p>
              ) : locationDistribution.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-neutral-700 font-medium truncate">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {item.name}
                  </span>
                  <span className="text-neutral-400 flex-shrink-0">
                    {totalLocationBookings ? Math.round((item.value / totalLocationBookings) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <SectionHeader title="Bookings" action="View all →" onAction={() => navigate("/bookings")} />
        <div className="px-5 pt-4 pb-1 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by ID, client, route..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
            />
          </div>
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <select
              value={tableTruckFilter}
              onChange={(e) => setTableTruckFilter(e.target.value)}
              className="appearance-none pl-9 pr-8 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-700 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              {TRUCK_TYPE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="px-5 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Booking ID</th>
                <th className="px-5 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Client</th>
                <th className="px-5 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Truck Type</th>
                <th className="px-5 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Weight</th>
                <th className="px-5 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Route</th>
                <th className="px-5 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Date</th>
                <th className="px-5 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {!paginatedBookings.length ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-neutral-400">No bookings found</td>
                </tr>
              ) : paginatedBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-neutral-50/60 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-semibold text-primary whitespace-nowrap">{bookingRef(booking)}</td>
                  <td className="px-5 py-3.5 text-sm text-neutral-700 whitespace-nowrap">{booking.client || "-"}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
                      {booking.truckType || booking.truckCategory || "-"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-neutral-500 whitespace-nowrap">
                    {booking.weight ? `${booking.weight} ${booking.weightUnit || ""}` : "-"}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-neutral-500 max-w-[200px] truncate" title={`${booking.pickup} → ${booking.drop}`}>
                    {booking.pickup} → {booking.drop}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-neutral-500 whitespace-nowrap">
                    {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString("en-IN") : "-"}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <Badge status={STATUS_MAP[booking.status] || booking.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredBookings.length > 0 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-neutral-100">
            <p className="text-xs text-neutral-400">
              Showing {tableStart + 1}–{Math.min(tableStart + TABLE_PAGE_SIZE, filteredBookings.length)} of {filteredBookings.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                disabled={tablePage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-neutral-600 px-2">{tablePage} / {tableTotalPages}</span>
              <button
                onClick={() => setTablePage((p) => Math.min(tableTotalPages, p + 1))}
                disabled={tablePage === tableTotalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
