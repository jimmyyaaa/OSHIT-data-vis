import React from 'react';
import { Typography, Spin, Alert, Button } from 'antd';
import { CloseOutlined, RobotOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';

const { Title, Text } = Typography;

interface AISummarySidebarProps {
  onClose: () => void;
  loading: boolean;
  summary: string;
  error: string | null;
}

const AISummarySidebar: React.FC<AISummarySidebarProps> = ({
  onClose,
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
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
          borderBottom: '1px solid #00ffff33',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RobotOutlined style={{ color: '#00ffff' }} />
          <Title level={4} style={{ margin: 0, color: '#00ffff' }}>
            AI Analysis
          </Title>
        </div>
        <Button
          type="text"
          icon={<CloseOutlined style={{ color: '#00ffff' }} />}
          onClick={onClose}
          style={{
            border: 'none',
            background: 'transparent',
            color: '#00ffff',
          }}
        />
      </div>

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

        {error && (
          <Alert
            message="分析失败"
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

        {!loading && !summary && !error && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flex: 1,
            flexDirection: 'column',
            gap: '16px'
          }}>
            <RobotOutlined style={{ fontSize: '48px', color: '#00ffff' }} />
            <Text style={{ color: '#888', textAlign: 'center' }}>
              点击 "AI Summary" 按钮开始分析当前数据
            </Text>
          </div>
        )}
      </div>
    </div>
  );
};

export default AISummarySidebar;
