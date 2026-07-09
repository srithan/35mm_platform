"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { ArrowLeft, ChevronDown, ClipboardList } from "lucide-react";
import { contributionSubmissionSchema, type ContributionSubmissionInput } from "@35mm/validators";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import { ApiRequestError } from "@/features/feed/api/http";
import { useCreateContributionSubmission } from "../hooks/useContributions";
import type { ContributionConfig, ContributionField } from "../lib/contributionConfig";
import styles from "./Contribute.module.css";

type FormValue = string | string[];
type FormValues = Record<string, FormValue>;
type FieldErrors = Record<string, string>;

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return String(Date.now()) + "-" + Math.random().toString(36).slice(2);
}

function initialValues(config: ContributionConfig): FormValues {
  var values: FormValues = {};
  for (var field of config.fields) {
    if (field.type === "checkboxGroup") {
      values[field.name] = [];
    } else if (field.type === "select") {
      values[field.name] = field.options[0]?.value ?? "";
    } else {
      values[field.name] = "";
    }
  }
  return values;
}

function stringValue(value: FormValue | undefined): string {
  return typeof value === "string" ? value : "";
}

function arrayValue(value: FormValue | undefined): string[] {
  return Array.isArray(value) ? value : [];
}

function optionalText(values: FormValues, name: string): string | undefined {
  var value = stringValue(values[name]).trim();
  return value.length > 0 ? value : undefined;
}

function requiredText(values: FormValues, name: string): string {
  return stringValue(values[name]).trim();
}

