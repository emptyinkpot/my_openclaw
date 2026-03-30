# OpenClaw 灏忚绠＄悊绯荤粺 - 鏋舵瀯瑙勫垯涓庢渶浣冲疄璺?
> 鏈枃妗ｆ€荤粨浜嗛」鐩灦鏋勩€侀厤缃鍒欍€佸父瑙侀棶棰樺強瑙ｅ喅鏂规锛屼緵鍚庣画寮€鍙戝拰缁存姢鍙傝€冦€?
---

## 涓€銆侀」鐩灦鏋勬瑙?
### 1.1 鐩綍缁撴瀯

```
/workspace/projects/
鈹溾攢鈹€ openclaw.json          # OpenClaw 鏍稿績閰嶇疆鏂囦欢
鈹溾攢鈹€ workspace/             # OpenClaw 宸ヤ綔绌洪棿
鈹溾攢鈹€ extensions/            # 鎻掍欢鐩綍锛堜富瑕佸紑鍙戝尯鍩燂級
鈹?  鈹溾攢鈹€ novel-manager/     # 灏忚绠＄悊鎻掍欢
鈹?  鈹?  鈹溾攢鈹€ index.ts       # 鎻掍欢鍏ュ彛锛圓PI璺敱娉ㄥ唽锛?鈹?  鈹?  鈹溾攢鈹€ public/        # 鍓嶇椤甸潰
鈹?  鈹?  鈹?  鈹溾攢鈹€ index.html # 灏忚绠＄悊涓婚〉闈?鈹?  鈹?  鈹?  鈹溾攢鈹€ auto.html  # 鑷姩鍖栭〉闈?鈹?  鈹?  鈹?  鈹溾攢鈹€ experience.html # 缁忛獙椤甸潰
鈹?  鈹?  鈹?  鈹斺攢鈹€ cache.html # 缂撳瓨椤甸潰
鈹?  鈹?  鈹溾攢鈹€ core/          # 鏍稿績閫昏緫
鈹?  鈹?  鈹?  鈹溾攢鈹€ config.ts  # 妯″潡閰嶇疆
鈹?  鈹?  鈹?  鈹溾攢鈹€ database.ts # 鏁版嵁搴撶鐞?鈹?  鈹?  鈹?  鈹斺攢鈹€ pipeline/  # 娴佹按绾?鈹?  鈹?  鈹?      鈹溾攢鈹€ FanqieScanner.ts  # 鐣寗鎵弿
鈹?  鈹?  鈹?      鈹斺攢鈹€ FanqiePublisher.ts # 鐣寗鍙戝竷
鈹?  鈹?  鈹斺攢鈹€ services/      # 鏈嶅姟灞?鈹?  鈹?      鈹溾攢鈹€ novel-service.ts # 灏忚鏈嶅姟
鈹?  鈹?      鈹斺攢鈹€ fanqie-sync-service.ts # 鐣寗鍚屾
鈹?  鈹斺攢鈹€ experience-manager/ # 缁忛獙绠＄悊鎻掍欢
鈹?      鈹斺攢鈹€ data/
鈹?          鈹斺攢鈹€ experiences.json # 缁忛獙鏁版嵁鏂囦欢
鈹溾攢鈹€ browser/               # 娴忚鍣ㄦ暟鎹洰褰?鈹?  鈹溾攢鈹€ fanqie-account-1/  # 鐣寗璐﹀彿1
鈹?  鈹斺攢鈹€ fanqie-account-2/  # 鐣寗璐﹀彿2
鈹溾攢鈹€ cookies-accounts/      # Cookie瀛樺偍
鈹斺攢鈹€ scripts/               # 鍚姩鑴氭湰锛堝嬁淇敼锛?    鈹溾攢鈹€ start.sh
    鈹溾攢鈹€ restart.sh
    鈹斺攢鈹€ stop.sh
```

### 1.2 鏋舵瀯鍒嗗眰

