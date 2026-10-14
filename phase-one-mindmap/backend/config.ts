import * as fs from 'node:fs/promises';
import {resolve,join,basename} from 'node:path';
import {z} from 'zod';
import {id,fail} from '../src/domain.ts';
export const projectConfigSchema=z.object({configVersion:z.literal(1),projectId:id,name:z.string().min(1).max(200),kind:z.enum(['synthetic','real']),dataDirectory:id,port:z.number().int().min(1024).max(65535),readOnly:z.boolean(),initialState:z.string().regex(/^[a-zA-Z0-9_-]+\.json$/).optional()}).strict();
export type ProjectConfig=z.infer<typeof projectConfigSchema>;
export async function loadConfig(root:string,path='project.config.json'):Promise<ProjectConfig>{root=resolve(root);if(await fs.realpath(root)!==root)fail('IDENTITY_MISMATCH','根目录必须规范化');if(basename(path)!==path||!path.endsWith('.json'))fail('PATH_DENIED','配置必须是根目录内 JSON 文件名');const p=join(root,path);const st=await fs.lstat(p);if(st.isSymbolicLink()||!st.isFile()||st.size>16384)fail('INVALID_CONFIG','配置文件不合法');const parsed=projectConfigSchema.safeParse(JSON.parse(await fs.readFile(p,'utf8')));if(!parsed.success)fail('INVALID_CONFIG','配置字段不合法',parsed.error.issues);if(['dist','backend','src','node_modules','evidence'].includes(parsed.data.dataDirectory))fail('INVALID_CONFIG','数据目录不能覆盖程序目录');return parsed.data;}

export async function loadInitial(root:string,config:ProjectConfig){if(!config.initialState)return undefined;const p=join(root,config.initialState);const st=await fs.lstat(p);if(st.isSymbolicLink()||!st.isFile()||st.size>2_000_000)fail('INVALID_INPUT_FILE','初始状态须为2MB内普通文件');return JSON.parse(await fs.readFile(p,'utf8'));}

export async function initialForNewData(root:string,config:ProjectConfig){try{await fs.lstat(join(root,config.dataDirectory));return undefined;}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}return loadInitial(root,config);}
