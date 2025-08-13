import * as React from 'react';
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default'|'secondary'|'destructive' };
export function Button({variant='default', className, ...props}: Props) {
  const v = variant==='secondary' ? 'bg-slate-100 hover:bg-slate-200' :
            variant==='destructive' ? 'bg-red-600 text-white hover:bg-red-700' :
            'bg-sky-600 text-white hover:bg-sky-700';
  return <button className={`${v} ${className||''}`} {...props} />;
}