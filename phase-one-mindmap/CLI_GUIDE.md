# Codex日常CLI流程

本轮命令、报告、诊断、备份恢复由Codex执行，用户只负责最终验收。默认真实配置project.config.json；演示必须显式--config demo.config.json，不能混用。所有命令由同目录Node24执行。

1. node backend/cli.ts read读取最新基线、意见、revision和recoveryEpoch；doctor核对显式身份与容量。
2. 把有限action写入JSON，再用make-request --action action.json --out request.json生成绑定当前状态及schemaVersion的请求；submit --request request.json通过普通CLI提交。
3. run-start选择本轮节点和意见，acknowledge记录本轮读取。实施后report提交实际结果、候选版本、证据、remaining及偏差；每个节点提交结束报告后自动闭合完整轮次。
4. respond说明每条意见的处理；implemented=true必须关联该意见节点当前候选和通过证据。不等于用户已验收。
5. 用户通过页面核对候选/成果版本后决定。CLI不能提交accept/accept-batch/return/priority/approve-proposal/opinion等用户权限动作，也不能自填actor或决定来源提权。

典型报告action：type=report，nodeId为已有节点，status=待验收，reason说明实际变更，result为实际成果，remaining明确等待最终验收；candidate包含唯一id/version/result。evidence包含唯一id、candidateId、该节点acceptanceIds、相同version、check、result、reference、真实记录时间及provenance（command/scenario/artifactVersion/record）。本轮可重复范例见scripts/record-self-project.ts，真实调用的原始回执保留于evidence/v04-real-run-start.json、v04-real-delivery-report.json和v04-real-correction-report*.json（按成果版本留存；首轮修复为无后缀文件）。

所有request共同绑定projectId、expectedRevision、baselineVersion、recoveryEpoch；真实请求schemaVersion=2。验收还绑定候选及成果版本。冲突必须先重读再核对，禁止自动把旧动作换新代次重放。未确认提交可用receipt --operation id核对，同operationId只在同代次同内容重试。恢复后旧receipt也无效。

v0.5验收包由服务按权威状态生成，整体或选定部分验收绑定包及每项候选、证据版本；最多100项，预检后一次提交。回执区分本次通过、此前通过及未决定项，未选项不变。提交回应丢失时只重试原请求，冲突后重新查看验收包，不能自动把原用户决定换成新版本。页面决定与聊天中明确决定的Codex代录分别保存依据；本轮技术检查仍不能自行验收。

轮次启用使用既有propose与受控用户approve-proposal入口，iteration可携带有限的id/title；同一次原子状态提交固定原轮次结项、基线历史、新基线与当前轮次。CLI只提出提案，不取得批准权限。v0.5六项计划已由本聊天明确授权，scripts/v05-activate.ts只批准该次范围，保留原16项决定并创建六项未验收工作；脚本默认只读预览，实际--apply仅由Codex在阶段二独立审核后执行。中断与版本冲突不自动套用旧决定或覆盖期间新记录。

backups/backup用于快照；recovery-preview --backup-id id只读展示恢复依据。专用recover --request restore.json --confirm-loss要求新鲜代次、revision和已核对摘要。详细流程见MAINTENANCE.md。恢复不会被普通submit授权。

CLI输入只接受128KB内普通文件，动作严格有限，不支持任意JSON patch或路径型业务动作。命令失败关闭，不初始化缺失状态来掩盖损坏。受控初始化真实初始JSON须schema2且严格校验，不能将模拟决定导入主项目。

## v0.7 地图核对与原范围决定（内部操作）

`node backend/cli.ts map --root <本项目根目录>` 只读输出用户地图投影及 `comparison`，不改变比较点。日常更新仍使用既有 report/run-start/run-interrupt，节点按当前执行范围记录，过去范围不覆盖。

普通 CLI 新增 `map-checkpoint` 核对动作：先明确核对范围和来源，再用既有 make-request/submit 提交 `{ "type": "map-checkpoint", "reason": "实际核对依据" }`。服务端在锁内从权威记录派生比较事实，调用者不能传入替代快照。所有旧点及其项目、范围、版本、原恢复代次保留；最新点固定，不因打开、刷新、改文案或 report 自动移到当前。最多100个点，文件仍受原2MB限制；容量可用 doctor 查看，达到限制先明确归档，不静默丢记录。

恢复或克隆使恢复代次变化后，CLI map 返回 `comparison.status=needs-verification`，中心卡片说明变化需要重新核对，原点保存但不冒充恢复后的变化。核对现状态后明确提交新 checkpoint，保留旧范围和依据。不同范围不互相比较，缺少覆盖的事项只展示当前事实。

原 v0.5 六项在新范围启用后仍可合法决定：受控同源 GET `/api/acceptance-pack?baselineVersion=2` 返回原范围 pack，其哈希同时绑定**当前**项目修订、恢复代次和B2固定原候选/证据链。随后受控 `/api/action` 提交 `historical-accept-batch`（targetBaselineVersion、packId、选中原binding、reason、decisionBasis）或 `historical-return`（同目标范围/packId及原acceptanceId/candidateId/version、reason、decisionBasis）。外层 envelope 使用当前执行基线/修订/代次；不能拿旧 envelope 写入。只对已展示且用户在聊天明确决定的范围登记原话和版本。

这些动作不授予普通 CLI 用户验收权限，也不会把旧候选复制成新验收、改写当时历史结项或补造用户决定；新决定独立追加到原B2范围。部分通过只改变选中项目，退回保留理由，完整同ID重试有固定回执，恢复后先拒绝旧代次才查重试回执。当前范围仍沿用既有 accept-batch/return。

默认首页无操作入口；`/internal` 仅为明确打开的内部旧工作流，使用相同会话、同源、来源和权限限制，不是匿名接口。用户只负责最后验收，无需开此入口、跑CLI或手工备份。
