/// <reference types="react" />
/// <reference types="react-dom" />

declare namespace React {
  interface JSX {
    IntrinsicElements: {
      [elemName: string]: any;
    }
  }
}

declare module "*.svg" {
  const content: React.FunctionComponent<React.SVGAttributes<SVGElement>>;
  export default content;
}

declare module "*.png" {
  const content: string;
  export default content;
}

declare module "*.jpg" {
  const content: string;
  export default content;
}

declare module "*.json" {
  const content: any;
  export default content;
} 