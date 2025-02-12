import '@testing-library/jest-dom';
declare global {
    interface Element {
        _classList: DOMTokenList | null;
        _style: {
            [key: string]: string;
        };
        _attributes: {
            [key: string]: string;
        };
    }
}
