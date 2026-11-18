import { handle, readJson } from "@/server/http";
import { signIn, signInInput } from "@/server/services/accounts";

export const POST = handle(async (req) => signIn(await readJson(req, signInInput)));
