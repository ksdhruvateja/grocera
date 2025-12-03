import React from 'react';

export const SkeletonBox = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
);

export const ProductCardSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 border border-gray-200 dark:border-gray-700">
    <SkeletonBox className="h-40 w-full mb-4" />
    <SkeletonBox className="h-4 w-1/3 mb-2" />
    <SkeletonBox className="h-5 w-3/4 mb-3" />
    <SkeletonBox className="h-5 w-1/2 mb-4" />
    <SkeletonBox className="h-10 w-full" />
  </div>
);

export const ProductDetailSkeleton = () => (
  <div className="grid lg:grid-cols-2 gap-10">
    <div>
      <SkeletonBox className="h-[420px] w-full rounded-2xl" />
      <div className="grid grid-cols-4 gap-3 mt-4">
        {[...Array(4)].map((_, i) => (
          <SkeletonBox key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    </div>
    <div>
      <SkeletonBox className="h-8 w-2/3 mb-3" />
      <SkeletonBox className="h-4 w-full mb-2" />
      <SkeletonBox className="h-4 w-5/6 mb-6" />
      <SkeletonBox className="h-8 w-1/3 mb-6" />
      <SkeletonBox className="h-10 w-40 mb-4" />
      <SkeletonBox className="h-24 w-full" />
    </div>
  </div>
);

export const CartSkeleton = () => (
  <div className="grid lg:grid-cols-3 gap-8">
    <div className="lg:col-span-2 space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <SkeletonBox className="h-20 w-20 rounded-lg" />
          <div className="flex-1">
            <SkeletonBox className="h-5 w-2/3 mb-2" />
            <SkeletonBox className="h-4 w-1/3" />
          </div>
          <SkeletonBox className="h-5 w-16" />
        </div>
      ))}
    </div>
    <div>
      <SkeletonBox className="h-64 w-full rounded-2xl" />
    </div>
  </div>
);

export const CheckoutSkeleton = () => (
  <div className="grid lg:grid-cols-3 gap-8">
    <div className="lg:col-span-2">
      <SkeletonBox className="h-8 w-40 mb-4" />
      {[...Array(3)].map((_, i) => (
        <SkeletonBox key={i} className="h-16 w-full mb-3 rounded-lg" />
      ))}
      <SkeletonBox className="h-8 w-48 mt-4 mb-3" />
      <div className="grid md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <SkeletonBox key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    </div>
    <div>
      <SkeletonBox className="h-64 w-full rounded-2xl" />
    </div>
  </div>
);

export const OrderTrackingSkeleton = () => (
  <div>
    <div className="flex items-center justify-between">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex-1">
          <SkeletonBox className="h-12 w-12 rounded-full mx-auto" />
          <SkeletonBox className="h-4 w-24 mx-auto mt-2" />
        </div>
      ))}
    </div>
    <div className="grid md:grid-cols-2 gap-6 mt-8">
      <SkeletonBox className="h-24 w-full rounded-lg" />
      <SkeletonBox className="h-24 w-full rounded-lg" />
    </div>
  </div>
);
