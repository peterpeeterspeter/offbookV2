import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';

declare module '@radix-ui/react-dialog' {
  interface DialogOverlayProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> {
    asChild?: boolean;
  }

  interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
    asChild?: boolean;
  }

  interface DialogTitleProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title> {
    asChild?: boolean;
  }

  interface DialogDescriptionProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description> {
    asChild?: boolean;
  }
}

export {};
