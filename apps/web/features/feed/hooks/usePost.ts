import { useQuery } from "@tanstack/react-query";
import { fetchPost } from "../api/postsApi";
import { feedKeys } from "./queryKeys";

export function usePost(username: string, postId: string) {
  return useQuery({
    queryKey: feedKeys.post(username, postId),
    queryFn: () => fetchPost(username, postId),
    staleTime: 60_000,
    enabled: Boolean(username) && Boolean(postId),
  });
}
