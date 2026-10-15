import type {Snapshot} from './types';
import {defaultSocialLinks} from './socials';
export const defaultSnapshot:Snapshot={settings:{name:'Sun XT 的博客',author:'Sun XT',description:'把学习中的发现、生活里的片段，和慢慢长成的想法，留在这里。',github:'https://github.com/Sun-XT9527',socials:{...defaultSocialLinks},about:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'你好，我是 Sun XT。这里是我的个人记录空间。关于我的更多介绍，正在慢慢整理中。'}]}]},projects:[]},posts:[]};
export {categories,categoryDescriptions} from './categories';
