import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { sendStatusUpdateMessage } from './lib/whatsapp';
import {
    Calendar,
    Clock,
    User,
    Phone,
    Mail,
    MapPin,
    FileText,
    RefreshCw,
    CheckCircle,
    XCircle,
    AlertCircle,
    TrendingUp,
    Users,
    CalendarDays,
    Activity
} from 'lucide-react';

function App() {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');
    const [refreshing, setRefreshing] = useState(false);

    // Fetch appointments from Supabase
    const fetchAppointments = async () => {
        try {
            setRefreshing(true);
            const { data, error } = await supabase
                .from('appointments')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAppointments(data || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching appointments:', err);
            setError('Failed to load appointments. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Update appointment status
    const updateStatus = async (id, newStatus) => {
        try {
            const appointment = appointments.find(a => a.id === id);

            const { error } = await supabase
                .from('appointments')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;

            // Update local state
            setAppointments(prev =>
                prev.map(apt =>
                    apt.id === id ? { ...apt, status: newStatus } : apt
                )
            );

            // Send WhatsApp message if status changed to something notification-worthy
            if (appointment && ['confirmed', 'cancelled', 'completed'].includes(newStatus)) {
                await sendStatusUpdateMessage(appointment, newStatus);
            }
        } catch (err) {
            console.error('Error updating status:', err);
            alert('Failed to update status. Please try again.');
        }
    };

    useEffect(() => {
        fetchAppointments();

        // Set up real-time subscription
        const channel = supabase
            .channel('appointments-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'appointments' },
                (payload) => {
                    console.log('Real-time update:', payload);
                    fetchAppointments(); // Refresh on any change
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Filter appointments
    const filteredAppointments = appointments.filter(apt => {
        if (filter === 'all') return true;
        return apt.status === filter;
    });

    // Calculate stats
    const stats = {
        total: appointments.length,
        pending: appointments.filter(a => a.status === 'pending').length,
        confirmed: appointments.filter(a => a.status === 'confirmed').length,
        completed: appointments.filter(a => a.status === 'completed').length,
        cancelled: appointments.filter(a => a.status === 'cancelled').length,
    };

    // Get upcoming appointments (next 7 days)
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingAppointments = appointments.filter(apt => {
        if (!apt.preferred_date) return false;
        const aptDate = new Date(apt.preferred_date);
        return aptDate >= today && aptDate <= nextWeek &&
            (apt.status === 'pending' || apt.status === 'confirmed');
    });

    // Format date for display
    const formatDate = (dateStr) => {
        if (!dateStr) return 'Not specified';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Format datetime for display
    const formatDateTime = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    // Get status badge class
    const getStatusClass = (status) => {
        const classes = {
            pending: 'status-pending',
            confirmed: 'status-confirmed',
            completed: 'status-completed',
            cancelled: 'status-cancelled'
        };
        return classes[status] || 'status-pending';
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f9fbf9]">
                <div className="text-center">
                    <div className="spinner mx-auto mb-4"></div>
                    <p className="text-[#1a241f] font-medium pulse">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f9fbf9]">
            {/* Top Bar Decoration */}
            <div className="h-2 bg-[#1e4d3a]"></div>

            {/* Navigation / Header */}
            <header className="bg-white border-bottom border-gray-100 shadow-sm mb-8">
                <div className="dashboard-container px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 flex items-center justify-center bg-[#f9fbf9] rounded-lg border border-[#e5e7eb]">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 2L10 4.5V7.5L12 10L14 7.5V4.5L12 2Z" fill="#7fb069" />
                                    <path d="M12 10L10 12.5V15.5L12 18L14 15.5V12.5L12 10Z" fill="#7fb069" />
                                    <path d="M12 18L10 20.5V22H14V20.5L12 18Z" fill="#7fb069" />
                                    <circle cx="12" cy="12" r="10" stroke="#1e4d3a" strokeWidth="1" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-2xl lg:text-3xl font-bold text-[#1e4d3a] tracking-tight">
                                    DR. VAIBBHAV GURAY <span className="text-[#7fb069] font-medium ml-1">Admin</span>
                                </h1>
                                <p className="text-gray-500 text-sm font-medium">
                                    Chiropractic Excellence Dashboard
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={fetchAppointments}
                                disabled={refreshing}
                                className="btn-secondary flex items-center gap-2"
                            >
                                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                                {refreshing ? 'Refreshing...' : 'Refresh Data'}
                            </button>
                            <div className="h-10 w-px bg-gray-200 hidden md:block"></div>
                            <div className="hidden md:flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                                <div className="w-8 h-8 rounded-full bg-[#7fb069] flex items-center justify-center text-white font-bold">
                                    V
                                </div>
                                <span className="text-sm font-semibold text-[#1a241f]">Dr. Vaibbhav Guray</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="dashboard-container px-6 lg:px-8 pb-12">
                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-100 p-4 mb-6 rounded-xl flex items-center gap-3 text-red-700 fade-in">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="font-medium">{error}</p>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6 mb-10">
                    <div className="stat-card fade-in">
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Total Bookings</p>
                        <div className="flex items-end justify-between">
                            <h3 className="text-3xl font-bold text-[#1e4d3a] leading-none">{stats.total}</h3>
                            <Users className="w-6 h-6 text-[#d0e0d0]" />
                        </div>
                    </div>

                    <div className="stat-card fade-in" style={{ animationDelay: '0.05s' }}>
                        <p className="text-[#92400e] text-xs font-bold uppercase tracking-wider mb-1">Pending</p>
                        <div className="flex items-end justify-between">
                            <h3 className="text-3xl font-bold text-[#b45309] leading-none">{stats.pending}</h3>
                            <Clock className="w-6 h-6 text-[#fef3c7]" />
                        </div>
                    </div>

                    <div className="stat-card fade-in" style={{ animationDelay: '0.1s' }}>
                        <p className="text-[#166534] text-xs font-bold uppercase tracking-wider mb-1">Confirmed</p>
                        <div className="flex items-end justify-between">
                            <h3 className="text-3xl font-bold text-[#16a34a] leading-none">{stats.confirmed}</h3>
                            <CheckCircle className="w-6 h-6 text-[#dcfce7]" />
                        </div>
                    </div>

                    <div className="stat-card fade-in" style={{ animationDelay: '0.15s' }}>
                        <p className="text-[#065f46] text-xs font-bold uppercase tracking-wider mb-1">Completed</p>
                        <div className="flex items-end justify-between">
                            <h3 className="text-3xl font-bold text-[#059669] leading-none">{stats.completed}</h3>
                            <Activity className="w-6 h-6 text-[#d1fae5]" />
                        </div>
                    </div>

                    <div className="stat-card fade-in" style={{ animationDelay: '0.2s' }}>
                        <p className="text-[#991b1b] text-xs font-bold uppercase tracking-wider mb-1">Cancelled</p>
                        <div className="flex items-end justify-between">
                            <h3 className="text-3xl font-bold text-[#dc2626] leading-none">{stats.cancelled}</h3>
                            <XCircle className="w-6 h-6 text-[#fee2e2]" />
                        </div>
                    </div>
                </div>

                {/* Upcoming Appointments Alert */}
                {upcomingAppointments.length > 0 && (
                    <div className="bg-[#1e4d3a] p-5 mb-8 rounded-xl text-white shadow-lg fade-in" style={{ animationDelay: '0.25s' }}>
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-[#7fb069]/30 flex items-center justify-center">
                                    <CalendarDays className="w-6 h-6 text-[#7fb069]" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg leading-tight">
                                        {upcomingAppointments.length} Bookings Scheduled This Week
                                    </h4>
                                    <p className="text-white/70 text-sm font-medium">
                                        Next up: <span className="text-white">{upcomingAppointments[0]?.full_name}</span> on {formatDate(upcomingAppointments[0]?.preferred_date)}
                                    </p>
                                </div>
                            </div>
                            <button className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-bold border border-white/20 transition-colors">
                                View Schedule
                            </button>
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="glass-card shadow-sm overflow-hidden fade-in" style={{ animationDelay: '0.3s' }}>
                    {/* Filter Controls */}
                    <div className="p-6 border-bottom border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 bg-[#fcfdfc]">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#eef5ee] flex items-center justify-center">
                                <Calendar className="w-4 h-4 text-[#1e4d3a]" />
                            </div>
                            <h2 className="text-lg font-bold text-[#1a241f]">
                                Appointment Records
                            </h2>
                        </div>
                        <div className="tab-group overflow-x-auto">
                            <button
                                onClick={() => setFilter('all')}
                                className={`tab-item ${filter === 'all' ? 'tab-item-active' : ''}`}
                            >
                                All <span className="tab-count">{stats.total}</span>
                            </button>
                            <button
                                onClick={() => setFilter('pending')}
                                className={`tab-item ${filter === 'pending' ? 'tab-item-active' : ''}`}
                            >
                                Pending <span className="tab-count">{stats.pending}</span>
                            </button>
                            <button
                                onClick={() => setFilter('confirmed')}
                                className={`tab-item ${filter === 'confirmed' ? 'tab-item-active' : ''}`}
                            >
                                Confirmed <span className="tab-count">{stats.confirmed}</span>
                            </button>
                            <button
                                onClick={() => setFilter('completed')}
                                className={`tab-item ${filter === 'completed' ? 'tab-item-active' : ''}`}
                            >
                                Completed <span className="tab-count">{stats.completed}</span>
                            </button>
                            <button
                                onClick={() => setFilter('cancelled')}
                                className={`tab-item ${filter === 'cancelled' ? 'tab-item-active' : ''}`}
                            >
                                Cancelled <span className="tab-count">{stats.cancelled}</span>
                            </button>
                        </div>
                    </div>

                    {/* Appointments Table */}
                    {filteredAppointments.length === 0 ? (
                        <div className="text-center py-20 bg-white">
                            <div className="w-16 h-16 bg-[#f9fbf9] rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                                <Calendar className="w-8 h-8 text-gray-300" />
                            </div>
                            <h3 className="text-[#1a241f] font-bold text-xl mb-1">No Appointments Found</h3>
                            <p className="text-gray-500 max-w-sm mx-auto">
                                {filter !== 'all' ? 'No records match this status filter.' : 'Appointments will appear here when patients book through the website.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto bg-white">
                            <table className="appointments-table">
                                <thead>
                                    <tr>
                                        <th className="pl-6">Patient</th>
                                        <th>Contact</th>
                                        <th>Preferred Date</th>
                                        <th>Location</th>
                                        <th>Notes</th>
                                        <th>Booked On</th>
                                        <th>Status</th>
                                        <th className="pr-6">Update Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAppointments.map((apt, index) => (
                                        <tr key={apt.id}>
                                            <td className="pl-6">
                                                <div className="flex items-center gap-3 py-1">
                                                    <div className="w-9 h-9 rounded-full bg-[#1e4d3a] flex items-center justify-center text-white font-bold text-xs">
                                                        {apt.full_name?.charAt(0)?.toUpperCase() || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-[#1a241f]">{apt.full_name}</p>
                                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                                                            ID: {apt.id.substring(0, 8)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                                                        <Phone className="w-3.5 h-3.5 text-[#7fb069]" />
                                                        {apt.phone}
                                                    </div>
                                                    {apt.email && (
                                                        <div className="flex items-center gap-2 text-[13px] text-gray-500 font-medium">
                                                            <Mail className="w-3.5 h-3.5 text-gray-300" />
                                                            {apt.email}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2 text-sm text-[#1e4d3a] font-bold">
                                                    <Calendar className="w-4 h-4 text-[#7fb069]" />
                                                    {formatDate(apt.preferred_date)}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                                                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                                    {apt.location || 'Not specified'}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="max-w-[200px]">
                                                    {apt.notes ? (
                                                        <p className="text-xs text-gray-500 italic line-clamp-2" title={apt.notes}>
                                                            "{apt.notes}"
                                                        </p>
                                                    ) : (
                                                        <span className="text-gray-300 text-xs">—</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDateTime(apt.created_at)}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${getStatusClass(apt.status)}`}>
                                                    {apt.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                                                    {apt.status === 'confirmed' && <CheckCircle className="w-3 h-3 mr-1" />}
                                                    {apt.status}
                                                </span>
                                            </td>
                                            <td className="pr-6 text-right">
                                                <select
                                                    value={apt.status}
                                                    onChange={(e) => updateStatus(apt.id, e.target.value)}
                                                    className="select-dropdown text-xs font-bold"
                                                >
                                                    <option value="pending">Mark as Pending</option>
                                                    <option value="confirmed">Confirm Booking</option>
                                                    <option value="completed">Mark as Completed</option>
                                                    <option value="cancelled">Cancel Request</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="py-12 bg-white border-t border-gray-100">
                <div className="dashboard-container px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-[#1e4d3a] tracking-tight text-lg">DR. VAIBBHAV GURAY</span>
                            <span className="text-gray-300">|</span>
                            <span className="text-gray-500 text-sm font-medium">Internal Management System</span>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-gray-400 font-medium">
                            <p>Real-time updates active</p>
                            <p>Last refresh: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}


export default App;
