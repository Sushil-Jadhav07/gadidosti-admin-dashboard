// ===== DASHBOARD STATS =====
export const dashboardStats = {
  totalBookings: 12480,
  activeTrips: 342,
  totalRevenue: 4820000,
  registeredTrucks: 5120,
  bookingsChange: 12.5,
  activeTripsChange: 8.2,
  revenueChange: 18.3,
  trucksChange: 6.7,
};

// ===== BOOKINGS OVER LAST 7 DAYS (Line Chart) =====
export const bookingsOverDays = [
  { day: 'Mon', bookings: 145 },
  { day: 'Tue', bookings: 192 },
  { day: 'Wed', bookings: 168 },
  { day: 'Thu', bookings: 210 },
  { day: 'Fri', bookings: 245 },
  { day: 'Sat', bookings: 189 },
  { day: 'Sun', bookings: 156 },
];

// ===== REVENUE BY WEEK (Bar Chart) =====
export const revenueByWeek = [
  { week: 'Week 1', revenue: 1050000 },
  { week: 'Week 2', revenue: 1280000 },
  { week: 'Week 3', revenue: 980000 },
  { week: 'Week 4', revenue: 1510000 },
];

// ===== TRUCK TYPE DISTRIBUTION (Pie Chart) =====
export const truckTypeDistribution = [
  { name: 'Small', value: 1840, color: '#1976FF' },
  { name: 'Medium', value: 1530, color: '#17D86B' },
  { name: 'Large', value: 1020, color: '#F59E0B' },
  { name: 'Part Truck', value: 730, color: '#8B5CF6' },
];

// ===== RECENT BOOKINGS (Dashboard Table) =====
export const recentBookings = [
  { id: 'BKG-202412-001', clientName: 'Rajesh Kumar', route: 'Mumbai → Pune', truckType: 'Medium', status: 'In Transit', amount: 8500 },
  { id: 'BKG-202412-002', clientName: 'Priya Sharma', route: 'Delhi → Jaipur', truckType: 'Large', status: 'Delivered', amount: 15200 },
  { id: 'BKG-202412-003', clientName: 'Amit Patel', route: 'Bengaluru → Chennai', truckType: 'Small', status: 'Assigned', amount: 6200 },
  { id: 'BKG-202412-004', clientName: 'Sneha Gupta', route: 'Hyderabad → Pune', truckType: 'Part Truck', status: 'Picked Up', amount: 3400 },
  { id: 'BKG-202412-005', clientName: 'Vikram Singh', route: 'Mumbai → Delhi', truckType: 'Large', status: 'En Route', amount: 28500 },
];

