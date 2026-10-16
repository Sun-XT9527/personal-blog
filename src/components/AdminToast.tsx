import {useEffect,useRef,useState} from 'react';
import '../styles/admin-feedback.css';

export default function AdminToast({message,failure,persistent=false,onDismiss}:{message:string;failure:boolean;persistent?:boolean;onDismiss?:()=>void}){
 const [visible,setVisible]=useState(true),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 function pause(){if(timer.current){clearTimeout(timer.current);timer.current=null}}
 function dismiss(){pause();setVisible(false);onDismiss?.()}
 function resume(){pause();if(message&&!failure&&!persistent)timer.current=setTimeout(dismiss,8000)}
 useEffect(()=>{resume();return pause},[failure,persistent,message,onDismiss]);
 if(!visible||!message)return null;
 return <aside className={`admin-toast ${failure?'admin-toast-error':'admin-toast-info'}`} aria-label="后台操作提醒" onMouseEnter={pause} onMouseLeave={resume} onFocusCapture={pause} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget))resume()}}>
  <div role={failure?'alert':'status'} aria-live={failure?'assertive':'polite'} aria-atomic="true"><strong>{failure?'操作未完成':'操作提醒'}</strong><p>{message}</p></div>
  <button type="button" aria-label="关闭提醒" onClick={dismiss}>×</button>
 </aside>;
}
