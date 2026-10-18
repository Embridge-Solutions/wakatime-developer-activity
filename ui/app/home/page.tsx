import { redirect } from 'next/navigation';

/** Old start page of the earlier app — kept so bookmarks and old settings land on the right screen. */
export default function HomeRedirect() {
  redirect('/start');
}
