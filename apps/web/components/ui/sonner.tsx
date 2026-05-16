'use client';

import { Toaster as SonnerToaster } from 'sonner';

type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

/** Toast host. Rendered once near the app root by the Providers component. */
function Toaster(props: ToasterProps) {
  return <SonnerToaster className="toaster group" {...props} />;
}

export { Toaster };
