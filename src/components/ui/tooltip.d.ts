import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
declare const TooltipProvider: React.FC<TooltipPrimitive.TooltipProviderProps>;
declare const TooltipRoot: React.FC<TooltipPrimitive.TooltipProps>;
declare const TooltipTrigger: React.ForwardRefExoticComponent<TooltipPrimitive.TooltipTriggerProps & React.RefAttributes<HTMLButtonElement>>;
declare const TooltipContent: React.ForwardRefExoticComponent<Omit<TooltipPrimitive.TooltipContentProps & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
declare const Tooltip: ({ children, content, ...props }: {
    children: React.ReactNode;
    content: React.ReactNode;
    delayDuration?: number;
}) => React.JSX.Element;
export { Tooltip, TooltipProvider, TooltipRoot, TooltipTrigger, TooltipContent, };