```
鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?鈹?                   鍓嶇椤甸潰灞?                           鈹?鈹? extensions/novel-manager/public/*.html                 鈹?鈹? - 缁熶竴瀵艰埅鏍忥紙nav-bar锛?                                鈹?鈹? - API 灏佽锛坅pi() 鍑芥暟 + Bearer Token锛?               鈹?鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?                          鈫?HTTP/WebSocket
鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?鈹?                   Gateway 缃戝叧灞?                       鈹?鈹? 绔彛: 5000                                             鈹?鈹? 璁よ瘉: Bearer Token (CHANGE_ME_GATEWAY_TOKEN)鈹?鈹? 璺敱: 鎻掍欢娉ㄥ唽璺敱 + 鍘熺敓璺敱                           鈹?鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?                          鈫?鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?鈹?                   鎻掍欢灞?                               鈹?鈹? extensions/novel-manager/index.ts                      鈹?鈹? - 娉ㄥ唽椤甸潰璺敱锛?銆?novel/銆?auto.html 绛夛級            鈹?鈹? - 娉ㄥ唽 API 璺敱锛?api/novel/*锛?                       鈹?鈹? - 璁よ瘉妯″紡: auth: 'plugin'锛堟棤闇€鐧诲綍锛?                鈹?鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?                          鈫?鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?鈹?                   鏈嶅姟灞?                               鈹?鈹? extensions/novel-manager/services/                     鈹?鈹? - NovelService: 灏忚鏁版嵁鎿嶄綔                           鈹?鈹? - FanqieSyncService: 鐣寗鍚屾閫昏緫                      鈹?鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?                          鈫?鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?鈹?                   鏍稿績灞?                               鈹?鈹? extensions/novel-manager/core/                         鈹?鈹? - FanqieScanner: Playwright 鎵弿鐣寗浣滃搧               鈹?鈹? - FanqiePublisher: 绔犺妭鍙戝竷娴佺▼                        鈹?鈹? - DatabaseManager: MySQL 杩炴帴姹?                       鈹?鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?                          鈫?鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?鈹?                   鏁版嵁灞?                               鈹?鈹? MySQL: app_db                      鈹?鈹? - works: 浣滃搧琛?                                       鈹?鈹? - chapters: 绔犺妭琛?                                    鈹?鈹? - fanqie_works: 鐣寗浣滃搧缂撳瓨                           鈹?鈹? JSON: experiences.json锛堢粡楠屾暟鎹級                     鈹?鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?```

---

## 浜屻€侀厤缃鍒?
### 2.1 openclaw.json 鏍稿績閰嶇疆

```json
{
  "gateway": {
    "port": 5000,                    // 绔彛鍥哄畾锛屽嬁淇敼
    "mode": "local",
    "bind": "lan",
    "auth": {
      "mode": "token",
      "token": "CHANGE_ME_GATEWAY_TOKEN"
    },
    "controlUi": {
      "dangerouslyDisableDeviceAuth": true  // 绂佺敤璁惧璁よ瘉
    }
  },
  "plugins": {
    "load": {
      "paths": [
        "/workspace/projects/extensions/novel-manager",
        "/workspace/projects/extensions/experience-manager"
      ]
    },
    "entries": {
      "novel-manager": { "enabled": true },
      "experience-manager": { "enabled": true }
    }
  }
}
```

**閲嶈瑙勫垯锛?*

1. **gateway.port** 鍥哄畾涓?5000锛屼慨鏀逛細瀵艰嚧 Web 棰勮澶辨晥
2. **gateway.auth.token** 鐢ㄤ簬 API 璁よ瘉锛屽墠绔渶鎼哄甫 `Authorization: Bearer <token>`
3. **plugins.load.paths** 鎸囧畾鎻掍欢鍔犺浇鐩綍
4. **models.providers.coze** 鐨?apiKey 鍜?baseUrl 绂佹淇敼

### 2.2 妯″潡閰嶇疆 (core/config.ts)

```typescript
{
  database: {
    type: 'mysql',
    host: '127.0.0.1',
    port: 22295,
    user: 'openclaw',
    password: 'CHANGE_ME_DB_PASSWORD',
    database: 'app_db'
  },
  scheduler: {
    fanqieAccounts: [
      {
        id: 'account_1',
        name: '鐣寗璐﹀彿1',
        browserDir: '/workspace/projects/browser/fanqie-account-1',
        cookiesFile: '/workspace/projects/cookies-accounts/fanqie-20260314-030709.json'
      }
    ]
  }
}
```

### 2.3 鏁版嵁搴撹〃瀛楃闆?
**蹇呴』浣跨敤 utf8mb4 瀛楃闆嗭細**

