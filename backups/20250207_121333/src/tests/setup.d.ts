import '@testing-library/jest-dom';
declare global {
    namespace NodeJS {
        interface ProcessEnv {
            REACT_APP_DEEPSEEK_API_KEY: string;
            REACT_APP_ELEVENLABS_API_KEY: string;
        }
    }
}
