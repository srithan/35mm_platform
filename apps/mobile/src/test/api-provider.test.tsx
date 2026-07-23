import type { ApiClient } from "@35mm/api-client";
import { render } from "@testing-library/react-native";

import type { MobileRuntimeConfig } from "@/config/runtime";
import { MobileApiClientProvider, useApiClient } from "@/services/api";

const mockGetToken = jest.fn(async () => "secure-session-token");

jest.mock("@clerk/expo", () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}));

const runtimeConfig: MobileRuntimeConfig = {
  apiBaseUrl: "https://api.example.test",
  appVariant: "preview",
  appVersion: "0.1.0",
  clerkPublishableKey: "pk_test_test",
};

describe("MobileApiClientProvider", () => {
  it("injects the current Clerk token and validated runtime metadata", async () => {
    const captured: { current: ApiClient | null } = { current: null };
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({
        headers: new Headers(),
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ ok: true }),
      } as Response);

    function CaptureClient() {
      captured.current = useApiClient();
      return null;
    }

    await render(
      <MobileApiClientProvider runtimeConfig={runtimeConfig}>
        <CaptureClient />
      </MobileApiClientProvider>,
    );
    if (!captured.current) throw new Error("API client was not provided.");
    const client = captured.current;

    await expect(
      client.request("/v1/me", {
        auth: "required",
        operation: "profile.me",
      }),
    ).resolves.toEqual({ ok: true });

    expect(mockGetToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/v1/me",
      expect.objectContaining({ method: "GET" }),
    );
    const request = fetchMock.mock.calls[0]?.[1];
    const headers = new Headers(request?.headers);
    expect(headers.get("Authorization")).toBe("Bearer secure-session-token");
    expect(headers.get("X-35mm-App-Version")).toBe("0.1.0");
    expect(headers.get("X-35mm-App-Variant")).toBe("preview");
    fetchMock.mockRestore();
  });
});