```sql
CREATE TABLE fanqie_works (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  ...
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**閿欒绀轰緥锛?*
```
Error: Conversion from collation utf8mb4_unicode_ci into latin1_swedish_ci impossible
```

**鍘熷洜锛?* 琛ㄦ垨瀛楁浣跨敤浜嗛粯璁ょ殑 latin1 瀛楃闆嗭紝鏃犳硶瀛樺偍涓枃銆?
---

## 涓夈€丄PI 璺敱瑙勫垯

### 3.1 椤甸潰璺敱锛堟棤闇€璁よ瘉锛?
| 璺敱 | 鏂囦欢 | 璇存槑 |
|------|------|------|
| `/` | native.html | OpenClaw 鍘熺敓鐣岄潰 |
| `/novel/` | index.html | 灏忚绠＄悊涓婚〉闈?|
| `/auto.html` | auto.html | 鑷姩鍖栭〉闈?|
| `/experience.html` | experience.html | 缁忛獙椤甸潰 |
| `/cache.html` | cache.html | 缂撳瓨椤甸潰 |

### 3.2 API 璺敱锛堥渶瑕佽璇侊級

| 璺敱 | 鏂规硶 | 璇存槑 |
|------|------|------|
| `/api/novel/works` | GET | 鑾峰彇浣滃搧鍒楄〃 |
| `/api/novel/stats` | GET | 鑾峰彇缁熻鏁版嵁 |
| `/api/novel/fanqie/works` | GET | 鑾峰彇鐣寗浣滃搧 |
| `/api/novel/fanqie/scan` | POST | 瑙﹀彂鐣寗鎵弿 |
| `/api/novel/experience/records` | GET | 鑾峰彇缁忛獙璁板綍 |
| `/api/novel/experience/stats` | GET | 鑾峰彇缁忛獙缁熻 |
| `/api/novel/schedules` | GET | 鑾峰彇璋冨害鍒楄〃 |

### 3.3 鍓嶇 API 灏佽

```javascript
const GATEWAY_TOKEN = 'CHANGE_ME_GATEWAY_TOKEN';
const API_BASE = '/api/novel';

