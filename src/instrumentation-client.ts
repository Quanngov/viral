import * as Sentry from "@sentry/nextjs";
import { sentryInitOptions } from "@/lib/sentry-config";

Sentry.init(sentryInitOptions);
