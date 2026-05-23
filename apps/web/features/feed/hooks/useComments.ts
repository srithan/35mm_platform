import { useQuery } from "@tanstack/react-query";
import { fetchComments } from "../api/commentsApi";
import { feedKeys } from "./queryKeys";

export function useComments(postId: string) {
  return useQuery({
    queryKey: feedKeys.comments(postId),
    queryFn: () => fetchComments(postId),
    staleTime: 30_000,
    enabled: Boolean(postId),
  });
}
