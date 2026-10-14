import type {ProjectMapNode} from './project-map';
export type Point={x:number;y:number};
/** Every known node keeps a fixed slot; revealing children never rearranges its ancestors. */
export function mapPositions(nodes:ProjectMapNode[],compact=false):Record<string,Point>{
 const root=nodes.find(n=>!n.parent)!;const positions:Record<string,Point>={[root.id]:{x:-150,y:compact?-400:-92}};
 const branches=nodes.filter(n=>n.parent===root.id);
 if(compact)branches.forEach((n,i)=>{positions[n.id]={x:i%2===0?-270:20,y:-90+Math.floor(i/2)*250};});
 else for(const side of ['left','right'] as const){const group=branches.filter(n=>n.side===side);group.forEach((n,i)=>{positions[n.id]={x:side==='left'?-560:310,y:(i-(group.length-1)/2)*360-88};});}
 for(const branch of branches){const direction=positions[branch.id].x<0?-1:1;const sideGroup=branches.filter(n=>compact?(positions[n.id].x<0)===(direction<0):n.side===branch.side);const vertical=sideGroup.indexOf(branch)<sideGroup.length/2?-1:1;
  const place=(parent:ProjectMapNode)=>{const children=parent.children.map(id=>nodes.find(n=>n.id===id)).filter((n):n is ProjectMapNode=>!!n);for(let i=0;i<children.length;i++){const child=children[i];const x=positions[parent.id].x+direction*(Math.floor(i/4)+1)*340;let y=positions[parent.id].y+vertical*(i%4)*220;while(Object.values(positions).some(p=>Math.abs(p.x-x)<270&&Math.abs(p.y-y)<210))y+=vertical*220;positions[child.id]={x,y};}for(const child of children)place(child);};place(branch);
 }return positions;
}

/** New nodes occupy free slots while all surviving anchors stay exactly where they were. */
export function mergeMapPositions(previous:Record<string,Point>,generated:Record<string,Point>):Record<string,Point>{
 const next=Object.fromEntries(Object.entries(previous).filter(([id])=>generated[id]));
 for(const [id,desired] of Object.entries(generated)){if(next[id])continue;let y=desired.y;const available=(candidate:number)=>!Object.values(next).some(p=>Math.abs(p.x-desired.x)<270&&Math.abs(p.y-candidate)<220);if(!available(y)){for(let step=1;step<3000;step++){if(available(desired.y+step*230)){y=desired.y+step*230;break;}if(available(desired.y-step*230)){y=desired.y-step*230;break;}}}next[id]={x:desired.x,y};}
 return next;
}
