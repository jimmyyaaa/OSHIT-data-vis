# OSHIT Data Backend API

OSHIT 数据可视化后端服务 | Backend API for OSHIT Data Visualization

## 🚀 快速开始 (Quick Start)

### 1. 依赖安装

```bash
pip install -r requirements.txt
```

### 2. 环境配置

创建 `.env` 文件，配置以下环境变量：

```bash
# Google Sheet 访问权限
GOOGLE_SERVICE_ACCOUNT_JSON=<your_service_account_json_as_string>
OPERATIONAL_SHEET_ID=<your_operational_sheet_id>
DEFI_SHEET_ID=<your_defi_sheet_id>

# Google AI API (用于 AI 总结功能)
GOOGLE_GENAI_API_KEY=<your_google_genai_api_key>
```

> **说明**：`GOOGLE_SERVICE_ACCOUNT_JSON` 应为 Google 服务账户 JSON 密钥文件的内容，以单行字符串格式存储

### 3. 启动服务

```bash
# 开发模式（自动重载）
./start_local.sh

# 或者
uvicorn main:app --reload
```

服务将运行于：`http://localhost:8000`

### 4. 验证服务

```bash
# 检查 API 文档
curl http://localhost:8000/docs

# 测试数据加载
curl -X POST http://localhost:8000/loadData
```

---

## 📚 核心 API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/calculate/staking` | POST | 计算质押指标 |
| `/calculate/ts` | POST | 计算 TS 交易指标 |
| `/calculate/pos` | POST | 计算 POS 指标 |
| `/calculate/shitcode` | POST | 计算 ShitCode 指标 |
| `/calculate/revenue` | POST | 计算收入汇总 |
| `/calculate/defi` | POST | 计算 DeFi 指标 |
<!-- | `/getDataFromSheets` | GET | 获取所有 Google Sheet 数据 |  --> 不再使用
| `/loadData` | POST | 刷新缓存数据 |
| `/getAISummary` | POST | 生成 AI 总结 |

---

## 📖 详细文档

完整的 API 文档、参数说明、响应格式、示例代码等详见：**[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)**

---

## 🔧 项目结构

```
backend/
├── main.py                 # 主应用入口
├── calculators/           # 计算器模块
│   ├── base.py           # 基类
│   ├── staking.py        # 质押计算
│   ├── ts.py             # TS 交易计算
│   ├── pos.py            # POS 计算
│   ├── shitcode.py       # ShitCode 计算
│   ├── revenue.py        # 收入汇总
│   └── defi.py           # DeFi 计算
├── routes/               # API 路由
│   └── calculate.py      # 计算路由
├── data_loader.py        # Google Sheet 数据加载
├── data_cache.py         # 多层缓存系统
├── ai_helper.py          # AI 总结助手
├── requirements.txt      # 依赖包
└── README.md            # 本文件
```

---

## 💻 使用示例

### Python 客户端

```python
import requests

BASE_URL = "http://localhost:8000"

# 计算 Staking 指标
response = requests.post(
    f"{BASE_URL}/calculate/staking",
    json={
        "start_date": "2025-12-01",
        "end_date": "2025-12-08"
    }
)
print(response.json())

# 获取所有数据
data = requests.get(f"{BASE_URL}/getDataFromSheets").json()
print(data)
```

### JavaScript 客户端

```javascript
const BASE_URL = "http://localhost:8000";

// 计算 TS 指标
fetch(`${BASE_URL}/calculate/ts`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    start_date: '2025-12-01',
    end_date: '2025-12-08'
  })
})
.then(r => r.json())
.then(data => console.log(data));

// 生成 AI 总结
fetch(`${BASE_URL}/getAISummary`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data_context: 'Your data summary here'
  })
})
.then(r => r.json())
.then(data => console.log(data.summary));
```

---

## 🔌 与前端集成

前端项目位于 `../frontend/` 目录，可通过以下方式访问后端 API：

```typescript
// src/services/dataService.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const fetchStakingData = (startDate: string, endDate: string) => {
  return fetch(`${API_BASE_URL}/calculate/staking`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ start_date: startDate, end_date: endDate })
  }).then(r => r.json());
};
```

---

## 🛡️ 功能特性

- ✅ **多计算器支持** - 6 种数据计算指标
- ✅ **三层缓存系统** - 内存缓存、磁盘缓存、Google Sheets 缓存
- ✅ **类型安全** - Pydantic 数据验证
- ✅ **异步处理** - FastAPI async/await 支持
- ✅ **自动文档** - Swagger UI + ReDoc
- ✅ **跨域支持** - CORS 配置完整
- ✅ **AI 集成** - Google GenAI 提供智能分析
- ✅ **错误处理** - 统一的错误响应格式

---

## 📞 支持

如有问题或建议，请参考：

- **API 详细文档** → [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **FastAPI 官方文档** → http://localhost:8000/docs
- **项目 GitHub** → https://github.com/jimmyyaaa/OSHIT-data-vis

---

## 📄 许可证

MIT