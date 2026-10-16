import {aboutCopy,footerNote} from '../lib/about-copy';

export default function AboutContentGuide(){
 const editable=[
  ['页面顶部、底部的博客名称','上方「博客名称」'],
  ['「你好，我是…」中的姓名，以及左侧卡片姓名','上方「署名」'],
  ['右侧个人介绍正文','下方「关于我」编辑器'],
  ['GitHub 主页','上方「GitHub 链接」'],
  ['B站、抖音、小红书主页','上方「我的其他主页」中的对应输入框'],
 ];
 const fixed=[
  ['页首英文',aboutCopy.eyebrow],
  ['页首介绍短句',aboutCopy.introduction],
  ['个人卡片短句',aboutCopy.tagline],
  ['写博客的原因标题',aboutCopy.reasonTitle],
  ['写博客的原因正文',aboutCopy.reason],
  ['留言板入口',aboutCopy.invitation],
  ['页脚短句',footerNote],
 ];
 return <section className="about-content-guide" aria-label="关于页内容对应说明">
  <h3>“关于”页的文字在哪里修改？</h3>
  <div className="about-guide-table"><table><thead><tr><th>前台位置</th><th>后台位置</th></tr></thead><tbody>{editable.map(([position,source])=><tr key={position}><td>{position}</td><td>{source}</td></tr>)}</tbody></table></div>
  <p>「一句话简介」用于首页和页面分享描述，不是“关于”页右侧的个人介绍正文。</p>
  <details open><summary>以下是固定文案，没有对应的后台输入框</summary><dl>{fixed.map(([position,text])=><div key={position}><dt>{position}</dt><dd>{text}<span className="fixed-copy-label">固定文案</span></dd></div>)}</dl><p>卡片中的字母 S 和装饰符号也是固定样式；版权年份自动更新，版权署名来自「署名」。</p></details>
 </section>;
}
