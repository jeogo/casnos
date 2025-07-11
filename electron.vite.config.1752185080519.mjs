// electron.vite.config.ts
import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src")
      }
    },
    plugins: [react()],
    css: {
      postcss: "./postcss.config.js"
    },
    server: {
      fs: {
        allow: [".."]
        // السماح بالوصول للملفات خارج src
      }
    },
    publicDir: resolve("resources"),
    // جعل مجلد resources متاحاً للعامة
    assetsInclude: ["**/*.mp3", "**/*.wav", "**/*.ogg"]
    // دعم ملفات الصوت
  }
});
export {
  electron_vite_config_default as default
};
