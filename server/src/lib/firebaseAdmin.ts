import admin from "firebase-admin";

type VerifiedFirebaseUser = {
  uid: string;
  email: string;
};

function getFirebaseAdminApp() {
  if (admin.apps.length) {
    return admin.app();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin credentials are not configured");
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export async function verifyFirebaseToken(idToken: string): Promise<VerifiedFirebaseUser> {
  try {
    const decodedToken = await getFirebaseAdminApp().auth().verifyIdToken(idToken);

    if (!decodedToken.email) {
      throw new Error("Firebase token does not include an email address");
    }

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch (error) {
    throw error instanceof Error ? error : new Error("Could not verify Firebase token");
  }
}
