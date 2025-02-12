import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

configure({
  testIdAttribute: 'data-testid',
});

// Extend Element interface for TypeScript
declare global {
  interface Element {
    _classList: DOMTokenList | null;
    _style: { [key: string]: string };
    _attributes: { [key: string]: string };
  }
}

// Create a mock CSSStyleDeclaration class
class MockCSSStyleDeclaration {
  private styles: { [key: string]: string } = {};

  getPropertyValue(prop: string): string {
    return this.styles[prop] || '';
  }

  setProperty(prop: string, value: string): void {
    this.styles[prop] = value;
  }

  removeProperty(prop: string): string {
    const value = this.styles[prop];
    delete this.styles[prop];
    return value || '';
  }

  get transform(): string { return this.getPropertyValue('transform'); }
  set transform(value: string) { this.setProperty('transform', value); }

  get transition(): string { return this.getPropertyValue('transition'); }
  set transition(value: string) { this.setProperty('transition', value); }

  get animation(): string { return this.getPropertyValue('animation'); }
  set animation(value: string) { this.setProperty('animation', value); }

  get opacity(): string { return this.getPropertyValue('opacity'); }
  set opacity(value: string) { this.setProperty('opacity', value); }

  get backgroundColor(): string { return this.getPropertyValue('background-color'); }
  set backgroundColor(value: string) { this.setProperty('background-color', value); }

  get color(): string { return this.getPropertyValue('color'); }
  set color(value: string) { this.setProperty('color', value); }
}

// Extend the built-in Element prototype with additional test helpers
Object.defineProperties(Element.prototype, {
  _classList: {
    value: null,
    writable: true
  },
  _style: {
    value: {},
    writable: true
  },
  _attributes: {
    value: {},
    writable: true
  }
});

// Add test-specific methods to Element prototype
const elementProto = Element.prototype;

// Override getAttribute to support our testing needs
const originalGetAttribute = elementProto.getAttribute;
elementProto.getAttribute = function(name: string): string | null {
  if (this._attributes && name in this._attributes) {
    return this._attributes[name];
  }
  return originalGetAttribute.call(this, name);
};

// Override setAttribute to support our testing needs
const originalSetAttribute = elementProto.setAttribute;
elementProto.setAttribute = function(name: string, value: string): void {
  if (!this._attributes) {
    this._attributes = {};
  }
  this._attributes[name] = value;
  originalSetAttribute.call(this, name, value);
};

// Override style to support our testing needs
Object.defineProperty(elementProto, 'style', {
  get() {
    if (!this._style) {
      this._style = new MockCSSStyleDeclaration();
    }
    return this._style;
  }
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {}
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'IntersectionObserver', {
  value: MockIntersectionObserver,
  writable: true,
  configurable: true
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
  writable: true,
  configurable: true
});

// Extend JSDOM's HTMLElement prototype to add any missing methods
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  value: function() {},
  configurable: true,
});

// Add missing SVG element methods if needed
if (!window.SVGElement.prototype.getBBox) {
  Object.defineProperty(window.SVGElement.prototype, 'getBBox', {
    value: () => ({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    }),
    configurable: true,
  });
}

// Mock getComputedStyle
window.getComputedStyle = (element: Element): any => {
  const style = new MockCSSStyleDeclaration();
  style.setProperty('transform', '');
  style.setProperty('transition', '');
  style.setProperty('animation', '');
  style.setProperty('opacity', '1');
  style.setProperty('background-color', '');
  style.setProperty('color', '');
  return style;
};
