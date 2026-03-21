# 文本润色技术参考文档

本文档整理了成熟开源项目的核心实现，用于指导智能文本润色工具的开发。

## 📌 已集成的功能模块

基于开源项目参考，已在项目中实现以下工具模块：

### 1. 同义词工具模块 (`src/lib/synonym-utils.ts`)
- ✅ 近义词查找 (`getSynonyms`)
- ✅ 批量同义词替换 (`batchSynonymReplace`)
- ✅ 句子相似度计算 (`calculateSimilarity`)
- ✅ 关键词提取 (`extractKeywords`)
- ✅ 不可替换词保护（专业术语、标点等）

### 2. 文本纠错模块 (`src/lib/text-correction-utils.ts`)
- ✅ 音似词纠错（如：因该→应该）
- ✅ 形似词纠错（如：己→已）
- ✅ 成语纠错（如：穿流不息→川流不息）
- ✅ 语法检查（"的地得"用法）
- ✅ 自定义混淆集支持
- ✅ 完整文本检查 (`fullTextCheck`)

### 3. 润色评估模块 (`src/lib/polish-evaluator.ts`)
- ✅ 语义保持评估
- ✅ 错误纠正评估
- ✅ 可读性评估
- ✅ 词汇丰富度评估
- ✅ 人性化程度评估（AI检测）
- ✅ 结构优化评估
- ✅ 综合评分与建议生成

### 4. API接口 (`/api/text-tools`)
- ✅ 同义词查询接口
- ✅ 文本纠错接口
- ✅ 润色评估接口
- ✅ 关键词提取接口

---

## 一、Synonyms - 中文近义词工具包

**项目地址**: https://github.com/chatopera/Synonyms  
**核心功能**: 中文近义词查找、句子相似度计算、关键词提取

### 1.1 核心API

```python
import synonyms

# 近义词查找
# 返回: ([nearby_words], [nearby_words_score])
synonyms.nearby("人脸", size=10)
# 输出: (["图片", "图像", "脸部", ...], [0.597, 0.580, 0.530, ...])

# 句子相似度比较
similarity = synonyms.compare("发生历史性变革", "发生历史性变革", seg=True)
# 输出: 1.0

# 关键词提取
keywords = synonyms.keywords("文本内容...", topK=5, withWeight=False)

# 中文分词
words, flags = synonyms.seg("中文近义词工具包")

# 获取词向量
vector = synonyms.v("飞机")  # numpy array
```

### 1.2 技术实现要点

1. **词向量模型**: 基于 Word2Vec 训练，词汇量 435,729
2. **相似度计算**: 余弦相似度
3. **分词**: 集成 jieba 分词
4. **数据来源**: wikidata-corpus

### 1.3 可借鉴的实现思路

```python
# 同义词替换算法
def synonym_replacement(text, alpha=0.3):
    """
    同义词替换数据增强
    text: 原始文本
    alpha: 替换比例（占总词数）
    """
    words = list(jieba.cut(text))
    n = max(1, int(len(words) * alpha))
    replace_indices = random.sample(range(len(words)), n)
    
    for i in replace_indices:
        # 获取同义词列表，过滤相同词和低频词
        syns = [s for s in nearbys(words[i]) if s != words[i] and s[1] > 0.7]
        if syns:
            words[i] = random.choice([s[0] for s in syns[:3]])
    
    return ''.join(words)
```

---

## 二、pycorrector - 中文文本纠错工具包

**项目地址**: https://github.com/shibing624/pycorrector  
**核心功能**: 中文拼写纠错、语法纠错、专名纠错

### 2.1 支持的模型

| 模型 | 特点 | 效果 |
|------|------|------|
| Kenlm | 统计语言模型，速度快 | 一般 |
| MacBERT-CSC | 推荐模型，效果好 | 好 |
| T5-CSC | Seq2Seq模型 | 好 |
| ChatGLM3-CSC | GPT模型，效果好 | 很好 |
| Qwen2.5-CTC | 最新模型，支持多字/少字/语法 | 很好 |

### 2.2 核心API

```python
from pycorrector import Corrector

# 基础纠错
m = Corrector()
result = m.correct('少先队员因该为老人让坐')
# 输出: {'source': '...', 'target': '少先队员应该为老人让座', 
#        'errors': [('因该', '应该', 4), ('坐', '座', 10)]}

# 批量纠错
results = m.correct_batch(['句子1', '句子2'])

# 错误检测
idx_errors = m.detect('少先队员因该为老人让坐')
# 输出: [['因该', 4, 6, 'word'], ['坐', 10, 11, 'char']]

# 自定义混淆集
m = Corrector(custom_confusion_path_or_dict='./my_custom_confusion.txt')
```

### 2.3 纠错流程

```
输入文本
    ↓
分词处理 (jieba)
    ↓
错误检测 (语言模型/深度模型)
    ↓
候选生成 (音似/形似词典)
    ↓
候选排序 (困惑度/上下文)
    ↓
输出纠正结果
```

### 2.4 错误类型

1. **音似错误**: 拼音相同或相近（如：因该→应该）
2. **形似错误**: 字形相近（如：己→已）
3. **语法错误**: 词序、搭配错误
4. **专名错误**: 人名、地名、专有名词错误

---

## 三、LiteraSageAI - 文本润色Agent系统

