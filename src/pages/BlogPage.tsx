import { motion } from 'framer-motion';
import { ArrowUpRight, Clock, Tag, User } from 'lucide-react';
import { blogPosts } from '../data/products';

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-warm-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-charcoal to-charcoal-light py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-4 py-1.5 bg-himalayan/20 text-himalayan text-sm font-semibold tracking-wider uppercase rounded-full mb-4"
          >
            Our Blog
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4"
          >
            Latest Articles
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white/70 text-lg max-w-2xl mx-auto"
          >
            Expert insights on livestock health and Himalayan salt benefits
          </motion.p>
        </div>
      </div>

      {/* Blog Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        {/* Featured Post */}
        <motion.article
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12 bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-500 cursor-pointer group"
        >
          <div className="grid md:grid-cols-2 gap-0">
            <div className="aspect-[16/10] md:aspect-auto overflow-hidden">
              <img
                src={blogPosts[0].image}
                alt={blogPosts[0].title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            </div>
            <div className="p-8 md:p-10 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-himalayan-lighter text-himalayan text-xs font-semibold rounded-full">
                  Featured
                </span>
                <span className="text-sm text-charcoal-light">{blogPosts[0].category}</span>
              </div>
              <h2 className="font-serif text-2xl md:text-3xl font-bold text-charcoal mb-4 group-hover:text-himalayan transition-colors">
                {blogPosts[0].title}
              </h2>
              <p className="text-charcoal-light leading-relaxed mb-6">
                {blogPosts[0].excerpt}
              </p>
              <div className="flex items-center gap-4 text-sm text-charcoal-light mb-6">
                <span className="flex items-center gap-1.5">
                  <User size={14} />
                  {blogPosts[0].author}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={14} />
                  {blogPosts[0].readTime}
                </span>
              </div>
              <div className="flex items-center gap-1 text-himalayan font-semibold group-hover:gap-2 transition-all">
                Read Article
                <ArrowUpRight size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </div>
            </div>
          </div>
        </motion.article>

        {/* Other Posts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogPosts.slice(1).map((post, i) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
              whileHover={{ y: -6 }}
              className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-500 cursor-pointer"
            >
              <div className="aspect-[16/10] overflow-hidden">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-4 mb-3 text-xs text-charcoal-light">
                  <span className="flex items-center gap-1">
                    <Tag size={12} />
                    {post.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {post.readTime}
                  </span>
                </div>
                <h3 className="font-serif text-lg font-bold text-charcoal mb-3 group-hover:text-himalayan transition-colors leading-snug line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-charcoal-light text-sm leading-relaxed line-clamp-3 mb-4">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-charcoal-light">{post.date}</span>
                  <div className="flex items-center gap-1 text-himalayan font-semibold text-sm group-hover:gap-2 transition-all">
                    Read
                    <ArrowUpRight size={14} />
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  );
}
