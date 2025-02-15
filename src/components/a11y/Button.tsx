import React, { forwardRef } from "react";
import { useAccessibility } from "../../providers/AccessibilityProvider";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  loading?: boolean;
  variant?: "primary" | "secondary" | "text";
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      label,
      description,
      icon,
      loading = false,
      variant = "primary",
      fullWidth = false,
      disabled,
      className,
      onClick,
      ...props
    },
    ref
  ) => {
    const { announce } = useAccessibility();

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) return;

      // Announce action for screen readers
      if (description) {
        announce(description, "polite");
      }

      onClick?.(event);
    };

    const baseClasses =
      "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors";
    const variantClasses = {
      primary:
        "bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500",
      secondary:
        "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500",
      text: "bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500",
    };
    const widthClass = fullWidth ? "w-full" : "";
    const loadingClass = loading ? "opacity-75 cursor-wait" : "";
    const disabledClass = disabled ? "opacity-50 cursor-not-allowed" : "";

    return (
      <button
        ref={ref}
        className={`${baseClasses} ${
          variantClasses[variant]
        } ${widthClass} ${loadingClass} ${disabledClass} ${className || ""}`}
        onClick={handleClick}
        disabled={disabled || loading}
        aria-label={label}
        aria-describedby={description ? `${props.id}-desc` : undefined}
        aria-busy={loading}
        {...props}
      >
        {icon && (
          <span className="mr-2" aria-hidden="true">
            {icon}
          </span>
        )}
        <span>{label}</span>
        {description && (
          <span id={`${props.id}-desc`} className="sr-only">
            {description}
          </span>
        )}
        {loading && (
          <span className="ml-2" role="status" aria-label="Loading">
            {/* Add your loading spinner component here */}
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
