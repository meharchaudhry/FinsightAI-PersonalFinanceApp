import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Upload, FileText, CheckCircle, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const UploadReceipt = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    setFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/receipts/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setExtractedData(response.data);
      toast.success('Receipt processed successfully!');
      setTimeout(() => navigate('/receipts'), 2000);
    } catch (error) {
      console.error('Error uploading receipt:', error);
      toast.error(error.response?.data?.detail || 'Failed to process receipt');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-12" data-testid="upload-page">
      <div className="max-w-5xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-serif text-4xl md:text-6xl leading-tight mb-2" data-testid="upload-title">
            Upload Receipt
          </h1>
          <p className="text-muted-foreground text-lg">Drop your receipt image and let AI extract the data</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Area */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`bg-card border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                dragActive ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              data-testid="upload-dropzone"
            >
              {!preview ? (
                <div className="space-y-4">
                  <Upload className="w-16 h-16 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-lg font-medium mb-2">Drag & drop your receipt</p>
                    <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
                  </div>
                  <label className="inline-block bg-secondary text-secondary-foreground hover:bg-secondary/80 font-medium px-6 py-3 rounded-lg cursor-pointer btn-scale">
                    <input
                      type="file"
                      onChange={handleChange}
                      accept="image/*"
                      className="hidden"
                      data-testid="file-input"
                    />
                    Choose File
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded-lg shadow-lg" data-testid="preview-image" />
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => {
                        setFile(null);
                        setPreview(null);
                        setExtractedData(null);
                      }}
                      className="bg-secondary text-secondary-foreground hover:bg-secondary/80 font-medium px-6 py-2 rounded-lg btn-scale"
                      data-testid="change-file-button"
                    >
                      Change
                    </button>
                    <button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 font-medium px-8 py-2 rounded-lg btn-scale flex items-center gap-2"
                      data-testid="process-button"
                    >
                      {uploading ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Process Receipt'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Extracted Data */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card border border-border/60 rounded-2xl p-8"
            data-testid="extracted-data-panel"
          >
            <h2 className="font-serif text-2xl md:text-3xl mb-6">Extracted Data</h2>
            {!extractedData ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Upload a receipt to see extracted data</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-accent mt-1" />
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-widest opacity-60 mb-1">Vendor</p>
                    <p className="font-medium text-lg" data-testid="extracted-vendor">{extractedData.vendor}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-accent mt-1" />
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-widest opacity-60 mb-1">Date</p>
                    <p className="font-medium" data-testid="extracted-date">{extractedData.date}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-accent mt-1" />
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-widest opacity-60 mb-1">Category</p>
                    <p className="font-medium" data-testid="extracted-category">{extractedData.category}</p>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <p className="text-xs uppercase tracking-widest opacity-60 mb-3">Items</p>
                  <div className="space-y-2" data-testid="extracted-items">
                    {extractedData.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between font-mono text-sm">
                        <span>{item.name} {item.quantity ? `x${item.quantity}` : ''}</span>
                        <span>${item.price?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {extractedData.gst && (
                  <div className="flex justify-between font-mono">
                    <span className="text-muted-foreground">GST:</span>
                    <span data-testid="extracted-gst">${extractedData.gst?.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between font-mono text-xl font-bold border-t-2 border-primary pt-4">
                  <span>Total:</span>
                  <span data-testid="extracted-total">${extractedData.total?.toFixed(2)}</span>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default UploadReceipt;