// ===== FULL BOOKINGS DATA =====
export const allBookings = [
  {
    id: 'BKG-202412-001', client: 'Rajesh Kumar', clientPhone: '+91 98765 43210', clientEmail: 'rajesh@example.com',
    pickup: 'Andheri, Mumbai', drop: 'Hinjewadi, Pune', truckType: 'Medium', broker: 'Agarwal Transport',
    driver: 'Suresh Yadav', driverPhone: '+91 98765 12345', status: 'In Transit', amount: 8500,
    date: '2024-12-15', weight: '3.5 Tons', material: 'Electronics',
    pricing: { baseFare: 6000, fuel: 1800, toll: 400, platformFee: 300, total: 8500 },
    timeline: ['Requested', 'Accepted', 'Assigned', 'En Route Pickup', 'Picked Up', 'In Transit'],
    paymentStatus: 'Paid',
  },
  {
    id: 'BKG-202412-002', client: 'Priya Sharma', clientPhone: '+91 98765 43211', clientEmail: 'priya@example.com',
    pickup: 'Karol Bagh, Delhi', drop: 'Malviya Nagar, Jaipur', truckType: 'Large', broker: 'Sharma Logistics',
    driver: 'Mahesh Sharma', driverPhone: '+91 98765 12346', status: 'Delivered', amount: 15200,
    date: '2024-12-14', weight: '8 Tons', material: 'Furniture',
    pricing: { baseFare: 11000, fuel: 2800, toll: 800, platformFee: 600, total: 15200 },
    timeline: ['Requested', 'Accepted', 'Assigned', 'En Route Pickup', 'Picked Up', 'In Transit', 'Delivered', 'Completed'],
    paymentStatus: 'Paid',
  },
  {
    id: 'BKG-202412-003', client: 'Amit Patel', clientPhone: '+91 98765 43212', clientEmail: 'amit@example.com',
    pickup: 'Whitefield, Bengaluru', drop: 'T Nagar, Chennai', truckType: 'Small', broker: 'Patel Transport Co.',
    driver: 'Ramesh Patel', driverPhone: '+91 98765 12347', status: 'Assigned', amount: 6200,
    date: '2024-12-15', weight: '1.2 Tons', material: 'Pharma Products',
    pricing: { baseFare: 4500, fuel: 1200, toll: 300, platformFee: 200, total: 6200 },
    timeline: ['Requested', 'Accepted', 'Assigned'],
    paymentStatus: 'Pending',
  },
  {
    id: 'BKG-202412-004', client: 'Sneha Gupta', clientPhone: '+91 98765 43213', clientEmail: 'sneha@example.com',
    pickup: 'Gachibowli, Hyderabad', drop: 'Baner, Pune', truckType: 'Part Truck', broker: 'Gupta Freight Services',
    driver: 'Dinesh Gupta', driverPhone: '+91 98765 12348', status: 'Picked Up', amount: 3400,
    date: '2024-12-13', weight: '0.8 Tons', material: 'Apparel',
    pricing: { baseFare: 2400, fuel: 700, toll: 200, platformFee: 100, total: 3400 },
    timeline: ['Requested', 'Accepted', 'Assigned', 'En Route Pickup', 'Picked Up'],
    paymentStatus: 'Paid',
  },
  {
    id: 'BKG-202412-005', client: 'Vikram Singh', clientPhone: '+91 98765 43214', clientEmail: 'vikram@example.com',
    pickup: 'Bandra, Mumbai', drop: 'Connaught Place, Delhi', truckType: 'Large', broker: 'Singh & Sons Transport',
    driver: 'Karan Singh', driverPhone: '+91 98765 12349', status: 'En Route', amount: 28500,
    date: '2024-12-12', weight: '12 Tons', material: 'Steel Pipes',
    pricing: { baseFare: 22000, fuel: 4500, toll: 1200, platformFee: 800, total: 28500 },
    timeline: ['Requested', 'Accepted', 'Assigned', 'En Route Pickup'],
    paymentStatus: 'Pending',
  },
  {
    id: 'BKG-202412-006', client: 'Anita Reddy', clientPhone: '+91 98765 43215', clientEmail: 'anita@example.com',
    pickup: 'HiTech City, Hyderabad', drop: 'ECIL, Hyderabad', truckType: 'Small', broker: 'Reddy Logistics',
    driver: 'Prasad Reddy', driverPhone: '+91 98765 12350', status: 'Completed', amount: 2800,
    date: '2024-12-11', weight: '0.9 Tons', material: 'Documents & Files',
    pricing: { baseFare: 2000, fuel: 500, toll: 150, platformFee: 150, total: 2800 },
    timeline: ['Requested', 'Accepted', 'Assigned', 'En Route Pickup', 'Picked Up', 'In Transit', 'Delivered', 'Completed'],
    paymentStatus: 'Paid',
  },
  {
    id: 'BKG-202412-007', client: 'Mohammed Ali', clientPhone: '+91 98765 43216', clientEmail: 'ali@example.com',
    pickup: 'Koramangala, Bengaluru', drop: 'Coimbatore Main', truckType: 'Medium', broker: 'Ali Transport Services',
    driver: 'Faisal Khan', driverPhone: '+91 98765 12351', status: 'In Transit', amount: 9800,
    date: '2024-12-14', weight: '4.2 Tons', material: 'Textiles',
    pricing: { baseFare: 7000, fuel: 2100, toll: 450, platformFee: 250, total: 9800 },
    timeline: ['Requested', 'Accepted', 'Assigned', 'En Route Pickup', 'Picked Up', 'In Transit'],
    paymentStatus: 'Pending',
  },
  {
    id: 'BKG-202412-008', client: 'Deepak Verma', clientPhone: '+91 98765 43217', clientEmail: 'deepak@example.com',
    pickup: 'Sector 62, Noida', drop: 'Sector 18, Gurgaon', truckType: 'Small', broker: 'Verma Goods Carrier',
    driver: 'Sanjay Verma', driverPhone: '+91 98765 12352', status: 'Cancelled', amount: 0,
    date: '2024-12-10', weight: '1.5 Tons', material: 'Food Products',
    pricing: { baseFare: 0, fuel: 0, toll: 0, platformFee: 0, total: 0 },
    timeline: ['Requested', 'Cancelled'],
    paymentStatus: 'Refunded',
  },
  {
    id: 'BKG-202412-009', client: 'Lakshmi Nair', clientPhone: '+91 98765 43218', clientEmail: 'lakshmi@example.com',
    pickup: 'Edappally, Kochi', drop: 'Trivandrum Central', truckType: 'Medium', broker: 'Nair Transport',
    driver: 'Rajan Nair', driverPhone: '+91 98765 12353', status: 'Delivered', amount: 7200,
    date: '2024-12-13', weight: '3 Tons', material: 'Coconut Oil',
    pricing: { baseFare: 5200, fuel: 1400, toll: 350, platformFee: 250, total: 7200 },
    timeline: ['Requested', 'Accepted', 'Assigned', 'En Route Pickup', 'Picked Up', 'In Transit', 'Delivered', 'Completed'],
    paymentStatus: 'Paid',
  },
  {
    id: 'BKG-202412-010', client: 'Harish Joshi', clientPhone: '+91 98765 43219', clientEmail: 'harish@example.com',
    pickup: 'Viman Nagar, Pune', drop: 'Nashik Road', truckType: 'Large', broker: 'Joshi Freight Lines',
    driver: 'Ganesh Joshi', driverPhone: '+91 98765 12354', status: 'Picked Up', amount: 11500,
    date: '2024-12-15', weight: '7 Tons', material: 'Cement Bags',
    pricing: { baseFare: 8500, fuel: 2200, toll: 500, platformFee: 300, total: 11500 },
    timeline: ['Requested', 'Accepted', 'Assigned', 'En Route Pickup', 'Picked Up'],
    paymentStatus: 'Paid',
  },
  {
    id: 'BKG-202412-011', client: 'Meera Iyer', clientPhone: '+91 98765 43220', clientEmail: 'meera@example.com',
    pickup: 'Anna Nagar, Chennai', drop: 'Madurai Central', truckType: 'Small', broker: 'Iyer Logistics',
    driver: 'Venkat Iyer', driverPhone: '+91 98765 12355', status: 'In Transit', amount: 5400,
    date: '2024-12-14', weight: '1.8 Tons', material: 'Auto Parts',
    pricing: { baseFare: 3800, fuel: 1100, toll: 300, platformFee: 200, total: 5400 },
    timeline: ['Requested', 'Accepted', 'Assigned', 'En Route Pickup', 'Picked Up', 'In Transit'],
    paymentStatus: 'Pending',
  },
  {
    id: 'BKG-202412-012', client: 'Ravi Shankar', clientPhone: '+91 98765 43221', clientEmail: 'ravi@example.com',
    pickup: 'Salt Lake, Kolkata', drop: 'Durgapur', truckType: 'Medium', broker: 'Shankar Transport',
    driver: 'Manoj Kumar', driverPhone: '+91 98765 12356', status: 'Assigned', amount: 6800,
    date: '2024-12-15', weight: '3.2 Tons', material: 'Machinery Parts',
    pricing: { baseFare: 4800, fuel: 1500, toll: 350, platformFee: 150, total: 6800 },
    timeline: ['Requested', 'Accepted', 'Assigned'],
    paymentStatus: 'Paid',
  },
];

