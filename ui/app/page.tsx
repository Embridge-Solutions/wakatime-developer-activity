import { redirect } from 'next/navigation';
import { REDIRECT_PATH_AFTER_LOGIN } from '@/config/server-config';

/** "/" — the middleware already sends signed-out users to /login; /start picks the screen by the user's scopes. */
export default function LandingPage() {
  redirect(REDIRECT_PATH_AFTER_LOGIN);
}
