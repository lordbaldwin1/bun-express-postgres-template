import { config, SEVEN_DAYS } from "../../config.js";
import { db } from "../index.js";
import { refreshTokens, users } from "../schema.js";
import { and, eq, gt, isNull } from "drizzle-orm";


export async function saveRefreshToken(userID: string, token: string) {
  const rows = await db
    .insert(refreshTokens)
    .values({
      userId: userID,
      token: token,
      expiresAt: new Date(Date.now() + SEVEN_DAYS),
      revokedAt: null,
    })
    .returning();

  return rows.length > 0;
}

export async function revokeRefreshToken(token: string) {
  await db
    .update(refreshTokens)
    .set({
      revokedAt: new Date()
    })
    .where(eq(refreshTokens.token, token));
}

export async function getUserByRefreshToken(token: string) { 
  const [result] = await db
    .select({ user: users })
    .from(users)
    .fullJoin(refreshTokens, eq(users.id, refreshTokens.userId))
    .where(
      and(
        eq(refreshTokens.token, token),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return result;
}