// ===== USERS (CLIENTS) =====
export const users = [
  { id: 'USR-001', name: 'Rajesh Kumar', phone: '+91 98765 43210', email: 'rajesh@example.com', totalBookings: 48, totalSpend: 385000, joinedDate: '2023-08-15', status: 'Active' },
  { id: 'USR-002', name: 'Priya Sharma', phone: '+91 98765 43211', email: 'priya@example.com', totalBookings: 32, totalSpend: 256000, joinedDate: '2023-09-22', status: 'Active' },
  { id: 'USR-003', name: 'Amit Patel', phone: '+91 98765 43212', email: 'amit@example.com', totalBookings: 67, totalSpend: 524000, joinedDate: '2023-05-10', status: 'Active' },
  { id: 'USR-004', name: 'Sneha Gupta', phone: '+91 98765 43213', email: 'sneha@example.com', totalBookings: 23, totalSpend: 148000, joinedDate: '2024-01-08', status: 'Active' },
  { id: 'USR-005', name: 'Vikram Singh', phone: '+91 98765 43214', email: 'vikram@example.com', totalBookings: 89, totalSpend: 712000, joinedDate: '2023-03-18', status: 'Active' },
  { id: 'USR-006', name: 'Anita Reddy', phone: '+91 98765 43215', email: 'anita@example.com', totalBookings: 15, totalSpend: 92000, joinedDate: '2024-06-20', status: 'Blocked' },
  { id: 'USR-007', name: 'Mohammed Ali', phone: '+91 98765 43216', email: 'ali@example.com', totalBookings: 54, totalSpend: 418000, joinedDate: '2023-11-05', status: 'Active' },
  { id: 'USR-008', name: 'Deepak Verma', phone: '+91 98765 43217', email: 'deepak@example.com', totalBookings: 12, totalSpend: 64000, joinedDate: '2024-08-12', status: 'Blocked' },
  { id: 'USR-009', name: 'Lakshmi Nair', phone: '+91 98765 43218', email: 'lakshmi@example.com', totalBookings: 41, totalSpend: 312000, joinedDate: '2023-07-30', status: 'Active' },
  { id: 'USR-010', name: 'Harish Joshi', phone: '+91 98765 43219', email: 'harish@example.com', totalBookings: 76, totalSpend: 598000, joinedDate: '2023-04-25', status: 'Active' },
  { id: 'USR-011', name: 'Meera Iyer', phone: '+91 98765 43220', email: 'meera@example.com', totalBookings: 28, totalSpend: 198000, joinedDate: '2024-02-14', status: 'Active' },
  { id: 'USR-012', name: 'Ravi Shankar', phone: '+91 98765 43221', email: 'ravi@example.com', totalBookings: 35, totalSpend: 245000, joinedDate: '2023-10-01', status: 'Active' },
];

