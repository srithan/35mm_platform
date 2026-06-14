import { useComposerModal } from "@/components/layout/PostComposerModalContext";
import styles from "../SiteHeader.module.css";

export function NewPostButton() {
  const { openComposerModal } = useComposerModal();

  return (
    <button type="button" className={styles.btnPost} onClick={function () { openComposerModal(); }}>
      <span className={styles.btnPostInner}>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden
        >
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        </svg>
        New Post
      </span>
    </button>
  );
}
