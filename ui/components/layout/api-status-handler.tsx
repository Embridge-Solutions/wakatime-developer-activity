"use client";

import dynamic from "next/dynamic";
import React from "react";

// Lazy loading animation components
const Idle = dynamic(() => import("../animation-ui/idle"), {
  ssr: false,
});

const Loader = dynamic(() => import("../animation-ui/loader"), {
  ssr: false,
});

const ErrorAnimation = dynamic(() => import("../animation-ui/error"), {
  ssr: false,
});

const NoData = dynamic<any>(() => import("../animation-ui/emptyData"), {
  ssr: false,
});

const UnauthorizedAccess = dynamic(
  () => import("../animation-ui/unauthorized-access"),
  {
    ssr: false,
  },
);

const InternalServerError = dynamic(
  () => import("../animation-ui/internal-server-error"),
  {
    ssr: false,
  },
);

const NotFoundAnimation = dynamic(() => import("../animation-ui/not-found"), {
  ssr: false,
});

interface ApiStatusHandlerInterface {
  isUninitialized: boolean | undefined;
  isLoading: boolean | undefined;
  isSuccess: boolean | undefined;
  isError: boolean | undefined;
  isEmpty?: boolean;
  error?: any;
  onRetry?: () => void;
  children?: React.ReactNode;
}

const ApiStatusHandler = ({
  isUninitialized,
  isLoading,
  isSuccess,
  isError,
  error,
  onRetry,
  children,
}: ApiStatusHandlerInterface) => {
  // idle animation
  if (isUninitialized) {
    return <Idle variant="floating" message="System Standby..." size="md" />;
  }

  // loading animation
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader
          variant="wave"
          size="lg"
          text="Syncing Data..."
          fullScreen={false}
        />
      </div>
    );
  }

  // error handling
  if (isError) {
    // Extract status code from various possible error structures
    const statusCode =
      error?.status || error?.response?.status || error?.statusCode;

    // 401 & 403: Unauthorized / Forbidden
    if (statusCode === 401 || statusCode === 403) {
      return <UnauthorizedAccess />;
    }

    // 404: Not Found
    if (statusCode === 404) {
      return <NotFoundAnimation />;
    }

    // 500: Internal Server Error
    if (statusCode === 500) {
      return (
        <InternalServerError
          fullScreen={false}
          onRetry={onRetry}
          error={error}
        />
      );
    }

    // Default: Technical Glitch / General Error
    return (
      <ErrorAnimation fullScreen={false} onRetry={onRetry} error={error} />
    );
  }

  // // No Data Case
  // if (isEmptyData) {
  //   return (
  //     <NoData className="backdrop-blur-none bg-transparent shadow-none border-0" />
  //   );
  // }

  // Success state with content
  if (isSuccess) {
    return <>{children}</>;
  }

  // Fallback: Show children if no specific status is active or if statuses are missing
  return <>{children}</>;
};

export default ApiStatusHandler;