// ===== BROKERS =====
export const brokers = [
  { id: 'BRK-001', name: 'Agarwal Transport', phone: '+91 98765 11111', gst: '27AABCU9603R1ZM', fleetSize: 45, activeTrucks: 32, totalEarnings: 2450000, kycStatus: 'Verified' },
  { id: 'BRK-002', name: 'Sharma Logistics', phone: '+91 98765 11112', gst: '07AAECS1234R1ZP', fleetSize: 28, activeTrucks: 18, totalEarnings: 1520000, kycStatus: 'Verified' },
  { id: 'BRK-003', name: 'Patel Transport Co.', phone: '+91 98765 11113', gst: '24AAAFB1234R1ZQ', fleetSize: 62, activeTrucks: 48, totalEarnings: 3680000, kycStatus: 'Verified' },
  { id: 'BRK-004', name: 'Gupta Freight Services', phone: '+91 98765 11114', gst: '09AAACG5678R1ZU', fleetSize: 15, activeTrucks: 10, totalEarnings: 680000, kycStatus: 'Pending' },
  { id: 'BRK-005', name: 'Singh & Sons Transport', phone: '+91 98765 11115', gst: '03AAASI9012R1ZT', fleetSize: 38, activeTrucks: 25, totalEarnings: 1890000, kycStatus: 'Verified' },
  { id: 'BRK-006', name: 'Reddy Logistics', phone: '+91 98765 11116', gst: '36AAACR3456R1ZV', fleetSize: 22, activeTrucks: 14, totalEarnings: 1120000, kycStatus: 'Verified' },
  { id: 'BRK-007', name: 'Ali Transport Services', phone: '+91 98765 11117', gst: '29AAATA7890R1ZW', fleetSize: 55, activeTrucks: 40, totalEarnings: 3120000, kycStatus: 'Verified' },
  { id: 'BRK-008', name: 'Verma Goods Carrier', phone: '+91 98765 11118', gst: '06AAAVG2345R1ZX', fleetSize: 12, activeTrucks: 8, totalEarnings: 520000, kycStatus: 'Pending' },
  { id: 'BRK-009', name: 'Nair Transport', phone: '+91 98765 11119', gst: '32AAANM6789R1ZY', fleetSize: 30, activeTrucks: 22, totalEarnings: 1480000, kycStatus: 'Verified' },
  { id: 'BRK-010', name: 'Joshi Freight Lines', phone: '+91 98765 11120', gst: '27AAAJF0123R1ZZ', fleetSize: 42, activeTrucks: 30, totalEarnings: 2340000, kycStatus: 'Verified' },
  { id: 'BRK-011', name: 'Iyer Logistics', phone: '+91 98765 11121', gst: '33AAAIY4567R1ZA', fleetSize: 18, activeTrucks: 12, totalEarnings: 890000, kycStatus: 'Pending' },
  { id: 'BRK-012', name: 'Shankar Transport', phone: '+91 98765 11122', gst: '19AAAST8901R1ZB', fleetSize: 35, activeTrucks: 26, totalEarnings: 1760000, kycStatus: 'Verified' },
];

