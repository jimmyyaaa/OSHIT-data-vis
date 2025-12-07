import React from 'react';
import { Typography } from 'antd';
import { DatabaseOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const LoadingData: React.FC = () => {
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
                    maxWidth: '400px',
                    width: '100%',
                    textAlign: 'center',
                    padding: '40px 32px',
                }}
            >
                {/* 数据库图标 */}
                <div style={{ marginBottom: '24px' }}>
                    <DatabaseOutlined
                        style={{
                            fontSize: '80px',
                            color: '#00FFFF',
                            opacity: 0.8,
                        }}
                    />
                </div>

                {/* 标题和描述 */}
                <Title
                    level={2}
                    className="neon-text"
                    style={{
                        margin: '0 0 12px 0',
                        color: '#00FFFF',
                        fontSize: '24px',
                    }}
                >
                    正在加载数据
                </Title>
                <Text
                    style={{
                        color: '#80FFFF',
                        fontSize: '16px',
                    }}
                >
                    请稍候...
                </Text>

                {/* 波浪动画条 */}
                <div style={{ marginTop: '24px' }}>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '6px',
                        }}
                    >
                        {[0, 1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                style={{
                                    width: '8px',
                                    height: '32px',
                                    backgroundColor: '#00FFFF',
                                    borderRadius: '4px',
                                    animation: `wave 1.2s ease-in-out ${i * 0.1}s infinite`,
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* 自定义CSS动画 */}
            <style dangerouslySetInnerHTML={{
                __html: `
                    @keyframes wave {
                        0%, 60%, 100% {
                            transform: scaleY(0.4);
                            opacity: 0.4;
                        }
                        30% {
                            transform: scaleY(1);
                            opacity: 1;
                        }
                    }
                `
            }} />
        </div>
    );
};

export default LoadingData;