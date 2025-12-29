import React from 'react';
import { Typography, Spin, Alert } from 'antd';
import ReactMarkdown from 'react-markdown';

const { Title, Text } = Typography;

interface AISummarySidebarProps {
    loading: boolean;
    summary: string;
    error: string | null;
    }

const AISummarySidebar: React.FC<AISummarySidebarProps> = ({
    loading,
    summary,
    error,
}) => {
    return (
        <div
        style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
            borderLeft: '2px solid #00ffff33',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
        }}
        >

            {/* Content */}
            <div style={{ 
                flex: 1, 
                padding: '12px', 
                overflow: 'auto',
                color: '#ffffff',
            }}>
                {loading && (
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        flex: 1,
                        flexDirection: 'column',
                        gap: '16px'
                    }}>
                        <Spin 
                        size="large" 
                        style={{ 
                            color: '#00ffff',
                        }}
                        />
                        <div style={{ textAlign: 'center' }}>
                        <Text style={{ color: '#00ffff', fontSize: '16px' }}>
                            AI正在分析数据中...
                        </Text>
                        <div style={{ marginTop: '8px' }}>
                            <Text style={{ color: '#888', fontSize: '12px' }}>
                            正在处理复杂的数据模式
                            </Text>
                        </div>
                        </div>
                    </div>
                )}

                {error && !loading && (
                    <Alert
                        title="分析失败"
                        description={error}
                        type="error"
                        showIcon
                        style={{
                        backgroundColor: '#2a1a1a',
                        border: '1px solid #ff6b6b',
                        color: '#ffffff',
                        }}
                    />
                )}

                {summary && !loading && (
                    <div style={{ 
                        flex: 1, 
                        overflow: 'auto',
                        paddingRight: '8px'
                    }}>
                        <div style={{
                        backgroundColor: 'rgba(0, 255, 255, 0.05)',
                        border: '1px solid rgba(0, 255, 255, 0.2)',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '8px'
                        }}>
                            <ReactMarkdown
                                components={{
                                h1: ({ children }) => (
                                    <Title level={3} style={{ color: '#00ffff', marginTop: 0 }}>
                                    {children}
                                    </Title>
                                ),
                                h2: ({ children }) => (
                                    <Title level={4} style={{ color: '#00ffff', marginTop: '12px' }}>
                                    {children}
                                    </Title>
                                ),
                                h3: ({ children }) => (
                                    <Title level={5} style={{ color: '#00ffff', marginTop: '8px' }}>
                                    {children}
                                    </Title>
                                ),
                                p: ({ children }) => (
                                    <Text style={{ color: '#ffffff', display: 'block', marginBottom: '8px', lineHeight: '1.6' }}>
                                    {children}
                                    </Text>
                                ),
                                li: ({ children }) => (
                                    <Text style={{ color: '#ffffff', display: 'list-item', marginLeft: '16px', marginBottom: '2px' }}>
                                    {children}
                                    </Text>
                                ),
                                strong: ({ children }) => (
                                    <Text strong style={{ color: '#00ffff' }}>
                                    {children}
                                    </Text>
                                ),
                                code: ({ children }) => (
                                    <Text code style={{ backgroundColor: 'rgba(0, 255, 255, 0.1)', color: '#00ffff' }}>
                                    {children}
                                    </Text>
                                ),
                                }}
                            >
                                {summary}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AISummarySidebar;
