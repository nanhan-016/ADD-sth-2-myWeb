# 工作流与审核状态
1. 产品识别：公司展示名/法定主体、品牌、型号、类型、区域、参数、图片、手册；未知填null。
2. 产品体系：业务线、官网分类、系列成员、配套关系、迭代关系。官方来源发现同系列产品；同系列不自动意味着前后代。已有库可用时查重，无法访问时记录未完成。
3. 人工审核①：身份、类型、业务线、系列、关系、图片匹配。记录用户原话、时间和审核范围；通过不消除已披露未知。
4. 单品设计：造型、CMF、可见部件、结构、交互、场景、用户、概念。逐项注明文字事实、图片观察或推断。
4a. 设计打标：按 [设计打标与补标规则](design-tags.md) 先联网检索并核验可靠的图文来源，再为每个型号开放观察、归类与匹配。发现可复用新标签时定向召回旧产品并逐款核对证据，将补标建议与本次标签一起提交审核②。
5. 系列PIS：比较多个系列成员，记录实际覆盖型号与独立图像配置数；归纳共性、差异、标签，不将单图特征外推全系列。
6. 人工审核②：审核设计、PIS、标签与证据边界。未通过时保持pending_design_review。
7. 知识整理与入库：两轮审核通过后整理关系和知识；仅在明确获准时写正式库。发布另按用户授权。
状态建议：draft → pending_information_review → information_approved → pending_design_review → design_approved → ready_for_integration。approved与published分开；缺审核人或审核决定不自动通过。
输出JSON为数据载体，Markdown供审核。版本修订保留审核历史；重大事实或设计修改应使对应审核失效并重审。
## 产品图采集与网页交付

1. 在官网查找对应型号和变体的产品图，优先原图。记录来源页、原图 URL 和型号关联证据。
2. 下载实际图像文件到交付目录的 `assets/`，解码检查文件、尺寸和内容，打开核对型号及展示部位。原图无法下载时，直接调用可用的截图工具，打开原始图片或来源页，截取清晰的产品图区域并保存到 `assets/`。保留产品全貌和比例，避免混入其他型号、页面界面或个人信息，保留原有署名。核对截图可打开、型号与部位正确后，网页直接使用截图文件，单文件 HTML 将截图嵌入。JSON 记 `storage_status: screenshot`、`local_path`、`capture_url`、`captured_at`、`capture_scope` 和 `download_failure_reason`，并保留原图 URL 与来源页。网页图注明示「来源页截图」。若工具不可用、网页无法显示或截图不清晰，记录原因并标 `link_only`，`local_path` 置空。
3. 在 JSON 的 image_assets 记录 `source_url`、`source_page`、`local_path`（相对于交付根目录）、`storage_status`（`saved`、`screenshot` 或 `link_only`）、`view_status`、`mime_type`、`model_association` 和 `alt`。原图及截图均未保存时 local_path 为 null，记录原因；遇到防盗链或访问失败时优先查看同型号官方替代图。
4. 网页以 `local_path` 显示随包图片。单文件 HTML 交付时，将已验证图片以 data URL 嵌入 HTML。链接可保留为「查看原图」。验证网页主图离线可显示；仅取得链接时明确告知其在线依赖。


