// https://nuxt.com/docs/api/configuration/nuxt-config
import Aura from '@primeuix/themes/aura';

export default defineNuxtConfig({
  devtools: { enabled: true },
  runtimeConfig: {
    neo4jUrl: process.env.NUXT_NEO4J_URL,
    neo4jUser: process.env.NUXT_NEO4J_USER,
    neo4jPassword: process.env.NUXT_NEO4J_PASSWORD,
  },
  modules: [['@primevue/nuxt-module', {
    css: {
      exclude: undefined
    }
  }]],
  primevue: {
        options: {
            theme: {
                preset: Aura
            }
        }
  },
  css: [
    'leaflet/dist/leaflet.css'
  ],
  build: {
    transpile: ['primevue', 'primeicons']
  },
  vite: {
    server: {
      fs: {
        allow: ['node_modules']
      }
    }
  }
})
