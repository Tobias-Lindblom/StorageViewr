import { api, assertOrigin, readJson } from "@/lib/server/api";
import { requireSession } from "@/lib/server/session";
import { updateAccount } from "@/features/account/service";
import { updateAccountSchema } from "@/validation/account";

export async function PATCH(request: Request) {
  return api(async () => {
    assertOrigin(request);
    return updateAccount(await requireSession(), await readJson(request, updateAccountSchema));
  });
}
