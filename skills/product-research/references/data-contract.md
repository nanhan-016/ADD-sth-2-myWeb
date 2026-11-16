# 数据契约
JSON对象至少包含schema_version、记录ID、采集日期、输入URL、产品列表、系列、关系、证据、未知项及reviews。示例是测试数据，不是强制数据库Schema；自动Schema校验尚未实现。
每个声明使用value、status（OBSERVED/INFERRED/UNKNOWN）、evidence_ids；推断补充reason，UNKNOWN值用null。字段组共享证据时明确覆盖范围。产品ID按公司/型号稳定生成，未经查重不声称唯一。
公司/品牌/业务线/产品类型/系列不能合并。series.classification使用Official、Supported或Inferred，另记录依据；未知不强制归类。关系类型至少分belongs_to、compatible_with、parallel_variant、evolves_from，迭代必须另有证据。
来源记录ID、URL、标题/版本、访问日期、页码或段落、适用地区/型号、是否实际阅读或查看、抓取限制。不同资料冲突时保存各自版本与值，不静默覆盖。
参数记录单位、测试条件与范围；单模组、单簇及多簇系统不能混写。容量、电流脚注随字段保留。
图片记录原始URL、来源页、关联型号、关联方式、图像类型（不明则unknown）、查看状态和限制。场景图需验证实际型号；缺失不借用相似产品。
reviews.information与reviews.design各记录status、reviewer、reviewed_at、decision_text。整体approved不得因第一轮通过而置true。published独立记录。
正式知识库目录建议products/、series/、sources/、reviews/，待审目录staging/。此Skill不自动创建或填充正式库。


