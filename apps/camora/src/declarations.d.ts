/// <reference types="vite/client" />

// External packages without bundled types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare module 'react-syntax-highlighter' { const x: any; export default x; export const Light: any; export const PrismLight: any; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare module 'react-syntax-highlighter/dist/esm/styles/hljs' { const x: any; export default x; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare module 'react-syntax-highlighter/dist/esm/styles/hljs/*' { const x: any; export default x; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare module 'react-syntax-highlighter/dist/esm/languages/hljs/*' { const x: any; export default x; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare module 'roughjs/bundled/rough.esm.js' { const rough: any; export default rough; }
