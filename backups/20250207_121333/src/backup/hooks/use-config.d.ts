import { Config } from '@/lib/config';
interface UseConfigResult {
    config: Config;
    isValid: boolean;
    errors: Array<{
        path: string;
        message: string;
    }>;
    getFeatureFlag: (flag: keyof Config['features']) => boolean;
    isDebugEnabled: (debugType: keyof Config['debug']) => boolean;
}
export declare function useConfig(): UseConfigResult;
export {};
