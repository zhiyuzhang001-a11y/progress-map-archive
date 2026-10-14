import {randomUUID} from 'node:crypto';
import {projectMap} from '../src/project-map.ts';
import {mapFacts} from '../src/map-comparison.ts';
import type {State,MapCheckpoint} from '../src/domain.ts';
/** Derived from locked authority; no caller-supplied substitute facts. */
export function createMapCheckpoint(s:State,reason:string):MapCheckpoint{return {id:randomUUID(),projectId:s.projectId,revision:s.revision,recoveryEpoch:s.recoveryEpoch,sourceIntegrity:s.integrity,at:new Date().toISOString(),reason,entries:mapFacts(s,projectMap(s))};}
