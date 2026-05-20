import{Q as r}from"./index-CUzXBFMC.js";const u={async getPosts(e={}){let t=r.from("blog_posts").select(`
        *,
        author:profiles(id, full_name, avatar_url)
      `,{count:"exact"}).eq("is_published",!0).order("published_at",{ascending:!1});e.category&&(t=t.eq("category",e.category)),e.tag&&(t=t.contains("tags",[e.tag])),e.search&&(t=t.or(`title.ilike.%${e.search}%,excerpt.ilike.%${e.search}%`)),e.limit&&(t=t.limit(e.limit)),e.offset&&(t=t.range(e.offset,e.offset+(e.limit||10)-1));const{data:a,error:o,count:s}=await t;if(o)throw o;return{posts:a,count:s||0}},async getPostBySlug(e){const{data:t,error:a}=await r.from("blog_posts").select(`
        *,
        author:profiles(id, full_name, avatar_url)
      `).eq("slug",e).eq("is_published",!0).single();if(a){if(a.code==="PGRST116")return null;throw a}return await r.from("blog_posts").update({view_count:t.view_count+1}).eq("id",t.id),t},async getFeaturedPosts(e=3){const{data:t,error:a}=await r.from("blog_posts").select(`
        *,
        author:profiles(id, full_name, avatar_url)
      `).eq("is_published",!0).order("published_at",{ascending:!1}).limit(e);if(a)throw a;return t},async getRelatedPosts(e,t,a=3){let o=r.from("blog_posts").select(`
        *,
        author:profiles(id, full_name, avatar_url)
      `).eq("is_published",!0).neq("id",e).limit(a);t&&(o=o.eq("category",t));const{data:s,error:i}=await o;if(i)throw i;return s},async getCategories(){const{data:e,error:t}=await r.from("blog_posts").select("category").eq("is_published",!0).not("category","is",null);if(t)throw t;return[...new Set(e.map(o=>o.category))]},async getTags(){const{data:e,error:t}=await r.from("blog_posts").select("tags").eq("is_published",!0);if(t)throw t;return[...new Set(e.flatMap(o=>o.tags||[]))]}};export{u as b};
