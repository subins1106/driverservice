/**
 * DrivEase React Native Firestore CRUD 샘플
 * - Firebase JS SDK v18+/React Native Firebase 패턴 기준
 * - auth()에서 uid를 자동 추출하며, 필요 시 uid 파라미터로 덮어쓰기 가능
 */

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const db = firestore();

const toDoc = <T extends Record<string, unknown>>(snapshot: any): T & { id: string } => ({
  id: snapshot.id,
  ...(snapshot.data() as T),
});

const resolveUid = (uid?: string): string => {
  const userId = uid ?? auth().currentUser?.uid;
  if (!userId) {
    throw new Error('Firebase Auth 로그인 상태가 필요합니다.');
  }
  return userId;
};

const userRef = (uid: string) => db.collection('users').doc(uid);
const sessionsRef = (uid: string) => userRef(uid).collection('sessions');
const sessionRef = (uid: string, sessionId: string) => sessionsRef(uid).doc(sessionId);
const eventsRef = (uid: string, sessionId: string) =>
  sessionRef(uid, sessionId).collection('events');
const feedbackRef = (uid: string) => userRef(uid).collection('feedback');

export type SessionCreateInput = {
  scenarioId: string;
  guideLevel: 'beginner' | 'intermediate' | 'advanced';
  vehicleType: string;
  platform: 'ios' | 'android';
  sensorSensitivity: 'low' | 'medium' | 'high';
};

export type SessionFinishInput = {
  durationSec: number;
  result: 'completed' | 'abandoned' | 'fail' | 'success';
  totalScore: number;
  metrics: {
    collision: {
      pedestrian: number;
      wall: number;
      vehicle: number;
    };
    laneDeviationSec: number;
    stoplineViolation: number;
    reactionMs: number;
    parkingErrorCm?: number;
  };
  feedback: {
    messages: string[];
    highlights: string[];
    scoreByCategory: {
      안전운전: number;
      감정조절: number;
      주차정확도: number;
    };
  };
};

const makeInitialSessionPayload = (input: SessionCreateInput) => ({
  userId: '',
  scenarioId: input.scenarioId,
  guideLevel: input.guideLevel,
  vehicleType: input.vehicleType,
  device: {
    platform: input.platform,
    sensorSensitivity: input.sensorSensitivity,
  },
  startedAt: firestore.FieldValue.serverTimestamp(),
  endedAt: null,
  durationSec: 0,
  result: 'abandoned',
  totalScore: 0,
  metrics: {
    collision: { pedestrian: 0, wall: 0, vehicle: 0 },
    laneDeviationSec: 0,
    stoplineViolation: 0,
    reactionMs: 0,
    parkingErrorCm: 0,
  },
  feedback: {
    messages: [],
    highlights: [],
    scoreByCategory: { 안전운전: 0, 감정조절: 0, 주차정확도: 0 },
  },
  createdAt: firestore.FieldValue.serverTimestamp(),
  updatedAt: firestore.FieldValue.serverTimestamp(),
});

export const getPublishedScenarios = async () => {
  const snap = await db
    .collection('scenarios')
    .where('isPublished', '==', true)
    .orderBy('order', 'asc')
    .get();

  return snap.docs.map((d) => toDoc<Record<string, unknown>>(d));
};

export const getGuideProfiles = async () => {
  const snap = await db.collection('guideProfiles').get();
  return snap.docs.map((d) => toDoc<Record<string, unknown>>(d));
};

export const getAppMetadata = async () => {
  const doc = await db.collection('appMetadata').doc('config').get();
  if (!doc.exists) return null;
  return toDoc<Record<string, unknown>>(doc);
};

