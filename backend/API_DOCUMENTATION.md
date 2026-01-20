## 📡 完整 API 文档

### 基础信息

**基础 URL**: `http://localhost:5005`  
**内容类型**: `application/json`  

---

## 🔧 **必读：数据初始化流程**

### 应用启动时的自动加载
应用启动时会自动调用一次数据加载（force_refresh=false），将数据缓存到内存。
- 首次运行时会从 Google Sheet 拉取数据（较慢）
- 后续启动会从磁盘缓存快速恢复

---

## 0️⃣ 数据管理 API

### `POST /loadData`

加载/刷新数据缓存的统一入口。

**必须在调用任何 `/calculate/*` 端点前调用此接口（或在应用启动时自动调用）**

#### 请求
```json
{
  "force_refresh": false
}
```

**参数说明**：
- `force_refresh` (bool): 
  - `false` - 优先使用缓存，缓存不存在时从 Google Sheet 加载
  - `true` - 强制清空缓存，从 Google Sheet 重新加载（用户点击"刷新"按钮时调用）

#### 响应
```json
{
  "timestamp": "2025-12-09T10:30:45.123456+00:00",
  "timestamp_ms": 1733747445123,
  "cache_size_mb": 12.5
}
```

**字段说明**：
- `timestamp` (string): 最后更新时间（ISO 8601 格式）
- `timestamp_ms` (int): 最后更新时间（毫秒时间戳）
- `cache_size_mb` (float): 磁盘缓存大小（MB）

#### 状态码
- **200** - 成功加载/刷新数据
- **500** - 加载失败（Google Sheet 连接问题等）

#### 示例
```bash
# 首次初始化（或从缓存恢复）
curl -X POST http://localhost:8000/loadData \
  -H "Content-Type: application/json" \
  -d '{"force_refresh": false}'

# 用户手动刷新
curl -X POST http://localhost:8000/loadData \
  -H "Content-Type: application/json" \
  -d '{"force_refresh": true}'
```

---

### `POST /getAISummary`

生成 AI 数据分析总结。

#### 请求
```json
{
  "data_context": "{\n  \"metrics\": {\n    \"totalStakeCurrent\": 1000000,\n    \"netStakeCurrent\": 500000,\n    ...\n  },\n  \"dailyTrend\": [...],\n  \"topStakers\": [...]\n}",
  "system_instruction": "You are a Web3 data analyst. Analyze the provided staking data..."
}
```

**参数说明**：
- `data_context` (string): 
  - JSON 格式的数据上下文
  - 前端需要将数据对象转换为 JSON 字符串
  - 应包含 metrics、dailyTrend、topXxx 等关键数据
- `system_instruction` (string):
  - AI 系统提示词
  - 指导 AI 如何分析数据、应该关注哪些方面
  - 例如：中英混合提示、分析深度等

#### 响应
```json
{
  "summary": "### 📊 Executive Summary\n\n质押生态健康状况良好...\n\n### 🧐 Key Insights\n\n- **Net Flow Analysis**...\n\n### 🚀 Strategic Recommendations\n\n1. ..."
}
```

**字段说明**：
- `summary` (string): AI 分析结果（Markdown 格式）

#### 状态码
- **200** - 成功生成总结
- **400** - 缺少必要参数（data_context 或 system_instruction）
- **500** - AI 服务失败

#### 示例
```bash
curl -X POST http://localhost:8000/getAISummary \
  -H "Content-Type: application/json" \
  -d '{
    "data_context": "{\"metrics\": {\"totalStakeCurrent\": 1000000, \"netStakeCurrent\": 500000}, \"dailyTrend\": [], \"topStakers\": []}",
    "system_instruction": "You are a Web3 data analyst. Provide insights on staking ecosystem health."
  }'
```

---

## 1️⃣ Staking API

### `POST /calculate/staking`

计算质押相关指标。

#### 请求
```json
{
  "start_date": "2025-12-01",
  "end_date": "2025-12-08"
}
```

#### 响应
```json
{
  "metrics": {
    "totalStakeCurrent": 1000000,
    "totalUnstakeCurrent": 500000,
    "netStakeCurrent": 500000,
    "stakeCountCurrent": 100,
    "rewardCountCurrent": 50,
    "rewardAmountCurrent": 50000,
    "totalStakePrev": 900000,
    "totalUnstakePrev": 400000,
    "netStakePrev": 500000,
    "stakeCountPrev": 90,
    "rewardCountPrev": 45,
    "rewardAmountPrev": 45000,
    "totalStakeDelta": 11.11,
    "totalUnstakeDelta": 25.0,
    "netStakeDelta": 0.0,
    "stakeCountDelta": 11.11,
    "rewardCountDelta": 11.11,
    "rewardAmountDelta": 11.11
  },
  "dailyData": [
    {
      "date": "2025-12-01",
      "stake": 100000,
      "rewards": 5000
    }
  ],
  "topStakers": [
    {
      "address": "5Mu3...8x9K",
      "fullAddress": "5Mu3ZY7x8x9K...",
      "amount": 50000
    }
  ]
}
```