async function api(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${GATEWAY_TOKEN}`,
    ...(options.headers || {})
  };
  const res = await fetch(API_BASE + endpoint, { ...options, headers });
  return res.json();
}
```

---

## 鍥涖€佸父瑙侀棶棰樹笌瑙ｅ喅鏂规

### 4.1 鏁版嵁搴撹繛鎺ラ棶棰?
**闂锛?* `Error: connect ETIMEDOUT`

**鍘熷洜锛?* MySQL 杩炴帴姹犺秴鏃?
**瑙ｅ喅锛?*
```typescript
pool = mysql.createPool({
  connectTimeout: 10000,  // 澧炲姞瓒呮椂鏃堕棿
  waitForConnections: true,
  connectionLimit: 5
});
```

### 4.2 瀛楃闆嗕笉鍏煎

**闂锛?* `Conversion from collation utf8mb4_unicode_ci into latin1_swedish_ci impossible`

**瑙ｅ喅锛?* 鍒犻櫎鏃ц〃锛岄噸鏂板垱寤烘椂鏄惧紡鎸囧畾瀛楃闆嗭細
```sql
DROP TABLE IF EXISTS fanqie_works;
CREATE TABLE fanqie_works (...) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 4.3 鐣寗鎵弿鏃犳暟鎹?
**闂锛?* 鎵弿杩斿洖绌烘暟缁?
**鎺掓煡姝ラ锛?*
1. 妫€鏌?Cookie 鏂囦欢鏄惁瀛樺湪
2. 妫€鏌ユ祻瑙堝櫒鐩綍鏉冮檺
3. 鎵嬪姩杩愯鎵弿鑴氭湰娴嬭瘯锛?```bash
cd extensions/novel-manager
node -e "const {getFanqieScanner}=require('./dist/core/pipeline/FanqieScanner'); getFanqieScanner().scan().then(r=>console.log(r))"
```

### 4.4 TypeScript 缂栬瘧鍚庢湭鐢熸晥

**闂锛?* 淇敼浠ｇ爜鍚?API 琛屼负鏈彉

**瑙ｅ喅锛?* 姣忔淇敼鍚庡繀椤荤紪璇戯細
```bash
cd extensions/novel-manager && pnpm build
./scripts/restart.sh
```

### 4.5 Gateway 鏈惎鍔?
**闂锛?* API 杩斿洖绌烘垨杩炴帴鎷掔粷

**鎺掓煡锛?*
```bash
# 妫€鏌ョ鍙?curl -I http://localhost:5000

# 妫€鏌ヨ繘绋?ps aux | grep openclaw

# 閲嶅惎鏈嶅姟
./scripts/restart.sh
```

---

## 浜斻€佸紑鍙戣鑼?
### 5.1 浠ｇ爜淇敼娴佺▼

1. **淇敼 TypeScript 婧愮爜** 鈫?`extensions/novel-manager/**/*.ts`
2. **缂栬瘧** 鈫?`pnpm build`
3. **閲嶅惎鏈嶅姟** 鈫?`./scripts/restart.sh`
4. **楠岃瘉** 鈫?`curl` 娴嬭瘯 API

### 5.2 鏁版嵁搴撹〃鍒涘缓

```typescript
async initTables() {
  // 鍏堝垹闄ゆ棫琛紙閬垮厤瀛楃闆嗛棶棰橈級
  await this.db.execute(`DROP TABLE IF EXISTS table_name`).catch(() => {});
  
  // 鍒涘缓鏂拌〃锛屾樉寮忔寚瀹氬瓧绗﹂泦
  await this.db.execute(`
    CREATE TABLE table_name (
      id INT PRIMARY KEY AUTO_INCREMENT,
      content TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}
```

### 5.3 缁忛獙鏁版嵁婧?
缁忛獙鏁版嵁瀛樺偍鍦?`extensions/experience-manager/data/experiences.json`锛屾牸寮忥細

```json
{
  "records": [
    {
      "type": "problem_solving|bug_fix|feature_dev|refactoring|learning|optimization",
      "title": "鏍囬",
      "description": "鎻忚堪",
      "userQuery": "鐢ㄦ埛闂",
      "solution": "瑙ｅ喅鏂规",
      "experienceApplied": ["搴旂敤鐨勭粡楠?],
      "experienceGained": ["鏂拌幏寰楃殑缁忛獙"],
      "tags": ["鏍囩"],
      "difficulty": 1-5,
      "xpGained": 50-500,
      "id": "exp_timestamp_random",
      "timestamp": 1773942000000
    }
  ]
}
```

---

## 鍏€佸叧閿粡楠屾€荤粨

### 6.1 鏋舵瀯鐩稿叧

1. **鎻掍欢璺敱浼樺厛**锛歄penClaw 椤甸潰閫氳繃鎻掍欢娉ㄥ唽璺敱锛屼笉鏄潤鎬佹枃浠舵湇鍔?2. **璁よ瘉缁熶竴**锛氭墍鏈?API 浣跨敤 Bearer Token锛屽墠绔繀椤绘惡甯?3. **瀛楃闆嗗己鍒?utf8mb4**锛歁ySQL 琛ㄥ繀椤绘樉寮忔寚瀹氬瓧绗﹂泦锛屽惁鍒欎腑鏂囧瓨鍌ㄥけ璐?4. **缂栬瘧蹇呴』閲嶅惎**锛歍ypeScript 缂栬瘧鍚庡繀椤婚噸鍚?Gateway 鎵嶈兘鐢熸晥

### 6.2 璋冭瘯鐩稿叧

1. **鏃ュ織浣嶇疆**锛歚/app/work/logs/bypass/dev.log`
2. **API 娴嬭瘯**锛氫娇鐢?`curl -H "Authorization: Bearer <token>"`
3. **鎵弿璋冭瘯**锛氱洿鎺ヨ繍琛?Node 鑴氭湰锛屼笉缁忚繃 Gateway

### 6.3 鏁版嵁鐩稿叧

1. **缁忛獙鏁版嵁**锛欽SON 鏂囦欢浼樺厛锛屾暟鎹簱浣滀负澶囦唤
2. **鐣寗鏁版嵁**锛氭壂鎻忓悗缂撳瓨鍒版暟鎹簱鍜?JSON 鏂囦欢
3. **璐﹀彿ID鏄犲皠**锛歚account_1` 鈫?`1`锛岄渶瑕佽浆鎹㈡墠鑳藉瓨鍏?INT 瀛楁

---

## 涓冦€佸揩閫熷懡浠ゅ弬鑰?
```bash
# 缂栬瘧鎻掍欢
cd extensions/novel-manager && pnpm build

# 閲嶅惎鏈嶅姟
./scripts/restart.sh

# 娴嬭瘯 API
curl -H "Authorization: Bearer CHANGE_ME_GATEWAY_TOKEN" http://127.0.0.1:5000/api/novel/works

# 娴嬭瘯鐣寗鎵弿
curl -X POST -H "Authorization: Bearer CHANGE_ME_GATEWAY_TOKEN" http://127.0.0.1:5000/api/novel/fanqie/scan

# 鏌ョ湅鏃ュ織
tail -50 /app/work/logs/bypass/dev.log

# 鎵嬪姩鎵弿娴嬭瘯
cd extensions/novel-manager && node -e "require('./dist/core/pipeline/FanqieScanner').getFanqieScanner().scan().then(r=>console.log(JSON.stringify(r,null,2)))"
```

---

*鏂囨。鐗堟湰: 1.0 | 鏈€鍚庢洿鏂? 2026-03-20*

