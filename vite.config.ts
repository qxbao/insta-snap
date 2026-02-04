import { defineConfig } from "vite";
import Icons from "unplugin-icons/vite";
import { crx, ManifestV3Export } from "@crxjs/vite-plugin";
import manifest from "./public/manifest.json";
import tailwindcss from "@tailwindcss/vite";
import IconsResolver from 'unplugin-icons/resolver'
import Components from 'unplugin-vue-components/vite'
import vue from "@vitejs/plugin-vue";

export default defineConfig({
	plugins: [
		vue(),
		Icons({
			autoInstall: true,
			compiler: "vue3",
			defaultClass: "inline-block",
		}),
		tailwindcss({
			optimize: {
				minify: true,
			},
		}),
    Components({
      resolvers: [
        IconsResolver({
          prefix: 'i', 
          enabledCollections: ['fa6-solid'],
        }),
      ],
      dts: 'src/components.d.ts',
    }),
		crx({ manifest: manifest satisfies ManifestV3Export }),
	],
	server: {
		port: 5173,
		strictPort: true,
		hmr: {
			port: 5173,
		},
		cors: {
			origin: [ 
				"chrome-extension://lkhdgfhpbplamljkpcpiblkjpdfjfhaa", 
				"chrome-extension://bcgiblflplhlnhndbbbdgplpcedimbkd",
			],
		},
	},
	build: {
		rollupOptions: {
			input: {
				popup: "popup.html",
				dashboard: "dashboard.html",
			},
		},
	},
});
