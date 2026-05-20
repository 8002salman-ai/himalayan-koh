import{a4 as s}from"./index-C2pgdAoX.js";const c={async getPosts(t={}){let e=s.from("blog_posts").select(`
        *,
        author:profiles(id, full_name, avatar_url)
      `,{count:"exact"}).eq("is_published",!0).order("published_at",{ascending:!1});t.category&&(e=e.eq("category",t.category)),t.tag&&(e=e.contains("tags",[t.tag])),t.search&&(e=e.or(`title.ilike.%${t.search}%,excerpt.ilike.%${t.search}%`)),t.limit&&(e=e.limit(t.limit)),t.offset&&(e=e.range(t.offset,t.offset+(t.limit||10)-1));const{data:a,error:o,count:i}=await e;if(o)throw o;return{posts:a,count:i||0}},async getPostBySlug(t){const{data:e,error:a}=await s.from("blog_posts").select(`
        *,
        author:profiles(id, full_name, avatar_url)
      `).eq("slug",t).eq("is_published",!0).single();if(a){if(a.code==="PGRST116")return null;throw a}return await s.from("blog_posts").update({view_count:e.view_count+1}).eq("id",e.id),e},async getFeaturedPosts(t=3){const{data:e,error:a}=await s.from("blog_posts").select(`
        *,
        author:profiles(id, full_name, avatar_url)
      `).eq("is_published",!0).order("published_at",{ascending:!1}).limit(t);if(a)throw a;return e},async getRelatedPosts(t,e,a=3){let o=s.from("blog_posts").select(`
        *,
        author:profiles(id, full_name, avatar_url)
      `).eq("is_published",!0).neq("id",t).limit(a);e&&(o=o.eq("category",e));const{data:i,error:l}=await o;if(l)throw l;return i},async getPostsForCategoryHub({categories:t=[],tags:e=[],limit:a=4}){const o=new Set,i=[],l=n=>{for(const r of n)o.has(r.id)||i.length>=a||(o.add(r.id),i.push(r))};if(t.length>0){const{data:n,error:r}=await s.from("blog_posts").select(`
          *,
          author:profiles(id, full_name, avatar_url)
        `).eq("is_published",!0).in("category",t).order("published_at",{ascending:!1}).limit(a);if(r)throw r;l(n||[])}if(i.length<a&&e.length>0){const{data:n,error:r}=await s.from("blog_posts").select(`
          *,
          author:profiles(id, full_name, avatar_url)
        `).eq("is_published",!0).overlaps("tags",e).order("published_at",{ascending:!1}).limit(a);if(r)throw r;l(n||[])}return i.slice(0,a)},async getCategories(){const{data:t,error:e}=await s.from("blog_posts").select("category").eq("is_published",!0).not("category","is",null);if(e)throw e;return[...new Set(t.map(o=>o.category))]},async getTags(){const{data:t,error:e}=await s.from("blog_posts").select("tags").eq("is_published",!0);if(e)throw e;return[...new Set(t.flatMap(o=>o.tags||[]))]}};export{c as b};
