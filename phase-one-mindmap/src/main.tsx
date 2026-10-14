import React from 'react';
import {createRoot} from 'react-dom/client';
import {ReactFlowProvider} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './style.css';
import {useProject} from './useProject';
import {ProjectMapScreen} from './ProjectMapScreen';
import {InternalProjectScreen} from './InternalProjectScreen';
import {StageProgressScreen} from './StageProgressScreen';
function Screen(){const project=useProject();if(!project.read)return <main className="map-loading" role="status">{project.error?'暂时无法读取项目，请稍后重新打开。':'正在打开地图…'}</main>;const stages=project.read.state.projectId==='progress-mindmap-self';return stages?<StageProgressScreen key={`${project.read.state.projectId}:${project.read.state.recoveryEpoch}`} project={project}/>:<ProjectMapScreen key={`${project.read.state.projectId}:${project.read.state.recoveryEpoch}`} project={project}/>;}
const internal=location.pathname==='/internal';
createRoot(document.getElementById('root')!).render(<React.StrictMode><ReactFlowProvider>{internal?<InternalProjectScreen/>:<Screen/>}</ReactFlowProvider></React.StrictMode>);
