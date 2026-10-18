'use client';

import { Toaster } from 'react-hot-toast';
import { store } from '@/redux/store';
import { Provider } from 'react-redux';

const AppProviders = ({
  children,
}: Readonly<{ children: React.ReactNode }>) => {
  return (
    <>
      <Toaster position='top-left' reverseOrder={false} />
      <Provider store={store}>{children}</Provider>
    </>
  );
};

export default AppProviders;
