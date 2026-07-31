// Lets TypeScript accept CSS / CSS-module imports used by the Expo web template.
// Metro and NativeWind handle these at bundle time; this only satisfies tsc.
declare module '*.css';
declare module '*.module.css';
