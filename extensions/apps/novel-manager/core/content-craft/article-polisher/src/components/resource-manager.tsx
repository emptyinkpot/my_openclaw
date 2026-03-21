'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Database, 
  Github, 
  Star, 
  ExternalLink, 
  Check, 
  RefreshCw,
  TrendingUp,
  Layers,
  Sparkles,
  BookOpen,
  Pen
} from 'lucide-react';
import {
  SYNONYM_DATABASE,
  LOW_QUALITY_EXPRESSIONS,
  AI_GENERATION_SIGNATURES,
  ACADEMIC_WRITING_STANDARDS,
  CLASSICAL_STYLE_VOCABULARY,
  RECOMMENDED_OPENSOURCE_PROJECTS,
  getResourceStats,
} from '@/lib/opensource-resources';

interface ResourceItem {
  id: string;
  type: string;
  content: string;
  category: string;
  frequency?: number;
  severity?: string;
  alternatives?: string[];
  source: 'curated' | 'opensource';
}

export function ResourceManager() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSource, setSelectedSource] = useState<'curated' | 'opensource' | 'all'>('all');

  // 资源统计
  const stats = useMemo(() => getResourceStats(), []);

  // 所有资源数据
  const allResources = useMemo<ResourceItem[]>(() => {
    const items: ResourceItem[] = [];

    // 同义词
    SYNONYM_DATABASE.forEach((item, idx) => {
      items.push({
        id: `synonym-${idx}`,
        type: '同义词',
        content: item.word,
        category: item.category,
        frequency: item.frequency,
        alternatives: item.synonyms,
        source: 'curated',
      });
    });

    // 低质量表达
    LOW_QUALITY_EXPRESSIONS.forEach((item, idx) => {
      items.push({
        id: `lowquality-${idx}`,
        type: '低质量表达',
        content: item.expression,
        category: item.reason,
        severity: item.severity,
        alternatives: [item.improvement],
        source: 'curated',
      });
    });

    // AI特征
    AI_GENERATION_SIGNATURES.forEach((item, idx) => {
      items.push({
        id: `ai-${idx}`,
        type: 'AI特征',
        content: item.signature,
        category: item.category,
        alternatives: item.humanAlternatives,
        source: 'curated',
      });
    });

    // 学术规范
    ACADEMIC_WRITING_STANDARDS.forEach((item, idx) => {
      items.push({
        id: `academic-${idx}`,
        type: '学术规范',
        content: item.informal,
        category: item.context,
        alternatives: [item.formal],
        source: 'curated',
      });
    });

    // 文言词汇
    CLASSICAL_STYLE_VOCABULARY.forEach((item, idx) => {
      items.push({
        id: `classical-${idx}`,
        type: '文言词汇',
        content: item.modern,
        category: item.context,
        alternatives: [item.literary, item.classical],
        source: 'curated',
      });
    });

    return items;
  }, []);

  // 过滤资源
  const filteredResources = useMemo(() => {
    let result = allResources;

    if (selectedSource !== 'all') {
      result = result.filter(item => item.source === selectedSource);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        item =>
          item.content.toLowerCase().includes(query) ||
          item.type.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query) ||
          item.alternatives?.some(alt => alt.toLowerCase().includes(query))
      );
    }

    return result;
  }, [allResources, selectedSource, searchQuery]);

  // 按类型分组
  const groupedResources = useMemo(() => {
    const groups: Record<string, ResourceItem[]> = {};
    filteredResources.forEach(item => {
      if (!groups[item.type]) groups[item.type] = [];
      groups[item.type].push(item);
    });
    return groups;
  }, [filteredResources]);

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {/* 头部 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Database className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">资源库管理</h2>
        </div>
        <p className="text-muted-foreground">
          整合精选数据与开源资源，为文本润色提供强大支持
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>同义词库</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.synonyms}</div>
            <p className="text-xs text-muted-foreground">精选高频词</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>低质量表达</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lowQuality}</div>
            <p className="text-xs text-muted-foreground">待优化项</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>AI特征</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.aiSignatures}</div>
            <p className="text-xs text-muted-foreground">可识别模式</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>学术规范</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.academic}</div>
            <p className="text-xs text-muted-foreground">标准转换</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>文言词汇</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.classical}</div>
            <p className="text-xs text-muted-foreground">风格转换</p>
          </CardContent>
        </Card>
      </div>

      {/* 主体内容 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <Layers className="h-4 w-4 mr-2" />
            资源总览
          </TabsTrigger>
          <TabsTrigger value="curated">
            <Sparkles className="h-4 w-4 mr-2" />
            精选数据
          </TabsTrigger>
          <TabsTrigger value="opensource">
            <Github className="h-4 w-4 mr-2" />
            开源方案
          </TabsTrigger>
          <TabsTrigger value="compare">
            <TrendingUp className="h-4 w-4 mr-2" />
            对比分析
          </TabsTrigger>
        </TabsList>

        {/* 资源总览 */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Input
                    placeholder="搜索词汇、类型或类别..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={selectedSource === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedSource('all')}
                  >
                    全部 ({allResources.length})
                  </Button>
                  <Button
                    variant={selectedSource === 'curated' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedSource('curated')}
                  >
                    精选
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-6">
                  {Object.entries(groupedResources).map(([type, items]) => (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{type}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {items.length} 条
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {items.map(item => (
                          <Card key={item.id} className="p-3">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{item.content}</span>
                                {item.frequency && (
                                  <Badge variant="secondary">
                                    <Star className="h-3 w-3 mr-1" />
                                    {item.frequency}
                                  </Badge>
                                )}
                                {item.severity && (
                                  <Badge 
                                    variant={
                                      item.severity === 'high' 
                                        ? 'destructive' 
                                        : item.severity === 'medium' 
                                          ? 'default' 
                                          : 'secondary'
                                    }
                                  >
                                    {item.severity}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {item.category}
                              </div>
                              {item.alternatives && item.alternatives.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {item.alternatives.slice(0, 3).map((alt, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {alt}
                                    </Badge>
                                  ))}
                                  {item.alternatives.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{item.alternatives.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 精选数据 */}
        <TabsContent value="curated" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 同义词库 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  同义词库
                </CardTitle>
                <CardDescription>高频词汇的精准替代方案</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {SYNONYM_DATABASE.slice(0, 10).map((item, idx) => (
                      <div key={idx} className="flex items-start justify-between p-2 rounded-lg bg-muted/50">
                        <div>
                          <div className="font-medium">{item.word}</div>
                          <div className="text-xs text-muted-foreground">{item.category}</div>
                        </div>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {item.synonyms.slice(0, 3).map((syn, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {syn}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* AI特征库 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  AI特征识别
                </CardTitle>
                <CardDescription>识别AI生成文本的典型模式</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {AI_GENERATION_SIGNATURES.slice(0, 8).map((item, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-muted/50 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{item.signature}</span>
                          <Badge variant="outline" className="text-xs">{item.category}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {item.humanAlternatives.map((alt, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {alt}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* 学术规范 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pen className="h-5 w-5" />
                  学术写作规范
                </CardTitle>
                <CardDescription>非正式表达 → 正式学术表达</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {ACADEMIC_WRITING_STANDARDS.slice(0, 10).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <span className="text-sm line-through text-muted-foreground">
                            {item.informal}
                          </span>
                          <span className="text-xs">→</span>
                          <span className="text-sm font-medium text-primary">
                            {item.formal}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">{item.context}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* 文言词汇 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  文言风格词库
                </CardTitle>
                <CardDescription>现代词汇 → 文学/古典风格</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {CLASSICAL_STYLE_VOCABULARY.slice(0, 12).map((item, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-muted/50 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{item.modern}</span>
                          <Badge variant="outline" className="text-xs">{item.context}</Badge>
                        </div>
                        <div className="flex gap-2 text-sm">
                          <span className="text-muted-foreground">文学:</span>
                          <span className="text-primary">{item.literary}</span>
                          <Separator orientation="vertical" className="h-4" />
                          <span className="text-muted-foreground">古典:</span>
                          <span className="text-primary">{item.classical}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 开源方案 */}
        <TabsContent value="opensource" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {RECOMMENDED_OPENSOURCE_PROJECTS.map((project, idx) => (
              <Card key={idx} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Github className="h-5 w-5" />
                        {project.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {project.description}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {project.stars}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-muted-foreground">用途:</span>
                    <span>{project.usage}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => window.open(project.repo, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    查看项目
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 集成建议 */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                集成建议
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">推荐方案: 轻量级集成</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• 核心功能使用精选数据（精准可控）</li>
                  <li>• 补充开源停用词库（覆盖更广）</li>
                  <li>• 按需导入开源同义词（扩展性强）</li>
                </ul>
              </div>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium">未来扩展: 深度集成</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• 接入 HanLP API（语义分析增强）</li>
                  <li>• 集成 Jieba 分词（精准词性识别）</li>
                  <li>• AI检测模型训练（自定义特征）</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 对比分析 */}
        <TabsContent value="compare" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>方案对比</CardTitle>
              <CardDescription>精选数据 vs 开源方案</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">维度</th>
                      <th className="text-left p-2">精选数据</th>
                      <th className="text-left p-2">开源方案</th>
                      <th className="text-left p-2">推荐策略</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-2 font-medium">数据量</td>
                      <td className="p-2">~100条精选</td>
                      <td className="p-2">10万+词汇</td>
                      <td className="p-2 text-primary">混合使用</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">准确性</td>
                      <td className="p-2">
                        <Badge variant="default">手工精选</Badge>
                      </td>
                      <td className="p-2">
                        <Badge variant="outline">有噪声</Badge>
                      </td>
                      <td className="p-2 text-primary">精选优先</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">易用性</td>
                      <td className="p-2">
                        <Badge variant="default">开箱即用</Badge>
                      </td>
                      <td className="p-2">
                        <Badge variant="outline">需二次开发</Badge>
                      </td>
                      <td className="p-2 text-primary">精选优势</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">更新频率</td>
                      <td className="p-2">
                        <Badge variant="outline">手动维护</Badge>
                      </td>
                      <td className="p-2">
                        <Badge variant="default">社区更新</Badge>
                      </td>
                      <td className="p-2 text-primary">开源优势</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">场景化</td>
                      <td className="p-2">
                        <Badge variant="default">专精润色</Badge>
                      </td>
                      <td className="p-2">
                        <Badge variant="outline">通用NLP</Badge>
                      </td>
                      <td className="p-2 text-primary">精选优势</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* 功能矩阵 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">✓ 精选数据优势</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-1" />
                    <span>针对文本润色场景优化，精准度高</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-1" />
                    <span>已集成到系统，无需额外开发</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-1" />
                    <span>数据可控，便于调试和优化</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-1" />
                    <span>分类清晰，符合用户使用习惯</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-blue-600">✓ 开源方案优势</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-blue-500 mt-1" />
                    <span>数据量大，覆盖范围广</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-blue-500 mt-1" />
                    <span>社区维护，持续更新迭代</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-blue-500 mt-1" />
                    <span>支持API调用，功能强大</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-blue-500 mt-1" />
                    <span>可扩展性强，适合长期发展</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
