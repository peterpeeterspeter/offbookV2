import React from "react";
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
export declare const Dialog: React.ForwardRefExoticComponent<DialogProps & React.RefAttributes<HTMLDivElement>>;
