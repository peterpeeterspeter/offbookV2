import React, { useEffect, useRef, useCallback } from "react";
import { useAccessibility } from "../../providers/AccessibilityProvider";
import { Button } from "./Button";
import { useKeyboardNavigation } from "../../hooks/useA11y";
import { cn } from "../../lib/utils";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary";
  }>;
  initialFocusRef?: React.RefObject<HTMLElement>;
  /** ID for the dialog title element. If not provided, a default will be used. */
  titleId?: string;
  /** ID for the dialog description element. If not provided, a default will be used if description exists. */
  descriptionId?: string;
  /** Whether to hide the close button. Defaults to false. */
  hideCloseButton?: boolean;
  /** Additional ARIA role for more specific dialog types (e.g. "alertdialog"). Defaults to "dialog". */
  role?: "dialog" | "alertdialog";
}

export const Dialog = React.forwardRef<HTMLDivElement, DialogProps>(
  (
    {
      isOpen,
      onClose,
      title,
      description,
      children,
      actions = [],
      initialFocusRef,
      titleId = "dialog-title",
      descriptionId = "dialog-description",
      hideCloseButton = false,
      role = "dialog",
    },
    ref
  ) => {
    const { announce, preferences } = useAccessibility();
    const dialogRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<HTMLElement | null>(null);

    // Register keyboard shortcuts
    useKeyboardNavigation({
      onEscape: onClose,
      onArrowUp: () => {
        const elements = getFocusableElements();
        const currentIndex = elements.indexOf(
          document.activeElement as HTMLElement
        );
        const prevIndex =
          currentIndex > 0 ? currentIndex - 1 : elements.length - 1;
        elements[prevIndex]?.focus();
      },
      onArrowDown: () => {
        const elements = getFocusableElements();
        const currentIndex = elements.indexOf(
          document.activeElement as HTMLElement
        );
        const nextIndex =
          currentIndex < elements.length - 1 ? currentIndex + 1 : 0;
        elements[nextIndex]?.focus();
      },
    });

    // Get focusable elements helper
    const getFocusableElements = useCallback(() => {
      if (!dialogRef.current) return [];
      return Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => {
        const style = window.getComputedStyle(el);
        return style.display !== "none" && style.visibility !== "hidden";
      });
    }, []);

    // Prevent scroll on body when dialog is open
    useEffect(() => {
      if (isOpen) {
        const scrollbarWidth =
          window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = "hidden";
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      } else {
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
      }
      return () => {
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
      };
    }, [isOpen]);

    // Handle focus management
    useEffect(() => {
      if (isOpen) {
        // Store current active element
        previousActiveElement.current = document.activeElement as HTMLElement;

        // Focus the initial element or dialog
        if (initialFocusRef?.current) {
          initialFocusRef.current.focus();
          announce(
            `Dialog opened. ${title}. ${description || ""}`,
            "assertive"
          );
        } else {
          dialogRef.current?.focus();
          // If no initial focus element, announce the first focusable element
          const firstFocusable = getFocusableElements()[0];
          if (firstFocusable) {
            announce(
              `Dialog opened. ${title}. First focusable element is ${
                firstFocusable.getAttribute("aria-label") ||
                firstFocusable.textContent
              }`,
              "assertive"
            );
          }
        }

        // Hide main content from screen readers
        document
          .getElementById("main-content")
          ?.setAttribute("aria-hidden", "true");

        return () => {
          // Restore focus and unhide main content
          previousActiveElement.current?.focus();
          document
            .getElementById("main-content")
            ?.removeAttribute("aria-hidden");
          announce("Dialog closed", "polite");
        };
      }
    }, [
      isOpen,
      title,
      description,
      announce,
      getFocusableElements,
      initialFocusRef,
    ]);

    if (!isOpen) return null;

    return (
      <div
        className="fixed inset-0 z-50 overflow-y-auto"
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onClick={onClose}
      >
        {/* Backdrop with reduced motion preference support */}
        <div
          className={cn(
            "fixed inset-0 bg-black/50",
            preferences.reduceMotion
              ? "transition-none"
              : "transition-opacity duration-200"
          )}
          aria-hidden="true"
        />

        {/* Dialog panel */}
        <div className="flex min-h-screen items-center justify-center p-4">
          <div
            ref={dialogRef}
            className={cn(
              "relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
              preferences.reduceMotion
                ? "transition-none"
                : "transition-all duration-200",
              preferences.highContrast && "border-2 border-black"
            )}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            {!hideCloseButton && (
              <Button
                label="Close dialog"
                variant="text"
                className="absolute right-4 top-4"
                onClick={onClose}
                aria-label="Close dialog"
                icon={
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                }
              />
            )}

            {/* Title */}
            <h2 id={titleId} className="text-lg font-semibold leading-6">
              {title}
            </h2>

            {/* Description */}
            {description && (
              <p id={descriptionId} className="mt-2 text-sm text-gray-500">
                {description}
              </p>
            )}

            {/* Content */}
            <div className="mt-4">{children}</div>

            {/* Action buttons */}
            {actions.length > 0 && (
              <div className="mt-6 flex flex-row-reverse gap-3">
                {actions.map((action, index) => (
                  <Button
                    key={action.label}
                    onClick={action.onClick}
                    variant={action.variant || "primary"}
                    label={action.label}
                    aria-label={action.label}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

Dialog.displayName = "Dialog";
