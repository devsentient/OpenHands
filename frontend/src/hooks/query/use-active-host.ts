import { useQueries, useQuery } from "@tanstack/react-query";
import axios from "axios";
import React from "react";
import OpenHands from "#/api/open-hands";
import { useConversationId } from "#/hooks/use-conversation-id";
import { useRuntimeIsReady } from "#/hooks/use-runtime-is-ready";

export const useActiveHost = () => {
  const [activeHost, setActiveHost] = React.useState<string | null>(null);
  const { conversationId } = useConversationId();
  const runtimeIsReady = useRuntimeIsReady();

  const { data } = useQuery({
    queryKey: [conversationId, "hosts"],
    queryFn: async () => {
      const hosts = await OpenHands.getWebHosts(conversationId);
      return { hosts };
    },
    enabled: runtimeIsReady && !!conversationId,
    initialData: { hosts: [] },
    meta: {
      disableToast: true,
    },
  });

  const apps = useQueries({
    queries: data.hosts.map((host) => ({
      queryKey: [conversationId, "hosts", host],
      queryFn: async () => {
        try {
          console.log(`Testing host: ${host}`);
          const response = await axios.get(host);
          console.log(`Host ${host} SUCCESS - Status: ${response.status}`);
          return host;
        } catch (e: any) {
          console.log(`Host ${host} ERROR - Status: ${e.response?.status}, Code: ${e.code}, Message: ${e.message}`);
          // Only treat as failure for 500+ server errors
          if (e.response?.status >= 500) {
            console.log(`Host ${host} FAILED - Server error (${e.response.status})`);
            return "";
          }
          // For all other errors (401, 403, 404, CORS, etc.) treat as success
          // since the service exists and the iframe can handle it
          console.log(`Host ${host} SUCCESS - Service exists despite error (${e.response?.status || e.code})`);
          return host;
        }
      },
      // refetchInterval: 3000,
      meta: {
        disableToast: true,
      },
    })),
  });

  const appsData = apps.map((app) => app.data);

  React.useEffect(() => {
    const successfulApp = appsData.find((app) => app);
    setActiveHost(successfulApp || "");
  }, [appsData]);

  return { activeHost };
};
