import { parseMobileRuntimeConfig } from "@/config/runtime";

function publishableKey(host = "example.clerk.accounts.dev") {
  return `pk_test_${btoa(`${host}$`).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}

describe("mobile runtime config", () => {
  it("accepts explicit development and preview services", () => {
    expect(
      parseMobileRuntimeConfig({
        apiBaseUrl: "http://127.0.0.1:4000/",
        appVariant: "development",
        appVersion: "0.1.0",
        clerkPublishableKey: publishableKey(),
      }),
    ).toEqual({
      apiBaseUrl: "http://127.0.0.1:4000",
      appVariant: "development",
      appVersion: "0.1.0",
      clerkPublishableKey: publishableKey(),
    });

    expect(() =>
      parseMobileRuntimeConfig({
        apiBaseUrl: "https://api.example.com",
        appVariant: "preview",
        appVersion: "0.1.0",
        clerkPublishableKey: publishableKey(),
      }),
    ).not.toThrow();
  });

  it("fails closed for missing, placeholder, or unsafe preview configuration", () => {
    expect(() =>
      parseMobileRuntimeConfig({
        apiBaseUrl: undefined,
        appVariant: "development",
        appVersion: "0.1.0",
        clerkPublishableKey: publishableKey(),
      }),
    ).toThrow("EXPO_PUBLIC_API_URL");
    expect(() =>
      parseMobileRuntimeConfig({
        apiBaseUrl: "https://api.example.com",
        appVariant: "development",
        appVersion: "0.1.0",
        clerkPublishableKey: "pk_test_replace_me",
      }),
    ).toThrow("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is invalid");
    expect(() =>
      parseMobileRuntimeConfig({
        apiBaseUrl: "http://localhost:4000",
        appVariant: "preview",
        appVersion: "0.1.0",
        clerkPublishableKey: publishableKey(),
      }),
    ).toThrow("Preview API URL must use HTTPS");
  });
});
