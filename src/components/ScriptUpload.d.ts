import "./ScriptUpload.css";
export interface ScriptUploadProps {
    onUpload: (file: File) => Promise<void>;
    supportedFormats?: string[];
    maxSize?: number;
}
declare const ScriptUpload: ({ onUpload, supportedFormats, maxSize, }: ScriptUploadProps) => import("react/jsx-runtime").JSX.Element;
export default ScriptUpload;
