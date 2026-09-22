'use client';
import React, { useEffect, useState } from 'react';
import {
  Table, Button, Tag, Space, Modal, Form, Input, Select, message, Popconfirm,
  Checkbox, Alert, Badge, Divider, Spin, Tooltip, Row, Col, Typography,
} from 'antd';
import {
  PlusOutlined, ThunderboltOutlined, EyeOutlined, DeleteOutlined,
  CheckCircleOutlined, FileTextOutlined, ArrowLeftOutlined, ArrowRightOutlined,
  CheckSquareOutlined, BorderOutlined,
} from '@ant-design/icons';
import { api } from '@/lib/api-client';
import { EXAM_STATUS_LABELS } from '@/lib/constants';
import dynamic from 'next/dynamic';

const MathRenderer = dynamic(() => import('@/components/MathRenderer'), { ssr: false });

const { Text } = Typography;

interface Question {
  id: string;
  questionCode: string;
  questionText: string;
  correctOption: string;
  estimatedDifficulty: number;
  subject?: { name: string };
  domain?: { name: string };
  topic?: { name: string };
  cognitiveLevel?: { name: string };
  difficultyLevel?: { name: string; code: string };
}

interface MatrixGroup {
  item: {
    id: string;
    requiredCount: number;
    domain?: { name: string } | null;
    topic?: { name: string } | null;
    cognitiveLevel?: { name: string } | null;
    difficultyLevel?: { name: string; code: string } | null;
  };
  questions: Question[];
  available: number;
}

