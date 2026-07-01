import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { fetchPost } from "../api/postsApi";
import { feedKeys } from "./queryKeys";

export function usePost(username: string, postId: string) {
  const { getToken, isLoaded, userId } = useAuth();

  return useQuery({
    queryKey: feedKeys.postForViewer(postId, userId),
    queryFn: async () => fetchPost(postId, await getToken()),
    staleTime: 0,
    refetchOnMount: "always",
    enabled: isLoaded && Boolean(username) && Boolean(postId),
  });
}
