import React from 'react';
import { Typography, Space, Divider } from 'antd';
import { DatabaseOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface EmptyDataPlaceholderProps {
    // 可以在未来添加其他配置选项
}

const EmptyDataPlaceholder: React.FC<EmptyDataPlaceholderProps> = () => {
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '60vh',
                padding: '24px',
            }}
        >
            <div
                style={{
                    maxWidth: '500px',
                    width: '100%',
                    textAlign: 'center',
                    padding: '40px 32px',
                }}
            >
                {/* 主标题 */}
                <div style={{ marginBottom: '24px' }}>
                    <DatabaseOutlined 
                        style={{ 
                            fontSize: '48px',
                            color: '#00FFFF',
                            marginBottom: '16px',
                            opacity: 0.7,
                        }} 
                    />
                    <Title 
                        level={2} 
                        className="neon-text"
                        style={{
                            margin: '0 0 12px 0',
                            color: '#00FFFF',
                        }}
                    >
                        暂无数据
                    </Title>
                    <Text
                        style={{
                            color: '#80FFFF',
                            fontSize: '16px',
                        }}
                    >
                        数据源连接异常
                    </Text>
                </div>

                <Divider 
                    style={{ 
                        borderColor: 'rgba(0, 255, 255, 0.3)',
                        margin: '24px 0',
                    }} 
                />

                {/* 操作建议 */}
                <div style={{ marginBottom: '24px' }}>
                    <Paragraph
                        style={{
                            color: '#B0B0B0',
                            fontSize: '14px',
                            marginBottom: '16px',
                            lineHeight: 1.6,
                        }}
                    >
                        请尝试以下操作来获取数据：
                    </Paragraph>
                    
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Text style={{ color: '#80FFFF', fontSize: '13px' }}>
                            1. 确保后端服务正在运行
                        </Text>
                        <Text style={{ color: '#80FFFF', fontSize: '13px' }}>
                            2. 检查网络连接状态
                        </Text>
                        <Text style={{ color: '#80FFFF', fontSize: '13px' }}>
                            3. 使用右上角刷新按钮重试
                        </Text>
                    </Space>
                </div>
            </div>
        </div>
    );
};

export default EmptyDataPlaceholder;