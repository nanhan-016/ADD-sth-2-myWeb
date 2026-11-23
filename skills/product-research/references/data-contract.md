# 数据契约
JSON对象至少包含schema_version、记录ID、采集日期、输入URL、产品列表、系列、关系、证据、未知项及reviews。示例是测试数据，不是强制数据库Schema；自动Schema校验尚未实现。
每个声明使用value、status（OBSERVED/INFERRED/UNKNOWN）、evidence_ids；推断补充reason，UNKNOWN值用null。字段组共享证据时明确覆盖范围。产品ID按公司/型号稳定生成，未经查重不声称唯一。
公司/品牌/业务线/产品类型/系列不能合并。series.classification使用Official、Supported或Inferred，另记录依据；未知不强制归类。关系类型至少分belongs_to、compatible_with、parallel_variant、evolves_from，迭代必须另有证据。
来源记录ID、URL、标题/版本、访问日期、页码或段落、适用地区/型号、是否实际阅读或查看、抓取限制。不同资料冲突时保存各自版本与值，不静默覆盖。
参数记录单位、测试条件与范围；单模组、单簇及多簇系统不能混写。容量、电流脚注随字段保留。
图片记录原始URL、来源页、关联型号、关联方式、图像类型（不明则unknown）、查看状态和限制。场景图需验证实际型号；缺失不借用相似产品。
reviews.information与reviews.design各记录status、reviewer、reviewed_at、decision_text。整体approved不得因第一轮通过而置true。published独立记录。
正式知识库目录建议products/、series/、sources/、reviews/，待审目录staging/。此Skill不自动创建或填充正式库。



## v1.1 设计标签扩展

在每个产品记录中追加可选 design_tags 对象。旧记录缺少此字段时视为尚未打标。基础字段和参数维持既有结构。字典独立版本管理，每个定义含 tag_id、category_id、group、label、definition、aliases 和字典审核状态。标签 ID 全局稳定，一级分类固定。assignment.category_id 必须与标签定义一致。

```json
{
  "taxonomy_version": "1.1",
  "observations": [
    {"id":"obs-01","text":"侧板下缘有成排长条开孔","part":"侧板下缘","evidence_ids":["img-01"],"locator":"侧视图下缘"}
  ],
  "assignments": [
    {"tag_id":"detail.slot-opening","category_id":"details","part":"侧板下缘","status":"OBSERVED","review_status":"pending","observation_ids":["obs-01"],"evidence_ids":["img-01"]}
  ],
  "candidates": [],
  "unverified": []
}
```

以上数值为单个产品 design_tags 对象示例。推断项另填 reason。证据 ID 引用本产品的已登记来源。未识别特征放入 unverified（记录部位、原因与所缺证据），从正式筛选索引排除。补标建议使用独立的待审清单，至少记录 product_id、当前记录版本（或内容指纹）、变更类型、变更前后值、触发原因与证据。Markdown 列出每产品七类标签、待核验事项、字典变更和旧产品补标建议。
## 网页标签分组

每个产品在 `design_tags` 内新增 `display_groups`。固定七组，按造型、色彩、材料、表面处理与制造表达、细节、整体风格类型、视觉感知的顺序输出。空组输出 `tags: []`，可附 `empty_reason`。每组直接提供可渲染的短标签数组；二级分类出现在展开详情。每个标签根据字典中的唯一一级归属进入对应组，同组同一 tag_id 去重，保留其部位和证据引用。一个标签有多处证据时合并其 assignment_ids，混合证据状态时保留各条明细。

```json
{
  "category_id": "color",
  "label": "色彩",
  "tags": [
    {"tag_id":"color.white","label":"白色","assignment_ids":["assign-01"]}
  ]
}
```

给 assignments 补充唯一 `assignment_id`。展示分组从字典和 assignments 派生，每次修改打标同步重建。示例预览可展示待审标签，并注明待审。正式网页仅展示审核通过的标签。旧记录缺少 display_groups 时用 assignments 和字典生成同样的分组。输出前校验七组固定顺序、归属唯一、引用可解析及组内无重复。

页面每组一行，左边是一级分类，右边横向排列短词胶囊，空间不足时自动换行。默认显示全部标签，证据、来源、部位和推断理由通过点击标签查看。颜色和状态使用可读文字说明。待审核或资料不足时在对应行写简短说明，避免用占位词充当标签。

