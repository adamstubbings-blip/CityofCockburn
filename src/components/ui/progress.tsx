export function Progress({value=0, className}:{value?:number,className?:string}){
  return <div className={`w-full h-2 bg-slate-200 rounded-full ${className||''}`}><div className="h-2 bg-sky-600 rounded-full" style={{width: `${Math.max(0,Math.min(100,value))}%`}}/></div>
}