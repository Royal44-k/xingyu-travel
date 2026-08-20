# 行屿目的地图片资产来源与检查记录

Task 6 的 32 张目的地图片均由 Codex 内置 ImageGen 逐张独立生成，没有使用 CLI、外部图片 API、拼图或批量替代。最终调用的逐字提示词记录在 [destination-asset-prompts.md](./destination-asset-prompts.md)，下表的“提示词”列与该文件中的同名条目一一对应。实际输出均为 PNG、1536×1024、3:2 横图。

检查口径：在接受每个生成结果前用 `view_image` 目视检查地点特征、构图差异、自然写实质感，并排除可辨识人脸、可读文字、徽标、水印、过度 HDR 与灾难/事故画面；复制到注册路径后再次逐张检查。文件大小不是视觉检查的替代。

| 提示词 | 注册文件 | 内置 ImageGen 原始输出 | 实际尺寸 | 最终检查 |
| --- | --- | --- | --- | --- |
| dali/01 | `public/assets/destinations/dali/01.png` | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-10a17045-8982-4c3c-92c3-46076560b775.png` | 1536×1024 | 接受：白族院落可信；无人脸、文字、徽标或水印。 |
| dali/02 | `public/assets/destinations/dali/02.png` | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-cdef4333-ad0d-469b-ab29-308722ad5165.png` | 1536×1024 | 接受：洱海骑行路径、湖与苍山层次可信；无禁用元素。 |
| dali/03 | `public/assets/destinations/dali/03.png` | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-4077396d-c263-4157-a695-80cc200dd650.png` | 1536×1024 | 接受：修正后为低矮白族农宅与喜洲稻田；墙面空白，无伪文字。 |
| dali/04 | `public/assets/destinations/dali/04.png` | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-815c8c1f-28ee-4be8-b885-25ffd262c8a4.png` | 1536×1024 | 接受：双廊湖岸、洱海与苍山关系可信；无禁用元素。 |
| guilin/01 | `public/assets/destinations/guilin/01.png` | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-e37fb085-f51b-4083-9a72-f8657c5f93ba.png` | 1536×1024 | 接受：漓江晨雾及喀斯特层次可信；远舟无可辨识人物。 |
| guilin/02 | `public/assets/destinations/guilin/02.png` | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-e7f150e6-5513-4e40-8bf9-4aa599649b39.png` | 1536×1024 | 接受：遇龙河竹筏与浅水可信；无人脸、文字或品牌。 |
| guilin/03 | `public/assets/destinations/guilin/03.png` | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-cd8a88b9-64aa-4e90-a49f-92d8d4be3cee.png` | 1536×1024 | 接受：阳朔乡间骑行路与峰林可信；构图不重复。 |
| guilin/04 | `public/assets/destinations/guilin/04.png` | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-ef4e346a-a4ad-4fae-b65d-e229d9c341db.png` | 1536×1024 | 接受：桂林城市水岸与近城喀斯特可信；灯光克制。 |
| sichuan/01 | `public/assets/destinations/sichuan/01.png` | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-eab038e2-62d5-45d5-ba11-51c07f5325a7.png` | 1536×1024 | 接受：新都桥秋林公路安全、地貌可信；无车辆事故。 |
| sichuan/02 | `public/assets/destinations/sichuan/02.png` | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-7f45a864-6da5-496d-90ac-2c11c9375694.png` | 1536×1024 | 接受：塔公草原与雅拉雪峰尺度可信；无可辨识人物。 |
| sichuan/03 | `public/assets/destinations/sichuan/03.png` | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-ff619ebe-4f22-46b8-90c3-140c79d9b698.png` | 1536×1024 | 接受：墨石地貌与完整栈道可信；无危险情节。 |
| sichuan/04 | `public/assets/destinations/sichuan/04.png` | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-9e6b8589-6dbf-4768-b391-7aae7f464f22.png` | 1536×1024 | 接受：康定山路完整、安全、天气稳定；无禁用元素。 |
| sanya/01 | `public/assets/destinations/sanya/01.png` | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-341aa225-ac49-47c3-b2f4-0a03aa8e4792.png` | 1536×1024 | 接受：亚龙湾黎明海岸可信；无人群、品牌或过饱和海水。 |
| sanya/02 | `public/assets/destinations/sanya/02.png` | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-ead3ee0d-b24e-4754-aea9-7acf83af4f5e.png` | 1536×1024 | 接受：蜈支洲岛浅水与礁岸可信；无禁用元素。 |
| sanya/03 | `public/assets/destinations/sanya/03.png` | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-756c7c01-cac2-44f0-ade3-3e8ea5cc7122.png` | 1536×1024 | 接受：后海村巷和无品牌冲浪板可信；门面无文字。 |
| sanya/04 | `public/assets/destinations/sanya/04.png` | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-cd6e12ab-2075-441e-bb78-ea4edc7a5feb.png` | 1536×1024 | 接受：呀诺达雨林与维护步道可信；无危险或灾害画面。 |
| hangzhou/01 | `public/assets/destinations/hangzhou/01.png` | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-79cc58ad-ff11-4f0d-a592-3966fadb6360.png` | 1536×1024 | 接受：西湖晨雾和湖岸尺度可信；无禁用元素。 |
| hangzhou/02 | `public/assets/destinations/hangzhou/02.png` | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-f7b6aa34-131c-400f-a14d-4c0e27874bfd.png` | 1536×1024 | 接受：龙井茶坡和村落层次可信；无人脸、文字或品牌。 |
| hangzhou/03 | `public/assets/destinations/hangzhou/03.png` | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-acef7fb0-54b6-42af-ab1c-6034a8a3a8fb.png` | 1536×1024 | 接受：灵隐竹石小径可信；无危险或宗教伪文字。 |
| hangzhou/04 | `public/assets/destinations/hangzhou/04.png` | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-db478708-8c1e-4de9-9804-faf339015639.png` | 1536×1024 | 接受：修正为宽阔杭州运河与大型三孔桥；无可读文字。 |
| nanjing/01 | `public/assets/destinations/nanjing/01.png` | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-d99057cb-db80-45fe-ac46-e4f994d22c22.png` | 1536×1024 | 接受：明城墙与城市晨景可信；无禁用元素。 |
| nanjing/02 | `public/assets/destinations/nanjing/02.png` | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-d2dd5d53-1ca3-4141-92fa-f7e68897e05b.png` | 1536×1024 | 接受：梧桐大道秋色可信；无人脸、车辆或品牌。 |
| nanjing/03 | `public/assets/destinations/nanjing/03.png` | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-465c68da-432a-41f9-9876-7d6d78720f42.png` | 1536×1024 | 接受：修正为宽阔城市秦淮河与多孔桥；灯笼、门面无文字。 |
| nanjing/04 | `public/assets/destinations/nanjing/04.png` | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-57e955a9-ecdf-4cc0-bfa8-cc232d75fb5a.png` | 1536×1024 | 接受：中山陵林荫中轴与台阶可信；无人脸和文字。 |
| shanghai/01 | `public/assets/destinations/shanghai/01.png` | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-1eecba26-5202-4f3c-b570-73bfe600b1f1.png` | 1536×1024 | 接受：二次检查后重生；外滩蓝调城市尺度可信，立面仅普通窗光，无可读文字、徽标或水印。 |
| shanghai/02 | `public/assets/destinations/shanghai/02.png` | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-7e4c4ff3-a7b0-4aa9-9e64-76180c8b1b59.png` | 1536×1024 | 接受：武康路树影与街廓可信；无人脸、车牌或招牌。 |
| shanghai/03 | `public/assets/destinations/shanghai/03.png` | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-155727eb-8c08-4685-90a1-71abe62ba94b.png` | 1536×1024 | 接受：苏州河桥与仓库层次可信；无文字或品牌。 |
| shanghai/04 | `public/assets/destinations/shanghai/04.png` | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-1d4c65c7-dd33-43b1-9fdf-931b58dd47bc.png` | 1536×1024 | 接受：修正为纯窗光的陆家嘴长焦夜景；无屏幕、伪文字或徽标。 |
| guizhou/01 | `public/assets/destinations/guizhou/01.png` | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-edc973f3-e630-4f17-90cc-4fae2801cc4d.png` | 1536×1024 | 接受：小七孔石桥与水色可信；无人脸、文字或灾害画面。 |
| guizhou/02 | `public/assets/destinations/guizhou/02.png` | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-1cf5a87c-b58c-4cd7-995d-442a21d5d3bd.png` | 1536×1024 | 接受：西江苗寨晨雾与木楼层次可信；无伪文字。 |
| guizhou/03 | `public/assets/destinations/guizhou/03.png` | `C:\Users\lenovo\.codex\generated_images\01a01cc1-88f7-7ce1-924f-56f4376614d5\exec-8253820a-491e-4bc5-a419-33ec4f2759f2.png` | 1536×1024 | 接受：加榜梯田由成熟绿金稻穗主导，仅有极少灌溉水光；木楼、山雾与地形可信，无文字、徽标、水印或可辨识人物。 |
| guizhou/04 | `public/assets/destinations/guizhou/04.png` | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-9e7ed1ac-f60c-4db1-bec0-a1820edc08eb.png` | 1536×1024 | 接受：贵阳山城密度和山谷层次可信；无可读楼名或徽标。 |

## 被拒绝的生成结果与修正

总计 39 次独立 ImageGen 调用，32 张接受、7 张拒绝。拒绝结果未保留在最终产品注册路径。

| 目标 | 被拒绝的原始输出 | 原因 | 修正结果 |
| --- | --- | --- | --- |
| dali/03（第一次） | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-896dc30f-50b0-4d57-b343-a5d14cf74b4d.png` | 农宅呈徽派马头墙气质，地点错误。 | 加强大理喜洲、低矮白族农宅与禁徽派约束后重生。 |
| dali/03（第二次） | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-f6ebaa12-4fb7-4c80-95d3-749bdc8cadce.png` | 建筑更接近白族，但墙面出现伪书写/装饰带。 | 要求所有墙面完全素白、无符号装饰后再次重生并接受。 |
| hangzhou/04 | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-373ddd1f-22f2-470e-b5c6-70ba1c85457d.png` | 画面像乌镇窄水巷，不符合杭州大运河宽阔城市尺度。 | 指定拱宸桥历史区、宽阔可通航水面和大型三孔桥后重生并接受。 |
| nanjing/03 | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-e193136c-1028-4215-b27c-3465d79d7f91.png` | 像通用江南窄河巷，且局部疑似伪文字，秦淮城市尺度不足。 | 指定宽阔中心秦淮河、城市石岸和多孔桥后重生并接受。 |
| shanghai/01 | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-e626f601-3669-4e4d-a872-9a0092fdb345.png` | 复制后的二次视觉检查发现一处小型徽标/字母状立面标记。 | 强化所有立面只能有普通窗光、不得形成字符或品牌图案后重生并接受。 |
| shanghai/04 | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-3e2dc898-541d-4489-9552-dec9b6113731.png` | 楼体屏幕出现伪字符和徽标状色块。 | 改为纯办公室窗光、无屏幕/冠灯/立面照明的长焦夜景后重生并接受。 |
| guizhou/03 | `C:\Users\lenovo\.codex\generated_images\01a019db-3763-70f0-a11c-92c3726472d8\exec-67c8fa32-b99a-4299-b986-28f86753a7f4.png` | 复审确认画面以大面积蓄水和稀疏幼苗为主，更像春季插秧期，不符合早秋成熟绿金稻田。 | 明确成熟稻穗主导、几乎无可见积水后重生并接受。 |