#### 指标说明
- **totalStake**: 质押总额
- **totalUnstake**: 取消质押总额  
- **netStake**: 净质押 = 质押 - 取消质押
- **stakeCount**: 质押交易笔数
- **rewardCount**: 奖励发放笔数
- **rewardAmount**: 奖励总额

#### 日期边界
UTC+0 00:00 (自然日)

---

## 2️⃣ TS API

### `POST /calculate/ts`

计算 TS 交易相关指标。

#### 请求
```json
{
  "start_date": "2025-12-01",
  "end_date": "2025-12-08"
}
```

#### 响应 (主要字段)
```json
{
  "metrics": {
    "totalTxCurrent": 500,
    "totalAmountCurrent": 100000,
    "uniqueAddressesCurrent": 150,
    "meanClaimsCurrent": 5.5,
    "medianClaimsCurrent": 3.0,
    "avgIntervalCurrent": 2.5,
    "wolfTxCurrent": 50,
    "oneRefTxCurrent": 30,
    "twoRefTxCurrent": 20,
    "luckyDrawsCurrent": 10,
    "luckyDrawAmountCurrent": 5000,
    "luckyDrawAddressesCurrent": 8,
    "revenueCurrent": 2500,
    "shitCostCurrent": 100000,
    "roiCurrent": 2.5,
    // ... Prev 和 Delta 字段
  },
  "dailyData": [
    {
      "date": "2025-12-01",
      "totalTx": 50,
      "totalAmount": 10000,
      "uniqueAddresses": 15,
      "wolfTx": 5,
      "oneRefTx": 3,
      "twoRefTx": 2,
      "luckyDraws": 1
    }
  ],
  "heatmapData": {
    "dates": ["2025-12-01", "2025-12-02"],
    "hours": [0, 1, 2, ..., 23],
    "data": [[10, 20, 30, ...], [15, 25, 35, ...]]
  },
  "topUsers": [
    {
      "address": "5Mu3...8x9K",
      "fullAddress": "5Mu3ZY7x8x9K...",
      "txCount": 100,
      "claimAmount": 20000
    }
  ],
  "repeatRanking": [
    {
      "address": "5Mu3...8x9K",
      "count": 10
    }
  ]
}
```

#### 关键指标
- **totalTx**: 总交易笔数
- **wolfTx**: 狼交易数（1Ref 交易）
- **luckyDraws**: 幸运抽奖数
- **roiWithoutReward**: 不含奖励的 ROI
- **roiWithReward**: 含奖励的 ROI
- **heatmapData**: 日×小时的交易热力图

#### 日期边界
8am UTC+8 (特殊 8 小时偏移)

---

## 3️⃣ POS API

### `POST /calculate/pos`

计算 POS 分发相关指标。

#### 请求
```json
{
  "start_date": "2025-12-01",
  "end_date": "2025-12-08"
}
```

#### 响应
```json
{
  "metrics": {
    "totalTxCurrent": 500,
    "totalAmountCurrent": 5000000,
    "maxAmountCurrent": 50000,
    "minAmountCurrent": 1000,
    "totalRevenueCurrent": 2500,
    "emissionEfficiencyCurrent": 2000,
    "avgRewardCurrent": 10000,
    // ... Prev 和 Delta 字段
  },
  "dailyData": [
    {
      "date": "2025-12-01",
      "shitSent": 500000,
      "solReceived": 250
    }
  ],
  "topUsers": [
    {
      "address": "5Mu3...8x9K",
      "fullAddress": "5Mu3ZY7x8x9K...",
      "shitSent": 100000,
      "txCount": 3
    }
  ],
  "duplicateAddresses": [
    {
      "address": "5Mu3ZY7x8x9K...",
      "date": "2025-12-01",
      "txCount": 3
    }
  ]
}
```

#### 指标说明
- **totalTx**: 分发交易笔数
- **totalAmount**: 分发 SHIT 总额
- **emissionEfficiency**: 发行效率 = 总发放 / 总收入
- **avgReward**: 人均奖励 = 总发放 / 交易笔数
- **duplicateAddresses**: 每日交易 > 1 的重复地址

