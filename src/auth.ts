import crypto from "crypto";

export interface WebAppUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface ValidatedInitData {
  user: WebAppUser;
  authDate: number;
  queryId?: string;
  hash: string;
}

function parseInitData(initData: string): Record<string, string> {
  const params = new URLSearchParams(initData);
  const result: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
}

export function validateWebAppInitData(
  initData: string,
  botToken: string
): ValidatedInitData | null {
  if (!initData || !botToken) return null;

  const params = parseInitData(initData);
  const hash = params.hash;
  if (!hash) return null;

  const dataCheckString = Object.keys(params)
    .filter((key) => key !== "hash")
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (calculatedHash !== hash) return null;

  const authDate = parseInt(params.auth_date || "0", 10);
  const maxAge = 24 * 60 * 60;
  if (Date.now() / 1000 - authDate > maxAge) return null;

  let user: WebAppUser;
  try {
    user = JSON.parse(params.user || "{}") as WebAppUser;
    if (!user.id) return null;
  } catch {
    return null;
  }

  return {
    user,
    authDate,
    queryId: params.query_id,
    hash,
  };
}
