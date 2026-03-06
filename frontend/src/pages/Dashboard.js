import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Receipt, TrendingUp, DollarSign, FileText, Upload } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useNavigate } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const COLORS = ['#2E3B2F', '#C45D40', '#D4A373', '#8A9A5B', '#6B6960'];

const Dashboard = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/analytics/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const categoryData = analytics?.categories
    ? Object.entries(analytics.categories).map(([name, value]) => ({ name, value }))
    : [];

  const monthlyData = analytics?.monthly
    ? Object.entries(analytics.monthly).map(([month, value]) => ({ month, value }))
    : [];

  return (
    <div className="min-h-screen p-6 md:p-12" data-testid="dashboard">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-serif text-4xl md:text-6xl leading-tight mb-2" data-testid="dashboard-title">
            Welcome, {user?.name}
          </h1>
          <p className="text-muted-foreground text-lg">Here's your financial overview</p>
        </motion.div>

        {/* Quick Stats - Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border/60 hover:border-primary/20 transition-all duration-300 p-8 rounded-2xl card-hover"
            data-testid="stat-total-spent"
          >
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-8 h-8 text-accent" />
            </div>
            <p className="text-xs uppercase tracking-widest opacity-60 mb-2">Total Spent</p>
            <p className="font-mono text-3xl font-bold">${analytics?.total_spent?.toFixed(2) || '0.00'}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border/60 hover:border-primary/20 transition-all duration-300 p-8 rounded-2xl card-hover"
            data-testid="stat-total-receipts"
          >
            <div className="flex items-center justify-between mb-4">
              <Receipt className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs uppercase tracking-widest opacity-60 mb-2">Total Receipts</p>
            <p className="font-mono text-3xl font-bold">{analytics?.total_receipts || 0}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card border border-border/60 hover:border-primary/20 transition-all duration-300 p-8 rounded-2xl card-hover"
            data-testid="stat-avg-transaction"
          >
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-chart-4" />
            </div>
            <p className="text-xs uppercase tracking-widest opacity-60 mb-2">Avg Transaction</p>
            <p className="font-mono text-3xl font-bold">${analytics?.average_transaction?.toFixed(2) || '0.00'}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onClick={() => navigate('/upload')}
            className="bg-accent text-accent-foreground border border-accent/60 hover:bg-accent/90 transition-all duration-300 p-8 rounded-2xl cursor-pointer shadow-lg hover:shadow-xl btn-scale"
            data-testid="quick-upload-button"
          >
            <div className="flex items-center justify-between mb-4">
              <Upload className="w-8 h-8" />
            </div>
            <p className="text-xs uppercase tracking-widest opacity-80 mb-2">Quick Action</p>
            <p className="font-medium text-xl">Upload Receipt</p>
          </motion.div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Category Breakdown */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-card border border-border/60 p-8 rounded-2xl"
            data-testid="category-chart"
          >
            <h2 className="font-serif text-2xl md:text-3xl mb-6">Spending by Category</h2>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available. Upload your first receipt!
              </div>
            )}
          </motion.div>

          {/* Monthly Trend */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-card border border-border/60 p-8 rounded-2xl"
            data-testid="monthly-chart"
          >
            <h2 className="font-serif text-2xl md:text-3xl mb-6">Monthly Spending</h2>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6E4DD" />
                  <XAxis dataKey="month" stroke="#6B6960" />
                  <YAxis stroke="#6B6960" />
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  <Line type="monotone" dataKey="value" stroke="#2E3B2F" strokeWidth={3} dot={{ fill: '#C45D40', r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No monthly data yet
              </div>
            )}
          </motion.div>
        </div>

        {/* Category Details */}
        {categoryData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-card border border-border/60 p-8 rounded-2xl"
            data-testid="category-breakdown"
          >
            <h2 className="font-serif text-2xl md:text-3xl mb-6">Category Breakdown</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6E4DD" />
                <XAxis dataKey="name" stroke="#6B6960" />
                <YAxis stroke="#6B6960" />
                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                <Bar dataKey="value" fill="#2E3B2F" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
