/// <reference types="vite/client" />

// Import the correct API types from preload
import { CASNOSApi } from '../../preload/index.d.ts';

declare interface Window {
  api: CASNOSApi;
}
