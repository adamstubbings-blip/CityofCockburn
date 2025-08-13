import * as React from 'react';
export function Select({value, onValueChange, children}:{value?:string,onValueChange:(v:string)=>void,children:React.ReactNode}){
  return <select value={value} onChange={e=>onValueChange(e.target.value)} className="w-full">{children}</select>
}
export function SelectTrigger({children,className}:{children:React.ReactNode,className?:string}){ return <div className={className}>{children}</div> }
export function SelectValue({placeholder}:{placeholder?:string}){ return <span className="text-slate-500">{placeholder}</span> }
export function SelectContent({children}:{children:React.ReactNode}){ return <>{children}</> }
export function SelectItem({value, children}:{value:string,children:React.ReactNode}){ return <option value={value}>{children}</option> }