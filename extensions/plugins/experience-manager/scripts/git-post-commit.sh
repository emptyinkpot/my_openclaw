#!/bin/bash
# Git post-commit hook - 自动积累经验
# 将此脚本复制到 .git/hooks/post-commit 并添加执行权限

# 获取本次commit信息
COMMIT_MSG=$(git log -1 --pretty=format:"%s")
COMMIT_HASH=$(git log -1 --pretty=format:"%h")
COMMIT_DATE=$(date +%s)

# 经验数据文件路径
EXPERIENCE_FILE="/workspace/projects/apps/experience-manager/data/experiences.json"

# 如果提交消息包含特定标记，则记录经验
if echo "$COMMIT_MSG" | grep -qE "(fix|feat|refactor|docs):"; then
    # 解析提交类型
    if echo "$COMMIT_MSG" | grep -q "^fix:"; then
        EXP_TYPE="bug_fix"
        DIFFICULTY=3
        XP=100
    elif echo "$COMMIT_MSG" | grep -q "^feat:"; then
        EXP_TYPE="feature_dev"
        DIFFICULTY=4
        XP=150
    elif echo "$COMMIT_MSG" | grep -q "^refactor:"; then
        EXP_TYPE="refactoring"
        DIFFICULTY=4
        XP=120
    elif echo "$COMMIT_MSG" | grep -q "^docs:"; then
        EXP_TYPE="learning"
        DIFFICULTY=2
        XP=50
    else
        EXP_TYPE="optimization"
        DIFFICULTY=3
        XP=80
    fi
    
    # 生成经验记录ID
    EXP_ID="exp_${COMMIT_DATE}_${COMMIT_HASH}"
    
    # 创建经验记录JSON
    cat >> /tmp/auto_experience.json << EOF
    {
      "type": "${EXP_TYPE}",
      "title": "${COMMIT_MSG#*: }",
      "description": "通过Git自动记录的开发活动。提交: ${COMMIT_HASH}",
      "userQuery": "Git自动记录",
      "solution": "${COMMIT_MSG}",
      "experienceApplied": ["Git工作流程"],
      "experienceGained": ["自动化记录"],
      "tags": ["git", "auto", "${EXP_TYPE}"],
      "difficulty": ${DIFFICULTY},
      "xpGained": ${XP},
      "id": "${EXP_ID}",
      "timestamp": ${COMMIT_DATE}000
    }
EOF
    
    echo "✓ 已自动生成经验记录: ${EXP_ID} (+${XP} XP)"
fi
