/**
 * 测试流水线发布功能
 */

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:5000';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || 'e1647cdb-1b80-4eee-a975-7599160cc89b';

async function test() {
  console.log('=== 测试流水线发布 ===\n');
  
  // 1. 检查番茄作品
  console.log('1. 获取番茄作品列表...');
  const worksRes = await fetch(`${GATEWAY_URL}/api/novel/fanqie/works`, {
    headers: { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }
  });
  const worksData = await worksRes.json();
  console.log(`   找到 ${worksData.data?.length || 0} 个番茄作品`);
  
  // 2. 检查本地作品
  console.log('\n2. 获取本地作品列表...');
  const localRes = await fetch(`${GATEWAY_URL}/api/novel/works`, {
    headers: { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }
  });
  const localData = await localRes.json();
  console.log(`   找到 ${localData.data?.length || 0} 个本地作品`);
  
  // 3. 匹配作品
  console.log('\n3. 匹配番茄作品和本地作品...');
  const fanqieWorks = worksData.data || [];
  const localWorks = localData.data || [];
  
  for (const fw of fanqieWorks) {
    const match = localWorks.find((lw: any) => 
      lw.title === fw.title || 
      lw.title.includes(fw.title) || 
      fw.title.includes(lw.title)
    );
    if (match) {
      console.log(`   ✓ "${fw.title}" -> 本地ID: ${match.id}`);
    } else {
      console.log(`   ✗ "${fw.title}" -> 无匹配`);
    }
  }
  
  // 4. 测试发布（dryRun 模式）
  console.log('\n4. 测试发布流程 (dryRun)...');
  const testWork = fanqieWorks.find((w: any) => 
    localWorks.some((lw: any) => lw.title.includes(w.title) || w.title.includes(lw.title))
  );
  
  if (testWork) {
    const progressId = `test_${Date.now()}`;
    console.log(`   选择作品: ${testWork.title}`);
    console.log(`   Progress ID: ${progressId}`);
    
    const publishRes = await fetch(`${GATEWAY_URL}/api/novel/fanqie/publish`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        workId: testWork.work_id,
        dryRun: true,
        headless: true,
        skipAudit: true,
        progressId
      })
    });
    
    const publishData = await publishRes.json();
    console.log('   发布结果:', publishData);
    
    // 5. 订阅 SSE 进度
    console.log('\n5. 订阅 SSE 进度...');
    const sseUrl = `${GATEWAY_URL}/novel/sse/progress/${progressId}?token=${GATEWAY_TOKEN}`;
    console.log(`   SSE URL: ${sseUrl}`);
    
    const eventSource = new EventSource(sseUrl);
    
    eventSource.onopen = () => {
      console.log('   SSE 连接已建立');
    };
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log(`   进度: [${data.step}] ${data.task} (${data.percent}%)`);
      
      if (data.status === 'completed' || data.status === 'error') {
        eventSource.close();
        console.log('\n=== 测试完成 ===');
        console.log('结果:', data);
        process.exit(0);
      }
    };
    
    eventSource.onerror = (err) => {
      console.error('   SSE 错误:', err);
      eventSource.close();
      process.exit(1);
    };
    
    // 超时处理
    setTimeout(() => {
      console.log('\n   超时，关闭连接');
      eventSource.close();
      process.exit(0);
    }, 30000);
    
  } else {
    console.log('   没有找到可测试的作品');
  }
}

test().catch(console.error);