export const getOrCreateUserProfile = async ({
  uid,
  nickname,
  privacyConsented = true,
  gyroSensitivity = 'medium',
  parkingAssistAuto = false,
}: {
  uid?: string;
  nickname?: string;
  privacyConsented?: boolean;
  gyroSensitivity?: 'low' | 'medium' | 'high';
  parkingAssistAuto?: boolean;
}) => {
  const userId = resolveUid(uid);

  await userRef(userId).set(
    {
      profile: {
        nickname,
        privacyConsented,
        settings: {
          gyroSensitivity,
          parkingAssistAuto,
        },
      },
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return userId;
};

export const startSession = async (input: SessionCreateInput, uid?: string) => {
  const userId = resolveUid(uid);
  const payload = makeInitialSessionPayload(input);
  payload.userId = userId;

  const ref = await sessionsRef(userId).add(payload);
  return ref.id;
};

export const appendSessionEvent = async (
  uid: string | undefined,
  sessionId: string,
  event: {
    sessionId?: string;
    scenarioId: string;
    t: number;
    type: 'collision' | 'lane' | 'reaction' | 'parking' | 'feedback' | 'state';
    data: Record<string, unknown>;
    userId?: string;
  }
) => {
  const userId = resolveUid(uid);
  return eventsRef(userId, sessionId).add({
    ...event,
    userId,
    sessionId,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });
};

export const getSessionEvents = async (uid: string | undefined, sessionId: string) => {
  const userId = resolveUid(uid);
  const snap = await eventsRef(userId, sessionId).orderBy('t', 'asc').get();
  return snap.docs.map((d) => toDoc<Record<string, unknown>>(d));
};

export const subscribeSessionEvents = (
  uid: string | undefined,
  sessionId: string,
  onData: (rows: Array<Record<string, unknown> & { id: string }>) => void,
  onError?: (error: unknown) => void
) => {
  const userId = resolveUid(uid);

  return eventsRef(userId, sessionId)
    .orderBy('t', 'asc')
    .onSnapshot(
      (snapshot) => {
        onData(snapshot.docs.map((d) => toDoc<Record<string, unknown>>(d)));
      },
      (error) => {
        if (onError) onError(error);
      }
    );
};

export const finishSession = async (
  uid: string | undefined,
  sessionId: string,
  input: SessionFinishInput
) => {
  const userId = resolveUid(uid);
  const now = firestore.FieldValue.serverTimestamp();

  await sessionRef(userId, sessionId).update({
    ...input,
    endedAt: now,
    updatedAt: now,
  });
};

export const getRecentSessions = async (
  uid: string | undefined,
  options?: {
    scenarioId?: string;
    guideLevel?: 'beginner' | 'intermediate' | 'advanced';
    limit?: number;
  }
) => {
  const userId = resolveUid(uid);
  let query = sessionsRef(userId)
    .orderBy('endedAt', 'desc')
    .limit(options?.limit ?? 20);

  if (options?.scenarioId) {
    query = query.where('scenarioId', '==', options.scenarioId).orderBy('endedAt', 'desc');
  }

  if (options?.guideLevel) {
    query = query.where('guideLevel', '==', options.guideLevel).orderBy('endedAt', 'desc');
  }

  const snap = await query.get();
  return snap.docs.map((d) => toDoc<Record<string, unknown>>(d));
};

export const getTopSessions = async (
  uid: string | undefined,
  options?: {
    scenarioId?: string;
    guideLevel?: 'beginner' | 'intermediate' | 'advanced';
    limit?: number;
  }
) => {
  const userId = resolveUid(uid);
  let query = sessionsRef(userId)
    .orderBy('totalScore', 'desc')
    .limit(options?.limit ?? 20);

  if (options?.scenarioId) {
    query = query.where('scenarioId', '==', options.scenarioId).orderBy('totalScore', 'desc');
  }

  if (options?.guideLevel) {
    query = query.where('guideLevel', '==', options.guideLevel).orderBy('totalScore', 'desc');
  }

  const snap = await query.get();
  return snap.docs.map((d) => toDoc<Record<string, unknown>>(d));
};

export const addSessionFeedback = async (
  uid: string | undefined,
  payload: {
    sessionId: string;
    category: 'collision' | 'parking' | 'reaction' | 'general';
    message: string;
    severity: 0 | 1 | 2;
  }
) => {
  const userId = resolveUid(uid);

  await feedbackRef(userId).add({
    ...payload,
    createdAt: firestore.FieldValue.serverTimestamp(),
    userId,
  });
};

export const deleteSessionWithEvents = async (uid: string | undefined, sessionId: string) => {
  const userId = resolveUid(uid);

  const batch = db.batch();
  const eventSnap = await eventsRef(userId, sessionId).get();

  eventSnap.docs.forEach((doc) => batch.delete(doc.ref));
  batch.delete(sessionRef(userId, sessionId).ref);

  await batch.commit();
};