// ===== DRIVERS =====
export const drivers = [
  { id: 'DRV-001', name: 'Suresh Yadav', phone: '+91 98765 12345', licenseNo: 'MH-12-2018-1234567', broker: 'Agarwal Transport', status: 'On Trip', totalTrips: 342 },
  { id: 'DRV-002', name: 'Mahesh Sharma', phone: '+91 98765 12346', licenseNo: 'DL-05-2019-2345678', broker: 'Sharma Logistics', status: 'Available', totalTrips: 256 },
  { id: 'DRV-003', name: 'Ramesh Patel', phone: '+91 98765 12347', licenseNo: 'GJ-01-2020-3456789', broker: 'Patel Transport Co.', status: 'On Trip', totalTrips: 189 },
  { id: 'DRV-004', name: 'Dinesh Gupta', phone: '+91 98765 12348', licenseNo: 'UP-32-2017-4567890', broker: 'Gupta Freight Services', status: 'Available', totalTrips: 423 },
  { id: 'DRV-005', name: 'Karan Singh', phone: '+91 98765 12349', licenseNo: 'PB-02-2021-5678901', broker: 'Singh & Sons Transport', status: 'On Trip', totalTrips: 178 },
  { id: 'DRV-006', name: 'Prasad Reddy', phone: '+91 98765 12350', licenseNo: 'TS-08-2019-6789012', broker: 'Reddy Logistics', status: 'Offline', totalTrips: 267 },
  { id: 'DRV-007', name: 'Faisal Khan', phone: '+91 98765 12351', licenseNo: 'KA-03-2020-7890123', broker: 'Ali Transport Services', status: 'On Trip', totalTrips: 198 },
  { id: 'DRV-008', name: 'Sanjay Verma', phone: '+91 98765 12352', licenseNo: 'HR-26-2018-8901234', broker: 'Verma Goods Carrier', status: 'Available', totalTrips: 312 },
  { id: 'DRV-009', name: 'Rajan Nair', phone: '+91 98765 12353', licenseNo: 'KL-07-2021-9012345', broker: 'Nair Transport', status: 'On Trip', totalTrips: 145 },
  { id: 'DRV-010', name: 'Ganesh Joshi', phone: '+91 98765 12354', licenseNo: 'MH-14-2019-0123456', broker: 'Joshi Freight Lines', status: 'On Trip', totalTrips: 234 },
  { id: 'DRV-011', name: 'Venkat Iyer', phone: '+91 98765 12355', licenseNo: 'TN-09-2020-1234567', broker: 'Iyer Logistics', status: 'Available', totalTrips: 189 },
  { id: 'DRV-012', name: 'Manoj Kumar', phone: '+91 98765 12356', licenseNo: 'WB-12-2018-2345678', broker: 'Shankar Transport', status: 'Offline', totalTrips: 298 },
];

