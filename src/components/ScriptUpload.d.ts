import React from "react";
import "./ScriptUpload.css";
export interface ScriptUploadProps {
    onUpload: (file: File) => Promise<void>;
    supportedFormats?: string[];
    maxSize?: number;
}
declare const ScriptUpload: ({ onUpload, supportedFormats, maxSize, }: ScriptUploadProps) => React.JSX.Element;
export default ScriptUpload;
