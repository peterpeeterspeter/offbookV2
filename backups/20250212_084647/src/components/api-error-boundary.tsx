import React from "react";

interface Props {
  children: React.ReactNode;
}

export function ApiErrorBoundaryWrapper({ children }: Props) {
  return <div className="relative">{children}</div>;
}
