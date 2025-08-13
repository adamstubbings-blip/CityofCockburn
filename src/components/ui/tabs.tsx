import * as React from 'react';
const Ctx = React.createContext<{value:string,set:(v:string)=>void}|null>(null);
export function Tabs({defaultValue, children}:{defaultValue:string,children:React.ReactNode}){
  const [value, set] = React.useState(defaultValue);
  return <Ctx.Provider value={{value,set}}>{children}</Ctx.Provider>
}
export function TabsList({children}:{children:React.ReactNode}){ return <div className="flex gap-2">{children}</div> }
export function TabsTrigger({value, children}:{value:string,children:React.ReactNode}){
  const ctx = React.useContext(Ctx)!; const active = ctx.value===value;
  return <button onClick={()=>ctx.set(value)} className={`px-3 py-2 rounded-lg ${active?'bg-sky-600 text-white':'bg-slate-200'}`}>{children}</button>
}
export function TabsContent({value, children, className}:{value:string,children:React.ReactNode,className?:string}){
  const ctx = React.useContext(Ctx)!; return ctx.value===value ? <div className={className}>{children}</div> : null;
}