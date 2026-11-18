import { handle, readJson } from "@/server/http";
import { signUp, signUpInput } from "@/server/services/accounts";

export const POST = handle(async (req) => signUp(await readJson(req, signUpInput)));
