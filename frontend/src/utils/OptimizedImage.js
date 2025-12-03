import React, { useState, useRef, useEffect, useCallback } from 'react';

// Image compression utility
const compressImage = (file, quality = 0.7, maxWidth = 800, maxHeight = 600) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      // Set canvas size
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(resolve, 'image/jpeg', quality);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

// WebP conversion utility
const convertToWebP = (file) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Try WebP conversion
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          // Fallback to original if WebP not supported
          resolve(file);
        }
      }, 'image/webp', 0.8);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

// Lazy loading image component
const LazyImage = ({ src, alt, className, onLoad }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef();
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
  return (
    <div ref={imgRef} className={`lazy-image ${className || ''}`}>
      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => {
            setIsLoaded(true);
            onLoad?.();
          }}
          style={{ 
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease'
          }}
        />
      )}
      {!isInView && (
        <div className="image-placeholder" style={{
          width: '100%',
          height: '200px',
          backgroundColor: '#f5f5f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#999'
        }}>
          📷 Loading...
        </div>
      )}
    </div>
  );
};

// Optimized image upload component
const OptimizedImageUpload = ({ 
  currentImage, 
  onImageChange, 
  placeholder = "Upload image or paste image URL",
  maxSizeMB = 5 
}) => {
  const [preview, setPreview] = useState(currentImage || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageUrl, setImageUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef();
  
  // Update preview when currentImage changes
  useEffect(() => {
    if (currentImage) {
      setPreview(currentImage);
      // If it's a URL, also set it in the URL input
      if (currentImage.startsWith('http://') || currentImage.startsWith('https://')) {
        setImageUrl(currentImage);
      }
    } else {
      // Clear preview if currentImage is empty
      setPreview('');
      setImageUrl('');
    }
  }, [currentImage]);
  
  const handleFileSelect = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`File size must be less than ${maxSizeMB}MB`);
      return;
    }
    
    setIsProcessing(true);
    setUploadProgress(10);
    
    try {
      // Step 1: Compress image
      setUploadProgress(30);
      const compressedFile = await compressImage(file);
      
      // Step 2: Convert to WebP if possible
      setUploadProgress(60);
      const optimizedFile = await convertToWebP(compressedFile);
      
      // Step 3: Create preview URL
      setUploadProgress(80);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target.result;
        setPreview(result);
        onImageChange(result);
        setUploadProgress(100);
        setIsProcessing(false);
      };
      reader.readAsDataURL(optimizedFile);
      
    } catch (error) {
      console.error('Image processing failed:', error);
      setIsProcessing(false);
      setUploadProgress(0);
    }
  }, [maxSizeMB, onImageChange]);
  
  const handleRemove = useCallback(() => {
    setPreview('');
    setImageUrl('');
    onImageChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onImageChange]);

  const handleUrlSubmit = useCallback(async (e) => {
    e.preventDefault();
    const url = imageUrl.trim();
    
    if (!url) {
      alert('Please enter an image URL');
      return;
    }

    // Validate URL format
    let validUrl;
    try {
      validUrl = new URL(url);
    } catch {
      alert('Please enter a valid URL (must start with http:// or https://)');
      return;
    }

    // Check if it's http or https
    if (validUrl.protocol !== 'http:' && validUrl.protocol !== 'https:') {
      alert('URL must start with http:// or https://');
      return;
    }

    setIsProcessing(true);
    setUploadProgress(30);

    // Try to load the image with timeout
    const img = new Image();
    let imageLoaded = false;
    let timeoutId;

    const cleanup = () => {
      setIsProcessing(false);
      setUploadProgress(0);
      if (timeoutId) clearTimeout(timeoutId);
    };

    // Set timeout for image loading (5 seconds)
    timeoutId = setTimeout(() => {
      if (!imageLoaded) {
        // Image didn't load in time, but allow user to use URL anyway
        // (CORS or other issues might prevent preview, but URL might work when served)
        const useAnyway = window.confirm(
          'Could not preview image (this might be due to CORS restrictions).\n\n' +
          'The URL will be saved and should work when displayed.\n\n' +
          'Do you want to use this URL anyway?'
        );
        
        if (useAnyway) {
          setPreview(url);
          onImageChange(url);
          setShowUrlInput(false);
          setIsProcessing(false);
        } else {
          cleanup();
        }
      }
    }, 5000);

    img.onload = () => {
      imageLoaded = true;
      if (timeoutId) clearTimeout(timeoutId);
      setPreview(url);
      onImageChange(url);
      setUploadProgress(100);
      setIsProcessing(false);
      setShowUrlInput(false);
    };

    img.onerror = () => {
      imageLoaded = true; // Mark as processed (even if failed)
      if (timeoutId) clearTimeout(timeoutId);
      
      // Don't block - allow user to use URL anyway
      // Many image URLs work when served from server even if preview fails due to CORS
      const useAnyway = window.confirm(
        'Could not preview image from this URL.\n\n' +
        'This might be due to CORS restrictions (common with Google Images).\n\n' +
        'The URL will be saved and should work when displayed in the customer portal.\n\n' +
        'Do you want to use this URL anyway?'
      );
      
      if (useAnyway) {
        setPreview(url);
        onImageChange(url);
        setShowUrlInput(false);
        setIsProcessing(false);
      } else {
        cleanup();
      }
    };

    // Set crossOrigin to anonymous to handle CORS better
    img.crossOrigin = 'anonymous';
    img.src = url;
  }, [imageUrl, onImageChange]);
  
  return (
    <div className="optimized-image-upload" style={{
      border: '2px dashed #ddd',
      borderRadius: '8px',
      padding: '20px',
      textAlign: 'center',
      position: 'relative'
    }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      
      {preview ? (
        <div className="preview-container" style={{ position: 'relative', display: 'inline-block' }}>
          {preview.startsWith('http://') || preview.startsWith('https://') ? (
            // For URLs, show image with error handling
            <div style={{ position: 'relative' }}>
              <img 
                src={preview} 
                alt="Preview" 
                style={{
                  maxWidth: '300px',
                  maxHeight: '300px',
                  objectFit: 'cover',
                  borderRadius: '4px',
                  border: '2px solid #ddd'
                }}
                onError={(e) => {
                  // Don't show alert - just show placeholder
                  // The URL might still work when displayed from server
                  e.target.style.display = 'none';
                  const parent = e.target.parentElement;
                  if (parent && !parent.querySelector('.url-placeholder')) {
                    const placeholder = document.createElement('div');
                    placeholder.className = 'url-placeholder';
                    placeholder.style.cssText = 'width: 300px; height: 200px; background: #f0f0f0; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 4px; color: #999; padding: 20px; text-align: center;';
                    placeholder.innerHTML = '<div style="font-size: 48px; margin-bottom: 10px;">🌐</div><div>Preview unavailable</div><div style="font-size: 11px; margin-top: 5px;">(URL will be saved and should work when displayed)</div>';
                    parent.appendChild(placeholder);
                  }
                }}
              />
            </div>
          ) : (
            // For base64/data URLs, show directly
            <img 
              src={preview} 
              alt="Preview" 
              style={{
                maxWidth: '300px',
                maxHeight: '300px',
                objectFit: 'cover',
                borderRadius: '4px',
                border: '2px solid #ddd'
              }}
            />
          )}
          <button 
            type="button" 
            onClick={handleRemove}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: '#ff4444',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              zIndex: 10
            }}
          >
            ✕
          </button>
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
            {preview.startsWith('http://') || preview.startsWith('https://') ? '🌐 Image URL' : '📁 Uploaded Image'}
          </div>
        </div>
      ) : (
        <div>
          {!showUrlInput ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div 
                className="upload-area"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  cursor: 'pointer',
                  padding: '30px',
                  color: '#666',
                  border: '2px dashed #ddd',
                  borderRadius: '8px',
                  marginBottom: '10px'
                }}
              >
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>📷</div>
                <p style={{ margin: '5px 0', fontWeight: '600' }}>Upload Image File</p>
                <small>Max {maxSizeMB}MB • Auto-optimized with WebP conversion</small>
              </div>
              <div style={{ 
                padding: '15px',
                background: '#f5f5f5',
                borderRadius: '8px',
                border: '1px solid #ddd'
              }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>
                  Or use an image URL (Google Images, etc.)
                </p>
                <button
                  type="button"
                  onClick={() => setShowUrlInput(true)}
                  style={{
                    padding: '8px 16px',
                    background: '#ff6b00',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  📎 Paste Image URL
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUrlSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ textAlign: 'left' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600' }}>
                  Image URL (from Google Images, etc.)
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                  required
                />
                <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                  Paste the image URL from Google Images or any image hosting service
                </small>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="submit"
                  disabled={isProcessing}
                  style={{
                    padding: '10px 20px',
                    background: isProcessing ? '#ccc' : '#ff6b00',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  {isProcessing ? '⏳ Checking...' : '✓ Use URL'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Accept URL without preview (useful for CORS-restricted images)
                    const url = imageUrl.trim();
                    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
                      setPreview(url);
                      onImageChange(url);
                      setShowUrlInput(false);
                    } else {
                      alert('Please enter a valid URL starting with http:// or https://');
                    }
                  }}
                  disabled={isProcessing || !imageUrl.trim()}
                  style={{
                    padding: '10px 20px',
                    background: (isProcessing || !imageUrl.trim()) ? '#eee' : '#28a745',
                    color: (isProcessing || !imageUrl.trim()) ? '#999' : 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: (isProcessing || !imageUrl.trim()) ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  ✓ Use Without Preview
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUrlInput(false);
                    setImageUrl('');
                    setIsProcessing(false);
                    setUploadProgress(0);
                  }}
                  disabled={isProcessing}
                  style={{
                    padding: '10px 20px',
                    background: '#ccc',
                    color: '#333',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
              </div>
              {isProcessing && (
                <div style={{ 
                  marginTop: '10px', 
                  padding: '10px', 
                  background: '#f0f0f0', 
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: '#666'
                }}>
                  ⏳ Checking image URL... (This may take a few seconds)
                </div>
              )}
            </form>
          )}
        </div>
      )}
      
      {isProcessing && (
        <div className="processing-overlay" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px'
        }}>
          <div style={{ marginBottom: '10px' }}>Processing image...</div>
          <div style={{
            width: '200px',
            height: '4px',
            backgroundColor: '#eee',
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${uploadProgress}%`,
              height: '100%',
              backgroundColor: '#ff6b00',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <div style={{ fontSize: '12px', marginTop: '5px' }}>
            {uploadProgress}%
          </div>
        </div>
      )}
    </div>
  );
};

// Performance monitoring hook for images
const useImagePerformance = () => {
  const [metrics, setMetrics] = useState({
    totalImages: 0,
    loadedImages: 0,
    failedImages: 0,
    averageLoadTime: 0
  });
  
  const trackImageLoad = useCallback((loadTime) => {
    setMetrics(prev => ({
      ...prev,
      totalImages: prev.totalImages + 1,
      loadedImages: prev.loadedImages + 1,
      averageLoadTime: (prev.averageLoadTime * prev.loadedImages + loadTime) / (prev.loadedImages + 1)
    }));
  }, []);
  
  const trackImageError = useCallback(() => {
    setMetrics(prev => ({
      ...prev,
      totalImages: prev.totalImages + 1,
      failedImages: prev.failedImages + 1
    }));
  }, []);
  
  return {
    metrics,
    trackImageLoad,
    trackImageError
  };
};

export {
  LazyImage,
  OptimizedImageUpload,
  compressImage,
  convertToWebP,
  useImagePerformance
};
