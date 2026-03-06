import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Receipt, Trash2, Eye, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Receipts = () => {
  const { token } = useAuth();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      const response = await axios.get(`${API}/receipts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReceipts(response.data);
    } catch (error) {
      console.error('Error fetching receipts:', error);
      toast.error('Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this receipt?')) return;
    
    try {
      await axios.delete(`${API}/receipts/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReceipts(receipts.filter(r => r.id !== id));
      toast.success('Receipt deleted');
      if (selectedReceipt?.id === id) {
        setSelectedReceipt(null);
      }
    } catch (error) {
      console.error('Error deleting receipt:', error);
      toast.error('Failed to delete receipt');
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Food & Dining': 'bg-chart-2',
      'Groceries': 'bg-chart-3',
      'Shopping': 'bg-chart-4',
      'Transportation': 'bg-chart-5',
      'Entertainment': 'bg-chart-1',
      'Healthcare': 'bg-accent',
      'Utilities': 'bg-primary',
      'Other': 'bg-muted'
    };
    return colors[category] || 'bg-muted';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-muted-foreground">Loading receipts...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-12" data-testid="receipts-page">
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-serif text-4xl md:text-6xl leading-tight mb-2" data-testid="receipts-title">
            Your Receipts
          </h1>
          <p className="text-muted-foreground text-lg">{receipts.length} receipt{receipts.length !== 1 ? 's' : ''} found</p>
        </motion.div>

        {receipts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card border border-border/60 rounded-2xl p-12 text-center"
          >
            <Receipt className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-xl text-muted-foreground mb-4">No receipts yet</p>
            <a
              href="/upload"
              className="inline-block bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 font-medium px-8 py-3 rounded-lg btn-scale"
            >
              Upload Your First Receipt
            </a>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Receipt List */}
            <div className="lg:col-span-2 space-y-4">
              {receipts.map((receipt, index) => (
                <motion.div
                  key={receipt.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-card border border-border/60 hover:border-primary/20 rounded-2xl p-6 cursor-pointer card-hover receipt-item-enter"
                  onClick={() => setSelectedReceipt(receipt)}
                  data-testid={`receipt-item-${index}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="font-serif text-xl font-medium" data-testid={`receipt-vendor-${index}`}>{receipt.vendor}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getCategoryColor(receipt.category)}`}>
                          {receipt.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{receipt.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          <span className="font-mono font-bold text-foreground">${receipt.total?.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedReceipt(receipt);
                        }}
                        className="p-2 hover:bg-secondary rounded-lg transition-colors"
                        data-testid={`view-receipt-${index}`}
                      >
                        <Eye className="w-5 h-5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(receipt.id);
                        }}
                        className="p-2 hover:bg-accent/10 rounded-lg transition-colors"
                        data-testid={`delete-receipt-${index}`}
                      >
                        <Trash2 className="w-5 h-5 text-accent" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Receipt Details */}
            <div className="lg:sticky lg:top-6 h-fit">
              {selectedReceipt ? (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-card border border-border/60 rounded-2xl p-8 space-y-6"
                  data-testid="receipt-details"
                >
                  <h2 className="font-serif text-2xl md:text-3xl">Receipt Details</h2>
                  
                  {selectedReceipt.image_url && (
                    <img
                      src={selectedReceipt.image_url}
                      alt="Receipt"
                      className="w-full rounded-lg shadow-lg"
                      data-testid="receipt-image"
                    />
                  )}

                  <div>
                    <p className="text-xs uppercase tracking-widest opacity-60 mb-1">Vendor</p>
                    <p className="font-medium text-lg">{selectedReceipt.vendor}</p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-widest opacity-60 mb-1">Date</p>
                    <p className="font-medium">{selectedReceipt.date}</p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-widest opacity-60 mb-1">Category</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium text-white ${getCategoryColor(selectedReceipt.category)}`}>
                      {selectedReceipt.category}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-widest opacity-60 mb-3">Items</p>
                    <div className="space-y-2">
                      {selectedReceipt.items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between font-mono text-sm">
                          <span>{item.name} {item.quantity ? `x${item.quantity}` : ''}</span>
                          <span>${item.price?.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedReceipt.gst && (
                    <div className="flex justify-between font-mono">
                      <span className="text-muted-foreground">GST:</span>
                      <span>${selectedReceipt.gst?.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between font-mono text-xl font-bold border-t-2 border-primary pt-4">
                    <span>Total:</span>
                    <span>${selectedReceipt.total?.toFixed(2)}</span>
                  </div>
                </motion.div>
              ) : (
                <div className="bg-card border border-border/60 rounded-2xl p-12 text-center text-muted-foreground">
                  <Eye className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>Select a receipt to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Receipts;
