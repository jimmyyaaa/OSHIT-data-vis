import React, { useState, useEffect } from 'react';
import {
    Layout,
    ConfigProvider,
    theme,
    Typography,
    Button,
    DatePicker,
    Menu,
    Spin,
    message,
} from 'antd';
import {
    ReloadOutlined,
    RobotOutlined,
    LineChartOutlined,
    DollarOutlined,
    CodeOutlined,
    BankOutlined,
    TrophyOutlined,
    SwapOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { dataService, type SheetData } from './services/dataService';
import StakingSection from './components/StakingSection';
import TSSection from './components/TSSection';
import POSSection from './components/POSSection';
import ShitCodeSection from './components/ShitCodeSection';
import RevenueSection from './components/RevenueSection';
import DeFiSection from './components/DeFiSection';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;
const { RangePicker } = DatePicker;

// Section配置
const SECTIONS = [
    {
        key: 'TS',
        label: 'TS',
        icon: <LineChartOutlined />,
    },
    {
        key: 'POS',
        label: 'POS',
        icon: <TrophyOutlined />,
    },
    {
        key: 'SHIT_CODE',
        label: 'SHIT Code',
        icon: <CodeOutlined />,
    },
    {
        key: 'STAKING',
        label: 'Staking',
        icon: <BankOutlined />,
    },
    {
        key: 'SOL_REVENUE',
        label: 'SOL Revenue',
        icon: <DollarOutlined />,
    },
    {
        key: 'DEFI_ACTIVITY',
        label: 'DeFi Activity',
        icon: <SwapOutlined />,
    },
];

const App: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<SheetData | null>(null);
    const [selectedSection, setSelectedSection] = useState('STAKING');
    // Default to last 7 days (sliding window): from 7 days ago to today
    const computeLast7DaysRange = (): [Dayjs, Dayjs] => {
        const today = dayjs();
        return [today.subtract(7, 'day'), today];
    };

    const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>(
        computeLast7DaysRange()
    );
    const [cacheInfo, setCacheInfo] = useState<{
        hasCachedData: boolean;
        cacheTimestamp?: number;
        cacheSize?: number;
    }>({ hasCachedData: false });

    // 组件挂载时加载数据
    useEffect(() => {
        loadInitialData();
    }, []);

    // 更新缓存信息
    const updateCacheInfo = async () => {
        try {
            const info = await dataService.getCacheInfo();
            setCacheInfo(info);
        } catch (error) {
            console.error('Failed to update cache info:', error);
        }
    };

    // 格式化相对时间
    const formatRelativeTime = (timestamp: number): string => {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days > 0) {
            return `${days}d ago`;
        } else if (hours > 0) {
            return `${hours}h ago`;
        } else {
            return `${minutes}min ago`;
        }
    };

    // 初始数据加载
    const loadInitialData = async () => {
        setLoading(true);

        try {
            console.log('🚀 Starting initial data load...');

            // 先获取缓存信息
            await updateCacheInfo();

            // 加载数据（优先使用缓存）
            const result = await dataService.getAllData(false);
            setData(result);

            // 检查数据来源（仅用于console日志）
            const currentCacheInfo = await dataService.getCacheInfo();
            if (
                currentCacheInfo.hasCachedData &&
                currentCacheInfo.cacheTimestamp
            ) {
                const cacheAge = Date.now() - currentCacheInfo.cacheTimestamp;
                const cacheMinutes = Math.floor(cacheAge / (1000 * 60));

                if (cacheAge < 60000) {
                    // 1分钟内的数据认为是新数据
                    console.log('📡 Data loaded from API (fresh data)');
                    message.success('数据加载成功', 3);
                } else {
                    console.log(`💾 Data loaded from cache (${cacheMinutes} minutes old)`);
                    message.success('数据加载成功', 3);
                }
            } else {
                console.log('📡 Data loaded from API (no cache available)');
                message.success('数据加载成功', 3);
            }

            console.log('✅ Initial data load completed');
        } catch (error) {
            const errorMessage = (error as Error).message;
            console.error('❌ Initial data load failed:', errorMessage);

            // 尝试使用缓存数据作为降级
            try {
                const cachedData = await dataService.getCachedData();
                if (cachedData) {
                    setData(cachedData);
                    console.log('💾 Fallback to cached data due to API failure');
                    message.warning(
                        `API连接失败，已加载缓存数据: ${errorMessage}`,
                        5
                    );
                } else {
                    console.log('❌ No cached data available');
                    message.error(
                        `数据加载失败且无缓存数据: ${errorMessage}`,
                        5
                    );
                }
            } catch (cacheError) {
                console.log('❌ Failed to load cached data');
                message.error(`数据加载完全失败: ${errorMessage}`, 5);
            }
        } finally {
            setLoading(false);
        }
    };

    // 强制刷新数据（清除缓存，从API获取）
    const handleRefresh = async () => {
        setLoading(true);

        try {
            console.log('🔄 Starting data refresh...');

            // 强制从API获取新数据
            const result = await dataService.refreshData();
            setData(result);

            // 更新缓存信息
            await updateCacheInfo();

            console.log('📡 Data refreshed from API');
            message.success('数据刷新成功', 3);
            console.log('✅ Data refresh completed');
        } catch (error) {
            const errorMessage = (error as Error).message;
            console.error('❌ Data refresh failed:', errorMessage);

            // 刷新失败，检查是否有缓存数据可用
            try {
                const cachedData = await dataService.getCachedData();
                if (cachedData && data === null) {
                    // 只有在当前没有数据时才使用缓存
                    setData(cachedData);
                    console.log('💾 Fallback to cached data after refresh failure');
                    message.error(
                        `刷新失败，已恢复缓存数据: ${errorMessage}`,
                        5
                    );
                } else {
                    console.log('❌ No fallback data available after refresh failure');
                    message.error(`数据刷新失败: ${errorMessage}`, 5);
                }
            } catch (cacheError) {
                console.log('❌ Failed to load fallback data');
                message.error(`数据刷新失败: ${errorMessage}`, 5);
            }
        } finally {
            setLoading(false);
        }
    };

    // 清除缓存
    const handleClearCache = async () => {
        try {
            await dataService.clearCache();
            await updateCacheInfo();
            message.success('缓存已清除');
        } catch (error) {
            message.error('清除缓存失败');
        }
    };

    const handleDateRangeChange = (
        dates: [Dayjs | null, Dayjs | null] | null
    ) => {
        if (dates && dates[0] && dates[1]) {
            setDateRange([dates[0], dates[1]]);
        }
    };

    const handleSectionChange = (key: string) => {
        setSelectedSection(key);
    };

    const handleAISummary = () => {
        message.info('AI总结功能开发中...');
    };

    // 渲染当前选中的Section组件
    const renderCurrentSection = () => {
        if (!data) {
            return (
                <div className="section-placeholder">
                    <Title level={2} className="neon-text">
                        暂无数据
                    </Title>
                    <p style={{ color: '#666', marginBottom: '20px' }}>
                        请点击右上角的"刷新数据"按钮从后端获取数据
                    </p>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                        <p>API端点: http://localhost:8000/api/data</p>
                        <p>请确保后端服务正在运行</p>
                    </div>
                </div>
            );
        }

        switch (selectedSection) {
            case 'STAKING':
                return (
                    <StakingSection
                        key={`staking-${selectedSection}`}
                        data={data}
                        error={null}
                        dateRange={dateRange}
                    />
                );
            case 'TS':
                return (
                    <TSSection
                        key={`ts-${selectedSection}`}
                        data={data}
                        error={null}
                        dateRange={dateRange}
                    />
                );
            case 'POS':
                return (
                    <POSSection
                        key={`pos-${selectedSection}`}
                        data={data}
                        error={null}
                        dateRange={dateRange}
                    />
                );
            case 'SHIT_CODE':
                return (
                    <ShitCodeSection
                        key={`shitcode-${selectedSection}`}
                        data={data}
                        error={null}
                        dateRange={dateRange}
                    />
                );
            case 'SOL_REVENUE':
                return (
                    <RevenueSection
                        key={`revenue-${selectedSection}`}
                        data={data}
                        error={null}
                        dateRange={dateRange}
                    />
                );
            case 'DEFI_ACTIVITY':
                return (
                    <DeFiSection
                        key={`defi-${selectedSection}`}
                        data={data}
                        error={null}
                        dateRange={dateRange}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <ConfigProvider
            theme={{
                algorithm: theme.darkAlgorithm,
                token: {
                    colorPrimary: '#00FFFF',
                    colorBgContainer: 'rgba(0, 10, 25, 0.9)',
                    colorBgElevated: 'rgba(0, 10, 25, 0.95)',
                    colorBorder: '#00FFFF',
                    colorBgLayout: 'transparent',
                    colorText: '#00FFFF',
                    colorTextSecondary: '#80FFFF',
                    colorSuccess: '#00FFFF',
                    colorWarning: '#FFFF00',
                    colorError: '#FF0080',
                    colorInfo: '#00FFFF',
                    fontFamily: "'Courier New', 'Monaco', 'Menlo', monospace",
                },
                components: {
                    Layout: {
                        colorBgHeader: 'rgba(0, 5, 15, 0.95)',
                        colorBgBody: 'transparent',
                        colorBgTrigger: 'rgba(0, 10, 20, 0.95)',
                    },
                    Statistic: {
                        colorText: '#00FFFF',
                        colorTextDescription: '#00FF41',
                        fontFamily: "'Courier New', 'Monaco', 'Menlo', monospace",
                        fontWeightStrong: 700,
                        fontSizeHeading3: 24,
                    },
                    Card: {
                        colorBgContainer: 'rgba(0, 10, 20, 0.8)',
                        colorBorderSecondary: 'rgba(0, 255, 65, 0.3)',
                        borderRadius: 16,
                        boxShadow: '0 0 20px rgba(0, 255, 65, 0.2)',
                        colorTextHeading: '#00FFFF',
                    },
                    Input: {
                        colorBgContainer: 'rgba(0, 10, 20, 0.8)',
                        colorBorder: 'rgba(0, 255, 65, 0.3)',
                        colorText: '#00FFFF',
                        colorTextPlaceholder: '#80FFFF',
                        borderRadius: 6,
                    },
                    DatePicker: {
                        colorBgContainer: 'transparent',
                        colorBorder: '#00FFFF',
                        colorText: '#00FFFF',
                        colorTextPlaceholder: '#80FFFF',
                        colorIcon: '#00FF41',
                        colorIconHover: '#00FFFF',
                        borderRadius: 8,
                        fontSize: 16,
                        boxShadow: '0 0 10px rgba(0, 255, 255, 0.3)',
                    },
                    Spin: {
                        colorPrimary: '#00FF41',
                    },
                    Menu: {
                        colorItemBg: 'transparent',
                        colorItemBgSelected: 'rgba(0, 255, 255, 0.2)',
                        colorItemBgHover: 'rgba(0, 255, 255, 0.1)',
                        colorItemText: '#00FFFF',
                        colorItemTextSelected: '#00FFFF',
                        colorItemTextHover: '#00FFFF',
                        controlHeightLG: 40,
                    },
                },
            }}
        >
            <Layout
                style={{
                    minHeight: '100vh',
                    background: 'radial-gradient(ellipse at center, rgba(0, 5, 15, 0.98) 0%, rgba(0, 0, 10, 0.99) 100%)',
                    backgroundImage: `
                        radial-gradient(circle at 20% 80%, rgba(0, 255, 255, 0.08) 0%, transparent 50%),
                        radial-gradient(circle at 80% 20%, rgba(0, 255, 255, 0.05) 0%, transparent 50%),
                        radial-gradient(circle at 40% 40%, rgba(0, 255, 255, 0.03) 0%, transparent 50%),
                        radial-gradient(circle at 60% 70%, rgba(0, 255, 255, 0.02) 0%, transparent 40%)
                    `,
                }}
            >
                {/* 顶部Header */}
                <Header
                    className="dashboard-header"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 24px',
                        boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)',
                        backdropFilter: 'blur(10px)',
                    }}
                >
                    {/* Logo区域 */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Title
                            level={2}
                            className="neon-text"
                            style={{ margin: 0 }}
                        >
                            💩 OSHIT Web3 Data
                        </Title>
                    </div>

                    {/* 数据状态和刷新按钮 */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                        }}
                    >
                        {cacheInfo.cacheTimestamp && (
                            <span
                                style={{
                                    color: '#80FFFF',
                                    fontSize: '16px',
                                    opacity: 1,
                                    marginLeft: '12px',
                                }}
                            >
                                last refresh: {formatRelativeTime(cacheInfo.cacheTimestamp)}
                            </span>
                        )}
                        
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={handleRefresh}
                            loading={loading}
                            disabled={loading}
                            style={{
                                opacity: 0.7,
                                fontSize: '14px',
                                fontWeight: 'bold',
                            }}
                        >
                            {loading ? '刷新中...' : '刷新数据'}
                        </Button>

                        {/* Debug模式下显示清除缓存按钮 */}
                        {cacheInfo.hasCachedData && (
                            <Button
                                size="small"
                                onClick={handleClearCache}
                                style={{
                                    opacity: 0.7,
                                    fontSize: '11px',
                                }}
                            >
                                清除缓存
                            </Button>
                        )}
                    </div>
                </Header>

                <Layout>
                    {/* 左侧Section选择器 */}
                    <Sider
                        width={240}
                        style={{
                            background: 'rgba(0, 5, 15, 0.95)',
                            borderRight: '2px solid #00FFFF',
                            backdropFilter: 'blur(10px)',
                            boxShadow: '2px 0 20px rgba(0, 255, 255, 0.3)',
                        }}
                    >
                        <div style={{ padding: '20px 0' }}>
                            <Menu
                                key={`menu-${selectedSection}`}
                                mode="inline"
                                selectedKeys={[selectedSection]}
                                onClick={({ key }) => handleSectionChange(key)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                }}
                            >
                                {SECTIONS.map((section) => (
                                    <Menu.Item
                                        key={section.key}
                                        icon={section.icon}
                                        style={{
                                            marginBottom: '8px',
                                            borderRadius: '8px',
                                            fontWeight: 'bold',
                                            fontSize: '14px',
                                        }}
                                    >
                                        {section.label}
                                    </Menu.Item>
                                ))}
                            </Menu>
                        </div>
                    </Sider>

                    {/* 右侧内容区域 */}
                    <Layout style={{ padding: 0 }}>
                        {/* 右侧顶部导航栏 */}
                        <div
                            style={{
                                background: 'rgba(0, 5, 15, 0.95)',
                                padding: '16px 24px',
                                borderBottom: '2px solid #00FFFF',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                backdropFilter: 'blur(10px)',
                                boxShadow: '0 0 15px rgba(0, 255, 255, 0.2)',
                            }}
                        >
                            {/* 日期选择器 */}
                            <RangePicker
                                value={dateRange}
                                onChange={handleDateRangeChange}
                                format="YYYY-MM-DD"
                                allowClear={false}
                                style={{ 
                                    marginRight: '16px',
                                }}
                            />

                            {/* AI总结按钮 */}
                            <Button
                                icon={<RobotOutlined />}
                                onClick={handleAISummary}
                                style={{
                                    opacity: 0.7,
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                }}
                            >
                                AI总结
                            </Button>
                        </div>

                        {/* 主要内容区域 */}
                        <Content
                            style={{
                                margin: '24px',
                                padding: '24px',
                                height: 'calc(100vh - 200px)',
                                overflowY: 'auto',
                            }}
                        >
                            {loading ? (
                                <div
                                    style={{
                                        textAlign: 'center',
                                        paddingTop: '100px',
                                    }}
                                >
                                    <Spin size="large" />
                                    <div
                                        style={{
                                            marginTop: '16px',
                                            color: '#00FF41',
                                        }}
                                    >
                                        正在加载数据...
                                    </div>
                                    <div
                                        style={{
                                            marginTop: '8px',
                                            color: '#666',
                                            fontSize: '12px',
                                        }}
                                    >
                                        连接到 http://localhost:8000/api/data
                                    </div>
                                </div>
                            ) : (
                                renderCurrentSection()
                            )}
                        </Content>
                    </Layout>
                </Layout>
            </Layout>
        </ConfigProvider>
    );
};

export default App;
