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
      console.log("useActiveHost: Fetched hosts from API:", hosts);
      return { hosts };
    },
    enabled: runtimeIsReady && !!conversationId,
    initialData: { hosts: [] },
    meta: {
      disableToast: true,
    },
  });

  console.log("useActiveHost: Runtime ready:", runtimeIsReady, "Conversation ID:", conversationId);

  console.log(
    "useActiveHost: %c%s",
    "background: #444; color: #ffeb3b; font-weight: bold; padding: 2px 4px; border-radius: 4px;",
    `Shakudo: Conversation ID: ${conversationId}, Hosts: ${data.hosts.join(", ")}`,
  );

  const apps = useQueries({
    queries: data.hosts.map((host) => ({
      queryKey: [conversationId, "hosts", host],
      queryFn: async () => {
        try {
          console.log(`useActiveHost: Testing host: ${host}`);
          const response = await axios.get(host);
          console.log(`useActiveHost: Host ${host} SUCCESS - Status: ${response.status}`);
          return host;
        } catch (e: any) {
          // Check if it's a 401 (Unauthorized) - this means service is running
          if (e.response?.status === 401) {
            console.log(`useActiveHost: Host ${host} SUCCESS (401 Unauthorized) - Service is running`);
            return host;
          }
          
          console.error(`useActiveHost: Host ${host} FAILED:`, e);
          console.error(`useActiveHost: Error details for ${host}:`, {
            message: e.message,
            code: e.code,
            status: e.response?.status,
            statusText: e.response?.statusText,
            url: e.config?.url
          });
          return "";
        }
      },
      // refetchInterval: 3000,
      meta: {
        disableToast: true,
      },
    })),
  });

  const appsData = apps.map((app: any) => app.data);

  React.useEffect(() => {
    console.log("useActiveHost: Apps data:", appsData);
    const successfulApp = appsData.find((app: any) => app);
    console.log("useActiveHost: Successful app found:", successfulApp);
    setActiveHost(successfulApp || null);
    console.log("useActiveHost: Active host set to:", successfulApp || null);
  }, [appsData]);

  return { activeHost };
};