// ===== TRUCKS =====
export const trucks = [
  { id: 'TRK-001', regNo: 'MH-12-AB-1234', type: 'Medium', broker: 'Agarwal Transport', driver: 'Suresh Yadav', capacity: '5 Tons', status: 'On Trip' },
  { id: 'TRK-002', regNo: 'DL-05-CD-5678', type: 'Large', broker: 'Sharma Logistics', driver: 'Mahesh Sharma', capacity: '10 Tons', status: 'Available' },
  { id: 'TRK-003', regNo: 'GJ-01-EF-9012', type: 'Small', broker: 'Patel Transport Co.', driver: 'Ramesh Patel', capacity: '2 Tons', status: 'On Trip' },
  { id: 'TRK-004', regNo: 'UP-32-GH-3456', type: 'Part Truck', broker: 'Gupta Freight Services', driver: 'Dinesh Gupta', capacity: '1 Ton', status: 'Available' },
  { id: 'TRK-005', regNo: 'PB-02-IJ-7890', type: 'Large', broker: 'Singh & Sons Transport', driver: 'Karan Singh', capacity: '12 Tons', status: 'On Trip' },
  { id: 'TRK-006', regNo: 'TS-08-KL-1234', type: 'Small', broker: 'Reddy Logistics', driver: 'Prasad Reddy', capacity: '1.5 Tons', status: 'Under Maintenance' },
  { id: 'TRK-007', regNo: 'KA-03-MN-5678', type: 'Medium', broker: 'Ali Transport Services', driver: 'Faisal Khan', capacity: '6 Tons', status: 'On Trip' },
  { id: 'TRK-008', regNo: 'HR-26-OP-9012', type: 'Small', broker: 'Verma Goods Carrier', driver: 'Sanjay Verma', capacity: '2 Tons', status: 'Available' },
  { id: 'TRK-009', regNo: 'KL-07-QR-3456', type: 'Medium', broker: 'Nair Transport', driver: 'Rajan Nair', capacity: '4 Tons', status: 'On Trip' },
  { id: 'TRK-010', regNo: 'MH-14-ST-7890', type: 'Large', broker: 'Joshi Freight Lines', driver: 'Ganesh Joshi', capacity: '8 Tons', status: 'On Trip' },
  { id: 'TRK-011', regNo: 'TN-09-UV-1234', type: 'Small', broker: 'Iyer Logistics', driver: 'Venkat Iyer', capacity: '2.5 Tons', status: 'Available' },
  { id: 'TRK-012', regNo: 'WB-12-WX-5678', type: 'Medium', broker: 'Shankar Transport', driver: 'Manoj Kumar', capacity: '5 Tons', status: 'Under Maintenance' },
];

// ===== PRICING DATA =====
export const pricingData = {
  intraCity: {
    small: { baseFare: 350, perKmRate: 18, platformFee: 12, waitingCharge: 100, demandMultiplier: 1.5 },
    medium: { baseFare: 550, perKmRate: 28, platformFee: 12, waitingCharge: 150, demandMultiplier: 1.8 },
    large: { baseFare: 850, perKmRate: 42, platformFee: 12, waitingCharge: 200, demandMultiplier: 2.0 },
  },
  interCity: {
    baseRatePerKm: 35,
    fuelSurcharge: 15,
    tollHandling: 'Actual',
    tollFixedAmount: 0,
    platformFee: 10,
  },
  partTruck: {
    platformFee: 15,
  },
};

