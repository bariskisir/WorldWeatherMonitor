/// <reference types="vite/client" />

export {};

declare global {
  namespace JSX {
    type Element = import("react").JSX.Element;
  }
}