export default function ExamsPage() {
  const [exams, setExams] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [matrices, setMatrices] = useState<Record<string, unknown>[]>([]);

  // Modal create state
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [groups, setGroups] = useState<MatrixGroup[]>([]);
  // selectedIds: Set of question IDs ticked by user
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  // View questions modal (after exam created)
  const [viewExam, setViewExam] = useState<Record<string, unknown> | null>(null);

  const load = () => {
    setLoading(true);
    api.get<Record<string, unknown>[]>('/exams').then(setExams).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); api.get<Record<string, unknown>[]>('/matrices').then(setMatrices); }, []);

  // ── Step 1 → Step 2: Load candidates from matrix ────────────────────────
  const onNextStep = async () => {
    try {
      const values = await form.validateFields(['name', 'matrixId']);
      setLoadingCandidates(true);
      const res = await api.get<{ matrix: Record<string, unknown>; groups: MatrixGroup[] }>(
        `/matrices/${values.matrixId}/candidates`
      );
      setGroups(res.groups);

      // Auto-preselect: pick first `requiredCount` from each group
      const preSelected = new Set<string>();
      for (const g of res.groups) {
        g.questions.slice(0, g.item.requiredCount).forEach(q => preSelected.add(q.id));
      }
      setSelectedIds(preSelected);
      setCreateStep(2);
    } catch (err: unknown) {
      message.error((err as Error).message || 'Không thể tải câu hỏi.');
    } finally {
      setLoadingCandidates(false);
    }
  };

  const toggleQ = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = (g: MatrixGroup) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      g.questions.forEach(q => next.add(q.id));
      return next;
    });
  };

  const deselectAll = (g: MatrixGroup) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      g.questions.forEach(q => next.delete(q.id));
      return next;
    });
  };

  // ── Create exam with selected questions ──────────────────────────────────
  const onCreateExam = async () => {
    if (selectedIds.size === 0) { message.error('Chưa chọn câu hỏi nào.'); return; }
    setCreating(true);
    try {
      const values = form.getFieldsValue();
      const res = await api.post<{ exam: Record<string, unknown>; warnings: string[] }>('/exams', {
        name: values.name,
        matrixId: values.matrixId,
        questionIds: Array.from(selectedIds),
      });
      const { warnings } = res;
      if (warnings?.length) {
        message.warning(`Đề đã tạo nhưng có ${warnings.length} cảnh báo.`);
      } else {
        message.success(`Đã tạo đề thi với ${selectedIds.size} câu hỏi!`);
      }
      setCreateOpen(false);
      setCreateStep(1);
      form.resetFields();
      setGroups([]);
      setSelectedIds(new Set());
      load();
    } catch (err: unknown) { message.error((err as Error).message); }
    finally { setCreating(false); }
  };

  const onCloseCreate = () => {
    setCreateOpen(false); setCreateStep(1); form.resetFields(); setGroups([]); setSelectedIds(new Set());
  };

  // ── Finalize & Delete ────────────────────────────────────────────────────
  const onFinalize = async (id: string) => {
    try { await api.post(`/exams/${id}/publish`); message.success('Đã chốt đề thi.'); load(); }
    catch (err: unknown) { message.error((err as Error).message); }
  };

  const onDelete = async (id: string) => {
    try { await api.del(`/exams/${id}`); message.success('Đã xóa.'); load(); }
    catch (err: unknown) { message.error((err as Error).message); }
  };

  // ── Columns ──────────────────────────────────────────────────────────────
  const columns = [
    { title: 'Tên đề', dataIndex: 'name', render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'Mã', dataIndex: 'code', width: 180 },
    { title: 'Ma trận', dataIndex: ['matrix', 'name'], width: 200 },
    { title: 'Số câu', dataIndex: '_count', width: 80, render: (c: { examQuestions: number }) => c?.examQuestions || 0 },
    { title: 'Trạng thái', dataIndex: 'status', width: 120,
      render: (s: string) => <Tag color={s === 'finalized' ? 'green' : 'default'}>{EXAM_STATUS_LABELS[s]}</Tag> },
    { title: 'Thao tác', width: 230,
      render: (_: unknown, rec: Record<string, unknown>) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setViewExam(rec)}>Xem câu hỏi</Button>
          {rec.status === 'draft' && (
            <Popconfirm title="Chốt đề? Sau khi chốt không thể sửa." onConfirm={() => onFinalize(rec.id as string)}>
              <Button size="small" type="primary" icon={<CheckCircleOutlined />}>Chốt</Button>
            </Popconfirm>
          )}
          <Popconfirm title="Xóa đề thi?" onConfirm={() => onDelete(rec.id as string)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Difficulty badge ─────────────────────────────────────────────────────
  const diffColor = (code?: string) => {
    const map: Record<string, string> = { VERY_EASY: 'green', EASY: 'cyan', MEDIUM: 'gold', HARD: 'orange', VERY_HARD: 'red' };
    return map[code || ''] || 'default';
  };

  // Total selected & required per group
  const groupSelected = (g: MatrixGroup) => g.questions.filter(q => selectedIds.has(q.id)).length;

  return (
    <div>
      <div className="page-header">
        <h2><FileTextOutlined /> Đề thi</h2>
        <Button type="primary" icon={<ThunderboltOutlined />} onClick={() => setCreateOpen(true)}
          style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', borderRadius: 10, fontWeight: 600 }}>
          Tạo đề thi từ ma trận
        </Button>
      </div>
      <div className="content-card" style={{ padding: 0 }}>
        <Table dataSource={exams} columns={columns} rowKey="id" loading={loading} size="middle" />
      </div>

      {/* ── Create Exam Modal ───────────────────────────────────────────── */}
      <Modal
        title={createStep === 1 ? '① Chọn ma trận & đặt tên đề' : '② Chọn câu hỏi cho đề thi'}
        open={createOpen}
        onCancel={onCloseCreate}
        width={createStep === 1 ? 480 : 900}
        styles={{ body: { maxHeight: '72vh', overflowY: 'auto' } }}
        footer={
          createStep === 1 ? (
            <Space>
              <Button onClick={onCloseCreate}>Hủy</Button>
              <Button type="primary" loading={loadingCandidates} icon={<ArrowRightOutlined />} onClick={onNextStep}>
                Xem câu hỏi ứng viên →
              </Button>
            </Space>
          ) : (
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => setCreateStep(1)}>← Quay lại</Button>
              <Button onClick={onCloseCreate}>Hủy</Button>
              <Button type="primary" loading={creating} icon={<ThunderboltOutlined />}
                style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
                onClick={onCreateExam}>
                Tạo đề với {selectedIds.size} câu đã chọn
              </Button>
            </Space>
          )
        }
      >
        {/* Step 1 */}
        {createStep === 1 && (
          <Form form={form} layout="vertical">
            <Form.Item name="name" label="Tên đề thi" rules={[{ required: true }]}>
              <Input placeholder="VD: Kiểm tra Vật Lý 11 — HK1" />
            </Form.Item>
            <Form.Item name="matrixId" label="Ma trận đặc tả" rules={[{ required: true }]}>
              <Select placeholder="Chọn ma trận..." showSearch optionFilterProp="children">
                {matrices.map((m) => {
                  const itemCount = Number(
                    ((m._count as Record<string, unknown>)?.examQuestions) ??
                    ((m.items as unknown[])?.length) ?? 0
                  );
                  return (
                    <Select.Option key={m.id as string} value={m.id as string}>
                      {m.name as string}
                      <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                        ({itemCount} ô)
                      </Text>
                    </Select.Option>
                  );
                })}
              </Select>
            </Form.Item>
          </Form>
        )}

        {/* Step 2 — Question selection */}
        {createStep === 2 && (
          <div>
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message={`Tổng đã chọn: ${selectedIds.size} câu — Tích vào ô checkbox để thêm/bớt câu hỏi. Câu được tô xanh = đã chọn vào đề.`}
            />

            {groups.map((g, gi) => {
              const sel = groupSelected(g);
              const req = g.item.requiredCount;
              const isOk = sel >= req;
              return (
                <div key={gi} style={{ marginBottom: 20, border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                  {/* Group header */}
                  <div style={{
                    padding: '10px 16px', background: isOk ? '#f0fdf4' : '#fef9c3',
                    borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                  }}>
                    <Badge count={`${sel}/${req}`} color={isOk ? '#22c55e' : '#f59e0b'} overflowCount={99} />
                    <span style={{ fontWeight: 600 }}>
                      {g.item.domain?.name || 'Tất cả lĩnh vực'}
                      {g.item.topic && ` › ${g.item.topic.name}`}
                    </span>
                    {g.item.cognitiveLevel && <Tag>{g.item.cognitiveLevel.name}</Tag>}
                    {g.item.difficultyLevel && (
                      <Tag color={diffColor(g.item.difficultyLevel.code)}>{g.item.difficultyLevel.name}</Tag>
                    )}
                    <span style={{ color: '#64748b', fontSize: 12 }}>({g.available} câu trong ngân hàng)</span>
                    <Space style={{ marginLeft: 'auto' }}>
                      <Button size="small" icon={<CheckSquareOutlined />} onClick={() => selectAll(g)}>Chọn tất cả</Button>
                      <Button size="small" icon={<BorderOutlined />} onClick={() => deselectAll(g)}>Bỏ chọn</Button>
                    </Space>
                  </div>

                  {g.questions.length === 0 ? (
                    <div style={{ padding: '16px', color: '#ef4444', textAlign: 'center' }}>
                      ⚠️ Không có câu hỏi nào đã duyệt phù hợp với ô này
                    </div>
                  ) : (
                    <div style={{ padding: '8px 0' }}>
                      {g.questions.map((q) => {
                        const checked = selectedIds.has(q.id);
                        return (
                          <div
                            key={q.id}
                            onClick={() => toggleQ(q.id)}
                            style={{
                              display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 16px',
                              cursor: 'pointer', transition: 'background 0.1s',
                              background: checked ? '#eff6ff' : 'transparent',
                              borderLeft: checked ? '3px solid #3b82f6' : '3px solid transparent',
                            }}
                          >
                            <Checkbox checked={checked} style={{ marginTop: 3, flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                <Text code style={{ fontSize: 11 }}>{q.questionCode}</Text>
                                <Tag color={diffColor(q.difficultyLevel?.code)} style={{ fontSize: 10, margin: 0 }}>
                                  {q.difficultyLevel?.name || `Độ khó ${q.estimatedDifficulty}`}
                                </Tag>
                              </div>
                              <div style={{ marginTop: 4, color: '#1e293b', lineHeight: 1.5 }}>
                                <MathRenderer content={
                                  (() => {
                                    const t = q.questionText?.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() || '';
                                    return t.length > 120 ? t.slice(0, 120) + '…' : t;
                                  })()
                                } />
                              </div>
                            </div>
                            <Tooltip title={`Đáp án: ${q.correctOption}`}>
                              <Tag color="green" style={{ flexShrink: 0 }}>{q.correctOption}</Tag>
                            </Tooltip>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      {/* ── View Exam Questions Modal ───────────────────────────────────── */}
      <Modal
        title={`Câu hỏi trong đề: ${viewExam?.name as string || ''}`}
        open={!!viewExam}
        onCancel={() => setViewExam(null)}
        footer={<Button onClick={() => setViewExam(null)}>Đóng</Button>}
        width={800}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        {viewExam && (() => {
          const eqs = (viewExam.examQuestions as Record<string, unknown>[]) || [];
          return eqs.length === 0 ? (
            <Alert type="warning" message="Đề thi này chưa có câu hỏi nào." showIcon />
          ) : (
            <div>
              <Alert type="info" showIcon style={{ marginBottom: 12 }}
                message={`Đề có ${eqs.length} câu hỏi. Thứ tự hiển thị theo số thứ tự trong đề.`} />
              {eqs.map((eq) => {
                const q = eq.question as Record<string, unknown>;
                const text = (q?.questionText as string || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
                return (
                  <div key={eq.id as string} style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <Tag color="blue" style={{ flexShrink: 0, marginTop: 2 }}>Câu {eq.displayOrder as number}</Tag>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 11, color: '#64748b', marginRight: 8 }}>
                          {(q?.questionCode as string) || ''}
                        </span>
                        <MathRenderer content={text.length > 150 ? text.slice(0, 150) + '…' : text} />
                      </div>
                      <Tag color="green" style={{ flexShrink: 0 }}>{q?.correctOption as string}</Tag>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