// ===== DISPUTES =====
export const disputes = [
  { id: 'DSP-001', bookingId: 'BKG-202412-002', raisedBy: 'Client', issueType: 'Damaged Goods', description: 'Furniture items were damaged during transit. Client claims improper handling.', status: 'Open', date: '2024-12-14' },
  { id: 'DSP-002', bookingId: 'BKG-202412-005', raisedBy: 'Broker', issueType: 'Payment Delay', description: 'Broker has not received payment for completed trip even after 48 hours.', status: 'Under Review', date: '2024-12-13' },
  { id: 'DSP-003', bookingId: 'BKG-202412-008', raisedBy: 'Client', issueType: 'Cancellation Fee', description: 'Client disputes cancellation charges applied after driver was already en route.', status: 'Resolved', date: '2024-12-10', resolution: 'Partial refund of ₹500 issued. Client informed about cancellation policy.' },
  { id: 'DSP-004', bookingId: 'BKG-202412-011', raisedBy: 'Broker', issueType: 'Route Dispute', description: 'Broker claims client asked for detour but refuses to pay extra charges.', status: 'Open', date: '2024-12-14' },
  { id: 'DSP-005', bookingId: 'BKG-202412-006', raisedBy: 'Client', issueType: 'Late Delivery', description: 'Delivery was promised by 2 PM but arrived at 6 PM causing business loss.', status: 'Under Review', date: '2024-12-12' },
  { id: 'DSP-006', bookingId: 'BKG-202412-009', raisedBy: 'Broker', issueType: 'Fuel Surcharge', description: 'Broker disputes additional fuel surcharge added to the invoice.', status: 'Open', date: '2024-12-13' },
  { id: 'DSP-007', bookingId: 'BKG-202412-004', raisedBy: 'Client', issueType: 'Wrong Items', description: 'Part truck load got mixed with another shipment at the hub.', status: 'Resolved', date: '2024-12-11', resolution: 'Items were identified and rerouted. Compensation of ₹1000 provided to both clients.' },
  { id: 'DSP-008', bookingId: 'BKG-202412-012', raisedBy: 'Client', issueType: 'Weight Discrepancy', description: 'Actual weight was higher than declared. Broker demands additional payment.', status: 'Under Review', date: '2024-12-15' },
];

// ===== KYC DATA =====
export const brokerKYC = [
  { name: 'Agarwal Transport', pan: 'AABCU9603R', aadhaar: 'XXXX-XXXX-1234', gst: '27AABCU9603R1ZM', bankAccount: '****4521', businessReg: 'BR-2018-001', submissionDate: '2024-11-15', status: 'Verified' },
  { name: 'Sharma Logistics', pan: 'AAECS1234R', aadhaar: 'XXXX-XXXX-5678', gst: '07AAECS1234R1ZP', bankAccount: '****7890', businessReg: 'BR-2019-002', submissionDate: '2024-11-18', status: 'Verified' },
  { name: 'Patel Transport Co.', pan: 'AAAFB1234R', aadhaar: 'XXXX-XXXX-9012', gst: '24AAAFB1234R1ZQ', bankAccount: '****3456', businessReg: 'BR-2020-003', submissionDate: '2024-11-20', status: 'Verified' },
  { name: 'Gupta Freight Services', pan: 'AAACG5678R', aadhaar: 'XXXX-XXXX-3456', gst: '09AAACG5678R1ZU', bankAccount: '****1234', businessReg: 'BR-2024-004', submissionDate: '2024-12-10', status: 'Pending' },
  { name: 'Verma Goods Carrier', pan: 'AAAVG2345R', aadhaar: 'XXXX-XXXX-7890', gst: '06AAAVG2345R1ZX', bankAccount: '****5678', businessReg: null, submissionDate: '2024-12-12', status: 'Pending' },
  { name: 'Iyer Logistics', pan: 'AAAIY4567R', aadhaar: 'XXXX-XXXX-2345', gst: '33AAAIY4567R1ZA', bankAccount: '****9012', businessReg: 'BR-2024-005', submissionDate: '2024-12-14', status: 'Pending' },
];

