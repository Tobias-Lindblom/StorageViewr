import type * as Sentry from "@sentry/nextjs";

type DataCollection = NonNullable<
  Parameters<typeof Sentry.init>[0]["dataCollection"]
>;

/**
 * Keep central error reporting limited to technical diagnostics. StorageViewr
 * never asks the SDK to collect request contents, identities or query data.
 */
export const privateDataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  stackFrameVariables: false,
  frameContextLines: 0,
} satisfies DataCollection;
