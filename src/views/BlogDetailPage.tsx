import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowUpRight, Clock, Loader2, Tag, User } from 'lucide-react';
import JsonLd from '../components/JsonLd';
import { usePageSeo } from '../hooks/usePageSeo';
import { SITE_URL } from '../lib/seo/constants';
import { blogApi, BlogPostWithAuthor } from '../lib/supabase/api';
import { isSupabaseConfigured } from '../lib/supabase/client';

export default function BlogDetailPage() {
  const { slug } = useParams();
  const [post, setPost] = useState<BlogPostWithAuthor | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug || !isSupabaseConfigured()) {
        setLoading(false);
        return;
      }

      try {
        const post = await blogApi.getPostBySlug(slug);
        setPost(post);

        if (post) {
          setRelatedPosts(await blogApi.getRelatedPosts(post.id, post.category, 3));
        }
      } catch (err) {
        console.error('Failed to fetch blog post:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug]);

  const seo = useMemo(() => {
    if (!post) return null;
    return {
      title: post.meta_title || `${post.title} | Himalayan Koh`,
      description: post.meta_description || post.excerpt || '',
      canonicalPath: `/blog/${post.slug}`,
      ogImage: post.featured_image || undefined,
      ogType: 'article',
    };
  }, [post]);

  usePageSeo(seo);

  const blogJsonLd = useMemo(() => {
    if (!post) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.meta_description || post.excerpt || '',
      image: post.featured_image || undefined,
      datePublished: post.published_at || undefined,
      author: {
        '@type': 'Person',
        name: post.author?.full_name || 'Himalayan Koh',
      },
      publisher: {
        '@type': 'Organization',
        name: 'Himalayan Koh',
        url: SITE_URL,
      },
      mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    };
  }, [post]);

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-white flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-himalayan" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-warm-white py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="bg-white rounded-2xl shadow-md p-12">
            <h1 className="font-serif text-3xl font-bold text-charcoal mb-3">Article Not Found</h1>
            <p className="text-charcoal-light mb-6">This blog post is unavailable.</p>
            <Link to="/blog" className="inline-flex items-center justify-center px-6 py-3 bg-himalayan hover:bg-himalayan-dark text-white font-semibold rounded-xl transition-colors">
              Back to Blog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-white">
      {blogJsonLd && <JsonLd id="blog-post" data={blogJsonLd} />}
      <div className="bg-gradient-to-r from-charcoal to-charcoal-light py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Link to="/blog" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-6 text-sm">
            <ArrowLeft size={16} />
            Back to Blog
          </Link>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-serif text-3xl md:text-5xl font-bold text-white leading-tight"
          >
            {post.title}
          </motion.h1>
          <div className="flex flex-wrap items-center gap-4 text-white/70 text-sm mt-5">
            <span className="flex items-center gap-1.5">
              <User size={14} />
              {post.author?.full_name || 'Himalayan Koh'}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={14} />
              {post.read_time} min read
            </span>
            {post.category && (
              <span className="flex items-center gap-1.5">
                <Tag size={14} />
                {post.category}
              </span>
            )}
          </div>
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-4 sm:px-6 py-10 md:py-14">
        {post.featured_image && (
          <img
            src={post.featured_image}
            alt={post.title}
            className="w-full rounded-3xl shadow-lg object-cover aspect-[16/9] mb-10"
          />
        )}

        <div className="bg-white rounded-2xl shadow-md p-6 md:p-10">
          {post.excerpt && (
            <p className="text-lg text-charcoal-light leading-relaxed mb-8">
              {post.excerpt}
            </p>
          )}
          <div
            className="prose prose-lg max-w-none text-charcoal-light leading-relaxed"
            dangerouslySetInnerHTML={{ __html: post.content || '' }}
          />
        </div>

        {relatedPosts.length > 0 && (
          <section className="mt-12">
            <h2 className="font-serif text-2xl font-bold text-charcoal mb-6">Related Articles</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedPosts.map((related) => (
                <Link
                  key={related.id}
                  to={`/blog/${related.slug}`}
                  className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300"
                >
                  <img
                    src={related.featured_image || ''}
                    alt={related.title}
                    className="w-full aspect-[16/10] object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="p-5">
                    <p className="text-xs text-charcoal-light mb-2">{related.category}</p>
                    <h3 className="font-serif font-bold text-charcoal line-clamp-2 group-hover:text-himalayan transition-colors">
                      {related.title}
                    </h3>
                    <span className="inline-flex items-center gap-1 text-himalayan font-semibold text-sm mt-4">
                      Read
                      <ArrowUpRight size={14} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
