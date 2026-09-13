// THIS FILE IS READ ONLY. Do not touch this file unless you are correctly adding a new auth provider in accordance to the vly auth documentation
// The Password provider is used for the simple username/password sign-in at
// /auth (no email). The username doubles as the account id stored in the
// `email` field of the auth account, per Convex Auth conventions for
// username-only credentials.

import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        return {
          email: params.username as string,
          name: params.username as string,
        };
      },
    }),
    Anonymous,
  ],
});