function optionalNumber(values: FormValues, name: string): number | undefined {
  var value = stringValue(values[name]).trim();
  if (!value) return undefined;
  var parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function requiredNumber(values: FormValues, name: string): number | undefined {
  var value = stringValue(values[name]).trim();
  if (!value) return undefined;
  var parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function splitCommaList(values: FormValues, name: string): string[] {
  return stringValue(values[name])
    .split(/[,\n]/)
    .map(function (item) {
      return item.trim();
    })
    .filter(Boolean);
}

function splitLineList(values: FormValues, name: string): string[] {
  return stringValue(values[name])
    .split(/\n/)
    .map(function (item) {
      return item.trim();
    })
    .filter(Boolean);
}

function issueFieldName(path: Array<PropertyKey>): string | null {
  if (path.length >= 2 && path[0] === "payload" && typeof path[1] === "string") {
    return path[1];
  }
  if (typeof path[0] === "string") return path[0];
  return null;
}

function buildSubmission(config: ContributionConfig, values: FormValues): unknown {
  switch (config.kind) {
    case "add_title":
      return {
        kind: config.kind,
        payload: {
          titleType: requiredText(values, "titleType"),
          originalTitle: requiredText(values, "originalTitle"),
          displayTitle: optionalText(values, "displayTitle"),
          releaseYear: requiredNumber(values, "releaseYear"),
          durationMinutes: optionalNumber(values, "durationMinutes"),
          imdbUrl: optionalText(values, "imdbUrl"),
          countries: splitCommaList(values, "countries"),
          languages: splitCommaList(values, "languages"),
          genres: splitCommaList(values, "genres"),
          synopsis: requiredText(values, "synopsis"),
          sourceUrls: splitLineList(values, "sourceUrls"),
          comments: optionalText(values, "comments"),
        },
      };
    case "edit_title":
      return {
        kind: config.kind,
        payload: {
          targetTitle: requiredText(values, "targetTitle"),
          changeAreas: arrayValue(values.changeAreas),
          requestedChanges: requiredText(values, "requestedChanges"),
          sourceUrls: splitLineList(values, "sourceUrls"),
          comments: optionalText(values, "comments"),
        },
      };
    case "credits":
      return {
        kind: config.kind,
        payload: {
          targetTitle: requiredText(values, "targetTitle"),
          action: requiredText(values, "action"),
          personName: requiredText(values, "personName"),
          personUrlOrId: optionalText(values, "personUrlOrId"),
          job: requiredText(values, "job"),
          characterName: optionalText(values, "characterName"),
          sourceUrls: splitLineList(values, "sourceUrls"),
          comments: optionalText(values, "comments"),
        },
      };
    case "person_update":
      return {
        kind: config.kind,
        payload: {
          personUrlOrId: requiredText(values, "personUrlOrId"),
          changeType: requiredText(values, "changeType"),
          requestedChanges: requiredText(values, "requestedChanges"),
          sourceUrls: splitLineList(values, "sourceUrls"),
          comments: optionalText(values, "comments"),
        },
      };
    case "media":
      return {
        kind: config.kind,
        payload: {
          target: requiredText(values, "target"),
          mediaType: requiredText(values, "mediaType"),
          action: requiredText(values, "action"),
          mediaUrl: requiredText(values, "mediaUrl"),
          rightsNote: requiredText(values, "rightsNote"),
          sourceUrls: splitLineList(values, "sourceUrls"),
          comments: optionalText(values, "comments"),
        },
      };
    case "awards_events":
      return {
        kind: config.kind,
        payload: {
          eventType: requiredText(values, "eventType"),
          originalName: requiredText(values, "originalName"),
          englishName: optionalText(values, "englishName"),
          officialUrl: requiredText(values, "officialUrl"),
          startYear: optionalNumber(values, "startYear"),
          endYear: optionalNumber(values, "endYear"),
          requestedChanges: requiredText(values, "requestedChanges"),
          sourceUrls: splitLineList(values, "sourceUrls"),
          comments: optionalText(values, "comments"),
        },
      };
    case "duplicate_titles":
      return {
        kind: config.kind,
        payload: {
          primaryTitle: requiredText(values, "primaryTitle"),
          duplicateTitle: requiredText(values, "duplicateTitle"),
          reason: requiredText(values, "reason"),
          sourceUrls: splitLineList(values, "sourceUrls"),
          comments: optionalText(values, "comments"),
        },
      };
    case "merge_people":
      return {
        kind: config.kind,
        payload: {
          primaryPerson: requiredText(values, "primaryPerson"),
          duplicatePeople: splitLineList(values, "duplicatePeople"),
          reason: requiredText(values, "reason"),
          sourceUrls: splitLineList(values, "sourceUrls"),
          comments: optionalText(values, "comments"),
        },
      };
    case "split_person":
      return {
        kind: config.kind,
        payload: {
          sourcePerson: requiredText(values, "sourcePerson"),
          creditsToMove: splitLineList(values, "creditsToMove"),
          reason: requiredText(values, "reason"),
          sourceUrls: splitLineList(values, "sourceUrls"),
          comments: optionalText(values, "comments"),
        },
      };
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) return error.message;
  if (error instanceof Error && error.message.trim().length > 0) return error.message;
  return "Submission failed. Try again.";
}

function renderField(params: {
  field: ContributionField;
  value: FormValue | undefined;
  error?: string;
  onChange: (name: string, value: FormValue) => void;
}) {
  var { field, value, error, onChange } = params;
  var inputId = "contribution-" + field.name;
  var describedBy = [
    field.hint ? inputId + "-hint" : null,
    error ? inputId + "-error" : null,
  ].filter(Boolean).join(" ") || undefined;

  return (
    <div key={field.name} className={styles.field}>
      <div className={styles.labelRow}>
        <label className={styles.label} htmlFor={inputId}>
          {field.label}
        </label>
        {field.required ? <span className={styles.required}>Required</span> : null}
      </div>

      {field.type === "textarea" ? (
        <textarea
          id={inputId}
          className={cn(styles.textarea, error ? styles.inputError : null)}
          value={stringValue(value)}
          placeholder={field.placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          onChange={function (event) {
            onChange(field.name, event.target.value);
          }}
        />
      ) : null}

      {field.type === "text" || field.type === "number" ? (
        <input
          id={inputId}
          className={cn(styles.input, error ? styles.inputError : null)}
          value={stringValue(value)}
          type={field.type === "number" ? "number" : "text"}
          inputMode={field.type === "number" ? "numeric" : undefined}
          placeholder={field.placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          onChange={function (event) {
            onChange(field.name, event.target.value);
          }}
        />
      ) : null}

      {field.type === "select" ? (
        <div className={styles.selectWrap}>
          <select
            id={inputId}
            className={cn(styles.select, error ? styles.inputError : null)}
            value={stringValue(value)}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            onChange={function (event) {
              onChange(field.name, event.target.value);
            }}
          >
            {field.options.map(function (option) {
              return (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              );
            })}
          </select>
          <ChevronDown className={styles.selectChevron} size={18} strokeWidth={2} aria-hidden />
        </div>
      ) : null}

      {field.type === "checkboxGroup" ? (
        <div id={inputId} className={styles.checks} aria-describedby={describedBy}>
          {field.options.map(function (option) {
            var checked = arrayValue(value).includes(option.value);
            return (
              <label key={option.value} className={styles.check}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={function (event) {
                    var current = arrayValue(value);
                    onChange(
                      field.name,
                      event.target.checked
                        ? Array.from(new Set([...current, option.value]))
                        : current.filter(function (item) {
                            return item !== option.value;
                          })
                    );
                  }}
                />
                {option.label}
              </label>
            );
          })}
        </div>
      ) : null}

      {field.hint ? (
        <p id={inputId + "-hint"} className={styles.hint}>
          {field.hint}
        </p>
      ) : null}
      {error ? (
        <p id={inputId + "-error"} className={styles.fieldError}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ContributionFormPage({ config }: { config: ContributionConfig }) {
  var { isLoaded, isSignedIn } = useAuth();
  var mutation = useCreateContributionSubmission();
  var idempotencyKeyRef = useRef(newIdempotencyKey());
  var [values, setValues] = useState<FormValues>(() => initialValues(config));
  var [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  var [formError, setFormError] = useState<string | null>(null);
  var [successTitle, setSuccessTitle] = useState<string | null>(null);

  var fieldNames = useMemo(
    function () {
      return new Set(config.fields.map(function (field) {
        return field.name;
      }));
    },
    [config.fields]
  );

  function setFieldValue(name: string, value: FormValue) {
    setValues(function (current) {
      return { ...current, [name]: value };
    });
    setFieldErrors(function (current) {
      if (!current[name]) return current;
      var next = { ...current };
      delete next[name];
      return next;
    });
    setFormError(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccessTitle(null);

    var parsed = contributionSubmissionSchema.safeParse(buildSubmission(config, values));
    if (!parsed.success) {
      var nextErrors: FieldErrors = {};
      for (var issue of parsed.error.issues) {
        var fieldName = issueFieldName(issue.path);
        if (fieldName && fieldNames.has(fieldName) && !nextErrors[fieldName]) {
          nextErrors[fieldName] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      setFormError("Fix highlighted fields before submitting.");
      return;
    }

    try {
      var submission = await mutation.mutateAsync({
        submission: parsed.data as ContributionSubmissionInput,
        idempotencyKey: idempotencyKeyRef.current,
      });
      setSuccessTitle(submission.title);
      setValues(initialValues(config));
      setFieldErrors({});
      idempotencyKeyRef.current = newIdempotencyKey();
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  return (
    <div className={styles.shell}>
      <div className={styles.inner}>
        <div className={styles.topbar}>
          <Link href={ROUTES.CONTRIBUTE} className={styles.crumb}>
            <ArrowLeft size={16} strokeWidth={2} aria-hidden />
            Contributor Desk
          </Link>
          <Link href={ROUTES.CONTRIBUTE_SUBMISSIONS} className={styles.trackLink}>
            <ClipboardList size={17} strokeWidth={2} aria-hidden />
            Track submissions
          </Link>
        </div>

        <div className={styles.formLayout}>
          <div>
            <header className={styles.formHeader}>
              <span className={styles.eyebrow}>{config.queueLabel}</span>
              <h1>{config.title}</h1>
              <p>{config.description}</p>
            </header>

            <form className={styles.form} onSubmit={onSubmit} noValidate>
              {config.fields.map(function (field) {
                return renderField({
                  field,
                  value: values[field.name],
                  error: fieldErrors[field.name],
                  onChange: setFieldValue,
                });
              })}

              {formError ? <div className={styles.formError}>{formError}</div> : null}
              {successTitle ? (
                <div className={styles.success}>
                  Submission queued for review: {successTitle}. Track it from your submissions page.
                </div>
              ) : null}

              <div className={styles.submitRow}>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={!isLoaded || !isSignedIn || mutation.isPending}
                >
                  {mutation.isPending ? "Submitting" : "Submit for review"}
                </button>
                {!isSignedIn && isLoaded ? (
                  <Link href={ROUTES.AUTH_LOGIN} className={styles.secondaryButton}>
                    Sign in
                  </Link>
                ) : (
                  <Link href={ROUTES.CONTRIBUTE_SUBMISSIONS} className={styles.secondaryButton}>
                    View submissions
                  </Link>
                )}
              </div>
            </form>
          </div>

          <aside className={styles.sidePanel} aria-label="Contribution guidance">
            <div className={styles.sideBlock}>
              <h2>Review rules</h2>
              <p>
                Provide sources that let a moderator verify identity, rights, and exact data. Public
                submissions enter review before catalog records change.
              </p>
              <ul>
                <li>Use 35mm IDs or URLs when a page already exists.</li>
                <li>Use one source per line for review speed.</li>
                <li>Do not submit copyrighted images without rights context.</li>
              </ul>
            </div>
            <div className={styles.sideBlock}>
              <h3>Scale note</h3>
              <p>
                This path stores one queued write per submission and reads only your own cursor-paged
                history. Heavy catalog mutations remain behind moderation.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
