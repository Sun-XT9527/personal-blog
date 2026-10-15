export const socialPlatforms = [
  {key:'bilibili',label:'B站',fieldLabel:'B站主页'},
  {key:'douyin',label:'抖音',fieldLabel:'抖音主页'},
  {key:'xiaohongshu',label:'小红书',fieldLabel:'小红书主页'},
] as const;

export type SocialPlatform = typeof socialPlatforms[number]['key'];
export type SocialLinks = Record<SocialPlatform,string>;
export const defaultSocialLinks:SocialLinks = {
  bilibili:'https://space.bilibili.com/524485588',
  douyin:'https://v.douyin.com/8MnbzArPU4o/',
  xiaohongshu:'https://xhslink.cn/o/988a4DcetlI',
};

export function normalizeSocialLinks(links?:Partial<SocialLinks>|null):SocialLinks {
  return Object.fromEntries(socialPlatforms.map(({key})=>[key,typeof links?.[key]==='string'?links[key].trim():defaultSocialLinks[key]])) as SocialLinks;
}

export function isProfileUrl(value:string):boolean {
  if(!value.trim())return true;
  try{return new URL(value.trim()).protocol==='https:';}catch{return false;}
}
