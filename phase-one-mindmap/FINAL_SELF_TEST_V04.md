# v0.4最终技术检查与交付

2026-10-11，按本次用户连续执行授权，本工具自身真实使用的四阶段技术工作完成。用户只负责最终验收；Codex负责启动、实施、CLI报告、自测、独立审核、备份恢复与全部交付准备。技术完成不代表真人验收通过。

服务实际运行http://127.0.0.1:4173，默认projectId=progress-mindmap-self。Start.command返回后独立服务仍就绪，macOS打开浏览器成功，页面HTTP200，无pageerror。已检查1440×1000和390×844的实际默认项目页面、当前候选与证据；窄屏根节点屏内可点击并打开详情。

基线B1为21节点、16等权叶子，没有自动验收规则。工作显示已完成，验收单独显示待用户决定，有效验收0/16。16个当前候选及其证据绑定最终成果版本；历史两版候选、证据和回应完整保留，共48候选/48证据/9回应。3条原文意见均有当前成果关联落实回应，3个真实CLI技术轮次结束，revision76。没有导入模拟验收、伪造旧页面确认或代填真人决定。

## 实际检查

- 构建及类型检查通过：evidence/v04-camera-final-build.txt。
- 模型6/6：evidence/v04-camera-final-model.txt。
- 后端46/46：evidence/v04-backend-final.txt。后端自此冻结，新UI修复不改后端；涵盖配置/schema来源/权限、原子与并发、导出/复制、真实恢复和独立启动。
- 浏览器24/24：evidence/v04-camera-final-browser.txt。包含演示8、真实隔离9、既有反馈7，真实CLI→网页轮询、关页重开及三个跨屏/跨窗口相机路径均实测。
- 合计76项唯一检查。恢复3项、启动1项和其他定向结果是这些检查的子集，不重复计数。
- 最终产物index-C8hx-wgR.js/index-Csa-obWy.css。最终版重新测200节点/585验收项/1900历史及回执、100搜索/100折叠/10刷新；evidence/v04-camera-final-performance.json和PERFORMANCE.md。首次可见279.2ms、重复314.6ms、搜索p95=23.8ms、折叠p95=13.4ms、空闲NodeRSS133.7MiB，只代表本机合成样本。

## 成果与运行记录

最终版本sha256-11d2f6d0a065efd8cd09ca947a617294f05e48003718171f16fd99ef7d3b4752。46份代码/产物/初始基线/固定说明、10份实际检查日志逐项SHA/bytes保留于evidence/v04-artifact-manifest.json及evidence/artifact-manifests同版本独立清单，不含运行状态、会话凭据或其他项目。前两版代码/产物和检查记录分别归档于archives/artifact-499369...与artifact-92c137...，未冒充最终版本验证。

真实Node CLI子进程记录：v04-real-run-start.json、v04-real-delivery-report.json、v04-real-correction-report.json、v04-real-correction-report-ef7d3b4752.json。当前成果、意见回应和所有提交收据可核对，不自动验收。

实际最终启动/诊断/备份/完整可验证导出：v04-live-final-launch.json、v04-doctor-delivery.json、v04-backup-delivery.json、v04-export-delivery.json、v04-export-delivery-verify.json。主项目只做备份与导出，未破坏性恢复。恢复、离线恢复/重启和旧请求拒绝均在受控真实副本验证，意见及明确标注的模拟本地来源验收/撤回保全，原主状态字节不变。

实际页面检查与截图：v04-live-final-check.json、v04-live-final-default.png、v04-live-final-detail.png、v04-live-final-narrow.png。查看中只操作表现层，不提交用户业务决定。

## 独立复核与修复

阶段一：演示65文件完整包逐SHA独立核对，原源重建产物一致；真实目标范围、等权基线、原文出处、只读预览与入口切换旧请求拒绝实核通过。

阶段二：真实配置隔离CLI意见闭环通过，关闭导出包必需文件/身份校验、真实schema2旧客户端拒绝、服务器视图恢复代次过滤三个审核发现。

阶段三：逐文件核对成果版本清单、候选/证据/provenance、真实CLI回执及三条实际回应，技术完成和用户验收分开，无真实决定。

阶段四：离线恢复原测试先为服务在线独立CLI操作，经审核发现后新增服务确实关闭期间恢复→重启旧会话/请求/回执拒绝的实际验证。最终截图发现窄屏空白和反向跨窗口camera信任问题，修复只适配相机、不改人工位置与折叠，三条路径全部浏览器回归及真实主页面核对通过。独立审核结论记录于IMPLEMENTATION_V04.md。

## 边界与最终验收

只管理本工具自身，未接Atlas/PDF/其他项目，未改全局设置或安装登录启动项。机器重启后需按需启动，不承诺开机常驻。会话两小时有效；草稿仅当页保留、可复制且不自动重放。未结束轮次不是实时进程监控。导出不释放容量、不删仍被引用事实；安全业务压缩未实现。生产包约596KB的Vite体积提示不是构建失败。

用户最终一次核对初始基线、实际成果与使用体验，可通过或退回。最终决定尚未发生；Codex不会把实现、自测或独立审核代填为用户认可。

## 后续用户最终验收结论

以上“待最终验收”和0/16描述为本轮技术交付时状态。2026-10-11用户随后在本聊天明确回复“通过”，真实最终验收已录入：16/16，100%。已绑定原B1及已交付候选/证据版本，没有修改原批准程序。详见USER_FINAL_ACCEPTANCE_V04.md及evidence/v04-user-final-acceptance.json；验收后状态已备份并完整导出核对。