#### 日期边界
12pm UTC+8 (中午换日)

---

## 4️⃣ ShitCode API

### `POST /calculate/shitcode`

计算 ShitCode 分发相关指标。

#### 请求
```json
{
  "start_date": "2025-12-01",
  "end_date": "2025-12-08"
}
```

#### 响应
```json
{
  "metrics": {
    "claimCountCurrent": 500,
    "claimAmountCurrent": 100000,
    "uniqueAddressesCurrent": 150,
    "avgClaimPerAddressCurrent": 666.67,
    // ... Prev 和 Delta 字段
  },
  "dailyData": [
    {
      "date": "2025-12-01",
      "claimCount": 50,
      "claimAmount": 10000,
      "solReceived": 100.5
    }
  ],
  "topUsers": [
    {
      "address": "5Mu3...8x9K",
      "fullAddress": "5Mu3ZY7x8x9K...",
      "claimCount": 10,
      "claimAmount": 2000
    }
  ]
}
```

#### 指标说明
- **claimCount**: 领取笔数
- **claimAmount**: 发放 SHIT 总额
- **uniqueAddresses**: 唯一领取地址数
- **avgClaimPerAddress**: 人均领取 = 总额 / 唯一地址数

#### 日期边界
UTC+0 00:00 (自然日)

---

## 5️⃣ Revenue API

### `POST /calculate/revenue`

计算各模块 SOL 收入汇总。

#### 请求
```json
{
  "start_date": "2025-12-01",
  "end_date": "2025-12-08"
}
```

#### 响应
```json
{
  "metrics": {
    "tsRevenueCurrent": 2500,
    "posRevenueCurrent": 1000,
    "stakingRevenueCurrent": 500,
    "shitCodeRevenueCurrent": 200,
    "totalRevenueCurrent": 4200,
    // ... Prev 和 Delta 字段
  },
  "dailyData": [
    {
      "date": "2025-12-01",
      "tsRevenue": 250,
      "posRevenue": 100,
      "stakingRevenue": 50,
      "shitCodeRevenue": 20,
      "totalRevenue": 420
    }
  ],
  "composition": [
    {
      "source": "TS",
      "amount": 2500
    },
    {
      "source": "POS",
      "amount": 1000
    },
    {
      "source": "Staking",
      "amount": 500
    },
    {
      "source": "ShitCode",
      "amount": 200
    }
  ]
}
```

#### 指标说明
- **tsRevenue**: TS 模块 SOL 收入
- **posRevenue**: POS 模块 SOL 收入
- **stakingRevenue**: Staking 模块 SOL 收入
- **shitCodeRevenue**: ShitCode 模块 SOL 收入
- **totalRevenue**: 总 SOL 收入

#### 日期边界
混合（跟随各模块）

---

## 6️⃣ DeFi API

### `POST /calculate/defi`

计算 DEX 流动性相关指标。

#### 请求
```json
{
  "start_date": "2025-12-01",
  "end_date": "2025-12-08"
}
```

#### 响应
```json
{
  "metrics": {
    "buyShitAmountCurrent": 50000,
    "buyCountCurrent": 100,
    "buyUsdtAmountCurrent": 2500,
    "sellShitAmountCurrent": 30000,
    "sellCountCurrent": 60,
    "sellUsdtAmountCurrent": 1500,
    "tsSellShitAmountCurrent": 10000,
    "tsSellUsdtAmountCurrent": 500,
    "liqAddUsdtCurrent": 1000,
    "liqAddCountCurrent": 10,
    "liqRemoveUsdtCurrent": 500,
    "liqRemoveCountCurrent": 5,
    // ... Prev 和 Delta 字段
  },
  "dailyData": [
    {
      "date": "2025-12-01",
      "buyUsdt": 250,
      "sellUsdt": 150,
      "netFlow": 100,
      "liqAddUsdt": 100,
      "liqRemoveUsdt": 50,
      "tsSellUsdt": 50
    }
  ]
}
```

#### 指标说明
- **buyShitAmount**: 购买 SHIT 总量
- **sellShitAmount**: 销售 SHIT 总量
- **tsSellShitAmount**: TS 大户销售（13k-20k）
- **netFlow**: 净流入 = buyUsdt - sellUsdt
- **liqAddUsdt**: 添加流动性 USDT
- **liqRemoveUsdt**: 移除流动性 USDT

