import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, Clock, Loader2, Search, Tag, User } from 'lucide-react';
import { blogApi, BlogPostWithAuthor } from '../lib/supabase/api';
import { isSupabaseConfigured } from '../lib/supabase/client';

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPostWithAuthor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      if (!isSupabaseConfigured()) {
        setLoading(false);
        return;
      }

      try {
        const { posts } = await blogApi.getPosts();
        setPosts(posts);
      } catch (err) {
        console.error('Failed to fetch blog posts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return posts;
    const query = searchQuery.toLowerCase();
    return posts.filter((post) =>
      post.title.toLowerCase().includes(query) ||
      post.excerpt?.toLowerCase().includes(query) ||
      post.category?.toLowerCase().includes(query)
    );
  }, [posts, searchQuery]);

  const featuredPost = filteredPosts[0];
  const otherPosts = filteredPosts.slice(1);

  return (
    <div className="min-h-screen bg-warm-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-charcoal to-charcoal-light py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-4 py-1.5 bg-himalayan/20 text-himalayan text-sm font-semibold tracking-wider uppercase rounded-full mb-5"
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
        <div className="relative max-w-md mb-10">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search articles..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-himalayan/30"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={40} className="animate-spin text-himalayan" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center text-charcoal-light">
            No blog posts found.
          </div>
        ) : (
          <>
        {/* Featured Post */}
        {featuredPost && (
        <motion.article
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12 bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-500 cursor-pointer group"
        >
          <Link to={`/blog/${featuredPost.slug}`} className="grid md:grid-cols-2 gap-0">
            <div className="aspect-[16/10] md:aspect-auto overflow-hidden">
              <img
                src={featuredPost.featured_image || ''}
                alt={featuredPost.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            </div>
            <div className="p-8 md:p-10 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-himalayan-lighter text-himalayan text-xs font-semibold rounded-full">
                  Featured
                </span>
                <span className="text-sm text-charcoal-light">{featuredPost.category}</span>
              </div>
              <h2 className="font-serif text-2xl md:text-3xl font-bold text-charcoal mb-4 group-hover:text-himalayan transition-colors">
                {featuredPost.title}
              </h2>
              <p className="text-charcoal-light leading-relaxed mb-6">
                {featuredPost.excerpt}
              </p>
              <div className="flex items-center gap-4 text-sm text-charcoal-light mb-6">
                <span className="flex items-center gap-1.5">
                  <User size={14} />
                  {featuredPost.author?.full_name || 'Himalayan Koh'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={14} />
                  {featuredPost.read_time} min read
                </span>
              </div>
              <div className="flex items-center gap-1 text-himalayan font-semibold group-hover:gap-2 transition-all">
                Read Article
                <ArrowUpRight size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </div>
            </div>
          </Link>
        </motion.article>
        )}

        {/* Other Posts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {otherPosts.map((post, i) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
              whileHover={{ y: -6 }}
              className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-500 cursor-pointer"
            >
              <Link to={`/blog/${post.slug}`} className="block">
              <div className="aspect-[16/10] overflow-hidden">
                <img
                  src={post.featured_image || ''}
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
                    {post.read_time} min read
                  </span>
                </div>
                <h3 className="font-serif text-lg font-bold text-charcoal mb-3 group-hover:text-himalayan transition-colors leading-snug line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-charcoal-light text-sm leading-relaxed line-clamp-3 mb-4">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-charcoal-light">
                    {new Date(post.published_at || post.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1 text-himalayan font-semibold text-sm group-hover:gap-2 transition-all">
                    Read
                    <ArrowUpRight size={14} />
                  </div>
                </div>
              </div>
              </Link>
            </motion.article>
          ))}
        </div>
          </>
        )}
      </div>
    </div>
  );
}
