import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Apple, Milk, Cookie, Package, Carrot, Fish, Coffee, IceCream } from 'lucide-react';
import {
  DailyEssentialsIcon,
  FreshFruitsIcon,
  IndianVegetablesIcon,
  SpicesMasalasIcon,
  PoojaItemsIcon,
  GodIdolsIcon,
  SeeAllProductsIcon,
} from '../icons/CategoryIcons';

const categories = [
  {
    id: 'fresh-produce',
    name: 'Fresh Produce',
    icon: Carrot,
    color: 'from-green-400 to-green-600',
    image: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=400',
    count: 120,
  },
  {
    id: 'dairy',
    name: 'Dairy & Eggs',
    icon: Milk,
    color: 'from-blue-400 to-blue-600',
    image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400',
    count: 85,
  },
  {
    id: 'snacks',
    name: 'Snacks & Sweets',
    icon: Cookie,
    color: 'from-yellow-400 to-orange-600',
    image: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400',
    count: 150,
  },
  {
    id: 'asian-specialties',
    name: 'Asian Specialties',
    icon: Package,
    color: 'from-red-400 to-pink-600',
    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400',
    count: 95,
  },
  {
    id: 'fruits',
    name: 'Fresh Fruits',
    icon: Apple,
    color: 'from-rose-400 to-red-600',
    image: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400',
    count: 75,
  },
  {
    id: 'seafood',
    name: 'Seafood',
    icon: Fish,
    color: 'from-cyan-400 to-blue-600',
    image: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400',
    count: 45,
  },
  {
    id: 'beverages',
    name: 'Beverages',
    icon: Coffee,
    color: 'from-amber-400 to-orange-600',
    image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400',
    count: 110,
  },
  {
    id: 'frozen',
    name: 'Frozen Foods',
    icon: IceCream,
    color: 'from-indigo-400 to-purple-600',
    image: 'https://images.unsplash.com/photo-1488900128323-21503983a07e?w=400',
    count: 68,
  },
];

const CategoryGrid = ({ onCategoryClick }) => {
  const navigate = useNavigate();

  const handleCategoryClick = (categoryId) => {
    if (onCategoryClick) {
      onCategoryClick(categoryId);
    } else {
      navigate(`/products?category=${categoryId}`);
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
      {categories.map((category) => {
        const IconComponent = category.icon;
        return (
          <div
            key={category.id}
            onClick={() => handleCategoryClick(category.id)}
            className="group relative overflow-hidden rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-2"
          >
            {/* Background (no external image) */}
            <div className="absolute inset-0 bg-gradient-to-br opacity-90 group-hover:opacity-100 transition-opacity"></div>

            {/* Gradient Overlay */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-70 group-hover:opacity-80 transition-opacity`}
            ></div>

            {/* Content */}
            <div className="relative z-10 p-6 h-40 flex flex-col items-center justify-center text-center">
              {/* Icon */}
              <div className="mb-3 p-3 bg-white/20 backdrop-blur-sm rounded-full group-hover:scale-110 transition-transform">
                {(() => {
                  const iconByName = {
                    'Daily Essentials': DailyEssentialsIcon,
                    'Fresh Fruits': FreshFruitsIcon,
                    'Indian Vegetables': IndianVegetablesIcon,
                    'Spices & Masalas': SpicesMasalasIcon,
                    'Pooja Items': PoojaItemsIcon,
                    'God Idols': GodIdolsIcon,
                    'See All Indian Products': SeeAllProductsIcon,
                  };
                  const InlineIcon = iconByName[category.name] || IconComponent;
                  return <InlineIcon className="h-8 w-8" />;
                })()}
              </div>

              {/* Category Name */}
              <h3 className="text-white font-bold text-lg mb-1 drop-shadow-lg">
                {category.name}
              </h3>

              {/* Product Count */}
              <p className="text-white/90 text-sm drop-shadow">
                {category.count} Products
              </p>

              {/* Hover Effect */}
              <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity"></div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CategoryGrid;