**项目地址**: https://github.com/Xialiang98/LiteraSageAI  
**核心功能**: 多Agent协作的文本润色系统

### 3.1 项目架构

```
LiteraSageAI/
├── main.py              # 主程序入口
├── agents.py            # 定义Agent角色
├── engine.py            # 交互引擎
├── document_processor.py # 文档处理
├── conversation.py      # Agent对话流程
├── interface.py         # Gradio界面
├── config.py            # 系统配置
├── models.py            # 数据模型
└── utils.py             # 工具函数
```

### 3.2 核心特性

1. **多Agent协作**: 不同角色负责不同润色任务
2. **交互式润色**: 用户可参与润色过程
3. **参考文档学习**: 从上传的参考文档中学习写作风格
4. **DeepSeek API**: 使用大语言模型进行润色

---

## 四、中文BERT-wwm 数据增强方法

### 4.1 同义词替换三种实现方案

#### 方案1: 基于词典的基础替换法

```python
import jieba
import random
from synonyms import nearbys

def synonym_replacement(text, alpha=0.3):
    """
    同义词替换数据增强
    text: 原始文本
    alpha: 替换比例（占总词数）
    """
    words = list(jieba.cut(text))
    n = max(1, int(len(words) * alpha))
    replace_indices = random.sample(range(len(words)), n)
    
    for i in replace_indices:
        syns = [s for s in nearbys(words[i]) if s != words[i] and s[1] > 0.7]
        if syns:
            words[i] = random.choice([s[0] for s in syns[:3]])
    
    return ''.join(words)
```

#### 方案2: 基于词向量的智能替换法

```python
from gensim.models import KeyedVectors

# 加载中文词向量
word_vectors = KeyedVectors.load_word2vec_format('Tencent_AILab_ChineseEmbedding.bin', binary=True)

def vector_based_replacement(text, alpha=0.3):
    words = list(jieba.cut(text))
    n = max(1, int(len(words) * alpha))
    replace_indices = [i for i, word in enumerate(words) if word in word_vectors]
    
    for i in random.sample(replace_indices, min(n, len(replace_indices))):
        similar_words = [w for w, _ in word_vectors.most_similar(words[i], topn=5) if w != words[i]]
        if similar_words:
            words[i] = random.choice(similar_words)
    
    return ''.join(words)
```

#### 方案3: 结合词性标注的选择性替换法

```python
import jieba.posseg as pseg

def pos_aware_replacement(text, alpha=0.3):
    words = [(word, flag) for word, flag in pseg.cut(text)]
    n = max(1, int(len(words) * alpha))
    # 仅替换名词、形容词、副词（排除动词、代词、否定词）
    replace_candidates = [i for i, (word, flag) in enumerate(words) 
                         if flag.startswith(('n', 'a', 'd')) and len(word) > 1]
    
    for i in random.sample(replace_candidates, min(n, len(replace_candidates))):
        word = words[i][0]
        syns = [s for s in nearbys(word) if s != word and s[1] > 0.65]
        if syns:
            words[i] = (random.choice([s[0] for s in syns[:2]]), words[i][1])
    
    return ''.join([word for word, _ in words])
```

### 4.2 回译技术

```python
from transformers import pipeline

# 加载翻译模型
zh2en = pipeline("translation", model="Helsinki-NLP/opus-mt-zh-en")
en2zh = pipeline("translation", model="Helsinki-NLP/opus-mt-en-zh")

def back_translation(text):
    # 中文→英文→中文
    en_text = zh2en(text, max_length=128)[0]['translation_text']
    zh_text = en2zh(en_text, max_length=128)[0]['translation_text']
    return zh_text
```

---

## 五、质量评估指标

### 5.1 文本相似度评估

```python
# 使用BLEU评分
from nltk.translate.bleu_score import sentence_bleu

def bleu_score(reference, candidate):
    return sentence_bleu([reference.split()], candidate.split())

# 使用ROUGE评分
from rouge import Rouge

def rouge_score(reference, candidate):
    rouge = Rouge()
    return rouge.get_scores(candidate, reference)
```

### 5.2 AI检测评分

当前项目已实现的AI检测特征：
- 困惑度 (Perplexity)
- 词汇丰富度
- 句子长度分布
- 用词模式分析
- 语法复杂度

---

## 六、应用到当前项目的建议

### 6.1 同义词替换模块

基于Synonyms库实现：
1. 集成synonyms.nearby()获取近义词
2. 基于词性过滤可替换词
3. 保持语义一致性

### 6.2 文本纠错模块

基于pycorrector实现：
1. 使用MacBERT-CSC模型进行拼写纠错
2. 自定义混淆集处理专业术语
3. 集成到润色流程中

### 6.3 润色质量评估

1. 使用synonyms.compare()比较原文与润色后文本
2. 计算BLEU/ROUGE分数
3. 使用AI检测评估润色效果

---

## 七、参考资源

- [Synonyms GitHub](https://github.com/chatopera/Synonyms)
- [pycorrector GitHub](https://github.com/shibing624/pycorrector)
- [LiteraSageAI GitHub](https://github.com/Xialiang98/LiteraSageAI)
- [Chinese-BERT-wwm](https://github.com/ymcui/Chinese-BERT-wwm)
- [同义词词林扩展版](https://github.com/gingin/Lake-Of-Words)
