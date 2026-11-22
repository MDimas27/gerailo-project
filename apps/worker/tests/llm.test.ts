import { afterEach, describe, expect, it, vi } from "vitest";

import type { WorkerEnv } from "../src/lib/supabase.js";
import { createLlmCompleter } from "../src/services/parser/llm.js";

const env: WorkerEnv = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon",
  LLM_API_KEY: "nvapi-test",
  LLM_BASE_URL: "https://integrate.api.nvidia.com/v1/",
  LLM_MODEL: "nvidia/nemotron-3-ultra-550b-a55b",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createLlmCompleter", () => {
  it("memanggil base URL NIM, non-streaming, tanpa thinking", async () => {
    const fetchMock = vi.fn<
      (url: string, init?: RequestInit) => Promise<Response>
    >(
      async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  reasoning_content: "pikir panjang",
                  content: '{"items":[]}',
                },
              },
            ],
          }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const hasil = await createLlmCompleter(env)("prompt");

    expect(hasil).toBe('{"items":[]}');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://integrate.api.nvidia.com/v1/chat/completions");
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      "Bearer nvapi-test",
    );

    const tubuh = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(tubuh).toMatchObject({
      model: "nvidia/nemotron-3-ultra-550b-a55b",
      temperature: 0,
      max_tokens: 1024,
      stream: false,
      chat_template_kwargs: { enable_thinking: false },
      response_format: { type: "json_object" },
    });
  });

  it("membuang reasoning_content dan menolak bila content akhir kosong", async () => {
    const fetchMock = vi.fn<
      (url: string, init?: RequestInit) => Promise<Response>
    >(
      async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { reasoning_content: "pikir panjang" } }],
          }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(createLlmCompleter(env)("prompt")).rejects.toThrow(
      "LLM_OUTPUT_KOSONG",
    );
  });

  it("tidak memanggil LLM bila LLM_BASE_URL kosong", async () => {
    const fetchMock = vi.fn(async () => new Response());
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createLlmCompleter({ ...env, LLM_BASE_URL: undefined })("prompt"),
    ).rejects.toThrow("LLM_BASE_URL_BELUM_DISET");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