export const driverKYC = [
  { name: 'Suresh Yadav', licenseNo: 'MH-12-2018-1234567', aadhaar: 'XXXX-XXXX-1111', vehicleDocs: true, submissionDate: '2024-11-10', status: 'Verified' },
  { name: 'Mahesh Sharma', licenseNo: 'DL-05-2019-2345678', aadhaar: 'XXXX-XXXX-2222', vehicleDocs: true, submissionDate: '2024-11-12', status: 'Verified' },
  { name: 'Ramesh Patel', licenseNo: 'GJ-01-2020-3456789', aadhaar: 'XXXX-XXXX-3333', vehicleDocs: true, submissionDate: '2024-11-14', status: 'Verified' },
  { name: 'Dinesh Gupta', licenseNo: 'UP-32-2017-4567890', aadhaar: 'XXXX-XXXX-4444', vehicleDocs: false, submissionDate: '2024-12-08', status: 'Pending' },
  { name: 'Karan Singh', licenseNo: 'PB-02-2021-5678901', aadhaar: 'XXXX-XXXX-5555', vehicleDocs: true, submissionDate: '2024-12-09', status: 'Pending' },
  { name: 'Faisal Khan', licenseNo: 'KA-03-2020-7890123', aadhaar: 'XXXX-XXXX-6666', vehicleDocs: true, submissionDate: '2024-12-11', status: 'Pending' },
  { name: 'Rajan Nair', licenseNo: 'KL-07-2021-9012345', aadhaar: 'XXXX-XXXX-7777', vehicleDocs: false, submissionDate: '2024-12-13', status: 'Pending' },
  { name: 'Manoj Kumar', licenseNo: 'WB-12-2018-2345678', aadhaar: 'XXXX-XXXX-8888', vehicleDocs: true, submissionDate: '2024-12-14', status: 'Pending' },
];

// ===== ANALYTICS DATA =====
export const analyticsData = {
  gmvOverMonths: [
    { month: 'Jan', gmv: 4200000 }, { month: 'Feb', gmv: 3800000 }, { month: 'Mar', gmv: 4500000 },
    { month: 'Apr', gmv: 5100000 }, { month: 'May', gmv: 4800000 }, { month: 'Jun', gmv: 5600000 },
    { month: 'Jul', gmv: 6200000 }, { month: 'Aug', gmv: 5800000 }, { month: 'Sep', gmv: 6400000 },
    { month: 'Oct', gmv: 7100000 }, { month: 'Nov', gmv: 6800000 }, { month: 'Dec', gmv: 7500000 },
  ],
  revenueOverMonths: [
    { month: 'Jan', revenue: 420000 }, { month: 'Feb', revenue: 380000 }, { month: 'Mar', revenue: 450000 },
    { month: 'Apr', revenue: 510000 }, { month: 'May', revenue: 480000 }, { month: 'Jun', revenue: 560000 },
    { month: 'Jul', revenue: 620000 }, { month: 'Aug', revenue: 580000 }, { month: 'Sep', revenue: 640000 },
    { month: 'Oct', revenue: 710000 }, { month: 'Nov', revenue: 680000 }, { month: 'Dec', revenue: 750000 },
  ],
  topClients: [
    { name: 'Vikram Singh', spend: 712000 }, { name: 'Amit Patel', spend: 524000 },
    { name: 'Harish Joshi', spend: 598000 }, { name: 'Mohammed Ali', spend: 418000 },
    { name: 'Rajesh Kumar', spend: 385000 },
  ],
  fleetUtilization: [
    { broker: 'Patel Transport', utilization: 92 }, { broker: 'Ali Transport', utilization: 88 },
    { broker: 'Agarwal Transport', utilization: 85 }, { broker: 'Joshi Freight', utilization: 82 },
    { broker: 'Singh & Sons', utilization: 78 },
  ],
  bookingConversionSparkline: [62, 65, 63, 68, 70, 72, 71, 74, 73, 75, 74, 76],
};

// ===== SETTINGS DATA =====
export const settingsData = {
  platformName: 'SSK Logistics',
  contactEmail: 'admin@ssklogistics.com',
  commissionRate: 12,
  emailAlerts: true,
  smsAlerts: true,
  pushNotifications: false,
};
