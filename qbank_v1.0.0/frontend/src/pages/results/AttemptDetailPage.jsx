// src/pages/results/AttemptDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { Card, Typography, Spin, message, Descriptions, Tag, Divider, Row, Col } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircleOutlined, CloseCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import api from '../../api/client';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

export default function AttemptDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/results/attempts/${id}`)
      .then(res => setAttempt(res.data))
      .catch(() => message.error('Không thể tải chi tiết bài làm.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div>;
  if (!attempt) return null;

  const { student, session, responses, score, numCorrect, numWrong } = attempt;
  const isPass = score >= 5;

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 24, cursor: 'pointer' }} onClick={() => navigate(-1)}>
        <Text style={{ fontSize: 16, color: '#4f46e5' }}><ArrowLeftOutlined /> Quay lại</Text>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={8}>
          <Card bordered={false} style={{ borderRadius: 12, position: 'sticky', top: 24 }}>
            <Title level={4}>Kết quả bài thi</Title>
            <div style={{ textAlign: 'center', margin: '24px 0' }}>
              <Text style={{ fontSize: 48, fontWeight: 700, color: isPass ? '#22c55e' : '#ef4444' }}>
                {score?.toFixed(2)}
              </Text>
              <div style={{ fontSize: 16, color: '#64748b' }}>/ 10 điểm</div>
            </div>

            <Descriptions column={1} size="small" labelStyle={{ color: '#64748b' }}>
              <Descriptions.Item label="Học sinh"><Text strong>{student?.fullName}</Text></Descriptions.Item>
              <Descriptions.Item label="Email">{student?.email}</Descriptions.Item>
              <Descriptions.Item label="Phiên thi">{session?.name}</Descriptions.Item>
              <Descriptions.Item label="Đề thi">{session?.exam?.name}</Descriptions.Item>
              <Descriptions.Item label="Số câu đúng"><Text style={{ color: '#22c55e' }}>{numCorrect}</Text></Descriptions.Item>
              <Descriptions.Item label="Số câu sai"><Text style={{ color: '#ef4444' }}>{numWrong}</Text></Descriptions.Item>
              <Descriptions.Item label="Ngày nộp">{dayjs(attempt.submittedAt).format('HH:mm DD/MM/YYYY')}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} md={16}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Title level={4}>Chi tiết bài làm</Title>
            <Divider />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {responses.map((res, idx) => {
                const { question } = res;
                const options = [
                  { key: 'A', text: question.optionA },
                  { key: 'B', text: question.optionB },
                  { key: 'C', text: question.optionC },
                  { key: 'D', text: question.optionD },
                ];

                return (
                  <div key={res.id} style={{ 
                    padding: 16, 
                    border: '1px solid #f1f5f9', 
                    borderRadius: 8,
                    background: res.isCorrect ? '#f0fdf4' : '#fef2f2'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                      <Text strong style={{ fontSize: 16 }}>Câu {idx + 1}</Text>
                      {res.isCorrect 
                        ? <Tag color="success" icon={<CheckCircleOutlined />}>Đúng</Tag>
                        : <Tag color="error" icon={<CloseCircleOutlined />}>Sai</Tag>
                      }
                    </div>

                    <Paragraph style={{ fontSize: 15, marginBottom: 16, whiteSpace: 'pre-wrap' }}>
                      {question.questionText}
                    </Paragraph>

                    {question.questionImage && (
                      <div style={{ marginBottom: 16 }}>
                        <img src={`http://localhost:3001${question.questionImage}`} alt="" style={{ maxWidth: '100%', borderRadius: 8 }} />
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {options.map(opt => {
                        const isStudentAction = res.selectedOption === opt.key;
                        const isCorrectOption = question.correctOption === opt.key;
                        
                        let bgColor = '#f8fafc';
                        let borderColor = '#e2e8f0';
                        let icon = null;

                        if (isCorrectOption) {
                          bgColor = '#dcfce7';
                          borderColor = '#86efac';
                          icon = <CheckCircleOutlined style={{ color: '#16a34a' }} />;
                        } else if (isStudentAction && !isCorrectOption) {
                          bgColor = '#fee2e2';
                          borderColor = '#fca5a5';
                          icon = <CloseCircleOutlined style={{ color: '#dc2626' }} />;
                        }

                        return (
                          <div key={opt.key} style={{
                            padding: '10px 16px',
                            background: bgColor,
                            border: `1px solid ${borderColor}`,
                            borderRadius: 6,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <Text strong={isCorrectOption || isStudentAction}>
                              <span style={{ marginRight: 8 }}>{opt.key}.</span> {opt.text}
                            </Text>
                            {icon}
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ marginTop: 16, padding: '12px 16px', background: '#e0f2fe', borderRadius: 6 }}>
                      <Text strong style={{ display: 'block', marginBottom: 4, color: '#0369a1' }}>Giải thích / Lời giải:</Text>
                      <Text style={{ color: '#0c4a6e', whiteSpace: 'pre-wrap' }}>{question.explanation || 'Không có giải thích.'}</Text>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
