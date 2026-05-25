import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { fetchPost } from "../api/postsApi";
import { feedKeys } from "./queryKeys";

export function usePost(username: string, postId: string) {
  const { getToken, isLoaded } = useAuth();

  return useQuery({
    queryKey: feedKeys.post(postId),
    queryFn: async () => fetchPost(postId, await getToken()),
    staleTime: 60_000,
    enabled: isLoaded && Boolean(username) && Boolean(postId),
  });
}
