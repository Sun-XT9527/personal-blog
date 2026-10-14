import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
export default defineConfig({site:'https://sun-xt9527.github.io', base:'/personal-blog', output:'static', trailingSlash:'always', integrations:[react()], vite:{server:{fs:{strict:true}}}});
