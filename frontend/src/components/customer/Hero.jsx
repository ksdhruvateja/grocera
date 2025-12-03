import React from 'react';
import { ArrowRight } from 'lucide-react';

function Hero() {
  return (
    <section className="relative isolate bg-gradient-to-br from-emerald-50 to-lime-50 rounded-3xl p-6 md:p-8">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left: title + subtitle + CTA + features */}
          <div className="flex flex-col justify-center gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-4 text-gray-900">
                Groceries today, not someday.
              </h1>
              <p className="text-gray-600 mb-6">
                Same-day delivery of fresh produce, world pantry favorites, and daily essentials.
              </p>
              <a
                href="/shop"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-orange-600 text-white shadow-md hover:bg-orange-700 transition-colors"
              >
                Start Shopping
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {[
                { title: 'Fresh Selection', desc: 'Daily-picked produce' },
                { title: 'World Pantry', desc: 'Global essentials' },
                { title: 'Fast Delivery', desc: 'Same-day service' },
              ].map((f) => (
                <div key={f.title} className="bg-white/80 rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition">
                  <h3 className="font-semibold text-gray-900">{f.title}</h3>
                  <p className="text-sm text-gray-600">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: clean image collage */}
          <div className="relative overflow-hidden rounded-3xl shadow-2xl h-[420px]">
            <img
              src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200"
              alt="Groceries collage"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
