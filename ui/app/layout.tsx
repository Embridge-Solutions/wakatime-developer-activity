import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import { fontVariables } from '@/theme/fonts';
import { APP_TITLE, BRAND, BRAND_CSS } from '@/config/brand.config';
import './globals.css';

export const metadata: Metadata = {
  title: APP_TITLE,
  description: BRAND.product.tagline,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' className={fontVariables}>
      <head>
        {/* Brand colors from config/brand.config.ts */}
        <style id='brand-colors' dangerouslySetInnerHTML={{ __html: BRAND_CSS }} />
      </head>
      <body>
        <Toaster
          position='top-right'
          reverseOrder={false}
          gutter={8}
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--color-graphite-900)',
              color: 'var(--color-graphite-50)',
            },
          }}
        />
        <Toaster
          toasterId='confirmation'
          position='top-center'
          containerStyle={{
            top: '30%',
            left: 0,
            right: 0,
            bottom: 0,
            margin: 'auto',
          }}
        />
        {children}
      </body>
    </html>
  );
}
