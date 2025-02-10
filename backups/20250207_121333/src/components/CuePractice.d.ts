import React from "react";
import { CueStats } from "../services/cue-practice";
import "./CuePractice.css";
interface CuePracticeProps {
    scriptId: string;
    userRole: string;
    onComplete?: (stats: CueStats) => void;
}
declare const CuePractice: React.FC<CuePracticeProps>;
export default CuePractice;
