# DrivEase React Native Firestore 연동 가이드 (초보자용)

이 문서는 DrivEase에서 이미 준비된 Firebase 스키마/인덱스/시드 파일을 기준으로,
처음부터 실행 가능한 순서대로 정리한 가이드입니다.

## 0) 현재 기준 파일
- Firebase 규칙: `/mnt/c/Users/Administrator/Documents/DrivEase/firestore.rules`
- Firestore 인덱스: `/mnt/c/Users/Administrator/Documents/DrivEase/firestore.indexes.json`
- CRUD 코드: `/mnt/c/Users/Administrator/Documents/DrivEase/src/lib/firestore/driveaseDb.ts`
- CRUD 샘플: `/mnt/c/Users/Administrator/Documents/DrivEase/scripts/react_native_firestore_crud.ts`
- 시드 데이터: `/mnt/c/Users/Administrator/Documents/DrivEase/scripts/create_drivease_firestore_seed.json`
- 시드 반영 스크립트: `/mnt/c/Users/Administrator/Documents/DrivEase/scripts/deploy_drivease_seed.sh`

---

## 1) 사전 준비 (반드시 먼저)

### 1-1. 프로젝트 폴더 이동
```bash
cd /mnt/c/Users/Administrator/Documents/DrivEase
```

### 1-2. 명령어는 `rtk`로 실행
이 저장소는 RTK 사용 규칙이 있으므로 아래처럼 `rtk`를 붙여 사용합니다.
```bash
rtk ls
rtk firebase --version
```

### 1-3. Firebase 인증 상태 확인
```bash
rtk firebase login
rtk gcloud auth list
```

### 1-4. 프로젝트 연결 확인
```bash
rtk cat .firebaserc
```
출력에 기본 프로젝트가 `drivease-2c384`인지 확인합니다.

---

## 2) Firestore 보안 규칙/인덱스 배포

준비되어 있는 규칙과 인덱스가 최신인지 반영합니다.

```bash
cd /mnt/c/Users/Administrator/Documents/DrivEase
rtk firebase deploy --only firestore:rules,firestore:indexes
```

성공하면 마지막에 `Deploy complete!`가 출력됩니다.

---

## 3) 기본 데이터(시나리오/가이드/메타) 등록

### 3-1. 시드 스크립트 실행
```bash
cd /mnt/c/Users/Administrator/Documents/DrivEase
bash scripts/deploy_drivease_seed.sh drivease-2c384
```

성공 시 `writeResults` 응답이 내려옵니다.

### 3-2. 콘솔에서 데이터 확인
- Firebase Console 데이터베이스 화면으로 이동
- `scenarios`, `guideProfiles`, `appMetadata` 컬렉션을 열어 문서 존재 확인

---

## 4) React Native 프로젝트에 Firebase 패키지 설치

앱 루트(React Native 앱 root)에서 실행하세요.

```bash
npm i @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/firestore
```

iOS는 아래를 추가 실행합니다.
```bash
cd ios && pod install && cd ..
```

---

## 5) Firebase 설정 파일 추가

Firebase Console에서 앱을 등록했다면 아래 파일을 앱 프로젝트에 추가해야 합니다.

- Android: `android/app/google-services.json`
- iOS: `ios/GoogleService-Info.plist`

등록되지 않으면 앱 실행은 되더라도 Firebase 연결이 실패합니다.

---

## 6) 코드 복사 위치 정리

현재 CRUD 함수는 아래 경로에 있습니다.
- `src/lib/firestore/driveaseDb.ts`

기존 앱 구조가 다르면 아래 중 한 가지로 복사하세요.

```bash
cp /mnt/c/Users/Administrator/Documents/DrivEase/src/lib/firestore/driveaseDb.ts /YOUR_APP_PATH/src/lib/firestore/driveaseDb.ts
```

다만 앱 파일 import 경로도 함께 바꿔야 합니다.

---

## 7) 처음부터 끝까지 사용 흐름 (예제)

### 7-1. 로그인
아래 예시는 최소 진행 흐름입니다.

```ts
import auth from '@react-native-firebase/auth';

await auth().signInWithEmailAndPassword('user@example.com', 'password123');
// 또는 익명로그인
// await auth().signInAnonymously();
```

### 7-2. 앱 메타/시나리오/가이드 읽기
```ts
import {
  getAppMetadata,
  getGuideProfiles,
  getPublishedScenarios,
} from 'src/lib/firestore/driveaseDb';

const meta = await getAppMetadata();
const guides = await getGuideProfiles();
const scenarios = await getPublishedScenarios();
```

### 7-3. 사용자 프로필 생성(또는 갱신)
```ts
import { getOrCreateUserProfile } from 'src/lib/firestore/driveaseDb';

await getOrCreateUserProfile({
  nickname: '홍길동',
  privacyConsented: true,
  gyroSensitivity: 'medium',
  parkingAssistAuto: true,
});
```

