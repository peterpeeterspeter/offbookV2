import React from "react";
import { VADService } from "../services/vad-service";
interface VADMetricsDashboardProps {
    vadService: VADService;
    maxHistoryPoints?: number;
}
export declare const VADMetricsDashboard: React.FC<VADMetricsDashboardProps>;
export {};
