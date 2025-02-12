import React from "react";
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    label: string;
    description?: string;
    icon?: React.ReactNode;
    loading?: boolean;
    variant?: "primary" | "secondary" | "text";
    fullWidth?: boolean;
}
export declare const Button: React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<HTMLButtonElement>>;
export {};
