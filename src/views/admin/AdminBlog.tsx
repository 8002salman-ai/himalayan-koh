import { FormEvent, useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { adminApi, AdminBlogFilters, BlogPostFormData } from '../../lib/supabase/api/admin';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import type { BlogPost } from '../../lib/supabase/database.types';

const emptyForm: BlogPostFormData = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  featured_image: '',
  category: '',
  tags: [],
  is_published: false,
  published_at: '',
  meta_title: '',
  meta_description: '',
  read_time: 5,
};

export default function AdminBlog() {
  const { user } = useAuthContext();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [formData, setFormData] = useState<BlogPostFormData>(emptyForm);
  const [tagInput, setTagInput] = useState('');

  const fetchPosts = useCallback(async () => {
    setLoading(true);

    if (!isSupabaseConfigured()) {
      setPosts([]);
      setTotalCount(0);
      setTotalPages(1);
      setLoading(false);
      return;
    }

    try {
      const filters: AdminBlogFilters = {
        search: search || undefined,
        is_published: statusFilter === 'published' ? true : statusFilter === 'draft' ? false : undefined,
        page,
        limit: 10,
      };
      const result = await adminApi.getBlogPosts(filters);
      setPosts(result.posts);
      setTotalCount(result.count);
      setTotalPages(result.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch blog posts:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const openCreate = () => {
    setEditingPost(null);
    setFormData(emptyForm);
    setTagInput('');
    setEditorOpen(true);
  };

  const openEdit = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || '',
      content: post.content || '',
      featured_image: post.featured_image || '',
      author_id: post.author_id || undefined,
      category: post.category || '',
      tags: post.tags || [],
      is_published: post.is_published,
      published_at: post.published_at || '',
      meta_title: post.meta_title || '',
      meta_description: post.meta_description || '',
      read_time: post.read_time,
    });
    setTagInput((post.tags || []).join(', '));
    setEditorOpen(true);
  };

  const updateTitle = (title: string) => {
    setFormData((current) => ({
      ...current,
      title,
      slug: current.slug || slugify(title),
      meta_title: current.meta_title || title.slice(0, 60),
    }));
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const url = await adminApi.uploadBlogImage(file, editingPost?.id);
      setFormData((current) => ({ ...current, featured_image: url }));
    } catch (err) {
      console.error('Failed to upload blog image:', err);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      const payload: BlogPostFormData = {
        ...formData,
        author_id: formData.author_id || user?.id,
        tags: tagInput.split(',').map((tag) => tag.trim()).filter(Boolean),
      };

      if (editingPost) {
        const updated = await adminApi.updateBlogPost(editingPost.id, payload);
        setPosts((current) => current.map((post) => post.id === updated.id ? updated : post));
      } else {
        const created = await adminApi.createBlogPost(payload);
        setPosts((current) => [created, ...current]);
      }

      setEditorOpen(false);
      setEditingPost(null);
      await fetchPosts();
    } catch (err) {
      console.error('Failed to save blog post:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      await adminApi.deleteBlogPost(id);
      setPosts((current) => current.filter((post) => post.id !== id));
      setDeleteConfirm(null);
      await fetchPosts();
    } catch (err) {
      console.error('Failed to delete blog post:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublished = async (post: BlogPost) => {
    try {
      const updated = await adminApi.updateBlogPost(post.id, {
        is_published: !post.is_published,
        published_at: !post.is_published ? new Date().toISOString() : post.published_at || undefined,
      });
      setPosts((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (err) {
      console.error('Failed to update blog status:', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Blog Posts</h1>
          <p className="text-charcoal-light">Create and manage CMS articles.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-himalayan hover:bg-himalayan-dark text-white font-semibold rounded-xl transition-colors"
        >
          <Plus size={18} />
          Create Blog
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search blog posts..."
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-himalayan/30"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-himalayan/30"
          >
            <option value="">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 size={32} className="animate-spin text-himalayan" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-charcoal-light">
            No blog posts found.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-charcoal-light uppercase">Post</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-charcoal-light uppercase">Category</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-charcoal-light uppercase">Status</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-charcoal-light uppercase">Views</th>
                    <th className="px-5 py-4 text-right text-xs font-semibold text-charcoal-light uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {posts.map((post) => (
                    <tr key={post.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <img src={post.featured_image || ''} alt={post.title} className="w-14 h-14 rounded-lg object-cover bg-gray-100" />
                          <div>
                            <p className="font-semibold text-charcoal line-clamp-1">{post.title}</p>
                            <p className="text-xs text-charcoal-light">/{post.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-charcoal">{post.category || 'Uncategorized'}</td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleTogglePublished(post)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            post.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {post.is_published ? <Eye size={13} /> : <EyeOff size={13} />}
                          {post.is_published ? 'Published' : 'Draft'}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-sm text-charcoal">{post.view_count}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEdit(post)} className="p-2 rounded-lg hover:bg-gray-100 text-charcoal">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => setDeleteConfirm(post.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-600">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between p-4 border-t border-gray-100">
              <p className="text-sm text-charcoal-light">Showing {posts.length} of {totalCount} posts</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50">
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm text-charcoal-light">Page {page} of {totalPages}</span>
                <button onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {editorOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-40" onClick={() => setEditorOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-8 bottom-8 mx-auto max-w-5xl bg-white rounded-2xl shadow-2xl z-50 overflow-y-auto"
            >
              <form onSubmit={handleSave} className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-serif text-xl font-bold text-charcoal">{editingPost ? 'Edit Blog' : 'Create Blog'}</h2>
                    <p className="text-sm text-charcoal-light">Manage content, image, and SEO metadata.</p>
                  </div>
                  <button type="button" onClick={() => setEditorOpen(false)} className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center">
                    <X size={18} />
                  </button>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    <input required value={formData.title} onChange={(event) => updateTitle(event.target.value)} placeholder="Blog title" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-himalayan/30" />
                    <input required value={formData.slug} onChange={(event) => setFormData({ ...formData, slug: slugify(event.target.value) })} placeholder="blog-slug" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-himalayan/30" />
                    <textarea value={formData.excerpt} onChange={(event) => setFormData({ ...formData, excerpt: event.target.value })} placeholder="Excerpt" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm min-h-24 resize-none focus:outline-none focus:ring-2 focus:ring-himalayan/30" />
                    <textarea value={formData.content} onChange={(event) => setFormData({ ...formData, content: event.target.value })} placeholder="Article content. HTML is supported." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm min-h-72 resize-y focus:outline-none focus:ring-2 focus:ring-himalayan/30" />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-2">Featured Image</label>
                      {formData.featured_image && <img src={formData.featured_image} alt="Featured" className="w-full aspect-video object-cover rounded-xl mb-3 bg-gray-100" />}
                      <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-himalayan transition-colors">
                        {uploadingImage ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                        <span className="text-sm font-medium text-charcoal">Upload Image</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(event) => event.target.files?.[0] && handleImageUpload(event.target.files[0])} />
                      </label>
                    </div>
                    <input value={formData.category} onChange={(event) => setFormData({ ...formData, category: event.target.value })} placeholder="Category" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-himalayan/30" />
                    <input value={tagInput} onChange={(event) => setTagInput(event.target.value)} placeholder="Tags, comma separated" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-himalayan/30" />
                    <input type="number" min={1} value={formData.read_time} onChange={(event) => setFormData({ ...formData, read_time: Number(event.target.value) })} placeholder="Read time" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-himalayan/30" />
                    <label className="flex items-center gap-2 text-sm font-medium text-charcoal">
                      <input type="checkbox" checked={formData.is_published} onChange={(event) => setFormData({ ...formData, is_published: event.target.checked })} className="w-4 h-4 rounded border-gray-300 text-himalayan focus:ring-himalayan" />
                      Published
                    </label>

                    <div className="pt-4 border-t border-gray-100 space-y-3">
                      <h3 className="font-semibold text-charcoal">SEO Metadata</h3>
                      <input value={formData.meta_title} onChange={(event) => setFormData({ ...formData, meta_title: event.target.value })} placeholder="SEO title" maxLength={60} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-himalayan/30" />
                      <textarea value={formData.meta_description} onChange={(event) => setFormData({ ...formData, meta_description: event.target.value })} placeholder="SEO description" maxLength={160} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm min-h-24 resize-none focus:outline-none focus:ring-2 focus:ring-himalayan/30" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
                  <button type="button" onClick={() => setEditorOpen(false)} className="px-5 py-3 border border-gray-200 rounded-xl font-semibold text-charcoal hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button disabled={saving} className="flex items-center gap-2 px-5 py-3 bg-himalayan text-white rounded-xl font-semibold hover:bg-himalayan-dark transition-colors disabled:opacity-70">
                    {saving && <Loader2 size={18} className="animate-spin" />}
                    Save Blog
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}

        {deleteConfirm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-40" onClick={() => setDeleteConfirm(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-x-4 top-32 mx-auto max-w-md bg-white rounded-2xl shadow-2xl z-50 p-6">
              <h2 className="font-serif text-xl font-bold text-charcoal mb-2">Delete Blog Post?</h2>
              <p className="text-charcoal-light mb-6">This cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 border border-gray-200 rounded-xl font-semibold text-charcoal hover:bg-gray-50">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-70">Delete</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
