import { StateSurface, Screen } from "@35mm/mobile-ui";
import { useLocalSearchParams, useRouter } from "expo-router";

import { PostDetailScreen } from "@/features/feed/PostDetailScreen";
import { parsePostRouteId } from "@/features/feed/postRoute";

export default function PostDetailRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ postId?: string | string[] }>();
  const postId = parsePostRouteId(params.postId);

  if (!postId) {
    return (
      <Screen padded testID="invalid-post-route">
        <StateSurface
          kind="error"
          message="This post link is invalid."
          primaryAction={{ label: "Go back", onPress: () => router.back() }}
          title="Invalid post"
        />
      </Screen>
    );
  }

  return <PostDetailScreen postId={postId} />;
}