### 7-4. 세션 시작
```ts
import { startSession } from 'src/lib/firestore/driveaseDb';

const sessionId = await startSession({
  scenarioId: 'unplanned-pedestrian',
  guideLevel: 'beginner',
  vehicleType: 'compact-sedan',
  platform: 'ios',
  sensorSensitivity: 'medium'
});
```

### 7-5. 주행 중 이벤트 저장
```ts
import { appendSessionEvent } from 'src/lib/firestore/driveaseDb';

await appendSessionEvent(undefined, sessionId, {
  scenarioId: 'unplanned-pedestrian',
  t: Date.now(),
  type: 'reaction',
  data: {
    objectType: 'pedestrian',
    distanceM: 7.2,
    reactionMs: 870,
  },
});
```

### 7-6. 실시간 이벤트 구독(권장)
```ts
import { subscribeSessionEvents } from 'src/lib/firestore/driveaseDb';

const unsub = subscribeSessionEvents(
  undefined,
  sessionId,
  (rows) => {
    // rows를 화면 state에 반영
  },
  (err) => {
    console.error('실시간 구독 에러', err);
  }
);

// 화면에서 벗어나면 꼭 해제
unsub();
```

### 7-7. 세션 종료
```ts
import { finishSession } from 'src/lib/firestore/driveaseDb';

await finishSession(undefined, sessionId, {
  durationSec: 214,
  result: 'completed',
  totalScore: 86,
  metrics: {
    collision: { pedestrian: 0, wall: 0, vehicle: 0 },
    laneDeviationSec: 2.3,
    stoplineViolation: 0,
    reactionMs: 840,
    parkingErrorCm: 11,
  },
  feedback: {
    messages: ['초반 반응이 빨랐고, 급가속 제어가 안정적이었어요.'],
    highlights: ['안전거리 회복이 빠릅니다.'],
    scoreByCategory: {
      안전운전: 86,
      감정조절: 84,
      주차정확도: 85,
    },
  },
});
```

### 7-8. 최근/랭킹 조회, 피드백 저장
```ts
import {
  getRecentSessions,
  getTopSessions,
  addSessionFeedback,
} from 'src/lib/firestore/driveaseDb';

const recent = await getRecentSessions(undefined, { limit: 20 });
const top = await getTopSessions(undefined, { scenarioId: 'unplanned-pedestrian', limit: 10 });

await addSessionFeedback(undefined, {
  sessionId,
  category: 'general',
  message: '급정거 직전 보정이 빨랐습니다.',
  severity: 1,
});
```

### 7-9. 세션 삭제(이벤트 함께)
```ts
import { deleteSessionWithEvents } from 'src/lib/firestore/driveaseDb';

await deleteSessionWithEvents(undefined, sessionId);
```

---

## 8) 보안 규칙 동작 방식 (중요)

`firestore.rules`는 사용자 소유권 기준으로 보호되어 있습니다.

- `users/{uid}` 하위 데이터는 같은 UID의 로그인 사용자만 접근
- `session`/`event`/`feedback`도 동일하게 본인 것만 조회/작성

따라서 다음이 핵심입니다.

- `auth().currentUser`가 null이면 대부분 동작하지 않습니다.
- 세션/이벤트에는 UID 불일치 데이터가 들어가지 않도록 현재 코드가 내부에서 강제로 UID를 채웁니다.

---

## 9) 자주 나는 에러와 해결

### 9-1. `Missing or insufficient permissions`
원인: 로그인되지 않았거나 UID 불일치

해결:
1) `auth().currentUser` 확인
2) 세션/이벤트 작성 전에 로그인 처리

### 9-2. `FAILED_PRECONDITION: index not defined`
원인: `where + orderBy` 조합에 맞는 인덱스 없음

해결:
1) 에러 메시지에 나온 필드 순서 확인
2) `firestore.indexes.json`에 추가
3) `rtk firebase deploy --only firestore:indexes` 재배포

### 9-3. Seed 반영 실패
원인: 인증 토큰/JSON 형식 오류

해결:
1) `bash scripts/deploy_drivease_seed.sh drivease-2c384` 다시 실행
2) JSON의 따옴표 및 중괄호 쌍 확인

---

## 10) 체크리스트 (실패 줄이기)

- [ ] `rtk firebase login`
- [ ] `rtk firebase deploy --only firestore:rules,firestore:indexes`
- [ ] `bash scripts/deploy_drivease_seed.sh drivease-2c384`
- [ ] 앱 인증(로그인) 성공
- [ ] `getPublishedScenarios()` 정상 조회
- [ ] 세션 생성 및 이벤트 저장 성공
- [ ] 세션 종료 후 최근 목록 조회 성공

---

## 11) 다음 단계 (원하면 바로 해드릴 수 있는 것)

1. 위 함수를 기반으로 화면 1개(`src/screens/DriveSessionDemo.tsx`)를 작성해,
   로그인 → 시나리오 선택 → 세션 시작 → 이벤트 기록 → 종료까지 실제 동작 가능한 데모를 완성
2. 이벤트 payload 검증 스키마( `zod` ) 추가
3. iOS/Android 네이티브 빌드 실패 시 체크리스트까지 이어서 작성