#### 活动类型
- **BUY**: 购买 SHIT
- **SELL**: 销售 SHIT
- **TS Sell**: SHIT Change 在 13k-20k 范围的销售
- **LIQ_ADD**: 添加流动性
- **LIQ_REMOVE**: 移除流动性

#### 日期边界
UTC+0 00:00 (自然日)

---

## � **完整 API 端点清单**

### 数据管理
| 端点 | 方法 | 说明 |
|------|------|------|
| `/loadData` | POST | 初始化/刷新数据缓存（**必须先调用**） |
| `/getAISummary` | POST | 生成 AI 分析总结 |

### 计算端点
| 端点 | 方法 | 说明 | 所需参数 |
|------|------|------|---------|
| `/calculate/staking` | POST | 质押指标 | start_date, end_date |
| `/calculate/ts` | POST | TS 交易指标 | start_date, end_date |
| `/calculate/pos` | POST | POS 分发指标 | start_date, end_date |
| `/calculate/shitcode` | POST | ShitCode 领取指标 | start_date, end_date |
| `/calculate/revenue` | POST | 多模块收入汇总 | start_date, end_date |
| `/calculate/defi` | POST | DEX 流动性指标 | start_date, end_date |

---

## 🌐 **前端集成流程**

### 1. App 初始化
```javascript
// App.tsx 启动时调用
await loadData(false)  // 预加载数据到缓存
```

### 2. 进入 Section
```javascript
// 用户导航到 /statistics/staking 时
const data = await fetchStakingData(startDate, endDate)
// 显示 MetricsGrid, Charts, DataTable
```

### 3. 用户改日期
```javascript
// 日期选择器改变时
const data = await fetchStakingData(newStartDate, newEndDate)
// 更新界面
```

### 4. 用户点击 Refresh
```javascript
// Refresh 按钮点击时
await loadData(true)  // 强制刷新缓存
const data = await fetchStakingData(startDate, endDate)  // 重新获取数据
```

### 5. 用户点击 AI Summary
```javascript
// AI Summary 按钮点击时
const summary = await generateAISummary(dataContext, systemPrompt)
// 在侧边栏显示结果
```

---

## ⏱️ 性能指标

| 端点 | 数据量 | 响应时间 | 备注 |
|-----|--------|---------|------|
| `/loadData` (首次) | - | 30-60s | 从 Google Sheet 拉取 |
| `/loadData` (缓存) | - | 100-500ms | 从磁盘/内存恢复 |
| `/calculate/staking` | 小 | < 100ms | 缓存命中 |
| `/calculate/ts` | 中 | < 500ms | 缓存命中 |
| `/calculate/pos` | 小 | < 100ms | 缓存命中 |
| `/calculate/shitcode` | 小 | < 100ms | 缓存命中 |
| `/calculate/revenue` | 中 | < 300ms | 缓存命中 |
| `/calculate/defi` | 中 | < 300ms | 缓存命中 |
| `/getAISummary` | - | 3-10s | 依赖 AI 服务 |

---

## � **常见错误处理**

### 412 Precondition Failed
```json
{
  "detail": "数据未缓存，请先调用 /loadData"
}
```
**原因**: 数据缓存不存在  
**解决**: 
1. 先调用 `POST /loadData`
2. 等待完成后再调用计算端点

### 400 Bad Request
```json
{
  "detail": "data_context is required"
}
```
**原因**: `/getAISummary` 缺少必要参数  
**解决**: 确保请求包含 `data_context` 和 `system_instruction`

### 500 Internal Server Error
```json
{
  "detail": "Error message..."
}
```
**原因**: 服务器错误（Google Sheet 连接失败、AI 服务异常等）  
**解决**: 
1. 查看服务器日志获取详细错误
2. 确保网络连接正常
3. 检查 Google Sheet 权限和凭证

---

## ✅ 前端集成检查清单

集成时确认以下项目：

- [ ] App 启动时调用 `/loadData`
- [ ] 各 Section 能正确调用对应的 `/calculate/*` 端点
- [ ] 错误处理正确（412、500 等）
- [ ] Delta 为 null 时显示为 "NA"
- [ ] 日期格式为 "YYYY-MM-DD"
- [ ] Refresh 按钮先调用 `/loadData?force_refresh=true`
- [ ] AI Summary 的 dataContext 格式正确
- [ ] 性能满足要求（缓存命中时 < 500ms）
- [ ] 浏览器开发者工具验证 API 调用和响应
- [ ] 所有 6 个计算端点都能正确返回数据

---

**✅ API 文档完整！**

建议打印此文档或保存为书签，前端集成时频繁参考。

