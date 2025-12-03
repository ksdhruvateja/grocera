import React, { useState, useCallback, useRef } from 'react';

// Utility function to compress image
const compressImage = (file, quality = 0.7, maxWidth = 800, maxHeight = 600) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(resolve, 'image/webp', quality);
    };

    img.src = URL.createObjectURL(file);
  });
};

// Convert to WebP format
const convertToWebP = (imageUrl) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob(resolve, 'image/webp', 0.8);
    };

    img.src = imageUrl;
  });
};

// Lazy loading image component
const LazyImage = React.memo(({ 
  src, 
  alt, 
  className = '', 
  placeholder = null,
  onLoad,
  onError,
  ...props 
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef();

  const handleLoad = useCallback(() => {
    setLoaded(true);
    if (onLoad) onLoad();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setError(true);
    if (onError) onError();
  }, [onError]);

  // Check if WebP is supported
  const supportsWebP = () => {
    const canvas = document.createElement('canvas');
    return canvas.toDataURL('image/webp').indexOf('webp') !== -1;
  };

  // Generate WebP source if supported
  const getOptimizedSrc = () => {
    if (supportsWebP() && src && !src.includes('.webp')) {
      // In a real app, you'd have WebP versions of images
      return src.replace(/\.(jpg|jpeg|png)$/, '.webp');
    }
    return src;
  };

  if (error) {
    return (
      <div className={`image-error ${className}`} {...props}>
        <span>❌ Failed to load</span>
      </div>
    );
  }

  return (
    <div className={`lazy-image-container ${className}`} {...props}>
      {!loaded && placeholder && (
        <div className="image-placeholder">
          {placeholder}
        </div>
      )}
      <img
        ref={imgRef}
        src={getOptimizedSrc()}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
        style={{
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.3s ease'
        }}
      />
    </div>
  );
});

LazyImage.displayName = 'LazyImage';

// Image upload with compression component
const OptimizedImageUpload = ({ 
  onImageSelect, 
  maxSize = 5 * 1024 * 1024, // 5MB
  accept = "image/*",
  quality = 0.7,
  maxWidth = 800,
  maxHeight = 600
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef();

  const handleFileSelect = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file size
    if (file.size > maxSize) {
      alert(`File size must be less than ${maxSize / (1024 * 1024)}MB`);
      return;
    }

    setUploading(true);

    try {
      // Compress the image
      const compressedFile = await compressImage(file, quality, maxWidth, maxHeight);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(compressedFile);
      setPreview(previewUrl);

      // Convert to base64 for storage
      const reader = new FileReader();
      reader.onload = (e) => {
        if (onImageSelect) {
          onImageSelect(e.target.result, compressedFile);
        }
      };
      reader.readAsDataURL(compressedFile);

    } catch (error) {
      console.error('Image compression failed:', error);
      alert('Failed to process image. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [maxSize, quality, maxWidth, maxHeight, onImageSelect]);

  const clearImage = useCallback(() => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onImageSelect) {
      onImageSelect(null, null);
    }
  }, [onImageSelect]);

  return (
    <div className="optimized-image-upload">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      
      {preview ? (
        <div className="image-preview-container">
          <LazyImage
            src={preview}
            alt="Preview"
            className="image-preview"
            placeholder={<span>🖼️ Loading...</span>}
          />
          <div className="preview-actions">
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="change-image-btn"
            >
              🔄 Change
            </button>
            <button 
              type="button"
              onClick={clearImage}
              className="remove-image-btn"
            >
              🗑️ Remove
            </button>
          </div>
        </div>
      ) : (
        <div 
          className="upload-placeholder"
          onClick={() => fileInputRef.current?.click()}
          style={{ cursor: 'pointer' }}
        >
          {uploading ? (
            <div className="uploading">
              <div className="spinner"></div>
              <span>Processing image...</span>
            </div>
          ) : (
            <>
              <span className="upload-icon">📷</span>
              <span>Click to upload image</span>
              <small>Max {maxSize / (1024 * 1024)}MB • WebP optimized</small>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Performance monitoring hook for images
export const useImagePerformance = () => {
  const imageMetrics = useRef(new Map());

  const trackImageLoad = useCallback((src, loadTime) => {
    imageMetrics.current.set(src, {
      loadTime,
      timestamp: Date.now()
    });

    // Log slow loading images
    if (loadTime > 1000) {
      console.warn(`Slow image load: ${src} took ${loadTime}ms`);
    }
  }, []);

  const getImageMetrics = useCallback(() => {
    return Array.from(imageMetrics.current.entries()).map(([src, metrics]) => ({
      src,
      ...metrics
    }));
  }, []);

  return { trackImageLoad, getImageMetrics };
};

export { LazyImage, OptimizedImageUpload, compressImage, convertToWebP };