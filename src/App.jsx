import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
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
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="spinner mx-auto mb-4"></div>
                    <p className="text-slate-400">Loading appointments...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 lg:p-8">
            {/* Header */}
            <header className="mb-8 fade-in">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl lg:text-4xl font-bold gradient-text mb-2">
                            Appointments Dashboard
                        </h1>
                        <p className="text-slate-400">
                            Manage your chiropractic practice appointments
                        </p>
                    </div>
                    <button
                        onClick={fetchAppointments}
                        disabled={refreshing}
                        className="btn-primary flex items-center gap-2 self-start"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </header>

            {/* Error Message */}
            {error && (
                <div className="glass-card p-4 mb-6 border-red-500/30 flex items-center gap-3 text-red-400 fade-in">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <div className="stat-card fade-in" style={{ animationDelay: '0.1s' }}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                            <Users className="w-5 h-5 text-indigo-400" />
                        </div>
                        <span className="text-slate-400 text-sm">Total</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.total}</p>
                </div>

                <div className="stat-card fade-in" style={{ animationDelay: '0.15s' }}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-amber-400" />
                        </div>
                        <span className="text-slate-400 text-sm">Pending</span>
                    </div>
                    <p className="text-3xl font-bold text-amber-400">{stats.pending}</p>
                </div>

                <div className="stat-card fade-in" style={{ animationDelay: '0.2s' }}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                        </div>
                        <span className="text-slate-400 text-sm">Confirmed</span>
                    </div>
                    <p className="text-3xl font-bold text-green-400">{stats.confirmed}</p>
                </div>

                <div className="stat-card fade-in" style={{ animationDelay: '0.25s' }}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 flex items-center justify-center">
                            <Activity className="w-5 h-5 text-indigo-400" />
                        </div>
                        <span className="text-slate-400 text-sm">Completed</span>
                    </div>
                    <p className="text-3xl font-bold text-indigo-400">{stats.completed}</p>
                </div>

                <div className="stat-card fade-in col-span-2 lg:col-span-1" style={{ animationDelay: '0.3s' }}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-pink-500/20 flex items-center justify-center">
                            <XCircle className="w-5 h-5 text-red-400" />
                        </div>
                        <span className="text-slate-400 text-sm">Cancelled</span>
                    </div>
                    <p className="text-3xl font-bold text-red-400">{stats.cancelled}</p>
                </div>
            </div>

            {/* Upcoming Appointments Alert */}
            {upcomingAppointments.length > 0 && (
                <div className="glass-card p-4 mb-6 border-green-500/30 fade-in" style={{ animationDelay: '0.35s' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center pulse-glow">
                            <CalendarDays className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <p className="font-semibold text-green-400">
                                {upcomingAppointments.length} upcoming appointment{upcomingAppointments.length > 1 ? 's' : ''} this week
                            </p>
                            <p className="text-sm text-slate-400">
                                Next: {upcomingAppointments[0]?.full_name} on {formatDate(upcomingAppointments[0]?.preferred_date)}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter and Table Section */}
            <div className="glass-card p-6 fade-in" style={{ animationDelay: '0.4s' }}>
                {/* Filter Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-400" />
                        All Appointments
                    </h2>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-sm">Filter:</span>
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="select-dropdown"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>

                {/* Appointments Table */}
                {filteredAppointments.length === 0 ? (
                    <div className="text-center py-12">
                        <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400 text-lg">No appointments found</p>
                        <p className="text-slate-500 text-sm mt-1">
                            {filter !== 'all' ? 'Try changing the filter or ' : ''}
                            Appointments will appear here when patients book online.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="appointments-table">
                            <thead>
                                <tr>
                                    <th>Patient</th>
                                    <th>Contact</th>
                                    <th>Preferred Date</th>
                                    <th>Location</th>
                                    <th>Notes</th>
                                    <th>Booked On</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAppointments.map((apt, index) => (
                                    <tr key={apt.id} className="fade-in" style={{ animationDelay: `${0.05 * index}s` }}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                                    {apt.full_name?.charAt(0)?.toUpperCase() || '?'}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-white">{apt.full_name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                                                    {apt.phone}
                                                </div>
                                                {apt.email && (
                                                    <div className="flex items-center gap-2 text-sm text-slate-400">
                                                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                                                        {apt.email}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2 text-slate-300">
                                                <Calendar className="w-4 h-4 text-indigo-400" />
                                                {formatDate(apt.preferred_date)}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2 text-slate-300">
                                                <MapPin className="w-4 h-4 text-slate-500" />
                                                {apt.location || 'Not specified'}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="max-w-[200px]">
                                                {apt.notes ? (
                                                    <p className="text-sm text-slate-400 truncate" title={apt.notes}>
                                                        {apt.notes}
                                                    </p>
                                                ) : (
                                                    <span className="text-slate-600 text-sm">No notes</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                                <Clock className="w-3.5 h-3.5" />
                                                {formatDateTime(apt.created_at)}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${getStatusClass(apt.status)}`}>
                                                {apt.status}
                                            </span>
                                        </td>
                                        <td>
                                            <select
                                                value={apt.status}
                                                onChange={(e) => updateStatus(apt.id, e.target.value)}
                                                className="select-dropdown text-xs"
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="confirmed">Confirm</option>
                                                <option value="completed">Complete</option>
                                                <option value="cancelled">Cancel</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="mt-8 text-center text-slate-500 text-sm">
                <p>Admin Dashboard for Dr. Vaibhav's Chiropractic Practice</p>
                <p className="mt-1">Real-time updates enabled • Last refresh: {new Date().toLocaleTimeString()}</p>
            </footer>
        </div>
    );
}

export default App;
