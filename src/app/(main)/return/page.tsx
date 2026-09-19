import { redirect } from 'next/navigation';

/**
 * The canonical route is now `/returns` (plural). This page exists only so
 * bookmarks and cached links to `/return` (singular) still land in the right
 * place. The 308 Permanent Redirect tells search engines to update their index.
 */
export default function Page() {
  redirect('/returns');
}
