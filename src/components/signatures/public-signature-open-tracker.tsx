"use client";

import { trackPublicSignatureEvent } from "@/actions/public-signatures";
import { useEffect } from "react";

interface PublicSignatureOpenTrackerProps {
  token: string;
}

export function PublicSignatureOpenTracker({ token }: PublicSignatureOpenTrackerProps) {
  useEffect(() => {
    void trackPublicSignatureEvent(token, "link_opened");
  }, [token]);

  return null;
}
