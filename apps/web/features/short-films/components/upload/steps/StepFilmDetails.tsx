"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  CharCount,
  UploadFormField,
  uploadInputClass,
} from "../UploadFormField";
import { LANGUAGES } from "../constants";
import type { ShortFilmUploadFormApi } from "../useShortFilmUploadForm";

export function StepFilmDetails({ upload }: { upload: ShortFilmUploadFormApi }) {
  var form = upload.form;

  return (
    <div className="rounded-2xl border border-border bg-elevated p-6 shadow-sm sm:p-7">
      <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-faint">
        Step 2 — Film details
      </p>

      <UploadFormField label="Film title" required>
        <input
          type="text"
          value={form.title}
          maxLength={80}
          placeholder="Give your film a captivating title"
          onChange={function (e) {
            upload.setField("title", e.target.value);
          }}
          className={uploadInputClass()}
        />
        <CharCount current={form.title.length} max={80} />
      </UploadFormField>

      <UploadFormField label="Tagline" optional>
        <input
          type="text"
          value={form.tagline}
          maxLength={120}
          placeholder="One unforgettable sentence about your film"
          onChange={function (e) {
            upload.setField("tagline", e.target.value);
          }}
          className={uploadInputClass()}
        />
        <CharCount current={form.tagline.length} max={120} />
      </UploadFormField>

      <UploadFormField label="Description" required>
        <textarea
          value={form.description}
          maxLength={1000}
          rows={4}
          placeholder="Tell viewers what makes your film special — themes, inspiration, or what audiences can expect…"
          onChange={function (e) {
            upload.setField("description", e.target.value);
          }}
          className={uploadInputClass() + " min-h-[100px] resize-y leading-relaxed"}
        />
        <CharCount current={form.description.length} max={1000} />
      </UploadFormField>

      <div className="my-6 h-px bg-border" />

      <div className="rounded-xl bg-sunken p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <UploadFormField label="Director" className="mb-0">
            <input
              type="text"
              value={form.director}
              placeholder="Your name"
              onChange={function (e) {
                upload.setField("director", e.target.value);
              }}
              className={uploadInputClass()}
            />
          </UploadFormField>
          <UploadFormField label="Year made" className="mb-0">
            <input
              type="number"
              value={form.year}
              min={1900}
              max={2099}
              placeholder="2025"
              onChange={function (e) {
                upload.setField("year", e.target.value);
              }}
              className={uploadInputClass()}
            />
          </UploadFormField>
          <UploadFormField label="Runtime" className="mb-0">
            <input
              type="text"
              value={form.runtime}
              placeholder="e.g. 18:45"
              onChange={function (e) {
                upload.setField("runtime", e.target.value);
              }}
              className={uploadInputClass()}
            />
          </UploadFormField>
          <UploadFormField label="Language" className="mb-0">
            <div className="relative">
              <select
                value={form.language}
                onChange={function (e) {
                  upload.setField("language", e.target.value);
                }}
                className={uploadInputClass() + " appearance-none pr-10"}
              >
                <option value="">Select…</option>
                {LANGUAGES.map(function (lang) {
                  return (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  );
                })}
              </select>
              <span
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 border-[5px_4.5px_0_4.5px] border-transparent border-t-fg-muted"
                aria-hidden
              />
            </div>
          </UploadFormField>
        </div>
      </div>

      <UploadFormField label="Country of origin" optional className="mt-5">
        <input
          type="text"
          value={form.country}
          placeholder="e.g. United States"
          onChange={function (e) {
            upload.setField("country", e.target.value);
          }}
          className={uploadInputClass()}
        />
      </UploadFormField>

      <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
        <button
          type="button"
          onClick={function () {
            upload.goToStep(1);
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-border-strong px-4 py-3 text-[14px] font-semibold text-fg-muted transition hover:border-transparent hover:bg-sunken hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.5} aria-hidden />
          Back
        </button>
        <button
          type="button"
          disabled={!upload.step2Valid}
          onClick={function () {
            upload.goToStep(3);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-fg px-5 py-3 text-[14px] font-bold text-bg shadow-md transition enabled:hover:bg-accent enabled:hover:shadow-lg enabled:hover:shadow-accent/25 enabled:hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-35"
        >
          Continue
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />
        </button>
      </div>
    </div>
  );
}
